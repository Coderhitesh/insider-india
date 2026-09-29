'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Header, Box, Pill, Loader, Failed } from '@/components/admin/Kit';
import { api } from '@/lib/api';
import { useApi } from '@/lib/useApi';
import { useAuth } from '@/store/auth';
import { can } from '@/lib/admin';

const UNITS = [['FT', 'ft'], ['INCH', 'inch'], ['SQFT', 'sq ft'], ['RFT', 'running ft'], ['MM', 'mm'], ['CM', 'cm'], ['M', 'm'], ['SQM', 'sq m'], ['PCS', 'piece']];
const ROOMS = [['LIVING_ROOM', 'Living room'], ['BEDROOM', 'Bedroom'], ['KITCHEN', 'Kitchen'], ['BATHROOM', 'Bathroom'], ['BALCONY', 'Balcony'], ['STUDY', 'Study'], ['POOJA_ROOM', 'Pooja room'], ['DINING', 'Dining'], ['FOYER', 'Foyer'], ['UTILITY', 'Utility'], ['CUSTOM', 'Custom area']];
const cell = 'w-full min-w-0 rounded-[2px] border border-stone-deep bg-paper px-2 py-1.5 text-sm focus:border-charcoal focus:outline-none disabled:bg-linen';
const num = (v) => (v === '' || v == null ? null : Number(v));
const blankRow = () => ({ label: '', width: null, height: null, length: null, area: null, quantity: 1, unit: 'FT', notes: '' });

export default function MeasurementSheet({ bookingId }) {
  const user = useAuth((s) => s.user);
  const { data, error, loading, reload } = useApi(`/measurements/booking/${bookingId}`);
  const booking = useApi(`/admin/bookings/${bookingId}`);
  const [rooms, setRooms] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!data) return;
    const m = data.measurement;
    setRooms(m ? m.rooms.map((r) => ({ ...r, rows: r.rows.map((x) => ({ ...x })) })) : [{ name: 'Living room', type: 'LIVING_ROOM', notes: '', rows: [blankRow()] }]);
    setNotes(m?.notes || '');
  }, [data]);

  if (loading || !rooms) return error ? <Failed error={error} retry={reload} /> : <Loader />;
  const m = data.measurement;
  const locked = m?.status === 'FINAL';
  const editable = !locked && can(user, 'site_visit.manage');
  const upd = (ri, patch) => setRooms((rs) => rs.map((r, i) => (i === ri ? { ...r, ...patch } : r)));
  const updRow = (ri, xi, patch) => upd(ri, { rows: rooms[ri].rows.map((x, j) => (j === xi ? { ...x, ...patch } : x)) });

  const call = async (kind) => {
    setBusy(kind); setMsg(null);
    try {
      if (kind === 'save' || kind === 'final') {
        await api(`/measurements/booking/${bookingId}`, { method: 'PUT', body: { notes, rooms: rooms.map((r) => ({ ...(r._id ? { _id: r._id } : {}), name: r.name, type: r.type, notes: r.notes || undefined, rows: r.rows.filter((x) => x.label.trim()).map((x) => ({ ...(x._id ? { _id: x._id } : {}), label: x.label.trim(), width: num(x.width), height: num(x.height), length: num(x.length), area: num(x.area), quantity: Number(x.quantity) || 0, unit: x.unit, notes: x.notes || undefined })) })) } });
      }
      if (kind === 'final') await api(`/measurements/booking/${bookingId}/finalize`, { method: 'POST' });
      if (kind === 'reopen') await api(`/measurements/booking/${bookingId}/reopen`, { method: 'POST', body: { reason: window.prompt('Reason for reopening?') || undefined } });
      setMsg({ tone: 'success', text: kind === 'final' ? 'Measurements finalised' : kind === 'reopen' ? 'Reopened for editing' : 'Saved' });
      reload();
    } catch (x) { setMsg({ tone: 'error', text: x.errors?.length ? `${x.message}: ${x.errors.map((e) => `${e.field} ${e.message}`).join('; ')}` : x.message }); } finally { setBusy(null); }
  };

  return (
    <>
      <Header title="Measurement sheet" subtitle={booking.data ? `${booking.data.booking.bookingNumber} — ${booking.data.booking.customerName}` : ''} back={[`/admin/bookings/${bookingId}`, 'Booking']}>
        <Pill value={locked ? 'COMPLETED' : 'DRAFT'}>{locked ? 'Final' : m ? 'Draft' : 'New'}</Pill>
        {editable && <Button size="sm" variant="secondary" loading={busy === 'save'} onClick={() => call('save')}>Save draft</Button>}
        {editable && <Button size="sm" loading={busy === 'final'} onClick={() => window.confirm('Finalise measurements? The sheet will be locked.') && call('final')}>Save and finalise</Button>}
        {locked && can(user, 'quotations.review') && user.role !== 'CONTRACTOR' && <Button size="sm" variant="ghost" loading={busy === 'reopen'} onClick={() => call('reopen')}>Reopen</Button>}
      </Header>
      {msg && <Notice tone={msg.tone} className="mb-4">{msg.text}</Notice>}
      {locked && <Notice className="mb-4">This sheet is final and was used for the quotation. An admin can reopen it if something needs correcting.</Notice>}
      <div className="space-y-4">
        {rooms.map((r, ri) => (
          <Box key={r._id || ri} title={<span className="flex flex-wrap items-center gap-2">
            <input aria-label="Room name" className={`${cell} w-48 font-semibold`} value={r.name} disabled={!editable} onChange={(e) => upd(ri, { name: e.target.value })} />
            <select aria-label="Room type" className={`${cell} w-40`} value={r.type} disabled={!editable} onChange={(e) => upd(ri, { type: e.target.value })}>{ROOMS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </span>} action={editable && <Button size="sm" variant="ghost" onClick={() => setRooms((rs) => rs.filter((_, i) => i !== ri))} aria-label="Remove room"><Trash2 className="size-4" /></Button>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[56rem] text-sm">
                <thead className="text-left text-xs text-graphite"><tr>{['Item / wall', 'Width', 'Height', 'Length', 'Area', 'Qty', 'Unit', 'Notes', ''].map((h) => <th key={h} className="px-1 pb-1.5 font-medium">{h}</th>)}</tr></thead>
                <tbody>
                  {r.rows.map((x, xi) => {
                    const auto = !x.area && x.width && (x.length || x.height) ? Math.round(x.width * (x.length || x.height) * 100) / 100 : null;
                    return (
                      <tr key={x._id || xi}>
                        <td className="w-56 p-1"><input aria-label="Label" className={cell} value={x.label} disabled={!editable} onChange={(e) => updRow(ri, xi, { label: e.target.value })} /></td>
                        {['width', 'height', 'length'].map((k) => <td key={k} className="w-20 p-1"><input aria-label={k} type="number" step="any" min="0" className={cell} value={x[k] ?? ''} disabled={!editable} onChange={(e) => updRow(ri, xi, { [k]: e.target.value })} /></td>)}
                        <td className="w-24 p-1"><input aria-label="Area" type="number" step="any" min="0" className={cell} value={x.area ?? ''} placeholder={auto ? String(auto) : ''} disabled={!editable} onChange={(e) => updRow(ri, xi, { area: e.target.value })} /></td>
                        <td className="w-16 p-1"><input aria-label="Quantity" type="number" step="any" min="0" className={cell} value={x.quantity ?? ''} disabled={!editable} onChange={(e) => updRow(ri, xi, { quantity: e.target.value })} /></td>
                        <td className="w-28 p-1"><select aria-label="Unit" className={cell} value={x.unit} disabled={!editable} onChange={(e) => updRow(ri, xi, { unit: e.target.value })}>{UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
                        <td className="p-1"><input aria-label="Notes" className={cell} value={x.notes || ''} disabled={!editable} onChange={(e) => updRow(ri, xi, { notes: e.target.value })} /></td>
                        <td className="w-8 p-1">{editable && <button type="button" aria-label="Remove row" className="p-1 text-graphite hover:text-error" onClick={() => upd(ri, { rows: r.rows.filter((_, j) => j !== xi) })}><Trash2 className="size-4" /></button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {editable && <Button size="sm" variant="ghost" className="mt-2" onClick={() => upd(ri, { rows: [...r.rows, blankRow()] })}><Plus className="size-4" />Add measurement</Button>}
            <input aria-label="Room notes" className={`${cell} mt-3`} placeholder="Room notes" value={r.notes || ''} disabled={!editable} onChange={(e) => upd(ri, { notes: e.target.value })} />
          </Box>
        ))}
        {editable && <Button variant="secondary" onClick={() => setRooms((rs) => [...rs, { name: `Room ${rs.length + 1}`, type: 'CUSTOM', notes: '', rows: [blankRow()] }])}><Plus className="size-4" />Add room</Button>}
        <Box title="General notes"><textarea aria-label="General notes" rows={3} className={cell} value={notes} disabled={!editable} onChange={(e) => setNotes(e.target.value)} /></Box>
        <p className="text-xs text-graphite">Area is calculated from width × length (or height) when left blank. Finalising requires a completed site visit.</p>
      </div>
    </>
  );
}
