<script>
'use strict';
(() => {
const $ = id => document.getElementById(id);
const M = HINA.M, PARAMS = HINA.PARAMS, TEXSZ = HINA.TEX, ATLAS = HINA.ATLAS;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state ---------- */
let lang = 'ja', mode = 'easy', activeTab = 'preset';
let activePresetId = null, lastGachaSeed = null;
let params = HINA.defaults();
let meta = {title:'', author:'', contact:'', reference:'', allowed:'OnlyAuthor', violent:'Disallow', sexual:'Disallow',
            commercial:'Disallow', license:'Redistribution_Prohibited'};
let build = null;
const t = k => (HINA.I18N[lang] && HINA.I18N[lang][k]) || k;

const LS = 'hina.v1';
function loadState(){
  try{
    const j = JSON.parse(localStorage.getItem(LS));
    if (!j) return;
    params = HINA.sanitize(j.params);
    if (j.meta && typeof j.meta==='object') Object.assign(meta, j.meta);
    if (j.lang==='en' || j.lang==='ja') lang = j.lang;
    if (j.mode==='detail') mode = 'detail';
  }catch(e){}
}
let _saveTimer = null;
function saveState(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(()=>{
    try{ localStorage.setItem(LS, JSON.stringify({params, meta, lang, mode})); }catch(e){}
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
  // mouth
  { const r=ATLAS.mouth, w=r[2]-r[0], h=r[3]-r[1];
    ax.save(); ax.translate(r[0]+w/2, r[1]+h/2);
    const g = ax.createLinearGradient(0,-h*0.3,0,h*0.36);
    g.addColorStop(0,'#8a3c46'); g.addColorStop(1,'#c96a72');
    ax.fillStyle=g;
    ax.beginPath(); ax.ellipse(0,0,w*0.32,h*0.34,0,0,Math.PI*2); ax.fill();
    ax.fillStyle='rgba(60,20,28,0.85)';
    ax.beginPath(); ax.ellipse(0,-h*0.06,w*0.20,h*0.16,0,0,Math.PI*2); ax.fill();
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
  if (!GLOK) return;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE, atlas);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
}

/* skinning + animation state */
let basePos, baseNrm, morphPos, skPos, skNrm, nVerts=0, outlineCount=0;
let localQ=[], worldMats=[], skinMats=[];
let chains=[];           // [{boneIdxs, pts, prev, segs, bindDirs}]
let morphW={}, morphDirty=true;
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
  if (!GLOK) return;
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
      const drag = HINA.M.clamp(params.hairDrag,0,1)*0.10;
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
  if (!build || !GLOK) return;
  resize();
  // blink
  if (!reduceMotion){
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
    gazeX=((e.clientX-r.left)/r.width-0.5)*2;
    gazeY=((e.clientY-r.top)/r.height-0.5)*2;
    if (!drag) return;
    if (ptrs.size===2){
      const old=[...ptrs.values()];
      const d0=Math.hypot(old[0][0]-old[1][0], old[0][1]-old[1][1]);
      ptrs.set(e.pointerId,[e.clientX,e.clientY]);
      const cur=[...ptrs.values()];
      const d1=Math.hypot(cur[0][0]-cur[1][0], cur[0][1]-cur[1][1]);
      if (d0>0) camDist=M.clamp(camDist*d0/d1, 0.6, 8);
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
  cv.addEventListener('dblclick',()=>{ camYaw=Math.PI; camPitch=0.10;
    camDist=(build?build.dims.H:1.45)*1.85; });
  // keyboard camera control (WCAG 2.1.1 — preview must be operable without a pointer)
  cv.addEventListener('keydown',e=>{
    const rot=0.18, zoom=0.12; let used=true;
    switch(e.key){
      case 'ArrowLeft':  camYaw += rot; break;
      case 'ArrowRight': camYaw -= rot; break;
      case 'ArrowUp':    camPitch=M.clamp(camPitch+rot, -0.5, 1.25); break;
      case 'ArrowDown':  camPitch=M.clamp(camPitch-rot, -0.5, 1.25); break;
      case '+': case '=': camDist=M.clamp(camDist*(1-zoom), 0.6, 8); break;
      case '-': case '_': camDist=M.clamp(camDist*(1+zoom), 0.6, 8); break;
      case 'Home': case '0': camYaw=Math.PI; camPitch=0.10; camDist=(build?build.dims.H:1.45)*1.85; break;
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
      'aria-label':label,
      oninput:e=>{ params[k]=parseFloat(e.target.value);
        if (valEl.tagName==='INPUT') valEl.value=String(params[k]); else valEl.textContent=String(params[k]);
        onParam(k); }});
    if (mode==='detail'){
      valEl=el('input',{type:'number',class:'num numIn',min:s.min,max:s.max,step:s.step,value:params[k],
        'aria-label':label,
        onchange:e=>{ let n=parseFloat(e.target.value);
          if (!Number.isFinite(n)) n=params[k];
          n=M.clamp(n,s.min,s.max);
          params[k]=n; e.target.value=String(n); r.value=String(n); onParam(k); }});
    } else {
      valEl=el('span',{class:'num'}, String(params[k]));
    }
    return el('div',{class:'row'}, el('label',{'for':pid},label), r, valEl);
  }
  if (s.k==='enum'){
    const optLabel=o=>{ const key='enum.'+k+'.'+o; const lbl=t(key); return lbl===key?o:lbl; };
    const sel=el('select',{id:pid, 'aria-label':label, onchange:e=>{params[k]=e.target.value; onParam(k);}});
    for(const o of s.opts) sel.append(el('option',{value:o, ...(params[k]===o?{selected:''}:{})}, optLabel(o)));
    return el('div',{class:'row'}, el('label',{'for':pid},label), sel);
  }
  if (s.k==='bool'){
    const cb=el('input',{id:pid, type:'checkbox','aria-label':label,
      onchange:e=>{params[k]=e.target.checked; onParam(k);}});
    cb.checked=params[k];
    return el('div',{class:'row'}, el('label',{'for':pid},label), cb);
  }
  // color
  const inp=el('input',{id:pid, type:'color', value:params[k], 'aria-label':label,
    oninput:e=>{params[k]=e.target.value; onParam(k);}});
  const sw=el('div',{class:'swatches'});
  for(const c of HINA.PAL[s.pal])
    sw.append(el('button',{class:'sw', style:'background:'+c, 'aria-label':label+' '+c,
      onclick:()=>{params[k]=c; inp.value=c; onParam(k);}}));
  return el('div',{class:'row'}, el('label',{'for':pid},label), inp, sw);
}

function onParam(k){
  activePresetId=null;
  const s=PARAMS[k];
  if (s.k==='color'){ drawAtlas(params); uploadTexture(); saveState(); return; }
  if (s.tab==='phys' && k!=='springOff'){ saveState(); return; }   // live physics
  rebuild();
}

function renderBody(){
  const bd=$('tabBody'); bd.textContent='';
  if (activeTab==='preset'){
    const grid=el('div',{class:'presetGrid'});
    for(const pre of HINA.PRESETS){
      const pp=HINA.presetParams(pre);
      const cols=el('div',{class:'cols'},
        el('span',{class:'c',style:'background:'+pp.hairColor}),
        el('span',{class:'c',style:'background:'+pp.eyeColor}),
        el('span',{class:'c',style:'background:'+pp.clothMain}));
      grid.append(el('button',{class:'preCard'+(activePresetId===pre.id?' selected':''), onclick:()=>{
        params=pp; activePresetId=pre.id; rebuild(); renderBody(); }},
        el('div',{class:'nm'}, lang==='ja'?pre.ja:pre.en), cols));
    }
    const gDiv=el('div',{style:'margin-top:14px'});
    gDiv.append(el('button',{class:'btn wide', onclick:()=>{
      lastGachaSeed=(Math.random()*1e9|0); params=HINA.randomParams(lastGachaSeed);
      activePresetId=null; rebuild(); renderBody(); }}, t('btn.gacha')));
    if (lastGachaSeed!==null)
      gDiv.append(el('div',{class:'gacha-seed'}, t('gacha.seed')+lastGachaSeed));
    bd.append(grid, gDiv);
    return;
  }
  if (activeTab==='out'){ renderOut(bd); return; }
  for(const k in PARAMS){
    const s=PARAMS[k];
    if (s.tab!==activeTab) continue;
    if (mode==='easy' && s.adv) continue;
    bd.append(paramRow(k));
  }
  if (activeTab==='phys') bd.append(el('div',{class:'note'}, t('note.quest')));
}

let statEls={};
function renderOut(bd){
  bd.append(el('div',{class:'sect'}, t('out.meta')));
  const txt=(key,mk,ph)=>{ const id='meta-'+mk; bd.append(el('div',{class:'row'},
    el('label',{'for':id},t(key)),
    el('input',{id, type:'text', value:meta[mk]||'', placeholder:ph||'', oninput:e=>{meta[mk]=e.target.value; saveState();}}))); };
  const fnPrev=el('div',{class:'limit', id:'fnPreview'});
  const updateFnPrev=()=>{ const s=fnameStem(); fnPrev.textContent=t('out.filename')+': '+s+'.vrm'; document.title='雛 — '+s; };
  bd.append(el('div',{class:'row'},
    el('label',{'for':'meta-title'},t('out.title')),
    el('input',{id:'meta-title', type:'text', value:meta.title||'', placeholder:t('out.title.ph'),
      oninput:e=>{ meta.title=e.target.value; saveState(); updateFnPrev(); }})));
  updateFnPrev();
  bd.append(fnPrev);
  txt('out.author','author', t('out.author.ph'));
  txt('out.contact','contact', t('out.contact.ph'));
  txt('out.reference','reference', t('out.reference.ph'));
  const selRow=(key,mk,opts,tp)=>{
    const id='sel-'+mk;
    const sel=el('select',{id, onchange:e=>{meta[mk]=e.target.value; saveState();}});
    for(const o of opts) sel.append(el('option',{value:o, ...(meta[mk]===o?{selected:''}:{})},
      tp?t(tp+'.'+o):o));
    bd.append(el('div',{class:'row'}, el('label',{'for':id},t(key)), sel));
  };
  selRow('out.allowed','allowed',['OnlyAuthor','ExplicitlyLicensedPerson','Everyone'],'allowed');
  selRow('out.violent','violent',['Disallow','Allow'],'usage');
  selRow('out.sexual','sexual',['Disallow','Allow'],'usage');
  selRow('out.commercial','commercial',['Disallow','Allow'],'usage');
  selRow('out.license','license',
    ['Redistribution_Prohibited','CC0','CC_BY','CC_BY_NC','CC_BY_SA','CC_BY_NC_SA','CC_BY_ND','CC_BY_NC_ND'],'license');

  bd.append(el('div',{class:'sect'}, t('out.stats')));
  const tbl=el('table',{class:'statTable'}); statEls={};
  const row=(key,id)=>{ const td=el('td',{}); statEls[id]=td;
    tbl.append(el('tr',{}, el('td',{},t(key)), td)); };
  row('st.tris','tris'); row('st.bones','bones'); row('st.mat','mat');
  row('st.mesh','skinned'); row('st.spring','pbTrans'); row('st.tex','texMB');
  row('st.vrm','approxBytes');
  const rkPC=el('td',{}); statEls.rkPC=rkPC;
  const rkQ=el('td',{}); statEls.rkQ=rkQ;
  tbl.append(el('tr',{}, el('td',{},'PC'), rkPC));
  tbl.append(el('tr',{}, el('td',{},'Quest'), rkQ));
  bd.append(tbl);

  bd.append(el('button',{class:'btn primary wide', onclick:doExport}, t('btn.export')));
  bd.append(el('div',{class:'limit', style:'text-align:center;margin-bottom:10px'}, t('hint.ctrlS')));
  bd.append(el('button',{class:'btn wide', onclick:saveJson}, t('btn.saveJson')));
  const file=el('input',{type:'file', accept:'.json,application/json', style:'display:none',
    onchange:e=>{ const f=e.target.files[0]; if(!f) return;
      const rd=new FileReader();
      rd.onload=()=>{ const d=HINA.deserialize(String(rd.result));
        if (d){ params=d.params; Object.assign(meta,d.meta); rebuild(); renderBody(); }
        else { alert(t('err.loadFailed')); } };
      rd.readAsText(f); e.target.value=''; }});
  bd.append(file);
  bd.append(el('button',{class:'btn wide', onclick:()=>file.click()}, t('btn.loadJson')));
  bd.append(el('button',{class:'btn wide', onclick:()=>{
    if (!confirm(t('btn.reset.confirm'))) return;
    params=HINA.defaults(); rebuild(); renderBody(); }}, t('btn.reset')));
  bd.append(el('div',{class:'note'}, t('note.upload')));
  const gd=el('div',{class:'note'}, el('b',{}, t('guide.t')));
  for(const k of ['guide.s1','guide.s2','guide.s3','guide.s4','guide.s5'])
    gd.append(el('div',{}, t(k)));
  bd.append(gd);
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
    elm.title=lim; elm.parentElement.title=lim; };
  set($('rankPC'),pc); set($('rankQ'),q);
  announceRank(pc, q);
  if (statEls.tris){
    statEls.tris.textContent=est.tris;
    statEls.bones.textContent=est.bones;
    statEls.mat.textContent=est.mat;
    statEls.skinned.textContent=est.skinned;
    statEls.pbTrans.textContent=params.springOff?0:est.pbTrans;
    statEls.texMB.textContent='~'+est.texMB+' MB';
    statEls.approxBytes.textContent='~'+Math.round(est.approxBytes/1024)+' KB';
    statEls.rkPC.innerHTML=''; statEls.rkQ.innerHTML='';
    const badge=r=>{ const lim=limitText(r);
      const b=el('span',{class:'rk'}, t('rank.'+r.rank));
      b.style.background=RANKCOLOR[r.idx]; b.style.color='#0c1014';
      if (lim) b.title=lim;
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
  a.href=u; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(u), 8000);
}
function safeName(s, fb){ const v=(s||'').trim().replace(/[\\/:*?"<>|]/g,'_'); return v||fb; }
function fnameStem(){ return safeName(meta.title, 'hina_'+(activePresetId||'custom')); }
const canvasBlob = c => new Promise(res => c.toBlob(res, 'image/png'));
async function doExport(){
  if (!build) return;
  try{
    let thumbBytes = null;
    if (GLOK){
      renderFrame(performance.now());            // same task → buffer readable
      const sq = Math.min(cv.width, cv.height);
      const tc = document.createElement('canvas');
      tc.width = tc.height = 256;
      tc.getContext('2d').drawImage(cv, (cv.width-sq)/2, (cv.height-sq)/2, sq, sq, 0, 0, 256, 256);
      const tb = await canvasBlob(tc);
      if (tb) thumbBytes = new Uint8Array(await tb.arrayBuffer());
    }
    const ab = await (await canvasBlob(atlas)).arrayBuffer();
    const {bytes} = HINA.exportVRM(build, params, meta, new Uint8Array(ab), thumbBytes);
    const fname = fnameStem()+'.vrm';
    download(bytes, fname, 'application/octet-stream');
    const sr=$('srStatus');
    if (sr) sr.textContent = t('a11y.exported').replace('{name}',fname).replace('{size}',Math.round(bytes.length/1024)+' KB');
  }catch(e){ alert('Export failed: '+e.message); }
}
function saveJson(){
  download(new TextEncoder().encode(HINA.serialize(params, meta)),
    fnameStem()+'.hina.json', 'application/json');
}

/* ---------- rebuild ---------- */
function rebuild(){
  params=HINA.sanitize(params);
  try{ build=HINA.buildAvatar(params); }
  catch(e){ alert(t('err.buildFailed')+': '+e.message); return; }
  drawAtlas(params);
  uploadTexture();
  uploadGeometry();
  initSprings();
  morphW={}; morphDirty=true;
  updateStats();
  saveState();
}

/* ---------- header / dialogs / boot ---------- */
// version from core — single source of truth (HINA.VERSION)
if ($('aboutVer')) $('aboutVer').textContent = 'v' + HINA.VERSION;
function applyLang(){
  $('btnLang').textContent = lang==='ja'?'EN':'JA';
  $('btnMode').textContent = mode==='easy'?t('mode.easy'):t('mode.detail');
  $('btnMode').setAttribute('aria-pressed', String(mode==='detail'));
  $('hint').textContent = t('hint.drag');
  cv.setAttribute('aria-label', t('a11y.canvas'));
  $('aboutTxt').textContent = t('about');
  document.documentElement.lang = lang;
  renderTabs(); renderBody(); updateStats();
}
$('btnLang').addEventListener('click',()=>{ lang=lang==='ja'?'en':'ja'; saveState(); applyLang(); });
$('btnMode').addEventListener('click',()=>{ mode=mode==='easy'?'detail':'easy'; saveState(); applyLang(); });
$('btnAbout').addEventListener('click',()=>$('aboutDlg').showModal());
$('aboutClose').addEventListener('click',()=>$('aboutDlg').close());

loadState();
rebuild();
applyLang();
// Ctrl/Cmd+S → export VRM (muscle-memory shortcut for creative tools)
document.addEventListener('keydown',e=>{
  if ((e.ctrlKey||e.metaKey) && e.key==='s' &&
      !['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){
    e.preventDefault(); doExport();
  }
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
if (!GLOK) $('hint').textContent='WebGL unavailable — preview disabled (export still works)';
cv.addEventListener('webglcontextlost', e=>{ e.preventDefault();
  $('hint').textContent='WebGL context lost — reload to restore preview'; });
if (location.search.indexOf('selftest')>=0){
  const st=HINA.selfTest();
  const box=$('selftestBox'); box.style.display='block';
  box.append(el('div',{style:'font-weight:700;margin-bottom:6px;color:'+(st.ok?'var(--ok)':'var(--err)')},
    st.ok?t('selftest.ok'):t('selftest.ng')));
  for(const r of st.results)
    box.append(el('div',{style:'color:'+(r.ok?'var(--text-dim)':'var(--err)')},
      (r.ok?'✓ ':'✗ ')+r.name+(r.msg?' — '+r.msg:'')));
}
(function loop(t){ requestAnimationFrame(loop); renderFrame(t||0); })(0);
})();
</script>
</body>
</html>
