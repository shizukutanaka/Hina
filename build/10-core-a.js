/*HINA-CORE-START*/
/* é (Hina) core â pure logic. No DOM / WebGL / Canvas references (tested in Node). */
'use strict';
const HINA = (() => {

const VERSION = '0.1.0';

/* ---------- math (column-major mat4, [x,y,z] vec, [x,y,z,w] quat) ---------- */
const M = {
  v3: (x=0,y=0,z=0)=>[x,y,z],
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  scale:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),
  norm(a){ const l=M.len(a)||1; return [a[0]/l,a[1]/l,a[2]/l]; },
  lerp:(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t],
  qid:()=>[0,0,0,1],
  qAxis(axis,ang){ const s=Math.sin(ang/2), n=M.norm(axis); return [n[0]*s,n[1]*s,n[2]*s,Math.cos(ang/2)]; },
  qMul(a,b){
    return [
      a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],
      a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],
      a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],
      a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
  },
  qRot(q,v){ // rotate vec by quat
    const qv=[q[0],q[1],q[2]], uv=M.cross(qv,v), uuv=M.cross(qv,uv);
    return M.add(v, M.add(M.scale(uv,2*q[3]), M.scale(uuv,2)));
  },
  qFromTo(a,b){ // rotation taking unit a â unit b
    const d=M.dot(a,b);
    if (d>0.999999) return M.qid();
    if (d<-0.999999){ // 180Â°: pick orthogonal axis
      let ax=M.cross([1,0,0],a); if (M.len(ax)<1e-6) ax=M.cross([0,1,0],a);
      return M.qAxis(ax,Math.PI);
    }
    const c=M.cross(a,b), w=Math.sqrt((1+d)*2), inv=1/w;
    return [c[0]*inv,c[1]*inv,c[2]*inv,w/2];
  },
  mId:()=>[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
  mT:(x,y,z)=>[1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1],
  mMul(a,b){ // a*b column-major
    const o=new Array(16);
    for(let c=0;c<4;c++)for(let r=0;r<4;r++){
      o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
    }
    return o;
  },
  mCompose(q,t){ // rotation+translation
    const x=q[0],y=q[1],z=q[2],w=q[3];
    const x2=x+x,y2=y+y,z2=z+z, xx=x*x2,xy=x*y2,xz=x*z2, yy=y*y2,yz=y*z2,zz=z*z2, wx=w*x2,wy=w*y2,wz=w*z2;
    return [1-(yy+zz),xy+wz,xz-wy,0, xy-wz,1-(xx+zz),yz+wx,0, xz+wy,yz-wx,1-(xx+yy),0, t[0],t[1],t[2],1];
  },
  mApply(m,v){ return [m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12], m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]]; },
  mApplyRot(m,v){ return [m[0]*v[0]+m[4]*v[1]+m[8]*v[2], m[1]*v[0]+m[5]*v[1]+m[9]*v[2], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]]; },
  clamp:(v,a,b)=>v<a?a:(v>b?b:v),
  smooth(a,b,t){ const x=M.clamp((t-a)/(b-a),0,1); return x*x*(3-2*x); },
};

/* ---------- color helpers ---------- */
function hex2rgb(h){ const n=parseInt(h.slice(1),16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function shade(h,f){ const c=hex2rgb(h).map(v=>M.clamp(Math.round(v*f),0,255)); return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join(''); }
const HEXRE = /^#[0-9a-fA-F]{6}$/;

/* ---------- palettes ---------- */
const PAL = {
  skin:  ['#ffe3d0','#ffd6bd','#f7c5a8','#eab28e','#d49a72','#b97f59','#96603e','#6f4528'],
  hair:  ['#3a3a45','#5a4632','#8a5a2b','#b98a4a','#d9c08a','#e8e0d8','#7a3b3b','#a64d6d','#5d4a7a','#3d5a80','#3f6f5f','#c9577a'],
  eye:   ['#5a3825','#7a4a2a','#3d5a80','#3f6f5f','#7a4a8a','#a64d4d','#caa84a','#4a4a55'],
  cloth: ['#2f3a52','#5d4a7a','#3f6f5f','#8a3b4a','#27496d','#7a5230','#384048','#7d3c5e','#9a8c5a','#46627a'],
  accent:['#f2f2f2','#e8c84a','#d9534f','#00c4cc','#f0a0b8','#ffffff'],
};
// Human-readable color names keyed by hex (for aria-label in swatches)
const PAL_NAMES = {
  '#ffe3d0':{ja:'ä¹³ç½',en:'Porcelain'},'#ffd6bd':{ja:'ã¯ãªã¼ã ',en:'Cream'},'#f7c5a8':{ja:'ãã¼ã',en:'Peach'},
  '#eab28e':{ja:'ã¦ã©ã¼ã ãã¼ã¸ã¥',en:'Warm Beige'},'#d49a72':{ja:'ã«ã©ã¡ã«',en:'Caramel'},'#b97f59':{ja:'ãã©ã³ãã¿',en:'Terracotta'},
  '#96603e':{ja:'ã¢ã³ãã¼',en:'Amber'},'#6f4528':{ja:'ã¨ããã¼',en:'Ebony'},
  '#3a3a45':{ja:'ãªããã©ãã¯',en:'Off-black'},'#5a4632':{ja:'ãã¼ã¯ãã©ã¦ã³',en:'Dark Brown'},'#8a5a2b':{ja:'ãã§ã³ã¬ã¼ã',en:'Chocolate'},
  '#b98a4a':{ja:'ã­ã£ã©ã¡ã«',en:'Caramel'},'#d9c08a':{ja:'ã´ã¼ã«ãã³',en:'Golden'},'#e8e0d8':{ja:'ãã©ãã',en:'Platinum'},
  '#7a3b3b':{ja:'ãã¼ã¬ã³ãã£',en:'Burgundy'},'#a64d6d':{ja:'ã­ã¼ãº',en:'Rose'},'#5d4a7a':{ja:'ãã¼ãã«',en:'Purple'},
  '#3d5a80':{ja:'ããããã¤ããã«ã¼',en:'Midnight Blue'},'#3f6f5f':{ja:'ãã©ã¬ã¹ã',en:'Forest'},'#c9577a':{ja:'ãã¼ã³ã¿',en:'Magenta'},
  '#5a3825':{ja:'ãã¼ã¯ãã©ã¦ã³',en:'Dark Brown'},'#7a4a2a':{ja:'ã¢ã³ãã¼',en:'Amber'},
  '#7a4a8a':{ja:'ãã¤ãªã¬ãã',en:'Violet'},'#a64d4d':{ja:'ã¬ãã',en:'Red'},'#caa84a':{ja:'ã´ã¼ã«ã',en:'Gold'},'#4a4a55':{ja:'ã°ã¬ã¼',en:'Gray'},
  '#2f3a52':{ja:'ãã¤ãã¼',en:'Navy'},'#8a3b4a':{ja:'ãã¼ã¬ã³ãã£',en:'Burgundy'},'#27496d':{ja:'ã¹ãã¼ã«ãã«ã¼',en:'Steel Blue'},
  '#7a5230':{ja:'ãã©ã¦ã³',en:'Brown'},'#384048':{ja:'ãã£ã³ã¼ã«',en:'Charcoal'},'#7d3c5e':{ja:'ãã©ã ',en:'Plum'},
  '#9a8c5a':{ja:'ã«ã¼ã­',en:'Khaki'},'#46627a':{ja:'ã¹ã¬ã¼ã',en:'Slate'},
  '#f2f2f2':{ja:'ãªããã¯ã¤ã',en:'Off-white'},'#e8c84a':{ja:'ã´ã¼ã«ã',en:'Gold'},'#d9534f':{ja:'ã¬ãã',en:'Red'},
  '#00c4cc':{ja:'ãã£ã¼ã«',en:'Teal'},'#f0a0b8':{ja:'ãã³ã¯',en:'Pink'},'#ffffff':{ja:'ãã¯ã¤ã',en:'White'},
};

/* ---------- parameter schema (single source of truth) ----------
   kinds: num {min,max,def,step}, enum {opts,def}, bool {def}, color {def,pal} */
const PARAMS = {
  // ä½æ ¼
  height:    {k:'num', min:0.8, max:2.0, def:1.45, step:0.01, tab:'body', ja:'èº«é· (m)', en:'Height (m)'},
  headRatio: {k:'num', min:0.18, max:0.36, def:0.24, step:0.005, tab:'body', ja:'é ­ã®æ¯ç', en:'Head ratio'},
  shoulderW: {k:'num', min:0.14, max:0.34, def:0.21, step:0.005, tab:'body', ja:'è©å¹', en:'Shoulders'},
  hipW:      {k:'num', min:0.14, max:0.34, def:0.215, step:0.005, tab:'body', ja:'è°å¹', en:'Hips'},
  bust:      {k:'num', min:0, max:1, def:0.25, step:0.01, tab:'body', ja:'è¸', en:'Bust'},
  armLen:    {k:'num', min:0.8, max:1.2, def:1.0, step:0.01, tab:'body', ja:'èã®é·ã', en:'Arm length'},
  legLen:    {k:'num', min:0.8, max:1.2, def:1.0, step:0.01, tab:'body', ja:'èã®é·ã', en:'Leg length'},
  armTh:     {k:'num', min:0.7, max:1.5, def:1.0, step:0.01, tab:'body', adv:1, ja:'èã®å¤ªã', en:'Arm width'},
  legTh:     {k:'num', min:0.7, max:1.5, def:1.0, step:0.01, tab:'body', adv:1, ja:'èã®å¤ªã', en:'Leg width'},
  // é¡
  eyeSize:   {k:'num', min:0.6, max:1.4, def:1.0, step:0.01, tab:'face', ja:'ç®ã®å¤§ãã', en:'Eye size'},
  eyeY:      {k:'num', min:0, max:1, def:0.5, step:0.01, tab:'face', ja:'ç®ã®é«ã', en:'Eye height'},
  eyeGap:    {k:'num', min:0, max:1, def:0.5, step:0.01, tab:'face', ja:'ç®ã®éé', en:'Eye gap'},
  eyeShape:  {k:'enum', opts:['round','tare','tsuri','jito'], def:'round', tab:'face', ja:'ç®ã®å½¢', en:'Eye shape'},
  irisSize:  {k:'num', min:0.6, max:1.2, def:0.92, step:0.01, tab:'face', adv:1, ja:'ç³ã®å¤§ãã', en:'Iris size'},
  browType:  {k:'enum', opts:['soft','straight','arch'], def:'soft', tab:'face', ja:'ç', en:'Brows'},
  mouthW:    {k:'num', min:0.6, max:1.5, def:1.0, step:0.01, tab:'face', ja:'å£ã®å¹', en:'Mouth width'},
  blush:     {k:'num', min:0, max:1, def:0.45, step:0.01, tab:'face', ja:'é ¬ç´', en:'Blush'},
  // é«ª
  hairStyle: {k:'enum', opts:['short','bob','long','twin','pony'], def:'twin', tab:'hair', ja:'é«ªå', en:'Hair style'},
  bangs:     {k:'enum', opts:['full','see','center'], def:'full', tab:'hair', ja:'åé«ª', en:'Bangs'},
  hairLen:   {k:'num', min:0.7, max:1.4, def:1.0, step:0.01, tab:'hair', ja:'é«ªã®é·ã', en:'Hair length'},
  hairVol:   {k:'num', min:0.8, max:1.3, def:1.0, step:0.01, tab:'hair', ja:'ããªã¥ã¼ã ', en:'Volume'},
  ahoge:     {k:'bool', def:true, tab:'hair', ja:'ã¢ãæ¯', en:'Ahoge'},
  // æ
  outfit:    {k:'enum', opts:['onepiece','sailor','shirts','hoodie'], def:'sailor', tab:'outfit', ja:'è¡£è£', en:'Outfit'},
  skirtLen:  {k:'num', min:0.6, max:1.6, def:1.0, step:0.01, tab:'outfit', ja:'ã¹ã«ã¼ãä¸', en:'Skirt length'},
  sleeves:   {k:'enum', opts:['long','short'], def:'long', tab:'outfit', ja:'è¢', en:'Sleeves'},
  socks:     {k:'bool', def:true, tab:'outfit', adv:1, ja:'ã½ãã¯ã¹', en:'Socks'},
  // è²
  skinTone:  {k:'color', def:'#ffd6bd', pal:'skin',  tab:'color', ja:'è', en:'Skin'},
  hairColor: {k:'color', def:'#5d4a7a', pal:'hair',  tab:'color', ja:'é«ª', en:'Hair'},
  eyeColor:  {k:'color', def:'#3d5a80', pal:'eye',   tab:'color', ja:'ç³', en:'Eyes'},
  clothMain: {k:'color', def:'#2f3a52', pal:'cloth', tab:'color', ja:'æã¡ã¤ã³', en:'Cloth main'},
  clothSub:  {k:'color', def:'#f2f2f2', pal:'accent',tab:'color', ja:'æãµã', en:'Cloth sub'},
  clothAccent:{k:'color',def:'#d9534f', pal:'accent',tab:'color', ja:'ã¢ã¯ã»ã³ã', en:'Accent'},
  shoeColor: {k:'color', def:'#384048', pal:'cloth', tab:'color', ja:'é´', en:'Shoes'},
  // technical toggle (like springOff) â export-only, excluded from gacha randomization
  outline:   {k:'bool', def:false, tab:'color', adv:1, ja:'ã¢ã¦ãã©ã¤ã³', en:'Outline'},
  // ç©ç
  springOff: {k:'bool', def:false, tab:'phys', ja:'æºãç©ãªã (Quest Excellent)', en:'No springs (Quest Excellent)'},
  hairStiff: {k:'num', min:0, max:1, def:0.65, step:0.01, tab:'phys', ja:'é«ªã®ç¡¬ã', en:'Hair stiffness'},
  hairGrav:  {k:'num', min:0, max:1, def:0.05, step:0.01, tab:'phys', ja:'éå', en:'Gravity'},
  hairDrag:  {k:'num', min:0, max:1, def:0.4, step:0.01, tab:'phys', ja:'æ¸è¡°', en:'Drag'},
};

// Round 503: single source of truth for "which outfits render a skirt mesh". Previously
// build/11-core-b.js's hasSkirt (geometry: does this outfit get the skirt latheY()) and
// build/20-app.js's skirtLen-row visibility check were two independently hand-written literals
// that happened to agree today but had nothing forcing them to stay in sync â the only existing
// test (tests/run.js, pre-Round-503) checked that the substrings 'skirtLen'/'onepiece'/'sailor'
// merely appeared in the file, not that the two lists were actually equal to each other.
const SKIRT_OUTFITS = ['onepiece','sailor'];
const hasSkirt = outfit => SKIRT_OUTFITS.includes(outfit);
function defaults(){ const p={}; for(const k in PARAMS) p[k]=PARAMS[k].def; return p; }

function sanitize(p){
  const o=defaults();
  if (!p || typeof p!=='object') return o;
  for(const k in PARAMS){
    const s=PARAMS[k], v=p[k];
    if (v===undefined) continue;
    if (s.k==='num'){ const n=Number(v); if (Number.isFinite(n)) o[k]=M.clamp(n,s.min,s.max); }
    else if (s.k==='enum'){ if (s.opts.includes(v)) o[k]=v; }
    else if (s.k==='bool'){ o[k]=!!v; }
    else if (s.k==='color'){ if (typeof v==='string' && HEXRE.test(v)) o[k]=v.toLowerCase(); }
  }
  return o;
}

/* ---------- presets ---------- */
const PRESETS = [
  {id:'suzume', ja:'ããã', en:'Suzume', p:{}},
  {id:'kohaku', ja:'ãã¯ã', en:'Kohaku', p:{hairStyle:'bob', outfit:'onepiece', hairColor:'#8a5a2b', eyeColor:'#caa84a', clothMain:'#8a3b4a', clothSub:'#f2f2f2', clothAccent:'#e8c84a', bangs:'see', blush:0.6}},
  {id:'aoi', ja:'ããã', en:'Aoi', p:{hairStyle:'long', outfit:'shirts', hairColor:'#3a3a45', eyeColor:'#3d5a80', clothMain:'#27496d', clothSub:'#ffffff', clothAccent:'#00c4cc', bangs:'center', eyeShape:'tsuri', blush:0.2}},
  {id:'tsumugi', ja:'ã¤ãã', en:'Tsumugi', p:{hairStyle:'pony', outfit:'hoodie', hairColor:'#c9577a', eyeColor:'#7a4a8a', clothMain:'#5d4a7a', clothSub:'#f0a0b8', clothAccent:'#f2f2f2', eyeShape:'tare', mouthW:1.1, blush:0.65}},
  {id:'minato', ja:'ã¿ãªã¨', en:'Minato', p:{hairStyle:'short', outfit:'shirts', bust:0, shoulderW:0.24, hipW:0.19, hairColor:'#3f6f5f', eyeColor:'#4a4a55', clothMain:'#384048', clothSub:'#f2f2f2', clothAccent:'#00c4cc', eyeShape:'jito', blush:0, ahoge:false, skirtLen:0.6}},
  {id:'chibi', ja:'ã¡ã³', en:'Chibi', p:{height:1.0, headRatio:0.34, outfit:'onepiece', hairColor:'#d9c08a', eyeColor:'#3f6f5f', clothMain:'#3f6f5f', clothSub:'#f2f2f2', clothAccent:'#e8c84a', eyeSize:1.25, blush:0.7, legLen:0.85, armLen:0.9}},
];
function presetParams(pre){ return sanitize(Object.assign(defaults(), pre.p)); }

/* ---------- random (mulberry32) ---------- */
function rng(seed){ let a=seed>>>0; return ()=>{ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function randomParams(seed){
  const r = rng(seed===undefined ? (Math.random()*1e9)|0 : seed);
  const pick = arr=>arr[(r()*arr.length)|0];
  const p = defaults();
  for(const k in PARAMS){
    const s=PARAMS[k];
    if (s.k==='num'){
      let lo=s.min, hi=s.max;
      if (k==='height'){lo=1.15;hi=1.75;} if (k==='headRatio'){lo=0.21;hi=0.30;}
      p[k]=Math.round((lo+(hi-lo)*r())/s.step)*s.step;
      p[k]=M.clamp(Number(p[k].toFixed(4)),s.min,s.max);
    }
    else if (s.k==='enum') p[k]=pick(s.opts);
    else if (s.k==='bool' && k!=='springOff' && k!=='outline') p[k]=r()<0.5;
    else if (s.k==='color') p[k]=pick(PAL[s.pal]);
  }
  p.springOff=false;
  p.outline=false;
  return sanitize(p);
}

/* ---------- i18n ---------- */
const I18N = {
  ja: {
    'tab.preset':'ããªã»ãã','tab.body':'ä½æ ¼','tab.face':'é¡','tab.hair':'é«ª','tab.outfit':'æ','tab.color':'è²','tab.phys':'ç©ç','tab.out':'åºå',
    'btn.gacha':'ã¬ãã£ï¼ã©ã³ãã çæï¼','gacha.lock':'ã­ãã¯å¯¾è±¡','gacha.lock.hint':'ã­ãã¯ããé ç®ã¯åçæã®å¯¾è±¡å¤ã«ãªãã¾ã','a11y.gachaRanPartial':'ã¬ãã£ â ä¸é¨ã®é ç®ãã­ãã¯ãã¦çæãã¾ãã','gacha.seed':'ã·ã¼ã: ','gacha.seed.ph':'ã·ã¼ãçªå·ãå¥åãã¦åå®è¡','btn.copySeed':'ã³ãã¼','btn.copySeed.err':'ã·ã¼ãã®ã³ãã¼ã«å¤±æãã¾ãã','btn.copyLink':'ãªã³ã¯ãã³ãã¼','btn.copyLink.err':'ãªã³ã¯ã®ã³ãã¼ã«å¤±æãã¾ãã','a11y.linkCopied':'å±æãªã³ã¯ãã¯ãªãããã¼ãã«ã³ãã¼ãã¾ãã','btn.copied':'â ã³ãã¼æ¸','btn.export':'VRM æ¸ãåºã','btn.exporting':'æ¸ãåºãä¸­â¦','btn.exported':'â æ¸ãåºãå®äº','btn.saveJson':'ãã©ã¡ã¼ã¿ä¿å­ (.json)','btn.copyJson':'ã¯ãªãããã¼ãã«ã³ãã¼','btn.copyJson.err':'ã¯ãªãããã¼ãã¸ã®ã³ãã¼ã«å¤±æãã¾ãã','btn.copyJsonDone':'â ã³ãã¼æ¸','btn.pasteJson':'ã¯ãªãããã¼ãããè²¼ãä»ã','btn.pasteJson.ok':'â è²¼ãä»ãã¾ãã','btn.pasteJson.err':'ã¯ãªãããã¼ãã®åå®¹ãä¸æ­£ã§ã','btn.loadJson':'ãã©ã¡ã¼ã¿èª­è¾¼','btn.reset':'åæå','btn.reset.confirm':'åæåãã¾ããï¼å¤æ´ã¯å¤±ããã¾ãã','a11y.resetDone':'åæåãã¾ãã','a11y.resetCancelled':'åæåãã­ã£ã³ã»ã«ãã¾ãã','btn.revert':'âº {p} ã«æ»ã','btn.screenshot':'PNG','btn.screenshot.tip':'ã¹ã¯ãªã¼ã³ã·ã§ãããä¿å­ï¼Ctrl/â+Shift+Pï¼','btn.lang.tip':'è¨èªåæ¿ â ã¯ãªãã¯ã§ English ã«åæ¿','hint.ctrlS':'Ctrl/â+S â VRMæ¸ãåºã / Ctrl/â+Shift+S â JSONä¿å­ / Ctrl/â+Z â åã«æ»ã / Ctrl/â+Shift+Z â ããç´ã / Ctrl/â+Shift+P â PNG / M â ãããã/è©³ç´°åæ¿ / ? â ãã«ã / 1ã8 â ã¿ãåæ¿',
    'mode.easy':'ãããã','mode.detail':'è©³ç´°','mode.easy.tip':'ããããã¢ã¼ã: åºæ¬ãã©ã¡ã¼ã¿ã®ã¿è¡¨ç¤º','mode.detail.tip':'è©³ç´°ã¢ã¼ã: å¨ãã©ã¡ã¼ã¿ãè¡¨ç¤º',
    'out.meta':'ã¡ã¿æå ±','out.stats':'çµ±è¨','out.title':'ã¿ã¤ãã«','out.version':'ãã¼ã¸ã§ã³','out.author':'ä½è','out.contact':'é£çµ¡å','out.reference':'åç§å','out.filename':'ãã¡ã¤ã«å','out.license':'ã©ã¤ã»ã³ã¹','out.allowed':'ä½¿ç¨è¨±å¯','out.commercial':'åç¨å©ç¨','out.violent':'æ´åè¡¨ç¾','out.sexual':'æ§çè¡¨ç¾',
    'out.version.ph':'ä¾: 1.0','out.contact.ph':'ä¾: https://example.com','out.reference.ph':'ä¾: ãªãªã¸ãã«ã¢ãã¿ã¼',
    'out.license.url':'ã©ã¤ã»ã³ã¹ URLï¼Other é¸ææï¼','out.license.url.ph':'ä¾: https://example.com/license',
    'st.tris':'ä¸è§å½¢','st.bones':'ãã¼ã³','st.mat':'ãããªã¢ã«','st.mesh':'ã¹ã­ã³ã¡ãã·ã¥','st.spring':'æºãç©ãã¼ã³','st.chains':'æºãç©ãã§ã¼ã³','st.tex':'ãã¯ã¹ãã£æ¨å®',
    'rank.Excellent':'Excellent','rank.Good':'Good','rank.Medium':'Medium','rank.Poor':'Poor','rank.VeryPoor':'Very Poor',
    'rank.tip.Excellent':'å¨ã¦ã¼ã¶ã¼ã«ããã©ã«ãè¡¨ç¤º','rank.tip.Good':'Goodä»¥ä¸ãè¨±å¯ããã¦ã¼ã¶ã¼ã«è¡¨ç¤º','rank.tip.Medium':'Mediumä»¥ä¸ãè¨±å¯ããã¦ã¼ã¶ã¼ã®ã¿è¡¨ç¤º','rank.tip.Poor':'Poorä»¥ä¸ãè¨±å¯ããã¦ã¼ã¶ã¼ã®ã¿è¡¨ç¤º','rank.tip.VeryPoor':'ã»ã¼å¨ã¦ã¼ã¶ã¼ã«éè¡¨ç¤º',
    'hint.exprOff':'ã¯ãªãã¯ã§è§£é¤','hint.drag':'ãã©ãã°/ç¢å°ã­ã¼: åè»¢ / Shift+ââ: ãã³ / ãã¤ã¼ã«ã»+â: ãºã¼ã  / ããã«ã¯ãªãã¯ã»Home/0: ãªã»ãã','hint.undoReady':'Ctrl+Z / â+Z â åã«æ»ã','hint.redoReady':'Ctrl+Shift+Z / â+Shift+Z â ããç´ã','hint.saved':'â èªåä¿å­','hint.sliderReset':'ããã«ã¯ãªãã¯ã¾ãã¯ Delete / Backspace ã­ã¼ã§ããã©ã«ãå¤ã«æ»ã',
    'hint.saveFail':'â  ä¿å­å¤±æ â JSONãæåã§ä¿å­ãã¦ãã ãã','hint.exportCorrupt':'â  VRMãã¡ã¤ã«ãç ´æãã¦ãã¾ã â ããä¸åº¦æ¸ãåºãã¦ãã ãã','hint.dropJson':'ã¾ãã¯ .hina.json ãã¡ã¤ã«ãããã«ãã©ãã°ï¼ãã­ãã',
    'hint.noGL':'WebGL ãä½¿ãã¾ãã â ãã¬ãã¥ã¼ç¡å¹ï¼æ¸ãåºãã¯åä½ãã¾ãï¼',
    'hint.glLost':'WebGL ã³ã³ãã­ã¹ããå¤±ããã¾ãã â ãã¼ã¸ãåèª­ã¿è¾¼ã¿ãã¦ãã ãã',
    'a11y.canvas':'ã¢ãã¿ã¼ã®3Dãã¬ãã¥ã¼ãç¢å°ã­ã¼ã§åè»¢ãShift+ââã§ãã³ãï¼ï¼âã§ãºã¼ã ãHomeã¾ãã¯ããã«ã¯ãªãã¯ã§åæä½ç½®ã«æ»ãã¾ãã',
    'a11y.tabs':'ã¿ãããã²ã¼ã·ã§ã³','a11y.exprBar':'è¡¨æãã¬ãã¥ã¼','a11y.sliderReset':'{label} ãããã©ã«ãå¤ {v} ã«ãªã»ãããã¾ãã','a11y.numIn':'{label}ï¼æ°å¤å¥åï¼',
    'a11y.stage':'3Dãã¬ãã¥ã¼ã¨ãªã¢','a11y.panel':'ã¢ãã¿ã¼è¨­å®ããã«','a11y.about.btn':'éã«ã¤ãã¦','a11y.canvas.role':'3Dãã¬ãã¥ã¼',
    'a11y.exprActive':'è¡¨æ: {expr}','a11y.exprNeutral':'ãã¥ã¼ãã©ã«ã«æ»ãã¾ãã',
    'a11y.rankStatus':'æ§è½ã©ã³ã¯ â PC: {pc} / Quest: {q}',
    'a11y.rankBadge':'ã©ã³ã¯ããã¸ â ã¯ãªãã¯ã§çµ±è¨ã¿ãã¸','a11y.skip':'ã³ã³ãã³ãã¸ã¹ã­ãã',
    'a11y.exported':'{name} ãæ¸ãåºãã¾ããï¼ç´{size}ï¼','a11y.screenshotDone':'ã¹ã¯ãªã¼ã³ã·ã§ãããä¿å­ãã¾ãã','a11y.screenshotShared':'ã¹ã¯ãªã¼ã³ã·ã§ãããå±æãã¾ãã','a11y.seedCopied':'ã·ã¼ã {n} ãã¯ãªãããã¼ãã«ã³ãã¼ãã¾ãã','a11y.gachaRan':'ã¬ãã£ â ã·ã¼ã {n} ã§çæãã¾ãã','a11y.undone':'åã«æ»ãã¾ãã','a11y.noUndo':'åã«æ»ãå±¥æ­´ãããã¾ãã','a11y.redone':'ããç´ãã¾ãã','a11y.noRedo':'ããç´ãå±¥æ­´ãããã¾ãã','a11y.savedJson':'{name} ãä¿å­ãã¾ãã','a11y.loadedJson':'{name} ãèª­ã¿è¾¼ã¿ã¾ãã','a11y.clamped':'å¤ã {v} ã«å¶éãã¾ãã','a11y.viewReset':'ãã¬ãã¥ã¼è¦ç¹ããªã»ãããã¾ãã','a11y.viewLimit':'è¦ç¹ã®éçã«éãã¾ãã','a11y.seedInvalid':'ã·ã¼ãã¯0ä»¥ä¸ã®æ´æ°ãå¥åãã¦ãã ãã','a11y.licUrlInvalid':'æå¹ãªURLãå¥åãã¦ãã ããï¼ä¾: https://example.comï¼',
    'note.quest':'æºãç©ãªãã§ Quest Excellentããªã³ã®å ´åã¯ Quest Goodã','note.quest.nospring':'ãã®é«ªåã§ã¯æºãç©ãã¼ã³ãããã¾ããï¼å¸¸ã« Quest Excellentï¼ã','note.springOff':'æºãç©ãªãä¸­ï¼ã¹ã©ã¤ãã¼ã¯éè¡¨ç¤ºããªã³ã«ããã¨è¡¨ç¤ºããã¾ãã',
    'note.outline':'ã¢ã¦ãã©ã¤ã³ã¯PCçã§ã®ã¿è¡¨ç¤ºããã¾ãï¼Questã®ã·ã§ã¼ãã¼ã¯éå¯¾å¿ï¼ã',
    'about':'ãã©ã¦ã¶ã ãã§VRChatç¨ã¢ãã¿ã¼(VRM 0.x)ãä½ããã¼ã«ãå®å¨ã­ã¼ã«ã«åä½ã»å¤é¨éä¿¡ãªãã»ä¾å­ã¼ã­ã','about.close':'éãã',
    'about.keys':'ã­ã¼ãã¼ãã·ã§ã¼ãã«ãã','about.keyList':'Ctrl/â+S             â VRMæ¸ãåºã\nCtrl/â+Shift+S       â JSONä¿å­\nCtrl/â+Z             â åã«æ»ã\nCtrl/â+Shift+Z       â ããç´ã\nCtrl/â+Shift+P       â ã¹ã¯ãªã¼ã³ã·ã§ãã\n?                    â ãã®ãã¤ã¢ã­ã°\nM                    â ãããã/è©³ç´° åæ¿\n1ã8                 â ã¿ãåæ¿\nEsc                  â è¡¨æãã¬ãã¥ã¼ãè§£é¤\nââââ              â 3Dåè»¢ï¼ãã¬ãã¥ã¼é¸ææï¼\nShift+ââ           â ä¸ä¸ãã³ï¼é¡ã»è¶³ãç¢ºèªï¼\n+/â                 â ãºã¼ã \nHome / 0             â è¦ç¹ãªã»ãã\nããã«ã¯ãªãã¯       â ãã¬ãã¥ã¼: è¦ç¹ãªã»ãã / ã¹ã©ã¤ãã¼: ããã©ã«ãå¤\nDelete / Backspace   â ã¹ã©ã¤ãã¼: ããã©ã«ãå¤ã«ãªã»ãã',
    'allowed.OnlyAuthor':'ä½èã®ã¿','allowed.ExplicitlyLicensedPerson':'è¨±å¯ãããäºº','allowed.Everyone':'å¨å¡',
    'usage.Disallow':'ä¸å¯','usage.Allow':'å¯',
    'license.Redistribution_Prohibited':'åéå¸ç¦æ­¢','license.CC0':'CC0ï¼ãããªãã¯ãã¡ã¤ã³ï¼',
    'license.CC_BY':'CC BY','license.CC_BY_NC':'CC BY-NC','license.CC_BY_SA':'CC BY-SA',
    'license.CC_BY_NC_SA':'CC BY-NC-SA','license.CC_BY_ND':'CC BY-ND','license.CC_BY_NC_ND':'CC BY-NC-ND','license.Other':'ãã®ä»',
    'out.title.ph':'ä¾: éã¢ãã¿ã¼','out.author.ph':'ä¾: ããªãã®åå',
    'selftest.ok':'èªå·±è¨ºæ­: å¨ã¦æ­£å¸¸','selftest.ng':'èªå·±è¨ºæ­: ç°å¸¸ãã','selftest.count':'{pass}/{total} é ç®',
    'err.loadFailed':'JSONãã¡ã¤ã«ãèª­ã¿è¾¼ãã¾ããã§ããï¼å½¢å¼ãä¸æ­£ããéã®JSONã§ã¯ããã¾ããï¼',
    'err.loadTooLarge':'ãã¡ã¤ã«ãå¤§ãããã¾ãï¼2 MBä»¥ä¸ã®JSONã®ã¿èª­ã¿è¾¼ãã¾ãï¼',
    'err.buildFailed':'ã¢ãã¿ã¼çæã«å¤±æãã¾ãã',
    'err.exportFailed':'VRMæ¸ãåºãã«å¤±æãã¾ãã',
    'err.screenshotFailed':'ã¹ã¯ãªã¼ã³ã·ã§ããã®ä¿å­ã«å¤±æãã¾ãã',
    'err.unexpected':'äºæããªãã¨ã©ã¼ãçºçãã¾ãã',
    'guide.t':'VRChatå°å¥æé ','guide.s1':'1. Unity Hub + VCC ã§ã¢ãã¿ã¼ãã­ã¸ã§ã¯ãä½æ','guide.s2':'2. UniVRM (v0.x) ãã¤ã³ãã¼ã','guide.s3':'3. VRM Converter for VRChat ãã¤ã³ãã¼ã','guide.s4':'4. .vrm ããã©ãã° âãVRChatã¢ãã¿ã¼ã«å¤æã','guide.s5':'5. VRChat SDK ã§ãã«ã & ã¢ããã­ã¼ã',
    // Round 512: the app ships as a single index.html, so a user who downloaded only that file
    // does NOT have docs/UPLOAD_GUIDE.md. These make the in-app guide self-sufficient.
    'guide.pre':'ç¨æãããã®','guide.pre1':'VRChatã¢ã«ã¦ã³ãï¼Trust Rank ã New User ä»¥ä¸ãVisitor ã¯ã¢ããã­ã¼ãä¸å¯ãæ°æ¥ãã¬ã¤ã§ææ ¼ï¼','guide.pre2':'Windows PCï¼Unityä½æ¥­ã«å¿è¦ãã¢ãã¿ã¼ã®è¨­è¨ã ããªãã¹ããã§ãå¯ï¼',
    'guide.dl':'å¥æåï¼URLãé¸æãã¦ã³ãã¼ï¼','guide.dl.vcc':'VCC (VRChat Creator Companion)','guide.dl.univrm':'UniVRMï¼VRM 0.x ç³»ã® .unitypackageï¼','guide.dl.conv':'VRM Converter for VRChat',
    'guide.tr':'ã¤ã¾ãããã','guide.tr1':'ã¢ããã­ã¼ããã¿ã³ãæ¼ããªã â Trust Rank ã Visitorãæ°æ¥ãã¬ã¤ãã¦ New User ã«ãªãã®ãå¾ã¤','guide.tr2':'Quest ã§ãVery Poorãè­¦å â ç©çã¿ãã®ãæºãç©ãªããã§åæ¸ãåºãï¼PCçã®ã¿ãªãè­¦åã®ã¾ã¾é²ãã¦ãå¯ï¼','guide.tr3':'ã¢ãã«ããã³ã¯è²ã«ãªã â ã·ã§ã¼ãã¼æªå°å¥ãUniVRM ãåã«å¥ãã¦ãã .vrm ãåãè¾¼ã','guide.tr4':'ä»ã®ãã¥ã¼ã¢ã§å¾ããåã â VRM 0.x ä»æ§ï¼Z-åãï¼ãUnity / VRChat ã§ã¯æ­£å¸¸',
    'guide.ver':'æé ã¯2026å¹´7ææç¹ãåãã¼ã«ã®UIã¯æ´æ°ããããããç¸éãããã°å¬å¼ãã­ã¥ã¡ã³ããæ­£ã¨ããã',
    // Round 513: the rank estimator diagnosed but could not act â the sole remedy for a
    // non-Excellent Quest rank is springOff, which lives on the Physics tab.
    'btn.questFix':'Quest Excellent ã«ãã','btn.questFix.tip':'é«ªã®æºãããªãã«ãã¦ Quest Excellent ã«ãã¾ãï¼Ctrl+Z ã§åãæ¶ãã¾ãï¼','a11y.questFixed':'æºãç©ããªãã«ãã¾ãã â Quest Excellent ã«ãªãã¾ãã',
    'rank.limit':'å¾é',
    'enum.eyeShape.round':'ä¸¸','enum.eyeShape.tare':'ããç®','enum.eyeShape.tsuri':'ã¤ãç®','enum.eyeShape.jito':'ãã¨ç®',
    'enum.browType.soft':'ãããã','enum.browType.straight':'ã¾ã£ãã','enum.browType.arch':'ã¢ã¼ã',
    'enum.hairStyle.short':'ã·ã§ã¼ã','enum.hairStyle.bob':'ãã','enum.hairStyle.long':'ã­ã³ã°','enum.hairStyle.twin':'ãã¤ã³','enum.hairStyle.pony':'ããã¼',
    'enum.bangs.full':'ãã«','enum.bangs.see':'ã·ã¼ã¹ã«ã¼','enum.bangs.center':'ã»ã³ã¿ã¼åã',
    'enum.outfit.onepiece':'ã¯ã³ãã¼ã¹','enum.outfit.sailor':'ã»ã¼ã©ã¼','enum.outfit.shirts':'ã·ã£ã','enum.outfit.hoodie':'ãã¼ã«ã¼',
    'enum.sleeves.long':'é·è¢','enum.sleeves.short':'åè¢',
    'cat.tris':'ä¸è§å½¢','cat.bones':'ãã¼ã³','cat.skinned':'ã¹ã­ã³ã¡ãã·ã¥','cat.mesh':'ã¡ãã·ã¥','cat.mat':'ãããªã¢ã«','cat.pbComp':'æºãç©é¨å','cat.pbTrans':'æºãç©ãã¼ã³','cat.pbCol':'ã³ã©ã¤ã','cat.pbCheck':'è¡çªå¤å®','cat.texMB':'ãã¯ã¹ãã£','cat.raycasts':'ã¬ã¤ã­ã£ã¹ã',
    'st.vrm':'VRMãµã¤ãºæ¨å®',
    'note.upload':'VRChatã¸ã¯ Unity + VRM Converter for VRChat çµç±ã§ã¢ããã­ã¼ããä»¥ä¸ã®æé ãåç§ã',
    'expr.neutral':'ãã¥ã¼ãã©ã«','expr.a':'ã','expr.i':'ã','expr.u':'ã','expr.e':'ã','expr.o':'ã',
    'expr.blink':'ã¾ã°ãã','expr.joy':'åã³','expr.angry':'æã','expr.sorrow':'æ²ãã¿','expr.fun':'æ¥½ãã',
    'expr.edit':'è¡¨æã¨ãã£ã¿','expr.edit.hint':'åã³ã»æãã»æ²ãã¿ã»æ¥½ããã®4è¡¨æããåºæ¬ã¢ã¼ãã®çµã¿åããã§èª¿æ´ã§ãã¾ãï¼ããã ã¯ãªããã·ã³ã¯ç¨ã®ããç·¨éä¸å¯ï¼',
    'expr.reset':'ããã©ã«ãã«æ»ã','expr.customized':'ã«ã¹ã¿ã æ¸',
    'a11y.exprMix':'{expr} â {morph} ã®å¼·åº¦','a11y.exprReset':'{expr} ãããã©ã«ãã«æ»ãã¾ãã',
    'lbl.height':'é«ã',
  },
  en: {
    'tab.preset':'Presets','tab.body':'Body','tab.face':'Face','tab.hair':'Hair','tab.outfit':'Outfit','tab.color':'Colors','tab.phys':'Physics','tab.out':'Export',
    'btn.gacha':'Gacha (randomize)','gacha.lock':'Lock categories','gacha.lock.hint':'Locked categories are excluded from the reroll','a11y.gachaRanPartial':'Gacha â rerolled with some categories locked','gacha.seed':'Seed: ','gacha.seed.ph':'Enter seed to replay','btn.copySeed':'Copy','btn.copySeed.err':'Failed to copy seed','btn.copyLink':'Copy link','btn.copyLink.err':'Failed to copy link','a11y.linkCopied':'Share link copied to clipboard','btn.copied':'â Copied','btn.export':'Export VRM','btn.exporting':'Exportingâ¦','btn.exported':'â Exported','btn.saveJson':'Save params (.json)','btn.copyJson':'Copy to clipboard','btn.copyJson.err':'Failed to copy to clipboard','btn.copyJsonDone':'â Copied','btn.pasteJson':'Paste from clipboard','btn.pasteJson.ok':'â Pasted','btn.pasteJson.err':'Clipboard content is not valid Hina JSON','btn.loadJson':'Load params','btn.reset':'Reset','btn.reset.confirm':'Reset to defaults? All changes will be lost.','a11y.resetDone':'Avatar reset to defaults','a11y.resetCancelled':'Reset cancelled','btn.revert':'âº Revert to {p}','btn.screenshot':'PNG','btn.screenshot.tip':'Save screenshot (Ctrl/â+Shift+P)','btn.lang.tip':'Switch language â click for æ¥æ¬èª','hint.ctrlS':'Ctrl/â+S â Export VRM / Ctrl/â+Shift+S â Save JSON / Ctrl/â+Z â Undo / Ctrl/â+Shift+Z â Redo / Ctrl/â+Shift+P â PNG / M â Easy/Detail toggle / ? â Help / 1-8 â Switch tab',
    'mode.easy':'Easy','mode.detail':'Detail','mode.easy.tip':'Easy mode: basic params only','mode.detail.tip':'Detail mode: all params shown',
    'out.meta':'Metadata','out.stats':'Stats','out.title':'Title','out.version':'Version','out.author':'Author','out.contact':'Contact','out.reference':'Reference','out.filename':'File name','out.license':'License','out.allowed':'Allowed users','out.commercial':'Commercial','out.violent':'Violence','out.sexual':'Sexual',
    'out.version.ph':'e.g. 1.0','out.contact.ph':'e.g. https://example.com','out.reference.ph':'e.g. Original avatar',
    'out.license.url':'License URL (when Other)','out.license.url.ph':'e.g. https://example.com/license',
    'st.tris':'Triangles','st.bones':'Bones','st.mat':'Materials','st.mesh':'Skinned meshes','st.spring':'Spring bones','st.chains':'Spring chains','st.tex':'Texture est.',
    'rank.Excellent':'Excellent','rank.Good':'Good','rank.Medium':'Medium','rank.Poor':'Poor','rank.VeryPoor':'Very Poor',
    'rank.tip.Excellent':'Visible to all users by default','rank.tip.Good':'Visible to users allowing Good+','rank.tip.Medium':'Visible only to users allowing Medium+','rank.tip.Poor':'Visible only to users allowing Poor+','rank.tip.VeryPoor':'Hidden for most users',
    'hint.exprOff':'click to deactivate','hint.drag':'Drag/Arrows: rotate / Shift+ââ: pan / Wheel Â· +â: zoom / Double-click Â· Home/0: reset','hint.undoReady':'Ctrl+Z / â+Z â Undo','hint.redoReady':'Ctrl+Shift+Z / â+Shift+Z â Redo','hint.saved':'â Auto-saved','hint.sliderReset':'Double-click or Delete/Backspace to reset to default',
    'hint.saveFail':'â  Save failed â export JSON manually to keep your work','hint.exportCorrupt':'â  VRM file is corrupt â please export again','hint.dropJson':'or drag & drop a .hina.json file anywhere on the page',
    'hint.noGL':'WebGL unavailable â preview disabled (export still works)',
    'hint.glLost':'WebGL context lost â reload to restore preview',
    'a11y.canvas':'3D preview of your avatar. Arrow keys rotate, Shift+â/â pan, +/â zoom, Home or double-click reset the view.',
    'a11y.tabs':'Tab navigation','a11y.exprBar':'Expression preview','a11y.sliderReset':'{label} reset to default {v}','a11y.numIn':'{label} (numeric entry)',
    'a11y.stage':'3D preview area','a11y.panel':'Avatar settings panel','a11y.about.btn':'About Hina','a11y.canvas.role':'3D preview',
    'a11y.exprActive':'Expression: {expr}','a11y.exprNeutral':'Returned to neutral',
    'a11y.rankStatus':'Performance â PC: {pc} / Quest: {q}',
    'a11y.rankBadge':'Rank badge â click to open Stats tab','a11y.skip':'Skip to content',
    'a11y.exported':'Exported {name} (~{size})','a11y.screenshotDone':'Screenshot saved','a11y.screenshotShared':'Screenshot shared','a11y.seedCopied':'Seed {n} copied to clipboard','a11y.gachaRan':'Gacha â generated with seed {n}','a11y.undone':'Undone','a11y.noUndo':'Nothing to undo','a11y.redone':'Redone','a11y.noRedo':'Nothing to redo','a11y.savedJson':'Saved {name}','a11y.loadedJson':'Loaded {name}','a11y.clamped':'Value clamped to {v}','a11y.viewReset':'Preview view reset','a11y.viewLimit':'View limit reached','a11y.seedInvalid':'Seed must be a non-negative integer','a11y.licUrlInvalid':'Enter a valid URL (e.g. https://example.com)',
    'note.quest':'Springs OFF â Quest Excellent. ON â Quest Good.','note.quest.nospring':'No spring bones for this hair style (always Quest Excellent).','note.springOff':'Springs are OFF â sliders hidden. Enable springs above to show them.',
    'note.outline':'The outline only renders on PC â Quest\'s shader does not support it.',
    'about':'Make a VRChat-ready avatar (VRM 0.x) in your browser. Fully local, zero network, zero dependencies.','about.close':'Close',
    'about.keys':'Keyboard shortcuts','about.keyList':'Ctrl/â+S           â Export VRM\nCtrl/â+Shift+S     â Save JSON\nCtrl/â+Z           â Undo\nCtrl/â+Shift+Z     â Redo\nCtrl/â+Shift+P     â Screenshot\n?                  â This dialog\nM                  â Toggle Easy/Detail mode\n1â8                â Switch tabs\nEsc                â Deactivate expression preview\nArrow keys         â Rotate preview (when canvas focused)\nShift+â/â         â Pan up/down (inspect face or feet)\n+/â                â Zoom\nHome / 0           â Reset view\nDouble-click       â Preview: reset view / Slider: reset to default\nDelete / Backspace â Slider: reset to default',
    'allowed.OnlyAuthor':'Only author','allowed.ExplicitlyLicensedPerson':'Licensed person','allowed.Everyone':'Everyone',
    'usage.Disallow':'Disallow','usage.Allow':'Allow',
    'license.Redistribution_Prohibited':'No redistribution','license.CC0':'CC0 (Public domain)',
    'license.CC_BY':'CC BY','license.CC_BY_NC':'CC BY-NC','license.CC_BY_SA':'CC BY-SA',
    'license.CC_BY_NC_SA':'CC BY-NC-SA','license.CC_BY_ND':'CC BY-ND','license.CC_BY_NC_ND':'CC BY-NC-ND','license.Other':'Other',
    'out.title.ph':'e.g. my-avatar','out.author.ph':'e.g. Your Name',
    'selftest.ok':'Self-test: all OK','selftest.ng':'Self-test: FAILED','selftest.count':'{pass}/{total} checks',
    'err.loadFailed':'Could not load JSON (invalid format or not a Hina file)',
    'err.loadTooLarge':'File too large â only JSON files under 2 MB can be loaded',
    'err.buildFailed':'Avatar build failed',
    'err.exportFailed':'VRM export failed',
    'err.screenshotFailed':'Screenshot failed',
    'err.unexpected':'An unexpected error occurred',
    'guide.t':'VRChat upload steps','guide.s1':'1. Create an avatar project with Unity Hub + VCC','guide.s2':'2. Import UniVRM (v0.x)','guide.s3':'3. Import VRM Converter for VRChat','guide.s4':'4. Drag the .vrm in â "Convert to VRChat avatar"','guide.s5':'5. Build & upload with the VRChat SDK',
    'guide.pre':'What you need','guide.pre1':'A VRChat account with Trust Rank New User or above (Visitors cannot upload; a few days of playing raises it)','guide.pre2':'A Windows PC (required for the Unity step; designing the avatar works on any device)',
    'guide.dl':'Where to get them (select a URL to copy)','guide.dl.vcc':'VCC (VRChat Creator Companion)','guide.dl.univrm':'UniVRM (the VRM 0.x .unitypackage)','guide.dl.conv':'VRM Converter for VRChat',
    'guide.tr':'Troubleshooting','guide.tr1':'Upload button is greyed out â Trust Rank is Visitor. Play a few days until you reach New User','guide.tr2':'"Very Poor" warning on Quest â re-export with "no spring bones" on the Physics tab (or proceed as-is if PC-only)','guide.tr3':'Model turns pink â shader not installed. Import UniVRM before importing the .vrm','guide.tr4':'Faces backward in other viewers â that is the VRM 0.x spec (Z-forward). Correct in Unity / VRChat',
    'guide.ver':'Steps verified as of July 2026. Tool UIs change â if your screen differs, treat the official docs of each tool as authoritative.',
    'btn.questFix':'Make it Quest Excellent','btn.questFix.tip':'Turns off hair sway to reach Quest Excellent (Ctrl+Z to undo)','a11y.questFixed':'Spring bones turned off â now Quest Excellent',
    'rank.limit':'Limited by',
    'enum.eyeShape.round':'Round','enum.eyeShape.tare':'Drooping','enum.eyeShape.tsuri':'Sharp','enum.eyeShape.jito':'Half-lidded',
    'enum.browType.soft':'Soft','enum.browType.straight':'Straight','enum.browType.arch':'Arched',
    'enum.hairStyle.short':'Short','enum.hairStyle.bob':'Bob','enum.hairStyle.long':'Long','enum.hairStyle.twin':'Twintails','enum.hairStyle.pony':'Ponytail',
    'enum.bangs.full':'Full','enum.bangs.see':'See-through','enum.bangs.center':'Center part',
    'enum.outfit.onepiece':'One-piece','enum.outfit.sailor':'Sailor','enum.outfit.shirts':'Shirt','enum.outfit.hoodie':'Hoodie',
    'enum.sleeves.long':'Long','enum.sleeves.short':'Short',
    'cat.tris':'Triangles','cat.bones':'Bones','cat.skinned':'Skinned meshes','cat.mesh':'Meshes','cat.mat':'Materials','cat.pbComp':'PhysBones','cat.pbTrans':'PB transforms','cat.pbCol':'Colliders','cat.pbCheck':'Collision checks','cat.texMB':'Texture memory','cat.raycasts':'Raycasts',
    'st.vrm':'VRM size est.',
    'note.upload':'Upload to VRChat via Unity + VRM Converter for VRChat. Follow the steps below.',
    'expr.neutral':'Neutral','expr.a':'A','expr.i':'I','expr.u':'U','expr.e':'E','expr.o':'O',
    'expr.blink':'Blink','expr.joy':'Joy','expr.angry':'Angry','expr.sorrow':'Sorrow','expr.fun':'Fun',
    'expr.edit':'Expression editor','expr.edit.hint':'Blend the base morphs to customize the 4 emotion expressions (AâO stay fixed for lip-sync)',
    'expr.reset':'Reset to default','expr.customized':'Customized',
    'a11y.exprMix':'{expr} â {morph} weight','a11y.exprReset':'{expr} reset to default',
    'lbl.height':'Height',
  }
};

/* ---------- atlas layout (1024Ã1024, px). UVs derive from these rects. ---------- */
const TEX = 1024;
const ATLAS = {
  eyeL:  [0,0,256,192], eyeR: [256,0,512,192],
  browL: [512,0,640,64], browR:[640,0,768,64],
  mouth: [768,0,1024,128],
  blush: [768,128,832,192],
  // solid 64px blocks (sampled at center)
  skin:[0,768], hair:[64,768], clothMain:[128,768], clothSub:[192,768],
  accent:[256,768], shoe:[320,768], white:[384,768], hairHi:[448,768],
};
const uvBlock = name => { const b=ATLAS[name]; const u=(b[0]+32)/TEX, v=(b[1]+32)/TEX; return [u,v,u,v]; };
const uvRect  = name => { const r=ATLAS[name]; return [r[0]/TEX, r[1]/TEX, r[2]/TEX, r[3]/TEX]; };

/* ---------- VRChat Performance Rank tables ----------
   Source: creators.vrchat.com "Performance Ranks" (2026-04-21). [E,G,M,P]; above P = Very Poor.
   raycasts added Round 494: a "Raycasts" category was added to the upstream table in the same
   2026-04-21 sync (VRChat 2026.2.1) but was missing here. Hina never emits VRC Raycast
   components, so estimate() always reports 0 â this can never be the limiting factor for any
   preset, but the table is pinned to match the source exactly per CLAUDE.md's update rule. */
const RANKS = {
  pc: {
    tris:[32000,70000,70000,70000], bones:[75,150,256,400], skinned:[1,2,8,16], mesh:[4,8,16,24],
    mat:[4,8,16,32], pbComp:[4,8,16,32], pbTrans:[16,64,128,256], pbCol:[4,8,16,32], pbCheck:[32,128,256,512],
    texMB:[40,75,110,150], raycasts:[1,4,8,15],
  },
  quest: {
    tris:[7500,10000,15000,20000], bones:[75,90,150,150], skinned:[1,1,2,2], mesh:[1,1,2,2],
    mat:[1,1,2,4], pbComp:[0,4,6,8], pbTrans:[0,16,32,64], pbCol:[0,4,8,16], pbCheck:[0,16,32,64],
    texMB:[10,18,25,40], raycasts:[1,2,4,8],
  }
};
const RANK_NAMES = ['Excellent','Good','Medium','Poor','VeryPoor'];

function estimate(build, p){
  const tris = build.geom.idx.length/3;
  const bones = build.bones.length;
  const nV = build.geom.pos.length/3;
  const chains = p.springOff ? 0 : build.springs.length;
  const springBones = p.springOff ? 0 : build.springs.reduce((s,c)=>s+c.boneIdxs.length,0);
  const colliders = chains ? 1 : 0;
  // geometry-only byte estimate; PNG texture (typically 100-150 KB compressed) added separately
  const geomBytes = nV*52 + tris*6 + bones*64;   // attrs(52B/v) + indices(6B/tri) + IBM(64B/bone)
  const morphBytes = build.morphs.names.reduce((s,n)=>s+build.morphs.sparse[n].length*16+8, 0);
  const approxBytes = geomBytes + morphBytes + 122880 + 12000; // +120KB atlas PNG est. +12KB JSON
  return {
    tris, bones, skinned:1, mesh:0, mat:1,
    pbComp: chains, pbTrans: springBones, pbCol: colliders, pbCheck: springBones*colliders,
    texMB: Math.round(TEX*TEX*4*1.33/1048576*10)/10,
    raycasts: 0, // Hina never emits VRC Raycast components (Round 494)
    approxBytes,
  };
}
function rank(stats, platform){
  const T=RANKS[platform]; let worstIdx=0; const worst=[];
  for(const cat in T){
    const v=stats[cat], arr=T[cat];
    let i=4; for(let j=0;j<4;j++){ if (v<=arr[j]){ i=j; break; } }
    if (i>worstIdx){ worstIdx=i; worst.length=0; }
    if (i===worstIdx) worst.push(cat);
  }
  return { rank: RANK_NAMES[worstIdx], idx: worstIdx, worst };
}

/* ---------- serialization ---------- */
// Whitelist of meta keys mirrors the app's META_DEFAULTS shape â every value is a string.
// A raw Object.assign(meta, j.meta) would let pasted/loaded JSON carry a "__proto__" key that,
// via [[Set]] during the merge, reassigns the meta object's own prototype (Annex B legacy accessor).
// Building a fresh object from a fixed key list â never indexed by attacker-supplied key names â
// makes that impossible, matching the whitelist approach sanitize() already uses for params.
const META_KEYS = ['title','version','author','contact','reference','allowed','violent','sexual','commercial','license','licenseUrl'];
// Single source of truth for the enum-typed meta fields. The UI <select>s and exportVRM()'s
// pick() guard both reference these lists, so option lists, load-time validation, and
// export-time fallback can never drift apart. Values are the VRM 0.x meta vocabulary.
const META_ENUMS = {
  allowed: ['OnlyAuthor','ExplicitlyLicensedPerson','Everyone'],
  violent: ['Disallow','Allow'], sexual: ['Disallow','Allow'], commercial: ['Disallow','Allow'],
  license: ['Redistribution_Prohibited','CC0','CC_BY','CC_BY_NC','CC_BY_SA','CC_BY_NC_SA','CC_BY_ND','CC_BY_NC_ND','Other'],
};
function sanitizeMeta(m){
  const o = {};
  if (!m || typeof m!=='object') return o;
  for (const k of META_KEYS){
    const v = m[k];
    // Enum-typed fields additionally require a whitelisted value (mirrors sanitize()'s
    // s.opts.includes(v) check for enum PARAMS). An invalid value drops the key entirely â
    // same semantics as a missing key, so the merge target keeps its current valid value.
    if (typeof v==='string' && (!META_ENUMS[k] || META_ENUMS[k].includes(v))) o[k]=v;
  }
  return o;
}
/* ---------- expression editor (Round 479) ----------
   Only the 4 emotion expressions are user-editable â vowels are VRChat lip-sync visemes and
   blink is auto-blink, so editing those would break functional behavior, not just appearance.
   Weights are the VRM bind scale (integer 0-100); sparse (zero weights are dropped) so the
   default mix serializes small and is trivially recognizable as "untouched". */
const EXPR_EDITABLE = ['joy','angry','sorrow','fun'];
const EXPR_INGREDIENTS = ['a','i','u','e','o','blink','joy','angry','sorrow','fun'];
function defaultExprMix(){ const o={}; for(const e of EXPR_EDITABLE) o[e]={[e]:100}; return o; }
// Same whitelist-rebuild pattern as sanitizeMeta (Round 469): only fixed, known key names are
// ever used to index the fresh output object, so a pasted/loaded "__proto__" key in either the
// outer (expression name) or inner (ingredient morph name) level can never reach it.
function sanitizeExprMix(x){
  const o = defaultExprMix();
  if (!x || typeof x!=='object') return o;
  for (const e of EXPR_EDITABLE){
    const src = x[e];
    if (!src || typeof src!=='object') continue; // missing/invalid entry keeps the identity default
    const m = {};
    for (const k of EXPR_INGREDIENTS){
      const n = Number(src[k]);
      if (!Number.isFinite(n)) continue;
      const w = Math.round(M.clamp(n,0,100));
      if (w>0) m[k]=w;
    }
    o[e]=m; // an explicitly-provided (possibly empty) mix replaces the default
  }
  return o;
}
// meta gets the same defense-in-depth sanitizeMeta() applies on load â exprMix already did
// (sanitizeExprMix below); before this, a meta value corrupted in memory was written back out
// verbatim even though the UI <select> could no longer display it.
function serialize(p, meta, exprMix){ return JSON.stringify({app:'hina', version:VERSION, params:p, meta:sanitizeMeta(meta), exprMix:sanitizeExprMix(exprMix)}, null, 1); }
function deserialize(text){
  // Strip UTF-8 BOM (U+FEFF) â common when JSON is edited in Notepad on Windows;
  // JSON.parse does not treat BOM as whitespace and would throw SyntaxError.
  if (typeof text==='string' && text.charCodeAt(0)===0xFEFF) text = text.slice(1);
  let j; try{ j=JSON.parse(text); }catch(e){ return null; }
  if (!j || j.app!=='hina') return null;
  return { params: sanitize(j.params), meta: sanitizeMeta(j.meta), exprMix: sanitizeExprMix(j.exprMix) };
}

/* 1x1 transparent PNG (fallback / Node tests) */
const PNG1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
function b64ToBytes(b64){
  const T='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean=b64.replace(/=+$/,''); const out=[];
  let buf=0, bits=0;
  for(const ch of clean){ buf=(buf<<6)|T.indexOf(ch); bits+=6; if(bits>=8){ bits-=8; out.push((buf>>bits)&255); } }
  return new Uint8Array(out);
}
