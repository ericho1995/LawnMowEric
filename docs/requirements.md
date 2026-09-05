# MowMate — Requirements & Technical Plan

**Prepared by:** Claude, acting as consultant / tech lead
**Date:** 5 September 2026 (v1.1 — updated after independent review)
**Owner:** Eric
**Status:** Draft — Phase 1 (MVP) built, Phases 2-3 scoped for review.
See `CHANGELOG.md` for what changed between doc/site revisions.

---

## 1. Business overview

MowMate is an online lawn mowing service. The long-term model is a two-sided
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
  complete jobs, with MowMate taking a margin or referral fee.

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
- Public marketing site: hero, services, how-it-works, service area
  (Melbourne live, Sydney flagged "coming soon"), trust section, footer.
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

**Explicitly NOT in Phase 1:**
- Payment processing / online checkout.
- Contractor accounts, onboarding, or job claiming.
- Automated price quoting (the form captures inputs; Eric prices manually
  and follows up).
- SMS/email confirmation automation.
- A real domain, business registration, or production hosting — this is a
  working prototype Eric can share, refine, and hand to a developer or
  no-code platform for production hardening.

## 4. Phase 2 — quoting & payments (proposed next)

- **Instant price engine:** rules-based quote (lawn size × frequency ×
  service type → price) replacing manual follow-up.
- **Online payment:** Stripe (AU-native, handles card + Apple/Google Pay)
  charged on booking or on job completion.
- **Automated notifications:** email/SMS confirmation, reminder before the
  scheduled mow, receipt after completion (e.g. Postmark or Twilio SendGrid
  for email, Twilio for SMS).
- **Address autocomplete:** Google Places API so customers pick a real,
  validated address instead of free-text.
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
- **Payouts:** MowMate collects payment from the customer, takes a
  commission, pays the mower out (Stripe Connect is the standard tool for
  this split-payment model).
- **Insurance & liability framework:** clear terms on who is liable for
  property damage — almost certainly needs a written agreement with each
  mower and a small business insurance policy for MowMate itself. **Legal
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
| Maps/address | Free-text suburb | Google Places Autocomplete API |

## 9. Data captured today (Phase 1 quote form)

Each submission stores: name, email, phone, suburb/postcode, lawn size
band, service frequency, preferred day, notes, submission timestamp, and a
status field the admin view can update. **Retention/export:** nothing is
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

MowMate isn't the only way to book a mow — **Airtasker** and **Hipages**
already let people post one-off lawn jobs to a marketplace of providers,
and plenty of local mowing businesses take bookings by phone or a simple
contact form. Worth deciding explicitly: what makes MowMate worth choosing
over posting to Airtasker? Candidates: a faster/simpler quote flow, a
consistent known provider (Eric) rather than a stranger each time, and —
once Phase 3 ships — a curated, vetted pool rather than an open bidding
market. This positioning should shape what the marketing copy leads with
as the site matures.

## 14. Open questions for Eric (decisions needed before Phase 2)

1. Final service list and any exclusions (e.g. no ride-on mower jobs, no
   commercial/strata properties)?
2. Pricing structure — flat bands by lawn size, or per-square-metre rate?
3. Business registration status — sole trader with an ABN, or a company?
   (Affects invoicing, contracts with mowers, insurance — and this is
   already relevant now that the site is live and taking real names/trading
   as "MowMate.")
4. GST — expected turnover in year one, and whether to register voluntarily
   even if under the $75k threshold (affects how quotes/invoices are worded
   from the first paid job).
5. Target date/volume for expanding into Sydney — does it launch as its own
   pricing zone or identical pricing? (Site copy currently says "timeline
   not yet set" — keep it that vague until this is actually decided.)
6. Appetite and timeline for onboarding third-party mowers (Phase 3) vs.
   staying solo-operator longer — this materially changes the legal and
   insurance work required.
7. Preferred payment processor and whether card-on-file recurring billing
   is wanted for repeat customers.
8. Is Eric comfortable committing to the "let us know within 24 hours and
   we'll make it right" satisfaction line as an operational promise? It's
   live on the site now — confirm or soften it.
9. Public liability insurance — does Eric have it in place today? The site
   no longer claims blanket insurance/vetting (that was corrected — see
   `CHANGELOG.md`), but this should be resolved for real before any paid
   job, independent of what the marketing copy says.

## 15. Success metrics to track once live

- Quote requests submitted per week.
- Quote-to-booking conversion rate (once manual follow-up happens).
- Repeat booking rate (frequency customers staying on schedule).
- Time from submission to first customer contact (should trend down as
  Phase 2 automation lands).
