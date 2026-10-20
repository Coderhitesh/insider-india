'use client';

import { Header, DataTable, Pill } from '@/components/admin/Kit';
import Filters from '@/components/admin/Filters';
import { useList } from '@/components/admin/useList';
import { useRefData, nice } from '@/components/admin/refData';
import { useAuth } from '@/store/auth';
import { downloadCsv, fmtDate, inr } from '@/lib/admin';

const STATUSES = ['DRAFT', 'UNDER_ADMIN_REVIEW', 'APPROVED', 'SENT_TO_CUSTOMER', 'ACCEPTED', 'REJECTED', 'REVISION_REQUESTED'];

export default function QuotationsList() {
  const user = useAuth((s) => s.user);
  const ref = useRefData();
  const list = useList('/admin/quotations', { limit: '25' });
  return (
    <>
      <Header title="Quotations" subtitle="Latest version per booking unless “All versions” is chosen" />
      <Filters params={list.params} setParams={list.setParams} placeholder="Quotation, booking or customer" filters={[
        { name: 'status', label: 'Status', options: STATUSES.map((s) => [s, nice(s)]) },
        ...(user.role !== 'CONTRACTOR' ? [{ name: 'contractor', label: 'Contractor', options: ref.contractors.map((c) => [c.id, c.name]) }] : []),
        { name: 'range' },
        { name: 'allVersions', label: 'Versions', options: [['true', 'All versions']] },
      ]} />
      <DataTable tableId="quotes" {...list} retry={list.reload} onPage={(p) => list.setParams({ page: String(p) }, { resetPage: false })}
        onExport={() => downloadCsv(`/admin/quotations${list.exportQuery}`, 'quotations.csv').catch((e) => alert(e.message))}
        rowHref={(r) => `/admin/quotations/${r.id}`} empty="No quotations."
        columns={[
          { key: 'displayNumber', label: 'Quotation' },
          { key: 'status', label: 'Status', render: (r) => <Pill value={r.isLatest ? r.status : 'SUPERSEDED'} tone={r.isLatest ? undefined : 'outline'} /> },
          { key: 'bookingNumber', label: 'Booking' },
          { key: 'customer', label: 'Customer' },
          { key: 'city', label: 'City', defaultHidden: true },
          { key: 'contractor', label: 'Contractor' },
          { key: 'contractorGrandTotal', label: 'Contractor total', className: 'text-right', render: (r) => (r.contractorGrandTotal ? inr(r.contractorGrandTotal) : '—') },
          { key: 'grandTotal', label: 'Grand total', className: 'text-right', render: (r) => inr(r.grandTotal) },
          { key: 'adjustment', label: 'Admin adjustment', className: 'text-right', render: (r) => (r.adjustment ? <span className={r.adjustment < 0 ? 'text-success' : ''}>{r.adjustment < 0 ? '−' : '+'}{inr(Math.abs(r.adjustment))}</span> : '—') },
          { key: 'priceChanges', label: 'Edits', defaultHidden: true },
          { key: 'submittedAt', label: 'Submitted', render: (r) => fmtDate(r.submittedAt) },
          { key: 'sentAt', label: 'Sent', render: (r) => fmtDate(r.sentAt) },
        ]} />
    </>
  );
}
