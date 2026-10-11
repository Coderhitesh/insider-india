const router = require('express').Router();
const c = require('../controllers/bookingController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { z, objectId, idParam, pagination } = require('../validations/common');

router.use(authenticate);
router.post('/', validate({ body: z.object({ leadId: objectId }) }), c.create);
router.get('/mine', validate({ query: pagination }), c.mine);
router.get('/:id', validate({ params: idParam }), c.get);

module.exports = router;
