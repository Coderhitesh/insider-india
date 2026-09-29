const router = require('express').Router();
const c = require('../controllers/notificationController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { idParam } = require('../validations/common');

router.use(authenticate);
router.get('/', c.list);
router.post('/read-all', c.markAllRead);
router.patch('/:id/read', validate({ params: idParam }), c.markRead);

module.exports = router;
