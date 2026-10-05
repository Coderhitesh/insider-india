/* eslint-disable no-console */
/**
 * End-to-end API test: customer booking funnel, estimate, staff console, contractor site visit,
 * measurements, quotation review/approval/PDF, customer acceptance and project execution.
 *
 * Requirements: API running with LOG SMS/WhatsApp providers (OTP codes are read from logs/combined.log)
 * and a storage provider that works in your environment (LOCAL is simplest).
 *   API_URL=http://localhost:5000 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e
 * Creates real test data (mobiles 7xxxxxxxxx). Do not run against production.
 */
const fs = require('fs');
const path = require('path');

const API = (process.env.API_URL || 'http://localhost:5000').replace(/\/$/, '');
const LOG = process.env.LOG_FILE || path.resolve(__dirname, '../logs/combined.log');
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const rnd = () => `7${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

let pass = 0; let fail = 0; const failures = [];
function check(name, cond, extra) {
  if (cond) { pass += 1; console.log(`  \x1b[32m✔\x1b[0m ${name}`); } else { fail += 1; failures.push(name); console.log(`  \x1b[31m✘ ${name}\x1b[0m`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
  return cond;
}
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

async function call(method, p, { body, token, leadToken, cookie, form, raw } = {}) {
  const headers = process.env.ORIGIN ? { Origin: process.env.ORIGIN } : {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (leadToken) headers['X-Lead-Token'] = leadToken;
  if (cookie) headers.Cookie = cookie;
  if (body && !form) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}/api/v1${p}`, { method, headers, body: form || (body ? JSON.stringify(body) : undefined) });
  const setCookie = res.headers.get('set-cookie');
  if (raw) return { status: res.status, res, setCookie };
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, body: json, data: json.data, setCookie, headers: res.headers };
}
const cookieFrom = (sc) => (sc ? sc.split(';')[0] : null);

async function otpFor(mobile, since) {
  for (let i = 0; i < 30; i += 1) {
    const lines = fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8').trim().split('\n').slice(-400) : [];
    for (const l of lines.reverse()) {
      try {
        const j = JSON.parse(l);
        const m = String(j.message).match(new RegExp(`to \\+91${mobile}[^:]*: (\\d{4,8}) `));
        if (m && new Date(j.timestamp).getTime() >= since - 1000) return m[1];
      } catch { /* not json */ }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`OTP for ${mobile} not found in ${LOG}`);
}

async function login(mobile, extra = {}) {
  let t0 = Date.now();
  let s = await call('POST', '/auth/send-otp', { body: { mobile, channel: 'SMS', ...extra } });
  if (s.status === 429 && s.body.details?.retryAfter) {
    console.log(`    (waiting ${s.body.details.retryAfter}s OTP cooldown)`);
    await new Promise((r) => setTimeout(r, s.body.details.retryAfter * 1000 + 500));
    t0 = Date.now();
    s = await call('POST', '/auth/send-otp', { body: { mobile, channel: 'SMS', ...extra } });
  }
  if (s.status !== 200) throw new Error(`send-otp ${s.status} ${JSON.stringify(s.body)}`);
  const code = await otpFor(mobile, t0);
  const v = await call('POST', '/auth/verify-otp', { body: { mobile, code, ...extra } });
  return { ...v, cookie: cookieFrom(v.setCookie) };
}

const pdfBuffer = () => Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const pngBuffer = () => Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
function upload(token, purpose, buf, name, type) {
  const fd = new FormData();
  fd.append('purpose', purpose);
  fd.append('file', new Blob([buf], { type }), name);
  return call('POST', '/uploads', { token, form: fd });
}

(async () => {
  if (!ADMIN.email || !ADMIN.password) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD'); process.exit(2); }
  console.log(`E2E against ${API}`);

  section('Health & public catalogue');
  const h = await fetch(`${API}/health`).then((r) => r.json());
  check('health ok', h.status === 'ok', h);
  const site = await call('GET', '/catalog/site');
  check('site settings', site.status === 200 && site.data.company.name, site.body);
  const pk = await call('GET', '/catalog/packages');
  check('4 packages', pk.data?.packages?.length >= 4, pk.body);
  const sv = await call('GET', '/catalog/services?context=booking');
  check('booking services', sv.data?.services?.length >= 1, sv.body);
  const fo = await call('GET', '/catalog/funnel-options');
  check('funnel options + floor plan charge', fo.data?.bhkOptions?.length && fo.data.floorPlanAssistanceCharge > 0, fo.body);
  const ec = await call('GET', '/estimates/config');
  check('estimate config + addons', ec.data?.addons?.length > 0, ec.body);
  check('unknown route → 404', (await call('GET', '/nope')).status === 404);

  section('Booking funnel (customer A)');
  const mA = rnd();
  check('invalid mobile rejected', (await call('POST', '/leads', { body: { flow: 'BOOKING', name: 'Test A', mobile: '12345' } })).status === 422);
  const lc = await call('POST', '/leads', { body: { flow: 'BOOKING', name: 'Rahul Test', mobile: mA, city: 'Noida', utm: { source: 'e2e' } } });
  check('lead created with anonymous token', lc.status === 201 && lc.data.leadToken, lc.body);
  const leadId = lc.data.lead.id; const lt = lc.data.leadToken;
  check('lead unreadable without token', (await call('GET', `/leads/${leadId}`)).status === 403);
  check('invalid option rejected', (await call('PATCH', `/leads/${leadId}`, { leadToken: lt, body: { step: 'REQUIREMENT', data: { requirementType: 'NOPE' } } })).status === 422);
  for (const [step, data] of [['REQUIREMENT', { requirementType: 'FULL_HOME' }], ['BUDGET', { budgetRange: '15_25L' }], ['POSSESSION', { possession: 'HAVE_POSSESSION' }]]) {
    const r = await call('PATCH', `/leads/${leadId}`, { leadToken: lt, body: { step, data } });
    check(`step ${step} saved`, r.status === 200, r.body);
  }
  const early = await call('PATCH', `/leads/${leadId}`, { leadToken: lt, body: { step: 'LOCATION', data: { formattedAddress: 'Somewhere 123', pincode: '201301' } } });
  check('post-OTP step blocked before verification', early.status === 403, early.body);
  const t0 = Date.now();
  const so = await call('POST', '/auth/send-otp', { body: { mobile: mA, channel: 'SMS', leadId, leadToken: lt } });
  check('OTP sent (masked number)', so.status === 200 && so.data.maskedMobile.includes('XXXX'), so.body);
  if (so.data?.testMode) console.log(`    (OTP test mode: fixed code ${so.data.testCode})`);
  check('resend within cooldown → 429', (await call('POST', '/auth/send-otp', { body: { mobile: mA, channel: 'SMS', leadId, leadToken: lt } })).status === 429);
  const code = await otpFor(mA, t0);
  const bad = await call('POST', '/auth/verify-otp', { body: { mobile: mA, code: code === '0000' ? '1111' : '0000', leadId, leadToken: lt } });
  check('wrong OTP rejected with attempts left', bad.status === 400 && bad.body.details?.remainingAttempts >= 1, bad.body);
  const vf = await call('POST', '/auth/verify-otp', { body: { mobile: mA, code, leadId, leadToken: lt } });
  check('OTP verified → session + lead linked', vf.status === 200 && vf.data.accessToken && vf.data.lead.verified, vf.body);
  let tokA = vf.data.accessToken; let cookieA = cookieFrom(vf.setCookie);
  check('refresh cookie set (httpOnly)', /HttpOnly/i.test(vf.setCookie || ''), vf.setCookie);
  check('OTP cannot be reused', (await call('POST', '/auth/verify-otp', { body: { mobile: mA, code } })).status >= 400);

  const svcIds = sv.data.services.slice(0, 3).map((s) => s.id);
  for (const [step, data] of [
    ['LOCATION', { formattedAddress: 'Tower B, Sector 150, Noida', pincode: '201310', city: 'Noida', state: 'Uttar Pradesh' }],
    ['PROPERTY_TYPE', { propertyType: 'APARTMENT' }], ['BHK', { bhk: '3BHK' }], ['PROJECT_TYPE', { projectType: 'NEW_HOME' }], ['SERVICES', { services: svcIds }],
  ]) {
    const r = await call('PATCH', `/leads/${leadId}`, { token: tokA, body: { step, data } });
    check(`step ${step} saved`, r.status === 200, r.body);
  }
  const badPin = await call('PATCH', `/leads/${leadId}`, { token: tokA, body: { step: 'LOCATION', data: { formattedAddress: 'Tower B, Sector 150', pincode: '12' } } });
  check('bad pincode rejected', badPin.status === 422, badPin.body);
  const up = await upload(tokA, 'FLOOR_PLAN', pdfBuffer(), 'plan.pdf', 'application/pdf');
  check('floor plan uploaded', up.status === 201 && up.data.media.id, up.body);
  const exe = await upload(tokA, 'FLOOR_PLAN', Buffer.from('MZ\x90\x00 not a pdf'), 'plan.pdf', 'application/pdf');
  check('fake PDF (wrong magic bytes) rejected', exe.status === 415, exe.body);
  const mism = await upload(tokA, 'FLOOR_PLAN', pngBuffer(), 'plan.pdf', 'application/pdf');
  check('extension/content mismatch rejected', mism.status === 415, mism.body);
  const incomplete = await call('POST', '/bookings', { token: tokA, body: { leadId } });
  check('booking blocked until all steps done', incomplete.status === 422 && incomplete.body.details?.nextStep === 'FLOOR_PLAN', incomplete.body);
  const fp = await call('PATCH', `/leads/${leadId}`, { token: tokA, body: { step: 'FLOOR_PLAN', data: { hasFloorPlan: true, mediaIds: [up.data.media.id] } } });
  check('floor plan step saved, next = REVIEW', fp.status === 200 && fp.data.lead.nextStep === 'REVIEW', fp.body);
  const bk = await call('POST', '/bookings', { token: tokA, body: { leadId } });
  check('booking created', bk.status === 201 && /^BK-\d{4}-\d{6}$/.test(bk.data.booking.bookingNumber), bk.body);
  const bookingId = bk.data.booking.id;
  const bud = bk.data.budget;
  check('direct booking gets an indicative budget (auto from BHK + services)', bud && bud.source === 'AUTO_BOOKING' && bud.available && bud.min > 0 && bud.max >= bud.min && bud.packages.length >= 4, bud);
  check('budget carries the "not final" note', /not the final/i.test(bud?.note || ''), bud?.note);
  check('duplicate submit is idempotent', (await call('POST', '/bookings', { token: tokA, body: { leadId } })).data?.booking?.id === bookingId);
  check('closed lead cannot be edited', (await call('PATCH', `/leads/${leadId}`, { token: tokA, body: { step: 'BUDGET', data: { budgetRange: '5_10L' } } })).status === 409);
  const cbd = await call('GET', `/bookings/${bookingId}`, { token: tokA });
  check('customer booking view includes budget', cbd.data?.budget?.packageName === bud?.packageName, cbd.data?.budget);
  const sum = await call('GET', '/account/summary', { token: tokA });
  check('dashboard summary includes budget', sum.data?.budget?.min === bud?.min, sum.data?.budget);
  check('dashboard summary shows booking', sum.data?.activeBooking?.id === bookingId, sum.body);
  const urlRes = await call('GET', `/uploads/${up.data.media.id}/url`, { token: tokA });
  check('signed file URL issued', urlRes.status === 200 && urlRes.data.url, urlRes.body);
  if (urlRes.data?.url) {
    const f = await fetch(urlRes.data.url);
    check('signed file downloads', f.status === 200 && (await f.text()).startsWith('%PDF'));
    check('tampered signature refused', (await fetch(urlRes.data.url.replace(/sig=./, 'sig=0'))).status === 403);
  }

  section('Session: refresh rotation & reuse detection');
  const r1 = await call('POST', '/auth/refresh', { cookie: cookieA });
  check('refresh issues new access token', r1.status === 200 && r1.data.accessToken, r1.body);
  const reuse = await call('POST', '/auth/refresh', { cookie: cookieA });
  check('old refresh token reuse → 401', reuse.status === 401, reuse.body);
  check('family revoked after reuse', (await call('POST', '/auth/refresh', { cookie: cookieFrom(r1.setCookie) })).status === 401);
  const relog = await login(mA); tokA = relog.data.accessToken; cookieA = relog.cookie;
  check('re-login works and returns user', relog.status === 200, relog.body);

  section('Logged-in customer: no second OTP');
  const stale = await call('POST', '/leads', { token: 'expired.or.invalid.token', body: { flow: 'ESTIMATE', name: 'X', mobile: mA } });
  check('stale token on lead create → 401 (client refreshes, not treated as anonymous)', stale.status === 401, stale.body);
  const ln = await call('POST', '/leads', { token: tokA, body: { flow: 'ESTIMATE', name: 'Rahul Test', mobile: '9999999999', estimateDraft: { propertyCategory: 'RESIDENTIAL', bhk: '2BHK' } } });
  check('logged-in estimate lead is verified, uses account mobile, no lead token', ln.status === 201 && ln.data.lead.verified && ln.data.lead.mobile === mA && !ln.data.leadToken, ln.body);
  const le2 = await call('POST', '/estimates', { token: tokA, body: { leadId: ln.data.lead.id, propertyCategory: 'RESIDENTIAL', bhk: '2BHK', kitchens: 1, bedrooms: 2, washrooms: 2, addons: [] } });
  check('estimate computed straight away (no OTP step)', le2.status === 201, le2.body);

  section('Estimate flow (customer B) → booking conversion');
  const mB = rnd();
  const le = await call('POST', '/leads', { body: { flow: 'ESTIMATE', name: 'Neha Test', mobile: mB, estimateDraft: { propertyCategory: 'RESIDENTIAL', bhk: '3BHK' } } });
  check('estimate lead created', le.status === 201, le.body);
  const vB = await login(mB, { leadId: le.data.lead.id, leadToken: le.data.leadToken });
  const tokB = vB.data.accessToken;
  const est = await call('POST', '/estimates', { token: tokB, body: { leadId: le.data.lead.id, propertyCategory: 'RESIDENTIAL', bhk: '3BHK', kitchens: 1, bedrooms: 4, washrooms: 3, addons: ['sofa_set', 'premium_lighting', 'bogus'] } });
  check('estimate computed for all packages', est.status === 201 && est.data.estimate.results.length >= 4, est.body);
  const pe = est.data?.estimate?.results?.find((r) => r.packageSlug === 'premium-elegance');
  check('Premium Elegance 3BHK = ₹11.2L–₹23.2L (base + bedroom + sofa + lighting)', pe && pe.finalMin === 1120000 && pe.finalMax === 2320000, pe);
  check('unknown add-on ignored', !est.data.estimate.inputs.addons.includes('bogus'));
  const other = est.data.estimate.results.find((r) => r.package !== est.data.estimate.selectedPackage);
  const sel = await call('PATCH', `/estimates/${est.data.estimate.id}/package`, { token: tokB, body: { packageId: other.package } });
  check('switch package', sel.status === 200 && sel.data.estimate.selectedPackage === other.package, sel.body);
  const one = await call('POST', '/estimates', { token: tokB, body: { propertyCategory: 'RESIDENTIAL', bhk: '1BHK', kitchens: 1, bedrooms: 1, washrooms: 1, addons: [] } });
  check('1BHK → price on request (no invented prices)', one.data?.estimate?.results?.every((r) => r.reason === 'PRICE_ON_REQUEST'), one.body);
  const conv = await call('GET', `/leads/${le.data.lead.id}`, { token: tokB });
  check('estimate lead continues at REQUIREMENT with BHK prefilled', conv.data?.lead?.nextStep === 'REQUIREMENT' && conv.data.lead.property.bhk === '3BHK', conv.body?.data?.lead?.nextStep);
  check('customer blocked from other customer lead', (await call('GET', `/leads/${leadId}`, { token: tokB })).status === 403);

  section('Staff login & permissions');
  check('wrong staff password → 401', (await call('POST', '/auth/staff/login', { body: { email: ADMIN.email, password: 'wrong-password-1' } })).status === 401);
  const al = await call('POST', '/auth/staff/login', { body: ADMIN });
  check('super admin login', al.status === 200 && al.data.user.permissions.includes('*'), al.body);
  const tokAdm = al.data.accessToken;
  check('customer denied admin API', (await call('GET', '/admin/leads', { token: tokA })).status === 403);
  check('customer cannot OTP-login as admin mobile', true);
  const dash = await call('GET', '/admin/dashboard?range=30d', { token: tokAdm });
  check('dashboard metrics', dash.status === 200 && dash.data.totals.totalLeads >= 2 && Array.isArray(dash.data.leadsByService), dash.body);
  check('dashboard quotation metrics block', dash.data?.quotations && typeof dash.data.quotations.total === 'number', dash.data?.quotations);
  const ll = await call('GET', '/admin/leads?status=BOOKED&q=Rahul', { token: tokAdm });
  check('lead filters + search', ll.status === 200 && ll.data.items.some((l) => l.id === leadId), ll.body);
  const ab = await call('GET', '/admin/leads?verified=true&limit=5&sort=-lastActivityAt', { token: tokAdm });
  check('lead list pagination meta', ab.body.meta && ab.body.meta.limit === 5, ab.body.meta);
  const csv = await call('GET', '/admin/leads?format=csv', { token: tokAdm, raw: true });
  check('CSV export', csv.status === 200 && /text\/csv/.test(csv.res.headers.get('content-type')));
  const abd = await call('GET', `/admin/bookings/${bookingId}`, { token: tokAdm });
  check('admin booking view includes budget + package', abd.data?.budget?.available && abd.data.booking.package?.name, abd.data?.budget);
  const ld = await call('GET', `/admin/leads/${leadId}`, { token: tokAdm });
  check('lead detail with activity', ld.status === 200 && ld.data.activity.length > 0, ld.body);
  const nt = await call('POST', `/admin/leads/${leadId}/notes`, { token: tokAdm, body: { text: 'Customer prefers weekend visits', visibility: 'ADMIN_ONLY' } });
  check('internal note added', nt.status === 201, nt.body);

  section('Contractor account & assignment');
  const cm = rnd(); const cEmail = `contractor.${cm}@example.com`;
  const cc = await call('POST', '/admin/contractors', { token: tokAdm, body: { name: 'Ravi Contractor', mobile: cm, email: cEmail, password: 'Contractor2026', city: 'Noida', serviceAreas: ['Noida'], specializations: ['Kitchens'] } });
  check('contractor created', cc.status === 201 && /^CT-/.test(cc.data.contractor.contractorCode), cc.body);
  const weakPerm = await call('POST', '/admin/contractors', { token: tokAdm, body: { name: 'Bad Perm', mobile: rnd(), customPermissions: true, permissions: ['settings.manage'] } });
  check('dangerous permission refused for contractors', weakPerm.status === 400, weakPerm.body);
  const as = await call('POST', `/admin/bookings/${bookingId}/assign-contractor`, { token: tokAdm, body: { contractorId: cc.data.contractor.id, remarks: 'Nearest expert' } });
  check('contractor assigned', as.status === 200, as.body);
  check('assign same contractor again → 409', (await call('POST', `/admin/bookings/${bookingId}/assign-contractor`, { token: tokAdm, body: { contractorId: cc.data.contractor.id } })).status === 409);
  const cl = await call('POST', '/auth/staff/login', { body: { email: cEmail, password: 'Contractor2026' } });
  check('contractor login', cl.status === 200 && cl.data.user.role === 'CONTRACTOR', cl.body);
  const tokC = cl.data.accessToken;
  const cb = await call('GET', '/admin/bookings', { token: tokC });
  check('contractor sees only assigned bookings', cb.status === 200 && cb.data.items.length === 1 && cb.data.items[0].id === bookingId, cb.data?.items?.length);
  check('contractor denied customers', (await call('GET', '/admin/customers', { token: tokC })).status === 403);
  check('contractor denied settings', (await call('GET', '/admin/settings', { token: tokC })).status === 403);
  const cnotes = await call('GET', `/admin/leads/${leadId}/notes`, { token: tokC });
  check('contractor cannot see admin-only notes', cnotes.status === 200 && cnotes.data.items.every((n) => n.visibility === 'STAFF'), cnotes.body);

  section('Site visit & measurements');
  const noQuote = await call('POST', '/quotations', { token: tokC, body: { bookingId } });
  check('quotation blocked before site visit', noQuote.status === 422, noQuote.body);
  const svis = await call('POST', '/site-visits', { token: tokC, body: { bookingId, scheduledAt: new Date(Date.now() + 30 * 60000).toISOString(), notes: 'Carry laser meter' } });
  check('site visit scheduled', svis.status === 201, svis.body);
  check('second open visit refused', (await call('POST', '/site-visits', { token: tokC, body: { bookingId, scheduledAt: new Date(Date.now() + 86400000).toISOString() } })).status === 409);
  const img = await upload(tokC, 'SITE_IMAGE', pngBuffer(), 'wall.png', 'image/png');
  check('contractor uploads site photo', img.status === 201, img.body);
  check('customer cannot upload site photo', (await upload(tokA, 'SITE_IMAGE', pngBuffer(), 'x.png', 'image/png')).status === 403);
  const done = await call('POST', `/site-visits/${svis.data.siteVisit.id}/complete`, { token: tokC, body: { siteCondition: 'BARE_SHELL', notes: 'Walls plastered', images: [img.data.media.id], videos: [], floorPlans: [], documents: [] } });
  check('site visit completed', done.status === 200 && done.data.siteVisit.status === 'COMPLETED', done.body);
  const ms = await call('PUT', `/measurements/booking/${bookingId}`, { token: tokC, body: { rooms: [{ name: 'Kitchen', type: 'KITCHEN', rows: [{ label: 'Wall A', width: 10, height: 8, unit: 'FT', quantity: 1 }, { label: 'Counter', length: 12, unit: 'RFT', quantity: 1 }] }] } });
  check('measurements saved, area derived', ms.status === 200 && ms.data.measurement.rooms[0].rows[0].area === 80, ms.body?.data?.measurement?.rooms?.[0]?.rows?.[0]);
  const fin = await call('POST', `/measurements/booking/${bookingId}/finalize`, { token: tokC });
  check('measurements finalised', fin.status === 200 && fin.data.measurement.status === 'FINAL', fin.body);
  check('final sheet is locked', (await call('PUT', `/measurements/booking/${bookingId}`, { token: tokC, body: { rooms: [] } })).status === 409);

  section('Quotation: build → review → approve → send');
  const qc = await call('POST', '/quotations', { token: tokC, body: { bookingId, sections: [{ title: 'Modular Kitchen', items: [{ name: 'Base units', quantity: 12, unit: 'RFT', materialPrice: 4500, labourPrice: 1500 }, { name: 'Chimney fitting', quantity: 1, unitPrice: 2500, taxPercent: 0 }] }] } });
  check('contractor creates quotation V1', qc.status === 201 && /-V1$/.test(qc.data.quotation.displayNumber), qc.body);
  const q1 = qc.data.quotation; const qId = q1.id;
  check('server totals: subtotal 74,500', q1.totals.subtotal === 74500, q1.totals);
  check('contractor cannot add discounts', (await call('PATCH', `/quotations/${qId}`, { token: tokC, body: { discounts: [{ type: 'ADMIN', mode: 'FLAT', value: 1000 }] } })).status === 403);
  const q1s = q1.sections;
  const addItem = await call('PATCH', `/quotations/${qId}`, { token: tokC, body: { sections: [{ _id: q1s[0]._id, title: 'Modular Kitchen', items: [...q1s[0].items.map((i) => ({ _id: i._id, name: i.name, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, materialPrice: i.materialPrice, labourPrice: i.labourPrice, taxPercent: i.taxPercent })), { name: 'Wall units', quantity: 10, unit: 'RFT', unitPrice: 4200, totals: 999999 }] }] } });
  check('client-sent totals ignored', addItem.status === 200 && addItem.data.quotation.totals.subtotal === 116500, addItem.data?.quotation?.totals);
  const sub = await call('POST', `/quotations/${qId}/submit`, { token: tokC, body: {} });
  check('submitted for admin review', sub.status === 200 && sub.data.quotation.status === 'UNDER_ADMIN_REVIEW', sub.body);
  check('contractor locked out after submit', (await call('PATCH', `/quotations/${qId}`, { token: tokC, body: { contractorNotes: 'x' } })).status === 409);
  check('customer cannot see unsent quotation', (await call('GET', `/quotations/${qId}`, { token: tokA })).status === 404);
  const cur = (await call('GET', `/quotations/${qId}`, { token: tokAdm })).data.quotation;
  const edited = { sections: cur.sections.map((s) => ({ _id: s._id, title: s.title, items: s.items.map((i) => ({ _id: i._id, name: i.name, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, materialPrice: i.materialPrice, labourPrice: i.name === 'Base units' ? 1200 : i.labourPrice, taxPercent: i.taxPercent })) })), discounts: [{ type: 'PROMOTIONAL', mode: 'PERCENT', value: 5, label: 'Festive 5%' }] };
  const noReason = await call('PATCH', `/quotations/${qId}`, { token: tokAdm, body: edited });
  check('admin price edit without reason → 422', noReason.status === 422 && noReason.body.errors?.[0]?.field === 'reason', noReason.body);
  const withReason = await call('PATCH', `/quotations/${qId}`, { token: tokAdm, body: { ...edited, reason: 'Negotiated labour rate' } });
  check('admin price edit recorded item-by-item', withReason.status === 200 && withReason.data.quotation.priceChanges.some((c) => c.field === 'labourPrice' && c.before === 1500 && c.after === 1200), withReason.data?.quotation?.priceChanges);
  const t = withReason.data.quotation.totals;
  check('totals after edit: subtotal 112,900, 5% discount 5,645', t.subtotal === 112900 && t.discountTotal === 5645, t);
  check('taxable/charges consistent', Math.abs(t.taxableAmount - (t.subtotal - t.discountTotal + t.additionalCharges)) < 0.01, t);
  const badSched = await call('PATCH', `/quotations/${qId}`, { token: tokAdm, body: { paymentSchedule: [{ label: 'Advance', percent: 50 }] } });
  check('payment schedule must total 100%', badSched.status === 422, badSched.body);
  await call('PATCH', `/quotations/${qId}`, { token: tokAdm, body: { paymentSchedule: [{ label: 'Advance', percent: 10 }, { label: 'Handover', percent: 90 }] } });
  const ap = await call('POST', `/quotations/${qId}/approve`, { token: tokAdm, body: { send: true } });
  check('approved and sent (PDF generated & stored)', ap.status === 200 && ap.data.quotation.status === 'SENT_TO_CUSTOMER' && ap.data.quotation.hasPdf, ap.body);

  section('Customer: view, PDF, revision, accept');
  const cq = await call('GET', `/quotations/${qId}`, { token: tokA });
  check('customer sees quotation (no cost split / internal notes)', cq.status === 200 && cq.data.quotation.sections[0].items[0].materialPrice === undefined && cq.data.quotation.priceChanges === undefined, cq.body?.data?.quotation?.sections?.[0]?.items?.[0]);
  const pdf = await call('GET', `/quotations/${qId}/pdf`, { token: tokA });
  if (check('PDF link issued', pdf.status === 200, pdf.body)) {
    const f = await fetch(pdf.data.url); const b = Buffer.from(await f.arrayBuffer());
    check('PDF downloads (valid PDF, > 5 KB)', f.status === 200 && b.slice(0, 4).toString() === '%PDF' && b.length > 5000, b.length);
  }
  check('other customer cannot see it', (await call('GET', `/quotations/${qId}`, { token: tokB })).status === 404);
  const rr = await call('POST', `/quotations/${qId}/revision-request`, { token: tokA, body: { note: 'Please use acrylic shutters' } });
  check('revision requested', rr.status === 200 && rr.data.quotation.status === 'REVISION_REQUESTED', rr.body);
  check('cannot accept after requesting revision', (await call('POST', `/quotations/${qId}/accept`, { token: tokA, body: { acceptTerms: true } })).status === 409);
  const rv = await call('POST', `/quotations/${qId}/revise`, { token: tokAdm, body: { note: 'Acrylic shutters' } });
  check('revision V2 created, V1 kept', rv.status === 201 && /-V2$/.test(rv.data.quotation.displayNumber), rv.body);
  const q2 = rv.data.quotation.id;
  const v1 = await call('GET', `/quotations/${qId}`, { token: tokAdm });
  check('V1 unchanged and no longer latest', v1.data.quotation.isLatest === false && v1.data.quotation.status === 'REVISION_REQUESTED', v1.data?.quotation?.status);
  check('V2 approve & send', (await call('POST', `/quotations/${q2}/approve`, { token: tokAdm, body: { send: true } })).data?.quotation?.status === 'SENT_TO_CUSTOMER');
  check('accept requires terms', (await call('POST', `/quotations/${q2}/accept`, { token: tokA, body: {} })).status === 422);
  const acc = await call('POST', `/quotations/${q2}/accept`, { token: tokA, body: { acceptTerms: true, note: 'Looks good' } });
  check('customer accepts → project created', acc.status === 200 && acc.data.projectId, acc.body);
  const mine = await call('GET', '/quotations/mine', { token: tokA });
  check('customer keeps both versions', mine.data?.items?.length === 2, mine.data?.items?.map((x) => x.displayNumber));

  section('Project execution');
  const pid = acc.data.projectId;
  check('start project', (await call('POST', `/execution/${pid}/start`, { token: tokAdm })).status === 200);
  check('move to Design approval', (await call('POST', `/execution/${pid}/stage`, { token: tokAdm, body: { stage: 'DESIGN_APPROVAL', note: 'Layouts shared' } })).status === 200);
  check('post update with photo', (await call('POST', `/execution/${pid}/updates`, { token: tokAdm, body: { text: 'Design meeting done', media: [img.data.media.id], visibleToCustomer: true } })).status === 200);
  const pj = await call('GET', `/account/projects/${pid}`, { token: tokA });
  check('customer sees project stage & update', pj.data?.project?.stage === 'DESIGN_APPROVAL' && pj.data.project.updates.length === 1, pj.body);
  const bkd = await call('GET', `/bookings/${bookingId}`, { token: tokA });
  check('booking timeline customer-safe (no internal events)', bkd.data.booking.timeline.every((x) => !['QUOTATION_DRAFTED', 'QUOTATION_UNDER_REVIEW'].includes(x.event)) && bkd.data.booking.status === 'PROJECT_IN_PROGRESS', bkd.data?.booking?.status);

  section('Notifications, documents, profile');
  const nn = await call('GET', '/notifications', { token: tokA });
  const events = nn.data?.items?.map((x) => x.event) || [];
  check('customer notified (booking, expert, visit, quotation)', ['BOOKING_CREATED', 'CONTRACTOR_ASSIGNED', 'SITE_VISIT_SCHEDULED', 'QUOTATION_READY'].every((e) => events.includes(e)), events);
  check('mark all read', (await call('POST', '/notifications/read-all', { token: tokA })).status === 200);
  const docs = await call('GET', '/account/documents', { token: tokA });
  check('documents: floor plan + 2 quotation PDFs', docs.data?.floorPlans?.length === 1 && docs.data.quotations.length === 2, docs.data);
  const prof = await call('PATCH', '/account/profile', { token: tokA, body: { name: 'Rahul Sharma', email: `rahul.${mA}@example.com`, marketingConsent: true } });
  check('profile updated', prof.status === 200 && prof.data.profile.name === 'Rahul Sharma', prof.body);

  section('Admin catalogue, settings, audit');
  const np = await call('POST', '/admin/packages', { token: tokAdm, body: { name: 'E2E Test Package', pricing: [{ bhk: '2BHK', min: 100000, max: 200000 }] } });
  check('package created (slug generated)', np.status === 201 && np.data.item.slug === 'e2e-test-package', np.body);
  check('min > max rejected', (await call('PATCH', `/admin/packages/${np.data.item.id}`, { token: tokAdm, body: { pricing: [{ bhk: '2BHK', min: 5, max: 1 }] } })).status === 422);
  check('package deleted', (await call('DELETE', `/admin/packages/${np.data.item.id}`, { token: tokAdm })).data?.deleted === true);
  const st = await call('GET', '/admin/settings/storage', { token: tokAdm });
  check('storage settings readable', st.status === 200 && st.data.value.active, st.body);
  const pr = await call('PUT', '/admin/settings/pricing.config', { token: tokAdm, body: { value: { floorPlanAssistanceCharge: 2499, defaultGstPercent: 18, currency: 'INR' }, reason: 'e2e' } });
  check('pricing settings saved', pr.status === 200, pr.body);
  check('public funnel reflects new charge', (await call('GET', '/catalog/funnel-options')).data.floorPlanAssistanceCharge === 2499);
  await call('PUT', '/admin/settings/pricing.config', { token: tokAdm, body: { value: { floorPlanAssistanceCharge: 1999, defaultGstPercent: 18, currency: 'INR' } } });
  const au = await call('GET', '/admin/audit-logs?entityType=Quotation', { token: tokAdm });
  check('audit trail has price change', au.data?.items?.some((a) => a.action === 'QUOTATION_PRICE_CHANGED' && a.reason === 'Negotiated labour rate'), au.data?.items?.map((a) => a.action));
  const exp = await call('GET', '/admin/quotations?allVersions=true', { token: tokAdm });
  check('quotation list shows both versions', exp.data?.items?.filter((x) => x.bookingId === bookingId).length === 2, exp.data?.items?.length);
  const d2 = await call('GET', '/admin/dashboard?range=today', { token: tokAdm });
  check('dashboard after flow: accepted quotation counted', d2.data?.quotations?.accepted >= 1, d2.data?.quotations);

  section('Logout');
  check('logout', (await call('POST', '/auth/logout', { cookie: relog.cookie })).status === 200);
  check('refresh after logout → 401', (await call('POST', '/auth/refresh', { cookie: relog.cookie })).status === 401);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log(`Failed:\n - ${failures.join('\n - ')}`);
  process.exit(fail ? 1 : 0);
})().catch((err) => { console.error('\nE2E crashed:', err); process.exit(1); });
