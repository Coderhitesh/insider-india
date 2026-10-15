# INSIDER INDIA LLP — Frontend (Next.js, JavaScript, App Router)

```bash
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL
npm install
npm run dev                  # http://localhost:3000
npm run build && npm start   # production
```
Node ≥ 20.9. Backend must allow this origin in its `FRONTEND_URL`.

**Cookies:** the refresh token is an httpOnly cookie set by the API. Host the site and API on the same site
(e.g. `insiderindia.in` + `api.insiderindia.in`) with `COOKIE_SAMESITE=lax`, or set `COOKIE_SAMESITE=none` + HTTPS if they are on different domains.

## Structure
```
app/                 routes (server components by default)
components/ui        primitives: Button, Field/Input, ChoiceCard, Counter, OtpInput, Swatch, Progress, Notice
components/layout    Header, Footer, Logo
components/home      homepage sections, PackageBoards, ProjectCard, ConsultationForm
components/pages     PageHeader, ServicePage template, LegalPage
features/booking     11-step consultation funnel (autosaves each step to the lead)
features/estimate    5-step budget calculator + result
features/auth        OTP send/verify (shared), login
lib/                 api client (token refresh), server-api (ISR reads), content, seo, format, icons
store/               zustand: auth (memory), booking (lead id), estimate (session)
```

## Design system — "Redline"
Red and white only, inspired by an architect's red-pen markup on a drawing sheet.
- Colours (`app/globals.css`): white `#ffffff`, brand red `#c8102e` (`wine`), deep red `#9a0c22`, blush `#fdeeef`, ink `#1a0b0d` (`charcoal`), hairline `#f1dada` (`stone`). Token names are kept stable, so components read `bg-wine`, `text-charcoal`, etc.
- Type: Archivo variable (weight 100–900, width 62–125%), self-hosted. Headings use the expanded width at weight 800; body uses normal width.
- Motifs: drawing-sheet grid (`.grid-paper`), ruler tick bands (`.ruler`), dimension rules above section headings, sharp corners.
- Signature: the hero floor plan draws itself in red on load (`components/home/Hero.js`). Elsewhere `Swatch` renders small red line drawings (living room, kitchen, wardrobe, renovation, office) in place of photos. Add real photography via `lib/content.js → IMAGES`.
- Packages are drawing title blocks; footer and package section are solid red; the console has a red sidebar.
- Motion: hero drawing + funnel step transitions only; `prefers-reduced-motion` respected.

## Environment
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` as before.
- `API_INTERNAL_KEY` (server-only) must equal the backend's `INTERNAL_API_KEY`. Server-side rendering sends it so the website's own requests are not rate-limited as one IP.
- Build with a clean environment: `NODE_ENV=development` set in the shell breaks `next build`.

## Content rules
Nothing numeric or reputational is hard-coded. Stats, testimonials, projects, FAQs, company details, terms and warranty text come from the Admin panel; empty sections are hidden rather than filled with placeholders.

## Funnels
- `/book-consultation`: resumes from the server lead's `nextStep` (local storage keeps only the lead id + anonymous token). Verified users skip the OTP step; back navigation keeps every answer. Floor plans upload with progress, preview, replace and remove.
- `/estimate`: property → rooms → add-ons → contact → OTP → result for every package. `?package=<slug>` preselects a package. "Book free consultation" continues the same lead in the booking funnel from the next missing answer.

## Customer dashboard (`/account`)
Guarded client-side (anonymous → `/login?next=…`; staff accounts are pointed to `/admin`). All data comes from the API; nothing is cached locally.
- **Dashboard** — one call to `GET /account/summary`: current booking, expert, site visit, quotation status, project, latest estimate, floor plans, unfinished request (resume link), recent notifications.
- **Bookings** — list + detail with the visual timeline (completed events with dates, then upcoming milestones), site visit, all quotation versions, request details.
- **Quotations** — room-wise items (material, finish, size, qty × rate), discounts, charges, GST, round-off, payment schedule, warranty, validity, timestamps. Accept (terms confirmation), request revision and decline use a native `<dialog>`; PDF download via a 10-minute signed URL; "Contact expert" opens WhatsApp with the quotation number (falls back to phone).
- **Projects** — 8-stage tracker, team, upcoming milestones, payment schedule with paid/due status, progress updates with site photos, documents.
- **Estimates**, **Documents** (quotation PDFs, floor plans, project documents), **Notifications** (read / read all / load more), **Profile** (name, email, city, contact preference, marketing consent, log out / log out everywhere).

Reference numbers and money in the dashboard use the UI face, not Bodoni — the display face's hairline hyphens and numerals are not reliable at small sizes.

## Console (`/admin`) — admins and contractors
Staff sign in at `/admin/login` (email + password; contractors can also use mobile OTP on `/login`). One console serves every staff role: the sidebar shows only what the user's permissions allow, and the API enforces the same permissions and scopes contractors to their own assignments.

- **Dashboard** — period filter (today / 7 / 30 days / month / custom); lead, booking, site-visit, conversion and quotation KPIs; lead trend; leads by status, city, service, configuration; estimates by package; contractor workload (Recharts).
- **Leads** — URL-synced filters (status, source, date, city, BHK, budget, service, package, contractor, verified, abandoned), search, sort, column picker (remembered per browser), CSV export, bulk assign. Detail: requirement, “stopped at step X”, estimate, contractor assignment, status change (reason required for lost), internal notes (staff / admins-only), activity log.
- **Bookings** — same table tools. Detail is the job hub: customer floor plans, contractor assignment + history, cancel/reopen, site visits (schedule → reschedule → complete with site condition, photos, floor plan, documents, videos), measurement sheet, quotation versions, notes, internal/customer timeline.
- **Measurement sheet** — rooms × rows (width/height/length/area/qty/unit, 9 units), auto area hint, save draft, finalise (locks), admin reopen.
- **Quotation builder / review** — sections and items (material, finish, dimensions, qty, unit, material/labour/unit price, GST override, notes, image), charges (system measurement charge waivable), discounts, GST, validity, payment schedule, three note fields, live preview totals with contractor-vs-admin delta, measurement reference, PDF preview. Workflow buttons follow status and permission: Submit → Return / Approve / Approve & send → Send → Create revision. Admin price edits after submission prompt for a reason and show in the price-change history.
- **Projects** — start, stage changes (customer notified), project manager, milestones, payment status, progress updates with photos.
- **Customers** (block / anonymise), **Contractors** (profile, photo, areas, specialisations, login, per-contractor permission set), **Staff users** (roles, extra permissions, reset password, sign out everywhere), **Roles & permissions** matrix.
- **Packages** (BHK ranges, per-sq-ft rates, warranty, features, recommended), **Services**, **Estimate rules** (room/add-on, flat/percent, package overrides, demo flag), **Website content** (projects with gallery and before/after, testimonials, FAQs) — all reorderable.
- **Settings** — company, homepage stats, funnel options, estimator, pricing, operations, Google Maps, OTP, storage (Cloudinary/S3), SMS, WhatsApp, email; secrets masked; live connection tests.
- **Notifications** (templates, delivery log, manual in-app message), **Uploads**, **Audit logs** (before/after drill-down), **Reports** (CSV exports by period).

## SEO
Per-page metadata + canonical, OpenGraph image, `sitemap.xml` (includes project slugs), `robots.txt`, JSON-LD for business (only filled fields), services, FAQ and breadcrumbs.
