/* ============================================================
   MERIDIAN — main.js
   Vanilla JS · no libraries · rAF + transforms only
   ============================================================ */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

  function plural(n, one, few, many) {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  const html = document.documentElement;
  const body = document.body;

  /* ============================================================
     1. PRELOADER — letters rise + bronze line 0→100
     ============================================================ */
  (function preloader() {
    const pre = $('#preloader');
    if (!pre) return;

    const bar = $('#preloaderBar');
    const pct = $('#preloaderPercent');
    const MIN = reduced ? 200 : 1500;
    const MAX_WAIT = 3200;

    html.classList.add('is-locked');

    const t0 = performance.now();
    let pageLoaded = document.readyState === 'complete';
    let finished = false;

    window.addEventListener('load', () => { pageLoaded = true; });

    function finish() {
      if (finished) return;
      finished = true;
      pct.textContent = '100%';
      if (bar) bar.style.transform = 'scaleX(1)';
      pre.classList.add('is-done');
      html.classList.remove('is-locked');
      body.classList.add('is-loaded');
      setTimeout(() => { pre.hidden = true; }, 800);
    }

    function tick(now) {
      const elapsed = now - t0;
      const p = clamp(elapsed / MIN, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      if (pct) pct.textContent = Math.round(eased * 100) + '%';
      if (bar) bar.style.transform = 'scaleX(' + eased + ')';
      if (p >= 1 && (pageLoaded || elapsed > MAX_WAIT)) { finish(); return; }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ============================================================
     2. CUSTOM CURSOR (pointer: fine only)
     ============================================================ */
  (function cursor() {
    if (!finePointer || reduced) return;
    const wrap = $('#cursor');
    if (!wrap) return;

    const dot = $('.cursor__dot', wrap);
    const ring = $('.cursor__ring', wrap);
    if (!dot || !ring) return;

    body.classList.add('has-cursor');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let active = false;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!active) {
        active = true;
        wrap.classList.add('is-active');
        rx = mx; ry = my;
      }
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    }, { passive: true });

    document.addEventListener('mouseleave', () => {
      active = false;
      wrap.classList.remove('is-active');
    });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();

    const HOVER = 'a, button, input, select, label, .masonry__item, .range';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(HOVER)) wrap.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(HOVER)) wrap.classList.remove('is-hover');
    });
    document.addEventListener('mousedown', () => wrap.classList.add('is-down'));
    document.addEventListener('mouseup', () => wrap.classList.remove('is-down'));
  })();

  /* ============================================================
     3. SCROLL: progress bar · header state · back-to-top
     ============================================================ */
  const header = $('#header');
  const progressBar = $('#scrollProgress');
  const toTop = $('#toTop');

  (function scrollEffects() {
    if (!progressBar && !header && !toTop) return;

    let ticking = false;

    function update() {
      ticking = false;
      const y = window.scrollY || window.pageYOffset;
      const max = Math.max(1, html.scrollHeight - window.innerHeight);

      if (progressBar) {
        // scaleX applied to ::before via CSS custom property
        progressBar.style.setProperty('--progress', (y / max).toFixed(4));
      }

      if (header) header.classList.toggle('is-scrolled', y > 40);
      if (toTop) toTop.classList.toggle('is-visible', y > 640);
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    update();
  })();

  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ============================================================
     4. BURGER · fullscreen mobile menu (stagger)
     ============================================================ */
  (function mobileMenu() {
    const burger = $('#burger');
    const menu = $('#mobileMenu');
    if (!burger || !menu) return;

    function setOpen(open) {
      burger.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      menu.setAttribute('aria-hidden', String(!open));
      html.classList.toggle('is-locked', open);
    }

    burger.addEventListener('click', () => {
      setOpen(!menu.classList.contains('is-open'));
    });

    $$('.mmenu__link', menu).forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) setOpen(false);
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 992 && menu.classList.contains('is-open')) setOpen(false);
    });
  })();

  /* ============================================================
     5. SMOOTH ANCHORS (header offset via scroll-margin)
     ============================================================ */
  (function anchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', id);
      });
    });
  })();

  /* ============================================================
     6. REVEALS (IntersectionObserver) + stagger
     ============================================================ */
  (function reveals() {
    const items = $$('.reveal');
    if (!items.length) return;

    // auto-stagger inside [data-stagger] groups
    $$('[data-stagger]').forEach((group) => {
      $$('.reveal', group).forEach((el, i) => {
        if (!el.style.getPropertyValue('--rd')) {
          el.style.setProperty('--rd', (i * 90) + 'ms');
        }
      });
    });

    // manual delays: data-delay="n" → n * 90ms
    items.forEach((el) => {
      const d = el.getAttribute('data-delay');
      if (d && !el.style.getPropertyValue('--rd')) {
        el.style.setProperty('--rd', (parseInt(d, 10) * 90) + 'ms');
      }
    });

    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-visible');

        // clear delay after reveal so hover transitions stay instant
        const clear = (e) => {
          if (e.propertyName === 'transform') {
            el.style.setProperty('--rd', '0ms');
            el.removeEventListener('transitionend', clear);
          }
        };
        el.addEventListener('transitionend', clear);
        io.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    items.forEach((el) => io.observe(el));
  })();

  /* ============================================================
     7. COUNTERS (numbers · percents)
     ============================================================ */
  function animateCount(el) {
    const target = parseFloat(el.getAttribute('data-count')) || 0;
    const suffix = el.getAttribute('data-suffix') || '';
    if (reduced) {
      el.textContent = fmt(target) + suffix;
      return;
    }
    const DUR = 1600;
    const t0 = performance.now();

    function step(now) {
      const p = clamp((now - t0) / DUR, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  (function counters() {
    const els = $$('[data-count]');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(animateCount);
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });

    els.forEach((el) => io.observe(el));
  })();

  /* ============================================================
     8. PARALLAX (data-speed, transforms only)
     ============================================================ */
  (function parallax() {
    if (reduced || !finePointer) return;
    const els = $$('[data-speed]');
    if (!els.length) return;

    let ticking = false;

    function update() {
      ticking = false;
      const vh = window.innerHeight;
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.bottom < -80 || rect.top > vh + 80) return;
        const speed = parseFloat(el.getAttribute('data-speed')) || 0;
        const delta = (rect.top + rect.height / 2) - vh / 2;
        const shift = clamp(-delta * speed, -90, 90);
        el.style.setProperty('--py', shift.toFixed(1) + 'px');
      });
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  })();

  /* ============================================================
     9. MAGNETIC BUTTONS
     ============================================================ */
  (function magnetic() {
    if (!finePointer || reduced) return;
    $$('[data-magnetic]').forEach((el) => {
      const strength = 0.28;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate3d(' + (dx * strength).toFixed(1) + 'px,' +
          (dy * strength).toFixed(1) + 'px,0)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translate3d(0,0,0)';
      });
    });
  })();

  /* ============================================================
     10. MARQUEE — duplicate chunk for seamless loop
     ============================================================ */
  (function marquee() {
    const track = $('#marqueeTrack');
    if (!track || reduced) return;
    const seq = $('.marquee__seq', track);
    if (!seq) return;

    const chunk = document.createElement('div');
    chunk.className = 'marquee__chunk';
    chunk.setAttribute('aria-hidden', 'true');
    chunk.innerHTML = seq.innerHTML;
    track.appendChild(chunk); // in DOM first, so offsetWidth is measurable
    while (chunk.offsetWidth < window.innerWidth && chunk.children.length < 200) {
      chunk.innerHTML += chunk.innerHTML;
    }
    track.appendChild(chunk.cloneNode(true));
    seq.remove();
  })();

  /* ============================================================
     11. CATALOG FILTERING (fade / scale, staggered)
     ============================================================ */
  (function catalog() {
    const chips = $$('.filters__chip');
    const grid = $('#cardsGrid');
    if (!chips.length || !grid) return;

    const cards = $$('.card', grid);
    const countEl = $('#catalogCount');

    function apply(filter) {
      let shown = 0;
      cards.forEach((card) => {
        const groups = (card.getAttribute('data-groups') || '').split(/\s+/);
        const match = filter === 'all' || groups.indexOf(filter) !== -1;
        clearTimeout(card._hideT);
        card.classList.remove('is-in', 'is-out');

        if (match) {
          card.hidden = false;
          card.style.setProperty('--d', (shown * 70) + 'ms');
          void card.offsetWidth; // restart animation
          card.classList.add('is-in');
          shown++;
        } else {
          card.classList.add('is-out');
          card._hideT = setTimeout(() => {
            if (card.classList.contains('is-out')) card.hidden = true;
          }, 340);
        }
      });
      if (countEl) {
        countEl.textContent = shown + ' ' + plural(shown, 'резиденция', 'резиденции', 'резиденций');
      }
    }

    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (chip.classList.contains('is-active')) return;
        chips.forEach((c) => {
          c.classList.toggle('is-active', c === chip);
          c.setAttribute('aria-pressed', String(c === chip));
        });
        apply(chip.getAttribute('data-filter'));
      });
    });

    apply('all');
  })();

  /* ============================================================
     12. MORTGAGE CALCULATOR (annuity, live)
     ============================================================ */
  (function calculator() {
    const cost = $('#calcCost');
    const down = $('#calcDown');
    const term = $('#calcTerm');
    if (!cost || !down || !term) return;

    const outCost = $('#calcCostOut');
    const outDown = $('#calcDownOut');
    const outTerm = $('#calcTermOut');
    const outPay = $('#calcPayment');
    const outLoan = $('#calcLoan');
    const outDownSum = $('#calcDownSum');
    const outOver = $('#calcOver');

    const RATE = 0.057;

    function paint(input) {
      const min = parseFloat(input.min);
      const max = parseFloat(input.max);
      const p = ((parseFloat(input.value) - min) / (max - min)) * 100;
      input.style.setProperty('--fill', p.toFixed(2) + '%');
    }

    function pluralYear(n) {
      return n + ' ' + plural(n, 'год', 'года', 'лет');
    }

    function calc() {
      const c = parseFloat(cost.value);
      const d = parseFloat(down.value);
      const y = parseFloat(term.value);

      const downSum = c * (d / 100) * 1e6;
      const loan = c * 1e6 - downSum;
      const n = Math.round(y * 12);
      const i = RATE / 12;

      const payment = loan * i / (1 - Math.pow(1 + i, -n));
      const total = payment * n;
      const over = total - loan;

      if (outCost) outCost.textContent = fmt(c) + ' млн ₽';
      if (outDown) outDown.textContent = Math.round(d) + '%';
      if (outTerm) outTerm.textContent = pluralYear(Math.round(y));
      if (outPay) outPay.textContent = fmt(Math.round(payment / 100) * 100);
      if (outLoan) outLoan.textContent = fmt(loan) + ' ₽';
      if (outDownSum) outDownSum.textContent = fmt(downSum) + ' ₽';
      if (outOver) outOver.textContent = fmt(over) + ' ₽';

      paint(cost); paint(down); paint(term);
    }

    [cost, down, term].forEach((input) => {
      input.addEventListener('input', calc);
      paint(input);
    });

    calc();
  })();

  /* ============================================================
     13. BUILD PROGRESS BARS (animate on view)
     ============================================================ */
  (function buildProgress() {
    const list = $('#buildList');
    if (!list) return;
    const fills = $$('.build__fill', list);

    function run() {
      fills.forEach((fill, i) => {
        const v = clamp(parseFloat(fill.getAttribute('data-value')) || 0, 0, 100);
        fill.style.transitionDelay = (i * 160) + 'ms';
        fill.style.transform = 'scaleX(' + (v / 100) + ')';
      });
    }

    if (reduced || !('IntersectionObserver' in window)) {
      fills.forEach((fill) => {
        const v = clamp(parseFloat(fill.getAttribute('data-value')) || 0, 0, 100);
        fill.style.transform = 'scaleX(' + (v / 100) + ')';
      });
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        run();
        io.unobserve(entry.target);
      });
    }, { threshold: 0.3 });

    io.observe(list);
  })();

  /* ============================================================
     14. LIGHTBOX (gallery)
     ============================================================ */
  (function lightbox() {
    const box = $('#lightbox');
    const img = $('#lightboxImg');
    const cap = $('#lightboxCaption');
    const counter = $('#lightboxCounter');
    if (!box || !img) return;

    const items = $$('[data-lightbox]');
    const sources = items.map((it) => {
      const i = $('img', it);
      return { src: i ? i.getAttribute('src') : '', alt: i ? i.getAttribute('alt') : '' };
    });

    let index = 0;
    let lastFocus = null;

    function render() {
      const s = sources[index];
      if (!s) return;
      img.src = s.src;
      img.alt = s.alt;
      if (cap) cap.textContent = s.alt;
      if (counter) counter.textContent = (index + 1) + ' / ' + sources.length;
    }

    function open(i) {
      index = i;
      render();
      lastFocus = document.activeElement;
      box.hidden = false;
      requestAnimationFrame(() => box.classList.add('is-open'));
      html.classList.add('is-locked');
      $('#lightboxClose').focus();
    }

    function close() {
      box.classList.remove('is-open');
      html.classList.remove('is-locked');
      setTimeout(() => { box.hidden = true; }, reduced ? 0 : 400);
      if (lastFocus) lastFocus.focus();
    }

    function step(dir) {
      index = (index + dir + sources.length) % sources.length;
      render();
    }

    items.forEach((it, i) => {
      it.setAttribute('tabindex', '0');
      it.setAttribute('role', 'button');
      it.setAttribute('aria-label', 'Открыть фото: ' + ($('img', it) ? $('img', it).alt : ''));
      it.addEventListener('click', () => open(i));
      it.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });

    $('#lightboxClose').addEventListener('click', close);
    $('#lightboxPrev').addEventListener('click', () => step(-1));
    $('#lightboxNext').addEventListener('click', () => step(1));

    box.addEventListener('click', (e) => {
      if (e.target === box) close();
    });

    document.addEventListener('keydown', (e) => {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  })();

  /* ============================================================
     15. FORM — phone mask · validation · prefill · success
     ============================================================ */
  (function form() {
    const form = $('#leadForm');
    if (!form) return;

    const nameInput = $('#fieldName');
    const phoneInput = $('#fieldPhone');
    const interest = $('#fieldInterest');
    const nameField = nameInput ? nameInput.closest('.field') : null;
    const phoneField = phoneInput ? phoneInput.closest('.field') : null;
    const formBody = $('#formBody');
    const success = $('#formSuccess');
    const successPhone = $('#successPhone');

    function formatPhone(value) {
      let d = value.replace(/\D/g, '');
      if (d.startsWith('8')) d = '7' + d.slice(1);
      if (d && d[0] !== '7') d = '7' + d;
      d = d.slice(0, 11);
      if (!d) return '';
      let out = '+7';
      if (d.length > 1) out += ' (' + d.slice(1, 4);
      if (d.length >= 5) out += ') ' + d.slice(4, 7);
      if (d.length >= 8) out += '-' + d.slice(7, 9);
      if (d.length >= 10) out += '-' + d.slice(9, 11);
      return out;
    }

    if (phoneInput) {
      phoneInput.addEventListener('input', () => {
        phoneInput.value = formatPhone(phoneInput.value);
        if (phoneField) phoneField.classList.remove('is-error');
      });
    }
    if (nameInput) {
      nameInput.addEventListener('input', () => {
        if (nameField) nameField.classList.remove('is-error');
      });
    }

    /* --- prefill from catalog «Хочу смотреть» --- */
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.card__btn[data-interest]');
      if (!btn) return;
      const val = btn.getAttribute('data-interest');
      if (!interest) return;
      interest.value = val;
      const field = interest.closest('.field');
      if (field) {
        field.classList.remove('field--flash');
        void field.offsetWidth;
        field.classList.add('field--flash');
        field.addEventListener('animationend', () => {
          field.classList.remove('field--flash');
        }, { once: true });
      }
      const target = $('#contacts');
      if (target) {
        target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      }
      setTimeout(() => { if (nameInput) nameInput.focus({ preventScroll: true }); }, reduced ? 0 : 650);
    });

    /* --- submit --- */
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameOk = nameInput && nameInput.value.trim().length >= 2;
      const phoneDigits = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
      const phoneOk = phoneDigits.length === 11;

      if (nameField) nameField.classList.toggle('is-error', !nameOk);
      if (phoneField) phoneField.classList.toggle('is-error', !phoneOk);

      if (!nameOk) { if (nameInput) nameInput.focus(); return; }
      if (!phoneOk) { if (phoneInput) phoneInput.focus(); return; }

      if (successPhone) successPhone.textContent = phoneInput.value;
      if (formBody) formBody.hidden = true;
      if (success) {
        success.hidden = false;
        success.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      }
    });
  })();

  /* ============================================================
     16. HERO VIDEO — fallback + reduced motion
     ============================================================ */
  (function heroVideo() {
    const hero = $('.hero');
    const video = $('#heroVideo');
    if (!hero || !video) return;

    let done = false;
    function fallback() {
      if (done) return;
      done = true;
      hero.classList.add('hero--no-video');
    }

    video.addEventListener('error', fallback);
    const source = video.querySelector('source');
    if (source) source.addEventListener('error', fallback);

    video.addEventListener('canplay', () => {
      done = true;
      video.classList.add('is-ready');
    });

    if (reduced) {
      video.removeAttribute('autoplay');
      video.pause();
      video.classList.add('is-ready');
    } else {
      // safety net: if video can't start — show animated bronze gradient
      setTimeout(() => {
        if (video.readyState < 3) fallback();
      }, 4000);
    }

    video.muted = true; // ensure autoplay policy compliance
  })();

})();
