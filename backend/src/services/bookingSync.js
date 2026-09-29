const { Lead } = require('../models');
const { BOOKING_STATUS, LEAD_STATUS, TIMELINE } = require('../config/constants');

const rank = (list, s) => list.indexOf(s);
const TERMINAL_LEAD = ['WON', 'LOST', 'CANCELLED'];

/**
 * Moves booking (and its lead) forward. Never moves a status backwards unless force=true.
 * Mutates and saves the booking document.
 */
async function advance(booking, { status, event, visible = true, by, meta, leadStatus, force = false, save = true }) {
  if (status && booking.status !== 'CANCELLED' && (force || rank(BOOKING_STATUS, status) > rank(BOOKING_STATUS, booking.status))) {
    booking.status = status;
  }
  if (event) booking.timeline.push({ event, label: TIMELINE[event] || event, at: new Date(), by, visibleToCustomer: visible, meta });
  if (save) await booking.save();

  if (leadStatus) {
    const lead = await Lead.findById(booking.lead).select('status');
    if (lead && (force || (!TERMINAL_LEAD.includes(lead.status) && rank(LEAD_STATUS, leadStatus) > rank(LEAD_STATUS, lead.status)) || TERMINAL_LEAD.includes(leadStatus))) {
      await Lead.updateOne({ _id: lead._id }, { $set: { status: leadStatus, lastActivityAt: new Date() } });
    }
  }
  return booking;
}

module.exports = { advance };
