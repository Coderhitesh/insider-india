const router = require('express').Router();
const c = require('../controllers/geoController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { geoLimiter } = require('../middleware/rateLimiters');
const { z } = require('../validations/common');

const sessionToken = z.string().trim().max(200).optional();

router.use(authenticate, geoLimiter);
router.get('/autocomplete', validate({ query: z.object({ q: z.string().trim().min(3).max(200), sessionToken }) }), c.autocomplete);
router.get('/place/:placeId', validate({ params: z.object({ placeId: z.string().trim().min(5).max(300) }), query: z.object({ sessionToken }) }), c.place);

module.exports = router;
