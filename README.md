# MowMate

Online lawn mowing business — customer-facing site with an embedded quote
request form and a lightweight admin job queue.

## Status

**Phase 1 (MVP)** — marketing site + working quote capture. See
[`docs/requirements.md`](docs/requirements.md) for the full requirements
doc, phased roadmap (Phase 2: pricing engine & payments, Phase 3: two-sided
contractor marketplace), and open decisions.

## Structure

```
index.html          # the whole site: public marketing pages + /?admin job queue
docs/requirements.md # requirements, phased roadmap, open questions
CHANGELOG.md         # release history (Keep a Changelog format)
```

## Running it

`index.html` is a single self-contained file. Open it directly in a browser
to preview the design and copy. The live, working version — including the
quote form and admin queue, backed by a real data store — is published as a
Claude Artifact (link shared separately); those two data-backed features
only work in that hosted context, not from the raw file.

## Versioning

This repo follows [Semantic Versioning](https://semver.org/) via git tags
(`v0.1.0`, `v0.2.0`, ...) and [Keep a Changelog](https://keepachangelog.com/)
conventions in `CHANGELOG.md`. Bump the minor version for new sections/
features, patch for copy or styling fixes, major once the site is live in
production for real customers.
