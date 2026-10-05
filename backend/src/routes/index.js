const router = require('express').Router();

router.use('/files', require('./files.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/catalog', require('./catalog.routes'));
router.use('/leads', require('./lead.routes'));
router.use('/estimates', require('./estimate.routes'));
router.use('/bookings', require('./booking.routes'));
router.use('/uploads', require('./upload.routes'));
router.use('/geo', require('./geo.routes'));
router.use('/notifications', require('./notification.routes'));
const ops = require('./operations.routes');

router.use('/site-visits', ops.siteVisits);
router.use('/measurements', ops.measurementRoutes);
router.use('/quotations', ops.quotationRoutes);
router.use('/execution', ops.executionRoutes);
router.use('/account', ops.account);
router.use('/admin', require('./admin'));

module.exports = router;
