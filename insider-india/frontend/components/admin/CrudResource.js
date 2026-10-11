'use client';

import { useState } from 'react';
import { Plus, ArrowUp, ArrowDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Drawer from './Drawer';
import { Header, DataTable } from './Kit';
import { Fields } from './Form';
import Filters from './Filters';
import { useList } from './useList';
import { api } from '@/lib/api';
import { useAuth } from '@/store/auth';
import { can } from '@/lib/admin';

/**
 * Generic list + drawer editor for admin collections.
 * props: endpoint, title, subtitle, columns, fields, defaults, managePerm, reorder, filters, toForm, fromForm, embedded
 */
export default function CrudResource({ endpoint, title, subtitle, columns, fields, defaults = {}, managePerm, reorder = false, filters = [], toForm = (x) => x, fromForm = (x) => x, embedded = false, deleteLabel = 'Delete', listDefaults = { limit: '100' } }) {
  const user = useAuth((s) => s.user);
  const list = useList(endpoint, listDefaults);
  const [editing, setEditing] = useState(null); // { id?, form }
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const manage = can(user, managePerm);

  const save = async () => {
    setBusy(true); setErrors({}); setMsg(null);
    try {
      const body = fromForm(editing.form);
      const r = editing.id ? await api(`${endpoint}/${editing.id}`, { method: 'PATCH', body }) : await api(endpoint, { method: 'POST', body });
      setEditing(null); setMsg({ tone: 'success', text: r.message }); list.reload();
    } catch (x) {
      setErrors(x.fieldErrors?.() || {});
      setMsg({ tone: 'error', text: x.errors?.length ? `${x.message}: ${x.errors.slice(0, 4).map((e) => `${e.field} — ${e.message}`).join('; ')}` : x.message, inDrawer: true });
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!window.confirm('Delete this item? Items in use are deactivated instead.')) return;
    setBusy(true);
    try { const r = await api(`${endpoint}/${editing.id}`, { method: 'DELETE' }); setEditing(null); setMsg({ tone: 'success', text: r.message }); list.reload(); } catch (x) { setMsg({ tone: 'error', text: x.message, inDrawer: true }); } finally { setBusy(false); }
  };
  const move = async (idx, d) => {
    const ids = list.rows.map((r) => r.id);
    [ids[idx], ids[idx + d]] = [ids[idx + d], ids[idx]];
    try { await api(`${endpoint}/reorder`, { method: 'PATCH', body: { ids } }); list.reload(); } catch (x) { setMsg({ tone: 'error', text: x.message }); }
  };

  const cols = [
    ...columns,
    ...(reorder && manage ? [{ key: '_order', label: 'Order', render: (r) => { const i = list.rows.indexOf(r); return <span className="flex gap-0.5"><Button size="sm" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-3.5" /></Button><Button size="sm" variant="ghost" aria-label="Move down" disabled={i === list.rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-3.5" /></Button></span>; } }] : []),
    ...(manage ? [{ key: '_edit', label: '', className: 'text-right', render: (r) => <Button size="sm" variant="ghost" onClick={() => { setErrors({}); setMsg(null); setEditing({ id: r.id, form: toForm(r) }); }}>Edit</Button> }] : []),
  ];

  const Wrap = embedded ? 'div' : 'section';
  return (
    <Wrap>
      {!embedded && <Header title={title} subtitle={subtitle}>{manage && <Button size="sm" onClick={() => { setErrors({}); setMsg(null); setEditing({ form: structuredClone(defaults) }); }}><Plus className="size-4" />Add</Button>}</Header>}
      {embedded && manage && <div className="mb-3 flex justify-end"><Button size="sm" onClick={() => { setErrors({}); setMsg(null); setEditing({ form: structuredClone(defaults) }); }}><Plus className="size-4" />Add</Button></div>}
      {msg && !msg.inDrawer && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      {filters.length > 0 && <Filters params={list.params} setParams={list.setParams} filters={filters} />}
      <DataTable {...list} columns={cols} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })} />
      <Drawer open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${title.replace(/s$/, '').toLowerCase()}` : `Add ${title.replace(/s$/, '').toLowerCase()}`}
        footer={<>{editing?.id && <Button variant="ghost" className="mr-auto" onClick={remove} disabled={busy}>{deleteLabel}</Button>}<Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} loading={busy}>Save</Button></>}>
        {editing && <Fields fields={fields} value={editing.form} onChange={(f) => setEditing((e) => ({ ...e, form: f }))} errors={errors} />}
        {msg?.inDrawer && <Notice tone={msg.tone} className="mt-4">{msg.text}</Notice>}
      </Drawer>
    </Wrap>
  );
}
