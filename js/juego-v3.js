/* ================================================================
   MENTES BRILLANTES V3 — Gamma look + didáctica V2 + frames reales
   ================================================================ */
let DATA = null, WORLDS = [];
const SAVE_KEY = 'mentes-brillantes-v3';
const ANIM = {
  idle: { count: 8, fps: 8, loop: true },
  move: { count: 8, fps: 10, loop: true },
  attack: { count: 8, fps: 12, loop: false },
  hit: { count: 6, fps: 10, loop: false }
};
/* Cache de Image ya decodificadas: evita re-decodificar PNGs grandes al cambiar de frame. */
const FRAME_CACHE = new Map();

/* Héroe del mundo actual (ya no hay selección manual). */
function currentHero() {
  const w = WORLDS[S.current] || WORLDS[0];
  if (!w?.hero) {
    return { id: 'doctor', anim: 'doctor', name: 'Dr. Aelion', img: 'image/doctor.png' };
  }
  return {
    id: w.hero.anim,
    anim: w.hero.anim,
    name: w.hero.name,
    img: w.hero.img
  };
}

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const go = id => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  S.screen = id.replace(/^s-/, '');
};

const S = {
  screen: 'load', current: 0, conquered: [], totalOK: 0, totalQ: 0
};
let B = null, tmr = null, tLeft = 15, players = new WeakMap();
let stopCinematic = null;

/* Videos de carga por héroe (viaje / victoria / derrota). */
const HERO_CLIPS = {
  doctor: {
    travel: 'image/pantallasdecarga/viajandomedico.mp4',
    victory: 'image/pantallasdecarga/victoriamedico.mp4',
    defeat: 'image/pantallasdecarga/derrotamedico.mp4'
  },
  enfermera: {
    travel: 'image/pantallasdecarga/viajandoenfermera.mp4',
    victory: 'image/pantallasdecarga/victoriaenfermera.mp4',
    defeat: 'image/pantallasdecarga/derrotaenfermera.mp4'
  },
  cirujano: {
    travel: 'image/pantallasdecarga/viajandocirujano.mp4',
    victory: 'image/pantallasdecarga/victoriacirujano.mp4',
    defeat: 'image/pantallasdecarga/derrotacirujano.mp4'
  },
  terapeuta: {
    travel: 'image/pantallasdecarga/viajandoterapeutica.mp4',
    victory: 'image/pantallasdecarga/victoriaTerapeuta.mp4',
    defeat: 'image/pantallasdecarga/derrotaterapeuta.mp4'
  },
  recepcionista: {
    travel: 'image/pantallasdecarga/viajandorecepcionista.mp4',
    victory: 'image/pantallasdecarga/victoriaRecepcionista.mp4',
    defeat: 'image/pantallasdecarga/derrotarecepcionista.mp4'
  },
  bacteriologa: {
    travel: 'image/pantallasdecarga/viajandobacteriologa.mp4',
    victory: 'image/pantallasdecarga/victoriabacteriologa.mp4',
    defeat: 'image/pantallasdecarga/derrotabacteriologa.mp4'
  }
};
const FINAL_CLIP = 'image/pantallasdecarga/conguistasteelsistemamentesbrillantes.mp4';

function heroClips(anim) {
  return HERO_CLIPS[anim] || HERO_CLIPS.doctor;
}

function makeCinematicVideo(src) {
  const v = document.createElement('video');
  v.className = 'cinematic-video';
  v.src = src;
  v.muted = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.preload = 'auto';
  return v;
}

function clearCinematic() {
  if (stopCinematic) stopCinematic();
}

/** Video a pantalla completa con crossfade en loop (victoria / derrota / final). */
function startCinematicLoop(scr, src) {
  clearCinematic();
  const FADE_MS = 500;
  const a = makeCinematicVideo(src);
  const b = makeCinematicVideo(src);
  b.classList.add('is-off');
  const actions = scr.querySelector('.video-actions');
  if (actions) {
    scr.insertBefore(a, actions);
    scr.insertBefore(b, actions);
  } else {
    scr.appendChild(a);
    scr.appendChild(b);
  }

  let active = a;
  let standby = b;
  let switching = false;
  let raf = 0;
  let alive = true;

  const tick = () => {
    if (!alive) return;
    const d = active.duration;
    if (d && Number.isFinite(d) && !switching && active.currentTime >= Math.max(0.05, d - FADE_MS / 1000)) {
      switching = true;
      try { standby.currentTime = 0; } catch (_) {}
      standby.play().catch(() => {});
      standby.classList.remove('is-off');
      active.classList.add('is-off');
      const prev = active;
      active = standby;
      standby = prev;
      setTimeout(() => {
        if (!alive) return;
        prev.pause();
        try { prev.currentTime = 0; } catch (_) {}
        switching = false;
      }, FADE_MS);
    }
    raf = requestAnimationFrame(tick);
  };

  a.play().catch(() => {});
  raf = requestAnimationFrame(tick);

  stopCinematic = () => {
    alive = false;
    cancelAnimationFrame(raf);
    a.pause();
    b.pause();
    a.remove();
    b.remove();
    stopCinematic = null;
  };
}

/** Video de viaje: se reproduce una vez y luego llama onEnded.
 *  opts.maxMs = tope de duración (por defecto 2s para no demorar). */
function playCinematicOnce(scr, src, onEnded, opts = {}) {
  clearCinematic();
  const maxMs = opts.maxMs ?? 2000;
  const rate = opts.rate ?? 1.35;
  const v = makeCinematicVideo(src);
  v.playbackRate = rate;
  scr.appendChild(v);
  let done = false;
  let alive = true;
  let fallback = 0;

  const cleanup = () => {
    clearTimeout(fallback);
    v.pause();
    v.remove();
    stopCinematic = null;
  };

  const finish = () => {
    if (done || !alive) return;
    done = true;
    alive = false;
    cleanup();
    onEnded?.();
  };

  v.addEventListener('ended', finish);
  v.addEventListener('error', finish);
  v.play().catch(finish);
  fallback = setTimeout(finish, maxMs);

  stopCinematic = () => {
    if (done) return;
    alive = false;
    cleanup();
  };
}

function setVideoScreen(scr, on) {
  scr.classList.toggle('video-mode', !!on);
  if (on) scr.style.backgroundImage = '';
}

function animPath(slug, action, i) {
  return `image/anim-v3/${slug}/${action}/frame-${String(i).padStart(2, '0')}.png`;
}
function fallbackPath(slug) {
  if (slug === 'monstruo') return 'image/monstruo.png';
  return `image/${slug}.png`;
}
/* Idle: los frame-XX traen onion-skin y las keys _keys/* no tienen alpha (fondo negro).
   Usamos el render estático con transparencia. */
function idleStillPath(slug) {
  return fallbackPath(slug);
}

function warmFrame(url) {
  let img = FRAME_CACHE.get(url);
  if (img) {
    if (img.complete && img.naturalWidth) return Promise.resolve(img);
    return new Promise(res => {
      img.addEventListener('load', () => res(img), { once: true });
      img.addEventListener('error', () => res(img), { once: true });
    });
  }
  img = new Image();
  FRAME_CACHE.set(url, img);
  return new Promise(res => {
    img.onload = img.onerror = () => res(img);
    img.src = url;
  });
}

function applyFrame(img, src, fallback) {
  const cached = FRAME_CACHE.get(src);
  if (cached && cached.complete && cached.naturalWidth) {
    img.dataset.frameSrc = src;
    img.src = cached.src;
    return true;
  }
  if (fallback) {
    img.dataset.frameSrc = fallback;
    img.src = fallback;
  }
  return false;
}

/* Crossfade al volver a idle para no cortar la pose de ataque/golpe */
async function settleToIdle(img, slug, token) {
  const src = idleStillPath(slug);
  await warmFrame(src);
  if (players.get(img)?.token !== token) return;

  const fromSrc = img.currentSrc || img.src;
  if (!fromSrc || img.dataset.frameSrc === src) {
    applyFrame(img, src) || (img.src = src);
    img.style.opacity = '';
    return;
  }

  const slot = img.closest('.char-slot') || img.parentElement;
  slot?.querySelectorAll('.char-ghost').forEach(el => el.remove());

  const ghost = document.createElement('img');
  ghost.className = 'char-anim char-ghost';
  ghost.alt = '';
  ghost.src = fromSrc;
  slot.appendChild(ghost);

  applyFrame(img, src) || (img.src = src);
  img.classList.add('char-fade');
  img.style.opacity = '0';
  ghost.style.opacity = '1';

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  if (players.get(img)?.token !== token) {
    ghost.remove();
    img.classList.remove('char-fade');
    img.style.opacity = '';
    return;
  }

  ghost.style.opacity = '0';
  img.style.opacity = '1';
  await sleep(320);
  ghost.remove();
  img.classList.remove('char-fade');
  img.style.opacity = '';
}

/* ---------- Frame player ---------- */
function setAction(img, slug, action, opts = {}) {
  if (!img) return Promise.resolve();
  const cfg = ANIM[action] || ANIM.idle;
  const prev = players.get(img) || { token: 0 };
  const token = ++prev.token;
  players.set(img, prev);
  img.dataset.animSlug = slug;
  img.dataset.animAction = action;

  // Idle estático limpio, con fundido si venimos de otra animación
  if (action === 'idle') {
    return settleToIdle(img, slug, token);
  }

  img.style.opacity = '';
  img.classList.remove('char-fade');
  img.closest('.char-slot')?.querySelectorAll('.char-ghost').forEach(el => el.remove());

  return new Promise(resolve => {
    const duration = opts.duration || (cfg.count / cfg.fps) * 1000;
    let start = 0;

    function show(idx) {
      const src = animPath(slug, action, idx);
      if (img.dataset.frameSrc === src) return;
      applyFrame(img, src);
    }

    function tick(now) {
      if (players.get(img)?.token !== token) return resolve();
      if (!start) start = now;
      const elapsed = now - start;
      let idx;
      if (cfg.loop) idx = Math.floor(elapsed / (1000 / cfg.fps)) % cfg.count;
      else idx = Math.min(cfg.count - 1, Math.floor((elapsed / duration) * cfg.count));
      show(idx);
      if (cfg.loop || elapsed < duration) requestAnimationFrame(tick);
      else {
        if (opts.nextIdle !== false) setAction(img, slug, 'idle');
        resolve();
      }
    }

    const seq = [];
    for (let i = 0; i < cfg.count; i++) seq.push(warmFrame(animPath(slug, action, i)));
    Promise.all(seq).then(() => {
      if (players.get(img)?.token !== token) return resolve();
      const first = FRAME_CACHE.get(animPath(slug, action, 0));
      if (!first || !first.naturalWidth) {
        img.src = fallbackPath(slug);
        return resolve();
      }
      requestAnimationFrame(tick);
    });
  });
}

/* ---------- Progress ---------- */
function fresh() { return Array(WORLDS.length).fill(false); }
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: DATA.version, conquered: S.conquered,
      totalOK: S.totalOK, totalQ: S.totalQ, current: S.current
    }));
  } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return;
    const d = JSON.parse(raw);
    if (d.version !== DATA.version) return;
    if (!Array.isArray(d.conquered) || d.conquered.length !== WORLDS.length) return;
    S.conquered = d.conquered;
    S.totalOK = d.totalOK || 0; S.totalQ = d.totalQ || 0; S.current = d.current || 0;
  } catch (e) {}
}
function hasProgress() { return S.totalQ > 0 || S.conquered.some(Boolean); }

/* Mundo N solo si el anterior está conquistado (el 1 siempre abierto). */
function isWorldUnlocked(i) {
  if (i <= 0) return true;
  return !!S.conquered[i - 1];
}

function shuffle4() {
  const a = [0, 1, 2, 3];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Preload ---------- */
async function preloadAll() {
  const urls = new Set();
  urls.add(DATA.ui.startBg); urls.add(DATA.ui.finalBg); urls.add(DATA.ui.logo);
  WORLDS.forEach(w => {
    Object.values(w.bg || {}).forEach(u => urls.add(u));
    urls.add(w.hero.img); urls.add(w.icon);
    urls.add(idleStillPath(w.hero.anim));
    ['move', 'attack', 'hit'].forEach(act => {
      const n = ANIM[act].count;
      for (let i = 0; i < n; i++) urls.add(animPath(w.hero.anim, act, i));
    });
  });
  // el monstruo es compartido por todos los mundos: se precarga completo aquí
  urls.add(idleStillPath('monstruo'));
  ['move', 'attack', 'hit'].forEach(act => {
    const n = ANIM[act].count;
    for (let i = 0; i < n; i++) urls.add(animPath('monstruo', act, i));
  });
  const list = [...urls].filter(Boolean);
  const bar = $('#lbar'), txt = $('#ltxt');
  const msgs = ['Cargando mundos...', 'Preparando personajes...', 'Cargando animaciones...', 'Casi listo...', '¡A jugar!'];
  let loaded = 0;
  const chunk = 12;
  for (let i = 0; i < list.length; i += chunk) {
    const slice = list.slice(i, i + chunk);
    await Promise.all(slice.map(url => warmFrame(url).then(() => {
      loaded++;
      const pct = Math.round(loaded / list.length * 100);
      bar.style.width = pct + '%';
      txt.textContent = msgs[Math.min(Math.floor(pct / 25), 4)];
    })));
  }
}

/* Precarga los frames de animación del héroe elegido justo tras seleccionarlo */
async function preloadHeroAnims(hero) {
  const urls = [idleStillPath(hero.anim)];
  ['move', 'attack', 'hit'].forEach(act => {
    const n = ANIM[act].count;
    for (let i = 0; i < n; i++) urls.push(animPath(hero.anim, act, i));
  });
  await Promise.all(urls.map(url => warmFrame(url)));
}

/* ---------- Screens ---------- */
function toast(msg) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

async function goToWorld(i) {
  S.current = i;
  save();
  await preloadHeroAnims(currentHero());
  renderTrans(i);
}

function renderStart() {
  clearCinematic();
  const s = $('#s-start');
  s.style.backgroundImage = `url('${DATA.ui.startBg}')`;

  const n = WORLDS.length;
  /* Órbita ovalada: más ancha que alta, para que no se amontonen. */
  const rx = 40;
  const ry = 28;

  function at(deg) {
    const rad = (-90 + deg) * Math.PI / 180;
    return {
      x: +(50 + rx * Math.cos(rad)).toFixed(3),
      y: +(50 + ry * Math.sin(rad)).toFixed(3),
      rad
    };
  }

  const nodes = WORLDS.map((w, i) => {
    const deg = i * (360 / n);
    return { w, i, ...at(deg) };
  });

  /* Anillo perfectamente circular (SVG cuadrado aparte). */
  const ringR = 40;
  const segs = nodes.map(node => {
    const won = !!S.conquered[node.i];
    const unlocked = isWorldUnlocked(node.i);
    const half = Math.PI / n - 0.03;
    const a0 = node.rad - half;
    const a1 = node.rad + half;
    const x0 = +(50 + ringR * Math.cos(a0)).toFixed(3);
    const y0 = +(50 + ringR * Math.sin(a0)).toFixed(3);
    const x1 = +(50 + ringR * Math.cos(a1)).toFixed(3);
    const y1 = +(50 + ringR * Math.sin(a1)).toFixed(3);
    const state = won ? ' lit' : (unlocked ? ' open' : ' dim');
    return `<path class="galaxy-seg${state}" data-i="${node.i}" d="M ${x0} ${y0} A ${ringR} ${ringR} 0 0 1 ${x1} ${y1}" stroke="${node.w.c}" fill="none" style="color:${node.w.c}"/>`;
  }).join('');

  /* Líneas conquistadas: se recalculan al anillo circular tras pintar. */
  const spokes = nodes.filter(node => S.conquered[node.i]).map(node => {
    return `<g class="galaxy-spoke-g won" data-i="${node.i}" style="color:${node.w.c}">
      <line class="galaxy-spoke" x1="50" y1="50" x2="${node.x}" y2="${node.y}" stroke="${node.w.c}"/>
    </g>`;
  }).join('');

  const orbitWorlds = nodes.map(node => {
    const unlocked = isWorldUnlocked(node.i);
    const won = !!S.conquered[node.i];
    const state = !unlocked ? ' locked' : (won ? ' won' : ' open');
    const status = !unlocked ? 'Bloqueado' : (won ? 'Conquistado' : `Mundo ${node.i + 1}`);
    return `<button type="button" class="galaxy-world orbit${state}" data-i="${node.i}" style="color:${node.w.c};left:${node.x}%;top:${node.y}%" ${unlocked ? '' : 'aria-disabled="true"'}>
      <small class="galaxy-badge">${status}</small>
      <span class="galaxy-planet-wrap">
        <img src="${node.w.icon}" alt="">
        ${unlocked ? '' : '<em class="galaxy-lock" aria-hidden="true">🔒</em>'}
      </span>
      <span class="galaxy-name">${node.w.name}</span>
    </button>`;
  }).join('');

  const wonCount = S.conquered.filter(Boolean).length;
  const allDone = S.conquered.length && S.conquered.every(Boolean);
  const nextOpen = S.conquered.indexOf(false);

  s.innerHTML = `
    <div class="dim soft"></div>
    <div class="hub">
      <div class="hub-head">
        <h1 class="hub-title gold-text">Mundos conquistados: ${wonCount}/${WORLDS.length}</h1>
        <p class="hub-sub">Sistema Mentes Brillantes — Mapa de progreso</p>
      </div>
      <div class="galaxy galaxy-orbit" id="galaxyMap">
        <svg class="galaxy-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <ellipse class="galaxy-orbit-line" cx="50" cy="50" rx="26" ry="18"/>
          <ellipse class="galaxy-orbit-line" cx="50" cy="50" rx="33" ry="23"/>
          <ellipse class="galaxy-orbit-line" cx="50" cy="50" rx="40" ry="28"/>
          ${spokes}
        </svg>
        <svg class="galaxy-hub-ring" viewBox="0 0 100 100" aria-hidden="true">${segs}</svg>
        <div class="galaxy-core">
          <img src="${DATA.ui.logo}" alt="Logo">
        </div>
        ${orbitWorlds}
        <p class="galaxy-hint">${allDone
          ? '¡Todos los mundos conquistados!'
          : `Toca el Mundo ${(nextOpen < 0 ? 1 : nextOpen + 1)} para viajar`}</p>
      </div>
      ${allDone ? `
        <div class="hub-cta-wrap hub-final-wrap">
          <button type="button" class="btn bg hub-cta pulse-cta" id="btnFinal">Ver resultado final</button>
        </div>` : ''}
    </div>`;

  s.querySelectorAll('.galaxy-world').forEach(btn => {
    btn.onclick = async () => {
      const i = +btn.dataset.i;
      if (!isWorldUnlocked(i)) {
        toast('Primero conquista el Mundo ' + i);
        return;
      }
      btn.disabled = true;
      await goToWorld(i);
    };
  });

  function syncSpokeStarts() {
    const map = $('#galaxyMap');
    const ring = map?.querySelector('.galaxy-hub-ring');
    if (!map || !ring) return;
    const mr = map.getBoundingClientRect();
    const rr = ring.getBoundingClientRect();
    if (!mr.width || !mr.height || !rr.width) return;
    const cx = ((rr.left + rr.width / 2) - mr.left) / mr.width * 100;
    const cy = ((rr.top + rr.height / 2) - mr.top) / mr.height * 100;
    const radX = (rr.width / 2) / mr.width * 100 * 0.8;
    const radY = (rr.height / 2) / mr.height * 100 * 0.8;
    map.querySelectorAll('.galaxy-spoke-g').forEach(g => {
      const i = +g.dataset.i;
      const node = nodes[i];
      const line = g.querySelector('.galaxy-spoke');
      if (!node || !line) return;
      line.setAttribute('x1', (cx + radX * Math.cos(node.rad)).toFixed(3));
      line.setAttribute('y1', (cy + radY * Math.sin(node.rad)).toFixed(3));
      line.setAttribute('x2', node.x);
      line.setAttribute('y2', node.y);
    });
  }

  const btnFinal = $('#btnFinal');
  if (btnFinal) btnFinal.onclick = () => renderFinal();

  if (renderStart._onResize) removeEventListener('resize', renderStart._onResize);
  renderStart._onResize = syncSpokeStarts;
  addEventListener('resize', renderStart._onResize, { passive: true });

  go('s-start');
  requestAnimationFrame(() => requestAnimationFrame(syncSpokeStarts));
}

function startBattle(i) {
  S.current = i;
  const w = WORLDS[i];
  const hero = currentHero();
  const maxHP = 90;
  B = {
    q: 0, heroHP: maxHP, monHP: maxHP, maxHP,
    dmg: Math.max(1, Math.round(maxHP / w.missions.length)),
    lock: true, ok: 0, results: [], correctPos: 0
  };
  const scr = $('#s-battle');
  scr.className = 'screen';
  scr.classList.add('battle-w' + (i + 1));
  scr.style.backgroundImage = `url('${w.bg.battle}')`;
  scr.innerHTML = `
    <div class="arena">
      <div class="fighter hero">
        <div class="plate"><div class="fname">${hero.name}</div>
          <div class="hpbar hp-hero"><div class="hpfill" id="hpHeroF"></div></div></div>
        <div class="char-slot">
          <img class="char-anim" id="heroAnim" alt="${hero.name}">
        </div>
      </div>
      <div class="fighter mon">
        <div class="plate"><div class="fname" style="color:#ff9d8a">${w.monster}</div>
          <div class="hpbar hp-mon"><div class="hpfill" id="hpMonF"></div></div></div>
        <div class="char-slot">
          <img class="char-anim" id="monAnim" alt="${w.monster}">
        </div>
      </div>
      <div class="world-title-splash">
        <div class="world-title-badge">
          <div class="world-title-kicker">MUNDO ${i + 1}:</div>
          <h2 class="world-title-name">${w.name.toUpperCase()}</h2>
        </div>
      </div>
    </div>
    <div class="dim" style="background:rgba(0,0,0,.22)"></div>
    <div class="qbox" id="qbox" style="color:${w.c}"></div>
    <div class="hint"><b>1-4 / A-D</b> decidir · <b>Enter</b> continuar</div>`;
  go('s-battle');
  setHP();
  setAction($('#heroAnim'), hero.anim, 'idle');
  setAction($('#monAnim'), 'monstruo', 'idle');
  renderQ();
}

function setHP() {
  const max = B.maxHP || 90;
  $('#hpHeroF').style.width = (Math.max(0, B.heroHP) / max * 100) + '%';
  $('#hpMonF').style.width = (Math.max(0, B.monHP) / max * 100) + '%';
}

function clearTimer() { if (tmr) { clearInterval(tmr); tmr = null; } }

function startTimer() {
  clearTimer();
  tLeft = DATA.ui.timerSec || 15;
  updTimer();
  tmr = setInterval(() => {
    tLeft--;
    updTimer();
    if (tLeft <= 0) { clearTimer(); onTimeout(); }
  }, 1000);
}

function updTimer() {
  const n = $('#tnum'), b = $('#tbar');
  if (!n || !b) return;
  n.textContent = tLeft;
  b.style.width = (tLeft / (DATA.ui.timerSec || 15) * 100) + '%';
  if (tLeft <= 3) { b.style.background = '#ff3333'; n.classList.add('red'); }
  else if (tLeft <= 6) { b.style.background = '#ff8c00'; n.classList.remove('red'); }
  else { b.style.background = '#00c850'; n.classList.remove('red'); }
}

function renderQ() {
  const w = WORLDS[S.current], m = w.missions[B.q];
  const hero = currentHero();
  const order = shuffle4();
  B.correctPos = order.indexOf(m.c);
  B.lock = false;
  $('#qbox').innerHTML = `
    <div class="q-head">
      <div class="tbar-w"><div class="tbar" id="tbar" style="width:100%"></div></div>
      <div class="timer-pill" aria-live="polite">
        <span class="tnum" id="tnum">${DATA.ui.timerSec || 15}</span>
        <span class="tlabel">seg</span>
      </div>
    </div>
    <div class="qtxt">${m.q}</div>
    <div class="agrid">${order.map((oi, pos) => `
      <button class="abtn" data-p="${pos}"><span class="L">${'ABCD'[pos]}</span>${m.a[oi]}</button>`).join('')}</div>`;
  document.querySelectorAll('#qbox .abtn').forEach(b => b.onclick = () => pick(+b.dataset.p));
  setAction($('#heroAnim'), hero.anim, 'idle');
  setAction($('#monAnim'), 'monstruo', 'idle');
  startTimer();
}

async function onTimeout() {
  if (!B || B.lock) return;
  B.lock = true;
  document.querySelectorAll('#qbox .abtn').forEach(b => b.disabled = true);
  document.querySelectorAll('#qbox .abtn')[B.correctPos]?.classList.add('ok');
  S.totalQ++; B.results.push(false); save();
  await playStrike(false);
  afterFeedback();
}

async function pick(pos) {
  if (!B || B.lock) return;
  B.lock = true; clearTimer();
  const btns = [...document.querySelectorAll('#qbox .abtn')];
  btns.forEach(b => b.disabled = true);
  const ok = pos === B.correctPos;
  S.totalQ++; if (ok) { S.totalOK++; B.ok++; }
  B.results.push(ok); save();
  btns[pos].classList.add(ok ? 'ok' : 'no');
  if (!ok) btns[B.correctPos].classList.add('ok');
  await playStrike(ok);
  afterFeedback();
}

async function playStrike(ok) {
  const hero = currentHero();
  const heroEl = $('#heroAnim'), mon = $('#monAnim');
  if (ok) {
    setAction(heroEl, hero.anim, 'move');
    await sleep(380);
    await setAction(heroEl, hero.anim, 'attack', { nextIdle: false });
    const hitP = setAction(mon, 'monstruo', 'hit', { nextIdle: false });
    B.monHP = Math.max(0, B.monHP - (B.dmg || 30)); setHP();
    await hitP;
    await sleep(80);
    await Promise.all([
      setAction(heroEl, hero.anim, 'idle'),
      setAction(mon, 'monstruo', 'idle')
    ]);
  } else {
    setAction(mon, 'monstruo', 'move');
    await sleep(380);
    await setAction(mon, 'monstruo', 'attack', { nextIdle: false });
    const hitP = setAction(heroEl, hero.anim, 'hit', { nextIdle: false });
    B.heroHP = Math.max(0, B.heroHP - (B.dmg || 30)); setHP();
    await hitP;
    await sleep(80);
    await Promise.all([
      setAction(heroEl, hero.anim, 'idle'),
      setAction(mon, 'monstruo', 'idle')
    ]);
  }
}

async function afterFeedback() {
  if (!B) return;
  if (B.monHP <= 0) return renderVictory();
  if (B.heroHP <= 0) return renderDefeat();
  B.q++;
  const total = WORLDS[S.current].missions.length;
  if (B.q >= total) {
    return (B.monHP <= B.heroHP) ? renderVictory() : renderDefeat();
  }
  go('s-battle');
  renderQ();
}

function renderVictory() {
  clearCinematic();
  const i = S.current, w = WORLDS[i];
  S.conquered[i] = true;
  save();
  const hero = currentHero();
  const clips = heroClips(hero.anim);
  const scr = $('#s-victory');
  const allDone = S.conquered.every(Boolean);

  setVideoScreen(scr, true);
  scr.innerHTML = `
    <div class="video-actions video-actions-over">
      <p class="video-caption">Mundo ${i + 1}: ${w.name}</p>
      ${allDone
        ? `<button class="btn bg" id="btnVFinal">VER RESULTADO FINAL</button>`
        : `<button class="btn bg" id="btnVNext">SIGUIENTE MUNDO →</button>`
      }
      <button class="btn ghost" id="btnVHome">INICIO</button>
    </div>`;
  startCinematicLoop(scr, clips.victory);
  $('#btnVHome').onclick = () => {
    clearCinematic();
    renderStart();
  };
  if (allDone) {
    $('#btnVFinal').onclick = () => {
      clearCinematic();
      renderFinal();
    };
  } else {
    $('#btnVNext').onclick = () => {
      clearCinematic();
      goToWorld(i + 1);
    };
  }
  go('s-victory');
}

function renderDefeat() {
  clearCinematic();
  const hero = currentHero();
  const clips = heroClips(hero.anim);
  const scr = $('#s-defeat');
  setVideoScreen(scr, true);
  scr.innerHTML = `
    <div class="video-actions video-actions-over">
      <button class="btn br" id="btnRetry">VOLVER A INTENTAR</button>
    </div>`;
  startCinematicLoop(scr, clips.defeat);
  $('#btnRetry').onclick = () => {
    clearCinematic();
    startBattle(S.current);
  };
  go('s-defeat');
}

function renderTrans(worldI) {
  if (worldI >= WORLDS.length) return renderStart();
  clearCinematic();
  const hero = currentHero();
  const clips = heroClips(hero.anim);
  const scr = $('#s-trans');
  setVideoScreen(scr, true);
  scr.innerHTML = '';
  go('s-trans');
  playCinematicOnce(scr, clips.travel, () => startBattle(worldI), { maxMs: 1800, rate: 1.4 });
}

function renderFinal() {
  clearCinematic();
  const pct = S.totalQ ? Math.round(S.totalOK / S.totalQ * 100) : 0;
  const scr = $('#s-final');
  setVideoScreen(scr, true);
  scr.innerHTML = `
    <div class="video-actions video-actions-over video-actions-final">
      <p class="video-caption">Precisión ${S.totalOK}/${S.totalQ} (${pct}%)</p>
      <button class="btn bg" id="btnAgain">JUGAR DE NUEVO</button>
    </div>`;
  startCinematicLoop(scr, FINAL_CLIP);
  $('#btnAgain').onclick = () => {
    clearCinematic();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    S.conquered = fresh(); S.totalOK = 0; S.totalQ = 0; S.current = 0;
    renderStart();
  };
  go('s-final');
}

/* ---------- Keys ---------- */
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (S.screen === 'battle' && B && !B.lock) {
    const m = { '1': 0, '2': 1, '3': 2, '4': 3, a: 0, b: 1, c: 2, d: 3 };
    if (k in m) {
      const btn = document.querySelectorAll('#qbox .abtn')[m[k]];
      if (btn) btn.click();
      return;
    }
  }
  if (['enter', ' '].includes(k)) {
    e.preventDefault();
    if (S.screen === 'start') $('#btnFinal')?.click();
    else if (S.screen === 'victory') {
      $('#btnVFinal')?.click() || $('#btnVNext')?.click();
    }
    else if (S.screen === 'defeat') $('#btnRetry')?.click();
    else if (S.screen === 'final') $('#btnAgain')?.click();
  }
});

async function loadManifest() {
  try {
    const res = await fetch('image/anim-v3/manifest.json');
    if (!res.ok) return;
    const m = await res.json();
    if (m.fps) {
      Object.keys(m.fps).forEach(k => {
        if (ANIM[k]) ANIM[k].fps = m.fps[k];
      });
    }
    if (m.counts) {
      Object.keys(m.counts).forEach(k => {
        if (ANIM[k]) ANIM[k].count = m.counts[k];
      });
    }
  } catch (e) {}
}

async function init() {
  try {
    const res = await fetch('contenido-v3.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    DATA = await res.json();
    WORLDS = DATA.worlds;
    S.conquered = fresh();
    load();
    await loadManifest();
    await preloadAll();
    renderStart();
  } catch (e) {
    $('#ltxt').textContent = 'Error: ' + (e.message || e);
  }
}
init();
