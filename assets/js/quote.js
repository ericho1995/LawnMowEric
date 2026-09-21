// Quote form on quote.html: booking request picker, inline validation,
// prefill from the URL, submission and analytics events.
//
// Submission order (see relays.mjs): Apps Script backend -> Web3Forms ->
// FormSubmit, each only if configured, stopping at the first that confirms
// delivery; if none do, a pre-filled email draft the customer can send
// themselves. A request only counts as sent when the service confirms it —
// FormSubmit answers an un-activated form with HTTP 200 +
// {"success":"false"}, and was unreachable altogether on 22 Sept 2026.

import { melbourneToday, bookableDates, windowsFor, isSlotFull, formatDate } from './booking.mjs';
import { sendFirst } from './relays.mjs';

const config = window.TLC_CONFIG;
const form = document.getElementById('quote-form');

if (form && config) init();

function init() {
  const $ = (id) => document.getElementById(id);
  const statusEl = $('quote-status');
  const fallbackEl = $('quote-fallback');
  const submitBtn = $('quote-submit');
  const daysEl = $('booking-days');
  const windowsEl = $('booking-windows');
  const pickerEl = $('booking-picker');
  const flexibleEl = $('q-flexible');
  const summaryEl = $('booking-summary');
  const dayField = $('q-day');

  const track = (name, params) => {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  };

  // ---------- Prefill from the URL ----------
  const params = new URLSearchParams(window.location.search);
  if (params.get('suburb')) $('q-suburb').value = params.get('suburb').slice(0, 80);
  if (params.get('plan') === 'subscription') $('q-frequency').value = 'Monthly subscription';

  // ---------- Booking request picker ----------
  const dates = bookableDates({ today: melbourneToday(), ...config.booking });
  let counts = {};
  let capacity = config.booking.slotCapacity;

  function renderDays() {
    if (!dates.length) {
      daysEl.innerHTML = '<p class="muted">No days are open for requests right now. Tick "I\'m flexible" and we\'ll suggest one.</p>';
      return;
    }
    daysEl.innerHTML = dates.map((iso) => {
      const f = formatDate(iso);
      const full = windowsFor(iso).every((w) => isSlotFull(counts, iso, w.id, capacity));
      return '<label class="day-chip">' +
        '<input type="radio" name="requestedDate" value="' + iso + '" aria-label="' + f.long + (full ? ', fully booked' : '') + '"' + (full ? ' disabled' : '') + '>' +
        '<span class="day-chip-wd" aria-hidden="true">' + f.weekday + '</span>' +
        '<span class="day-chip-d" aria-hidden="true">' + f.day + '</span>' +
        '<span class="day-chip-m" aria-hidden="true">' + f.month + '</span>' +
        '</label>';
    }).join('');
  }

  function selectedDate() {
    const el = form.querySelector('input[name="requestedDate"]:checked');
    return el ? el.value : '';
  }
  function selectedWindow() {
    const el = form.querySelector('input[name="requestedWindow"]:checked');
    return el ? el.value : '';
  }

  function renderWindows() {
    const iso = selectedDate() || dates[0];
    const keep = selectedWindow();
    windowsEl.innerHTML = iso ? windowsFor(iso).map((w) => {
      const full = selectedDate() && isSlotFull(counts, iso, w.id, capacity);
      return '<label class="window-option">' +
        '<input type="radio" name="requestedWindow" value="' + w.id + '"' +
        (keep === w.id && !full ? ' checked' : '') + (full ? ' disabled' : '') + '>' +
        '<span>' + w.label + '</span><small>' + (full ? 'Fully booked' : w.time) + '</small>' +
        '</label>';
    }).join('') : '';
  }

  function slotText() {
    if (flexibleEl.checked) return 'Flexible — suggest a time';
    const iso = selectedDate();
    const win = selectedWindow();
    if (!iso) return '';
    const f = formatDate(iso);
    const w = win && windowsFor(iso).find((x) => x.id === win);
    return f.long + (w ? ', ' + w.label.toLowerCase() + ' (' + w.time + ')' : '');
  }

  function updateSummary() {
    const text = slotText();
    dayField.value = text;
    if (flexibleEl.checked) summaryEl.textContent = "No problem — we'll suggest a time when we send your quote.";
    else if (selectedDate() && selectedWindow()) summaryEl.textContent = "You're requesting " + text + '.';
    else if (selectedDate()) summaryEl.textContent = 'Now choose morning or afternoon.';
    else summaryEl.textContent = '';
  }

  function setFlexible(on) {
    pickerEl.setAttribute('aria-disabled', String(on));
    if (on) {
      pickerEl.querySelectorAll('input').forEach((input) => { input.checked = false; input.disabled = true; });
    } else {
      // Re-rendering restores the correct disabled state for full slots.
      renderDays();
      renderWindows();
    }
    updateSummary();
  }

  daysEl.addEventListener('change', () => { renderWindows(); updateSummary(); clearError('booking'); });
  windowsEl.addEventListener('change', () => { updateSummary(); clearError('booking'); });
  flexibleEl.addEventListener('change', () => { setFlexible(flexibleEl.checked); clearError('booking'); });

  renderDays();
  renderWindows();

  // Live availability, only when the Apps Script backend is configured.
  // Counts only (no personal data). Failure just leaves the rule-based days.
  if (config.gasWebhookUrl) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    fetch(config.gasWebhookUrl + '?action=availability', { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => {
        if (!json || !json.ok) return;
        counts = json.counts || {};
        if (json.capacity) capacity = json.capacity;
        if (flexibleEl.checked) return;
        const keepDate = selectedDate();
        renderDays();
        const again = keepDate && form.querySelector('input[name="requestedDate"][value="' + keepDate + '"]:not(:disabled)');
        if (again) again.checked = true;
        renderWindows();
        updateSummary();
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
  }

  // ---------- Validation ----------
  const rules = [
    { id: 'q-suburb', test: (v) => v.trim().length > 1, msg: 'Enter your suburb or postcode.' },
    { id: 'q-size', test: (v) => !!v, msg: "Choose a lawn size, or “Not sure”." },
    { id: 'q-frequency', test: (v) => !!v, msg: "Choose how often you'd like it mowed." },
    { id: 'q-name', test: (v) => v.trim().length > 1, msg: 'Enter your name.' },
    { id: 'q-phone', test: (v) => v.replace(/\D/g, '').length >= 8, msg: 'Enter a phone number with at least 8 digits.' },
    { id: 'q-email', test: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()), msg: 'Enter an email address, like name@example.com.' }
  ];

  function showError(id, msg) {
    const errorEl = $(id + '-error');
    if (errorEl) errorEl.textContent = msg;
    const field = $(id);
    if (field && id !== 'booking') field.setAttribute('aria-invalid', 'true');
  }
  function clearError(id) {
    const errorEl = $(id + '-error');
    if (errorEl) errorEl.textContent = '';
    const field = $(id);
    if (field) field.removeAttribute('aria-invalid');
  }

  function validate() {
    let firstInvalid = null;
    for (const rule of rules) {
      const field = $(rule.id);
      if (rule.test(field.value)) { clearError(rule.id); continue; }
      showError(rule.id, rule.msg);
      firstInvalid = firstInvalid || field;
    }
    if (!flexibleEl.checked && !(selectedDate() && selectedWindow())) {
      showError('booking', dates.length
        ? "Choose a day and a time of day, or tick “I'm flexible”."
        : "Tick “I'm flexible” and we'll suggest a day.");
      firstInvalid = firstInvalid || form.querySelector('input[name="requestedDate"]:not(:disabled)') || flexibleEl;
    } else {
      clearError('booking');
    }
    return firstInvalid;
  }

  rules.forEach((rule) => {
    const field = $(rule.id);
    const recheck = () => { if (field.getAttribute('aria-invalid') === 'true' && rule.test(field.value)) clearError(rule.id); };
    field.addEventListener('input', recheck);
    field.addEventListener('change', recheck);
  });

  let started = false;
  form.addEventListener('input', () => {
    if (!started) { started = true; track('quote_start'); }
  });

  // ---------- Submission ----------
  async function withTimeout(ms, run) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try { return await run(controller.signal); } finally { clearTimeout(timer); }
  }

  async function sendViaAppsScript(data) {
    if (!config.gasWebhookUrl) return false;
    try {
      return await withTimeout(15000, async (signal) => {
        // text/plain avoids a CORS preflight, which Apps Script doesn't handle.
        const res = await fetch(config.gasWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'submitQuote', ...data }),
          signal
        });
        if (!res.ok) return false;
        const json = await res.json();
        return json.ok === true;
      });
    } catch (err) {
      return false;
    }
  }

  function autoresponse(data) {
    return 'Thanks ' + (data.name || '') + ' — your lawn mowing quote request has reached The Lawn Care.\n\n' +
      'Requested time: ' + (data.day || 'Flexible') + '\n' +
      'Suburb: ' + (data.suburb || '') + '\n\n' +
      "We'll reply within one business day with your price and a confirmed time (or the nearest free one). " +
      'Nothing is booked until you accept the quote and pay the deposit.';
  }

  // Web3Forms: free, called from the browser with a public access key. The
  // customer's `email` field becomes the Reply-To automatically. (Its free
  // plan has no autoresponder, so no customer confirmation email here.)
  async function sendViaWeb3Forms(data) {
    try {
      return await withTimeout(10000, async (signal) => {
        const fields = Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('_')));
        const res = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...fields,
            access_key: config.web3formsAccessKey,
            subject: 'New quote request — ' + (data.suburb || 'The Lawn Care'),
            from_name: 'The Lawn Care website',
            botcheck: false
          }),
          signal
        });
        const json = await res.json();
        return json.success === true;
      });
    } catch (err) {
      return false;
    }
  }

  async function sendViaFormSubmit(data) {
    try {
      return await withTimeout(10000, async (signal) => {
        // The raw address, exactly as before: FormSubmit ties its one-time
        // activation to this URL, and '@' is valid in a path segment.
        const res = await fetch('https://formsubmit.co/ajax/' + config.formEmail, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            ...data,
            _subject: 'New quote request — ' + (data.suburb || 'The Lawn Care'),
            _replyto: data.email,
            _captcha: 'false',
            _template: 'table',
            _autoresponse: autoresponse(data)
          }),
          signal
        });
        if (!res.ok) return false;
        const json = await res.json();
        return json.success === true || json.success === 'true';
      });
    } catch (err) {
      return false;
    }
  }

  function mailtoHref(data) {
    const lines = [
      'Name: ' + data.name,
      'Phone: ' + data.phone,
      'Email: ' + data.email,
      'Suburb: ' + data.suburb,
      'Lawn size: ' + data.size + (data.areaM2 ? ' (measured ' + Math.round(data.areaM2) + 'm², est. $' + data.estimateLow + '–$' + data.estimateHigh + ')' : ''),
      'Last mowed: ' + (data.lastMowed || 'Not sure'),
      'How often: ' + data.frequency,
      'Requested time: ' + (data.day || 'Flexible'),
      'Add-ons: ' + ([data.addonEdging, data.addonHedge].filter(Boolean).join(', ') || 'None'),
      'No green waste bin: ' + (data.noGreenBin ? 'Yes' : 'No'),
      'Notes: ' + (data.notes || '-')
    ];
    return 'mailto:' + config.formEmail +
      '?subject=' + encodeURIComponent('Lawn mowing quote request') +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  // Only promise a confirmation email when the service that delivered the
  // request actually sends one (Apps Script and FormSubmit do; Web3Forms'
  // free plan doesn't).
  const SENDS_CONFIRMATION = { sheet: true, formsubmit: true };

  function showSuccess(data, via) {
    form.hidden = true;
    const estimator = $('estimator');
    if (estimator) estimator.hidden = true;
    $('success-title').textContent = 'Quote request sent' + (data.name ? ', ' + data.name.trim().split(/\s+/)[0] : '');
    $('success-slot').textContent = data.flexible
      ? "You told us you're flexible, so we'll suggest a time with your quote."
      : 'You requested ' + data.day + '.';
    $('success-email').textContent = SENDS_CONFIRMATION[via]
      ? 'A confirmation email should reach ' + data.email + ' shortly. If it doesn’t, check your junk folder.'
      : 'We’ll reply to ' + data.email + ' or call you within one business day.';
    $('quote-success').hidden = false;
    $('quote-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('success-title').focus({ preventScroll: true });
  }

  let sending = false;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    fallbackEl.hidden = true;
    fallbackEl.innerHTML = '';
    statusEl.dataset.state = '';

    updateSummary();
    const data = Object.fromEntries(new FormData(form).entries());

    // Honeypot: real visitors never see this field. Pretend it worked so the
    // bot doesn't learn to retry, but send nothing.
    if (data._honey) { showSuccess(data, null); return; }

    const firstInvalid = validate();
    if (firstInvalid) {
      statusEl.dataset.state = 'error';
      statusEl.textContent = 'Check the highlighted fields above.';
      firstInvalid.focus();
      return;
    }

    sending = true;
    submitBtn.disabled = true;
    statusEl.textContent = 'Sending your request…';

    const result = await sendFirst([
      { name: 'sheet', enabled: !!config.gasWebhookUrl, send: sendViaAppsScript },
      { name: 'web3forms', enabled: !!config.web3formsAccessKey, send: sendViaWeb3Forms },
      { name: 'formsubmit', enabled: !!config.formEmail, send: sendViaFormSubmit }
    ], data);

    sending = false;
    submitBtn.disabled = false;
    if (result.ok) {
      statusEl.textContent = '';
      track('generate_lead', { suburb: data.suburb, frequency: data.frequency, flexible: !!data.flexible, via: result.via });
      showSuccess(data, result.via);
      return;
    }

    track('quote_send_failed');
    statusEl.dataset.state = 'error';
    statusEl.textContent = "Your request didn't go through automatically. Your details are still here — send them by email instead:";
    const link = document.createElement('a');
    link.className = 'btn btn-outline';
    link.href = mailtoHref(data);
    link.textContent = 'Open a pre-filled email';
    link.addEventListener('click', () => track('quote_fallback_email'));
    // Many phones have no mail app set up, so show the address to copy too.
    const address = document.createElement('p');
    address.className = 'form-note';
    address.textContent = 'Or email your details to ' + config.formEmail + '.';
    fallbackEl.append(link, address);
    fallbackEl.hidden = false;
  });
}
