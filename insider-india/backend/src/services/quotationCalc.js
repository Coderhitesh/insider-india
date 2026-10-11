const ApiError = require('../utils/ApiError');

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * Server-side source of truth for every quotation total. Mutates the quotation document.
 * Client-sent totals are always ignored.
 */
function compute(q) {
  const gst = num(q.gstPercent);
  let materialTotal = 0;
  let labourTotal = 0;
  let subtotal = 0;

  for (const section of q.sections) {
    let sectionSubtotal = 0;
    for (const item of section.items) {
      const qty = Math.max(0, num(item.quantity));
      const mp = Math.max(0, num(item.materialPrice));
      const lp = Math.max(0, num(item.labourPrice));
      if (mp || lp) item.unitPrice = r2(mp + lp);
      item.unitPrice = Math.max(0, r2(item.unitPrice));
      item.materialTotal = r2(qty * mp);
      item.labourTotal = r2(qty * lp);
      item.amount = r2(qty * item.unitPrice);
      materialTotal += item.materialTotal;
      labourTotal += item.labourTotal;
      sectionSubtotal += item.amount;
    }
    section.subtotal = r2(sectionSubtotal);
    subtotal += section.subtotal;
  }
  subtotal = r2(subtotal);

  let discountTotal = 0;
  for (const d of q.discounts) {
    const pct = Math.min(100, num(d.value));
    d.amount = r2(d.mode === 'PERCENT' ? (subtotal * pct) / 100 : num(d.value));
    discountTotal += d.amount;
  }
  if (discountTotal > subtotal) throw ApiError.unprocessable('Total discount cannot exceed the subtotal', 'DISCOUNT_TOO_HIGH');
  discountTotal = r2(discountTotal);
  const ratio = subtotal ? discountTotal / subtotal : 0;

  let gstAmount = 0;
  let itemsTaxable = 0;
  const allItems = q.sections.flatMap((s) => s.items);
  const lastPriced = allItems.map((it) => it.amount > 0).lastIndexOf(true);
  let allocated = 0;
  for (const section of q.sections) {
    for (const item of section.items) {
      // Pro-rata discount; the last priced item absorbs rounding so shares sum exactly to the discount.
      const idx = allItems.indexOf(item);
      item.discountShare = idx === lastPriced ? r2(discountTotal - allocated) : r2(item.amount * ratio);
      allocated = r2(allocated + item.discountShare);
      item.taxableAmount = r2(item.amount - item.discountShare);
      const rate = item.taxPercent === null || item.taxPercent === undefined ? gst : num(item.taxPercent);
      item.taxAmount = r2((item.taxableAmount * rate) / 100);
      item.total = r2(item.taxableAmount + item.taxAmount);
      itemsTaxable += item.taxableAmount;
      gstAmount += item.taxAmount;
    }
  }

  let charges = 0;
  let measurementAssistanceCharge = 0;
  for (const c of q.additionalCharges) {
    const amt = r2(Math.max(0, num(c.amount)));
    c.amount = amt;
    charges += amt;
    if (c.system === 'MEASUREMENT_ASSISTANCE') measurementAssistanceCharge += amt;
    if (c.taxable) gstAmount += r2((amt * gst) / 100);
  }

  const taxableAmount = r2(itemsTaxable + charges);
  gstAmount = r2(gstAmount);
  const exact = r2(taxableAmount + gstAmount);
  const grandTotal = Math.round(exact);

  q.totals = {
    materialTotal: r2(materialTotal),
    labourTotal: r2(labourTotal),
    subtotal,
    discountTotal,
    additionalCharges: r2(charges),
    measurementAssistanceCharge: r2(measurementAssistanceCharge),
    taxableAmount,
    gstAmount,
    roundOff: r2(grandTotal - exact),
    grandTotal,
  };

  if (q.paymentSchedule?.length) {
    const pct = q.paymentSchedule.reduce((s, p) => s + num(p.percent), 0);
    if (Math.abs(pct - 100) > 0.001) throw ApiError.unprocessable('Payment schedule must add up to 100%', 'PAYMENT_SCHEDULE_INVALID');
    let allocated = 0;
    q.paymentSchedule.forEach((p, i) => {
      p.amount = i === q.paymentSchedule.length - 1 ? grandTotal - allocated : Math.round((grandTotal * num(p.percent)) / 100);
      allocated += p.amount;
    });
  }
  return q.totals;
}

module.exports = { compute, r2 };
