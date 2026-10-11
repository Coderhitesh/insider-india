const router = require('express').Router();
const c = require('../controllers/leadController');
const validate = require('../middleware/validate');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { leadCreateLimiter } = require('../middleware/rateLimiters');
const { idParam } = require('../validations/common');
const v = require('../validations/lead');

router.post('/', leadCreateLimiter, optionalAuth, validate({ body: v.createLead }), c.create);
router.get('/resume', authenticate, c.resume);
router.get('/:id', optionalAuth, validate({ params: idParam }), c.get);
router.patch('/:id', optionalAuth, validate({ params: idParam, body: v.updateStep }), c.updateStep);

module.exports = router;
