const router = require('express').Router();
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { requirePermission, requireAnyPermission, requireStaff, requireSuperAdmin } = require('../../middleware/permissions');
const { z, idParam, objectId } = require('../../validations/common');
const v = require('../../validations/admin');

const dashboard = require('../../controllers/admin/dashboardController');
const leads = require('../../controllers/admin/leadsController');
const bookings = require('../../controllers/admin/bookingsController');
const notes = require('../../controllers/admin/notesController');
const customers = require('../../controllers/admin/customersController');
const contractors = require('../../controllers/admin/contractorsController');
const users = require('../../controllers/admin/usersController');
const roles = require('../../controllers/admin/rolesController');
const settings = require('../../controllers/admin/settingsController');
const catalog = require('../../controllers/admin/catalogAdminController');
const quotationsAdmin = require('../../controllers/admin/quotationsAdminController');

const P = requirePermission;
const id = validate({ params: idParam });
const reorder = validate({ body: z.object({ ids: z.array(objectId).min(1).max(500) }) });

router.use(authenticate, requireStaff);

// Dashboard
router.get('/dashboard', P('dashboard.view'), validate({ query: v.listQuery.pick({ range: true, from: true, to: true }) }), dashboard.metrics);

// Leads
router.get('/leads', P('leads.view'), validate({ query: v.listQuery }), leads.list);
router.get('/leads/:id', P('leads.view'), id, leads.get);
router.patch('/leads/:id', P('leads.edit'), validate({ params: idParam, body: v.updateLead }), leads.update);
router.post('/leads/:id/assign-contractor', P('leads.assign'), validate({ params: idParam, body: v.assign }), leads.assign);
router.delete('/leads/:id', P('leads.delete'), id, leads.remove);

// Bookings
router.get('/bookings', P('bookings.view'), validate({ query: v.listQuery }), bookings.list);
router.get('/bookings/:id', P('bookings.view'), id, bookings.get);
router.post('/bookings/:id/assign-contractor', P('bookings.assign'), validate({ params: idParam, body: v.assign }), bookings.assign);
router.patch('/bookings/:id/status', P('bookings.edit'), validate({ params: idParam, body: v.bookingStatus }), bookings.updateStatus);

// Quotations (latest versions by default; ?allVersions=true, ?format=csv)
router.get('/quotations', P('quotations.view'), quotationsAdmin.list);

// Internal notes (lead or booking)
const noteParams = z.object({ type: z.enum(['leads', 'bookings']), id: objectId });
router.get('/:type(leads|bookings)/:id/notes', validate({ params: noteParams }), notes.list);
router.post('/:type(leads|bookings)/:id/notes', validate({ params: noteParams, body: v.note }), notes.create);
router.delete('/:type(leads|bookings)/:id/notes/:noteId', validate({ params: noteParams.extend({ noteId: objectId }) }), notes.remove);

// Customers
router.get('/customers', P('customers.view'), validate({ query: v.listQuery.extend({ status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']).optional() }) }), customers.list);
router.get('/customers/:id', P('customers.view'), id, customers.get);
router.patch('/customers/:id', P('customers.edit'), validate({ params: idParam, body: v.updateCustomer }), customers.update);
router.delete('/customers/:id', P('customers.edit'), id, customers.remove);

// Contractors
router.get('/contractors', requireAnyPermission('contractors.view', 'bookings.assign', 'leads.assign'), contractors.list);
router.get('/contractors/:id', P('contractors.view'), id, contractors.get);
router.post('/contractors', P('contractors.create'), validate({ body: v.createContractor }), contractors.create);
router.patch('/contractors/:id', P('contractors.edit'), validate({ params: idParam, body: v.updateContractor }), contractors.update);
router.delete('/contractors/:id', P('contractors.delete'), id, contractors.remove);

// Staff users, roles, permissions
router.patch('/me/password', validate({ body: z.object({ currentPassword: z.string().max(200), password: v.resetPassword.shape.password }) }), users.changeOwnPassword);
router.get('/users', P('users.view'), users.list);
router.post('/users', P('users.manage'), validate({ body: v.createStaff }), users.create);
router.patch('/users/:id', P('users.manage'), validate({ params: idParam, body: v.updateStaff }), users.update);
router.post('/users/:id/reset-password', P('users.manage'), validate({ params: idParam, body: v.resetPassword }), users.resetPassword);
router.post('/users/:id/force-logout', P('users.manage'), id, users.forceLogout);
router.get('/permissions', requireAnyPermission('roles.manage', 'users.view', 'contractors.edit'), roles.permissions);
router.get('/roles', requireAnyPermission('roles.manage', 'users.view'), roles.list);
router.post('/roles', P('roles.manage'), validate({ body: v.createRole }), roles.create);
router.patch('/roles/:id', P('roles.manage'), validate({ params: idParam, body: v.updateRole }), roles.update);
router.delete('/roles/:id', P('roles.manage'), id, roles.remove);

// Settings (storage/providers/OTP additionally require Super Admin — enforced in controller)
router.get('/settings', P('settings.view'), settings.list);
router.post('/settings/storage/test', requireSuperAdmin, settings.testStorage);
router.post('/settings/providers/:kind/test', requireSuperAdmin, validate({ body: z.object({ to: z.string().trim().max(200), templateName: z.string().max(200).optional() }) }), settings.testProvider);
router.get('/settings/:key', P('settings.view'), settings.get);
router.put('/settings/:key', P('settings.manage'), validate({ body: z.object({ value: z.any(), reason: z.string().max(500).optional() }) }), settings.update);

// CRUD collections
function mount(path, h, viewPerm, managePerm) {
  router.get(`/${path}`, P(viewPerm), h.list);
  router.patch(`/${path}/reorder`, P(managePerm), reorder, h.reorder);
  router.get(`/${path}/:id`, P(viewPerm), id, h.get);
  router.post(`/${path}`, P(managePerm), h.create);
  router.patch(`/${path}/:id`, P(managePerm), id, h.update);
  router.delete(`/${path}/:id`, P(managePerm), id, h.remove);
}
mount('packages', catalog.packages, 'packages.view', 'packages.manage');
mount('services', catalog.services, 'packages.view', 'packages.manage');
mount('estimate-rules', catalog.estimateRules, 'packages.view', 'packages.manage');
mount('notification-templates', catalog.templates, 'notifications.send', 'notifications.send');
mount('projects', catalog.projects, 'content.manage', 'content.manage');
mount('testimonials', catalog.testimonials, 'content.manage', 'content.manage');
mount('faqs', catalog.faqs, 'content.manage', 'content.manage');

// Notifications, audit, uploads
router.post('/notifications/send', P('notifications.send'), validate({ body: v.sendNotification }), catalog.sendNotification);
router.get('/notifications/log', P('notifications.send'), catalog.notificationLog);
router.get('/audit-logs', P('audit_logs.view'), catalog.auditLogs);
router.get('/uploads', P('settings.view'), catalog.uploads);

module.exports = router;
