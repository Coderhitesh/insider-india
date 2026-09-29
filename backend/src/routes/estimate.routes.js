const router = require('express').Router();
const c = require('../controllers/estimateController');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { idParam, pagination } = require('../validations/common');
const v = require('../validations/estimate');

router.get('/config', c.config);
router.get('/packages', c.packagesForEstimate);
router.get('/mine', authenticate, validate({ query: pagination }), c.mine);
router.post('/', authenticate, validate({ body: v.createEstimate }), c.create);
router.get('/:id', authenticate, validate({ params: idParam }), c.get);
router.patch('/:id/package', authenticate, validate({ params: idParam, body: v.selectPackage }), c.selectPackage);

module.exports = router;
