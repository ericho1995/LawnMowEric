// Builds the body and metadata for one suburb landing page from a record in
// src/data/suburbs.mjs. The page's FAQ is registered by build.mjs as the set
// `suburb-<slug>`, so it renders through the same {{faq:...}} path (and the
// same FAQPage JSON-LD) as every other page.

import { escapeHtml } from './render.mjs';

export function likelyPriceSentence(suburb, config) {
  const bands = suburb.likelyBands.map((id) => {
    const band = config.pricing.bands.find((b) => b.id === id);
    if (!band) throw new Error('suburbs.mjs: ' + suburb.slug + ' has unknown band "' + id + '"');
    return band;
  });
  const names = bands.map((b) => b.label);
  const label = names.length === 1 ? 'the ' + names[0] + ' band' : 'the ' + names.slice(0, -1).join(', ') + ' or ' + names[names.length - 1] + ' band';
  return 'Most ' + suburb.name + ' yards are likely to fall in ' + label +
    ' ($' + bands[0].low + '–' + bands[bands.length - 1].high + ' a mow).';
}

export function renderSuburb(suburb, all, config) {
  const name = escapeHtml(suburb.name);
  const quoteHref = '{{root}}quote.html?suburb=' + encodeURIComponent(suburb.name);
  const likely = likelyPriceSentence(suburb, config);
  const nearby = suburb.nearby.map((slug) => {
    const other = all.find((s) => s.slug === slug);
    if (!other) throw new Error('suburbs.mjs: ' + suburb.slug + ' lists unknown nearby suburb "' + slug + '"');
    return '    <li><a href="{{root}}lawn-mowing/' + other.slug + '.html">' + escapeHtml(other.name) + '</a></li>';
  }).join('\n');

  const body = `
<section class="page-hero" data-hero>
  <div class="container">
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href="{{root}}index.html">Home</a>
      <a href="{{root}}service-area.html">Where we mow</a>
      <span aria-current="page">${name}</span>
    </nav>
    <h1>Lawn mowing in ${name}</h1>
    <p class="lede">${escapeHtml(suburb.intro)}</p>
    <div class="actions">
      <a class="btn btn-light" href="${quoteHref}" data-track="suburb_quote">Get a free quote</a>
      <a class="btn btn-outline-light" href="#prices">See prices</a>
    </div>
    <p class="hero-meta">${name} VIC ${escapeHtml(suburb.postcode)}, ${escapeHtml(suburb.council)}</p>
  </div>
</section>

<section class="section">
  <div class="container split">
    <div class="prose">
      <h2>Mowing a ${name} lawn</h2>
      <ul class="tick-list">
${suburb.notes.map((n) => '        <li>' + escapeHtml(n) + '</li>').join('\n')}
      </ul>
      <p>Every visit is done in person by the same operator. You get a message when we arrive and another when we finish, with photos.</p>
    </div>
    <aside class="job-sheet" id="prices" aria-labelledby="prices-title">
      <h2 class="job-sheet-title" id="prices-title">Standard mow prices</h2>
      <p class="job-sheet-note">${escapeHtml(likely)} Your price depends on your lawn, not your postcode.</p>
      {{price-table}}
      <p class="job-sheet-foot">Or $${config.pricing.subscriptionMonthly} a month on the subscription, for lawns up to about 400m².</p>
      <a class="btn btn-primary btn-block" href="${quoteHref}" data-track="suburb_measure">Measure my lawn for a price</a>
    </aside>
  </div>
</section>

<section class="section section-tint">
  <div class="container narrow">
    <h2>Common questions</h2>
    {{faq:suburb-${suburb.slug}}}
  </div>
</section>

<section class="section">
  <div class="container">
    <h2>Also mowing nearby</h2>
    <ul class="suburb-links">
${nearby}
    </ul>
    <p class="muted">Not listed? Put your suburb on the quote form and we'll tell you straight whether we can get there.</p>
  </div>
</section>

<section class="cta-band">
  <div class="container">
    <h2>Book a mow in ${name}</h2>
    <p>Tell us about your lawn and request a day. We'll confirm the price and time within one business day.</p>
    <a class="btn btn-light" href="${quoteHref}" data-track="suburb_cta">Get a free quote</a>
  </div>
</section>
`;

  return {
    meta: {
      path: 'lawn-mowing/' + suburb.slug + '.html',
      title: 'Lawn mowing in ' + suburb.name + ' ' + suburb.postcode + ' — The Lawn Care',
      description: 'Lawn mowing in ' + suburb.name + ', priced by lawn size and quoted before you book. ' + likely + ' Reply within one business day.',
      nav: 'service-area',
      breadcrumb: suburb.name,
      breadcrumbParent: 'Where we mow|service-area.html'
    },
    body
  };
}
