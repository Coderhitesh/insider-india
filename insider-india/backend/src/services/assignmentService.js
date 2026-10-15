const { User, Booking, Lead, ContractorProfile } = require('../models');
const notifications = require('./notifications/notificationService');
const { audit } = require('./auditService');
const { logActivity } = require('./activityService');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const { ROLES, TIMELINE, CHANNELS } = require('../config/constants');

async function loadContractor(id) {
  const c = await User.findOne({ _id: id, role: ROLES.CONTRACTOR }).lean();
  if (!c) throw ApiError.badRequest('Contractor not found', 'CONTRACTOR_NOT_FOUND');
  if (c.status !== 'ACTIVE') throw ApiError.badRequest('Contractor is inactive', 'CONTRACTOR_INACTIVE');
  return c;
}

/**
 * Assigns a contractor to a lead and (if booked) its booking.
 * Records assigner, timestamp, remarks, history; notifies contractor + customer.
 */
async function assignContractor(req, { leadId, bookingId, contractorId, remarks }) {
  const contractor = await loadContractor(contractorId);
  let booking = bookingId ? await Booking.findById(bookingId) : null;
  if (bookingId && !booking) throw ApiError.notFound('Booking not found');
  const lead = await Lead.findById(booking ? booking.lead : leadId);
  if (!lead) throw ApiError.notFound('Lead not found');
  if (!booking && lead.booking) booking = await Booking.findById(lead.booking);
  if (booking && ['CANCELLED', 'PROJECT_COMPLETED'].includes(booking.status)) throw ApiError.conflict('Booking is closed', 'BOOKING_CLOSED');

  const now = new Date();
  const previous = booking?.assignedContractor || lead.assignedContractor || null;
  if (previous && String(previous) === String(contractor._id)) throw ApiError.conflict('Contractor is already assigned', 'ALREADY_ASSIGNED');

  const assignment = { assignedBy: req.user._id, assignedAt: now, remarks };
  lead.assignedContractor = contractor._id;
  lead.assignment = assignment;
  if (['BOOKED', 'VERIFIED', 'QUALIFIED'].includes(lead.status)) lead.status = booking ? 'CONTRACTOR_ASSIGNED' : lead.status;
  await lead.save();

  if (booking) {
    const history = booking.assignmentHistory || [];
    const open = history.find((h) => !h.unassignedAt);
    if (open) open.unassignedAt = now;
    history.push({ contractor: contractor._id, ...assignment });
    booking.assignmentHistory = history;
    booking.assignedContractor = contractor._id;
    booking.assignment = assignment;
    if (booking.status === 'CONFIRMED') booking.status = 'CONTRACTOR_ASSIGNED';
    booking.timeline.push({ event: 'CONTRACTOR_ASSIGNED', label: TIMELINE.CONTRACTOR_ASSIGNED, at: now, by: req.user._id, visibleToCustomer: true, meta: { reassigned: Boolean(previous) } });
    await booking.save();
  }

  await audit(req, {
    action: previous ? 'CONTRACTOR_REASSIGNED' : 'CONTRACTOR_ASSIGNED',
    entityType: booking ? 'Booking' : 'Lead',
    entityId: booking ? booking._id : lead._id,
    before: { contractor: previous },
    after: { contractor: contractor._id },
    reason: remarks,
  });
  await logActivity({ lead: lead._id, booking: booking?._id, actor: req.user, type: 'CONTRACTOR_ASSIGNED', message: `Assigned to ${contractor.name}`, meta: { remarks }, visibleToCustomer: true });

  const profile = await ContractorProfile.findOne({ user: contractor._id }).select('contractorCode').lean();
  const ref = booking ? booking.bookingNumber : lead.leadNumber;
  const city = lead.property?.address?.city || lead.city || '';
  notifications.send({
    user: contractor,
    event: 'CONTRACTOR_NEW_ASSIGNMENT',
    channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
    variables: { bookingNumber: ref, city, link: `${env.frontendUrl}/admin/${booking ? `bookings/${booking._id}` : `leads/${lead._id}`}` },
    link: booking ? `/admin/bookings/${booking._id}` : `/admin/leads/${lead._id}`,
  });
  if (booking) {
    notifications.send({
      user: booking.customer,
      event: 'CONTRACTOR_ASSIGNED',
      channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP],
      variables: { contractorName: contractor.name, bookingNumber: booking.bookingNumber, link: `${env.frontendUrl}/account/bookings/${booking._id}` },
      link: `/account/bookings/${booking._id}`,
    });
  }

  return { lead, booking, contractor: { id: String(contractor._id), name: contractor.name, code: profile?.contractorCode } };
}

module.exports = { assignContractor };
