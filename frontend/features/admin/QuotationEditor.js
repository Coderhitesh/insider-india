'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, Download, ImagePlus, X, Ruler, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import Dialog from '@/components/account/Dialog';
import { Header, Box, Pill, Loader, Failed } from '@/components/admin/Kit';
import { api, uploadFile } from '@/lib/api';
import { useApi, openSigned } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can, isContractor, inr, inr2, fmtDateTime } from '@/lib/admin';
import { PUBLIC_API_URL } from '@/lib/config';
import { preview } from './quoteCalc';

const UNITS = ['PCS', 'SQFT', 'RFT', 'FT', 'INCH', 'MM', 'CM', 'M', 'SQM'];
const SECTION_PRESETS = ['Modular Kitchen', 'Wardrobe', 'Bedroom', 'Bed', 'TV Unit', 'False Ceiling', 'Painting', 'Wall Panelling', 'Electrical Work', 'Civil Work', 'Doors', 'Furniture', 'Pooja Unit', 'Bathroom', 'Flooring'];
const inp = 'w-full min-w-0 rounded-none border border-stone-deep bg-paper px-2 py-1.5 text-sm focus:border-wine focus:outline-none disabled:border-stone disabled:bg-blush/50 disabled:text-graphite';
// Turns the measurement sheet into quotation sections: one section per room, one item per measurement.
const AREA_UNIT = { FT: 'SQFT', INCH: 'SQFT', SQFT: 'SQFT', M: 'SQM', CM: 'SQM', MM: 'SQM', SQM: 'SQM' };
const RUN_UNIT = { FT: 'RFT', RFT: 'RFT', INCH: 'RFT', M: 'M', CM: 'M', MM: 'M' };
function sectionsFromMeasurement(m) {
  return (m?.rooms || []).filter((r) => r.rows?.length).map((r) => ({
    title: r.name,
    items: r.rows.map((x) => {
      const dims = [x.width, x.height, x.length].filter(Boolean).join(' × ');
      const area = x.area || (x.width && (x.length || x.height) ? Math.round(x.width * (x.length || x.height) * 100) / 100 : null);
      const qty = area || x.length || x.width || x.quantity || 1;
      const unit = area ? (AREA_UNIT[x.unit] || 'SQFT') : (x.length || x.width) ? (RUN_UNIT[x.unit] || x.unit) : 'PCS';
      return { ...blankItem(), name: x.label, dimensions: dims ? `${dims} ${x.unit.toLowerCase()}` : '', quantity: Math.round(qty * (x.quantity > 1 && area ? x.quantity : 1) * 100) / 100, unit, notes: x.notes || '' };
    }),
  }));
}

const FLOW = [['DRAFT', 'Draft'], ['UNDER_ADMIN_REVIEW', 'Admin review'], ['APPROVED', 'Approved'], ['SENT_TO_CUSTOMER', 'Sent to customer'], ['ACCEPTED', 'Accepted']];
const GUIDE = {
  DRAFT: 'Add sections and items with quantity and rates (material + labour, or a unit price), Save, then click Submit for admin review.',
  UNDER_ADMIN_REVIEW: 'Admin: check every rate. Changing a price asks for a reason (saved in the audit log). Add discounts, GST, validity and payment schedule, Preview PDF, then Approve & send to customer.',
  APPROVED: 'Approved but not sent. Click Send to customer — the PDF is generated and the customer is notified on WhatsApp and in their dashboard.',
  SENT_TO_CUSTOMER: 'Waiting for the customer to accept, request a revision or decline from their dashboard.',
  REVISION_REQUESTED: 'The customer asked for changes (see their note). Click Create revision, update the new version, then Approve & send again.',
  REJECTED: 'The customer declined. If they want changes, Create revision and send again.',
  ACCEPTED: 'Accepted. A project has been created — open Projects to start it and track stages and payments.',
};

const blankItem = () => ({ name: '', category: '', description: '', material: '', finish: '', dimensions: '', quantity: 1, unit: 'PCS', unitPrice: 0, materialPrice: 0, labourPrice: 0, taxPercent: null, notes: '', image: null, customFields: [] });

function toState(q) {
  return {
    sections: q.sections.map((s) => ({ ...s, _id: s._id, items: s.items.map((i) => ({ ...i, _id: i._id, image: i.image || null, _imageUrl: q.images?.[i.image] || null })) })),
    additionalCharges: q.additionalCharges,
    discounts: q.discounts,
    gstPercent: q.gstPercent,
    paymentSchedule: q.paymentSchedule || [],
    validUntil: q.validUntil ? q.validUntil.slice(0, 10) : '',
    contractorNotes: q.contractorNotes || '', adminNotes: q.adminNotes || '', customerNotes: q.customerNotes || '',
    waive: false,
  };
}

export default function QuotationEditor({ id }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { data, error, loading, reload, setData } = useApi(`/quotations/${id}`);
  const [s, setS] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [dialog, setDialog] = useState(null); // { kind, note }
  const [sheet, setSheet] = useState(false);
  const q = data?.quotation;
  const measurement = useApi(q ? `/measurements/booking/${q.bookingId}` : null);

  useEffect(() => { if (q) { setS(toState(q)); setDirty(false); } }, [q]);
  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const calc = useMemo(() => (s ? preview({ ...s, additionalCharges: s.waive ? s.additionalCharges.filter((c) => !c.system) : s.additionalCharges }) : null), [s]);
  if (loading && !q) return <Loader />;
  if (error) return <Failed error={error} retry={reload} />;
  if (!s) return <Loader />;

  const contractor = isContractor(user);
  const isAdmin = !contractor && can(user, 'quotations.review');
  const canDiscount = !contractor && can(user, 'quotations.discount');
  const editable = q.isLatest && (contractor ? q.status === 'DRAFT' && can(user, 'quotations.edit') : ['DRAFT', 'UNDER_ADMIN_REVIEW', 'APPROVED'].includes(q.status) && (isAdmin || can(user, 'quotations.edit')));
  const change = (fn) => { setS((prev) => fn(prev)); setDirty(true); };
  const setSection = (si, patch) => change((p) => ({ ...p, sections: p.sections.map((x, i) => (i === si ? { ...x, ...patch } : x)) }));
  const setItem = (si, ii, patch) => change((p) => ({ ...p, sections: p.sections.map((x, i) => (i === si ? { ...x, items: x.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) } : x)) }));
  const moveItem = (si, ii, d) => change((p) => ({ ...p, sections: p.sections.map((x, i) => { if (i !== si) return x; const items = [...x.items]; [items[ii], items[ii + d]] = [items[ii + d], items[ii]]; return { ...x, items }; }) }));

  const payload = (reason) => {
    const body = {
      sections: s.sections.map((sec) => ({
        ...(sec._id ? { _id: sec._id } : {}), title: sec.title || 'Section', category: sec.category || undefined, notes: sec.notes || undefined,
        items: sec.items.filter((it) => it.name.trim()).map((it) => ({
          ...(it._id ? { _id: it._id } : {}), name: it.name.trim(), category: it.category || undefined, description: it.description || undefined,
          material: it.material || undefined, finish: it.finish || undefined, dimensions: it.dimensions || undefined,
          quantity: Number(it.quantity) || 0, unit: it.unit, unitPrice: Number(it.unitPrice) || 0, materialPrice: Number(it.materialPrice) || 0, labourPrice: Number(it.labourPrice) || 0,
          taxPercent: it.taxPercent === '' || it.taxPercent == null ? null : Number(it.taxPercent), notes: it.notes || undefined,
          image: it.image || null, customFields: (it.customFields || []).filter((c) => c.label),
        })),
      })),
      additionalCharges: s.additionalCharges.filter((c) => !c.system && c.label).map((c) => ({ label: c.label, amount: Number(c.amount) || 0, taxable: Boolean(c.taxable) })),
      contractorNotes: s.contractorNotes, customerNotes: s.customerNotes,
    };
    if (isAdmin) Object.assign(body, { gstPercent: Number(s.gstPercent), paymentSchedule: s.paymentSchedule.filter((p) => p.label).map((p) => ({ label: p.label, percent: Number(p.percent) })), validUntil: s.validUntil || null, adminNotes: s.adminNotes });
    if (canDiscount) Object.assign(body, { discounts: s.discounts.map((d) => ({ type: d.type, mode: d.mode, value: Number(d.value) || 0, label: d.label || undefined, reason: d.reason || undefined })), ...(s.waive ? { waiveMeasurementCharge: true } : {}) });
    if (reason) body.reason = reason;
    return body;
  };

  const save = async (reason) => {
    setBusy('save'); setMsg(null);
    try {
      const r = await api(`/quotations/${id}`, { method: 'PATCH', body: payload(reason) });
      setData({ quotation: r.data.quotation });
      setMsg({ tone: 'success', text: r.message });
      return true;
    } catch (x) {
      if (x.errors?.some((e) => e.field === 'reason')) { setDialog({ kind: 'reason', note: '' }); return false; }
      setMsg({ tone: 'error', text: x.errors?.length ? `${x.message}: ${x.errors.slice(0, 3).map((e) => e.message).join('; ')}` : x.message });
      return false;
    } finally { setBusy(null); }
  };

  const act = async (kind, body = {}) => {
    if (dirty && editable && !(await save())) return;
    setBusy(kind); setMsg(null);
    try {
      const r = await api(`/quotations/${id}/${kind}`, { method: 'POST', body });
      if (kind === 'revise') { router.push(`/admin/quotations/${r.data.quotation.id}`); return; }
      setData({ quotation: r.data.quotation });
      setMsg({ tone: 'success', text: r.message });
    } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(null); setDialog(null); }
  };

  const previewPdf = async () => {
    setBusy('preview');
    try {
      const w = window.open('', '_blank');
      const res = await fetch(`${PUBLIC_API_URL}/api/v1/quotations/${id}/preview-pdf`, { credentials: 'include', headers: { Authorization: `Bearer ${useAuth.getState().accessToken}` } });
      if (!res.ok) { w?.close(); throw new Error('Preview failed'); }
      const url = URL.createObjectURL(await res.blob());
      if (w) w.location.href = url; else window.open(url);
    } catch (x) { setMsg({ tone: 'error', text: x.message }); } finally { setBusy(null); }
  };

  const system = s.additionalCharges.filter((c) => c.system);
  const custom = s.additionalCharges.filter((c) => !c.system);
  const pctTotal = s.paymentSchedule.reduce((t, p) => t + (Number(p.percent) || 0), 0);

  return (
    <>
      <Header title={q.displayNumber} subtitle={`${q.contractor?.name ? `Contractor: ${q.contractor.name}. ` : ''}Updated ${fmtDateTime(q.updatedAt)}`} back={[`/admin/bookings/${q.bookingId}`, 'Booking']}>
        <Pill value={q.isLatest ? q.status : 'SUPERSEDED'} tone={q.isLatest ? undefined : 'outline'} />
        <Button size="sm" variant="ghost" onClick={() => setSheet(true)}>Measurements</Button>
        <Button size="sm" variant="ghost" onClick={previewPdf} loading={busy === 'preview'}><Eye className="size-4" />Preview PDF</Button>
        {q.hasPdf && <Button size="sm" variant="ghost" onClick={() => openSigned(async () => (await api(`/quotations/${id}/pdf`)).data.url).catch((x) => setMsg({ tone: 'error', text: x.message }))}><Download className="size-4" />Sent PDF</Button>}
        {editable && <Button size="sm" variant="secondary" disabled={!dirty} loading={busy === 'save'} onClick={() => save()}>Save</Button>}
        {q.isLatest && q.status === 'DRAFT' && can(user, 'quotations.edit') && <Button size="sm" loading={busy === 'submit'} onClick={() => act('submit')}>Submit for admin review</Button>}
        {q.isLatest && ['UNDER_ADMIN_REVIEW', 'APPROVED'].includes(q.status) && isAdmin && <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: 'return', note: '' })}>Return to contractor</Button>}
        {q.isLatest && q.status === 'UNDER_ADMIN_REVIEW' && can(user, 'quotations.approve') && <Button size="sm" variant="secondary" loading={busy === 'approve'} onClick={() => act('approve', { send: false })}>Approve</Button>}
        {q.isLatest && q.status === 'UNDER_ADMIN_REVIEW' && can(user, 'quotations.approve') && can(user, 'quotations.send') && <Button size="sm" onClick={() => setDialog({ kind: 'approveSend' })}>Approve &amp; send to customer</Button>}
        {q.isLatest && q.status === 'APPROVED' && can(user, 'quotations.send') && <Button size="sm" onClick={() => setDialog({ kind: 'send' })}>Send to customer</Button>}
        {q.isLatest && ['SENT_TO_CUSTOMER', 'REJECTED', 'REVISION_REQUESTED'].includes(q.status) && isAdmin && <Button size="sm" onClick={() => setDialog({ kind: 'revise', note: '', returnToContractor: false })}>Create revision</Button>}
      </Header>

      {q.isLatest && (
        <div className="mb-4 border-2 border-wine bg-paper">
          <ol className="grid grid-cols-5 gap-px bg-stone-deep text-xs">
            {FLOW.map(([k, l], i) => {
              const idx = FLOW.findIndex(([x]) => x === (['REVISION_REQUESTED', 'REJECTED'].includes(q.status) ? 'SENT_TO_CUSTOMER' : q.status));
              const state = i < idx ? 'done' : i === idx ? 'now' : 'todo';
              return <li key={k} className={`flex items-center gap-1.5 px-3 py-2 ${state === 'now' ? 'bg-wine font-semibold text-paper' : state === 'done' ? 'bg-paper text-charcoal' : 'bg-paper text-graphite'}`}>{state === 'done' && <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />}{i + 1}. {l}</li>;
            })}
          </ol>
          <p className="px-4 py-3 text-sm"><strong>What to do now: </strong>{GUIDE[q.status]}</p>
        </div>
      )}
      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      {!editable && q.isLatest && <Notice className="mb-4">{contractor && q.status !== 'DRAFT' ? 'Submitted — an admin is reviewing this quotation. You will be notified if changes are needed.' : 'This version is locked. Create a revision to change it.'}</Notice>}
      {q.customerResponse?.note && <Notice className="mb-4">Customer note ({fmtDateTime(q.customerResponse.at)}): {q.customerResponse.note}</Notice>}
      {dirty && <p className="mb-3 text-sm text-brass">Unsaved changes. Totals below are a preview until you save.</p>}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {s.sections.map((sec, si) => (
            <Box key={sec._id || `n${si}`} pad={false} title={
              <span className="flex flex-wrap items-center gap-2">
                <input aria-label="Section title" list="section-presets" className={`${inp} w-56 font-semibold`} value={sec.title} disabled={!editable} onChange={(e) => setSection(si, { title: e.target.value })} />
                <span className="tabular text-sm font-normal text-graphite">{inr2(calc.sections[si].subtotal)}</span>
              </span>}
              action={editable && <Button size="sm" variant="ghost" aria-label="Remove section" onClick={() => window.confirm(`Remove section "${sec.title}"?`) && change((p) => ({ ...p, sections: p.sections.filter((_, i) => i !== si) }))}><Trash2 className="size-4" /></Button>}>
              <div className="divide-y divide-stone">
                {sec.items.map((it, ii) => {
                  const split = Number(it.materialPrice) > 0 || Number(it.labourPrice) > 0;
                  const amount = calc.sections[si].items[ii].amount;
                  return (
                    <div key={it._id || `i${ii}`} className="grid gap-2 p-4 md:grid-cols-12">
                      <input aria-label="Item name" placeholder="Item name" className={`${inp} font-medium md:col-span-5`} value={it.name} disabled={!editable} onChange={(e) => setItem(si, ii, { name: e.target.value })} />
                      <input aria-label="Material" placeholder="Material" className={`${inp} md:col-span-2`} value={it.material || ''} disabled={!editable} onChange={(e) => setItem(si, ii, { material: e.target.value })} />
                      <input aria-label="Finish" placeholder="Finish" className={`${inp} md:col-span-2`} value={it.finish || ''} disabled={!editable} onChange={(e) => setItem(si, ii, { finish: e.target.value })} />
                      <input aria-label="Dimensions" placeholder="Dimensions" className={`${inp} md:col-span-3`} value={it.dimensions || ''} disabled={!editable} onChange={(e) => setItem(si, ii, { dimensions: e.target.value })} />
                      <textarea aria-label="Description" placeholder="Description / specification" rows={1} className={`${inp} md:col-span-12`} value={it.description || ''} disabled={!editable} onChange={(e) => setItem(si, ii, { description: e.target.value })} />
                      <label className="text-xs text-graphite md:col-span-1">Qty<input type="number" step="any" min="0" className={inp} value={it.quantity} disabled={!editable} onChange={(e) => setItem(si, ii, { quantity: e.target.value })} /></label>
                      <label className="text-xs text-graphite md:col-span-2">Unit<select className={inp} value={it.unit} disabled={!editable} onChange={(e) => setItem(si, ii, { unit: e.target.value })}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></label>
                      <label className="text-xs text-graphite md:col-span-2">Material ₹/unit<input type="number" step="any" min="0" className={inp} value={it.materialPrice} disabled={!editable} onChange={(e) => setItem(si, ii, { materialPrice: e.target.value })} /></label>
                      <label className="text-xs text-graphite md:col-span-2">Labour ₹/unit<input type="number" step="any" min="0" className={inp} value={it.labourPrice} disabled={!editable} onChange={(e) => setItem(si, ii, { labourPrice: e.target.value })} /></label>
                      <label className="text-xs text-graphite md:col-span-2">Unit price{split && ' (auto)'}<input type="number" step="any" min="0" className={inp} value={split ? calc.sections[si].items[ii].unitPriceEff : it.unitPrice} disabled={!editable || split} onChange={(e) => setItem(si, ii, { unitPrice: e.target.value })} /></label>
                      <label className="text-xs text-graphite md:col-span-1">GST %<input type="number" step="any" min="0" max="28" placeholder={String(s.gstPercent)} className={inp} value={it.taxPercent ?? ''} disabled={!editable} onChange={(e) => setItem(si, ii, { taxPercent: e.target.value === '' ? null : e.target.value })} /></label>
                      <div className="flex flex-col justify-end text-right md:col-span-2"><span className="text-xs text-graphite">Amount</span><span className="tabular font-semibold">{inr2(amount)}</span></div>
                      <input aria-label="Item notes" placeholder="Notes" className={`${inp} md:col-span-8`} value={it.notes || ''} disabled={!editable} onChange={(e) => setItem(si, ii, { notes: e.target.value })} />
                      <div className="flex items-center justify-end gap-1 md:col-span-4">
                        <ItemImage value={it.image} imageUrl={it._imageUrl} disabled={!editable} onChange={(img, url) => setItem(si, ii, { image: img, _imageUrl: url })} />
                        {editable && <>
                          <Button size="sm" variant="ghost" aria-label="Move up" disabled={ii === 0} onClick={() => moveItem(si, ii, -1)}><ArrowUp className="size-3.5" /></Button>
                          <Button size="sm" variant="ghost" aria-label="Move down" disabled={ii === sec.items.length - 1} onClick={() => moveItem(si, ii, 1)}><ArrowDown className="size-3.5" /></Button>
                          <Button size="sm" variant="ghost" aria-label="Remove item" onClick={() => change((p) => ({ ...p, sections: p.sections.map((x, i) => (i === si ? { ...x, items: x.items.filter((_, j) => j !== ii) } : x)) }))}><Trash2 className="size-3.5" /></Button>
                        </>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {editable && <div className="border-t border-stone p-3"><Button size="sm" variant="ghost" onClick={() => change((p) => ({ ...p, sections: p.sections.map((x, i) => (i === si ? { ...x, items: [...x.items, blankItem()] } : x)) }))}><Plus className="size-4" />Add item</Button></div>}
            </Box>
          ))}
          {editable && !s.sections.length && (
            <div className="border-2 border-dashed border-wine bg-blush/40 p-6">
              <p className="font-semibold">Start the quotation</p>
              <p className="mt-1 text-sm text-graphite">Fastest way: pull every room and measurement from the site sheet, then just fill in the rates.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={!measurement.data?.measurement?.rooms?.length} onClick={() => change((p) => ({ ...p, sections: sectionsFromMeasurement(measurement.data.measurement) }))}><Ruler className="size-4" />Add from measurements</Button>
                <Button size="sm" variant="secondary" onClick={() => change((p) => ({ ...p, sections: [{ title: '', items: [blankItem()] }] }))}><Plus className="size-4" />Blank section</Button>
              </div>
            </div>
          )}
          {editable && s.sections.length > 0 && measurement.data?.measurement?.rooms?.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => window.confirm('Append a section for every measured room?') && change((p) => ({ ...p, sections: [...p.sections, ...sectionsFromMeasurement(measurement.data.measurement)] }))}><Ruler className="size-4" />Add rooms from measurements</Button>
          )}
          <datalist id="section-presets">{SECTION_PRESETS.map((p) => <option key={p} value={p} />)}</datalist>
          {editable && <Button variant="secondary" onClick={() => change((p) => ({ ...p, sections: [...p.sections, { title: '', items: [blankItem()] }] }))}><Plus className="size-4" />Add section</Button>}
          {!s.sections.length && !editable && <p className="text-graphite">No sections.</p>}
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:h-max">
          <Box title="Totals">
            <dl className="space-y-1.5 text-sm">
              {[['Material', calc.material], ['Labour', calc.labour], ['Subtotal', calc.subtotal], ['Discounts', -calc.discount], ['Additional charges', calc.charges], ['Taxable value', calc.taxable], ['GST', calc.gst], ['Round off', calc.roundOff]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt className="text-graphite">{k}</dt><dd className="tabular">{inr2(v)}</dd></div>
              ))}
              <div className="flex justify-between border-t border-stone pt-2 text-base font-semibold"><dt>Grand total</dt><dd className="tabular">{inr(calc.grand)}</dd></div>
              {q.contractorGrandTotal && !contractor && <div className="flex justify-between text-xs text-graphite"><dt>Contractor submitted</dt><dd className="tabular">{inr(q.contractorGrandTotal)} ({calc.grand - q.contractorGrandTotal >= 0 ? '+' : '−'}{inr(Math.abs(calc.grand - q.contractorGrandTotal))})</dd></div>}
            </dl>
          </Box>

          <Box title="Charges">
            {system.map((c) => (
              <div key={c._id || c.label} className="mb-2 text-sm">
                <p className="flex justify-between"><span>{c.label}</span><span className={`tabular ${s.waive ? 'line-through text-graphite' : ''}`}>{inr2(c.amount)}</span></p>
                {canDiscount && editable && <label className="mt-1 flex items-center gap-2 text-xs"><input type="checkbox" checked={s.waive} onChange={(e) => change((p) => ({ ...p, waive: e.target.checked }))} className="accent-[var(--color-wine)]" />Waive this charge</label>}
              </div>
            ))}
            {custom.map((c, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_6rem_auto] items-center gap-1">
                <input aria-label="Charge label" className={inp} value={c.label} disabled={!editable} onChange={(e) => change((p) => ({ ...p, additionalCharges: [...p.additionalCharges.filter((x) => x.system), ...custom.map((x, j) => (j === i ? { ...x, label: e.target.value } : x))] }))} />
                <input aria-label="Charge amount" type="number" min="0" className={inp} value={c.amount} disabled={!editable} onChange={(e) => change((p) => ({ ...p, additionalCharges: [...p.additionalCharges.filter((x) => x.system), ...custom.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x))] }))} />
                {editable && <button type="button" aria-label="Remove charge" className="p-1 text-graphite" onClick={() => change((p) => ({ ...p, additionalCharges: [...p.additionalCharges.filter((x) => x.system), ...custom.filter((_, j) => j !== i)] }))}><X className="size-4" /></button>}
                <label className="col-span-3 flex items-center gap-2 text-xs text-graphite"><input type="checkbox" disabled={!editable} checked={c.taxable} onChange={(e) => change((p) => ({ ...p, additionalCharges: [...p.additionalCharges.filter((x) => x.system), ...custom.map((x, j) => (j === i ? { ...x, taxable: e.target.checked } : x))] }))} className="accent-[var(--color-wine)]" />GST applies</label>
              </div>
            ))}
            {editable && <Button size="sm" variant="ghost" onClick={() => change((p) => ({ ...p, additionalCharges: [...p.additionalCharges, { label: '', amount: 0, taxable: true }] }))}><Plus className="size-4" />Add charge</Button>}
          </Box>

          {(canDiscount || s.discounts.length > 0) && (
            <Box title="Discounts">
              {s.discounts.map((d, i) => (
                <div key={i} className="mb-3 grid grid-cols-2 gap-1">
                  <select aria-label="Discount type" className={inp} value={d.type} disabled={!editable || !canDiscount} onChange={(e) => change((p) => ({ ...p, discounts: p.discounts.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) }))}><option value="ADMIN">Admin discount</option><option value="PROMOTIONAL">Promotional</option></select>
                  <div className="flex gap-1">
                    <input aria-label="Discount value" type="number" min="0" className={inp} value={d.value} disabled={!editable || !canDiscount} onChange={(e) => change((p) => ({ ...p, discounts: p.discounts.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) }))} />
                    <select aria-label="Discount mode" className={`${inp} w-16`} value={d.mode} disabled={!editable || !canDiscount} onChange={(e) => change((p) => ({ ...p, discounts: p.discounts.map((x, j) => (j === i ? { ...x, mode: e.target.value } : x)) }))}><option value="FLAT">₹</option><option value="PERCENT">%</option></select>
                  </div>
                  <input aria-label="Label shown to customer" placeholder="Label shown to customer" className={`${inp} col-span-2`} value={d.label || ''} disabled={!editable || !canDiscount} onChange={(e) => change((p) => ({ ...p, discounts: p.discounts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
                  <input aria-label="Internal reason" placeholder="Internal reason" className={`${inp} col-span-2`} value={d.reason || ''} disabled={!editable || !canDiscount} onChange={(e) => change((p) => ({ ...p, discounts: p.discounts.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)) }))} />
                  {editable && canDiscount && <Button size="sm" variant="ghost" className="col-span-2 justify-self-end" onClick={() => change((p) => ({ ...p, discounts: p.discounts.filter((_, j) => j !== i) }))}>Remove</Button>}
                </div>
              ))}
              {editable && canDiscount && <Button size="sm" variant="ghost" onClick={() => change((p) => ({ ...p, discounts: [...p.discounts, { type: 'PROMOTIONAL', mode: 'FLAT', value: 0, label: '' }] }))}><Plus className="size-4" />Add discount</Button>}
            </Box>
          )}

          {!contractor && (
            <Box title="Tax, validity & payments">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-graphite">GST %<input type="number" min="0" max="28" className={inp} value={s.gstPercent} disabled={!editable || !isAdmin} onChange={(e) => change((p) => ({ ...p, gstPercent: e.target.value }))} /></label>
                <label className="text-xs text-graphite">Valid until<input type="date" className={inp} value={s.validUntil} disabled={!editable || !isAdmin} onChange={(e) => change((p) => ({ ...p, validUntil: e.target.value }))} /></label>
              </div>
              <p className="mt-4 text-xs font-medium text-graphite">Payment schedule {s.paymentSchedule.length > 0 && <span className={pctTotal === 100 ? 'text-success' : 'text-error'}>({pctTotal}%)</span>}</p>
              {s.paymentSchedule.map((p, i) => (
                <div key={i} className="mt-1 grid grid-cols-[1fr_4.5rem_auto] gap-1">
                  <input aria-label="Milestone" className={inp} value={p.label} disabled={!editable || !isAdmin} onChange={(e) => change((x) => ({ ...x, paymentSchedule: x.paymentSchedule.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)) }))} />
                  <input aria-label="Percent" type="number" min="0" max="100" className={inp} value={p.percent} disabled={!editable || !isAdmin} onChange={(e) => change((x) => ({ ...x, paymentSchedule: x.paymentSchedule.map((y, j) => (j === i ? { ...y, percent: e.target.value } : y)) }))} />
                  {editable && isAdmin && <button type="button" aria-label="Remove milestone" className="p-1 text-graphite" onClick={() => change((x) => ({ ...x, paymentSchedule: x.paymentSchedule.filter((_, j) => j !== i) }))}><X className="size-4" /></button>}
                </div>
              ))}
              {editable && isAdmin && <Button size="sm" variant="ghost" className="mt-1" onClick={() => change((x) => ({ ...x, paymentSchedule: [...x.paymentSchedule, { label: '', percent: 0 }] }))}><Plus className="size-4" />Add milestone</Button>}
            </Box>
          )}

          <Box title="Notes">
            <label className="block text-xs text-graphite">Contractor notes (internal)<textarea rows={2} className={inp} value={s.contractorNotes} disabled={!editable} onChange={(e) => change((p) => ({ ...p, contractorNotes: e.target.value }))} /></label>
            {!contractor && <label className="mt-2 block text-xs text-graphite">Admin notes (internal)<textarea rows={2} className={inp} value={s.adminNotes} disabled={!editable || !isAdmin} onChange={(e) => change((p) => ({ ...p, adminNotes: e.target.value }))} /></label>}
            <label className="mt-2 block text-xs text-graphite">Notes for customer (printed on PDF)<textarea rows={2} className={inp} value={s.customerNotes} disabled={!editable} onChange={(e) => change((p) => ({ ...p, customerNotes: e.target.value }))} /></label>
          </Box>

          {!contractor && q.priceChanges?.length > 0 && (
            <Box title={`Price changes (${q.priceChanges.length})`}>
              <ul className="max-h-72 space-y-2 overflow-y-auto text-xs">
                {q.priceChanges.slice().reverse().map((c, i) => (
                  <li key={i} className="border-b border-stone pb-2">
                    <p className="font-medium">{c.itemName || c.field.replace(/_/g, ' ').toLowerCase()}</p>
                    {c.itemName && <p>{c.field}: {typeof c.before === 'object' ? JSON.stringify(c.before) : String(c.before)} → {typeof c.after === 'object' ? JSON.stringify(c.after) : String(c.after)}</p>}
                    <p className="text-graphite">{c.reason} — {c.by?.name || 'Admin'}, {fmtDateTime(c.at)}</p>
                  </li>
                ))}
              </ul>
            </Box>
          )}
          <p className="text-xs text-graphite">Server totals are authoritative. <Link href={`/admin/quotations?bookingId=${q.bookingId}&allVersions=true`} className="underline">All versions</Link></p>
        </div>
      </div>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} title={{ reason: 'Reason for price change', return: 'Return to contractor', revise: 'Create a revision', approveSend: 'Approve and send', send: 'Send to customer' }[dialog?.kind] || ''}>
        {dialog?.kind === 'reason' && <ReasonForm label="This is recorded in the audit trail with each changed price." onSubmit={async (r) => { setDialog(null); await save(r); }} />}
        {dialog?.kind === 'return' && <ReasonForm label="Tell the contractor what to change." onSubmit={(r) => act('return', { note: r })} button="Return quotation" />}
        {dialog?.kind === 'revise' && (
          <ReasonForm label="What is changing in this revision?" optional button="Create revision" extra={(v, set) => (
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(v)} onChange={(e) => set(e.target.checked)} className="accent-[var(--color-wine)]" />Send back to contractor to edit</label>
          )} onSubmit={(r, ret) => act('revise', { note: r || undefined, returnToContractor: Boolean(ret) })} />
        )}
        {(dialog?.kind === 'approveSend' || dialog?.kind === 'send') && (
          <div className="space-y-4 text-sm">
            <p>The PDF will be generated and the customer notified on WhatsApp, in-app and by email. Grand total: <strong className="tabular">{inr(calc.grand)}</strong>.</p>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setDialog(null)}>Cancel</Button>
              <Button loading={busy === 'approve' || busy === 'send'} onClick={() => (dialog.kind === 'send' ? act('send') : act('approve', { send: true }))}>Send to customer</Button></div>
          </div>
        )}
      </Dialog>

      <Dialog open={sheet} onClose={() => setSheet(false)} title="Site measurements">
        {measurement.data?.measurement ? (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm">
            {measurement.data.measurement.rooms.map((r) => (
              <div key={r._id}><p className="font-semibold">{r.name}</p>
                <ul className="mt-1 text-graphite">{r.rows.map((x) => <li key={x._id}>{x.label}: {[x.width, x.height, x.length].filter(Boolean).join(' × ')} {x.unit}{x.area ? `, area ${x.area}` : ''}{x.quantity > 1 ? `, ×${x.quantity}` : ''}</li>)}</ul>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-graphite">No measurements recorded.</p>}
      </Dialog>
    </>
  );
}

function ReasonForm({ label, onSubmit, button = 'Save', optional = false, extra }) {
  const [v, setV] = useState('');
  const [x, setX] = useState(false);
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (!optional && v.trim().length < 3) return; onSubmit(v.trim(), x); }} className="space-y-3">
      <label htmlFor="reason-input" className="block text-sm">{label}</label>
      <textarea id="reason-input" rows={3} className={inp} value={v} onChange={(e) => setV(e.target.value)} autoFocus />
      {extra?.(x, setX)}
      <div className="flex justify-end"><Button type="submit" disabled={!optional && v.trim().length < 3}>{button}</Button></div>
    </form>
  );
}

function ItemImage({ value, imageUrl, onChange, disabled }) {
  const [busy, setBusy] = useState(false);
  const pick = () => {
    const el = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/jpeg,image/png,image/webp' });
    el.onchange = async () => {
      const f = el.files?.[0]; if (!f) return;
      setBusy(true);
      try { const m = await uploadFile(f, 'QUOTATION_ITEM_IMAGE'); onChange(m.id, m.url); } catch (e) { alert(e.message); } finally { setBusy(false); }
    };
    el.click();
  };
  if (value) return <span className="flex items-center gap-1 text-xs">{imageUrl ? <img src={imageUrl} alt="" className="size-8 rounded-none object-cover" /> : 'Image attached'}{!disabled && <button type="button" aria-label="Remove image" onClick={() => onChange(null, null)} className="text-graphite"><X className="size-3.5" /></button>}</span>;
  if (disabled) return null;
  return <Button size="sm" variant="ghost" loading={busy} onClick={pick} aria-label="Attach image"><ImagePlus className="size-3.5" /></Button>;
}
