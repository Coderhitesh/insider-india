const router = require('express').Router();
const c = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { otpSendLimiter, otpVerifyLimiter, staffLoginLimiter } = require('../middleware/rateLimiters');
const v = require('../validations/auth');

router.post('/send-otp', otpSendLimiter, optionalAuth, validate({ body: v.sendOtp }), c.sendOtp);
router.post('/verify-otp', otpVerifyLimiter, optionalAuth, validate({ body: v.verifyOtp }), c.verifyOtp);
router.post('/staff/login', staffLoginLimiter, validate({ body: v.staffLogin }), c.staffLogin);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);
router.post('/logout-all', authenticate, c.logoutAll);
router.get('/me', authenticate, c.me);

module.exports = router;
