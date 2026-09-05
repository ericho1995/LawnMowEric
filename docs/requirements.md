# MowMate — Requirements & Technical Plan

**Prepared by:** Claude, acting as consultant / tech lead
**Date:** 5 September 2026
**Owner:** Eric
**Status:** Draft v1 — Phase 1 (MVP) built, Phases 2-3 scoped for review

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

- **Privacy:** customer contact details and addresses are personal
  information under the Australian Privacy Act 1988 — Phase 2+ needs a
  privacy policy and a clear statement on how data is stored/used,
  especially once payment and contractor-sharing are involved.
- **Accessibility:** WCAG 2.1 AA target for the public site (keyboard
  navigation, contrast, form labels) — met in Phase 1 build.
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
status field the admin view can update.

## 10. Open questions for Eric (decisions needed before Phase 2)

1. Final service list and any exclusions (e.g. no ride-on mower jobs, no
   commercial/strata properties)?
2. Pricing structure — flat bands by lawn size, or per-square-metre rate?
3. Business registration status — sole trader with an ABN, or a company?
   (Affects invoicing, contracts with mowers, and insurance.)
4. Target date/volume for expanding into Sydney — does it launch as its own
   pricing zone or identical pricing?
5. Appetite and timeline for onboarding third-party mowers (Phase 3) vs.
   staying solo-operator longer — this materially changes the legal and
   insurance work required.
6. Preferred payment processor and whether card-on-file recurring billing
   is wanted for repeat customers.

## 11. Success metrics to track once live

- Quote requests submitted per week.
- Quote-to-booking conversion rate (once manual follow-up happens).
- Repeat booking rate (frequency customers staying on schedule).
- Time from submission to first customer contact (should trend down as
  Phase 2 automation lands).
