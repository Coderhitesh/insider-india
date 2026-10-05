# INSIDER INDIA LLP — Platform

Monorepo: `backend/` (Express + MongoDB API) · `frontend/` (Next.js, JS, App Router — Phase 4).

## Build phases
| # | Scope | Status |
|---|-------|--------|
| 1 | Backend core: auth (OTP + staff), RBAC base, leads/booking funnel, estimate engine, bookings, uploads (Cloudinary/S3), notifications (SMS/WhatsApp/Email/In-app), Google Places proxy, seed | ✅ |
| 2 | Admin APIs: dashboard, leads/bookings (filters, CSV, assignment, status, notes), customers, contractors (custom permissions), staff users, roles, settings (storage/providers/OTP/maps/pricing/funnel/estimate), packages/services/estimate-rules/templates CRUD, CMS (projects, testimonials, FAQ), audit logs, uploads, notification log | ✅ |
| 3 | Site visits (+ reminders job), measurements, quotation builder, server-side totals, admin review + audited price edits, approval, PDF + versions (QT-YYYY-NNNNNN-Vn), customer accept/revise/reject, execution projects | ✅ |
| 4 | Frontend public site + booking & estimate funnels (see `frontend/README.md`) | ✅ |
| 5 | Customer dashboard (`/account/*`) + `/account/summary|profile|documents` APIs | ✅ |
| 6 | Admin & contractor console (`/admin/*`) | ✅ |

## Backend setup
```bash
cd backend
cp .env.example .env        # fill MONGODB_URI, JWT_*, ENCRYPTION_KEY, SEED_SUPER_ADMIN_*
npm install
npm run seed                # idempotent — safe to re-run, never overwrites admin edits
npm run dev                 # http://localhost:5000/health
```
Node ≥ 20, MongoDB ≥ 6.

**Secrets:** `ENCRYPTION_KEY` encrypts provider/storage secrets in the `settings` collection (AES-256-GCM). Changing it later makes stored secrets unreadable — re-enter them in Admin.

**Dev OTP:** with `ALLOW_LOG_PROVIDERS=true` and `SMS_PROVIDER=LOG`, OTPs print to the server log. LOG providers are refused in production.

## Auth model
- Customers: mobile OTP (SMS/WhatsApp). `verify-otp` creates/logs in the user and links the funnel lead.
- Staff (Super Admin/Admin/Contractor): `POST /auth/staff/login` email + password, lockout after 5 failures (15 min). Admins cannot use OTP login.
- Access token (15 min) in JSON → keep in memory. Refresh token = httpOnly cookie `ii_rt` (path `/api/v1/auth`), rotated on every refresh with reuse detection (reused token revokes the whole session family).
- Frontend must call API with `credentials: 'include'`.

## Funnel contract (booking)
1. `POST /leads` `{flow, name, mobile, city, utm?}` → `{lead, leadToken}`. Send `X-Lead-Token: <leadToken>` on anonymous calls.
2. `PATCH /leads/:id` `{step, data}` for `REQUIREMENT`, `BUDGET`, `POSSESSION` (anonymous OK).
3. `POST /auth/send-otp` `{mobile, channel, leadId, leadToken}` → `POST /auth/verify-otp` `{mobile, code, leadId, leadToken}` → `{accessToken, user, lead}`.
4. Authenticated `PATCH /leads/:id` for `LOCATION`, `PROPERTY_TYPE`, `BHK`, `PROJECT_TYPE`, `SERVICES`, `FLOOR_PLAN`.
   - Floor plan: `POST /uploads` multipart `file` + `purpose=FLOOR_PLAN` → media id → `FLOOR_PLAN {hasFloorPlan:true, mediaIds}`; or `{hasFloorPlan:false, measurementAssistance:true|false}` (charge from settings, default ₹1,999).
5. `POST /bookings {leadId}` when `lead.nextStep === 'REVIEW'` → booking + notifications. Idempotent.

Every lead response carries `nextStep` — the frontend always routes to it (resume/abandoned recovery). `GET /leads/resume` returns the user's latest open lead after login.

## Funnel contract (estimate)
`GET /estimates/config` → sizes, counters, add-ons, disclaimer, OTP length.
Collect → `POST /leads {flow:'ESTIMATE', name, mobile, estimateDraft}` → OTP → `POST /estimates {leadId, ...inputs}` → results for all packages. `PATCH /estimates/:id/package` switches package. "Book Free Consultation" → continue the same lead at `nextStep` (BHK + verification reused).

## API (Phase 1)
```
POST /api/v1/auth/send-otp | verify-otp | staff/login | refresh | logout | logout-all   GET /auth/me
GET  /api/v1/catalog/site | packages | packages/:slug | services?context=booking | funnel-options
POST /api/v1/leads   GET /leads/resume   GET|PATCH /leads/:id
GET  /api/v1/estimates/config | packages | mine | :id   POST /estimates   PATCH /estimates/:id/package
POST /api/v1/bookings   GET /bookings/mine | :id
POST /api/v1/uploads    GET /uploads/:id/url   DELETE /uploads/:id
GET  /api/v1/geo/autocomplete?q=&sessionToken= | geo/place/:placeId
GET  /api/v1/notifications   POST /notifications/read-all   PATCH /notifications/:id/read
```
Responses: `{success, message, data, meta?}` / `{success:false, message, code, errors[], details?, requestId}`.

## Admin API (Phase 2) — `/api/v1/admin/*` (staff only, permission-checked server-side)
```
GET    /dashboard?range=today|7d|30d|month|custom&from&to
GET    /leads?status,flow,range,from,to,city,bhk,budget,service,package,contractor(=id|unassigned),assignedAdmin,verified,abandoned,q,sort,format=csv
GET|PATCH|DELETE /leads/:id      POST /leads/:id/assign-contractor
GET    /bookings (same filters, format=csv)   GET /bookings/:id
POST   /bookings/:id/assign-contractor        PATCH /bookings/:id/status
GET|POST /leads/:id/notes | /bookings/:id/notes     DELETE …/notes/:noteId
GET|PATCH|DELETE /customers[/:id]  (DELETE = anonymise; bookings kept)
GET|POST|PATCH|DELETE /contractors[/:id]  (custom permissions need roles.manage)
GET|POST|PATCH /users[/:id]  POST /users/:id/reset-password | force-logout   PATCH /me/password
GET /permissions   GET|POST|PATCH|DELETE /roles[/:id]
GET /settings   GET|PUT /settings/:key   POST /settings/storage/test   POST /settings/providers/:kind/test
CRUD + PATCH /reorder: /packages /services /estimate-rules /notification-templates /projects /testimonials /faqs
POST /notifications/send   GET /notifications/log   GET /audit-logs   GET /uploads
```
Public CMS: `GET /catalog/projects?category&featured`, `/catalog/projects/:slug`, `/catalog/projects/slugs` (sitemap), `/catalog/testimonials`, `/catalog/faqs?category`.

Rules enforced server-side:
- Contractors only ever see leads/bookings assigned to them (list, detail, notes, dashboard) and only `STAFF` notes.
- Storage, SMS/WhatsApp/Email providers and OTP config: Super Admin only. Secrets come back masked (`••••1234`); sending a masked value keeps the stored secret.
- Last active Super Admin can't be demoted/disabled; staff can't change their own role/status; only Super Admin grants Super Admin.
- Contractors can never be granted `roles.manage`, `settings.manage`, `users.manage`, `audit_logs.view`.
- Deleting an in-use package/service/estimate rule deactivates it instead. Contractors with history are deactivated, not deleted. Booked leads can't be deleted.
- Audited: pricing/package/rule changes (before/after), role & permission changes, assignments, status changes, settings (redacted), exports, customer deletion, logins.
- CSV exports are formula-injection safe and capped at 20k rows.
- Seeded FAQs are **unpublished drafts** — review, then publish.

## Operations API (Phase 3)
```
/site-visits            GET ?bookingId,status,contractor,range,upcoming=true   POST {bookingId, scheduledAt, contactPerson?, siteAddress?, notes?}
/site-visits/:id        GET | PATCH (reschedule/attach media) | POST /complete {siteCondition, notes, images, videos, floorPlans, documents} | POST /cancel {reason}
/measurements/booking/:bookingId        GET | PUT {rooms[{name,type,rows[{label,width,height,length,area,quantity,unit}]}]} | POST /finalize | POST /reopen (admin)
/quotations             POST {bookingId, sections…}            GET /booking/:bookingId (all versions)
/quotations/:id         GET (staff or customer view) | PATCH | GET /pdf (signed URL) | GET /preview-pdf (staff, streamed)
/quotations/:id/submit | /return {note} | /approve {send?} | /send | /revise {returnToContractor?, note}
/quotations/mine  (customer)      /quotations/:id/accept {acceptTerms:true} | /revision-request {note} | /reject {note}
/execution              GET | GET /:id | POST /:id/start | POST /:id/stage {stage} | PATCH /:id (PM, milestones, payments, docs) | POST /:id/updates
/account/projects       GET | GET /:id   (customer)
/admin/quotations       ?status,contractor,bookingId,range,q,allVersions=true,format=csv
```
Workflow & rules (server-enforced):
- **No quotation without a COMPLETED site visit and FINAL measurements** (checked at create and submit).
- `DRAFT` (contractor edits) → `UNDER_ADMIN_REVIEW` (contractor locked out; customer can't see) → `APPROVED` → `SENT_TO_CUSTOMER` (PDF generated + stored, WhatsApp/in-app/email) → `ACCEPTED` / `REJECTED` / `REVISION_REQUESTED`.
- Editing an APPROVED quotation drops it back to review. Admin can return it to the contractor with a note.
- **Totals are always recomputed server-side**: item amount = qty × (material + labour, or unit price); pro-rata discount per item (rounding absorbed so shares sum exactly); per-item GST override or quotation GST; taxable/non-taxable extra charges; measurement-assistance charge carried from the booking (waivable only with `quotations.discount`); grand total rounded to the rupee with a round-off line; payment schedule must total 100%.
- **Admin price edits after submission require a reason** and are stored per item (`priceChanges`: field, before, after, reason, who, when) plus an audit entry with contractor total vs adjusted total.
- Contractors can't add discounts, change GST, payment schedule, validity or admin notes.
- **Revisions**: `POST /revise` creates V(n+1) as a new document; old versions are never modified (marked `isLatest:false`). Customers keep access to every version they were sent.
- Customer view hides cost splits, internal notes, discount reasons and price-change history. First open records `viewedAt` + "Customer Viewed Quotation" timeline entry. Accept/revise/reject are atomic, blocked after `validUntil`, timestamped, and notify admins + contractor.
- Acceptance creates an **ExecutionProject** (stages DESIGN → … → COMPLETED, milestones, payment schedule, progress updates with photos, documents). Booking moves to PROJECT_STARTED / IN_PROGRESS / COMPLETED from the project, not manually.
- Site-visit reminders: background job every 10 min (atomic claim, safe with multiple instances). Disable with `DISABLE_JOBS=true`.
- PDF: original INSIDER INDIA LLP template (pdfkit, Cormorant Garamond + Noto Sans, both OFL — licences in `src/templates/fonts`). Includes logo (from `company.profile.logoUrl`, PNG/JPG), parties, room-wise sections, totals, amount in words (Indian system), payment schedule, warranty, terms, notes, signature blocks, page footer.

## Providers
- **SMS:** LOG · MSG91 (Flow API, DLT template id per event in `notificationtemplates.providerTemplateId`) · Twilio.
- **WhatsApp:** LOG · Meta Cloud API · Interakt · Gupshup · Twilio. Business-initiated messages need **approved templates** — seeded names (`insider_otp`, `insider_booking_created`, `insider_quotation_ready`, …) must match what you register, with body variables in `variableOrder`. OTP template uses Meta's authentication copy-code button (`otpButton: true`).
- **Email:** LOG · SMTP.
- Active provider + credentials live in `settings` (`providers.sms|whatsapp|email`), editable by Super Admin (Phase 2 UI).

## Storage
`StorageService.upload/delete/getUrl` → `CloudinaryStorageProvider` | `S3StorageProvider`. Active provider from `settings.storage`. Files remember their provider, so switching providers doesn't break old files.
- Private files (floor plans, site docs): Cloudinary `private` type / S3 `…/private/` prefix, served via 15-min signed URLs.
- S3 public files go under `<prefix>/public/` — grant read on that prefix only (bucket policy or CloudFront OAC):
```json
{"Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::BUCKET/insider-india/public/*"}
```
- Uploads validated by magic bytes + extension match; executables/SVG/HTML blocked; unique names.

## Google Places
Server-side proxy (Places API New) — key never reaches the browser. Restrict `GOOGLE_MAPS_API_KEY` to the server IP and to Places API. Location step re-resolves `placeId` server-side before saving. Without a key the frontend falls back to manual address entry.

## ⚠️ Review before launch
- `operations.config` → set quotation validity days and the default payment schedule (left empty on purpose), enable site videos if wanted.
- `company.profile` → logo URL, GST number, address, terms, warranty text and quotation footer all print on the PDF.
- FAQs seeded as unpublished drafts; no testimonials/projects are seeded — add real ones in Admin.
- **Estimate rules** (extra rooms, add-ons) are **demo values** (`isDemoValue: true`) — not in the brief.
- **Studio/1 BHK, 5 BHK+, Custom Area and Commercial** have no prices in the brief → estimator returns `PRICE_ON_REQUEST` for them until you set BHK pricing / `areaRate` per package.
- Site stats (years, projects, consultations) are hidden until real values are entered. Company phone/address/GST are blank.
- City list in `funnel.options` defaults to Delhi-NCR — edit if you serve other cities.

## Day-to-day workflow
See [WORKFLOW.md](WORKFLOW.md) — booking → contractor → site visit → measurements → quotation → review → customer → project.

## Testing
- **API end-to-end:** `cd backend && API_URL=http://localhost:5000 ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run test:e2e` — 125 checks across funnels, OTP, uploads, estimate, permissions, site visit, measurements, quotation review/PDF/revisions, acceptance, projects, settings and audit. Needs `SMS_PROVIDER=LOG`/`WHATSAPP_PROVIDER=LOG` (OTP codes are read from `logs/combined.log`) and working storage (`STORAGE_PROVIDER=LOCAL` is simplest). Creates test data — never run against production.
- Verified on a local Mongo-compatible server (FerretDB); dashboard, OTP and seed code avoid `$lookup`/`$cond`/projection-on-update so they run on MongoDB Atlas and compatible servers alike.

## Local storage (development)
`STORAGE_PROVIDER=LOCAL` stores uploads under `backend/uploads/` and serves them from `/api/v1/files/*` (private files only through expiring signed links). Refused in production unless `ALLOW_LOCAL_STORAGE=true`. Use Cloudinary or S3 in production.

## Security notes
- Real credentials belong in `backend/.env` / `frontend/.env.local` (gitignored), never in `.env.example`.
- `SEED_SUPER_ADMIN_PASSWORD` must be at least 10 characters; otherwise the seed skips creating the admin.
- If an Atlas URI only has the host, data goes to the `insider_india` database (override with `MONGODB_DB`).
