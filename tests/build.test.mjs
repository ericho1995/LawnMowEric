import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontMatter } from '../scripts/lib/frontmatter.mjs';
import { createRenderer } from '../scripts/lib/render.mjs';

test('parseFrontMatter reads key: value pairs and strips the block', () => {
  const { data, body } = parseFrontMatter('---\ntitle: Hello: world\npath: a.html\n---\n<h1>x</h1>\n');
  assert.deepEqual(data, { title: 'Hello: world', path: 'a.html' });
  assert.equal(body, '<h1>x</h1>\n');
});

test('parseFrontMatter tolerates CRLF and a missing block', () => {
  assert.deepEqual(parseFrontMatter('---\r\na: 1\r\n---\r\nB').data, { a: '1' });
  assert.deepEqual(parseFrontMatter('<p>no fm</p>'), { data: {}, body: '<p>no fm</p>' });
});

const faqs = { svc: [{ q: 'Q1 & more?', a: 'A1' }] };
const r = createRenderer({
  config: { business: { name: 'TLC' } },
  faqs,
  suburbs: [{ slug: 'richmond', name: 'Richmond' }]
});

test('render substitutes root and config tokens', () => {
  assert.equal(
    r.render('<a href="{{root}}x.html">{{config.business.name}}</a>', '../').html,
    '<a href="../x.html">TLC</a>'
  );
});

test('render expands faq sets, escapes text and records them', () => {
  const out = r.render('{{faq:svc}}', '');
  assert.match(out.html, /<details class="faq-item">/);
  assert.match(out.html, /Q1 &amp; more\?/);
  assert.deepEqual(out.faqsUsed, faqs.svc);
});

test('render expands suburb links with the root prefix', () => {
  assert.match(r.render('{{suburb-links}}', '../').html, /href="\.\.\/lawn-mowing\/richmond\.html"/);
});

test('render builds the price table from config pricing bands', () => {
  const priced = createRenderer({
    config: { pricing: { bands: [{ id: 'small', label: 'Small', size: 'under 150m²', max: 150, low: 55, high: 70 }] } },
    faqs: {}, suburbs: []
  });
  const html = priced.render('{{price-table}}', '').html;
  assert.match(html, /<table class="price-table">/);
  assert.match(html, /Small/);
  assert.match(html, /\$55–70/);
  // The quote-on-request row starts where the last band ends.
  assert.match(html, /150m² and up/);
});

test('render throws on unknown tokens and missing config keys', () => {
  assert.throws(() => r.render('{{nope}}', ''), /Unknown token/);
  assert.throws(() => r.render('{{faq:missing}}', ''), /Unknown token/);
  assert.throws(() => r.render('{{config.missing.key}}', ''), /Unknown token/);
});
