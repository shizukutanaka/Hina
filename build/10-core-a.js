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
  // 物理
  springOff: {k:'bool', def:false, tab:'phys', ja:'揺れ物オフ (Quest Excellent)', en:'No springs (Quest Excellent)'},
  hairStiff: {k:'num', min:0, max:1, def:0.65, step:0.01, tab:'phys', ja:'髪の硬さ', en:'Hair stiffness'},
  hairGrav:  {k:'num', min:0, max:1, def:0.05, step:0.01, tab:'phys', ja:'重力', en:'Gravity'},
  hairDrag:  {k:'num', min:0, max:1, def:0.4, step:0.01, tab:'phys', ja:'減衰', en:'Drag'},
};

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
    else if (s.k==='bool' && k!=='springOff') p[k]=r()<0.5;
    else if (s.k==='color') p[k]=pick(PAL[s.pal]);
  }
  p.springOff=false;
  return sanitize(p);
}

/* ---------- i18n ---------- */
const I18N = {
  ja: {
    'tab.preset':'プリセット','tab.body':'体格','tab.face':'顔','tab.hair':'髪','tab.outfit':'服','tab.color':'色','tab.phys':'物理','tab.out':'出力',
    'btn.gacha':'ガチャ（ランダム生成）','gacha.seed':'シード: ','gacha.seed.ph':'シード番号を入力して再実行','btn.copySeed':'コピー','btn.export':'VRM 書き出し','btn.exporting':'書き出し中…','btn.exported':'✓ 書き出し完了','btn.saveJson':'パラメータ保存 (.json)','btn.loadJson':'パラメータ読込','btn.reset':'初期化','btn.reset.confirm':'初期化しますか？変更は失われます。','btn.revert':'↺ {p} に戻す','hint.ctrlS':'Ctrl+S → VRM書き出し / Ctrl+Shift+S → JSON保存 / Ctrl+Z → 元に戻す / ? → ヘルプ / 1〜8 → タブ切替',
    'mode.easy':'かんたん','mode.detail':'詳細',
    'out.meta':'メタ情報','out.stats':'統計','out.title':'タイトル','out.version':'バージョン','out.author':'作者','out.contact':'連絡先','out.reference':'参照元','out.filename':'ファイル名','out.license':'ライセンス','out.allowed':'使用許可','out.commercial':'商用利用','out.violent':'暴力表現','out.sexual':'性的表現',
    'out.version.ph':'例: 1.0','out.contact.ph':'例: https://example.com','out.reference.ph':'例: オリジナルアバター',
    'out.license.url':'ライセンス URL（Other 選択時）','out.license.url.ph':'例: https://example.com/license',
    'st.tris':'三角形','st.bones':'ボーン','st.mat':'マテリアル','st.mesh':'スキンメッシュ','st.spring':'揺れ物ボーン','st.chains':'揺れ物チェーン','st.tex':'テクスチャ推定',
    'rank.Excellent':'Excellent','rank.Good':'Good','rank.Medium':'Medium','rank.Poor':'Poor','rank.VeryPoor':'Very Poor',
    'rank.tip.Excellent':'全ユーザーにデフォルト表示','rank.tip.Good':'Good以上を許可したユーザーに表示','rank.tip.Medium':'Medium以上を許可したユーザーのみ表示','rank.tip.Poor':'Poor以上を許可したユーザーのみ表示','rank.tip.VeryPoor':'ほぼ全ユーザーに非表示',
    'hint.exprOff':'クリックで解除','hint.drag':'ドラッグ/矢印キー: 回転 / ホイール・+−: ズーム / ダブルクリック・Home: リセット','hint.undoReady':'Ctrl+Z → 元に戻す','hint.saved':'✓ 自動保存',
    'hint.noGL':'WebGL が使えません — プレビュー無効（書き出しは動作します）',
    'hint.glLost':'WebGL コンテキストが失われました — ページを再読み込みしてください',
    'a11y.canvas':'アバターの3Dプレビュー。矢印キーで回転、＋／−でズーム、Homeで初期位置に戻ります。',
    'a11y.stage':'3Dプレビューエリア','a11y.panel':'アバター設定パネル','a11y.about.btn':'雛について',
    'a11y.exprActive':'表情: {expr}','a11y.exprNeutral':'ニュートラルに戻りました',
    'a11y.rankStatus':'性能ランク — PC: {pc} / Quest: {q}',
    'a11y.rankBadge':'ランクバッジ — クリックで統計タブへ',
    'a11y.exported':'{name} を書き出しました（約{size}）',
    'note.quest':'揺れ物オフで Quest Excellent。オンの場合は Quest Good。','note.quest.nospring':'この髪型では揺れ物ボーンがありません（常に Quest Excellent）。',
    'about':'ブラウザだけでVRChat用アバター(VRM 0.x)を作るツール。完全ローカル動作・外部送信なし・依存ゼロ。','about.close':'閉じる',
    'allowed.OnlyAuthor':'作者のみ','allowed.ExplicitlyLicensedPerson':'許可された人','allowed.Everyone':'全員',
    'usage.Disallow':'不可','usage.Allow':'可',
    'license.Redistribution_Prohibited':'再配布禁止','license.CC0':'CC0（パブリックドメイン）',
    'license.CC_BY':'CC BY','license.CC_BY_NC':'CC BY-NC','license.CC_BY_SA':'CC BY-SA',
    'license.CC_BY_NC_SA':'CC BY-NC-SA','license.CC_BY_ND':'CC BY-ND','license.CC_BY_NC_ND':'CC BY-NC-ND','license.Other':'その他',
    'out.title.ph':'例: 雛アバター','out.author.ph':'例: あなたの名前',
    'selftest.ok':'自己診断: 全て正常','selftest.ng':'自己診断: 異常あり',
    'err.loadFailed':'JSONファイルを読み込めませんでした（形式が不正か、雛のJSONではありません）',
    'err.buildFailed':'アバター生成に失敗しました',
    'err.exportFailed':'VRM書き出しに失敗しました',
    'guide.t':'VRChat導入手順','guide.s1':'1. Unity Hub + VCC でアバタープロジェクト作成','guide.s2':'2. UniVRM (v0.x) をインポート','guide.s3':'3. VRM Converter for VRChat をインポート','guide.s4':'4. .vrm をドラッグ →「VRChatアバターに変換」','guide.s5':'5. VRChat SDK でビルド & アップロード',
    'rank.limit':'律速',
    'enum.eyeShape.round':'丸','enum.eyeShape.tare':'たれ目','enum.eyeShape.tsuri':'つり目','enum.eyeShape.jito':'じと目',
    'enum.browType.soft':'やわらか','enum.browType.straight':'まっすぐ','enum.browType.arch':'アーチ',
    'enum.hairStyle.short':'ショート','enum.hairStyle.bob':'ボブ','enum.hairStyle.long':'ロング','enum.hairStyle.twin':'ツイン','enum.hairStyle.pony':'ポニー',
    'enum.bangs.full':'フル','enum.bangs.see':'シースルー','enum.bangs.center':'センター分け',
    'enum.outfit.onepiece':'ワンピース','enum.outfit.sailor':'セーラー','enum.outfit.shirts':'シャツ','enum.outfit.hoodie':'パーカー',
    'enum.sleeves.long':'長袖','enum.sleeves.short':'半袖',
    'cat.tris':'三角形','cat.bones':'ボーン','cat.skinned':'スキンメッシュ','cat.mesh':'メッシュ','cat.mat':'マテリアル','cat.pbComp':'揺れ物部品','cat.pbTrans':'揺れ物ボーン','cat.pbCol':'コライダ','cat.pbCheck':'衝突判定','cat.texMB':'テクスチャ',
    'st.vrm':'VRMサイズ推定',
    'note.upload':'VRChatへは Unity + VRM Converter for VRChat 経由でアップロード。以下の手順を参照。',
    'expr.neutral':'ニュートラル','expr.a':'あ','expr.i':'い','expr.u':'う','expr.e':'え','expr.o':'お',
    'expr.blink':'まばたき','expr.joy':'喜び','expr.angry':'怒り','expr.sorrow':'悲しみ','expr.fun':'楽しい',
    'lbl.height':'高さ',
  },
  en: {
    'tab.preset':'Presets','tab.body':'Body','tab.face':'Face','tab.hair':'Hair','tab.outfit':'Outfit','tab.color':'Colors','tab.phys':'Physics','tab.out':'Export',
    'btn.gacha':'Gacha (randomize)','gacha.seed':'Seed: ','gacha.seed.ph':'Enter seed to replay','btn.copySeed':'Copy','btn.export':'Export VRM','btn.exporting':'Exporting…','btn.exported':'✓ Exported','btn.saveJson':'Save params (.json)','btn.loadJson':'Load params','btn.reset':'Reset','btn.reset.confirm':'Reset to defaults? All changes will be lost.','btn.revert':'↺ Revert to {p}','hint.ctrlS':'Ctrl+S → Export VRM / Ctrl+Shift+S → Save JSON / Ctrl+Z → Undo / ? → Help / 1-8 → Switch tab',
    'mode.easy':'Easy','mode.detail':'Detail',
    'out.meta':'Metadata','out.stats':'Stats','out.title':'Title','out.version':'Version','out.author':'Author','out.contact':'Contact','out.reference':'Reference','out.filename':'File name','out.license':'License','out.allowed':'Allowed users','out.commercial':'Commercial','out.violent':'Violence','out.sexual':'Sexual',
    'out.version.ph':'e.g. 1.0','out.contact.ph':'e.g. https://example.com','out.reference.ph':'e.g. Original avatar',
    'out.license.url':'License URL (when Other)','out.license.url.ph':'e.g. https://example.com/license',
    'st.tris':'Triangles','st.bones':'Bones','st.mat':'Materials','st.mesh':'Skinned meshes','st.spring':'Spring bones','st.chains':'Spring chains','st.tex':'Texture est.',
    'rank.Excellent':'Excellent','rank.Good':'Good','rank.Medium':'Medium','rank.Poor':'Poor','rank.VeryPoor':'Very Poor',
    'rank.tip.Excellent':'Visible to all users by default','rank.tip.Good':'Visible to users allowing Good+','rank.tip.Medium':'Visible only to users allowing Medium+','rank.tip.Poor':'Visible only to users allowing Poor+','rank.tip.VeryPoor':'Hidden for most users',
    'hint.exprOff':'click to deactivate','hint.drag':'Drag/Arrows: rotate / Wheel · +−: zoom / Double-click · Home: reset','hint.undoReady':'Ctrl+Z → Undo','hint.saved':'✓ Auto-saved',
    'hint.noGL':'WebGL unavailable — preview disabled (export still works)',
    'hint.glLost':'WebGL context lost — reload to restore preview',
    'a11y.canvas':'3D preview of your avatar. Arrow keys rotate, +/− zoom, Home resets the view.',
    'a11y.stage':'3D preview area','a11y.panel':'Avatar settings panel','a11y.about.btn':'About Hina',
    'a11y.exprActive':'Expression: {expr}','a11y.exprNeutral':'Returned to neutral',
    'a11y.rankStatus':'Performance — PC: {pc} / Quest: {q}',
    'a11y.rankBadge':'Rank badge — click to open Stats tab',
    'a11y.exported':'Exported {name} (~{size})',
    'note.quest':'Springs OFF → Quest Excellent. ON → Quest Good.','note.quest.nospring':'No spring bones for this hair style (always Quest Excellent).',
    'about':'Make a VRChat-ready avatar (VRM 0.x) in your browser. Fully local, zero network, zero dependencies.','about.close':'Close',
    'allowed.OnlyAuthor':'Only author','allowed.ExplicitlyLicensedPerson':'Licensed person','allowed.Everyone':'Everyone',
    'usage.Disallow':'Disallow','usage.Allow':'Allow',
    'license.Redistribution_Prohibited':'No redistribution','license.CC0':'CC0 (Public domain)',
    'license.CC_BY':'CC BY','license.CC_BY_NC':'CC BY-NC','license.CC_BY_SA':'CC BY-SA',
    'license.CC_BY_NC_SA':'CC BY-NC-SA','license.CC_BY_ND':'CC BY-ND','license.CC_BY_NC_ND':'CC BY-NC-ND','license.Other':'Other',
    'out.title.ph':'e.g. my-avatar','out.author.ph':'e.g. Your Name',
    'selftest.ok':'Self-test: all OK','selftest.ng':'Self-test: FAILED',
    'err.loadFailed':'Could not load JSON (invalid format or not a Hina file)',
    'err.buildFailed':'Avatar build failed',
    'err.exportFailed':'VRM export failed',
    'guide.t':'VRChat upload steps','guide.s1':'1. Create an avatar project with Unity Hub + VCC','guide.s2':'2. Import UniVRM (v0.x)','guide.s3':'3. Import VRM Converter for VRChat','guide.s4':'4. Drag the .vrm in → "Convert to VRChat avatar"','guide.s5':'5. Build & upload with the VRChat SDK',
    'rank.limit':'Limited by',
    'enum.eyeShape.round':'Round','enum.eyeShape.tare':'Drooping','enum.eyeShape.tsuri':'Sharp','enum.eyeShape.jito':'Half-lidded',
    'enum.browType.soft':'Soft','enum.browType.straight':'Straight','enum.browType.arch':'Arched',
    'enum.hairStyle.short':'Short','enum.hairStyle.bob':'Bob','enum.hairStyle.long':'Long','enum.hairStyle.twin':'Twintails','enum.hairStyle.pony':'Ponytail',
    'enum.bangs.full':'Full','enum.bangs.see':'See-through','enum.bangs.center':'Center part',
    'enum.outfit.onepiece':'One-piece','enum.outfit.sailor':'Sailor','enum.outfit.shirts':'Shirt','enum.outfit.hoodie':'Hoodie',
    'enum.sleeves.long':'Long','enum.sleeves.short':'Short',
    'cat.tris':'Triangles','cat.bones':'Bones','cat.skinned':'Skinned meshes','cat.mesh':'Meshes','cat.mat':'Materials','cat.pbComp':'PhysBones','cat.pbTrans':'PB transforms','cat.pbCol':'Colliders','cat.pbCheck':'Collision checks','cat.texMB':'Texture memory',
    'st.vrm':'VRM size est.',
    'note.upload':'Upload to VRChat via Unity + VRM Converter for VRChat. Follow the steps below.',
    'expr.neutral':'Neutral','expr.a':'A','expr.i':'I','expr.u':'U','expr.e':'E','expr.o':'O',
    'expr.blink':'Blink','expr.joy':'Joy','expr.angry':'Angry','expr.sorrow':'Sorrow','expr.fun':'Fun',
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
   Source: creators.vrchat.com "Performance Ranks" (2026-04-21). [E,G,M,P]; above P = Very Poor. */
const RANKS = {
  pc: {
    tris:[32000,70000,70000,70000], bones:[75,150,256,400], skinned:[1,2,8,16], mesh:[4,8,16,24],
    mat:[4,8,16,32], pbComp:[4,8,16,32], pbTrans:[16,64,128,256], pbCol:[4,8,16,32], pbCheck:[32,128,256,512],
    texMB:[40,75,110,150],
  },
  quest: {
    tris:[7500,10000,15000,20000], bones:[75,90,150,150], skinned:[1,1,2,2], mesh:[1,1,2,2],
    mat:[1,1,2,4], pbComp:[0,4,6,8], pbTrans:[0,16,32,64], pbCol:[0,4,8,16], pbCheck:[0,16,32,64],
    texMB:[10,18,25,40],
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
function serialize(p, meta){ return JSON.stringify({app:'hina', version:VERSION, params:p, meta:meta||{}}, null, 1); }
function deserialize(text){
  let j; try{ j=JSON.parse(text); }catch(e){ return null; }
  if (!j || j.app!=='hina') return null;
  return { params: sanitize(j.params), meta: (j.meta && typeof j.meta==='object' && !Array.isArray(j.meta)) ? j.meta : {} };
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
