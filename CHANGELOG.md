# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
