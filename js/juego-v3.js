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

/* Los 6 avatares seleccionables. portrait = retrato usado en la pantalla de
   selección y en el cuadro de pregunta; img = render de cuerpo completo. */
const HEROES = [
  {
    id: 'doctor', anim: 'doctor', gender: 'm',
    name: 'Dr. Aelion', role: 'El Médico Élfico',
    desc: 'Sabio y estratégico, domina el diagnóstico y la toma de decisiones clínicas.',
    portrait: 'image/v3/bg/w1-estrategia-char.png', img: 'image/doctor.png'
  },
  {
    id: 'enfermera', anim: 'enfermera', gender: 'f',
    name: 'Lyra', role: 'La Enfermera Élfica',
    desc: 'Veloz y empática, su cuidado es su arma más poderosa en batalla.',
    portrait: 'image/v3/bg/w2-gobierno-char.png', img: 'image/enfermera.png'
  },
  {
    id: 'cirujano', anim: 'cirujano', gender: 'm',
    name: 'Thalric', role: 'El Cirujano Élfico',
    desc: 'Preciso como una hoja de bisturí, sus habilidades son legendarias.',
    portrait: 'image/v3/bg/w3-proceso-char.png', img: 'image/cirujano.png'
  },
  {
    id: 'terapeuta', anim: 'terapeuta', gender: 'f',
    name: 'Sylvaine', role: 'La Terapeuta Élfica',
    desc: 'Maestra de la recuperación y el equilibrio entre cuerpo y mente.',
    portrait: 'image/v3/bg/w4-cultura-char.png', img: 'image/terapeuta.png'
  },
  {
    id: 'recepcionista', anim: 'recepcionista', gender: 'f',
    name: 'Freya', role: 'La Recepcionista Élfica',
    desc: 'Coordinadora del caos, organiza y protege con maestría.',
    portrait: 'image/v3/bg/w5-conocimiento-char.png', img: 'image/recepcionista.png'
  },
  {
    id: 'bacteriologa', anim: 'bacteriologa', gender: 'f',
    name: 'Vexara', role: 'La Bacterióloga Élfica',
    desc: 'Detecta lo invisible: su ciencia es su escudo y su espada.',
    portrait: 'image/v3/bg/w6-ecosistema-char.png', img: 'image/bacteriologa.png'
  }
];
function currentHero() {
  return HEROES.find(h => h.id === S.heroId) || HEROES[0];
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
  screen: 'load', current: 0, conquered: [], totalXP: 0, totalOK: 0, totalQ: 0, heroId: null
};
let B = null, tmr = null, tLeft = 10, players = new WeakMap();

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
      totalXP: S.totalXP, totalOK: S.totalOK, totalQ: S.totalQ, current: S.current,
      heroId: S.heroId
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
    if (HEROES.some(h => h.id === d.heroId)) S.heroId = d.heroId;
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
  });
  HEROES.forEach(h => urls.add(h.portrait));
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

async function enterWithHero(heroId, next) {
  S.heroId = heroId;
  save();
  await preloadHeroAnims(currentHero());
  next();
}

function renderStart() {
  const s = $('#s-start');
  s.style.backgroundImage = `url('${DATA.ui.startBg}')`;
  let selected = S.heroId || HEROES[0].id;

  function heroById(id) {
    return HEROES.find(h => h.id === id) || HEROES[0];
  }

  function worldBtn(i) {
    const w = WORLDS[i];
    const unlocked = isWorldUnlocked(i);
    const won = !!S.conquered[i];
    const lockCls = unlocked ? (won ? ' won' : ' open') : ' locked';
    const status = !unlocked ? 'Bloqueado' : (won ? 'Conquistado' : `Mundo ${i + 1}`);
    return `
      <button type="button" class="galaxy-world${lockCls}" data-i="${i}" style="color:${w.c}" ${unlocked ? '' : 'aria-disabled="true"'}>
        <img src="${w.icon}" alt="">
        <small>${status}</small>
        <span>${w.name}</span>
        ${unlocked ? '' : '<em class="lock-badge">🔒 Completa el mundo anterior</em>'}
      </button>`;
  }

  function paint() {
    const h = heroById(selected);
    let galaxyHtml;
    if (WORLDS.length === 2) {
      galaxyHtml = `
        <div class="galaxy-ring"></div>
        <div class="galaxy-ring galaxy-ring-2"></div>
        ${worldBtn(0)}
        <div class="galaxy-core"><img src="${DATA.ui.logo}" alt="Logo"></div>
        ${worldBtn(1)}
        <p class="galaxy-hint">Elige héroe abajo · toca un mundo desbloqueado para jugar</p>`;
    } else {
      const n = WORLDS.length;
      const orbitWorlds = WORLDS.map((w, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const r = 38;
        const x = 50 + r * Math.cos(ang);
        const y = 50 + r * Math.sin(ang);
        const unlocked = isWorldUnlocked(i);
        return `<button type="button" class="galaxy-world${unlocked ? '' : ' locked'}" data-i="${i}" style="color:${w.c};position:absolute;left:${x}%;top:${y}%;transform:translate(-50%,-50%)">
          <img src="${w.icon}" alt="">
          <span>${w.name}</span>
        </button>`;
      }).join('');
      galaxyHtml = `
        <div class="galaxy-ring" style="aspect-ratio:1;width:min(92%,560px)"></div>
        <div class="galaxy-core"><img src="${DATA.ui.logo}" alt="Logo"></div>
        ${orbitWorlds}
        <p class="galaxy-hint">Toca un mundo desbloqueado</p>`;
    }

    s.innerHTML = `
      <div class="dim soft"></div>
      <div class="hub">
        <div class="hub-head">
          <h1 class="hub-title gold-text">Mentes Brillantes</h1>
          <p class="hub-sub">Demo Day · Grupo 1A · ${WORLDS.length} mundos en orden</p>
        </div>
        <div class="galaxy">${galaxyHtml}</div>
        <div class="hub-heroes">
          <p class="hub-hero-label" id="hubHeroLabel">Tu héroe: <b>${h.name}</b> · ${h.role}</p>
          <div class="hub-roster">
            ${HEROES.map(x => `
              <button type="button" class="hub-hero-btn${x.id === selected ? ' sel' : ''}" data-id="${x.id}" title="${x.name}">
                <img src="${x.portrait}" alt="">
                <span>${x.name.split(' ').pop()}</span>
              </button>`).join('')}
          </div>
          <div class="hub-cta-wrap">
            <button type="button" class="btn bg hub-cta pulse-cta" id="btnStart">
              ${S.conquered.every(Boolean)
                ? 'Ver resultado final'
                : `Jugar mundo ${Math.min(S.conquered.indexOf(false) + 1, WORLDS.length) || WORLDS.length}`}
            </button>
          </div>
        </div>
      </div>`;

    s.querySelectorAll('.hub-hero-btn').forEach(btn => {
      btn.onclick = () => {
        if (btn.dataset.id === selected) return;
        selected = btn.dataset.id;
        S.heroId = selected;
        save();
        const hero = heroById(selected);
        s.querySelectorAll('.hub-hero-btn').forEach(b => b.classList.toggle('sel', b.dataset.id === selected));
        const label = $('#hubHeroLabel');
        if (label) label.innerHTML = `Tu héroe: <b>${hero.name}</b> · ${hero.role}`;
      };
    });

    s.querySelectorAll('.galaxy-world').forEach(btn => {
      btn.onclick = async () => {
        const i = +btn.dataset.i;
        if (!isWorldUnlocked(i)) {
          toast('Primero conquista el Mundo ' + i);
          return;
        }
        btn.disabled = true;
        await enterWithHero(selected, () => renderBrief(i));
      };
    });

    const cta = $('#btnStart');
    if (cta) {
      cta.onclick = async () => {
        if (S.conquered.every(Boolean)) {
          renderFinal();
          return;
        }
        const next = S.conquered.indexOf(false);
        const i = next < 0 ? 0 : next;
        cta.disabled = true;
        cta.textContent = 'Cargando...';
        await enterWithHero(selected, () => renderBrief(i));
      };
    }
  }

  paint();
  go('s-start');
}

function renderBrief(i) {
  if (!isWorldUnlocked(i)) {
    toast('Primero conquista el Mundo ' + i);
    return renderStart();
  }
  S.current = i;
  const w = WORLDS[i];
  const scr = $('#s-brief');
  scr.style.backgroundImage = `url('${w.bg.transition}')`;
  scr.innerHTML = `
    <div class="dim"></div>
    <div class="brief-panel">
      <div class="brief-kicker" style="color:${w.c}">MUNDO ${i + 1} / ${WORLDS.length} · ${w.topic}</div>
      <h2 class="gold-text">${w.name}</h2>
      <div class="brief-block"><b>OBJETIVO DE APRENDIZAJE</b><p>${w.briefing.goal}</p></div>
      <div class="brief-block"><b>AMENAZA: ${w.monster}</b><p>${w.briefing.threat}</p></div>
      <div class="brief-block"><b>CONTEXTO EPS / STAFF</b><p>${w.briefing.context}</p></div>
      <div class="brief-actions">
        <button class="btn bg" id="btnBriefGo">ENTRAR A LA MISIÓN</button>
        <button class="btn ghost" id="btnBriefBack">Volver</button>
      </div>
    </div>`;
  $('#btnBriefGo').onclick = () => startBattle(i);
  $('#btnBriefBack').onclick = () => renderStart();
  go('s-brief');
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
  const hero = currentHero();
  const order = shuffle4();
  B.correctPos = order.indexOf(m.c);
  B.lock = false;
  $('#qbox').innerHTML = `
    <div class="wbadge" style="color:${w.c}">MUNDO ${S.current + 1} — ${w.name.toUpperCase()}</div>
    <div class="toprow">
      <img class="av" src="${hero.portrait}" alt="">
      <div class="toprow-main">
        <div class="cname">${hero.name}</div>
        <div class="qmeta">Caso ${B.q + 1} / ${w.missions.length}</div>
      </div>
      <div class="timer-block">
        <div class="tnum" id="tnum">${DATA.ui.timerSec || 10}</div>
        <div class="tlabel">seg</div>
      </div>
    </div>
    <div class="tbar-w"><div class="tbar" id="tbar" style="width:100%"></div></div>
    <div class="caso">${m.caso}</div>
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
  const i = S.current, w = WORLDS[i];
  S.conquered[i] = true;
  const xp = 10000 + (B.heroHP / (B.dmg || 30)) * 2500;
  S.totalXP += xp; save();
  const last = S.conquered.every(Boolean);
  const hero = currentHero();
  const scr = $('#s-victory');

  if (!last) {
    const next = WORLDS[i + 1];
    scr.style.backgroundImage = `url('${next.bg.transition}')`;
    scr.innerHTML = `
      <div class="dim soft"></div>
      <div class="travel-layout">
        <div class="travel-banner">
          <h2 class="gold-text">¡Victoria!</h2>
          <p>Viajando al Mundo ${i + 2}: <b>${next.name}</b></p>
          <p class="travel-meta">${hero.name} · XP +${Math.round(xp).toLocaleString('es-CO')}</p>
        </div>
        <div class="travel-stage">
          <img class="travel-hero char-anim" id="travelAnim" alt="${hero.name}" src="${hero.img}">
        </div>
        <div class="travel-actions">
          <button class="btn bg" id="btnVNext">CONTINUAR</button>
        </div>
      </div>`;
    go('s-victory');
    setAction($('#travelAnim'), hero.anim, 'move');
    $('#btnVNext').onclick = () => renderStart();
    return;
  }

  scr.style.backgroundImage = `url('${w.bg.victory}')`;
  scr.innerHTML = `
    <div class="dim soft"></div>
    <div class="travel-layout">
      <div class="travel-banner">
        <h2 class="gold-text">¡Victoria!</h2>
        <p>Conquistaste el Mundo ${i + 1}: ${w.name}</p>
        <p class="travel-meta">XP +${Math.round(xp).toLocaleString('es-CO')} · Aciertos ${B.ok}/${B.results.length}</p>
      </div>
      <div class="travel-stage">
        <img class="travel-hero" src="${hero.img}" alt="${hero.name}">
      </div>
      <div class="learn-box travel-learn">
        <h3>3 APRENDIZAJES CLAVE</h3>
        <ul>${w.learnings.map(l => `<li>${l}</li>`).join('')}</ul>
      </div>
      <div class="travel-actions">
        <button class="btn bg" id="btnVNext">VER RESULTADO FINAL</button>
      </div>
    </div>`;
  $('#btnVNext').onclick = () => renderFinal();
  go('s-victory');
}

function renderDefeat() {
  const w = WORLDS[S.current];
  const hero = currentHero();
  const scr = $('#s-defeat');
  scr.style.backgroundImage = `url('${w.bg.defeat}')`;
  scr.innerHTML = `
    <div class="dim soft"></div>
    <div class="defeat-layout">
      <div class="defeat-banner">
        <h2>¡DERROTA!</h2>
        <p>${hero.name} cae ante ${w.monster}. Inténtalo de nuevo.</p>
      </div>
      <div class="defeat-stage">
        <img class="defeat-hero" src="${hero.img}" alt="${hero.name}">
      </div>
      <div class="defeat-actions">
        <button class="btn br" id="btnRetry">VOLVER A INTENTAR</button>
        <button class="btn ghost" id="btnDefMap">Inicio</button>
      </div>
    </div>`;
  $('#btnRetry').onclick = () => renderBrief(S.current);
  $('#btnDefMap').onclick = () => renderStart();
  go('s-defeat');
}

function renderTrans(nextI) {
  if (nextI >= WORLDS.length) return renderStart();
  const w = WORLDS[nextI];
  const hero = currentHero();
  const scr = $('#s-trans');
  scr.style.backgroundImage = `url('${w.bg.transition}')`;
  scr.innerHTML = `
    <div class="dim soft"></div>
    <div class="travel-layout">
      <div class="travel-banner">
        <h2 class="gold-text">Viajando al Mundo ${nextI + 1}</h2>
        <p><b>${w.name}</b> — Prepárate, ${hero.name}</p>
      </div>
      <div class="travel-stage">
        <img class="travel-hero char-anim" id="travelAnim" alt="${hero.name}" src="${hero.img}">
      </div>
    </div>`;
  go('s-trans');
  setAction($('#travelAnim'), hero.anim, 'move');
  setTimeout(() => renderStart(), 2800);
}

function renderFinal() {
  const pct = S.totalQ ? Math.round(S.totalOK / S.totalQ * 100) : 0;
  const scr = $('#s-final');
  scr.style.backgroundImage = `url('${DATA.ui.finalBg}')`;
  scr.innerHTML = `
    <div class="dim soft"></div>
    <div class="final-heroes">${WORLDS.map(w => `<img src="${w.hero.img}" alt="${w.hero.name}">`).join('')}</div>
    <div class="fpanel">
      <h1 class="gold-text">¡CONQUISTASTE EL SISTEMA<br>MENTES BRILLANTES!</h1>
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
    else if (S.screen === 'brief') $('#btnBriefGo')?.click();
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
