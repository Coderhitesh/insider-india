'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, MessageCircle, Phone, ShieldCheck, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import Notice from '@/components/ui/Notice';
import { Textarea } from '@/components/ui/Field';
import Dialog from '@/components/account/Dialog';
import { Badge, Panel, PageTitle, Empty, Loading, LoadError, Row, BackLink } from '@/components/account/Bits';
import { api } from '@/lib/api';
import { useApi, openSigned } from '@/lib/useApi';
import { QUOTATION_STATUS, UNIT } from '@/lib/status';
import { formatDate, formatINR } from '@/lib/format';
import { formatDateTime } from './time';

const money = (v) => { const n = Number(v || 0); return `${n < 0 ? '− ' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; };
const badgeFor = (q) => (!q.isLatest ? ['Earlier version', 'muted'] : undefined);

export function QuotationsList() {
  const { data, error, loading, reload } = useApi('/quotations/mine');
  return (
    <>
      <PageTitle title="Quotations" />
      {loading ? <Loading /> : error ? <LoadError error={error} onRetry={reload} /> : !data.items.length ? (
        <Empty title="No quotations yet" body="Your quotation is prepared after the site visit and measurements, then reviewed by our team before it reaches you." />
      ) : (
        <ul className="divide-y divide-stone rounded-[3px] border border-stone bg-paper">
          {data.items.map((q) => (
            <li key={q.id}>
              <Link href={`/account/quotations/${q.id}`} className="flex items-center gap-4 p-5 hover:bg-linen/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3"><span className="tabular font-semibold">{q.displayNumber}</span><Badge map={QUOTATION_STATUS} value={q.status} override={badgeFor(q)} /></div>
                  <p className="mt-1 text-sm text-graphite">Booking {q.bookingNumber}, sent {formatDate(q.sentAt)}{q.validUntil ? `, valid until ${formatDate(q.validUntil)}` : ''}</p>
                </div>
                <span className="tabular font-medium">{formatINR(q.grandTotal)}</span>
                <ChevronRight className="size-4 text-graphite" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const ACTIONS = {
  accept: { title: 'Accept quotation', path: 'accept', button: 'Accept quotation', noteLabel: 'Anything we should know? (optional)', required: false },
  revision: { title: 'Request a revision', path: 'revision-request', button: 'Send revision request', noteLabel: 'What would you like changed?', required: true },
  reject: { title: 'Decline quotation', path: 'reject', button: 'Decline quotation', noteLabel: 'Tell us why, so we can help', required: true },
};

function RespondForm({ kind, q, onDone, onCancel }) {
  const a = ACTIONS[kind];
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (a.required && note.trim().length < 3) return setError('Please add a short note.');
    if (kind === 'accept' && !agree) return setError('Please confirm you accept the quotation and its terms.');
    setBusy(true);
    setError('');
    try {
      const res = await api(`/quotations/${q.id}/${a.path}`, { method: 'POST', body: { note: note.trim() || undefined, ...(kind === 'accept' ? { acceptTerms: true } : {}) } });
      onDone(res);
    } catch (err) { setError(err.message); setBusy(false); }
    return undefined;
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {kind === 'accept' && <p>You are accepting <strong>{q.displayNumber}</strong> for <strong className="tabular">{money(q.totals.grandTotal)}</strong>. Your project manager will contact you to begin the design stage.</p>}
      <div>
        <label htmlFor="resp-note" className="mb-1.5 block text-sm font-medium">{a.noteLabel}</label>
        <Textarea id="resp-note" rows={4} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {kind === 'accept' && (
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-4 accent-[var(--color-wine)]" />
          I accept this quotation, including its payment schedule and terms.
        </label>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={busy} variant={kind === 'reject' ? 'secondary' : 'primary'}>{a.button}</Button>
      </div>
    </form>
  );
}

export function QuotationDetail({ id }) {
  const { data, error, loading, reload, setData } = useApi(`/quotations/${id}`);
  const site = useApi('/catalog/site');
  const [dialog, setDialog] = useState(null);
  const [flash, setFlash] = useState('');
  const [pdfError, setPdfError] = useState('');

  if (loading) return <Loading rows={5} />;
  if (error) return <><BackLink href="/account/quotations">Quotations</BackLink><LoadError error={error} onRetry={reload} /></>;
  const q = data.quotation;
  const company = site.data?.company || {};
  const whatsapp = company.whatsapp?.replace(/\D/g, '');
  const contactHref = whatsapp
    ? `https://wa.me/${whatsapp.length === 10 ? `91${whatsapp}` : whatsapp}?text=${encodeURIComponent(`Hi, I have a question about quotation ${q.displayNumber}.`)}`
    : company.phone ? `tel:${company.phone.replace(/\s/g, '')}` : null;

  const download = async () => {
    setPdfError('');
    try { await openSigned(async () => (await api(`/quotations/${q.id}/pdf`)).data.url); } catch (err) { setPdfError(err.message); }
  };

  const stamps = [['Sent', q.sentAt], ['Viewed', q.viewedAt], ['Accepted', q.acceptedAt], ['Revision requested', q.revisionRequestedAt], ['Declined', q.rejectedAt]].filter(([, v]) => v);

  return (
    <>
      <BackLink href="/account/quotations">Quotations</BackLink>
      <PageTitle code title={q.displayNumber}><Badge map={QUOTATION_STATUS} value={q.status} override={badgeFor(q)} /></PageTitle>
      {flash && <Notice tone="success" className="mb-6">{flash}</Notice>}
      {!q.isLatest && <Notice className="mb-6">This is an earlier version. <Link href="/account/quotations" className="underline">See the latest quotation</Link>.</Notice>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {q.sections.map((s) => (
            <Panel key={s.id} title={s.title} action={<span className="tabular text-sm">{money(s.subtotal)}</span>}>
              {s.notes && <p className="-mt-2 mb-4 text-sm text-graphite">{s.notes}</p>}
              <ul className="divide-y divide-stone">
                {s.items.map((it) => {
                  const img = data.quotation.images?.[it.image] || data.quotation.images?.[it.referenceImage];
                  return (
                    <li key={it.id} className="flex gap-4 py-4">
                      {img && <img src={img} alt="" className="size-16 shrink-0 rounded-[2px] object-cover" loading="lazy" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
                          <p className="font-medium">{it.name}</p>
                          <p className="tabular font-medium">{money(it.amount)}</p>
                        </div>
                        {it.description && <p className="mt-1 text-sm text-graphite">{it.description}</p>}
                        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                          {it.material && <span><span className="text-graphite">Material </span>{it.material}</span>}
                          {it.finish && <span><span className="text-graphite">Finish </span>{it.finish}</span>}
                          {(it.dimensions || it.length || it.width) && <span><span className="text-graphite">Size </span>{it.dimensions || [it.length, it.width, it.height].filter(Boolean).join(' × ')}</span>}
                          <span className="tabular"><span className="text-graphite">Qty </span>{Number(it.quantity).toLocaleString('en-IN')} {UNIT[it.unit] || it.unit} × {money(it.unitPrice)}</span>
                        </p>
                        {it.customFields?.length > 0 && <p className="mt-1 text-sm text-graphite">{it.customFields.map((c) => `${c.label}: ${c.value}`).join('; ')}</p>}
                        {it.notes && <p className="mt-1 text-sm text-graphite">{it.notes}</p>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))}
        </div>

        <div className="space-y-6">
          <Panel>
            <p className="text-sm text-graphite">Grand total</p>
            <p className="tabular mt-1 text-4xl font-semibold tracking-tight">{formatINR(q.totals.grandTotal)}</p>
            <dl className="mt-5">
              <Row label="Subtotal"><span className="tabular">{money(q.totals.subtotal)}</span></Row>
              {q.discounts.map((d, i) => <Row key={`d${i}`} label={d.label}><span className="tabular text-success">− {money(d.amount)}</span></Row>)}
              {q.additionalCharges.map((c, i) => <Row key={`c${i}`} label={c.label}><span className="tabular">{money(c.amount)}</span></Row>)}
              <Row label="Taxable value"><span className="tabular">{money(q.totals.taxableAmount)}</span></Row>
              <Row label={`GST${q.gstPercent ? ` @ ${q.gstPercent}%` : ''}`}><span className="tabular">{money(q.totals.gstAmount)}</span></Row>
              {q.totals.roundOff ? <Row label="Round off"><span className="tabular">{money(q.totals.roundOff)}</span></Row> : null}
            </dl>

            {q.canRespond && (
              <div className="mt-6 space-y-2">
                <Button className="w-full" onClick={() => setDialog('accept')}>Accept quotation</Button>
                <Button className="w-full" variant="secondary" onClick={() => setDialog('revision')}>Request revision</Button>
                <Button className="w-full" variant="ghost" onClick={() => setDialog('reject')}>Decline</Button>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-stone pt-4">
              {q.hasPdf && <Button size="sm" variant="secondary" onClick={download}><Download className="size-4" />Download PDF</Button>}
              {contactHref && (
                <Button size="sm" variant="ghost" href={contactHref} target={whatsapp ? '_blank' : undefined} rel="noopener noreferrer">
                  {whatsapp ? <MessageCircle className="size-4" /> : <Phone className="size-4" />}Contact {q.expertName ? q.expertName : 'your expert'}
                </Button>
              )}
            </div>
            {pdfError && <Notice tone="error" className="mt-3">{pdfError}</Notice>}
          </Panel>

          {q.status === 'ACCEPTED' && q.isLatest && (
            <Panel><p className="font-medium">Accepted {formatDate(q.acceptedAt)}</p><p className="mt-1 text-sm text-graphite">Your project is set up. Follow its progress under Projects.</p><Button href="/account/projects" size="sm" className="mt-4">Go to projects</Button></Panel>
          )}
          {q.customerResponse?.note && <Panel title="Your note"><p className="text-sm">{q.customerResponse.note}</p><p className="mt-2 text-xs text-graphite">{formatDateTime(q.customerResponse.at)}</p></Panel>}

          <Panel title="Details">
            <dl>
              {q.package && <Row label="Package">{q.package.name}</Row>}
              {q.expertName && <Row label="Expert">{q.expertName}</Row>}
              {q.validUntil && <Row label="Valid until">{formatDate(q.validUntil)}</Row>}
              {stamps.map(([k, v]) => <Row key={k} label={k}>{formatDateTime(v)}</Row>)}
            </dl>
            {q.package?.warranty?.years ? <p className="mt-4 flex items-center gap-2 text-sm"><ShieldCheck className="size-4 text-brass" />{q.package.warranty.text || `${q.package.warranty.years}-year warranty cover`}</p> : null}
          </Panel>

          {q.paymentSchedule?.length > 0 && (
            <Panel title="Payment schedule">
              <dl>{q.paymentSchedule.map((p) => <Row key={p.label} label={`${p.label} (${p.percent}%)`}><span className="tabular">{formatINR(p.amount)}</span></Row>)}</dl>
            </Panel>
          )}
          {q.notes && <Panel title="Notes"><p className="whitespace-pre-line text-sm">{q.notes}</p></Panel>}
        </div>
      </div>

      <Dialog open={Boolean(dialog)} onClose={() => setDialog(null)} title={dialog ? ACTIONS[dialog].title : ''}>
        {dialog && (
          <RespondForm kind={dialog} q={q} onCancel={() => setDialog(null)} onDone={(res) => {
            setDialog(null);
            setData((d) => ({ ...d, quotation: { ...d.quotation, ...res.data.quotation } }));
            setFlash(res.message);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} />
        )}
      </Dialog>
    </>
  );
}
