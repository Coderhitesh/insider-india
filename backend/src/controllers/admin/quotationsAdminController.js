const { Quotation, Booking } = require('../../models');
const { isContractor } = require('../../services/scopeService');
const { audit } = require('../../services/auditService');
const { parseRange } = require('../../utils/dateRange');
const { escapeRegex, splitList } = require('../../utils/text');
const { sendCsv } = require('../../utils/csv');
const { parsePagination, pageMeta } = require('../../utils/pagination');
const { ok } = require('../../utils/respond');
const asyncHandler = require('../../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = {};
  if (q.allVersions !== 'true') filter.isLatest = true;
  if (isContractor(req.user)) filter.contractor = req.user._id;
  else if (q.contractor && /^[a-f\d]{24}$/i.test(q.contractor)) filter.contractor = q.contractor;
  if (q.status) filter.status = { $in: splitList(q.status) };
  if (q.bookingId && /^[a-f\d]{24}$/i.test(q.bookingId)) filter.booking = q.bookingId;
  if (q.range || q.from || q.to) { const { start, end } = parseRange(q, 'all'); filter.createdAt = { $gte: start, $lte: end }; }
  if (q.minTotal) filter['totals.grandTotal'] = { $gte: Number(q.minTotal) || 0 };
  if (q.q) {
    const rx = new RegExp(escapeRegex(String(q.q).slice(0, 100)), 'i');
    const bookings = await Booking.find({ $or: [{ bookingNumber: rx }, { 'snapshot.name': rx }] }).select('_id').limit(500).lean();
    filter.$or = [{ displayNumber: rx }, { booking: { $in: bookings.map((b) => b._id) } }];
  }
  const populate = [{ path: 'booking', select: 'bookingNumber snapshot.name snapshot.address.city' }, { path: 'contractor', select: 'name' }];
  const row = (x) => ({
    id: String(x._id), displayNumber: x.displayNumber, version: x.version, isLatest: x.isLatest, status: x.status,
    bookingId: String(x.booking?._id), bookingNumber: x.booking?.bookingNumber, customer: x.booking?.snapshot?.name, city: x.booking?.snapshot?.address?.city,
    contractor: x.contractor?.name, grandTotal: x.totals?.grandTotal, contractorGrandTotal: x.contractorGrandTotal,
    adjustment: x.contractorGrandTotal ? x.totals.grandTotal - x.contractorGrandTotal : null, priceChanges: x.priceChanges?.length || 0,
    submittedAt: x.submittedAt, sentAt: x.sentAt, acceptedAt: x.acceptedAt, updatedAt: x.updatedAt,
  });

  if (q.format === 'csv') {
    const rows = (await Quotation.find(filter).sort({ updatedAt: -1 }).limit(20000).populate(populate).lean()).map(row);
    await audit(req, { action: 'QUOTATIONS_EXPORTED', entityType: 'Quotation', meta: { count: rows.length } });
    return sendCsv(res, `quotations-${Date.now()}.csv`, rows, [
      { label: 'Quotation', value: 'displayNumber' }, { label: 'Status', value: 'status' }, { label: 'Booking', value: 'bookingNumber' },
      { label: 'Customer', value: 'customer' }, { label: 'City', value: 'city' }, { label: 'Contractor', value: 'contractor' },
      { label: 'Contractor Total', value: 'contractorGrandTotal' }, { label: 'Grand Total', value: 'grandTotal' }, { label: 'Adjustment', value: 'adjustment' },
      { label: 'Submitted', value: 'submittedAt' }, { label: 'Sent', value: 'sentAt' }, { label: 'Accepted', value: 'acceptedAt' },
    ]);
  }
  const pg = parsePagination(q, { maxLimit: 200 });
  const [items, total] = await Promise.all([
    Quotation.find(filter).sort({ updatedAt: -1 }).skip(pg.skip).limit(pg.limit).populate(populate).lean(),
    Quotation.countDocuments(filter),
  ]);
  return ok(res, { items: items.map(row) }, 'OK', 200, pageMeta(pg, total));
});
