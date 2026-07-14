/* ================================================================
   MENTES BRILLANTES V3 — Gamma look + didáctica V2 + frames reales
   ================================================================ */
let DATA = null, WORLDS = [];
const SAVE_KEY = 'mentes-brillantes-v3';
const ANIM = {
  idle: { count: 8, fps: 5, loop: true },
  move: { count: 8, fps: 7, loop: true },
  attack: { count: 8, fps: 7, loop: false },
  hit: { count: 6, fps: 5, loop: false }
};

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const go = id => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  S.screen = id.replace(/^s-/, '');
};

const S = {
  screen: 'load', current: 0, conquered: [], totalXP: 0, totalOK: 0, totalQ: 0
};
let B = null, tmr = null, tLeft = 10, players = new WeakMap();

function animPath(slug, action, i) {
  return `image/anim-v3/${slug}/${action}/frame-${String(i).padStart(2, '0')}.png`;
}
function fallbackPath(slug) {
  if (slug === 'monstruo') return 'image/monstruo.png';
  return `image/${slug}.png`;
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

  return new Promise(resolve => {
    const start = performance.now();
    const duration = opts.duration || (cfg.count / cfg.fps) * 1000;
    function tick(now) {
      if (players.get(img)?.token !== token) return resolve();
      const elapsed = now - start;
      let idx;
      if (cfg.loop) idx = Math.floor(elapsed / (1000 / cfg.fps)) % cfg.count;
      else idx = Math.min(cfg.count - 1, Math.floor((elapsed / duration) * cfg.count));
      const src = animPath(slug, action, idx);
      if (img.dataset.frameSrc !== src) {
        img.dataset.frameSrc = src;
        img.src = src;
      }
      if (cfg.loop || elapsed < duration) requestAnimationFrame(tick);
      else {
        if (opts.nextIdle !== false && action !== 'idle') setAction(img, slug, 'idle');
        resolve();
      }
    }
    img.onerror = () => {
      img.onerror = null;
      img.src = fallbackPath(slug);
      resolve();
    };
    requestAnimationFrame(tick);
  });
}

/* ---------- Progress ---------- */
function fresh() { return Array(WORLDS.length).fill(false); }
function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: DATA.version, conquered: S.conquered,
      totalXP: S.totalXP, totalOK: S.totalOK, totalQ: S.totalQ, current: S.current
    }));
  } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return;
    const d = JSON.parse(raw);
    if (d.version !== DATA.version) return;
    if (!Array.isArray(d.conquered) || d.conquered.length !== WORLDS.length) return;
    S.conquered = d.conquered; S.totalXP = d.totalXP || 0;
    S.totalOK = d.totalOK || 0; S.totalQ = d.totalQ || 0; S.current = d.current || 0;
  } catch (e) {}
}
function hasProgress() { return S.totalQ > 0 || S.conquered.some(Boolean); }

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
    urls.add(w.charAvatar); urls.add(w.hero.img); urls.add(w.icon);
    // idle always; other actions preload lightly for first world heroes later in battle
    for (let i = 0; i < ANIM.idle.count; i++) {
      urls.add(animPath(w.hero.anim, 'idle', i));
      urls.add(animPath('monstruo', 'idle', i));
    }
  });
  // critical combat frames for all heroes + monster
  WORLDS.forEach(w => {
    ['move', 'attack', 'hit'].forEach(act => {
      const n = ANIM[act].count;
      for (let i = 0; i < n; i++) {
        urls.add(animPath(w.hero.anim, act, i));
        urls.add(animPath('monstruo', act, i));
      }
    });
  });
  const list = [...urls].filter(Boolean);
  const bar = $('#lbar'), txt = $('#ltxt');
  const msgs = ['Cargando mundos...', 'Preparando personajes...', 'Cargando animaciones...', 'Casi listo...', '¡A jugar!'];
  let loaded = 0;
  const chunk = 12;
  for (let i = 0; i < list.length; i += chunk) {
    const slice = list.slice(i, i + chunk);
    await Promise.all(slice.map(url => new Promise(res => {
      const img = new Image();
      const done = () => {
        loaded++;
        const pct = Math.round(loaded / list.length * 100);
        bar.style.width = pct + '%';
        txt.textContent = msgs[Math.min(Math.floor(pct / 25), 4)];
        res();
      };
      img.onload = done; img.onerror = done; img.src = url;
    })));
  }
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

function renderStart() {
  const s = $('#s-start');
  s.style.backgroundImage = `url('${DATA.ui.startBg}')`;
  const orbit = $('#startOrbit');
  if (orbit) {
    const n = WORLDS.length;
    const worlds = WORLDS.map((w, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const r = 42; // % from center
      const x = 50 + r * Math.cos(ang);
      const y = 50 + r * Math.sin(ang);
      return `<div class="orbit-world" style="left:${x}%;top:${y}%;color:${w.c}">
        <img src="${w.icon}" alt="">
        <span>${w.name}</span>
      </div>`;
    }).join('');
    orbit.innerHTML = `
      <div class="orbit-ring"></div>
      <div class="orbit-core"><img src="${DATA.ui.logo}" alt="Logo"></div>
      ${worlds}`;
  }
  let heroes = $('#startHeroes');
  if (!heroes) {
    heroes = document.createElement('div');
    heroes.id = 'startHeroes';
    heroes.className = 'start-heroes';
    s.appendChild(heroes);
  }
  heroes.innerHTML = WORLDS.map(w => `<img src="${w.hero.img}" alt="${w.hero.name}">`).join('');

  go('s-start');
  const btn = $('#btnStart');
  if (btn) {
    btn.textContent = hasProgress() ? 'Continuar misiones' : 'Iniciar misiones';
    btn.onclick = () => renderMap();
  }
  const opt = $('#btnOptions');
  if (opt) opt.onclick = () => toast('Opciones: próximamente en V3');
  const set = $('#btnSettings');
  if (set) set.onclick = () => toast('Ajustes: próximamente en V3');
}

function renderMap() {
  const cur = S.conquered.indexOf(false);
  const cnt = S.conquered.filter(Boolean).length;
  const dots = WORLDS.map((w, i) => {
    const won = S.conquered[i];
    const current = i === cur;
    const cls = won ? 'won' : (current ? 'current' : '');
    return `<div class="wdot ${cls}" data-i="${i}" style="color:${w.c};border-color:${won || current ? w.c : 'rgba(255,255,255,.12)'}">
      <img src="${w.icon}" alt="">
      <small>M${i + 1}</small>
    </div>`;
  }).join('');
  $('#s-map').innerHTML = `
    <div class="map-box">
      <div class="ptit">SISTEMA MENTES BRILLANTES</div>
      <div class="psub">Mundos conquistados: ${cnt} / ${WORLDS.length}${S.totalXP ? ` · XP ${S.totalXP.toLocaleString('es-CO')}` : ''}</div>
      <div class="wdots">${dots}</div>
      <div class="lwrap">
        <img src="${DATA.ui.logo}" alt="Logo">
        <canvas id="lcanvas" width="120" height="120"></canvas>
      </div>
      <div class="play-hint">${cur >= 0 ? 'Toca el mundo iluminado para el briefing' : 'Todos los mundos conquistados'}</div>
      <div class="clabel">${cnt ? S.conquered.map((v, i) => v ? WORLDS[i].name : null).filter(Boolean).join(' · ') : 'Ninguno aún'}</div>
      ${cur < 0 ? `<button class="btn bg" id="btnFinal">VER RESULTADO FINAL</button>` : ''}
    </div>
    <div class="hint"><b>Enter</b> continuar · <b>1-4 / A-D</b> decidir</div>`;
  drawRing();
  document.querySelectorAll('#s-map .wdot.current').forEach(d => {
    d.onclick = () => renderBrief(+d.dataset.i);
  });
  const bf = $('#btnFinal');
  if (bf) bf.onclick = () => renderFinal();
  go('s-map');
}

function drawRing() {
  const c = $('#lcanvas'); if (!c) return;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 120, 120);
  const cx = 60, cy = 60, r = 58, sa = (2 * Math.PI) / WORLDS.length;
  S.conquered.forEach((won, i) => {
    if (!won) return;
    const s = -Math.PI / 2 + i * sa, e = s + sa;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, s, e); ctx.closePath();
    ctx.fillStyle = WORLDS[i].c + '88'; ctx.fill();
    ctx.strokeStyle = WORLDS[i].c; ctx.lineWidth = 2; ctx.stroke();
  });
}

function renderBrief(i) {
  S.current = i;
  const w = WORLDS[i];
  const scr = $('#s-brief');
  scr.style.backgroundImage = `url('${w.bg.transition}')`;
  scr.innerHTML = `
    <div class="dim"></div>
    <div class="brief-panel">
      <div class="brief-kicker" style="color:${w.c}">MUNDO ${i + 1} / ${WORLDS.length} · ${w.topic}</div>
      <h2>${w.name}</h2>
      <div class="brief-block"><b>OBJETIVO DE APRENDIZAJE</b><p>${w.briefing.goal}</p></div>
      <div class="brief-block"><b>AMENAZA: ${w.monster}</b><p>${w.briefing.threat}</p></div>
      <div class="brief-block"><b>CONTEXTO EPS / STAFF</b><p>${w.briefing.context}</p></div>
      <div class="brief-actions">
        <button class="btn bg" id="btnBriefGo">ENTRAR A LA MISIÓN</button>
        <button class="btn ghost" id="btnBriefBack">Volver</button>
      </div>
    </div>`;
  $('#btnBriefGo').onclick = () => startBattle(i);
  $('#btnBriefBack').onclick = () => renderMap();
  go('s-brief');
}

function startBattle(i) {
  S.current = i;
  const w = WORLDS[i];
  const maxHP = 90;
  B = {
    q: 0, heroHP: maxHP, monHP: maxHP, maxHP,
    dmg: Math.max(1, Math.round(maxHP / w.missions.length)),
    lock: true, ok: 0, results: [], correctPos: 0
  };
  const scr = $('#s-battle');
  scr.style.backgroundImage = `url('${w.bg.battle}')`;
  scr.innerHTML = `
    <div class="arena">
      <div class="fighter hero">
        <div class="plate"><div class="fname">${w.hero.name}</div>
          <div class="hpbar hp-hero"><div class="hpfill" id="hpHeroF"></div></div></div>
        <img class="char-anim" id="heroAnim" alt="">
      </div>
      <div class="fighter mon">
        <div class="plate"><div class="fname" style="color:#ff9d8a">${w.monster}</div>
          <div class="hpbar hp-mon"><div class="hpfill" id="hpMonF"></div></div></div>
        <img class="char-anim" id="monAnim" alt="">
      </div>
    </div>
    <div class="dim" style="background:rgba(0,0,0,.35)"></div>
    <div class="qbox" id="qbox" style="color:${w.c}"></div>
    <div class="hint"><b>1-4 / A-D</b> decidir · <b>Enter</b> continuar</div>`;
  go('s-battle');
  setHP();
  setAction($('#heroAnim'), w.hero.anim, 'idle');
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
  tLeft = DATA.ui.timerSec || 10;
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
  b.style.width = (tLeft / (DATA.ui.timerSec || 10) * 100) + '%';
  if (tLeft <= 3) { b.style.background = '#ff3333'; n.classList.add('red'); }
  else if (tLeft <= 6) { b.style.background = '#ff8c00'; n.classList.remove('red'); }
  else { b.style.background = '#00c850'; n.classList.remove('red'); }
}

function renderQ() {
  const w = WORLDS[S.current], m = w.missions[B.q];
  const order = shuffle4();
  B.correctPos = order.indexOf(m.c);
  B.lock = false;
  $('#qbox').innerHTML = `
    <div class="wbadge" style="color:${w.c}">MUNDO ${S.current + 1} — ${w.name.toUpperCase()}</div>
    <div class="toprow">
      <img class="av" src="${w.charAvatar || w.hero.img}" alt="">
      <div>
        <div class="cname">${w.hero.name}</div>
        <div class="tnum" id="tnum">${DATA.ui.timerSec || 10}</div>
      </div>
      <div style="flex:1;text-align:right;font-size:11px;color:#555">seg restantes · caso ${B.q + 1}/${w.missions.length}</div>
    </div>
    <div class="tbar-w"><div class="tbar" id="tbar" style="width:100%"></div></div>
    <div class="caso">${m.caso}</div>
    <div class="qtxt">${m.q}</div>
    <div class="agrid">${order.map((oi, pos) => `
      <button class="abtn" data-p="${pos}"><span class="L">${'ABCD'[pos]}</span>${m.a[oi]}</button>`).join('')}</div>`;
  document.querySelectorAll('#qbox .abtn').forEach(b => b.onclick = () => pick(+b.dataset.p));
  setAction($('#heroAnim'), w.hero.anim, 'idle');
  setAction($('#monAnim'), 'monstruo', 'idle');
  startTimer();
}

async function onTimeout() {
  if (!B || B.lock) return;
  B.lock = true;
  const w = WORLDS[S.current], m = w.missions[B.q];
  document.querySelectorAll('#qbox .abtn').forEach(b => b.disabled = true);
  document.querySelectorAll('#qbox .abtn')[B.correctPos]?.classList.add('ok');
  S.totalQ++; B.results.push(false); save();
  await playStrike(false);
  showFeedback(false, m, true);
}

async function pick(pos) {
  if (!B || B.lock) return;
  B.lock = true; clearTimer();
  const w = WORLDS[S.current], m = w.missions[B.q];
  const btns = [...document.querySelectorAll('#qbox .abtn')];
  btns.forEach(b => b.disabled = true);
  const ok = pos === B.correctPos;
  S.totalQ++; if (ok) { S.totalOK++; B.ok++; }
  B.results.push(ok); save();
  btns[pos].classList.add(ok ? 'ok' : 'no');
  if (!ok) btns[B.correctPos].classList.add('ok');
  await playStrike(ok);
  showFeedback(ok, m, false);
}

async function playStrike(ok) {
  const w = WORLDS[S.current];
  const hero = $('#heroAnim'), mon = $('#monAnim');
  if (ok) {
    setAction(hero, w.hero.anim, 'move');
    await sleep(650);
    await setAction(hero, w.hero.anim, 'attack', { nextIdle: false });
    const hitP = setAction(mon, 'monstruo', 'hit', { nextIdle: false });
    B.monHP = Math.max(0, B.monHP - (B.dmg || 30)); setHP();
    await hitP;
    await sleep(280);
    setAction(hero, w.hero.anim, 'idle');
    setAction(mon, 'monstruo', 'idle');
  } else {
    setAction(mon, 'monstruo', 'move');
    await sleep(650);
    await setAction(mon, 'monstruo', 'attack', { nextIdle: false });
    const hitP = setAction(hero, w.hero.anim, 'hit', { nextIdle: false });
    B.heroHP = Math.max(0, B.heroHP - (B.dmg || 30)); setHP();
    await hitP;
    await sleep(280);
    setAction(hero, w.hero.anim, 'idle');
    setAction(mon, 'monstruo', 'idle');
  }
}

function showFeedback(ok, m, timedOut) {
  const scr = $('#s-feedback');
  const w = WORLDS[S.current];
  scr.style.backgroundImage = `url('${w.bg.battle}')`;
  scr.innerHTML = `
    <div class="dim"></div>
    <div class="fb-panel ${ok ? 'ok' : 'bad'}">
      <div class="fb-title">${ok ? '¡ACIERTO!' : (timedOut ? '¡TIEMPO AGOTADO!' : 'OPORTUNIDAD DE APRENDER')}</div>
      <div class="fb-body">${ok ? m.ok : m.bad}</div>
      <div class="fb-tip"><b>TIP PARA EL DÍA A DÍA</b><p>${m.tip}</p></div>
      <button class="btn bg" id="btnFb">CONTINUAR</button>
    </div>`;
  $('#btnFb').onclick = afterFeedback;
  go('s-feedback');
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
  const i = S.current, w = WORLDS[i];
  S.conquered[i] = true;
  const xp = 10000 + (B.heroHP / (B.dmg || 30)) * 2500;
  S.totalXP += xp; save();
  const last = S.conquered.every(Boolean);
  const scr = $('#s-victory');
  scr.style.backgroundImage = `url('${w.bg.victory}')`;
  scr.innerHTML = `
    <div class="dim"></div>
    <div class="rpanel">
      <h2>¡VICTORIA!</h2>
      <p>Conquistaste el Mundo ${i + 1}: ${w.name}</p>
      <div class="learn-box">
        <h3>3 APRENDIZAJES CLAVE</h3>
        <ul>${w.learnings.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>
      <p>XP +${Math.round(xp).toLocaleString('es-CO')} · Aciertos ${B.ok}/${B.results.length}</p>
      <button class="btn bg" id="btnVNext">${last ? 'VER RESULTADO FINAL' : 'CONTINUAR'}</button>
    </div>`;
  $('#btnVNext').onclick = () => {
    if (last) renderFinal();
    else renderTrans(i + 1);
  };
  go('s-victory');
}

function renderDefeat() {
  const w = WORLDS[S.current];
  const scr = $('#s-defeat');
  scr.style.backgroundImage = `url('${w.bg.defeat}')`;
  scr.innerHTML = `
    <div class="dim"></div>
    <div class="rpanel">
      <h2>¡DERROTA!</h2>
      <p>${w.monster} sigue dominando este mundo. Relee los tips e inténtalo de nuevo.</p>
      <button class="btn br" id="btnRetry">VOLVER A INTENTAR</button>
      <button class="btn ghost" style="margin-left:8px" id="btnDefMap">Mapa</button>
    </div>`;
  $('#btnRetry').onclick = () => renderBrief(S.current);
  $('#btnDefMap').onclick = () => renderMap();
  go('s-defeat');
}

function renderTrans(nextI) {
  if (nextI >= WORLDS.length) return renderMap();
  const w = WORLDS[nextI];
  const scr = $('#s-trans');
  scr.style.backgroundImage = `url('${w.bg.transition}')`;
  scr.innerHTML = `
    <div class="dim"></div>
    <div class="tpanel">
      <div class="spin"></div>
      <h2>Viajando al Mundo ${nextI + 1}...</h2>
      <p>${w.name} — Prepárate, ${w.hero.name}</p>
    </div>`;
  go('s-trans');
  setTimeout(() => renderMap(), 2200);
}

function renderFinal() {
  const pct = S.totalQ ? Math.round(S.totalOK / S.totalQ * 100) : 0;
  const scr = $('#s-final');
  scr.style.backgroundImage = `url('${DATA.ui.finalBg}')`;
  scr.innerHTML = `
    <div class="dim soft"></div>
    <div class="final-heroes">${WORLDS.map(w => `<img src="${w.hero.img}" alt="${w.hero.name}">`).join('')}</div>
    <div class="fpanel">
      <h1>¡CONQUISTASTE EL SISTEMA<br>MENTES BRILLANTES!</h1>
      <p>Precisión ${S.totalOK}/${S.totalQ} (${pct}%) · XP ${S.totalXP.toLocaleString('es-CO')}</p>
      <div class="learn-box" style="text-align:left;margin:12px 0 18px">
        <h3>DOMINIOS</h3>
        <ul>${WORLDS.map(w => `<li><b>${w.name}:</b> ${w.learnings[0]}</li>`).join('')}</ul>
      </div>
      <button class="btn bg" id="btnAgain">JUGAR DE NUEVO</button>
    </div>`;
  $('#btnAgain').onclick = () => {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    S.conquered = fresh(); S.totalXP = 0; S.totalOK = 0; S.totalQ = 0; S.current = 0;
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
    if (S.screen === 'start') $('#btnStart')?.click();
    else if (S.screen === 'map') {
      const d = document.querySelector('#s-map .wdot.current');
      if (d) renderBrief(+d.dataset.i);
      else $('#btnFinal')?.click();
    }
    else if (S.screen === 'brief') $('#btnBriefGo')?.click();
    else if (S.screen === 'feedback') $('#btnFb')?.click();
    else if (S.screen === 'victory') $('#btnVNext')?.click();
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
