const { Lead, Booking, Estimate } = require('../models');
const options = require('./optionsService');
const { LEAD_OPEN_STATUS } = require('../config/constants');

// Later modules (quotations, projects) register extra metric blocks here.
const extraMetrics = new Map();
const registerMetric = (name, fn) => extraMetrics.set(name, fn);

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
    Lead.aggregate([
      { $match: leadMatch },
      { $group: { _id: { $ifNull: ['$property.address.city', '$city'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 12 },
    ]),
    Lead.aggregate([
      { $match: leadMatch }, { $unwind: '$services' },
      { $group: { _id: '$services', count: { $sum: 1 } } },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 's' } },
      { $project: { count: 1, label: { $ifNull: [{ $first: '$s.title' }, 'Unknown'] } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([{ $match: leadMatch }, { $group: { _id: '$property.bhk', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Lead.aggregate([{ $match: leadMatch }, { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Estimate.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, selectedPackage: { $ne: null } } },
      ...(scope.assignedContractor ? [
        { $lookup: { from: 'leads', localField: 'lead', foreignField: '_id', as: 'l' } },
        { $match: { 'l.assignedContractor': scope.assignedContractor } },
      ] : []),
      { $group: { _id: '$selectedPackage', count: { $sum: 1 } } },
      { $lookup: { from: 'packages', localField: '_id', foreignField: '_id', as: 'p' } },
      { $project: { count: 1, label: { $ifNull: [{ $first: '$p.name' }, 'Unknown'] } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate([
      { $match: leadMatch },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
        leads: { $sum: 1 },
        verified: { $sum: { $cond: [{ $ifNull: ['$verifiedAt', false] }, 1, 0] } },
        booked: { $sum: { $cond: [{ $ifNull: ['$booking', false] }, 1, 0] } },
      } },
      { $sort: { _id: 1 } },
    ]),
    Booking.aggregate([
      { $match: { ...scope, assignedContractor: scope.assignedContractor || { $ne: null }, status: { $nin: ['CANCELLED', 'PROJECT_COMPLETED'] } } },
      { $group: { _id: '$assignedContractor', open: { $sum: 1 }, siteVisitsPending: { $sum: { $cond: [{ $in: ['$status', ['CONTRACTOR_ASSIGNED', 'SITE_VISIT_SCHEDULED']] }, 1, 0] } } } },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
      { $project: { open: 1, siteVisitsPending: 1, name: { $first: '$u.name' } } },
      { $sort: { open: -1 } }, { $limit: 25 },
    ]),
  ]);

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
    trend: trend.map((r) => ({ date: r._id, leads: r.leads, verified: r.verified, booked: r.booked })),
    contractorWorkload: workload.map((r) => ({ id: String(r._id), name: r.name || 'Unknown', open: r.open, siteVisitsPending: r.siteVisitsPending })),
    ...extras,
  };
}

module.exports = { getMetrics, registerMetric };
