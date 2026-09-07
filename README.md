# The Lawn Care

Online lawn mowing business — customer-facing site with an embedded quote
request form and a lightweight admin job queue. Domain: `thelawncare.com.au`
(registered; hosting not yet connected — see "Running it" below).

> Formerly branded "MowMate" — renamed after the `thelawncare.com.au` domain
> was purchased. See `CHANGELOG.md` [Unreleased] for the rename, and note
> that older changelog entries correctly refer to "MowMate" since that was
> the name at the time.

## Status

**Phase 1 (MVP)** — marketing site + working quote capture. See
[`docs/requirements.md`](docs/requirements.md) for the full requirements
doc, phased roadmap (Phase 2: pricing engine & payments, Phase 3: two-sided
contractor marketplace), and open decisions.

## Structure

```
index.html            # the whole site: public marketing pages + /?admin job queue
privacy.html          # privacy policy page, linked from the site footer
docs/requirements.md  # requirements, phased roadmap, open questions
docs/pre-live-checklist.md # what to check before pointing the real domain at this
CHANGELOG.md          # release history (Keep a Changelog format)
```

## Running it

`index.html` is a single self-contained file, but as of the lawn-size
estimator it makes real network calls (map tiles, address search), so it
needs to be served over `http://`, not double-clicked as a `file://` URL —
some browsers block those calls from a bare file. Two ways to preview:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/serve.ps1
```

Then open `http://localhost:8791`. (`scripts/serve.ps1` is a zero-dependency
static file server for Windows machines without Python/Node installed — if
you have either, `python -m http.server 8791` or `npx serve` work too.)

The admin queue (`?admin`) is backed by a live data store that only exists
when this page is opened as a **published Claude Artifact** — not from a
real static host. The quote form itself no longer has that limitation: it
posts straight to FormSubmit.co (a free, key-less form-to-email service),
which works from any real static host and forwards every submission to
Eric's inbox — see `sendViaFormBackend` in `index.html`. So on real hosting
(GitHub Pages, Netlify, ...): quote capture works and the lawn-size
estimator's map/geocoding calls work (both need real outbound network
access, which only real hosting provides) — the only thing that doesn't
come along is the live `?admin` dashboard view, since leads arrive by email
instead. Published as a Claude Artifact: the reverse — `?admin` and the
live database work, but the estimator can't reach the map tiles. Moving to
real static hosting (see `docs/pre-live-checklist.md`) is the natural next
step now that the site depends on external APIs and has a real domain.

## Versioning

This repo follows [Semantic Versioning](https://semver.org/) via git tags
(`v0.1.0`, `v0.2.0`, ...) and [Keep a Changelog](https://keepachangelog.com/)
conventions in `CHANGELOG.md`. Bump the minor version for new sections/
features, patch for copy or styling fixes, major once the site is live in
production for real customers.
