const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { requirePermission: P, requireStaff, requireRole } = require('../middleware/permissions');
const { z, objectId, idParam } = require('../validations/common');
const v = require('../validations/operations');
const visits = require('../controllers/siteVisitController');
const measurements = require('../controllers/measurementController');
const quotations = require('../controllers/quotationController');
const execution = require('../controllers/executionController');
const accountCtl = require('../controllers/accountController');

const id = validate({ params: idParam });
const bookingParam = validate({ params: z.object({ bookingId: objectId }) });

// ── /site-visits ──────────────────────────────────────────────
const siteVisits = express.Router();
siteVisits.use(authenticate, requireStaff);
siteVisits.get('/', P('site_visit.view'), visits.list);
siteVisits.post('/', P('site_visit.manage'), validate({ body: v.scheduleVisit }), visits.create);
siteVisits.get('/:id', P('site_visit.view'), id, visits.get);
siteVisits.patch('/:id', P('site_visit.manage'), validate({ params: idParam, body: v.updateVisit }), visits.update);
siteVisits.post('/:id/complete', P('site_visit.manage'), validate({ params: idParam, body: v.completeVisit }), visits.complete);
siteVisits.post('/:id/cancel', P('site_visit.manage'), validate({ params: idParam, body: v.cancelVisit }), visits.cancel);

// ── /measurements ────────────────────────────────────────────
const measurementRoutes = express.Router();
measurementRoutes.use(authenticate, requireStaff);
measurementRoutes.get('/booking/:bookingId', P('site_visit.view'), bookingParam, measurements.get);
measurementRoutes.put('/booking/:bookingId', P('site_visit.manage'), validate({ params: z.object({ bookingId: objectId }), body: v.saveMeasurement }), measurements.save);
measurementRoutes.post('/booking/:bookingId/finalize', P('site_visit.manage'), bookingParam, measurements.finalize);
measurementRoutes.post('/booking/:bookingId/reopen', bookingParam, measurements.reopen);

// ── /quotations (staff + customer; permission checks inside controller) ──
const quotationRoutes = express.Router();
quotationRoutes.use(authenticate);
const staff = requireStaff;
const customer = requireRole('CUSTOMER');
quotationRoutes.get('/mine', customer, quotations.mine);
quotationRoutes.get('/booking/:bookingId', staff, bookingParam, quotations.versions);
quotationRoutes.post('/', staff, validate({ body: v.createQuotation }), quotations.create);
quotationRoutes.get('/:id', id, quotations.get);
quotationRoutes.get('/:id/pdf', id, quotations.pdf);
quotationRoutes.get('/:id/preview-pdf', staff, id, quotations.previewPdf);
quotationRoutes.patch('/:id', staff, validate({ params: idParam, body: v.quotationBody }), quotations.update);
quotationRoutes.post('/:id/submit', staff, validate({ params: idParam, body: v.noteOnly }), quotations.submit);
quotationRoutes.post('/:id/return', staff, validate({ params: idParam, body: v.requiredNote }), quotations.returnToContractor);
quotationRoutes.post('/:id/approve', staff, validate({ params: idParam, body: v.approve }), quotations.approve);
quotationRoutes.post('/:id/send', staff, id, quotations.send);
quotationRoutes.post('/:id/revise', staff, validate({ params: idParam, body: v.revise }), quotations.revise);
quotationRoutes.post('/:id/accept', customer, validate({ params: idParam, body: v.accept }), quotations.accept);
quotationRoutes.post('/:id/revision-request', customer, validate({ params: idParam, body: v.requiredNote }), quotations.requestRevision);
quotationRoutes.post('/:id/reject', customer, validate({ params: idParam, body: v.requiredNote }), quotations.reject);

// ── /projects-execution (staff) & /account/projects (customer) ──
const executionRoutes = express.Router();
executionRoutes.use(authenticate, requireStaff);
executionRoutes.get('/', P('bookings.view'), execution.list);
executionRoutes.get('/:id', P('bookings.view'), id, execution.get);
executionRoutes.post('/:id/start', P('bookings.edit'), id, execution.start);
executionRoutes.post('/:id/stage', P('bookings.edit'), validate({ params: idParam, body: v.projectStage }), execution.setStage);
executionRoutes.patch('/:id', P('bookings.edit'), validate({ params: idParam, body: v.projectUpdate }), execution.update);
executionRoutes.post('/:id/updates', P('site_visit.manage'), validate({ params: idParam, body: v.projectPost }), execution.postUpdate);

const account = express.Router();
account.use(authenticate, customer);
account.get('/summary', accountCtl.summary);
account.get('/profile', accountCtl.getProfile);
account.patch('/profile', validate({ body: z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120).optional(),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional(),
  preferredChannel: z.enum(['WHATSAPP', 'SMS', 'CALL']).optional(),
  marketingConsent: z.boolean().optional(),
}) }), accountCtl.updateProfile);
account.get('/documents', accountCtl.documents);
account.get('/projects', execution.mine);
account.get('/projects/:id', id, execution.customerGet);

module.exports = { siteVisits, measurementRoutes, quotationRoutes, executionRoutes, account };
