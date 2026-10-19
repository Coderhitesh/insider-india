'use client';

import CrudResource from '@/components/admin/CrudResource';
import { Pill } from '@/components/admin/Kit';
import { Guard } from '@/components/admin/AdminShell';
import { fmtDate, inr } from '@/lib/admin';

const toDate = (v) => (v ? String(v).slice(0, 10) : '');
const status = (r) => {
  const now = Date.now();
  if (!r.isActive) return <Pill tone="outline">Off</Pill>;
  if (r.validTo && new Date(r.validTo).getTime() < now) return <Pill tone="red">Expired</Pill>;
  if (r.validFrom && new Date(r.validFrom).getTime() > now) return <Pill tone="amber">Scheduled</Pill>;
  if (r.usageLimit && r.used >= r.usageLimit) return <Pill tone="outline">Used up</Pill>;
  return <Pill tone="green">Active</Pill>;
};

export default function Coupons() {
  return (
    <Guard perm="payments.view">
      <CrudResource endpoint="/admin/coupons" title="Coupons" subtitle="Discount codes customers can apply to their project balance (Payments section of their project). One coupon per project." managePerm="payments.manage"
        columns={[
          { key: 'code', label: 'Code', render: (r) => <><span className="tabular block font-semibold">{r.code}</span>{r.description && <span className="text-xs text-graphite">{r.description}</span>}</> },
          { key: 'value', label: 'Discount', render: (r) => (r.type === 'PERCENT' ? `${r.value}%${r.maxDiscount ? ` (max ${inr(r.maxDiscount)})` : ''}` : inr(r.value)) },
          { key: 'rules', label: 'Rules', render: (r) => <span className="text-xs">{[r.appliesTo !== 'ALL' && (r.appliesTo === 'COMMERCIAL' ? 'Commercial only' : 'Homes only'), r.minProjectValue ? `Min ${inr(r.minProjectValue)}` : null, `${r.perCustomerLimit || 1}× per customer`].filter(Boolean).join(' · ')}</span> },
          { key: 'valid', label: 'Valid', render: (r) => <span className="text-xs">{r.validFrom || r.validTo ? `${r.validFrom ? fmtDate(r.validFrom) : '…'} – ${r.validTo ? fmtDate(r.validTo) : '…'}` : 'Always'}</span> },
          { key: 'used', label: 'Used', render: (r) => <><span className="block">{r.used}{r.usageLimit ? ` / ${r.usageLimit}` : ''}</span><span className="text-xs text-graphite">{inr(r.discountGiven)} given</span></> },
          { key: 'status', label: 'Status', render: status },
        ]}
        defaults={{ code: '', description: '', type: 'PERCENT', value: 5, maxDiscount: null, minProjectValue: null, appliesTo: 'ALL', validFrom: '', validTo: '', usageLimit: null, perCustomerLimit: 1, isActive: true }}
        toForm={({ id, createdAt, updatedAt, used, discountGiven, ...r }) => ({ ...r, validFrom: toDate(r.validFrom), validTo: toDate(r.validTo), maxDiscount: r.maxDiscount ?? null, minProjectValue: r.minProjectValue ?? null, usageLimit: r.usageLimit ?? null })}
        fromForm={(f) => ({
          ...f, code: f.code.trim().toUpperCase(),
          validFrom: f.validFrom ? new Date(`${f.validFrom}T00:00:00`).toISOString() : null,
          validTo: f.validTo ? new Date(`${f.validTo}T23:59:59`).toISOString() : null,
          maxDiscount: f.type === 'PERCENT' && f.maxDiscount ? Number(f.maxDiscount) : null,
          minProjectValue: f.minProjectValue ? Number(f.minProjectValue) : null,
          usageLimit: f.usageLimit ? Number(f.usageLimit) : null,
        })}
        deleteLabel="Delete (turns off if already used)"
        fields={[
          { name: 'code', label: 'Code', hint: 'e.g. DIWALI10 — letters, numbers, - or _' },
          { name: 'description', label: 'Description (shown to the customer)', hint: 'e.g. Diwali offer on full home interiors' },
          { name: 'type', label: 'Discount type', type: 'select', placeholder: false, options: [{ value: 'PERCENT', label: '% of project value' }, { value: 'FLAT', label: 'Flat ₹ amount' }] },
          { name: 'value', label: 'Discount (% or ₹)', type: 'number', min: 0 },
          { name: 'maxDiscount', label: 'Maximum discount ₹ (for %)', type: 'number', min: 0, nullable: true, hint: 'Leave empty for no cap' },
          { name: 'minProjectValue', label: 'Minimum project value ₹', type: 'number', min: 0, nullable: true },
          { name: 'appliesTo', label: 'Applies to', type: 'select', placeholder: false, options: [{ value: 'ALL', label: 'All projects' }, { value: 'RESIDENTIAL', label: 'Homes only' }, { value: 'COMMERCIAL', label: 'Commercial only' }] },
          { name: 'validFrom', label: 'Valid from', type: 'date' }, { name: 'validTo', label: 'Valid until', type: 'date' },
          { name: 'usageLimit', label: 'Total uses allowed', type: 'number', min: 1, nullable: true, hint: 'Leave empty for unlimited' },
          { name: 'perCustomerLimit', label: 'Uses per customer', type: 'number', min: 1 },
          { name: 'isActive', label: 'Active', type: 'switch', help: 'Customers can use this code' },
        ]} />
    </Guard>
  );
}
