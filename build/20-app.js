<script>
'use strict';
(() => {
const $ = id => document.getElementById(id);
const M = HINA.M, PARAMS = HINA.PARAMS, TEXSZ = HINA.TEX, ATLAS = HINA.ATLAS;
const _rmMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = _rmMQ.matches;
_rmMQ.addEventListener('change', e => { reduceMotion = e.matches; });

/* ---------- state ---------- */
let lang = 'ja', mode = 'easy', activeTab = 'preset';
let activePresetId = null, lastGachaSeed = null;
let params = HINA.defaults();
const META_DEFAULTS = {title:'', version:'', author:'', contact:'', reference:'', allowed:'OnlyAuthor', violent:'Disallow', sexual:'Disallow', commercial:'Disallow', license:'Redistribution_Prohibited', licenseUrl:''};
let meta = Object.assign({}, META_DEFAULTS);
let build = null;
const t = k => (HINA.I18N[lang] && HINA.I18N[lang][k]) || k;

const LS = 'hina.v1';
function loadState(){
  try{
    const j = JSON.parse(localStorage.getItem(LS));
    if (!j){
      // First-time load: start with the first preset and respect browser language preference
      activePresetId = HINA.PRESETS[0].id; params = HINA.presetParams(HINA.PRESETS[0]);
      if (navigator.language && !navigator.language.toLowerCase().startsWith('ja')) lang = 'en';
      return;
    }
    params = HINA.sanitize(j.params);
    if (j.meta && typeof j.meta==='object') Object.assign(meta, j.meta);
    if (j.lang==='en' || j.lang==='ja') lang = j.lang;
    if (j.mode==='detail') mode = 'detail';
    if (j.activeTab && TABS.includes(j.activeTab)) activeTab = j.activeTab;
    if (j.activePresetId && HINA.PRESETS.some(p=>p.id===j.activePresetId)) activePresetId = j.activePresetId;
    if (Number.isFinite(j.lastGachaSeed)) lastGachaSeed = j.lastGachaSeed;
  }catch(e){}
}
// Single-level undo (Ctrl+Z) — captures state before user-initiated changes
let _undoSnap = null, _undoAt = 0, _undoHintTimer = null;
function captureUndo(){
  const now = Date.now();
  if (!_undoSnap || now - _undoAt > 1500){
    _undoSnap = { p: JSON.parse(JSON.stringify(params)), m: JSON.parse(JSON.stringify(meta)), aid: activePresetId, seed: lastGachaSeed };
    _undoAt = now;
    // Flash hint bar to tell users undo is available (3 s then restore)
    const h = $('hint');
    if (h && !activeExpr){
      clearTimeout(_undoHintTimer);
      h.textContent = t('hint.undoReady');
      _undoHintTimer = setTimeout(()=>{ const h2=$('hint'); if(h2&&!activeExpr) h2.textContent=_hintDefault(); }, 3000);
    }
    const sr=$('srStatus'); if(sr) sr.textContent=t('hint.undoReady');
  }
}
function doUndo(){
  const sr=$('srStatus');
  if (_exporting){ if(sr) sr.textContent=t('btn.exporting'); return; }
  if (!_undoSnap){ if(sr) sr.textContent=t('a11y.noUndo'); return; }
  const s = _undoSnap; _undoSnap = null;
  clearTimeout(_undoHintTimer);
  const h=$('hint'); if(h&&!activeExpr) h.textContent=_hintDefault();
  params = s.p; meta = s.m; activePresetId = s.aid; lastGachaSeed = s.seed;
  const _undoFocusInPanel = $('tabBody').contains(document.activeElement);
  rebuild(); renderBody(false); saveState();
  if (_undoFocusInPanel){ const tb=$('tabBody'); if(tb) tb.focus(); }
  if(sr) sr.textContent=t('a11y.undone');
}

let _errTimer = null;
function showErr(msg){
  const sr=$('srStatus'); if(sr) sr.textContent=msg;
  const h=$('hint'); if(h){ clearTimeout(_errTimer); h.textContent=msg; h.style.color='var(--err)';
    _errTimer=setTimeout(()=>{ if($('hint')){ $('hint').style.color='';
      $('hint').textContent=activeExpr?t('expr.'+activeExpr)+' — '+t('hint.exprOff'):_hintDefault(); }},4500); }
}
let _saveTimer = null, _saveBadgeTimer = null;
function saveState(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(()=>{
    try{
      localStorage.setItem(LS, JSON.stringify({params, meta, lang, mode, activeTab, activePresetId, lastGachaSeed}));
      const b=$('autoSaveBadge');
      if (b){
        b.removeAttribute('aria-hidden'); b.textContent=t('hint.saved'); b.style.color='var(--ok)';
        b.style.opacity='1';
        clearTimeout(_saveBadgeTimer);
        _saveBadgeTimer=setTimeout(()=>{ const b2=$('autoSaveBadge'); if(b2){ b2.style.opacity='0'; setTimeout(()=>{ if(b2&&b2.style.opacity==='0'){ b2.setAttribute('aria-hidden','true'); b2.textContent=''; } },400); } },2000);
      }
    }catch(e){
      // localStorage full or unavailable (private browsing) — show persistent warning
      clearTimeout(_saveBadgeTimer);
      const b=$('autoSaveBadge');
      if (b){ b.removeAttribute('aria-hidden'); b.textContent=t('hint.saveFail'); b.style.color='var(--warn)'; b.style.opacity='1'; }
      const sr2=$('srStatus'); if(sr2) sr2.textContent=t('hint.saveFail');
    }
  }, 500);
}

/* ---------- texture atlas (2D canvas → WebGL + PNG export) ---------- */
const atlas = document.createElement('canvas');
atlas.width = atlas.height = TEXSZ;
const ax = atlas.getContext('2d');

function drawEye(r, p){
  const [x0,y0,x1,y1] = r, w = x1-x0, h = y1-y0;
  ax.save(); ax.translate(x0,y0);
  const cx=w/2, cy=h*0.54, rx=w*0.40, ry=h*0.40;
  const shape = p.eyeShape;
  // sclera
  ax.save(); ax.translate(cx,cy);
  if (shape==='tare') ax.rotate(0.16);
  else if (shape==='tsuri') ax.rotate(-0.16);
  const ryS = shape==='jito' ? ry*0.62 : ry;
  ax.beginPath(); ax.ellipse(0, shape==='jito'? h*0.06:0, rx, ryS, 0, 0, Math.PI*2);
  ax.fillStyle = '#ffffff'; ax.fill();
  ax.clip();
  // iris
  const ir = Math.min(rx,ryS)*1.18*p.irisSize;
  const g1 = ax.createLinearGradient(0,-ir,0,ir);
  g1.addColorStop(0, HINA.shade(p.eyeColor,0.55));
  g1.addColorStop(0.55, p.eyeColor);
  g1.addColorStop(1, HINA.shade(p.eyeColor,1.55));
  ax.beginPath(); ax.ellipse(0, h*0.02, ir*0.78, ir, 0, 0, Math.PI*2);
  ax.fillStyle = g1; ax.fill();
  // pupil
  ax.beginPath(); ax.ellipse(0, h*0.03, ir*0.30, ir*0.42, 0, 0, Math.PI*2);
  ax.fillStyle = HINA.shade(p.eyeColor,0.32); ax.fill();
  // highlights
  ax.fillStyle = 'rgba(255,255,255,0.95)';
  ax.beginPath(); ax.ellipse(-ir*0.30, -ir*0.34, ir*0.22, ir*0.26, 0, 0, Math.PI*2); ax.fill();
  ax.fillStyle = 'rgba(255,255,255,0.55)';
  ax.beginPath(); ax.ellipse(ir*0.30, ir*0.40, ir*0.11, ir*0.13, 0, 0, Math.PI*2); ax.fill();
  ax.restore();
  // top lash
  ax.save(); ax.translate(cx,cy);
  if (shape==='tare') ax.rotate(0.16); else if (shape==='tsuri') ax.rotate(-0.16);
  ax.beginPath();
  ax.ellipse(0, shape==='jito'? h*0.06:0, rx*1.06, ryS*1.06, 0, Math.PI*1.06, Math.PI*1.94);
  ax.lineWidth = h*0.13; ax.strokeStyle = HINA.shade(p.hairColor,0.30);
  ax.lineCap = 'round'; ax.stroke();
  ax.restore();
  ax.restore();
}

function drawBrow(r, p, mirror){
  const [x0,y0,x1,y1]=r, w=x1-x0, h=y1-y0;
  ax.save(); ax.translate(x0+w/2, y0+h/2);
  if (mirror) ax.scale(-1,1);
  ax.strokeStyle = HINA.shade(p.hairColor,0.62);
  ax.lineWidth = h*0.30; ax.lineCap='round';
  ax.beginPath();
  if (p.browType==='straight'){ ax.moveTo(-w*0.34, 0); ax.lineTo(w*0.34, -h*0.04); }
  else if (p.browType==='arch'){ ax.moveTo(-w*0.34, h*0.10); ax.quadraticCurveTo(0,-h*0.30, w*0.34, h*0.06); }
  else { ax.moveTo(-w*0.34, h*0.08); ax.quadraticCurveTo(0,-h*0.14, w*0.34, -h*0.02); }
  ax.stroke();
  ax.restore();
}

function drawAtlas(p){
  ax.clearRect(0,0,TEXSZ,TEXSZ);
  // solid blocks
  const block = (name, color) => { const b=ATLAS[name]; ax.fillStyle=color; ax.fillRect(b[0],b[1],64,64); };
  block('skin', p.skinTone);
  block('hair', p.hairColor);
  block('clothMain', p.clothMain);
  block('clothSub', p.clothSub);
  block('accent', p.clothAccent);
  block('shoe', p.shoeColor);
  block('white', '#f6f6f8');
  block('hairHi', HINA.shade(p.hairColor,1.4));
  // face parts
  drawEye(ATLAS.eyeL, p);
  // mirror eyeL → eyeR
  const eL=ATLAS.eyeL, eR=ATLAS.eyeR;
  ax.save(); ax.translate(eR[0]+(eR[2]-eR[0]), eR[1]); ax.scale(-1,1);
  ax.drawImage(atlas, eL[0],eL[1],eL[2]-eL[0],eL[3]-eL[1], 0,0,eR[2]-eR[0],eR[3]-eR[1]);
  ax.restore();
  drawBrow(ATLAS.browL, p, false);
  drawBrow(ATLAS.browR, p, true);
  // mouth — rx scales with mouthW so texture matches 3D ellipse (max w*0.47 stays within atlas half-width)
  { const r=ATLAS.mouth, w=r[2]-r[0], h=r[3]-r[1];
    ax.save(); ax.translate(r[0]+w/2, r[1]+h/2);
    const g = ax.createLinearGradient(0,-h*0.3,0,h*0.36);
    g.addColorStop(0,'#8a3c46'); g.addColorStop(1,'#c96a72');
    ax.fillStyle=g;
    ax.beginPath(); ax.ellipse(0,0,w*0.32*p.mouthW,h*0.34,0,0,Math.PI*2); ax.fill();
    ax.fillStyle='rgba(60,20,28,0.85)';
    ax.beginPath(); ax.ellipse(0,-h*0.06,w*0.20*p.mouthW,h*0.16,0,0,Math.PI*2); ax.fill();
    ax.restore(); }
  // blush (alpha < 0.5 discarded by MASK → radius scales with intensity)
  { const r=ATLAS.blush, w=r[2]-r[0];
    if (p.blush>0.02){
      const cx=r[0]+w/2, cy=r[1]+w/2;
      const g=ax.createRadialGradient(cx,cy,0,cx,cy,w*0.48);
      const a=Math.min(1, 0.45+p.blush*0.55);
      g.addColorStop(0,'rgba(244,138,150,'+a+')');
      g.addColorStop(1,'rgba(244,138,150,0)');
      ax.fillStyle=g; ax.beginPath(); ax.arc(cx,cy,w*0.48,0,Math.PI*2); ax.fill();
    } }
}

/* ---------- WebGL renderer ---------- */
const cv = $('gl');
let gl = null;
try{ gl = cv.getContext('webgl', {antialias:true, alpha:false}); }catch(e){}
const GLOK = !!gl;

function compile(vs, fs){
  const mk=(ty,src)=>{ const s=gl.createShader(ty); gl.shaderSource(s,src); gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr=gl.createProgram();
  gl.attachShader(pr,mk(gl.VERTEX_SHADER,vs)); gl.attachShader(pr,mk(gl.FRAGMENT_SHADER,fs));
  gl.linkProgram(pr);
  if(!gl.getProgramParameter(pr,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  return pr;
}

let progMain, progFlat, bufPos, bufNrm, bufUv, bufIdx, bufShadow, tex;
let locM = {}, locF = {};
if (GLOK){
  progMain = compile(
    'attribute vec3 aPos;attribute vec3 aNrm;attribute vec2 aUv;'+
    'uniform mat4 uVP;varying vec3 vN;varying vec2 vUv;varying vec3 vW;'+
    'void main(){vN=aNrm;vUv=aUv;vW=aPos;gl_Position=uVP*vec4(aPos,1.0);}',
    'precision mediump float;varying vec3 vN;varying vec2 vUv;varying vec3 vW;'+
    'uniform sampler2D uTex;uniform vec3 uLight;uniform vec3 uEye;'+
    'void main(){vec4 c=texture2D(uTex,vUv);if(c.a<0.5)discard;'+
    'vec3 N=normalize(vN);float nl=dot(N,uLight)*0.5+0.5;'+
    'float s=mix(0.62,1.0,step(0.42,nl));'+
    'vec3 V=normalize(uEye-vW);float rim=pow(1.0-max(dot(N,V),0.0),3.0)*0.16;'+
    'vec3 col=c.rgb*s+rim*vec3(0.55,0.75,0.80);'+
    'gl_FragColor=vec4(col,1.0);}');
  progFlat = compile(
    'attribute vec3 aPos;attribute vec3 aNrm;uniform mat4 uVP;uniform float uW;'+
    'void main(){gl_Position=uVP*vec4(aPos+aNrm*uW,1.0);}',
    'precision mediump float;uniform vec4 uColor;void main(){gl_FragColor=uColor;}');
  locM = {aPos:gl.getAttribLocation(progMain,'aPos'), aNrm:gl.getAttribLocation(progMain,'aNrm'),
          aUv:gl.getAttribLocation(progMain,'aUv'), uVP:gl.getUniformLocation(progMain,'uVP'),
          uTex:gl.getUniformLocation(progMain,'uTex'), uLight:gl.getUniformLocation(progMain,'uLight'),
          uEye:gl.getUniformLocation(progMain,'uEye')};
  locF = {aPos:gl.getAttribLocation(progFlat,'aPos'), aNrm:gl.getAttribLocation(progFlat,'aNrm'),
          uVP:gl.getUniformLocation(progFlat,'uVP'), uW:gl.getUniformLocation(progFlat,'uW'),
          uColor:gl.getUniformLocation(progFlat,'uColor')};
  bufPos=gl.createBuffer(); bufNrm=gl.createBuffer(); bufUv=gl.createBuffer();
  bufIdx=gl.createBuffer(); bufShadow=gl.createBuffer();
  tex=gl.createTexture();
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.066,0.075,0.090,1);
}

function uploadTexture(){
  if (!GLOK || _glLost) return;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE, atlas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}

/* skinning + animation state */
let basePos, baseNrm, morphPos, skPos, skNrm, nVerts=0, outlineCount=0;
let localQ=[], worldMats=[], skinMats=[];
let chains=[];           // [{boneIdxs, pts, prev, segs, bindDirs}]
let morphW={}, morphDirty=true;
let activeExpr = null;
let camYaw=Math.PI, camPitch=0.10, camDist=2.6, camTarget=[0,0.8,0];
let gazeX=0, gazeY=0;
let blinkT=1.8, blinkPhase=-1;

function uploadGeometry(){
  const g = build.geom;
  nVerts = g.pos.length/3;
  basePos = new Float32Array(g.pos);
  baseNrm = new Float32Array(g.nrm);
  morphPos = new Float32Array(basePos);
  skPos = new Float32Array(basePos.length);
  skNrm = new Float32Array(baseNrm.length);
  morphDirty = true;
  // outline excludes face parts (face verts/indices appended last)
  const fs = build.faceStart, idx = g.idx;
  outlineCount = idx.length;
  for(let i=0;i<idx.length;i+=3){
    if (idx[i]>=fs || idx[i+1]>=fs || idx[i+2]>=fs){ outlineCount=i; break; }
  }
  if (!GLOK || _glLost) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(g.uv), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufIdx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(g.idx), gl.STATIC_DRAW);
  // floor shadow ellipse fan
  const H = build.dims.H, sh=[0,0.0015,0];
  for(let i=0;i<=24;i++){ const a=i/24*Math.PI*2;
    sh.push(Math.cos(a)*H*0.14, 0.0015, Math.sin(a)*H*0.11); }
  gl.bindBuffer(gl.ARRAY_BUFFER, bufShadow);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sh), gl.STATIC_DRAW);
  // scale camDist proportionally so framing is consistent across avatar heights
  const prevH = camTarget[1] / 0.55;
  if (prevH > 0 && Math.abs(prevH - H) > 0.001) camDist = M.clamp(camDist * H / prevH, 0.6, 8);
  camTarget=[0, H*0.55, 0];
}

function initSprings(){
  chains = build.springs.map(sp=>{
    const pts = sp.boneIdxs.map(bi=>build.bones[bi].w.slice());
    const segs=[], bindOff=[];
    for(let i=1;i<pts.length;i++){
      segs.push(M.len(M.sub(pts[i],pts[i-1])));
      bindOff.push(M.sub(pts[i],pts[i-1]));
    }
    return {boneIdxs:sp.boneIdxs, pts, prev:pts.map(p=>p.slice()), segs, bindOff,
            bind:pts.map(p=>p.slice())};
  });
}

function applyMorphs(){
  morphPos.set(basePos);
  const sp = build.morphs.sparse;
  for(const name in morphW){
    const w = morphW[name];
    if (!w) continue;
    for(const e of sp[name]){
      morphPos[e[0]*3]   += e[1]*w;
      morphPos[e[0]*3+1] += e[2]*w;
      morphPos[e[0]*3+2] += e[3]*w;
    }
  }
  morphDirty = false;
}

// Expression preview: set/clear a locked morph for the preview bar
const EXPR_LABELS = {a:'a',i:'i',u:'u',e:'e',o:'o',blink:'blk',joy:'joy',angry:'ang',sorrow:'sor',fun:'fun'};
function setExpr(name){
  activeExpr = name || null;
  morphW = {};
  if (activeExpr) morphW[activeExpr] = 1;
  morphDirty = true;
  const hintEl = $('hint');
  if (hintEl) hintEl.textContent = activeExpr
    ? t('expr.'+activeExpr) + ' — ' + t('hint.exprOff')
    : _hintDefault();
  const srEl = $('srStatus');
  if (srEl) srEl.textContent = activeExpr
    ? t('a11y.exprActive').replace('{expr}', t('expr.'+activeExpr))
    : t('a11y.exprNeutral');
  const bar = $('exprBar');
  if (!bar) return;
  bar.querySelectorAll('.eBtn').forEach(b => {
    const isActive = b.dataset.expr === (activeExpr || '');
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', String(isActive));
  });
}
function buildExprBar(){
  const bar = $('exprBar');
  if (!bar || !build) return;
  const prevExprFocus = bar.contains(document.activeElement) ? document.activeElement.dataset.expr : undefined;
  bar.innerHTML = '';
  const activeKey = activeExpr === null ? '' : activeExpr;
  const nb = document.createElement('button');
  nb.className = 'eBtn' + (activeExpr === null ? ' active' : '');
  nb.dataset.expr = '';
  nb.textContent = 'N';
  nb.title = t('expr.neutral');
  nb.setAttribute('aria-label', t('expr.neutral'));
  nb.setAttribute('aria-pressed', String(activeExpr === null));
  nb.setAttribute('tabindex', activeKey === '' ? '0' : '-1');
  nb.addEventListener('click', () => setExpr(null));
  bar.append(nb);
  for(const name of build.morphs.names){
    if (name === 'blink_l' || name === 'blink_r') continue;
    const b = document.createElement('button');
    b.className = 'eBtn' + (activeExpr === name ? ' active' : '');
    b.dataset.expr = name;
    b.textContent = EXPR_LABELS[name] || name.slice(0,3);
    b.title = t('expr.'+name) || name;
    b.setAttribute('aria-label', t('expr.'+name) || name);
    b.setAttribute('aria-pressed', String(activeExpr === name));
    b.setAttribute('tabindex', activeKey === name ? '0' : '-1');
    b.addEventListener('click', () => setExpr(activeExpr === name ? null : name));
    bar.append(b);
  }
  // Restore focus if it was on an expression button before the rebuild
  if (prevExprFocus !== undefined){
    const target=bar.querySelector(`[data-expr="${prevExprFocus}"]`)||bar.querySelector('.eBtn');
    if(target){
      bar.querySelectorAll('.eBtn').forEach(b=>b.setAttribute('tabindex','-1'));
      target.setAttribute('tabindex','0');
      target.focus();
    }
  }
}

function poseAndSkin(time){
  const bones = build.bones, idx = build.idx;
  const n = bones.length;
  if (localQ.length!==n){ localQ=[]; worldMats=[]; skinMats=[];
    for(let i=0;i<n;i++){ localQ.push(M.qid()); worldMats.push(M.mId()); skinMats.push(M.mId()); } }
  for(let i=0;i<n;i++) localQ[i]=M.qid();
  const breath = reduceMotion ? 0 : Math.sin(time*0.0014);
  // relaxed A-pose (preview only — export stays T-pose)
  localQ[idx.lUA] = M.qAxis([0,0,1],  0.96 + breath*0.015);
  localQ[idx.rUA] = M.qAxis([0,0,1], -0.96 - breath*0.015);
  localQ[idx.lLA] = M.qAxis([0,0,1],  0.10);
  localQ[idx.rLA] = M.qAxis([0,0,1], -0.10);
  localQ[idx.chest] = M.qAxis([1,0,0], breath*0.022);
  localQ[idx.head]  = M.qAxis([0,1,0], (reduceMotion?0:Math.sin(time*0.0006))*0.05);
  const gq = M.qMul(M.qAxis([0,1,0], gazeX*0.22), M.qAxis([1,0,0], -gazeY*0.14));
  localQ[idx.lE]=gq; localQ[idx.rE]=gq;
  const bob = reduceMotion ? 0 : Math.sin(time*0.0014)*0.004*build.dims.H;
  for(let i=0;i<n;i++){
    const b=bones[i];
    const pw = b.parent>=0 ? bones[b.parent].w : [0,0,0];
    const lt = [b.w[0]-pw[0], b.w[1]-pw[1] + (b.parent<0?bob:0), b.w[2]-pw[2]];
    const lm = M.mCompose(localQ[i], lt);
    worldMats[i] = b.parent>=0 ? M.mMul(worldMats[b.parent], lm) : lm;
  }
  // spring chains
  if (!params.springOff && chains.length && !reduceMotion){
    const col = build.collider;
    const cc = M.mApply(worldMats[col.bone], col.offset);
    const headW = worldMats[build.idx.head];
    for(const ch of chains){
      const root = build.bones[ch.boneIdxs[0]];
      const anchor = M.mApply(worldMats[root.parent],
        M.sub(ch.bind[0], build.bones[root.parent].w));
      ch.pts[0] = anchor;
      const drag = M.clamp(params.hairDrag,0,1)*0.10;
      const stiff = params.hairStiff*0.16;
      for(let i=1;i<ch.pts.length;i++){
        const cur=ch.pts[i], prev=ch.prev[i];
        const vel=M.scale(M.sub(cur,prev), 1-drag);
        let nx=M.add(cur, vel);
        nx[1]-= params.hairGrav*0.0016;
        // stiffness: pull toward bind offset (rotated by head)
        const rest=M.add(ch.pts[i-1], M.mApplyRot(headW, ch.bindOff[i-1]));
        nx=M.add(nx, M.scale(M.sub(rest,nx), stiff));
        ch.prev[i]=cur;
        // distance constraint
        const d=M.sub(nx, ch.pts[i-1]), L=M.len(d)||1e-6;
        nx=M.add(ch.pts[i-1], M.scale(d, ch.segs[i-1]/L));
        // head collider
        const dc=M.sub(nx, cc), Lc=M.len(dc);
        if (Lc < col.radius) nx=M.add(cc, M.scale(dc, col.radius/(Lc||1e-6)));
        ch.pts[i]=nx;
      }
      // bone transforms from particles
      for(let k=0;k<ch.boneIdxs.length;k++){
        const bi=ch.boneIdxs[k];
        const a = k<ch.pts.length-1 ? k : k-1;
        const bd=M.norm(M.sub(ch.bind[a+1], ch.bind[a]));
        const cd=M.norm(M.sub(ch.pts[a+1], ch.pts[a]));
        const R=M.qFromTo(bd,cd);
        skinMats[bi]=M.mMul(M.mCompose(R, ch.pts[k]), M.mT(-ch.bind[k][0],-ch.bind[k][1],-ch.bind[k][2]));
      }
    }
  }
  for(let i=0;i<n;i++){
    const isChain = !bones[i].hb && !params.springOff && chains.length && !reduceMotion;
    if (isChain) continue; // already set
    skinMats[i]=M.mMul(worldMats[i], M.mT(-bones[i].w[0],-bones[i].w[1],-bones[i].w[2]));
  }
  // CPU skin
  const g=build.geom, J=g.jnt, W=g.wgt;
  for(let v=0;v<nVerts;v++){
    const px=morphPos[v*3], py=morphPos[v*3+1], pz=morphPos[v*3+2];
    let x=0,y=0,z=0, dom=0, domW=-1;
    for(let k=0;k<4;k++){
      const w=W[v*4+k]; if(!w) continue;
      const m=skinMats[J[v*4+k]];
      x+=w*(m[0]*px+m[4]*py+m[8]*pz+m[12]);
      y+=w*(m[1]*px+m[5]*py+m[9]*pz+m[13]);
      z+=w*(m[2]*px+m[6]*py+m[10]*pz+m[14]);
      if (w>domW){domW=w;dom=J[v*4+k];}
    }
    skPos[v*3]=x; skPos[v*3+1]=y; skPos[v*3+2]=z;
    const m=skinMats[dom], nx0=baseNrm[v*3], ny0=baseNrm[v*3+1], nz0=baseNrm[v*3+2];
    skNrm[v*3]  =m[0]*nx0+m[4]*ny0+m[8]*nz0;
    skNrm[v*3+1]=m[1]*nx0+m[5]*ny0+m[9]*nz0;
    skNrm[v*3+2]=m[2]*nx0+m[6]*ny0+m[10]*nz0;
  }
}

/* camera matrices */
function perspective(fovy,aspect,near,far){
  const f=1/Math.tan(fovy/2), nf=1/(near-far);
  return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0];
}
function lookAt(eye,ct,up){
  const z=M.norm(M.sub(eye,ct)), x=M.norm(M.cross(up,z)), y=M.cross(z,x);
  return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
          -M.dot(x,eye),-M.dot(y,eye),-M.dot(z,eye),1];
}

function resize(){
  const dpr=Math.min(devicePixelRatio||1,2);
  const w=cv.clientWidth, h=cv.clientHeight;
  if (cv.width!==w*dpr||cv.height!==h*dpr){ cv.width=w*dpr; cv.height=h*dpr; if(GLOK) gl.viewport(0,0,cv.width,cv.height); }
}

function renderFrame(time){
  if (!build || !GLOK || _glLost) return;
  resize();
  // blink — suppressed when an expression is locked via the preview bar
  if (!activeExpr && !reduceMotion){
    blinkT -= 1/60;
    if (blinkT<=0 && blinkPhase<0){ blinkPhase=0; }
    if (blinkPhase>=0){
      blinkPhase += 1/9;
      const w = blinkPhase<0.5 ? blinkPhase*2 : Math.max(0,2-blinkPhase*2);
      if (morphW.blink!==w){ morphW.blink=w; morphDirty=true; }
      if (blinkPhase>=1){ blinkPhase=-1; blinkT=1.8+Math.random()*2.6; morphW.blink=0; morphDirty=true; }
    }
  }
  if (morphDirty) applyMorphs();
  poseAndSkin(time);
  const eye=[camTarget[0]+Math.sin(camYaw)*Math.cos(camPitch)*camDist,
             camTarget[1]+Math.sin(camPitch)*camDist,
             camTarget[2]+Math.cos(camYaw)*Math.cos(camPitch)*camDist];
  const vp=M.mMul(perspective(0.62, cv.width/cv.height, 0.05, 60), lookAt(eye,camTarget,[0,1,0]));
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

  // shadow
  gl.useProgram(progFlat);
  gl.uniformMatrix4fv(locF.uVP,false,vp);
  gl.uniform1f(locF.uW,0);
  gl.uniform4f(locF.uColor,0,0,0,0.30);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.depthMask(false);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufShadow);
  gl.enableVertexAttribArray(locF.aPos);
  gl.vertexAttribPointer(locF.aPos,3,gl.FLOAT,false,0,0);
  gl.disableVertexAttribArray(locF.aNrm);
  gl.vertexAttrib3f(locF.aNrm,0,0,0);
  gl.drawArrays(gl.TRIANGLE_FAN,0,26);
  gl.depthMask(true); gl.disable(gl.BLEND);

  // upload skinned attribs
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.bufferData(gl.ARRAY_BUFFER, skPos, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufNrm);
  gl.bufferData(gl.ARRAY_BUFFER, skNrm, gl.DYNAMIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufIdx);

  // outline (front-cull, body only)
  gl.useProgram(progFlat);
  gl.uniformMatrix4fv(locF.uVP,false,vp);
  gl.uniform1f(locF.uW, build.dims.H*0.0035);
  gl.uniform4f(locF.uColor, 0.07,0.06,0.09,1);
  gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.enableVertexAttribArray(locF.aPos);
  gl.vertexAttribPointer(locF.aPos,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufNrm);
  gl.enableVertexAttribArray(locF.aNrm);
  gl.vertexAttribPointer(locF.aNrm,3,gl.FLOAT,false,0,0);
  gl.drawElements(gl.TRIANGLES, outlineCount, gl.UNSIGNED_SHORT, 0);
  gl.disable(gl.CULL_FACE);

  // main toon
  gl.useProgram(progMain);
  gl.uniformMatrix4fv(locM.uVP,false,vp);
  gl.uniform3f(locM.uLight, 0.42,0.76,-0.50);
  gl.uniform3fv(locM.uEye, eye);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(locM.uTex,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
  gl.enableVertexAttribArray(locM.aPos);
  gl.vertexAttribPointer(locM.aPos,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufNrm);
  gl.enableVertexAttribArray(locM.aNrm);
  gl.vertexAttribPointer(locM.aNrm,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, bufUv);
  gl.enableVertexAttribArray(locM.aUv);
  gl.vertexAttribPointer(locM.aUv,2,gl.FLOAT,false,0,0);
  gl.drawElements(gl.TRIANGLES, build.geom.idx.length, gl.UNSIGNED_SHORT, 0);
}

/* ---------- camera input ---------- */
(()=>{
  let drag=false, px=0, py=0;
  const ptrs=new Map();
  cv.addEventListener('pointerdown',e=>{
    cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId,[e.clientX,e.clientY]);
    drag=true; px=e.clientX; py=e.clientY; cv.classList.add('drag');
  });
  cv.addEventListener('pointermove',e=>{
    const r=cv.getBoundingClientRect();
    if (!drag){
      gazeX=M.clamp(((e.clientX-r.left)/r.width-0.5)*2, -1, 1);
      gazeY=M.clamp(((e.clientY-r.top)/r.height-0.5)*2, -1, 1);
      return;
    }
    if (ptrs.size===2){
      const old=[...ptrs.values()];
      const oldMidY=(old[0][1]+old[1][1])/2;
      const d0=Math.hypot(old[0][0]-old[1][0], old[0][1]-old[1][1]);
      ptrs.set(e.pointerId,[e.clientX,e.clientY]);
      const cur=[...ptrs.values()];
      const newMidY=(cur[0][1]+cur[1][1])/2;
      const d1=Math.hypot(cur[0][0]-cur[1][0], cur[0][1]-cur[1][1]);
      if (d0>0) camDist=M.clamp(camDist*d0/d1, 0.6, 8);
      // Two-finger vertical drag pans camTarget (same as Shift+↑↓ on desktop)
      const H0=build?build.dims.H:1.45;
      const dy=(newMidY-oldMidY)/cv.getBoundingClientRect().height;
      camTarget[1]=M.clamp(camTarget[1]-dy*H0*1.5, 0, H0*1.1);
      return;
    }
    ptrs.set(e.pointerId,[e.clientX,e.clientY]);
    camYaw -= (e.clientX-px)*0.008;
    camPitch = M.clamp(camPitch+(e.clientY-py)*0.006, -0.5, 1.25);
    px=e.clientX; py=e.clientY;
  });
  const up=e=>{ ptrs.delete(e.pointerId); if(!ptrs.size){drag=false; cv.classList.remove('drag');} };
  cv.addEventListener('pointerup',up); cv.addEventListener('pointercancel',up);
  cv.addEventListener('wheel',e=>{ e.preventDefault();
    camDist=M.clamp(camDist*(1+e.deltaY*0.0012), 0.6, 8); },{passive:false});
  cv.addEventListener('dblclick',()=>{ const H0=build?build.dims.H:1.45;
    camYaw=Math.PI; camPitch=0.10; camDist=H0*1.85; camTarget=[0,H0*0.55,0];
    const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.viewReset'); });
  // keyboard camera control (WCAG 2.1.1 — preview must be operable without a pointer)
  cv.addEventListener('keydown',e=>{
    const rot=0.18, zoom=0.12; let used=true;
    const H0=build?build.dims.H:1.45;
    switch(e.key){
      case 'ArrowLeft':  camYaw += rot; break;
      case 'ArrowRight': camYaw -= rot; break;
      case 'ArrowUp':
        // Shift+↑ pans the camera target up (inspect face); plain ↑ orbits upward
        if (e.shiftKey) camTarget[1]=M.clamp(camTarget[1]+0.08*H0, 0, H0*1.1);
        else camPitch=M.clamp(camPitch+rot, -0.5, 1.25); break;
      case 'ArrowDown':
        if (e.shiftKey) camTarget[1]=M.clamp(camTarget[1]-0.08*H0, 0, H0*1.1);
        else camPitch=M.clamp(camPitch-rot, -0.5, 1.25); break;
      case '+': case '=': camDist=M.clamp(camDist*(1-zoom), 0.6, 8); break;
      case '-': case '_': camDist=M.clamp(camDist*(1+zoom), 0.6, 8); break;
      // Home resets all camera state including the pan target
      case 'Home': case '0': camYaw=Math.PI; camPitch=0.10; camDist=H0*1.85; camTarget=[0,H0*0.55,0];
        { const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.viewReset'); } break;
      default: used=false;
    }
    if (used) e.preventDefault();
  });
})();

/* ---------- UI ---------- */
const TABS=['preset','body','face','hair','outfit','color','phys','out'];

function el(tag, attrs, ...kids){
  const e=document.createElement(tag);
  for(const k in attrs||{}){
    if (k==='class') e.className=attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else e.setAttribute(k, attrs[k]);
  }
  for(const c of kids) e.append(c);
  return e;
}

function renderTabs(){
  const nav=$('tabs'); nav.textContent='';
  for(const tb of TABS){
    nav.append(el('button',{
      id:'tab-'+tb, class:'tab', role:'tab',
      'aria-selected':String(tb===activeTab),
      'aria-controls':'tabBody',
      tabindex: tb===activeTab?'0':'-1',
      onclick:()=>{ activeTab=tb; renderTabs(); renderBody(); $('tab-'+tb).focus(); },
    }, t('tab.'+tb)));
  }
  $('tabBody').setAttribute('aria-labelledby','tab-'+activeTab);
}

function paramRow(k){
  const s=PARAMS[k];
  const label = lang==='ja'?s.ja:s.en;
  const pid='pr-'+k;
  if (s.k==='num'){
    // detail mode exposes a direct numeric entry (SPEC §2); easy mode shows a read-only value
    let valEl;
    const r=el('input',{id:pid, type:'range',min:s.min,max:s.max,step:s.step,value:params[k],
      'aria-label':label, 'aria-valuetext':String(params[k]), 'aria-describedby':'sliderDesc', title:t('hint.sliderReset'),
      onpointerdown:()=>captureUndo(),
      ondblclick:()=>{ captureUndo(); params[k]=s.def; r.value=String(s.def);
        r.setAttribute('aria-valuetext',String(s.def));
        if (valEl) valEl.tagName==='INPUT' ? valEl.value=String(s.def) : (valEl.textContent=String(s.def));
        onParam(k);
        const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.sliderReset').replace('{label}',label).replace('{v}',s.def); },
      onkeydown:e=>{ if(/^Arrow/.test(e.key)){ captureUndo(); return; }
        if(e.key!=='Delete'&&e.key!=='Backspace') return; e.preventDefault();
        captureUndo(); params[k]=s.def; r.value=String(s.def);
        r.setAttribute('aria-valuetext',String(s.def));
        if (valEl) valEl.tagName==='INPUT' ? valEl.value=String(s.def) : (valEl.textContent=String(s.def));
        onParam(k);
        const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.sliderReset').replace('{label}',label).replace('{v}',s.def); },
      oninput:e=>{ params[k]=parseFloat(e.target.value);
        r.setAttribute('aria-valuetext',String(params[k]));
        if (valEl.tagName==='INPUT') valEl.value=String(params[k]); else valEl.textContent=String(params[k]);
        onParam(k); }});
    if (mode==='detail'){
      valEl=el('input',{type:'number',class:'num numIn',min:s.min,max:s.max,step:s.step,value:params[k],
        'aria-label':t('a11y.numIn').replace('{label}',label), inputmode:'decimal',
        onchange:e=>{ captureUndo(); let n=parseFloat(e.target.value);
          if (!Number.isFinite(n)) n=params[k];
          const clamped=M.clamp(n,s.min,s.max);
          if (clamped!==n){
            e.target.setAttribute('aria-invalid','true');
            e.target.setAttribute('aria-errormessage','srStatus');
            const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.clamped').replace('{v}',clamped);
            setTimeout(()=>{ e.target.removeAttribute('aria-invalid'); e.target.removeAttribute('aria-errormessage'); },1500);
          }
          params[k]=clamped; e.target.value=String(clamped); r.value=String(clamped); r.setAttribute('aria-valuetext',String(clamped)); onParam(k); }});
      // Prevent accidental value changes when wheel-scrolling the panel over a focused numIn
      valEl.addEventListener('wheel', e=>{ if(document.activeElement===valEl) e.preventDefault(); },{passive:false});
    } else {
      valEl=el('span',{class:'num'}, String(params[k]));
    }
    return el('div',{class:'row'}, el('label',{'for':pid},label), r, valEl);
  }
  if (s.k==='enum'){
    const optLabel=o=>{ const key='enum.'+k+'.'+o; const lbl=t(key); return lbl===key?o:lbl; };
    const sel=el('select',{id:pid, 'aria-label':label, onchange:e=>{captureUndo(); params[k]=e.target.value; onParam(k);}});
    for(const o of s.opts) sel.append(el('option',{value:o, ...(params[k]===o?{selected:''}:{})}, optLabel(o)));
    return el('div',{class:'row'}, el('label',{'for':pid},label), sel);
  }
  if (s.k==='bool'){
    const cb=el('input',{id:pid, type:'checkbox','aria-label':label,
      onchange:e=>{captureUndo(); params[k]=e.target.checked; onParam(k);}});
    cb.checked=params[k];
    return el('div',{class:'row'}, el('label',{'for':pid},label), cb);
  }
  // color
  const inp=el('input',{id:pid, type:'color', value:params[k], 'aria-label':label,
    onpointerdown:()=>captureUndo(), onfocus:()=>captureUndo(),
    oninput:e=>{params[k]=e.target.value; onParam(k); updateSwPressedState();}});
  // Roving tabindex on swatches: only one in tab order at a time (avoids N stops for N colors)
  const sw=el('div',{class:'swatches', role:'group', 'aria-label':label});
  const swBtns=[];
  const setSwTab=ni=>swBtns.forEach((b,i)=>b.setAttribute('tabindex', i===ni?'0':'-1'));
  const updateSwPressedState=()=>{
    swBtns.forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.c===params[k]))); };
  for(const c of HINA.PAL[s.pal]){
    const isActive=params[k]===c;
    const cname=(HINA.PAL_NAMES[c]||{})[lang]||c;
    const btn=el('button',{type:'button', class:'sw', style:'background:'+c,
      'aria-label':label+' — '+cname, 'aria-pressed':String(isActive),
      tabindex:isActive?'0':'-1',
      title:cname+' '+c, onclick:()=>{captureUndo(); params[k]=c; inp.value=c; onParam(k);
        setSwTab(swBtns.indexOf(btn)); updateSwPressedState();}});
    btn.dataset.c=c;
    swBtns.push(btn); sw.append(btn);
  }
  // If no swatch matches current color, first swatch is the roving entry point
  if (!swBtns.some(b=>b.getAttribute('tabindex')==='0') && swBtns.length) swBtns[0].setAttribute('tabindex','0');
  sw.addEventListener('keydown',e=>{
    const ci=swBtns.indexOf(document.activeElement); if(ci<0) return;
    let ni=-1;
    if (e.key==='ArrowRight'||e.key==='ArrowDown') ni=(ci+1)%swBtns.length;
    else if (e.key==='ArrowLeft'||e.key==='ArrowUp') ni=(ci-1+swBtns.length)%swBtns.length;
    else if (e.key==='Home') ni=0;
    else if (e.key==='End') ni=swBtns.length-1;
    if (ni<0) return;
    e.preventDefault();
    setSwTab(ni); swBtns[ni].focus();
  });
  return el('div',{class:'row'}, el('label',{'for':pid},label), inp, sw);
}

function onParam(k){
  activePresetId=null;
  const s=PARAMS[k];
  if (s.k==='color'){ drawAtlas(params); uploadTexture(); saveState(); return; }
  if (s.tab==='phys' && k!=='springOff'){ saveState(); return; }   // live physics
  rebuild();
  // Only re-render panel when the param changes row structure (skirtLen↔outfit, spring sliders↔springOff).
  // All other params leave the panel layout unchanged — skipping renderBody() prevents the
  // panel from jumping back to scrollTop=0 on every slider tick.
  // scrollReset=false: preserve scroll position so toggling springOff doesn't snap the panel top.
  if (k==='outfit' || k==='springOff'){ renderBody(false); const re=document.getElementById('pr-'+k); if(re) re.focus();
    if (k==='springOff'){ const hasS=build&&build.springs&&build.springs.length>0;
      const sr=$('srStatus'); if(sr) sr.textContent=params.springOff?t('note.springOff'):(hasS?t('note.quest'):t('note.quest.nospring')); } }
}

function renderBody(scrollReset=true){
  const bd=$('tabBody'); if (scrollReset) bd.scrollTop=0; bd.textContent='';
  if (activeTab==='preset'){
    // role="group": preset cards use roving tabindex (ARIA: only one card in tab order at a time)
    const grid=el('div',{class:'presetGrid', role:'group', 'aria-label':t('tab.preset')});
    const _sCur = JSON.stringify(HINA.sanitize(params));
    const hasSelected = HINA.PRESETS.some(p=>p.id===activePresetId);
    let _firstCard = true;
    for(const pre of HINA.PRESETS){
      const pp=HINA.presetParams(pre);
      const isSelected = activePresetId===pre.id;
      const isModified = isSelected && JSON.stringify(pp) !== _sCur;
      const cols=el('div',{class:'cols',style:'align-items:center','aria-hidden':'true'},
        el('span',{class:'c',style:'background:'+pp.hairColor}),
        el('span',{class:'c',style:'background:'+pp.eyeColor}),
        el('span',{class:'c',style:'background:'+pp.clothMain}),
        el('span',{style:'font-size:9px;color:var(--text-faint);margin-left:auto'}, pp.height.toFixed(2)+'m'));
      const preLabel2=lang==='ja'?pre.ja:pre.en;
      const nmDiv=el('div',{class:'nm', title:preLabel2}, preLabel2);
      if (isModified) nmDiv.append(el('span',{
        style:'color:var(--accent);font-size:9px;vertical-align:super;margin-left:3px',
        title:lang==='ja'?'プリセットから変更中':'Modified from preset',
        role:'img', 'aria-label':lang==='ja'?'プリセットから変更中':'Modified from preset'
      }, '●'));
      grid.append(el('button',{class:'preCard'+(isSelected?' selected':''),
        'aria-pressed':String(isSelected),
        tabindex: (isSelected || (!hasSelected && _firstCard)) ? '0' : '-1',
        onclick:()=>{
        captureUndo(); params=pp; activePresetId=pre.id; rebuild(); renderBody();
        // Restore focus to the now-selected card (WCAG 2.4.3: focus must not be lost when DOM rebuilds)
        const sel=$('tabBody').querySelector('.preCard.selected'); if(sel) sel.focus(); }},
        nmDiv, cols));
      _firstCard=false;
    }
    // Roving tabindex: arrow keys navigate among preset cards without multiple Tab stops
    grid.addEventListener('keydown',e=>{
      const cards=[...grid.querySelectorAll('.preCard')];
      const ci=cards.indexOf(document.activeElement); if(ci<0) return;
      let ni=-1;
      if (e.key==='ArrowRight'||e.key==='ArrowDown') ni=(ci+1)%cards.length;
      else if (e.key==='ArrowLeft'||e.key==='ArrowUp') ni=(ci-1+cards.length)%cards.length;
      else if (e.key==='Home') ni=0;
      else if (e.key==='End') ni=cards.length-1;
      if (ni<0) return;
      e.preventDefault();
      cards.forEach((c,i)=>c.setAttribute('tabindex', i===ni?'0':'-1'));
      cards[ni].focus();
    });
    // Show revert button when the active preset has been modified
    const activePre = activePresetId ? HINA.PRESETS.find(p=>p.id===activePresetId) : null;
    if (activePre && JSON.stringify(HINA.presetParams(activePre)) !== _sCur){
      const preLabel = lang==='ja' ? activePre.ja : activePre.en;
      bd.append(el('button',{class:'btn wide',style:'margin-top:10px',
        onclick:()=>{ captureUndo(); params=HINA.presetParams(activePre); rebuild(); renderBody(false);
          const sel=$('tabBody').querySelector('.preCard.selected'); if(sel) sel.focus();
          const sr=$('srStatus'); if(sr) sr.textContent=t('btn.revert').replace('{p}',preLabel); }},
        t('btn.revert').replace('{p}',preLabel)));
    }
    const gDiv=el('div',{style:'margin-top:14px'});
    const runGacha=seed=>{
      captureUndo(); lastGachaSeed=seed; params=HINA.randomParams(seed);
      activePresetId=null; rebuild(); renderBody();
      const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.gachaRan').replace('{n}',seed);
      // Return focus to gacha button so keyboard users can run it again or Tab onwards
      const gb=$('gachaBtn'); if(gb) gb.focus();
    };
    gDiv.append(el('button',{id:'gachaBtn', class:'btn wide', onclick:()=>runGacha((Math.random()*1e9|0))}, t('btn.gacha')));
    const seedRow=el('div',{style:'display:flex;gap:6px;align-items:center;margin-top:8px'});
    const seedIn=el('input',{type:'number',class:'num numIn',style:'flex:1;min-width:0',
      placeholder:t('gacha.seed.ph'), 'aria-label':t('gacha.seed'), min:'0', max:'4294967295', step:'1', autocomplete:'off', inputmode:'numeric',
      ...(lastGachaSeed!==null?{value:String(lastGachaSeed)}:{}),
      onkeydown:e=>{ if(e.key==='Enter') e.target.blur(); },
      onchange:e=>{ let n=Math.round(Number(e.target.value));
        if (!Number.isFinite(n)||n<0){
          e.target.setAttribute('aria-invalid','true');
          e.target.setAttribute('aria-errormessage','srStatus');
          const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.seedInvalid');
          setTimeout(()=>{ e.target.removeAttribute('aria-invalid'); e.target.removeAttribute('aria-errormessage'); },1500);
          return;
        }
        e.target.removeAttribute('aria-invalid'); e.target.removeAttribute('aria-errormessage');
        const clamped=Math.min(n,4294967295);
        if(clamped!==n){ e.target.value=String(clamped); const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.clamped').replace('{v}',clamped); }
        runGacha(clamped); }});
    const cpBtn=el('button',{class:'btn',style:'padding:4px 8px;font-size:11px;flex:none',
      ...(lastGachaSeed===null?{disabled:''}:{}),
      'aria-label':t('btn.copySeed'), title:t('btn.copySeed'),
      onclick:()=>{
        if(lastGachaSeed===null) return;
        if (!navigator.clipboard?.writeText){ cpBtn.textContent='!'; setTimeout(()=>{ cpBtn.textContent=t('btn.copySeed'); },1500); const sr=$('srStatus'); if(sr) sr.textContent=t('btn.copySeed.err'); return; }
        navigator.clipboard.writeText(String(lastGachaSeed)).then(()=>{
          const orig=cpBtn.textContent; cpBtn.textContent=t('btn.copied');
          setTimeout(()=>{ cpBtn.textContent=orig; },1500);
          const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.seedCopied').replace('{n}',lastGachaSeed);
        }).catch(()=>{ cpBtn.textContent='!'; setTimeout(()=>{ cpBtn.textContent=t('btn.copySeed'); },1500); const sr=$('srStatus'); if(sr) sr.textContent=t('btn.copySeed.err'); });
      }
    }, t('btn.copySeed'));
    seedIn.addEventListener('wheel',e=>{ if(document.activeElement===seedIn) e.preventDefault(); },{passive:false});
    seedRow.append(el('span',{class:'limit'},t('gacha.seed')), seedIn, cpBtn);
    gDiv.append(seedRow);
    bd.append(grid, gDiv);
    return;
  }
  if (activeTab==='out'){ renderOut(bd); return; }
  for(const k in PARAMS){
    const s=PARAMS[k];
    if (s.tab!==activeTab) continue;
    if (mode==='easy' && s.adv) continue;
    if (k==='skirtLen' && !['onepiece','sailor'].includes(params.outfit)) continue;
    if (['hairStiff','hairGrav','hairDrag'].includes(k) && params.springOff) continue;
    bd.append(paramRow(k));
  }
  if (activeTab==='phys'){
    const hasS = build && build.springs && build.springs.length > 0;
    if (params.springOff && hasS)
      bd.append(el('div',{class:'note'}, t('note.springOff')));
    bd.append(el('div',{class:'note'}, t(hasS ? 'note.quest' : 'note.quest.nospring')));
  }
}

let statEls={};
function renderOut(bd){
  // Primary action at top — the export button is why the user opened this tab
  _exportBtn = el('button',{class:'btn primary wide', 'aria-keyshortcuts':'Control+S Meta+S', onclick:doExport}, _exporting?t('btn.exporting'):t('btn.export'));
  if (_exporting){ _exportBtn.disabled=true; _exportBtn.setAttribute('aria-busy','true'); }
  bd.append(_exportBtn);
  bd.append(el('div',{class:'limit', style:'text-align:center;margin-bottom:10px'}, t('hint.ctrlS')));

  bd.append(el('div',{class:'sect', role:'heading', 'aria-level':'3'}, t('out.meta')));
  const txt=(key,mk,ph)=>{ const id='meta-'+mk; bd.append(el('div',{class:'row'},
    el('label',{'for':id},t(key)),
    el('input',{id, type:'text', maxlength:'256', autocomplete:'off', spellcheck:'false', value:meta[mk]||'', placeholder:ph||'', oninput:e=>{meta[mk]=e.target.value; saveState();}}))); };
  const fnPrev=el('div',{class:'limit', id:'fnPreview', 'aria-live':'polite', 'aria-atomic':'true'});
  const updateFnPrev=()=>{ const s=fnameStem(); const nxt=t('out.filename')+': '+s+'.vrm';
    if(fnPrev.textContent!==nxt) fnPrev.textContent=nxt; document.title='雛 — '+s; };
  bd.append(el('div',{class:'row'},
    el('label',{'for':'meta-title'},t('out.title')),
    el('input',{id:'meta-title', type:'text', maxlength:'256', autocomplete:'off', spellcheck:'false', 'aria-describedby':'fnPreview', value:meta.title||'', placeholder:t('out.title.ph'),
      oninput:e=>{ meta.title=e.target.value; saveState(); updateFnPrev(); }})));
  updateFnPrev();
  bd.append(fnPrev);
  txt('out.version','version', t('out.version.ph'));
  txt('out.author','author', t('out.author.ph'));
  txt('out.contact','contact', t('out.contact.ph'));
  txt('out.reference','reference', t('out.reference.ph'));
  const selRow=(key,mk,opts,tp,onChange)=>{
    const id='sel-'+mk;
    const sel=el('select',{id, onchange:e=>{meta[mk]=e.target.value; saveState(); if(onChange) onChange(e.target.value);}});
    for(const o of opts) sel.append(el('option',{value:o, ...(meta[mk]===o?{selected:''}:{})},
      tp?t(tp+'.'+o):o));
    bd.append(el('div',{class:'row'}, el('label',{'for':id},t(key)), sel));
  };
  selRow('out.allowed','allowed',['OnlyAuthor','ExplicitlyLicensedPerson','Everyone'],'allowed');
  selRow('out.violent','violent',['Disallow','Allow'],'usage');
  selRow('out.sexual','sexual',['Disallow','Allow'],'usage');
  selRow('out.commercial','commercial',['Disallow','Allow'],'usage');
  const licUrlId='meta-licenseUrl';
  const licUrlRow=el('div',{class:'row', style: meta.license==='Other' ? '' : 'display:none'});
  licUrlRow.append(
    el('label',{'for':licUrlId}, t('out.license.url')),
    el('input',{id:licUrlId, type:'text', maxlength:'256', autocomplete:'off', spellcheck:'false', value:meta.licenseUrl||'',
      placeholder:t('out.license.url.ph'), oninput:e=>{meta.licenseUrl=e.target.value; saveState();}}));
  selRow('out.license','license',
    ['Redistribution_Prohibited','CC0','CC_BY','CC_BY_NC','CC_BY_SA','CC_BY_NC_SA','CC_BY_ND','CC_BY_NC_ND','Other'],
    'license', v=>{
      const focusWasInUrl = licUrlRow.contains(document.activeElement);
      licUrlRow.style.display=v==='Other'?'':'none';
      if (v==='Other'){ const u=document.getElementById(licUrlId); if(u) u.focus(); }
      else if (focusWasInUrl){ const s=document.getElementById('sel-license'); if(s) s.focus(); }});
  bd.append(licUrlRow);

  bd.append(el('div',{class:'sect', role:'heading', 'aria-level':'3'}, t('out.stats')));
  const tbl=el('table',{class:'statTable','aria-label':t('out.stats')}); statEls={};
  const row=(key,id)=>{ const td=el('td',{}); statEls[id]=td;
    tbl.append(el('tr',{}, el('th',{scope:'row'},t(key)), td)); };
  row('st.tris','tris'); row('st.bones','bones'); row('st.mat','mat');
  row('st.mesh','skinned'); row('st.chains','pbComp'); row('st.spring','pbTrans'); row('st.tex','texMB');
  row('st.vrm','approxBytes');
  const rkPC=el('td',{}); statEls.rkPC=rkPC;
  const rkQ=el('td',{}); statEls.rkQ=rkQ;
  tbl.append(el('tr',{}, el('th',{scope:'row'},'PC'), rkPC));
  tbl.append(el('tr',{}, el('th',{scope:'row'},'Quest'), rkQ));
  bd.append(tbl);
  bd.append(el('button',{class:'btn wide', 'aria-keyshortcuts':'Control+Shift+S Meta+Shift+S', onclick:saveJson}, t('btn.saveJson')));
  {
    const cpj=el('button',{class:'btn wide', onclick:()=>{
      const json=HINA.serialize(params,meta);
      const _fail=()=>{ cpj.textContent='!'; setTimeout(()=>{ cpj.textContent=t('btn.copyJson'); },1500);
        const sr=$('srStatus'); if(sr) sr.textContent=t('btn.copyJson.err'); };
      if(!navigator.clipboard?.writeText){ _fail(); return; }
      navigator.clipboard.writeText(json).then(()=>{
        const orig=cpj.textContent; cpj.textContent=t('btn.copyJsonDone');
        setTimeout(()=>{ cpj.textContent=orig; },1800);
        const sr=$('srStatus'); if(sr) sr.textContent=t('btn.copyJsonDone');
      }).catch(_fail);
    }}, t('btn.copyJson'));
    bd.append(cpj);
  }
  {
    const pstj=el('button',{class:'btn wide', onclick:()=>{
      const _pfail=()=>{ pstj.disabled=false; pstj.removeAttribute('aria-busy'); pstj.textContent='!'; setTimeout(()=>{ pstj.textContent=t('btn.pasteJson'); },1500);
        const sr=$('srStatus'); if(sr) sr.textContent=t('btn.pasteJson.err'); };
      if (typeof navigator.clipboard?.readText !== 'function'){ _pfail(); return; }
      pstj.disabled=true; pstj.setAttribute('aria-busy','true');
      navigator.clipboard.readText().then(text=>{
        pstj.disabled=false; pstj.removeAttribute('aria-busy');
        const d=HINA.deserialize(text);
        if(d){ captureUndo(); params=d.params; Object.assign(meta,d.meta); activePresetId=null; lastGachaSeed=null;
          rebuild(); renderBody(); saveState();
          const tb=$('tabBody'); if(tb) tb.focus();
          const sr=$('srStatus'); if(sr) sr.textContent=t('btn.pasteJson.ok'); }
        else _pfail();
      }).catch(_pfail);
    }}, t('btn.pasteJson'));
    bd.append(pstj);
  }
  const file=el('input',{type:'file', accept:'.json,application/json', style:'display:none',
    onchange:e=>{ const f=e.target.files[0]; if(!f) return;
      if(f.size>2*1024*1024){ showErr(t('err.loadFailed')); e.target.value=''; return; }
      const rd=new FileReader();
      rd.onload=()=>{ const d=HINA.deserialize(String(rd.result));
        if (d){ captureUndo(); params=d.params; Object.assign(meta,d.meta); activePresetId=null; lastGachaSeed=null; rebuild(); renderBody(); saveState();
          const tb=$('tabBody'); if(tb) tb.focus();
          const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.loadedJson').replace('{name}',f.name); }
        else { showErr(t('err.loadFailed')); } };
      rd.onerror=rd.onabort=()=>showErr(t('err.loadFailed'));
      rd.readAsText(f); e.target.value=''; }});
  bd.append(file);
  bd.append(el('button',{class:'btn wide', onclick:()=>file.click()}, t('btn.loadJson')));
  bd.append(el('div',{class:'limit', style:'text-align:center;margin-bottom:8px'}, t('hint.dropJson')));
  {
    let _resetPending=false, _resetTimer=null;
    const resetBtn=el('button',{class:'btn wide', onclick:()=>{
      if(_resetPending){
        clearTimeout(_resetTimer); _resetPending=false; resetBtn.textContent=t('btn.reset');
        captureUndo(); params=HINA.defaults(); meta=Object.assign({},META_DEFAULTS); activePresetId=null; lastGachaSeed=null; rebuild(); renderBody(); saveState();
        const tb=$('tabBody'); if(tb) tb.focus();
        const sr=$('srStatus'); if(sr) sr.textContent=t('btn.reset');
      } else {
        _resetPending=true; resetBtn.textContent=t('btn.reset.confirm');
        const sr=$('srStatus'); if(sr) sr.textContent=t('btn.reset.confirm');
        _resetTimer=setTimeout(()=>{ _resetPending=false; if(resetBtn.isConnected){ resetBtn.textContent=t('btn.reset');
          const sr=$('srStatus'); if(sr) sr.textContent=t('btn.reset'); } },3000);
      }
    }}, t('btn.reset'));
    bd.append(resetBtn);
  }
  bd.append(el('div',{class:'note'}, t('note.upload')));
  const gd=el('div',{class:'note'});
  gd.append(el('b',{role:'heading','aria-level':'4'}, t('guide.t')));
  const ol=el('ol',{style:'margin:6px 0 0 16px;line-height:1.9'});
  for(const k of ['guide.s1','guide.s2','guide.s3','guide.s4','guide.s5'])
    ol.append(el('li',{}, t(k)));
  gd.append(ol); bd.append(gd);
  updateStats();
}

const RANKCOLOR=['var(--r-e)','var(--r-g)','var(--r-m)','var(--r-p)','var(--r-vp)'];
// the bottleneck categories that hold a rank back (SPEC F-010: 律速項目を明示)
function limitText(r){
  if (r.idx===0 || !r.worst || !r.worst.length) return '';
  return t('rank.limit')+': '+r.worst.map(c=>t('cat.'+c)).join(' / ');
}
// WCAG 4.1.3 — announce rank changes to assistive tech, but only when the
// label actually changes (slider ticks must not spam the live region).
let lastRankKey='';
function announceRank(pc, q){
  const sr=$('srStatus'); if (!sr) return;
  const key=pc.rank+'|'+q.rank+'|'+lang;
  if (key===lastRankKey) return;
  lastRankKey=key;
  let msg=t('a11y.rankStatus').replace('{pc}',t('rank.'+pc.rank)).replace('{q}',t('rank.'+q.rank));
  const lim=limitText(q); if (lim) msg+=' ('+lim+')';
  sr.textContent=msg;
}
function updateStats(){
  if (!build) return;
  const est=HINA.estimate(build, params);
  const pc=HINA.rank(est,'pc'), q=HINA.rank(est,'quest');
  const set=(elm,r)=>{ const lim=limitText(r);
    elm.textContent=t('rank.'+r.rank); elm.style.color=RANKCOLOR[r.idx];
    const tip=t('rank.tip.'+r.rank)+(lim?' — '+lim:'');
    elm.title=tip; elm.parentElement.title=tip;
    // Keep aria-label on rankBadge button in sync with current rank so SR reads "PC: Excellent — click…"
    const lbl=elm.parentElement.querySelector('.lbl');
    if(lbl) elm.parentElement.setAttribute('aria-label',
      (lbl.textContent+': '+t('rank.'+r.rank)+(lim?' ('+lim+')':'')+' — '+t('a11y.rankBadge'))); };
  set($('rankPC'),pc); set($('rankQ'),q);
  const qlim=$('rankQLim');
  if(qlim) qlim.textContent = (q.worst&&q.worst.length&&q.idx>0) ? '('+t('cat.'+q.worst[0])+')' : '';
  const hv=$('heightVal'); if (hv){ hv.textContent=params.height.toFixed(2)+' m';
    const hb=$('heightBadge');
    if(hb) hb.setAttribute('aria-label', t('lbl.height')+': '+params.height.toFixed(2)+' m — '+t('a11y.rankBadge')); }
  announceRank(pc, q);
  if (statEls.tris){
    // Annotate tris and bones with Quest Excellent threshold so users can see headroom at a glance
    const QE=HINA.RANKS.quest;
    const ann=(val,lim)=>val+(val>lim?' / '+lim+' ⚠':' / '+lim);
    statEls.tris.textContent=ann(est.tris,QE.tris[0]);
    statEls.bones.textContent=ann(est.bones,QE.bones[0]);
    statEls.mat.textContent=est.mat;
    statEls.skinned.textContent=est.skinned;
    statEls.pbComp.textContent=params.springOff?0:est.pbComp;
    statEls.pbTrans.textContent=params.springOff?0:est.pbTrans;
    // texMB: annotate with QE threshold (10 MB) so users see headroom — pbComp/pbTrans not annotated
    // because their QE threshold is 0 (springs off), making "/ 0 ⚠" misleading
    statEls.texMB.textContent='~'+est.texMB+(est.texMB>QE.texMB[0]?' / '+QE.texMB[0]+' ⚠':' / '+QE.texMB[0])+' MB';
    statEls.approxBytes.textContent='~'+Math.round(est.approxBytes/1024)+' KB';
    statEls.rkPC.innerHTML=''; statEls.rkQ.innerHTML='';
    const badge=r=>{ const lim=limitText(r);
      const tip=t('rank.tip.'+r.rank)+(lim?' — '+lim:'');
      const b=el('span',{class:'rk', title:tip, 'aria-label':t('rank.'+r.rank)+' — '+t('rank.tip.'+r.rank)}, t('rank.'+r.rank));
      b.style.background=RANKCOLOR[r.idx]; b.style.color='#0c1014';
      const wrap=el('span',{}, b);
      if (lim) wrap.append(el('span',{class:'limit'}, lim));
      return wrap; };
    statEls.rkPC.append(badge(pc)); statEls.rkQ.append(badge(q));
  }
}

/* ---------- export / save / load ---------- */
function download(bytes, name, type){
  const b=new Blob([bytes],{type});
  const u=URL.createObjectURL(b);
  const a=document.createElement('a');
  a.href=u; a.download=name; a.setAttribute('aria-hidden','true'); document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u), 8000);
}
// 100-char cap: longest suffix is '.hina.json' (10) → 110 chars total, well under OS limits (255 bytes)
function safeName(s, fb){ const v=(s||'').trim().replace(/[\\/:*?"<>|]/g,'_').slice(0,100); return v||fb; }
function fnameStem(){ return safeName(meta.title, lastGachaSeed!==null ? 'hina_gacha_'+lastGachaSeed : 'hina_'+(activePresetId||'custom')); }
const canvasBlob = c => new Promise(res => c.toBlob(res, 'image/png'));
let _glLost = false;
const _hintDefault=()=>!GLOK?t('hint.noGL'):_glLost?t('hint.glLost'):t('hint.drag');
let _screenshotting = false;
let _exporting = false, _exportBtn = null;
async function doExport(){
  if (!build || _exporting) return;
  _exporting = true;
  // Snapshot all mutable state so slider/meta changes during async awaits don't affect the export
  const exportBuild = build;
  const exportParams = JSON.parse(JSON.stringify(params));
  const exportMeta = JSON.parse(JSON.stringify(meta));
  const _exportFocusWasBtn = document.activeElement === _exportBtn;
  if (_exportBtn){ _exportBtn.disabled = true; _exportBtn.setAttribute('aria-busy','true'); _exportBtn.textContent = t('btn.exporting'); }
  { const sr=$('srStatus'); if(sr) sr.textContent=t('btn.exporting'); }
  try{
    let thumbBytes = null;
    if (GLOK && !_glLost){
      renderFrame(performance.now());            // same task → buffer readable
      const sq = Math.min(cv.width, cv.height);
      const tc = document.createElement('canvas');
      tc.width = tc.height = 256;
      tc.getContext('2d').drawImage(cv, (cv.width-sq)/2, (cv.height-sq)/2, sq, sq, 0, 0, 256, 256);
      const tb = await canvasBlob(tc);
      if (tb) thumbBytes = new Uint8Array(await tb.arrayBuffer());
    }
    const atlasBlob = await canvasBlob(atlas);
    if (!atlasBlob) throw new Error('atlas toBlob returned null');
    const ab = await atlasBlob.arrayBuffer();
    const {bytes} = HINA.exportVRM(exportBuild, exportParams, exportMeta, new Uint8Array(ab), thumbBytes);
    const fname = safeName(exportMeta.title, lastGachaSeed!==null ? 'hina_gacha_'+lastGachaSeed : 'hina_'+(activePresetId||'custom'))+'.vrm';
    download(bytes, fname, 'application/octet-stream');
    const sr=$('srStatus');
    if (sr) sr.textContent = t('a11y.exported').replace('{name}',fname).replace('{size}',Math.round(bytes.length/1024)+' KB');
    if (_exportBtn){ _exportBtn.textContent=t('btn.exported'); setTimeout(()=>{ if(_exportBtn) _exportBtn.textContent=t('btn.export'); },2000); }
  }catch(e){ showErr(t('err.exportFailed')+': '+e.message); }
  finally{
    _exporting = false;
    if (_exportBtn){ _exportBtn.disabled = false; _exportBtn.removeAttribute('aria-busy');
      // Ensure button text always resets — catch branch sets showErr but doesn't touch textContent
      if (_exportBtn.textContent===t('btn.exporting')) _exportBtn.textContent=t('btn.export');
      if (_exportFocusWasBtn && _exportBtn.isConnected) _exportBtn.focus(); }
  }
}
function saveJson(){
  const fname=fnameStem()+'.hina.json';
  download(new TextEncoder().encode(HINA.serialize(params, meta)), fname, 'application/json');
  const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.savedJson').replace('{name}',fname);
}
function doScreenshot(){
  if (!GLOK || _glLost || _screenshotting) return;
  _screenshotting = true;
  const btn=$('btnScreenshot');
  const _scrFocusWasBtn = document.activeElement === btn;
  if (btn){ btn.disabled=true; btn.setAttribute('aria-busy','true'); }
  const _scrDone=()=>{ _screenshotting=false; if (btn){ btn.disabled=false; btn.removeAttribute('aria-busy'); if (_scrFocusWasBtn) btn.focus(); } };
  try{
    renderFrame(performance.now()); // render into buffer before browser flushes it
    cv.toBlob(blob=>{
      _scrDone();
      if (!blob){ showErr(t('err.exportFailed')); return; }
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url; a.download=fnameStem()+'.png'; a.setAttribute('aria-hidden','true');
      document.body.append(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.screenshotDone');
    },'image/png');
  }catch(e){ _scrDone(); showErr(t('err.exportFailed')); }
}

/* ---------- rebuild ---------- */
function rebuild(){
  params=HINA.sanitize(params);
  try{ build=HINA.buildAvatar(params); }
  catch(e){ showErr(t('err.buildFailed')+': '+e.message); return; }
  drawAtlas(params);
  uploadTexture();
  uploadGeometry();
  initSprings();
  morphW={}; morphDirty=true;
  activeExpr = null;
  buildExprBar();
  // Roving tabindex for exprBar: registered once here (not inside buildExprBar) to avoid listener accumulation
  const _bar=$('exprBar');
  if (_bar && !_bar.dataset.kbBound){
    _bar.dataset.kbBound='1';
    _bar.addEventListener('keydown', e=>{
      const btns=[..._bar.querySelectorAll('.eBtn')];
      const ci=btns.indexOf(document.activeElement); if(ci<0) return;
      let ni=-1;
      if (e.key==='ArrowRight'||e.key==='ArrowDown') ni=(ci+1)%btns.length;
      else if (e.key==='ArrowLeft'||e.key==='ArrowUp') ni=(ci-1+btns.length)%btns.length;
      else if (e.key==='Home') ni=0;
      else if (e.key==='End') ni=btns.length-1;
      if (ni<0) return;
      e.preventDefault();
      btns.forEach((b,i)=>b.setAttribute('tabindex', i===ni?'0':'-1'));
      btns[ni].focus();
    });
  }
  document.title='雛 — '+fnameStem();
  updateStats();
  saveState();
}

/* ---------- header / dialogs / boot ---------- */
// version from core — single source of truth (HINA.VERSION)
if ($('aboutVer')) $('aboutVer').textContent = 'v' + HINA.VERSION;
function applyLang(){
  document.documentElement.lang = lang;
  const bl=$('btnLang'); bl.textContent=lang==='ja'?'EN':'JA';
  bl.title=t('btn.lang.tip'); bl.setAttribute('aria-label', t('btn.lang.tip'));
  const bm=$('btnMode'); bm.textContent=mode==='easy'?t('mode.easy'):t('mode.detail');
  bm.title=mode==='easy'?t('mode.easy.tip'):t('mode.detail.tip');
  bm.setAttribute('aria-label', (mode==='easy'?t('mode.easy.tip'):t('mode.detail.tip')));
  bm.setAttribute('aria-pressed', String(mode==='detail'));
  $('hint').textContent = _hintDefault();
  if (!GLOK || _glLost){ const sr=$('srStatus'); if(sr) sr.textContent=_hintDefault(); }
  cv.setAttribute('aria-label', GLOK && !_glLost ? t('a11y.canvas') : _hintDefault());
  cv.setAttribute('aria-roledescription', t('a11y.canvas.role'));
  $('tabs').setAttribute('aria-label', t('a11y.tabs'));
  $('exprBar').setAttribute('aria-label', t('a11y.exprBar'));
  $('stage').setAttribute('aria-label', t('a11y.stage'));
  $('panel').setAttribute('aria-label', t('a11y.panel'));
  $('btnAbout').setAttribute('aria-label', t('a11y.about.btn'));
  $('btnAbout').setAttribute('aria-haspopup', 'dialog');
  $('btnAbout').setAttribute('aria-keyshortcuts', '?');
  $('btnMode').setAttribute('aria-keyshortcuts', 'M');
  $('aboutTxt').textContent = t('about');
  if ($('aboutKeysSumm')) $('aboutKeysSumm').textContent = t('about.keys');
  if ($('aboutKeys')) $('aboutKeys').textContent = t('about.keyList');
  $('aboutClose').textContent = t('about.close');
  if ($('heightLbl')) $('heightLbl').textContent = t('lbl.height');
  // rankBadge static reset (heightBadge is excluded — it gets a dynamic label in updateStats)
  document.querySelectorAll('.rankBadge:not(#heightBadge)').forEach(b=>b.setAttribute('aria-label', t('a11y.rankBadge')));
  const sc=$('btnScreenshot'); if(sc){ sc.textContent=t('btn.screenshot'); sc.title=t('btn.screenshot.tip'); sc.setAttribute('aria-label',t('btn.screenshot.tip')); sc.setAttribute('aria-keyshortcuts','Control+Shift+P Meta+Shift+P'); sc.style.display=(GLOK&&!_glLost)?'':'none'; }
  const nov=$('noGlOverlay'); if(nov) nov.textContent=t('hint.noGL');
  const sd=$('sliderDesc'); if(sd) sd.textContent=t('hint.sliderReset');
  const sl=$('skipLink'); if(sl) sl.textContent=t('a11y.skip');
  document.documentElement.lang = lang;
  // scrollReset=false: user stays on the same tab — preserve their scroll position across lang/mode changes
  renderTabs(); renderBody(false); buildExprBar(); updateStats();
}
$('btnLang').addEventListener('click',()=>{ lang=lang==='ja'?'en':'ja'; saveState(); applyLang(); const sr=$('srStatus'); if(sr) sr.textContent=t('btn.lang.tip'); });
$('btnMode').addEventListener('click',()=>{ mode=mode==='easy'?'detail':'easy'; saveState(); applyLang(); const sr=$('srStatus'); if(sr) sr.textContent=mode==='easy'?t('mode.easy.tip'):t('mode.detail.tip'); });
$('btnScreenshot').addEventListener('click', doScreenshot);
let _dlgReturnFocus = null;
const openAbout=()=>{ _dlgReturnFocus=document.activeElement; $('aboutDlg').showModal(); };
$('btnAbout').addEventListener('click', openAbout);
$('aboutClose').addEventListener('click',()=>$('aboutDlg').close());
// close dialog on backdrop click (click on the dialog element itself = outside the content box)
$('aboutDlg').addEventListener('click',e=>{ if (e.target===$('aboutDlg')) $('aboutDlg').close(); });
// Restore focus to the trigger element (or btnAbout fallback) when dialog closes
$('aboutDlg').addEventListener('close',()=>{ ((_dlgReturnFocus && _dlgReturnFocus.isConnected) ? _dlgReturnFocus : $('btnAbout')).focus(); _dlgReturnFocus=null; });

// When WebGL is unavailable, create a centered overlay on the canvas so the
// black rectangle doesn't look like a crash — hint bar text alone is easy to miss
if (!GLOK){
  const ov=document.createElement('div');
  ov.setAttribute('aria-hidden','true');
  ov.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;color:var(--text-faint);font-size:13px;text-align:center;padding:24px';
  ov.id='noGlOverlay';
  $('stage').appendChild(ov);
}
loadState();
rebuild();
applyLang();
// Rank badges are clickable shortcuts to the Stats/Export tab
document.querySelectorAll('.rankBadge').forEach(b=>{
  b.style.cursor='pointer';
  b.setAttribute('role','button');
  b.setAttribute('tabindex','0');
  const goStats=()=>{ activeTab='out'; renderTabs(); renderBody(); $('tab-out').focus(); };
  b.addEventListener('click', goStats);
  b.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); goStats(); }});
});
// Keyboard shortcuts: Ctrl+S=VRM export, Ctrl+Shift+S=JSON save, Ctrl+Z=undo, ?=about, 1-8=tabs
document.addEventListener('keydown',e=>{
  const tag=document.activeElement.tagName;
  const notField = !['INPUT','SELECT','TEXTAREA'].includes(tag);
  const dlgOpen = $('aboutDlg').open;
  if (!dlgOpen){
    if ((e.ctrlKey||e.metaKey) && e.key==='S' && e.shiftKey && notField){
      e.preventDefault(); saveJson();
    } else if ((e.ctrlKey||e.metaKey) && e.key==='s' && !e.shiftKey && notField){
      e.preventDefault(); doExport();
    } else if ((e.ctrlKey||e.metaKey) && e.key==='z' && !e.shiftKey && notField){
      e.preventDefault(); doUndo();
    } else if ((e.ctrlKey||e.metaKey) && e.key==='P' && e.shiftKey && notField){
      e.preventDefault(); doScreenshot();
    }
    if (e.key==='?' && !e.ctrlKey && !e.metaKey && notField){
      e.preventDefault(); openAbout();
    }
    if ((e.key==='m'||e.key==='M') && !e.ctrlKey && !e.metaKey && !e.altKey && notField){
      e.preventDefault();
      const wasInTabBody = $('tabBody').contains(document.activeElement);
      mode=mode==='easy'?'detail':'easy'; saveState(); applyLang();
      if (wasInTabBody) $('btnMode').focus();
      const sr=$('srStatus'); if(sr) sr.textContent=mode==='easy'?t('mode.easy.tip'):t('mode.detail.tip');
    }
    if (notField && !e.ctrlKey && !e.metaKey && !e.altKey && /^[1-8]$/.test(e.key)){
      const ti=parseInt(e.key)-1;
      if (ti<TABS.length){ e.preventDefault(); activeTab=TABS[ti]; renderTabs(); renderBody(); $('tab-'+TABS[ti]).focus(); }
    }
  }
  if (e.key==='Escape' && !$('aboutDlg').open){
    if (document.body.classList.contains('drag-over')){
      document.body.classList.remove('drag-over');
      const h=$('hint'); if(h){ h.style.color=''; h.textContent=activeExpr?t('expr.'+activeExpr)+' — '+t('hint.exprOff'):_hintDefault(); }
    } else if (activeExpr !== null){
      e.preventDefault(); setExpr(null);
    }
  }
});
const _emergencySave=()=>{ clearTimeout(_saveTimer); try{ localStorage.setItem(LS, JSON.stringify({params, meta, lang, mode, activeTab, activePresetId, lastGachaSeed})); }catch(e){} };
window.addEventListener('beforeunload', _emergencySave);
window.addEventListener('pagehide', _emergencySave);
// Drag-and-drop JSON loading — complement the file button; 'Files' check avoids conflicts with 3D canvas drag
document.body.addEventListener('dragover',e=>{
  if (!e.dataTransfer.types.includes('Files')) return;
  e.preventDefault(); document.body.classList.add('drag-over');
  const h=$('hint'); if(h){ h.textContent=t('hint.dropJson'); h.style.color='var(--accent)'; }
});
document.body.addEventListener('dragleave',e=>{
  if(!e.relatedTarget){ document.body.classList.remove('drag-over');
    const h=$('hint'); if(h){ h.style.color=''; h.textContent=activeExpr?t('expr.'+activeExpr)+' — '+t('hint.exprOff'):_hintDefault(); } }
});
document.body.addEventListener('drop',e=>{
  document.body.classList.remove('drag-over');
  const h=$('hint'); if(h){ h.style.color=''; h.textContent=_hintDefault(); }
  if (!e.dataTransfer.files.length) return;
  e.preventDefault();
  const f=e.dataTransfer.files[0];
  if (!f.name.endsWith('.json') && f.type!=='application/json') { showErr(t('err.loadFailed')); return; }
  if (f.size>2*1024*1024) { showErr(t('err.loadFailed')); return; }
  const rd=new FileReader();
  rd.onload=()=>{ const d=HINA.deserialize(String(rd.result));
    if (d){ captureUndo(); params=d.params; Object.assign(meta,d.meta); activePresetId=null; lastGachaSeed=null; rebuild(); renderBody(); saveState();
      const tb=$('tabBody'); if(tb) tb.focus();
      const sr=$('srStatus'); if(sr) sr.textContent=t('a11y.loadedJson').replace('{name}',f.name); }
    else { showErr(t('err.loadFailed')); } };
  rd.onerror=rd.onabort=()=>showErr(t('err.loadFailed'));
  rd.readAsText(f);
});
// Roving tabindex: arrow keys navigate between tabs (ARIA tablist pattern)
$('tabs').addEventListener('keydown',e=>{
  const idx=TABS.indexOf(activeTab), n=TABS.length; let ni=-1;
  if (e.key==='ArrowRight'||e.key==='ArrowDown') ni=(idx+1)%n;
  else if (e.key==='ArrowLeft'||e.key==='ArrowUp') ni=(idx-1+n)%n;
  else if (e.key==='Home') ni=0;
  else if (e.key==='End') ni=n-1;
  if (ni<0) return;
  e.preventDefault();
  activeTab=TABS[ni]; renderTabs(); renderBody(); $('tab-'+TABS[ni]).focus();
});
camDist=build.dims.H*1.85; camTarget=[0,build.dims.H*0.55,0];
cv.addEventListener('webglcontextlost', e=>{ e.preventDefault();
  _glLost = true;
  $('hint').textContent=t('hint.glLost');
  const sr=$('srStatus'); if(sr) sr.textContent=t('hint.glLost');
  cv.setAttribute('aria-label', t('hint.glLost'));
  const sc=$('btnScreenshot'); if(sc){ sc.disabled=true; sc.style.display='none'; } });
cv.addEventListener('webglcontextrestored', ()=>{ _emergencySave(); location.reload(); });
if (location.search.indexOf('selftest')>=0){
  const st=HINA.selfTest();
  const box=$('selftestBox'); box.style.display='block';
  const pass=st.results.filter(r=>r.ok).length, total=st.results.length;
  const countStr=t('selftest.count').replace('{pass}',pass).replace('{total}',total);
  box.append(el('div',{style:'font-weight:700;margin-bottom:6px;color:'+(st.ok?'var(--ok)':'var(--err)')},
    (st.ok?t('selftest.ok'):t('selftest.ng'))+' — '+countStr));
  for(const r of st.results)
    box.append(el('div',{style:'color:'+(r.ok?'var(--text-dim)':'var(--err)')},
      (r.ok?'✓ ':'✗ ')+r.name+(r.msg?' — '+r.msg:'')));
}
let _rafPaused = false;
document.addEventListener('visibilitychange', () => { _rafPaused = document.hidden; });
(function loop(t){ requestAnimationFrame(loop); if (!_rafPaused) renderFrame(t||0); })(0);
})();
</script>
</body>
</html>
