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

- [ ] Confirm going public (or confirm you already have GitHub Pro, which
      allows Pages on a private repo instead)
- [ ] In the repo → Settings → Pages: Source = "Deploy from a branch",
      Branch = `master` / `(root)`. A `CNAME` file with
      `thelawncare.com.au` is already committed, so GitHub will offer it
      as the custom domain automatically — tick "Enforce HTTPS" once the
      cert issues (can take up to ~24h after DNS below is live).
- [ ] At GoDaddy (DNS for `thelawncare.com.au`): add these records (GitHub
      Pages' documented apex IPs) so both the bare domain and `www` work:
      | Type | Name | Value |
      |---|---|---|
      | A | @ | 185.199.108.153 |
      | A | @ | 185.199.109.153 |
      | A | @ | 185.199.110.153 |
      | A | @ | 185.199.111.153 |
      | CNAME | www | ericho1995.github.io |
      Remove any existing "parked page" A/CNAME record GoDaddy put there
      by default first. DNS can take anywhere from minutes to a few hours
      to propagate.
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
      §7) — change it again anytime from `index.html`'s `ADMIN_PASSPHRASE`.

## Nice-to-have before launch, not blocking

- Swap the placeholder pricing numbers for numbers based on real booked
  jobs once there are a few
- Add the "Deposit paid" field to whatever bookkeeping Eric already uses,
  so it isn't only tracked in the admin view
