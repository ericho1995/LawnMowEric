// Site-wide behaviour: mobile menu, sticky quote bar, CTA click tracking.
// Plain script (no modules) so it runs everywhere, including file://.
(function () {
  'use strict';

  var DESKTOP = window.matchMedia('(min-width: 70em)');

  // ---- Mobile menu ----
  var header = document.querySelector('[data-header]');
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.querySelector('[data-menu]');

  if (header && toggle && menu) {
    var focusables = function () {
      return [toggle].concat(Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])')));
    };

    var setOpen = function (open, returnFocus) {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.documentElement.classList.toggle('menu-open', open);
      if (open) {
        // The header is sticky, so its bottom edge is where the panel starts.
        menu.style.setProperty('--menu-top', header.getBoundingClientRect().bottom + 'px');
        var first = menu.querySelector('a[href]');
        if (first) first.focus();
      } else if (returnFocus) {
        toggle.focus();
      }
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true', true);
    });

    document.addEventListener('keydown', function (e) {
      if (!header.classList.contains('is-open')) return;
      if (e.key === 'Escape') {
        setOpen(false, true);
        return;
      }
      if (e.key === 'Tab') {
        var items = focusables();
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // Following a link (including same-page anchors) closes the panel.
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false, false);
    });

    DESKTOP.addEventListener('change', function (e) {
      if (e.matches) setOpen(false, false);
    });
  }

  // ---- Sticky quote bar: appears once the hero has scrolled away ----
  var bar = document.querySelector('[data-sticky-cta]');
  if (bar) {
    var hero = document.querySelector('[data-hero]');
    var show = function (visible) { bar.classList.toggle('is-visible', visible); };
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        show(!entries[0].isIntersecting);
      }).observe(hero);
    } else {
      var onScroll = function () { show(window.scrollY > 480); };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  }

  // ---- Analytics: CTA clicks (no-op until GA is configured) ----
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (el && typeof window.gtag === 'function') {
      window.gtag('event', 'cta_click', { label: el.getAttribute('data-track') });
    }
  });
})();
