'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Drawer from '@/components/admin/Drawer';
import { Header, DataTable, Pill, Box, KV, Loader, Failed } from '@/components/admin/Kit';
import { Fields } from '@/components/admin/Form';
import Filters from '@/components/admin/Filters';
import { useList } from '@/components/admin/useList';
import { invalidateRef } from '@/components/admin/refData';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, downloadCsv, fmtDate, fmtDateTime, inr } from '@/lib/admin';

const errText = (x) => (x.errors?.length ? `${x.message}: ${x.errors.slice(0, 4).map((e) => `${e.field} — ${e.message}`).join('; ')}` : x.message);

// ── Customers ────────────────────────────────────────────────
export function CustomersList() {
  const list = useList('/admin/customers', { limit: '25' });
  return (
    <>
      <Header title="Customers" />
      <Filters params={list.params} setParams={list.setParams} placeholder="Name, mobile or email" filters={[{ name: 'status', label: 'Status', options: [['ACTIVE', 'Active'], ['INACTIVE', 'Inactive'], ['BLOCKED', 'Blocked']] }, { name: 'range' }]} />
      <DataTable tableId="customers" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        onExport={() => downloadCsv(`/admin/customers${list.exportQuery}`, 'customers.csv').catch((e) => alert(e.message))}
        rowHref={(r) => `/admin/customers/${r.id}`} empty="No customers."
        columns={[
          { key: 'name', label: 'Name', render: (r) => r.name || '(no name)' }, { key: 'mobile', label: 'Mobile', render: (r) => (r.mobile ? `+91 ${r.mobile}` : '—') },
          { key: 'email', label: 'Email', defaultHidden: true }, { key: 'city', label: 'City' }, { key: 'leads', label: 'Leads' }, { key: 'bookings', label: 'Bookings' },
          { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> }, { key: 'createdAt', label: 'Joined', render: (r) => fmtDate(r.createdAt) },
        ]} />
    </>
  );
}

export function CustomerDetail({ id }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { data, error, loading, reload } = useApi(`/admin/customers/${id}`);
  const [msg, setMsg] = useState(null);
  if (loading && !data) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const c = data.customer;
  const setStatus = async (status) => { try { await api(`/admin/customers/${id}`, { method: 'PATCH', body: { status } }); reload(); } catch (x) { setMsg({ tone: 'error', text: x.message }); } };
  const remove = async () => {
    const reason = window.prompt('This anonymises the customer’s personal data. Bookings and quotations are kept. Reason?');
    if (!reason) return;
    try { await api(`/admin/customers/${id}`, { method: 'DELETE', body: { reason } }); router.replace('/admin/customers'); } catch (x) { setMsg({ tone: 'error', text: x.message }); }
  };
  return (
    <>
      <Header title={c.name || 'Customer'} subtitle={`Joined ${fmtDate(c.createdAt)}, last login ${fmtDateTime(c.lastLogin)}`} back={['/admin/customers', 'Customers']}>
        <Pill value={c.status} />
        {can(user, 'customers.edit') && <>
          {c.status === 'ACTIVE' ? <Button size="sm" variant="ghost" onClick={() => setStatus('BLOCKED')}>Block</Button> : <Button size="sm" variant="secondary" onClick={() => setStatus('ACTIVE')}>Activate</Button>}
          <Button size="sm" variant="ghost" onClick={remove}>Delete personal data</Button>
        </>}
      </Header>
      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      <div className="grid gap-6 xl:grid-cols-3">
        <Box title="Details"><KV rows={[['Mobile', c.mobile && `+91 ${c.mobile}`], ['Email', c.email], ['City', c.profile?.city], ['Contact preference', c.profile?.preferredChannel], ['Marketing consent', c.profile?.marketingConsent ? 'Yes' : 'No'], ['Source', [c.profile?.utm?.source, c.profile?.utm?.campaign].filter(Boolean).join(' / ')]]} /></Box>
        <Box title={`Bookings (${data.bookings.length})`} className="xl:col-span-2" pad={false}>
          <ul className="divide-y divide-stone text-sm">{data.bookings.map((b) => <li key={b.id} className="flex justify-between gap-3 px-5 py-3"><a className="font-medium hover:underline" href={`/admin/bookings/${b.id}`}>{b.bookingNumber}</a><span>{b.labels?.bhk} {b.address?.city}</span><Pill value={b.status} /></li>)}{!data.bookings.length && <li className="px-5 py-3 text-graphite">None</li>}</ul>
        </Box>
        <Box title={`Leads (${data.leads.length})`} className="xl:col-span-2" pad={false}>
          <ul className="divide-y divide-stone text-sm">{data.leads.map((l) => <li key={l.id} className="flex justify-between gap-3 px-5 py-3"><a className="font-medium hover:underline" href={`/admin/leads/${l.id}`}>{l.leadNumber}</a><span>{l.flow === 'ESTIMATE' ? 'Estimate' : 'Booking'}</span><Pill value={l.status} /></li>)}</ul>
        </Box>
        <Box title={`Estimates (${data.estimates.length})`} pad={false}>
          <ul className="divide-y divide-stone text-sm">{data.estimates.map((e) => { const s = e.results.find((r) => r.package === e.selectedPackage); return <li key={e.id} className="px-5 py-3">{e.estimateNumber}: {s?.packageName} {s?.available ? `${inr(s.finalMin)}–${inr(s.finalMax)}` : ''}</li>; })}{!data.estimates.length && <li className="px-5 py-3 text-graphite">None</li>}</ul>
        </Box>
      </div>
    </>
  );
}

// ── Contractors ──────────────────────────────────────────────
const RESTRICTED = ['roles.manage', 'settings.manage', 'users.manage', 'audit_logs.view'];

function usePermissionOptions(exclude = []) {
  const { data } = useApi('/admin/permissions');
  return (data?.groups || []).flatMap((g) => g.permissions.filter((p) => !exclude.includes(p.key)).map((p) => ({ value: p.key, label: `${g.group}: ${p.key}`, hint: p.description })));
}

export function Contractors() {
  const user = useAuth((s) => s.user);
  const list = useList('/admin/contractors', { limit: '50' });
  const permOptions = usePermissionOptions(RESTRICTED);
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const canPerms = can(user, 'roles.manage');

  const open = (c) => {
    setMsg(null);
    setEdit(c ? { id: c.id, original: c, form: { ...c, email: c.email || '', password: '', address: c.address || {}, experienceYears: c.experienceYears ?? null } }
      : { form: { name: '', mobile: '', email: '', password: '', city: '', serviceAreas: [], specializations: [], experienceYears: null, address: {}, notes: '', isActive: true, loginEnabled: true, customPermissions: false, permissions: [], photoUrl: '' } });
  };
  const save = async () => {
    setBusy(true); setMsg(null);
    const f = edit.form;
    const body = {
      name: f.name, mobile: f.mobile, email: f.email || '', ...(f.password ? { password: f.password } : {}),
      contractorCode: f.contractorCode || undefined, city: f.city || undefined, serviceAreas: f.serviceAreas, specializations: f.specializations,
      experienceYears: f.experienceYears ?? undefined, notes: f.notes || undefined, isActive: f.isActive, loginEnabled: f.loginEnabled,
      address: { formattedAddress: f.address?.formattedAddress || undefined, city: f.address?.city || undefined, state: f.address?.state || undefined, pincode: f.address?.pincode || undefined },
      ...(canPerms ? { customPermissions: f.customPermissions, permissions: f.customPermissions ? f.permissions : [] } : {}),
      ...(f.photo && f.photo !== edit.original?.photo ? { photo: f.photo } : {}),
    };
    try {
      await (edit.id ? api(`/admin/contractors/${edit.id}`, { method: 'PATCH', body }) : api('/admin/contractors', { method: 'POST', body }));
      invalidateRef('contractors'); setEdit(null); list.reload();
    } catch (x) { setMsg(errText(x)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Remove this contractor? Contractors with past bookings are deactivated instead.')) return;
    try { const r = await api(`/admin/contractors/${edit.id}`, { method: 'DELETE' }); alert(r.message); invalidateRef('contractors'); setEdit(null); list.reload(); } catch (x) { setMsg(x.message); }
  };

  return (
    <>
      <Header title="Contractors" subtitle="Field experts who visit sites, measure and prepare quotations">{can(user, 'contractors.create') && <Button size="sm" onClick={() => open(null)}><Plus className="size-4" />Add contractor</Button>}</Header>
      <Filters params={list.params} setParams={list.setParams} placeholder="Name, mobile or email" filters={[{ name: 'active', label: 'Status', options: [['true', 'Active'], ['false', 'Inactive']] }]} />
      <DataTable tableId="contractors" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })} empty="No contractors yet."
        columns={[
          { key: 'name', label: 'Name', render: (r) => <span className="flex items-center gap-2">{r.photoUrl && <img src={r.photoUrl} alt="" className="size-8 rounded-full object-cover" />}<span><span className="block font-medium">{r.name}</span><span className="text-xs text-graphite">{r.contractorCode}</span></span></span> },
          { key: 'mobile', label: 'Mobile', render: (r) => `+91 ${r.mobile}` }, { key: 'city', label: 'City' },
          { key: 'serviceAreas', label: 'Areas', render: (r) => r.serviceAreas.join(', ') || '—' },
          { key: 'specializations', label: 'Specialisations', defaultHidden: true, render: (r) => r.specializations.join(', ') || '—' },
          { key: 'openBookings', label: 'Open bookings' },
          { key: 'perm', label: 'Access', render: (r) => (r.customPermissions ? `${r.permissions.length} custom` : 'Role default') },
          { key: 'status', label: 'Status', render: (r) => <><Pill value={r.status} />{!r.loginEnabled && <span className="ml-1"><Pill tone="outline">Login off</Pill></span>}</> },
          ...(can(user, 'contractors.edit') ? [{ key: 'e', label: '', className: 'text-right', render: (r) => <Button size="sm" variant="ghost" onClick={() => open(r)}>Edit</Button> }] : []),
        ]} />
      <Drawer open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? 'Edit contractor' : 'Add contractor'}
        footer={<>{edit?.id && can(user, 'contractors.delete') && <Button variant="ghost" className="mr-auto" onClick={remove}>Remove</Button>}<Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
        {edit && <Fields value={edit.form} onChange={(f) => setEdit((e) => ({ ...e, form: f }))} fields={[
          { name: 'name', label: 'Full name' }, { name: 'mobile', label: 'Mobile', type: 'tel' },
          { name: 'email', label: 'Email', type: 'email', hint: 'Needed for password login' }, { name: 'password', label: edit.id ? 'New password (optional)' : 'Password (optional)', type: 'password', autoComplete: 'new-password', hint: 'Min 10 chars, letters and numbers. Contractors can also log in with OTP.' },
          { name: 'contractorCode', label: 'Contractor ID', hint: 'Leave blank to generate' }, { name: 'experienceYears', label: 'Experience (years)', type: 'number', nullable: true },
          { name: 'city', label: 'City' }, { name: 'address.pincode', label: 'Pincode' },
          { name: 'address.formattedAddress', label: 'Address', wide: true },
          { name: 'serviceAreas', label: 'Service areas', type: 'tags' }, { name: 'specializations', label: 'Specialisations', type: 'tags' },
          { name: 'photoUrl', label: 'Profile photo', type: 'image', purpose: 'AVATAR', idField: 'photo', hint: 'Upload a photo; it is saved with the profile' },
          { name: 'notes', label: 'Internal notes', type: 'textarea', rows: 2 },
          { name: 'isActive', label: 'Status', type: 'switch', help: 'Active' }, { name: 'loginEnabled', label: 'Login', type: 'switch', help: 'Can log in' },
          ...(canPerms ? [
            { name: 'customPermissions', label: 'Access', type: 'switch', help: 'Set exactly what this contractor can access (overrides the Contractor role)' },
            { name: 'permissions', label: 'Permissions', type: 'multiselect', options: permOptions, hideIf: (v) => !v.customPermissions },
          ] : []),
        ]} />}
        {msg && <Notice tone="error" className="mt-4">{msg}</Notice>}
      </Drawer>
    </>
  );
}

// ── Staff users ──────────────────────────────────────────────
export function StaffUsers() {
  const user = useAuth((s) => s.user);
  const list = useList('/admin/users', { limit: '50' });
  const roles = useApi('/admin/roles');
  const permOptions = usePermissionOptions();
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const roleOptions = (roles.data?.items || []).filter((r) => r.isStaff && !['CONTRACTOR', 'CUSTOMER'].includes(r.key) && (r.key !== 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN')).map((r) => ({ value: r.key, label: r.name }));
  const manage = can(user, 'users.manage');

  const save = async () => {
    setBusy(true); setMsg(null);
    const f = edit.form;
    try {
      if (edit.id) {
        const body = { name: f.name, mobile: f.mobile || null, role: f.role, status: f.status, loginEnabled: f.loginEnabled, reason: f.reason || undefined };
        if (user.role === 'SUPER_ADMIN') body.permissions = f.permissions;
        await api(`/admin/users/${edit.id}`, { method: 'PATCH', body });
        if (f.newPassword) await api(`/admin/users/${edit.id}/reset-password`, { method: 'POST', body: { password: f.newPassword } });
      } else {
        await api('/admin/users', { method: 'POST', body: { name: f.name, email: f.email, mobile: f.mobile || undefined, role: f.role, password: f.password, permissions: user.role === 'SUPER_ADMIN' ? f.permissions : [] } });
      }
      setEdit(null); list.reload();
    } catch (x) { setMsg(errText(x)); } finally { setBusy(false); }
  };
  const forceLogout = async () => { try { const r = await api(`/admin/users/${edit.id}/force-logout`, { method: 'POST' }); alert(r.message); } catch (x) { setMsg(x.message); } };

  return (
    <>
      <Header title="Staff users" subtitle="Admins and other staff. Contractors are managed on their own page.">{manage && <Button size="sm" onClick={() => { setMsg(null); setEdit({ form: { name: '', email: '', mobile: '', role: 'ADMIN', password: '', permissions: [] } }); }}><Plus className="size-4" />Add user</Button>}</Header>
      <DataTable tableId="users" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        columns={[
          { key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'role', label: 'Role', render: (r) => r.role.replace(/_/g, ' ').toLowerCase() },
          { key: 'extra', label: 'Extra permissions', render: (r) => r.permissions.length || '—' }, { key: 'status', label: 'Status', render: (r) => <Pill value={r.status} /> },
          { key: 'lastLogin', label: 'Last login', render: (r) => fmtDateTime(r.lastLogin) },
          ...(manage ? [{ key: 'e', label: '', className: 'text-right', render: (r) => (r.id === user.id ? <span className="text-xs text-graphite">You</span> : <Button size="sm" variant="ghost" onClick={() => { setMsg(null); setEdit({ id: r.id, form: { ...r, mobile: r.mobile || '', newPassword: '', reason: '' } }); }}>Edit</Button>) }] : []),
        ]} />
      <Drawer open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? 'Edit user' : 'Add staff user'}
        footer={<>{edit?.id && <Button variant="ghost" className="mr-auto" onClick={forceLogout}>Sign out everywhere</Button>}<Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
        {edit && <Fields value={edit.form} onChange={(f) => setEdit((e) => ({ ...e, form: f }))} fields={[
          { name: 'name', label: 'Name' },
          edit.id ? { name: 'email', label: 'Email', hint: 'Email cannot be changed', type: 'email' } : { name: 'email', label: 'Email', type: 'email' },
          { name: 'mobile', label: 'Mobile (optional)', type: 'tel' },
          { name: 'role', label: 'Role', type: 'select', placeholder: false, options: roleOptions },
          ...(edit.id ? [
            { name: 'status', label: 'Status', type: 'select', placeholder: false, options: ['ACTIVE', 'INACTIVE', 'BLOCKED'] },
            { name: 'loginEnabled', label: 'Login', type: 'switch', help: 'Can log in' },
            { name: 'newPassword', label: 'Reset password (optional)', type: 'password', autoComplete: 'new-password' },
            { name: 'reason', label: 'Reason for change (audit log)' },
          ] : [{ name: 'password', label: 'Temporary password', type: 'password', autoComplete: 'new-password', hint: 'Min 10 characters with letters and numbers' }]),
          ...(user.role === 'SUPER_ADMIN' ? [{ name: 'permissions', label: 'Extra permissions on top of the role', type: 'multiselect', options: permOptions }] : []),
        ]} />}
        {msg && <Notice tone="error" className="mt-4">{msg}</Notice>}
      </Drawer>
    </>
  );
}

// ── Roles ────────────────────────────────────────────────────
export function Roles() {
  const { data, error, loading, reload } = useApi('/admin/roles');
  const perms = useApi('/admin/permissions');
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMsg(null), [edit?.id]);
  if (loading && !data) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  const groups = perms.data?.groups || [];
  const save = async () => {
    setBusy(true); setMsg(null);
    const f = edit.form;
    try {
      if (edit.id) await api(`/admin/roles/${edit.id}`, { method: 'PATCH', body: { name: f.name, description: f.description, permissions: f.permissions, reason: f.reason || undefined } });
      else await api('/admin/roles', { method: 'POST', body: { key: f.key, name: f.name, description: f.description, permissions: f.permissions } });
      setEdit(null); reload();
    } catch (x) { setMsg(errText(x)); } finally { setBusy(false); }
  };
  const remove = async () => { if (!window.confirm('Delete this role?')) return; try { await api(`/admin/roles/${edit.id}`, { method: 'DELETE' }); setEdit(null); reload(); } catch (x) { setMsg(x.message); } };
  const toggle = (k) => setEdit((e) => ({ ...e, form: { ...e.form, permissions: e.form.permissions.includes(k) ? e.form.permissions.filter((x) => x !== k) : [...e.form.permissions, k] } }));

  return (
    <>
      <Header title="Roles & permissions" subtitle="Permission checks are enforced by the API, not only by hiding buttons."><Button size="sm" onClick={() => setEdit({ form: { key: '', name: '', description: '', permissions: [] } })}><Plus className="size-4" />New role</Button></Header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.items.map((r) => (
          <Box key={r.id} title={r.name} action={r.key !== 'SUPER_ADMIN' && <Button size="sm" variant="ghost" onClick={() => setEdit({ id: r.id, system: r.isSystem, form: { ...r, reason: '' } })}>Edit</Button>}>
            <p className="text-sm text-graphite">{r.description || '—'}</p>
            <p className="mt-2 text-sm">{r.key === 'SUPER_ADMIN' ? 'All permissions' : `${r.permissions.length} permissions`}, {r.users} user{r.users === 1 ? '' : 's'}</p>
            {r.isSystem && <p className="mt-1 text-xs text-graphite">System role</p>}
          </Box>
        ))}
      </div>
      <Drawer open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${edit.form.name}` : 'New role'} width="max-w-3xl"
        footer={<>{edit?.id && !edit.system && <Button variant="ghost" className="mr-auto" onClick={remove}>Delete role</Button>}<Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
        {edit && (
          <>
            <Fields value={edit.form} onChange={(f) => setEdit((e) => ({ ...e, form: f }))} fields={[
              ...(edit.id ? [] : [{ name: 'key', label: 'Key', hint: 'UPPER_SNAKE_CASE, e.g. SALES_MANAGER' }]),
              { name: 'name', label: 'Name' }, { name: 'description', label: 'Description', wide: true },
              ...(edit.id ? [{ name: 'reason', label: 'Reason for change (audit log)', wide: true }] : []),
            ]} />
            <div className="mt-6 space-y-4">
              {groups.map((g) => (
                <fieldset key={g.group} className="rounded-[3px] border border-stone p-3">
                  <legend className="px-1 text-sm font-semibold">{g.group}</legend>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {g.permissions.map((p) => (
                      <label key={p.key} className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-0.5 accent-[var(--color-wine)]" checked={edit.form.permissions.includes(p.key)} onChange={() => toggle(p.key)} disabled={edit.form.key === 'CUSTOMER'} />
                        <span><span className="font-mono text-xs">{p.key}</span><span className="block text-xs text-graphite">{p.description}</span></span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </>
        )}
        {msg && <Notice tone="error" className="mt-4">{msg}</Notice>}
      </Drawer>
    </>
  );
}
