const { ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');

// Contractors only ever see records assigned to them.
const isContractor = (user) => user?.role === ROLES.CONTRACTOR;
const assignedScope = (user) => (isContractor(user) ? { assignedContractor: user._id } : {});

function assertAssigned(user, doc) {
  if (!isContractor(user)) return;
  const assigned = doc.assignedContractor?._id || doc.assignedContractor;
  if (!assigned || String(assigned) !== String(user._id)) throw ApiError.notFound('Not found');
}

module.exports = { isContractor, assignedScope, assertAssigned };
