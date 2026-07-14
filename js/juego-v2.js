/* ================================================================
   MENTES BRILLANTES V2 — Motor didáctico (casos + feedback)
   Contenido: contenido-v2.json  |  V1 intacta en index.html
   ================================================================ */
let WORLDS = [];
let DATA_VERSION = 0;
const SAVE_KEY = 'mentes-brillantes-v2';
const MONSTER_IMG = 'image/monstruo.png';
const MP = [[560,285],[1040,285],[1215,470],[1040,655],[560,655],[385,470]];

const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => n.toLocaleString('es-CO');

const S = {
  current: 0, unlocked: 1, conquered: [], totalXP: 0, totalOK: 0, totalQ: 0,
  screen: 'start', flash: null
};
let B = null;

/* ---------- SVG helpers ---------- */
let _UID = 0;
const uid = () => 'u' + (++_UID);

function lockSVG(){
  return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <path d="M19,28 V19 C19,7 41,7 41,19 V28" fill="none" stroke="#d3dae4" stroke-width="7" stroke-linecap="round"/>
  <rect x="12" y="26" width="36" height="27" rx="7" fill="#97a1b1" stroke="#5c6572" stroke-width="3"/>
  <circle cx="30" cy="37" r="5" fill="#39404e"/><rect x="27.5" y="39" width="5" height="9" rx="2" fill="#39404e"/></svg>`;
}

/* ---------- audio ---------- */
let AC = null, muted = false;
function ac(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(f,d,type,v,dt,f2){
  const a = ac(); if(!a||muted) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime+(dt||0);
  o.type = type||'sine'; o.frequency.setValueAtTime(f,t);
  if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+d);
  g.gain.setValueAtTime(v||.18,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+d+.05);
}
const sfx = {
  click(){ tone(700,.07,'square',.09); },
  ok(){ tone(523,.14,'sine',.22); tone(659,.14,'sine',.22,.09); tone(784,.24,'sine',.22,.18); },
  bad(){ tone(210,.32,'sawtooth',.2,0,110); },
  hit(){ tone(120,.16,'square',.3,0,45); },
  win(){ [523,659,784,1046].forEach((f,i)=>tone(f,.3,'triangle',.2,i*.12)); },
  lose(){ tone(392,.4,'triangle',.2,0,196); },
  unlock(){ tone(880,.12,'sine',.18); tone(1174,.16,'sine',.18,.09); }
};

/* ---------- progress ---------- */
function freshConquered(){ return Array(WORLDS.length).fill(false); }
function saveProgress(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: DATA_VERSION, current: S.current, unlocked: S.unlocked,
      conquered: S.conquered, totalXP: S.totalXP, totalOK: S.totalOK, totalQ: S.totalQ
    }));
  }catch(e){}
}
function loadProgress(){
  try{
    const raw = localStorage.getItem(SAVE_KEY); if(!raw) return;
    const d = JSON.parse(raw);
    if(d.version!==DATA_VERSION) return;
    if(!Array.isArray(d.conquered)||d.conquered.length!==WORLDS.length) return;
    S.current = d.current??0; S.unlocked = d.unlocked??1;
    S.conquered = d.conquered; S.totalXP = d.totalXP??0;
    S.totalOK = d.totalOK??0; S.totalQ = d.totalQ??0;
  }catch(e){}
}
function clearProgress(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }
function hasProgress(){ return S.totalQ>0||S.conquered.some(Boolean)||S.totalXP>0; }

/* ---------- ui base ---------- */
function setWC(c){ $('#shaker').style.setProperty('--wc',c); document.documentElement.style.setProperty('--wc',c); }
function show(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $('#scr-'+name).classList.add('active'); S.screen = name;
}
function hideLoader(){ const el = $('#loader'); if(el) el.remove(); }
function fit(){
  const s = Math.min(innerWidth/1600, innerHeight/900);
  $('#stage').style.transform = `translate(-50%,-50%) scale(${s})`;
}
addEventListener('resize', fit);

function shuffle4(){
  const a = [0,1,2,3];
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function showLoadError(err){
  hideLoader();
  $('#scr-start').innerHTML = `
    <h1 class="start-title gold-text" style="margin-top:140px;font-size:56px">ERROR DE CARGA</h1>
    <p class="start-hint">No se pudo cargar contenido-v2.json. Usa un servidor web (ej. npx serve .).</p>
    <p class="start-hint">${err?.message||err||''}</p>
    <button class="btn btn-big btn-cyan" style="margin-top:24px" onclick="location.reload()">REINTENTAR</button>`;
  show('start');
}

/* ---------- stars ---------- */
const bg = $('#bgc').getContext('2d'), fx = $('#fxc').getContext('2d');
const stars = [];
for(let i=0;i<180;i++) stars.push({x:Math.random()*1600,y:Math.random()*900,r:Math.random()*1.6+.3,p:Math.random()*6.28,s:.5+Math.random()*1.4});
let frame = 0, parts = [];
function burstAt(x,y,color,n=24){
  for(let i=0;i<n;i++){
    const a = Math.random()*6.28, v = Math.random()*6+2;
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:35+Math.random()*20,c:color,r:2+Math.random()*3});
  }
}
function loop(){
  frame++;
  bg.clearRect(0,0,1600,900);
  const t = frame/60;
  for(const st of stars){
    bg.globalAlpha = .3+.5*Math.abs(Math.sin(t*st.s+st.p));
    bg.fillStyle = '#cfe0ff'; bg.beginPath(); bg.arc(st.x,st.y,st.r,0,6.28); bg.fill();
  }
  bg.globalAlpha = 1;
  fx.clearRect(0,0,1600,900);
  for(let i=parts.length-1;i>=0;i--){
    const p = parts[i]; p.life--; p.x+=p.vx; p.y+=p.vy; p.vy+=.12;
    if(p.life<=0){ parts.splice(i,1); continue; }
    fx.globalAlpha = Math.max(0,p.life/50); fx.fillStyle = p.c;
    fx.beginPath(); fx.arc(p.x,p.y,p.r,0,6.28); fx.fill();
  }
  fx.globalAlpha = 1;
  requestAnimationFrame(loop);
}

function popDmg(x,y,txt,color){
  const d = document.createElement('div'); d.className = 'dmg-pop';
  d.style.left = x+'px'; d.style.top = y+'px'; d.style.color = color; d.textContent = txt;
  $('#shaker').appendChild(d); setTimeout(()=>d.remove(),1100);
}

/* ---------- START ---------- */
function renderStart(){
  setWC('#8b5cf6');
  const icons = WORLDS.map(w=>`<img src="${w.icon}" alt="">`).join('');
  $('#scr-start').innerHTML = `
    <h1 class="start-title gold-text">SISTEMA<small>MENTES BRILLANTES</small></h1>
    <div class="start-badge">VERSIÓN 2 · CAPACITACIÓN GAMIFICADA</div>
    <div class="start-sub sub-strip">Juega misiones. Decide como en el trabajo. Aprende en cada jugada.</div>
    <div class="start-art">${icons}</div>
    <button class="btn btn-big btn-cyan" id="btnStart">&#9654;&nbsp; ${hasProgress()?'CONTINUAR MISIONES':'COMENZAR MISIONES'}</button>
    ${hasProgress()?'<div class="start-hint" style="color:#9aa6c8">Progreso V2 guardado en este dispositivo</div>':''}
    <div class="start-hint">6 mundos · 5 casos por mundo · feedback didáctico tras cada decisión · 3 golpes deciden la batalla</div>
    <div class="version-link" style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap">
      <a href="index.html">← V1 clásica</a>
      <a href="v3.html">V3 Gamma + frames →</a>
    </div>`;
  $('#btnStart').onclick = ()=>{ sfx.click(); renderMap(); };
  show('start');
}

/* ---------- MAP ---------- */
function renderMap(){
  setWC('#8b5cf6');
  const cnt = S.conquered.filter(Boolean).length;
  const cur = S.conquered.indexOf(false);
  let lines = `<ellipse class="map-orbit" cx="800" cy="470" rx="250" ry="152"/>
    <ellipse class="map-orbit" cx="800" cy="470" rx="345" ry="212"/>
    <ellipse class="map-orbit" cx="800" cy="470" rx="435" ry="268"/>`;
  WORLDS.forEach((w,i)=>{
    if(!S.conquered[i]) return;
    const [px,py] = MP[i];
    const dx = 800-px, dy = 470-py, L = Math.hypot(dx,dy)||1;
    lines += `<line class="beam" x1="${px+(dx/L)*55}" y1="${py+(dy/L)*55}" x2="${800-(dx/L)*90}" y2="${470-(dy/L)*90}" stroke="${w.c}" style="color:${w.c}"/>`;
  });
  let planets = '';
  WORLDS.forEach((w,i)=>{
    const [px,py] = MP[i];
    const st = S.conquered[i]?'conquered':(i===cur?'current':'locked');
    planets += `<div class="map-planet ${st}" data-i="${i}" style="left:${px}px;top:${py}px;--pc:${w.c}">
      ${st==='current'?'<div class="play-tag">¡MISIÓN!</div>':''}
      <img class="world-icon" src="${w.icon}" alt="">
      ${st==='locked'?`<div class="lock-ico">${lockSVG()}</div>`:''}
      <div class="map-name"><b>MUNDO ${i+1}</b>${w.name}${st==='conquered'?'<br><span class="badge-conq">✓ CONQUISTADO</span>':''}</div>
    </div>`;
  });
  $('#scr-map').innerHTML = `
    <svg class="map-lines" viewBox="0 0 1600 900">${lines}</svg>
    <div class="map-title-wrap">
      <div class="map-title"><span class="gold-text">MUNDOS: ${cnt} / ${WORLDS.length}</span></div>
      <div class="map-sub">Mentes Brillantes V2 · Staff</div>
      ${S.totalXP?`<div class="map-xp">XP total: ${fmt(S.totalXP)}</div>`:''}
    </div>
    <div class="map-center">MB<br>V2</div>
    ${planets}
    <div class="map-hint">Haz clic en el mundo iluminado para ver el briefing y empezar</div>`;
  document.querySelectorAll('#scr-map .map-planet.current').forEach(p=>{
    p.onclick = ()=>{ sfx.click(); renderBrief(+p.dataset.i); };
  });
  if(S.flash!=null){ sfx.unlock(); S.flash = null; }
  show('map');
}

/* ---------- BRIEF ---------- */
function renderBrief(i){
  S.current = i;
  const w = WORLDS[i];
  setWC(w.c);
  $('#scr-brief').innerHTML = `
    <div class="brief-card">
      <div><img class="world-art" src="${w.icon}" alt=""></div>
      <div>
        <div class="brief-kicker">MUNDO ${i+1} / ${WORLDS.length} · ${w.topic}</div>
        <h2 class="brief-title gold-text">${w.name}</h2>
        <div class="brief-block"><b>OBJETIVO DE APRENDIZAJE</b><p>${w.briefing.goal}</p></div>
        <div class="brief-block"><b>AMENAZA: ${w.monster}</b><p>${w.briefing.threat}</p></div>
        <div class="brief-block"><b>CONTEXTO EPS / STAFF</b><p>${w.briefing.context}</p></div>
        <div class="brief-actions">
          <button class="btn btn-big btn-cyan" id="btnBriefGo">ENTRAR A LA MISIÓN →</button>
          <button class="btn btn-ghost" id="btnBriefBack">Volver al mapa</button>
        </div>
      </div>
    </div>`;
  $('#btnBriefGo').onclick = ()=>{ sfx.click(); startMission(i); };
  $('#btnBriefBack').onclick = ()=>{ sfx.click(); renderMap(); };
  show('brief');
}

/* ---------- MISSION / BATTLE ---------- */
function startMission(i){
  S.current = i;
  const w = WORLDS[i];
  B = { q:0, heroHP:90, monHP:90, lock:true, ok:0, bad:0, results:[], correctPos:0, pending:null };
  setWC(w.c);
  $('#scr-mission').innerHTML = `
    <div class="mission-banner">MUNDO ${i+1}: ${w.name.toUpperCase()}</div>
    <div class="fighters">
      <div class="fighter hero-side">
        <div class="fname"><span style="color:${w.cl}">${w.hero.name}</span><span id="hpHeroN">90 / 90</span></div>
        <div class="hpbar hp-hero"><div class="hpfill" id="hpHeroF"></div></div>
        <img class="char-img" id="heroChar" src="${w.hero.img}" alt="">
      </div>
      <div class="fighter mon-side">
        <div class="fname"><span style="color:#ff9d8a">${w.monster}</span><span id="hpMonN">90 / 90</span></div>
        <div class="hpbar hp-mon"><div class="hpfill" id="hpMonF"></div></div>
        <img class="char-img" id="monChar" src="${MONSTER_IMG}" alt="">
      </div>
    </div>
    <div class="qa" id="qaPanel"></div>`;
  show('mission');
  renderMissionQ();
}

function setHP(who){
  const hp = Math.max(0, who==='hero'?B.heroHP:B.monHP);
  $(who==='hero'?'#hpHeroF':'#hpMonF').style.width = (hp/90*100)+'%';
  $(who==='hero'?'#hpHeroN':'#hpMonN').textContent = `${hp} / 90`;
}

function renderMissionQ(){
  const w = WORLDS[S.current], m = w.missions[B.q];
  const order = shuffle4();
  B.correctPos = order.indexOf(m.c);
  $('#qaPanel').innerHTML = `
    <div class="q-meta"><span>CASO ${B.q+1} / 5</span><span>${w.topic}</span></div>
    <div class="caso">${m.caso}</div>
    <div class="q-text">${m.q}</div>
    <div class="answers">${order.map((oi,pos)=>`
      <button class="ans" data-p="${pos}">
        <span class="letter">${'ABCD'[pos]}</span><span>${m.a[oi]}</span>
      </button>`).join('')}</div>`;
  document.querySelectorAll('#answers .ans, #qaPanel .ans').forEach(b=>{
    b.onclick = ()=>answer(+b.dataset.p);
  });
  B.lock = false;
}

async function answer(pos){
  if(!B||B.lock) return; B.lock = true;
  const w = WORLDS[S.current], m = w.missions[B.q];
  const btns = [...document.querySelectorAll('#qaPanel .ans')];
  btns.forEach(b=>b.disabled = true);
  const ok = pos===B.correctPos;
  S.totalQ++; if(ok){ S.totalOK++; B.ok++; } else B.bad++;
  B.results.push(ok);
  saveProgress();
  btns[pos].classList.add(ok?'correct':'wrong');
  if(!ok) btns[B.correctPos].classList.add('reveal');
  ok?sfx.ok():sfx.bad();
  await sleep(700);

  if(ok){
    $('#heroChar').classList.add('lunge'); sfx.hit();
    await sleep(200);
    $('#monChar').classList.add('hit');
    burstAt(1280,420,w.c,28);
    popDmg(1280,300,'-30','#fff');
    B.monHP -= 30; setHP('mon');
    await sleep(500);
    $('#heroChar').classList.remove('lunge'); $('#monChar').classList.remove('hit');
  } else {
    $('#monChar').classList.add('lunge-m');
    await sleep(200);
    $('#heroChar').classList.add('hit');
    $('#shaker').classList.add('shake');
    burstAt(320,420,'#ff5a3c',28);
    popDmg(320,300,'-30','#ff8a8a');
    B.heroHP -= 30; setHP('hero');
    await sleep(500);
    $('#heroChar').classList.remove('hit'); $('#monChar').classList.remove('lunge-m');
    $('#shaker').classList.remove('shake');
  }

  B.pending = { ok, m };
  renderFeedback(ok, m);
}

function renderFeedback(ok, m){
  $('#scr-feedback').innerHTML = `
    <div class="fb-card ${ok?'ok':'bad'}">
      <img class="badge" src="image/v2/badge-${ok?'ok':'bad'}.png" alt="">
      <div class="fb-title">${ok?'¡ACIERTO!':'OPORTUNIDAD DE APRENDER'}</div>
      <div class="fb-body">${ok?m.ok:m.bad}</div>
      <div class="fb-tip">
        <img src="image/v2/badge-tip.png" alt="">
        <div><b>TIP PARA EL DÍA A DÍA</b><p>${m.tip}</p></div>
      </div>
      <button class="btn btn-big btn-cyan" id="btnFbNext">CONTINUAR</button>
    </div>`;
  $('#btnFbNext').onclick = ()=>{ sfx.click(); afterFeedback(); };
  show('feedback');
}

async function afterFeedback(){
  if(!B) return;
  if(B.monHP<=0){ await sleep(120); return renderVictory(); }
  if(B.heroHP<=0){ await sleep(120); return renderDefeat(); }
  B.q++; B.pending = null;
  show('mission');
  renderMissionQ();
}

/* ---------- VICTORY / DEFEAT / FINAL ---------- */
function renderVictory(){
  const i = S.current, w = WORLDS[i];
  S.conquered[i] = true;
  S.unlocked = Math.min(WORLDS.length, i+2);
  const xp = 10000 + (B.heroHP/30)*2500;
  S.totalXP += xp;
  saveProgress();
  const last = i===WORLDS.length-1;
  setWC(w.c);
  $('#scr-victory').innerHTML = `
    <h1 class="v-title gold-text">¡VICTORIA!</h1>
    <div class="v-sub sub-strip">Mundo conquistado · aprendizaje asegurado</div>
    <div class="learn-box">
      <h3>3 APRENDIZAJES CLAVE</h3>
      <ul>${w.learnings.map(l=>`<li>${l}</li>`).join('')}</ul>
    </div>
    <div class="v-stats">
      <span>XP: <b>+${fmt(xp)}</b></span>
      <span>Aciertos: <b>${B.ok}/${B.results.length}</b></span>
      <span>Vida: <b>${B.heroHP}/90</b></span>
    </div>
    <button class="btn btn-big" id="btnNext">${last?'VER RESULTADO FINAL ★':'SIGUIENTE MUNDO →'}</button>`;
  show('victory'); sfx.win();
  $('#btnNext').onclick = ()=>{
    sfx.click();
    if(last) renderFinal();
    else { S.flash = i; renderMap(); }
  };
}

function renderDefeat(){
  const w = WORLDS[S.current];
  setWC(w.c);
  $('#scr-defeat').innerHTML = `
    <div class="d-title">¡DERROTA!</div>
    <div class="d-sub">Inténtalo de nuevo</div>
    <p class="d-tip">${w.monster} sigue ahí… pero cada feedback te hace más fuerte. Relee los tips y vuelve a la misión.</p>
    <button class="btn btn-big btn-red" id="btnRetry">↻ REINTENTAR MUNDO</button>
    <button class="btn btn-ghost" style="margin-top:12px" id="btnDefMap">Volver al mapa</button>`;
  show('defeat'); sfx.lose();
  $('#btnRetry').onclick = ()=>{ sfx.click(); renderBrief(S.current); };
  $('#btnDefMap').onclick = ()=>{ sfx.click(); renderMap(); };
}

function renderFinal(){
  setWC('#f8c848');
  const pct = S.totalQ?Math.round(S.totalOK/S.totalQ*100):0;
  $('#scr-final').innerHTML = `
    <h1 class="f-title gold-text">¡CONQUISTASTE<br>MENTES BRILLANTES V2!</h1>
    <div class="f-heroes">${WORLDS.map(w=>`<img src="${w.hero.img}" alt="">`).join('')}</div>
    <div class="learn-box" style="margin-top:20px">
      <h3>DOMINIOS CONQUISTADOS</h3>
      <ul>${WORLDS.map(w=>`<li><b>${w.name}:</b> ${w.learnings[0]}</li>`).join('')}</ul>
    </div>
    <div class="v-stats">
      <span>Mundos: <b>${WORLDS.length}/${WORLDS.length}</b></span>
      <span>XP: <b>${fmt(S.totalXP)}</b></span>
      <span>Precisión: <b>${S.totalOK}/${S.totalQ} (${pct}%)</b></span>
    </div>
    <button class="btn btn-big" id="btnAgain">▶ JUGAR DE NUEVO</button>
    <div class="version-link" style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:12px">
      <a href="index.html">← V1 clásica</a>
      <a href="v3.html">V3 Gamma + frames →</a>
    </div>`;
  show('final'); sfx.win();
  $('#btnAgain').onclick = ()=>{ sfx.click(); resetAll(); };
}

function resetAll(){
  clearProgress();
  S.current = 0; S.unlocked = 1; S.conquered = freshConquered();
  S.totalXP = 0; S.totalOK = 0; S.totalQ = 0; S.flash = null; B = null;
  renderStart();
}

/* ---------- HUD / keys ---------- */
function toggleFull(){
  if(document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(()=>{});
}
function bindHUD(){
  $('#btn-full').onclick = toggleFull;
  $('#btn-sound').onclick = e=>{
    muted = !muted;
    e.currentTarget.innerHTML = muted?'&#128263;':'&#128266;';
    if(!muted) sfx.click();
  };
  $('#btn-reset').onclick = ()=>{
    if(confirm('¿Reiniciar toda la aventura V2 desde el inicio?')) resetAll();
  };
}
function primary(){
  if(S.screen==='start') $('#btnStart')&&$('#btnStart').click();
  else if(S.screen==='map'){
    const p = document.querySelector('#scr-map .map-planet.current');
    if(p) renderBrief(+p.dataset.i);
  }
  else if(S.screen==='brief') $('#btnBriefGo')&&$('#btnBriefGo').click();
  else if(S.screen==='feedback') $('#btnFbNext')&&$('#btnFbNext').click();
  else if(S.screen==='victory') $('#btnNext')&&$('#btnNext').click();
  else if(S.screen==='defeat') $('#btnRetry')&&$('#btnRetry').click();
  else if(S.screen==='final') $('#btnAgain')&&$('#btnAgain').click();
}
addEventListener('keydown', e=>{
  const k = e.key.toLowerCase();
  if(k==='f'){ toggleFull(); return; }
  if(S.screen==='mission' && B && !B.lock){
    const m = {'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3};
    if(k in m){
      const btn = document.querySelectorAll('#qaPanel .ans')[m[k]];
      if(btn){ btn.click(); return; }
    }
  }
  if(['enter',' ','arrowright'].includes(k)){ e.preventDefault(); primary(); }
});
addEventListener('pointerdown', ()=>{ const a = ac(); if(a&&a.state==='suspended') a.resume(); });

async function init(){
  fit();
  requestAnimationFrame(loop);
  try{
    const res = await fetch('contenido-v2.json');
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    WORLDS = data.worlds;
    DATA_VERSION = data.version??1;
    if(!WORLDS?.length) throw new Error('contenido-v2.json sin mundos');
    S.conquered = freshConquered();
    loadProgress();
    bindHUD();
    hideLoader();
    renderStart();
  }catch(e){
    showLoadError(e);
  }
}
init();
