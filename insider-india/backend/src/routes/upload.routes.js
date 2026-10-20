const router = require('express').Router();
const c = require('../controllers/uploadController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { idParam } = require('../validations/common');

router.use(authenticate);
router.post('/', uploadLimiter, uploadSingle, c.upload);
router.get('/:id/url', validate({ params: idParam }), c.getUrl);
router.delete('/:id', validate({ params: idParam }), c.remove);

module.exports = router;
