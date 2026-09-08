# Pre-live checklist — The Lawn Care

Before pointing `thelawncare.com.au` at this site and advertising it
publicly, work through this list. Grouped by who needs to act.

## Business (Eric)

- [x] ABN registered — 79 369 208 780
- [x] Domain purchased — `thelawncare.com.au` (GoDaddy)
- [ ] Public liability insurance — explicitly deferred for now; get quotes
      (BizCover is a fast multi-insurer comparison for sole traders) before
      taking any job with real property-damage risk
- [ ] GST registration decision (voluntary under $75k turnover or not)
- [ ] Confirm you're comfortable with the "24 hours, we'll make it right"
      satisfaction promise as an operational commitment (it's live on the
      site now)
- [ ] Set up a simple invoicing method for bank-transfer jobs (e.g. Wave,
      free) until Stripe exists in Phase 2

## Hosting — recommended path: GitHub Pages (zero new accounts needed)

Quote capture no longer depends on the Artifact `db` at all: the form now
posts straight to FormSubmit.co (see `index.html`'s `sendViaFormBackend`),
which forwards every submission to `ericho995@gmail.com` from any static
host, no backend or signup required. That was the one item blocking real
hosting — it's done. What's left is just picking a host and pointing DNS.

**Recommended: GitHub Pages**, because the repo (`ericho1995/LawnMowEric`)
already exists and you're already signed in — no new account/signup
anywhere (Netlify/Vercel would each need one). The one trade-off: GitHub's
free plan only serves Pages from a **public** repo (private-repo Pages
needs GitHub Pro/Team). Nothing secret lives in this repo — no API keys,
the only "secret" was the admin passphrase, which has been changed and
should be treated as a stopgap either way (see below) — so going public is
low-risk here, but it's Eric's call to confirm before it's flipped.

- [x] Repo made public — confirmed by Eric, 7 Sept 2026.
- [x] GitHub Pages enabled on `master` / `(root)` — confirmed via API,
      status `built`, custom domain `thelawncare.com.au` already recognized.
- [x] **DNS at GoDaddy — done, confirmed 8 Sept 2026.** Both
      `thelawncare.com.au` and `www.thelawncare.com.au` now resolve to
      GitHub Pages' four apex IPs (185.199.108-111.153), and
      `http://thelawncare.com.au` serves the real site (200 OK) from
      GitHub's edge.
- [ ] **HTTPS cert — in progress, not a DNS problem.** `https://` currently
      fails the TLS handshake (cert doesn't match the domain yet) — this is
      GitHub still issuing the Let's Encrypt cert for the custom domain,
      which only kicks off once it sees correct DNS and can take minutes up
      to ~24h. If it's still failing after 24h with DNS confirmed correct:
      in repo Settings → Pages, remove the custom domain, save, then
      re-add `thelawncare.com.au` to force GitHub to re-request the cert.
      Once issued, tick "Enforce HTTPS" in the same settings page.
- [ ] First real quote submission will trigger a "confirm this form" email
      from FormSubmit to `ericho995@gmail.com` — click it once, or every
      submission after is silently swallowed. (Checked: no such email has
      arrived yet, so this hasn't happened yet — it'll show up the moment
      the first real submission goes through on the live domain.)

## Content / QA (can be done now, no hosting decision needed)

- [x] Rebrand from "MowMate" to "The Lawn Care" throughout the site
- [x] Privacy policy page live and linked from the footer (`privacy.html`)
- [x] Final service list matches site copy (standard mow, edge/whipper-
      snip, hedge trim, green waste)
- [x] Pricing bands + overgrown-lawn surcharge reflected in the instant
      estimator
- [x] Deposit-for-booking messaging on the quote success panel
- [ ] **Swap the hero and "Our work" gallery photos for real ones** once
      Eric has photos from actual jobs — they're currently Unsplash stock
      images, captioned generically on purpose so nothing implies they're
      specific completed work, but real photos will convert better and
      close the "is this a real local operator" trust gap
- [ ] **Add real reviews** once any exist — the Reviews section
      deliberately ships with an honest empty state instead of invented
      testimonials; see the commented template in `index.html`'s `#reviews`
      section for the exact markup to duplicate
- [ ] Confirm mobile layout on a real phone, not just emulation — resize
      the browser or open on-device and check: nav, hero, quote form
      fields, and the lawn-size estimator map/buttons all usable one-handed
- [ ] Do a real end-to-end test submission once real hosting + a real data
      store are wired up, then delete the test record
- [ ] Re-read every "Melbourne" / suburb-specific mention and confirm the
      service area list is still accurate
- [x] Change the admin passphrase from the old `lawncare-admin` default —
      done (new value given to Eric directly, not repeated here since this
      file may end up in a public repo — see the hosting section above).
      Still just a client-side gate, not real auth (see `docs/requirements.md`
      §7) — change it again anytime from `admin.html`'s `ADMIN_PASSPHRASE`.

## Nice-to-have before launch, not blocking

- Swap the placeholder pricing numbers for numbers based on real booked
  jobs once there are a few
- Add the "Deposit paid" field to whatever bookkeeping Eric already uses,
  so it isn't only tracked in the admin view
