/* ============================================================
   fresh.js — pemanis tampilan + pengaman suara (tanpa huruf kapital penuh)
   Dimuat sebelum app.js
   ============================================================ */

// Ubah kata berhuruf kapital penuh (2+ huruf) jadi huruf biasa berawalan kapital.
// contoh: "STEKOM" -> "Stekom", "CPU" -> "Cpu". Angka & kata 1 huruf dibiarkan.
function softCaps(text) {
  if (text == null) return '';
  return String(text).replace(/\b[A-Z][A-Z]+\b/g, function (w) {
    return w.charAt(0) + w.slice(1).toLowerCase();
  });
}

// Versi khusus suara: semua kata kapital penuh diucapkan sebagai kata,
// plus kamus kecil untuk singkatan yang kalau dibaca "kata" jadi aneh.
var SPEECH_MAP = {
  sks: 'es ka es', cpu: 'si pi yu', gpu: 'ji pi yu', ram: 'ram', ssd: 'es es de',
  krs: 'ka er es', nim: 'nim', ips: 'i pe es', url: 'yu er el', html: 'ha te em el',
  vpn: 'vi pi en', os: 'o es', it: 'ai ti', hp: 'ponsel', dkv: 'desain komunikasi visual',
  r1: 'ronde satu', r2: 'ronde dua', r3: 'ronde tiga', pts: 'poin'
};
function speechSafe(text) {
  if (!text) return '';
  var t = String(text)
    .replace(/\b[A-Z]{1,3}[0-9]\b/g, function (w) { return SPEECH_MAP[w.toLowerCase()] || w; })
    .replace(/\b[A-Z][A-Z]+\b/g, function (w) {
      var k = w.toLowerCase();
      return SPEECH_MAP[k] || k;
    });
  // singkirkan emoji supaya tidak dibacakan namanya
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, ' ');
  return t.replace(/\s+/g, ' ').trim();
}

(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- efek riak pada tombol ----------
  document.addEventListener('pointerdown', function (e) {
    var b = e.target.closest && e.target.closest('.btn, .option-btn, .island, .dstat-card');
    if (!b || reduce) return;
    var r = b.getBoundingClientRect();
    var d = Math.max(r.width, r.height) * 1.4;
    var s = document.createElement('span');
    s.className = 'fx-ripple';
    s.style.width = s.style.height = d + 'px';
    s.style.left = (e.clientX - r.left - d / 2) + 'px';
    s.style.top = (e.clientY - r.top - d / 2) + 'px';
    if (getComputedStyle(b).position === 'static') b.style.position = 'relative';
    b.style.overflow = b.style.overflow || 'hidden';
    b.appendChild(s);
    setTimeout(function () { s.remove(); }, 650);
  }, { passive: true });

  // ---------- kartu miring mengikuti kursor (desktop) ----------
  var tiltSel = '.login-card, .dialogue-box, .dstat-card, .final-score-card, .dash-podium-card, .dash-leader-card';
  document.addEventListener('pointermove', function (e) {
    if (reduce || e.pointerType !== 'mouse') return;
    var c = e.target.closest && e.target.closest(tiltSel);
    document.querySelectorAll('.fx-tilt').forEach(function (el) {
      if (el !== c) { el.classList.remove('fx-tilt'); el.style.transform = ''; }
    });
    if (!c) return;
    var r = c.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    c.classList.add('fx-tilt');
    c.style.transform = 'perspective(900px) rotateX(' + (-py * 4).toFixed(2) + 'deg) rotateY(' + (px * 5).toFixed(2) + 'deg) translateY(-2px)';
  }, { passive: true });

  // ---------- percikan bintang di latar ----------
  function addSparkles() {
    var bg = document.querySelector('.bg-fx');
    if (!bg || reduce) return;
    var wrap = document.createElement('div');
    wrap.className = 'fx-sparkles';
    wrap.setAttribute('aria-hidden', 'true');
    var n = window.innerWidth < 600 ? 14 : 26;
    for (var i = 0; i < n; i++) {
      var s = document.createElement('i');
      s.style.left = (Math.random() * 100) + '%';
      s.style.top = (Math.random() * 100) + '%';
      s.style.animationDelay = (Math.random() * 6).toFixed(2) + 's';
      s.style.animationDuration = (4 + Math.random() * 6).toFixed(2) + 's';
      var sz = 2 + Math.random() * 4;
      s.style.width = s.style.height = sz + 'px';
      wrap.appendChild(s);
    }
    // bentuk melayang
    var shapes = ['◆', '●', '▲', '✦', '■'];
    for (var j = 0; j < 7; j++) {
      var f = document.createElement('b');
      f.textContent = shapes[j % shapes.length];
      f.style.left = (5 + Math.random() * 90) + '%';
      f.style.animationDelay = (-Math.random() * 20).toFixed(1) + 's';
      f.style.animationDuration = (18 + Math.random() * 16).toFixed(1) + 's';
      f.style.fontSize = (14 + Math.random() * 22) + 'px';
      wrap.appendChild(f);
    }
    bg.appendChild(wrap);
  }

  // ---------- konfeti (dipanggil saat hasil / benar beruntun) ----------
  window.freshConfetti = function (count) {
    if (reduce) return;
    var colors = ['#00d4ff', '#ffd700', '#ff6b35', '#7cffcb', '#ff5fa2', '#9b7bff'];
    var box = document.createElement('div');
    box.className = 'fx-confetti';
    box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < (count || 70); i++) {
      var p = document.createElement('i');
      p.style.left = (Math.random() * 100) + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = (Math.random() * 0.8).toFixed(2) + 's';
      p.style.animationDuration = (2.2 + Math.random() * 2).toFixed(2) + 's';
      p.style.setProperty('--dx', ((Math.random() - 0.5) * 240).toFixed(0) + 'px');
      p.style.setProperty('--rot', ((Math.random() - 0.5) * 900).toFixed(0) + 'deg');
      p.style.width = (6 + Math.random() * 7) + 'px';
      p.style.height = (8 + Math.random() * 10) + 'px';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 5200);
  };

  // ---------- pantau pergantian layar: animasi masuk + konfeti di hasil ----------
  function watchScreens() {
    var screens = document.querySelectorAll('.screen');
    var mo = new MutationObserver(function (list) {
      list.forEach(function (m) {
        var el = m.target;
        if (m.attributeName !== 'class' || !el.classList.contains('active')) return;
        if (m.oldValue && m.oldValue.indexOf('active') !== -1) return;
        el.classList.remove('fx-enter'); void el.offsetWidth; el.classList.add('fx-enter');
        stagger(el);
        if (el.id === 'screen-result') setTimeout(function () { window.freshConfetti(110); }, 350);
      });
    });
    screens.forEach(function (s) { mo.observe(s, { attributes: true, attributeOldValue: true }); });
  }

  // anak-anak layar muncul berurutan
  function stagger(root) {
    if (reduce) return;
    var kids = root.querySelectorAll('.dstat-card, .island, .pd-stat, .podium > *, .leaderboard-list > *, .form-group');
    kids.forEach(function (k, i) {
      k.style.setProperty('--i', Math.min(i, 14));
      k.classList.remove('fx-pop'); void k.offsetWidth; k.classList.add('fx-pop');
    });
  }

  // opsi jawaban muncul bergantian saat soal dirender
  function watchOptions() {
    var box = document.getElementById('options-container');
    if (!box) return;
    new MutationObserver(function () {
      box.querySelectorAll('.option-btn').forEach(function (b, i) {
        b.style.setProperty('--i', i);
        b.classList.add('fx-pop');
      });
    }).observe(box, { childList: true });
  }

  // pulau di peta ikut di-stagger saat grid berubah
  function watchGrid() {
    var g = document.getElementById('pd-question-grid');
    if (!g) return;
    new MutationObserver(function () {
      g.querySelectorAll(':scope > *').forEach(function (k, i) {
        if (k.classList.contains('fx-pop')) return;
        k.style.setProperty('--i', Math.min(i, 14));
        k.classList.add('fx-pop');
      });
    }).observe(g, { childList: true });
  }

  // angka statistik naik pelan-pelan
  function watchCounters() {
    ['dash-total', 'dash-finished', 'dash-avg', 'dash-qcount'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      var last = 0, busy = false;
      new MutationObserver(function () {
        if (busy) return;
        var to = parseFloat(el.textContent);
        if (isNaN(to) || to === last) return;
        busy = true;
        var from = last, t0 = performance.now(), dur = 700;
        (function tick(t) {
          var k = Math.min(1, (t - t0) / dur);
          var v = from + (to - from) * (1 - Math.pow(1 - k, 3));
          el.textContent = Number.isInteger(to) ? Math.round(v) : v.toFixed(1);
          if (k < 1) requestAnimationFrame(tick);
          else { last = to; el.textContent = Number.isInteger(to) ? to : to.toFixed(1); setTimeout(function () { busy = false; }, 30); }
        })(t0);
      }).observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    addSparkles(); watchScreens(); watchOptions(); watchGrid(); watchCounters();
  });
})();
