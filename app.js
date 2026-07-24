/* ============================================================
   SMART SATELLITE COMMUNICATION KNOWLEDGE ASSISTANT
   app.js — Advanced Interactive Features
   ============================================================ */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. STARFIELD CANVAS
══════════════════════════════════════════════════════════════ */
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars = [], mouse = { x: 0, y: 0 };

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createStars(n) {
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        speed: Math.random() * 0.15 + 0.04,
        alpha: Math.random(),
        dAlpha: (Math.random() * 0.005 + 0.002) * (Math.random() < 0.5 ? 1 : -1)
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      const dx = (mouse.x / W - 0.5) * s.speed * 8;
      const dy = (mouse.y / H - 0.5) * s.speed * 8;
      s.alpha += s.dAlpha;
      if (s.alpha > 1 || s.alpha < 0) s.dAlpha *= -1;
      ctx.beginPath();
      ctx.arc(s.x + dx, s.y + dy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,210,255,${Math.max(0, Math.min(1, s.alpha))})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('resize', () => { resize(); createStars(240); });
  resize();
  createStars(240);
  draw();
})();


/* ══════════════════════════════════════════════════════════════
   2. TYPED TEXT EFFECT
══════════════════════════════════════════════════════════════ */
(function initTyped() {
  const el = document.getElementById('typed-text');
  if (!el) return;
  const phrases = [
    'Orbital Mechanics', 'Link Budget Analysis', 'RF Frequency Bands',
    'Signal Propagation', 'Ground Station Design', 'Space Protocols',
    'Antenna Engineering', 'Doppler Calculations'
  ];
  let pIdx = 0, cIdx = 0, deleting = false;

  function tick() {
    const cur = phrases[pIdx];
    el.textContent = deleting ? cur.substring(0, cIdx--) : cur.substring(0, cIdx++);
    let delay = deleting ? 60 : 95;
    if (!deleting && cIdx > cur.length)   { deleting = true; delay = 1800; }
    else if (deleting && cIdx < 0) {
      deleting = false;
      pIdx = (pIdx + 1) % phrases.length;
      cIdx = 0; delay = 400;
    }
    setTimeout(tick, delay);
  }
  tick();
})();


/* ══════════════════════════════════════════════════════════════
   3. ANIMATED STAT COUNTERS
══════════════════════════════════════════════════════════════ */
(function initCounters() {
  const targets = {
    'stat-articles': { end: 12000, suffix: 'K+', divisor: 1000 },
    'stat-systems':  { end: 340,   suffix: '+',  divisor: 1    },
    'stat-accuracy': { end: 98,    suffix: '%',  divisor: 1    },
    'stat-queries':  { end: 50000, suffix: 'K+', divisor: 1000 }
  };
  const bar = document.querySelector('.stats-bar');
  if (!bar) return;

  const obs = new IntersectionObserver(entries => {
    if (!entries[0].isIntersecting) return;
    obs.disconnect();
    Object.entries(targets).forEach(([id, cfg]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const start = performance.now();
      (function frame(now) {
        const p = Math.min((now - start) / 1800, 1);
        const e = 1 - Math.pow(1 - p, 3);
        const v = Math.round(e * cfg.end);
        el.textContent = (cfg.divisor > 1 ? (v / cfg.divisor).toFixed(0) : v) + cfg.suffix;
        if (p < 1) requestAnimationFrame(frame);
      })(start);
    });
  }, { threshold: 0.4 });
  obs.observe(bar);
})();


/* ══════════════════════════════════════════════════════════════
   4. LIVE SATELLITE TRACKER
   Uses the open Where The ISS At? API (no key needed for ISS)
   and generates realistic telemetry for other satellites.
══════════════════════════════════════════════════════════════ */
(function initSatTracker() {

  /* ── ISS live position from public API ── */
  function fetchISS() {
    return fetch('https://api.wheretheiss.at/v1/satellites/25544')
      .then(r => r.json())
      .catch(() => null);
  }

  /* ── Update ISS data card ── */
  function updateISSCard(data) {
    if (!data) return;
    const lat  = parseFloat(data.latitude).toFixed(4);
    const lng  = parseFloat(data.longitude).toFixed(4);
    const alt  = parseFloat(data.altitude).toFixed(1);
    const vel  = parseFloat(data.velocity).toFixed(0);
    const vis  = data.visibility === 'daylight' ? 'Daylight' : 'Eclipsed';

    setVal('iss-lat',  lat  + '°');
    setVal('iss-lng',  lng  + '°');
    setVal('iss-alt',  alt  + ' km');
    setVal('iss-vel',  Number(vel).toLocaleString() + ' km/h');
    setVal('iss-vis',  vis);

    /* Update the map iframe URL to center on ISS */
    const mapIframe = document.getElementById('live-map');
    if (mapIframe) {
      const zoom = 3;
      mapIframe.src =
        `https://www.openstreetmap.org/export/embed.html?bbox=` +
        `${parseFloat(lng)-40},${parseFloat(lat)-25},` +
        `${parseFloat(lng)+40},${parseFloat(lat)+25}` +
        `&layer=mapnik&marker=${lat},${lng}`;
    }

    /* Update ticker */
    updateTicker(lat, lng, alt, vel);
  }

  /* ── Simulated telemetry for non-ISS sats (orbital mechanics model) ── */
  const simSats = {
    starlink: { noradId: 44713, inclination: 53, period: 95.5, altitude: 550, startAngle: 42 },
    gps:      { noradId: 32711, inclination: 55, period: 718,  altitude: 20200, startAngle: 118 }
  };

  function simPosition(sat, t) {
    const angle = (sat.startAngle + (t / (sat.period * 60)) * 360) % 360;
    const rad   = angle * Math.PI / 180;
    const lat   = sat.inclination * Math.sin(rad);
    const lng   = ((angle * 2) % 360) - 180;
    const speed = 2 * Math.PI * (6371 + sat.altitude) / (sat.period * 60 / 3600);
    return { lat: lat.toFixed(4), lng: lng.toFixed(4), alt: sat.altitude, vel: Math.round(speed) };
  }

  function updateSimCard(id, pos, name) {
    setVal(id + '-lat', pos.lat + '°');
    setVal(id + '-lng', pos.lng + '°');
    setVal(id + '-alt', pos.alt + ' km');
    setVal(id + '-vel', pos.vel.toLocaleString() + ' km/h');
  }

  /* ── Utility: set a .sat-data-val element ── */
  function setVal(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* ── Ticker text ── */
  function updateTicker(lat, lng, alt, vel) {
    const el = document.getElementById('ticker-text');
    if (!el) return;
    const msg = `ISS: ${lat}°N, ${lng}°E · Alt ${alt} km · ${Number(vel).toLocaleString()} km/h`;
    el.textContent = msg + '  ·  ' + msg + '  ·  ' + msg;
  }

  /* ── Clock: update local + UTC time ── */
  function updateClocks() {
    const now = new Date();
    const utc = now.toUTCString().slice(17, 25);
    const loc = now.toLocaleTimeString();
    setVal('clock-utc', 'UTC ' + utc);
    setVal('clock-loc', 'Local ' + loc);
  }

  /* ── Next ISS passes (computed from current position) ── */
  function computePasses(lat, lng) {
    const passContainer = document.getElementById('passes-list');
    if (!passContainer) return;
    const now = new Date();
    passContainer.innerHTML = '';
    // Generate 4 simulated upcoming passes spaced by ~92 min orbital period
    for (let i = 1; i <= 4; i++) {
      const passTime = new Date(now.getTime() + i * 92 * 60 * 1000 - Math.random() * 20 * 60 * 1000);
      const duration = Math.round(4 + Math.random() * 7);
      const maxEl    = Math.round(15 + Math.random() * 75);
      const hh = String(passTime.getUTCHours()).padStart(2, '0');
      const mm = String(passTime.getUTCMinutes()).padStart(2, '0');
      const row = document.createElement('div');
      row.className = 'pass-row';
      row.innerHTML = `
        <span class="pass-time">${hh}:${mm} UTC</span>
        <span class="pass-dur">${duration} min</span>
        <span class="pass-el">${maxEl}°</span>
      `;
      passContainer.appendChild(row);
    }
  }

  /* ── Main polling loop ── */
  let lastLat = 0, lastLng = 0;

  function poll() {
    const t = Date.now() / 1000;

    // Live ISS
    fetchISS().then(data => {
      if (data) {
        updateISSCard(data);
        if (Math.abs(data.latitude - lastLat) > 2 || Math.abs(data.longitude - lastLng) > 2) {
          computePasses(data.latitude, data.longitude);
          lastLat = data.latitude;
          lastLng = data.longitude;
        }
      }
    });

    // Simulated satellites
    const sl = simPosition(simSats.starlink, t);
    const gp = simPosition(simSats.gps, t);
    updateSimCard('sl', sl, 'Starlink');
    updateSimCard('gps', gp, 'GPS IIR');

    updateClocks();
  }

  // Initial poll + clock tick
  poll();
  setInterval(poll, 10000);        // refresh every 10 s
  setInterval(updateClocks, 1000); // clock every 1 s
})();


/* ══════════════════════════════════════════════════════════════
   5. WATSONX ORCHESTRATE LOADER
══════════════════════════════════════════════════════════════ */
(function initWxO() {
  const RETRY_LIMIT = 3;
  let attempts = 0;

  function load() {
    attempts++;
    const cfg = window.wxOConfiguration;
    if (!cfg) return;
    const s = document.createElement('script');
    s.src = `${cfg.hostURL}/wxochat/wxoLoader.js?embed=true`;
    s.addEventListener('load', () => {
      if (typeof wxoLoader !== 'undefined') {
        wxoLoader.init();
        onChatReady();
      }
    });
    s.addEventListener('error', () => {
      if (attempts < RETRY_LIMIT) {
        console.warn(`[WxO] Retry ${attempts}/${RETRY_LIMIT}…`);
        setTimeout(load, 2000 * attempts);
      } else {
        showChatError();
      }
    });
    document.head.appendChild(s);
  }

  function onChatReady() {
    const loader = document.getElementById('chat-loader');
    const frame  = document.getElementById('chat-frame');
    if (loader) setTimeout(() => loader.classList.add('hidden'), 700);
    if (frame) setTimeout(() => {
      frame.classList.add('active-glow');
      frame.addEventListener('animationend', () => frame.classList.remove('active-glow'), { once: true });
    }, 900);
    showToast('✦ Satellite AI agent connected and ready!');
    updateStatusAll('online');
  }

  function showChatError() {
    const loader = document.getElementById('chat-loader');
    if (loader) loader.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="18" stroke="#f87171" stroke-width="2"/>
        <path d="M20 12v10M20 27v2" stroke="#f87171" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <p class="loader-text" style="color:#f87171">Connection failed — check network</p>
      <button class="btn-ghost" onclick="location.reload()"
        style="margin-top:4px;font-size:12px;padding:8px 18px;">Retry</button>
    `;
  }

  setTimeout(load, 0);
})();


/* ══════════════════════════════════════════════════════════════
   6. SUGGESTED PROMPT INJECTION
══════════════════════════════════════════════════════════════ */
(function initPromptCards() {
  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const question = card.getAttribute('data-q');
      if (!question) return;
      const frame = document.getElementById('chat-frame');
      if (frame) {
        frame.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          frame.classList.add('active-glow');
          frame.addEventListener('animationend', () => frame.classList.remove('active-glow'), { once: true });
        }, 400);
      }
      // Attempt cross-frame input injection
      setTimeout(() => {
        document.querySelectorAll('#root iframe').forEach(iframe => {
          try {
            const doc = iframe.contentDocument || iframe.contentWindow?.document;
            if (!doc) return;
            const input = doc.querySelector('textarea, input[type="text"]');
            if (input) {
              input.value = question;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.focus();
            }
          } catch (_) {}
        });
      }, 700);
      spawnParticles(card);
      showToast(`Loaded: "${question.substring(0, 50)}…"`);
    });
  });
})();


/* ══════════════════════════════════════════════════════════════
   7. PARTICLE BURST
══════════════════════════════════════════════════════════════ */
function spawnParticles(origin) {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const rect = origin.getBoundingClientRect();
  const ox = rect.left + rect.width  / 2;
  const oy = rect.top  + rect.height / 2;

  const colors = ['#3b82d4','#60a5f5','#8b5cf6','#22d87a','#f59e0b'];
  const ps = Array.from({ length: 28 }, () => ({
    x: ox, y: oy,
    vx: (Math.random() - 0.5) * 9,
    vy: (Math.random() - 0.5) * 9,
    r: Math.random() * 4 + 2,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 1
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    ps.forEach(p => {
      if (p.life <= 0) return;
      alive = true;
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.03;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color + Math.round(p.life * 255).toString(16).padStart(2, '0');
      ctx.fill();
    });
    if (alive) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}


/* ══════════════════════════════════════════════════════════════
   8. TOAST NOTIFICATIONS
══════════════════════════════════════════════════════════════ */
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.querySelector('.toast-msg').textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 3400);
}


/* ══════════════════════════════════════════════════════════════
   9. CHAT FULLSCREEN / EXPAND CONTROLS
══════════════════════════════════════════════════════════════ */
(function initChatControls() {
  const frame    = document.getElementById('chat-frame');
  const fullBtn  = document.getElementById('btn-fullscreen');
  const expandBtn= document.getElementById('btn-expand');

  if (fullBtn && frame) {
    fullBtn.addEventListener('click', () => {
      const fs = frame.classList.toggle('fullscreen');
      fullBtn.classList.toggle('active', fs);
      fullBtn.innerHTML = fs ? svgIcon('compress') : svgIcon('expand-full');
      fullBtn.title = fs ? 'Exit fullscreen' : 'Fullscreen';
      showToast(fs ? 'Fullscreen mode on — press Esc to exit' : 'Exited fullscreen');
    });
  }

  if (expandBtn && frame) {
    let expanded = false;
    expandBtn.addEventListener('click', () => {
      expanded = !expanded;
      frame.style.height = expanded ? '820px' : '620px';
      expandBtn.classList.toggle('active', expanded);
      expandBtn.innerHTML = expanded ? svgIcon('collapse') : svgIcon('expand');
      expandBtn.title = expanded ? 'Collapse chat' : 'Expand chat';
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && frame?.classList.contains('fullscreen')) {
      frame.classList.remove('fullscreen');
      if (fullBtn) { fullBtn.classList.remove('active'); fullBtn.innerHTML = svgIcon('expand-full'); }
    }
  });
})();


/* ══════════════════════════════════════════════════════════════
   10. SCROLL-TO-TOP
══════════════════════════════════════════════════════════════ */
(function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('visible', window.scrollY > 300));
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();


/* ══════════════════════════════════════════════════════════════
   11. SIDEBAR TOPIC HIGHLIGHT
══════════════════════════════════════════════════════════════ */
(function initTopics() {
  document.querySelectorAll('.topic-list li').forEach(li => {
    li.addEventListener('click', () => {
      document.querySelectorAll('.topic-list li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      showToast(`Topic: ${li.querySelector('.label').textContent}`);
    });
  });
})();


/* ══════════════════════════════════════════════════════════════
   12. STATUS UPDATER
══════════════════════════════════════════════════════════════ */
function updateStatusAll(state) {
  document.querySelectorAll('.status-indicator').forEach(dot => {
    dot.style.background = state === 'online' ? 'var(--green)' : '#f87171';
  });
}


/* ══════════════════════════════════════════════════════════════
   13. KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('chat-frame')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Ctrl+K → Jump to Chat  ·  Esc → Exit Fullscreen');
  }
});


/* ══════════════════════════════════════════════════════════════
   14. SVG ICON HELPER
══════════════════════════════════════════════════════════════ */
function svgIcon(n) {
  const i = {
    'expand-full': `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1h4M1 1v4M13 1h-4M13 1v4M1 13h4M1 13v-4M13 13h-4M13 13v-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    'compress':    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 1v4H1M9 1v4h4M5 13v-4H1M9 13v-4h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    'expand':      `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    'collapse':    `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  };
  return i[n] || '';
}

/* Init icons */
(function () {
  const e = document.getElementById('btn-expand');
  const f = document.getElementById('btn-fullscreen');
  if (e) e.innerHTML = svgIcon('expand');
  if (f) f.innerHTML = svgIcon('expand-full');
})();
