#!/usr/bin/env node
/* 雛 (Hina) test suite — zero dependencies. Run: node tests/run.js */
'use strict';
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
const fails = [];
function ok(cond, name){
  if (cond) pass++;
  else { fail++; fails.push(name); console.error('  NG ' + name); }
}
function near(a, b, eps, name){ ok(Math.abs(a-b) <= (eps==null?1e-6:eps), name + ` (got ${a}, want ${b})`); }

/* ---- load core from index.html (same extraction the browser never needs) ---- */
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const cs = html.indexOf('/*HINA-CORE-START*/'), ce = html.indexOf('/*HINA-CORE-END*/');
ok(cs >= 0 && ce > cs, 'core markers present in index.html');
const mod = { exports: {} };
new Function('module', 'exports', html.slice(cs, ce))(mod, mod.exports);
const H = mod.exports;
const M = H.M;

/* ---- index.html structural (zero-dependency claim) ---- */
ok(html.startsWith('<!DOCTYPE html>'), 'doctype first');
ok(!/<script[^>]*\ssrc=/.test(html), 'no external <script src>');
ok(!/<link[^>]*\shref=/.test(html), 'no external <link href>');
ok(!/\bfetch\s*\(\s*['"]http/.test(html), 'no external fetch');
ok((html.match(/<canvas/g) || []).length === 1, 'single canvas');
ok(html.includes("'guide.s1'") && html.indexOf("guide.s1") !== html.lastIndexOf("guide.s1"), 'in-app upload guide wired (i18n + UI)');
// WCAG 2.1.1: the 3D preview must be keyboard-operable (focusable + key handler + aria-label)
ok(/<canvas[^>]*\btabindex=/.test(html), 'canvas is keyboard-focusable (tabindex)');
ok(/addEventListener\(['"]keydown['"]/.test(html), 'keyboard camera handler wired');
ok(html.includes("'a11y.canvas'"), 'canvas aria-label i18n key present');
// WCAG 3.1.1 — page language updated on language switch
ok(html.includes('documentElement.lang'), 'applyLang() updates <html lang> attribute (WCAG 3.1.1)');
// WCAG 1.3.1 — stat table row headers
ok(html.includes("el('th',{scope:'row'}"), 'stat table uses th[scope=row] for label cells (WCAG 1.3.1)');
// Preset cards expose active state to assistive tech
ok(html.includes("'aria-pressed':String(activePresetId===pre.id)"), 'preset cards have aria-pressed for screen reader active-state');
// WCAG 4.1.3 — status messages: a polite live region announces rank/export changes
ok(/id="srStatus"[^>]*aria-live=/.test(html), 'live status region present with aria-live');
ok(html.includes("'aria-label':t('out.stats')"), 'stat table has aria-label for screen reader identification (WCAG 1.3.1)');
ok(/announceRank\s*\(/.test(html), 'rank-change announcer wired');
ok(/err\.loadFailed/.test(html), 'JSON load-failure uses err.loadFailed i18n key');
ok(/err\.buildFailed/.test(html), 'buildAvatar failure uses err.buildFailed i18n key');
ok(/saveState/.test(html) && /clearTimeout/.test(html), 'saveState is debounced (clearTimeout present)');
ok(/buildAvatar[\s\S]{0,60}catch/.test(html), 'rebuild() catches buildAvatar errors');
ok(/'license',\s*v=>/.test(html) || /"license",\s*v=>/.test(html) || /'license'\)/.test(html), 'license selRow uses translation prefix with dynamic callback');
// ARIA tablist pattern (WCAG 2.1.1 for tab navigation)
ok(html.includes('role="tabpanel"'), 'tabBody has role=tabpanel');
ok(html.includes('aria-controls'), 'tab buttons have aria-controls');
ok(html.includes('tabindex="-1"') || /tabindex:.*-1/.test(html), 'non-active tabs use tabindex=-1 (roving)');
ok(html.includes("'aria-labelledby','tab-"), 'tabpanel aria-labelledby wired to active tab');
ok(html.includes('TABS.indexOf(activeTab)'), 'tab list has arrow-key navigation (indexOf pattern)');
ok(H.I18N.ja['btn.reset.confirm'] && H.I18N.en['btn.reset.confirm'], 'reset confirm message in both languages');
ok(html.includes("'btn.reset.confirm'"), 'Reset button guarded by confirmation');
ok(H.I18N.ja['gacha.seed'] && H.I18N.en['gacha.seed'], 'gacha seed label i18n in both languages');
ok(H.I18N.ja['out.contact'] && H.I18N.en['out.contact'], 'VRM contact field label in both languages');
ok(H.I18N.ja['out.reference'] && H.I18N.en['out.reference'], 'VRM reference field label in both languages');
ok(H.I18N.ja['out.filename'] && H.I18N.en['out.filename'], 'out.filename label in both languages');
ok(html.includes('--text-faint:#7a868f'), 'text-faint color meets WCAG AA contrast ratio on dark bg');
ok(html.includes("ctrlKey||e.metaKey") && html.includes("e.key==='s'"), 'Ctrl/Cmd+S shortcut wired to export');
ok(html.includes("'for':id") || html.includes('"for":id'), 'Export tab labels have for attribute (WCAG 1.3.1)');
ok(html.includes("'meta-title'") || html.includes('"meta-title"'), 'title input has id for label association');
ok(H.I18N.ja['hint.ctrlS'] && H.I18N.en['hint.ctrlS'], 'Ctrl+S hint label in both languages');
ok(html.includes('document.title'), 'document.title updated dynamically with avatar name');
ok(html.includes("object-src 'none'") && html.includes("base-uri 'none'"), 'CSP meta blocks object/base injection');
ok(html.includes("const pid='pr-'+k") && html.includes("'for':pid"), 'paramRow inputs have for/id label association (WCAG 1.3.1)');
ok(H.I18N.ja['a11y.stage'] && H.I18N.en['a11y.stage'], 'stage landmark label i18n');
ok(H.I18N.ja['a11y.panel'] && H.I18N.en['a11y.panel'], 'panel landmark label i18n');
ok(html.includes("$('stage').setAttribute('aria-label'"), 'section#stage has aria-label landmark');
ok(html.includes('fnameStem'), 'fnameStem() used for export filename');
ok(html.includes("activePresetId||'custom'"), 'filename fallback uses preset ID');
ok(html.includes('activePresetId'), 'active preset selection state tracked');
ok(html.includes('lastGachaSeed'), 'gacha seed tracked for reproducibility');
ok(H.I18N.ja['gacha.seed.ph'] && H.I18N.en['gacha.seed.ph'], 'gacha seed placeholder i18n in both languages');
ok(html.includes('runGacha'), 'gacha runs through shared runGacha() for seed reuse');
ok(html.includes("maxlength:'256'"), 'VRM meta text inputs have maxlength=256 matching writer truncation');
ok(H.I18N.ja['hint.noGL'] && H.I18N.en['hint.noGL'], 'WebGL unavailable hint i18n in both languages');
ok(H.I18N.ja['hint.glLost'] && H.I18N.en['hint.glLost'], 'WebGL context-lost hint i18n in both languages');
ok(html.includes("GLOK ? t('hint.drag') : t('hint.noGL')"), 'applyLang() uses localized hint conditionally');
ok(html.includes('aria-labelledby="aboutH2"'), 'About dialog has aria-labelledby for accessible name');
ok(html.includes('<noscript>'), 'noscript fallback message present for JS-disabled users');
ok(H.I18N.ja['a11y.about.btn'] && H.I18N.en['a11y.about.btn'], 'About button aria-label i18n in both languages');
ok(html.includes("$('btnAbout').setAttribute('aria-label'"), 'About button aria-label set dynamically in applyLang()');
ok(html.includes("_rmMQ.addEventListener('change'"), 'prefers-reduced-motion MediaQuery change event wired for live updates');
ok(html.includes('name="theme-color"') && html.includes('#0F1216'), 'theme-color meta present for mobile browser theming');
ok(html.includes('apple-mobile-web-app-capable'), 'apple-mobile-web-app-capable meta for iOS home screen');
ok(html.includes('activePresetId, lastGachaSeed'), 'activePresetId and lastGachaSeed saved to localStorage');
ok(html.includes('Number.isFinite(j.lastGachaSeed)'), 'lastGachaSeed restored safely handling 0 value');
ok(html.includes("addEventListener('beforeunload'") && html.includes('clearTimeout(_saveTimer)'), 'beforeunload flushes debounced saveState to avoid losing last edit');
ok(/deserialize[\s\S]{0,120}activePresetId=null/.test(html), 'JSON load clears stale activePresetId so preset highlight resets');
ok(H.I18N.ja['err.exportFailed'] && H.I18N.en['err.exportFailed'], 'export error message i18n in both languages');
ok(html.includes('_exporting') && html.includes('_exporting = false'), 'doExport has re-entrancy guard (_exporting flag)');
ok(H.I18N.ja['btn.exporting'] && H.I18N.en['btn.exporting'], 'btn.exporting loading label in both languages');
ok(html.includes('_exportBtn') && html.includes("_exportBtn.disabled = true"), 'export button disabled during export to prevent double-clicks');
ok(html.includes("_exportBtn.textContent = t('btn.exporting')"), 'export button text changes to loading label during export');
ok(html.includes('META_DEFAULTS') && /reset\.confirm[\s\S]{0,200}META_DEFAULTS/.test(html), 'reset button restores meta to defaults via META_DEFAULTS');
ok(html.includes("dataTransfer.types.includes('Files')") && html.includes("dataTransfer.files"), 'drag-and-drop JSON loading wired with file-type guard');
ok(/document\.title\s*=.*fnameStem/.test(html), 'document.title updated in rebuild() so browser tab reflects loaded title immediately');
ok(html.includes('visibilitychange') && html.includes('_rafPaused'), 'rAF loop pauses on page visibility hidden (saves CPU/battery on mobile)');
ok(/n>=0\)\s*runGacha/.test(html), 'gacha seed input accepts seed 0 (n>=0 guard in seed handler)');
ok(html.includes('webglcontextrestored') && html.includes('location.reload'), 'webglcontextrestored triggers reload to re-init GL resources');
ok(html.includes('HINA.PRESETS.some') && html.includes("j.activePresetId"), 'activePresetId validated against PRESETS list on load to guard against stale IDs');
ok(/camDist.*camDist.*H.*prevH/.test(html), 'camDist scales proportionally with avatar height in uploadGeometry()');
ok(/if \(!drag\)\{\s*gazeX=M\.clamp/.test(html), 'gaze update skipped during drag and M.clamp prevents eye over-rotation outside canvas');
ok(H.I18N.ja['license.Other'] && H.I18N.en['license.Other'], 'license.Other i18n in both languages');
ok(H.I18N.ja['out.license.url'] && H.I18N.en['out.license.url'], 'out.license.url label i18n in both languages');
ok(H.I18N.ja['out.version'] && H.I18N.en['out.version'], 'out.version label i18n in both languages');
ok(html.includes("e.key==='?'") && html.includes('aboutDlg'), '? key opens About dialog (keyboard discoverability)');
ok(html.includes("type:'button'") && /type:'button'[\s\S]{0,80}class:'sw'/.test(html), 'color swatch buttons have type=button (form-safe)');
ok(html.includes("'out.version','version'") && html.includes("version:''"), 'version field in UI and META_DEFAULTS');
ok(html.includes("meta.licenseUrl") && html.includes("META_DEFAULTS") && html.includes("licenseUrl:''"), 'licenseUrl in META_DEFAULTS and wired to UI');
ok(/bd\.scrollTop\s*=\s*0/.test(html), 'renderBody() resets scrollTop to 0 so tab switches start at top');
{
  const png = H.b64ToBytes(H.PNG1);
  const b0 = H.buildAvatar(H.defaults());
  const ex = H.exportVRM(b0, H.defaults(), { license: 'Other', licenseUrl: 'https://example.com/lic' }, png);
  ok(ex.json.extensions.VRM.meta.licenseName === 'Other' && ex.json.extensions.VRM.meta.otherLicenseUrl === 'https://example.com/lic',
    'otherLicenseUrl passes through to VRM meta when license=Other');
  const exCC0 = H.exportVRM(b0, H.defaults(), { license: 'CC0', licenseUrl: 'https://stale.url/lic' }, png);
  ok(exCC0.json.extensions.VRM.meta.otherLicenseUrl === '', 'otherLicenseUrl is empty when license is not Other (stale URL not leaked)');
  const ex2 = H.exportVRM(b0, H.defaults(), { version: '2.3' }, png);
  ok(ex2.json.extensions.VRM.meta.version === '2.3', 'meta.version passes through to VRM writer');
}
ok(html.includes('CLAMP_TO_EDGE') && !html.includes('TEXTURE_WRAP_S,gl.REPEAT'), 'texture atlas uses CLAMP_TO_EDGE to prevent edge bleed (not REPEAT)');
ok(!html.includes('HINA.M.clamp'), 'no HINA.M.clamp calls — use local M alias consistently');
ok(html.includes("'Other']") && (html.includes("'Other'],'license'") || html.includes("'license',")), 'Other license option in UI selector with license translation prefix');
ok(html.includes('wrapS:33071') && html.includes('wrapT:33071'), 'glTF sampler uses CLAMP_TO_EDGE (33071) consistent with WebGL preview');
ok(/licUrlRow\.style\.display/.test(html) && /meta\.license\s*===\s*['"]Other['"]/.test(html), 'licenseUrl row shown only when license=Other (conditional visibility)');
{
  const r0 = H.randomParams(0);
  ok(r0 && typeof r0.height === 'number', 'randomParams(0) — seed 0 produces valid params');
}
ok(!html.includes('gacha-seed'), 'dead .gacha-seed CSS class removed');
ok(!html.includes("outfit==='onepiece'?uC:uC"), 'dead ternary (onepiece?uC:uC) removed — skirt UV is simply uC');
ok(!html.includes('angular leg-follow weights'), 'dead sw() placeholder removed from skirt block');
ok(H.I18N.ja['about.close'] && H.I18N.en['about.close'], 'about.close button label i18n in both languages');

/* ---- math sanity ---- */
{
  const q = M.qAxis([0,1,0], Math.PI/2);
  const v = M.qRot(q, [0,0,-1]);
  near(v[0], -1, 1e-6, 'qRot yaw90 maps -Z to -X');
  near(v[2], 0, 1e-6, 'qRot yaw90 z=0');
  const r = M.qFromTo([0,-1,0], [1,0,0]);
  const w = M.qRot(r, [0,-1,0]);
  near(w[0], 1, 1e-6, 'qFromTo rotates a onto b');
  const id = M.mMul(M.mId(), M.mT(1,2,3));
  near(id[12], 1, 0, 'mMul translation x');
  const p = M.mApply(M.mT(1,2,3), [1,1,1]);
  near(p[1], 3, 0, 'mApply translate');
  near(M.clamp(5, 0, 1), 1, 0, 'clamp hi');
  near(M.smooth(0, 1, 0.5), 0.5, 1e-9, 'smoothstep midpoint');
  near(M.smooth(0, 1, 0), 0, 1e-9, 'smooth at a → 0');
  near(M.smooth(0, 1, 1), 1, 1e-9, 'smooth at b → 1');
  near(M.smooth(0, 1, -1), 0, 0, 'smooth below a → clamped to 0');
  near(M.smooth(0, 1, 2), 1, 0, 'smooth above b → clamped to 1');
  // qMul: yaw 90° twice = yaw 180°, mapping -Z → +Z
  const q90 = M.qAxis([0,1,0], Math.PI/2);
  const q180 = M.qMul(q90, q90);
  const vz = M.qRot(q180, [0,0,-1]);
  near(vz[2], 1, 1e-5, 'qMul: two 90° yaws → 180°, -Z becomes +Z');
  // mCompose with identity quat = pure translation
  const mc = M.mCompose(M.qid(), [3, 0, 0]);
  near(mc[12], 3, 1e-9, 'mCompose identity quat + translation sets m[12]');
  near(mc[0], 1, 1e-9, 'mCompose identity quat sets m[0]=1 (no rotation)');
  // mApplyRot: rotation-only, translation column ignored
  const mRot = M.mCompose(M.qAxis([0,1,0], Math.PI/2), [99,99,99]);
  const rotV = M.mApplyRot(mRot, [0,0,-1]);
  near(rotV[0], -1, 1e-5, 'mApplyRot ignores translation column');
}

/* ---- PARAMS schema ---- */
{
  const keys = Object.keys(H.PARAMS);
  ok(keys.length >= 30, 'PARAMS >= 30 entries');
  ok(keys.every(k => { const s = H.PARAMS[k];
    return typeof s.ja === 'string' && s.ja && typeof s.en === 'string' && s.en; }),
    'every param has ja+en labels');
  ok(keys.every(k => ['preset','body','face','hair','outfit','color','phys','out'].includes(H.PARAMS[k].tab)),
    'every param tab valid');
  ok(keys.filter(k => H.PARAMS[k].k === 'num').every(k => {
    const s = H.PARAMS[k]; return s.min <= s.def && s.def <= s.max && s.step > 0; }),
    'num: min<=def<=max, step>0');
  ok(keys.filter(k => H.PARAMS[k].k === 'enum').every(k => {
    const s = H.PARAMS[k]; return Array.isArray(s.opts) && s.opts.includes(s.def); }),
    'enum: def in opts');
  ok(keys.filter(k => H.PARAMS[k].k === 'color').every(k => {
    const s = H.PARAMS[k]; return H.HEXRE.test(s.def) && Array.isArray(H.PAL[s.pal]); }),
    'color: def hex + palette exists');
}

/* ---- i18n parity ---- */
{
  const ja = Object.keys(H.I18N.ja).sort(), en = Object.keys(H.I18N.en).sort();
  ok(ja.length === en.length && ja.every((k, i) => k === en[i]), 'i18n ja/en key parity');
  ok(ja.every(k => H.I18N.ja[k] && H.I18N.en[k]), 'i18n no empty values');
  // every enum option carries a localized label in both languages (UI never shows raw ids)
  const enumOpts = [];
  for (const k in H.PARAMS) if (H.PARAMS[k].k === 'enum')
    for (const o of H.PARAMS[k].opts) enumOpts.push('enum.' + k + '.' + o);
  ok(enumOpts.every(key => H.I18N.ja[key] && H.I18N.en[key]), 'every enum option has ja+en label');
  // every performance-rank category has a localized name (for the 律速 / limiting-factor display)
  const cats = Object.keys(H.RANKS.pc);
  ok(cats.every(c => H.I18N.ja['cat.' + c] && H.I18N.en['cat.' + c]), 'every rank category has ja+en label');
  ok(H.I18N.ja['rank.limit'] && H.I18N.en['rank.limit'], 'limiting-factor label present');
  ok(H.I18N.ja['err.loadFailed'] && H.I18N.en['err.loadFailed'], 'err.loadFailed key in both languages');
  ok(H.I18N.ja['err.buildFailed'] && H.I18N.en['err.buildFailed'], 'err.buildFailed key in both languages');
  ok(H.I18N.ja['note.quest.nospring'] && H.I18N.en['note.quest.nospring'], 'note.quest.nospring key in both languages (for hairstyles without spring bones)');
  ok(html.includes("'note.quest.nospring'") && html.includes("'note.quest'") && /hasS.*note\.quest/.test(html), 'phys tab shows dynamic spring note based on actual spring count');
  // stat row st.spring shows pbTrans (bone count), so label must say "bones" not "chains"
  ok(H.I18N.en['st.spring'].toLowerCase().includes('bone') && H.I18N.ja['st.spring'].includes('ボーン'),
    'st.spring label says "bones" (not "chains") — matches pbTrans value shown in stat table');
  ok(html.includes("'st.spring','pbTrans'") || html.includes('"st.spring","pbTrans"'),
    'stat table row st.spring maps to pbTrans accessor (not pbComp chain count)');
  ok(H.I18N.ja['st.chains'] && H.I18N.en['st.chains'], 'st.chains (pbComp) label in both languages');
  ok(html.includes("'st.chains','pbComp'") || html.includes('"st.chains","pbComp"'),
    'stat table has st.chains row wired to pbComp so users can see why Quest rank drops with springs');
  // skirtLen must be hidden for non-skirt outfits (shirts / hoodie have no skirt)
  ok(/k\s*===\s*['"]skirtLen['"]/.test(html) && /onepiece.*sailor|sailor.*onepiece/.test(html),
    'skirtLen hidden when outfit has no skirt (shirts/hoodie)');
  // every license option has a user-readable localized label (not raw technical id)
  const licenseOpts = ['Redistribution_Prohibited','CC0','CC_BY','CC_BY_NC','CC_BY_SA','CC_BY_NC_SA','CC_BY_ND','CC_BY_NC_ND','Other'];
  ok(licenseOpts.every(l => H.I18N.ja['license.'+l] && H.I18N.en['license.'+l]), 'all license options have ja+en labels');
  // title/author placeholder keys present
  ok(H.I18N.ja['out.title.ph'] && H.I18N.en['out.title.ph'], 'out.title.ph placeholder in both languages');
  ok(H.I18N.ja['out.author.ph'] && H.I18N.en['out.author.ph'], 'out.author.ph placeholder in both languages');
  // note.upload must not reference a file that doesn't exist in single-file distribution
  ok(!H.I18N.ja['note.upload'].includes('UPLOAD_GUIDE'), 'ja note.upload no stale file reference');
  ok(!H.I18N.en['note.upload'].includes('UPLOAD_GUIDE'), 'en note.upload no stale file reference');
}

/* ---- defaults / sanitize ---- */
{
  const d = H.defaults();
  ok(JSON.stringify(H.sanitize(null)) === JSON.stringify(d), 'sanitize(null) = defaults');
  ok(H.sanitize({height: 99}).height === H.PARAMS.height.max, 'sanitize clamps num high');
  ok(H.sanitize({height: -5}).height === H.PARAMS.height.min, 'sanitize clamps num low');
  ok(H.sanitize({hairStyle: 'mohawk'}).hairStyle === d.hairStyle, 'sanitize rejects bad enum');
  ok(H.sanitize({skinTone: 'red'}).skinTone === d.skinTone, 'sanitize rejects bad color');
  ok(H.sanitize({skinTone: '#FFD6BD'}).skinTone === '#ffd6bd', 'sanitize lowercases color');
  ok(H.sanitize({ahoge: 0}).ahoge === false, 'sanitize coerces bool');
  ok(H.sanitize({height: 'NaN'}).height === d.height, 'sanitize ignores non-finite num');
}

/* ---- color utilities ---- */
{
  const rgb = H.hex2rgb('#ff8040');
  ok(rgb[0] === 255 && rgb[1] === 128 && rgb[2] === 64, 'hex2rgb parses #rrggbb correctly');
  ok(H.hex2rgb('#000000').every(v => v === 0), 'hex2rgb black → [0,0,0]');
  ok(H.hex2rgb('#ffffff').every(v => v === 255), 'hex2rgb white → [255,255,255]');
  ok(H.shade('#808080', 2.0) === '#ffffff', 'shade clamps at 255 (white)');
  ok(H.shade('#808080', 0.0) === '#000000', 'shade clamps at 0 (black)');
  ok(H.shade('#808080', 1.0) === '#808080', 'shade ×1.0 is identity');
  ok(H.shade('#400000', 2.0) === '#800000', 'shade ×2.0 doubles channel');
  ok(/^#[0-9a-f]{6}$/.test(H.shade('#3a5a80', 0.7)), 'shade always returns valid lowercase hex');
  const png = H.b64ToBytes(H.PNG1);
  ok(png.length > 0 && png[0] === 137 && png[1] === 80, 'b64ToBytes decodes base64 to PNG bytes');
  ok(H.b64ToBytes('AQID').length === 3 && H.b64ToBytes('AQID')[0] === 1 && H.b64ToBytes('AQID')[2] === 3, 'b64ToBytes: AQID → [1,2,3]');
}

/* ---- rng / randomParams ---- */
{
  const a = H.rng(42), b = H.rng(42);
  ok([a(),a(),a()].join() === [b(),b(),b()].join(), 'rng deterministic per seed');
  let allOK = true, springOK = true, stable = true;
  for (let s = 0; s < 20; s++){
    const p = H.randomParams(s);
    if (p.springOff) springOK = false;
    if (JSON.stringify(H.sanitize(p)) !== JSON.stringify(p)) stable = false;
    if (p.height < 0.8 || p.height > 2.0) allOK = false;
  }
  ok(allOK, 'randomParams within bounds (20 seeds)');
  ok(springOK, 'randomParams never sets springOff');
  ok(stable, 'randomParams sanitize-stable');
  let buildOK = true, posOK = true;
  for (let s = 0; s < 10; s++){
    try {
      const b = H.buildAvatar(H.randomParams(s));
      if (!b.geom.pos.every(Number.isFinite) || !b.geom.nrm.every(Number.isFinite)) posOK = false;
    } catch(e) { buildOK = false; }
  }
  ok(buildOK, 'buildAvatar(randomParams(s)) does not throw for 10 seeds');
  ok(posOK, 'randomParams builds produce finite pos/nrm (10 seeds)');
}

/* ---- atlas UV helpers ---- */
{
  const b = H.uvBlock('skin');
  ok(b.length === 4 && b.every(v => v > 0 && v < 1) && b[0] === b[2] && b[1] === b[3],
    'uvBlock returns center point in 0..1');
  const r = H.uvRect('eyeL');
  ok(r[0] < r[2] && r[1] < r[3] && r.every(v => v >= 0 && v <= 1), 'uvRect ordered in 0..1');
}

/* ---- default build (twin) ---- */
const P = H.defaults();
const B = H.buildAvatar(P);
{
  ok(B.bones.length === 29, 'default bones = 29 (21 humanoid + 2x4 twin)');
  ok(H.HB.length === 21 && H.HB.every(hb => Number.isInteger(B.humanoid[hb])), 'humanoid 21 mapped');
  ok(new Set(H.HB.map(hb => B.humanoid[hb])).size === 21, 'humanoid mappings unique');
  ok(B.bones[B.idx.lUA].w[0] < 0 && B.bones[B.idx.rUA].w[0] > 0, 'VRM0: leftUpperArm x<0, rightUpperArm x>0');
  ok(B.bones[B.idx.lE].w[0] < 0 && B.bones[B.idx.rE].w[0] > 0, 'left/right eye sides');
  ok(B.bones[B.idx.lE].w[2] < 0, 'eyes face Z-minus');
  ok(B.bones.every((b, i) => b.parent < i), 'bone parents precede children');
  const g = B.geom, nV = g.pos.length / 3;
  ok(nV > 300 && nV < 65536, 'vertex count in uint16 range');
  ok(g.pos.every(Number.isFinite) && g.nrm.every(Number.isFinite), 'pos/nrm finite');
  let wOK = true, jOK = true;
  for (let v = 0; v < nV; v++){
    const s = g.wgt[v*4] + g.wgt[v*4+1] + g.wgt[v*4+2] + g.wgt[v*4+3];
    if (Math.abs(s - 1) > 1e-4) wOK = false;
    for (let k = 0; k < 4; k++) if (g.jnt[v*4+k] < 0 || g.jnt[v*4+k] >= B.bones.length) jOK = false;
  }
  ok(wOK, 'weights sum to 1');
  ok(jOK, 'joint indices in range');
  ok(g.idx.length % 3 === 0 && g.idx.every(i => i >= 0 && i < nV), 'indices valid triangles');
  ok(g.idx.length / 3 < 7500, 'default tris < 7500 (Quest Excellent)');
  ok(B.faceStart > 0 && B.faceStart < nV, 'faceStart inside mesh');
  ok(g.idx.slice(0, 60).every(i => i < B.faceStart), 'body indices precede face');
  ok(B.morphs.names.length === 12, '12 morph targets');
  ok(B.morphs.names.every(n => B.morphs.sparse[n].length > 0), 'all 12 morph targets non-empty');
  ok(B.morphs.sparse.a.every(e => e.length === 4 && e[0] < nV), 'morph entries [vi,dx,dy,dz]');
  ok(B.springs.length === 2, 'twin: 2 spring chains');
  ok(B.collider && B.collider.bone === B.idx.head && B.collider.radius > 0, 'head collider present');
  // hairHi UV: center of the [448,768] atlas block = (480/1024, 800/1024)
  const hiU = 480/1024, hiV = 800/1024;
  let hasHairHi = false;
  for (let i = 0; i < g.uv.length; i += 2){
    if (Math.abs(g.uv[i] - hiU) < 1e-5 && Math.abs(g.uv[i+1] - hiV) < 1e-5){ hasHairHi = true; break; }
  }
  ok(hasHairHi, 'hairHi atlas UV used in geometry (crown highlight active)');
}

/* ---- spring chains per hairstyle ---- */
{
  const counts = { twin: 2, pony: 1, long: 3, short: 0, bob: 0 };
  for (const style in counts){
    const b = H.buildAvatar(Object.assign(H.defaults(), { hairStyle: style }));
    ok(b.springs.length === counts[style], `springs(${style}) = ${counts[style]}`);
    ok(b.springs.every(sp => sp.boneIdxs.every(bi => b.bones[bi].hb === null)), `chain bones non-humanoid (${style})`);
  }
}

/* ---- socks toggle ---- */
{
  const sockOff = H.buildAvatar(Object.assign(H.defaults(), { socks: false }));
  ok(sockOff.geom.idx.length < B.geom.idx.length, 'socks=false produces fewer triangles than default (socks=true)');
  ok(sockOff.geom.pos.every(Number.isFinite) && sockOff.geom.nrm.every(Number.isFinite), 'socks=false build has finite pos/nrm');
  ok(sockOff.geom.idx.length % 3 === 0 && sockOff.geom.idx.every(i => i >= 0 && i < sockOff.geom.pos.length / 3), 'socks=false indices valid');
}

/* ---- outfit variant builds ---- */
{
  for (const outfit of ['onepiece','sailor','shirts','hoodie']){
    const b = H.buildAvatar(Object.assign(H.defaults(), { outfit }));
    ok(b.geom.pos.every(Number.isFinite) && b.geom.nrm.every(Number.isFinite),
      `outfit=${outfit}: finite pos/nrm`);
    ok(b.geom.idx.length % 3 === 0 && b.geom.idx.every(i => i >= 0 && i < b.geom.pos.length / 3),
      `outfit=${outfit}: valid triangle indices`);
    ok(b.geom.wgt.every(Number.isFinite) && b.geom.jnt.every(Number.isFinite),
      `outfit=${outfit}: finite skin weights/joints`);
  }
  // sleeves:short — same ring count as long, just shorter endpoint; verify finite + valid
  const shortSleeve = H.buildAvatar(Object.assign(H.defaults(), { sleeves: 'short' }));
  ok(shortSleeve.geom.pos.every(Number.isFinite) && shortSleeve.geom.nrm.every(Number.isFinite),
    'sleeves=short: finite pos/nrm');
  ok(shortSleeve.geom.idx.length % 3 === 0 &&
     shortSleeve.geom.idx.every(i => i >= 0 && i < shortSleeve.geom.pos.length / 3),
    'sleeves=short: valid triangle indices');
  ok(shortSleeve.geom.idx.length === B.geom.idx.length,
    'sleeves=short same tri count as long (same ring topology, different endpoint position)');
}

/* ---- rank boundaries (synthetic stats) ---- */
{
  const base = { tris: 1, bones: 1, skinned: 1, mesh: 0, mat: 1, pbComp: 0, pbTrans: 0, pbCol: 0, pbCheck: 0, texMB: 1 };
  ok(H.rank(Object.assign({}, base, { tris: 7500 }), 'quest').rank === 'Excellent', 'quest tris 7500 = Excellent');
  ok(H.rank(Object.assign({}, base, { tris: 7501 }), 'quest').rank === 'Good', 'quest tris 7501 = Good');
  ok(H.rank(Object.assign({}, base, { bones: 76 }), 'quest').rank === 'Good', 'quest bones 76 = Good');
  ok(H.rank(Object.assign({}, base, { tris: 20001 }), 'quest').rank === 'VeryPoor', 'quest tris 20001 = VeryPoor');
  const r = H.rank(Object.assign({}, base, { tris: 70001 }), 'pc');
  ok(r.rank === 'VeryPoor' && r.worst.includes('tris'), 'pc tris 70001 = VeryPoor, worst lists tris');
  ok(H.RANK_NAMES.length === 5, '5 rank names');
}

/* ---- estimate ---- */
{
  const est = H.estimate(B, P);
  ok(est.tris === B.geom.idx.length / 3, 'estimate tris matches mesh');
  ok(est.bones === 29 && est.mat === 1 && est.skinned === 1 && est.mesh === 0, 'estimate bones/mat/skinned/mesh');
  ok(est.pbComp === 2 && est.pbTrans === 8, 'estimate physbones (twin springs on)');
  const off = H.estimate(B, Object.assign({}, P, { springOff: true }));
  ok(off.pbComp === 0 && off.pbTrans === 0 && off.pbCheck === 0 && off.pbCol === 0, 'springOff zeroes all physbone stats');
  ok(est.texMB > 0 && est.texMB < 10, 'texMB sane');
  ok(typeof est.approxBytes === 'number' && est.approxBytes > 150000 && est.approxBytes < 600000,
    'approxBytes in plausible VRM range (150KB–600KB, incl. ~120KB atlas PNG estimate)');
}

/* ---- GLB / VRM export ---- */
function parseGLB(bytes){
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = {
    magic: dv.getUint32(0, true), ver: dv.getUint32(4, true), total: dv.getUint32(8, true),
    jLen: dv.getUint32(12, true), jType: dv.getUint32(16, true),
  };
  out.json = JSON.parse(Buffer.from(bytes.buffer, bytes.byteOffset + 20, out.jLen).toString('utf8'));
  const bo = 20 + out.jLen;
  out.bLen = dv.getUint32(bo, true); out.bType = dv.getUint32(bo + 4, true);
  out.bin = bytes.subarray(bo + 8, bo + 8 + out.bLen);
  return out;
}
function accData(j, bin, ai){
  const a = j.accessors[ai], v = j.bufferViews[a.bufferView];
  const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
  const off = bin.byteOffset + (v.byteOffset || 0);
  if (a.componentType === 5126) return new Float32Array(bin.buffer, off, a.count * N);
  if (a.componentType === 5123) return new Uint16Array(bin.buffer, off, a.count * N);
  if (a.componentType === 5121) return new Uint8Array(bin.buffer, off, a.count * N);
  throw new Error('componentType ' + a.componentType);
}
{
  const png = H.b64ToBytes(H.PNG1);
  ok(png[0] === 137 && png[1] === 80 && png[2] === 78 && png[3] === 71, 'PNG1 decodes to PNG signature');

  const ex = H.exportVRM(B, P, { title: 'テスト雛', author: 'm' }, png);
  const G = parseGLB(ex.bytes);
  ok(G.magic === 0x46546C67 && G.ver === 2, 'GLB magic + version 2');
  ok(G.total === ex.bytes.length, 'GLB declared length matches');
  ok(G.jLen % 4 === 0 && G.jType === 0x4E4F534A, 'JSON chunk aligned + typed');
  ok(G.bType === 0x004E4942, 'BIN chunk typed');
  const j = G.json;
  ok(j.asset.version === '2.0', 'asset version 2.0');
  ok(j.extensionsUsed.includes('VRM'), 'extensionsUsed VRM');
  ok(j.buffers[0].byteLength <= G.bLen, 'buffer fits BIN chunk');
  ok(j.nodes.length === B.bones.length + 2, 'nodes = bones + Root + mesh');
  ok(j.nodes[0].children.includes(1) && j.nodes[0].children.includes(B.bones.length + 1), 'Root children');
  ok(j.nodes[B.bones.length + 1].mesh === 0 && j.nodes[B.bones.length + 1].skin === 0, 'mesh node wired');
  // local translations
  let locOK = true;
  B.bones.forEach((b, i) => {
    const pw = b.parent >= 0 ? B.bones[b.parent].w : [0, 0, 0];
    const tr = j.nodes[i + 1].translation;
    for (let k = 0; k < 3; k++) if (Math.abs(tr[k] - (b.w[k] - pw[k])) > 1e-6) locOK = false;
  });
  ok(locOK, 'node translations are local (world - parentWorld)');
  ok(j.nodes.slice(1, B.bones.length + 1).every(n => !n.rotation && !n.scale), 'T-pose: no rotations in nodes');
  // skin
  ok(j.skins[0].joints.length === B.bones.length, 'skin joints = bone count');
  ok(j.skins[0].joints.every((n, i) => n === i + 1), 'skin joint order = bone order');
  const ibm = accData(j, G.bin, j.skins[0].inverseBindMatrices);
  ok(j.accessors[j.skins[0].inverseBindMatrices].type === 'MAT4', 'IBM MAT4');
  let ibmOK = true;
  B.bones.forEach((b, i) => {
    if (Math.abs(ibm[i*16+12] + b.w[0]) > 1e-6 || Math.abs(ibm[i*16+13] + b.w[1]) > 1e-6 ||
        Math.abs(ibm[i*16+14] + b.w[2]) > 1e-6 || ibm[i*16] !== 1) ibmOK = false;
  });
  ok(ibmOK, 'IBM = translate(-world), identity rotation');
  // primitive
  const prim = j.meshes[0].primitives[0];
  ok(['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0'].every(a => prim.attributes[a] !== undefined),
    'all vertex attributes present');
  ok(prim.targets.length === 12, '12 morph targets');
  ok(j.meshes[0].extras.targetNames.length === 12 && prim.extras.targetNames[0] === 'a',
    'targetNames in mesh + primitive extras');
  const nV = B.geom.pos.length / 3;
  const posAcc = j.accessors[prim.attributes.POSITION];
  ok(posAcc.count === nV && posAcc.min.length === 3 && posAcc.max.length === 3, 'POSITION count + min/max');
  const pos = accData(j, G.bin, prim.attributes.POSITION);
  let mmOK = true;
  for (let k = 0; k < 3; k++){
    let mn = Infinity, mx = -Infinity;
    for (let i = k; i < pos.length; i += 3){ if (pos[i] < mn) mn = pos[i]; if (pos[i] > mx) mx = pos[i]; }
    if (Math.abs(mn - posAcc.min[k]) > 1e-5 || Math.abs(mx - posAcc.max[k]) > 1e-5) mmOK = false;
  }
  ok(mmOK, 'POSITION min/max match data');
  const idxAcc = j.accessors[prim.indices];
  ok(idxAcc.componentType === 5123 && idxAcc.count % 3 === 0, 'indices ushort, count %3');
  const idx = accData(j, G.bin, prim.indices);
  ok(Math.max.apply(null, Array.from(idx)) < nV, 'index max < vertex count');
  const wgt = accData(j, G.bin, prim.attributes.WEIGHTS_0);
  let wOK = true;
  for (let v = 0; v < nV; v++){
    const s = wgt[v*4] + wgt[v*4+1] + wgt[v*4+2] + wgt[v*4+3];
    if (Math.abs(s - 1) > 1e-3) wOK = false;
  }
  ok(wOK, 'exported weights sum to 1');
  // accessors bounded
  const SZ = { 5126: 4, 5123: 2, 5121: 1 };
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  ok(j.accessors.every(a => {
    const blen = j.buffers[0].byteLength;
    if (a.bufferView === undefined && a.sparse) {
      if (!a.sparse.count) return true;
      const iv = j.bufferViews[a.sparse.indices.bufferView];
      const vv = j.bufferViews[a.sparse.values.bufferView];
      return iv && vv &&
        a.sparse.count * 2 <= iv.byteLength && (iv.byteOffset || 0) + iv.byteLength <= blen &&
        a.sparse.count * SZ[a.componentType] * NC[a.type] <= vv.byteLength &&
        (vv.byteOffset || 0) + vv.byteLength <= blen;
    }
    const v = j.bufferViews[a.bufferView];
    if (!v) return false;
    return a.count * SZ[a.componentType] * NC[a.type] <= v.byteLength &&
           (v.byteOffset || 0) + v.byteLength <= j.buffers[0].byteLength;
  }), 'all accessors within views within buffer');
  // sparse morph accessor structure + size savings
  {
    const morphAcc = j.accessors[prim.targets[0].POSITION];
    ok(morphAcc.bufferView === undefined && morphAcc.sparse !== undefined,
      'morph accessor uses glTF sparse (no base bufferView)');
    ok(morphAcc.sparse.count > 0 && morphAcc.sparse.indices.componentType === 5123,
      'sparse morph "a" has entries with UNSIGNED_SHORT indices');
    const sparseBytes = prim.targets.reduce((s, tgt) => {
      const acc = j.accessors[tgt.POSITION];
      if (!acc.sparse || !acc.sparse.count) return s;
      const iv = j.bufferViews[acc.sparse.indices.bufferView];
      const vv = j.bufferViews[acc.sparse.values.bufferView];
      return s + iv.byteLength + vv.byteLength;
    }, 0);
    const fullBytes = prim.targets.length * nV * 3 * 4;
    ok(sparseBytes < fullBytes * 0.5,
      `sparse morph data ${sparseBytes}B < 50% of full-array equivalent ${fullBytes}B`);
  }
  // glTF 2.0 §5.26: sparse indices MUST be in ascending order
  {
    let ascOK = true;
    for (const tgt of prim.targets){
      const acc = j.accessors[tgt.POSITION];
      if (!acc.sparse || !acc.sparse.count) continue;
      const iv = j.bufferViews[acc.sparse.indices.bufferView];
      const off = G.bin.byteOffset + (iv.byteOffset || 0);
      const idxArr = new Uint16Array(G.bin.buffer, off, acc.sparse.count);
      for (let k = 1; k < idxArr.length; k++){
        if (idxArr[k] <= idxArr[k-1]){ ascOK = false; break; }
      }
      if (!ascOK) break;
    }
    ok(ascOK, 'sparse morph indices are in strictly ascending order (glTF 2.0 §5.26)');
  }
  ok(j.bufferViews.every(v => (v.byteOffset || 0) % 4 === 0), 'bufferViews 4-byte aligned');
  // material
  ok(j.materials[0].alphaMode === 'MASK' && j.materials[0].alphaCutoff === 0.5 && j.materials[0].doubleSided === true,
    'material MASK cutoff 0.5 doubleSided');
  ok(j.images[0].mimeType === 'image/png' && j.textures[0].source === 0, 'png image wired');
  // VRM ext
  const V = j.extensions.VRM;
  ok(V.specVersion === '0.0', 'VRM specVersion 0.0');
  ok(V.meta.title === 'テスト雛' && V.meta.author === 'm', 'meta passthrough');
  ok(V.meta.allowedUserName === 'OnlyAuthor' && V.meta.violentUssageName === 'Disallow' &&
     V.meta.sexualUssageName === 'Disallow' && V.meta.commercialUssageName === 'Disallow' &&
     V.meta.licenseName === 'Redistribution_Prohibited', 'meta safe defaults (VRM0 Ussage spelling)');
  ok(V.humanoid.humanBones.length === 21, '21 humanBones');
  ok(V.humanoid.humanBones.every(hb => hb.useDefaultValues === true),
    'humanBones all have useDefaultValues:true (required by UniVRM 0.x importer)');
  ok(V.humanoid.humanBones.every(hb => H.HB.includes(hb.bone) && hb.node >= 1 && hb.node <= B.bones.length),
    'humanBones names + node range');
  ok(V.firstPerson.firstPersonBone === B.idx.head + 1, 'firstPersonBone = head node');
  ok(V.firstPerson.lookAtTypeName === 'Bone', 'lookAt Bone type');
  const fpo = V.firstPerson.firstPersonBoneOffset;
  ok(fpo.x === 0 && fpo.y > 0 && fpo.z < 0,
    'firstPersonBoneOffset: x=0, y>0 (eyes above head bone), z<0 (forward into face)');
  const bsg = V.blendShapeMaster.blendShapeGroups;
  ok(bsg.length === 17, '17 blendShapeGroups');
  const tn = j.meshes[0].extras.targetNames;
  ok(bsg.filter(g2 => g2.binds.length).every(g2 =>
    g2.binds.every(b2 => b2.mesh === 0 && b2.weight === 100 && tn[b2.index] === g2.presetName)),
    'binds index targetNames');
  ok(['neutral','a','i','u','e','o','blink','blink_l','blink_r','joy','angry','sorrow','fun',
      'lookup','lookdown','lookleft','lookright'].every(p2 => bsg.some(g2 => g2.presetName === p2)),
    'all VRM0 presets covered');
  const sa = V.secondaryAnimation;
  ok(sa.boneGroups.length === 1 && typeof sa.boneGroups[0].stiffiness === 'number', 'boneGroup with stiffiness (VRM0 typo)');
  ok(sa.boneGroups[0].stiffiness === Math.round(P.hairStiff * 4 * 100) / 100,
    'stiffiness matches hairStiff param (× 4 scale)');
  ok(sa.boneGroups[0].bones.length === 2 &&
     sa.boneGroups[0].bones.every(n => n === B.springs[0].boneIdxs[0] + 1 || n === B.springs[1].boneIdxs[0] + 1),
    'spring roots = twin chain roots');
  ok(sa.colliderGroups.length === 1 && sa.colliderGroups[0].node === B.idx.head + 1 &&
     sa.colliderGroups[0].colliders[0].radius > 0, 'head collider group');
  const mp = V.materialProperties[0];
  ok(mp.shader === 'VRM/MToon' && mp.keywordMap._ALPHATEST_ON === true &&
     mp.tagMap.RenderType === 'TransparentCutout' && mp.floatProperties._BlendMode === 1 &&
     mp.textureProperties._MainTex === 0, 'MToon cutout material properties');
  ok(mp.name === j.materials[0].name, 'MToon name matches glTF material');

  // node graph: everything reachable from scene
  {
    const seen = new Set(), stack = j.scenes[j.scene].nodes.slice();
    while (stack.length){ const n = stack.pop(); if (seen.has(n)) continue;
      seen.add(n); (j.nodes[n].children || []).forEach(c => stack.push(c)); }
    ok(seen.size === j.nodes.length, 'all nodes reachable from scene');
  }
  // first-person offset = eye height relative to head bone, toward face (Z-)
  {
    const fp = V.firstPerson.firstPersonBoneOffset;
    const wantY = B.dims.eyeWY - B.bones[B.idx.head].w[1];
    ok(Math.abs(fp.y - wantY) < 2e-3 && fp.z < 0, 'firstPersonBoneOffset at eye height, facing Z-');
  }
  // thumbnail: optional 2nd image/texture, meta.texture wiring
  ok(j.images.length === 1 && V.meta.texture === -1, 'no thumbnail → 1 image, meta.texture -1');
  {
    const ex2 = H.exportVRM(B, P, {}, png, png);
    const G2 = parseGLB(ex2.bytes), j2 = G2.json;
    ok(j2.images.length === 2 && j2.textures.length === 2 && j2.textures[1].source === 1,
      'thumbnail adds image+texture');
    ok(j2.extensions.VRM.meta.texture === 1, 'meta.texture points at thumbnail');
    const iv = j2.bufferViews[j2.images[1].bufferView];
    ok((iv.byteOffset || 0) + iv.byteLength <= j2.buffers[0].byteLength, 'thumbnail view within buffer');
    ok(j2.materials[0].pbrMetallicRoughness.baseColorTexture.index === 0, 'material still uses atlas');
  }

  // meta sanitization
  const dirty = H.exportVRM(B, P, { title: 'x\u0000\u0001y' + 'z'.repeat(500), allowed: 'Hacker', license: 'WTFPL' }, png);
  const dm = dirty.json.extensions.VRM.meta;
  ok(!/[\u0000-\u001f]/.test(dm.title) && dm.title.length <= 256, 'meta title stripped + clipped');
  ok(dm.allowedUserName === 'OnlyAuthor' && dm.licenseName === 'Redistribution_Prohibited', 'meta bad enums fall back');
  ok(dm.violentUssageName === 'Disallow' && dm.sexualUssageName === 'Disallow' && dm.commercialUssageName === 'Disallow',
    'meta violent/sexual/commercial not in dirty input → safe defaults');
  // bad usage enum values also fall back
  const badUsage = H.exportVRM(B, P, { violent: 'Always', sexual: 'YES', commercial: 'Maybe' }, png);
  const bu = badUsage.json.extensions.VRM.meta;
  ok(bu.violentUssageName === 'Disallow' && bu.sexualUssageName === 'Disallow' && bu.commercialUssageName === 'Disallow',
    'meta bad violent/sexual/commercial enum values fall back to Disallow');
  // str() must use the default when the cleaned result is empty (all-control-char input)
  const ctrlOnly = H.exportVRM(B, P, { author: '\x01\x02\x03' }, png);
  ok(ctrlOnly.json.extensions.VRM.meta.author === 'unknown', 'meta author defaults when input is all control chars');
  // meta.version default is '1.0' when not provided
  const noVer = H.exportVRM(B, P, {}, png);
  ok(noVer.json.extensions.VRM.meta.version === '1.0', 'meta.version defaults to 1.0 when empty');
  // meta.contact / meta.reference with control chars are stripped
  const ctrlMeta = H.exportVRM(B, P, { contact: 'ok\x00bad', reference: '\x1ftest\x1f' }, png);
  ok(!/[\u0000-\u001f]/.test(ctrlMeta.json.extensions.VRM.meta.contactInformation),
    'meta.contact control chars stripped');
  ok(!/[\u0000-\u001f]/.test(ctrlMeta.json.extensions.VRM.meta.reference),
    'meta.reference control chars stripped');

  // springOff export
  const off = H.exportVRM(B, Object.assign({}, P, { springOff: true }), {}, png);
  const sa2 = off.json.extensions.VRM.secondaryAnimation;
  ok(sa2.boneGroups.length === 0 && sa2.colliderGroups.length === 0, 'springOff: empty secondaryAnimation');

  // guards
  let threw = false;
  try { H.exportVRM({ geom: { pos: new Array(65536 * 3).fill(0), nrm: [], uv: [], jnt: [], wgt: [], idx: [] },
    bones: B.bones, springs: [], humanoid: B.humanoid, idx: B.idx, morphs: { names: [], sparse: {} },
    collider: B.collider }, P, {}, png); } catch (e) { threw = true; }
  ok(threw, 'export throws at uint16 vertex limit');
}

/* ---- per-preset builds + exports ---- */
{
  const png = H.b64ToBytes(H.PNG1);
  ok(H.PRESETS.length === 6, '6 presets');
  for (const pre of H.PRESETS){
    const p = H.presetParams(pre);
    const b = H.buildAvatar(p);
    const est = H.estimate(b, p);
    ok(est.tris < 7500 && est.bones < 75, `${pre.id}: tris<7500, bones<75`);
    ok(H.rank(est, 'pc').rank === 'Excellent', `${pre.id}: PC Excellent`);
    ok(['Excellent','Good'].includes(H.rank(est, 'quest').rank), `${pre.id}: Quest Good or better with springs`);
    const estOff = H.estimate(b, Object.assign({}, p, { springOff: true }));
    ok(H.rank(estOff, 'quest').rank === 'Excellent', `${pre.id}: Quest Excellent with springOff`);
    const G = parseGLB(H.exportVRM(b, p, {}, png).bytes);
    ok(G.magic === 0x46546C67 && G.json.extensions.VRM.humanoid.humanBones.length === 21,
      `${pre.id}: export valid`);
  }
}

/* ---- serialization ---- */
{
  const m = { title: '雛', author: 'm' };
  const d = H.deserialize(H.serialize(P, m));
  ok(!!d && JSON.stringify(d.params) === JSON.stringify(P), 'serialize→deserialize params identical');
  ok(d.meta.title === '雛' && d.meta.author === 'm', 'meta survives roundtrip');
  ok(H.deserialize('not json') === null, 'deserialize rejects garbage');
  ok(H.deserialize('{"app":"other"}') === null, 'deserialize rejects wrong app');
  const c = H.deserialize(H.serialize(Object.assign({}, P, { height: 99 }), {}));
  ok(c.params.height === H.PARAMS.height.max, 'deserialize clamps out-of-range');
}

/* ---- BinWriter alignment ---- */
{
  const bw = new H.BinWriter();
  const o1 = bw.push(new Uint8Array([1, 2, 3]));
  const o2 = bw.push(new Float32Array([1.5]));
  ok(o1 === 0 && o2 === 4 && bw.len === 8, 'BinWriter 4-byte alignment');
  const bytes = bw.bytes();
  ok(bytes.length === 8 && bytes[0] === 1 && bytes[3] === 0, 'BinWriter zero padding');
}

/* ---- selfTest ---- */
{
  const st = H.selfTest();
  ok(st.ok === true, 'selfTest ok');
  ok(st.results.length >= 22 && st.results.every(r => r.ok), 'selfTest all 22+ checks pass (incl. UV range and normal length validation)');
}

/* ---- summary ---- */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail){ console.error('FAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
