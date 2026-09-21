// Builds the static site: src/pages/*.html + suburb data -> flat HTML files
// at the repo root (where GitHub Pages serves them) and sitemap.xml.
//
//   npm run build        (or: node scripts/build.mjs)
//
// Zero dependencies. Output only depends on src/, so running it twice
// produces no diff.

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseFrontMatter } from './lib/frontmatter.mjs';
import { createRenderer } from './lib/render.mjs';
import { renderPage, canonicalUrl } from './lib/layout.mjs';
import { renderSuburb } from './lib/suburb-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const at = (...parts) => join(ROOT, ...parts);
const read = (p) => readFileSync(at(p), 'utf8').replace(/\r\n/g, '\n');
const load = async (p) => (await import(pathToFileURL(at(p)).href)).default;

const config = await load('src/site.config.mjs');
const suburbs = await load('src/data/suburbs.mjs');
const faqs = { ...(await load('src/data/faqs.mjs')) };

// Each suburb page's FAQ: its own questions, then the general ones (minus
// the suburb list, which the page already covers).
for (const s of suburbs) {
  faqs['suburb-' + s.slug] = [...s.faq, ...faqs.general.filter((f) => !/Which suburbs/.test(f.q))];
}

const partials = { header: read('src/partials/header.html'), footer: read('src/partials/footer.html') };
const renderer = createRenderer({ config, faqs, suburbs });

const pages = [];
for (const file of readdirSync(at('src/pages')).filter((f) => f.endsWith('.html')).sort()) {
  const { data, body } = parseFrontMatter(read('src/pages/' + file));
  pages.push({ meta: { path: file, ...data }, body, source: 'src/pages/' + file });
}
for (const suburb of suburbs) {
  const { meta, body } = renderSuburb(suburb, suburbs, config);
  pages.push({ meta, body, source: 'src/data/suburbs.mjs (' + suburb.slug + ')' });
}

let written = 0;
for (const page of pages) {
  for (const key of ['title', 'description']) {
    if (!page.meta[key]) throw new Error(page.source + ': missing front matter "' + key + '"');
  }
  const depth = page.meta.path.split('/').length - 1;
  const root = page.meta.root !== undefined ? page.meta.root : '../'.repeat(depth);
  const { html: bodyHtml, faqsUsed } = renderer.render(page.body, root);
  const html = renderPage({ meta: page.meta, bodyHtml, root, config, suburbs, partials, faqsUsed, source: page.source, renderer });
  if (writeIfChanged(page.meta.path, html)) written++;
}

const indexable = pages
  .filter((p) => !/noindex/.test(p.meta.robots || ''))
  .map((p) => p.meta.path)
  .sort((a, b) => (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  indexable.map((p) => '  <url><loc>' + canonicalUrl(config, p) + '</loc></url>').join('\n') +
  '\n</urlset>\n';
if (writeIfChanged('sitemap.xml', sitemap)) written++;

console.log('Built ' + pages.length + ' pages + sitemap (' + indexable.length + ' URLs); ' + written + ' file(s) changed.');

function writeIfChanged(relPath, content) {
  const target = at(relPath);
  if (existsSync(target) && readFileSync(target, 'utf8').replace(/\r\n/g, '\n') === content) return false;
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return true;
}
