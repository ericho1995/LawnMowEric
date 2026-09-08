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
// 5. Paste that URL into GAS_WEBHOOK_URL near the top of the <script> in both
//    quote.html and admin.html (replace the PASTE_YOUR_DEPLOYED... placeholder).
// 6. Open admin.html and log in with the passphrase you set in step 3.

const SHEET_NAME = 'Quotes';
const STATUS_VALUES = ['New', 'Contacted', 'Scheduled', 'Completed'];
const FIELDS = [
  'id', 'createdAt', 'name', 'phone', 'email', 'suburb', 'size', 'lastMowed',
  'frequency', 'day', 'addonEdging', 'addonHedge', 'noGreenBin', 'extras',
  'notes', 'areaM2', 'estimateLow', 'estimateHigh', 'status', 'depositPaid'
];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(FIELDS);
  }
  return sheet;
}

function checkSecret_(token) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_SECRET');
  return !!real && !!token && token === real;
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// GET ?secret=... -> list every quote request, newest first.
function doGet(e) {
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
    const sheet = getSheet_();
    const id = Utilities.getUuid();
    const row = FIELDS.map(function (key) {
      if (key === 'id') return id;
      if (key === 'createdAt') return new Date().toISOString();
      if (key === 'status') return 'New';
      if (key === 'depositPaid') return false;
      return body[key] || '';
    });
    sheet.appendRow(row);
    try {
      MailApp.sendEmail({
        to: 'ericho995@gmail.com',
        subject: 'New quote request - The Lawn Care',
        body: FIELDS.map(function (key, i) { return key + ': ' + row[i]; }).join('\n')
      });
    } catch (err) {
      // Row is already saved in the sheet even if the email notification fails.
    }
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
