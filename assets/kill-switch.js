// ---- Kill switch ----
// Reads status.txt (repo root). Line 1 must be exactly "DOWN" to trigger
// maintenance mode - anything else (missing/unreadable file, network
// hiccup, typo) fails open so the real site stays up. Doesn't apply to
// admin.html, so leads already in the pipeline stay manageable during an
// outage.
(function () {
  fetch('status.txt', { cache: 'no-store' })
    .then(function (res) { return res.ok ? res.text() : ''; })
    .then(function (text) {
      const lines = text.split('\n');
      const flag = (lines[0] || '').trim().toUpperCase();
      if (flag !== 'DOWN') return;
      const message = (lines[1] || '').trim() || "We're temporarily offline for maintenance — back shortly.";
      document.title = 'The Lawn Care — temporarily unavailable';
      document.body.innerHTML =
        '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--bg);color:var(--text);font-family:var(--font-body);text-align:center;">' +
          '<div style="max-width:440px;">' +
            '<div style="font-family:var(--font-display);font-weight:700;font-size:1.6rem;margin-bottom:14px;">The Lawn Care</div>' +
            '<p style="color:var(--text-muted);font-size:1.05rem;margin-bottom:14px;">' + message.replace(/[<>&]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]; }) + '</p>' +
            '<p style="color:var(--text-muted);font-size:0.9rem;">Urgent? Email <a href="mailto:ericho995@gmail.com" style="color:var(--accent-dark);font-weight:700;">ericho995@gmail.com</a></p>' +
          '</div>' +
        '</div>';
    })
    .catch(function () { /* network error - fail open, real site stays as-is */ });
})();
