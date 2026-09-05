# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
