const router = require('express').Router();
const c = require('../controllers/catalogController');
const cms = require('../controllers/cmsController');

router.get('/site', c.site);
router.get('/packages', c.packages);
router.get('/packages/:slug', c.packageBySlug);
router.get('/services', c.services);
router.get('/funnel-options', c.funnelOptions);
router.get('/projects', cms.projects);
router.get('/projects/slugs', cms.slugs);
router.get('/projects/:slug', cms.projectBySlug);
router.get('/testimonials', cms.testimonials);
router.get('/faqs', cms.faqs);

module.exports = router;
