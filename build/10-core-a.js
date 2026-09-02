/*HINA-CORE-START*/
/* 雛 (Hina) core — pure logic. No DOM / WebGL / Canvas references (tested in Node). */
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
  qFromTo(a,b){ // rotation taking unit a → unit b
    const d=M.dot(a,b);
    if (d>0.999999) return M.qid();
    if (d<-0.999999){ // 180°: pick orthogonal axis
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
  '#ffe3d0':{ja:'乳白',en:'Porcelain'},'#ffd6bd':{ja:'クリーム',en:'Cream'},'#f7c5a8':{ja:'ピーチ',en:'Peach'},
  '#eab28e':{ja:'ウォームベージュ',en:'Warm Beige'},'#d49a72':{ja:'カラメル',en:'Caramel'},'#b97f59':{ja:'テラコッタ',en:'Terracotta'},
  '#96603e':{ja:'アンバー',en:'Amber'},'#6f4528':{ja:'エボニー',en:'Ebony'},
  '#3a3a45':{ja:'オフブラック',en:'Off-black'},'#5a4632':{ja:'ダークブラウン',en:'Dark Brown'},'#8a5a2b':{ja:'チョコレート',en:'Chocolate'},
  '#b98a4a':{ja:'キャラメル',en:'Caramel'},'#d9c08a':{ja:'ゴールデン',en:'Golden'},'#e8e0d8':{ja:'プラチナ',en:'Platinum'},
  '#7a3b3b':{ja:'バーガンディ',en:'Burgundy'},'#a64d6d':{ja:'ローズ',en:'Rose'},'#5d4a7a':{ja:'パープル',en:'Purple'},
  '#3d5a80':{ja:'ミッドナイトブルー',en:'Midnight Blue'},'#3f6f5f':{ja:'フォレスト',en:'Forest'},'#c9577a':{ja:'マゼンタ',en:'Magenta'},
  '#5a3825':{ja:'ダークブラウン',en:'Dark Brown'},'#7a4a2a':{ja:'アンバー',en:'Amber'},
  '#7a4a8a':{ja:'バイオレット',en:'Violet'},'#a64d4d':{ja:'レッド',en:'Red'},'#caa84a':{ja:'ゴールド',en:'Gold'},'#4a4a55':{ja:'グレー',en:'Gray'},
  '#2f3a52':{ja:'ネイビー',en:'Navy'},'#8a3b4a':{ja:'バーガンディ',en:'Burgundy'},'#27496d':{ja:'スチールブルー',en:'Steel Blue'},
  '#7a5230':{ja:'ブラウン',en:'Brown'},'#384048':{ja:'チャコール',en:'Charcoal'},'#7d3c5e':{ja:'プラム',en:'Plum'},
  '#9a8c5a':{ja:'カーキ',en:'Khaki'},'#46627a':{ja:'スレート',en:'Slate'},
  '#f2f2f2':{ja:'オフホワイト',en:'Off-white'},'#e8c84a':{ja:'ゴールド',en:'Gold'},'#d9534f':{ja:'レッド',en:'Red'},
  '#00c4cc':{ja:'ティール',en:'Teal'},'#f0a0b8':{ja:'ピンク',en:'Pink'},'#ffffff':{ja:'ホワイト',en:'White'},
};

/* ---------- parameter schema (single source of truth) ----------
   kinds: num {min,max,def,step}, enum {opts,def}, bool {def}, color {def,pal} */
const PARAMS = {
  // 体格
  height:    {k:'num', min:0.8, max:2.0, def:1.45, step:0.01, tab:'body', ja:'身長 (m)', en:'Height (m)'},
  headRatio: {k:'num', min:0.18, max:0.36, def:0.24, step:0.005, tab:'body', ja:'頭の比率', en:'Head ratio'},
  shoulderW: {k:'num', min:0.14, max:0.34, def:0.21, step:0.005, tab:'body', ja:'肩幅', en:'Shoulders'},
  hipW:      {k:'num', min:0.14, max:0.34, def:0.215, step:0.005, tab:'body', ja:'腰幅', en:'Hips'},
  bust:      {k:'num', min:0, max:1, def:0.25, step:0.01, tab:'body', ja:'胸', en:'Bust'},
  armLen:    {k:'num', min:0.8, max:1.2, def:1.0, step:0.01, tab:'body', ja:'腕の長さ', en:'Arm length'},
  legLen:    {k:'num', min:0.8, max:1.2, def:1.0, step:0.01, tab:'body', ja:'脚の長さ', en:'Leg length'},
  armTh:     {k:'num', min:0.7, max:1.5, def:1.0, step:0.01, tab:'body', adv:1, ja:'腕の太さ', en:'Arm width'},
  legTh:     {k:'num', min:0.7, max:1.5, def:1.0, step:0.01, tab:'body', adv:1, ja:'脚の太さ', en:'Leg width'},
  // 顔
  eyeSize:   {k:'num', min:0.6, max:1.4, def:1.0, step:0.01, tab:'face', ja:'目の大きさ', en:'Eye size'},
  eyeY:      {k:'num', min:0, max:1, def:0.5, step:0.01, tab:'face', ja:'目の高さ', en:'Eye height'},
  eyeGap:    {k:'num', min:0, max:1, def:0.5, step:0.01, tab:'face', ja:'目の間隔', en:'Eye gap'},
  eyeShape:  {k:'enum', opts:['round','tare','tsuri','jito'], def:'round', tab:'face', ja:'目の形', en:'Eye shape'},
  irisSize:  {k:'num', min:0.6, max:1.2, def:0.92, step:0.01, tab:'face', adv:1, ja:'瞳の大きさ', en:'Iris size'},
  browType:  {k:'enum', opts:['soft','straight','arch'], def:'soft', tab:'face', ja:'眉', en:'Brows'},
  mouthW:    {k:'num', min:0.6, max:1.5, def:1.0, step:0.01, tab:'face', ja:'口の幅', en:'Mouth width'},
  blush:     {k:'num', min:0, max:1, def:0.45, step:0.01, tab:'face', ja:'頬紅', en:'Blush'},
  // 髪
  hairStyle: {k:'enum', opts:['short','bob','long','twin','pony'], def:'twin', tab:'hair', ja:'髪型', en:'Hair style'},
  bangs:     {k:'enum', opts:['full','see','center'], def:'full', tab:'hair', ja:'前髪', en:'Bangs'},
  hairLen:   {k:'num', min:0.7, max:1.4, def:1.0, step:0.01, tab:'hair', ja:'髪の長さ', en:'Hair length'},
  hairVol:   {k:'num', min:0.8, max:1.3, def:1.0, step:0.01, tab:'hair', ja:'ボリューム', en:'Volume'},
  ahoge:     {k:'bool', def:true, tab:'hair', ja:'アホ毛', en:'Ahoge'},
  // 服
  outfit:    {k:'enum', opts:['onepiece','sailor','shirts','hoodie'], def:'sailor', tab:'outfit', ja:'衣装', en:'Outfit'},
  skirtLen:  {k:'num', min:0.6, max:1.6, def:1.0, step:0.01, tab:'outfit', ja:'スカート丈', en:'Skirt length'},
  sleeves:   {k:'enum', opts:['long','short'], def:'long', tab:'outfit', ja:'袖', en:'Sleeves'},
  socks:     {k:'bool', def:true, tab:'outfit', adv:1, ja:'ソックス', en:'Socks'},
  // 色
  skinTone:  {k:'color', def:'#ffd6bd', pal:'skin',  tab:'color', ja:'肌', en:'Skin'},
  hairColor: {k:'color', def:'#5d4a7a', pal:'hair',  tab:'color', ja:'髪', en:'Hair'},
  eyeColor:  {k:'color', def:'#3d5a80', pal:'eye',   tab:'color', ja:'瞳', en:'Eyes'},
  clothMain: {k:'color', def:'#2f3a52', pal:'cloth', tab:'color', ja:'服メイン', en:'Cloth main'},
  clothSub:  {k:'color', def:'#f2f2f2', pal:'accent',tab:'color', ja:'服サブ', en:'Cloth sub'},
  clothAccent:{k:'color',def:'#d9534f', pal:'accent',tab:'color', ja:'アクセント', en:'Accent'},
  shoeColor: {k:'color', def:'#384048', pal:'cloth', tab:'color', ja:'靴', en:'Shoes'},
  // technical toggle (like springOff) — export-only, excluded from gacha randomization
  outline:   {k:'bool', def:false, tab:'color', adv:1, ja:'アウトライン', en:'Outline'},
  // 物理
  springOff: {k:'bool', def:false, tab:'phys', ja:'揺れ物オフ (Quest Excellent)', en:'No springs (Quest Excellent)'},
  hairStiff: {k:'num', min:0, max:1, def:0.65, step:0.01, tab:'phys', ja:'髪の硬さ', en:'Hair stiffness'},
  hairGrav:  {k:'num', min:0, max:1, def:0.05, step:0.01, tab:'phys', ja:'重力', en:'Gravity'},
  hairDrag:  {k:'num', min:0, max:1, def:0.4, step:0.01, tab:'phys', ja:'減衰', en:'Drag'},
};

// Round 503: single source of truth for "which outfits render a skirt mesh". Previously
// build/11-core-b.js's hasSkirt (geometry: does this outfit get the skirt latheY()) and
// build/20-app.js's skirtLen-row visibility check were two independently hand-written literals
// that happened to agree today but had nothing forcing them to stay in sync — the only existing
// test (tests/run.js, pre-Round-503) checked that the substrings 'skirtLen'/'onepiece'/'sailor'
// merely appeared in the file, not that the two lists were actually equal to each other.
const SKIRT_OUTFITS = ['onepiece','sailor'];
const hasSkirt = outfit => SKIRT_OUTFITS.includes(outfit);

// Round 539: same treatment for the sub-colour. The geometry decided "does this outfit use the
// clothSub atlas block?" with a bare `p.outfit==='shirts'` written out twice (top shell, sleeves)
// — the identical hand-written-literal shape Round 503 removed above. Measuring which atlas block
// each vertex samples showed the consequence went further than duplication: for onepiece, sailor
// and hoodie NO triangle samples clothSub at all, yet the colour tab still offered the "服サブ /
// Cloth sub" picker. On the default outfit a user could change that colour and see nothing happen,
// in the preview or in the exported avatar. The row is now hidden for those outfits, exactly as
// skirtLen already is, and a test derives this list from the real geometry so it cannot drift.
const SUBCOLOR_OUTFITS = ['shirts'];
const usesClothSub = outfit => SUBCOLOR_OUTFITS.includes(outfit);
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
  {id:'suzume', ja:'すずめ', en:'Suzume', p:{}},
  {id:'kohaku', ja:'こはく', en:'Kohaku', p:{hairStyle:'bob', outfit:'onepiece', hairColor:'#8a5a2b', eyeColor:'#caa84a', clothMain:'#8a3b4a', clothSub:'#f2f2f2', clothAccent:'#e8c84a', bangs:'see', blush:0.6}},
  {id:'aoi', ja:'あおい', en:'Aoi', p:{hairStyle:'long', outfit:'shirts', hairColor:'#3a3a45', eyeColor:'#3d5a80', clothMain:'#27496d', clothSub:'#ffffff', clothAccent:'#00c4cc', bangs:'center', eyeShape:'tsuri', blush:0.2}},
  {id:'tsumugi', ja:'つむぎ', en:'Tsumugi', p:{hairStyle:'pony', outfit:'hoodie', hairColor:'#c9577a', eyeColor:'#7a4a8a', clothMain:'#5d4a7a', clothSub:'#f0a0b8', clothAccent:'#f2f2f2', eyeShape:'tare', mouthW:1.1, blush:0.65}},
  {id:'minato', ja:'みなと', en:'Minato', p:{hairStyle:'short', outfit:'shirts', bust:0, shoulderW:0.24, hipW:0.19, hairColor:'#3f6f5f', eyeColor:'#4a4a55', clothMain:'#384048', clothSub:'#f2f2f2', clothAccent:'#00c4cc', eyeShape:'jito', blush:0, ahoge:false, skirtLen:0.6}},
  {id:'chibi', ja:'ちび', en:'Chibi', p:{height:1.0, headRatio:0.34, outfit:'onepiece', hairColor:'#d9c08a', eyeColor:'#3f6f5f', clothMain:'#3f6f5f', clothSub:'#f2f2f2', clothAccent:'#e8c84a', eyeSize:1.25, blush:0.7, legLen:0.85, armLen:0.9}},
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
    'tab.preset':'プリセット','tab.body':'体格','tab.face':'顔','tab.hair':'髪','tab.outfit':'服','tab.color':'色','tab.phys':'物理','tab.out':'出力',
    'btn.gacha':'ガチャ（ランダム生成）','gacha.lock':'ロック対象','gacha.lock.hint':'ロックした項目は再生成の対象外になります','a11y.gachaRanPartial':'ガチャ — 一部の項目をロックして生成しました','gacha.seed':'シード: ','gacha.seed.ph':'シード番号を入力して再実行','btn.copySeed':'コピー','btn.copySeed.err':'シードのコピーに失敗しました','btn.copyLink':'リンクをコピー','btn.copyLink.err':'リンクのコピーに失敗しました','a11y.linkCopied':'共有リンクをクリップボードにコピーしました','btn.copied':'✓ コピー済','btn.export':'VRM 書き出し','btn.exporting':'書き出し中…','btn.exported':'✓ 書き出し完了','btn.saveJson':'パラメータ保存 (.json)','btn.copyJson':'クリップボードにコピー','btn.copyJson.err':'クリップボードへのコピーに失敗しました','btn.copyJsonDone':'✓ コピー済','btn.pasteJson':'クリップボードから貼り付け','btn.pasteJson.ok':'✓ 貼り付けました','btn.pasteJson.err':'クリップボードの内容が不正です','btn.loadJson':'パラメータ読込','btn.reset':'初期化','btn.reset.confirm':'初期化しますか？変更は失われます。','a11y.resetDone':'初期化しました','a11y.resetCancelled':'初期化をキャンセルしました','btn.revert':'↺ {p} に戻す','btn.screenshot':'PNG','btn.screenshot.tip':'スクリーンショットを保存（Ctrl/⌘+Shift+P）','btn.lang.tip':'言語切替 — クリックで English に切替','hint.ctrlS':'Ctrl/⌘+S → VRM書き出し / Ctrl/⌘+Shift+S → JSON保存 / Ctrl/⌘+Z → 元に戻す / Ctrl/⌘+Shift+Z → やり直す / Ctrl/⌘+Shift+P → PNG / M → かんたん/詳細切替 / ? → ヘルプ / 1〜8 → タブ切替',
    'mode.easy':'かんたん','mode.detail':'詳細','mode.easy.tip':'かんたんモード: 基本パラメータのみ表示','mode.detail.tip':'詳細モード: 全パラメータを表示',
    'out.meta':'メタ情報','out.stats':'統計','out.title':'タイトル','out.version':'バージョン','out.author':'作者','out.contact':'連絡先','out.reference':'参照元','out.filename':'ファイル名','out.license':'ライセンス','out.allowed':'使用許可','out.commercial':'商用利用','out.violent':'暴力表現','out.sexual':'性的表現',
    'out.version.ph':'例: 1.0','out.contact.ph':'例: https://example.com','out.reference.ph':'例: オリジナルアバター',
    'out.license.url':'ライセンス URL（Other 選択時）','out.license.url.ph':'例: https://example.com/license',
    'st.tris':'三角形','st.bones':'ボーン','st.mat':'マテリアル','st.mesh':'スキンメッシュ','st.spring':'揺れ物ボーン','st.chains':'揺れ物チェーン','st.tex':'テクスチャ推定',
    'rank.Excellent':'Excellent','rank.Good':'Good','rank.Medium':'Medium','rank.Poor':'Poor','rank.VeryPoor':'Very Poor',
    'rank.tip.Excellent':'全ユーザーにデフォルト表示','rank.tip.Good':'Good以上を許可したユーザーに表示','rank.tip.Medium':'Medium以上を許可したユーザーのみ表示','rank.tip.Poor':'Poor以上を許可したユーザーのみ表示','rank.tip.VeryPoor':'ほぼ全ユーザーに非表示',
    'hint.exprOff':'クリックで解除','hint.drag':'ドラッグ/矢印キー: 回転 / Shift+↑↓: パン / ホイール・+−: ズーム / ダブルクリック・Home/0: リセット','hint.undoReady':'Ctrl+Z / ⌘+Z → 元に戻す','hint.redoReady':'Ctrl+Shift+Z / ⌘+Shift+Z → やり直す','hint.saved':'✓ 自動保存','hint.sliderReset':'ダブルクリックまたは Delete / Backspace キーでデフォルト値に戻す',
    'hint.saveFail':'⚠ 保存失敗 — JSONを手動で保存してください','hint.exportCorrupt':'⚠ VRMファイルが破損しています — もう一度書き出してください','hint.dropJson':'または .hina.json ファイルをここにドラッグ＆ドロップ',
    'hint.noGL':'WebGL が使えません — プレビュー無効（書き出しは動作します）',
    'hint.glLost':'WebGL コンテキストが失われました — ページを再読み込みしてください',
    'a11y.canvas':'アバターの3Dプレビュー。矢印キーで回転、Shift+↑↓でパン、＋／−でズーム、Homeまたはダブルクリックで初期位置に戻ります。',
    'a11y.tabs':'タブナビゲーション','a11y.exprBar':'表情プレビュー','a11y.sliderReset':'{label} をデフォルト値 {v} にリセットしました','a11y.numIn':'{label}（数値入力）',
    'a11y.stage':'3Dプレビューエリア','a11y.panel':'アバター設定パネル','a11y.about.btn':'雛について','a11y.canvas.role':'3Dプレビュー',
    'a11y.exprActive':'表情: {expr}','a11y.exprNeutral':'ニュートラルに戻りました',
    'a11y.rankStatus':'性能ランク — PC: {pc} / Quest: {q}',
    'a11y.rankBadge':'ランクバッジ — クリックで統計タブへ','a11y.skip':'コンテンツへスキップ',
    'a11y.exported':'{name} を書き出しました（約{size}）','a11y.screenshotDone':'スクリーンショットを保存しました','a11y.screenshotShared':'スクリーンショットを共有しました','a11y.seedCopied':'シード {n} をクリップボードにコピーしました','a11y.gachaRan':'ガチャ — シード {n} で生成しました','a11y.undone':'元に戻しました','a11y.noUndo':'元に戻す履歴がありません','a11y.redone':'やり直しました','a11y.noRedo':'やり直す履歴がありません','a11y.savedJson':'{name} を保存しました','a11y.loadedJson':'{name} を読み込みました','a11y.clamped':'値を {v} に制限しました','a11y.viewReset':'プレビュー視点をリセットしました','a11y.viewLimit':'視点の限界に達しました','a11y.seedInvalid':'シードは0以上の整数を入力してください','a11y.licUrlInvalid':'有効なURLを入力してください（例: https://example.com）',
    'note.quest':'揺れ物オフで Quest Excellent。オンの場合は Quest Good。','note.quest.nospring':'この髪型では揺れ物ボーンがありません（常に Quest Excellent）。','note.springOff':'揺れ物オフ中：スライダーは非表示。オンにすると表示されます。',
    'note.outline':'アウトラインはPC版でのみ表示されます（Questのシェーダーは非対応）。',
    'about':'ブラウザだけでVRChat用アバター(VRM 0.x)を作るツール。完全ローカル動作・外部送信なし・依存ゼロ。','about.close':'閉じる',
    'about.keys':'キーボードショートカット','about.keyList':'Ctrl/⌘+S             → VRM書き出し\nCtrl/⌘+Shift+S       → JSON保存\nCtrl/⌘+Z             → 元に戻す\nCtrl/⌘+Shift+Z       → やり直す\nCtrl/⌘+Shift+P       → スクリーンショット\n?                    → このダイアログ\nM                    → かんたん/詳細 切替\n1〜8                 → タブ切替\nEsc                  → 表情プレビューを解除\n↑↓←→              → 3D回転（プレビュー選択時）\nShift+↑↓           → 上下パン（顔・足を確認）\n+/−                 → ズーム\nHome / 0             → 視点リセット\nダブルクリック       → プレビュー: 視点リセット / スライダー: デフォルト値\nDelete / Backspace   → スライダー: デフォルト値にリセット',
    'allowed.OnlyAuthor':'作者のみ','allowed.ExplicitlyLicensedPerson':'許可された人','allowed.Everyone':'全員',
    'usage.Disallow':'不可','usage.Allow':'可',
    'license.Redistribution_Prohibited':'再配布禁止','license.CC0':'CC0（パブリックドメイン）',
    'license.CC_BY':'CC BY','license.CC_BY_NC':'CC BY-NC','license.CC_BY_SA':'CC BY-SA',
    'license.CC_BY_NC_SA':'CC BY-NC-SA','license.CC_BY_ND':'CC BY-ND','license.CC_BY_NC_ND':'CC BY-NC-ND','license.Other':'その他',
    'out.title.ph':'例: 雛アバター','out.author.ph':'例: あなたの名前',
    'selftest.ok':'自己診断: 全て正常','selftest.ng':'自己診断: 異常あり','selftest.count':'{pass}/{total} 項目',
    'err.loadFailed':'JSONファイルを読み込めませんでした（形式が不正か、雛のJSONではありません）',
    'err.loadTooLarge':'ファイルが大きすぎます（2 MB以下のJSONのみ読み込めます）',
    'err.buildFailed':'アバター生成に失敗しました',
    'err.exportFailed':'VRM書き出しに失敗しました',
    'err.screenshotFailed':'スクリーンショットの保存に失敗しました',
    'err.unexpected':'予期しないエラーが発生しました',
    'guide.t':'VRChat導入手順','guide.s1':'1. Unity Hub + VCC でアバタープロジェクト作成','guide.s2':'2. UniVRM (v0.x) をインポート','guide.s3':'3. VRM Converter for VRChat をインポート','guide.s4':'4. .vrm をドラッグ →「VRChatアバターに変換」','guide.s5':'5. VRChat SDK でビルド & アップロード',
    // Round 512: the app ships as a single index.html, so a user who downloaded only that file
    // does NOT have docs/UPLOAD_GUIDE.md. These make the in-app guide self-sufficient.
    'guide.pre':'用意するもの','guide.pre1':'VRChatアカウント（Trust Rank が New User 以上。Visitor はアップロード不可。数日プレイで昇格）','guide.pre2':'Windows PC（Unity作業に必要。アバターの設計だけならスマホでも可）',
    'guide.dl':'入手先（URLを選択してコピー）','guide.dl.vcc':'VCC (VRChat Creator Companion)','guide.dl.univrm':'UniVRM（VRM 0.x 系の .unitypackage）','guide.dl.conv':'VRM Converter for VRChat',
    'guide.tr':'つまずいたら','guide.tr1':'アップロードボタンが押せない → Trust Rank が Visitor。数日プレイして New User になるのを待つ','guide.tr2':'Quest で「Very Poor」警告 → 物理タブの「揺れ物オフ」で再書き出し（PC版のみなら警告のまま進めても可）','guide.tr3':'モデルがピンク色になる → シェーダー未導入。UniVRM を先に入れてから .vrm を取り込む','guide.tr4':'他のビューアで後ろを向く → VRM 0.x 仕様（Z-向き）。Unity / VRChat では正常',
    'guide.ver':'手順は2026年7月時点。各ツールのUIは更新されるため、相違があれば公式ドキュメントを正とする。',
    // Round 513: the rank estimator diagnosed but could not act — the sole remedy for a
    // non-Excellent Quest rank is springOff, which lives on the Physics tab.
    'btn.questFix':'Quest Excellent にする','btn.questFix.tip':'髪の揺れをオフにして Quest Excellent にします（Ctrl+Z で取り消せます）','a11y.questFixed':'揺れ物をオフにしました — Quest Excellent になりました',
    'rank.limit':'律速',
    'enum.eyeShape.round':'丸','enum.eyeShape.tare':'たれ目','enum.eyeShape.tsuri':'つり目','enum.eyeShape.jito':'じと目',
    'enum.browType.soft':'やわらか','enum.browType.straight':'まっすぐ','enum.browType.arch':'アーチ',
    'enum.hairStyle.short':'ショート','enum.hairStyle.bob':'ボブ','enum.hairStyle.long':'ロング','enum.hairStyle.twin':'ツイン','enum.hairStyle.pony':'ポニー',
    'enum.bangs.full':'フル','enum.bangs.see':'シースルー','enum.bangs.center':'センター分け',
    'enum.outfit.onepiece':'ワンピース','enum.outfit.sailor':'セーラー','enum.outfit.shirts':'シャツ','enum.outfit.hoodie':'パーカー',
    'enum.sleeves.long':'長袖','enum.sleeves.short':'半袖',
    'cat.tris':'三角形','cat.bones':'ボーン','cat.skinned':'スキンメッシュ','cat.mesh':'メッシュ','cat.mat':'マテリアル','cat.pbComp':'揺れ物部品','cat.pbTrans':'揺れ物ボーン','cat.pbCol':'コライダ','cat.pbCheck':'衝突判定','cat.texMB':'テクスチャ','cat.raycasts':'レイキャスト',
    'st.vrm':'VRMサイズ推定',
    'note.upload':'VRChatへは Unity + VRM Converter for VRChat 経由でアップロード。以下の手順を参照。',
    'expr.neutral':'ニュートラル','expr.a':'あ','expr.i':'い','expr.u':'う','expr.e':'え','expr.o':'お',
    'expr.blink':'まばたき','expr.joy':'喜び','expr.angry':'怒り','expr.sorrow':'悲しみ','expr.fun':'楽しい',
    'expr.edit':'表情エディタ','expr.edit.hint':'喜び・怒り・悲しみ・楽しいの4表情を、基本モーフの組み合わせで調整できます（あ〜お はリップシンク用のため編集不可）',
    'expr.reset':'デフォルトに戻す','expr.customized':'カスタム済',
    'a11y.exprMix':'{expr} — {morph} の強度','a11y.exprReset':'{expr} をデフォルトに戻しました',
    'lbl.height':'高さ',
  },
  en: {
    'tab.preset':'Presets','tab.body':'Body','tab.face':'Face','tab.hair':'Hair','tab.outfit':'Outfit','tab.color':'Colors','tab.phys':'Physics','tab.out':'Export',
    'btn.gacha':'Gacha (randomize)','gacha.lock':'Lock categories','gacha.lock.hint':'Locked categories are excluded from the reroll','a11y.gachaRanPartial':'Gacha — rerolled with some categories locked','gacha.seed':'Seed: ','gacha.seed.ph':'Enter seed to replay','btn.copySeed':'Copy','btn.copySeed.err':'Failed to copy seed','btn.copyLink':'Copy link','btn.copyLink.err':'Failed to copy link','a11y.linkCopied':'Share link copied to clipboard','btn.copied':'✓ Copied','btn.export':'Export VRM','btn.exporting':'Exporting…','btn.exported':'✓ Exported','btn.saveJson':'Save params (.json)','btn.copyJson':'Copy to clipboard','btn.copyJson.err':'Failed to copy to clipboard','btn.copyJsonDone':'✓ Copied','btn.pasteJson':'Paste from clipboard','btn.pasteJson.ok':'✓ Pasted','btn.pasteJson.err':'Clipboard content is not valid Hina JSON','btn.loadJson':'Load params','btn.reset':'Reset','btn.reset.confirm':'Reset to defaults? All changes will be lost.','a11y.resetDone':'Avatar reset to defaults','a11y.resetCancelled':'Reset cancelled','btn.revert':'↺ Revert to {p}','btn.screenshot':'PNG','btn.screenshot.tip':'Save screenshot (Ctrl/⌘+Shift+P)','btn.lang.tip':'Switch language — click for 日本語','hint.ctrlS':'Ctrl/⌘+S → Export VRM / Ctrl/⌘+Shift+S → Save JSON / Ctrl/⌘+Z → Undo / Ctrl/⌘+Shift+Z → Redo / Ctrl/⌘+Shift+P → PNG / M → Easy/Detail toggle / ? → Help / 1-8 → Switch tab',
    'mode.easy':'Easy','mode.detail':'Detail','mode.easy.tip':'Easy mode: basic params only','mode.detail.tip':'Detail mode: all params shown',
    'out.meta':'Metadata','out.stats':'Stats','out.title':'Title','out.version':'Version','out.author':'Author','out.contact':'Contact','out.reference':'Reference','out.filename':'File name','out.license':'License','out.allowed':'Allowed users','out.commercial':'Commercial','out.violent':'Violence','out.sexual':'Sexual',
    'out.version.ph':'e.g. 1.0','out.contact.ph':'e.g. https://example.com','out.reference.ph':'e.g. Original avatar',
    'out.license.url':'License URL (when Other)','out.license.url.ph':'e.g. https://example.com/license',
    'st.tris':'Triangles','st.bones':'Bones','st.mat':'Materials','st.mesh':'Skinned meshes','st.spring':'Spring bones','st.chains':'Spring chains','st.tex':'Texture est.',
    'rank.Excellent':'Excellent','rank.Good':'Good','rank.Medium':'Medium','rank.Poor':'Poor','rank.VeryPoor':'Very Poor',
    'rank.tip.Excellent':'Visible to all users by default','rank.tip.Good':'Visible to users allowing Good+','rank.tip.Medium':'Visible only to users allowing Medium+','rank.tip.Poor':'Visible only to users allowing Poor+','rank.tip.VeryPoor':'Hidden for most users',
    'hint.exprOff':'click to deactivate','hint.drag':'Drag/Arrows: rotate / Shift+↑↓: pan / Wheel · +−: zoom / Double-click · Home/0: reset','hint.undoReady':'Ctrl+Z / ⌘+Z → Undo','hint.redoReady':'Ctrl+Shift+Z / ⌘+Shift+Z → Redo','hint.saved':'✓ Auto-saved','hint.sliderReset':'Double-click or Delete/Backspace to reset to default',
    'hint.saveFail':'⚠ Save failed — export JSON manually to keep your work','hint.exportCorrupt':'⚠ VRM file is corrupt — please export again','hint.dropJson':'or drag & drop a .hina.json file anywhere on the page',
    'hint.noGL':'WebGL unavailable — preview disabled (export still works)',
    'hint.glLost':'WebGL context lost — reload to restore preview',
    'a11y.canvas':'3D preview of your avatar. Arrow keys rotate, Shift+↑/↓ pan, +/− zoom, Home or double-click reset the view.',
    'a11y.tabs':'Tab navigation','a11y.exprBar':'Expression preview','a11y.sliderReset':'{label} reset to default {v}','a11y.numIn':'{label} (numeric entry)',
    'a11y.stage':'3D preview area','a11y.panel':'Avatar settings panel','a11y.about.btn':'About Hina','a11y.canvas.role':'3D preview',
    'a11y.exprActive':'Expression: {expr}','a11y.exprNeutral':'Returned to neutral',
    'a11y.rankStatus':'Performance — PC: {pc} / Quest: {q}',
    'a11y.rankBadge':'Rank badge — click to open Stats tab','a11y.skip':'Skip to content',
    'a11y.exported':'Exported {name} (~{size})','a11y.screenshotDone':'Screenshot saved','a11y.screenshotShared':'Screenshot shared','a11y.seedCopied':'Seed {n} copied to clipboard','a11y.gachaRan':'Gacha — generated with seed {n}','a11y.undone':'Undone','a11y.noUndo':'Nothing to undo','a11y.redone':'Redone','a11y.noRedo':'Nothing to redo','a11y.savedJson':'Saved {name}','a11y.loadedJson':'Loaded {name}','a11y.clamped':'Value clamped to {v}','a11y.viewReset':'Preview view reset','a11y.viewLimit':'View limit reached','a11y.seedInvalid':'Seed must be a non-negative integer','a11y.licUrlInvalid':'Enter a valid URL (e.g. https://example.com)',
    'note.quest':'Springs OFF → Quest Excellent. ON → Quest Good.','note.quest.nospring':'No spring bones for this hair style (always Quest Excellent).','note.springOff':'Springs are OFF — sliders hidden. Enable springs above to show them.',
    'note.outline':'The outline only renders on PC — Quest\'s shader does not support it.',
    'about':'Make a VRChat-ready avatar (VRM 0.x) in your browser. Fully local, zero network, zero dependencies.','about.close':'Close',
    'about.keys':'Keyboard shortcuts','about.keyList':'Ctrl/⌘+S           → Export VRM\nCtrl/⌘+Shift+S     → Save JSON\nCtrl/⌘+Z           → Undo\nCtrl/⌘+Shift+Z     → Redo\nCtrl/⌘+Shift+P     → Screenshot\n?                  → This dialog\nM                  → Toggle Easy/Detail mode\n1–8                → Switch tabs\nEsc                → Deactivate expression preview\nArrow keys         → Rotate preview (when canvas focused)\nShift+↑/↓         → Pan up/down (inspect face or feet)\n+/−                → Zoom\nHome / 0           → Reset view\nDouble-click       → Preview: reset view / Slider: reset to default\nDelete / Backspace → Slider: reset to default',
    'allowed.OnlyAuthor':'Only author','allowed.ExplicitlyLicensedPerson':'Licensed person','allowed.Everyone':'Everyone',
    'usage.Disallow':'Disallow','usage.Allow':'Allow',
    'license.Redistribution_Prohibited':'No redistribution','license.CC0':'CC0 (Public domain)',
    'license.CC_BY':'CC BY','license.CC_BY_NC':'CC BY-NC','license.CC_BY_SA':'CC BY-SA',
    'license.CC_BY_NC_SA':'CC BY-NC-SA','license.CC_BY_ND':'CC BY-ND','license.CC_BY_NC_ND':'CC BY-NC-ND','license.Other':'Other',
    'out.title.ph':'e.g. my-avatar','out.author.ph':'e.g. Your Name',
    'selftest.ok':'Self-test: all OK','selftest.ng':'Self-test: FAILED','selftest.count':'{pass}/{total} checks',
    'err.loadFailed':'Could not load JSON (invalid format or not a Hina file)',
    'err.loadTooLarge':'File too large — only JSON files under 2 MB can be loaded',
    'err.buildFailed':'Avatar build failed',
    'err.exportFailed':'VRM export failed',
    'err.screenshotFailed':'Screenshot failed',
    'err.unexpected':'An unexpected error occurred',
    'guide.t':'VRChat upload steps','guide.s1':'1. Create an avatar project with Unity Hub + VCC','guide.s2':'2. Import UniVRM (v0.x)','guide.s3':'3. Import VRM Converter for VRChat','guide.s4':'4. Drag the .vrm in → "Convert to VRChat avatar"','guide.s5':'5. Build & upload with the VRChat SDK',
    'guide.pre':'What you need','guide.pre1':'A VRChat account with Trust Rank New User or above (Visitors cannot upload; a few days of playing raises it)','guide.pre2':'A Windows PC (required for the Unity step; designing the avatar works on any device)',
    'guide.dl':'Where to get them (select a URL to copy)','guide.dl.vcc':'VCC (VRChat Creator Companion)','guide.dl.univrm':'UniVRM (the VRM 0.x .unitypackage)','guide.dl.conv':'VRM Converter for VRChat',
    'guide.tr':'Troubleshooting','guide.tr1':'Upload button is greyed out → Trust Rank is Visitor. Play a few days until you reach New User','guide.tr2':'"Very Poor" warning on Quest → re-export with "no spring bones" on the Physics tab (or proceed as-is if PC-only)','guide.tr3':'Model turns pink → shader not installed. Import UniVRM before importing the .vrm','guide.tr4':'Faces backward in other viewers → that is the VRM 0.x spec (Z-forward). Correct in Unity / VRChat',
    'guide.ver':'Steps verified as of July 2026. Tool UIs change — if your screen differs, treat the official docs of each tool as authoritative.',
    'btn.questFix':'Make it Quest Excellent','btn.questFix.tip':'Turns off hair sway to reach Quest Excellent (Ctrl+Z to undo)','a11y.questFixed':'Spring bones turned off — now Quest Excellent',
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
    'expr.edit':'Expression editor','expr.edit.hint':'Blend the base morphs to customize the 4 emotion expressions (A–O stay fixed for lip-sync)',
    'expr.reset':'Reset to default','expr.customized':'Customized',
    'a11y.exprMix':'{expr} — {morph} weight','a11y.exprReset':'{expr} reset to default',
    'lbl.height':'Height',
  }
};

/* ---------- atlas layout (1024×1024, px). UVs derive from these rects. ---------- */
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
   components, so estimate() always reports 0 — this can never be the limiting factor for any
   preset, but the table is pinned to match the source exactly per CLAUDE.md's update rule.

   Re-verified 2026-09 (Round 551) against the upstream source: every one of the 11 categories
   below matches on BOTH platforms, so five months brought no drift. Two practical notes for
   whoever checks next, because both cost time to rediscover:
     - creators.vrchat.com is blocked by this environment's egress proxy. The docs are open source,
       so read the mirror instead: raw.githubusercontent.com/vrchat-community/creator-docs/main/
       Docs/docs/avatars/avatar-performance-ranking-system.md  (note the doubled "Docs/docs" — the
       obvious single-docs path 404s).
     - upstream also ranks categories Hina does not model: Contacts, Constraint Count/Depth,
       Animators, Lights, Particle Systems, Trail/Line Renderers, Audio Sources. None of them can
       ever bite, and not because we checked the numbers: a .vrm is glTF, which carries no Unity
       components at all, so every one of these is structurally 0 for anything Hina writes, and
       every one of them permits 0 at Excellent. They are omitted deliberately, not overlooked. */
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
// Whitelist of meta keys mirrors the app's META_DEFAULTS shape — every value is a string.
// A raw Object.assign(meta, j.meta) would let pasted/loaded JSON carry a "__proto__" key that,
// via [[Set]] during the merge, reassigns the meta object's own prototype (Annex B legacy accessor).
// Building a fresh object from a fixed key list — never indexed by attacker-supplied key names —
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
    // s.opts.includes(v) check for enum PARAMS). An invalid value drops the key entirely —
    // same semantics as a missing key, so the merge target keeps its current valid value.
    if (typeof v!=='string') continue;
    if (META_ENUMS[k]){ if (META_ENUMS[k].includes(v)) o[k]=v; continue; }
    // Round 535: free-text meta fields get the SAME normalisation the VRM writer's str() applies
    // (strip C0 control chars, cap at 256). Found by actually attacking the load paths in a real
    // browser: a crafted .hina.json carrying a 5,000-character title was accepted verbatim into
    // app state, so the UI showed a value the exporter would silently cut to 256 - precisely the
    // silent truncation the maxlength="256" attributes were added to prevent. Normalising here
    // makes the load path, the input fields and the exporter agree on one contract, not three.
    o[k]=v.replace(/[\u0000-\u001f]/g,'').slice(0,256);
  }
  return o;
}
/* ---------- expression editor (Round 479) ----------
   Only the 4 emotion expressions are user-editable — vowels are VRChat lip-sync visemes and
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
// meta gets the same defense-in-depth sanitizeMeta() applies on load — exprMix already did
// (sanitizeExprMix below); before this, a meta value corrupted in memory was written back out
// verbatim even though the UI <select> could no longer display it.
function serialize(p, meta, exprMix){ return JSON.stringify({app:'hina', version:VERSION, params:p, meta:sanitizeMeta(meta), exprMix:sanitizeExprMix(exprMix)}, null, 1); }
function deserialize(text){
  // Strip UTF-8 BOM (U+FEFF) — common when JSON is edited in Notepad on Windows;
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
