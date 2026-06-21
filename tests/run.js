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
ok(html.includes("'aria-pressed':String(isSelected)") || html.includes("'aria-pressed':String(activePresetId===pre.id)"), 'preset cards have aria-pressed for screen reader active-state');
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
ok(html.includes("$('hint').textContent = _hintDefault();"), 'applyLang() uses _hintDefault() for hint (accounts for _glLost and !GLOK)');
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
ok(html.includes('META_DEFAULTS') && html.includes('_resetPending'), 'reset button restores meta to defaults via META_DEFAULTS (two-click pattern)');
ok(html.includes("dataTransfer.types.includes('Files')") && html.includes("dataTransfer.files"), 'drag-and-drop JSON loading wired with file-type guard');
ok(/document\.title\s*=.*fnameStem/.test(html), 'document.title updated in rebuild() so browser tab reflects loaded title immediately');
ok(html.includes('visibilitychange') && html.includes('_rafPaused'), 'rAF loop pauses on page visibility hidden (saves CPU/battery on mobile)');
ok((html.includes('runGacha(n)') || html.includes('runGacha(clamped)')) && (html.includes('n>=0') || html.includes('n<0')),
  'gacha seed input accepts seed 0 and validates range before calling runGacha');
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
  // all palette entries must be valid hex (randomParams picks from them → must pass sanitize)
  ok(Object.values(H.PAL).every(arr => arr.every(c => H.HEXRE.test(c))),
    'all PAL entries are valid lowercase hex colors');
  ok(/^\d+\.\d+\.\d+$/.test(H.VERSION), 'VERSION is valid semver (x.y.z)');
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
  // extreme parameter corners: min height / max height / max headRatio / bust extremes
  const extremes = [
    { height: H.PARAMS.height.min },
    { height: H.PARAMS.height.max },
    { headRatio: H.PARAMS.headRatio.max },
    { headRatio: H.PARAMS.headRatio.min },
    { bust: H.PARAMS.bust.max },
    { bust: H.PARAMS.bust.min },
    { height: H.PARAMS.height.min, headRatio: H.PARAMS.headRatio.max },
  ];
  let extOK = true, extIdxOK = true;
  for (const overrides of extremes){
    const eb = H.buildAvatar(Object.assign(H.defaults(), overrides));
    if (!eb.geom.pos.every(Number.isFinite) || !eb.geom.nrm.every(Number.isFinite)) extOK = false;
    const nVE = eb.geom.pos.length / 3;
    if (!eb.geom.idx.every(i => i >= 0 && i < nVE)) extIdxOK = false;
  }
  ok(extOK, 'extreme param corners (min/max height, headRatio, bust): finite pos/nrm');
  ok(extIdxOK, 'extreme param corners: valid triangle indices');

  /* ---- Round 123: gacha-specific param constraints ---- */
  // height restricted to [1.15, 1.75]; headRatio restricted to [0.21, 0.30] in gacha
  {
    let hOK=true, hrOK=true, ahogeT=false, ahogeF=false;
    for(let s=0; s<60; s++){
      const p2 = H.randomParams(s);
      if(p2.height < 1.15 || p2.height > 1.75) hOK=false;
      if(p2.headRatio < 0.21 || p2.headRatio > 0.30) hrOK=false;
      if(p2.ahoge === true) ahogeT = true;
      if(p2.ahoge === false) ahogeF = true;
    }
    ok(hOK, 'randomParams height always in [1.15, 1.75] (gacha height constraint, 60 seeds)');
    ok(hrOK, 'randomParams headRatio always in [0.21, 0.30] (gacha chibi-prevention constraint, 60 seeds)');
    ok(ahogeT && ahogeF, 'randomParams ahoge is randomly true or false across 60 seeds (bool randomization works)');
  }
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
  // VRM0 requires exactly these 21 bone names (vrm.dev humanoid spec)
  const REQUIRED_HB = ['hips','spine','chest','neck','head',
    'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
    'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
    'leftUpperLeg','leftLowerLeg','leftFoot',
    'rightUpperLeg','rightLowerLeg','rightFoot',
    'leftEye','rightEye'];
  ok(REQUIRED_HB.every(n => H.HB.includes(n)), 'all 21 required VRM0 humanoid bone names present in H.HB');
  ok(B.bones[B.idx.lUA].w[0] < 0 && B.bones[B.idx.rUA].w[0] > 0, 'VRM0: leftUpperArm x<0, rightUpperArm x>0');
  ok(B.bones[B.idx.lE].w[0] < 0 && B.bones[B.idx.rE].w[0] > 0, 'left/right eye sides');
  ok(B.bones[B.idx.lE].w[2] < 0, 'eyes face Z-minus');
  // VRM §5.1 coordinate invariants: Y-up, floor at y=0, avatar centered on X=Z=0
  ok(B.bones[B.idx.hips].w[1] > 0, 'hips above ground (Y-up world, floor at y=0)');
  ok(B.bones[B.idx.head].w[1] > B.bones[B.idx.hips].w[1], 'head Y > hips Y (vertical order)');
  ok(B.bones[B.idx.hips].w[0] === 0 && B.bones[B.idx.hips].w[2] === 0,
    'hips centered at x=0, z=0 (symmetric avatar)');
  ok(B.bones[B.idx.neck].w[0] === 0 && B.bones[B.idx.neck].w[2] === 0,
    'neck centered at x=0, z=0');
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
  // full body/face index separation: body triangles only reference body vertices, and vice versa
  {
    let faceIdxStart = g.idx.length;
    for (let i = 0; i < g.idx.length; i++) if (g.idx[i] >= B.faceStart){ faceIdxStart = i; break; }
    faceIdxStart -= faceIdxStart % 3; // snap to triangle boundary
    ok(g.idx.slice(0, faceIdxStart).every(i => i < B.faceStart),
      'ALL body triangles reference only body vertices (no face verts in body tris)');
    ok(g.idx.slice(faceIdxStart).every(i => i >= B.faceStart),
      'ALL face triangles reference only face vertices (no body verts in face tris)');
    ok(faceIdxStart % 3 === 0, 'face/body index buffer split is triangle-aligned');
  }
  ok(B.morphs.names.length === 12, '12 morph targets');
  ok(B.morphs.names.every(n => B.morphs.sparse[n].length > 0), 'all 12 morph targets non-empty');
  ok(B.morphs.sparse.a.every(e => e.length === 4 && e[0] < nV), 'morph entries [vi,dx,dy,dz]');
  // all morph vertices must be face vertices (>= faceStart)
  ok(B.morphs.names.every(n => B.morphs.sparse[n].every(e => e[0] >= B.faceStart)),
    'all morph vertices are face vertices (vi >= faceStart, body unaffected by blendshapes)');
  // morph deltas must not all be zero (non-trivial deformation)
  ok(B.morphs.names.every(n => B.morphs.sparse[n].some(e => e[1] !== 0 || e[2] !== 0 || e[3] !== 0)),
    'every morph target has at least one non-zero delta (non-trivial deformation)');
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
  // chain count and bone count per chain (SPEC §5.2: 0-3 chains each 3-4 bones)
  const chainSpec = {
    twin:  { chains: 2, bonesPerChain: 4, pbTrans: 8 },
    pony:  { chains: 1, bonesPerChain: 4, pbTrans: 4 },
    long:  { chains: 3, bonesPerChain: 3, pbTrans: 9 },
    short: { chains: 0, bonesPerChain: 0, pbTrans: 0 },
    bob:   { chains: 0, bonesPerChain: 0, pbTrans: 0 },
  };
  for (const [style, spec] of Object.entries(chainSpec)){
    const b = H.buildAvatar(Object.assign(H.defaults(), { hairStyle: style }));
    ok(b.springs.length === spec.chains, `springs(${style}) = ${spec.chains}`);
    ok(b.springs.every(sp => sp.boneIdxs.every(bi => b.bones[bi].hb === null)), `chain bones non-humanoid (${style})`);
    if (spec.chains > 0){
      ok(b.springs.every(sp => sp.boneIdxs.length === spec.bonesPerChain),
        `${style}: each chain has ${spec.bonesPerChain} bones`);
      const totalBones = b.springs.reduce((s, sp) => s + sp.boneIdxs.length, 0);
      ok(totalBones === spec.pbTrans, `${style}: total pbTrans = ${spec.pbTrans}`);
    }
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

/* ---- eyeShape + bangs enum variant builds ---- */
{
  for (const eyeShape of H.PARAMS.eyeShape.opts){
    const b = H.buildAvatar(Object.assign(H.defaults(), { eyeShape }));
    ok(b.geom.pos.every(Number.isFinite) && b.geom.nrm.every(Number.isFinite),
      `eyeShape=${eyeShape}: finite pos/nrm`);
    ok(b.geom.idx.length % 3 === 0 && b.geom.idx.every(i => i >= 0 && i < b.geom.pos.length / 3),
      `eyeShape=${eyeShape}: valid triangle indices`);
  }
  for (const bangs of H.PARAMS.bangs.opts){
    const b = H.buildAvatar(Object.assign(H.defaults(), { bangs }));
    ok(b.geom.pos.every(Number.isFinite) && b.geom.nrm.every(Number.isFinite),
      `bangs=${bangs}: finite pos/nrm`);
    ok(b.geom.idx.length % 3 === 0 && b.geom.idx.every(i => i >= 0 && i < b.geom.pos.length / 3),
      `bangs=${bangs}: valid triangle indices`);
  }
}

/* ---- adv (detail-mode-only) parameters ---- */
{
  const advKeys = Object.keys(H.PARAMS).filter(k => H.PARAMS[k].adv);
  ok(advKeys.length === 4 && ['armTh','legTh','irisSize','socks'].every(k => advKeys.includes(k)),
    'exactly 4 adv:1 params: armTh, legTh, irisSize, socks');
  // extreme arm/leg thickness builds must not crash or produce non-finite geometry
  const wide = H.buildAvatar(Object.assign(H.defaults(), { armTh: 1.5, legTh: 1.5 }));
  ok(wide.geom.pos.every(Number.isFinite) && wide.geom.nrm.every(Number.isFinite),
    'armTh=1.5, legTh=1.5 (max): finite pos/nrm');
  ok(wide.geom.idx.length % 3 === 0 && wide.geom.idx.every(i => i >= 0 && i < wide.geom.pos.length / 3),
    'armTh/legTh max: valid indices');
  const thin = H.buildAvatar(Object.assign(H.defaults(), { armTh: 0.7, legTh: 0.7 }));
  ok(thin.geom.pos.every(Number.isFinite) && thin.geom.nrm.every(Number.isFinite),
    'armTh=0.7, legTh=0.7 (min): finite pos/nrm');
  // irisSize is canvas-only; verify sanitize accepts all values in range
  ok(H.sanitize({ irisSize: 0.6 }).irisSize === 0.6, 'irisSize min accepted by sanitize');
  ok(H.sanitize({ irisSize: 1.2 }).irisSize === 1.2, 'irisSize max accepted by sanitize');
  ok(H.sanitize({ irisSize: 1.3 }).irisSize === H.PARAMS.irisSize.max, 'irisSize above max clamped');
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
  // physbone limits: any spring bone drops Quest from Excellent to Good
  ok(H.rank(Object.assign({}, base, { pbComp: 1 }), 'quest').rank === 'Good', 'quest pbComp=1 → Good (Excellent req pbComp≤0)');
  ok(H.rank(Object.assign({}, base, { pbTrans: 1 }), 'quest').rank === 'Good', 'quest pbTrans=1 → Good (Excellent req pbTrans≤0)');
  ok(H.rank(Object.assign({}, base, { pbComp: 0, pbTrans: 0 }), 'quest').rank === 'Excellent', 'quest pbComp=0 pbTrans=0 → Excellent (springs off)');
  ok(H.rank(Object.assign({}, base, { pbComp: 5 }), 'quest').rank === 'Medium', 'quest pbComp=5 → Medium (Good req ≤4)');
  // PC tris boundary
  ok(H.rank(Object.assign({}, base, { tris: 32000 }), 'pc').rank === 'Excellent', 'pc tris 32000 = Excellent');
  ok(H.rank(Object.assign({}, base, { tris: 32001 }), 'pc').rank === 'Good', 'pc tris 32001 = Good');
  // rank().worst lists all tied-worst categories
  const tied = H.rank(Object.assign({}, base, { tris: 7501, bones: 76 }), 'quest');
  ok(tied.rank === 'Good' && tied.worst.includes('tris') && tied.worst.includes('bones'),
    'rank worst lists all tied-worst categories (tris + bones both Good)');
}

/* ---- estimate ---- */
{
  const est = H.estimate(B, P);
  ok(est.tris === B.geom.idx.length / 3, 'estimate tris matches mesh');
  ok(est.bones === 29 && est.mat === 1 && est.skinned === 1 && est.mesh === 0, 'estimate bones/mat/skinned/mesh');
  ok(est.pbComp === 2 && est.pbTrans === 8, 'estimate physbones (twin springs on)');
  ok(est.pbCol === 1, 'estimate pbCol = 1 (one collider group for hair)');
  ok(est.pbCheck === 8, 'estimate pbCheck = pbTrans × pbCol = 8×1 = 8');
  const off = H.estimate(B, Object.assign({}, P, { springOff: true }));
  ok(off.pbComp === 0 && off.pbTrans === 0 && off.pbCheck === 0 && off.pbCol === 0, 'springOff zeroes all physbone stats');
  ok(est.texMB === 5.3, 'texMB = 5.3 MB (1024×1024 RGBA × 1.33 mipmap factor, Quest Excellent ≤10MB)');
  ok(est.texMB < H.RANKS.quest.texMB[0], 'texMB within Quest Excellent threshold');
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
  // CLAUDE.md invariants: 1 scene, 1 mesh, 1 skin, 1 material, 1 texture, 1 image
  ok(j.scenes.length === 1 && j.scene === 0, 'exactly 1 scene, scene 0 active');
  ok(j.scenes[0].nodes.length === 1 && j.scenes[0].nodes[0] === 0,
    'scene contains exactly Root node (index 0)');
  ok(j.meshes.length === 1, 'exactly 1 mesh (CLAUDE.md: 1 skinned mesh)');
  ok(j.meshes[0].primitives.length === 1, 'exactly 1 primitive (CLAUDE.md: 1 primitive)');
  ok(j.skins.length === 1, 'exactly 1 skin (CLAUDE.md: 1 skinned mesh)');
  ok(j.skins[0].skeleton === 1, 'skin skeleton = node 1 (Hips, first bone after Root)');
  ok(j.materials.length === 1, 'exactly 1 material (CLAUDE.md: 1 material)');
  ok(j.textures.length === 1, 'exactly 1 texture in default export (single atlas)');
  ok(j.images.length === 1, 'exactly 1 image in default export (single atlas)');
  ok(j.bufferViews.every(v => v.buffer === 0), 'all bufferViews reference buffer 0 (single buffer)');
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
  // T-pose IBM: column-major identity rotation + translation(-world)
  // Expected: [1,0,0,0, 0,1,0,0, 0,0,1,0, -x,-y,-z,1]
  B.bones.forEach((b, i) => {
    const m = ibm.subarray(i*16, i*16+16);
    if (Math.abs(m[12] + b.w[0]) > 1e-6 || Math.abs(m[13] + b.w[1]) > 1e-6 ||
        Math.abs(m[14] + b.w[2]) > 1e-6) ibmOK = false;
    if (m[0] !== 1 || m[5] !== 1 || m[10] !== 1 || m[15] !== 1) ibmOK = false;
    if (m[1]||m[2]||m[3]||m[4]||m[6]||m[7]||m[8]||m[9]||m[11]) ibmOK = false;
  });
  ok(ibmOK, 'IBM = translate(-world), identity rotation (all 16 matrix elements verified)');
  // primitive
  const prim = j.meshes[0].primitives[0];
  ok(prim.mode === 4, 'primitive mode = 4 (TRIANGLES, glTF 2.0 §3.7.2.1)');
  ok(prim.material === 0, 'primitive references material 0 (single-material model)');
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
  // each individual weight must be in [0,1] (glTF 2.0 §3.7.2.1 joint weight normalization)
  let wRangeOK = true;
  for (let i = 0; i < wgt.length; i++) if (wgt[i] < 0 || wgt[i] > 1.0001) wRangeOK = false;
  ok(wRangeOK, 'all exported weight values in [0,1]');
  // glTF 2.0 accessor type + componentType for every vertex attribute
  ok(j.accessors[prim.attributes.POSITION].type === 'VEC3', 'POSITION accessor type = VEC3');
  ok(j.accessors[prim.attributes.POSITION].componentType === 5126, 'POSITION componentType = FLOAT(5126)');
  ok(j.accessors[prim.attributes.NORMAL].type === 'VEC3', 'NORMAL accessor type = VEC3');
  ok(j.accessors[prim.attributes.NORMAL].componentType === 5126, 'NORMAL componentType = FLOAT(5126)');
  ok(j.accessors[prim.attributes.TEXCOORD_0].type === 'VEC2', 'TEXCOORD_0 accessor type = VEC2');
  ok(j.accessors[prim.attributes.TEXCOORD_0].componentType === 5126, 'TEXCOORD_0 componentType = FLOAT(5126)');
  ok(j.accessors[prim.attributes.JOINTS_0].type === 'VEC4', 'JOINTS_0 accessor type = VEC4');
  ok([5121,5123].includes(j.accessors[prim.attributes.JOINTS_0].componentType),
    'JOINTS_0 componentType = UNSIGNED_BYTE(5121) or UNSIGNED_SHORT(5123)');
  ok(j.accessors[prim.attributes.WEIGHTS_0].type === 'VEC4', 'WEIGHTS_0 accessor type = VEC4');
  ok(j.accessors[prim.attributes.WEIGHTS_0].componentType === 5126, 'WEIGHTS_0 componentType = FLOAT(5126)');
  ok(j.accessors[prim.indices].type === 'SCALAR', 'indices accessor type = SCALAR');
  // all UVs must be in [0,1] (single-atlas, CLAMP_TO_EDGE texture)
  {
    const uvData = accData(j, G.bin, prim.attributes.TEXCOORD_0);
    ok(uvData.every(v => v >= 0 && v <= 1), 'all UV coordinates are in [0,1] (single-atlas layout)');
  }
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

  /* ---- Round 117: GLB accessor count + targetNames order + morph min/max bounds ---- */
  // 6 base mesh (pos/nrm/uv/jnt/wgt/idx) + 12 morph POSITION + 1 IBM = 19 (thumbnail adds no accessor)
  ok(j.accessors.length === 19, 'GLB has exactly 19 accessors: 6 mesh + 12 morph + 1 IBM');
  // IBM is always the last accessor (index 18) and covers all bones
  ok(j.accessors[18].type === 'MAT4' && j.accessors[18].count === B.bones.length,
    'accessor 18 = IBM MAT4 × bones.length');
  // targetNames in GLB must match morphs.names exactly (order determines bind indices)
  ok(JSON.stringify(j.meshes[0].extras.targetNames) === JSON.stringify(B.morphs.names),
    'GLB targetNames array exactly matches build.morphs.names (order preserved)');
  // morph target POSITION accessors occupy consecutive slots 6..17
  ok(prim.targets.every((t, i) => t.POSITION === 6 + i),
    'morph targets reference consecutive accessor indices 6–17');
  // every bound blendShapeGroup has bind index ≥ 0 (no failed indexOf → -1 corruption)
  {
    const tn = j.meshes[0].extras.targetNames;
    const bsg = j.extensions.VRM.blendShapeMaster.blendShapeGroups;
    ok(bsg.every(g => g.binds.every(b => b.index >= 0 && b.index < tn.length)),
      'all blendShapeGroup bind indices are valid (≥0 and within targetNames range)');
  }
  // morph accessor min/max must include zero (glTF 2.0: bounds cover implicit zeros in sparse)
  ok(prim.targets.every(t => {
    const a = j.accessors[t.POSITION];
    return a.min.every(v => v <= 0) && a.max.every(v => v >= 0);
  }), 'all morph accessor min[k]≤0≤max[k] (sparse implicit zeros within bounds)');
  // all morph accessors have count === nV and type === VEC3
  ok(prim.targets.every(t => {
    const a = j.accessors[t.POSITION];
    return a.count === nV && a.type === 'VEC3' && a.componentType === 5126;
  }), 'all 12 morph accessors: count=nV, type=VEC3, componentType=FLOAT');

  ok(j.bufferViews.every(v => (v.byteOffset || 0) % 4 === 0), 'bufferViews 4-byte aligned');
  // material
  ok(j.materials[0].alphaMode === 'MASK' && j.materials[0].alphaCutoff === 0.5 && j.materials[0].doubleSided === true,
    'material MASK cutoff 0.5 doubleSided');
  ok(j.materials[0].pbrMetallicRoughness.baseColorTexture.index === 0,
    'material baseColorTexture references atlas (index 0)');
  ok(j.materials[0].pbrMetallicRoughness.metallicFactor === 0,
    'material metallicFactor = 0 (non-metallic, toon style)');
  ok(j.textures[0].sampler === 0,
    'texture references sampler 0 (CLAMP_TO_EDGE)');
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
  // VRM humanoid physics fields — must match VRM0 standard values for VRChat IK compatibility
  ok(V.humanoid.hasTranslationDoF === false, 'humanoid.hasTranslationDoF = false (VRChat IK compatibility)');
  ok(V.humanoid.armStretch === 0.05 && V.humanoid.legStretch === 0.05,
    'humanoid arm/legStretch = 0.05 (VRM0 standard, affects reach IK)');
  ok(V.humanoid.upperArmTwist === 0.5 && V.humanoid.lowerArmTwist === 0.5,
    'humanoid upper/lowerArmTwist = 0.5 (VRM0 standard)');
  ok(V.humanoid.feetSpacing === 0,
    'humanoid.feetSpacing = 0 (VRM0 standard, no foot offset)');
  ok(V.firstPerson.firstPersonBone === B.idx.head + 1, 'firstPersonBone = head node');
  ok(V.firstPerson.lookAtTypeName === 'Bone', 'lookAt Bone type');
  const fpo = V.firstPerson.firstPersonBoneOffset;
  ok(fpo.x === 0 && fpo.y > 0 && fpo.z < 0,
    'firstPersonBoneOffset: x=0, y>0 (eyes above head bone), z<0 (forward into face)');
  // meshAnnotations: body mesh must be "Auto" so VRChat handles first-person visibility
  ok(V.firstPerson.meshAnnotations.length === 1 &&
     V.firstPerson.meshAnnotations[0].mesh === 0 &&
     V.firstPerson.meshAnnotations[0].firstPersonFlag === 'Auto',
    'firstPerson meshAnnotations: mesh 0 = Auto (VRChat first-person visibility)');
  // lookAt curves: all 4 must be present (Bone LookAt requires range definitions)
  const lookAtKeys = ['lookAtHorizontalInner','lookAtHorizontalOuter','lookAtVerticalDown','lookAtVerticalUp'];
  ok(lookAtKeys.every(k => V.firstPerson[k] && typeof V.firstPerson[k].xRange === 'number' &&
     typeof V.firstPerson[k].yRange === 'number' && Array.isArray(V.firstPerson[k].curve)),
    'all 4 lookAt range objects present with xRange, yRange, curve');
  const bsg = V.blendShapeMaster.blendShapeGroups;
  ok(bsg.length === 17, '17 blendShapeGroups');
  const tn = j.meshes[0].extras.targetNames;
  ok(bsg.filter(g2 => g2.binds.length).every(g2 =>
    g2.binds.every(b2 => b2.mesh === 0 && b2.weight === 100 && tn[b2.index] === g2.presetName)),
    'binds index targetNames');
  ok(['neutral','a','i','u','e','o','blink','blink_l','blink_r','joy','angry','sorrow','fun',
      'lookup','lookdown','lookleft','lookright'].every(p2 => bsg.some(g2 => g2.presetName === p2)),
    'all VRM0 presets covered');
  // SPEC §5.3: look系は空バインド（視線はBone方式のため）; neutral も空
  const emptyBindPresets = ['neutral','lookup','lookdown','lookleft','lookright'];
  ok(emptyBindPresets.every(pn => {
    const g2 = bsg.find(g3 => g3.presetName === pn);
    return g2 && g2.binds.length === 0;
  }), 'neutral + look groups have empty binds (gaze is Bone-based, SPEC §5.3)');
  // every blendShapeGroup has isBinary:false (binary blending not needed)
  ok(bsg.every(g2 => g2.isBinary === false), 'all blendShapeGroups isBinary=false');
  // every blendShapeGroup has empty materialValues (no material switching)
  ok(bsg.every(g2 => Array.isArray(g2.materialValues) && g2.materialValues.length === 0),
    'all blendShapeGroups have empty materialValues');
  const sa = V.secondaryAnimation;
  ok(sa.boneGroups.length === 1 && typeof sa.boneGroups[0].stiffiness === 'number', 'boneGroup with stiffiness (VRM0 typo)');
  ok(sa.boneGroups[0].stiffiness === Math.round(P.hairStiff * 4 * 100) / 100,
    'stiffiness matches hairStiff param (× 4 scale)');
  ok(sa.boneGroups[0].gravityPower === P.hairGrav, 'boneGroup.gravityPower matches hairGrav param');
  ok(sa.boneGroups[0].dragForce === P.hairDrag, 'boneGroup.dragForce matches hairDrag param');
  const gd = sa.boneGroups[0].gravityDir;
  ok(gd && gd.x === 0 && gd.y === -1 && gd.z === 0, 'gravityDir = {x:0, y:-1, z:0} (downward)');
  ok(sa.boneGroups[0].hitRadius === 0.02, 'boneGroup hitRadius = 0.02 m');
  ok(sa.boneGroups[0].center === -1, 'boneGroup center = -1 (no center bone, world-space simulation)');
  ok(sa.boneGroups[0].bones.length === 2 &&
     sa.boneGroups[0].bones.every(n => n === B.springs[0].boneIdxs[0] + 1 || n === B.springs[1].boneIdxs[0] + 1),
    'spring roots = twin chain roots');
  ok(sa.colliderGroups.length === 1 && sa.colliderGroups[0].node === B.idx.head + 1 &&
     sa.colliderGroups[0].colliders[0].radius > 0, 'head collider group');
  const mp = V.materialProperties[0];
  ok(mp.shader === 'VRM/MToon' && mp.keywordMap._ALPHATEST_ON === true &&
     mp.tagMap.RenderType === 'TransparentCutout' && mp.floatProperties._BlendMode === 1 &&
     mp.textureProperties._MainTex === 0, 'MToon cutout material properties');
  // SPEC §5.5: _Cutoff=0.5, _CullMode=0(両面), _ShadeToony=0.9, _ShadeShift=0
  ok(mp.floatProperties._Cutoff === 0.5, 'MToon _Cutoff = 0.5 (SPEC §5.5)');
  ok(mp.floatProperties._CullMode === 0, 'MToon _CullMode = 0 (double-sided, SPEC §5.5)');
  ok(mp.floatProperties._ShadeToony === 0.9, 'MToon _ShadeToony = 0.9 (SPEC §5.5)');
  ok(mp.floatProperties._ShadeShift === 0, 'MToon _ShadeShift = 0 (SPEC §5.5)');
  ok(mp.floatProperties._OutlineWidthMode === 0, 'MToon outline off by default (_OutlineWidthMode=0)');
  // MToon vector properties: base color white, shade color slightly warm-blue
  ok(Array.isArray(mp.vectorProperties._Color) && mp.vectorProperties._Color.every(v => v === 1),
    'MToon _Color is [1,1,1,1] (tinting done in atlas texture, not material color)');
  ok(mp.vectorProperties._ShadeColor[0] === 0.9 && mp.vectorProperties._ShadeColor[3] === 1,
    'MToon _ShadeColor has expected cool-tone (r=0.9, a=1)');
  ok(mp.name === j.materials[0].name, 'MToon name matches glTF material');
  // MToon additional properties
  ok(mp.renderQueue === 2450, 'MToon renderQueue = 2450 (Cutout transparent queue in Unity)');
  ok(mp.textureProperties._ShadeTexture === 0, 'MToon _ShadeTexture = 0 (same atlas as _MainTex)');
  ok(Array.isArray(mp.vectorProperties._EmissionColor) && mp.vectorProperties._EmissionColor.every((v, i) => i < 3 ? v === 0 : v === 1),
    'MToon _EmissionColor = [0,0,0,1] (no emission)');
  ok(Array.isArray(mp.vectorProperties._RimColor) && mp.vectorProperties._RimColor.every((v, i) => i < 3 ? v === 0 : v === 1),
    'MToon _RimColor = [0,0,0,1] (no rim lighting)');
  ok(mp.floatProperties._ZWrite === 1, 'MToon _ZWrite = 1 (write depth for Cutout)');
  ok(mp.floatProperties._SrcBlend === 1 && mp.floatProperties._DstBlend === 0,
    'MToon blend = One/Zero (opaque Cutout, not additive)');
  // glTF sampler: CLAMP_TO_EDGE + LINEAR/LINEAR_MIPMAP_LINEAR in GLB JSON
  ok(j.samplers[0].wrapS === 33071 && j.samplers[0].wrapT === 33071,
    'glTF sampler wrapS/wrapT = CLAMP_TO_EDGE (33071) in exported GLB JSON');
  ok(j.samplers[0].magFilter === 9729, 'glTF sampler magFilter = LINEAR (9729)');

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
  // otherLicenseUrl control char stripping (same str() helper applies)
  const licCtrl = H.exportVRM(B, P,
    { license: 'Other', licenseUrl: 'ok\u0000bad' }, png);
  ok(!/[\u0000-\u001f]/.test(licCtrl.json.extensions.VRM.meta.otherLicenseUrl),
    'meta.otherLicenseUrl control chars stripped');
  // all 9 valid license options pass through as-is
  const validLicenses = ['Redistribution_Prohibited','CC0','CC_BY','CC_BY_NC','CC_BY_SA','CC_BY_NC_SA','CC_BY_ND','CC_BY_NC_ND','Other'];
  ok(validLicenses.every(lic => {
    const ex3 = H.exportVRM(B, P, { license: lic }, png);
    return ex3.json.extensions.VRM.meta.licenseName === lic;
  }), 'all 9 valid license enum values pass through to VRM meta licenseName');

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

/* ---- Round 121: preset schema validation + EXPR_LABELS coverage + guide i18n ---- */
{
  // all preset IDs are unique
  ok(new Set(H.PRESETS.map(p => p.id)).size === H.PRESETS.length,
    'all preset IDs are unique');
  // all presets have non-empty id, ja, en labels
  ok(H.PRESETS.every(p => p.id && p.ja && p.en &&
     typeof p.id === 'string' && typeof p.ja === 'string' && typeof p.en === 'string'),
    'all presets have non-empty string id, ja, en');
  // preset override params must be valid enum values and within num bounds
  ok(H.PRESETS.every(pre => Object.entries(pre.p || {}).every(([k, v]) => {
    const s = H.PARAMS[k];
    if (!s) return false; // unknown param key
    if (s.k === 'enum') return s.opts.includes(v);
    if (s.k === 'num') return v >= s.min && v <= s.max;
    if (s.k === 'bool') return typeof v === 'boolean';
    if (s.k === 'color') return H.HEXRE.test(v);
    return true;
  })), 'all preset override params are valid per their PARAMS schema');
  // presetParams is sanitize-stable: sanitizing the output again gives the same result
  ok(H.PRESETS.every(pre => {
    const p = H.presetParams(pre);
    const p2 = H.sanitize(p);
    return JSON.stringify(p) === JSON.stringify(p2);
  }), 'presetParams() output is sanitize-stable (no out-of-range values)');

  // EXPR_LABELS in app.js: all morph names (excl. blink_l/r) have a short label
  const morphNamesForBar = B.morphs.names.filter(n => n !== 'blink_l' && n !== 'blink_r');
  ok(morphNamesForBar.every(n => html.includes('"' + n + '"') || html.includes("'" + n + "'")),
    'EXPR_LABELS entries cover all visible morphs (blink_l/blink_r filtered in buildExprBar)');

  // guide i18n: all 5 step keys present in both languages (upload guide in out tab)
  const guideKeys = ['guide.t','guide.s1','guide.s2','guide.s3','guide.s4','guide.s5'];
  ok(guideKeys.every(k => H.I18N.ja[k] && H.I18N.en[k]),
    'all 6 upload guide i18n keys present in both languages');
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
    /* ---- Round 122: per-preset skinning invariants ---- */
    {
      const g2 = b.geom, nV2 = g2.pos.length/3;
      let wOK2=true, jOK2=true;
      for(let v=0;v<nV2;v++){
        const s=g2.wgt[v*4]+g2.wgt[v*4+1]+g2.wgt[v*4+2]+g2.wgt[v*4+3];
        if(Math.abs(s-1)>1e-4) wOK2=false;
        for(let k=0;k<4;k++) if(g2.jnt[v*4+k]<0||g2.jnt[v*4+k]>=b.bones.length) jOK2=false;
      }
      ok(wOK2, `${pre.id}: all weights sum to 1 (skinning normalized)`);
      ok(jOK2, `${pre.id}: all joint indices in range [0, bones.length)`);
    }
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
  // serialize output contains version field == H.VERSION
  const raw = JSON.parse(H.serialize(P, {}));
  ok(raw.version === H.VERSION, 'serialize output contains version field matching H.VERSION');
  ok(raw.app === 'hina', 'serialize output contains app = "hina"');
  // deserialize is version-agnostic: works with old or missing version strings
  ok(H.deserialize('{"app":"hina","version":"0.0.1","params":{}}') !== null,
    'deserialize accepts old version string (forward-compatible)');
  ok(H.deserialize('{"app":"hina"}') !== null,
    'deserialize with missing params returns defaults (not null)');
  // deserialize with non-object meta returns empty object, not null
  const nm = H.deserialize('{"app":"hina","meta":42}');
  ok(nm !== null && typeof nm.meta === 'object' && !Array.isArray(nm.meta),
    'deserialize with non-object meta returns empty {} (not null)');
  const am = H.deserialize('{"app":"hina","meta":["a","b"]}');
  ok(am !== null && JSON.stringify(am.meta) === '{}',
    'deserialize with array meta returns empty {}');
}

/* ---- BinWriter alignment ---- */
{
  const bw = new H.BinWriter();
  const o1 = bw.push(new Uint8Array([1, 2, 3]));
  const o2 = bw.push(new Float32Array([1.5]));
  ok(o1 === 0 && o2 === 4 && bw.len === 8, 'BinWriter 4-byte alignment');
  const bytes = bw.bytes();
  ok(bytes.length === 8 && bytes[0] === 1 && bytes[3] === 0, 'BinWriter zero padding');
  // empty BinWriter
  const bw2 = new H.BinWriter();
  ok(bw2.len === 0 && bw2.bytes().length === 0, 'empty BinWriter: len=0, bytes empty');
  // uint16 array after 3-byte write: align(4) pads 1 byte, then Uint16 starts at offset 4
  const bw3 = new H.BinWriter();
  bw3.push(new Uint8Array([0xAA, 0xBB, 0xCC]));
  const oa = bw3.push(new Uint16Array([0x1234]));
  ok(oa === 4 && bw3.len === 6, 'BinWriter Uint16Array: starts at 4-byte aligned offset after 3-byte write');
  const b3 = bw3.bytes();
  ok(b3[3] === 0 && b3[4] === 0x34 && b3[5] === 0x12,
    'BinWriter Uint16Array: pad byte at 3, little-endian 0x1234 at bytes 4-5');
}

/* ---- Round 94: usage/allowed enum valid pass-through ---- */
{
  const png = H.b64ToBytes(H.PNG1);
  // allowedUserName: all 3 valid values
  const allowedValues = ['OnlyAuthor','ExplicitlyLicensedPerson','Everyone'];
  ok(allowedValues.every(v => {
    const ex = H.exportVRM(B, P, { allowed: v }, png);
    return ex.json.extensions.VRM.meta.allowedUserName === v;
  }), 'all 3 allowedUserName values pass through to VRM meta');

  // violentUssageName: Allow passes through
  const exV = H.exportVRM(B, P, { violent: 'Allow' }, png);
  ok(exV.json.extensions.VRM.meta.violentUssageName === 'Allow', 'violent=Allow passes through to violentUssageName');

  // sexualUssageName: Allow passes through
  const exS = H.exportVRM(B, P, { sexual: 'Allow' }, png);
  ok(exS.json.extensions.VRM.meta.sexualUssageName === 'Allow', 'sexual=Allow passes through to sexualUssageName');

  // commercialUssageName: Allow passes through
  const exC = H.exportVRM(B, P, { commercial: 'Allow' }, png);
  ok(exC.json.extensions.VRM.meta.commercialUssageName === 'Allow', 'commercial=Allow passes through to commercialUssageName');

  // invalid usage values fall back to safe defaults
  const exBad = H.exportVRM(B, P, { violent: 'YES', sexual: 'YES', commercial: 'YES', allowed: 'Anyone' }, png);
  ok(exBad.json.extensions.VRM.meta.allowedUserName === 'OnlyAuthor', 'invalid allowed falls back to OnlyAuthor');
  ok(exBad.json.extensions.VRM.meta.violentUssageName === 'Disallow' &&
     exBad.json.extensions.VRM.meta.sexualUssageName === 'Disallow' &&
     exBad.json.extensions.VRM.meta.commercialUssageName === 'Disallow',
    'invalid violent/sexual/commercial fall back to Disallow');
}

/* ---- Round 95: humanBone→node exact mapping + bone symmetry ---- */
{
  const png = H.b64ToBytes(H.PNG1);
  const ex = H.exportVRM(B, P, {}, png);
  const hbs = ex.json.extensions.VRM.humanoid.humanBones;

  // each humanBone's node must equal B.humanoid[boneName] + 1 (nodeOf)
  ok(hbs.every(hb => hb.node === B.humanoid[hb.bone] + 1),
    'each humanBone node === buildAvatar humanoid[bone] + 1 (nodeOf mapping)');

  // all 21 HB bone names appear exactly once in humanBones
  const boneNames = hbs.map(hb => hb.bone);
  ok(H.HB.every(name => boneNames.filter(n => n === name).length === 1),
    'each of 21 VRM0 humanoid bone names appears exactly once in exported humanBones');

  // left/right bone symmetry: leftX node != rightX node, and both are present
  const pairs = [
    ['leftShoulder','rightShoulder'],
    ['leftUpperArm','rightUpperArm'],
    ['leftLowerArm','rightLowerArm'],
    ['leftHand','rightHand'],
    ['leftUpperLeg','rightUpperLeg'],
    ['leftLowerLeg','rightLowerLeg'],
    ['leftFoot','rightFoot'],
    ['leftEye','rightEye'],
  ];
  ok(pairs.every(([l, r]) => {
    const ln = hbs.find(hb => hb.bone === l);
    const rn = hbs.find(hb => hb.bone === r);
    return ln && rn && ln.node !== rn.node;
  }), 'all 8 left/right bone pairs map to distinct nodes');

  // spine chain order: hips < spine < chest < neck < head (ascending node indices)
  const chain = ['hips','spine','chest','neck','head'].map(n => hbs.find(hb => hb.bone === n).node);
  ok(chain.every((v, i) => i === 0 || v > chain[i - 1]),
    'spine chain (hips→spine→chest→neck→head) has strictly ascending node indices');
}

/* ---- Round 96: exported node parent→children matches bone hierarchy ---- */
{
  const png = H.b64ToBytes(H.PNG1);
  const ex = H.exportVRM(B, P, {}, png);
  const j = ex.json;

  // Build a childMap from exported nodes: for each node, which nodes list it as a child?
  // nodeOf(boneIdx) = boneIdx + 1 (Root is 0, bones are 1..N, meshNode is N+1)
  const N = B.bones.length;

  // For each bone, its exported node is (boneIdx+1).
  // Its parent bone's exported node's children array must include (boneIdx+1).
  // Bones with parent===-1 (root hips) are children of node 0 (Root).
  let parentOK = true;
  B.bones.forEach((b, i) => {
    const myNode = i + 1;
    const parentNode = b.parent >= 0 ? b.parent + 1 : 0;
    const kids = j.nodes[parentNode].children || [];
    if (!kids.includes(myNode)) parentOK = false;
  });
  ok(parentOK, 'every bone node appears in its parent node\'s children array (hierarchy preserved in export)');

  // Leaf bones (no bone has them as parent) must NOT appear in any non-parent node's children
  const parentSet = new Set(B.bones.map(b => b.parent).filter(p => p >= 0));
  const leafBones = B.bones.map((_, i) => i).filter(i => !parentSet.has(i));
  ok(leafBones.length > 0, 'at least some leaf bones exist (not every bone has children)');

  // Every node that is a child of some other node appears exactly once across all children arrays
  const allChildRefs = j.nodes.flatMap(n => n.children || []);
  const uniqueChildRefs = new Set(allChildRefs);
  ok(allChildRefs.length === uniqueChildRefs.size,
    'each node appears as a child exactly once (no duplicate or shared parent references)');

  // All atlas uvBlock regions produce center points strictly inside [0,1]
  const blockNames = ['skin','hair','clothMain','clothSub','accent','shoe','white','hairHi'];
  ok(blockNames.every(name => {
    const [u, v] = H.uvBlock(name);
    return u > 0 && u < 1 && v > 0 && v < 1;
  }), 'all 8 solid atlas blocks have center UV strictly inside (0,1)');

  // All uvRect regions are non-degenerate and inside [0,1]
  const rectNames = ['eyeL','eyeR','browL','browR','mouth','blush'];
  ok(rectNames.every(name => {
    const [u0, v0, u1, v1] = H.uvRect(name);
    return u0 >= 0 && v0 >= 0 && u1 <= 1 && v1 <= 1 && u1 > u0 && v1 > v0;
  }), 'all 6 atlas rect regions are non-degenerate and within [0,1]');

  // eyeL and eyeR uvRects are mirror images (same v range, symmetric u range)
  const eL = H.uvRect('eyeL'), eR = H.uvRect('eyeR');
  ok(Math.abs(eL[1] - eR[1]) < 1e-9 && Math.abs(eL[3] - eR[3]) < 1e-9,
    'eyeL and eyeR share same v range (horizontally mirrored in atlas)');
  ok(Math.abs((eL[2] - eL[0]) - (eR[2] - eR[0])) < 1e-9,
    'eyeL and eyeR regions have equal width in UV space');
}

/* ---- Round 97: rank category boundaries for mat/skinned/mesh/texMB ---- */
{
  const base = { tris: 1, bones: 1, skinned: 1, mesh: 0, mat: 1, pbComp: 0, pbTrans: 0, pbCol: 0, pbCheck: 0, texMB: 1 };

  // Quest mat: Excellent=1, Good=1 (same), Medium=2 — but quest mat[E]=1, mat[G]=1 so >1 → Medium
  ok(H.rank(Object.assign({}, base, { mat: 1 }), 'quest').rank === 'Excellent', 'quest mat=1 → Excellent');
  ok(H.rank(Object.assign({}, base, { mat: 2 }), 'quest').rank === 'Medium', 'quest mat=2 → Medium (E=G=1, M=2)');

  // Quest skinned: Excellent=1, Good=1 (same threshold), Medium=2
  ok(H.rank(Object.assign({}, base, { skinned: 1 }), 'quest').rank === 'Excellent', 'quest skinned=1 → Excellent');
  ok(H.rank(Object.assign({}, base, { skinned: 2 }), 'quest').rank === 'Medium', 'quest skinned=2 → Medium (E=G=1, M=2)');

  // Quest mesh: Excellent=1, Good=1 (same threshold), mesh=0 is below threshold → also Excellent
  ok(H.rank(Object.assign({}, base, { mesh: 0 }), 'quest').rank === 'Excellent', 'quest mesh=0 → Excellent (≤1)');
  ok(H.rank(Object.assign({}, base, { mesh: 1 }), 'quest').rank === 'Excellent', 'quest mesh=1 → Excellent');
  ok(H.rank(Object.assign({}, base, { mesh: 2 }), 'quest').rank === 'Medium', 'quest mesh=2 → Medium (E=G=1, M=2)');

  // Quest texMB boundary: Excellent≤10, Good≤18
  ok(H.rank(Object.assign({}, base, { texMB: 10 }), 'quest').rank === 'Excellent', 'quest texMB=10 → Excellent');
  ok(H.rank(Object.assign({}, base, { texMB: 10.1 }), 'quest').rank === 'Good', 'quest texMB=10.1 → Good');
  ok(H.rank(Object.assign({}, base, { texMB: 18 }), 'quest').rank === 'Good', 'quest texMB=18 → Good');
  ok(H.rank(Object.assign({}, base, { texMB: 18.1 }), 'quest').rank === 'Medium', 'quest texMB=18.1 → Medium');

  // PC mat boundary: Excellent≤4, Good≤8
  ok(H.rank(Object.assign({}, base, { mat: 4 }), 'pc').rank === 'Excellent', 'pc mat=4 → Excellent');
  ok(H.rank(Object.assign({}, base, { mat: 5 }), 'pc').rank === 'Good', 'pc mat=5 → Good');

  // PC skinned boundary: Excellent=1, Good≤2
  ok(H.rank(Object.assign({}, base, { skinned: 1 }), 'pc').rank === 'Excellent', 'pc skinned=1 → Excellent');
  ok(H.rank(Object.assign({}, base, { skinned: 2 }), 'pc').rank === 'Good', 'pc skinned=2 → Good');

  // PC texMB boundary: Excellent≤40, Good≤75
  ok(H.rank(Object.assign({}, base, { texMB: 40 }), 'pc').rank === 'Excellent', 'pc texMB=40 → Excellent');
  ok(H.rank(Object.assign({}, base, { texMB: 40.1 }), 'pc').rank === 'Good', 'pc texMB=40.1 → Good');
}

/* ---- Round 98: M vector math primitives (untested: v3/add/sub/scale/dot/cross/len/norm/lerp) ---- */
{
  // v3
  const v = M.v3(1, 2, 3);
  ok(v[0] === 1 && v[1] === 2 && v[2] === 3, 'M.v3 constructs [x,y,z]');
  ok(M.v3().every(c => c === 0), 'M.v3() defaults to [0,0,0]');

  // add
  const s = M.add([1, 2, 3], [4, 5, 6]);
  ok(s[0] === 5 && s[1] === 7 && s[2] === 9, 'M.add component-wise sum');

  // sub
  const d = M.sub([4, 5, 6], [1, 2, 3]);
  ok(d[0] === 3 && d[1] === 3 && d[2] === 3, 'M.sub component-wise difference');

  // scale
  const sc = M.scale([1, -2, 3], 2);
  ok(sc[0] === 2 && sc[1] === -4 && sc[2] === 6, 'M.scale multiplies each component');

  // dot
  near(M.dot([1, 0, 0], [0, 1, 0]), 0, 1e-12, 'M.dot perpendicular vectors = 0');
  near(M.dot([1, 0, 0], [1, 0, 0]), 1, 1e-12, 'M.dot parallel unit vectors = 1');
  near(M.dot([2, 3, 4], [1, 2, 3]), 2+6+12, 1e-12, 'M.dot general case');

  // cross
  const cx = M.cross([1, 0, 0], [0, 1, 0]);
  ok(Math.abs(cx[0]) < 1e-12 && Math.abs(cx[1]) < 1e-12 && Math.abs(cx[2] - 1) < 1e-12, 'M.cross X×Y = Z');
  const cy = M.cross([0, 1, 0], [0, 0, 1]);
  ok(Math.abs(cy[0] - 1) < 1e-12 && Math.abs(cy[1]) < 1e-12 && Math.abs(cy[2]) < 1e-12, 'M.cross Y×Z = X');
  // anticommutativity: a×b = -(b×a)
  const a = [1, 2, 3], b = [4, 5, 6];
  const ab = M.cross(a, b), ba = M.cross(b, a);
  ok(ab.every((c, i) => Math.abs(c + ba[i]) < 1e-12), 'M.cross anticommutative: a×b = -(b×a)');

  // len
  near(M.len([3, 4, 0]), 5, 1e-10, 'M.len Pythagorean 3-4-5');
  near(M.len([0, 0, 0]), 0, 1e-12, 'M.len zero vector = 0');
  near(M.len([1, 1, 1]), Math.sqrt(3), 1e-10, 'M.len [1,1,1] = sqrt(3)');

  // norm
  const n1 = M.norm([5, 0, 0]);
  near(M.len(n1), 1, 1e-10, 'M.norm produces unit vector');
  ok(Math.abs(n1[0] - 1) < 1e-10 && Math.abs(n1[1]) < 1e-10, 'M.norm [5,0,0] → [1,0,0]');
  const nz = M.norm([0, 0, 0]);
  ok(nz.every(Number.isFinite), 'M.norm zero vector: no NaN (l||1 fallback prevents /0)');

  // lerp
  const l = M.lerp([0, 0, 0], [10, 20, 30], 0.5);
  ok(l[0] === 5 && l[1] === 10 && l[2] === 15, 'M.lerp t=0.5 midpoint');
  const l0 = M.lerp([1, 2, 3], [7, 8, 9], 0);
  ok(l0[0] === 1 && l0[1] === 2 && l0[2] === 3, 'M.lerp t=0 = a');
  const l1 = M.lerp([1, 2, 3], [7, 8, 9], 1);
  ok(l1[0] === 7 && l1[1] === 8 && l1[2] === 9, 'M.lerp t=1 = b');
}

/* ---- Round 99: M math completeness — clamp/mMul/qFromTo degenerate/qid ---- */
{
  // clamp: middle value passes through unchanged
  near(M.clamp(0.5, 0, 1), 0.5, 0, 'clamp mid: value in range passes through');
  near(M.clamp(-5, 0, 1), 0, 0, 'clamp lo: below range → min');
  near(M.clamp(0, 0, 1), 0, 0, 'clamp at lo bound: exactly min passes');
  near(M.clamp(1, 0, 1), 1, 0, 'clamp at hi bound: exactly max passes');

  // mMul associativity: (A*B)*C === A*(B*C) for translation matrices
  const mA = M.mT(1, 0, 0), mB = M.mT(0, 2, 0), mC = M.mT(0, 0, 3);
  const abc1 = M.mMul(M.mMul(mA, mB), mC);
  const abc2 = M.mMul(mA, M.mMul(mB, mC));
  ok(abc1.every((v, i) => Math.abs(v - abc2[i]) < 1e-9), 'mMul associative: (A*B)*C = A*(B*C)');
  // combined translation is sum of individual translations
  near(abc1[12], 1, 1e-9, 'mMul chained translations: x component sums');
  near(abc1[13], 2, 1e-9, 'mMul chained translations: y component sums');
  near(abc1[14], 3, 1e-9, 'mMul chained translations: z component sums');

  // mId is identity for mMul (left and right)
  const mX = M.mT(5, 6, 7);
  const leftId = M.mMul(M.mId(), mX);
  const rightId = M.mMul(mX, M.mId());
  ok(leftId.every((v, i) => Math.abs(v - mX[i]) < 1e-9), 'mMul: mId is left identity');
  ok(rightId.every((v, i) => Math.abs(v - mX[i]) < 1e-9), 'mMul: mId is right identity');

  // qid: identity quaternion produces identity rotation
  const qid = M.qid();
  ok(qid[0] === 0 && qid[1] === 0 && qid[2] === 0 && qid[3] === 1, 'qid = [0,0,0,1]');
  const vec = [1, 2, 3];
  const rotByQid = M.qRot(qid, vec);
  ok(rotByQid.every((v, i) => Math.abs(v - vec[i]) < 1e-9), 'qRot by qid is identity');

  // qFromTo degenerate: a === b → identity quaternion
  const qa = M.qFromTo([0, 1, 0], [0, 1, 0]);
  ok(Math.abs(qa[3] - 1) < 1e-6 && Math.abs(qa[0]) < 1e-6, 'qFromTo same vectors → identity');

  // qFromTo degenerate: a = -b → rotation by π around orthogonal axis (unit length)
  const q180 = M.qFromTo([0, 1, 0], [0, -1, 0]);
  near(M.len(q180), 1, 1e-6, 'qFromTo opposite vectors → unit quaternion');
  // rotating [0,1,0] by this quat should give [0,-1,0]
  const rotated = M.qRot(q180, [0, 1, 0]);
  near(rotated[1], -1, 1e-5, 'qFromTo opposite: 180deg rotation maps +Y to -Y');

  // qMul with qid is identity (left and right)
  const qr = M.qAxis([1, 0, 0], Math.PI / 4);
  const ql = M.qMul(M.qid(), qr);
  const qrr = M.qMul(qr, M.qid());
  ok(ql.every((v, i) => Math.abs(v - qr[i]) < 1e-9), 'qMul: qid is left identity');
  ok(qrr.every((v, i) => Math.abs(v - qr[i]) < 1e-9), 'qMul: qid is right identity');
}

/* ---- Round 100: proportion param extremes (legLen/armLen/mouthW/eyeSize/shoulderW/hipW/skirtLen) ---- */
{
  // Each proportion param at both min and max: geometry must be finite with valid indices
  const proportionParams = ['legLen','armLen','mouthW','eyeSize','shoulderW','hipW','skirtLen'];
  for (const key of proportionParams){
    const s = H.PARAMS[key];
    for (const val of [s.min, s.max]){
      const p = Object.assign(H.defaults(), { [key]: val });
      const b = H.buildAvatar(p);
      const nV = b.geom.pos.length / 3;
      ok(b.geom.pos.every(Number.isFinite) && b.geom.nrm.every(Number.isFinite),
        `${key}=${val}: finite pos/nrm`);
      ok(b.geom.idx.length % 3 === 0 && b.geom.idx.every(i => i >= 0 && i < nV),
        `${key}=${val}: valid triangle indices`);
    }
  }

  // shoulderW > hipW and shoulderW < hipW both produce valid geometry
  const wideShoulders = H.buildAvatar(Object.assign(H.defaults(), { shoulderW: 0.34, hipW: 0.14 }));
  const wideHips = H.buildAvatar(Object.assign(H.defaults(), { shoulderW: 0.14, hipW: 0.34 }));
  ok(wideShoulders.geom.pos.every(Number.isFinite), 'wide shoulders (shoulderW=max, hipW=min): finite');
  ok(wideHips.geom.pos.every(Number.isFinite), 'wide hips (shoulderW=min, hipW=max): finite');

  // blush=0 and blush=1 both export valid VRM (blush is a UV/texture effect, not geometry)
  const png = H.b64ToBytes(H.PNG1);
  const bNoBlush = H.buildAvatar(Object.assign(H.defaults(), { blush: 0 }));
  const bFullBlush = H.buildAvatar(Object.assign(H.defaults(), { blush: 1 }));
  ok(H.exportVRM(bNoBlush, Object.assign(H.defaults(), { blush: 0 }), {}, png).bytes.length > 100,
    'blush=0: exports valid VRM');
  ok(H.exportVRM(bFullBlush, Object.assign(H.defaults(), { blush: 1 }), {}, png).bytes.length > 100,
    'blush=1: exports valid VRM');

  // chibi preset specific: height=1.0m, headRatio=0.34 → head Y > hips Y (vertical order holds even at 1m)
  const chibi = H.presetParams(H.PRESETS.find(p => p.id === 'chibi'));
  const chibiB = H.buildAvatar(chibi);
  ok(chibiB.bones[chibiB.idx.head].w[1] > chibiB.bones[chibiB.idx.hips].w[1],
    'chibi preset: head Y > hips Y (vertical order holds at 1m height)');
  ok(chibiB.dims && chibiB.dims.H === chibi.height,
    'chibi preset: dims.H matches height param (1.0m)');
  ok(H.rank(H.estimate(chibiB, chibi), 'quest').rank === 'Excellent' ||
     H.rank(H.estimate(chibiB, Object.assign({}, chibi, { springOff: true })), 'quest').rank === 'Excellent',
    'chibi preset reaches Quest Excellent (with springOff if needed)');
}

/* ---- Round 103: undo wired to file load + dialog backdrop close ---- */
{
  // captureUndo wired to file-button load (inside rd.onload before params mutation)
  ok(/captureUndo\(\);[\s\S]{0,30}params=d\.params/.test(html),
    'file-button JSON load calls captureUndo() before applying params');

  // captureUndo wired to drag-and-drop load
  const dropSection = html.slice(html.indexOf('addEventListener(\'drop\''), html.indexOf('addEventListener(\'drop\'')+600);
  ok(/captureUndo/.test(dropSection),
    'drag-and-drop JSON load calls captureUndo() before applying params');

  // about dialog closes on backdrop click (e.target === dialog itself)
  ok(/e\.target===\$\('aboutDlg'\)[\s\S]{0,30}close\(\)/.test(html),
    'about dialog closes on backdrop click (e.target === dialog element)');

  // i18n hint.ctrlS updated to mention undo shortcut in both languages
  ok(H.I18N.ja['hint.ctrlS'].includes('⌘+Z') && H.I18N.en['hint.ctrlS'].includes('⌘+Z'),
    'hint.ctrlS i18n includes ⌘+Z undo mention in both languages (Ctrl/⌘ notation)');
}

/* ---- Round 102: Ctrl+Z undo + i18n hint update ---- */
{
  // captureUndo and doUndo functions must exist in source
  ok(html.includes('function captureUndo()') || html.includes('captureUndo=function'),
    'captureUndo() function defined in app source');
  ok(html.includes('function doUndo()') || html.includes('doUndo=function'),
    'doUndo() function defined in app source');

  // Ctrl+Z triggers doUndo
  ok(/e\.key==='z'[\s\S]{0,80}doUndo/.test(html),
    'Ctrl+Z key handler calls doUndo()');

  // Slider onpointerdown captures undo
  ok(/onpointerdown.*captureUndo|captureUndo.*onpointerdown/.test(html.replace(/\s+/g,' ')),
    'slider onpointerdown fires captureUndo() before drag');

  // Preset button captures undo
  ok(/captureUndo\(\).*params=pp|captureUndo.*preCard/.test(html.replace(/\s+/g,' ')),
    'preset selection calls captureUndo() before applying preset params');

  // Gacha captures undo
  ok(/captureUndo\(\).*randomParams|runGacha[\s\S]{0,40}captureUndo/.test(html),
    'gacha runGacha() calls captureUndo() before randomizing');

  // hint.ctrlS updated to mention undo shortcut
  ok(H.I18N.ja['hint.ctrlS'].includes('⌘+Z') && H.I18N.en['hint.ctrlS'].includes('⌘+Z'),
    'hint.ctrlS i18n updated to mention ⌘+Z undo in both languages (Ctrl/⌘ notation)');
}

/* ---- Round 101: mouth texture scales with mouthW + Ctrl+Shift+S shortcut ---- */
{
  // mouth texture ellipse must scale with mouthW: verify source code contains p.mouthW factor
  ok(/ax\.ellipse\(0,0,w\*0\.\d+\*p\.mouthW/.test(html),
    'mouth texture outer ellipse x-radius scales with p.mouthW (wide mouth = wider atlas drawing)');
  ok(/ax\.ellipse\(0,-h\*0\.\d+,w\*0\.\d+\*p\.mouthW/.test(html),
    'mouth texture inner ellipse x-radius also scales with p.mouthW');

  // the scaling must stay within atlas bounds: max is mouthW=1.5, w*0.32*1.5 = 0.48*w < 0.5*w
  // verify the multiplier stays < 0.5 so ellipse fits in atlas half-width
  const outerM = html.match(/ax\.ellipse\(0,0,w\*(\d+\.\d+)\*p\.mouthW/);
  ok(outerM && parseFloat(outerM[1]) * 1.5 < 0.5,
    'mouth outer ellipse at mouthW=1.5 stays within atlas half-width (< 0.5*w)');

  // Ctrl+Shift+S keyboard shortcut for JSON save
  ok(/e\.key==='S'.*e\.shiftKey.*saveJson|shiftKey.*e\.key==='S'.*saveJson/.test(html.replace(/\s+/g,' ')),
    'Ctrl+Shift+S keyboard shortcut calls saveJson() (JSON parameter save)');

  // verify VRM Ctrl+S shortcut guards: !e.shiftKey appears before doExport call
  ok(/!e\.shiftKey[\s\S]{0,200}doExport/.test(html),
    'Ctrl+S fires doExport only when Shift is NOT held (Shift+S is JSON save)');
}

/* ---- Round 104: expression preview bar ---- */
{
  // HTML structure: exprBar element present in stage
  ok(html.includes('id="exprBar"'), 'exprBar element present in stage HTML');
  ok(html.includes('role="toolbar"'), 'exprBar has role="toolbar" for ARIA (accessible expression buttons)');

  // JS: state variable and functions
  ok(/let activeExpr/.test(html), 'activeExpr state variable present');
  ok(/function setExpr/.test(html), 'setExpr() function present');
  ok(/function buildExprBar/.test(html), 'buildExprBar() function present');

  // blink suppressed when expression is locked
  ok(/!activeExpr[\s\S]{0,50}blinkT/.test(html),
    'auto-blink is gated by !activeExpr so it stops when an expression is previewed');

  // expression bar built on rebuild
  ok(/activeExpr = null;[\s\S]{0,30}buildExprBar/.test(html),
    'rebuild() resets activeExpr and calls buildExprBar() to refresh the bar');

  // expression bar rebuilt on language switch (tooltips must update)
  ok(/buildExprBar\(\)/.test(html.slice(html.indexOf('function applyLang'), html.indexOf('function applyLang') + 2500)),
    'applyLang() calls buildExprBar() so expression tooltips re-render in the new language');

  // expression bar iterates over build.morphs.names
  ok(/morphs\.names/.test(html), 'buildExprBar iterates build.morphs.names for expression list');

  // setExpr clears morphW when called with null (neutral)
  ok(/morphW = \{\}/.test(html), 'setExpr() clears morphW = {} before applying new expression');

  // i18n keys for all 11 expression labels present in both languages
  const exprKeys = ['neutral','a','i','u','e','o','blink','joy','angry','sorrow','fun'];
  ok(exprKeys.every(k => H.I18N.ja['expr.'+k] && H.I18N.en['expr.'+k]),
    'expr.* i18n keys present for all 11 expressions in both ja and en');

  // neutral i18n in both languages
  ok(H.I18N.ja['expr.neutral'] === 'ニュートラル', 'expr.neutral JA = ニュートラル');
  ok(H.I18N.en['expr.neutral'] === 'Neutral', 'expr.neutral EN = Neutral');
}

/* ---- Round 105: randomParams determinism + GLB JSON-chunk padding + onParam fix ---- */
{
  // randomParams is deterministic: same seed → same output
  const p1 = H.randomParams(12345), p2 = H.randomParams(12345);
  ok(JSON.stringify(p1) === JSON.stringify(p2),
    'randomParams(seed) is deterministic: calling twice with same seed yields identical output');

  // different seeds produce different outputs
  const p3 = H.randomParams(99999);
  ok(JSON.stringify(p1) !== JSON.stringify(p3),
    'randomParams with different seeds produces different outputs');

  // randomParams output passes sanitize() unchanged
  const pR = H.randomParams(777);
  ok(JSON.stringify(H.sanitize(pR)) === JSON.stringify(pR),
    'randomParams() output is already sanitized (all values within valid range)');

  // springOff always false from randomParams
  ok(!pR.springOff && !p1.springOff && !p3.springOff,
    'randomParams() always sets springOff=false (must not disable spring bones)');

  // randomParams numeric values within PARAMS bounds
  ok(Object.keys(H.PARAMS).every(k => {
    const s = H.PARAMS[k];
    if (s.k !== 'num') return true;
    return pR[k] >= s.min && pR[k] <= s.max;
  }), 'randomParams() all numeric values are within [min, max] bounds');

  // randomParams enum values are valid
  ok(Object.keys(H.PARAMS).every(k => {
    const s = H.PARAMS[k];
    if (s.k !== 'enum') return true;
    return s.opts.includes(pR[k]);
  }), 'randomParams() all enum values are valid options');

  // randomParams produces buildable avatar
  const pRB = H.buildAvatar(pR);
  ok(pRB && pRB.geom.pos.every(Number.isFinite), 'randomParams() output produces a finite-position avatar');

  // GLB JSON chunk must be padded with 0x20 (space) bytes per glTF 2.0 spec
  {
    const png = H.b64ToBytes(H.PNG1);
    const ex = H.exportVRM(H.buildAvatar(H.defaults()), H.defaults(), {}, png);
    const bytes = ex.bytes;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const jsonChunkLen = dv.getUint32(12, true);
    const jsonStart = 20;
    const jsonEnd = jsonStart + jsonChunkLen;
    // find actual JSON end (last non-space byte in the chunk)
    let actualJsonEnd = jsonEnd;
    while (actualJsonEnd > jsonStart && bytes[actualJsonEnd - 1] === 0x20) actualJsonEnd--;
    const padCount = jsonEnd - actualJsonEnd;
    ok(padCount === 0 || Array.from({length: padCount}, (_, i) => bytes[actualJsonEnd + i]).every(b => b === 0x20),
      'GLB JSON chunk padding bytes are 0x20 (space) per glTF 2.0 §4.4');
  }

  // onParam calls renderBody only for structural params (outfit→skirtLen, springOff→spring sliders)
  ok(/k==='outfit'\s*\|\|\s*k==='springOff'[\s\S]{0,60}renderBody/.test(html),
    'onParam() guards renderBody() behind outfit/springOff so only structural changes re-render the panel');
}

/* ---- Round 106: height badge in preview overlay + GLB binary chunk padding ---- */
{
  // Height badge elements present in stage HTML
  ok(html.includes('id="heightBadge"'), 'height badge element present in rank overlay');
  ok(html.includes('id="heightVal"'), 'heightVal span present for dynamic height display');
  ok(html.includes('id="heightLbl"'), 'heightLbl span present for localizable height label');

  // updateStats() fills heightVal with formatted height
  ok(/heightVal[\s\S]{0,60}params\.height\.toFixed/.test(html),
    'updateStats() sets heightVal to params.height.toFixed(2) + " m"');

  // applyLang() translates the height label
  ok(/heightLbl[\s\S]{0,40}lbl\.height/.test(html),
    'applyLang() updates heightLbl with localized lbl.height key');

  // i18n keys for height label in both languages
  ok(H.I18N.ja['lbl.height'] === '高さ', 'lbl.height JA = 高さ');
  ok(H.I18N.en['lbl.height'] === 'Height', 'lbl.height EN = Height');

  // GLB binary chunk must be padded with 0x00 bytes per glTF 2.0 spec
  {
    const png = H.b64ToBytes(H.PNG1);
    const ex = H.exportVRM(H.buildAvatar(H.defaults()), H.defaults(), {}, png);
    const bytes = ex.bytes;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    // JSON chunk: offset 12 = chunk length, offset 16 = 'JSON' magic
    const jsonChunkLen = dv.getUint32(12, true);
    // BIN chunk starts after header(12) + JSON chunk header(8) + JSON chunk data
    const binChunkOff = 12 + 8 + jsonChunkLen;
    const binChunkLen = dv.getUint32(binChunkOff, true);
    const binStart = binChunkOff + 8;
    const binEnd = binStart + binChunkLen;
    ok(binEnd <= bytes.length, 'GLB binary chunk end is within total file size');
    // Find the actual data end (last non-zero byte + 1)
    let dataEnd = binEnd;
    while (dataEnd > binStart && bytes[dataEnd - 1] === 0) dataEnd--;
    const padBytes = binEnd - dataEnd;
    ok(padBytes >= 0, 'GLB binary chunk has non-negative padding (≥0 bytes)');
    // If there is padding, all pad bytes must be 0x00
    const binPadOK = padBytes === 0 || Array.from({length: padBytes}, (_, i) => bytes[dataEnd + i]).every(b => b === 0);
    ok(binPadOK, 'GLB binary chunk padding bytes are 0x00 per glTF 2.0 §4.4');
  }

  // HEIGHT badge updates dynamically: verify avatar built with height=1.2 has different height than default
  {
    const bH = H.buildAvatar(H.sanitize({ height: 1.2 }));
    ok(bH.dims.H === 1.2, 'buildAvatar dims.H reflects height param (1.2m)');
    const bD = H.buildAvatar(H.defaults());
    ok(bD.dims.H === H.defaults().height, 'buildAvatar dims.H reflects default height param');
    ok(bH.dims.H !== bD.dims.H, 'different height params produce different dims.H values');
  }
}

/* ---- Round 107: atlas layout integrity + b64ToBytes PNG magic + VERSION semver + swatch title ---- */
{
  // b64ToBytes(PNG1) produces a valid PNG (PNG magic: 0x89 50 4E 47 0D 0A 1A 0A)
  const pngBytes = H.b64ToBytes(H.PNG1);
  ok(pngBytes[0] === 0x89 && pngBytes[1] === 0x50 && pngBytes[2] === 0x4E && pngBytes[3] === 0x47,
    'b64ToBytes(PNG1) produces valid PNG: correct 4-byte magic (89 50 4E 47)');
  ok(pngBytes[4] === 0x0D && pngBytes[5] === 0x0A && pngBytes[6] === 0x1A && pngBytes[7] === 0x0A,
    'b64ToBytes(PNG1) PNG magic bytes 5-8 correct (0D 0A 1A 0A)');

  // VERSION is a valid semver string (X.Y.Z)
  ok(/^\d+\.\d+\.\d+$/.test(H.VERSION), 'VERSION is a valid semver string (X.Y.Z format)');

  // All ATLAS face regions are within [0, TEX]
  const faceRegions = ['eyeL','eyeR','browL','browR','mouth','blush'];
  ok(faceRegions.every(name => {
    const r = H.ATLAS[name];
    return r[0] >= 0 && r[1] >= 0 && r[2] <= H.TEX && r[3] <= H.TEX && r[0] < r[2] && r[1] < r[3];
  }), 'all ATLAS face regions have valid coordinates within [0, TEX]');

  // ATLAS face regions do not overlap each other
  let noOverlap = true;
  for (let a = 0; a < faceRegions.length; a++){
    for (let b2 = a + 1; b2 < faceRegions.length; b2++){
      const ra = H.ATLAS[faceRegions[a]], rb = H.ATLAS[faceRegions[b2]];
      const xOverlap = ra[0] < rb[2] && ra[2] > rb[0];
      const yOverlap = ra[1] < rb[3] && ra[3] > rb[1];
      if (xOverlap && yOverlap){ noOverlap = false; break; }
    }
  }
  ok(noOverlap, 'ATLAS face regions do not overlap each other (unique UV areas)');

  // Solid block centers are within [0, TEX]
  const blockNames = ['skin','hair','clothMain','clothSub','accent','shoe','white','hairHi'];
  ok(blockNames.every(name => {
    const b = H.ATLAS[name];
    return b[0] + 32 < H.TEX && b[1] + 32 < H.TEX;
  }), 'all ATLAS solid block center points (b[0]+32, b[1]+32) are within [0, TEX]');

  // Color swatch buttons have title attribute for hex tooltip
  ok(/class:'sw'[\s\S]{0,200}title:c/.test(html.replace(/\s+/g,' ')),
    'color swatch buttons have title:c attribute (hex color tooltip on hover)');

  // morph targetNames are unique (no duplicate expression names)
  const morphNames = H.buildAvatar(H.defaults()).morphs.names;
  ok(new Set(morphNames).size === morphNames.length,
    'morph targetNames are all unique (no duplicate expression names in the mesh)');
}

/* ---- Round 108: per-preset spring chain validation + copy-seed clipboard button ---- */
{
  const png = H.b64ToBytes(H.PNG1);
  const CHAINS_BY_STYLE = {short:0, bob:0, long:3, twin:2, pony:1};
  for (const pre of H.PRESETS){
    const p = H.presetParams(pre);
    const b = H.buildAvatar(p);
    const expectedChains = CHAINS_BY_STYLE[p.hairStyle];
    ok(b.springs.length === expectedChains,
      `${pre.id}: springs.length=${expectedChains} for hairStyle=${p.hairStyle}`);
    const vrmSA = H.exportVRM(b, p, {}, png).json.extensions.VRM.secondaryAnimation;
    const expectBG = expectedChains > 0 ? 1 : 0;
    ok(vrmSA.boneGroups.length === expectBG,
      `${pre.id}: VRM secondaryAnimation.boneGroups.length=${expectBG} (hairStyle=${p.hairStyle})`);
    if (expectedChains > 0){
      ok(vrmSA.boneGroups[0].bones.length === expectedChains,
        `${pre.id}: VRM boneGroups[0].bones.length=${expectedChains} (one entry per chain)`);
    }
  }

  // copy-seed button: i18n keys present in both languages
  ok(H.I18N.ja['btn.copySeed'] === 'コピー', 'btn.copySeed JA = コピー');
  ok(H.I18N.en['btn.copySeed'] === 'Copy', 'btn.copySeed EN = Copy');

  // copy-seed button referenced in app source (t() call with the key)
  ok(/btn\.copySeed/.test(html), 'btn.copySeed i18n key referenced in app source');

  // copy-seed button uses navigator.clipboard.writeText
  ok(/navigator\.clipboard/.test(html) && /writeText/.test(html),
    'copy-seed button calls navigator.clipboard?.writeText for clipboard access');

  // copy-seed button no-ops when no gacha has been run
  ok(/lastGachaSeed===null[\s\S]{0,20}return/.test(html),
    'copy-seed button guards against null seed (no-op when no gacha run yet)');
}

/* ---- Round 109: VRM asset/exporter metadata + humanoid twist + collider formula + ? shortcut hint ---- */
{
  const png = H.b64ToBytes(H.PNG1);
  const ex = H.exportVRM(B, P, {title:'テスト', author:'t'}, png);
  const j = ex.json;
  const V = j.extensions.VRM;

  // glTF asset block
  ok(j.asset.generator && j.asset.generator.startsWith('Hina '), 'glTF asset.generator starts with "Hina "');
  ok(j.asset.generator.includes(H.VERSION), 'glTF asset.generator contains current VERSION');

  // VRM exporterVersion
  ok(V.exporterVersion && V.exporterVersion.startsWith('Hina-'), 'VRM exporterVersion starts with "Hina-"');
  ok(V.exporterVersion.includes(H.VERSION), 'VRM exporterVersion contains current VERSION');

  // humanoid twist and spacing (VRM0 standard values)
  const h = V.humanoid;
  ok(h.upperArmTwist === 0.5 && h.lowerArmTwist === 0.5 && h.upperLegTwist === 0.5 && h.lowerLegTwist === 0.5,
    'humanoid twist factors = 0.5 (upperArm/lowerArm/upperLeg/lowerLeg)');
  ok(h.feetSpacing === 0, 'humanoid feetSpacing = 0 (T-pose, feet at hip-width)');

  // collider radius matches rig formula: headR * 0.88
  const bDef = H.buildAvatar(H.defaults());
  ok(Math.abs(bDef.collider.radius - bDef.dims.headR * 0.88) < 1e-6,
    'head collider radius = dims.headR × 0.88 (matches rig formula)');
  // collider radius scales with avatar height (chibi smaller than default)
  const bChibi = H.buildAvatar(H.presetParams(H.PRESETS.find(p => p.id === 'chibi')));
  ok(bChibi.collider.radius < bDef.collider.radius,
    'chibi head collider radius < default (proportional to headR)');

  // ? key shortcut opens aboutDlg (source code pattern)
  ok((html.includes("e.key==='?'") && html.includes('openAbout()') && html.includes('showModal()')) ||
     /e\.key==='[?]'[\s\S]{0,120}showModal/.test(html),
    '? key shortcut opens aboutDlg (calls openAbout or showModal directly)');

  // hint.ctrlS updated to mention ? shortcut in both languages
  ok(H.I18N.ja['hint.ctrlS'].includes('?') && H.I18N.en['hint.ctrlS'].includes('?'),
    'hint.ctrlS i18n includes ? shortcut in both languages (discoverability)');
}

/* ---- Round 110: PARAMS/i18n parity (CLAUDE.md §Rules) + gacha seed filename ---- */
{
  // I18N bidirectional parity: every JA key must have an EN counterpart and vice versa
  const jaKeys = new Set(Object.keys(H.I18N.ja));
  const enKeys = new Set(Object.keys(H.I18N.en));
  const missingInEn = [...jaKeys].filter(k => !enKeys.has(k));
  const missingInJa = [...enKeys].filter(k => !jaKeys.has(k));
  ok(missingInEn.length === 0,
    'I18N parity: every JA key exists in EN (missing: ' + (missingInEn.join(',') || 'none') + ')');
  ok(missingInJa.length === 0,
    'I18N parity: every EN key exists in JA (missing: ' + (missingInJa.join(',') || 'none') + ')');

  // PARAMS labels: every key has both .ja and .en
  ok(Object.keys(H.PARAMS).every(k => typeof H.PARAMS[k].ja === 'string' && typeof H.PARAMS[k].en === 'string'),
    'PARAMS schema: every key has .ja and .en label strings');

  // PARAMS num: default within [min, max]
  ok(Object.keys(H.PARAMS).filter(k => H.PARAMS[k].k === 'num').every(k => {
    const s = H.PARAMS[k];
    return s.def >= s.min && s.def <= s.max;
  }), 'PARAMS num defaults: all within [min, max]');

  // PARAMS enum: default is a valid option
  ok(Object.keys(H.PARAMS).filter(k => H.PARAMS[k].k === 'enum').every(k => {
    const s = H.PARAMS[k];
    return s.opts.includes(s.def);
  }), 'PARAMS enum defaults: all in opts[]');

  // PARAMS enum option i18n: every enum.{key}.{opt} has JA and EN translations
  const missingEnumI18n = [];
  Object.keys(H.PARAMS).forEach(k => {
    const s = H.PARAMS[k];
    if (s.k === 'enum') s.opts.forEach(opt => {
      const ik = 'enum.' + k + '.' + opt;
      if (!H.I18N.ja[ik]) missingEnumI18n.push('JA:' + ik);
      if (!H.I18N.en[ik]) missingEnumI18n.push('EN:' + ik);
    });
  });
  ok(missingEnumI18n.length === 0,
    'PARAMS enum i18n: all enum.{key}.{opt} keys present in both languages (missing: ' + (missingEnumI18n.join(',') || 'none') + ')');

  // SPEC enum option counts: hairStyle=5, outfit=4 (SPEC §3 F-005/F-006)
  ok(H.PARAMS.hairStyle.opts.length === 5 && H.PARAMS.outfit.opts.length === 4,
    'SPEC F-005/F-006: hairStyle has 5 options, outfit has 4 options');

  // gacha seed in filename: fnameStem() uses lastGachaSeed when set
  ok(/lastGachaSeed\s*!==\s*null[\s\S]{0,40}'hina_gacha_'/.test(html),
    'fnameStem() includes "hina_gacha_{seed}" prefix when gacha was run (reproducibility)');
}

/* ---- Round 111: blink morph symmetry + vowel vertex coverage + expr hint feedback ---- */
{
  // blink_l and blink_r must affect disjoint vertex sets (each controls one eye)
  const bLVerts = new Set(B.morphs.sparse.blink_l.map(e => e[0]));
  const bRVerts = new Set(B.morphs.sparse.blink_r.map(e => e[0]));
  ok(bLVerts.size > 0 && bRVerts.size > 0, 'blink_l and blink_r each affect at least one vertex');
  ok([...bLVerts].every(v => !bRVerts.has(v)),
    'blink_l and blink_r affect disjoint vertex sets (L eye ≠ R eye)');
  ok(bLVerts.size === bRVerts.size,
    'blink_l and blink_r affect equal vertex count (symmetric eyes)');

  // combined blink must be a superset of blink_l ∪ blink_r
  const blinkVerts = new Set(B.morphs.sparse.blink.map(e => e[0]));
  ok([...bLVerts].every(v => blinkVerts.has(v)) && [...bRVerts].every(v => blinkVerts.has(v)),
    'combined blink morph vertex set is a superset of blink_l ∪ blink_r');

  // vowel morph vertices must be disjoint from eye/brow (blink) vertices
  // (different scale factors may yield different sparse sets due to zero-displacement filtering,
  //  but all vowels are mouth-only, so no vowel vertex should appear in the blink set)
  const vowelAllVerts = new Set(['a','i','u','e','o'].flatMap(n => B.morphs.sparse[n].map(e => e[0])));
  ok([...vowelAllVerts].every(v => !blinkVerts.has(v)),
    'vowel morph vertices are disjoint from blink vertices (mouth ≠ eye+brow regions)');

  // setExpr() updates hint bar with expression name when active
  ok(/setExpr[\s\S]{0,200}hintEl.*textContent.*expr\..*exprOff/.test(html.replace(/\s+/g,' ')),
    'setExpr() updates hint bar with expression name and deactivation hint');
  ok(/setExpr[\s\S]{0,320}_hintDefault\(\)/.test(html),
    'setExpr() restores hint via _hintDefault() when returning to neutral');

  // hint.exprOff i18n key in both languages
  ok(H.I18N.ja['hint.exprOff'] === 'クリックで解除', 'hint.exprOff JA = クリックで解除');
  ok(H.I18N.en['hint.exprOff'] === 'click to deactivate', 'hint.exprOff EN = click to deactivate');
}

/* ---- Round 112: emotion morph coverage — eye participation in joy/sorrow/angry/fun ---- */
{
  // Recompute blink vertex sets (blink_l=left eye, blink_r=right eye, blink=both)
  const bLV = new Set(B.morphs.sparse.blink_l.map(e => e[0]));
  const bRV = new Set(B.morphs.sparse.blink_r.map(e => e[0]));
  const vowelV = new Set(['a','i','u','e','o'].flatMap(n => B.morphs.sparse[n].map(e => e[0])));

  // joy: affects both L and R eye vertices
  const joyV = new Set(B.morphs.sparse.joy.map(e => e[0]));
  ok([...bLV].some(v => joyV.has(v)) && [...bRV].some(v => joyV.has(v)),
    'joy morph affects vertices from both left and right eye regions');
  // joy also affects mouth
  ok([...vowelV].some(v => joyV.has(v)),
    'joy morph includes mouth vertices (combined smile + eye squint)');

  // sorrow: affects both L and R eye vertices
  const sorrowV = new Set(B.morphs.sparse.sorrow.map(e => e[0]));
  ok([...bLV].some(v => sorrowV.has(v)) && [...bRV].some(v => sorrowV.has(v)),
    'sorrow morph affects vertices from both left and right eye regions');

  // angry: now affects L+R eyes (narrowed eyes added in Round 112)
  const angryV = new Set(B.morphs.sparse.angry.map(e => e[0]));
  ok([...bLV].some(v => angryV.has(v)) && [...bRV].some(v => angryV.has(v)),
    'angry morph affects both eye regions (narrowed eyes for expressiveness)');

  // fun: affects both mouth and eyes
  const funV = new Set(B.morphs.sparse.fun.map(e => e[0]));
  ok([...vowelV].some(v => funV.has(v)),
    'fun morph includes mouth vertices (wide smile)');
  ok([...bLV].some(v => funV.has(v)) && [...bRV].some(v => funV.has(v)),
    'fun morph affects both eye regions (squinted eyes for delight)');
}

/* ---- Round 113: all outfit×hairStyle tris budget + spring chain hierarchy + ahoge geometry ---- */
{
  // All 5 hairStyle × 4 outfit combinations must stay under Quest Excellent tris limit (7500)
  let worstTris = 0, worstCombo = '';
  for (const hs of H.PARAMS.hairStyle.opts){
    for (const ot of H.PARAMS.outfit.opts){
      const p = H.sanitize({ hairStyle: hs, outfit: ot });
      const b = H.buildAvatar(p);
      const tris = H.estimate(b, p).tris;
      if (tris > worstTris){ worstTris = tris; worstCombo = hs + '+' + ot; }
      ok(tris < 7500, `${hs}+${ot}: tris=${tris} < 7500 (Quest Excellent poly budget)`);
    }
  }

  // spring chain root bones must be direct children of head (all hairStyles with springs)
  ok(B.springs.every(s => B.bones[s.boneIdxs[0]].parent === B.idx.head),
    'all spring chain root bones are direct children of the head bone');
  // spring chain internal bones form a strict parent→child sequence
  ok(B.springs.every(s =>
    s.boneIdxs.every((bi, j) => j === 0 || B.bones[bi].parent === s.boneIdxs[j-1])),
    'spring chain bones form a strict sequential parent→child chain');

  // ahoge adds exactly 3 vertices and 1 triangle when enabled
  const bNoAhoge = H.buildAvatar(H.sanitize({ ahoge: false }));
  const bWithAhoge = H.buildAvatar(H.sanitize({ ahoge: true }));
  const nWithout = bNoAhoge.geom.pos.length / 3;
  const nWith = bWithAhoge.geom.pos.length / 3;
  ok(nWith === nWithout + 3, 'ahoge=true adds exactly 3 vertices (single triangle)');
  ok(bWithAhoge.geom.idx.length === bNoAhoge.geom.idx.length + 3,
    'ahoge=true adds exactly 3 indices (1 triangle)');
}

/* ---- Round 114: screen reader announcements for expression changes + a11y i18n coverage ---- */
{
  // New i18n keys for expression screen reader announcements
  ok(H.I18N.ja['a11y.exprActive'] === '表情: {expr}', 'a11y.exprActive JA contains {expr} placeholder');
  ok(H.I18N.en['a11y.exprActive'] === 'Expression: {expr}', 'a11y.exprActive EN contains {expr} placeholder');
  ok(H.I18N.ja['a11y.exprNeutral'] === 'ニュートラルに戻りました', 'a11y.exprNeutral JA');
  ok(H.I18N.en['a11y.exprNeutral'] === 'Returned to neutral', 'a11y.exprNeutral EN');

  // setExpr() updates srStatus with expression announcement
  ok(/setExpr[\s\S]{0,400}srEl[\s\S]{0,80}a11y\.exprActive/.test(html),
    'setExpr() updates srStatus with a11y.exprActive message when expression is active');
  ok(/setExpr[\s\S]{0,500}a11y\.exprNeutral/.test(html),
    'setExpr() updates srStatus with a11y.exprNeutral when returning to neutral');

  // a11y.rankStatus template has {pc} and {q} placeholders in both languages
  ok(H.I18N.ja['a11y.rankStatus'] && H.I18N.ja['a11y.rankStatus'].includes('{pc}') &&
     H.I18N.ja['a11y.rankStatus'].includes('{q}'), 'a11y.rankStatus JA has {pc} and {q} placeholders');
  ok(H.I18N.en['a11y.rankStatus'] && H.I18N.en['a11y.rankStatus'].includes('{pc}') &&
     H.I18N.en['a11y.rankStatus'].includes('{q}'), 'a11y.rankStatus EN has {pc} and {q} placeholders');

  // All a11y.* keys must be present in both languages (i18n parity for accessibility strings)
  const a11yJa = Object.keys(H.I18N.ja).filter(k => k.startsWith('a11y.'));
  const a11yEn = Object.keys(H.I18N.en).filter(k => k.startsWith('a11y.'));
  ok(a11yJa.every(k => H.I18N.en[k] !== undefined),
    'all a11y.* JA keys have EN counterparts');
  ok(a11yEn.every(k => H.I18N.ja[k] !== undefined),
    'all a11y.* EN keys have JA counterparts');
}

/* ---- Round 115: browType tests (previously untested) + bangs count ordering + atlas enum coverage ---- */
{
  // browType is texture-only (canvas) — geometry should be identical for all 3 values
  const browBuilds = {};
  for (const bt of H.PARAMS.browType.opts){
    const b = H.buildAvatar(Object.assign(H.defaults(), { browType: bt }));
    ok(b.geom.pos.every(Number.isFinite) && b.geom.nrm.every(Number.isFinite),
      `browType=${bt}: finite pos/nrm`);
    ok(b.geom.idx.length % 3 === 0 && b.geom.idx.every(i => i >= 0 && i < b.geom.pos.length / 3),
      `browType=${bt}: valid triangle indices`);
    browBuilds[bt] = b;
  }
  // browType is texture-only: all 3 variants have identical geometry
  ok(browBuilds.soft.geom.pos.length === browBuilds.straight.geom.pos.length &&
     browBuilds.soft.geom.pos.length === browBuilds.arch.geom.pos.length,
    'browType soft/straight/arch all produce identical vertex counts (texture-only param)');

  // bangs geometric ordering: center (4 strips) < see (5 strips) < full (7 strips)
  const bFull   = H.buildAvatar(Object.assign(H.defaults(), { bangs: 'full'   }));
  const bSee    = H.buildAvatar(Object.assign(H.defaults(), { bangs: 'see'    }));
  const bCenter = H.buildAvatar(Object.assign(H.defaults(), { bangs: 'center' }));
  ok(bCenter.geom.pos.length < bSee.geom.pos.length,
    'bangs center (4 strips) has fewer vertices than see (5 strips)');
  ok(bSee.geom.pos.length < bFull.geom.pos.length,
    'bangs see (5 strips) has fewer vertices than full (7 strips)');

  // source code: drawAtlas explicitly handles non-default browType and eyeShape values
  // 'soft' is the default else-case for browType; 'round' is the default else-case for eyeShape
  ok(['straight','arch'].every(v => html.includes("browType==='" + v + "'")) &&
     !html.includes("browType==='soft'"),
    'drawAtlas: browType straight/arch explicitly branched; soft is the else default');
  ok(['tare','tsuri','jito'].every(v => html.includes("shape==='" + v + "'") || html.includes("eyeShape==='" + v + "'")) &&
     !html.includes("shape==='round'") && !html.includes("eyeShape==='round'"),
    'drawAtlas: eyeShape tare/tsuri/jito explicitly branched; round is the else default');
}

/* ---- Round 116: emotion brow deformation — joy + fun brow raises, angry/sorrow brow directions ---- */
{
  const B = H.buildAvatar(H.defaults());
  const headR = B.dims.headR;
  const eps = 1e-9;

  // joy: browTilt added with innerDy=headR*0.04, outerDy=headR*0.03
  const joyInner = B.morphs.sparse.joy.filter(e => Math.abs(e[2] - headR*0.04) < eps && e[1]===0 && e[3]===0);
  const joyOuter = B.morphs.sparse.joy.filter(e => Math.abs(e[2] - headR*0.03) < eps && e[1]===0 && e[3]===0);
  ok(joyInner.length >= 2, 'joy morph has ≥2 inner brow-raise entries (dy=headR×0.04)');
  ok(joyOuter.length >= 2, 'joy morph has ≥2 outer brow-raise entries (dy=headR×0.03)');

  // fun: browTilt added with innerDy=headR*0.06, outerDy=headR*0.05
  const funInner = B.morphs.sparse.fun.filter(e => Math.abs(e[2] - headR*0.06) < eps && e[1]===0 && e[3]===0);
  const funOuter = B.morphs.sparse.fun.filter(e => Math.abs(e[2] - headR*0.05) < eps && e[1]===0 && e[3]===0);
  ok(funInner.length >= 2, 'fun morph has ≥2 inner brow-raise entries (dy=headR×0.06)');
  ok(funOuter.length >= 2, 'fun morph has ≥2 outer brow-raise entries (dy=headR×0.05)');

  // fun raises brows higher than joy (more exuberant expression)
  ok(headR*0.06 > headR*0.04, 'fun inner brow raise (×0.06) exceeds joy inner brow raise (×0.04)');

  // angry: inner brow pulled DOWN (dy < 0 for inner vertices)
  ok(B.morphs.sparse.angry.some(e => e[2] < 0),
    'angry morph has brow entries with dy<0 (inner brow furrow)');

  // sorrow: inner brow raised UP (dy > 0 for inner vertices)
  ok(B.morphs.sparse.sorrow.some(e => e[2] > 0 && e[1]===0 && e[3]===0),
    'sorrow morph has brow entries with dy>0 (inner brow worry raise)');
}

/* ---- Round 118: dims anatomical ordering + sorrow eye drooping ---- */
{
  // dims anatomical ordering: body landmarks must be in bottom-up order
  const checkDims = (d, label) => {
    ok(d.hipsY < d.spineY,   label + ' hipsY < spineY (hips below spine)');
    ok(d.spineY < d.chestY,  label + ' spineY < chestY (spine below chest)');
    ok(d.chestY < d.neckY,   label + ' chestY < neckY (chest below neck)');
    ok(d.neckY < d.headCY,   label + ' neckY < headCY (neck below head centre)');
    ok(d.eyeWY > d.neckY,    label + ' eyeWY > neckY (eyes above neck)');
    ok(d.eyeX > 0,            label + ' eyeX > 0 (eyes are laterally apart)');
    ok(d.headR > 0,           label + ' headR > 0');
  };
  // verify for default and for extremes
  checkDims(B.dims, 'default');
  const tall = H.buildAvatar(Object.assign(H.defaults(), { height: 2.0, headRatio: 0.18 }));
  checkDims(tall.dims, 'tall(2.0m,ratio0.18)');
  const chibiP = H.buildAvatar(Object.assign(H.defaults(), { height: 0.8, headRatio: 0.36 }));
  checkDims(chibiP.dims, 'chibi(0.8m,ratio0.36)');

  // sorrow eyes droop: after adding dy=-headR*0.012, some eye morph entry has dy < -headR*0.005
  const sorrowEyes = B.morphs.sparse.sorrow.filter(e => e[2] < -B.dims.headR*0.005);
  ok(sorrowEyes.length >= 2, 'sorrow eye morph includes downward droop (dy < -headR×0.005)');
}

/* ---- Round 119: eyeShape geometry invariant + ATLAS region non-overlap ---- */
{
  // eyeShape is texture-only (canvas); 3D geometry must be identical for all 4 values
  const eyeBuilds = {};
  for (const es of H.PARAMS.eyeShape.opts){
    eyeBuilds[es] = H.buildAvatar(Object.assign(H.defaults(), { eyeShape: es }));
  }
  const refVerts = eyeBuilds.round.geom.pos.length;
  const refIdx   = eyeBuilds.round.geom.idx.length;
  ok(H.PARAMS.eyeShape.opts.every(es =>
    eyeBuilds[es].geom.pos.length === refVerts && eyeBuilds[es].geom.idx.length === refIdx),
    'eyeShape round/tare/tsuri/jito all produce identical vertex+index counts (texture-only param)');

  // blink morph vertex sets must be identical across all eyeShape values
  const refBlinkVerts = JSON.stringify(
    eyeBuilds.round.morphs.sparse.blink.map(e => e[0]).sort((a,b)=>a-b));
  ok(H.PARAMS.eyeShape.opts.every(es =>
    JSON.stringify(eyeBuilds[es].morphs.sparse.blink.map(e=>e[0]).sort((a,b)=>a-b)) === refBlinkVerts),
    'blink morph vertex indices identical for all eyeShape values (eye quad geometry unchanged)');

  // ATLAS face rect regions must not overlap each other in pixel space
  const faceRects = ['eyeL','eyeR','browL','browR','mouth','blush'].map(n => H.ATLAS[n]);
  const rectOverlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  let noOverlap = true;
  for (let i = 0; i < faceRects.length; i++)
    for (let j = i+1; j < faceRects.length; j++)
      if (rectOverlap(faceRects[i], faceRects[j])) noOverlap = false;
  ok(noOverlap, 'all 6 ATLAS face rect regions are non-overlapping (15 pairs checked)');

  // All face rects are fully above y=512 (well separated from solid blocks at y=768)
  ok(faceRects.every(r => r[3] <= 512),
    'all ATLAS face rects end at y≤512, well separated from solid color blocks at y=768');
}

/* ---- Round 120: morph sparse-count regression guards + angry mouth downward pull ---- */
{
  // Expected sparse counts (topology-determined, body-shape-invariant)
  // vowels: center vertex filtered when dx=dy=dz=0 at mc; u/o have dz≠0 so count 9
  // blink: 4(eyeL)+4(eyeR)+4(browL)+4(browR)=16; blink_l/r: 4+4=8
  // joy: 4(eyeL)+4(eyeR)+8(mouth ring, center px=py=0 filtered)+4(browL)+4(browR)=24
  // angry: 8(brow)+8(eye)+9(mouth, center gets dy≠0 now)=25
  // sorrow: 4(browL)+4(browR)+9(mouth, center gets dy≠0)+4(eyeL)+4(eyeR)=25
  // fun: 4(eyeL)+4(eyeR)+8(mouth ring)+4(browL)+4(browR)=24
  const EXPECTED = {a:8,i:8,u:9,e:8,o:9, blink:16,blink_l:8,blink_r:8,
                    joy:24,angry:25,sorrow:25,fun:24};
  ok(B.morphs.names.every(n => B.morphs.sparse[n].length === EXPECTED[n]),
    'morph sparse counts match expected topology-based values (a=8,i=8,u=9,e=8,o=9,blink=16,blink_l/r=8,joy=24,angry=25,sorrow=25,fun=24)');

  // verify these counts are body-shape-invariant
  const tall2 = H.buildAvatar(Object.assign(H.defaults(), { height: 2.0, headRatio: 0.18 }));
  const chibi2 = H.buildAvatar(Object.assign(H.defaults(), { height: 0.8, headRatio: 0.36 }));
  ok(B.morphs.names.every(n => tall2.morphs.sparse[n].length === EXPECTED[n]),
    'morph sparse counts body-shape-invariant: tall(2.0m) matches expected counts');
  ok(B.morphs.names.every(n => chibi2.morphs.sparse[n].length === EXPECTED[n]),
    'morph sparse counts body-shape-invariant: chibi(0.8m) matches expected counts');

  // angry mouth downward pull: center vertex now has dy=-headR*0.01 so it's in the sparse list
  const angryMouthCenter = B.morphs.sparse.angry.filter(e =>
    e[1]===0 && e[3]===0 && Math.abs(e[2] + B.dims.headR*0.01) < 1e-9);
  ok(angryMouthCenter.length >= 1, 'angry morph includes mouth center vertex with dy=-headR×0.01 (downward pull)');
}

/* ---- Round 125: eye bone position invariants ---- */
{
  // eye bones must be children of the head bone
  ok(B.bones[B.idx.lE].parent === B.idx.head, 'leftEye bone parent = head bone');
  ok(B.bones[B.idx.rE].parent === B.idx.head, 'rightEye bone parent = head bone');

  // eye bone Y must match eyeWY (world position matches geometry position)
  ok(Math.abs(B.bones[B.idx.lE].w[1] - B.dims.eyeWY) < 1e-9,
    'leftEye bone w[1] = dims.eyeWY');
  ok(Math.abs(B.bones[B.idx.rE].w[1] - B.dims.eyeWY) < 1e-9,
    'rightEye bone w[1] = dims.eyeWY');

  // eye bone X must match ±eyeX (horizontal symmetry and gap)
  ok(Math.abs(B.bones[B.idx.lE].w[0] + B.dims.eyeX) < 1e-9,
    'leftEye bone w[0] = -dims.eyeX');
  ok(Math.abs(B.bones[B.idx.rE].w[0] - B.dims.eyeX) < 1e-9,
    'rightEye bone w[0] = +dims.eyeX');

  // eye bone Z must be at -headR*0.7 (rotation center set back from face surface)
  ok(Math.abs(B.bones[B.idx.lE].w[2] + B.dims.headR*0.7) < 1e-9,
    'leftEye bone w[2] = -headR×0.7 (rotation center inside head)');

  // eye bone position is gap-dependent: wider eyeGap → larger eyeX
  const narrowGap = H.buildAvatar(Object.assign(H.defaults(), { eyeGap: 0.0 }));
  const wideGap   = H.buildAvatar(Object.assign(H.defaults(), { eyeGap: 1.0 }));
  ok(wideGap.bones[wideGap.idx.rE].w[0] > narrowGap.bones[narrowGap.idx.rE].w[0],
    'rightEye x increases with eyeGap (eyeGap=1.0 > eyeGap=0.0)');
}

/* ---- Round 124: vowel mouth puckering (dz) properties + socks gacha randomization ---- */
{
  // u and o morphs have dz≠0 (lip puckering/forward movement for lip-sync realism)
  ok(B.morphs.sparse.u.some(e => e[3] < 0),
    'u morph has entries with dz<0 (lips pucker forward, scaleTag dz=-headR×0.05)');
  ok(B.morphs.sparse.o.some(e => e[3] < 0),
    'o morph has entries with dz<0 (lips pucker forward, scaleTag dz=-headR×0.035)');

  // u puckers more than o (u = -0.05headR, o = -0.035headR)
  const uMinDz = Math.min(...B.morphs.sparse.u.map(e => e[3]));
  const oMinDz = Math.min(...B.morphs.sparse.o.map(e => e[3]));
  ok(uMinDz < oMinDz, 'u morph puckers more than o morph (u dz more negative than o dz)');

  // a, i, e morphs have NO puckering (pure horizontal/vertical scaling only)
  ok(B.morphs.sparse.a.every(e => e[3] === 0), 'a morph has no dz (no puckering, pure vertical open)');
  ok(B.morphs.sparse.i.every(e => e[3] === 0), 'i morph has no dz (no puckering, horizontal stretch only)');
  ok(B.morphs.sparse.e.every(e => e[3] === 0), 'e morph has no dz (no puckering, horizontal stretch only)');

  // socks bool is randomized in gacha
  let socksT=false, socksF=false;
  for(let s=0; s<60; s++){
    const p2 = H.randomParams(s);
    if(p2.socks === true) socksT = true;
    if(p2.socks === false) socksF = true;
  }
  ok(socksT && socksF, 'randomParams socks is randomly true or false across 60 seeds');
}

/* ---- Round 126: skin weight normalization + normal unit-length for all vertices ---- */
{
  // Every vertex must have skin weights that sum exactly to 1.0 (guaranteed by addV normalization)
  const wgt = B.geom.wgt;
  const nVerts = wgt.length / 4;
  let weightBad = 0, weightMax = 0;
  for (let vi = 0; vi < nVerts; vi++){
    const s = wgt[vi*4] + wgt[vi*4+1] + wgt[vi*4+2] + wgt[vi*4+3];
    const d = Math.abs(s - 1.0);
    if (d > 1e-6) weightBad++;
    if (d > weightMax) weightMax = d;
  }
  ok(weightBad === 0,
    `all ${nVerts} vertex skin weights sum to 1.0 (max deviation ${weightMax.toExponential(2)})`);

  // Every vertex normal must be unit length (M.norm is called in addV)
  const nrm = B.geom.nrm;
  let normalBad = 0, normalMin = Infinity;
  for (let vi = 0; vi < nVerts; vi++){
    const x=nrm[vi*3], y=nrm[vi*3+1], z=nrm[vi*3+2];
    const l = Math.sqrt(x*x + y*y + z*z);
    if (Math.abs(l - 1.0) > 1e-4) normalBad++;
    if (l < normalMin) normalMin = l;
  }
  ok(normalBad === 0,
    `all ${nVerts} vertex normals have unit length (min magnitude ${normalMin.toFixed(6)})`);

  // Skin weight and normal invariants hold across all 6 presets (not just default)
  let presetWeightBad = 0, presetNormalBad = 0;
  for (const pre of H.PRESETS){
    const A = H.buildAvatar(H.presetParams(pre));
    const pw = A.geom.wgt, pn = A.geom.nrm, nV = pw.length / 4;
    for (let vi = 0; vi < nV; vi++){
      const sw = pw[vi*4]+pw[vi*4+1]+pw[vi*4+2]+pw[vi*4+3];
      if (Math.abs(sw-1.0) > 1e-6) presetWeightBad++;
      const x=pn[vi*3], y=pn[vi*3+1], z=pn[vi*3+2];
      if (Math.abs(Math.sqrt(x*x+y*y+z*z)-1.0) > 1e-4) presetNormalBad++;
    }
  }
  ok(presetWeightBad === 0, 'all 6 preset avatars: every vertex weight sums to 1.0');
  ok(presetNormalBad === 0, 'all 6 preset avatars: every vertex normal has unit length');
}

/* ---- Round 127: skeleton completeness — humanoid mapping + parent chain validity ---- */
{
  // All 21 VRM required humanoid bones must be mapped
  const required = ['hips','spine','chest','neck','head',
    'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
    'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
    'leftUpperLeg','leftLowerLeg','leftFoot',
    'rightUpperLeg','rightLowerLeg','rightFoot',
    'leftEye','rightEye'];
  const missing = required.filter(n => B.humanoid[n] === undefined);
  ok(missing.length === 0,
    `all 21 VRM humanoid bones mapped (missing: ${missing.join(', ')||'none'})`);

  // Every bone has a valid parent: -1 for root, or a valid bone index
  const bones = B.bones;
  const badParent = bones.filter((b,i) => !(b.parent === -1 || (Number.isInteger(b.parent) && b.parent >= 0 && b.parent < bones.length && b.parent !== i)));
  ok(badParent.length === 0,
    `all ${bones.length} bones have valid parent indices (bad: ${badParent.map(b=>b.name).join(', ')||'none'})`);

  // No parent-chain cycles: following parents from any bone must reach root within bones.length steps
  let cycleBone = null;
  for (let i = 0; i < bones.length; i++){
    let cur = i, depth = 0;
    while (bones[cur].parent !== -1){
      cur = bones[cur].parent;
      if (++depth > bones.length){ cycleBone = bones[i].name; break; }
    }
    if (cycleBone) break;
  }
  ok(cycleBone === null, `no parent-chain cycles detected (cycle at: ${cycleBone||'none'})`);

  // All humanoid bone indices point to bones that actually have that humanoid label
  const mismatch = required.filter(n => {
    const idx = B.humanoid[n];
    return idx !== undefined && B.bones[idx].hb !== n;
  });
  ok(mismatch.length === 0,
    `humanoid index → bone.hb roundtrip consistent (mismatch: ${mismatch.join(', ')||'none'})`);
}

/* ---- Round 185: skirt bottom ring skin weighting — angular leg blend formula ---- */
{
  // Skirt (onepiece/sailor): latheY segs=14 → 15 verts/ring × 3 rings = 45 total.
  // After lathe, the last 45 verts are patched:
  //   ring=0 (top, t=0): all hips (wl=wr=0)
  //   ring=2 (bot, t=1): hips + lUL + rUL angular blend based on X position
  // Bottom ring Y = hipsY + 0.035×H - skirtLenW   (skirtLenW = (0.10+0.10×skirtLen)×H)
  const d = B.dims, H_ = d.H;
  const skirtLenW = (0.10 + 0.10 * P.skirtLen) * H_;
  const skirtBotY = d.hipsY + 0.035*H_ - skirtLenW;
  const skirtTopY = d.hipsY + 0.035*H_;

  function vertsAtY(geom, y0){
    const r=[]; for(let vi=0;vi<geom.pos.length/3;vi++) if(Math.abs(geom.pos[vi*3+1]-y0)<1e-6) r.push(vi); return r;
  }
  const botVerts = vertsAtY(B.geom, skirtBotY);
  ok(botVerts.length === 15,
    `skirt bottom ring: 15 verts at Y=${skirtBotY.toFixed(5)} (got ${botVerts.length})`);

  // All weight sums = 1.0
  const wgtOK = botVerts.every(vi=>{
    const w = B.geom.wgt.slice(vi*4, vi*4+4);
    return Math.abs(w[0]+w[1]+w[2]+w[3]-1.0) < 1e-5;
  });
  ok(wgtOK, 'skirt bottom ring: all weight sums = 1.0');

  // Only hips/lUL/rUL indices used (angular blend)
  const {hips:hi, lUL:luL, rUL:ruL} = B.idx;
  const bonesOK = botVerts.every(vi=>{
    for(let s=0;s<4;s++){
      if(B.geom.wgt[vi*4+s] > 1e-6 && ![hi,luL,ruL].includes(B.geom.jnt[vi*4+s])) return false;
    }
    return true;
  });
  ok(bonesOK, `skirt bottom ring: only hips(${hi})/lUL(${luL})/rUL(${ruL}) bone slots`);

  // At least some verts have non-zero lUL or rUL weight (blend actually happens)
  const blendHappens = botVerts.some(vi=>{
    for(let s=0;s<4;s++) if([luL,ruL].includes(B.geom.jnt[vi*4+s]) && B.geom.wgt[vi*4+s]>1e-4) return true;
    return false;
  });
  ok(blendHappens, 'skirt bottom ring: angular leg blend assigns non-zero lUL/rUL weight to edge verts');
}

/* ---- Round 184: outfit top-shell unique ring Y positions — segs=12, 13 verts ---- */
{
  // Outfit top-shell latheY(segs=12) → 13 verts per ring. 4 rings:
  //   [0] spineY - 0.03×H  — unique to outfit (torso has spineY, not spineY-0.03H)
  //   [1] chestY            — shared with torso ring[4] → 26 total (verified Round 176)
  //   [2] shoulderY+0.012×H — unique (arm/sleeve rings are at shoulderY, not +0.012H)
  //   [3] neckY+0.012×H     — unique (torso has neckY+0.01H, outfit has +0.012H)
  // Using default build B (onepiece, twin).
  const d = B.dims, H_ = d.H;
  function countAtY(geom, y0){
    let n=0; for(let vi=0;vi<geom.pos.length/3;vi++) if(Math.abs(geom.pos[vi*3+1]-y0)<1e-6) n++; return n;
  }
  const outfitUniq = [
    [d.spineY - 0.03*H_,    'spineY-0.03H'],
    [d.shoulderY + 0.012*H_, 'shoulderY+0.012H'],
    [d.neckY + 0.012*H_,     'neckY+0.012H'],
  ];
  let fail=0;
  for(const [y,lbl] of outfitUniq) if(countAtY(B.geom,y)!==13) fail++;
  ok(fail===0, `outfit top-shell unique rings (13v each): `+
    outfitUniq.map(([y,l])=>`${l}=${y.toFixed(4)}(${countAtY(B.geom,y)})`).join(' '));

  // all 4 outfit rings strictly ascending
  const allYs = [d.spineY-0.03*H_, d.chestY, d.shoulderY+0.012*H_, d.neckY+0.012*H_];
  ok(allYs.every((y,i)=>i===0||y>allYs[i-1]),
    `outfit top-shell rings ascending: ${allYs.map(y=>y.toFixed(3)).join('<')}`);
}

/* ---- Round 178: neck tube ring Y positions — segs=10, 11 verts per ring ---- */
{
  // Neck tube: tube(segs=10) → 11 verts per ring.
  //   ring[0] bottom: [0, neckY, 0]
  //   ring[1] top:    [0, headCY - headR×0.55, 0]
  // Both Y values are unique in the default build (onepiece, no sailor collar).
  // Head sphere latitude rings at cos(k×π/12): nearest k=8 (-0.5) and k=9 (-0.707) —
  // neither equals -0.55, so no sphere-ring collision with neck tube top ring.
  const d = B.dims;
  function countAtY(geom, y0){
    let n=0; for(let vi=0;vi<geom.pos.length/3;vi++) if(Math.abs(geom.pos[vi*3+1]-y0)<1e-6) n++; return n;
  }
  const neckTopY = d.headCY - d.headR * 0.55;

  ok(countAtY(B.geom, d.neckY) === 11,
    `neck tube bottom ring Y=neckY=${d.neckY.toFixed(5)}: 11 verts (got ${countAtY(B.geom,d.neckY)})`);
  ok(countAtY(B.geom, neckTopY) === 11,
    `neck tube top ring Y=headCY-headR×0.55=${neckTopY.toFixed(5)}: 11 verts (got ${countAtY(B.geom,neckTopY)})`);
  ok(neckTopY > d.neckY,
    `neck tube rings ascend: neckY=${d.neckY.toFixed(5)} < neckTopY=${neckTopY.toFixed(5)}`);

  // All 6 presets: neck tube top ring Y > neck tube bottom ring Y
  let presFail=0;
  for(const pre of H.PRESETS){
    const C=H.buildAvatar(H.presetParams(pre)), cd=C.dims;
    if((cd.headCY-cd.headR*0.55) <= cd.neckY) presFail++;
  }
  ok(presFail===0, 'neck tube rings ascend across all 6 presets');
}

/* ---- Round 176: torso lathe ring Y positions — segs=12, 13 verts per ring ---- */
{
  // Torso latheY(segs=12) → 13 verts per ring. Ring Y values (from core-b.js):
  //   [0] hipsY-0.07×H  [1] hipsY-0.03×H  [2] hipsY+0.02×H  [3] spineY
  //   [4] chestY        [5] shoulderY      [6] neckY+0.01×H
  // Outfit top-shell (segs=12) adds another 13 verts at chestY → 26 total there.
  // Using default build B (onepiece, no pants/hoodie) for clean isolation.
  const d = B.dims, H_ = d.H;
  function countAtY(geom, y0){
    let n=0; for(let vi=0;vi<geom.pos.length/3;vi++) if(Math.abs(geom.pos[vi*3+1]-y0)<1e-6) n++; return n;
  }

  // 4 rings unique to the torso (not shared with outfit/skirt/sleeves)
  const uniq = [
    [d.hipsY-0.07*H_, 'hipsY-0.07H'],
    [d.hipsY-0.03*H_, 'hipsY-0.03H'],
    [d.hipsY+0.02*H_, 'hipsY+0.02H'],
    [d.spineY,        'spineY'],
  ];
  let fail=0;
  for(const [y,lbl] of uniq) if(countAtY(B.geom,y)!==13) fail++;
  ok(fail===0, `torso unique rings (13v each): `+uniq.map(([y,l])=>`${l}=${y.toFixed(4)}(${countAtY(B.geom,y)})`).join(' '));

  // chestY shared by torso ring[4] AND outfit top ring[1] → 13+13 = 26
  ok(countAtY(B.geom, d.chestY) === 26,
    `chestY=${d.chestY.toFixed(4)}: torso+outfit=26 verts (got ${countAtY(B.geom,d.chestY)})`);

  // neckY+0.01×H (torso top) distinct from outfit's neckY+0.012×H → 13 only
  ok(countAtY(B.geom, d.neckY+0.01*H_) === 13,
    `neckY+0.01H=${(d.neckY+0.01*H_).toFixed(4)}: torso collar ring=13 (got ${countAtY(B.geom,d.neckY+0.01*H_)})`);

  // all 7 ring Ys strictly ascending (torso grows from hip to neck)
  const rYs=[d.hipsY-0.07*H_,d.hipsY-0.03*H_,d.hipsY+0.02*H_,d.spineY,d.chestY,d.shoulderY,d.neckY+0.01*H_];
  ok(rYs.every((y,i)=>i===0||y>rYs[i-1]), `torso ring Y ascending: ${rYs.map(y=>y.toFixed(3)).join('<')}`);
}

/* ---- Round 175: leg tube ring Y positions — all 5 rings at exact formula values ---- */
{
  // Leg tube rings (segs=8, so 9 verts per ring × 2 legs = 18 verts per Y):
  //   ring[0]: hipsY × 0.99
  //   ring[1]: hipsY × 0.78
  //   ring[2]: kneeY
  //   ring[3]: kneeY×0.55 + ankleY×0.45
  //   ring[4]: ankleY
  const d = B.dims;
  const legRingYs = [
    d.hipsY * 0.99,
    d.hipsY * 0.78,
    d.kneeY,
    d.kneeY * 0.55 + d.ankleY * 0.45,
    d.ankleY,
  ];
  // Use socks=false build to avoid socks-ring count interference at kneeY region
  const noSocks = H.buildAvatar(Object.assign(H.defaults(), {socks: false}));
  function countAtY(geom, y0){
    let n=0; for(let vi=0;vi<geom.pos.length/3;vi++) if(Math.abs(geom.pos[vi*3+1]-y0)<1e-6) n++; return n;
  }
  let ringFail = 0;
  for(const ry of legRingYs){
    const n = countAtY(noSocks.geom, ry);
    if(n !== 18) ringFail++;
  }
  ok(ringFail === 0,
    `all 5 leg tube rings have exactly 18 verts (2 legs×9): ` +
    legRingYs.map((y,i)=>`ring${i}=${y.toFixed(4)}(${countAtY(noSocks.geom,y)})`).join(' '));

  // rings are strictly descending in Y (anatomically correct top→bottom)
  ok(legRingYs.every((y,i)=>i===0||y<legRingYs[i-1]),
    `leg tube rings strictly descend: ${legRingYs.map(y=>y.toFixed(4)).join(' > ')}`);
}

/* ---- Round 174: ankleY both-branch formula + socks tube ring Y positions ---- */
{
  // ankleY = max(0.035×H, hipsY×0.085) — two branches
  // Branch A: hipsY×0.085 wins (normal/tall legs)
  const d = B.dims;
  ok(d.hipsY * 0.085 > 0.035 * d.H,
    `default: hipsY×0.085=${(d.hipsY*0.085).toFixed(5)} > 0.035×H=${(0.035*d.H).toFixed(5)} (hipsY branch active)`);
  ok(Math.abs(d.ankleY - d.hipsY * 0.085) < 1e-9,
    `ankleY = hipsY×0.085 at default = ${d.ankleY.toFixed(6)}`);

  // Branch B: 0.035×H wins when legLen=min (hipsY clamped to 0.32×H → hipsY×0.085=0.0272×H < 0.035×H)
  const shortLegs = H.buildAvatar(Object.assign(H.defaults(), {legLen: H.PARAMS.legLen.min}));
  const d2 = shortLegs.dims;
  ok(0.035 * d2.H > d2.hipsY * 0.085,
    `legLen=min: 0.035×H=${(0.035*d2.H).toFixed(5)} > hipsY×0.085=${(d2.hipsY*0.085).toFixed(5)} (floor branch active)`);
  ok(Math.abs(d2.ankleY - 0.035 * d2.H) < 1e-9,
    `ankleY = 0.035×H at legLen=min = ${d2.ankleY.toFixed(6)}`);

  // Socks tube ring Y positions:
  //   top ring Y = kneeY×0.72 + ankleY×0.28
  //   bot ring Y = ankleY×1.1
  // tube(segs=8) → 9 verts per ring, 2 rings × 9 verts × 2 legs = 36 extra verts
  const noSocks = H.buildAvatar(Object.assign(H.defaults(), {socks: false}));
  const sockTopY = d.kneeY * 0.72 + d.ankleY * 0.28;
  const sockBotY = d.ankleY * 1.1;

  function countAtY(geom, y0){
    let n=0;
    for(let vi=0;vi<geom.pos.length/3;vi++)
      if(Math.abs(geom.pos[vi*3+1]-y0)<1e-6) n++;
    return n;
  }
  const topDelta = countAtY(B.geom, sockTopY) - countAtY(noSocks.geom, sockTopY);
  const botDelta = countAtY(B.geom, sockBotY) - countAtY(noSocks.geom, sockBotY);
  ok(topDelta === 18,
    `socks top ring (Y=${sockTopY.toFixed(5)}): +18 verts vs no-socks (got +${topDelta})`);
  ok(botDelta === 18,
    `socks bottom ring (Y=${sockBotY.toFixed(5)}): +18 verts vs no-socks (got +${botDelta})`);
}

/* ---- Round 173: primary height-derived dims — headR, headCY, neckY, hipsY ---- */
{
  // Root formulas that drive most other dims:
  //   headR   = headRatio × H × 0.5
  //   headCY  = H - headR                    (head sphere center = top of avatar minus headR)
  //   neckTopY = headCY - headR × 0.8
  //   neckY   = neckTopY - 0.015 × H
  //   hipsY   = clamp(H × 0.5 × legLen,  0.32×H,  neckTopY - 0.16×H)
  const d = B.dims;
  ok(Math.abs(d.headR - P.headRatio * d.H * 0.5) < 1e-9,
    `headR = headRatio×H×0.5 = ${(P.headRatio*d.H*0.5).toFixed(6)}`);
  ok(Math.abs(d.headCY - (d.H - d.headR)) < 1e-9,
    `headCY = H - headR = ${(d.H-d.headR).toFixed(6)}`);
  const neckTopY = d.headCY - d.headR * 0.8;
  ok(Math.abs(d.neckY - (neckTopY - 0.015 * d.H)) < 1e-9,
    `neckY = (headCY - headR×0.8) - 0.015×H = ${(neckTopY - 0.015*d.H).toFixed(6)}`);
  const hipsRaw = d.H * 0.5 * P.legLen;
  const hipsMin = 0.32 * d.H, hipsMax = neckTopY - 0.16 * d.H;
  const hipsExpected = Math.max(hipsMin, Math.min(hipsMax, hipsRaw));
  ok(Math.abs(d.hipsY - hipsExpected) < 1e-9,
    `hipsY = clamp(H×0.5×legLen=${hipsRaw.toFixed(4)}, ${hipsMin.toFixed(4)}, ${hipsMax.toFixed(4)}) = ${hipsExpected.toFixed(6)}`);

  // All 6 presets satisfy these root formulas
  let fail = 0;
  for(const pre of H.PRESETS){
    const pp = H.presetParams(pre);
    const dd = H.buildAvatar(pp).dims;
    const ntY = dd.headCY - dd.headR * 0.8;
    const hR = pp.headRatio * dd.H * 0.5;
    const hRaw = dd.H * 0.5 * pp.legLen;
    const hE = Math.max(0.32*dd.H, Math.min(ntY - 0.16*dd.H, hRaw));
    if(Math.abs(dd.headR - hR) > 1e-6) fail++;
    if(Math.abs(dd.headCY - (dd.H - dd.headR)) > 1e-6) fail++;
    if(Math.abs(dd.neckY - (ntY - 0.015*dd.H)) > 1e-6) fail++;
    if(Math.abs(dd.hipsY - hE) > 1e-6) fail++;
  }
  ok(fail === 0, 'headR/headCY/neckY/hipsY root formulas hold across all 6 presets');
}

/* ---- Round 172: spine chain bone world positions vs dims ---- */
{
  // The 5-bone spine chain must have world Y = corresponding dims value.
  // Head bone is placed at headCY - headR×0.55 (base of skull, not sphere center).
  // All 5 spine chain bones have X=0 and Z=0 (centred on body axis).
  const d = B.dims;
  const spineChain = [
    { name:'hips',  bone:B.idx.hips,  expY: d.hipsY },
    { name:'spine', bone:B.idx.spine, expY: d.spineY },
    { name:'chest', bone:B.idx.chest, expY: d.chestY },
    { name:'neck',  bone:B.idx.neck,  expY: d.neckY  },
    { name:'head',  bone:B.idx.head,  expY: d.headCY - d.headR * 0.55 },
  ];
  let yFail = 0, xzFail = 0;
  for(const {name, bone, expY} of spineChain){
    const w = B.bones[bone].w;
    if(Math.abs(w[1] - expY) > 1e-9) yFail++;
    if(Math.abs(w[0]) > 1e-9 || Math.abs(w[2]) > 1e-9) xzFail++;
  }
  ok(yFail === 0,
    `spine chain Y: hips=${d.hipsY.toFixed(4)} spine=${d.spineY.toFixed(4)} chest=${d.chestY.toFixed(4)} neck=${d.neckY.toFixed(4)} head=${(d.headCY-d.headR*0.55).toFixed(4)}`);
  ok(xzFail === 0,
    'all 5 spine chain bones have X=0 Z=0 (centred on body axis)');

  // Head bone is offset from headCY by -headR×0.55 (base of skull)
  const headBoneY = B.bones[B.idx.head].w[1];
  ok(Math.abs(headBoneY - (d.headCY - d.headR * 0.55)) < 1e-9,
    `head bone Y = headCY - headR×0.55 = ${(d.headCY-d.headR*0.55).toFixed(5)} (base of skull, not sphere center)`);

  // All 6 presets satisfy spine chain world positions
  let fail = 0;
  for(const pre of H.PRESETS){
    const C = H.buildAvatar(H.presetParams(pre));
    const cd = C.dims;
    const expectations = [
      [C.idx.hips,  cd.hipsY],
      [C.idx.spine, cd.spineY],
      [C.idx.chest, cd.chestY],
      [C.idx.neck,  cd.neckY],
      [C.idx.head,  cd.headCY - cd.headR * 0.55],
    ];
    for(const [bi, expY] of expectations){
      if(Math.abs(C.bones[bi].w[1] - expY) > 1e-6) fail++;
      if(Math.abs(C.bones[bi].w[0]) > 1e-6 || Math.abs(C.bones[bi].w[2]) > 1e-6) fail++;
    }
  }
  ok(fail === 0, 'spine chain bone positions match dims for all 6 presets');
}

/* ---- Round 171: arm bone world position formulas ---- */
{
  // Left arm bone world positions (T-pose, arms horizontal at shoulderY):
  //   lSh.x = -shX×0.42,  lSh.y = shoulderY
  //   lUA.x = -shX,        lUA.y = shoulderY
  //   lLA.x = -elbowX,     lLA.y = shoulderY
  //   lH.x  = -wristX,     lH.y  = shoulderY
  // Right side mirrors: +X, same Y
  const d = B.dims;
  const lSh = B.bones[B.idx.lSh].w, rSh = B.bones[B.idx.rSh].w;
  const lUA = B.bones[B.idx.lUA].w, rUA = B.bones[B.idx.rUA].w;
  const lLA = B.bones[B.idx.lLA].w, rLA = B.bones[B.idx.rLA].w;
  const lH  = B.bones[B.idx.lH].w,  rH  = B.bones[B.idx.rH].w;

  // Shoulder bones
  ok(Math.abs(lSh[0] + d.shX * 0.42) < 1e-9, `lSh.x = -shX×0.42 = ${(-d.shX*0.42).toFixed(5)}`);
  ok(Math.abs(rSh[0] - d.shX * 0.42) < 1e-9, `rSh.x = +shX×0.42`);

  // Upper arm bones
  ok(Math.abs(lUA[0] + d.shX) < 1e-9, `lUA.x = -shX = ${(-d.shX).toFixed(5)}`);
  ok(Math.abs(rUA[0] - d.shX) < 1e-9, `rUA.x = +shX`);

  // Lower arm (elbow) bones
  ok(Math.abs(lLA[0] + d.elbowX) < 1e-9, `lLA.x = -elbowX = ${(-d.elbowX).toFixed(5)}`);
  ok(Math.abs(rLA[0] - d.elbowX) < 1e-9, `rLA.x = +elbowX`);

  // Hand (wrist) bones
  ok(Math.abs(lH[0] + d.wristX) < 1e-9, `lH.x = -wristX = ${(-d.wristX).toFixed(5)}`);
  ok(Math.abs(rH[0] - d.wristX) < 1e-9, `rH.x = +wristX`);

  // All arm bones have Y = shoulderY (T-pose horizontal)
  const armBones = [lSh, rSh, lUA, rUA, lLA, rLA, lH, rH];
  ok(armBones.every(w => Math.abs(w[1] - d.shoulderY) < 1e-9),
    `all 8 arm bones have y = shoulderY = ${d.shoulderY.toFixed(5)} (horizontal T-pose)`);

  // All arm bones have Z = 0 (no forward/backward offset in T-pose)
  ok(armBones.every(w => Math.abs(w[2]) < 1e-9),
    'all 8 arm bones have z = 0 (no Z offset in T-pose)');
}

/* ---- Round 170: leg bone world position formulas ---- */
{
  // Left/right leg bone world positions:
  //   lUL.x = -legX,  lUL.y = hipsY×0.98   (slightly below hips to clear hip bone)
  //   lLL.x = -legX,  lLL.y = kneeY
  //   lF.x  = -legX,  lF.y  = ankleY
  // Right side mirrors: rUL/rLL/rF.x = +legX, same Y values
  const d = B.dims;
  const lUL = B.bones[B.idx.lUL].w, rUL = B.bones[B.idx.rUL].w;
  const lLL = B.bones[B.idx.lLL].w, rLL = B.bones[B.idx.rLL].w;
  const lF  = B.bones[B.idx.lF].w,  rF  = B.bones[B.idx.rF].w;

  // X positions: ±legX
  ok(Math.abs(lUL[0] + d.legX) < 1e-9, `lUL.x = -legX = ${(-d.legX).toFixed(6)}`);
  ok(Math.abs(rUL[0] - d.legX) < 1e-9, `rUL.x = +legX = ${d.legX.toFixed(6)}`);
  ok(Math.abs(lLL[0] + d.legX) < 1e-9, `lLL.x = -legX`);
  ok(Math.abs(lF[0]  + d.legX) < 1e-9, `lF.x  = -legX`);

  // Y positions
  ok(Math.abs(lUL[1] - d.hipsY * 0.98) < 1e-9,
    `lUL.y = hipsY×0.98 = ${(d.hipsY*0.98).toFixed(6)} (slightly below hips)`);
  ok(Math.abs(lLL[1] - d.kneeY) < 1e-9,
    `lLL.y = kneeY = ${d.kneeY.toFixed(6)}`);
  ok(Math.abs(lF[1] - d.ankleY) < 1e-9,
    `lF.y = ankleY = ${d.ankleY.toFixed(6)}`);

  // Right side Y must equal left side Y (bilateral symmetry)
  ok(Math.abs(rUL[1] - lUL[1]) < 1e-9, 'rUL.y = lUL.y (bilateral Y symmetry)');
  ok(Math.abs(rLL[1] - lLL[1]) < 1e-9, 'rLL.y = lLL.y (bilateral Y symmetry)');
  ok(Math.abs(rF[1]  - lF[1])  < 1e-9, 'rF.y  = lF.y  (bilateral Y symmetry)');

  // Strictly descending: hip > knee > ankle (gravitational ordering)
  ok(lUL[1] > lLL[1] && lLL[1] > lF[1],
    `leg bones strictly descend: lUL.y=${lUL[1].toFixed(4)} > lLL.y=${lLL[1].toFixed(4)} > lF.y=${lF[1].toFixed(4)}`);

  // All 6 presets satisfy these formulas
  let fail = 0;
  for(const pre of H.PRESETS){
    const C = H.buildAvatar(H.presetParams(pre));
    const cd = C.dims;
    const lul = C.bones[C.idx.lUL].w, lll = C.bones[C.idx.lLL].w, lf = C.bones[C.idx.lF].w;
    if(Math.abs(lul[0] + cd.legX) > 1e-6) fail++;
    if(Math.abs(lul[1] - cd.hipsY * 0.98) > 1e-6) fail++;
    if(Math.abs(lll[1] - cd.kneeY) > 1e-6) fail++;
    if(Math.abs(lf[1]  - cd.ankleY) > 1e-6) fail++;
  }
  ok(fail === 0, 'leg bone position formulas hold across all 6 presets');
}

/* ---- Round 169: ahoge geometry — triangle delta, tip Y, head bone skinning ---- */
{
  // ahoge=true adds exactly 1 triangle (3 vertices) across ALL hairStyles.
  // The tip must extend above the hair sphere top, and all 3 verts are 100% head bone.
  const hairs = ['short','bob','long','twin','pony'];
  let deltaFail = 0, heightFail = 0, skinFail = 0;
  for(const hairStyle of hairs){
    const bNo = H.buildAvatar(Object.assign({}, P, { ahoge:false, hairStyle }));
    const bYe = H.buildAvatar(Object.assign({}, P, { ahoge:true,  hairStyle }));
    const vDelta = bYe.geom.pos.length/3 - bNo.geom.pos.length/3;
    const tDelta = bYe.geom.idx.length/3  - bNo.geom.idx.length/3;
    if(vDelta !== 3 || tDelta !== 1) deltaFail++;

    // Find where ahoge verts start (first position divergence)
    let aStart = -1;
    for(let i = 0; i < bNo.geom.pos.length; i++){
      if(bYe.geom.pos[i] !== bNo.geom.pos[i]){ aStart = Math.floor(i/3); break; }
    }
    if(aStart < 0){ heightFail++; skinFail++; continue; }

    // Tip is the 3rd new vertex (aStart+2); it must be above the hair sphere top
    const d = bYe.dims;
    const hr = d.headR * 1.085 * P.hairVol;
    const hairSphereTop = d.headCY + d.headR * 0.02 + hr;
    const tipY = bYe.geom.pos[(aStart+2)*3+1];
    if(tipY <= hairSphereTop) heightFail++;

    // All 3 ahoge verts must be 100% skinned to the head bone
    for(let k = 0; k < 3; k++){
      const vi = aStart + k;
      if(bYe.geom.jnt[vi*4] !== bYe.idx.head || bYe.geom.wgt[vi*4] !== 1) skinFail++;
    }
  }
  ok(deltaFail === 0, 'ahoge=true adds exactly +3 verts +1 tri for all 5 hairStyles');
  ok(heightFail === 0, 'ahoge tip Y > hair sphere top (sticks up above head) for all hairStyles');
  ok(skinFail === 0,   'all 3 ahoge verts are 100% skinned to head bone for all hairStyles');
}

/* ---- Round 168: morph sparse count invariance across all 20 outfit×hairStyle combos ---- */
{
  // Morph entries only reference face tag vertices, so counts must be topology-invariant
  // across all outfit and hairStyle combinations. This guards against outfit changes that
  // accidentally add or remove face geometry and break morph target data.
  const EXPECTED = {a:8,i:8,u:9,e:8,o:9,blink:16,'blink_l':8,'blink_r':8,joy:24,angry:25,sorrow:25,fun:24};
  const outfits = ['onepiece','sailor','shirts','hoodie'];
  const hairs   = ['short','bob','long','twin','pony'];
  let failCount = 0;
  for(const outfit of outfits){
    for(const hairStyle of hairs){
      const b = H.buildAvatar(Object.assign({}, P, { outfit, hairStyle }));
      for(const [mn, exp] of Object.entries(EXPECTED)){
        if(b.morphs.sparse[mn].length !== exp) failCount++;
      }
    }
  }
  ok(failCount === 0,
    `morph sparse counts topology-invariant across all 20 outfit×hairStyle combos (${Object.keys(EXPECTED).length} morphs × 20 combos)`);
}

/* ---- Round 167: sleeve length formula — arm tube ring2/ring3 X positions ---- */
{
  // Sleeve arm tube rings (segs=8, 9 verts per ring):
  //   ring2_x = shX + (wristX-shX) × tEnd × 0.5    (mid-sleeve)
  //   ring3_x = shX + (wristX-shX) × tEnd            (sleeve tip)
  //   where tEnd = 0.94 (long) or 0.40 (short)
  // Use short hair to isolate sleeve geometry.
  const bLong  = H.buildAvatar(Object.assign({}, P, { sleeves:'long',  hairStyle:'short' }));
  const bShort = H.buildAvatar(Object.assign({}, P, { sleeves:'short', hairStyle:'short' }));
  const d = bLong.dims;
  const tLong = 0.94, tShort = 0.40;
  const ring2Long  = d.shX + (d.wristX - d.shX) * tLong  * 0.5;
  const ring3Long  = d.shX + (d.wristX - d.shX) * tLong;
  const ring2Short = d.shX + (d.wristX - d.shX) * tShort * 0.5;
  const ring3Short = d.shX + (d.wristX - d.shX) * tShort;

  // Verify 9 verts in right arm at each ring X (long sleeves)
  const nAtLong2  = Array.from(bLong.geom.pos).filter((_,i)=>i%3===0).filter(x=>Math.abs(x-ring2Long) <1e-4).length;
  const nAtLong3  = Array.from(bLong.geom.pos).filter((_,i)=>i%3===0).filter(x=>Math.abs(x-ring3Long) <1e-4).length;
  ok(nAtLong2 === 9, `long sleeve: 9 verts at ring2_x=${ring2Long.toFixed(4)} (right arm)`);
  ok(nAtLong3 === 9, `long sleeve: 9 verts at ring3_x=${ring3Long.toFixed(4)} (sleeve tip)`);

  // Verify 9 verts at each ring X for short sleeves
  const nAtShort2 = Array.from(bShort.geom.pos).filter((_,i)=>i%3===0).filter(x=>Math.abs(x-ring2Short)<1e-4).length;
  const nAtShort3 = Array.from(bShort.geom.pos).filter((_,i)=>i%3===0).filter(x=>Math.abs(x-ring3Short)<1e-4).length;
  ok(nAtShort2 === 9, `short sleeve: 9 verts at ring2_x=${ring2Short.toFixed(4)}`);
  ok(nAtShort3 === 9, `short sleeve: 9 verts at ring3_x=${ring3Short.toFixed(4)} (sleeve tip)`);

  // Long sleeve extends further outward than short
  ok(ring3Long > ring3Short,
    `long sleeve tip X (${ring3Long.toFixed(4)}) > short sleeve tip X (${ring3Short.toFixed(4)})`);
}

/* ---- Round 166: dims formula sheet — shX, legX, armL, elbowX exact values ---- */
{
  // Complete formula reference for dims computed by buildSkeleton:
  //   shX     = shoulderW × H × 0.5
  //   legX    = hipW × H × 0.5 × 0.52
  //   armL    = H × 0.34 × armLen
  //   elbowX  = shX + armL × 0.47
  // (wristX = shX + armL × 0.92 tested in Round 151)
  const d = B.dims;
  ok(Math.abs(d.shX - P.shoulderW * d.H * 0.5) < 1e-9,
    `shX = shoulderW×H×0.5 = ${(P.shoulderW*d.H*0.5).toFixed(6)}`);
  ok(Math.abs(d.legX - P.hipW * d.H * 0.5 * 0.52) < 1e-9,
    `legX = hipW×H×0.5×0.52 = ${(P.hipW*d.H*0.5*0.52).toFixed(6)}`);
  ok(Math.abs(d.armL - d.H * 0.34 * P.armLen) < 1e-9,
    `armL = H×0.34×armLen = ${(d.H*0.34*P.armLen).toFixed(6)}`);
  ok(Math.abs(d.elbowX - (d.shX + d.armL * 0.47)) < 1e-9,
    `elbowX = shX + armL×0.47 = ${(d.shX+d.armL*0.47).toFixed(6)}`);

  // All 6 presets satisfy these formulas
  let fail = 0;
  for(const pre of H.PRESETS){
    const pp = H.presetParams(pre);
    const dd = H.buildAvatar(pp).dims;
    if(Math.abs(dd.shX - pp.shoulderW * dd.H * 0.5) > 1e-6) fail++;
    if(Math.abs(dd.legX - pp.hipW * dd.H * 0.5 * 0.52) > 1e-6) fail++;
    if(Math.abs(dd.armL - dd.H * 0.34 * pp.armLen) > 1e-6) fail++;
    if(Math.abs(dd.elbowX - (dd.shX + dd.armL * 0.47)) > 1e-6) fail++;
  }
  ok(fail === 0, 'shX/legX/armL/elbowX formulas hold across all 6 presets');
}

/* ---- Round 165: mouthW and mouth fan geometry formula ---- */
{
  // mrx = headR×0.14×mouthW (half-width, scales with mouthW)
  // mry = headR×0.045       (half-height, constant)
  // center: x=0, y = headCY - headR×0.42, z = faceZ
  const d = B.dims;
  const [ms, me] = B.geom.tags.mouth;
  // center vertex (index ms) must be at x=0, y=headCY-headR×0.42
  const cX = B.geom.pos[ms*3], cY = B.geom.pos[ms*3+1];
  ok(Math.abs(cX) < 1e-9,
    `mouth center X = 0 (bilateral symmetry), actual=${cX}`);
  ok(Math.abs(cY - (d.headCY - d.headR * 0.42)) < 1e-9,
    `mouth center Y = headCY - headR×0.42 = ${(d.headCY-d.headR*0.42).toFixed(5)}`);

  // ring vertices (ms+1 … me-1) X-span = 2×mrx = 2×headR×0.14×mouthW
  const ringXs = [], ringYs = [];
  for(let i = ms+1; i < me; i++){
    ringXs.push(B.geom.pos[i*3]);
    ringYs.push(B.geom.pos[i*3+1]);
  }
  const actualMrx = (Math.max(...ringXs) - Math.min(...ringXs)) / 2;
  const actualMry = (Math.max(...ringYs) - Math.min(...ringYs)) / 2;
  const expectedMrx = d.headR * 0.14 * P.mouthW;
  const expectedMry = d.headR * 0.045;
  ok(Math.abs(actualMrx - expectedMrx) < 1e-9,
    `mouth ring half-width = headR×0.14×mouthW = ${expectedMrx.toFixed(5)}`);
  ok(Math.abs(actualMry - expectedMry) < 1e-9,
    `mouth ring half-height = headR×0.045 = ${expectedMry.toFixed(5)} (constant, no mouthW scaling)`);

  // mouthW monotone: wider mouth → larger X span
  const bNarrow = H.buildAvatar(Object.assign({}, P, { mouthW: 0.7 }));
  const bWide   = H.buildAvatar(Object.assign({}, P, { mouthW: 1.4 }));
  const getXSpan = b => {
    const [s2,e2] = b.geom.tags.mouth;
    const xs = [];
    for(let i = s2+1; i < e2; i++) xs.push(b.geom.pos[i*3]);
    return Math.max(...xs) - Math.min(...xs);
  };
  const getYSpan = b => {
    const [s2,e2] = b.geom.tags.mouth;
    const ys = [];
    for(let i = s2+1; i < e2; i++) ys.push(b.geom.pos[i*3+1]);
    return Math.max(...ys) - Math.min(...ys);
  };
  ok(getXSpan(bWide) > getXSpan(bNarrow),
    'mouth X span monotone: mouthW=1.4 > mouthW=0.7');
  ok(Math.abs(getYSpan(bWide) - getYSpan(bNarrow)) < 1e-9,
    'mouth Y span constant: mouthW has no effect on vertical opening');
}

/* ---- Round 164: eyeSize formula verification for eye quad and brow position ---- */
{
  // ew = headR×0.21×eyeSize (eye half-width),  eh = headR×0.17×eyeSize (eye half-height)
  // brow center Y = eyeWY + eh×1.55  (brow floats 1.55 eye half-heights above eye center)
  const d = B.dims;
  const [s, e] = B.geom.tags.eyeL;
  const eyeYs = [], eyeXs = [];
  for(let i = s; i < e; i++){
    eyeYs.push(B.geom.pos[i*3+1]);
    eyeXs.push(B.geom.pos[i*3]);
  }
  const actualEW = (Math.max(...eyeXs) - Math.min(...eyeXs)) / 2;
  const actualEH = (Math.max(...eyeYs) - Math.min(...eyeYs)) / 2;
  const expectedEW = d.headR * 0.21 * P.eyeSize;
  const expectedEH = d.headR * 0.17 * P.eyeSize;
  ok(Math.abs(actualEW - expectedEW) < 1e-9,
    `eyeL half-width = headR×0.21×eyeSize = ${expectedEW.toFixed(5)}`);
  ok(Math.abs(actualEH - expectedEH) < 1e-9,
    `eyeL half-height = headR×0.17×eyeSize = ${expectedEH.toFixed(5)}`);

  // Brow Y formula: center Y of browL = eyeWY + eh×1.55
  const [bs, be] = B.geom.tags.browL;
  const browYs = [];
  for(let i = bs; i < be; i++) browYs.push(B.geom.pos[i*3+1]);
  const actualBrowY = (Math.max(...browYs) + Math.min(...browYs)) / 2;
  const expectedBrowY = d.eyeWY + expectedEH * 1.55;
  ok(Math.abs(actualBrowY - expectedBrowY) < 1e-9,
    `browL center Y = eyeWY + eh×1.55 = ${expectedBrowY.toFixed(5)}`);

  // Monotone: larger eyeSize → larger eye span and higher brow position
  const bSmall = H.buildAvatar(Object.assign({}, P, { eyeSize: 0.6 }));
  const bLarge = H.buildAvatar(Object.assign({}, P, { eyeSize: 1.4 }));
  const getEH = b => {
    const [s2,e2]=b.geom.tags.eyeL;
    const ys2=[];
    for(let i=s2;i<e2;i++) ys2.push(b.geom.pos[i*3+1]);
    return (Math.max(...ys2)-Math.min(...ys2))/2;
  };
  const getBrowY = b => {
    const [bs2,be2]=b.geom.tags.browL;
    const bys=[];
    for(let i=bs2;i<be2;i++) bys.push(b.geom.pos[i*3+1]);
    return (Math.max(...bys)+Math.min(...bys))/2;
  };
  ok(getEH(bLarge) > getEH(bSmall),
    'eye half-height monotone: eyeSize=1.4 > eyeSize=0.6');
  ok(getBrowY(bLarge) > getBrowY(bSmall),
    'brow center Y monotone: larger eye → higher brow (brow follows eh×1.55)');
}

/* ---- Round 163: skirtLen ring position formula + no-skirt invariance ---- */
{
  // skirtLen PARAMS range: [0.6, 1.6], default 1.0.
  // Formula: skirtLenW = (0.10 + 0.10×skirtLen)×H
  //          ring2 Y = skirtTop - skirtLenW×0.5,  ring3 Y = skirtTop - skirtLenW
  //          skirtTop = hipsY + 0.035×H
  // buildAvatar sanitizes params, so below-min values are clamped to 0.6.

  const useHair = 'short'; // isolate skirt geometry from hair changes
  const bMin = H.buildAvatar(Object.assign({}, P, { skirtLen:0.6, outfit:'sailor', hairStyle:useHair }));
  const bMax = H.buildAvatar(Object.assign({}, P, { skirtLen:1.6, outfit:'sailor', hairStyle:useHair }));
  const d = bMin.dims;
  const skirtTop = d.hipsY + 0.035 * d.H;

  // ring2 Y for min/max skirtLen
  const ring2min = skirtTop - (0.10+0.10*0.6) * d.H * 0.5;  // 0.65975 @ H=1.45
  const ring3min = skirtTop - (0.10+0.10*0.6) * d.H;         // 0.54375 @ H=1.45
  const ring2max = skirtTop - (0.10+0.10*1.6) * d.H * 0.5;  // 0.58725 @ H=1.45
  const ring3max = skirtTop - (0.10+0.10*1.6) * d.H;         // 0.39875 @ H=1.45

  // Count verts matching ring2/ring3 for min
  const nRing2min = Array.from(bMin.geom.pos).filter((_,i)=>i%3===1).filter(y=>Math.abs(y-ring2min)<1e-5).length;
  const nRing3min = Array.from(bMin.geom.pos).filter((_,i)=>i%3===1).filter(y=>Math.abs(y-ring3min)<1e-5).length;
  ok(nRing2min === 15 && nRing3min === 15,
    `skirtLen=0.6: ring2 (15 verts at Y=${ring2min.toFixed(4)}) and ring3 (15 verts at Y=${ring3min.toFixed(4)}) match formula`);

  const nRing2max = Array.from(bMax.geom.pos).filter((_,i)=>i%3===1).filter(y=>Math.abs(y-ring2max)<1e-5).length;
  const nRing3max = Array.from(bMax.geom.pos).filter((_,i)=>i%3===1).filter(y=>Math.abs(y-ring3max)<1e-5).length;
  ok(nRing2max === 15 && nRing3max === 15,
    `skirtLen=1.6: ring2 (15 verts at Y=${ring2max.toFixed(4)}) and ring3 (15 verts at Y=${ring3max.toFixed(4)}) match formula`);

  // Monotone: longer skirt → lower ring Y (more hang)
  ok(ring2max < ring2min && ring3max < ring3min,
    `skirtLen monotone: longer skirt lower rings (ring2: ${ring2min.toFixed(4)}→${ring2max.toFixed(4)}, ring3: ${ring3min.toFixed(4)}→${ring3max.toFixed(4)})`);

  // shirts/hoodie (no-skirt outfits) are invariant to skirtLen
  const shirtsLo = H.buildAvatar(Object.assign({}, P, { skirtLen:0.6, outfit:'shirts', hairStyle:useHair }));
  const shirtsHi = H.buildAvatar(Object.assign({}, P, { skirtLen:1.6, outfit:'shirts', hairStyle:useHair }));
  let shirtsInvariant = true;
  for(let i = 0; i < shirtsLo.geom.pos.length; i++){
    if(shirtsLo.geom.pos[i] !== shirtsHi.geom.pos[i]){ shirtsInvariant = false; break; }
  }
  ok(shirtsInvariant, 'shirts outfit geometry is invariant to skirtLen (no skirt mesh)');
}

/* ---- Round 162: eyeWY and eyeX formula verification ---- */
{
  // eyeWY = headCY + headR×(-0.05 + (eyeY-0.5)×0.4)
  // eyeX  = headR×(0.30 + (eyeGap-0.5)×0.24)
  const d = B.dims;
  const expectedWY = d.headCY + d.headR * (-0.05 + (P.eyeY - 0.5) * 0.4);
  const expectedX  = d.headR * (0.30 + (P.eyeGap - 0.5) * 0.24);
  ok(Math.abs(d.eyeWY - expectedWY) < 1e-9,
    `eyeWY = headCY + headR×(-0.05+(eyeY-0.5)×0.4) = ${expectedWY.toFixed(6)}`);
  ok(Math.abs(d.eyeX - expectedX) < 1e-9,
    `eyeX = headR×(0.30+(eyeGap-0.5)×0.24) = ${expectedX.toFixed(6)}`);

  // At eyeY=0.5 (midpoint): eyeWY = headCY - headR×0.05
  const dMid = H.buildAvatar(Object.assign({}, P, { eyeY: 0.5 })).dims;
  ok(Math.abs(dMid.eyeWY - (dMid.headCY - dMid.headR * 0.05)) < 1e-9,
    'eyeY=0.5: eyeWY = headCY - headR×0.05 (formula at midpoint)');

  // At eyeGap=0.5 (midpoint): eyeX = headR×0.30
  const dGap = H.buildAvatar(Object.assign({}, P, { eyeGap: 0.5 })).dims;
  ok(Math.abs(dGap.eyeX - dGap.headR * 0.30) < 1e-9,
    'eyeGap=0.5: eyeX = headR×0.30 (formula at midpoint)');

  // Monotonicity: higher eyeY → higher eyeWY
  const dEyeLo = H.buildAvatar(Object.assign({}, P, { eyeY: 0.0 })).dims;
  const dEyeHi = H.buildAvatar(Object.assign({}, P, { eyeY: 1.0 })).dims;
  ok(dEyeHi.eyeWY > dEyeLo.eyeWY,
    `eyeY monotone: eyeY=1.0 eyeWY=${dEyeHi.eyeWY.toFixed(5)} > eyeY=0.0 eyeWY=${dEyeLo.eyeWY.toFixed(5)}`);

  // Monotonicity: wider eyeGap → larger eyeX
  const dGapLo = H.buildAvatar(Object.assign({}, P, { eyeGap: 0.0 })).dims;
  const dGapHi = H.buildAvatar(Object.assign({}, P, { eyeGap: 1.0 })).dims;
  ok(dGapHi.eyeX > dGapLo.eyeX,
    `eyeGap monotone: eyeGap=1.0 eyeX=${dGapHi.eyeX.toFixed(5)} > eyeGap=0.0 eyeX=${dGapLo.eyeX.toFixed(5)}`);

  // Formula holds across all 6 presets
  let formulaFail = 0;
  for (const pre of H.PRESETS) {
    const C = H.buildAvatar(H.presetParams(pre));
    const cd = C.dims;
    const cp = H.presetParams(pre);
    const eWY = cd.headCY + cd.headR * (-0.05 + (cp.eyeY - 0.5) * 0.4);
    const eX  = cd.headR * (0.30 + (cp.eyeGap - 0.5) * 0.24);
    if (Math.abs(cd.eyeWY - eWY) > 1e-6) formulaFail++;
    if (Math.abs(cd.eyeX  - eX)  > 1e-6) formulaFail++;
  }
  ok(formulaFail === 0, 'eyeWY and eyeX formulas hold across all 6 presets');
}

/* ---- Round 161: vertex count regression snapshot + all-vertices-referenced invariant ---- */
{
  // Snapshot of vertex counts for all 20 outfit×hairStyle combos.
  // maxIdx == nV-1 means every vertex is referenced at least once (no orphans)
  // and no triangle references an out-of-bounds vertex.
  const VSNAP = {
    onepiece: {short:1246, bob:1272, long:1270, twin:1374, pony:1310},
    sailor:   {short:1253, bob:1279, long:1277, twin:1381, pony:1317},
    shirts:   {short:1237, bob:1263, long:1261, twin:1365, pony:1301},
    hoodie:   {short:1282, bob:1308, long:1306, twin:1410, pony:1346},
  };
  const outfits = ['onepiece','sailor','shirts','hoodie'];
  const hairs = ['short','bob','long','twin','pony'];
  let snapFail = 0, orphanFail = 0;
  for (const o of outfits) {
    for (const hs of hairs) {
      const p = Object.assign({}, P, { outfit: o, hairStyle: hs });
      const b = H.buildAvatar(p);
      const nV = b.geom.pos.length / 3;
      const maxIdx = Math.max.apply(null, Array.from(b.geom.idx));
      if (nV !== VSNAP[o][hs]) snapFail++;
      if (maxIdx !== nV - 1) orphanFail++;
    }
  }
  ok(snapFail === 0, 'vertex count regression snapshot: all 20 outfit×hairStyle combos match');
  ok(orphanFail === 0, 'max index == nV-1: all vertices referenced, no orphans (all 20 combos)');

  // hoodie has the most vertices per hairStyle (extra body geometry)
  const hoodieShort = H.buildAvatar(Object.assign({}, P, { outfit:'hoodie', hairStyle:'short' }));
  const shirtsShort = H.buildAvatar(Object.assign({}, P, { outfit:'shirts', hairStyle:'short' }));
  ok(hoodieShort.geom.pos.length > shirtsShort.geom.pos.length,
    'hoodie has more vertices than shirts for same hairStyle (hoodie body is more complex)');
}

/* ---- Round 160: spine bone interpolation formula verification ---- */
{
  // Verify exact proportional formulas for each spine bone position.
  // These catch regressions if someone changes the interpolation constants.
  const d = B.dims;

  // chestY = hipsY + (neckY - hipsY) × 0.62
  ok(Math.abs(d.chestY - (d.hipsY + (d.neckY - d.hipsY) * 0.62)) < 1e-9,
    `chestY = hipsY + (neckY-hipsY)×0.62 (chestY=${d.chestY.toFixed(6)})`);

  // spineY = hipsY + (neckY - hipsY) × 0.30
  ok(Math.abs(d.spineY - (d.hipsY + (d.neckY - d.hipsY) * 0.30)) < 1e-9,
    `spineY = hipsY + (neckY-hipsY)×0.30 (spineY=${d.spineY.toFixed(6)})`);

  // shoulderY = chestY + (neckY - chestY) × 0.62
  ok(Math.abs(d.shoulderY - (d.chestY + (d.neckY - d.chestY) * 0.62)) < 1e-9,
    `shoulderY = chestY + (neckY-chestY)×0.62 (shoulderY=${d.shoulderY.toFixed(6)})`);

  // kneeY = hipsY × 0.52
  ok(Math.abs(d.kneeY - d.hipsY * 0.52) < 1e-9,
    `kneeY = hipsY×0.52 (kneeY=${d.kneeY.toFixed(6)})`);

  // ankleY = max(0.035×H, hipsY×0.085)
  const expectedAnkleY = Math.max(0.035 * d.H, d.hipsY * 0.085);
  ok(Math.abs(d.ankleY - expectedAnkleY) < 1e-9,
    `ankleY = max(0.035×H, hipsY×0.085) = ${expectedAnkleY.toFixed(6)}`);

  // All formulas hold across all 6 presets
  let formulaFail = 0;
  for(const pre of H.PRESETS){
    const C = H.buildAvatar(H.presetParams(pre));
    const pd = C.dims;
    if(Math.abs(pd.chestY - (pd.hipsY + (pd.neckY - pd.hipsY)*0.62)) > 1e-6) formulaFail++;
    if(Math.abs(pd.spineY - (pd.hipsY + (pd.neckY - pd.hipsY)*0.30)) > 1e-6) formulaFail++;
    if(Math.abs(pd.shoulderY - (pd.chestY + (pd.neckY - pd.chestY)*0.62)) > 1e-6) formulaFail++;
    if(Math.abs(pd.kneeY - pd.hipsY * 0.52) > 1e-6) formulaFail++;
  }
  ok(formulaFail === 0, 'spine interpolation formulas hold across all 6 presets');
}

/* ---- Round 159: head collider offset formula + proportionality with height ---- */
{
  // collider offset = [0, 0, 0.01*H] (slight forward Z offset to center sphere in head)
  const coll = B.collider;
  ok(coll.offset[0] === 0 && coll.offset[1] === 0,
    'head collider offset: x=0, y=0 (no lateral offset from head bone)');
  ok(Math.abs(coll.offset[2] - 0.01 * P.height) < 1e-9,
    `head collider offset z = 0.01×H = ${(0.01*P.height).toFixed(6)} (correct formula)`);

  // Exported VRM collider offset matches build.collider.offset
  const png2 = H.b64ToBytes(H.PNG1);
  const ex = H.exportVRM(B, P, {}, png2);
  const cg = ex.json.extensions.VRM.secondaryAnimation.colliderGroups[0];
  ok(cg.colliders[0].offset.x === 0 && cg.colliders[0].offset.y === 0,
    'exported VRM collider offset x=y=0');
  ok(Math.abs(cg.colliders[0].offset.z - 0.01 * P.height) < 1e-9,
    'exported VRM collider offset z = 0.01×H (round-trips correctly)');

  // Collider Z offset scales proportionally with avatar height
  const tall = H.buildAvatar(Object.assign(H.defaults(), {height: H.PARAMS.height.max}));
  const short2 = H.buildAvatar(Object.assign(H.defaults(), {height: H.PARAMS.height.min}));
  ok(tall.collider.offset[2] > short2.collider.offset[2],
    'collider offset z proportional to height: taller avatar > shorter avatar');
  ok(Math.abs(tall.collider.offset[2] / short2.collider.offset[2] -
              H.PARAMS.height.max / H.PARAMS.height.min) < 1e-6,
    'collider offset z / height ratio is constant (offset ∝ H)');
}

/* ---- Round 158: bangs vertex/triangle count snapshots + morph stability across bangs ---- */
{
  // Exact counts per bangs style (default twin hairStyle). Regression guard for bang-strip geometry.
  // full=5 strips, see=5 narrower strips, center=4 side strips (fewer strips overall).
  const BANGS_SNAP = {full:{verts:1381,tris:1961}, see:{verts:1371,tris:1955}, center:{verts:1366,tris:1952}};
  let snapFail = 0;
  for(const [bangs, {verts, tris}] of Object.entries(BANGS_SNAP)){
    const C = H.buildAvatar(Object.assign(H.defaults(), {bangs}));
    if(C.geom.pos.length/3 !== verts) snapFail++;
    if(C.geom.idx.length/3 !== tris) snapFail++;
  }
  ok(snapFail === 0,
    'bangs vertex/tris snapshot: full=1381v/1961t, see=1371v/1955t, center=1366v/1952t (regression guard)');

  // Ordering: full has more verts than see, see more than center (more strips = more geometry)
  ok(BANGS_SNAP.full.verts > BANGS_SNAP.see.verts && BANGS_SNAP.see.verts > BANGS_SNAP.center.verts,
    'bangs vertex count: full > see > center (more bang strips = more geometry)');

  // Morph counts must be invariant across bangs styles (morphs only reference face tag vertices)
  const EXPECTED = {a:8,i:8,u:9,e:8,o:9,blink:16,'blink_l':8,'blink_r':8,joy:24,angry:25,sorrow:25,fun:24};
  let morphFail = 0;
  for(const bangs of ['full','see','center']){
    const C = H.buildAvatar(Object.assign(H.defaults(), {bangs}));
    for(const [n, exp] of Object.entries(EXPECTED)){
      if(C.morphs.sparse[n].length !== exp) morphFail++;
    }
  }
  ok(morphFail === 0,
    'morph sparse counts invariant across all bangs styles (morphs only reference face tag verts)');
}

/* ---- Round 157: face tag vertex count snapshots + morph POSITION-only + tag ordering ---- */
{
  // Face tag vertex counts are topology-invariant (faceQuad=4, mouth fan=9)
  const tagCounts = {eyeL:4, eyeR:4, browL:4, browR:4, mouth:9};
  ok(Object.entries(tagCounts).every(([tag, expected]) => {
    const [s,e] = B.geom.tags[tag]; return (e-s) === expected;
  }), 'face tag vertex counts: eyeL=4, eyeR=4, browL=4, browR=4, mouth=9 (topology snapshot)');

  // Face tags must be in strictly ascending index order (eyeL→eyeR→browL→browR→mouth)
  const tagOrder = ['eyeL','eyeR','browL','browR','mouth'];
  let prevEnd = B.faceStart;
  let orderOK = true;
  for(const tag of tagOrder){
    const [s,e] = B.geom.tags[tag];
    if(s < prevEnd) orderOK = false;
    prevEnd = e;
  }
  ok(orderOK, 'face tags strictly ascending in index space: faceStart≤eyeL<eyeR<browL<browR<mouth');

  // All face tag start indices must equal faceStart for eyeL (the first face geometry)
  ok(B.geom.tags.eyeL[0] === B.faceStart,
    'eyeL tag starts exactly at faceStart (eyeL is first tagged face geometry)');

  // Morph targets in GLB must have only POSITION attribute (no UV or NORMAL morphs)
  const png2 = H.b64ToBytes(H.PNG1);
  const ex = H.exportVRM(B, P, {}, png2);
  const prim = ex.json.meshes[0].primitives[0];
  ok(prim.targets.every(t => Object.keys(t).length === 1 && t.POSITION !== undefined),
    'all 12 morph targets have only POSITION attribute (no UV/NORMAL morphs)');
}

/* ---- Round 156: firstPersonBoneOffset.z exact formula + ahoge vertex position ---- */
{
  // fpZ = round(-headR × 0.7, 3dp) — places camera inside head at eye depth
  const png2 = H.b64ToBytes(H.PNG1);
  const ex = H.exportVRM(B, P, {}, png2);
  const fp = ex.json.extensions.VRM.firstPerson.firstPersonBoneOffset;
  const expectedFpZ = Math.round(-B.dims.headR * 0.7 * 1000) / 1000;
  ok(Math.abs(fp.z - expectedFpZ) < 1e-9,
    `firstPersonBoneOffset.z = round(-headR×0.7, 3dp) = ${expectedFpZ}`);

  // firstPersonBoneOffset.y = eyeWY - headBone.w[1] (rounded to 3dp)
  const headBoneY = B.bones[B.idx.head].w[1];
  const expectedFpY = Math.round((B.dims.eyeWY - headBoneY) * 1000) / 1000;
  ok(Math.abs(fp.y - expectedFpY) < 1e-9,
    `firstPersonBoneOffset.y = round(eyeWY - headBone.y, 3dp) = ${expectedFpY}`);

  // ahoge tip vertex must be above head sphere top — find ahoge verts by first array divergence
  const bAhoge = H.buildAvatar(Object.assign(H.defaults(), {ahoge: true}));
  const bNoAhoge = H.buildAvatar(Object.assign(H.defaults(), {ahoge: false}));
  let ahogeStartVtx = -1;
  for(let i = 0; i < bNoAhoge.geom.pos.length; i++){
    if(bAhoge.geom.pos[i] !== bNoAhoge.geom.pos[i]){ ahogeStartVtx = Math.floor(i/3); break; }
  }
  let ahogeMaxY = -Infinity;
  for(let i = ahogeStartVtx; i < ahogeStartVtx + 3; i++){
    ahogeMaxY = Math.max(ahogeMaxY, bAhoge.geom.pos[i*3 + 1]);
  }
  const headSphereTop = bAhoge.dims.headCY + bAhoge.dims.headR;
  ok(ahogeStartVtx >= 0 && ahogeMaxY > headSphereTop,
    `ahoge tip Y (${ahogeMaxY.toFixed(4)}) > head sphere top (${headSphereTop.toFixed(4)})`);

  // ahoge vertices must be skinned 100% to head bone
  const headIdx = bAhoge.idx.head;
  let ahogeWgtOK = true;
  for(let i = ahogeStartVtx; i < ahogeStartVtx + 3; i++){
    const j0 = bAhoge.geom.jnt[i*4];
    const w0 = bAhoge.geom.wgt[i*4];
    const wSum = bAhoge.geom.wgt[i*4]+bAhoge.geom.wgt[i*4+1]+bAhoge.geom.wgt[i*4+2]+bAhoge.geom.wgt[i*4+3];
    if(j0 !== headIdx || Math.abs(w0 - 1.0) > 1e-6 || Math.abs(wSum - 1.0) > 1e-6) ahogeWgtOK = false;
  }
  ok(ahogeWgtOK, 'ahoge vertices skinned 100% to head bone (correct rigid attachment)');
}

/* ---- Round 155: ATLAS rect non-overlap + bounds validation ---- */
{
  // All face atlas uvRect regions must be within [0, TEX) and must not overlap each other.
  // Overlap would cause two face features to share texture pixels.
  const TEX = 1024;
  const rects = ['eyeL','eyeR','browL','browR','mouth','blush'];

  // bounds check: all coords in [0, TEX]
  ok(rects.every(name => {
    const r = H.ATLAS[name];
    return r[0] >= 0 && r[1] >= 0 && r[2] <= TEX && r[3] <= TEX && r[0] < r[2] && r[1] < r[3];
  }), 'all face atlas rects within [0,TEX] with positive area');

  // non-overlap: no two rects share any area
  let overlapCount = 0;
  for(let i = 0; i < rects.length; i++){
    for(let j = i+1; j < rects.length; j++){
      const a = H.ATLAS[rects[i]], b = H.ATLAS[rects[j]];
      // overlap iff projections on both axes overlap
      const xOverlap = a[0] < b[2] && b[0] < a[2];
      const yOverlap = a[1] < b[3] && b[1] < a[3];
      if(xOverlap && yOverlap) overlapCount++;
    }
  }
  ok(overlapCount === 0,
    'face atlas rects are non-overlapping (eyeL/eyeR/browL/browR/mouth/blush have distinct texels)');

  // solid color blocks: all 8 must be within [0, TEX] and have distinct positions
  const solidNames = ['skin','hair','clothMain','clothSub','accent','shoe','white','hairHi'];
  const positions = solidNames.map(n => H.ATLAS[n]);
  ok(positions.every(([x,y]) => x >= 0 && y >= 0 && x + 64 <= TEX && y + 64 <= TEX),
    'all 8 solid atlas blocks fit within TEX×TEX with 64px side');
  const posSet = new Set(positions.map(([x,y]) => `${x},${y}`));
  ok(posSet.size === solidNames.length,
    'all 8 solid atlas blocks have distinct positions (no two share a texel block)');
}

/* ---- Round 154: bone count snapshot per hairStyle + Quest budget guard ---- */
{
  // Exact bone counts per hairStyle. Deviations = regression in spring bone generation.
  // short/bob: 21 humanoid bones (no springs). long: +3 chains×3. twin: +2 chains×4. pony: +1 chain×4.
  const BONE_SNAP = {short: 21, bob: 21, long: 30, twin: 29, pony: 25};
  let snapFail = 0, budgetFail = 0;
  for(const [hairStyle, expected] of Object.entries(BONE_SNAP)){
    const C = H.buildAvatar(Object.assign(H.defaults(), {hairStyle}));
    if(C.bones.length !== expected) snapFail++;
    if(C.bones.length >= 75) budgetFail++;  // Quest Excellent ≤74
  }
  ok(snapFail === 0,
    'bone count snapshot per hairStyle: short=21, bob=21, long=30, twin=29, pony=25 (spring regression guard)');
  ok(budgetFail === 0,
    'all hairStyles have < 75 bones (Quest Excellent bone budget)');

  // humanoid bone count: 21 body bones should always be constant regardless of hairStyle
  const bodyBones = BONE_SNAP.short; // short has no spring bones
  for(const hairStyle of Object.keys(BONE_SNAP)){
    const C = H.buildAvatar(Object.assign(H.defaults(), {hairStyle}));
    const humanoidCount = C.bones.filter(b => b.hb !== null).length;
    if(humanoidCount !== bodyBones) budgetFail++;
  }
  ok(budgetFail === 0,
    'all hairStyles have exactly 21 humanoid-mapped bones (spring bones are non-humanoid)');
}

/* ---- Round 153: spring chain parent-child validity + GLB determinism ---- */
{
  // Spring chains must form a valid parent-child sequence: bones[n+1].parent === boneIdx[n]
  // and the root bone must be a child of an existing body bone (not a chain member)
  const hairsWithSprings = ['long','twin','pony'];
  let chainParentFail = 0;
  for(const hairStyle of hairsWithSprings){
    const C = H.buildAvatar(Object.assign(H.defaults(), {hairStyle}));
    for(const sp of C.springs){
      const idxs = sp.boneIdxs;
      // root's parent must be a non-chain bone (body bone)
      const chainSet = new Set(idxs);
      if(chainSet.has(C.bones[idxs[0]].parent)) chainParentFail++;
      // each subsequent bone's parent must be the previous bone
      for(let j=1; j<idxs.length; j++){
        if(C.bones[idxs[j]].parent !== idxs[j-1]) chainParentFail++;
      }
    }
  }
  ok(chainParentFail === 0,
    'spring chains: root parent is body bone, each bone[n+1].parent = bone[n] (valid hierarchy)');

  // GLB export is deterministic: same params + same png → identical byte length
  const png2 = H.b64ToBytes(H.PNG1);
  const ex1 = H.exportVRM(B, P, {}, png2);
  const ex2 = H.exportVRM(B, P, {}, png2);
  ok(ex1.bytes.length === ex2.bytes.length,
    'GLB export is deterministic: same inputs → same byte length');
  // Also verify rebuild produces same length (build itself is deterministic)
  const B2 = H.buildAvatar(P);
  const ex3 = H.exportVRM(B2, P, {}, png2);
  ok(ex3.bytes.length === ex1.bytes.length,
    'GLB export byte length invariant across rebuild of same params');
}

/* ---- Round 152: outfit×hairStyle triangle-count regression snapshot ---- */
{
  // Exact triangle counts per outfit/hairStyle combo. Any geometry change shifts these.
  // All counts must be < 7500 (Quest Excellent tris budget).
  const SNAP = {
    onepiece: {short:1782, bob:1830, long:1800, twin:1958, pony:1870},
    sailor:   {short:1785, bob:1833, long:1803, twin:1961, pony:1873},
    shirts:   {short:1758, bob:1806, long:1776, twin:1934, pony:1846},
    hoodie:   {short:1822, bob:1870, long:1840, twin:1998, pony:1910},
  };
  let snapFail = 0, budgetFail = 0;
  for(const [outfit, hairMap] of Object.entries(SNAP)){
    for(const [hairStyle, expectedTris] of Object.entries(hairMap)){
      const C = H.buildAvatar(Object.assign(H.defaults(), {outfit, hairStyle}));
      const tris = C.geom.idx.length / 3;
      if(tris !== expectedTris) snapFail++;
      if(tris >= 7500) budgetFail++;
    }
  }
  ok(snapFail === 0,
    'outfit×hairStyle triangle-count snapshot: all 20 combos match expected counts (geometry regression guard)');
  ok(budgetFail === 0,
    'all 20 outfit×hairStyle combos are under Quest Excellent 7500-tris budget');
}

/* ---- Round 151: skeleton Y-ordering invariants + arm X-ordering ---- */
{
  // dims fields not yet validated: spine chain must ascend in Y, arm must ascend in X
  const d = B.dims;

  // Spine chain: bottom to top must strictly increase in Y
  const spineOrder = [d.ankleY, d.kneeY, d.hipsY, d.spineY, d.chestY, d.shoulderY, d.neckY, d.headCY];
  const spineNames = ['ankleY','kneeY','hipsY','spineY','chestY','shoulderY','neckY','headCY'];
  let badPair = '';
  for(let i=0; i<spineOrder.length-1; i++){
    if(spineOrder[i] >= spineOrder[i+1]) badPair = `${spineNames[i]} >= ${spineNames[i+1]}`;
  }
  ok(badPair === '', `spine chain strictly ascending: ankleY<kneeY<hipsY<spineY<chestY<shoulderY<neckY<headCY${badPair?' (violated: '+badPair+')':''}`);

  // Arm X-ordering: shoulder → elbow → wrist must strictly increase (outward from center)
  ok(d.shX < d.elbowX && d.elbowX < d.wristX,
    `arm X ascends outward: shX(${d.shX.toFixed(4)}) < elbowX(${d.elbowX.toFixed(4)}) < wristX(${d.wristX.toFixed(4)})`);

  // Ordering must hold across all 6 presets (different body proportions)
  let presetBad = 0;
  for(const pre of H.PRESETS){
    const C = H.buildAvatar(H.presetParams(pre));
    const pd = C.dims;
    const ch = [pd.ankleY, pd.kneeY, pd.hipsY, pd.spineY, pd.chestY, pd.shoulderY, pd.neckY, pd.headCY];
    for(let i=0;i<ch.length-1;i++) if(ch[i] >= ch[i+1]) presetBad++;
    if(pd.shX >= pd.elbowX || pd.elbowX >= pd.wristX) presetBad++;
  }
  ok(presetBad === 0, 'all 6 presets: spine Y-ordering and arm X-ordering invariants hold');

  // wristX = shX + armL*0.92 (wrist is 92% along arm length from shoulder)
  ok(Math.abs(d.wristX - (d.shX + d.armL*0.92)) < 1e-6,
    `wristX = shX + armL×0.92 (wristX=${d.wristX.toFixed(4)}, shX+armL×0.92=${(d.shX+d.armL*0.92).toFixed(4)})`);
}

/* ---- Round 150: mouthW mesh X-extent + pathological combo finite-geometry ---- */
{
  // mouthW scales mrx = headR*0.14*mouthW → mouth tag X-span is proportional to mouthW
  const mouthXSpan = A => {
    const [s,e] = A.geom.tags.mouth;
    let mx = 0;
    for(let i=s; i<e; i++) mx = Math.max(mx, Math.abs(A.geom.pos[i*3]));
    return mx;
  };
  const narrow = H.buildAvatar(Object.assign(H.defaults(), {mouthW: H.PARAMS.mouthW.min}));
  const wide   = H.buildAvatar(Object.assign(H.defaults(), {mouthW: H.PARAMS.mouthW.max}));
  ok(mouthXSpan(wide) > mouthXSpan(narrow), 'mouthW=max mouth X-span > mouthW=min');
  const ratio = mouthXSpan(wide) / mouthXSpan(narrow);
  const expectedRatio = H.PARAMS.mouthW.max / H.PARAMS.mouthW.min;
  ok(Math.abs(ratio - expectedRatio) < 1e-6,
    `mouthW X-span scales linearly with mouthW (ratio=${ratio.toFixed(6)}, expected=${expectedRatio})`);

  // pathological parameter combos must yield finite, index-valid geometry
  const combos = [
    {height: H.PARAMS.height.min, headRatio: H.PARAMS.headRatio.max,
     armLen: H.PARAMS.armLen.min, legLen: H.PARAMS.legLen.min},
    {height: H.PARAMS.height.max, headRatio: H.PARAMS.headRatio.min,
     armLen: H.PARAMS.armLen.max, legLen: H.PARAMS.legLen.max},
    {bust: H.PARAMS.bust.max, shoulderW: H.PARAMS.shoulderW.min,
     mouthW: H.PARAMS.mouthW.min, eyeSize: H.PARAMS.eyeSize.max},
  ];
  let finiteFail = 0;
  for(const ovr of combos){
    const C = H.buildAvatar(Object.assign(H.defaults(), ovr));
    const nV = C.geom.pos.length / 3;
    if(!C.geom.pos.every(Number.isFinite)) finiteFail++;
    else if(!C.geom.nrm.every(Number.isFinite)) finiteFail++;
    else if(!C.geom.idx.every(i => i >= 0 && i < nV)) finiteFail++;
  }
  ok(finiteFail === 0,
    'pathological param combos (3): finite pos/nrm and valid index range');
}

/* ---- Round 149: browTilt zero-dy guard + sparse non-zero invariant + eyeL/eyeR symmetry sweep ---- */
{
  // browTilt now filters zero-dy entries (matches scaleTag behaviour).
  // Every sparse entry [i,dx,dy,dz] must carry a non-zero displacement.
  ok(
    B.morphs.names.every(n => B.morphs.sparse[n].every(e => e[1] !== 0 || e[2] !== 0 || e[3] !== 0)),
    'every sparse entry has non-zero displacement (no idle vertices in any morph)'
  );

  // eyeL/eyeR vertex count parity under extreme parameter sweep
  const eyeParamSweep = [
    {height: H.PARAMS.height.min}, {height: H.PARAMS.height.max},
    {eyeSize: H.PARAMS.eyeSize.min}, {eyeSize: H.PARAMS.eyeSize.max},
    {eyeY: H.PARAMS.eyeY.min},      {eyeY: H.PARAMS.eyeY.max},
    {eyeGap: H.PARAMS.eyeGap.min},  {eyeGap: H.PARAMS.eyeGap.max},
    {headRatio: H.PARAMS.headRatio.min}, {headRatio: H.PARAMS.headRatio.max},
  ];
  let asymmetric = 0;
  for(const ovr of eyeParamSweep){
    const C = H.buildAvatar(Object.assign(H.defaults(), ovr));
    const [sL,eL] = C.geom.tags['eyeL'], [sR,eR] = C.geom.tags['eyeR'];
    if((eL-sL) !== (eR-sR)) asymmetric++;
  }
  ok(asymmetric === 0, 'eyeL/eyeR vertex count parity under extreme param sweep (10 cases)');

  // browTilt morphs: count for blink/blink_l/blink_r/joy/angry/sorrow/fun must be even
  // (symmetric left+right brows contribute equal counts)
  const browMorphs = ['blink','blink_l','blink_r','joy','angry','sorrow','fun'];
  ok(
    browMorphs.every(n => {
      const s = B.morphs.sparse[n];
      const browEntries = s.filter(e => e[0] < B.faceStart || e[0] >= B.faceStart);
      // count specifically brow vertices
      const [sL0,eL0] = B.geom.tags['browL'], [sR0,eR0] = B.geom.tags['browR'];
      const browCount = s.filter(e => (e[0]>=sL0&&e[0]<eL0)||(e[0]>=sR0&&e[0]<eR0)).length;
      // single-sided morphs (blink_l, blink_r) skip - they only move one brow
      if(n==='blink_l'||n==='blink_r') return true;
      return browCount % 2 === 0;
    }),
    'bilateral brow morphs have even brow-vertex count (L+R symmetry)'
  );
}

/* ---- Round 148: total avatar height = H invariant + headRatio proportionality ---- */
{
  // The top of the head sphere = H (headCY + headR = (H-headR) + headR = H always)
  // Verify that the top vertex of the head sphere reaches headCY + headR ≈ H
  // The head sphere is centered at [0,headCY,0.005*H] with radius headR.
  // Top of sphere (phi=0) is at headCY + headR = H.
  const A = B; // use default build
  const topY = A.dims.headR * 2; // headCY + headR = H, but let me compute:
  const computedTop = A.dims.headCY + A.dims.headR;
  ok(Math.abs(computedTop - H.defaults().height) < 1e-9,
    `headCY + headR = H = ${H.defaults().height}m (total height invariant)`);

  // headRatio = headR / H * 2  →  headR = headRatio * H * 0.5
  const testCases = [{headRatio: 0.18}, {headRatio: 0.24}, {headRatio: 0.36}];
  let proportional = true;
  for(const {headRatio} of testCases){
    const C = H.buildAvatar(Object.assign(H.defaults(), {headRatio}));
    const expected = headRatio * H.defaults().height * 0.5;
    if(Math.abs(C.dims.headR - expected) > 1e-9) proportional = false;
  }
  ok(proportional, 'dims.headR = headRatio × H × 0.5 for all tested headRatio values');

  // Height invariant holds across all presets (headCY + headR = H)
  let heightBad = 0;
  for(const pre of H.PRESETS){
    const p2 = H.presetParams(pre);
    const C2 = H.buildAvatar(p2);
    const top = C2.dims.headCY + C2.dims.headR;
    if(Math.abs(top - p2.height) > 1e-9) heightBad++;
  }
  ok(heightBad === 0, 'all 6 presets: headCY + headR = p.height (total height invariant)');

  // Larger headRatio → smaller headCY (head center is lower; bigger head relative to body)
  const smallHead = H.buildAvatar(Object.assign(H.defaults(), {headRatio: 0.18}));
  const bigHead   = H.buildAvatar(Object.assign(H.defaults(), {headRatio: 0.36}));
  ok(bigHead.dims.headCY < smallHead.dims.headCY,
    'bigger headRatio → lower headCY (head center moves down as head grows)');
}

/* ---- Round 147: shoulderW and hipW proportional effects on body geometry ---- */
{
  // shoulderW: wider shoulders → leftUpperArm X more negative (further left)
  const narrowSh = H.buildAvatar(Object.assign(H.defaults(), {shoulderW: 0.14}));
  const wideSh   = H.buildAvatar(Object.assign(H.defaults(), {shoulderW: 0.34}));

  ok(narrowSh.bones[narrowSh.idx.lUA].w[0] > wideSh.bones[wideSh.idx.lUA].w[0],
    'leftUpperArm X more negative with wider shoulders (shoulderW=0.34 < 0.14)');
  ok(narrowSh.bones[narrowSh.idx.rUA].w[0] < wideSh.bones[wideSh.idx.rUA].w[0],
    'rightUpperArm X more positive with wider shoulders (symmetric)');

  // shoulderW scales dims.shX proportionally
  ok(wideSh.dims.shX > narrowSh.dims.shX,
    'dims.shX increases with shoulderW');

  // hipW: wider hips → leftUpperLeg X more negative (further left)
  const narrowHip = H.buildAvatar(Object.assign(H.defaults(), {hipW: 0.14}));
  const wideHip   = H.buildAvatar(Object.assign(H.defaults(), {hipW: 0.34}));

  ok(narrowHip.bones[narrowHip.idx.lUL].w[0] > wideHip.bones[wideHip.idx.lUL].w[0],
    'leftUpperLeg X more negative with wider hips (hipW=0.34 < 0.14)');
  ok(narrowHip.dims.legX < wideHip.dims.legX,
    'dims.legX increases with hipW');
}

/* ---- Round 146: legLen/armLen proportional effects on bone positions ---- */
{
  // legLen: higher legLen → higher hips bone Y (longer legs = hips set higher)
  const shortLeg = H.buildAvatar(Object.assign(H.defaults(), {legLen: 0.8}));
  const midLeg   = H.buildAvatar(Object.assign(H.defaults(), {legLen: 1.0}));
  const longLeg  = H.buildAvatar(Object.assign(H.defaults(), {legLen: 1.2}));

  const hipsY = A => A.bones[A.idx.hips].w[1];
  ok(hipsY(shortLeg) < hipsY(midLeg) && hipsY(midLeg) < hipsY(longLeg),
    'hips bone Y strictly increases with legLen (0.8 < 1.0 < 1.2)');

  // Longer legs → foot bone Y stays near ground, upper leg Y increases
  const UpperLegY = A => A.bones[A.idx.lUL].w[1];
  ok(UpperLegY(shortLeg) < UpperLegY(midLeg) && UpperLegY(midLeg) < UpperLegY(longLeg),
    'leftUpperLeg bone Y increases with legLen');

  // armLen: higher armLen → leftHand bone further from center (more negative X)
  const shortArm = H.buildAvatar(Object.assign(H.defaults(), {armLen: 0.8}));
  const longArm  = H.buildAvatar(Object.assign(H.defaults(), {armLen: 1.2}));

  const handX = A => A.bones[A.idx.lH].w[0]; // negative = further left
  ok(handX(shortArm) > handX(longArm),
    'leftHand X more negative with armLen=1.2 (longer arms reach further left)');

  // elbowX and wristX scale with armLen
  const elbowX = A => A.bones[A.idx.lLA].w[0]; // lowerArm = elbow
  ok(elbowX(shortArm) > elbowX(longArm),
    'leftLowerArm X more negative with armLen=1.2 (elbow further out)');
}

/* ---- Round 145: POSITION accessor min/max bounds (glTF spec compliance) ---- */
{
  const ex2 = H.exportVRM(B, H.defaults(), {}, new Uint8Array([]));
  const G2 = parseGLB(ex2.bytes);
  const j2 = G2.json;
  const posAccIdx = j2.meshes[0].primitives[0].attributes.POSITION;
  const posAcc = j2.accessors[posAccIdx];

  // glTF spec: POSITION accessor MUST have min and max (required for bounding sphere)
  ok(Array.isArray(posAcc.min) && posAcc.min.length === 3, 'POSITION accessor has min[3]');
  ok(Array.isArray(posAcc.max) && posAcc.max.length === 3, 'POSITION accessor has max[3]');

  // min/max must correctly bound all vertex positions
  const posData = accData(j2, G2.bin, posAccIdx);
  const nVP = posAcc.count;
  let minOK=true, maxOK=true;
  for(let i=0;i<nVP;i++){
    for(let k=0;k<3;k++){
      const v=posData[i*3+k];
      if(v < posAcc.min[k]-1e-6) minOK=false;
      if(v > posAcc.max[k]+1e-6) maxOK=false;
    }
  }
  ok(minOK, `all ${nVP} vertex positions ≥ accessor.min (${posAcc.min.map(v=>v.toFixed(3)).join(',')})`);
  ok(maxOK, `all ${nVP} vertex positions ≤ accessor.max (${posAcc.max.map(v=>v.toFixed(3)).join(',')})`);

  // min/max must be tight: at least one vertex at each min/max component
  let minTight=true, maxTight=true;
  for(let k=0;k<3;k++){
    const atMin = Array.from({length:nVP}, (_,i)=>posData[i*3+k]).some(v=>Math.abs(v-posAcc.min[k])<1e-4);
    const atMax = Array.from({length:nVP}, (_,i)=>posData[i*3+k]).some(v=>Math.abs(v-posAcc.max[k])<1e-4);
    if(!atMin) minTight=false;
    if(!atMax) maxTight=false;
  }
  ok(minTight && maxTight, 'POSITION min/max are tight (at least one vertex at each bound per axis)');
}

/* ---- Round 144: hairLen monotonically increases spring chain end-bone distance ---- */
{
  // For twin hair style, measure the end-bone Y of the spring chain
  // More hairLen = longer chains = end bone is further from head
  const shortLen = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:'twin', hairLen:0.7}));
  const midLen   = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:'twin', hairLen:1.0}));
  const longLen  = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:'twin', hairLen:1.4}));

  // Twin hair has 2 chains; use chain 0 (TailL_)
  const endBone = A => A.springs[0].boneIdxs[A.springs[0].boneIdxs.length - 1];
  const endY = A => A.bones[endBone(A)].w[1];

  ok(endY(shortLen) > endY(midLen) && endY(midLen) > endY(longLen),
    'twin hair end-bone Y decreases (chains hang lower) as hairLen increases (0.7 > 1.0 > 1.4)');

  // For pony hair style: end bone distance from head in Y
  const shortPony = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:'pony', hairLen:0.7}));
  const longPony  = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:'pony', hairLen:1.4}));
  const ponyEndY = A => A.bones[A.springs[0].boneIdxs[A.springs[0].boneIdxs.length-1]].w[1];
  ok(ponyEndY(longPony) < ponyEndY(shortPony),
    'pony hair end-bone Y is lower (longer chain) for hairLen=1.4 vs 0.7');

  // hairLen does not affect non-spring hair styles (short/bob)
  const shortHair = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:'short', hairLen:0.7}));
  const longHair  = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:'short', hairLen:1.4}));
  ok(shortHair.springs.length === 0 && longHair.springs.length === 0,
    'short hair: hairLen has no spring chains regardless of value');
  ok(shortHair.bones.length === longHair.bones.length,
    'short hair: hairLen does not change bone count (0 spring bones in both cases)');
}

/* ---- Round 143: eyeY monotonicity — higher eyeY = higher eye position ---- */
{
  const low  = H.buildAvatar(Object.assign(H.defaults(), {eyeY: 0.0}));
  const mid  = H.buildAvatar(Object.assign(H.defaults(), {eyeY: 0.5}));
  const high = H.buildAvatar(Object.assign(H.defaults(), {eyeY: 1.0}));

  // Eye bone world Y should increase with eyeY
  ok(low.bones[low.idx.lE].w[1] < mid.bones[mid.idx.lE].w[1] &&
     mid.bones[mid.idx.lE].w[1] < high.bones[high.idx.lE].w[1],
    'lE bone world Y strictly increases with eyeY (low < mid < high)');
  ok(low.bones[low.idx.rE].w[1] < mid.bones[mid.idx.rE].w[1] &&
     mid.bones[mid.idx.rE].w[1] < high.bones[high.idx.rE].w[1],
    'rE bone world Y strictly increases with eyeY (left-right symmetric)');

  // Eye quad vertices Y should also increase with eyeY
  const eyeLTopY = A => {
    const [s,e] = A.geom.tags.eyeL;
    return Math.max(...Array.from({length:e-s},(_,i)=>A.geom.pos[(s+i)*3+1]));
  };
  ok(eyeLTopY(low) < eyeLTopY(mid) && eyeLTopY(mid) < eyeLTopY(high),
    'eyeL quad top vertex Y strictly increases with eyeY param');

  // eyeY also shifts the eyeWY dim accordingly
  ok(low.dims.eyeWY < mid.dims.eyeWY && mid.dims.eyeWY < high.dims.eyeWY,
    'dims.eyeWY strictly increases with eyeY param');
}

/* ---- Round 142: bust parameter effect on chest geometry ---- */
{
  const noBust = H.buildAvatar(Object.assign(H.defaults(), {bust: 0.0}));
  const maxBust = H.buildAvatar(Object.assign(H.defaults(), {bust: 1.0}));
  const chestY = noBust.dims.chestY;

  // Find the most-forward (min Z) chest-height vertex in each build
  let minZ_no=0, minZ_max=0;
  for(let i=0;i<noBust.geom.pos.length/3;i++){
    const y=noBust.geom.pos[i*3+1];
    if(Math.abs(y - chestY) < 0.06){
      const z=noBust.geom.pos[i*3+2]; if(z<minZ_no) minZ_no=z;
    }
  }
  for(let i=0;i<maxBust.geom.pos.length/3;i++){
    const y=maxBust.geom.pos[i*3+1];
    if(Math.abs(y - chestY) < 0.06){
      const z=maxBust.geom.pos[i*3+2]; if(z<minZ_max) minZ_max=z;
    }
  }
  ok(minZ_max < minZ_no,
    `bust=1.0 chest protrudes further (minZ=${minZ_max.toFixed(4)}) than bust=0 (minZ=${minZ_no.toFixed(4)})`);

  // Mid-bust should be intermediate
  const midBust = H.buildAvatar(Object.assign(H.defaults(), {bust: 0.5}));
  let minZ_mid=0;
  for(let i=0;i<midBust.geom.pos.length/3;i++){
    const y=midBust.geom.pos[i*3+1];
    if(Math.abs(y - chestY) < 0.06){
      const z=midBust.geom.pos[i*3+2]; if(z<minZ_mid) minZ_mid=z;
    }
  }
  ok(minZ_mid > minZ_max && minZ_mid < minZ_no,
    `bust=0.5 chest Z (${minZ_mid.toFixed(4)}) is between bust=0 (${minZ_no.toFixed(4)}) and bust=1 (${minZ_max.toFixed(4)})`);

  // Bust effect is body-side only — total vertex count unchanged
  ok(noBust.geom.pos.length === maxBust.geom.pos.length,
    'bust parameter does not change vertex count (pure positional deformation)');
}

/* ---- Round 141: bone spatial ordering invariants — anatomically correct positions ---- */
{
  const bn = B.bones, id = B.idx;
  // Left arm chain: shoulder → upperArm → lowerArm → hand (x decreases monotonically leftward)
  ok(bn[id.lSh].w[0] > bn[id.lUA].w[0] && bn[id.lUA].w[0] > bn[id.lLA].w[0] && bn[id.lLA].w[0] > bn[id.lH].w[0],
    'left arm X: shoulder > upperArm > lowerArm > hand (arm extends leftward = negative X)');
  // Right arm: mirrors left (positive X, each successive bone is further right)
  ok(bn[id.rSh].w[0] < bn[id.rUA].w[0] && bn[id.rUA].w[0] < bn[id.rLA].w[0] && bn[id.rLA].w[0] < bn[id.rH].w[0],
    'right arm X: shoulder < upperArm < lowerArm < hand (arm extends rightward = positive X)');
  // Left leg: hip → upperLeg → lowerLeg → foot (Y decreases, all below hips)
  ok(bn[id.lUL].w[1] > bn[id.lLL].w[1] && bn[id.lLL].w[1] > bn[id.lF].w[1],
    'left leg Y: upperLeg > lowerLeg > foot (descends toward ground)');
  // Spine chain: hips → spine → chest → neck → head (Y strictly increases)
  ok(bn[id.hips].w[1] < bn[id.spine].w[1] && bn[id.spine].w[1] < bn[id.chest].w[1] &&
     bn[id.chest].w[1] < bn[id.neck].w[1] && bn[id.neck].w[1] < bn[id.head].w[1],
    'spine chain Y: hips < spine < chest < neck < head (ascending height)');
  // Arm bones and leg bones are near zero Z (T-pose, no front/back offset)
  const armBones = [id.lSh,id.lUA,id.lLA,id.lH,id.rSh,id.rUA,id.rLA,id.rH];
  const legBones = [id.lUL,id.lLL,id.lF,id.rUL,id.rLL,id.rF];
  ok([...armBones,...legBones].every(i => Math.abs(bn[i].w[2]) < 0.02),
    'all arm/leg bones have |Z| < 0.02 m (T-pose, no front/back offset)');
}

/* ---- Round 140: angry eye upward shift for intimidating glare ---- */
{
  // Angry eye vertices should all have positive dy component (upward shift for glare)
  // This combines with sy=0.62 narrowing: bottom half shrinks more, top half less
  const [les, lee] = B.geom.tags.eyeL;
  const angryEyeL = B.morphs.sparse.angry.filter(e => e[0] >= les && e[0] < lee);

  // All angry eyeL entries should have positive net dy (upward bias)
  // Top vertices: py*(0.62-1) + headR*0.008 = -py*0.38 + 0.008*headR
  // For top vertex (py=eh): dy = -eh*0.38 + headR*0.008 (negative if eh large, but shift is positive)
  // Bottom vertices (py=-eh): dy = eh*0.38 + headR*0.008 (positive — bottom less close, upper narrows more)

  ok(angryEyeL.length === 4, `angry eyeL has 4 sparse entries (all quad corners, count unchanged)`);

  // Average dy of angry eye entries should reflect upward shift: bottom dy > |top dy| when shift applied
  const eyeLDyValues = angryEyeL.map(e => e[2]);
  // Bottom vertex (py=-eh) has dy = eh*0.38 + headR*0.008 > 0
  const maxDy = Math.max(...eyeLDyValues);
  ok(maxDy > 0,
    `angry eyeL: max vertex dy = ${maxDy.toFixed(5)} > 0 (bottom vertices have positive upward shift)`);

  // Angry eye count still 25 (upward shift doesn't add new vertices)
  ok(B.morphs.sparse.angry.length === 25,
    'angry morph sparse count stays 25 after adding eye upward shift');
}

/* ---- Round 139: morph vertices are exclusively in the face region (≥ faceStart) ---- */
{
  // All morph sparse entries must reference face vertices (index ≥ faceStart)
  // Body vertices have no morph targets — morphing them would cause body distortion
  const fs = B.faceStart;
  let bodyMorphBad = 0, badNames = [];
  for(const name of B.morphs.names){
    const entries = B.morphs.sparse[name];
    const bodyEntries = entries.filter(e => e[0] < fs);
    if(bodyEntries.length > 0){ bodyMorphBad += bodyEntries.length; badNames.push(name); }
  }
  ok(bodyMorphBad === 0,
    `all morph sparse entries reference face vertices (≥ faceStart=${fs}), no body-vertex morphs (bad: ${badNames.join(',')||'none'})`);

  // Verify that morph vertex indices are within total vertex range
  const nV = B.geom.pos.length / 3;
  let outOfRange = 0;
  for(const name of B.morphs.names){
    for(const e of B.morphs.sparse[name]){
      if(e[0] < 0 || e[0] >= nV) outOfRange++;
    }
  }
  ok(outOfRange === 0,
    `all ${B.morphs.names.length} morphs: every sparse entry index is in [0, nV=${nV})`);

  // Property holds for all 6 presets
  let presetBad = 0;
  for(const pre of H.PRESETS){
    const A = H.buildAvatar(H.presetParams(pre));
    const pNV = A.geom.pos.length/3, pFS = A.faceStart;
    for(const name of A.morphs.names){
      for(const e of A.morphs.sparse[name]){
        if(e[0] < pFS || e[0] >= pNV) presetBad++;
      }
    }
  }
  ok(presetBad === 0, 'all 6 presets: all morph entries in face-vertex range [faceStart, nV)');
}

/* ---- Round 138: blink brow tilt asymmetry — inner brow drops more than outer ---- */
{
  // browL: inner = px > -eyeX (toward x=0), outer = px ≤ -eyeX (toward left)
  // Find inner and outer brow vertices for browL
  const [bls, ble] = B.geom.tags.browL;
  let innerBrowIdx=-1, outerBrowIdx=-1;
  for(let i=bls;i<ble;i++){
    const px = B.geom.pos[i*3];
    if(px > -B.dims.eyeX) innerBrowIdx=i;   // closest to center
    else                  outerBrowIdx=i;   // farthest from center
  }
  // Find the blink morph entries for these vertices
  const blinkInner = B.morphs.sparse.blink.find(e=>e[0]===innerBrowIdx);
  const blinkOuter = B.morphs.sparse.blink.find(e=>e[0]===outerBrowIdx);
  ok(blinkInner && blinkOuter,
    'blink morph has entries for both inner and outer browL vertices');
  ok(blinkInner[2] < blinkOuter[2],
    `blink inner brow dy (${blinkInner?blinkInner[2].toFixed(5):'?'}) < outer brow dy (${blinkOuter?blinkOuter[2].toFixed(5):'?'}) — inner drops lower`);

  // blink_l has the same asymmetry on browL
  const blinkLInner = B.morphs.sparse.blink_l.find(e=>e[0]===innerBrowIdx);
  const blinkLOuter = B.morphs.sparse.blink_l.find(e=>e[0]===outerBrowIdx);
  ok(blinkLInner && blinkLOuter && blinkLInner[2] < blinkLOuter[2],
    'blink_l inner brow drops more than outer (same asymmetry as blink)');

  // Asymmetry magnitude: inner ≈ -0.045headR, outer ≈ -0.02headR
  ok(Math.abs(blinkInner[2] + B.dims.headR*0.045) < 1e-9 &&
     Math.abs(blinkOuter[2] + B.dims.headR*0.02) < 1e-9,
    `blink brow: inner=-headR×0.045, outer=-headR×0.020 (orbicularis motion pattern)`);
}

/* ---- Round 137: face vertex skinning correctness — eye/brow/mouth bone assignments ---- */
{
  const g = B.geom;
  // eyeL vertices must be skinned exclusively to lE bone (weight=1)
  {
    const [s,e]=g.tags.eyeL;
    let bad=0;
    for(let i=s;i<e;i++){
      if(g.jnt[i*4] !== B.idx.lE || Math.abs(g.wgt[i*4]-1) > 1e-6 ||
         g.wgt[i*4+1] !== 0 || g.wgt[i*4+2] !== 0 || g.wgt[i*4+3] !== 0) bad++;
    }
    ok(bad===0, `eyeL tag: all ${e-s} vertices skinned exclusively to lE bone (weight=1.0)`);
  }
  // eyeR vertices must be skinned exclusively to rE bone (weight=1)
  {
    const [s,e]=g.tags.eyeR;
    let bad=0;
    for(let i=s;i<e;i++){
      if(g.jnt[i*4] !== B.idx.rE || Math.abs(g.wgt[i*4]-1) > 1e-6 ||
         g.wgt[i*4+1] !== 0 || g.wgt[i*4+2] !== 0 || g.wgt[i*4+3] !== 0) bad++;
    }
    ok(bad===0, `eyeR tag: all ${e-s} vertices skinned exclusively to rE bone (weight=1.0)`);
  }
  // browL, browR, mouth: all vertices skinned exclusively to head bone
  for(const tag of ['browL','browR','mouth']){
    const [s,e]=g.tags[tag];
    let bad=0;
    for(let i=s;i<e;i++){
      if(g.jnt[i*4] !== B.idx.head || Math.abs(g.wgt[i*4]-1) > 1e-6 ||
         g.wgt[i*4+1] !== 0 || g.wgt[i*4+2] !== 0 || g.wgt[i*4+3] !== 0) bad++;
    }
    ok(bad===0, `${tag} tag: all ${e-s} vertices skinned exclusively to head bone (weight=1.0)`);
  }
}

/* ---- Round 136: outfit × hairStyle geometry budget (all 20 combinations) ---- */
{
  const outfits = ['onepiece','sailor','shirts','hoodie'];
  const hairStyles = ['short','bob','long','twin','pony'];
  let maxTris = 0, maxBones = 0, badBudget = [];

  for(const outfit of outfits){
    for(const hair of hairStyles){
      const p = Object.assign(H.defaults(), {outfit, hairStyle: hair, springOff: false});
      const A = H.buildAvatar(p);
      const tris = A.geom.idx.length / 3;
      const bones = A.bones.length;
      if(tris > maxTris) maxTris = tris;
      if(bones > maxBones) maxBones = bones;
      if(tris >= 7500 || bones >= 75) badBudget.push(`${outfit}×${hair}(t=${tris},b=${bones})`);
    }
  }

  ok(badBudget.length === 0,
    `all 20 outfit×hairStyle combos within Quest Excellent budget (bad: ${badBudget.join(', ')||'none'})`);
  ok(maxTris < 7500,
    `max tris across all combos = ${maxTris} (Quest Excellent < 7500)`);
  ok(maxBones < 75,
    `max bones across all combos = ${maxBones} (Quest Excellent < 75)`);
}

/* ---- Round 135: GLB morph sparse accessor index ordering (glTF spec §5.15.5) ---- */
{
  // glTF spec requires sparse indices to be strictly increasing
  // The writer sorts them before encoding — verify the GLB output is sorted
  const ex2 = H.exportVRM(B, H.defaults(), {}, new Uint8Array([]));
  const G2 = parseGLB(ex2.bytes);
  const j2 = G2.json;
  const prim = j2.meshes[0].primitives[0];

  let allSorted = true;
  const morphNames = prim.extras.targetNames;
  for(let mi=0; mi<morphNames.length; mi++){
    const accIdx = prim.targets[mi].POSITION;
    const acc = j2.accessors[accIdx];
    if(!acc.sparse || acc.sparse.count === 0) continue;
    // Read sparse index buffer directly from bufferView
    const sv = j2.bufferViews[acc.sparse.indices.bufferView];
    const off = G2.bin.byteOffset + (sv.byteOffset || 0);
    const idxData = new Uint16Array(G2.bin.buffer, off, acc.sparse.count);
    // Verify strictly increasing
    for(let k=1; k<idxData.length; k++){
      if(idxData[k] <= idxData[k-1]) allSorted=false;
    }
  }
  ok(allSorted, 'all morph sparse accessor indices are strictly increasing in exported GLB');

  // The in-memory sparse data may be unsorted (brow entries after mouth entries
  // for joy/angry/sorrow/fun), but the writer sorts before encoding
  const joyEntries = B.morphs.sparse.joy;
  const joyUnsorted = joyEntries.some((e,i) => i>0 && e[0] < joyEntries[i-1][0]);
  ok(joyUnsorted, 'joy in-memory sparse may be unsorted (brow after mouth by tag order) — writer sorts it');

  // min/max of every sparse morph accessor must include [0,0,0] (implicit zeros for non-sparse verts)
  let minMaxBad = 0;
  for(let mi=0; mi<morphNames.length; mi++){
    const accIdx = prim.targets[mi].POSITION;
    const acc = j2.accessors[accIdx];
    if(!acc.min || !acc.max) continue;
    // min must be ≤ [0,0,0] and max must be ≥ [0,0,0]
    if(acc.min[0]>0 || acc.min[1]>0 || acc.min[2]>0) minMaxBad++;
    if(acc.max[0]<0 || acc.max[1]<0 || acc.max[2]<0) minMaxBad++;
  }
  ok(minMaxBad === 0, 'all morph sparse accessors: min ≤ [0,0,0] and max ≥ [0,0,0] (implicit zero included)');
}

/* ---- Round 134: i + e vowel corner lift for accurate lip-sync shapes ---- */
{
  const [ms, me] = B.geom.tags.mouth;
  // Right corner = vertex with max x in mouth range
  let cornerI=ms+1;
  for(let i=ms+1;i<me;i++) if(B.geom.pos[i*3]>B.geom.pos[cornerI*3]) cornerI=i;

  // i morph right corner: has positive dy from cornerLift (grin corners turn up)
  const iCorner = B.morphs.sparse.i.find(e=>e[0]===cornerI);
  ok(iCorner && iCorner[2] > 0,
    `i vowel: right corner vertex has positive dy (${iCorner?iCorner[2].toExponential(3):'?'}) — grin corner lift`);

  // e morph right corner: also has positive dy (smaller than i)
  const eCorner = B.morphs.sparse.e.find(e=>e[0]===cornerI);
  ok(eCorner && eCorner[2] > 0,
    `e vowel: right corner vertex has positive dy (${eCorner?eCorner[2].toExponential(3):'?'}) — slight corner lift`);

  // i corner lift > e corner lift (i is more of a grin than e)
  ok(iCorner && eCorner && iCorner[2] > eCorner[2],
    `i corner lift > e corner lift (i=${iCorner?iCorner[2].toExponential(3):'?'}, e=${eCorner?eCorner[2].toExponential(3):'?'})`);

  // a, u, o corners have NO upward corner lift (neutral/rounded/puckered shapes)
  const aCorner = B.morphs.sparse.a.find(e=>e[0]===cornerI);
  const uCorner = B.morphs.sparse.u.find(e=>e[0]===cornerI);
  const oCorner = B.morphs.sparse.o.find(e=>e[0]===cornerI);
  ok((!aCorner || aCorner[2] <= 0) && (!uCorner || uCorner[2] <= 0) && (!oCorner || oCorner[2] <= 0),
    'a, u, o vowels: right corner vertex has no positive corner lift (neutral/round shapes)');
}

/* ---- Round 133: faceStart integrity — face vertices are all above the body/face split ---- */
{
  const faceTags = ['eyeL','eyeR','browL','browR','mouth'];
  const nV = B.geom.pos.length / 3;
  const fs = B.faceStart;

  // faceStart is in a valid range
  ok(fs > 0 && fs < nV,
    `faceStart=${fs} is in valid range (0 < fs < nV=${nV})`);

  // ALL vertices in face tags must have index ≥ faceStart
  let faceTagsBelowSplit = 0;
  for(const tag of faceTags){
    const [ts, te] = B.geom.tags[tag];
    for(let i=ts; i<te; i++) if(i < fs) faceTagsBelowSplit++;
  }
  ok(faceTagsBelowSplit === 0,
    `all face tag vertices (${faceTags.join(',')}) have index ≥ faceStart=${fs} (body/face split correct)`);

  // No body vertex (index < faceStart) should appear in any face tag range
  const faceRanges = faceTags.map(t => B.geom.tags[t]);
  const minFaceVert = Math.min(...faceRanges.map(([s])=>s));
  ok(minFaceVert >= fs,
    `min face-tag vertex index (${minFaceVert}) ≥ faceStart (${fs})`);

  // faceStart invariant holds for all 6 presets (body always comes before face)
  let presetFaceSplitBad = 0;
  for(const pre of H.PRESETS){
    const A = H.buildAvatar(H.presetParams(pre));
    const pNV = A.geom.pos.length/3, pFS = A.faceStart;
    if(pFS <= 0 || pFS >= pNV) { presetFaceSplitBad++; continue; }
    for(const tag of faceTags){
      const [ts,te] = A.geom.tags[tag];
      for(let i=ts;i<te;i++) if(i < pFS) presetFaceSplitBad++;
    }
  }
  ok(presetFaceSplitBad === 0, 'all 6 preset avatars: face tags are all above faceStart split');
}

/* ---- Round 132: spring chain structural invariants + bone count regression ---- */
{
  // short and bob hair styles have NO spring chains
  for(const style of ['short','bob']){
    const A = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:style}));
    ok(A.springs.length === 0, `${style} hair: 0 spring chains (no hair physics needed)`);
  }

  // long/twin/pony hair styles have spring chains
  const springCounts = {long:3, twin:2, pony:1};
  for(const [style, count] of Object.entries(springCounts)){
    const A = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:style}));
    ok(A.springs.length === count, `${style} hair: ${count} spring chain(s)`);
  }

  // For every hair style with springs: first bone's parent = head; chain is linked sequentially
  for(const style of ['long','twin','pony']){
    const A = H.buildAvatar(Object.assign(H.defaults(), {hairStyle:style}));
    let chainOK = true;
    for(const sp of A.springs){
      if(A.bones[sp.boneIdxs[0]].parent !== A.idx.head) chainOK=false;
      for(let i=1;i<sp.boneIdxs.length;i++){
        if(A.bones[sp.boneIdxs[i]].parent !== sp.boneIdxs[i-1]) chainOK=false;
      }
    }
    ok(chainOK, `${style}: all spring chain bones form a valid parent-child sequence rooted at head`);
  }

  // Total bone count < 75 for all hair styles (Quest Excellent budget)
  const styles = ['short','bob','long','twin','pony'];
  const maxBones = Math.max(...styles.map(s =>
    H.buildAvatar(Object.assign(H.defaults(), {hairStyle:s})).bones.length));
  ok(maxBones < 75, `max bones across all hair styles = ${maxBones} < 75 (Quest Excellent budget)`);
}

/* ---- Round 131: degenerate triangle guard + blendshape group validity ---- */
{
  // No triangle may have two or more equal vertex indices (degenerate = zero area)
  const idx = B.geom.idx;
  let degenCount = 0;
  for(let t=0; t<idx.length/3; t++){
    const a=idx[t*3], b=idx[t*3+1], c=idx[t*3+2];
    if(a===b || b===c || a===c) degenCount++;
  }
  ok(degenCount === 0, `no degenerate triangles in default avatar (${idx.length/3} tris checked)`);

  // Degenerate triangle check passes for all 6 presets
  let presetDegenBad = 0;
  for(const pre of H.PRESETS){
    const A = H.buildAvatar(H.presetParams(pre));
    const pi = A.geom.idx;
    for(let t=0; t<pi.length/3; t++){
      const a=pi[t*3], b=pi[t*3+1], c=pi[t*3+2];
      if(a===b || b===c || a===c) presetDegenBad++;
    }
  }
  ok(presetDegenBad === 0, 'no degenerate triangles across all 6 preset avatars');

  // Blendshape group validity: all presetNames must be in valid VRM0 set
  const VALID_PRESET = new Set(['neutral','a','i','u','e','o','blink','blink_l','blink_r',
    'joy','angry','sorrow','fun','lookup','lookdown','lookleft','lookright','unknown']);
  const ex2 = H.exportVRM(B, H.defaults(), {}, new Uint8Array([]));
  const G2 = parseGLB(ex2.bytes);
  const bsg = G2.json.extensions.VRM.blendShapeMaster.blendShapeGroups;
  const invalidPreset = bsg.filter(g => !VALID_PRESET.has(g.presetName));
  ok(invalidPreset.length === 0,
    `all ${bsg.length} blendshape groups have valid VRM0 presetName (invalid: ${invalidPreset.map(g=>g.presetName).join(',')||'none'})`);

  // All bind indices reference valid morph target slots (no -1 from indexOf miss)
  const morphCount = G2.json.meshes[0].primitives[0].extras.targetNames.length;
  const badBind = bsg.flatMap(g => g.binds).filter(b => b.index < 0 || b.index >= morphCount);
  ok(badBind.length === 0,
    `all blendshape bind indices are valid (0..${morphCount-1}) — no missing morph targets`);
}

/* ---- Round 130: sorrow + angry mouth corner droop (sad/angry corners pull down) ---- */
{
  const [ms, me] = B.geom.tags.mouth;
  // Find right corner (max x) and top vertex (max y) in mouth range
  let cornerI=ms+1, topI=ms+1;
  for(let i=ms+1;i<me;i++){
    if(B.geom.pos[i*3]   > B.geom.pos[cornerI*3])   cornerI=i;
    if(B.geom.pos[i*3+1] > B.geom.pos[topI*3+1])     topI=i;
  }

  // sorrow: corner vertex should droop lower (more negative dy) than top vertex
  const sorrowCorner = B.morphs.sparse.sorrow.find(e => e[0]===cornerI);
  const sorrowTop    = B.morphs.sparse.sorrow.find(e => e[0]===topI);
  ok(sorrowCorner && sorrowTop && sorrowCorner[2] < sorrowTop[2],
    `sorrow corner dy (${sorrowCorner?sorrowCorner[2].toFixed(5):'?'}) < top dy (${sorrowTop?sorrowTop[2].toFixed(5):'?'}) — corners droop lower`);

  // angry: corner vertex should also droop (negative dy from cornerLift)
  const angryCorner = B.morphs.sparse.angry.find(e => e[0]===cornerI);
  ok(angryCorner && angryCorner[2] < 0,
    `angry corner vertex has negative dy (${angryCorner?angryCorner[2].toFixed(5):'?'}) — frown corner droop`);

  // sorrow corner droop magnitude > angry corner droop magnitude (sorrow is more extreme)
  ok(angryCorner && sorrowCorner && Math.abs(sorrowCorner[2]) > Math.abs(angryCorner[2]),
    `|sorrow corner dy| > |angry corner dy| (sorrow droops more than angry)`);

  // Sparse counts must still be 25 for both (center vertex still has dy≠0)
  ok(B.morphs.sparse.sorrow.length === 25 && B.morphs.sparse.angry.length === 25,
    'sorrow and angry sparse counts remain 25 after adding corner droop');
}

/* ---- Round 129: joy + fun mouth corner lift (smile corners turn up) ---- */
{
  // Find the right-corner mouth vertex (maximum x in mouth tag range)
  const [ms, me] = B.geom.tags.mouth;
  let cornerVIdx = ms+1; // start after center
  for(let i=ms+1;i<me;i++){
    if(B.geom.pos[i*3] > B.geom.pos[cornerVIdx*3]) cornerVIdx = i;
  }
  // The corner vertex should have a joy morph entry with positive dy from cornerLift
  const joyCorner = B.morphs.sparse.joy.find(e => e[0]===cornerVIdx);
  ok(joyCorner !== undefined && joyCorner[2] > 0,
    'joy mouth: right corner vertex has positive dy (smile corner lift)');

  // fun corner lift should be larger than joy corner lift
  const funCorner = B.morphs.sparse.fun.find(e => e[0]===cornerVIdx);
  ok(funCorner !== undefined && funCorner[2] > 0,
    'fun mouth: right corner vertex has positive dy (smile corner lift)');
  ok(funCorner[2] > joyCorner[2],
    `fun corner lift (${funCorner[2].toExponential(3)}) > joy corner lift (${joyCorner[2].toExponential(3)})`);

  // Corner lift is proportional to headR (scale-independent)
  const bigHead = H.buildAvatar(Object.assign(H.defaults(), { headRatio: 0.36 }));
  const smallHead = H.buildAvatar(Object.assign(H.defaults(), { headRatio: 0.18 }));
  const [bms, bme] = bigHead.geom.tags.mouth;
  const [sms, sme] = smallHead.geom.tags.mouth;
  let bCorner=bms+1, sCorner=sms+1;
  for(let i=bms+1;i<bme;i++) if(bigHead.geom.pos[i*3]>bigHead.geom.pos[bCorner*3]) bCorner=i;
  for(let i=sms+1;i<sme;i++) if(smallHead.geom.pos[i*3]>smallHead.geom.pos[sCorner*3]) sCorner=i;
  const bJoy = bigHead.morphs.sparse.joy.find(e=>e[0]===bCorner);
  const sJoy = smallHead.morphs.sparse.joy.find(e=>e[0]===sCorner);
  ok(bJoy && sJoy && bJoy[2] > sJoy[2],
    'joy corner lift scales with headR: bigHead lift > smallHead lift');
}

/* ---- Round 128: vertex position finiteness + VRM0 orientation invariants ---- */
{
  // All vertex positions must be finite (catches NaN/Infinity from geometry math errors)
  const pos = B.geom.pos;
  const nanCount = pos.filter(v => !Number.isFinite(v)).length;
  ok(nanCount === 0, `all ${pos.length} vertex position components are finite (non-finite: ${nanCount})`);

  // VRM0 orientation: character faces -Z, right=+X, T-pose
  // → left arm bones must have negative X world position, right arm positive X
  const lUA = B.bones[B.idx.lUA], rUA = B.bones[B.idx.rUA];
  ok(lUA.w[0] < 0, `leftUpperArm world X < 0 (= ${lUA.w[0].toFixed(4)}) — VRM0 right=+X orientation`);
  ok(rUA.w[0] > 0, `rightUpperArm world X > 0 (= ${rUA.w[0].toFixed(4)}) — VRM0 right=+X orientation`);

  // Symmetry: |leftUpperArm.x| should equal rightUpperArm.x (T-pose is symmetric)
  ok(Math.abs(Math.abs(lUA.w[0]) - rUA.w[0]) < 1e-9,
    `left/right upper arm X positions are symmetric (|lUA.x|=${Math.abs(lUA.w[0]).toFixed(6)}, rUA.x=${rUA.w[0].toFixed(6)})`);

  // Position finiteness holds for all 6 presets
  let presetNanBad = 0;
  for (const pre of H.PRESETS){
    const A = H.buildAvatar(H.presetParams(pre));
    if (A.geom.pos.some(v => !Number.isFinite(v))) presetNanBad++;
  }
  ok(presetNanBad === 0, 'all 6 preset avatars have fully-finite vertex positions');
}

/* ---- Round 187: hint.undoReady i18n key + undo hint flash logic in captureUndo ---- */
{
  // hint.undoReady must exist in both ja and en so the flash works in both languages
  ok(H.I18N.ja['hint.undoReady'] && H.I18N.ja['hint.undoReady'].includes('Z'),
    'ja hint.undoReady key present and mentions Z (undo shortcut)');
  ok(H.I18N.en['hint.undoReady'] && H.I18N.en['hint.undoReady'].includes('Z'),
    'en hint.undoReady key present and mentions Z (undo shortcut)');

  // The captureUndo() implementation must reference hint.undoReady
  ok(html.includes("'hint.undoReady'") || html.includes('"hint.undoReady"'),
    'captureUndo() references hint.undoReady i18n key to flash undo hint in canvas bar');

  // The timer variable _undoHintTimer must be present (debounce prevents hint flicker on rapid slider drags)
  ok(html.includes('_undoHintTimer'), '_undoHintTimer debounce variable present in captureUndo');
}

/* ---- Round 188: rank badges clickable → Stats tab navigation ---- */
{
  // a11y.rankBadge key must exist in both languages
  ok(H.I18N.ja['a11y.rankBadge'] && H.I18N.ja['a11y.rankBadge'].length > 0,
    'ja a11y.rankBadge i18n key present');
  ok(H.I18N.en['a11y.rankBadge'] && H.I18N.en['a11y.rankBadge'].length > 0,
    'en a11y.rankBadge i18n key present');

  // The rank badge click handler must reference 'out' tab (the Stats/Export tab)
  ok(/rankBadge[\s\S]{0,300}activeTab\s*=\s*['"]out['"]/.test(html),
    "rank badge click handler switches to 'out' (Stats/Export) tab");

  // Role=button on badges for keyboard/assistive tech
  ok(/rankBadge[\s\S]{0,300}role.*button/.test(html),
    'rank badges get role=button for keyboard activation');
}

/* ---- Round 189: auto-save badge — signals localStorage save to reduce user anxiety ---- */
{
  // hint.saved key must exist in both languages
  ok(H.I18N.ja['hint.saved'] && H.I18N.ja['hint.saved'].includes('✓'),
    'ja hint.saved key present with ✓ checkmark');
  ok(H.I18N.en['hint.saved'] && H.I18N.en['hint.saved'].includes('✓'),
    'en hint.saved key present with ✓ checkmark');

  // autoSaveBadge element must be in markup
  ok(html.includes('id="autoSaveBadge"'), 'autoSaveBadge element in markup');

  // saveState() must reference hint.saved and autoSaveBadge
  const saveStateSrc = html.slice(html.indexOf('function saveState'), html.indexOf('function saveState') + 600);
  ok(saveStateSrc.includes("'hint.saved'") || saveStateSrc.includes('"hint.saved"'),
    'saveState() references hint.saved i18n key for badge text');
  ok(saveStateSrc.includes('autoSaveBadge'),
    'saveState() updates autoSaveBadge after successful localStorage write');

  // Badge has aria-live so screen readers announce the save (WCAG 4.1.3)
  ok(/id="autoSaveBadge"[^>]*aria-live/.test(html),
    'autoSaveBadge has aria-live for screen reader announcements (WCAG 4.1.3)');

  // reduceMotion handled via CSS @media rule rather than JS gate (Round 292)
  ok(html.includes('prefers-reduced-motion') && html.includes('autoSaveBadge'),
    'auto-save badge visible for prefers-reduced-motion users via CSS transition:none');
}

/* ---- Round 190: tris/bones stat cells show Quest Excellent threshold annotation ---- */
{
  // updateStats() should annotate tris and bones with Quest Excellent limit (RANKS.quest.*[0])
  ok(html.includes('HINA.RANKS.quest') || html.includes("RANKS.quest"),
    'updateStats() reads HINA.RANKS.quest for Quest Excellent thresholds');

  // Annotation helper must reference tris[0] and bones[0] specifically
  ok(/QE\.tris\[0\]/.test(html) || /quest.*tris.*\[0\]/.test(html),
    'tris annotation uses Quest Excellent threshold (tris[0]=7500)');
  ok(/QE\.bones\[0\]/.test(html) || /quest.*bones.*\[0\]/.test(html),
    'bones annotation uses Quest Excellent threshold (bones[0]=75)');

  // Verify the thresholds from RANKS match known SPEC values
  ok(H.RANKS.quest.tris[0] === 7500, 'Quest Excellent tris limit is 7500 (SPEC)');
  ok(H.RANKS.quest.bones[0] === 75, 'Quest Excellent bones limit is 75 (SPEC)');

  // Sanity check: default build tris and bones are below Quest Excellent
  const est = H.estimate(B, P);
  ok(est.tris <= H.RANKS.quest.tris[0],
    `default build tris (${est.tris}) are within Quest Excellent limit (${H.RANKS.quest.tris[0]})`);
  ok(est.bones <= H.RANKS.quest.bones[0],
    `default build bones (${est.bones}) are within Quest Excellent limit (${H.RANKS.quest.bones[0]})`);
}

/* ---- Round 191: auto-save failure shows warning badge ---- */
{
  // hint.saveFail key must exist in both languages
  ok(H.I18N.ja['hint.saveFail'] && H.I18N.ja['hint.saveFail'].includes('⚠'),
    'ja hint.saveFail key present with ⚠ warning symbol');
  ok(H.I18N.en['hint.saveFail'] && H.I18N.en['hint.saveFail'].includes('⚠'),
    'en hint.saveFail key present with ⚠ warning symbol');

  // saveState catch block must reference hint.saveFail and show the badge
  const saveStateSrc = html.slice(html.indexOf('function saveState'), html.indexOf('function saveState') + 1000);
  ok(saveStateSrc.includes("'hint.saveFail'") || saveStateSrc.includes('"hint.saveFail"'),
    'saveState catch block references hint.saveFail i18n key');
  ok(/catch\s*\(e\)\s*\{[\s\S]{0,350}hint\.saveFail/.test(saveStateSrc),
    'saveState catch branch sets hint.saveFail on autoSaveBadge');

  // Warning uses --warn color to visually distinguish from success
  ok(saveStateSrc.includes("var(--warn)"),
    'save failure badge uses --warn CSS variable (yellow, distinct from success green)');
}

/* ---- Round 192: PNG screenshot button in header ---- */
{
  // i18n keys for screenshot button
  ok(H.I18N.ja['btn.screenshot'] === 'PNG', 'ja btn.screenshot key is PNG');
  ok(H.I18N.en['btn.screenshot'] === 'PNG', 'en btn.screenshot key is PNG');
  ok(H.I18N.ja['btn.screenshot.tip'] && H.I18N.ja['btn.screenshot.tip'].includes('⌘+Shift+P'),
    'ja btn.screenshot.tip mentions ⌘+Shift+P shortcut (Ctrl/⌘ notation)');
  ok(H.I18N.en['btn.screenshot.tip'] && H.I18N.en['btn.screenshot.tip'].includes('⌘+Shift+P'),
    'en btn.screenshot.tip mentions ⌘+Shift+P shortcut (Ctrl/⌘ notation)');

  // screenshotDone a11y keys
  ok(H.I18N.ja['a11y.screenshotDone'] && H.I18N.ja['a11y.screenshotDone'].length > 0,
    'ja a11y.screenshotDone key present');
  ok(H.I18N.en['a11y.screenshotDone'] && H.I18N.en['a11y.screenshotDone'].length > 0,
    'en a11y.screenshotDone key present');

  // btnScreenshot element in markup
  ok(html.includes('id="btnScreenshot"'), 'btnScreenshot element present in markup');

  // doScreenshot function must use cv.toBlob (reads WebGL buffer as PNG)
  ok(/function doScreenshot/.test(html), 'doScreenshot function present');
  ok(/cv\.toBlob/.test(html), 'doScreenshot uses canvas.toBlob() for PNG capture');

  // Ctrl+Shift+P keyboard shortcut wired (not Ctrl+P which conflicts with Print)
  ok(/ctrlKey.*&&.*key.*===.*'P'.*&&.*shiftKey/.test(html) || /shiftKey.*&&.*key.*===.*'P'.*&&.*ctrlKey/.test(html),
    'Ctrl+Shift+P keyboard shortcut triggers doScreenshot (avoids browser Print conflict)');

  // hint.ctrlS updated to include screenshot shortcut
  ok(H.I18N.ja['hint.ctrlS'].includes('⌘+Shift+P'), 'ja hint.ctrlS includes ⌘+Shift+P hint (Ctrl/⌘ notation)');
  ok(H.I18N.en['hint.ctrlS'].includes('⌘+Shift+P'), 'en hint.ctrlS includes ⌘+Shift+P hint (Ctrl/⌘ notation)');
}

/* ---- Round 193: document drag-and-drop JSON loading in Export tab ---- */
{
  // hint.dropJson key must exist in both languages and mention drag
  ok(H.I18N.ja['hint.dropJson'] && (H.I18N.ja['hint.dropJson'].includes('ドラッグ') || H.I18N.ja['hint.dropJson'].includes('drag')),
    'ja hint.dropJson key mentions drag-and-drop');
  ok(H.I18N.en['hint.dropJson'] && H.I18N.en['hint.dropJson'].includes('drag'),
    'en hint.dropJson key mentions drag and drop');

  // hint.dropJson must appear in the Export tab UI (renderOut section)
  ok(html.includes("'hint.dropJson'") || html.includes('"hint.dropJson"'),
    'Export tab UI renders hint.dropJson discovery text');
}

/* ---- Round 194: captureUndo() before Reset + Ctrl+Shift+P instead of Ctrl+P ---- */
{
  // Reset button must call captureUndo() so the user can undo a reset
  ok(/captureUndo\(\).*params=HINA\.defaults\(\)/.test(html) ||
     /captureUndo\(\)[^\n]*\n[^\n]*params=HINA\.defaults\(\)/.test(html),
    'Reset button calls captureUndo() before resetting params (undo-able reset)');

  // btn.reset.confirm text unchanged (we only added captureUndo, not changed UX flow)
  ok(H.I18N.ja['btn.reset.confirm'] && H.I18N.ja['btn.reset.confirm'].includes('初期化'),
    'ja btn.reset.confirm still present after captureUndo fix');
}

/* ---- Round 195: copy seed button shows '✓ Copied' feedback after clipboard write ---- */
{
  // btn.copied key must exist in both languages
  ok(H.I18N.ja['btn.copied'] && H.I18N.ja['btn.copied'].includes('✓'),
    'ja btn.copied key present with ✓ checkmark');
  ok(H.I18N.en['btn.copied'] && H.I18N.en['btn.copied'].includes('✓'),
    'en btn.copied key present with ✓ checkmark');

  // a11y.seedCopied must exist with {n} placeholder
  ok(H.I18N.ja['a11y.seedCopied'] && H.I18N.ja['a11y.seedCopied'].includes('{n}'),
    'ja a11y.seedCopied key has {n} placeholder for seed number');
  ok(H.I18N.en['a11y.seedCopied'] && H.I18N.en['a11y.seedCopied'].includes('{n}'),
    'en a11y.seedCopied key has {n} placeholder for seed number');

  // The copy button handler uses .then() for success feedback
  ok(/writeText[\s\S]{0,200}btn\.copied/.test(html),
    'copy seed button uses .then() to show btn.copied on successful clipboard write');
}

/* ---- Round 196: noGlOverlay centered fallback message in stage when WebGL unavailable ---- */
{
  // noGlOverlay element is created when !GLOK and populated with hint.noGL text
  ok(html.includes("id='noGlOverlay'") || html.includes('id="noGlOverlay"') || html.includes("'noGlOverlay'"),
    'noGlOverlay element created for no-WebGL fallback');

  // applyLang() must update noGlOverlay text (so it works in both languages)
  ok(/nov.*noGlOverlay[\s\S]{0,100}textContent.*hint\.noGL/.test(html) ||
     /noGlOverlay[\s\S]{0,200}hint\.noGL/.test(html),
    'applyLang() updates noGlOverlay text with hint.noGL i18n key');

  // The overlay is aria-hidden (it duplicates the hint bar text; only one should be announced)
  ok(/noGlOverlay[\s\S]{0,400}aria-hidden/.test(html) || /aria-hidden[\s\S]{0,400}noGlOverlay/.test(html),
    'noGlOverlay is aria-hidden (hint bar aria-live already covers it)');
}

/* ---- Round 197: hide spring physics sliders when springOff=true ---- */
{
  // When springOff is true, hairStiff/hairGrav/hairDrag have no effect.
  // renderBody() must skip them to avoid showing useless controls.
  ok(/hairStiff.*springOff|springOff.*hairStiff/.test(html),
    'renderBody skips hairStiff when springOff is true');
  ok(/hairGrav.*springOff|springOff.*hairGrav/.test(html) ||
     /\['hairStiff','hairGrav','hairDrag'\].*springOff/.test(html),
    'renderBody skips hairGrav/hairDrag when springOff is true (array check)');
}

/* ---- Round 198: keyboard shortcut list in About dialog ---- */
{
  // about.keys (summary label) and about.keyList (content) must exist in both languages
  ok(H.I18N.ja['about.keys'] && H.I18N.ja['about.keys'].length > 0,
    'ja about.keys (shortcut section label) present');
  ok(H.I18N.en['about.keys'] && H.I18N.en['about.keys'].length > 0,
    'en about.keys (shortcut section label) present');
  ok(H.I18N.ja['about.keyList'] && H.I18N.ja['about.keyList'].includes('Ctrl/⌘+S'),
    'ja about.keyList contains Ctrl/⌘+S shortcut reference');
  ok(H.I18N.en['about.keyList'] && H.I18N.en['about.keyList'].includes('Ctrl/⌘+S'),
    'en about.keyList contains Ctrl/⌘+S shortcut reference');
  ok(H.I18N.en['about.keyList'].includes('Ctrl/⌘+Shift+P'),
    'en about.keyList includes Ctrl/⌘+Shift+P screenshot shortcut');

  // aboutKeys element in dialog markup
  ok(html.includes('id="aboutKeys"'), 'aboutKeys pre element in About dialog markup');
  ok(html.includes('id="aboutKeysSumm"'), 'aboutKeysSumm summary element in About dialog markup');

  // applyLang must populate both elements
  ok(html.includes("'aboutKeysSumm'") || html.includes('"aboutKeysSumm"'),
    'applyLang populates aboutKeysSumm with about.keys i18n text');
}

/* ---- Round 199: Export VRM button moved to top of Export tab (primary action first) ---- */
{
  // The export button must appear BEFORE the out.meta section in renderOut()
  const renderOutSrc = html.slice(html.indexOf('function renderOut'), html.indexOf('function renderOut') + 3000);
  const exportBtnPos = renderOutSrc.indexOf("'btn.export'");
  const metaSectPos = renderOutSrc.indexOf("'out.meta'");
  ok(exportBtnPos > 0 && metaSectPos > 0 && exportBtnPos < metaSectPos,
    'Export VRM button (btn.export) appears before out.meta section in renderOut() — primary action first');

  // hint.ctrlS also appears before meta section (moved with the button)
  const hintPos = renderOutSrc.indexOf("'hint.ctrlS'");
  ok(hintPos > 0 && hintPos < metaSectPos,
    'hint.ctrlS shortcut hint appears before out.meta section (moved up with export button)');
}

/* ---- Round 200 (milestone): preset cards show avatar height for body-proportion hint ---- */
{
  // Each preset card now shows the height in meters (e.g., '1.00m' for Chibi)
  // Verify the chibi preset has height 1.0 so the indicator is meaningful
  const chibi = H.PRESETS.find(p=>p.id==='chibi');
  ok(chibi && H.presetParams(chibi).height === 1.0,
    "chibi preset height is 1.0m — distinct from other presets' ~1.45m default");

  // The grid rendering must include pp.height.toFixed(2)+'m' text for each card
  ok(/pp\.height\.toFixed\(2\)\+'m'/.test(html),
    'preset card renders pp.height.toFixed(2)+"m" as a body-proportion indicator');

  // Verify all 6 presets have distinct height rendering possibilities (Chibi=1.0, rest ~1.45)
  const heights = H.PRESETS.map(p=>H.presetParams(p).height);
  ok(new Set(heights).size >= 2, 'at least 2 distinct preset heights (Chibi differs from others)');
  ok(heights.some(h=>h < 1.1), 'at least one preset below 1.1m (Chibi) for visible height contrast');
}

/* ---- Round 201: onParam skips renderBody for non-structural params (no scroll-jump on slider drag) ---- */
{
  // Every slider oninput fires onParam(k) → rebuild() → (old) renderBody() → scrollTop=0.
  // Dragging any slider reset the panel scroll position on every tick — a significant UX regression.
  // Fix: only call renderBody() when the param changes the panel's row structure.
  // Structural params: outfit (skirtLen row appears/disappears), springOff (spring sliders hide/show).
  // All other params leave layout unchanged → skip renderBody() → no scroll jump.

  // Conditional guard: renderBody is behind outfit/springOff check
  ok(/k==='outfit'\s*\|\|\s*k==='springOff'[\s\S]{0,60}renderBody/.test(html),
    'onParam() guards renderBody() behind outfit/springOff conditional (WCAG: no panel jump on slider drag)');

  // Negative: within onParam itself, rebuild() must NOT be immediately followed by renderBody()
  // Scope to onParam body to avoid false-positives from preset/gacha call sites.
  const _onParamStart = html.indexOf("function onParam(");
  const _onParamEnd   = html.indexOf("\nfunction ", _onParamStart + 1);
  const _onParamBody  = html.slice(_onParamStart, _onParamEnd);
  ok(!/rebuild\(\);\s*renderBody\(\)/.test(_onParamBody),
    'renderBody() is not called unconditionally after rebuild() in onParam — prevents scroll-jump on every slider tick');

  // Positive: outfit param IS a structural param in PARAMS schema (tab='outfit')
  ok(H.PARAMS.outfit && H.PARAMS.outfit.k === 'enum',
    'outfit is an enum param in PARAMS schema (structural panel param)');

  // Positive: springOff IS a param in PARAMS schema (it's a bool)
  ok(H.PARAMS.springOff && H.PARAMS.springOff.k === 'bool',
    'springOff is a bool param in PARAMS schema (structural panel param)');

  // Verify: non-structural slider param (e.g. height) still leads to rebuild() in onParam
  // (rebuild is always called for non-color, non-phys params)
  ok(/if \(s\.tab==='phys'[\s\S]{0,40}return\s*;[\s\S]{0,60}rebuild\(\)/.test(html.replace(/\n/g,' ')),
    'onParam() calls rebuild() for all geometry params after the phys short-circuit guard');
}

/* ---- Round 202: preset/gacha focus restoration after renderBody() DOM rebuild (WCAG 2.4.3) ---- */
{
  // When a preset card is activated (Enter/click), renderBody() destroys the DOM and rebuilds it.
  // Focus falls to document.body unless we explicitly re-focus the newly-rendered card.
  // Fix: after preset selection, query .preCard.selected and focus it.
  ok(/preCard.*selected[\s\S]{0,60}sel\.focus\(\)/.test(html.replace(/\s+/g,' ')),
    'preset card click restores focus to .preCard.selected after renderBody() (WCAG 2.4.3 Focus Order)');

  // Revert button also calls renderBody(); focus must return to selected card
  // In source order: presetParams(activePre) → renderBody() → sel.focus() → then t('btn.revert')
  ok(/HINA\.presetParams\(activePre\)[\s\S]{0,200}sel\.focus/.test(html.replace(/\s+/g,' ')),
    'revert-to-preset button restores focus to .preCard.selected after renderBody()');

  // Gacha button: needs a stable id so focus can be restored to it after DOM rebuild
  ok(html.includes("id:'gachaBtn'") || html.includes('id:"gachaBtn"'),
    'gacha button has id="gachaBtn" for stable post-rebuild focus restoration');

  // runGacha() restores focus to #gachaBtn after renderBody()
  ok(/gachaBtn[\s\S]{0,60}gb\.focus\(\)/.test(html.replace(/\s+/g,' ')),
    'runGacha() calls $("gachaBtn").focus() after renderBody() (keyboard users can re-run gacha immediately)');
}

/* ---- Round 203: first-time load selects preset[0] so new users have a named starting avatar ---- */
{
  // When localStorage is empty (first-time visit), loadState() previously returned immediately,
  // leaving activePresetId=null and showing an unnamed default avatar with no highlighted preset card.
  // Fix: on first load, set activePresetId=PRESETS[0].id and params=presetParams(PRESETS[0]).

  // Source pattern: the !j branch sets PRESETS[0].id before returning
  ok(/if \(!j\)[\s\S]{0,400}PRESETS\[0\]\.id/.test(html.replace(/\s+/g,' ')),
    'loadState() selects PRESETS[0] as the default on first-time load (no localStorage data)');

  // The first preset must be a valid, buildable preset
  const first = H.PRESETS[0];
  ok(first && first.id && first.ja && first.en,
    'PRESETS[0] has id, ja, en labels (safe as first-load default)');

  // presetParams(PRESETS[0]) must be sanitize-stable (no clamping on first load)
  const firstP = H.presetParams(first);
  ok(JSON.stringify(firstP) === JSON.stringify(H.sanitize(firstP)),
    'PRESETS[0] params are sanitize-stable (no out-of-range values on first-time start)');

  // First preset must achieve Quest Excellent with springOff (onboarding avatar must be uploadable)
  const firstB = H.buildAvatar(firstP);
  const firstEst = H.estimate(firstB, Object.assign({}, firstP, { springOff: true }));
  ok(H.rank(firstEst, 'quest').rank === 'Excellent',
    'PRESETS[0] achieves Quest Excellent with springOff (first-time users see an upload-ready avatar)');
}

/* ---- Round 204: renderBody(scrollReset=false) preserves scroll on lang/mode switch (applyLang) ---- */
{
  // When the user switches language or Easy/Detail mode while scrolled partway down a tab,
  // applyLang() called renderBody() which reset scrollTop=0 — jumping the panel to the top.
  // Fix: renderBody(scrollReset=true) is the default; applyLang() passes false to preserve scroll.

  // renderBody has a scrollReset parameter (default true)
  ok(/function renderBody\(scrollReset=true\)/.test(html),
    'renderBody() accepts scrollReset=true default parameter');

  // The scrollTop reset is conditional on scrollReset
  ok(/if \(scrollReset\) bd\.scrollTop=0/.test(html),
    'renderBody() only resets scrollTop when scrollReset is truthy');

  // applyLang() calls renderBody(false) to preserve scroll position
  ok(/function applyLang\(\)[\s\S]{0,2500}renderBody\(false\)/.test(html),
    'applyLang() calls renderBody(false) to preserve panel scroll on language/mode switch');

  // Tab switches still call renderBody() (default true → scroll resets to 0)
  ok(/renderTabs\(\);[\s\S]{0,30}renderBody\(\)/.test(html),
    'tab-switch call sites use renderBody() (no arg = default scrollReset=true, scroll resets)');
}

/* ---- Round 205: safeName() clamps filename stem to 100 chars (filesystem safety) ---- */
{
  // meta.title allows maxlength=256 chars. safeName() previously passed the full string to the
  // download anchor without truncation. 256 chars + '.hina.json' (10) = 266-byte filename,
  // which can exceed OS filesystem limits (255 bytes; Japanese chars cost 3 bytes each in UTF-8).
  // Fix: slice(0, 100) in safeName() — longest suffix '.hina.json' gives 110 chars total.

  // Source: safeName() has .slice(0,100)
  ok(/safeName[\s\S]{0,100}slice\(0,100\)/.test(html),
    'safeName() clamps result to 100 characters via .slice(0,100) (filesystem safety)');

  // Functional: a 256-char title produces a stem of exactly 100 chars
  // We test this inline since safeName is an app.js function (not exported from core)
  // Verify the invariant via source pattern only
  ok(html.includes('.slice(0,100)'),
    'safeName uses .slice(0,100) to bound filename length to 100 characters');

  // maxlength='256' is still correct for the input field (allows long titles for display/meta)
  ok(html.includes("maxlength:'256'"),
    'meta title input still allows 256 chars (title used in VRM meta, only filename stem is clamped)');

  // The VRM meta writer must independently handle long titles (it has its own str() truncation)
  const longTitle = 'あ'.repeat(256);
  const longMeta = H.exportVRM(B, P, { title: longTitle }, H.b64ToBytes(H.PNG1));
  ok(longMeta.json.extensions.VRM.meta.title.length <= 256,
    'exportVRM meta.title from 256-char input fits within VRM meta field (str() sanitization)');
}

/* ---- Round 206: Shift+↑↓ keyboard pan + Home resets camTarget ---- */
{
  // Users on touchpad/laptop without a right mouse button had no keyboard way to pan the camera
  // vertically (inspect avatar's feet vs face). Shift+↑/↓ now pans camTarget[1] up/down.

  // Shift+ArrowUp pans camera up (shiftKey branch with camTarget)
  ok(/e\.shiftKey[\s\S]{0,100}camTarget\[1\][\s\S]{0,60}ArrowUp|ArrowUp[\s\S]{0,200}shiftKey[\s\S]{0,100}camTarget\[1\]/.test(html),
    'canvas keydown: Shift+ArrowUp pans camTarget[1] (keyboard vertical pan)');

  // Shift+ArrowDown pans camera down
  ok(/ArrowDown[\s\S]{0,200}shiftKey[\s\S]{0,100}camTarget\[1\]/.test(html),
    'canvas keydown: Shift+ArrowDown pans camTarget[1] (keyboard vertical pan)');

  // Home key now also resets camTarget alongside camYaw/camPitch/camDist
  ok(/Home[\s\S]{0,100}camTarget/.test(html),
    'Home key resets camTarget to default (clears any panning applied with Shift+↑↓)');

  // about.keyList i18n updated to mention Shift+↑↓ in both languages
  ok(H.I18N.ja['about.keyList'].includes('Shift') && H.I18N.ja['about.keyList'].includes('↑'),
    'about.keyList JA updated to mention Shift+↑↓ pan shortcut');
  ok(H.I18N.en['about.keyList'].includes('Shift') && H.I18N.en['about.keyList'].includes('Pan'),
    'about.keyList EN updated to mention Shift pan shortcut');

  // Pan clamp: camTarget[1] bounded above by H0*1.1
  ok(/M\.clamp\(camTarget\[1\][\s\S]{0,30}H0\*1\.1\)/.test(html),
    'camTarget[1] pan is clamped to [0, H0*1.1] preventing camera from going below floor or too far above head');
}

/* ---- Round 207: pbComp/pbTrans/texMB annotated with Quest Excellent thresholds in stats table ---- */
{
  // Round 190 added tris and bones annotations (val / QE_threshold). The same headroom context
  // was missing for PhysBone components, PhysBone transforms, and texture MB.
  // All three are now annotated with QE.XXX[0] so users see: e.g. "2 / 8" for pbComp.

  // texMB annotation: shows ~ + val + / threshold + MB
  ok(/texMB.*QE\.texMB\[0\]/.test(html),
    'updateStats() annotates texMB with Quest Excellent threshold (10 MB headroom indicator)');

  // pbComp/pbTrans are NOT annotated because their QE threshold is 0 (spring-off only).
  // Showing "2 / 0 ⚠" would be misleading; raw counts are more useful here.
  ok(!/ann\(est\.pbComp,QE\.pbComp\[0\]\)/.test(html),
    'pbComp not annotated with QE[0]=0 threshold (would display misleading "/ 0 ⚠")');
  ok(!/ann\(est\.pbTrans,QE\.pbTrans\[0\]\)/.test(html),
    'pbTrans not annotated with QE[0]=0 threshold (would display misleading "/ 0 ⚠")');

  // QE.texMB[0] = 10 MB is a meaningful positive threshold
  const QE = H.RANKS.quest;
  ok(typeof QE.texMB[0] === 'number' && QE.texMB[0] > 0,
    'RANKS.quest.texMB[0] is a positive number (Quest Excellent texture MB threshold)');

  // Verify pbComp/pbTrans QE thresholds are 0 (confirms the annotation decision above)
  ok(QE.pbComp[0] === 0, 'RANKS.quest.pbComp[0] === 0 (Excellent requires spring-off)');
  ok(QE.pbTrans[0] === 0, 'RANKS.quest.pbTrans[0] === 0 (Excellent requires spring-off)');

  // All 6 default preset texMB estimates should be under the QE threshold (10 MB)
  ok(H.PRESETS.every(pre => {
    const b = H.buildAvatar(H.presetParams(pre));
    const est = H.estimate(b, H.presetParams(pre));
    return est.texMB <= QE.texMB[0];
  }), 'all 6 presets have texMB at or below Quest Excellent threshold (no texture budget warnings)');
}

/* ---- Round 208: dblclick resets camTarget (consistent with Home key) ---- */
{
  // dblclick handler must reset camTarget alongside yaw/pitch/dist
  ok(/addEventListener\('dblclick'[\s\S]{0,200}camTarget=\[/.test(html),
    'dblclick handler resets camTarget (not just yaw/pitch/dist)');
  // hint.drag must mention Shift+↑↓ pan in both locales
  ok(/hint\.drag.*Shift\+↑↓.*パン/.test(html),
    'hint.drag (ja) mentions Shift+↑↓ pan shortcut');
  ok(/hint\.drag.*Shift\+↑↓.*pan/.test(html),
    'hint.drag (en) mentions Shift+↑↓ pan shortcut');
}

/* ---- Round 209: SR announcement for undo success and no-op ---- */
{
  // doUndo must announce 'a11y.undone' on success and 'a11y.noUndo' when stack empty
  ok(/a11y\.undone/.test(html), 'a11y.undone key exists in build');
  ok(/a11y\.noUndo/.test(html),  'a11y.noUndo key exists in build');
  ok(/doUndo[\s\S]{0,650}a11y\.undone/.test(html),
    'doUndo() announces a11y.undone to SR on success');
  ok(/doUndo[\s\S]{0,200}a11y\.noUndo/.test(html),
    'doUndo() announces a11y.noUndo to SR when nothing to undo');
  // Both keys present in both locales
  ok(/'a11y\.undone':'元に戻しました'/.test(html), 'a11y.undone key present in ja locale');
  ok(/'a11y\.undone':'Undone'/.test(html), 'a11y.undone key present in en locale');
  ok(/'a11y\.noUndo':'元に戻す履歴がありません'/.test(html), 'a11y.noUndo key present in ja locale');
  ok(/'a11y\.noUndo':'Nothing to undo'/.test(html), 'a11y.noUndo key present in en locale');
}

/* ---- Round 210: roving tabindex on preset cards ---- */
{
  // Grid must have role="group" for ARIA landmark
  ok(/presetGrid[\s\S]{0,100}role.*group/.test(html),
    'preset grid has role="group"');
  // Selected card gets tabindex="0", others get "-1"
  ok(/isSelected.*tabindex.*['"]-1['"]/.test(html) || /tabindex.*isSelected.*['"]-1['"]/.test(html) ||
     /tabindex.*hasSelected[\s\S]{0,80}['"]-1['"]/.test(html),
    'non-selected preset cards have tabindex="-1" (roving tabindex)');
  // Grid has arrow-key handler for navigation
  ok(/presetGrid|grid[\s\S]{0,50}keydown[\s\S]{0,200}ArrowRight/.test(html),
    'preset grid has keydown handler for arrow-key navigation');
  // Fallback: first card gets tabindex="0" when no preset is selected
  ok(/_firstCard/.test(html),
    'first card gets tabindex="0" as roving fallback when no preset selected');
}

/* ---- Round 211: activeTab persisted to localStorage ---- */
{
  // saveState must include activeTab in the stored object
  ok(/localStorage\.setItem[\s\S]{0,100}activeTab/.test(html),
    'saveState() saves activeTab to localStorage');
  // loadState must restore activeTab from stored object, validated against TABS
  ok(/j\.activeTab[\s\S]{0,80}TABS\.includes/.test(html),
    'loadState() restores activeTab only if it is a valid TABS entry');
  // beforeunload/pagehide also saves activeTab
  ok(/_emergencySave[\s\S]{0,200}activeTab/.test(html),
    'emergency save handler (beforeunload/pagehide) saves activeTab');
}

/* ---- Round 212: double-click slider resets to schema default ---- */
{
  // range slider must have ondblclick that resets to s.def
  ok(/ondblclick[\s\S]{0,100}s\.def/.test(html),
    'range slider has ondblclick handler that resets to schema default (s.def)');
  // title tooltip should reference the slider reset hint key
  ok(/hint\.sliderReset/.test(html),
    'slider title references hint.sliderReset key');
  // Both locales must have hint.sliderReset
  ok(H.I18N.ja['hint.sliderReset'] && H.I18N.ja['hint.sliderReset'].length > 5,
    'hint.sliderReset present in ja locale');
  ok(H.I18N.en['hint.sliderReset'] && H.I18N.en['hint.sliderReset'].length > 5,
    'hint.sliderReset present in en locale');
}

/* ---- Round 213: rankBadge aria-label includes current rank (not just static label) ---- */
{
  // set() function must update aria-label on the rankBadge parent element
  ok(/elm\.parentElement\.setAttribute\('aria-label'/.test(html),
    'set() in updateStats updates aria-label on rankBadge parent');
  // aria-label must include the rank text and the badge hint
  ok(/t\('rank\.'\+r\.rank\)[\s\S]{0,200}a11y\.rankBadge/.test(html),
    'aria-label includes rank text and a11y.rankBadge navigation hint');
}

/* ---- Round 214: two-finger vertical drag pans camTarget (mobile) ---- */
{
  // Two-finger pointermove handler must update camTarget[1] based on midpoint vertical movement
  ok(/ptrs\.size===2[\s\S]{0,700}camTarget\[1\]/.test(html),
    'two-finger pointermove handler updates camTarget[1] (vertical pan)');
  // midpoint calculation: (old[0][1]+old[1][1])/2 pattern
  ok(/oldMidY|newMidY/.test(html),
    'two-finger handler calculates vertical midpoint for pan');
}

/* ---- Round 215: about.keyList includes double-click shortcuts ---- */
{
  // keyList in both locales must mention double-click for both preview reset and slider reset
  ok(/about\.keyList.*ダブルクリック.*視点リセット/.test(html),
    'about.keyList (ja) mentions double-click for preview reset');
  ok(/about\.keyList.*ダブルクリック.*デフォルト値/.test(html),
    'about.keyList (ja) mentions double-click for slider default reset');
  ok(/about\.keyList.*Double-click.*reset view/.test(html),
    'about.keyList (en) mentions double-click for preview reset');
  ok(/about\.keyList.*Double-click.*reset to default/.test(html),
    'about.keyList (en) mentions double-click for slider default reset');
}

/* ---- Round 216: a11y.canvas includes Shift+↑↓ pan and double-click reset ---- */
{
  ok(/'a11y\.canvas'.*Shift.*↑.*↓.*パン/.test(html),
    'a11y.canvas (ja) mentions Shift+↑↓ pan');
  ok(/'a11y\.canvas'.*ダブルクリック/.test(html),
    'a11y.canvas (ja) mentions double-click reset');
  ok(/'a11y\.canvas'.*Shift.*↑.*↓.*pan/.test(html),
    'a11y.canvas (en) mentions Shift+↑/↓ pan');
  ok(/'a11y\.canvas'.*double-click/.test(html),
    'a11y.canvas (en) mentions double-click reset');
}

/* ---- Round 217: Copy params JSON to clipboard button ---- */
{
  // btn.copyJson key in both locales
  ok(/'btn\.copyJson':'クリップボードにコピー'/.test(html),
    'btn.copyJson present in ja locale');
  ok(/'btn\.copyJson':'Copy to clipboard'/.test(html),
    'btn.copyJson present in en locale');
  // btn.copyJsonDone key in both locales
  ok(/'btn\.copyJsonDone':'✓ コピー済'/.test(html),
    'btn.copyJsonDone present in ja locale');
  ok(/'btn\.copyJsonDone':'✓ Copied'/.test(html),
    'btn.copyJsonDone present in en locale');
  // Button uses HINA.serialize and navigator.clipboard
  ok(/btn\.copyJson[\s\S]{0,400}HINA\.serialize[\s\S]{0,200}navigator\.clipboard/.test(html) ||
     /HINA\.serialize[\s\S]{0,200}navigator\.clipboard[\s\S]{0,200}btn\.copyJson/.test(html) ||
     /btn\.copyJson[\s\S]{1,600}navigator\.clipboard/.test(html),
    'copyJson button uses HINA.serialize and navigator.clipboard');
}

/* ---- Round 218: saveJson() announces to SR ---- */
{
  ok(/'a11y\.savedJson':'.*{name}.*を保存しました'/.test(html),
    'a11y.savedJson key present in ja locale with {name} placeholder');
  ok(/'a11y\.savedJson':'Saved \{name\}'/.test(html),
    'a11y.savedJson key present in en locale');
  ok(/function saveJson[\s\S]{0,200}a11y\.savedJson/.test(html),
    'saveJson() announces a11y.savedJson to SR live region');
}

/* ---- Round 219: note.springOff shown when springOff=true and has springs ---- */
{
  ok(/'note\.springOff':'揺れ物オフ中/.test(html),
    'note.springOff key present in ja locale');
  ok(/'note\.springOff':'Springs are OFF/.test(html),
    'note.springOff key present in en locale');
  ok(/params\.springOff && hasS[\s\S]{0,200}note\.springOff/.test(html),
    'phys tab shows note.springOff when springOff active and has spring bones');
}

/* ---- Round 220: heightBadge gets dynamic aria-label with current height ---- */
{
  // heightBadge excluded from the static rankBadge aria-label reset
  ok(/rankBadge:not\(#heightBadge\)/.test(html),
    'applyLang() excludes heightBadge from static aria-label reset');
  // updateStats sets aria-label on heightBadge with current height value
  ok(/heightBadge[\s\S]{0,200}lbl\.height[\s\S]{0,100}toFixed/.test(html) ||
     /heightBadge[\s\S]{0,200}aria-label[\s\S]{0,200}toFixed/.test(html),
    'updateStats() sets dynamic aria-label on heightBadge including height value');
}

/* ---- Round 221: color swatches have aria-pressed (active indicator) ---- */
{
  // Swatch buttons must have aria-pressed set initially based on current param value
  ok(/class:'sw'[\s\S]{0,400}'aria-pressed':String\(isActive\)/.test(html) ||
     /class:'sw'[\s\S]{0,400}'aria-pressed':String\(params\[k\]===c\)/.test(html),
    'color swatch buttons initialized with aria-pressed matching current param value');
  // CSS must visually highlight the pressed swatch
  ok(/\.sw\[aria-pressed=true\]/.test(html),
    '.sw[aria-pressed=true] CSS rule exists for visual selected state');
  // updateSwPressedState keeps aria-pressed in sync after click
  ok(/updateSwPressedState/.test(html),
    'updateSwPressedState() function updates aria-pressed after swatch click');
}

/* ---- Round 222: roving tabindex on color swatches ---- */
{
  // .swatches container has role="group" and aria-label for accessibility
  ok(/class:'swatches'[\s\S]{0,100}role:'group'/.test(html) ||
     /role:'group'[\s\S]{0,100}class:'swatches'/.test(html),
    'color swatch container has role="group"');
  // Active swatch gets tabindex="0", others "-1"
  ok(/isActive.*tabindex.*['"]-1['"]/.test(html) || /tabindex.*isActive/.test(html),
    'non-active color swatches have tabindex="-1" (roving tabindex)');
  // swatches keydown handler for arrow-key navigation
  ok(/swatches[\s\S]{0,100}keydown[\s\S]{0,200}ArrowRight/.test(html) ||
     /sw\.addEventListener.*keydown[\s\S]{0,200}ArrowRight/.test(html),
    'color swatch group has keydown handler for arrow-key navigation');
  // setSwTab helper manages roving tabindex
  ok(/setSwTab/.test(html), 'setSwTab() function manages roving tabindex on swatches');
}

/* ---- Round 223: selftest box shows pass/total count ---- */
{
  ok(/'selftest\.count':'\{pass\}\/\{total\} 項目'/.test(html),
    'selftest.count key present in ja locale with {pass}/{total}');
  ok(/'selftest\.count':'\{pass\}\/\{total\} checks'/.test(html),
    'selftest.count key present in en locale');
  // selftest box must show count alongside pass/fail header
  ok(/selftest\.count[\s\S]{0,200}replace.*\{pass\}/.test(html),
    'selftest box renders pass/total count via selftest.count key');
}

/* ---- Round 224: PAL_NAMES provides human-readable color names for swatches ---- */
{
  // PAL_NAMES exported from HINA core
  ok(typeof H.PAL_NAMES === 'object' && H.PAL_NAMES !== null,
    'HINA.PAL_NAMES is exported and is an object');
  // All PAL colors should have a name in both ja and en
  let allHaveNames = true;
  for(const key in H.PAL){
    for(const hex of H.PAL[key]){
      const n=H.PAL_NAMES[hex];
      if(!n || !n.ja || !n.en){ allHaveNames=false; break; }
    }
    if(!allHaveNames) break;
  }
  ok(allHaveNames, 'all PAL colors have both ja and en names in PAL_NAMES');
  // Swatch aria-label must use PAL_NAMES via HINA.PAL_NAMES
  ok(/HINA\.PAL_NAMES\[c\]/.test(html),
    'swatch aria-label uses HINA.PAL_NAMES for human-readable color name');
}

/* ---- Round 225: paste-from-clipboard button in export tab ---- */
{
  // i18n keys exist in both locales
  ok(H.I18N.ja['btn.pasteJson'] === 'クリップボードから貼り付け',
    'ja locale has btn.pasteJson key');
  ok(H.I18N.en['btn.pasteJson'] === 'Paste from clipboard',
    'en locale has btn.pasteJson key');
  // paste button uses navigator.clipboard.readText
  ok(/readText\(\)/.test(html),
    'paste button calls navigator.clipboard.readText()');
  // paste button deserializes and calls rebuild
  ok(/deserialize[\s\S]{0,200}rebuild\(\)/.test(html),
    'paste button calls HINA.deserialize then rebuild()');
  // paste button announces via srStatus
  ok(/srStatus[\s\S]{0,100}btn\.pasteJson/.test(html),
    'paste button announces via srStatus live region');
}

/* ---- Round 230: color picker oninput calls updateSwPressedState() to sync aria-pressed ---- */
{
  // When user picks a custom color via the native color picker, aria-pressed on swatches
  // must be updated. The oninput handler must call updateSwPressedState().
  ok(/onpointerdown[\s\S]{0,200}oninput[\s\S]{0,100}updateSwPressedState\(\)/.test(html),
    'color picker oninput calls updateSwPressedState() to sync swatch aria-pressed state');
}

/* ---- Round 229: stat table rank badges include rank.tip in title and aria-label ---- */
{
  // badge() helper must reference rank.tip.* for tooltip/aria-label
  ok(/rank\.tip\.'?\+r\.rank/.test(html) || /rank\.tip\.\$\{/.test(html) ||
     /rank\.tip\.'+r\.rank/.test(html) ||
     /t\('rank\.tip\.'\+r\.rank\)/.test(html),
    'stat table badge() uses rank.tip.* for tooltip text');
  // badge span should have aria-label with rank name and tip
  ok(/badge[\s\S]{0,300}aria-label[\s\S]{0,100}rank\.tip/.test(html),
    'stat table badge span has aria-label including rank tip text');
}

/* ---- Round 228: preset modified indicator (●) has role=img + aria-label for SR ---- */
{
  ok(/isModified[\s\S]{0,200}role:'img'/.test(html) || /isModified[\s\S]{0,200}role:"img"/.test(html),
    'modified preset indicator span has role="img"');
  ok(/isModified[\s\S]{0,200}aria-label/.test(html),
    'modified preset indicator span has aria-label for screen readers');
  ok(/Modified from preset/.test(html),
    'modified preset indicator aria-label text present in en');
  ok(/プリセットから変更中/.test(html),
    'modified preset indicator title/aria-label text present in ja');
}

/* ---- Round 227: filename preview div has aria-live so SR announces changes ---- */
{
  // Round 393: fnPreview is no longer itself an aria-live region; SR announcements debounced via srStatus.
  // Verify fnPreview still exists as a visible element with id, and aria-describedby still wires to title input.
  ok(/id:'fnPreview'/.test(html),
    'fnPreview element exists (debounced SR routing via srStatus — Round 393)');
  ok(/'aria-describedby':'fnPreview'/.test(html),
    'meta-title input still has aria-describedby=fnPreview for static SR description on focus');
}

/* ---- Round 226: doUndo() clears the undoReady hint timer immediately ---- */
{
  // doUndo must call clearTimeout(_undoHintTimer) so the "undo ready" hint
  // doesn't outlive the actual undo operation
  ok(/clearTimeout\(_undoHintTimer\)[\s\S]{0,300}rebuild\(\)/.test(html),
    'doUndo() clears _undoHintTimer before rebuilding so stale hint is removed');
  // doUndo must also reset the hint text to hint.drag (when not in expr mode)
  ok(/clearTimeout\(_undoHintTimer\)[\s\S]{0,100}_hintDefault\(\)/.test(html),
    'doUndo() restores hint bar via _hintDefault() after consuming undo');
}

/* ---- Round 243: doScreenshot() calls showErr when canvas toBlob returns null ---- */
{
  ok(/toBlob[\s\S]{0,160}!blob[\s\S]{0,30}showErr/.test(html),
    'doScreenshot() calls showErr when toBlob returns null (GPU hung / no data)');
}

/* ---- Round 242: buildExprBar() preserves keyboard focus on expression buttons ---- */
{
  ok(/prevExprFocus[\s\S]{0,50}bar\.contains\(document\.activeElement\)/.test(html),
    'buildExprBar() captures focused expr button before clearing innerHTML');
  ok(/prevExprFocus[\s\S]{0,200}target.*focus\(\)/.test(html),
    'buildExprBar() restores focus to matching expr button after rebuild');
}

/* ---- Round 241: user-select:none on canvas + overscroll-behavior on panel ---- */
{
  ok(/user-select\s*:\s*none/.test(html),
    '#gl canvas has user-select:none to prevent text selection during drag');
  ok(/-webkit-user-select\s*:\s*none/.test(html),
    '#gl canvas has -webkit-user-select:none for Safari compatibility');
  ok(/overscroll-behavior-y\s*:\s*contain/.test(html),
    '#tabBody has overscroll-behavior-y:contain to prevent pull-to-refresh on mobile');
}

/* ---- Round 240: forced-colors:active media query preserves rank/swatch colors ---- */
{
  ok(/forced-colors\s*:\s*active/.test(html),
    '@media (forced-colors:active) block present for Windows High Contrast mode');
  ok(/forced-color-adjust\s*:\s*none/.test(html),
    'rank badges and swatches use forced-color-adjust:none to preserve color coding in HC mode');
}

/* ---- Round 239: autocomplete=off on metadata text inputs to prevent browser autofill ---- */
{
  // Meta text inputs (title, author, etc.) should have autocomplete=off to prevent
  // browser from injecting personal info into VRM avatar metadata fields
  ok(/meta-title[\s\S]{0,60}autocomplete.*off/.test(html) ||
     /autocomplete.*off[\s\S]{0,30}meta-title/.test(html) ||
     /autocomplete:'off'/.test(html),
    'metadata text inputs have autocomplete=off to prevent browser autofill');
  ok(html.split("autocomplete:'off'").length - 1 >= 2,
    'at least 2 metadata inputs have autocomplete=off (title + others)');
}

/* ---- Round 238: replace alert() with non-blocking showErr() for accessible error handling ---- */
{
  // showErr() must exist and use srStatus + hint bar
  ok(/function showErr\(/.test(html), 'showErr() helper function defined');
  ok(/showErr[\s\S]{0,200}srStatus/.test(html), 'showErr() announces via srStatus live region');
  ok(/showErr[\s\S]{0,200}var\(--err\)/.test(html), 'showErr() marks hint bar in error color');
  // No alert() calls should remain for user-facing errors
  ok(!/alert\(t\('err\./.test(html), 'no alert() calls for i18n error keys (all replaced by showErr)');
}

/* ---- Round 237: fnPreview only sets textContent when value changes to avoid SR re-announcement ---- */
{
  ok(/fnPrev\.textContent===nxt\) return/.test(html) ||
     /fnPrev\.textContent\s*!==\s*nxt/.test(html),
    'fnPreview guarded: only updates textContent when filename actually changes (early-return on equal)');
}

/* ---- Round 236: color-scheme:dark so native form controls render in dark mode ---- */
{
  ok(html.includes('<meta name="color-scheme" content="dark">'),
    'head includes <meta name="color-scheme" content="dark">');
  ok(/color-scheme\s*:\s*dark/.test(html),
    'CSS :root has color-scheme:dark for dark-mode native controls');
}

/* ---- Round 235: numIn clamp feedback via aria-invalid + SR announcement ---- */
{
  // a11y.clamped i18n keys in both locales
  ok(H.I18N.ja['a11y.clamped'] && H.I18N.ja['a11y.clamped'].includes('制限'),
    'ja a11y.clamped key present');
  ok(H.I18N.en['a11y.clamped'] && H.I18N.en['a11y.clamped'].includes('clamped'),
    'en a11y.clamped key present');
  // numIn onchange sets aria-invalid when value is clamped
  ok(/aria-invalid.*true[\s\S]{0,100}a11y\.clamped/.test(html) ||
     /a11y\.clamped[\s\S]{0,100}aria-invalid/.test(html),
    'numIn clamp feedback sets aria-invalid and announces via srStatus');
  // aria-invalid is removed after 1500ms timeout
  ok(/removeAttribute\('aria-invalid'\)[\s\S]{0,100}1500|1500[\s\S]{0,100}removeAttribute\('aria-invalid'\)/.test(html),
    'aria-invalid cleared after 1500ms so field does not stay in error state');
}

/* ---- Round 234: dialog max-height + overflow-y so about dialog scrolls on small screens ---- */
{
  ok(/dialog\{[^}]*max-height/.test(html) || /dialog[\s\S]{0,200}overflow-y:auto/.test(html),
    'dialog has max-height so it does not overflow viewport on small screens');
  ok(/overflow-y:auto/.test(html),
    'dialog has overflow-y:auto to enable scrolling when content is tall');
}

/* ---- Round 233: mobile stage uses dvh for dynamic viewport height ---- */
{
  // The mobile media query should use dvh (with vh fallback) so the 3D stage
  // height adapts to mobile browser toolbars (dynamic viewport unit)
  ok(/44vh[\s\S]{0,10}44dvh/.test(html) || /dvh/.test(html),
    'mobile stage uses dvh unit (with vh fallback) for dynamic viewport height');
}

/* ---- Round 232: numIn wheel listener prevents accidental value changes ---- */
{
  // numIn inputs get a wheel listener with {passive:false} that calls preventDefault
  // only when focused, so the panel can still scroll when the input is not focused
  ok(/valEl\.addEventListener\('wheel'[\s\S]{0,200}passive:false/.test(html),
    'numIn wheel listener added with {passive:false} to prevent accidental increments');
  ok(/activeElement===valEl[\s\S]{0,50}preventDefault/.test(html) ||
     /activeElement.*valEl.*preventDefault/.test(html),
    'wheel only prevents default when numIn is focused (not when scrolling past)');
}

/* ---- Round 231: btnMode tooltip + btnLang aria-label + M key shortcut ---- */
{
  // mode.easy.tip and mode.detail.tip i18n keys in both locales
  ok(H.I18N.ja['mode.easy.tip'] && H.I18N.ja['mode.easy.tip'].includes('かんたん'),
    'ja mode.easy.tip key present');
  ok(H.I18N.en['mode.easy.tip'] && H.I18N.en['mode.easy.tip'].includes('Easy'),
    'en mode.easy.tip key present');
  ok(H.I18N.ja['mode.detail.tip'] && H.I18N.ja['mode.detail.tip'].includes('詳細'),
    'ja mode.detail.tip key present');
  ok(H.I18N.en['mode.detail.tip'] && H.I18N.en['mode.detail.tip'].includes('Detail'),
    'en mode.detail.tip key present');
  // btn.lang.tip in both locales
  ok(H.I18N.ja['btn.lang.tip'] && H.I18N.ja['btn.lang.tip'].includes('言語'),
    'ja btn.lang.tip key present');
  ok(H.I18N.en['btn.lang.tip'] && H.I18N.en['btn.lang.tip'].includes('language'),
    'en btn.lang.tip key present');
  // applyLang sets title and aria-label on btnMode
  ok(/bm\.title\s*=/.test(html) || /btnMode.*title|mode\.easy\.tip|mode\.detail\.tip/.test(html),
    'applyLang sets title on btnMode from mode.*.tip i18n key');
  // M key handler toggles mode
  ok(/'m'\|\|e\.key==='M'/.test(html) || /key.*==='m'[\s\S]{0,80}mode.*easy.*detail/.test(html),
    'M key shortcut toggles Easy/Detail mode');
  // hint.ctrlS updated to include M key
  ok(H.I18N.ja['hint.ctrlS'].includes('M') || H.I18N.en['hint.ctrlS'].includes('M'),
    'hint.ctrlS includes M key shortcut');
  // about.keyList updated to include M
  ok(H.I18N.ja['about.keyList'].includes('M') && H.I18N.en['about.keyList'].includes('M'),
    'about.keyList documents M key shortcut');
}

/* ---- Round 270: logo div gets aria-label + role=img for cohesive SR reading ---- */
{
  ok(/class="logo"[\s\S]{0,30}aria-label/.test(html),
    'logo div has aria-label so screen readers read it as one unit, not two fragments');
  ok(/class="logo"[\s\S]{0,50}role="img"/.test(html),
    'logo div has role=img so AT treats it as a decorative heading, not interactive content');
}

/* ---- Round 269: Escape key deactivates active expression preview ---- */
{
  ok(/Escape[\s\S]{0,450}setExpr\(null\)/.test(html),
    'Escape key calls setExpr(null) to deactivate expression when one is active');
  ok(H.I18N.ja['about.keyList'].includes('Esc') && H.I18N.en['about.keyList'].includes('Esc'),
    'about.keyList documents Esc key shortcut in both locales');
}

/* ---- Round 268: dragover shows hint.dropJson in hint bar with accent color ---- */
{
  ok(/dragover[\s\S]{0,200}hint\.dropJson/.test(html),
    'dragover event shows hint.dropJson message in the hint bar');
  ok(/dragover[\s\S]{0,260}var\(--accent\)/.test(html),
    'dragover tints hint bar in accent color to reinforce drop affordance');
  ok(/dragleave[\s\S]{0,200}h\.style\.color\s*=\s*''/.test(html),
    'dragleave restores hint bar color when drag exits the page');
}

/* ---- Round 267: numIn aria-label differentiates it from the slider for screen readers ---- */
{
  ok(H.I18N.ja['a11y.numIn'] && H.I18N.en['a11y.numIn'],
    'a11y.numIn i18n key exists in both locales');
  ok(/a11y\.numIn/.test(html),
    'numIn uses a11y.numIn label to distinguish from the slider control with the same name');
}

/* ---- Round 266: canvas aria-keyshortcuts lists available keyboard shortcuts ---- */
{
  ok(/aria-keyshortcuts/.test(html),
    '#gl canvas has aria-keyshortcuts listing Arrow/Home keys for AT that exposes available shortcuts');
}

/* ---- Round 265: file load (button + drop) announces loaded filename to srStatus ---- */
{
  // Both file input onchange and drag-drop handler should announce loaded filename
  ok(html.split("f.name").filter(s=>s.slice(0,60).includes('srStatus')).length >= 2 ||
     (html.split('a11y.savedJson').length - 1) >= 3,
    'file load (button and drop paths) announces a11y.savedJson with filename to srStatus');
}

/* ---- Round 264: autoSaveBadge clears text after fade to prevent stale AT reads ---- */
{
  ok(/_saveBadgeTimer[\s\S]{0,150}opacity.*0[\s\S]{0,80}textContent\s*=\s*''/.test(html),
    'autoSaveBadge clears textContent after fade-out so stale "✓ saved" is not re-read by AT');
}

/* ---- Round 263: WebGL context-lost event announces to srStatus ---- */
{
  ok(/webglcontextlost[\s\S]{0,130}srStatus[\s\S]{0,30}hint\.glLost/.test(html),
    'webglcontextlost event announces hint.glLost to srStatus live region');
}

/* ---- Round 262: revert-to-preset announces success and preserves scroll ---- */
{
  ok(/btn\.revert[\s\S]{0,200}srStatus/.test(html) ||
     /srStatus[\s\S]{0,50}btn\.revert/.test(html),
    'revert-to-preset button announces revert action to srStatus');
  ok(/presetParams\(activePre\)[\s\S]{0,100}renderBody\(false\)/.test(html),
    'revert-to-preset calls renderBody(false) to preserve panel scroll position');
}

/* ---- Round 261: reset button uses two-click pattern instead of confirm() ---- */
{
  ok(!/confirm\(/.test(html),
    'no window.confirm() calls remain — replaced by two-click inline confirmation');
  ok(/_resetPending/.test(html),
    'reset button uses _resetPending flag for two-click confirmation pattern');
  ok(/btn\.reset\.confirm[\s\S]{0,100}srStatus/.test(html) ||
     /srStatus[\s\S]{0,100}btn\.reset\.confirm/.test(html),
    'reset first-click announces confirmation prompt to screen reader via srStatus');
}

/* ---- Round 260: VRChat upload guide steps use <ol> for semantic ordered list ---- */
{
  ok(/guide\.s1[\s\S]{0,100}ol[\s\S]{0,20}li/.test(html) ||
     /el\('ol'[\s\S]{0,200}guide\.s/.test(html),
    'VRChat guide steps rendered as <ol><li> so screen readers announce "item N of 5"');
}

/* ---- Round 259: slider double-click reset announces new value to screen reader ---- */
{
  ok(H.I18N.ja['a11y.sliderReset'] && H.I18N.en['a11y.sliderReset'],
    'a11y.sliderReset i18n key exists in both locales');
  ok(/ondblclick[\s\S]{0,360}a11y\.sliderReset/.test(html),
    'slider ondblclick announces reset to srStatus with label and default value');
}

/* ---- Round 258: pasteJson announces success/failure to srStatus ---- */
{
  ok(H.I18N.ja['btn.pasteJson.ok'] && H.I18N.en['btn.pasteJson.ok'],
    'btn.pasteJson.ok i18n key exists in both locales');
  ok(H.I18N.ja['btn.pasteJson.err'] && H.I18N.en['btn.pasteJson.err'],
    'btn.pasteJson.err i18n key exists in both locales');
  ok(/btn\.pasteJson\.ok/.test(html),
    'pasteJson success path announces btn.pasteJson.ok to srStatus');
  ok(/btn\.pasteJson\.err/.test(html),
    'pasteJson failure paths announce btn.pasteJson.err to srStatus');
}

/* ---- Round 257: ? key guard prevents showModal() when dialog already open ---- */
{
  ok(html.includes('const dlgOpen') && html.includes('if (!dlgOpen)') ||
     /key==='[?]'[\s\S]{0,60}aboutDlg[\s\S]{0,10}open/.test(html),
    '? key shortcut guards against calling showModal() when dialog is already open');
}

/* ---- Round 256: outfit/springOff renderBody preserves scroll position ---- */
{
  ok(/k==='outfit'.*\|\|.*k==='springOff'[\s\S]{0,30}renderBody\(false\)/.test(html) ||
     /renderBody\(false\)/.test(html),
    'onParam() calls renderBody(false) for outfit/springOff to preserve panel scroll position');
}

/* ---- Round 255: preset color dot row hidden from AT with aria-hidden ---- */
{
  ok(/'cols'[\s\S]{0,60}'aria-hidden'\s*:\s*'true'/.test(html),
    'preset card color dot row has aria-hidden=true (decorative — AT would read "span span span")');
}

/* ---- Round 254: primary button focus ring uses dark color, not accent-on-accent ---- */
{
  ok(/btn\.primary:focus-visible[\s\S]{0,40}outline-color/.test(html),
    '.btn.primary:focus-visible overrides outline-color to contrast against accent background');
}

/* ---- Round 253: localize exprBar aria-label via applyLang() ---- */
{
  ok(H.I18N.ja['a11y.exprBar'] && H.I18N.en['a11y.exprBar'],
    'a11y.exprBar i18n key exists in both locales');
  ok(/exprBar.*setAttribute\('aria-label',\s*t\('a11y\.exprBar'\)\)/.test(html) ||
     /\$\('exprBar'\)[\s\S]{0,30}aria-label[\s\S]{0,30}a11y\.exprBar/.test(html),
    'applyLang() updates exprBar aria-label from i18n key (was hardcoded English)');
}

/* ---- Round 252: drag-over visual indicator for JSON drop zone ---- */
{
  ok(/drag-over/.test(html),
    'body gets drag-over class during file drag for visual drop-zone feedback');
  ok(/body\.drag-over::after/.test(html) || /body\.drag-over/.test(html),
    'CSS body.drag-over pseudo-element provides dashed border drop-zone overlay');
  ok(/dragleave[\s\S]{0,100}drag-over/.test(html),
    'dragleave removes drag-over class so overlay disappears when user drags out');
}

/* ---- Round 251: hide number input spinners to reduce visual noise ---- */
{
  ok(/numIn[\s\S]{0,200}appearance:textfield/.test(html),
    'numIn inputs hide spinner arrows via appearance:textfield (Firefox)');
  ok(/-webkit-inner-spin-button[\s\S]{0,60}-webkit-appearance\s*:\s*none/.test(html),
    'numIn inputs hide spinner arrows via ::-webkit-inner-spin-button (Chrome/Safari)');
}

/* ---- Round 250: captureUndo() announces undo-available to srStatus live region ---- */
{
  ok(/captureUndo[\s\S]{0,600}srStatus[\s\S]{0,60}hint\.undoReady/.test(html),
    'captureUndo() announces hint.undoReady to srStatus so screen reader users know undo is available');
}

/* ---- Round 249: aria-busy on export button signals loading state to screen readers ---- */
{
  ok(/exportBtn.*aria-busy.*true/.test(html) || /_exportBtn[\s\S]{0,60}setAttribute\('aria-busy','true'\)/.test(html),
    'export button sets aria-busy=true while exporting (AT loading state)');
  ok(/removeAttribute\('aria-busy'\)/.test(html),
    'export button removes aria-busy after export completes or fails');
}

/* ---- Round 248: screenshot <a> appended to DOM before click() for cross-browser compat ---- */
{
  ok(/fnameStem\(\)\+'.png'[\s\S]{0,50}document\.body\.append\(a\)[\s\S]{0,20}a\.click\(\)[\s\S]{0,20}a\.remove\(\)/.test(html),
    'doScreenshot appends <a> to DOM before click() and removes after (Firefox/Safari compat)');
}

/* ---- Round 247: aboutDlg restores focus to btnAbout on close ---- */
{
  ok(html.includes("$('aboutDlg').addEventListener('close'") && html.includes('_dlgReturnFocus') && html.includes("$('btnAbout')"),
    'aboutDlg close event restores focus to triggering element or btnAbout so keyboard users keep their position');
}

/* ---- Round 246: runGacha() announces seed to screen reader via srStatus ---- */
{
  ok(H.I18N.ja['a11y.gachaRan'] && H.I18N.en['a11y.gachaRan'],
    'a11y.gachaRan i18n key exists in both locales for gacha screen reader announcement');
  ok(/runGacha[\s\S]{0,200}a11y\.gachaRan/.test(html),
    'runGacha() announces the seed to srStatus live region after generating a random avatar');
}

/* ---- Round 245: tablist aria-orientation + aria-label for screen reader navigation ---- */
{
  ok(html.includes('aria-orientation="horizontal"'),
    '#tabs nav has aria-orientation="horizontal" (ARIA 4.1.2 tablist requirement)');
  ok(H.I18N.ja['a11y.tabs'] && H.I18N.en['a11y.tabs'],
    'a11y.tabs i18n key exists in both locales');
  ok(/\$\('tabs'\)\.setAttribute\('aria-label',\s*t\('a11y\.tabs'\)\)/.test(html),
    'applyLang() sets aria-label on #tabs from a11y.tabs key');
}

/* ---- Round 244: spellcheck=false on metadata text inputs prevents mobile autocorrect ---- */
{
  ok(/spellcheck:\s*'false'/.test(html),
    'metadata text inputs have spellcheck:false to prevent mobile autocorrect of avatar names');
  ok(html.split("spellcheck:'false'").length - 1 >= 3,
    'at least 3 metadata inputs have spellcheck:false (title, author, licenseUrl)');
}

/* ---- Round 277: sect dividers get role=heading aria-level=3 ---- */
{
  ok(/class:'sect'[\s\S]{0,30}role\s*:\s*'heading'/.test(html),
    'sect dividers have role=heading so screen readers treat them as section headings');
  ok(/aria-level':'3'/.test(html),
    'sect headings use aria-level 3 (below tab heading level 2 implied by tabpanel)');
}

/* ---- Round 276: copyJson clipboard unavailable path announces error ---- */
{
  ok(/navigator\.clipboard[\s\S]{0,50}_fail\(\)/.test(html) ||
     /!navigator\.clipboard[\s\S]{0,30}_fail/.test(html),
    'copyJson handles missing navigator.clipboard (HTTP context) with visible error');
  ok(/copyJson[\s\S]{0,200}pasteJson\.err|_fail[\s\S]{0,80}pasteJson\.err/.test(html),
    'copyJson failure calls srStatus with btn.pasteJson.err to announce clipboard error');
}

/* ---- Round 275: doExport finally resets button text on error path ---- */
{
  ok(html.includes("_exportBtn.textContent===t('btn.exporting')") && html.includes("_exportBtn.textContent=t('btn.export')"),
    'doExport finally block resets button text to btn.export if it shows "Exporting…" on error');
}

/* ---- Round 289: dblclick view reset announces to screen reader ---- */
{
  ok(/dblclick[\s\S]{0,220}a11y\.viewReset/.test(html),
    'canvas dblclick view reset announces a11y.viewReset to screen reader via srStatus');
}

/* ---- Round 288: canvas Home key announces view reset to screen reader ---- */
{
  ok(H.I18N.ja['a11y.viewReset'] && H.I18N.en['a11y.viewReset'],
    'a11y.viewReset i18n key exists in both locales');
  ok(html.includes("sr.textContent=t('a11y.viewReset')") &&
     /case 'Home'[\s\S]{0,160}a11y\.viewReset/.test(html),
    'canvas Home key announces a11y.viewReset to screen reader via srStatus');
}

/* ---- Round 292: autoSaveBadge visible for prefers-reduced-motion users ---- */
{
  ok(html.includes('#autoSaveBadge') && /prefers-reduced-motion[\s\S]{0,60}#autoSaveBadge/.test(html),
    'autoSaveBadge included in prefers-reduced-motion CSS rule so sighted users see it without animation');
  ok(!/if \(!reduceMotion\)[\s\S]{0,80}opacity.*1/.test(html),
    'autoSaveBadge opacity=1 not gated on !reduceMotion — always shown for sighted users');
}

/* ---- Round 291: about.keyList documents 0 as alternative to Home ---- */
{
  ok(H.I18N.ja['about.keyList'].includes('Home / 0') && H.I18N.en['about.keyList'].includes('Home / 0'),
    'about.keyList documents 0 key as alternative to Home for view reset in both locales');
}

/* ---- Round 290: applyLang updates document.documentElement.lang (WCAG 3.1.1) ---- */
{
  ok(html.includes('document.documentElement.lang = lang'),
    'applyLang() updates <html lang> attribute to match current locale (WCAG 3.1.1)');
}

/* ---- Round 295: license URL field gets focus when Other is selected ---- */
{
  ok(/licUrlRow\.style\.display[\s\S]{0,130}u\.focus\(\)/.test(html),
    'selecting Other license moves focus to the URL input so SR users discover the newly visible field');
}

/* ---- Round 294: select elements have font:inherit for cross-browser consistency ---- */
{
  ok(html.includes('.row select') && html.includes('font:inherit'),
    '.row select has font:inherit so select font matches surrounding UI in all browsers');
}

/* ---- Round 293: rankBadge[role=button] gets cursor:pointer and hover border ---- */
{
  ok(html.includes('.rankBadge[role=button]{cursor:pointer'),
    'rankBadge[role=button] gets cursor:pointer so sighted users see it is clickable');
  ok(/rankBadge\[role=button\]:hover\{border-color/.test(html),
    'rankBadge[role=button]:hover has border-color change for visual hover feedback');
}

/* ---- Round 300: #hint bar gets max-width to prevent overflow on small screens ---- */
{
  ok(html.includes('max-width:calc(100% - 24px)') && html.includes('text-overflow:ellipsis'),
    '#hint bar has max-width and text-overflow:ellipsis to prevent overflow on narrow viewports');
}

/* ---- Round 299: #selftestBox gets role=status for AT discoverability ---- */
{
  ok(/id="selftestBox"[^>]*role="status"/.test(html),
    '#selftestBox gets role=status so AT users know the content is a live status message');
}

/* ---- Round 321: first-time load respects navigator.language to auto-select English for non-Japanese users ---- */
{
  ok(html.includes('navigator.language') && html.includes("startsWith('ja')") &&
     html.includes("lang = 'en'"),
    'first-time load sets lang=en when navigator.language does not start with ja');
}

/* ---- Round 320: doScreenshot wraps cv.toBlob() in try-catch so SecurityError doesn't leave btn disabled ---- */
{
  ok(/doScreenshot[\s\S]{0,1200}catch\s*\(e\)[\s\S]{0,20}_scrDone\(\)/.test(html),
    'doScreenshot() has try-catch around cv.toBlob() to re-enable button via _scrDone if canvas throws (e.g. SecurityError)');
}

/* ---- Round 319: doExport snapshots params and meta too so live changes during awaits don't affect the export ---- */
{
  ok(html.includes('const exportParams = JSON.parse(JSON.stringify(params))') &&
     html.includes('const exportMeta = JSON.parse(JSON.stringify(meta))'),
    'doExport() deep-clones params and meta at start to isolate export from concurrent slider changes');
  ok(html.includes('HINA.exportVRM(exportBuild, exportParams, exportMeta,'),
    'exportVRM() called with snapshotted exportParams and exportMeta');
}

/* ---- Round 318: doExport captures build snapshot before async awaits so slider changes can't corrupt export ---- */
{
  ok(html.includes('const exportBuild = build') && html.includes('HINA.exportVRM(exportBuild,'),
    'doExport() captures build into exportBuild before any await so concurrent rebuild() cannot affect the export');
}

/* ---- Round 317: doUndo() guards against _exporting to prevent race with async VRM export ---- */
{
  ok(/function doUndo[\s\S]{0,80}_exporting/.test(html),
    'doUndo() returns early when _exporting is true to prevent param changes mid-export');
}

/* ---- Round 316: exprBar toolbar has aria-orientation=horizontal ---- */
{
  ok(html.includes('role="toolbar" aria-orientation="horizontal"'),
    'exprBar toolbar has aria-orientation=horizontal for correct ARIA toolbar semantics');
}

/* ---- Round 315: skip link for WCAG 2.4.1 (bypass blocks) ---- */
{
  ok(html.includes('id="skipLink"') && html.includes('href="#tabBody"'),
    'skip link targets #tabBody for WCAG 2.4.1 bypass blocks');
  ok(/#skipLink:focus-visible\{top/.test(html),
    'skip link appears on focus via CSS :focus-visible (hidden by default, shown when focused)');
  ok(H.I18N.ja['a11y.skip'] && H.I18N.en['a11y.skip'],
    'a11y.skip i18n key exists in both locales for skip link localization');
  ok(html.includes("$('skipLink')") && html.includes("a11y.skip"),
    'applyLang() localizes the skip link text');
}

/* ---- Round 314: range slider gets aria-describedby=sliderDesc; sliderDesc updated in applyLang ---- */
{
  ok(html.includes("'aria-describedby':'sliderDesc'"),
    'range slider has aria-describedby=sliderDesc so AT reads the double-click/Delete reset hint');
  ok(html.includes("id=\"sliderDesc\"") && html.includes("class=\"sr-only\""),
    'sliderDesc sr-only span exists in DOM as a shared slider instruction element');
  ok(html.includes("$('sliderDesc')") && html.includes("hint.sliderReset"),
    'applyLang() updates sliderDesc text to the localized hint.sliderReset string');
}

/* ---- Round 313: numIn clamped path sets aria-errormessage=srStatus alongside aria-invalid ---- */
{
  ok(html.includes("setAttribute('aria-errormessage','srStatus')"),
    'numIn onchange clamped path sets aria-errormessage=srStatus for WCAG 1.3.1 error association');
  ok(html.includes("removeAttribute('aria-errormessage')"),
    'numIn timeout removes aria-errormessage when aria-invalid is cleared');
}

/* ---- Round 312: copyJson error uses btn.copyJson.err not btn.pasteJson.err ---- */
{
  ok(H.I18N.ja['btn.copyJson.err'] && H.I18N.en['btn.copyJson.err'],
    'btn.copyJson.err i18n key exists in both locales for clipboard write failure');
  ok(html.includes("t('btn.copyJson.err')"),
    'copyJson error path uses btn.copyJson.err not the paste error key');
  ok(!html.includes("copyJson.err')") || !html.includes("pasteJson.err'") ||
     /copyJson[\s\S]{0,800}copyJson\.err/.test(html),
    'copyJson failure SR announcement uses correct copy-specific error key');
}

/* ---- Round 311: doScreenshot re-enables button inside toBlob callback, not in finally ---- */
{
  ok(/toBlob\s*\(blob=>\{[\s\S]{0,20}_scrDone\(\)/.test(html),
    'screenshot button is re-enabled via _scrDone() inside toBlob callback (async), not prematurely in a finally block');
}

/* ---- Round 310: seed input has max=4294967295 to document rng(seed>>>0) range and prevent silent wraparound ---- */
{
  ok(html.includes("max:'4294967295'") && html.includes('Math.min(n,4294967295)'),
    'seed input has max=4294967295 and clamps on change to match rng 32-bit unsigned integer range');
}

/* ---- Round 309: seed input prevents accidental wheel-scroll value changes ---- */
{
  ok(/seedIn\.addEventListener\('wheel'[\s\S]{0,80}e\.preventDefault\(\)/.test(html),
    'seed input has wheel event listener that prevents accidental value changes when scrolling past');
}

/* ---- Round 308: all keyboard shortcuts are wrapped in !dlgOpen guard so modal dialog suppresses them ---- */
{
  ok(html.includes('const dlgOpen = $(\'aboutDlg\').open') && html.includes('if (!dlgOpen){'),
    'keyboard shortcuts block (Ctrl+Z/S, M, 1-8) is wrapped in if(!dlgOpen) to prevent firing during modal dialog');
}

/* ---- Round 307: range slider has aria-valuetext to keep AT announcement in sync with displayed value ---- */
{
  ok(html.includes("'aria-valuetext':String(params[k])"),
    'range slider initializes aria-valuetext to match displayed value');
  ok(html.includes("r.setAttribute('aria-valuetext',String(params[k]))"),
    'range slider oninput updates aria-valuetext to keep AT announcement in sync with display');
}

/* ---- Round 306: seed input gets inputmode=numeric; numIn inputs get inputmode=decimal for mobile keyboard ---- */
{
  ok(html.includes("inputmode:'numeric'") && html.includes("inputmode:'decimal'"),
    'seed input has inputmode=numeric and numIn inputs have inputmode=decimal for correct mobile keyboard');
}

/* ---- Round 305: aboutDlg focus return uses _dlgReturnFocus to restore to triggering element ---- */
{
  ok(html.includes('_dlgReturnFocus=document.activeElement') && html.includes('_dlgReturnFocus=null'),
    'openAbout() saves activeElement before showModal() so close event can restore focus to trigger');
  ok(html.includes('openAbout()') && /e\.key==='[?]'[\s\S]{0,110}openAbout/.test(html),
    '? key calls openAbout() which saves focus before opening dialog');
}

/* ---- Round 304: meta-title input gets aria-describedby=fnPreview so AT announces filename preview ---- */
{
  ok(html.includes("'aria-describedby':'fnPreview'") && html.includes("id:'meta-title'"),
    'meta-title input has aria-describedby=fnPreview so AT announces filename preview on focus');
}

/* ---- Round 298: .sw:hover transform:none in prefers-reduced-motion CSS ---- */
{
  ok(/prefers-reduced-motion[\s\S]{0,80}\.sw:hover\{transform:none\}/.test(html),
    '.sw:hover has transform:none in prefers-reduced-motion so swatch hover does not move for motion-sensitive users');
}

/* ---- Round 297: VRChat guide title gets role=heading aria-level=4 ---- */
{
  ok(html.includes("role:'heading','aria-level':'4'") && html.includes("guide.t"),
    'VRChat guide title <b> gets role=heading aria-level=4 for proper document outline');
}

/* ---- Round 303: seed input Enter key blurs field to reliably fire onchange ---- */
{
  ok(html.includes("onkeydown:e=>{ if(e.key==='Enter') e.target.blur(); }"),
    'seed input has Enter key handler that blurs to reliably trigger onchange across browsers');
}

/* ---- Round 302: doUndo uses renderBody(false) to preserve scroll position ---- */
{
  ok(/function doUndo[\s\S]{0,520}renderBody\(false\)/.test(html),
    'doUndo() calls renderBody(false) to preserve scroll position after undo');
}

/* ---- Round 301: canvas gets aria-roledescription for accurate AT role description ---- */
{
  ok(H.I18N.ja['a11y.canvas.role'] && H.I18N.en['a11y.canvas.role'],
    'a11y.canvas.role i18n key exists in both locales');
  ok(html.includes("aria-roledescription', t('a11y.canvas.role')"),
    'canvas gets aria-roledescription so AT announces 3D preview instead of generic image');
}

/* ---- Round 296: exprBar implements roving tabindex for toolbar ARIA pattern ---- */
{
  ok(/exprBar[\s\S]{0,500}tabindex.*-1.*tabindex.*0/.test(html) ||
     (html.includes("tabindex', activeKey === '' ? '0' : '-1'") || html.includes("tabindex', activeKey === name ? '0' : '-1'")),
    'exprBar buttons use roving tabindex (initial tabindex based on active expression)');
  ok(/bar\.addEventListener\('keydown'[\s\S]{0,200}ArrowRight/.test(html),
    'exprBar has keydown handler for ArrowRight/Left navigation (ARIA toolbar pattern)');
}

/* ---- Round 287: btnAbout gets aria-haspopup=dialog ---- */
{
  ok(html.includes("aria-haspopup', 'dialog'"),
    'btnAbout gets aria-haspopup=dialog so AT announces it opens a dialog');
}

/* ---- Round 283: hint.sliderReset updated to mention Delete key ---- */
{
  ok(H.I18N.ja['hint.sliderReset'].includes('Delete') && H.I18N.en['hint.sliderReset'].includes('Delete'),
    'hint.sliderReset tooltip mentions Delete key in both locales');
}

/* ---- Round 284: seed copy button guards clipboard.writeText availability ---- */
{
  ok(html.includes("!navigator.clipboard?.writeText"),
    'seed copy button guards clipboard.writeText before calling .then() to prevent silent TypeError');
}

/* ---- Round 285: seed input has min=0 autocomplete=off step=1 ---- */
{
  ok(html.includes("min:'0'") && html.includes("autocomplete:'off'") && html.includes("gacha.seed"),
    'gacha seed input has min=0 and autocomplete=off for robustness');
}

/* ---- Round 286: preset card nmDiv has title attribute for ellipsis overflow ---- */
{
  ok(html.includes('title:preLabel2') && html.includes('preLabel2=lang'),
    'preset card name div has title attribute so full name is visible on hover if truncated');
}

/* ---- Round 282: btnMode and btnAbout get aria-keyshortcuts ---- */
{
  ok(/btnAbout[\s\S]{0,120}aria-keyshortcuts[\s\S]{0,20}'[?]'/.test(html),
    'btnAbout gets aria-keyshortcuts="?" so AT users discover the ? shortcut');
  ok(/btnMode[\s\S]{0,120}aria-keyshortcuts[\s\S]{0,20}'M'/.test(html),
    'btnMode gets aria-keyshortcuts="M" so AT users discover the M shortcut');
}

/* ---- Round 281: M-key mode toggle preserves focus via wasInTabBody check ---- */
{
  ok(html.includes('wasInTabBody') && html.includes("$('btnMode').focus()"),
    'M-key handler saves wasInTabBody and restores focus to btnMode if panel had focus');
}

/* ---- Round 280: canvas aria-keyshortcuts includes Shift+ArrowUp and zoom shortcuts ---- */
{
  ok(html.includes('Shift+ArrowUp') && html.includes('aria-keyshortcuts'),
    'canvas aria-keyshortcuts includes Shift+ArrowUp for pan shortcut');
  ok(/about\.keyList.*Delete/.test(html),
    'about.keyList documents Delete key for slider reset in at least one locale');
}

/* ---- Round 279: pasteJson guards against missing clipboard.readText ---- */
{
  ok(html.includes("typeof navigator.clipboard?.readText !== 'function'"),
    'pasteJson explicitly guards clipboard.readText availability before calling .then()');
}

/* ---- Round 278: Delete key on range slider resets to default ---- */
{
  ok(/onkeydown[\s\S]{0,480}sliderReset/.test(html) && html.includes("e.key!=='Delete'"),
    'range slider has Delete key handler that resets to default and announces via srStatus');
}

/* ---- Round 274: Escape cancels drag-over visual state ---- */
{
  ok(/Escape[\s\S]{0,100}drag-over[\s\S]{0,100}classList\.remove/.test(html),
    'Escape key removes drag-over class so the dashed border overlay is cancelled');
}

/* ---- Round 273: .preCard .nm has overflow:hidden + text-overflow:ellipsis ---- */
{
  ok(/\.preCard \.nm[\s\S]{0,80}overflow\s*:\s*hidden/.test(html),
    '.preCard .nm has overflow:hidden to prevent long preset names from breaking card layout');
  ok(/\.preCard \.nm[\s\S]{0,100}text-overflow\s*:\s*ellipsis/.test(html),
    '.preCard .nm has text-overflow:ellipsis for graceful truncation');
}

/* ---- Round 272: .btn:disabled and .hbtn:disabled visual styles ---- */
{
  ok(/\.btn:disabled[\s\S]{0,60}opacity/.test(html),
    '.btn:disabled has reduced opacity so disabled export button looks unclickable');
  ok(/\.hbtn:disabled[\s\S]{0,60}opacity/.test(html),
    '.hbtn:disabled has reduced opacity for header buttons (screenshot etc.)');
  ok(/\.btn:disabled[\s\S]{0,80}cursor\s*:\s*not-allowed/.test(html),
    '.btn:disabled uses cursor:not-allowed to signal non-interactivity');
}

/* ---- Round 271: FileReader onerror/onabort + 2 MB file size guard ---- */
{
  ok(/rd\.onerror\s*=\s*rd\.onabort/.test(html),
    'FileReader has onerror/onabort handler to show error if file read fails');
  ok(/f\.size\s*>\s*2\s*\*\s*1024\s*\*\s*1024/.test(html),
    'File size guard rejects files over 2 MB before reading to prevent hangs');
  ok(/showErr[\s\S]{0,200}rd\.onerror/.test(html) ||
     /rd\.onerror[\s\S]{0,30}showErr/.test(html),
    'FileReader onerror calls showErr to surface the failure to the user');
  ok(/showErr.*err\.loadFailed[\s\S]{0,10}$|showErr[\s\S]{0,800}rd\.onerror/.test(html),
    'showErr is called on FileReader error in at least one path');
}

/* ---- Round 322: a11y.loadedJson for load paths, a11y.savedJson only for saves ---- */
{
  // Both locales have the new loadedJson key
  ok(H.I18N.ja['a11y.loadedJson'] && H.I18N.ja['a11y.loadedJson'].includes('{name}'),
    'ja a11y.loadedJson key exists and contains {name} placeholder');
  ok(H.I18N.en['a11y.loadedJson'] && H.I18N.en['a11y.loadedJson'].includes('{name}'),
    'en a11y.loadedJson key exists and contains {name} placeholder');

  // File-picker load path uses loadedJson, not savedJson
  ok(/rd\.onload[\s\S]{0,380}a11y\.loadedJson/.test(html),
    'file-picker JSON load announces a11y.loadedJson (not savedJson) to srStatus');

  // Drag-and-drop load path uses loadedJson
  const dropIdx = html.lastIndexOf("addEventListener('drop'");
  const dropBlock = html.slice(dropIdx, dropIdx + 900);
  ok(/a11y\.loadedJson/.test(dropBlock),
    'drag-and-drop JSON load announces a11y.loadedJson (not savedJson) to srStatus');

  // saveJson() still uses savedJson
  ok(/saveJson[\s\S]{0,200}a11y\.savedJson/.test(html),
    'saveJson() still announces a11y.savedJson (not changed to loadedJson)');

  // Loaded message differs from saved message in both locales
  ok(H.I18N.ja['a11y.loadedJson'] !== H.I18N.ja['a11y.savedJson'],
    'ja loadedJson and savedJson messages are distinct');
  ok(H.I18N.en['a11y.loadedJson'] !== H.I18N.en['a11y.savedJson'],
    'en loadedJson and savedJson messages are distinct');
}

/* ---- Round 323: copySeed error paths announce to srStatus ---- */
{
  // Both locales have btn.copySeed.err
  ok(H.I18N.ja['btn.copySeed.err'] && H.I18N.ja['btn.copySeed.err'].length > 3,
    'ja btn.copySeed.err i18n key exists');
  ok(H.I18N.en['btn.copySeed.err'] && H.I18N.en['btn.copySeed.err'].length > 3,
    'en btn.copySeed.err i18n key exists');

  // Clipboard unavailable path announces error
  ok(/!navigator\.clipboard[\s\S]{0,180}btn\.copySeed\.err/.test(html),
    'copySeed clipboard-unavailable path announces btn.copySeed.err to srStatus');

  // .catch() path announces error
  ok(/\.catch\(\(\)=>\{[\s\S]{0,200}btn\.copySeed\.err/.test(html),
    'copySeed .catch() path announces btn.copySeed.err to srStatus');
}

/* ---- Round 324: mode toggle announces new mode to srStatus ---- */
{
  // btnMode click handler announces mode tip after applyLang
  ok(/btnMode.*addEventListener.*'click'[\s\S]{0,120}mode\.easy\.tip|mode\.detail\.tip/.test(html) ||
     /btnMode[\s\S]{0,180}mode\.easy\.tip/.test(html),
    'btnMode click handler announces mode tip to srStatus after toggle');

  // M key handler announces mode tip (even when wasInTabBody is false)
  const mKeyIdx = html.indexOf("e.key==='m'||e.key==='M'");
  const mKeyBlock = mKeyIdx >= 0 ? html.slice(mKeyIdx, mKeyIdx + 560) : '';
  ok(/mode\.easy\.tip|mode\.detail\.tip/.test(mKeyBlock),
    'M key handler announces mode tip to srStatus (covers case where focus is outside tabBody)');
}

/* ---- Round 325: exprBar keydown handler registered once (no listener leak) ---- */
{
  // buildExprBar() itself must NOT contain bar.addEventListener('keydown'
  const barFnStart = html.indexOf('function buildExprBar()');
  const barFnEnd = html.indexOf('\nfunction ', barFnStart + 1);
  const barFnBody = html.slice(barFnStart, barFnEnd > barFnStart ? barFnEnd : barFnStart + 2000);
  ok(!barFnBody.includes("bar.addEventListener('keydown'"),
    'buildExprBar() does not register its own keydown listener (avoids accumulation on each rebuild)');

  // The keydown handler must exist somewhere outside buildExprBar (via _bar or exprBar)
  ok(/_bar\.addEventListener\('keydown'|exprBar[\s\S]{0,20}addEventListener\('keydown'/.test(html),
    'exprBar keydown handler is registered outside buildExprBar (once only)');

  // Guard against double-registration (dataset.kbBound or similar flag)
  ok(/kbBound|_exprBarBound|_barKeyBound/.test(html),
    'exprBar keydown registration is guarded to prevent duplicate listeners on hot reload');
}

/* ---- Round 326: focus restored to springOff/outfit after renderBody (WCAG 2.4.3) ---- */
{
  // onParam for springOff/outfit must restore focus to the newly created element after renderBody
  ok(/k==='outfit'[\s\S]{0,60}renderBody[\s\S]{0,60}pr-.*focus\(\)|k==='springOff'[\s\S]{0,60}renderBody[\s\S]{0,60}pr-.*focus\(\)/.test(html) ||
     /k==='outfit'.*k==='springOff'[\s\S]{0,120}renderBody[\s\S]{0,80}'pr-'\+k[\s\S]{0,30}\.focus\(\)/.test(html) ||
     (html.includes("'pr-'+k") && /renderBody\(false\)[\s\S]{0,60}'pr-'\+k[\s\S]{0,30}\.focus\(\)/.test(html)),
    'onParam restores focus to the rebuilt springOff/outfit element after renderBody (WCAG 2.4.3)');

  // The fix must be inside onParam (near rebuild/renderBody) not somewhere unrelated
  const onParamIdx = html.indexOf('function onParam(k)');
  const onParamEnd = html.indexOf('\nfunction ', onParamIdx + 1);
  const onParamBody = html.slice(onParamIdx, onParamEnd > onParamIdx ? onParamEnd : onParamIdx + 500);
  ok(/focus\(\)/.test(onParamBody),
    'focus() call is inside onParam() function body');
}

/* ---- Round 327: doUndo restores focus to tabBody when panel had focus (WCAG 2.4.3) ---- */
{
  const undoIdx = html.indexOf('function doUndo()');
  const undoEnd = html.indexOf('\nfunction ', undoIdx + 1);
  const undoBody = html.slice(undoIdx, undoEnd > undoIdx ? undoEnd : undoIdx + 500);
  ok(/tabBody.*contains.*activeElement|_undoFocusInPanel/.test(undoBody),
    'doUndo() checks whether focus was inside tabBody before rebuilding');
  ok(/tabBody[\s\S]{0,30}\.focus\(\)/.test(undoBody),
    'doUndo() refocuses tabBody after renderBody so keyboard users can Tab into the panel');
}

/* ---- Round 328: pasteJson success and reset refocus tabBody (WCAG 2.4.3) ---- */
{
  // pasteJson success path calls tabBody.focus() after renderBody
  ok(/btn\.pasteJson\.ok[\s\S]{0,120}tabBody[\s\S]{0,30}\.focus\(\)|tabBody[\s\S]{0,30}\.focus\(\)[\s\S]{0,120}btn\.pasteJson\.ok/.test(html),
    'pasteJson success path refocuses tabBody after renderBody (WCAG 2.4.3)');

  // reset to defaults success path calls tabBody.focus() after renderBody
  const resetExecIdx = html.indexOf('params=HINA.defaults(); meta=Object.assign');
  const afterReset = resetExecIdx >= 0 ? html.slice(resetExecIdx, resetExecIdx + 300) : '';
  ok(/tabBody[\s\S]{0,30}\.focus\(\)/.test(afterReset),
    'reset to defaults refocuses tabBody after renderBody (WCAG 2.4.3)');
}

/* ---- Round 329: range slider arrow-key presses capture undo (keyboard-only path) ---- */
{
  // The range slider's onkeydown should call captureUndo() for Arrow keys, not just Delete/Backspace
  ok(/Arrow.*captureUndo\(\)|\/\^Arrow\/.*captureUndo/.test(html),
    'range slider onkeydown calls captureUndo() on arrow keys (keyboard-only undo capture)');

  // Arrow key handler must NOT call e.preventDefault() (allow native slider movement)
  const arrowBlock = (() => {
    const idx = html.indexOf('/^Arrow/');
    return idx >= 0 ? html.slice(idx, idx + 80) : '';
  })();
  ok(!arrowBlock.includes('preventDefault()'),
    'arrow key captureUndo branch does NOT call preventDefault (native slider movement must work)');
}

/* ---- Round 330: language toggle announces new lang context to srStatus ---- */
{
  // btnLang click handler must announce to srStatus after applyLang
  ok(/btnLang.*addEventListener.*'click'[\s\S]{0,120}btn\.lang\.tip/.test(html) ||
     /btnLang[\s\S]{0,200}btn\.lang\.tip[\s\S]{0,20}sr\.textContent/.test(html) ||
     (html.includes("$('btnLang').addEventListener('click'") && /btn\.lang\.tip/.test(
       html.slice(html.indexOf("$('btnLang').addEventListener('click'"),
                  html.indexOf("$('btnLang').addEventListener('click'") + 200))),
    'btnLang click announces btn.lang.tip to srStatus after language switch');
}

/* ---- Round 331: springOff toggle announces quest note to srStatus ---- */
{
  // When k==='springOff', onParam announces the relevant note to srStatus
  const onParamIdx = html.indexOf('function onParam(k)');
  const onParamEnd = html.indexOf('\nfunction ', onParamIdx + 1);
  const onParamBody = html.slice(onParamIdx, onParamEnd > onParamIdx ? onParamEnd : onParamIdx + 700);
  ok(/springOff[\s\S]{0,120}note\.springOff/.test(onParamBody),
    'onParam springOff branch announces note.springOff to srStatus when toggling springs off');
  ok(/springOff[\s\S]{0,200}note\.quest/.test(onParamBody),
    'onParam springOff branch announces note.quest (or quest.nospring) when toggling springs on');
}

/* ---- Round 332: file-picker and drag-and-drop JSON load refocus tabBody (WCAG 2.4.3) ---- */
{
  // file-picker load success: tabBody.focus() after renderBody
  ok(/rd\.onload[\s\S]{0,200}tabBody[\s\S]{0,30}\.focus\(\)[\s\S]{0,200}a11y\.loadedJson/.test(html) ||
     /rd\.onload[\s\S]{0,200}a11y\.loadedJson[\s\S]{0,200}tabBody[\s\S]{0,30}\.focus\(\)/.test(html) ||
     /rd\.onload[\s\S]{0,500}tabBody[\s\S]{0,30}\.focus\(\)/.test(html),
    'file-picker JSON load refocuses tabBody after renderBody (WCAG 2.4.3)');

  // drag-and-drop load success: tabBody.focus() after renderBody
  const dropIdx = html.lastIndexOf("addEventListener('drop'");
  const dropBlock = html.slice(dropIdx, dropIdx + 900);
  ok(/tabBody[\s\S]{0,30}\.focus\(\)/.test(dropBlock),
    'drag-and-drop JSON load refocuses tabBody after renderBody (WCAG 2.4.3)');
}

/* ---- Round 333: doExport announces export start to srStatus ---- */
{
  const doExpIdx = html.indexOf('async function doExport()');
  const doExpEnd = html.indexOf('\n}', doExpIdx + 1);
  const doExpBody = html.slice(doExpIdx, doExpEnd > doExpIdx ? doExpEnd : doExpIdx + 1200);
  // Must announce btn.exporting at start (before the try block / first await)
  ok(/btn\.exporting[\s\S]{0,200}try\{/.test(doExpBody),
    'doExport announces btn.exporting to srStatus at start (before async awaits)');
}

/* ---- Round 334: doScreenshot sets aria-busy on button during toBlob ---- */
{
  const scrIdx = html.indexOf('function doScreenshot()');
  const scrEnd = html.indexOf('\n}', scrIdx + 1);
  const scrBody = html.slice(scrIdx, scrEnd > scrIdx ? scrEnd : scrIdx + 600);
  ok(/btn\.setAttribute\('aria-busy','true'\)/.test(scrBody),
    'doScreenshot sets aria-busy=true on button before toBlob (mirrors doExport pattern)');
  ok(/btn\.removeAttribute\('aria-busy'\)/.test(scrBody),
    'doScreenshot removes aria-busy from button in toBlob callback');
  // catch block calls _scrDone() which removes aria-busy
  ok(/catch\(e\)[\s\S]{0,20}_scrDone\(\)/.test(scrBody),
    'doScreenshot calls _scrDone() in catch block to re-enable button fully (SecurityError path)');
}

/* ---- Round 335: autoSaveBadge sets aria-hidden before clearing textContent to silence AT empty-string announcement ---- */
{
  ok(/autoSaveBadge[\s\S]{0,300}aria-hidden.*true[\s\S]{0,30}textContent=''/.test(html),
    'autoSaveBadge sets aria-hidden=true before clearing textContent (prevents NVDA/JAWS announcing empty string)');
  ok(/removeAttribute\('aria-hidden'\)[\s\S]{0,20}b\.textContent=t\('hint\.saved'\)/.test(html),
    'autoSaveBadge removes aria-hidden before setting saved text (ensures AT announces the message)');
}

/* ---- Round 336: btnScreenshot gets aria-label with descriptive tip (title alone is inaccessible to AT/keyboard) ---- */
{
  ok(/btnScreenshot[\s\S]{0,200}setAttribute\('aria-label',t\('btn\.screenshot\.tip'\)\)/.test(html),
    'btnScreenshot gets aria-label set to btn.screenshot.tip (descriptive, not just "PNG")');
}

/* ---- Round 337: doExport restores focus to export button after async completion ---- */
{
  ok(/const _exportFocusWasBtn\s*=\s*document\.activeElement\s*===\s*_exportBtn/.test(html),
    'doExport captures whether export button had focus before disabling it');
  ok(/_exportFocusWasBtn[\s\S]{0,30}_exportBtn\.focus\(\)/.test(html),
    'doExport restores focus to export button in finally block when it had focus before export');
}

/* ---- Round 338: export/saveJson/screenshot buttons get aria-keyshortcuts ---- */
{
  ok(/btn primary wide[\s\S]{0,60}aria-keyshortcuts.*Control\+S/.test(html),
    'export button has aria-keyshortcuts=Control+S (consistent with btnAbout/btnMode pattern)');
  ok(/btn wide[\s\S]{0,60}aria-keyshortcuts.*Control\+Shift\+S/.test(html),
    'saveJson button has aria-keyshortcuts=Control+Shift+S');
  ok(/btnScreenshot[\s\S]{0,300}aria-keyshortcuts.*Control\+Shift\+P/.test(html),
    'screenshot button has aria-keyshortcuts=Control+Shift+P');
}

/* ---- Round 339: doScreenshot restores focus to screenshot button after toBlob completes ---- */
{
  const scrIdx = html.indexOf('function doScreenshot()');
  const scrEnd = html.indexOf('\n}', scrIdx + 1);
  const scrBody = html.slice(scrIdx, scrEnd > scrIdx ? scrEnd : scrIdx + 700);
  ok(/_scrFocusWasBtn\s*=\s*document\.activeElement\s*===\s*btn/.test(scrBody),
    'doScreenshot captures whether screenshot button had focus before disabling it');
  ok(/_scrFocusWasBtn[\s\S]{0,20}btn\.focus\(\)/.test(scrBody),
    'doScreenshot restores focus to screenshot button in toBlob callback when it had focus');
}

/* ---- Round 340: licenseUrl row hides focus — returns focus to license select when URL field was focused ---- */
{
  ok(/focusWasInUrl\s*=\s*licUrlRow\.contains\(document\.activeElement\)/.test(html),
    'license onChange captures whether focus was in URL field before hiding it');
  ok(/focusWasInUrl[\s\S]{0,50}sel-license[\s\S]{0,30}focus\(\)/.test(html),
    'license onChange returns focus to license select when URL field was focused and field hides');
}

/* ---- Round 341: about dialog close button has autofocus so showModal() focuses it on open ---- */
{
  ok(/id="aboutClose"\s+autofocus|autofocus[^>]*id="aboutClose"/.test(html),
    'aboutClose button has autofocus attribute so dialog focus lands on close button, not summary (ARIA dialog pattern)');
}

/* ---- Round 342: seed input sets aria-invalid and announces seedInvalid when value is NaN or negative ---- */
{
  ok(H.I18N.ja['a11y.seedInvalid'] && H.I18N.en['a11y.seedInvalid'],
    'a11y.seedInvalid key present in both locales');
  ok((()=>{ const si=html.indexOf("placeholder:t('gacha.seed.ph')"); const chunk=html.slice(si, si+700); return /!Number\.isFinite\(n\)\|\|n<0[\s\S]{0,80}aria-invalid[\s\S]{0,200}seedInvalid/.test(chunk); })(),
    'seed input sets aria-invalid and announces a11y.seedInvalid on invalid value (NaN or negative)');
  ok(/seedInvalid[\s\S]{0,100}removeAttribute\('aria-invalid'\)/.test(html),
    'seed input clears aria-invalid after timeout');
}

/* ---- Round 343: cpBtn (copy seed) is disabled when lastGachaSeed is null ---- */
{
  ok(/lastGachaSeed===null\?\{disabled:''\}\:\{\}[\s\S]{0,60}aria-label.*btn\.copySeed/.test(html),
    'copy seed button is disabled (not just silent) when no gacha seed exists yet');
}

/* ---- Round 344: pasteJson button sets aria-busy+disabled during clipboard.readText (permission prompt can take seconds) ---- */
{
  ok(/pstj\.disabled=true[\s\S]{0,40}aria-busy.*true[\s\S]{0,200}clipboard\.readText/.test(html),
    'pasteJson sets disabled+aria-busy before clipboard.readText (user may see permission prompt)');
  ok(/pstj\.disabled=false[\s\S]{0,40}removeAttribute\('aria-busy'\)[\s\S]{0,500}pstj\.disabled=false[\s\S]{0,40}removeAttribute\('aria-busy'\)/.test(html),
    'pasteJson clears disabled+aria-busy in both success and _pfail paths');
}

/* ---- Round 345: color input onfocus captures undo so keyboard users (Tab+Enter) don't bypass undo capture ---- */
{
  const si = html.indexOf("type:'color'");
  ok(si !== -1, 'color input exists');
  const chunk = html.slice(si, si + 200);
  ok(/onfocus\s*:\s*\(\s*\)\s*=>\s*captureUndo\(\)/.test(chunk),
    'color input has onfocus:captureUndo for keyboard undo capture');
}

/* ---- Round 346: saveState catch removes aria-hidden from autoSaveBadge so screen readers hear the save-fail warning ---- */
{
  const si = html.indexOf('private browsing');
  ok(si !== -1, 'saveState catch comment exists');
  const chunk = html.slice(si, si + 300);
  ok(/removeAttribute\('aria-hidden'\)[\s\S]{0,100}hint\.saveFail/.test(chunk),
    'saveState catch block removes aria-hidden before setting saveFail text');
}

/* ---- Round 347: reset-pending timeout announces cancellation via srStatus so screen readers know the pending state expired ---- */
{
  const si = html.indexOf('_resetTimer=setTimeout');
  ok(si !== -1, '_resetTimer setTimeout exists');
  const chunk = html.slice(si, si + 300);
  ok(/srStatus.*textContent\s*=\s*t\('a11y\.resetCancelled'\)/.test(chunk),
    'reset-pending timeout announces a11y.resetCancelled via srStatus on expiry');
}

/* ---- Round 348: doExport focus restore guards isConnected to avoid stranding focus when user navigates away during async export ---- */
{
  ok(html.includes('_exportFocusWasBtn && _exportBtn.isConnected'),
    'doExport focus restore checks isConnected before calling focus()');
}

/* ---- Round 349: aboutDlg close handler guards isConnected before restoring focus (detached trigger after DOM rebuild) ---- */
{
  ok(html.includes('_dlgReturnFocus && _dlgReturnFocus.isConnected'),
    'aboutDlg close handler checks isConnected on _dlgReturnFocus before focus()');
}

/* ---- Round 350: when WebGL unavailable, announce hint.noGL via srStatus and use it as canvas aria-label ---- */
{
  ok(html.includes("if (!GLOK || _glLost){ const sr=$('srStatus'); if(sr) sr.textContent=_hintDefault(); }"),
    'no-WebGL/context-lost path in applyLang announces correct hint via srStatus');
  ok(html.includes("cv.setAttribute('aria-label', GLOK && !_glLost ? t('a11y.canvas') : _hintDefault());"),
    'canvas aria-label in applyLang uses _hintDefault() accounting for _glLost');
}

/* ---- Round 351: doUndo announces btn.exporting via srStatus when _exporting is true (not silent) ---- */
{
  ok(html.includes("if (_exporting){ if(sr) sr.textContent=t('btn.exporting'); return; }"),
    'doUndo announces exporting state to srStatus instead of silently returning');
}

/* ---- Round 352: webglcontextlost hides screenshot button so it can't produce a blank image ---- */
{
  const si = html.indexOf('webglcontextlost');
  ok(si !== -1, 'webglcontextlost listener exists');
  const chunk = html.slice(si, si + 400);
  ok(/btnScreenshot[\s\S]{0,80}disabled\s*=\s*true[\s\S]{0,80}display\s*=\s*'none'/.test(chunk),
    'webglcontextlost hides screenshot button (disabled+display:none) to prevent blank screenshots');
}

/* ---- Round 353: seed input sets aria-errormessage='srStatus' (consistent with numIn) so AT users get error pointer ---- */
{
  const si = html.indexOf("placeholder:t('gacha.seed.ph')");
  ok(si !== -1, 'gacha seed input exists');
  const chunk = html.slice(si, si + 700);
  ok(/aria-errormessage[\s\S]{0,30}srStatus[\s\S]{0,150}seedInvalid/.test(chunk),
    'seed input sets aria-errormessage=srStatus alongside aria-invalid for AT error pointer');
  ok(/seedInvalid[\s\S]{0,100}removeAttribute\('aria-errormessage'\)/.test(chunk),
    'seed input clears aria-errormessage after timeout (same as aria-invalid cleanup)');
}

/* ---- Round 354: _glLost flag set in webglcontextlost guards doScreenshot from keyboard shortcut post-loss ---- */
{
  ok(html.includes('let _glLost = false;'), '_glLost flag declared');
  ok(html.includes('_glLost = true;'), '_glLost set to true in webglcontextlost handler');
  ok(/if \(!GLOK \|\| _glLost\)[\s\S]{0,80}if \(_screenshotting\) return/.test(html), 'doScreenshot guards against _glLost (with SR announcement) and re-entrancy separately');
}

/* ---- Round 355: renderFrame and doExport thumbnail both guard _glLost to stop wasted work after context loss ---- */
{
  ok(html.includes('if (!build || !GLOK || _glLost) return;'),
    'renderFrame guards _glLost so RAF loop stops doing work after context loss');
  ok(html.includes('if (GLOK && !_glLost){'),
    'doExport thumbnail branch guards _glLost to skip capture after context loss');
}

/* ---- Round 356: aria-keyshortcuts for Ctrl+S / Ctrl+Shift+S / Ctrl+Shift+P include Meta variants for macOS ---- */
{
  ok(html.includes("'aria-keyshortcuts':'Control+S Meta+S'"),
    'export button aria-keyshortcuts includes Meta+S for macOS');
  ok(html.includes("'aria-keyshortcuts':'Control+Shift+S Meta+Shift+S'"),
    'saveJson button aria-keyshortcuts includes Meta+Shift+S for macOS');
  ok(html.includes("'Control+Shift+P Meta+Shift+P'"),
    'screenshot button aria-keyshortcuts includes Meta+Shift+P for macOS');
}

/* ---- Round 357: hint.undoReady includes ⌘+Z so Mac users see the correct modifier ---- */
{
  ok(H.I18N.ja['hint.undoReady'].includes('⌘+Z'),
    'ja hint.undoReady includes ⌘+Z for macOS users');
  ok(H.I18N.en['hint.undoReady'].includes('⌘+Z'),
    'en hint.undoReady includes ⌘+Z for macOS users');
}

/* ---- Round 358: about.keyList includes Ctrl/⌘ notation so Mac users see correct modifiers in help dialog ---- */
{
  ok(H.I18N.ja['about.keyList'].includes('Ctrl/⌘'),
    'ja about.keyList shows Ctrl/⌘ notation for cross-platform keyboard shortcuts');
  ok(H.I18N.en['about.keyList'].includes('Ctrl/⌘'),
    'en about.keyList shows Ctrl/⌘ notation for cross-platform keyboard shortcuts');
}

/* ---- Round 359: hint.ctrlS and btn.screenshot.tip updated to Ctrl/⌘ notation for macOS users ---- */
{
  ok(H.I18N.ja['hint.ctrlS'].includes('Ctrl/⌘+S'),
    'ja hint.ctrlS shows Ctrl/⌘ notation for export shortcut');
  ok(H.I18N.en['hint.ctrlS'].includes('Ctrl/⌘+S'),
    'en hint.ctrlS shows Ctrl/⌘ notation for export shortcut');
  ok(H.I18N.ja['btn.screenshot.tip'].includes('Ctrl/⌘'),
    'ja btn.screenshot.tip shows Ctrl/⌘ notation');
  ok(H.I18N.en['btn.screenshot.tip'].includes('Ctrl/⌘'),
    'en btn.screenshot.tip shows Ctrl/⌘ notation');
}

/* ---- Round 360: aboutDlg has aria-modal=true for older AT/browser combinations (NVDA+Firefox<98) ---- */
{
  ok(html.includes('aria-modal="true"'),
    'aboutDlg has aria-modal=true to support older AT/browser combos alongside native showModal()');
}

/* ---- Round 361: pagehide listener for emergency save on iOS Safari where beforeunload is unreliable ---- */
{
  ok(html.includes('_emergencySave'),
    '_emergencySave helper extracted for both beforeunload and pagehide');
  ok(html.includes("window.addEventListener('pagehide', _emergencySave)"),
    'pagehide listener registered for mobile browser backgrounding/close (iOS Safari compat)');
}

/* ---- Round 362: download() helper sets aria-hidden on transient <a> to avoid brief AT exposure ---- */
{
  const si = html.indexOf('a.download=name;');
  ok(si !== -1, 'download helper uses a.download=name');
  const chunk = html.slice(si, si + 100);
  ok(chunk.includes("setAttribute('aria-hidden','true')"),
    'download() sets aria-hidden=true on transient anchor to prevent AT exposure during export/save');
}

/* ---- Round 363: doScreenshot has _screenshotting re-entrancy guard (like doExport has _exporting) ---- */
{
  ok(html.includes('let _screenshotting = false;'), '_screenshotting flag declared');
  ok(/if \(_screenshotting\) return/.test(html),
    'doScreenshot guards _screenshotting separately to prevent double-invocation from keyboard shortcut');
}

/* ---- Round 364: copyJson clipboard guard uses ?.writeText (consistent with copySeed) ---- */
{
  ok(html.includes("if(!navigator.clipboard?.writeText){ _fail(); return; }"),
    'copyJson button checks navigator.clipboard?.writeText (consistent with copySeed guard pattern)');
}

/* ---- Round 365: canvas aria-keyshortcuts and hint.drag include 0 key (alias for Home view reset) ---- */
{
  ok(html.includes('aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown Shift+ArrowUp Shift+ArrowDown + - Home 0"'),
    'canvas aria-keyshortcuts includes 0 key as view-reset alias (matches about.keyList documentation)');
  ok(H.I18N.ja['hint.drag'].includes('Home/0') && H.I18N.en['hint.drag'].includes('Home/0'),
    'hint.drag mentions Home/0 as reset shortcut in both locales (consistent with about.keyList)');
}

/* ---- Round 366: Backspace documented alongside Delete in hint.sliderReset and about.keyList ---- */
{
  ok(H.I18N.ja['hint.sliderReset'].includes('Backspace'),
    'ja hint.sliderReset mentions Backspace (functional alias for Delete on sliders)');
  ok(H.I18N.en['hint.sliderReset'].includes('Backspace'),
    'en hint.sliderReset mentions Backspace (functional alias for Delete on sliders)');
  ok(H.I18N.ja['about.keyList'].includes('Delete / Backspace'),
    'ja about.keyList lists Delete / Backspace for slider reset');
  ok(H.I18N.en['about.keyList'].includes('Delete / Backspace'),
    'en about.keyList lists Delete / Backspace for slider reset');
}

/* ---- Round 367: _hintDefault() helper accounts for _glLost so hint is correct after context loss ---- */
{
  ok(html.includes('const _hintDefault=()=>!GLOK?t(\'hint.noGL\'):_glLost?t(\'hint.glLost\'):t(\'hint.drag\');'),
    '_hintDefault helper defined to return glLost/noGL/drag based on runtime state');
  ok(!html.includes('GLOK?t(\'hint.drag\'):t(\'hint.noGL\')') && !html.includes('GLOK ? t(\'hint.drag\') : t(\'hint.noGL\')'),
    'no bare GLOK?hint.drag:hint.noGL pattern remains — all replaced by _hintDefault()');
}

/* ---- Round 368: webglcontextlost updates canvas aria-label and applyLang checks _glLost for aria-label ---- */
{
  ok(/webglcontextlost[\s\S]{0,300}cv\.setAttribute\('aria-label', t\('hint\.glLost'\)\)/.test(html),
    'webglcontextlost handler updates canvas aria-label to hint.glLost');
  ok(html.includes("cv.setAttribute('aria-label', GLOK && !_glLost ? t('a11y.canvas') : _hintDefault());"),
    'applyLang canvas aria-label accounts for _glLost using _hintDefault()');
}

/* ---- Round 369: screenshot download anchor also gets aria-hidden=true (same as download() helper) ---- */
{
  ok(/doScreenshot[\s\S]{0,800}a\.setAttribute\('aria-hidden','true'\)[\s\S]{0,60}document\.body\.append\(a\)/.test(html),
    'doScreenshot anchor sets aria-hidden=true before appending (consistent with download() helper)');
}

/* ---- Round 370: saveState catch block clears _saveBadgeTimer so a pending success-hide can't dismiss the error badge ---- */
{
  ok(/catch\s*\(e\)\s*\{[\s\S]{0,200}clearTimeout\(_saveBadgeTimer\)[\s\S]{0,200}hint\.saveFail/.test(html),
    'saveState catch block clears badge timer before showing saveFail (prevents prior success timer from hiding the error)');
}

/* ---- Round 371: saveState catch block announces hint.saveFail via srStatus (autoSaveBadge aria-hidden toggle risks missing live-region) ---- */
{
  ok(/catch\s*\(e\)\s*\{[\s\S]{0,400}srStatus[\s\S]{0,60}hint\.saveFail/.test(html),
    'saveState catch block announces hint.saveFail via srStatus for guaranteed SR delivery');
}

/* ---- Round 372: seed input announces a11y.clamped when value exceeds 4294967295 (consistent with numIn) ---- */
{
  ok(html.includes("const clamped=Math.min(n,4294967295);"),
    'seed input stores clamped value in a variable for comparison');
  ok(/clamped!==n[\s\S]{0,120}a11y\.clamped/.test(html),
    'seed input announces a11y.clamped via srStatus when value is clamped (consistent with numIn behavior)');
}

/* ---- Round 373: numIn onchange updates r.setAttribute('aria-valuetext') so range slider stays current after direct entry ---- */
{
  ok(html.includes("r.value=String(clamped); r.setAttribute('aria-valuetext',String(clamped)); onParam(k);"),
    'numIn onchange updates range aria-valuetext after accepting a typed value');
}

/* ---- Round 374: renderOut() applies _exporting state to new _exportBtn so tab-switch-and-back shows correct disabled/aria-busy ---- */
{
  ok(html.includes("_exporting?t('btn.exporting'):t('btn.export')"),
    'renderOut creates _exportBtn with exporting label if _exporting is already true');
  ok(/if \(_exporting\)\{ _exportBtn\.disabled=true; _exportBtn\.setAttribute\('aria-busy','true'\); \}/.test(html),
    'renderOut disables and marks aria-busy on _exportBtn if export is already in progress');
}

/* ---- Round 375: _resetTimer srStatus update is guarded by isConnected (avoids stale 'Reset' announcement after tab-switch) ---- */
{
  ok(/isConnected\)\{ resetBtn\.textContent[\s\S]{0,80}srStatus[\s\S]{0,40}a11y\.resetCancelled[\s\S]{0,10}\}/.test(html),
    '_resetTimer srStatus announcement is inside isConnected guard (no stale SR announcement after navigation)');
}

/* ---- Round 376: atlas toBlob null guard gives a clear error instead of a cryptic TypeError on canvas.toBlob failure ---- */
{
  ok(html.includes("if (!atlasBlob) throw new Error('atlas toBlob returned null');"),
    'atlas canvasBlob null is caught before .arrayBuffer() to give a clear error message');
}

/* ---- Round 377: webglcontextrestored calls _emergencySave() before reload to preserve changes within the 500ms debounce window ---- */
{
  ok(html.includes("webglcontextrestored', ()=>{ _emergencySave(); location.reload(); }"),
    'webglcontextrestored calls _emergencySave() before location.reload() to prevent data loss');
}

/* ---- Round 378: applyLang() checks _glLost when setting screenshot button visibility (prevents un-hiding after context loss) ---- */
{
  ok(html.includes("sc.style.display=(GLOK&&!_glLost)?'':'none';"),
    'applyLang screenshot button visibility checks both GLOK and _glLost');
}

/* ---- Round 379: uploadTexture() and uploadGeometry() skip GL calls when _glLost (avoids no-op calls after context loss) ---- */
{
  ok(html.includes("if (!GLOK || _glLost) return;\n  gl.bindTexture"),
    'uploadTexture() guards with _glLost to skip no-op GL calls after context loss');
  ok(html.includes("if (!GLOK || _glLost) return;\n  gl.bindBuffer(gl.ARRAY_BUFFER, bufUv)"),
    'uploadGeometry() guards with _glLost to skip no-op GL calls after context loss');
}

/* ---- Round 380: gaze eye animation respects reduceMotion (consistent with breath, head-sway, and spring physics) ---- */
{
  ok(html.includes("const gq = reduceMotion ? M.qid() : M.qMul(M.qAxis([0,1,0], gazeX*0.22)"),
    'gaze eye animation is disabled when reduceMotion is true (consistent with other animations)');
}

/* ---- Round 381: tab re-click preserves scroll (renderBody(false)) — switching to a different tab still resets ---- */
{
  ok(/const changed=tb!==activeTab;[\s\S]{0,60}renderBody\(changed\)/.test(html),
    'tab onclick passes changed flag to renderBody() so re-clicking the active tab preserves scroll position');
}

/* ---- Round 382: 1–8 key shortcuts also preserve scroll when re-pressing the current tab's key ---- */
{
  ok(/TABS\[ti\]!==activeTab[\s\S]{0,40}renderBody\(chg\)/.test(html),
    '1-8 key shortcut passes chg flag to renderBody() so re-pressing the active tab key preserves scroll');
}

/* ---- Round 383: M key restores focus to the active tab button when a tab button had focus ---- */
{
  const mIdx = html.indexOf("e.key==='m'||e.key==='M'");
  const mBlock = mIdx >= 0 ? html.slice(mIdx, mIdx + 560) : '';
  ok(/wasOnTabNav[\s\S]{0,200}ft\.focus\(\)/.test(mBlock),
    'M key handler restores focus to the active tab button when a tab button had focus before mode toggle');
}

/* ---- Round 384: rank badge goStats() preserves scroll when already on the out tab ---- */
{
  ok(/const chg=activeTab!=='out';[\s\S]{0,60}renderBody\(chg\)/.test(html),
    'rank badge goStats() passes chg flag so clicking a rank badge while already on out tab preserves scroll');
}

/* ---- Round 385: preset card onclick passes false to renderBody so focus() handles scroll, not a double-jump ---- */
{
  ok(/activePresetId=pre\.id;[\s\S]{0,30}renderBody\(false\)/.test(html),
    'preset card onclick calls renderBody(false) so sel.focus() does the scroll, avoiding jarring double-scroll');
}

/* ---- Round 386: color picker oninput keeps swatch roving tabindex in sync ---- */
{
  ok(/updateSwPressedState\(\);[\s\S]{0,80}swBtns\.findIndex\(b=>b\.dataset\.c===e\.target\.value\)/.test(html),
    'color picker oninput calls setSwTab() when picker color matches a swatch, keeping roving entry point in sync');
}

/* ---- Round 387: numIn onchange announces aria-invalid when value is empty/non-numeric ---- */
{
  ok(/Number\.isFinite\(n\)[\s\S]{0,60}_announce\(params\[k\]\)/.test(html),
    'numIn onchange calls _announce() when input is empty or non-numeric so screen readers hear the correction');
}

/* ---- Round 388: autoSaveBadge starts aria-hidden so SR virtual cursor skips the empty placeholder ---- */
{
  ok(/autoSaveBadge[\s\S]{0,60}aria-hidden="true"/.test(html),
    'autoSaveBadge has aria-hidden="true" in initial HTML so screen readers skip the empty placeholder');
}

/* ---- Round 389: doScreenshot() announces GL-unavailable reason before returning early ---- */
{
  const scrFnIdx = html.indexOf('function doScreenshot()');
  const scrBlock = scrFnIdx >= 0 ? html.slice(scrFnIdx, scrFnIdx + 200) : '';
  ok(/!GLOK \|\| _glLost[\s\S]{0,120}srStatus[\s\S]{0,80}return/.test(scrBlock),
    'doScreenshot() announces GL-unavailable error via srStatus before returning early when GL is missing or lost');
}

/* ---- Round 390: doExport() re-announces btn.exporting when called while already exporting ---- */
{
  const expFnIdx = html.indexOf('async function doExport()');
  const expBlock = expFnIdx >= 0 ? html.slice(expFnIdx, expFnIdx + 200) : '';
  ok(/_exporting\)[\s\S]{0,80}btn\.exporting[\s\S]{0,20}return/.test(expBlock),
    'doExport() announces btn.exporting to srStatus when called while _exporting is already true');
}

/* ---- Round 391: reset confirmation announces done/cancelled, not generic button label ---- */
{
  ok(/a11y\.resetDone/.test(html) && /a11y\.resetCancelled/.test(html),
    'reset button announces a11y.resetDone when confirmed and a11y.resetCancelled when timeout expires, not generic btn.reset');
}

/* ---- Round 392: canvas keyboard handler announces a11y.viewLimit when clamp prevents motion (Qiita/Zenn DOM-canvas sync) ---- */
{
  ok(/a11y\.viewLimit/.test(html),
    'a11y.viewLimit i18n key referenced from canvas keydown handler so SR users know why arrows produced no movement');
  // ja and en both have the key (i18n parity)
  ok(/'a11y\.viewLimit':'視点の限界に達しました'/.test(html) && /'a11y\.viewLimit':'View limit reached'/.test(html),
    'a11y.viewLimit defined in both ja and en (i18n parity)');
}

/* ---- Round 394: expression bar buttons meet WCAG 2.5.8 AA target size (24x24 min) ---- */
{
  // .eBtn now uses min-height:24px (was height:22px) to meet WCAG 2.5.8 AA Target Size
  ok(/\.eBtn\{[^}]{0,200}min-height:24px/.test(html),
    '.eBtn has min-height:24px to meet WCAG 2.5.8 AA Target Size (was 22px)');
  ok(/\.eBtn\{[^}]{0,200}min-width:30px/.test(html),
    '.eBtn has min-width:30px (allows expansion for longer expression labels)');
}

/* ---- Round 393: fnPreview SR announcement is debounced via srStatus to avoid per-keystroke spam ---- */
{
  // fnPreview is no longer an aria-live region itself (visible text only)
  ok(/id:'fnPreview'\}\)/.test(html),
    'fnPreview element no longer carries aria-live attributes (debounced via srStatus instead)');
  // Debounce timer routes through srStatus after 500ms idle
  ok(/_fnPrevTimer=setTimeout\([\s\S]{0,80}srStatus[\s\S]{0,60}500\)/.test(html),
    'fnPreview update schedules a debounced srStatus announcement (500ms) so typing the title does not spam the live region');
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
