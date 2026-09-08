# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added — critical-review follow-up: SEO, real admin backend, spam protection, phone number
- **`robots.txt` + `sitemap.xml`** at the repo root — the site had zero
  crawler guidance before this; GitHub Pages was serving 8 public pages
  with nothing telling Google they existed.
- **Meta descriptions, canonical URLs, Open Graph and Twitter Card tags on
  every public page**, plus a `LocalBusiness` JSON-LD block on `index.html`
  (name, phone, service area, address locality — no street address, since
  this is a mobile service business, not a storefront). None of this
  existed before — links shared in Facebook groups or Airtasker replies
  rendered as bare URLs with no preview, and the site had no structured
  data for Google to understand it's a local business.
- **`<!DOCTYPE html>` + `<html lang="en">`** added to every page (previously
  missing entirely — browsers were silently error-correcting this via
  HTML5 parsing rules, but it's invalid markup and `lang` matters for
  screen readers).
- **Skip-to-content link** on every page (`.skip-link` in `styles.css`) —
  was flagged as a missing accessibility basic.
- **Custom `404.html`** at the repo root — GitHub Pages serves this
  automatically for any unmatched URL instead of a bare unstyled 404.
- **Real admin backend** (`docs/apps-script/Code.gs`, a Google Apps Script
  Web App + Google Sheet) replacing `admin.html`'s dependency on the Claude
  Artifact `db` capability, which never worked on real hosting — the admin
  view has been silently non-functional on `thelawncare.com.au` since the
  move to GitHub Pages. This also removes the hardcoded admin passphrase
  that was sitting in plaintext in this now-public repo: the real
  passphrase now lives only in the Apps Script's own Script Properties
  (server-side, never committed anywhere) and admin.html just forwards
  whatever's typed for the script to check. **Requires one-time setup by
  Eric** — see the Script's header comment and the updated
  `pre-live-checklist.md`; until `GAS_WEBHOOK_URL` is pasted into
  `quote.html`/`admin.html`, both fall back to the previous behavior
  (FormSubmit email, and an explicit "not connected yet" admin message)
  with no regression.
- **Honeypot spam field** (`_honey`) on the quote form — the form had zero
  bot protection (`_captcha: false`, no honeypot) and was about to go
  live and get indexed.
- **Phone number** (0402 764 211, Eric's) added site-wide — nav (tablet/
  desktop), homepage hero, quote page, footer on every page, privacy
  page, and the `LocalBusiness` schema. The site previously had no phone
  contact path at all, only a next-business-day form.
- **Google Analytics (GA4) snippet** on every public page, with a
  placeholder Measurement ID (`G-XXXXXXXXXX`) — harmless as shipped (loads
  and no-ops), needs a real ID from Eric's own GA4 property to actually
  collect data. See checklist.

### Changed — logo now used in the nav/footer, not just the favicon
- The header/footer "logo-mark" on all 8 pages that have one was an
  inline hand-drawn SVG + CSS striped-gradient background, duplicated
  in every file. Replaced with `<img src="assets/logo-icon.svg">` —
  the same standalone logo file added earlier as the favicon — so the
  visible nav/footer logo and the browser-tab icon are now the same
  actual asset instead of two separate hand-maintained copies of the
  same design.

### Changed — owner name removed from public copy, pricing bump, hedging special
- **Removed "Eric" from all public-facing site copy** (owner request) —
  replaced with "we/our" or "the same person/operator" across `index.html`,
  `services.html`, `quote.html`, `how-it-works.html`, `work.html` and
  `airtasker.html`, keeping the existing "one person, not a rotating
  subcontractor" promise intact, just without a name attached. Left
  untouched: the private `admin.html` passphrase (`Mowtown-Eric-2026!` —
  not public copy, ask if you want it changed too) and internal code
  comments in `quote.html` (never rendered to visitors) and the
  project's own internal docs/CHANGELOG (project history, not site copy).
- **Hedge trimming special offer.** Added a "🌿 Special offer" ribbon +
  "Intro rate" badge to the hedge trimming card on `services.html`
  (owner: still building hedging experience, wants a discounted rate
  while doing so) and updated the quote form's hedge checkbox label to
  match. No fixed price shown — same "ask when you quote" pattern as
  before, just now explicitly framed as a discount.
- **Pricing increased.** Mow bands: Small $50–65 → **$55–70**, Medium
  $70–90 → **$75–95**, Large $95–130 → **$105–140**. Subscription
  $75/mo → **$85/mo**. Add-ons (edging, green waste) $15–25 →
  **$18–28**. Updated everywhere the old numbers appeared: `services.html`
  pricing table/cards, `quote.html`'s estimator `PRICING` bands and the
  subscription dropdown option.
- **Homepage "Standard mow" card now links to `quote.html`.** Previously
  a static, non-interactive card in the services teaser grid — added
  `a.service-card` hover/style rules to `styles.css` so it reads as
  clickable. The other two teaser cards (Edge & whipper snip, Hedge &
  green waste) were left as static cards — not asked for, and they
  don't have their own dedicated page to send someone to.
- **`work.html` gallery is now a rotating carousel** with 2 new verified
  photos (4 total): North Wollongong NSW (close-up cut grass) and a
  Victoria, Australia backyard shot (Australian magpie on a mowed lawn)
  — both geotag-verified via Unsplash's own location metadata, no
  vehicles or identifiable people. Auto-rotates every 4.5s, pauses on
  hover/focus, with prev/next arrows and dot navigation. Plain
  vanilla-JS carousel, no library, consistent with the rest of the site.

### Added — branding, address search, mapping investigation
- **`assets/logo-icon.svg`** — standalone logo file (mown-lawn stripe
  badge + grass/mow-line icon, matching the existing in-page nav mark)
  wired up as the favicon on all 10 pages. No Gemini/image-gen MCP
  connector is available in this environment, so this is a hand-built
  vector logo rather than AI-generated art — connect an image-gen
  connector at claude.ai's connector settings if AI-generated art is
  specifically wanted later.
- **Address autocomplete on `quote.html`.** Typing in the address field
  now debounces (400ms) a Nominatim lookup and shows a dropdown of up
  to 5 matching addresses (keyboard nav + click to select), instead of
  requiring "Find address" or Enter with an exact/complete address.
- **`map-prototype-maplibre.html`** — local-only (not linked, `noindex`)
  prototype swapping Leaflet for MapLibre GL JS (WebGL renderer, same
  free/keyless Esri satellite imagery, no API key or account needed).
  Built to evaluate whether a different map engine gives a smoother
  pan/zoom feel than Leaflet and simplifies the auto-highlight tool
  (reads pixels directly off the rendered WebGL canvas instead of
  Leaflet's tile-stitching approach — the mechanism behind September's
  invisible-highlight bug). Code verified sound (WebGL context creates
  cleanly, no MapLibre errors fire, direct `fetch()` to the Esri tile
  server succeeds) but tile rendering could not be visually confirmed
  inside the sandboxed preview browser used for testing — MapLibre never
  issued a single tile request there, for reasons unrelated to the code
  (isolated with a second, minimal from-scratch map instance). Needs a
  real desktop browser to properly evaluate before deciding.
- **Gallery photo swap.** Replaced the `work.html` photo of a ride-on
  tractor mower on a sports oval (owner: "no big vehicles") with a
  verified Gold Coast QLD front lawn — no vehicles, just a mowed lawn.

### Added — marketing
- **`airtasker.html`** — landing page for traffic arriving via Airtasker
  (profile link / task replies). Reassures repeat Airtasker customers
  it's the same operator and pitches booking direct next time to skip
  the platform fee. `noindex`ed and not linked from the main nav/footer
  on purpose — it's meant to be reached only via the URL Eric puts in
  his Airtasker profile/replies, not discovered by site visitors or
  search engines as a separate page.
- **`docs/marketing-plan.md`** — internal (unlinked) marketing plan:
  Airtasker channel workflow (incl. turning on Airtasker's own Task
  Alerts for instant notification of nearby lawn-mowing tasks — the
  legitimate, ToS-compliant version of "tell me when someone nearby
  wants a mow"), a ranked list of other free/low-cost channels (Google
  Business Profile, Facebook groups/Marketplace, Nextdoor, Gumtree,
  referrals, flyers), and an explicit "why no bots" note: scraping or
  auto-posting on Airtasker/Facebook/Nextdoor violates their ToS and
  risks an account ban, so every alert mechanism recommended is each
  platform's own native notification feature instead.

### Fixed
- **Auto-highlight greenery tool was invisible.** The overlay canvas was
  drawing correctly the whole time (confirmed via pixel inspection) but
  sat at `z-index: 399` while Leaflet's own `.leaflet-map-pane` sits at
  `z-index: 400` — one level higher, so the highlight rendered underneath
  the visible map tiles. Bumped to `z-index: 450`. Caught from direct
  owner feedback ("I'm seeing nothing") rather than my own testing, which
  had only checked that the area number came out correct, not that the
  highlight was actually visible — worth remembering for next time.

### Changed
- **FAQ: home-visit answer corrected.** Previously implied you never need
  to be home. Now distinguishes street/side-gate access (no) from access
  that requires going through the garage or house itself (yes, you need
  to be home or arrange access).
- **FAQ: refund policy clarified.** "We'll make it right" was ambiguous
  about whether that included a refund. Now explicit: no refunds, only
  coming back to fix the job.
- **Removed the pricing section from the home page** (owner: "looks
  bad") — full pricing still lives on `services.html`, linked from the
  Services teaser ("See services & pricing →") instead of being
  duplicated on the home page.

### Changed — services/pricing clarity + competitor-informed additions
- **Clear included-vs-extra split on `services.html`.** Owner feedback:
  the three service cards read as equal parallel options with no
  indication that only the standard mow is what you're paying for.
  Restructured into one "Included in every quote" card (Standard mow)
  followed by a separate "Optional add-ons" section with visible "+$"
  pricing on each (Edge & whipper snip, Hedge trimming, Green waste
  removal) — add-on prices are typical-rate placeholders, confirm before
  relying on them. Edging's old "Bundled with any mow" line was actively
  wrong given the new instruction that it costs extra — removed.
- **Quote form:** added explicit add-on checkboxes (Edge & whipper snip,
  Hedge trimming) mirroring MOW NOW's "select all applicable" pattern
  (checked via direct competitor visit, see below) instead of relying on
  the free-text "Anything else?" field to catch these. Added a separate
  checkbox near the end of the form — "I don't have my own green waste
  bin" — deliberately with **no dollar figure shown on the form itself**
  per instruction; the fee is confirmed by Eric when he quotes, not
  advertised upfront. Both flow into the FormSubmit email and the
  admin.html lead card.
- **Added a specials banner**: "$10 off your first mow" on the home page
  and a matching line on the quote page. **This $10 figure is one I
  picked, not something Eric specified** — flagging clearly since it's
  exactly the kind of number this project has a habit of getting wrong by
  assumption (see the subscription price a few entries up). Confirm or
  change it before this goes live.
- **Added an FAQ section** to `services.html` (do I need to be home, rain
  policy, payment, dissatisfaction, subscription cancellation) — all
  answers restate facts already established elsewhere on the site, no
  new claims invented.
- Competitor research behind these changes: visited MOW NOW
  (mownow.com.au — multi-select add-on checkboxes on their quote form,
  FAQ block near pricing, before/after photo storytelling) and Jim's
  Mowing (jimsmowing.com.au — real testimonials at their scale, a
  quote-and-win promotion, confirming specials/promos are normal in this
  market). Not copied wholesale — used to sanity-check which of these
  patterns actually fit a solo, pre-launch operator versus which only
  make sense at franchise scale (e.g. skipped fabricated review counts
  and award badges, which would be false claims here).

### Changed — multi-page rebuild
- **Split the single `index.html` into a real multi-page site.** Owner
  feedback: nav links should go to their own page instead of scrolling
  down a long one. Now: `index.html` (home), `services.html`,
  `work.html`, `how-it-works.html`, `service-area.html`, `reviews.html`,
  `quote.html` (estimator + form), `admin.html` (job queue, no longer
  toggled via `?admin` on the home page), plus the existing
  `privacy.html`. Shared CSS moved to `assets/styles.css`; the
  maintenance kill-switch moved to `assets/kill-switch.js`, included on
  every public page (not `admin.html`, so leads stay manageable during an
  outage). This is a bigger structural change than anything else in this
  file so far — test thoroughly before relying on it.
- **Pricing:** added a $75/month "Mow & Forget" subscription tier
  alongside the existing per-visit bands, shown on the home page and in
  full on `services.html`. **This number is Eric's own figure from
  conversation, not researched like the per-visit bands** — sanity-check
  it covers costs for the size range it's scoped to (up to ~400m²) before
  relying on it.
- **"Our work" gallery:** removed the hedge-themed photo per Eric's
  request (kept hedge trimming as a service — this was about the photo,
  not the offering) and replaced the whole set with only images verified
  to be actually shot in Australia (checked each candidate's location
  metadata on Unsplash rather than trusting alt text/search relevance,
  which would happily return non-Australian photos) — Newcastle NSW and
  Revesby NSW. Hero photo swapped to a verified Perth (Kings Park) shot
  for the same reason. Fewer, verified-genuine photos over a fuller but
  unverified set.
- Added an "arrival & departure updates, before/after photos" trust
  bullet and a dedicated callout on `services.html` — an operational
  commitment Eric makes personally (texting customers), not an automated
  notification system; worded to avoid implying otherwise.

### Added
- **Experimental "Auto-highlight greenery" map tool** on `quote.html`,
  alongside the existing manual Trace/Rectangle tools (not a replacement
  for them). Click once on the lawn in the satellite view and it
  flood-fills the connected green-colored region from that point using a
  simple RGB heuristic (canvas pixel read, capped at 150k pixels), then
  converts the pixel count to m² via the standard Web Mercator
  meters-per-pixel formula at the map's current center/zoom. This needed
  `crossOrigin: true` on **both** Esri tile layers (imagery and the
  labels overlay) — missing it on just one still taints the canvas and
  breaks `getImageData` for the whole thing, which is exactly what
  happened on the first attempt and was caught in testing. Clearly
  labeled "(beta)" in the UI since color-based detection can't verify
  against an actual property boundary — a shadow, a green roof, or a
  neighbor's connected lawn can all throw it off. Falls back to a plain
  error message (not a broken state) if canvas reading is unavailable in
  a given browser.
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
