const { SiteVisit, Booking } = require('../models');
const settings = require('../services/settingsService');
const notifications = require('../services/notifications/notificationService');
const { formatDateIST, formatTimeIST } = require('../utils/money');
const { OPERATIONS_CONFIG } = require('../config/defaults');
const { CHANNELS } = require('../config/constants');
const env = require('../config/env');
const logger = require('../utils/logger');

const INTERVAL_MS = 10 * 60000;
let timer;

// Claims each due visit atomically, so multiple API instances never double-send.
async function runOnce() {
  const ops = { ...OPERATIONS_CONFIG, ...((await settings.get('operations.config', {})) || {}) };
  const hours = Number(ops.reminderHoursBefore) || 24;
  const now = new Date();
  const until = new Date(now.getTime() + hours * 3600000);
  let sent = 0;
  for (let i = 0; i < 100; i += 1) {
    const v = await SiteVisit.findOneAndUpdate(
      { status: 'SCHEDULED', reminderSentAt: null, scheduledAt: { $gt: now, $lte: until } },
      { $set: { reminderSentAt: now } },
      { new: true },
    ).lean();
    if (!v) break;
    const booking = await Booking.findById(v.booking).select('customer bookingNumber status').lean();
    if (!booking || booking.status === 'CANCELLED') continue;
    const variables = {
      visitDate: formatDateIST(v.scheduledAt, { weekday: 'short', day: '2-digit', month: 'short' }),
      visitTime: formatTimeIST(v.scheduledAt), bookingNumber: booking.bookingNumber,
      link: `${env.frontendUrl}/account/bookings/${booking._id}`,
    };
    await notifications.send({ user: booking.customer, event: 'SITE_VISIT_REMINDER', channels: [CHANNELS.IN_APP, CHANNELS.WHATSAPP], variables, link: `/account/bookings/${booking._id}` });
    await notifications.send({ user: v.contractor, event: 'SITE_VISIT_REMINDER', channels: [CHANNELS.IN_APP], variables, link: `/admin/site-visits/${v._id}` });
    sent += 1;
  }
  if (sent) logger.info(`Site visit reminders sent: ${sent}`);
}

function start() {
  if (timer) return;
  const tick = () => runOnce().catch((err) => logger.error('Reminder job failed', { error: err.message }));
  timer = setInterval(tick, INTERVAL_MS);
  timer.unref();
  setTimeout(tick, 15000).unref();
}

const stop = () => { clearInterval(timer); timer = null; };

module.exports = { start, stop, runOnce };
