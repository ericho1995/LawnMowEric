// The Lawn Care — admin backend (Google Apps Script + a Google Sheet)
//
// Why this exists: admin.html used to read from a Claude Artifact "db"
// capability that only works when this page is opened as a published Claude
// Artifact — never on real hosting (GitHub Pages). So on the live site,
// thelawncare.com.au/admin.html has been showing "data isn't available"
// permanently. This script is a free, real backend that works from anywhere:
// it stores every quote request in a Google Sheet you own, and gives
// admin.html something real to read from and write to.
//
// It also fixes the bigger problem: the old admin.html had the real
// passphrase hardcoded in plaintext, sitting in this repo's public GitHub
// history. With this script, the passphrase is never committed anywhere —
// it lives only in this script's own Script Properties (see setup below),
// and admin.html just forwards whatever the visitor typed for this script to
// check server-side.
//
// ---- One-time setup (see docs/pre-live-checklist.md for the full walkthrough) ----
// 1. Create a new Google Sheet (any name, e.g. "The Lawn Care — Quotes").
// 2. Extensions -> Apps Script. Delete the placeholder code, paste this whole
//    file in, save.
// 3. Project Settings (gear icon) -> Script Properties -> Add script property:
//      Property: ADMIN_SECRET
//      Value:    <a real passphrase you choose - not the old exposed one>
// 4. Deploy -> New deployment -> type "Web app".
//      Execute as: Me
//      Who has access: Anyone
//    Click Deploy, authorize when prompted, copy the Web App URL.
// 5. Paste that URL into gasWebhookUrl in src/site.config.mjs (replace the
//    PASTE_YOUR_DEPLOYED... placeholder), run `npm run build`, and commit.
//    quote.html and admin.html both pick it up from there.
// 6. Open admin.html and log in with the passphrase you set in step 3.
//
// Optional Script Property: SLOT_CAPACITY (default 3) — how many open
// requests a morning or afternoon can hold before the quote page shows it
// as fully booked.
//
// Updating an existing deployment: paste the new code, then Deploy ->
// Manage deployments -> edit (pencil) -> Version: New version -> Deploy.
// Keeping the same deployment keeps the same URL.

const SHEET_NAME = 'Quotes';
const TIMEZONE = 'Australia/Melbourne';
const OWNER_EMAIL = 'ericho995@gmail.com';
const STATUS_VALUES = ['New', 'Contacted', 'Scheduled', 'Completed'];
const FIELDS = [
  'id', 'createdAt', 'name', 'phone', 'email', 'suburb', 'size', 'lastMowed',
  'frequency', 'day', 'addonEdging', 'addonHedge', 'noGreenBin', 'extras',
  'notes', 'areaM2', 'estimateLow', 'estimateHigh', 'status', 'depositPaid',
  'requestedDate', 'requestedWindow', 'flexible'
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(FIELDS);
  }
  ensureHeader_(sheet);
  return sheet;
}

// Sheets created by an older version of this script are missing newer
// columns. Append any missing ones to the header row so rows line up.
function ensureHeader_(sheet) {
  const header = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  const missing = FIELDS.filter(function (key) { return header.indexOf(key) === -1; });
  if (missing.length) sheet.getRange(1, header.length + 1, 1, missing.length).setValues([missing]);
}

function headerOf_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

// Every value a customer typed is stored as plain text. The leading
// apostrophe stops Sheets from (a) running input like "=IMPORTXML(...)" as
// a formula, (b) turning 0400123456 into the number 400123456, and
// (c) turning "2026-09-26" into a date. It isn't part of the cell's value.
function asText_(value) {
  if (value === undefined || value === null || value === '') return '';
  return "'" + String(value).slice(0, 2000);
}

// Dates may come back as Date objects from rows Sheets already converted.
function isoDate_(value) {
  if (value instanceof Date) return Utilities.formatDate(value, SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  return String(value || '').slice(0, 10);
}

function slotCapacity_() {
  const n = Number(PropertiesService.getScriptProperties().getProperty('SLOT_CAPACITY'));
  return n > 0 ? n : 3;
}

function windowLabel_(id) {
  return { am: 'morning', pm: 'afternoon' }[id] || id || '';
}

// Plain-text confirmation to the customer, sent from the script owner's
// account. Failure is ignored: the request is saved and Eric is notified
// either way.
function sendCustomerConfirmation_(values, slot) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || '')) return;
  const firstName = String(values.name || '').trim().split(/\s+/)[0] || 'there';
  const body = [
    'Hi ' + firstName + ',',
    '',
    "Thanks for your lawn mowing quote request. Here's what we received:",
    '',
    'Suburb: ' + (values.suburb || '-'),
    'Lawn size: ' + (values.size || '-'),
    'How often: ' + (values.frequency || '-'),
    'Requested time: ' + slot,
    '',
    "We'll reply within one business day with your price and a confirmed time, or the nearest free one. " +
      'Nothing is booked until you accept the quote and pay the deposit ($20 or 20% of the quote, whichever is higher).',
    '',
    'Need to change something? Just reply to this email.',
    '',
    'The Lawn Care',
    'https://thelawncare.com.au/'
  ].join('\n');
  try {
    MailApp.sendEmail({
      to: values.email,
      subject: 'We have your lawn mowing quote request',
      body: body,
      name: 'The Lawn Care'
    });
  } catch (err) {
    // Ignore — see above.
  }
}

function checkSecret_(token) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET');
  return !!real && !!token && token === real;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// GET ?secret=... -> list every quote request, newest first.
// GET ?action=availability -> public. Open requests per day+window from
// today on, so the quote page can grey out full slots. Counts only — no
// names, addresses or anything else about who asked.
function availability_() {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  const header = rows.shift();
  const dateCol = header.indexOf('requestedDate');
  const windowCol = header.indexOf('requestedWindow');
  const statusCol = header.indexOf('status');
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const counts = {};
  rows.forEach(function (row) {
    const date = isoDate_(row[dateCol]);
    const win = String(row[windowCol] || '');
    if (!date || !win || date < today || row[statusCol] === 'Completed') return;
    const key = date + '|' + win;
    counts[key] = (counts[key] || 0) + 1;
  });
  return jsonOut_({ ok: true, counts: counts, capacity: slotCapacity_() });
}

function doGet(e) {
  if (e.parameter && e.parameter.action === 'availability') return availability_();

  const secret = (e.parameter && e.parameter.secret) || '';
  if (!checkSecret_(secret)) return jsonOut_({ ok: false, error: 'unauthorized' });

  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  const header = rows.shift();
  const items = rows.map(function (row) {
    const obj = {};
    header.forEach(function (key, i) { obj[key] = row[i]; });
    return obj;
  }).reverse();
  return jsonOut_({ ok: true, items: items });
}

// POST body: { action: 'submitQuote', ...formFields }              — public, no secret needed
// POST body: { action: 'updateStatus', secret, id, status }        — needs secret
// POST body: { action: 'updateDeposit', secret, id, depositPaid }  — needs secret
function doPost(e) {
  let body;
  try {
    body = JSON.parse((e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonOut_({ ok: false, error: 'bad request' });
  }
  const action = body.action || 'submitQuote';

  if (action === 'submitQuote') {
    // Honeypot: the quote page hides this field from people. Anything that
    // fills it in is a bot posting directly — answer ok, store nothing.
    if (body._honey) return jsonOut_({ ok: true });

    const sheet = getSheet_();
    const id = Utilities.getUuid();
    const values = {};
    const row = headerOf_(sheet).map(function (key) {
      let value;
      if (key === 'id') value = id;
      else if (key === 'createdAt') value = new Date().toISOString();
      else if (key === 'status') value = 'New';
      else if (key === 'depositPaid') value = false;
      else if (FIELDS.indexOf(key) !== -1) {
        values[key] = body[key] ? String(body[key]) : '';
        return asText_(body[key]);
      } else value = '';
      values[key] = value;
      return value;
    });
    sheet.appendRow(row);

    const slot = values.flexible ? 'Flexible' : (values.day || 'Not given');
    try {
      MailApp.sendEmail({
        to: OWNER_EMAIL,
        replyTo: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email) ? values.email : OWNER_EMAIL,
        subject: 'New quote request — ' + (values.suburb || 'no suburb') + ' — ' + slot,
        body: FIELDS.map(function (key) { return key + ': ' + (values[key] === undefined ? '' : values[key]); }).join('\n')
      });
    } catch (err) {
      // The row is already saved even if the notification email fails.
    }
    sendCustomerConfirmation_(values, slot);
    return jsonOut_({ ok: true, id: id });
  }

  // Every action below changes existing data — requires the admin secret.
  if (!checkSecret_(body.secret)) return jsonOut_({ ok: false, error: 'unauthorized' });

  if (action === 'updateStatus') {
    if (STATUS_VALUES.indexOf(body.status) === -1) return jsonOut_({ ok: false, error: 'invalid status' });
    const sheet = getSheet_();
    const data = sheet.getDataRange().getValues();
    const idCol = data[0].indexOf('id');
    const statusCol = data[0].indexOf('status');
    for (let r = 1; r < data.length; r++) {
      if (data[r][idCol] === body.id) {
        sheet.getRange(r + 1, statusCol + 1).setValue(body.status);
        return jsonOut_({ ok: true });
      }
    }
    return jsonOut_({ ok: false, error: 'not found' });
  }

  if (action === 'updateDeposit') {
    const sheet = getSheet_();
    const data = sheet.getDataRange().getValues();
    const idCol = data[0].indexOf('id');
    const depositCol = data[0].indexOf('depositPaid');
    for (let r = 1; r < data.length; r++) {
      if (data[r][idCol] === body.id) {
        sheet.getRange(r + 1, depositCol + 1).setValue(!!body.depositPaid);
        return jsonOut_({ ok: true });
      }
    }
    return jsonOut_({ ok: false, error: 'not found' });
  }

  return jsonOut_({ ok: false, error: 'unknown action' });
}
