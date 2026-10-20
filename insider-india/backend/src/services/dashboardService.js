const { Lead, Booking, Estimate, Service, Package, User } = require('../models');
const options = require('./optionsService');
const { LEAD_OPEN_STATUS } = require('../config/constants');

// Later modules (quotations, projects) register extra metric blocks here.
const extraMetrics = new Map();
const registerMetric = (name, fn) => extraMetrics.set(name, fn);

const IST = 330 * 60000;
const dayKey = (d) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 10);

// Leads / verified / booked per IST day. Plain operators only, so it runs on any Mongo-compatible server.
async function dailyTrend(match) {
  const rows = await Lead.find(match).select('createdAt verifiedAt booking').limit(100000).lean();
  const days = new Map();
  for (const r of rows) {
    const k = dayKey(r.createdAt);
    const d = days.get(k) || { date: k, leads: 0, verified: 0, booked: 0 };
    d.leads += 1;
    if (r.verifiedAt) d.verified += 1;
    if (r.booking) d.booked += 1;
    days.set(k, d);
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// City from the verified property address, falling back to the city picked in step 1.
async function leadsByCity(match) {
  const [withAddr, without] = await Promise.all([
    Lead.aggregate([{ $match: { ...match, 'property.address.city': { $exists: true, $nin: [null, ''] } } }, { $group: { _id: '$property.address.city', count: { $sum: 1 } } }]),
    Lead.aggregate([{ $match: { ...match, $or: [{ 'property.address.city': { $exists: false } }, { 'property.address.city': { $in: [null, ''] } }] } }, { $group: { _id: '$city', count: { $sum: 1 } } }]),
  ]);
  const m = new Map();
  for (const r of [...withAddr, ...without]) {
    const k = (r._id || '').trim();
    const key = k.toLowerCase();
    const cur = m.get(key) || { _id: k || null, count: 0 };
    cur.count += r.count;
    m.set(key, cur);
  }
  return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 12);
}

async function contractorWorkload(scope) {
  const base = { ...scope, assignedContractor: scope.assignedContractor || { $ne: null }, status: { $nin: ['CANCELLED', 'PROJECT_COMPLETED'] } };
  const [open, pending] = await Promise.all([
    Booking.aggregate([{ $match: base }, { $group: { _id: '$assignedContractor', n: { $sum: 1 } } }]),
    Booking.aggregate([{ $match: { ...base, status: { $in: ['CONTRACTOR_ASSIGNED', 'SITE_VISIT_SCHEDULED'] } } }, { $group: { _id: '$assignedContractor', n: { $sum: 1 } } }]),
  ]);
  const p = new Map(pending.map((r) => [String(r._id), r.n]));
  return open.map((r) => ({ _id: r._id, open: r.n, siteVisitsPending: p.get(String(r._id)) || 0 })).sort((a, b) => b.open - a.open).slice(0, 25);
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

async function getMetrics({ start, end }, scope = {}) {
  const leadMatch = { createdAt: { $gte: start, $lte: end }, ...scope };
  const bookingMatch = { createdAt: { $gte: start, $lte: end }, ...scope };
  const opts = await options.getFunnelOptions({ activeOnly: false });

  const [
    totalLeads, newLeads, verifiedLeads, abandonedLeads, bookings, siteVisits,
    byCity, byService, byBhk, byStatus, byPackage, trend, workload,
  ] = await Promise.all([
    Lead.countDocuments(leadMatch),
    Lead.countDocuments({ ...leadMatch, status: { $in: ['NEW', 'IN_PROGRESS', 'OTP_PENDING'] } }),
    Lead.countDocuments({ ...leadMatch, verifiedAt: { $ne: null } }),
    Lead.countDocuments({ ...leadMatch, status: { $in: LEAD_OPEN_STATUS }, booking: null, lastActivityAt: { $lt: new Date(Date.now() - 86400000) } }),
    Booking.countDocuments(bookingMatch),
    Booking.countDocuments({ ...scope, siteVisitAt: { $gte: start, $lte: end } }),
    leadsByCity(leadMatch),
    Lead.aggregate([
      { $match: leadMatch }, { $unwind: '$services' },
      { $group: { _id: '$services', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([{ $match: leadMatch }, { $group: { _id: '$property.bhk', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Lead.aggregate([{ $match: leadMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    (async () => {
      const match = { createdAt: { $gte: start, $lte: end }, selectedPackage: { $ne: null } };
      if (scope.assignedContractor) match.lead = { $in: await Lead.distinct('_id', { assignedContractor: scope.assignedContractor }) };
      return Estimate.aggregate([{ $match: match }, { $group: { _id: '$selectedPackage', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
    })(),
    dailyTrend(leadMatch),
    contractorWorkload(scope),
  ]);

  // Resolve display names separately (portable: no $lookup needed).
  const nameMap = async (Model, ids, field) => new Map((await Model.find({ _id: { $in: ids } }).select(field).lean()).map((d) => [String(d._id), d[field]]));
  const [svcNames, pkgNames, userNames] = await Promise.all([
    nameMap(Service, byService.map((r) => r._id), 'title'),
    nameMap(Package, byPackage.map((r) => r._id), 'name'),
    nameMap(User, workload.map((r) => r._id), 'name'),
  ]);
  byService.forEach((r) => { r.label = svcNames.get(String(r._id)) || 'Unknown'; });
  byPackage.forEach((r) => { r.label = pkgNames.get(String(r._id)) || 'Unknown'; });
  workload.forEach((r) => { r.name = userNames.get(String(r._id)); });

  const extras = {};
  for (const [name, fn] of extraMetrics) extras[name] = await fn({ start, end }, scope);

  return {
    totals: {
      totalLeads, newLeads, verifiedLeads, abandonedLeads, bookings, siteVisits,
      verificationRate: pct(verifiedLeads, totalLeads),
      conversionRate: pct(bookings, totalLeads),
    },
    leadsByCity: byCity.map((r) => ({ label: r._id || 'Not provided', count: r.count })),
    leadsByService: byService.map((r) => ({ id: String(r._id), label: r.label, count: r.count })),
    leadsByBhk: byBhk.map((r) => ({ value: r._id, label: r._id ? options.labelOf(opts, 'bhkOptions', r._id) : 'Not provided', count: r.count })),
    leadsByStatus: byStatus.map((r) => ({ label: r._id, count: r.count })),
    leadsByPackage: byPackage.map((r) => ({ id: String(r._id), label: r.label, count: r.count })),
    trend,
    contractorWorkload: workload.map((r) => ({ id: String(r._id), name: r.name || 'Unknown', open: r.open, siteVisitsPending: r.siteVisitsPending })),
    ...extras,
  };
}

module.exports = { getMetrics, registerMetric };
