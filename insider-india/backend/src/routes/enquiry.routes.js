const router = require('express').Router();
const validate = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');
const { enquiryLimiter } = require('../middleware/rateLimiters');
const v = require('../validations/enquiry');
const c = require('../controllers/enquiryController');

router.post('/', enquiryLimiter, optionalAuth, validate({ body: v.create }), c.create);

module.exports = router;
