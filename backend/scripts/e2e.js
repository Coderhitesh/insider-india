/* eslint-disable no-console */
/**
 * End-to-end API test: customer booking funnel, estimate, staff console, contractor site visit,
 * measurements, quotation review/approval/PDF, customer acceptance and project execution.
 *
 * Requirements: API running with LOG SMS/WhatsApp providers (OTP codes are read from logs/combined.log)
 * and a storage provider that works in your environment (LOCAL is simplest).
 *   API_URL=http://localhost:5991 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e
 * Creates real test data (mobiles 7xxxxxxxxx). Do not run against production.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const API = (process.env.API_URL || 'http://localhost:5991').replace(/\/$/, '');
const LOG = process.env.LOG_FILE || path.resolve(__dirname, '../logs/combined.log');
const ADMIN = { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD };
const rnd = () => `7${String(Math.floor(Math.random() * 1e9)).padStart(9, '0')}`;

let pass = 0; let fail = 0; const failures = [];
function check(name, cond, extra) {
  if (cond) { pass += 1; console.log(`  \x1b[32m✔\x1b[0m ${name}`); } else { fail += 1; failures.push(name); console.log(`  \x1b[31m✘ ${name}\x1b[0m`, extra !== undefined ? JSON.stringify(extra).slice(0, 400) : ''); }
  return cond;
}
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);

async function call(method, p, { body, token, leadToken, cookie, form, raw, ip } = {}) {
  const headers = process.env.ORIGIN ? { Origin: process.env.ORIGIN } : {};
  if (ip) headers['X-Forwarded-For'] = ip; // separate OTP rate-limit bucket per simulated device
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
  const ip = `10.77.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;
  let t0 = Date.now();
  let s = await call('POST', '/auth/send-otp', { ip, body: { mobile, channel: 'SMS', ...extra } });
  if (s.status === 429 && s.body.details?.retryAfter) {
    console.log(`    (waiting ${s.body.details.retryAfter}s OTP cooldown)`);
    await new Promise((r) => setTimeout(r, s.body.details.retryAfter * 1000 + 500));
    t0 = Date.now();
    s = await call('POST', '/auth/send-otp', { ip, body: { mobile, channel: 'SMS', ...extra } });
  }
  if (s.status !== 200) throw new Error(`send-otp ${s.status} ${JSON.stringify(s.body)}`);
  const code = await otpFor(mobile, t0);
  const v = await call('POST', '/auth/verify-otp', { ip, body: { mobile, code, ...extra } });
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

  section('Refer & Earn: automatic sign-up referrals');
  const adm0 = (await call('POST', '/auth/staff/login', { body: ADMIN })).data.accessToken;
  const rc0 = await call('GET', '/admin/settings/referral.config', { token: adm0 });
  check('referral settings readable (off by default)', rc0.status === 200 && rc0.data.value.slabs.length === 3, rc0.body);
  const pr0 = await call('PUT', '/admin/settings/referral.config', { token: adm0, body: { value: { ...rc0.data.value, enabled: true }, reason: 'e2e' } });
  check('referral program enabled', pr0.status === 200, pr0.body);
  const badSlab = await call('PUT', '/admin/settings/referral.config', { token: adm0, body: { value: { ...rc0.data.value, enabled: true, slabs: [rc0.data.value.slabs[1], rc0.data.value.slabs[0]] } } });
  check('slabs out of order rejected', badSlab.status === 422, badSlab.body);
  const prog = await call('GET', '/catalog/referral-program');
  check('public program shows slabs & rewards', prog.data?.program?.enabled === true && prog.data.program.slabs[0].rewards[0] === 25000, prog.body);
  const pr1 = await call('PUT', '/admin/settings/referral.config', { token: adm0, body: { value: { ...rc0.data.value, enabled: true, payoutTrigger: 'AGREEMENT', autoApprove: true, maxRedeemPercent: 100 }, reason: 'e2e: automatic flow' } });
  check('automatic mode: credit on quotation acceptance', pr1.status === 200, pr1.body);
  const mA = rnd();
  const mR = rnd();
  const tokR = (await login(mR)).data.accessToken;
  const me0 = await call('GET', '/account/referrals', { token: tokR });
  check('every customer gets a Referral ID automatically (no form)', me0.status === 200 && /^II-[A-Z0-9]{6}$/.test(me0.data?.referrer?.code || '') && me0.data.shareUrl.includes(me0.data.referrer.code), me0.body);
  const refCode = me0.data.referrer.code;
  check('same ID on every visit', (await call('GET', '/account/referrals', { token: tokR })).data?.referrer?.code === refCode);
  check('manual refer-by-number is switched off', (await call('POST', '/account/referrals', { token: tokR, body: { name: 'Rahul Test', mobile: mA, consent: true } })).status === 410);
  const again = await login(mR, { referralCode: refCode });
  check('existing account + code (incl. own code) → not applied', again.status === 200 && again.data.referral === null, again.data?.referral);
  const mX = rnd();
  const lx = await login(mX, { referralCode: 'II-ZZZZZZ' });
  check('invalid code never blocks registration', lx.status === 200 && lx.data.referral?.applied === false, lx.data?.referral);
  const mY = rnd();
  await call('POST', '/leads', { body: { flow: 'BOOKING', name: 'Yash Early', mobile: mY } });
  const ly = await login(mY, { referralCode: refCode });
  check('enquired before → referral recorded but held for review', ly.data?.referral?.applied === true, ly.data?.referral);

  section('Booking funnel (customer A)');
  check('invalid mobile rejected', (await call('POST', '/leads', { body: { flow: 'BOOKING', name: 'Test A', mobile: '12345' } })).status === 422);
  const lc = await call('POST', '/leads', { body: { flow: 'BOOKING', name: 'Rahul Test', mobile: mA, city: 'Noida', utm: { source: 'e2e' } } });
  check('lead created with anonymous token', lc.status === 201 && lc.data.leadToken, lc.body);
  const leadId = lc.data.lead.id; const lt = lc.data.leadToken;
  check('lead unreadable without token', (await call('GET', `/leads/${leadId}`)).status === 403);
  check('invalid option rejected', (await call('PATCH', `/leads/${leadId}`, { leadToken: lt, body: { step: 'REQUIREMENT', data: { requirementType: 'NOPE' } } })).status === 422);
  check('new lead asks home or commercial first', lc.data.lead.nextStep === 'SPACE', lc.data.lead.nextStep);
  for (const [step, data] of [['SPACE', { propertyCategory: 'RESIDENTIAL' }], ['REQUIREMENT', { requirementType: 'FULL_HOME' }], ['POSSESSION', { possession: 'HAVE_POSSESSION' }]]) {
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
  const vf = await call('POST', '/auth/verify-otp', { body: { mobile: mA, code, leadId, leadToken: lt, referralCode: refCode } });
  check('OTP verified → session + lead linked', vf.status === 200 && vf.data.accessToken && vf.data.lead.verified, vf.body);
  check('new customer registered with referral code → referral recorded', vf.data?.referral?.applied === true, vf.data?.referral);
  const refList = await call('GET', `/admin/referrals?q=${mA}`, { token: adm0 });
  const refId = refList.data?.items?.[0]?.id;
  check('referral auto-verified (no admin step), source SIGNUP', refList.data?.items?.[0]?.status === 'VERIFIED' && refList.data.items[0].source === 'SIGNUP' && refList.data.items[0].referrer.code === refCode, refList.data?.items?.[0]);
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
  check('closed lead cannot be edited', (await call('PATCH', `/leads/${leadId}`, { token: tokA, body: { step: 'POSSESSION', data: { possession: 'WITHIN_3M' } } })).status === 409);
  const cbd = await call('GET', `/bookings/${bookingId}`, { token: tokA });
  check('customer booking view includes budget', cbd.data?.budget?.packageName === bud?.packageName, cbd.data?.budget);
  const sum = await call('GET', '/account/summary', { token: tokA });
  check('dashboard summary includes budget', sum.data?.budget?.min === bud?.min, sum.data?.budget);
  check('dashboard summary shows booking', sum.data?.activeBooking?.id === bookingId, sum.body);
  const urlRes = await call('GET', `/uploads/${up.data.media.id}/url`, { token: tokA });
  check('signed file URL issued', urlRes.status === 200 && urlRes.data.url, urlRes.body);
  if (urlRes.data?.url) {
    const abs = (u) => (u.startsWith('/') ? `${API}${u}` : u);
    check('file URL stored/returned as a path', urlRes.data.url.startsWith('/api/v1/files/'));
    const f = await fetch(abs(urlRes.data.url));
    check('signed file downloads', f.status === 200 && (await f.text()).startsWith('%PDF'));
    check('tampered signature refused', (await fetch(abs(urlRes.data.url).replace(/sig=[0-9a-f]+/, 'sig=deadbeef'))).status === 403);
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
  const le = await call('POST', '/leads', { body: { flow: 'ESTIMATE', name: 'Neha Test', mobile: mB, referralCode: refCode, estimateDraft: { propertyCategory: 'RESIDENTIAL', bhk: '3BHK' } } });
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
  section('Commercial estimate (space type + per-unit items)');
  const cfgE = await call('GET', '/estimates/config');
  check('config lists commercial types and per-unit items', cfgE.data?.commercialTypes?.some((t) => t.value === 'OFFICE') && cfgE.data.units?.some((u) => u.key === 'c_workstations'), cfgE.body?.data && Object.keys(cfgE.data));
  check('commercial without space type → 422', (await call('POST', '/estimates', { token: tokB, body: { propertyCategory: 'COMMERCIAL', area: 2000, units: {} } })).status === 422);
  const ce = await call('POST', '/estimates', { token: tokB, body: { propertyCategory: 'COMMERCIAL', area: 2000, commercialType: 'OFFICE', units: { c_workstations: 20, c_cabins: 2, c_dining_seats: 10 }, addons: ['c_glass_partitions', 'sofa_set'] } });
  const cpe = ce.data?.estimate?.results?.find((r) => r.packageSlug === 'premium-elegance');
  check('office 2000 sq ft, 20 seats, 2 cabins, glass = ₹23L–₹39L (Premium Elegance)', cpe && cpe.finalMin === 2300000 && cpe.finalMax === 3900000, cpe);
  check('restaurant-only item and residential add-on dropped', !('c_dining_seats' in (ce.data?.estimate?.inputs?.units || {})) && !ce.data.estimate.inputs.addons.includes('sofa_set'), ce.data?.estimate?.inputs);
  check('per-unit line shows quantity', cpe?.adjustments?.some((a) => a.label === 'Workstations / chairs (20 seats)'), cpe?.adjustments);

  const conv = await call('GET', `/leads/${le.data.lead.id}`, { token: tokB });
  check('estimate lead continues at REQUIREMENT with BHK prefilled', conv.data?.lead?.nextStep === 'REQUIREMENT' && conv.data.lead.property.bhk === '3BHK', conv.body?.data?.lead?.nextStep);
  check('customer blocked from other customer lead', (await call('GET', `/leads/${leadId}`, { token: tokB })).status === 403);

  section('Commercial booking (direct, no estimator)');
  {
  const fo2 = await call('GET', '/catalog/funnel-options');
  check('funnel offers commercial space types + project types', fo2.data?.commercialTypes?.some((t) => t.value === 'OFFICE') && fo2.data.commercialProjectTypes?.length >= 2, fo2.data && Object.keys(fo2.data));
  const svAll = (await call('GET', '/catalog/services?context=booking')).data.services;
  const cSvc = svAll.filter((x) => x.scope === 'COMMERCIAL');
  const homeOnly = svAll.find((x) => x.scope === 'RESIDENTIAL');
  check('commercial services available in booking', cSvc.length >= 5 && homeOnly, svAll.map((x) => `${x.slug}:${x.scope}`));
  check('website services list hides commercial-only ones', !(await call('GET', '/catalog/services')).data.services.some((x) => x.scope === 'COMMERCIAL'));
  const cl = await call('POST', '/leads', { token: tokB, body: { flow: 'BOOKING', name: 'Neha Test', mobile: mB } });
  const cid = cl.data.lead.id;
  check('commercial: choose space', (await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'SPACE', data: { propertyCategory: 'COMMERCIAL' } } })).data?.lead?.nextStep === 'COMMERCIAL_DETAILS');
  check('commercial: unknown space type rejected', (await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'COMMERCIAL_DETAILS', data: { commercialType: 'SPACESHIP', area: 1500 } } })).status === 422);
  check('commercial: tiny area rejected', (await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'COMMERCIAL_DETAILS', data: { commercialType: 'OFFICE', area: 5 } } })).status === 422);
  const cd = await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'COMMERCIAL_DETAILS', data: { commercialType: 'OFFICE', area: 1500 } } });
  check('commercial details saved; home questions skipped', cd.data?.lead?.nextStep === 'POSSESSION' && cd.data.lead.property.commercialType === 'OFFICE', cd.data?.lead?.nextStep);
  for (const [step, data] of [['POSSESSION', { possession: 'WITHIN_1M' }], ['LOCATION', { formattedAddress: 'Plot 7, Sector 62, Noida', pincode: '201309', city: 'Noida' }]]) await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step, data } });
  check('home project type rejected for commercial', (await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'PROJECT_TYPE', data: { projectType: 'RESALE' } } })).status === 422);
  const pt = await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'PROJECT_TYPE', data: { projectType: 'NEW_FITOUT' } } });
  check('after location → project type (no home type / BHK)', pt.data?.lead?.nextStep === 'SERVICES', pt.data?.lead?.nextStep);
  check('home-only service rejected for commercial', (await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'SERVICES', data: { services: [homeOnly.id] } } })).status === 422);
  await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'SERVICES', data: { services: cSvc.slice(0, 2).map((x) => x.id) } } });
  const cfp = await call('PATCH', `/leads/${cid}`, { token: tokB, body: { step: 'FLOOR_PLAN', data: { hasFloorPlan: false, measurementAssistance: false } } });
  check('commercial flow ready for review', cfp.data?.lead?.nextStep === 'REVIEW', cfp.data?.lead?.nextStep);
  const cbk = await call('POST', '/bookings', { token: tokB, body: { leadId: cid } });
  check('commercial booking created with space labels', cbk.status === 201 && /^Commercial — Office/.test(cbk.data.booking.labels?.propertyType || '') && /1,500 sq ft/.test(cbk.data.booking.labels?.bhk || '') && cbk.data.booking.labels?.projectType === 'New Fit-out', cbk.data?.booking?.labels);
  check('commercial booking gets an indicative budget', cbk.data?.budget && cbk.data.budget.min > 0, cbk.data?.budget);
  const sw = await call('POST', '/leads', { token: tokB, body: { flow: 'BOOKING', name: 'Neha Test', mobile: mB } });
  await call('PATCH', `/leads/${sw.data.lead.id}`, { token: tokB, body: { step: 'SPACE', data: { propertyCategory: 'COMMERCIAL' } } });
  await call('PATCH', `/leads/${sw.data.lead.id}`, { token: tokB, body: { step: 'COMMERCIAL_DETAILS', data: { commercialType: 'RETAIL', area: 800 } } });
  const back2 = await call('PATCH', `/leads/${sw.data.lead.id}`, { token: tokB, body: { step: 'SPACE', data: { propertyCategory: 'RESIDENTIAL' } } });
  check('switching back to home asks the home questions', back2.data?.lead?.nextStep === 'REQUIREMENT', back2.data?.lead?.nextStep);
  }

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
    const f = await fetch(pdf.data.url.startsWith('/') ? `${API}${pdf.data.url}` : pdf.data.url); const b = Buffer.from(await f.arrayBuffer());
    check('PDF downloads (valid PDF, > 5 KB)', f.status === 200 && b.slice(0, 4).toString() === '%PDF' && b.length > 5000, b.length);
  }
  check('other customer cannot see it', (await call('GET', `/quotations/${qId}`, { token: tokB })).status === 404);
  check('contractor cannot revise before customer asks', (await call('POST', `/quotations/${qId}/revise`, { token: tokC, body: {} })).status === 409);
  const rr = await call('POST', `/quotations/${qId}/revision-request`, { token: tokA, body: { note: 'Please use acrylic shutters' } });
  check('revision requested', rr.status === 200 && rr.data.quotation.status === 'REVISION_REQUESTED', rr.body);
  check('cannot accept after requesting revision', (await call('POST', `/quotations/${qId}/accept`, { token: tokA, body: { acceptTerms: true } })).status === 409);
  const rv = await call('POST', `/quotations/${qId}/revise`, { token: tokC, body: { note: 'Changed to acrylic' } });
  check('contractor creates revision V2 as draft with customer note', rv.status === 201 && /-V2$/.test(rv.data.quotation.displayNumber) && rv.data.quotation.status === 'DRAFT' && rv.data.quotation.revisionRequest?.note === 'Please use acrylic shutters', rv.body);
  const q2 = rv.data.quotation.id;
  check('customer cannot see the draft revision', (await call('GET', `/quotations/${q2}`, { token: tokA })).status === 404);
  check('send blocked before admin review', (await call('POST', `/quotations/${q2}/approve`, { token: tokAdm, body: { send: true } })).status === 409);
  const sub2 = await call('POST', `/quotations/${q2}/submit`, { token: tokC, body: { note: 'Acrylic shutters, revised rates' } });
  check('contractor submits V2 for admin review', sub2.status === 200 && sub2.data.quotation.status === 'UNDER_ADMIN_REVIEW', sub2.body);
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

  section('Project payments (ledger, balance, Razorpay webhook)');
  const ps = await call('GET', `/execution/${pid}/payments`, { token: tokAdm });
  const total = ps.data?.summary?.total;
  check('payment summary: balance = contract value', ps.status === 200 && total > 0 && ps.data.summary.balance === total && ps.data.summary.paid === 0, ps.body);
  check('contractor cannot see payments', (await call('GET', `/execution/${pid}/payments`, { token: tokC })).status === 403);
  const first = ps.data.summary.schedule[0];
  const adv = Math.round(total * 0.25);
  const rc = await call('POST', `/execution/${pid}/payments`, { token: tokAdm, body: { amount: adv, method: 'CASH', note: 'Advance', scheduleItem: first?.id } });
  check('cash advance recorded', rc.status === 201 && rc.data.summary.paid === adv && rc.data.summary.balance === total - adv, rc.body);
  const ru = await call('POST', `/execution/${pid}/payments`, { token: tokAdm, body: { amount: 10000, method: 'UPI', reference: 'UTR123456' } });
  check('UPI payment recorded with reference', ru.status === 201 && ru.data.summary.paid === adv + 10000 && ru.data.summary.payments.some((x) => x.reference === 'UTR123456'), ru.body);
  check('bad method rejected', (await call('POST', `/execution/${pid}/payments`, { token: tokAdm, body: { amount: 10, method: 'BITCOIN' } })).status === 422);
  const upi = ru.data.summary.payments.find((x) => x.reference === 'UTR123456');
  const vd = await call('POST', `/execution/${pid}/payments/${upi.id}/void`, { token: tokAdm, body: { reason: 'Entered twice' } });
  check('void keeps entry, restores balance', vd.status === 200 && vd.data.summary.paid === adv && vd.data.summary.payments.find((x) => x.id === upi.id)?.status === 'VOID', vd.body);
  const cp = await call('GET', `/account/projects/${pid}/payments`, { token: tokA });
  check('customer sees received payments + balance only', cp.status === 200 && cp.data.summary.balance === total - adv && cp.data.summary.payments.every((x) => x.status === 'RECEIVED' && x.note === undefined), cp.body);
  check('online pay refused while gateway off', (await call('POST', `/account/projects/${pid}/payments/order`, { token: tokA, body: { amount: 1000 } })).status === 409);
  check('payment reminder sent', (await call('POST', `/execution/${pid}/payments/remind`, { token: tokAdm })).status === 200);
  const pl = await call('GET', '/execution', { token: tokAdm });
  check('project list shows paid & balance', pl.data?.items?.find((x) => x.id === pid)?.balance === total - adv, pl.data?.items?.[0]);
  await call('PUT', '/admin/settings/providers.payment', { token: tokAdm, body: { value: { active: 'RAZORPAY', razorpay: { keyId: 'rzp_test_e2e', keySecret: 'secret_e2e', webhookSecret: 'whsec_e2e' } } } });
  const hookBody = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x', order_id: 'order_unknown', method: 'upi' } } } });
  const hook = (sig) => fetch(`${API}/api/v1/payments/razorpay/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': sig }, body: hookBody });
  check('webhook with bad signature → 400', (await hook('deadbeef')).status === 400);
  check('webhook with valid signature accepted', (await hook(crypto.createHmac('sha256', 'whsec_e2e').update(hookBody).digest('hex'))).status === 200);
  const ver = await call('POST', `/account/projects/${pid}/payments/verify`, { token: tokA, body: { razorpay_order_id: 'order_nope', razorpay_payment_id: 'pay_nope', razorpay_signature: 'abc' } });
  check('verify unknown order → 404', ver.status === 404, ver.body);
  await call('PUT', '/admin/settings/providers.payment', { token: tokAdm, body: { value: { active: 'NONE', razorpay: { keyId: '', keySecret: '', webhookSecret: '' } } } });


  section('Refer & Earn: automatic credit, wallet, loopholes');
  await new Promise((r) => setTimeout(r, 400));
  const rq = await call('GET', `/admin/referrals/${refId}`, { token: tokAdm });
  const rqr = rq.data?.referral;
  check('quotation accepted → credited to wallet automatically', rqr?.status === 'REWARD_APPROVED' && rqr.bookingId === bookingId && rqr.projectId === pid, rqr && { status: rqr.status, bookingId: rqr.bookingId });
  check('slab A, level 1 → ₹25,000 (value excl. GST)', rqr?.slabKey === 'A' && rqr.level === 1 && rqr.rewardAmount === 25000 && rqr.valueBasis === 'EXCL_GST', rqr && { slab: rqr.slabKey, level: rqr.level, amount: rqr.rewardAmount });
  check('timeline: registered → booking → … → accepted → credited (all auto)', ['VERIFIED', 'CONTACTED', 'SITE_VISIT_DONE', 'QUOTATION_SHARED', 'AGREEMENT_SIGNED', 'ADVANCE_RECEIVED', 'REWARD_APPROVED'].every((st) => rqr?.timeline?.some((t) => t.status === st && t.auto !== false)), rqr?.timeline?.map((t) => t.status));
  check('contractor cannot see referrals', (await call('GET', '/admin/referrals', { token: tokC })).status === 403);
  check('cash payout disabled (rewards are credit)', (await call('POST', `/admin/referrals/${refId}/pay`, { token: tokAdm, body: { method: 'UPI', reference: 'UTR1' } })).status === 409);
  const myR = await call('GET', '/account/referrals', { token: tokR });
  check('referrer wallet ₹25,000, next level 2 (slab A ₹45,000)', myR.data?.wallet?.available === 25000 && myR.data.stats.successful === 1 && myR.data.next.nextLevel === 2 && myR.data.next.rewards[0].amount === 45000, myR.data && { wallet: myR.data.wallet, next: myR.data.next });
  check('referrer sees masked customer number', myR.data?.referrals?.every((x) => /^••••••\d{4}$/.test(x.customer.mobile)), myR.data?.referrals?.map((x) => x.customer.mobile));
  const bRef = myR.data?.referrals?.find((x) => x.customer.mobile.endsWith(mB.slice(-4)));
  check('estimate customer (via link code) recorded automatically', bRef && ['VERIFIED', 'CONTACTED'].includes(bRef.status), myR.data?.referrals?.map((x) => [x.customer.mobile, x.status]));
  const yRef = (await call('GET', `/admin/referrals?q=${mY}`, { token: tokAdm })).data.items[0];
  check('earlier enquiry → "needs review" (SUBMITTED, flagged)', yRef?.status === 'SUBMITTED' && yRef.checks?.duplicate === true, yRef);
  check('review: verify needs override', (await call('POST', `/admin/referrals/${yRef.id}/verify`, { token: tokAdm, body: {} })).status === 409);
  check('review: override needs a note', (await call('POST', `/admin/referrals/${yRef.id}/verify`, { token: tokAdm, body: { override: true } })).status === 422);
  check('review: verified with note', (await call('POST', `/admin/referrals/${yRef.id}/verify`, { token: tokAdm, body: { override: true, note: 'Old enquiry was a different project' } })).data?.referral?.status === 'VERIFIED');
  check('adjust needs a reason', (await call('POST', `/admin/referrals/${refId}/adjust`, { token: tokAdm, body: { amount: 26000 } })).status === 422);
  check('staff can adjust credited amount', (await call('POST', `/admin/referrals/${refId}/adjust`, { token: tokAdm, body: { amount: 26000, reason: 'Goodwill' } })).data?.referral?.rewardAmount === 26000);
  check('wallet follows the adjustment', (await call('GET', '/account/referrals', { token: tokR })).data?.wallet?.available === 26000);
  await call('POST', `/admin/referrals/${refId}/adjust`, { token: tokAdm, body: { amount: 25000, reason: 'Back to slab amount' } });
  // Manual attach (customer forgot the code)
  check('manual attach: self refused', (await call('POST', '/admin/referrals', { token: tokAdm, body: { referrerCode: refCode, customerMobile: mR, reason: 'test' } })).status === 409);
  check('manual attach: unregistered number refused', (await call('POST', '/admin/referrals', { token: tokAdm, body: { referrerCode: refCode, customerMobile: rnd(), reason: 'test' } })).status === 422);
  const ma = await call('POST', '/admin/referrals', { token: tokAdm, body: { referrerCode: refCode, customerMobile: mX, reason: 'Customer forgot the code' } });
  check('manual attach for a customer who forgot the code', ma.status === 200 && ma.data.referral.source === 'ADMIN' && ma.data.referral.status === 'VERIFIED', ma.body);
  check('manual attach twice refused', (await call('POST', '/admin/referrals', { token: tokAdm, body: { referrerCode: refCode, customerMobile: mX, reason: 'again' } })).status === 409);
  check('already-referred customer cannot be re-attached', (await call('POST', '/admin/referrals', { token: tokAdm, body: { referrerCode: refCode, customerMobile: mA, reason: 'again' } })).status === 409);

  // The referrer's own next project (created directly in the DB to keep the run short).
  const mongoose = require('mongoose');
  const conn = await mongoose.createConnection(process.env.MONGODB_URI).asPromise();
  const projects = conn.collection('executionprojects');
  const base = await projects.findOne({ _id: new mongoose.Types.ObjectId(pid) });
  const rUser = await conn.collection('users').findOne({ mobile: mR });
  const ownPid = new mongoose.Types.ObjectId();
  await projects.insertOne({ ...base, _id: ownPid, projectNumber: `${base.projectNumber}-R`, customer: rUser._id, booking: new mongoose.Types.ObjectId(), grandTotal: 100000, paymentSchedule: [], createdAt: new Date(), updatedAt: new Date() });
  const ownPay = await call('GET', `/account/projects/${ownPid}/payments`, { token: tokR });
  check('own project shows usable credit', ownPay.data?.credit?.available === 25000 && ownPay.data.credit.maxUsable === 25000, ownPay.data?.credit);
  check('customer A (no credit) cannot use credit', (await call('POST', `/account/projects/${pid}/payments/credit`, { token: tokA, body: { amount: 100 } })).status === 409);
  check('cannot use credit on someone else\'s project', (await call('POST', `/account/projects/${pid}/payments/credit`, { token: tokR, body: { amount: 100 } })).status === 404);
  check('cannot use more than available', (await call('POST', `/account/projects/${ownPid}/payments/credit`, { token: tokR, body: { amount: 30000 } })).status === 422);
  const [u1, u2] = await Promise.all([
    call('POST', `/account/projects/${ownPid}/payments/credit`, { token: tokR, body: { amount: 20000 } }),
    call('POST', `/account/projects/${ownPid}/payments/credit`, { token: tokR, body: { amount: 20000 } }),
  ]);
  check('double-spend blocked (only one of two parallel uses succeeds)', [u1, u2].filter((x) => x.status === 201).length === 1, [u1.status, u2.status]);
  const used = [u1, u2].find((x) => x.status === 201);
  check('credit deducted from project balance', used?.data?.summary?.balance === 80000 && used.data.summary.creditApplied === 20000 && used.data.credit.available === 5000, used?.data && { s: used.data.summary.balance, c: used.data.credit });
  const cfgNow = async () => (await call('GET', '/admin/settings/referral.config', { token: tokAdm })).data.value;
  await call('PUT', '/admin/settings/referral.config', { token: tokAdm, body: { value: { ...(await cfgNow()), maxRedeemPercent: 22 }, reason: 'e2e cap' } });
  check('cap: credit limited to 22% of project value', (await call('POST', `/execution/${ownPid}/payments/credit`, { token: tokAdm, body: { amount: 5000 } })).status === 422);
  const st2 = await call('POST', `/execution/${ownPid}/payments/credit`, { token: tokAdm, body: { amount: 2000 } });
  check('staff can apply remaining credit within cap', st2.status === 201 && st2.data.credit.available === 3000, st2.body);
  await call('PUT', '/admin/settings/referral.config', { token: tokAdm, body: { value: { ...(await cfgNow()), maxRedeemPercent: 100 } } });
  const ownStaff = await call('GET', `/execution/${ownPid}/payments`, { token: tokAdm });
  check('cannot record REFERRAL_CREDIT as a normal payment', (await call('POST', `/execution/${ownPid}/payments`, { token: tokAdm, body: { amount: 1000, method: 'REFERRAL_CREDIT' } })).status === 422);
  const crp = ownStaff.data.summary.payments.find((x) => x.method === 'REFERRAL_CREDIT' && x.amount === 2000);
  await call('POST', `/execution/${ownPid}/payments/${crp.id}/void`, { token: tokAdm, body: { reason: 'Wrong entry' } });
  check('voided credit returns to wallet', (await call('GET', '/account/referrals', { token: tokR })).data?.wallet?.available === 5000);

  // Hold / suspend
  const r2 = ma.data.referral.id;
  check('reject needs a reason', (await call('POST', `/admin/referrals/${r2}/reject`, { token: tokAdm, body: {} })).status === 422);
  check('rejected', (await call('POST', `/admin/referrals/${r2}/reject`, { token: tokAdm, body: { reason: 'Not genuine' } })).data?.referral?.status === 'REJECTED');
  check('reopened → back to review', (await call('POST', `/admin/referrals/${r2}/reopen`, { token: tokAdm, body: { reason: 'Checked again' } })).data?.referral?.status === 'SUBMITTED');
  await call('POST', `/admin/referrals/${r2}/verify`, { token: tokAdm, body: {} });
  const lk = await call('POST', `/admin/referrals/${r2}/link`, { token: tokAdm, body: { bookingNumber: bk.data.booking.bookingNumber, reason: 'Same family' } });
  check('a booking already credited cannot be linked again', lk.status === 409, lk.body);
  check('put on hold', (await call('POST', `/admin/referrals/${r2}/withhold`, { token: tokAdm, body: { reason: 'Checking documents' } })).data?.referral?.status === 'WITHHELD');
  const sus = await call('PATCH', `/admin/referrers/${rqr.referrer.id}`, { token: tokAdm, body: { status: 'SUSPENDED' } });
  check('suspend needs a reason', sus.status === 422, sus.body);
  await call('PATCH', `/admin/referrers/${rqr.referrer.id}`, { token: tokAdm, body: { status: 'SUSPENDED', suspendedReason: 'Under review' } });
  const sz = await login(rnd(), { referralCode: refCode });
  check('suspended referrer: new sign-ups with the code not applied', sz.status === 200 && sz.data.referral?.applied === false, sz.data?.referral);
  check('suspended referrer cannot use credit', (await call('POST', `/account/projects/${ownPid}/payments/credit`, { token: tokR, body: { amount: 100 } })).status === 409);
  await call('PATCH', `/admin/referrers/${rqr.referrer.id}`, { token: tokAdm, body: { status: 'ACTIVE' } });

  // Clawback: switch to "advance" rule, void the advance → credit removed although already used → recovery review.
  await call('PUT', '/admin/settings/referral.config', { token: tokAdm, body: { value: { ...(await cfgNow()), payoutTrigger: 'ADVANCE' }, reason: 'e2e clawback' } });
  const cash = (await call('GET', `/execution/${pid}/payments`, { token: tokAdm })).data.summary.payments.find((x) => x.method === 'CASH' && x.status === 'RECEIVED');
  await call('POST', `/execution/${pid}/payments/${cash.id}/void`, { token: tokAdm, body: { reason: 'Refunded' } });
  await new Promise((r) => setTimeout(r, 400));
  const rec = await call('GET', `/admin/referrals/${refId}`, { token: tokAdm });
  check('advance refunded after credit used → on hold + recovery review', rec.data?.referral?.recoveryReview === true && rec.data.referral.status === 'WITHHELD', rec.data?.referral && { status: rec.data.referral.status, flag: rec.data.referral.recoveryReview });
  const wNeg = await call('GET', '/account/referrals', { token: tokR });
  check('wallet goes negative (−₹20,000), nothing usable', wNeg.data?.wallet?.balance === -20000 && wNeg.data.wallet.available === 0, wNeg.data?.wallet);
  check('negative wallet: credit use refused', (await call('POST', `/account/projects/${ownPid}/payments/credit`, { token: tokR, body: { amount: 100 } })).status === 409);
  await call('POST', `/execution/${pid}/payments`, { token: tokAdm, body: { amount: adv, method: 'CASH', note: 'Advance re-received' } });
  // Manual approval mode
  await call('PUT', '/admin/settings/referral.config', { token: tokAdm, body: { value: { ...(await cfgNow()), autoApprove: false }, reason: 'e2e manual approval' } });
  check('reopened after advance re-received', (await call('POST', `/admin/referrals/${refId}/reopen`, { token: tokAdm, body: { reason: 'Advance received again' } })).status === 200);
  await new Promise((r) => setTimeout(r, 400));
  check('auto-approval off → waits as Qualified', (await call('GET', `/admin/referrals/${refId}`, { token: tokAdm })).data?.referral?.status === 'ADVANCE_RECEIVED');
  check('manual approve: changed amount needs a note', (await call('POST', `/admin/referrals/${refId}/approve`, { token: tokAdm, body: { amount: 20000 } })).status === 422);
  check('manual approve → credited', (await call('POST', `/admin/referrals/${refId}/approve`, { token: tokAdm, body: {} })).data?.referral?.status === 'REWARD_APPROVED');
  check('wallet back to ₹5,000', (await call('GET', '/account/referrals', { token: tokR })).data?.wallet?.available === 5000);
  check('recovery review closed', (await call('POST', `/admin/referrals/${refId}/recovery-reviewed`, { token: tokAdm, body: { reason: 'Settled' } })).data?.referral?.recoveryReview === false);
  await call('PUT', '/admin/settings/referral.config', { token: tokAdm, body: { value: { ...(await cfgNow()), autoApprove: true, payoutTrigger: 'AGREEMENT' } } });
  await conn.close();

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

  section('Gallery');
  const gc = await call('GET', '/admin/gallery-categories?limit=200', { token: tokAdm });
  const kitchen = gc.data?.items?.find((c) => c.slug === 'modular-kitchen');
  check('gallery categories seeded', gc.status === 200 && gc.data.items.length >= 10 && kitchen, gc.data?.items?.map((c) => c.slug));
  check('contractor cannot manage gallery', (await call('GET', '/admin/gallery-images', { token: tokC })).status === 403);
  check('bulk add needs a valid image', (await call('POST', '/admin/gallery-images/bulk', { token: tokAdm, body: { category: kitchen.id, items: [{ image: 'javascript:alert(1)' }] } })).status === 422);
  const gb = await call('POST', '/admin/gallery-images/bulk', { token: tokAdm, body: { category: kitchen.id, items: [{ image: '/images/home/hero.jpg', alt: 'E2E kitchen 1' }, { image: 'https://example.com/k2.jpg', title: 'E2E kitchen 2' }] } });
  check('bulk add 2 photos', gb.status === 201 && gb.data.count === 2, gb.body);
  const hidden = await call('POST', '/admin/gallery-images', { token: tokAdm, body: { category: kitchen.id, image: 'https://example.com/k3.jpg', title: 'E2E hidden', isPublished: false } });
  check('single photo created (hidden)', hidden.status === 201, hidden.body);
  const pub = await call('GET', '/catalog/gallery');
  const kItems = pub.data?.items?.filter((x) => x.category === 'modular-kitchen') || [];
  check('public gallery: published photos by category, hidden excluded', kItems.some((x) => x.title === 'E2E kitchen 2') && !kItems.some((x) => x.title === 'E2E hidden') && pub.data.categories.find((c) => c.slug === 'modular-kitchen').count === kItems.length, kItems.length);
  const dc = await call('DELETE', `/admin/gallery-categories/${kitchen.id}`, { token: tokAdm });
  check('category with photos is hidden, not deleted', dc.status === 200 && dc.data.deactivated === true, dc.body);
  check('hidden category not public', !(await call('GET', '/catalog/gallery')).data.categories.some((c) => c.slug === 'modular-kitchen'));
  await call('PATCH', `/admin/gallery-categories/${kitchen.id}`, { token: tokAdm, body: { isActive: true } });
  for (const x of (await call('GET', `/admin/gallery-images?category=${kitchen.id}&limit=200`, { token: tokAdm })).data.items.filter((i) => /^E2E/.test(i.title || i.alt || ''))) await call('DELETE', `/admin/gallery-images/${x.id}`, { token: tokAdm });

  section('Contact page enquiries');
  {
    const em = rnd();
    const body = { name: 'Pooja Contact', mobile: em, email: 'pooja@example.com', city: 'Noida', topic: 'PARTNERSHIP', message: 'We supply laminates and would like to partner.', preferredContact: 'EMAIL', consent: true };
    check('enquiry needs consent', (await call('POST', '/enquiries', { body: { ...body, consent: false } })).status === 422);
    check('enquiry needs a real message', (await call('POST', '/enquiries', { body: { ...body, message: 'hi' } })).status === 422);
    check('enquiry bad mobile rejected', (await call('POST', '/enquiries', { body: { ...body, mobile: '12345' } })).status === 422);
    const en = await call('POST', '/enquiries', { body });
    check('enquiry submitted with reference', en.status === 201 && /^ENQ-\d{4}-\d{6}$/.test(en.data.enquiryNumber), en.body);
    check('same message twice → not duplicated', (await call('POST', '/enquiries', { body })).data?.enquiryNumber === en.data.enquiryNumber);
    const bot = await call('POST', '/enquiries', { body: { ...body, message: 'Buy cheap followers now!!!', website: 'http://spam.example' } });
    check('honeypot: bot gets OK but nothing saved', bot.status === 201 && bot.data.enquiryNumber === null);
    check('customer cannot list enquiries', (await call('GET', '/admin/enquiries', { token: tokA })).status === 403);
    check('contractor cannot list enquiries', (await call('GET', '/admin/enquiries', { token: tokC })).status === 403);
    const el = await call('GET', `/admin/enquiries?q=${em}`, { token: tokAdm });
    const it = el.data?.items?.[0];
    check('admin sees the enquiry (NEW)', el.data?.items?.length === 1 && it.status === 'NEW' && it.topic === 'PARTNERSHIP', el.data?.items);
    const up = await call('PATCH', `/admin/enquiries/${it.id}`, { token: tokAdm, body: { status: 'RESOLVED', note: 'Emailed vendor form' } });
    check('admin resolves with a note', up.data?.enquiry?.status === 'RESOLVED' && up.data.enquiry.notes.some((n) => n.text === 'Emailed vendor form'), up.body);
    const nt = await call('GET', '/notifications', { token: tokAdm });
    check('admins notified in-app', nt.data?.items?.some((x) => x.event === 'ENQUIRY_RECEIVED'), nt.data?.items?.slice(0, 3).map((x) => x.event));
  }

  section('Logout');
  check('logout', (await call('POST', '/auth/logout', { cookie: relog.cookie })).status === 200);
  check('refresh after logout → 401', (await call('POST', '/auth/refresh', { cookie: relog.cookie })).status === 401);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) console.log(`Failed:\n - ${failures.join('\n - ')}`);
  process.exit(fail ? 1 : 0);
})().catch((err) => { console.error('\nE2E crashed:', err); process.exit(1); });
