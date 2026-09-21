// Token substitution for page bodies and partials.
//
//   {{root}}            relative prefix back to the site root ('' or '../')
//   {{config.a.b}}      a value from src/site.config.mjs
//   {{faq:<set>}}       a FAQ list from src/data/faqs.mjs (also feeds FAQPage JSON-LD)
//   {{suburb-links}}    a link to every suburb landing page
//
// Unknown tokens throw, so a typo fails the build instead of shipping "{{...}}".

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function lookup(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function createRenderer({ config, faqs, suburbs }) {
  function faqList(items) {
    return '<div class="faq-list">\n' + items.map((item) =>
      '  <details class="faq-item">\n' +
      '    <summary>' + escapeHtml(item.q) + '</summary>\n' +
      '    <div class="faq-answer"><p>' + escapeHtml(item.a) + '</p></div>\n' +
      '  </details>'
    ).join('\n') + '\n</div>';
  }

  function suburbLinks(root) {
    return '<ul class="suburb-links">\n' + suburbs.map((s) =>
      '  <li><a href="' + root + 'lawn-mowing/' + s.slug + '.html">' + escapeHtml(s.name) + '</a></li>'
    ).join('\n') + '\n</ul>';
  }

  function priceTable() {
    const rows = config.pricing.bands.map((b) =>
      '    <tr><th scope="row">' + escapeHtml(b.label) + ' <span>' + escapeHtml(b.size) + '</span></th>' +
      '<td>$' + b.low + '–' + b.high + '</td></tr>'
    );
    const last = config.pricing.bands[config.pricing.bands.length - 1];
    rows.push('    <tr><th scope="row">Extra-large <span>' + last.max + 'm² and up</span></th><td>Quoted</td></tr>');
    return '<table class="price-table">\n' +
      '  <caption class="visually-hidden">Standard mow prices by lawn size</caption>\n' +
      '  <thead><tr><th scope="col">Lawn size</th><th scope="col">Per mow</th></tr></thead>\n' +
      '  <tbody>\n' + rows.join('\n') + '\n  </tbody>\n</table>';
  }

  function render(html, root) {
    const faqsUsed = [];
    const out = html.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (whole, token) => {
      if (token === 'root') return root;
      if (token === 'suburb-links') return suburbLinks(root);
      if (token === 'price-table') return priceTable();
      if (token.startsWith('faq:')) {
        const set = faqs[token.slice(4)];
        if (!set) throw new Error('Unknown token ' + whole);
        faqsUsed.push(...set);
        return faqList(set);
      }
      if (token.startsWith('config.')) {
        const value = lookup(config, token.slice(7));
        if (value === undefined || typeof value === 'object') throw new Error('Unknown token ' + whole);
        return escapeHtml(value);
      }
      throw new Error('Unknown token ' + whole);
    });
    return { html: out, faqsUsed };
  }

  return { render, faqList };
}
