// Wraps a rendered page body in the shared document: <head> metadata,
// JSON-LD, header, footer, sticky mobile CTA and scripts.

import { escapeHtml } from './render.mjs';

const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900&family=Manrope:wght@400..800&display=swap';

const EXTRA_STYLES = {
  leaflet: ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'],
  admin: ['{{root}}assets/css/admin.css']
};

const EXTRA_SCRIPTS = {
  estimator: [
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js',
    'https://cdnjs.cloudflare.com/ajax/libs/Turf.js/7.4.0/turf.min.js',
    { module: '{{root}}assets/js/estimator.js' }
  ]
};

function scriptTag(entry, r) {
  return typeof entry === 'string'
    ? '<script src="' + r(entry) + '"></script>'
    : '<script type="module" src="' + r(entry.module) + '"></script>';
}

const PLACEHOLDER_GA = 'G-XXXXXXXXXX';

export function isRealGaId(id) {
  return typeof id === 'string' && id !== PLACEHOLDER_GA && /^G-[A-Z0-9]{6,}$/.test(id);
}

export function isRealWebhook(url) {
  return typeof url === 'string' && /^https:\/\//.test(url);
}

function list(value) {
  return (value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

export function canonicalUrl(config, path) {
  return config.siteUrl + (path === 'index.html' ? '' : path);
}

function jsonLd(obj) {
  // Escape "<" so no string inside can close the <script> element early.
  return '<script type="application/ld+json">\n' +
    JSON.stringify(obj, null, 2).replace(/</g, '\\u003c') + '\n</script>';
}

function businessEntity(config, suburbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': config.siteUrl + '#business',
    name: config.business.name,
    url: config.siteUrl,
    image: config.siteUrl + 'assets/og-image.jpg',
    logo: config.siteUrl + 'assets/apple-touch-icon.png',
    description: "Lawn mowing across Melbourne's inner and northern suburbs, priced by lawn size and quoted before you book.",
    priceRange: '$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: config.business.locality,
      addressRegion: config.business.region,
      addressCountry: config.business.country
    },
    areaServed: suburbs.map((s) => ({ '@type': 'Place', name: s.name + ' VIC ' + s.postcode }))
  };
}

function servicesEntity(config) {
  const offers = config.pricing.bands.map((b) => ({
    '@type': 'Offer',
    name: 'Standard mow — ' + b.label.toLowerCase() + ' lawn (' + b.size + ')',
    priceSpecification: { '@type': 'PriceSpecification', minPrice: b.low, maxPrice: b.high, priceCurrency: 'AUD' }
  }));
  offers.push({
    '@type': 'Offer',
    name: 'Monthly mow subscription',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: config.pricing.subscriptionMonthly,
      priceCurrency: 'AUD',
      unitText: 'month'
    }
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Lawn mowing',
    provider: { '@type': 'LocalBusiness', '@id': config.siteUrl + '#business', name: config.business.name },
    areaServed: { '@type': 'City', name: 'Melbourne' },
    offers
  };
}

function breadcrumbEntity(config, meta) {
  const items = [{ name: 'Home', item: config.siteUrl }];
  if (meta.breadcrumbParent) {
    const [name, path] = meta.breadcrumbParent.split('|').map((s) => s.trim());
    items.push({ name, item: canonicalUrl(config, path) });
  }
  items.push({ name: meta.breadcrumb, item: canonicalUrl(config, meta.path) });
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, ...it }))
  };
}

function faqEntity(faqsUsed) {
  const seen = new Set();
  const unique = faqsUsed.filter((f) => !seen.has(f.q) && seen.add(f.q));
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: unique.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };
}

function browserConfig(config) {
  return {
    gasWebhookUrl: isRealWebhook(config.gasWebhookUrl) ? config.gasWebhookUrl : '',
    mapboxToken: /^pk\./.test(config.mapboxToken || '') ? config.mapboxToken : '',
    overtureRelease: config.overtureRelease,
    formEmail: config.formEmail,
    pricing: { bands: config.pricing.bands },
    booking: config.booking,
    offer: config.offer
  };
}

export function renderPage({ meta, bodyHtml, root, config, suburbs, partials, faqsUsed, source, renderer }) {
  const r = (html) => renderer.render(html, root).html;
  const bare = meta.layout === 'bare';
  const scripts = list(meta.scripts);
  const styles = list(meta.styles);
  const schema = list(meta.schema);
  const pageId = meta.path.replace(/\.html$/, '').replace(/[^a-z0-9]+/gi, '-');
  const canonical = canonicalUrl(config, meta.path);
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const indexable = !/noindex/.test(meta.robots || '');

  const head = [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
    '<title>' + title + '</title>',
    '<meta name="description" content="' + description + '">',
    meta.robots ? '<meta name="robots" content="' + escapeHtml(meta.robots) + '">' : '',
    indexable ? '<link rel="canonical" href="' + canonical + '">' : '',
    '<meta name="theme-color" content="#F7F5EA">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="' + escapeHtml(config.business.name) + '">',
    '<meta property="og:title" content="' + title + '">',
    '<meta property="og:description" content="' + description + '">',
    indexable ? '<meta property="og:url" content="' + canonical + '">' : '',
    // Social previews: Facebook, WhatsApp and iMessage don't render SVG, so a
    // raster share image (assets/og-image.jpg, 1200x630).
    '<meta property="og:image" content="' + config.siteUrl + 'assets/og-image.jpg">',
    '<meta property="og:image:type" content="image/jpeg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="The Lawn Care: lawn mowing in Melbourne, priced before you book. From $' + config.pricing.fromPrice + ' a mow.">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:image" content="' + config.siteUrl + 'assets/og-image.jpg">',
    '<link rel="icon" type="image/svg+xml" href="' + root + 'assets/logo-icon.svg">',
    '<link rel="icon" type="image/png" sizes="32x32" href="' + root + 'assets/favicon-32.png">',
    '<link rel="apple-touch-icon" href="' + root + 'assets/apple-touch-icon.png">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="' + FONTS_URL + '">',
    '<link rel="stylesheet" href="' + root + 'assets/css/site.css">',
    ...styles.flatMap((s) => {
      if (!EXTRA_STYLES[s]) throw new Error(source + ': unknown style "' + s + '"');
      return EXTRA_STYLES[s].map((href) => '<link rel="stylesheet" href="' + r(href) + '">');
    })
  ];

  if (isRealGaId(config.gaMeasurementId)) {
    const id = config.gaMeasurementId;
    head.push(
      '<script async src="https://www.googletagmanager.com/gtag/js?id=' + id + '"></script>',
      "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','" + id + "');</script>"
    );
  }

  if (scripts.includes('quote') || bare) {
    head.push('<script>window.TLC_CONFIG = ' +
      JSON.stringify(browserConfig(config)).replace(/</g, '\\u003c') + ';</script>');
  }

  if (schema.includes('localbusiness')) head.push(jsonLd(businessEntity(config, suburbs)));
  if (schema.includes('services')) head.push(jsonLd(servicesEntity(config)));
  if (meta.breadcrumb) head.push(jsonLd(breadcrumbEntity(config, meta)));
  if (faqsUsed.length) head.push(jsonLd(faqEntity(faqsUsed)));

  let header = r(partials.header);
  if (meta.nav) {
    header = header.split('data-nav="' + meta.nav + '"').join('data-nav="' + meta.nav + '" aria-current="page"');
  }

  const tail = [];
  if (!bare) tail.push('<script src="' + root + 'assets/kill-switch.js"></script>');
  tail.push('<script src="' + root + 'assets/js/site.js"></script>');
  for (const s of scripts) {
    if (s === 'quote') tail.push('<script type="module" src="' + root + 'assets/js/quote.js"></script>');
    else if (EXTRA_SCRIPTS[s]) tail.push(...EXTRA_SCRIPTS[s].map((entry) => scriptTag(entry, r)));
    else throw new Error(source + ': unknown script "' + s + '"');
  }

  const body = bare
    ? [bodyHtml]
    : [
        '<a class="skip-link" href="#main">Skip to content</a>',
        '<div class="offer-bar"><p>New customers get $' + config.offer.firstMowDiscount +
          ' off their first mow. <a href="' + root + 'quote.html" data-track="offer_bar">Get a quote to claim it</a></p></div>',
        header,
        '<main id="main">',
        bodyHtml.trim(),
        '</main>',
        r(partials.footer),
        meta.nav === 'quote' ? '' :
          '<div class="sticky-cta" data-sticky-cta>\n' +
          '  <a class="btn btn-primary" href="' + root + 'quote.html" data-track="sticky_quote">Get a free quote</a>\n' +
          '  <a class="btn btn-outline" href="' + root + 'services.html#prices" data-track="sticky_prices">Prices</a>\n' +
          '</div>'
      ];

  return [
    '<!DOCTYPE html>',
    '<!-- GENERATED by scripts/build.mjs from ' + source + ' — edit the source, not this file -->',
    '<html lang="en-AU">',
    '<head>',
    ...head.filter(Boolean),
    '</head>',
    '<body class="page-' + pageId + '">',
    ...body.filter(Boolean),
    ...tail,
    '</body>',
    '</html>',
    ''
  ].join('\n');
}
