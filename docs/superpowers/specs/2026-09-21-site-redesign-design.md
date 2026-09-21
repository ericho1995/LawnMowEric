# Site redesign, build system and conversion features — design

**Date:** 21 September 2026 · **Status:** approved by Eric in chat · **Branch:** `site-redesign`

## Problem

The public site looks dated and is missing features that keep visitors on it
and turn them into quote requests. Root causes found in the audit:

1. **No mobile navigation.** `nav.links` is `display:none` below 900px with
   nothing replacing it, so on a phone every nav link disappears.
2. **Hand-duplicated chrome.** Each of the 17 HTML files carries its own copy
   of the head, header, footer and GA snippet. Fixes land in some pages and
   not others; the GA placeholder survived on all 17.
3. **Unmeasured and leaky lead capture.** GA4 uses `G-XXXXXXXXXX`. The
   FormSubmit call treats any HTTP 200 as success, but FormSubmit answers an
   un-activated form with `200 {"success":"false"}`, so a customer can see
   "request received" while nothing reaches Eric.
4. **Missing conversion features:** no sticky mobile CTA, no local landing
   pages, no structured FAQ data, "preferred day" instead of a real date.
5. **Dated execution of a good brand:** rounded Fredoka display face, 28px
   radii everywhere, emoji in headings, four sections built from the same
   three-card grid.

## Decisions (made with Eric)

| Question | Decision |
|---|---|
| Visual direction | Fresh redesign keeping the forest-green / cream / gold brand. Delete the unshipped `*-prototype.html` set. |
| Features | Mobile menu + sticky quote bar; suburb landing pages + FAQ schema; booking calendar + confirmation. **Not** moving the map estimator to the homepage. |
| Trust content | Build review and before/after slots with honest empty states. Nothing fabricated. |
| Contact | Quote form stays the only public contact path (commit `7343c8d` removed the phone number deliberately). No tap-to-call. |
| Build | Zero-dependency Node build from `src/` to flat static HTML at the repo root. GitHub Pages config unchanged. |

## Architecture

```
src/
  site.config.mjs        business facts, GA id, backend URLs, booking rules
  data/faqs.mjs          FAQ content: rendered visibly and as FAQPage JSON-LD
  data/suburbs.mjs       per-suburb facts and copy for landing pages
  partials/header.html   one header + mobile menu for every page
  partials/footer.html   one footer
  pages/*.html           page bodies with a small front-matter block
scripts/
  build.mjs              composes pages -> repo root; generates sitemap.xml
  check.mjs              link integrity + page-level SEO/markup assertions
assets/
  css/site.css           new design system (replaces styles.css)
  js/site.js             mobile menu, sticky bar, reveal, analytics events
  js/booking.mjs         pure booking-date rules (unit tested)
  js/quote.js            quote form, booking picker, submission paths
  js/estimator.js        map estimator, moved verbatim out of quote.html
```

- **Front matter** (`key: value` lines between `---` fences) sets title,
  description, output path, current nav item, robots, extra stylesheets,
  scripts and breadcrumb label.
- **Tokens** in page bodies: `{{root}}` (relative prefix for the page's
  depth), `{{faq:<set>}}`, `{{suburb-links}}`, `{{config.<key>}}`.
- **Suburb pages** are generated from `data/suburbs.mjs` into
  `lawn-mowing/<slug>.html`. Every internal URL goes through `{{root}}`, so
  depth is handled in one place.
- **404.html** uses root `/` because GitHub Pages serves it at arbitrary
  depths. `kill-switch.js` resolves `status.txt` relative to its own URL, so
  it keeps working in subdirectories.
- **Generated files** start with a "GENERATED — edit src/..." comment.
  `.github/workflows/check.yml` rebuilds on push and fails if the committed
  output is stale or the checks fail. Pages deployment is unchanged.
- **GA** is emitted only when `gaMeasurementId` is a real ID. Events:
  `generate_lead` on successful submit, `quote_start` on first form
  interaction, `cta_click` on tagged buttons.
- `admin.html` is built with a bare layout so it shares the backend URL
  from config. `airtasker.html` stays noindex.

## Visual system

- **Signature:** the logo's own mowing stripes, scaled up into the hero and
  echoed once in the closing CTA. Nothing else competes with it.
- **Type:** Archivo (variable width axis) set heavy and slightly expanded
  for headings — signwriting on a ute, not an editorial serif — with
  Manrope for body text. *Revised from Fraunces during the design pass:
  cream ground + high-contrast serif is the most generic generated-site
  look, and this brand's cream is fixed, so the type had to move instead.*
- **Colour** (taken from the logo): Paddock `#1D3526` for dark sections,
  Fairway `#3E6B44` for actions, Rough `#22392A` as the second stripe
  colour, Cream `#F7F5EA` as the ground, Straw `#C98A2B` only for prices
  and the offer. Keep and refine the dark mode.
- **Shape:** radii 4/8/12px (sturdy, not bouncy); hairline rows and
  dividers instead of card grids. Cards only for real objects: the price
  "job sheet" and the quote form.
- **Rhythm:** 8px spacing scale, a fluid type scale via `clamp()`, 1200px
  content width, 16px minimum mobile gutter, no horizontal scroll.
  Left-aligned throughout.
- **No template chrome:** no tracked-out eyebrow labels over headings, no
  emoji in headings, no "→" appended to links.
- **Motion:** one orchestrated moment — a mower pass wipes the hero on load
  to reveal the stripes. No scroll-reveal on every section. Nothing moves
  under `prefers-reduced-motion`.

## Features

### Mobile menu and sticky bar
- Below 900px a menu button opens a full-height panel with `aria-expanded`
  and `aria-controls`. Esc closes it, focus is trapped while open and
  returns to the button on close, and body scroll is locked.
- Sticky bottom bar (mobile only) with "Get a free quote" and "Prices".
  It appears once the hero is off-screen (IntersectionObserver) and is
  hidden on `quote.html`, where it would compete with the form. It
  respects the iOS safe-area inset.

### Suburb pages and structured data
- One page for each listed suburb (the 10 in the current service area).
  Each has distinct copy: postcode, council, typical housing and lawn
  profile, the price band most yards there are likely to fall into
  (framed as "likely", not as a claim of past jobs), nearby served
  suburbs, a local FAQ and a quote CTA with the suburb prefilled via
  `?suburb=`.
- `service-area.html`, the homepage and the footer link to every suburb
  page, and all of them go in the sitemap.
- JSON-LD: `LocalBusiness` sitewide (home), `BreadcrumbList` on inner
  pages, `FAQPage` wherever FAQs are visibly rendered, and `Service` with
  price offers on the services page.
- **Expectation:** since 2023 Google shows FAQ rich results only for
  authoritative government and health sites. FAQPage markup still helps
  machine understanding, but it will not produce expandable FAQ results
  for this site. Breadcrumb markup still earns rich results.

### Booking request picker
- Replaces "Preferred day". It shows the next `horizonDays` of bookable
  dates, starting at `leadDays` from today (Melbourne time), on working
  weekdays from config and skipping blackout dates. The customer picks a
  date and a window (Morning / Afternoon) or ticks "I'm flexible".
- Copy is explicit throughout: this is a **requested** time, which we
  confirm or counter-offer within one business day. It is never presented
  as a locked booking.
- When the Apps Script backend is configured, the page calls
  `GET ?action=availability` and disables windows at capacity (open
  requests per slot >= `SLOT_CAPACITY`). It returns counts only, no
  personal data. Without the backend, the page falls back to rules only.
- The success panel restates the requested slot and the next steps
  (confirmation, deposit).
- **Confirmation email:** Apps Script path uses `MailApp` to email the
  customer. FormSubmit path uses `_autoresponse`.

### Lead-capture fixes
- FormSubmit success now requires `json.success === "true"`. Anything
  else falls through to the existing mailto fallback, so an un-activated
  form never shows a false "received".
- Submit is disabled while sending, input is validated client-side with
  inline messages, and the suburb is prefilled from `?suburb=`.

### Trust slots
- Review cards and a before/after comparison component, each with an
  honest empty state and a commented drop-in point.
- The services-page before/after slider built from two unrelated stock
  photos is removed (it implied a real job). Stock imagery stays only as
  labelled atmosphere.

## Content changes
- Emoji removed from headings, eyebrows and banners.
- The FAQ deposit answer is fixed to "$20 or 20% of the quote, whichever is
  higher" (the current copy drops the $20).
- The privacy policy is updated to match what the site actually does:
  FormSubmit email relay, Google Apps Script/Sheets when enabled, Google
  Analytics when enabled, and Vicmap boundary lookup. Flagged for Eric to
  read.

## Testing
- `node scripts/build.mjs` is deterministic: a second run produces no diff.
- `node scripts/check.mjs` checks that every internal `href`/`src` resolves
  to a file; that each page has exactly one `<h1>`, a title, a meta
  description and a canonical URL; that no `{{` tokens, `G-XXXXXXXXXX`
  or `-prototype` links remain; and that every JSON-LD block parses.
- Unit checks for booking-date generation (lead time, weekdays, blackouts,
  Melbourne timezone), run through `node --test`.
- Browser verification at 375px and 1280px: the mobile menu (open, Esc,
  focus), the sticky bar show/hide, the booking picker, the quote form
  validation and fallback path, and dark mode.

## Out of scope
Online payments, customer accounts, real calendar sync, moving the estimator
to the homepage, `map-prototype-maplibre.html` (left untouched), and any
change to GitHub Pages settings.
