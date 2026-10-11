// Client-side mirror of the server calculation — preview only; the server recomputes on save.
const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function preview(q) {
  const gst = n(q.gstPercent);
  let subtotal = 0; let material = 0; let labour = 0;
  const sections = q.sections.map((s) => {
    let sub = 0;
    const items = s.items.map((it) => {
      const qty = Math.max(0, n(it.quantity)); const mp = n(it.materialPrice); const lp = n(it.labourPrice);
      const unit = mp || lp ? r2(mp + lp) : r2(it.unitPrice);
      const amount = r2(qty * unit);
      material += qty * mp; labour += qty * lp; sub += amount;
      return { ...it, unitPriceEff: unit, amount };
    });
    subtotal += sub;
    return { ...s, items, subtotal: r2(sub) };
  });
  subtotal = r2(subtotal);
  const discount = r2(Math.min(subtotal, q.discounts.reduce((s, d) => s + (d.mode === 'PERCENT' ? (subtotal * Math.min(100, n(d.value))) / 100 : n(d.value)), 0)));
  const ratio = subtotal ? discount / subtotal : 0;
  let tax = 0;
  sections.forEach((s) => s.items.forEach((it) => {
    const rate = it.taxPercent === null || it.taxPercent === undefined || it.taxPercent === '' ? gst : n(it.taxPercent);
    tax += (it.amount * (1 - ratio) * rate) / 100;
  }));
  const charges = q.additionalCharges.reduce((s, c) => s + n(c.amount), 0);
  tax += q.additionalCharges.reduce((s, c) => s + (c.taxable ? (n(c.amount) * gst) / 100 : 0), 0);
  const taxable = r2(subtotal - discount + charges);
  const exact = r2(taxable + tax);
  const grand = Math.round(exact);
  return { sections, subtotal, material: r2(material), labour: r2(labour), discount, charges: r2(charges), taxable, gst: r2(tax), roundOff: r2(grand - exact), grand };
}
