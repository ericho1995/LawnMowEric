# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `CNAME` file (`thelawncare.com.au`) so GitHub Pages can serve the custom
  domain directly from this repo once Pages is enabled — see
  `docs/pre-live-checklist.md` for the full go-live steps (GoDaddy DNS
  records, repo visibility trade-off, Pages settings).

### Changed
- **Admin passphrase rotated** off the `lawncare-admin` default that shipped
  with the rebrand (see `docs/pre-live-checklist.md`) — new value given to
  Eric directly rather than committed in plaintext to a doc, since the repo
  may go public for GitHub Pages hosting.
- **Visual redesign, round two — real photography instead of abstract
  gradients.** Owner feedback: "I don't like the website design, change it
  to something more modern." Hero background is now a real photo (a
  manicured, striped lawn) with a dark scrim for text contrast, instead of
  a flat gradient; hero height increased for more visual impact. Added a
  new "Our work" section — a 4-photo gallery (mowing, hedges/edging, a
  finished front yard, equipment) between Services and How-it-works.
  **Photos are stock imagery (Unsplash), not photos of Eric's actual
  jobs** — captioned generically ("A clean, even cut", "Tidy from the
  street") rather than claiming to be specific completed work, and should
  be swapped for real job photos once Eric has some. Section backgrounds
  across the page rebalanced for a consistent alternating rhythm now that
  there are more sections.
- **Rebrand: "MowMate" → "The Lawn Care".** Eric purchased the domain
  `thelawncare.com.au` and decided to rebrand rather than change the
  domain. Every customer-facing "MowMate" reference is updated (title,
  header, hero copy, trust section, footer, admin passphrase, email
  fallback subject line). The admin passphrase changed as a side effect —
  see `docs/pre-live-checklist.md` to set your own before sharing the site.
  Historical changelog entries below are left as "MowMate" since that was
  the accurate name at the time.
- **Real pricing model, replacing the placeholder.** Based on Melbourne
  market research (Airtasker listings, Sept 2026): base price by lawn size
  (small/medium/large bands, extra-large is quote-on-request), no more
  linear per-m² rate. Lawn-size bands on the quote form and in the
  estimator's auto-fill logic updated to match: small (<150m²), medium
  (150–400m²), large (400–800m²), extra-large (800m²+).
- **Quote form:** added "When was it last mowed?" — Eric's idea, to
  eventually charge a surcharge for overgrown lawns (0–2wk / 2–4wk / 4–8wk
  / 8+wk bands). Captured on every submission and shown on the admin lead
  card; not yet factored into the instant map-estimator price (that stays
  area-only) — the estimator's disclaimer now says so explicitly so
  customers aren't surprised by a higher confirmed price.
- **Deposit-for-booking:** quote success panel now tells customers a
  deposit (bank transfer, due within 24h of accepting a quote) is required
  to confirm their booking. Admin view gained a "Deposit paid" checkbox per
  lead, persisted alongside status.
- **Visual redesign — de-greened the palette.** Owner feedback: the site
  "looks too green and looks off." Green had become the default accent
  everywhere (hero background stripes, all service icons, all 10 suburb
  chips, form focus rings, step numbers) instead of a deliberate brand
  touch. Rebalanced so orange (`--accent`) is the one interactive/highlight
  color across buttons, links, badges, and stat labels; green is now used
  in exactly three meaningful places: the logo mark, the "booking now" live
  dot, and the quote-success checkmark. The hero's loud repeating-stripe
  green background is replaced with a warm dark gradient plus a soft
  orange glow. Text colors (`--text`, `--text-muted`) also lost their
  slight green tint in favor of neutral warm charcoal/gray. New
  `--accent-dark` variable added for text-on-light accent use (labels,
  links) where the old code reused `--primary-dark` (green) by default.
- **Lawn-size estimator UX overhaul.** Owner feedback: the map drawing
  tool "isn't easy to use." The default leaflet.draw toolbar (tiny
  unlabeled icons stacked on the map corner) is replaced with big labeled
  buttons below the map ("Trace my lawn shape", "Draw a simple rectangle",
  "Undo last point", "Clear drawing"), a numbered 2-step layout ("1. Find
  your address" / "2. Trace your lawn"), and plain-English inline
  instructions instead of relying on the plugin's tiny on-map tooltip
  alone. Clicking a drawn shape now opens a "Remove this shape" popup
  instead of requiring the old tiny edit-toolbar trash icon. Starting a
  trace now auto-zooms to a minimum close-in zoom level first — drawing at
  a zoomed-out view previously produced wildly inflated area readings
  (confirmed during testing: a rectangle drawn at city-wide zoom read as
  4.3 million m²).

### Added
- **Reviews section**, placed just before the quote form (classic
  social-proof-before-CTA position). Currently shows an honest "no reviews
  published yet" state — deliberately **not** populated with fabricated
  testimonials. A new business with zero completed jobs claiming customer
  quotes would be a fake-review problem (the ACCC actively enforces
  against this in Australia), and this project already had to walk back
  one overreaching claim before (see the `[0.2.0]` entry below). The
  markup includes a commented-out real-review template so dropping in
  genuine reviews later is a one-block copy-paste.
- **Privacy policy page** (`privacy.html`), linked from the footer next to
  the existing data-use line. Covers what's collected (including the map
  estimator's use of OpenStreetMap/Esri), what it's used for, how long it's
  kept, and that no card payments are processed through the site.
- `docs/pre-live-checklist.md` — a business/hosting/content checklist
  before pointing the real domain at this site.
- **Lawn-size estimator:** customers can search their address, trace their
  lawn's outline on a satellite map, and get an instant traced area
  (m² / sq ft) plus a ballpark price range for a standard mow. Built with
  a free, key-less stack (Leaflet + Esri World Imagery + OpenStreetMap
  Nominatim geocoding + Turf.js for geodesic area) so it runs without a
  paid API account. The result auto-fills the quote form's lawn-size field
  and is carried through into every quote submission (visible on the
  admin lead card and in the email fallback).
- `<meta charset="UTF-8">` — the page was missing an explicit charset
  declaration; harmless with plain ASCII copy, but the estimator's new
  em/en dashes and emoji exposed it as mojibake when served without a
  server-set charset. Fixed at the source so it's correct regardless of
  how the file is hosted.
- `scripts/serve.ps1` + `.claude/launch.json`: a zero-dependency local
  static server (plain PowerShell `HttpListener`) so the site can be
  previewed at `http://localhost:8791` on a Windows machine without
  Python or Node installed — needed now that the estimator makes real
  network calls that some browsers block from a bare `file://` page.

### Known limitation (documented, not fixed here)
- The lawn-size estimator needs outbound network access (map tiles,
  geocoding) that the Claude Artifact sandbox blocks, while the quote
  form's live database only works *inside* a published Artifact. The two
  features can't both be live in the same hosting context yet — see
  `README.md` and `docs/requirements.md` §4 for the trade-off and the
  recommended path (move to real static hosting).
- Same trade-off now also applies to the hero and gallery photos: they're
  hotlinked from `images.unsplash.com`, which a published Claude Artifact
  also blocks (only same-origin/data-URI images render there). They load
  fine from real static hosting or this repo's local dev server — one more
  reason `docs/pre-live-checklist.md`'s hosting item is the priority.

## [0.2.0] - 2026-09-05

Prompted by an independent two-agent review (security/code correctness,
and content/business-logic) run against v0.1.0. See the review notes in
the pull request / commit for full findings; summary of what changed:

### Fixed
- **Security:** admin job-queue rows no longer interpolate `status` or
  document id into HTML unescaped (stored-XSS risk if a doc's fields were
  ever written outside the normal form).
- **Security:** admin view (`?admin`) now sits behind a passphrase gate
  instead of being open to anyone who clicks the footer link. Documented
  clearly (in-page and in the requirements doc) that this is a stopgap,
  not real authentication.
- Status-update failures in the admin queue now roll back the dropdown and
  show an inline error instead of silently doing nothing.
- The email-fallback link (shown when live capture is unavailable) no
  longer accumulates duplicate links on repeated failed submits, and now
  points at a real, monitored address instead of an unregistered domain.
- Admin status `<select>` elements are now properly associated with their
  `<label>` via `for`/`id`.
- Raised `.status-Contacted` text color contrast to meet WCAG AA.

### Changed (copy — corrected overreaching claims)
- Removed the unverified "insured & vetted" and "identity-checked" claims
  from the trust section — Phase 1 is a solo operator with insurance
  status not yet confirmed; the copy now says what's actually true today
  and states the vetting promise as a future commitment, not a present
  fact.
- Softened hero copy that implied an existing pool of mowers ("often Eric
  himself") to reflect that Eric personally does every job today.
- Softened the pricing trust card from an unqualified "flat pricing" claim
  (pricing model is still an open decision, see requirements doc) to
  "clear pricing, confirmed before you book."
- Sydney service-area chips no longer list specific sub-regions as
  "coming soon" (no timeline has actually been decided) — replaced with a
  single "timeline not yet set" indicator.
- Expanded the quote form's data-use line ("never shared or sold").

### Added
- `aria-live`/`role="status"` on the quote form's status message and
  success panel so screen reader users hear submission outcomes.

### Documentation
- Requirements doc: moved the privacy-notice requirement from "Phase 2+"
  to Phase 1 (data is being collected now); added sections on testing/QA
  approach, rough budget & timeline, competitive positioning (Airtasker/
  Hipages), data retention, and how to get paid before Stripe exists;
  added GST and insurance-confirmation questions to the open-questions
  list.

## [0.1.0] - 2026-09-05

### Added
- Initial MowMate Phase 1 site: hero, services, how-it-works, service area
  (Melbourne live / Sydney coming soon), quote request form, trust section,
  footer.
- Admin job queue view (`?admin`) with per-request status tracking (New /
  Contacted / Scheduled / Completed).
- Quote form wired to a live data store (via the Claude Artifact `db`
  capability) with a graceful email-draft fallback when that store is
  unavailable.
- Requirements document (`docs/requirements.md`) covering business model,
  user roles, Phase 1 MVP scope, Phase 2/3 roadmap, non-functional
  requirements, suggested tech stack, and open decisions for the owner.
