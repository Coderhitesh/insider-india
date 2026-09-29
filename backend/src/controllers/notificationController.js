const { Notification } = require('../models');
const { ok } = require('../utils/respond');
const { parsePagination, pageMeta } = require('../utils/pagination');
const asyncHandler = require('../utils/asyncHandler');

exports.list = asyncHandler(async (req, res) => {
  const pg = parsePagination(req.query);
  const filter = { user: req.user._id, channel: 'IN_APP' };
  if (req.query.unread === 'true') filter.readAt = null;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(pg.skip).limit(pg.limit).select('event title body link data readAt createdAt').lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, channel: 'IN_APP', readAt: null }),
  ]);
  ok(res, { items: items.map((n) => ({ ...n, id: String(n._id), _id: undefined })), unread }, 'OK', 200, pageMeta(pg, total));
});

exports.markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  ok(res, {}, 'Marked as read');
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, channel: 'IN_APP', readAt: null }, { $set: { readAt: new Date() } });
  ok(res, {}, 'All marked as read');
});
