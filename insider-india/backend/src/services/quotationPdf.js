const path = require('path');
const PDFDocument = require('pdfkit');
const { formatINR, amountInWords, formatDateIST } = require('../utils/money');
const logger = require('../utils/logger');

const FONT_DIR = path.resolve(__dirname, '../templates/fonts');
const F = {
  serif: path.join(FONT_DIR, 'CormorantGaramond-SemiBold.ttf'),
  sans: path.join(FONT_DIR, 'NotoSans-Regular.ttf'),
  semi: path.join(FONT_DIR, 'NotoSans-SemiBold.ttf'),
  bold: path.join(FONT_DIR, 'NotoSans-Bold.ttf'),
};
const C = { ink: '#1A0B0D', muted: '#6E5A5D', wine: '#C8102E', brass: '#C8102E', sand: '#FDEEEF', ivory: '#FFFFFF', line: '#F1DADD' };
const UNIT = { FT: 'ft', INCH: 'in', SQFT: 'sq ft', RFT: 'rft', MM: 'mm', CM: 'cm', M: 'm', SQM: 'sq m', PCS: 'pc' };

async function fetchLogo(url) {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !/image\/(png|jpe?g)/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length < 2 * 1024 * 1024 ? buf : null;
  } catch (err) {
    logger.warn('Logo fetch failed for PDF', { error: err.message });
    return null;
  }
}

const dims = (it) => it.dimensions || [it.length, it.width, it.height].filter((v) => v).join(' × ');

/**
 * Renders an original INSIDER INDIA LLP quotation. Returns a Buffer.
 * data: { q, company, customer, booking, contractorName, packageDoc, labels }
 */
async function renderQuotationPdf({ q, company, customer, booking, contractorName, packageDoc, labels }) {
  const logo = await fetchLogo(company.logoUrl);
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 64, left: 48, right: 48 }, bufferPages: true, info: {
    Title: `Quotation ${q.displayNumber}`, Author: company.name, Subject: `Interior quotation for ${customer.name || 'customer'}`,
  } });
  Object.entries(F).forEach(([k, p]) => doc.registerFont(k, p));
  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });

  const L = doc.page.margins.left;
  const W = doc.page.width - L - doc.page.margins.right;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const ensure = (h, onNewPage) => { if (doc.y + h > bottom()) { doc.addPage(); if (onNewPage) onNewPage(); } };
  const rule = (y, color = C.line, w = 0.6) => doc.moveTo(L, y).lineTo(L + W, y).lineWidth(w).strokeColor(color).stroke();
  const label = (t, x, y, w) => doc.font('semi').fontSize(7).fillColor(C.brass).text(t.toUpperCase(), x, y, { width: w, characterSpacing: 1.2 });

  // ── Header band ─────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 118).fill(C.ivory);
  doc.rect(0, 0, doc.page.width, 8).fill(C.wine);
  if (logo) {
    try { doc.image(logo, L, 34, { fit: [150, 48] }); } catch { doc.font('bold').fontSize(20).fillColor(C.wine).text(company.name, L, 40); }
  } else {
    doc.font('bold').fontSize(20).fillColor(C.wine).text(company.name, L, 40, { width: W * 0.6 });
  }
  const contact = [company.address, [company.phone, company.email].filter(Boolean).join('  ·  '), company.gstNumber ? `GSTIN ${company.gstNumber}` : ''].filter(Boolean);
  doc.font('sans').fontSize(7.5).fillColor(C.muted).text(contact.join('\n'), L, 86, { width: W * 0.6 });

  doc.font('bold').fontSize(26).fillColor(C.wine).text('QUOTATION', L, 32, { width: W, align: 'right', characterSpacing: 2 });
  doc.font('semi').fontSize(9).fillColor(C.ink).text(q.displayNumber, L, 68, { width: W, align: 'right' });
  doc.font('sans').fontSize(8).fillColor(C.muted)
    .text(`Issued ${formatDateIST(q.sentAt || new Date())}${q.validUntil ? `  ·  Valid until ${formatDateIST(q.validUntil)}` : ''}`, L, 82, { width: W, align: 'right' });
  doc.moveTo(0, 118).lineTo(doc.page.width, 118).lineWidth(2).strokeColor(C.brass).stroke();

  // ── Parties ─────────────────────────────────────────────
  let y = 140;
  const colW = (W - 24) / 2;
  label('Prepared for', L, y, colW);
  label('Project', L + colW + 24, y, colW);
  y += 14;
  const addr = booking?.snapshot?.address || {};
  const left = [customer.name, customer.mobile ? `+91 ${customer.mobile}` : '', customer.email, [addr.formattedAddress, addr.pincode].filter(Boolean).join(' – ')].filter(Boolean);
  const right = [
    ['Booking ID', booking?.bookingNumber],
    ['Property', [labels.propertyType, labels.bhk].filter(Boolean).join(' · ')],
    ['Scope', labels.requirementType],
    ['Package', packageDoc?.name],
    ['Designer / Expert', contractorName],
  ].filter(([, v]) => v);
  doc.font('semi').fontSize(10).fillColor(C.ink).text(left[0] || '', L, y, { width: colW });
  doc.font('sans').fontSize(8.5).fillColor(C.muted).text(left.slice(1).join('\n'), L, doc.y + 2, { width: colW, lineGap: 1.5 });
  const leftEnd = doc.y;
  let ry = y;
  for (const [k, v] of right) {
    doc.font('sans').fontSize(8).fillColor(C.muted).text(k, L + colW + 24, ry, { width: 90 });
    doc.font('semi').fontSize(8.5).fillColor(C.ink).text(v, L + colW + 24 + 92, ry, { width: colW - 92 });
    ry = doc.y + 3;
  }
  doc.y = Math.max(leftEnd, ry) + 18;

  // ── Sections table ──────────────────────────────────────
  const cols = [
    { k: '#', w: 22, a: 'left' }, { k: 'Item & specification', w: W - 22 - 88 - 52 - 74 - 84, a: 'left' },
    { k: 'Dimensions', w: 88, a: 'left' }, { k: 'Qty', w: 52, a: 'right' }, { k: 'Rate', w: 74, a: 'right' }, { k: 'Amount', w: 84, a: 'right' },
  ];
  const colX = []; cols.reduce((x, c) => { colX.push(x); return x + c.w; }, L);
  const tableHead = () => {
    const hy = doc.y;
    doc.rect(L, hy, W, 18).fill(C.sand);
    cols.forEach((c, i) => doc.font('semi').fontSize(7).fillColor(C.ink).text(c.k.toUpperCase(), colX[i] + 4, hy + 5.5, { width: c.w - 8, align: c.a, characterSpacing: 0.6 }));
    doc.y = hy + 22;
  };

  let n = 0;
  for (const section of q.sections) {
    ensure(120); // keep section title + header + first row together
    doc.font('bold').fontSize(12.5).fillColor(C.wine).text(section.title.toUpperCase(), L, doc.y, { characterSpacing: 0.8 });
    if (section.notes) doc.font('sans').fontSize(7.5).fillColor(C.muted).text(section.notes, L, doc.y + 1, { width: W });
    doc.y += 6;
    tableHead();
    for (const it of section.items) {
      n += 1;
      const spec = [it.description, [it.material && `Material: ${it.material}`, it.finish && `Finish: ${it.finish}`].filter(Boolean).join('   ·   '), it.notes].filter(Boolean).join('\n');
      doc.font('semi').fontSize(8.5);
      const hName = doc.heightOfString(it.name, { width: cols[1].w - 8 });
      doc.font('sans').fontSize(7.5);
      const hSpec = spec ? doc.heightOfString(spec, { width: cols[1].w - 8, lineGap: 1 }) + 2 : 0;
      const rowH = Math.max(hName + hSpec, 12) + 10;
      ensure(rowH, tableHead);
      const top = doc.y;
      doc.font('sans').fontSize(8).fillColor(C.muted).text(String(n), colX[0] + 4, top, { width: cols[0].w - 8 });
      doc.font('semi').fontSize(8.5).fillColor(C.ink).text(it.name, colX[1] + 4, top, { width: cols[1].w - 8 });
      if (spec) doc.font('sans').fontSize(7.5).fillColor(C.muted).text(spec, colX[1] + 4, top + hName + 2, { width: cols[1].w - 8, lineGap: 1 });
      doc.font('sans').fontSize(8).fillColor(C.ink);
      doc.text(dims(it) || '—', colX[2] + 4, top, { width: cols[2].w - 8 });
      doc.text(`${Number(it.quantity).toLocaleString('en-IN')} ${UNIT[it.unit] || it.unit || ''}`.trim(), colX[3] + 4, top, { width: cols[3].w - 8, align: 'right' });
      doc.text(formatINR(it.unitPrice), colX[4] + 4, top, { width: cols[4].w - 8, align: 'right' });
      doc.font('semi').text(formatINR(it.amount), colX[5] + 4, top, { width: cols[5].w - 8, align: 'right' });
      doc.y = top + rowH - 4;
      rule(doc.y, C.line, 0.4);
      doc.y += 4;
    }
    ensure(20);
    doc.font('semi').fontSize(8.5).fillColor(C.ink).text(`${section.title} subtotal   ${formatINR(section.subtotal)}`, L, doc.y + 2, { width: W, align: 'right' });
    doc.y += 16;
  }

  // ── Summary ─────────────────────────────────────────────
  const t = q.totals;
  const lines = [['Subtotal', t.subtotal]];
  q.discounts.forEach((d) => lines.push([d.label || (d.type === 'PROMOTIONAL' ? 'Promotional discount' : 'Discount') + (d.mode === 'PERCENT' ? ` (${d.value}%)` : ''), -d.amount]));
  q.additionalCharges.forEach((c) => lines.push([c.label, c.amount]));
  lines.push(['Taxable value', t.taxableAmount], [`GST${q.gstPercent ? ` @ ${q.gstPercent}%` : ''}`, t.gstAmount]);
  if (t.roundOff) lines.push(['Round off', t.roundOff]);
  const boxW = 250;
  ensure(lines.length * 15 + 70);
  const bx = L + W - boxW;
  let by = doc.y + 4;
  for (const [k, v] of lines) {
    doc.font('sans').fontSize(8.5).fillColor(C.muted).text(k, bx, by, { width: boxW - 110 });
    doc.font('semi').fontSize(8.5).fillColor(C.ink).text(`${v < 0 ? '− ' : ''}${formatINR(Math.abs(v))}`, bx + boxW - 110, by, { width: 110, align: 'right' });
    by += 15;
  }
  doc.rect(bx, by + 2, boxW, 30).fill(C.wine);
  doc.font('semi').fontSize(9).fillColor('#FFFFFF').text('GRAND TOTAL', bx + 10, by + 12, { width: 120, characterSpacing: 1 });
  doc.font('bold').fontSize(13).fillColor('#FFFFFF').text(formatINR(t.grandTotal, { decimals: false }), bx + 110, by + 9, { width: boxW - 120, align: 'right' });
  doc.font('sans').fontSize(7.5).fillColor(C.muted).text(amountInWords(t.grandTotal), L, by + 40, { width: W, align: 'right' });
  doc.y = by + 62;

  // ── Text blocks ─────────────────────────────────────────
  const block = (title, body) => {
    if (!body) return;
    ensure(60);
    label(title, L, doc.y, W);
    doc.font('sans').fontSize(8).fillColor(C.ink).text(body, L, doc.y + 4, { width: W, lineGap: 2 });
    doc.y += 14;
  };
  if (q.paymentSchedule?.length) {
    ensure(40 + q.paymentSchedule.length * 14);
    label('Payment schedule', L, doc.y, W);
    doc.y += 6;
    q.paymentSchedule.forEach((p) => {
      const py = doc.y;
      doc.font('sans').fontSize(8).fillColor(C.ink).text(p.label, L, py, { width: W - 200 });
      doc.text(`${p.percent}%`, L + W - 200, py, { width: 60, align: 'right' });
      doc.font('semi').text(formatINR(p.amount, { decimals: false }), L + W - 130, py, { width: 130, align: 'right' });
      doc.y = py + 14;
    });
    doc.y += 10;
  }
  const warranty = [packageDoc?.warranty?.text, company.warrantyContent].filter(Boolean).join('\n\n');
  block('Warranty', warranty);
  block('Notes', q.customerNotes);
  block('Terms & conditions', company.terms);

  // ── Signatures ──────────────────────────────────────────
  ensure(90);
  const sy = doc.y + 30;
  doc.moveTo(L, sy + 36).lineTo(L + 200, sy + 36).lineWidth(0.6).strokeColor(C.ink).stroke();
  doc.moveTo(L + W - 200, sy + 36).lineTo(L + W, sy + 36).stroke();
  doc.font('sans').fontSize(8).fillColor(C.muted).text(`For ${company.name}\nAuthorised signatory`, L, sy + 42, { width: 200 });
  doc.text('Customer acceptance\nName, signature & date', L + W - 200, sy + 42, { width: 200, align: 'right' });

  // ── Footer on every page ────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // allow drawing inside the bottom margin without auto page-breaks
    const fy = doc.page.height - 44;
    doc.moveTo(L, fy - 6).lineTo(L + W, fy - 6).lineWidth(0.5).strokeColor(C.brass).stroke();
    doc.font('sans').fontSize(7).fillColor(C.muted)
      .text(company.quotationFooter || `${company.name} · ${q.displayNumber}`, L, fy, { width: W - 80, lineBreak: false, height: 10 });
    doc.text(`Page ${i + 1} of ${range.count}`, L + W - 80, fy, { width: 80, align: 'right', lineBreak: false });
  }

  doc.end();
  return done;
}

module.exports = { renderQuotationPdf };
