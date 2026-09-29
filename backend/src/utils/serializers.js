const { computeNextStep, stepIndex } = require('../services/leadFlow');
const { maskMobile } = require('./phone');

const publicUser = (u, permissions) => ({
  id: String(u._id),
  name: u.name || '',
  mobile: u.mobile || null,
  email: u.email || null,
  role: u.role,
  mobileVerified: Boolean(u.mobileVerified),
  ...(permissions ? { permissions: [...permissions] } : {}),
});

function leadView(lead) {
  const l = lead.toObject ? lead.toObject() : lead;
  const nextStep = computeNextStep(l);
  return {
    id: String(l._id),
    leadNumber: l.leadNumber,
    flow: l.flow,
    status: l.status,
    name: l.name,
    mobile: l.mobile,
    maskedMobile: maskMobile(l.mobile),
    city: l.city,
    verified: Boolean(l.user && l.verifiedAt),
    requirementType: l.requirementType || null,
    budgetRange: l.budgetRange || null,
    possession: l.possession || null,
    propertyCategory: l.propertyCategory,
    property: {
      address: l.property?.address || null,
      propertyType: l.property?.propertyType || null,
      bhk: l.property?.bhk || null,
      area: l.property?.area || null,
    },
    projectType: l.projectType || null,
    services: (l.services || []).map((s) => (s && s._id ? { id: String(s._id), title: s.title, slug: s.slug } : String(s))),
    floorPlan: {
      hasFloorPlan: l.floorPlan?.hasFloorPlan ?? null,
      media: (l.floorPlan?.media || []).map((m) => (m && m._id
        ? { id: String(m._id), originalName: m.originalName, mimeType: m.mimeType, size: m.size }
        : String(m))),
      measurementAssistance: l.floorPlan?.measurementAssistance || null,
    },
    estimateDraft: l.estimateDraft || null,
    estimateId: l.estimate ? String(l.estimate._id || l.estimate) : null,
    bookingId: l.booking ? String(l.booking._id || l.booking) : null,
    stepsCompleted: l.stepsCompleted || [],
    currentStep: l.currentStep,
    nextStep,
    nextStepIndex: stepIndex(nextStep),
    updatedAt: l.updatedAt,
  };
}

function estimateView(e) {
  return {
    id: String(e._id),
    estimateNumber: e.estimateNumber,
    leadId: e.lead ? String(e.lead) : null,
    inputs: e.inputs,
    results: (e.results || []).map((r) => ({ ...r, package: String(r.package) })),
    selectedPackage: e.selectedPackage ? String(e.selectedPackage) : null,
    baseMin: e.baseMin,
    baseMax: e.baseMax,
    adjustments: e.adjustments,
    finalMin: e.finalMin,
    finalMax: e.finalMax,
    disclaimer: e.disclaimer,
    createdAt: e.createdAt,
  };
}

function bookingView(b, { customer = true } = {}) {
  return {
    id: String(b._id),
    bookingNumber: b.bookingNumber,
    status: b.status,
    customerName: b.snapshot?.name,
    mobile: b.snapshot?.mobile,
    address: b.snapshot?.address,
    requirementType: b.snapshot?.requirementType,
    budgetRange: b.snapshot?.budgetRange,
    possession: b.snapshot?.possession,
    propertyType: b.snapshot?.propertyType,
    bhk: b.snapshot?.bhk,
    projectType: b.snapshot?.projectType,
    services: (b.snapshot?.services || []).map((s) => s.title),
    labels: b.snapshot?.labels || {},
    floorPlan: {
      hasFloorPlan: b.floorPlan?.hasFloorPlan ?? null,
      files: (b.floorPlan?.media || []).length,
      measurementAssistance: b.floorPlan?.measurementAssistance || null,
    },
    estimateId: b.estimate ? String(b.estimate) : null,
    packageId: b.package ? String(b.package) : null,
    assignedContractor: b.assignedContractor && b.assignedContractor.name
      ? { id: String(b.assignedContractor._id), name: b.assignedContractor.name }
      : null,
    siteVisitAt: b.siteVisitAt || null,
    timeline: (b.timeline || [])
      .filter((t) => !customer || t.visibleToCustomer)
      .map((t) => ({ event: t.event, label: t.label, at: t.at })),
    createdAt: b.createdAt,
  };
}

module.exports = { publicUser, leadView, estimateView, bookingView };
