# The Lawn Care — Requirements & Technical Plan

**Prepared by:** Claude, acting as consultant / tech lead
**Date:** 5 September 2026 (v1.1 — updated after independent review)
**Owner:** Eric
**Status:** Draft — Phase 1 (MVP) built, Phases 2-3 scoped for review.
See `CHANGELOG.md` for what changed between doc/site revisions.

---

## 1. Business overview

The Lawn Care is an online lawn mowing service. The long-term model is a two-sided
marketplace: customers request a quote and book a mow online; the job is then
completed either by Eric directly or picked up by an independent mower
("gig" contractor) from a pool of vetted operators — similar in shape to
Uber/Airtasker but scoped to one trade.

- **Home base:** Melbourne, with messaging built to expand into Sydney
  without a rebrand or re-platform.
- **Primary goal of the website:** capture quote requests from customers
  with minimal friction (no phone tag), and give Eric one place to see and
  action every lead.
- **Secondary, later goal:** let a network of independent mowers claim and
  complete jobs, with The Lawn Care taking a margin or referral fee.

## 2. User roles

| Role | Who | Needs from the system |
|---|---|---|
| **Customer** | Homeowner/renter wanting a mow | Fast quote, clear pricing factors, easy booking, trust signals (insurance, vetting), a way to see job status |
| **Mower (contractor)** | Eric today; independent operators later | A queue of available jobs, ability to claim one, customer address/notes, a way to mark complete, payout visibility |
| **Admin (Eric)** | Business owner | Visibility into every quote/lead, ability to set pricing rules, contractor management, dispute handling, financial reporting |

## 3. Phase 1 — what's built today (MVP)

Scope agreed with Eric: a real, working marketing + lead-generation site,
**not** yet the full contractor marketplace (that's a materially larger
build — see Phase 2/3 below).

**Delivered:**
- Public marketing site: hero, services, our-work gallery, how-it-works,
  service area (Melbourne live, Sydney flagged "coming soon"), reviews,
  trust section, footer. Hero and gallery use stock photography (Unsplash)
  as placeholders — **not real photos of completed jobs** — swap for real
  ones once Eric has a photo or two from actual work.
- A reviews section with an honest "no reviews yet" state rather than
  fabricated testimonials (a new business claiming customer quotes it
  doesn't have is a real fake-review/consumer-law risk, not just a style
  choice) — ready to populate the moment real reviews exist.
- A working multi-field quote request form. Submissions are captured to a
  live data store tied to the site (no separate backend needed for this
  phase).
- A lightweight admin view (`?admin` on the site URL) where Eric can see
  every submitted quote request and mark its status (New / Contacted /
  Scheduled / Completed) — a placeholder for the future dispatch workflow.
  It's gated by a shared passphrase as a stopgap against casual access, not
  real authentication — see the security note under §7.
- A short data-use line next to the quote form ("used only to quote and
  book your mow, never shared or sold") — a stopgap, not a full privacy
  policy; see §7.
- **Lawn-size estimator:** customer searches their address, satellite
  imagery loads, and they trace their lawn's outline on the map; the exact
  traced area (m² / sq ft) and a placeholder instant price range are
  computed client-side and carried through into the quote submission (and
  shown on the admin lead card). Built key-less/free for prototype speed —
  see §4 for the stack and its trade-offs vs. the originally-planned Google
  Places/paid stack, and the known hosting limitation this introduces
  below.

**Explicitly NOT in Phase 1:**
- Payment processing / online checkout.
- Contractor accounts, onboarding, or job claiming.
- A *final* automated price (the estimator gives a ballpark from traced
  area; Eric still confirms the real price and follows up).
- SMS/email confirmation automation.
- A real domain, business registration, or production hosting — this is a
  working prototype Eric can share, refine, and hand to a developer or
  no-code platform for production hardening.

## 4. Phase 2 — quoting & payments (proposed next)

- **Instant price engine:** a first version now exists client-side in
  Phase 1 (see below) using placeholder rates. Turning it into the real
  thing means Eric setting actual per-m²/frequency/service rates, and
  probably moving the calculation server-side once money is involved (a
  client-side price is trivially editable by anyone with devtools before
  Eric confirms it — fine for a ballpark today, not for a binding quote).
- **Online payment:** Stripe (AU-native, handles card + Apple/Google Pay)
  charged on booking or on job completion.
- **Automated notifications:** email/SMS confirmation, reminder before the
  scheduled mow, receipt after completion (e.g. Postmark or Twilio SendGrid
  for email, Twilio for SMS).
- **Address autocomplete / lawn measurement — built early, free stack:**
  originally scoped here as Google Places API, but the lawn-size estimator
  was pulled into Phase 1 using a free, key-less stack instead: OpenStreetMap
  Nominatim for address search, Esri World Imagery for satellite tiles, and
  Turf.js for geodesic area calculation. This gets a working prototype
  today with no Google Cloud billing account, but it's a deliberate
  trade-off Eric should know about:
  - **Accuracy:** good enough to sanity-check a customer's self-reported
    size, not survey-grade. Google's Solar API / high-res aerial imagery
    would be sharper if measurement precision starts driving disputes over
    price.
  - **Nominatim usage policy:** free tier is rate-limited and meant for
    light/non-commercial-scale use — fine at today's volume, but revisit
    (self-hosted Nominatim, or Google/Mapbox geocoding) if quote volume
    grows meaningfully.
  - **Known hosting limitation:** this feature needs outbound network
    calls (tiles, geocoding), which the Claude Artifact sandbox blocks —
    so it cannot run in the same hosted context as the live quote-capture
    database (which *only* works inside a published Artifact). Today,
    locally-served: estimator works, quote capture falls back to an email
    draft; published as an Artifact: quote capture works, estimator can't
    load tiles. See `README.md`. This tension resolves naturally once Phase
    2's real static hosting + real backend (below) replaces the Artifact
    stopgap — that move is now more urgent than "nice to have."
- **Customer accounts:** order history, saved address, repeat-booking in
  one click.

## 5. Phase 3 — the two-sided marketplace (full vision)

This is the "jobs picked up by me or any random individual" model in full:

- **Mower onboarding:** application, ID check, ABN capture, public
  liability insurance upload/verification, equipment checklist, background
  check (e.g. via a service like Xref or a police-check provider).
- **Job dispatch:** new bookings enter an open queue; available mowers see
  jobs near them and claim one (first-come, or Eric manually assigns).
- **Live job status:** claimed → en route → in progress → completed, visible
  to the customer.
- **Ratings & reputation:** customer rates the mower after each job;
  repeated low ratings or no-shows suspend a mower.
- **Payouts:** The Lawn Care collects payment from the customer, takes a
  commission, pays the mower out (Stripe Connect is the standard tool for
  this split-payment model).
- **Insurance & liability framework:** clear terms on who is liable for
  property damage — almost certainly needs a written agreement with each
  mower and a small business insurance policy for The Lawn Care itself. **Legal
  advice recommended before onboarding any third-party mower** — this is a
  genuine legal/compliance decision, not just a technical one.
- **Admin/dispatch console:** map view of open jobs, mower locations
  (opt-in), manual override/reassignment, financial reporting.

## 6. Functional requirements detail

### 6.1 Customer-facing (Phase 1, live)
- View services offered: standard mow, edge & whipper-snip, hedge trim,
  green-waste removal (confirm final list with Eric).
- View how pricing works (size/frequency/service-type factors) without
  needing an exact dollar figure up front.
- Submit a quote request with: name, email, phone, suburb/postcode, lawn
  size band, frequency, preferred day, notes (gate code, pets, etc.).
- Receive on-screen confirmation that the request was received and a
  timeframe for reply.

### 6.2 Admin-facing (Phase 1, live)
- View all quote requests, newest first.
- Update a request's status.
- See enough detail per request to call/quote the customer without leaving
  the page.

### 6.3 Deferred to Phase 2/3
- Self-service instant pricing and payment.
- Contractor-facing job queue and claim flow.
- Multi-user permissioning (admin vs. mower logins).

## 7. Non-functional requirements

- **Privacy — this is a Phase 1 issue, not a Phase 2 one.** The quote form
  already collects name, phone, email, address, and free-text notes
  (gate codes, pets) — personal information under the Australian Privacy
  Act 1988 the moment anyone real submits it. Phase 1 ships a one-line
  data-use statement next to the form as a stopgap; a real privacy policy
  (even a short one) should exist before the link is shared beyond
  Eric testing it himself.
- **Admin access is not real security.** The `?admin` view is gated by a
  single shared passphrase embedded in the page's own source — adequate
  only to stop a casual click on the footer link, not a determined viewer.
  Every quote's full contact details and access notes are visible to
  anyone who gets past it. Do not treat this as access control once real
  customer data is flowing; Phase 2 needs real accounts with roles
  (customer / admin / mower), not a shared password.
- **Accessibility:** WCAG 2.1 AA target for the public site (keyboard
  navigation, contrast, form labels, `aria-live` on dynamic status/success
  messages) — designed against this standard in the Phase 1 build, but not
  independently audited; worth a proper accessibility pass before wide
  release.
- **Performance:** marketing site should load fast on mobile data (most
  quote requests will come from a phone).
- **Security (Phase 2+):** PCI compliance is handled by using Stripe
  directly rather than storing card details; contractor documents (ID,
  insurance) need secure, access-controlled storage.
- **Reliability (Phase 3):** dispatch/queue system needs to handle a mower
  going offline mid-job gracefully (reassignment path).

## 8. Suggested tech stack

| Layer | Phase 1 (today) | Phase 2+ (production) |
|---|---|---|
| Marketing site | Static HTML/CSS/JS (this build) | Next.js or similar, for SEO + speed |
| Data capture | Embedded document store (this build) | Postgres (e.g. via Supabase) |
| Auth | None needed yet | Supabase Auth / Auth0 (customer + mower logins) |
| Payments | — | Stripe + Stripe Connect (for mower payouts) |
| Notifications | — | Twilio (SMS) + Postmark/SendGrid (email) |
| Hosting | This artifact link (prototype) | Vercel/Netlify (site) + managed Postgres |
| Maps/address | Leaflet + Esri World Imagery + OSM Nominatim (free, key-less) | Google Places Autocomplete + Solar API, or upgraded Nominatim/imagery if volume/accuracy demands it |

## 9. Data captured today (Phase 1 quote form)

Each submission stores: name, email, phone, suburb/postcode, lawn size
band, how long since it was last mowed, service frequency, preferred day,
notes, submission timestamp, a status field and a deposit-paid checkbox the
admin view can update, and — when the customer used the map estimator —
the traced area in m² and the low/high instant price estimate shown to
them (or nothing, if the traced area was large enough to be quote-on-
request). **Retention/export:** nothing is
deleted automatically today; before migrating to Postgres in Phase 2,
export every Phase 1 submission and decide a retention period (e.g. delete
or archive completed jobs after 12 months) rather than carrying it forward
indefinitely by default.

## 10. Getting paid before Phase 2 payments exist

Phase 1 has no online payment, but Eric can take real bookings today. Until
Stripe is wired up, get paid by bank transfer or cash on the day, invoiced
manually (a simple invoice template or free tool like Wave is enough at
this volume). Keep basic records (date, customer, amount, job) from the
first paid job — needed for tax regardless of ABN/GST status (see §12).

## 11. Testing & QA approach

Phase 1 was checked by: a rendered visual review of the built page, a JS
syntax check, an end-to-end write/read check against the live data store
(a test submission was created and confirmed visible, then removed), and
an independent two-pass review (security/code correctness, and
content/business-logic) whose findings are folded into this revision. There
is no automated test suite — reasonable for a static Phase 1 site, but
Phase 2 (real money moving via Stripe, contractor data) should add at
least basic automated tests around booking and payment flows before
launch.

## 12. Budget & timeline (rough, for planning only)

Not a quote — order-of-magnitude only, to help prioritise:

| Item | Phase | Rough cost/effort |
|---|---|---|
| Domain + basic hosting | 2 | ~$20–50/yr domain, ~$0–20/mo hosting (Vercel/Netlify free tier often covers this stage) |
| Stripe fees | 2 | ~1.75%+30c per transaction (AU rate, confirm current) — no upfront cost |
| SMS (Twilio) | 2 | Pay-per-message, low volume cost is negligible early on |
| Google Places API | 2 | Free tier likely covers early volume |
| Public liability insurance | 1–3 | Varies by insurer/cover — get quotes before onboarding any third-party mower |
| Dev effort — Phase 2 (pricing + payments + notifications) | 2 | Roughly 2–4 weeks for one developer, depending on scope |
| Dev effort — Phase 3 (marketplace: onboarding, dispatch, payouts, ratings) | 3 | Roughly 6–10+ weeks; this is the biggest jump in the whole roadmap |

## 13. Competitive positioning

The Lawn Care isn't the only way to book a mow — **Airtasker** and **Hipages**
already let people post one-off lawn jobs to a marketplace of providers,
and plenty of local mowing businesses take bookings by phone or a simple
contact form. Worth deciding explicitly: what makes The Lawn Care worth choosing
over posting to Airtasker? Candidates: a faster/simpler quote flow, a
consistent known provider (Eric) rather than a stranger each time, and —
once Phase 3 ships — a curated, vetted pool rather than an open bidding
market. This positioning should shape what the marketing copy leads with
as the site matures.

## 14. Open questions for Eric

### Resolved (via business-planning discussion, 6 Sept 2026)

1. **Final service list:** ✅ Standard mow + edge/whipper-snip + hedge trim +
   green waste. Already matches the site's Services section.
2. **Pricing structure:** ✅ Band-based by lawn size, plus a surcharge for
   overgrown lawns. Implemented in `index.html`'s `PRICING` constant and the
   quote form's new "When was it last mowed?" field — see §4 and the
   Changelog for the exact bands/surcharges (based on Melbourne market
   rates researched at the time; revisit once real bookings give actual
   data).
3. **Business registration:** ✅ Sole trader, ABN 79 369 208 780.
4. **Domain:** ✅ `thelawncare.com.au` purchased (GoDaddy, registered
   6 Sept 2026, order #4179104157). The site is rebranded from "MowMate" to
   "The Lawn Care" to match. **Hosting is not yet connected** — the domain
   currently points nowhere; see §4 and `README.md` for why this needs to
   move off the Claude Artifact model.
7. **Payment processor / terms:** ✅ Bank transfer, with a deposit required
   to confirm a booking ($20 or 20% of the quoted price, whichever is
   higher, within 24 hours of accepting the quote). Implemented as
   customer-facing copy on the success panel, plus a "Deposit paid"
   checkbox in the admin view — tracking is manual until Phase 2 payments
   exist.
9. **Public liability insurance:** Explicitly deferred by Eric for now
   ("skip this for now"). Flagging again since it's cheap to say twice: the
   site still makes no insurance claims (correct, keep it that way), but
   there is genuinely no cover in place — a single property-damage incident
   before this is sorted is a real financial exposure. Revisit before
   taking jobs with any real risk (near windows/cars/pools, steep terrain).

### Still open

4. GST — expected turnover in year one, and whether to register
   voluntarily even if under the $75k threshold (affects how quotes/
   invoices are worded from the first paid job).
5. Target date/volume for expanding into Sydney — does it launch as its own
   pricing zone or identical pricing? (Site copy currently says "timeline
   not yet set" — keep it that vague until this is actually decided.)
6. Appetite and timeline for onboarding third-party mowers (Phase 3) vs.
   staying solo-operator longer — this materially changes the legal and
   insurance work required.
8. Is Eric comfortable committing to the "let us know within 24 hours and
   we'll make it right" satisfaction line as an operational promise? It's
   live on the site now — confirm or soften it.
11. **Now more urgent given the real domain purchase:** move off the Claude
    Artifact and onto real static hosting (Vercel/Netlify/GitHub Pages) so
    `thelawncare.com.au` can actually point somewhere, and so the estimator
    (needs live internet access) and the quote database (only works inside
    a published Artifact today) can both work from the same place. See
    `README.md` "Running it" and `docs/pre-live-checklist.md`.

## 15. Success metrics to track once live

- Quote requests submitted per week.
- Quote-to-booking conversion rate (once manual follow-up happens).
- Repeat booking rate (frequency customers staying on schedule).
- Time from submission to first customer contact (should trend down as
  Phase 2 automation lands).
