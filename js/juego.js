/* ================================================================
   SISTEMA MENTES BRILLANTES — Motor del juego
   Contenido editable en preguntas.json
   ================================================================ */
let WORLDS = [];
let DATA_VERSION = 0;
const SAVE_KEY = 'mentes-brillantes-v1';

/* ================================================================
   CONSTRUCTORES DE ARTE (planeta, logo, trofeo: SVG dibujado a mano)
   ================================================================ */
let _UID=0; const uid=()=>'u'+(++_UID);

function planetSVG(w,o={}){
  const id=uid();
  const ring=o.ring?`<ellipse cx="60" cy="62" rx="57" ry="17" fill="none" stroke="${w.cl}" stroke-opacity=".55" stroke-width="5" transform="rotate(-16 60 62)"/>`:'';
  return `<svg class="planet" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="pg${id}" cx="34%" cy="30%" r="80%">
    <stop offset="0%" stop-color="${w.cl}"/><stop offset="46%" stop-color="${w.c}"/><stop offset="100%" stop-color="${w.cd}"/>
  </radialGradient></defs>
  <circle cx="60" cy="60" r="40" fill="url(#pg${id})"/>
  <ellipse cx="48" cy="52" rx="11" ry="6.5" fill="#000" opacity=".13"/>
  <ellipse cx="70" cy="72" rx="13" ry="7" fill="#000" opacity=".13"/>
  <ellipse cx="62" cy="38" rx="8" ry="4.5" fill="#000" opacity=".1"/>
  <ellipse cx="46" cy="42" rx="13" ry="7.5" fill="#fff" opacity=".28"/>
  ${ring}</svg>`;
}

function logoSVG(segs){
  const id=uid(); let ring='';
  if(segs){ ring=WORLDS.map((w,i)=>`<circle class="seg${segs[i]?' lit':''}" cx="100" cy="100" r="90" pathLength="100" fill="none" stroke="${w.c}" stroke-width="9" stroke-linecap="round" stroke-dasharray="12.6 87.4" opacity="${segs[i]?1:.14}" transform="rotate(${i*60-90} 100 100)" style="color:${w.c}"/>`).join(''); }
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="lg${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#fff3c4"/><stop offset="50%" stop-color="#ffd24a"/><stop offset="100%" stop-color="#c87d12"/>
  </linearGradient></defs>
  ${ring}
  <circle cx="100" cy="100" r="76" fill="#fdfefe"/>
  <circle cx="100" cy="100" r="76" fill="none" stroke="#dbe4ee" stroke-width="3"/>
  <polygon points="96,58 74,96 82,106 76,138 102,152 116,130 110,92" fill="#e11d48"/>
  <polygon points="116,130 102,152 128,164 138,138" fill="#f97316"/>
  <polygon points="96,58 110,92 138,80 126,50" fill="#f5c211"/>
  <polygon points="138,80 110,92 116,130 138,138 152,104" fill="#22c55e"/>
  <polygon points="126,50 138,80 152,104 170,86 158,54" fill="#3b82f6"/>
  <polygon points="152,104 138,138 128,164 158,160 172,128 170,86" fill="#8b5cf6"/>
  <path d="M64,140 C58,178 118,192 154,168" fill="none" stroke="#f2a51f" stroke-width="14" stroke-linecap="round" opacity=".85"/>
  <path d="M64,140 C58,178 118,192 154,168" fill="none" stroke="#fdfefe" stroke-width="9" stroke-linecap="round"/>
  <path d="M162,34 L168,48 L182,54 L168,60 L162,74 L156,60 L142,54 L156,48 Z" fill="url(#lg${id})" stroke="#b8791a" stroke-width="2"/></svg>`;
}

function trophySVG(){
  const id=uid();
  return `<svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="tg${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#fff6cf"/><stop offset="30%" stop-color="#ffd24a"/>
    <stop offset="62%" stop-color="#e79a1b"/><stop offset="85%" stop-color="#a5610d"/>
    <stop offset="100%" stop-color="#ffd24a"/></linearGradient></defs>
  <path d="M58,54 C14,58 16,116 64,118" fill="none" stroke="url(#tg${id})" stroke-width="13" stroke-linecap="round"/>
  <path d="M182,54 C226,58 224,116 176,118" fill="none" stroke="url(#tg${id})" stroke-width="13" stroke-linecap="round"/>
  <path d="M56,36 L184,36 L184,58 C184,116 152,150 120,150 C88,150 56,116 56,58 Z" fill="url(#tg${id})" stroke="#8a5209" stroke-width="3"/>
  <rect x="48" y="26" width="144" height="17" rx="8" fill="url(#tg${id})" stroke="#8a5209" stroke-width="3"/>
  <path d="M120,66 L127,84 L146,90 L127,96 L120,114 L113,96 L94,90 L113,84 Z" fill="#fff6cf" stroke="#b8791a" stroke-width="2.5"/>
  <rect x="68" y="44" width="15" height="80" rx="7" fill="#fff" opacity=".32" transform="rotate(12 75 84)"/>
  <path d="M106,150 L134,150 L142,178 L98,178 Z" fill="url(#tg${id})" stroke="#8a5209" stroke-width="3"/>
  <rect x="86" y="178" width="68" height="13" rx="4" fill="url(#tg${id})" stroke="#8a5209" stroke-width="3"/>
  <rect x="74" y="191" width="92" height="18" rx="6" fill="url(#tg${id})" stroke="#8a5209" stroke-width="3"/>
  <rect x="98" y="195" width="44" height="10" rx="3" fill="#6b3f07"/></svg>`;
}

function lockSVG(){
  return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <path d="M19,28 V19 C19,7 41,7 41,19 V28" fill="none" stroke="#d3dae4" stroke-width="7" stroke-linecap="round"/>
  <rect x="12" y="26" width="36" height="27" rx="7" fill="#97a1b1" stroke="#5c6572" stroke-width="3"/>
  <circle cx="30" cy="37" r="5" fill="#39404e"/><rect x="27.5" y="39" width="5" height="9" rx="2" fill="#39404e"/></svg>`;
}

const MONSTER_IMG='image/monstruo.png';
const ANIM_FRAME_COUNTS={idle:8,move:8,attack:8,hit:6};
const ANIM_PLAYERS=new WeakMap();

function animSlug(src){
  return (src||'').split('/').pop().replace(/\.[^.]+$/,'');
}

function animFrame(slug,action='idle',i=0){
  return `image/anim/${slug}/${action}/frame-${String(i).padStart(2,'0')}.png`;
}

function heroImg(h,cls=''){
  const slug=animSlug(h.img);
  return `<img class="hero-img anim-frame ${cls}" data-anim-slug="${slug}" data-anim-action="idle" src="${animFrame(slug)}" alt="">`;
}
function monsterImg(cls=''){
  const slug=animSlug(MONSTER_IMG);
  return `<img class="monster-img anim-frame ${cls}" data-anim-slug="${slug}" data-anim-action="idle" src="${animFrame(slug)}" alt="">`;
}
function charBody(kind,inner,cls=''){
  return `<div class="char-body ${kind} ${cls}">${inner}</div>`;
}
function heroBody(h,cls=''){ return charBody('idle-hero', heroImg(h), cls); }
function monsterBody(cls=''){ return charBody('idle-mon', monsterImg(), cls); }

function setFrameAction(body,action='idle',o={}){
  const img=body?.querySelector('.anim-frame');
  if(!img) return Promise.resolve();
  const slug=img.dataset.animSlug;
  const count=ANIM_FRAME_COUNTS[action]||ANIM_FRAME_COUNTS.idle;
  const loop=o.loop ?? !o.once;
  const duration=o.duration || (loop ? count*115 : count*70);
  const player=ANIM_PLAYERS.get(img)||{token:0};
  const token=++player.token;
  ANIM_PLAYERS.set(img,player);
  img.dataset.animAction=action;
  return new Promise(resolve=>{
    const start=performance.now();
    function tick(now){
      if(player.token!==token) return resolve();
      const elapsed=now-start;
      let idx;
      if(loop) idx=Math.floor(elapsed/(duration/count))%count;
      else idx=Math.min(count-1,Math.floor(elapsed/duration*count));
      img.src=animFrame(slug,action,idx);
      if(loop || elapsed<duration) requestAnimationFrame(tick);
      else{
        if(o.nextIdle!==false) setFrameAction(body,'idle');
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

function startFrameLoops(root=document){
  root.querySelectorAll('.char-body').forEach(b=>setFrameAction(b,'idle'));
}

/* ================================================================
   MOVIMIENTO DE PERSONAJES
   ================================================================ */
const MAP_CENTER={x:800,y:470};
const BATTLE_HERO_BASE={x:210,y:560};
const BATTLE_MON_BASE={x:1390,y:540};
const REDUCED_MOTION=matchMedia('(prefers-reduced-motion: reduce)').matches;
let mapMoveToken=0, battleMoveToken=0, mapMonPatrol=null, battlePatrolTimer=null, battlePatrolStop=null;

function easeInOut(t){ return t<.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2; }
function easeOutCubic(t){ return 1-Math.pow(1-t,3); }

function charCenter(el){
  const r=el.getBoundingClientRect(), sr=$('#stage').getBoundingClientRect();
  const scale=sr.width/1600||1;
  return {x:(r.left+r.width/2-sr.left)/scale, y:(r.top+r.height*.42-sr.top)/scale};
}

function setWalkerPos(el,x,y){
  el.style.left=x+'px'; el.style.top=y+'px';
}

function setWalkerDynamics(el,{lift=0,tilt=0,scale=1,shadowScale=1,shadowAlpha=.34}={}){
  el.style.setProperty('--char-lift', lift.toFixed(2)+'px');
  el.style.setProperty('--char-tilt', tilt.toFixed(2)+'deg');
  el.style.setProperty('--char-scale', scale.toFixed(3));
  el.style.setProperty('--shadow-scale', shadowScale.toFixed(3));
  el.style.setProperty('--shadow-alpha', shadowAlpha.toFixed(3));
}

function setWalkState(body,on,flip,action='move'){
  if(!body) return;
  body.classList.toggle('traveling',on);
  body.classList.toggle('flip',!!flip);
  setFrameAction(body,on?action:'idle');
}

function setFacing(body,flip){
  if(body) body.classList.toggle('flip',!!flip);
}

function showImpactRing(x,y,color){
  if(REDUCED_MOTION) return;
  const r=document.createElement('div');
  r.className='impact-ring';
  r.style.left=x+'px'; r.style.top=y+'px'; r.style.color=color;
  $('#shaker').appendChild(r);
  setTimeout(()=>r.remove(),700);
}

function showActionWord(txt,x,y,color){
  if(REDUCED_MOTION) return;
  const w=document.createElement('div');
  w.className='action-word';
  w.style.left=x+'px'; w.style.top=y+'px'; w.style.color=color;
  w.textContent=txt;
  $('#shaker').appendChild(w);
  setTimeout(()=>w.remove(),850);
}

function pulseImpact(){
  if(REDUCED_MOTION) return;
  const s=$('#shaker');
  s.classList.remove('impact'); void s.offsetWidth;
  s.classList.add('impact');
  setTimeout(()=>s.classList.remove('impact'),360);
}

function cancelMapMoves(){ mapMoveToken++; stopMapMonPatrol(); }
function cancelBattleMoves(){ battleMoveToken++; }
function stopMapMonPatrol(){ if(mapMonPatrol){ clearTimeout(mapMonPatrol); mapMonPatrol=null; } }
function stopBattlePatrol(){ cancelBattleMoves(); if(battlePatrolTimer){ clearTimeout(battlePatrolTimer); battlePatrolTimer=null; }
  if(battlePatrolStop){ battlePatrolStop(); battlePatrolStop=null; } }

async function moveWalker(el,x1,y1,x2,y2,ms,token,opt={}){
  const body=el.querySelector('.char-body');
  if(REDUCED_MOTION || ms<=0){
    setWalkerPos(el,x2,y2); setWalkState(body,false); setWalkerDynamics(el); return;
  }
  const distance=Math.hypot(x2-x1,y2-y1);
  const arc=opt.arc ?? Math.min(34, Math.max(8, distance*.035));
  const maxTilt=opt.tilt ?? Math.min(4.2, Math.max(1.2, distance*.006));
  const travelScale=opt.scale ?? 1;
  const tokenKind=opt.tokenKind||'map';
  if(opt.preserveAction){
    body.classList.add('traveling');
    setFacing(body,x2<x1);
  }else setWalkState(body,true,x2<x1,opt.action||'move');
  const t0=performance.now();
  return new Promise(resolve=>{
    function frame(now){
      const cancelled=token!=null && (tokenKind==='battle' ? token!==battleMoveToken : token!==mapMoveToken);
      if(cancelled){
        body.classList.remove('traveling');
        if(!opt.preserveAction) setWalkState(body,false);
        setWalkerDynamics(el);
        return resolve();
      }
      const k=Math.min(1,(now-t0)/ms);
      const e=opt.ease==='out' ? easeOutCubic(k) : easeInOut(k);
      const lift=-Math.sin(k*Math.PI)*arc;
      const tilt=(x2>=x1?1:-1)*Math.sin(k*Math.PI)*maxTilt;
      const shadowEase=Math.sin(k*Math.PI);
      setWalkerPos(el,x1+(x2-x1)*e,y1+(y2-y1)*e);
      setWalkerDynamics(el,{
        lift, tilt, scale: travelScale,
        shadowScale: 1+shadowEase*.22,
        shadowAlpha: Math.max(.16,.34-shadowEase*.18)
      });
      if(k<1) requestAnimationFrame(frame);
      else{
        body.classList.remove('traveling');
        if(!opt.preserveAction) setWalkState(body,false);
        setWalkerDynamics(el);
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

function mapTargetFor(i){ const [px,py]=MP[i]; return {x:px,y:py+78}; }

async function walkMapHeroTo(x,y,ms){
  const el=$('#mapHero'); if(!el) return;
  const x1=+el.dataset.x||MAP_CENTER.x, y1=+el.dataset.y||MAP_CENTER.y;
  if(Math.hypot(x-x1,y-y1)<10){
    setWalkerPos(el,x,y); el.dataset.x=x; el.dataset.y=y; return;
  }
  const token=++mapMoveToken;
  const dist=Math.hypot(x-x1,y-y1);
  await moveWalker(el,x1,y1,x,y,ms||Math.max(650,Math.min(2400,dist*2.2)),token,{arc:16,tilt:2.2});
  if(token!==mapMoveToken) return;
  el.dataset.x=x; el.dataset.y=y;
}

function startMapMonPatrol(i){
  stopMapMonPatrol();
  const el=$('#mapMon'); if(!el) return;
  const [px,py]=MP[i];
  const base={x:px+92,y:py+62};
  setWalkerPos(el,base.x,base.y);
  el.dataset.x=base.x; el.dataset.y=base.y;
  let dir=-1, busy=false;
  async function step(){
    if(S.screen!=='map'||!$('#mapMon')||busy) return;
    busy=true;
    const cx=+el.dataset.x, cy=+el.dataset.y;
    const nx=cx+dir*56, ny=cy+(dir>0?-8:8);
    await moveWalker(el,cx,cy,nx,ny,760,null,{arc:10,tilt:1.8});
    if($('#mapMon')){ el.dataset.x=nx; el.dataset.y=ny; dir*=-1; }
    busy=false;
    if(S.screen==='map'&&$('#mapMon')) mapMonPatrol=setTimeout(step,900);
  }
  mapMonPatrol=setTimeout(step,900);
}

function startBattlePatrol(){
  stopBattlePatrol();
  if(REDUCED_MOTION) return;
  const step=async()=>{
    if(!B||B.lock||S.screen!=='battle') return;
    const hero=$('#heroChar'), mon=$('#monChar');
    if(!hero||!mon) return;
    const hx=B.heroBase.x, hy=B.heroBase.y, mx=B.monBase.x, my=B.monBase.y;
    const token=++battleMoveToken;
    await moveWalker(hero,hx,hy,hx+16,hy-5,720,token,{arc:6,tilt:1.2,tokenKind:'battle'});
    if(!B||B.lock||S.screen!=='battle') return;
    await moveWalker(hero,hx+16,hy-5,hx-10,hy,780,token,{arc:5,tilt:1.1,tokenKind:'battle'});
    if(!B||B.lock||S.screen!=='battle') return;
    await moveWalker(hero,hx-10,hy,hx,hy,620,token,{arc:4,tilt:.8,tokenKind:'battle'});
    if(!B||B.lock||S.screen!=='battle') return;
    await moveWalker(mon,mx,my,mx-16,my-5,760,token,{arc:7,tilt:1.1,tokenKind:'battle'});
    if(!B||B.lock||S.screen!=='battle') return;
    await moveWalker(mon,mx-16,my-5,mx+10,my,800,token,{arc:6,tilt:1,tokenKind:'battle'});
    if(!B||B.lock||S.screen!=='battle') return;
    await moveWalker(mon,mx+10,my,mx,my,640,token,{arc:4,tilt:.8,tokenKind:'battle'});
    if(!B||B.lock||S.screen!=='battle') return;
    battlePatrolTimer=setTimeout(step,900);
  };
  battlePatrolStop=()=>{};
  battlePatrolTimer=setTimeout(step,1200);
}

async function battleEntrance(){
  const hero=$('#heroChar'), mon=$('#monChar');
  if(!hero||!mon) return;
  B.heroBase={...BATTLE_HERO_BASE}; B.monBase={...BATTLE_MON_BASE};
  if(REDUCED_MOTION){
    setWalkerPos(hero,B.heroBase.x,B.heroBase.y);
    setWalkerPos(mon,B.monBase.x,B.monBase.y);
    return;
  }
  setWalkerPos(hero,-120,B.heroBase.y+20);
  setWalkerPos(mon,1720,B.monBase.y+10);
  await Promise.all([
    moveWalker(hero,-120,B.heroBase.y+20,B.heroBase.x,B.heroBase.y,1100,null,{arc:22,tilt:2.6,ease:'out'}),
    moveWalker(mon,1720,B.monBase.y+10,B.monBase.x,B.monBase.y,1200,null,{arc:20,tilt:2.4,ease:'out'})
  ]);
}

async function battleStrike(attacker){
  const isHero=attacker==='hero';
  const atkEl=$(isHero?'#heroChar':'#monChar');
  const defEl=$(isHero?'#monChar':'#heroChar');
  const atkBody=atkEl.querySelector('.char-body');
  const defBody=defEl.querySelector('.char-body');
  const base=isHero?B.heroBase:B.monBase;
  const meetX=isHero?base.x+240:base.x-240;
  const w=WORLDS[S.current];
  stopBattlePatrol();
  const token=++battleMoveToken;
  const attackFlip=!isHero;
  const impactColor=isHero?w.c:'#ff5a3c';
  setFacing(atkBody,attackFlip);
  const attackAnim=setFrameAction(atkBody,'attack',{once:true,duration:isHero?760:820});
  await sleep(150);
  if(isHero) sfx.swing(); else sfx.bad();
  atkBody.classList.add('dashing');
  await moveWalker(atkEl,base.x,base.y,meetX,base.y,isHero?230:250,token,{arc:18,tilt:4.6,scale:1.015,ease:'out',tokenKind:'battle',preserveAction:true});
  atkBody.classList.remove('dashing');
  const from=charCenter(atkEl), to=charCenter(defEl);
  await shootOrb(from,to,w.c,!isHero);
  sfx.hit();
  pulseImpact();
  showImpactRing(to.x,to.y,impactColor);
  showActionWord(isHero?'¡Acierto!':'¡Cuidado!',to.x,to.y-102,impactColor);
  setFacing(defBody,!isHero);
  defBody.classList.add('hitflash');
  setFrameAction(defBody,'hit',{once:true,duration:520});
  if(isHero){
    burstAt(to.x,to.y,w.c,34);
    popDmg(to.x,to.y-140,'-30','#ffffff');
    B.monHP-=30; setHP('mon');
  }else{
    $('#shaker').classList.add('shake');
    burstAt(to.x,to.y,'#ff5a3c',30);
    popDmg(to.x,to.y-150,'-30','#ff8a8a');
    B.heroHP-=30; setHP('hero');
  }
  await sleep(420);
  defBody.classList.remove('hitflash');
  await attackAnim;
  await moveWalker(atkEl,meetX,base.y,base.x,base.y,440,token,{arc:10,tilt:2.4,tokenKind:'battle'});
  if(!isHero) $('#shaker').classList.remove('shake');
}

/* ================================================================
   SONIDO (sintetizado con WebAudio, sin archivos)
   ================================================================ */
let AC=null, muted=false;
function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function tone(f,d,type,v,dt,f2){ const a=ac(); if(!a||muted) return;
  const o=a.createOscillator(), g=a.createGain(), t=a.currentTime+(dt||0);
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t);
  if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+d);
  g.gain.setValueAtTime(v||.18,t); g.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+d+.05); }
const sfx={
  click(){ tone(700,.07,'square',.09); },
  ok(){ tone(523,.14,'sine',.22); tone(659,.14,'sine',.22,.09); tone(784,.24,'sine',.22,.18); },
  bad(){ tone(210,.32,'sawtooth',.2,0,110); tone(150,.32,'square',.12,.02,80); },
  hit(){ tone(120,.16,'square',.3,0,45); },
  swing(){ tone(320,.16,'sawtooth',.08,0,900); },
  win(){ [523,659,784,1046,1318].forEach((f,i)=>tone(f,.34,'triangle',.22,i*.12)); tone(1568,.5,'sine',.15,.62); },
  lose(){ tone(392,.4,'triangle',.2,0,196); tone(196,.7,'sine',.2,.25,98); },
  whoosh(){ tone(160,1.1,'sawtooth',.11,0,1200); tone(90,1.1,'triangle',.09,.05,500); },
  unlock(){ tone(880,.12,'sine',.18); tone(1174,.16,'sine',.18,.09); tone(1568,.22,'sine',.15,.18); }
};

/* ================================================================
   MOTOR DEL JUEGO
   ================================================================ */
const $=s=>document.querySelector(s);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fmt=n=>n.toLocaleString('es-CO');

const S={ current:0, unlocked:1, conquered:[], totalXP:0, totalOK:0, totalQ:0,
  screen:'start', flash:null, transT:null, transGo:null };
let B=null;
const MP=[[560,285],[1040,285],[1215,470],[1040,655],[560,655],[385,470]];
let mapHeroPos={...MAP_CENTER};

function freshConquered(){ return Array(WORLDS.length).fill(false); }

function saveProgress(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version:DATA_VERSION, current:S.current, unlocked:S.unlocked,
      conquered:S.conquered, totalXP:S.totalXP, totalOK:S.totalOK, totalQ:S.totalQ
    }));
  }catch(e){}
}

function loadProgress(){
  try{
    const raw=localStorage.getItem(SAVE_KEY);
    if(!raw) return;
    const d=JSON.parse(raw);
    if(d.version!==DATA_VERSION) return;
    if(!Array.isArray(d.conquered)||d.conquered.length!==WORLDS.length) return;
    S.current=d.current??0;
    S.unlocked=d.unlocked??1;
    S.conquered=d.conquered;
    S.totalXP=d.totalXP??0;
    S.totalOK=d.totalOK??0;
    S.totalQ=d.totalQ??0;
  }catch(e){}
}

function clearProgress(){ try{ localStorage.removeItem(SAVE_KEY); }catch(e){} }

function hasProgress(){ return S.totalQ>0||S.conquered.some(Boolean)||S.totalXP>0; }

function shuffle4(){
  const a=[0,1,2,3];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function setWC(c){ $('#shaker').style.setProperty('--wc',c); }
function show(name){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $('#scr-'+name).classList.add('active'); S.screen=name; }

function hideLoader(){ const el=$('#loader'); if(el) el.remove(); }

function showLoadError(err){
  hideLoader();
  $('#scr-start').innerHTML=`
   <h1 class="start-title gold-text" style="font-size:64px;margin-top:120px">ERROR DE CARGA</h1>
   <div class="start-sub sub-strip">No se pudo cargar preguntas.json</div>
   <p style="margin-top:24px;font-size:20px;color:#8f9ab8;max-width:700px;line-height:1.5">
     Abre el juego desde un servidor web (no como archivo local).<br>
     Ejemplo: <code style="color:#c9b06a">npx serve .</code>
   </p>
   <p style="margin-top:12px;font-size:15px;color:#5f6884">${err?.message||err||''}</p>
   <button class="btn btn-big btn-cyan" style="margin-top:28px" onclick="location.reload()">REINTENTAR</button>`;
  show('start');
}

/* ---------- escala responsive (desktop letterbox / mobile pan+scroll) ---------- */
function fit(){
  const stage=$('#stage'), vp=$('#viewport');
  if(!stage||!vp) return;
  const vw=innerWidth, vh=innerHeight;
  const mobile=vw<900;
  if(mobile){
    // Escala para que el ancho quepa; permite scroll vertical si hace falta
    const s=Math.min(vw/1600, vh/900, 1);
    // En portrait prioriza ancho legible y permite desplazar
    const useScroll=vh>vw || s<0.42;
    if(useScroll){
      const sc=Math.min(Math.max(vw/1600, 0.38), vw/1600*1.02);
      stage.style.left='0';
      stage.style.top='0';
      stage.style.transformOrigin='top left';
      stage.style.transform=`scale(${sc})`;
      stage.style.marginRight=`${1600*(sc-1)}px`;
      stage.style.marginBottom=`${900*(sc-1)}px`;
      vp.style.overflow='auto';
      vp.classList.add('mobile-scroll');
    }else{
      stage.style.left='50%';
      stage.style.top='50%';
      stage.style.transformOrigin='center';
      stage.style.transform=`translate(-50%,-50%) scale(${s})`;
      stage.style.marginRight='';
      stage.style.marginBottom='';
      vp.style.overflow='hidden';
      vp.classList.remove('mobile-scroll');
    }
  }else{
    const s=Math.min(vw/1600, vh/900);
    stage.style.left='50%';
    stage.style.top='50%';
    stage.style.transformOrigin='center';
    stage.style.transform=`translate(-50%,-50%) scale(${s})`;
    stage.style.marginRight='';
    stage.style.marginBottom='';
    vp.style.overflow='hidden';
    vp.classList.remove('mobile-scroll');
  }
}
addEventListener('resize',fit);
addEventListener('orientationchange',()=>setTimeout(fit,120));

/* ---------- estrellas + partículas ---------- */
const bg=$('#bgc').getContext('2d'), fx=$('#fxc').getContext('2d');
const stars=[]; for(let i=0;i<230;i++) stars.push({x:Math.random()*1600,y:Math.random()*900,
  r:Math.random()*1.7+.4, p:Math.random()*6.28, s:.5+Math.random()*1.5});
let shoot=null, FXm='none', parts=[], frame=0;
const CONF=['#e11d48','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#f8c848','#ffffff'];
function burstAt(x,y,color,n=28,pow=7){ for(let i=0;i<n;i++){ const a=Math.random()*6.28, v=Math.random()*pow+2;
  parts.push({t:'sp',x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,g:.14,life:40+Math.random()*25,max:65,c:color,r:2+Math.random()*3.5}); } }
function setFX(m){ FXm=m; if(m==='none') parts.length=0; }
function loop(){ frame++;
  bg.clearRect(0,0,1600,900);
  const t=frame/60;
  for(const st of stars){ bg.globalAlpha=.35+.45*Math.abs(Math.sin(t*st.s+st.p));
    bg.fillStyle='#cfe0ff'; bg.beginPath(); bg.arc(st.x,st.y,st.r,0,6.28); bg.fill(); }
  bg.globalAlpha=1;
  if(!shoot && Math.random()<.004) shoot={x:Math.random()*1200+300,y:Math.random()*260+40,vx:-9-Math.random()*5,vy:3+Math.random()*2,l:0};
  if(shoot){ shoot.l++; bg.strokeStyle='rgba(200,225,255,.8)'; bg.lineWidth=2; bg.beginPath();
    bg.moveTo(shoot.x,shoot.y); bg.lineTo(shoot.x-shoot.vx*6,shoot.y-shoot.vy*6); bg.stroke();
    shoot.x+=shoot.vx; shoot.y+=shoot.vy; if(shoot.l>70||shoot.x<-80) shoot=null; }
  if(FXm==='celebrate'){
    if(parts.length<560) for(let i=0;i<5;i++) parts.push({t:'cf',x:Math.random()*1600,y:-16,
      vx:(Math.random()-.5)*2.2,vy:2.4+Math.random()*3.4,rot:Math.random()*6.28,vr:(Math.random()-.5)*.3,
      w:7+Math.random()*7,h:10+Math.random()*8,c:CONF[Math.random()*CONF.length|0],life:420,max:420});
    if(frame%46===0) parts.push({t:'rk',x:220+Math.random()*1160,y:910,vx:(Math.random()-.5)*2,
      vy:-(12.5+Math.random()*4),c:CONF[Math.random()*CONF.length|0],life:200,max:200});
  } else if(FXm==='embers'){
    if(frame%3===0) parts.push({t:'em',x:Math.random()*1600,y:915,vx:(Math.random()-.5)*.8,
      vy:-(0.9+Math.random()*1.6),r:1.5+Math.random()*2.5,c:Math.random()<.5?'#ff7a3c':'#ffb35c',life:300,max:300});
  }
  fx.clearRect(0,0,1600,900);
  for(let i=parts.length-1;i>=0;i--){ const p=parts[i]; p.life--;
    if(p.t==='cf'){ p.x+=p.vx+Math.sin((frame+i)*.06)*1.1; p.y+=p.vy; p.rot+=p.vr;
      if(p.y>920||p.life<=0){parts.splice(i,1);continue}
      fx.save(); fx.translate(p.x,p.y); fx.rotate(p.rot); fx.globalAlpha=.95;
      fx.fillStyle=p.c; fx.fillRect(-p.w/2,-p.h/2,p.w,p.h); fx.restore();
    } else if(p.t==='sp'){ p.x+=p.vx; p.y+=p.vy; p.vy+=p.g;
      if(p.life<=0){parts.splice(i,1);continue}
      fx.globalAlpha=Math.max(0,p.life/p.max); fx.fillStyle=p.c;
      fx.beginPath(); fx.arc(p.x,p.y,p.r,0,6.28); fx.fill();
    } else if(p.t==='rk'){ p.x+=p.vx; p.y+=p.vy; p.vy+=.12;
      fx.globalAlpha=.9; fx.fillStyle=p.c; fx.beginPath(); fx.arc(p.x,p.y,3,0,6.28); fx.fill();
      if(p.vy>-1.5||p.life<=0){ burstAt(p.x,p.y,p.c,46,6.5);
        if(FXm==='celebrate') tone(600+Math.random()*500,.18,'sine',.045,0,120);
        parts.splice(i,1); }
    } else if(p.t==='em'){ p.x+=p.vx+Math.sin((frame+i)*.05)*.5; p.y+=p.vy;
      if(p.y<-20||p.life<=0){parts.splice(i,1);continue}
      fx.globalAlpha=Math.min(.9,p.life/120); fx.fillStyle=p.c;
      fx.beginPath(); fx.arc(p.x,p.y,p.r,0,6.28); fx.fill(); }
  }
  fx.globalAlpha=1;
  requestAnimationFrame(loop);
}

/* ---------- pantalla de inicio ---------- */
function renderStart(){
  setWC('#8b5cf6'); setFX('none');
  const R=[105,140,175,210,245,278];
  let rings='', orbs='';
  R.forEach(r=>{ rings+=`<div class="orbit-ring" style="width:${r*2}px;height:${r*2}px"></div>`; });
  WORLDS.forEach((w,i)=>{ const r=R[i], d=16+i*7, size=42+((i*13)%22);
    orbs+=`<div class="orbiter" style="animation-duration:${d}s;animation-direction:${i%2?'reverse':'normal'}">
      <div class="pl" style="width:${size}px;left:${r}px">${planetSVG(w,{ring:i===2||i===4})}</div></div>`; });
  $('#scr-start').innerHTML=`
   <h1 class="start-title gold-text">SISTEMA<small>MENTES BRILLANTES</small></h1>
   <div class="start-sub sub-strip">Conquista los ${WORLDS.length} Mundos de la Innovaci&oacute;n</div>
   <div class="orbit-scene">${rings}${orbs}<div class="start-logo">${logoSVG(null)}</div></div>
   <button class="btn btn-big btn-cyan" id="btnStart">&#9654;&nbsp; ${hasProgress()?'CONTINUAR AVENTURA':'COMENZAR AVENTURA'}</button>
   ${hasProgress()?'<div class="start-hint" style="color:#9aa6c8">Progreso guardado en este dispositivo</div>':''}
   <div class="start-hint">5 preguntas por mundo &middot; cada acierto hiere al monstruo, cada error te hiere a ti &middot; 3 golpes deciden la batalla</div>
   <div style="margin-top:18px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap">
   <a href="v2.html" style="font-size:16px;color:#8aa0d4;text-decoration:underline">V2 aprendizaje →</a>
   <a href="v3.html" style="font-size:16px;color:#ffd700;text-decoration:underline">V3 Gamma + frames →</a>
   </div>`;
  $('#btnStart').onclick=()=>{ sfx.click(); renderMap(); };
  show('start');
}

/* ---------- mapa de progreso ---------- */
function renderMap(){
  cancelMapMoves();
  setWC('#8b5cf6'); setFX('none');
  const cnt=S.conquered.filter(Boolean).length;
  const cur=S.conquered.indexOf(false);
  const curWorld=WORLDS[cur]||WORLDS[0];
  let lines=`<ellipse class="map-orbit" cx="800" cy="470" rx="250" ry="152"/>
    <ellipse class="map-orbit" cx="800" cy="470" rx="345" ry="212"/>
    <ellipse class="map-orbit" cx="800" cy="470" rx="435" ry="268"/>`;
  WORLDS.forEach((w,i)=>{ if(S.conquered[i]){ const [px,py]=MP[i];
    const dx=800-px, dy=470-py, L=Math.hypot(dx,dy), ux=dx/L, uy=dy/L;
    lines+=`<line class="beam" x1="${px+ux*55}" y1="${py+uy*55}" x2="${800-ux*102}" y2="${470-uy*102}" stroke="${w.c}" style="color:${w.c}"/>`; } });
  let planets='';
  WORLDS.forEach((w,i)=>{ const [px,py]=MP[i];
    const st=S.conquered[i]?'conquered':(i===cur?'current':'locked');
    planets+=`<div class="map-planet ${st}${S.flash===i?' flash':''}" data-i="${i}" style="left:${px}px;top:${py}px;--pc:${w.c}">
      ${st==='current'?'<div class="play-tag">&#161;JUGAR!</div>':''}
      ${planetSVG(w,{ring:i===1||i===4})}
      ${st==='locked'?`<div class="lock-ico">${lockSVG()}</div>`:''}
      <div class="map-name"><b>MUNDO ${i+1}</b>${w.name}${st==='conquered'?'<br><span class="badge-conq">&#10003; CONQUISTADO</span>':''}</div>
    </div>`; });
  const fromCenter=S.flash!=null||!hasProgress();
  if(fromCenter) mapHeroPos={...MAP_CENTER};
  const startPos={...mapHeroPos};
  const target=mapTargetFor(cur>=0?cur:0);
  $('#scr-map').innerHTML=`
   <svg class="map-lines" viewBox="0 0 1600 900">${lines}</svg>
   <div class="map-title-wrap">
     <div class="map-title"><span class="gold-text">MUNDOS CONQUISTADOS: ${cnt} / ${WORLDS.length}</span></div>
     <div class="map-sub">Sistema Mentes Brillantes</div>
     ${S.totalXP?`<div class="map-xp">XP total: ${fmt(S.totalXP)}</div>`:''}
   </div>
   <div class="map-logo" style="left:800px;top:470px">${logoSVG(S.conquered)}</div>
   ${planets}
   <div class="map-walker" id="mapHero" data-x="${startPos.x}" data-y="${startPos.y}" style="left:${startPos.x}px;top:${startPos.y}px">
     ${heroBody(curWorld.hero)}<div class="walker-tag">${curWorld.hero.name}</div></div>
   <div class="map-walker map-mon" id="mapMon" style="left:${target.x+92}px;top:${target.y-16}px">
     ${monsterBody()}<div class="walker-tag">${curWorld.monster}</div></div>
   <div class="map-hint">Haz clic en el planeta iluminado para iniciar la batalla</div>`;
  document.querySelectorAll('#scr-map .map-planet.current').forEach(p=>{
    p.onclick=()=>goToBattle(+p.dataset.i); });
  if(S.flash!=null){ sfx.unlock(); S.flash=null; }
  show('map');
  startFrameLoops($('#scr-map'));
  walkMapHeroTo(target.x,target.y).then(()=>{
    if(S.screen==='map') startMapMonPatrol(cur>=0?cur:0);
  });
}

async function goToBattle(i){
  if(S.screen!=='map') return;
  cancelMapMoves();
  sfx.click();
  const target=mapTargetFor(i);
  await walkMapHeroTo(target.x,target.y,900);
  if(S.screen!=='map') return;
  mapHeroPos={...target};
  startBattle(i);
}

/* ---------- batalla ---------- */
function startBattle(i){
  cancelMapMoves();
  stopBattlePatrol();
  S.current=i; const w=WORLDS[i];
  B={q:0,heroHP:90,monHP:90,lock:true,ok:0,bad:0,results:[],correctPos:0};
  setWC(w.c); setFX('none');
  $('#scr-battle').innerHTML=`
   <div class="world-banner">MUNDO ${i+1}: ${w.name.toUpperCase()}</div>
   <div class="battle-planet">${planetSVG(w,{ring:true})}</div>
   <div class="fighter hero-fighter">
     <div class="plate">
       <div class="fname"><span style="color:${w.cl}">${w.hero.name}</span><span class="hp-num" id="hpHeroN">90 / 90</span></div>
       <div class="hpbar hp-hero" id="hpHeroB"><div class="hpfill" id="hpHeroF"></div><div class="tick" style="left:33.3%"></div><div class="tick" style="left:66.6%"></div></div>
     </div>
   </div>
   <div class="fighter mon-fighter">
     <div class="plate">
       <div class="fname"><span style="color:#ff9d8a">${w.monster}</span><span class="hp-num" id="hpMonN">90 / 90</span></div>
       <div class="hpbar hp-mon" id="hpMonB"><div class="hpfill" id="hpMonF"></div><div class="tick" style="left:33.3%"></div><div class="tick" style="left:66.6%"></div></div>
     </div>
   </div>
   <div class="battle-walker hero-walker" id="heroChar">${heroBody(w.hero)}</div>
   <div class="battle-walker mon-walker" id="monChar">${monsterBody()}</div>
   <div class="qa-panel" id="qaPanel">
     <div class="q-meta"><span id="qCount"></span><div class="q-dots" id="qDots"></div><span>${w.topic}</span></div>
     <div class="q-text" id="qText"></div>
     <div class="answers" id="answers"></div>
   </div>
   <div class="world-intro"><div class="wi-num">MUNDO ${i+1} / ${WORLDS.length}</div>
     <div class="wi-name gold-text">${w.name}</div>
     <div class="wi-vs">${w.hero.name} <em>VS</em> ${w.monster}</div></div>`;
  show('battle'); sfx.whoosh();
  startFrameLoops($('#scr-battle'));
  battleEntrance().then(()=>{
    if(S.screen!=='battle'||!B) return;
    const wi=document.querySelector('#scr-battle .world-intro');
    if(wi) wi.remove();
    renderQ();
  });
}

function renderQ(){
  const w=WORLDS[S.current], q=w.questions[B.q];
  const order=shuffle4();
  B.correctPos=order.indexOf(q.c);
  $('#qCount').textContent=`PREGUNTA ${B.q+1} / 5`;
  $('#qDots').innerHTML=[0,1,2,3,4].map(k=>`<div class="q-dot ${k<B.results.length?(B.results[k]?'done-ok':'done-bad'):(k===B.q?'now':'')}"></div>`).join('');
  $('#qText').textContent=q.q;
  $('#answers').innerHTML=order.map((oi,pos)=>`<button class="ans" data-p="${pos}">
    <span class="letter">${'ABCD'[pos]}</span><span>${q.a[oi]}</span></button>`).join('');
  document.querySelectorAll('#answers .ans').forEach(b=>b.onclick=()=>answer(+b.dataset.p));
  const p=$('#qaPanel'); p.classList.remove('show'); void p.offsetWidth; p.classList.add('show');
  B.lock=false;
  startBattlePatrol();
}

function setHP(who){
  const hp=Math.max(0,who==='hero'?B.heroHP:B.monHP);
  $(who==='hero'?'#hpHeroF':'#hpMonF').style.width=(hp/90*100)+'%';
  $(who==='hero'?'#hpHeroN':'#hpMonN').textContent=`${hp} / 90`;
  $(who==='hero'?'#hpHeroB':'#hpMonB').classList.toggle('low',hp>0&&hp<=30);
}

function popDmg(x,y,txt,color){ const d=document.createElement('div'); d.className='dmg-pop';
  d.style.left=x+'px'; d.style.top=y+'px'; d.style.color=color; d.textContent=txt;
  $('#shaker').appendChild(d); setTimeout(()=>d.remove(),1150); }

async function shootOrb(from,to,color,dark){
  const o=document.createElement('div'); o.className='orb';
  o.style.left=(from.x-19)+'px'; o.style.top=(from.y-19)+'px';
  o.style.background=dark
    ?'radial-gradient(circle at 40% 40%, #ffb5a0 0%, #7a1030 40%, #1c0526 78%)'
    :`radial-gradient(circle at 40% 40%, #ffffff 0%, ${color} 48%, transparent 82%)`;
  o.style.boxShadow=`0 0 26px 9px ${dark?'#c02040':color}`;
  $('#shaker').appendChild(o);
  await o.animate([{left:(from.x-19)+'px',top:(from.y-19)+'px'},
                   {left:(to.x-19)+'px',top:(to.y-19)+'px'}],
    {duration:420,easing:'cubic-bezier(.3,.4,.4,1)'}).finished;
  o.remove();
}

async function answer(pos){
  if(!B||B.lock) return; B.lock=true;
  stopBattlePatrol();
  const w=WORLDS[S.current];
  const btns=[...document.querySelectorAll('#answers .ans')];
  btns.forEach(b=>b.disabled=true);
  const ok=pos===B.correctPos;
  S.totalQ++; if(ok){S.totalOK++; B.ok++;} else B.bad++;
  B.results.push(ok);
  saveProgress();
  btns[pos].classList.add(ok?'correct':'wrong');
  if(!ok) btns[B.correctPos].classList.add('reveal');
  ok?sfx.ok():sfx.bad();
  await sleep(950);
  if(ok) await battleStrike('hero');
  else await battleStrike('mon');
  if(B.monHP<=0){
    stopBattlePatrol();
    $('#monChar .char-body').classList.add('dying');
    const c=charCenter($('#monChar'));
    burstAt(c.x,c.y,w.c,60,9); burstAt(c.x,c.y,'#ffffff',30,5);
    tone(700,.5,'sawtooth',.14,0,60);
    await sleep(1050); return renderVictory();
  }
  if(B.heroHP<=0){
    stopBattlePatrol();
    $('#heroChar .char-body').classList.add('collapse');
    await sleep(1050); return renderDefeat();
  }
  B.q++; await sleep(320); renderQ();
}

/* ---------- victoria ---------- */
function renderVictory(){
  const i=S.current, w=WORLDS[i];
  S.conquered[i]=true; S.unlocked=Math.min(WORLDS.length,i+2);
  const xp=10000+(B.heroHP/30)*2500; S.totalXP+=xp;
  saveProgress();
  const last=(i===WORLDS.length-1);
  setWC(w.c);
  $('#scr-victory').innerHTML=`
   <h1 class="v-title gold-text">&#161;VICTORIA!</h1>
   <div class="v-sub sub-strip">&#161;Mundo Conquistado!</div>
   <div class="v-stage">
     <div class="v-rays"></div>
     <div class="v-trophy">${trophySVG()}</div>
     <div class="v-hero">${heroImg(w.hero,'celebrate')}</div>
     <div class="v-hero v-hero-r" style="width:190px;bottom:70px">${planetSVG(w,{ring:true})}</div>
   </div>
   <div class="v-stats">
     <span>XP GANADA: <b id="xpN">0</b></span><span class="sep">|</span>
     <span>Aciertos: <b>${B.ok} / ${B.results.length}</b></span><span class="sep">|</span>
     <span>Vida restante: <b>${B.heroHP} / 90</b></span>
   </div>
   <button class="btn btn-big" id="btnNext">${last?'VER RESULTADO FINAL &#9733;':'SIGUIENTE MUNDO &#8594;'}</button>`;
  show('victory'); setFX('celebrate'); sfx.win();
  const el=$('#xpN'), t0=performance.now();
  (function cnt(now){ const k=Math.min(1,(now-t0)/1300);
    el.textContent='+'+fmt(Math.round(xp*k));
    if(k<1) requestAnimationFrame(cnt); })(t0);
  $('#btnNext').onclick=()=>{ sfx.click(); renderTransition(last?'final':i+1); };
}

/* ---------- derrota ---------- */
function renderDefeat(){
  const w=WORLDS[S.current]; setWC(w.c);
  $('#scr-defeat').innerHTML=`
   <div class="d-mon-bg">${monsterImg()}</div>
   <div class="d-title">&#161;DERROTA!</div>
   <div class="d-sub">&#161;Int&eacute;ntalo de nuevo!</div>
   <div class="d-hero">${heroImg(w.hero,'kneel')}</div>
   <div class="d-tip">${w.monster} sigue dominando este mundo... pero cada intento te hace m&aacute;s fuerte.</div>
   <button class="btn btn-big btn-red" id="btnRetry">&#8635; VOLVER A INTENTAR</button>`;
  show('defeat'); setFX('embers'); sfx.lose();
  $('#btnRetry').onclick=()=>{ sfx.click(); startBattle(S.current); };
}

/* ---------- transición entre mundos ---------- */
function renderTransition(target){
  const final=(target==='final');
  const nw=final?null:WORLDS[target];
  const hero=WORLDS[S.current].hero;
  setWC(final?'#f8c848':nw.c); setFX('none');
  $('#scr-transition').innerHTML=`
   <div class="streaks"></div>
   <div class="vortex"><div class="vring r1"></div><div class="vring r2"></div><div class="vring r3"></div>
     <div class="vring r4"></div><div class="vring r5"></div><div class="v-core"></div></div>
   <div class="fly-hero">${heroImg(hero)}</div>
   <div class="trans-text">${final?'REGRESANDO AL CENTRO DEL SISTEMA...':'VIAJANDO AL SIGUIENTE MUNDO...'}</div>
   ${final?'':`<div class="trans-next">PR&Oacute;XIMO DESTINO: MUNDO ${target+1} &mdash; ${nw.name.toUpperCase()}</div>`}`;
  show('transition'); sfx.whoosh(); setTimeout(()=>{ if(S.screen==='transition') sfx.whoosh(); },1500);
  S.transGo=()=>{ S.transGo=null; if(final) renderFinal(); else { S.flash=S.current; renderMap(); } };
  clearTimeout(S.transT);
  S.transT=setTimeout(()=>{ if(S.transGo) S.transGo(); },3800);
}

/* ---------- final ---------- */
function renderFinal(){
  setWC('#f8c848');
  const pct=S.totalQ?Math.round(S.totalOK/S.totalQ*100):0;
  $('#scr-final').innerHTML=`
   <h1 class="f-title gold-text">&#161;CONQUISTASTE EL<br>SISTEMA MENTES BRILLANTES!</h1>
   <div class="f-logo-wrap"><div class="f-rays"></div><div class="f-logo">${logoSVG(Array(WORLDS.length).fill(1))}</div></div>
   <div class="f-heroes">${WORLDS.map((w,k)=>`<div class="mini" style="animation:heroInL .6s ${k*.12}s ease both">${heroImg(w.hero,'celebrate')}</div>`).join('')}</div>
   <div class="f-stats">
     <span>Mundos: <b>${WORLDS.length} / ${WORLDS.length}</b></span><span class="sep">|</span>
     <span>XP total: <b>${fmt(S.totalXP)}</b></span><span class="sep">|</span>
     <span>Precisi&oacute;n: <b>${S.totalOK}/${S.totalQ} (${pct}%)</b></span>
   </div>
   <button class="btn btn-big" id="btnAgain">&#9654;&nbsp; JUGAR DE NUEVO</button>`;
  show('final'); setFX('celebrate'); sfx.win(); setTimeout(()=>{ if(S.screen==='final') sfx.win(); },950);
  $('#btnAgain').onclick=()=>{ sfx.click(); resetAll(); };
}

function resetAll(){
  clearProgress();
  cancelMapMoves(); stopBattlePatrol();
  S.current=0; S.unlocked=1; S.conquered=freshConquered();
  S.totalXP=0; S.totalOK=0; S.totalQ=0; S.flash=null; B=null;
  mapHeroPos={...MAP_CENTER};
  clearTimeout(S.transT); S.transGo=null; setFX('none'); renderStart();
}

/* ---------- HUD, teclado, arranque ---------- */
function toggleFull(){ if(document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(()=>{}); }

function bindHUD(){
  $('#btn-full').onclick=toggleFull;
  $('#btn-sound').onclick=e=>{ muted=!muted;
    e.currentTarget.innerHTML=muted?'&#128263;':'&#128266;'; if(!muted) sfx.click(); };
  $('#btn-reset').onclick=()=>{ if(confirm('\u00bfReiniciar toda la aventura desde el inicio?')) resetAll(); };
}

function primary(){
  if(S.screen==='start') $('#btnStart') && $('#btnStart').click();
  else if(S.screen==='map'){ const p=document.querySelector('#scr-map .map-planet.current'); p&&goToBattle(+p.dataset.i); }
  else if(S.screen==='victory') $('#btnNext') && $('#btnNext').click();
  else if(S.screen==='defeat') $('#btnRetry') && $('#btnRetry').click();
  else if(S.screen==='final') $('#btnAgain') && $('#btnAgain').click();
  else if(S.screen==='transition'){ clearTimeout(S.transT); if(S.transGo) S.transGo(); }
}
addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if(k==='f'){ toggleFull(); return; }
  if(S.screen==='battle' && B && !B.lock){
    const m={'1':0,'2':1,'3':2,'4':3,'a':0,'b':1,'c':2,'d':3};
    if(k in m){ const btn=document.querySelectorAll('#answers .ans')[m[k]]; if(btn){ btn.click(); return; } }
  }
  if(['enter',' ','arrowright','pagedown'].includes(k)){ e.preventDefault(); primary(); }
});
addEventListener('pointerdown',()=>{ const a=ac(); if(a && a.state==='suspended') a.resume(); });

async function init(){
  fit();
  requestAnimationFrame(loop);
  try{
    const res=await fetch('preguntas.json');
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data=await res.json();
    WORLDS=data.worlds;
    DATA_VERSION=data.version??1;
    if(!WORLDS?.length) throw new Error('preguntas.json no contiene mundos');
    S.conquered=freshConquered();
    loadProgress();
    bindHUD();
    hideLoader();
    renderStart();
  }catch(e){
    showLoadError(e);
  }
}

init();
