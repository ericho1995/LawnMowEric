# Marketing plan — The Lawn Care

Internal doc, not linked from the site. Covers where jobs come from and
the manual routine for catching new lawn-mowing requests in the service
area fast. Nothing here scrapes or auto-posts on third-party platforms —
see "Why no bots" at the bottom for why that's deliberate.

## 1. Airtasker as a channel

Airtasker is the highest-intent channel available: people posting a task
there have already decided to pay someone today, not "someday."

**Set up once:**
- Complete the Tasker profile fully — profile photo, bio, ABN, and link to
  `thelawncare.com.au` in the bio where Airtasker allows an external link.
- Turn on **Task Alerts** (Airtasker's own feature, under Tasker settings
  → Alerts): pick the "Gardening & Lawn Care" category, set the radius to
  cover the current service area (see `service-area.html` for the current
  suburb list), and choose instant push/email notifications. This is the
  legitimate, built-for-this-purpose version of "tell me when someone
  nearby needs a mow" — no scraping required, and it's exactly what the
  feature is for.
- List "Lawn mowing" as a standing service offer if Airtasker's profile
  format supports it, so you show up in search there too, not just alerts.

**Working each new task:**
1. Airtasker sends the alert (near-instant). Open the task immediately —
   on this kind of task, response speed matters more than the offer copy.
2. Quote a number Airtasker asks for as the offer, but drop the direct
   quote-form link in the offer message too: *"Happy to help — here's a
   fixed quote: $X. If it's easier, you can also book direct at
   thelawncare.com.au/quote.html and skip the platform fee."*
3. Once a job is done well, ask for an Airtasker review — it compounds:
   more reviews → higher placement in Airtasker's own search → more
   alerts convert to jobs.
4. For any repeat customer from Airtasker, point them at
   [`airtasker.html`](../airtasker.html) next time so they book direct
   and skip re-posting a task each visit.

**Costs to plan for:** Airtasker charges the Tasker a service fee on
completed jobs (percentage, tiered by lifetime earnings on the platform —
check current rates in Airtasker's Tasker fee schedule, they change it
occasionally). Price offers with that fee in mind so the take-home number
still matches what `services.html` quotes for a direct booking.

## 2. Other marketing avenues

Ranked roughly by effort-to-first-job, cheapest/fastest first.

**Facebook — local buy/sell & suburb groups (free, fast)**
Join the Buy Nothing / "[Suburb] Community" / "[Suburb] Buy Swap Sell"
groups for each serviced suburb. Most allow an occasional services post —
check each group's pinned rules first, some ban trade ads outright. Post
a short intro with a couple of real job photos once available (see
pre-live checklist — real photos still outstanding) and the quote-form
link. Re-post roughly monthly, not more, so it doesn't read as spam.

**Facebook Marketplace — "Services" listing (free)**
List "Lawn mowing — [suburbs]" under Marketplace Services. Unlike a group
post this stays live and searchable rather than scrolling away in a feed.

**Google Business Profile (free, high-value, do this early)**
Create a free Business Profile for "The Lawn Care" with the service area
set to the current suburb list, category "Lawn care service." This is
what makes the business show up in Google Maps / "lawn mowing near me"
searches — arguably the single highest-leverage free thing on this list.
Keep it updated as the suburb list grows.

**Nextdoor (free)**
Create a Nextdoor Business Page and post in the "Recommendations" style
that performs well there — Nextdoor's whole draw is neighbour-to-neighbour
trust, so lead with the "Eric does every job personally" angle rather
than a generic ad.

**Gumtree (free tier available)**
Similar profile to Airtasker minus the built-in alert system — worth a
listing since it's zero-cost, but treat it as a slower channel; check
back manually rather than relying on notifications (Gumtree doesn't offer
Airtasker-style task alerts for services).

**Referral incentive (free to set up, costs per conversion)**
Once there are a handful of happy customers, offer something like "$10
off your next mow for every friend you refer who books." Cheap per
acquisition compared to any paid channel, and reinforces the
show-up-in-person trust story this business is built on.

**Local flyers / letterbox drop (low cost, physical effort)**
A simple flyer for the currently-serviced streets — most effective in the
first few weeks in a new pocket of the service area, before Google/Airtasker
history builds up.

**Paid ads — hold off**
Not worth it yet. Airtasker + Google Business Profile + community groups
cover the addressable local demand at zero spend while Eric is the only
mower; revisit paid (Google Local Services Ads, Facebook local ads) once
there's capacity for more jobs than the free channels bring in.

## 3. "Automate" the alerting — what's legitimate and what isn't

The instinct — *get notified automatically the moment someone nearby
wants a lawn mowed* — is right, and mostly solvable with tools built for
exactly this, no scraping needed:

| Source | Legitimate automation | Notes |
|---|---|---|
| Airtasker | **Task Alerts** (see §1) | Built-in, instant, this is the real answer for Airtasker specifically |
| Google (general web/news mentions) | **Google Alerts** for queries like `"lawn mowing" Melbourne` or a target suburb name | Catches blog posts, local news, forum threads — lower volume, occasional useful lead |
| Facebook groups/Marketplace | Turn on **notifications** for the joined suburb groups (bell icon on each group) and save Marketplace searches for "lawn mowing" in the area | Facebook doesn't allow third-party bots reading group content via API for this use — native notifications are the ToS-compliant version |
| Nextdoor | Nextdoor's own notification settings for the business page's neighbourhood | Same logic — native feature, not scraped |

**Why no bots:** Airtasker, Facebook, and Nextdoor's Terms of Service all
prohibit automated scraping and automated posting/messaging on personal
accounts — doing it risks an account ban, which would kill the Airtasker
channel entirely (the single best lead source above) to save a few
minutes a day. Every platform above already ships a native "notify me"
feature built for this exact use case — turning those on gets the same
result (fast alert → fast reply) with zero ToS risk. If a real
zero-manual-effort pipeline is wanted later, the ToS-safe path is
Airtasker's own **Partner API** (requires applying and being approved as
an Airtasker business partner) rather than scraping the consumer site —
worth revisiting once job volume justifies the integration effort.

## 4. Weekly routine (once the above is set up)

- Check Airtasker Task Alerts + respond same-day, ideally same-hour.
- Skim joined Facebook groups' notifications once a day.
- Once a month: refresh the Facebook group post (if the group's rules
  allow), check the Google Business Profile for new reviews to respond
  to, and glance at Gumtree for anything new.
