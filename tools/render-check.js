#!/usr/bin/env node
/*
 * tools/render-check.js — visual regression check (Round 520)
 *
 * WHY THIS EXISTS
 * Round 519 found a bug that no amount of data-level testing could have caught: the preview's
 * inverted-hull outline was covering 39% of the avatar's body. The geometry was valid, the
 * normals were correct, and the full glTF/VRM conformance sweep passed clean both before and
 * after. It only became visible by actually rendering the app. That capability lived in a
 * throwaway script; this file makes it repeatable.
 *
 * RELATIONSHIP TO tests/run.js
 * This is NOT part of the test suite and is never required. `node tests/run.js` stays
 * dependency-free and is the authority for correctness. This tool needs Chromium via
 * playwright, so it SKIPS cleanly (exit 0) wherever that is unavailable.
 *
 * WHAT IT CAN AND CANNOT SEE
 * The RENDERED PREVIEW cannot show colour under a software rasteriser: SwiftShader's
 * canvas-to-texture upload yields an empty texture, so the main fragment shader's leading
 * `if (c.a < 0.5) discard;` kills every fragment. (The product is not at fault — the atlas is
 * correct at upload time and UNPACK_FLIP_Y_WEBGL is set.) To see shape at all, this tool
 * renders a PATCHED COPY with that discard removed and the body forced to a flat colour. It
 * therefore judges only objectively-wrong states — occlusion, empty draws, gross asymmetry —
 * never "does this look nice".
 *
 * Round 538 corrects a claim this file used to make. It said colour was "NOT verifiable", full
 * stop. That was true of the preview and false of the product: what a VRChat user actually sees
 * is the texture embedded in the exported .vrm, which is a FILE, not a render. Reading it needs
 * no GPU at all — the GLB carries a PNG, and Node's zlib decodes it. The preview limitation had
 * been generalised into a limitation on the whole product, which quietly left the app's entire
 * colour pipeline with no end-to-end coverage: swapping `block('skin', p.skinTone)` to
 * `p.hairColor` — every avatar's skin painted the wrong colour, plainly visible in VRChat —
 * passed all 2094 unit tests, the official Khronos glTF-Validator, and three-vrm, because those
 * check UVs and structure and never the painted pixels. That mutation is what the section below
 * now catches.
 *
 * USAGE
 *   node tools/render-check.js            # all cases
 *   node tools/render-check.js --keep     # also leave the PNGs on disk for inspection
 * Exits non-zero if any case fails a threshold.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const KEEP = process.argv.includes('--keep');

/* ---- Round 538: read the texture out of an exported .vrm. Zero dependencies: a GLB is a
   header + JSON chunk + BIN chunk, and canvas.toBlob() emits an 8-bit non-interlaced PNG,
   which is zlib plus per-row filters — both in Node's stdlib. ---- */
const zlib = require('zlib');

function glbImage(buf){                      // first embedded image of a GLB
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  const im = json.images && json.images[0];
  if (!im) throw new Error('the exported GLB carries no image');
  const bv = json.bufferViews[im.bufferView];
  const start = 20 + jsonLen + 8 + (bv.byteOffset || 0);
  return { mime: im.mimeType, bytes: buf.slice(start, start + bv.byteLength) };
}

function decodePNG(buf){
  if (buf.readUInt32BE(0) !== 0x89504E47) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0; const idat = [];
  while (off < buf.length){
    const len = buf.readUInt32BE(off), type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.slice(off + 8, off + 8 + len);
    if (type === 'IHDR'){
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; ctype = data[9];
      if (data[12] !== 0) throw new Error('interlaced PNG unsupported');
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  if (depth !== 8) throw new Error('bit depth ' + depth + ' unsupported');
  const ch = ctype === 6 ? 4 : ctype === 2 ? 3 : ctype === 0 ? 1 : null;
  if (!ch) throw new Error('colour type ' + ctype + ' unsupported');
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * ch, out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++){
    const f = raw[pos++], line = raw.slice(pos, pos + stride); pos += stride;
    const cur = out.slice(y * stride, (y + 1) * stride);
    const prev = y ? out.slice((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++){
      const a = x >= ch ? cur[x - ch] : 0, b = prev ? prev[x] : 0, c = (prev && x >= ch) ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4){
        const pr = a + b - c, pa = Math.abs(pr - a), pb = Math.abs(pr - b), pc = Math.abs(pr - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 255;
    }
  }
  return { w, h, ch, data: out };
}
const pixel = (img, x, y) => {
  const i = (y * img.w + x) * img.ch;
  return { r: img.data[i], g: img.data[i+1], b: img.data[i+2], a: img.ch === 4 ? img.data[i+3] : 255 };
};
const toHex = c => '#' + [c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('');

/* core is the oracle: it knows the atlas layout and what colours a given seed must produce */
function loadCore(){
  const html = fs.readFileSync(INDEX, 'utf8');
  const a = html.indexOf('/*HINA-CORE-START*/'), b = html.indexOf('/*HINA-CORE-END*/');
  const mod = { exports: {} };
  new Function('module', 'exports', html.slice(a, b))(mod, mod.exports);
  return mod.exports;
}

/* ---- resolve playwright from anywhere it might live, else skip ---- */
function loadPlaywright(){
  const candidates = [
    'playwright',
    '/opt/node22/lib/node_modules/playwright',
    '/usr/lib/node_modules/playwright',
    '/usr/local/lib/node_modules/playwright',
    path.join(ROOT, 'node_modules', 'playwright'),
  ];
  for (const c of candidates){
    try { return require(c); } catch (_) { /* try next */ }
  }
  return null;
}

/* ---- the patch that makes shape visible under a software rasteriser ---- */
function patchForShape(src, opts){
  let s = src.replace('if(c.a<0.5)discard;', '');           // texture is empty here; keep fragments
  s = s.replace("'gl_FragColor=vec4(col,1.0);}'",           // flat body colour, easy to count
                "'gl_FragColor=vec4(1.0,0.0,1.0,1.0);}'");
  if (opts && opts.noOutline)
    s = s.replace('gl.drawElements(gl.TRIANGLES, outlineCount, gl.UNSIGNED_SHORT, 0);', '');
  if (opts && opts.params)                                   // seed the app's saved state
    s = s.replace('<body', '<script>try{localStorage.setItem("hina.v1",JSON.stringify('
      + JSON.stringify({ params: opts.params }) + '))}catch(e){}</script><body');
  return s;
}

/* ---- image metrics, computed in-page (a PNG decoder we already have: the browser) ---- */
async function metrics(page, pngPath){
  const b64 = fs.readFileSync(pngPath).toString('base64');
  return page.evaluate(async d => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + d; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const px = cx.getImageData(0, 0, c.width, c.height).data;
    const isBody = i => px[i] > 180 && px[i+1] < 90 && px[i+2] > 180;
    let n = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    const mask = new Uint8Array(c.width * c.height);
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++){
        const i = (y * c.width + x) * 4;
        if (!isBody(i)) continue;
        mask[y * c.width + x] = 1; n++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    // left-right symmetry across the silhouette's own centre, measured only inside its bbox
    let mism = 0, cmp = 0;
    if (n > 0){
      const cxm = (minX + maxX) / 2;
      for (let y = minY; y <= maxY; y++)
        for (let x = minX; x <= Math.floor(cxm); x++){
          const mx = Math.round(2 * cxm - x);
          if (mx < 0 || mx >= c.width) continue;
          cmp++;
          if (mask[y * c.width + x] !== mask[y * c.width + mx]) mism++;
        }
    }
    return { w: c.width, h: c.height, body: n,
             bbox: n ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null,
             asym: cmp ? mism / cmp : 1 };
  }, b64);
}

/* ---- thresholds (see docs/FEATURE_AUDIT.md §2 Round 519 / §5-16 for provenance) ---- */
// Baseline on the default avatar at 720x741: 96,369 body px with the outline on versus 96,825
// with it disabled — a ratio of 0.995. Before Round 519's winding fix the ratio was 0.61.
// 0.90 sits far below any legitimate outline rim and far above the broken state.
const MIN_OUTLINE_RATIO = 0.90;
const MIN_BODY_FRACTION = 0.02;   // an avatar filling <2% of the canvas means it failed to draw
const MAX_ASYMMETRY     = 0.12;   // hair styles are deliberately asymmetric; this catches gross breakage

async function main(){
  const pw = loadPlaywright();
  if (!pw || !pw.chromium){
    console.log('SKIP: playwright/chromium not available — visual check not run.');
    console.log('      (node tests/run.js is the authority for correctness and needs no browser.)');
    return 0;
  }
  const src = fs.readFileSync(INDEX, 'utf8');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hina-render-'));

  // Cases: the shapes a user can actually reach. Params are merged over defaults by the app.
  const cases = [
    { name: 'default',           params: {} },
    { name: 'hair:twin',         params: { hairStyle: 'twin' } },
    { name: 'hair:pony',         params: { hairStyle: 'pony' } },
    { name: 'hair:bob',          params: { hairStyle: 'bob' } },
    { name: 'hair:long',         params: { hairStyle: 'long' } },
    { name: 'hair:short',        params: { hairStyle: 'short' } },
    { name: 'outfit:onepiece',   params: { outfit: 'onepiece' } },
    { name: 'outfit:sailor',     params: { outfit: 'sailor' } },
    { name: 'outfit:hoodie',     params: { outfit: 'hoodie' } },
    { name: 'outfit:shirts',     params: { outfit: 'shirts' } },
    { name: 'tallest',           params: { height: 2.0 } },
    { name: 'shortest',          params: { height: 0.8 } },
    { name: 'springs off',       params: { springOff: true } },
  ];

  const browser = await pw.chromium.launch({
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle',
           '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
  });
  const shot = async (html, file) => {
    const p = path.join(tmp, file + '.html');
    fs.writeFileSync(p, html);
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message).slice(0, 120)));
    await page.goto('file://' + p);
    await page.waitForTimeout(2600);
    const el = await page.$('canvas');
    const png = path.join(tmp, file + '.png');
    if (el) await el.screenshot({ path: png });
    await page.close();
    return { png: el ? png : null, errs };
  };

  const probe = await browser.newPage();
  await probe.goto('about:blank');

  let failures = 0;
  console.log('case                 body px   ratio   bbox            asym   verdict');
  console.log('-------------------------------------------------------------------------');
  for (const c of cases){
    const withOutline = await shot(patchForShape(src, { params: c.params }), c.name.replace(/\W+/g, '_') + '_on');
    const noOutline   = await shot(patchForShape(src, { params: c.params, noOutline: true }), c.name.replace(/\W+/g, '_') + '_off');
    if (!withOutline.png || !noOutline.png){
      console.log(`${c.name.padEnd(20)} (no canvas rendered)                          FAIL`);
      failures++; continue;
    }
    const a = await metrics(probe, withOutline.png);
    const b = await metrics(probe, noOutline.png);
    const ratio = b.body ? a.body / b.body : 0;
    const frac = a.body / (a.w * a.h);
    const problems = [];
    // The check Round 519 would have caught: the outline pass must not eat the body.
    if (ratio < MIN_OUTLINE_RATIO) problems.push(`outline hides body (ratio ${ratio.toFixed(3)})`);
    if (frac < MIN_BODY_FRACTION) problems.push(`body barely drawn (${(frac*100).toFixed(2)}% of canvas)`);
    if (a.asym > MAX_ASYMMETRY) problems.push(`gross asymmetry (${a.asym.toFixed(3)})`);
    if (withOutline.errs.length) problems.push('page error: ' + withOutline.errs[0]);
    const bb = a.bbox ? `${a.bbox.w}x${a.bbox.h}@${a.bbox.x},${a.bbox.y}` : '-';
    console.log(`${c.name.padEnd(20)} ${String(a.body).padStart(7)} ${ratio.toFixed(3).padStart(7)}`
      + `   ${bb.padEnd(15)} ${a.asym.toFixed(3)}  ${problems.length ? 'FAIL — ' + problems.join('; ') : 'ok'}`);
    if (problems.length) failures++;
  }

  /* --- Round 529: end-to-end export. Everything above proves the avatar DRAWS; this proves the
     button a user actually clicks produces a real file. Until now export was only ever exercised
     by calling exportVRM() from Node — never through the UI. Runs with the File System Access API
     removed so the download path is taken (in Chrome/Edge the app opens a save dialog instead,
     which cannot be driven headlessly); also checks the app recovers when that dialog is
     cancelled, since that is a reachable user action. --- */
  console.log('\nexport end-to-end:');
  {
    const ctx2 = await browser.newContext({ viewport:{width:1200,height:900}, acceptDownloads:true });
    const p2 = await ctx2.newPage();
    const perr = [];
    p2.on('pageerror', e => perr.push(String(e.message).slice(0,120)));
    await p2.addInitScript(() => { delete window.showSaveFilePicker; });
    await p2.goto('file://' + INDEX);
    await p2.waitForTimeout(2400);
    try {
      await p2.getByRole('tab', { name: /Export|出力/ }).click();
      await p2.waitForTimeout(600);
      const title = await p2.$('#meta-title');
      if (title) await title.fill('RenderCheck');
      let btn = null;
      for (const b of await p2.$$('#tabBody button')){
        const s2 = (await b.textContent() || '').trim();
        if (/Export VRM|VRM 書き出し/.test(s2)){ btn = b; break; }
      }
      if (!btn) throw new Error('export button not found');
      const [download] = await Promise.all([
        p2.waitForEvent('download', { timeout: 45000 }).catch(() => null),
        btn.click(),
      ]);
      if (!download) throw new Error('clicking Export produced no download');
      const out = path.join(tmp, download.suggestedFilename());
      await download.saveAs(out);
      const buf = fs.readFileSync(out);
      const magic = buf.readUInt32LE(0), declared = buf.readUInt32LE(8);
      const okMagic = magic === 0x46546C67;            // 'glTF'
      const okLen = declared === buf.length;
      const okName = /\.vrm$/i.test(download.suggestedFilename());
      const bad = [];
      if (!okMagic) bad.push('bad GLB magic 0x' + magic.toString(16));
      if (!okLen) bad.push(`declared length ${declared} != file size ${buf.length}`);
      if (!okName) bad.push('downloaded file is not named *.vrm');
      if (buf.length < 50000) bad.push(`suspiciously small (${buf.length} bytes)`);
      if (perr.length) bad.push('page error: ' + perr[0]);
      console.log(`  ${download.suggestedFilename().padEnd(20)} ${String(buf.length).padStart(8)} bytes  `
        + (bad.length ? 'FAIL — ' + bad.join('; ') : 'ok (valid GLB header, length matches)'));
      if (bad.length) failures++;
    } catch (e) {
      console.log('  export flow            FAIL — ' + String(e.message).slice(0,140));
      failures++;
    }
    await ctx2.close();
  }

  /* --- Round 530: the app's other two user-facing promises, verified through the real UI.
     Export (above) proves a file comes out. These prove the app can audit itself and that a
     user's work is not lost. Both were previously only covered by unit-level tests. --- */
  console.log('\nself-test and persistence:');
  {
    // (a) ?selftest — the product's own audit affordance, central to "single HTML = auditable"
    const p3 = await browser.newPage({ viewport:{width:1200,height:900} });
    const e3 = [];
    p3.on('pageerror', e => e3.push(String(e.message).slice(0,120)));
    try {
      await p3.goto('file://' + INDEX + '?selftest');
      await p3.waitForTimeout(2600);
      const r = await p3.evaluate(() => {
        try {
          const res = HINA.selfTest();
          const bad = (res.results || []).filter(x => !x.ok).map(x => x.name);
          return { ok: !!res.ok, total: (res.results || []).length, bad };
        } catch (err) { return { ok:false, total:0, bad:['threw: ' + err.message] }; }
      });
      const bad = [];
      if (!r.ok) bad.push('selfTest() reported not-ok: ' + r.bad.join(', '));
      if (r.total < 10) bad.push(`only ${r.total} checks ran`);
      if (e3.length) bad.push('page error: ' + e3[0]);
      console.log(`  ${'?selftest'.padEnd(20)} ${String(r.total).padStart(8)} checks  `
        + (bad.length ? 'FAIL — ' + bad.join('; ') : 'ok (all checks pass in-browser)'));
      if (bad.length) failures++;
    } catch (e) {
      console.log('  ?selftest              FAIL — ' + String(e.message).slice(0,120)); failures++;
    }
    await p3.close();

    // (b) auto-save round-trip: edit through the UI, reload, confirm the work came back
    const ctx3 = await browser.newContext({ viewport:{width:1200,height:900} });
    const p4 = await ctx3.newPage();
    const e4 = [];
    p4.on('pageerror', e => e4.push(String(e.message).slice(0,120)));
    try {
      await p4.goto('file://' + INDEX);
      await p4.waitForTimeout(2500);
      await p4.getByRole('tab', { name: /Hair|髪/ }).click();
      await p4.waitForTimeout(400);
      const sel = await p4.$('#pr-hairStyle');
      if (!sel) throw new Error('hair style control not found');
      const opts = await sel.$$eval('option', o => o.map(x => x.value));
      const current = await sel.inputValue();
      const pick = opts.find(o => o !== current) || opts[0];
      await sel.selectOption(pick);
      await p4.waitForTimeout(400);
      await p4.getByRole('tab', { name: /Export|出力/ }).click();
      await p4.waitForTimeout(400);
      const title = await p4.$('#meta-title');
      if (title) await title.fill('PersistCheck');
      await p4.waitForTimeout(600);

      await p4.reload();
      await p4.waitForTimeout(2500);
      await p4.getByRole('tab', { name: /Hair|髪/ }).click();
      await p4.waitForTimeout(400);
      const gotHair = await p4.$eval('#pr-hairStyle', e => e.value).catch(() => null);
      await p4.getByRole('tab', { name: /Export|出力/ }).click();
      await p4.waitForTimeout(400);
      const gotTitle = await p4.$eval('#meta-title', e => e.value).catch(() => null);

      const bad = [];
      if (gotHair !== pick) bad.push(`hair style not restored (wanted ${pick}, got ${gotHair})`);
      if (gotTitle !== 'PersistCheck') bad.push(`name not restored (got ${JSON.stringify(gotTitle)})`);
      if (e4.length) bad.push('page error: ' + e4[0]);
      console.log(`  ${'auto-save reload'.padEnd(20)} ${String(pick).padStart(8)}         `
        + (bad.length ? 'FAIL — ' + bad.join('; ') : 'ok (edits survive a reload)'));
      if (bad.length) failures++;
    } catch (e) {
      console.log('  auto-save reload       FAIL — ' + String(e.message).slice(0,120)); failures++;
    }
    await ctx3.close();
  }

  /* --- Round 531: the last two user-facing promises — the share URL and undo/redo.
     ?seed=N is the distribution promise ("send this link, your friend gets the same avatar").
     Determinism alone is not enough to verify it: an implementation that ignored the seed and
     always produced the same avatar would pass an identity check, so this asserts BOTH that the
     same seed reproduces and that a different seed differs. Undo/redo is driven with real
     keyboard events, not function calls. --- */
  console.log('\nshare URL and undo/redo:');
  {
    const paramsSig = pg => pg.evaluate(() => {
      try { return JSON.stringify((JSON.parse(localStorage.getItem('hina.v1')) || {}).params || {}); }
      catch (e) { return null; }
    });
    // (a) ?seed=N reproducibility across fresh contexts
    try {
      const sigs = [];
      for (const seed of [12345, 12345, 999]){
        const c5 = await browser.newContext({ viewport:{width:1100,height:800} });
        const p5 = await c5.newPage();
        await p5.goto('file://' + INDEX + '?seed=' + seed);
        await p5.waitForTimeout(2400);
        sigs.push(await paramsSig(p5));
        await c5.close();
      }
      const bad = [];
      if (!sigs[0] || sigs[0] !== sigs[1]) bad.push('same seed did not reproduce');
      if (sigs[0] === sigs[2]) bad.push('different seed produced the same avatar (seed ignored)');
      console.log(`  ${'?seed share URL'.padEnd(20)}          `
        + (bad.length ? 'FAIL — ' + bad.join('; ') : 'ok (seed 12345 reproduces; 999 differs)'));
      if (bad.length) failures++;
    } catch (e) {
      console.log('  ?seed share URL        FAIL — ' + String(e.message).slice(0,120)); failures++;
    }
    // (b) undo/redo through real keyboard events
    const c6 = await browser.newContext({ viewport:{width:1200,height:900} });
    const p6 = await c6.newPage();
    const e6 = [];
    p6.on('pageerror', e => e6.push(String(e.message).slice(0,120)));
    try {
      await p6.goto('file://' + INDEX);
      await p6.waitForTimeout(2500);
      await p6.getByRole('tab', { name: /Hair|髪/ }).click();
      await p6.waitForTimeout(400);
      const sel6 = await p6.$('#pr-hairStyle');
      if (!sel6) throw new Error('hair style control not found');
      const opts6 = await sel6.$$eval('option', o => o.map(x => x.value));
      const orig = await sel6.inputValue();
      const pick6 = opts6.find(o => o !== orig);
      await sel6.selectOption(pick6);
      await p6.waitForTimeout(500);
      await p6.keyboard.press('Control+z');
      await p6.waitForTimeout(700);
      await p6.getByRole('tab', { name: /Hair|髪/ }).click();
      await p6.waitForTimeout(400);
      const afterUndo = await p6.$eval('#pr-hairStyle', e => e.value).catch(() => null);
      await p6.keyboard.press('Control+Shift+z');
      await p6.waitForTimeout(700);
      await p6.getByRole('tab', { name: /Hair|髪/ }).click();
      await p6.waitForTimeout(400);
      const afterRedo = await p6.$eval('#pr-hairStyle', e => e.value).catch(() => null);
      const bad = [];
      if (afterUndo !== orig) bad.push(`Ctrl+Z did not restore (wanted ${orig}, got ${afterUndo})`);
      if (afterRedo !== pick6) bad.push(`Ctrl+Shift+Z did not reapply (wanted ${pick6}, got ${afterRedo})`);
      if (e6.length) bad.push('page error: ' + e6[0]);
      console.log(`  ${'undo / redo'.padEnd(20)}          `
        + (bad.length ? 'FAIL — ' + bad.join('; ') : `ok (${orig}→${pick6}→undo→redo round-trips)`));
      if (bad.length) failures++;
    } catch (e) {
      console.log('  undo / redo            FAIL — ' + String(e.message).slice(0,120)); failures++;
    }
    await c6.close();
  }

  /* --- Round 548: an action's screen-reader announcement must survive. SWOT claims "SR announcement
     discipline (showErr unified, spam suppressed, focus restored)". Focus restoration measured
     clean across seven DOM-rebuilding actions, but the announcement did not: clicking "Make it
     Quest Excellent" announced the right thing and then, 500ms later, a debounced filename
     announcement from renderOut() overwrote it — so a screen-reader user was told the wrong thing
     about what they had just done. No source-level test can see that; it is only visible as a
     sequence in time, which is why this watches srStatus with a MutationObserver and asserts on
     the LAST message rather than the first. --- */
  console.log('\nscreen-reader announcement survives the action:');
  {
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const pa = await ctxA.newPage();
    const bad = [];
    let writes = [];
    try {
      await pa.goto('file://' + INDEX);
      await pa.waitForTimeout(2500);
      // give the avatar spring bones so the Quest rank drops and the fix button appears
      await pa.getByRole('tab', { name: /Hair|髪/ }).click(); await pa.waitForTimeout(450);
      await pa.selectOption('#pr-hairStyle', 'twin'); await pa.waitForTimeout(900);
      await pa.getByRole('tab', { name: /Export|出力/ }).click(); await pa.waitForTimeout(700);

      await pa.evaluate(() => {
        window.__sr = [];
        const el = document.getElementById('srStatus');
        new MutationObserver(() => window.__sr.push(el.textContent.trim()))
          .observe(el, { childList: true, characterData: true, subtree: true });
      });
      const btn = pa.getByRole('button', { name: /Make it Quest Excellent|Quest Excellent にする/ }).first();
      if (!(await btn.count())) bad.push('the Quest-fix button did not appear, so nothing was measured');
      else {
        await btn.click();
        await pa.waitForTimeout(1600);          // longer than the 500ms filename debounce
        writes = await pa.evaluate(() => window.__sr);
        if (!writes.length) bad.push('no announcement at all for an action that changes the avatar');
        else {
          const last = writes[writes.length - 1];
          if (!/Quest Excellent|Excellent/.test(last))
            bad.push(`the action's announcement was overwritten — last message was ${JSON.stringify(last)}`);
          if (writes.some(w => /File name|ファイル名/.test(w)))
            bad.push('a filename announcement fired for an action that did not change the filename');
        }
      }
    } catch (e) { bad.push('threw: ' + String(e.message).slice(0, 110)); }
    console.log('  quest-fix announcement    '
      + (bad.length ? 'FAIL — ' + bad.join('; ')
         : `ok (${writes.length} announcement(s), last one is the action's own and no stray filename message)`));
    if (bad.length) failures++;
    await ctxA.close();
  }

  /* --- Round 546: typing a seed must apply THAT seed, whether you leave the field with Tab or
     with Enter. The field carries enterkeyhint='go', so Enter is the gesture it invites — on a
     phone the key is literally labelled "go". Enter was broken and nothing noticed: blur() fired
     change, runGacha() rolled the typed seed correctly and then focused the gacha button so the
     roll could be repeated, and the very same Enter keystroke went on to activate that freshly
     focused button, replacing the user's avatar with a random one. Tab was always fine, which is
     exactly why source-level tests could never have found this: the source looked reasonable and
     the bug lived in the interaction between a keystroke's default action and a focus move.
     The oracle is core — randomParams(seed) says what the avatar must be — so this compares the
     applied sliders against it for both exit gestures. --- */
  console.log('\nseed entry (typed seed must be the seed that is applied):');
  {
    const SEED = 987654;
    const ctxS = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const ps = await ctxS.newPage();
    const bad = [];
    let want = null, got = {};
    try {
      await ps.goto('file://' + INDEX);
      await ps.waitForTimeout(2500);
      want = await ps.evaluate(s2 => String(HINA.randomParams(s2).height), SEED);

      const seedSel = '#tabBody input[type=number][max="4294967295"]';
      const applyWith = async key => {
        await ps.goto('file://' + INDEX);
        await ps.waitForTimeout(2400);
        await ps.getByRole('tab', { name: /Preset|プリセット/ }).click();
        await ps.waitForTimeout(450);
        // The field is pre-filled from the previous run's auto-saved lastGachaSeed (this section
        // reuses one context), so typing without clearing APPENDS: "987654" onto "987654" becomes
        // 987654987654, which clampSeed() pins to 4294967295. That produced a very convincing
        // false failure — the fix is to select the existing text first, exactly as a user would.
        await ps.click(seedSel);
        await ps.keyboard.press('Control+a');
        await ps.keyboard.type(String(SEED));
        await ps.keyboard.press(key);
        await ps.waitForTimeout(1200);
        const shown = await ps.evaluate(sel => {
          const e = document.querySelector(sel); return e ? e.value : '(gone)';
        }, seedSel);
        await ps.getByRole('tab', { name: /Body|体型/ }).click();
        await ps.waitForTimeout(450);
        const h = await ps.evaluate(() => document.getElementById('pr-height').value);
        return { shown, h };
      };
      for (const key of ['Tab', 'Enter']){
        const r = await applyWith(key);
        got[key] = r;
        if (r.h !== want) bad.push(`${key}: applied height ${r.h}, but seed ${SEED} must give ${want}`);
        if (r.shown !== String(SEED)) bad.push(`${key}: seed field shows ${r.shown} instead of ${SEED}`);
      }
    } catch (e) { bad.push('threw: ' + String(e.message).slice(0, 110)); }
    console.log('  typed seed applied        '
      + (bad.length ? 'FAIL — ' + bad.join('; ')
         : `ok (Tab and Enter both apply seed ${SEED}; height ${want} matches randomParams())`));
    if (bad.length) failures++;
    await ctxS.close();
  }

  /* --- Round 543: the zero-network promise, enforced by actually watching the network.
     CLAUDE.md makes "single HTML, zero dependencies" non-negotiable, and its stated reasons are
     distribution, auditability and an OFFLINE guarantee. Until now that promise rested on four
     source regexes in tests/run.js: no <script src>, no external <link href>, no fetch("http…),
     no external <a href>. A regex cannot see a URL that is built at runtime — fetch(someVar),
     a template literal, an Image().src assigned in JS — and, as it turned out, XMLHttpRequest,
     WebSocket, sendBeacon, EventSource, dynamic import() and service workers were not checked by
     ANY test at all, even though SWOT claimed they were. The product is in fact clean; the point
     is that nothing was holding it that way.

     So this drives the real app with the browser's own request log attached, and additionally
     replaces fetch/XHR/WebSocket/EventSource/sendBeacon with recorders before any page script
     runs. A request that never leaves the page still gets caught by the recorders; one that does
     gets caught by the request log.

     The trap in a "nothing happened" assertion is that doing nothing also produces nothing, so the
     exercise below is verified: tab switches are confirmed via aria-selected, the gacha must
     actually change the parameters, and the export must actually produce a file. If the app stops
     being exercised, this fails rather than passing vacuously. --- */
  console.log('\nzero-network promise (real request log, whole-app exercise):');
  {
    const ctx9 = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
    const requests = [];
    ctx9.on('request', r => requests.push(r.method() + ' ' + r.url()));
    const pg = await ctx9.newPage();
    await pg.addInitScript(() => {
      // headless Chromium exposes showSaveFilePicker, which never resolves without a user, so the
      // export would hang instead of downloading — same removal the other export sections do
      delete window.showSaveFilePicker;
      window.__netCalls = [];
      const trap = name => function (...a) {
        window.__netCalls.push(name + ' ' + String(a[0]).slice(0, 120));
        throw new Error('network blocked by audit: ' + name);
      };
      try { window.fetch = trap('fetch'); } catch (e) {}
      try { window.XMLHttpRequest = function () { window.__netCalls.push('XMLHttpRequest'); }; } catch (e) {}
      try { window.WebSocket = function (u) { window.__netCalls.push('WebSocket ' + u); }; } catch (e) {}
      try { window.EventSource = function (u) { window.__netCalls.push('EventSource ' + u); }; } catch (e) {}
      try { navigator.sendBeacon = trap('sendBeacon'); } catch (e) {}
    });
    const bad = [];
    let didTabs = 0, gachaChanged = false, exported = 0;
    try {
      await pg.goto('file://' + INDEX);
      await pg.waitForTimeout(2500);

      const tabIds = await pg.$$eval('[role=tab]', es => es.map(e => e.id));
      for (const id of tabIds){
        await pg.click('#' + id); await pg.waitForTimeout(300);
        const sel = await pg.getAttribute('#' + id, 'aria-selected');
        if (sel === 'true') didTabs++;
      }
      // gacha must genuinely reroll the parameters, not merely be clicked
      const sig = () => pg.evaluate(() =>
        [...document.querySelectorAll('#tabBody input[type=range]')].map(e => e.value).join(','));
      await pg.getByRole('tab', { name: /Body|体型/ }).click(); await pg.waitForTimeout(350);
      const s0 = await sig();
      // the gacha lives inside the Preset tab, not a tab of its own
      await pg.getByRole('tab', { name: /Preset|プリセット/ }).click(); await pg.waitForTimeout(400);
      const rollBtn = await pg.$('#gachaBtn');
      if (rollBtn){
        await rollBtn.click(); await pg.waitForTimeout(900);
        await pg.getByRole('tab', { name: /Body|体型/ }).click(); await pg.waitForTimeout(350);
        gachaChanged = (await sig()) !== s0;
      }
      const eb = await pg.$('.eBtn'); if (eb){ await eb.click(); await pg.waitForTimeout(400); }

      // the export path is the one place a naive implementation would phone home
      await pg.getByRole('tab', { name: /Export|出力/ }).click(); await pg.waitForTimeout(500);
      let expBtn = null;
      for (const b of await pg.$$('#tabBody button')){
        const t9 = (await b.textContent() || '').trim();
        if (/Export VRM|VRM 書き出し/.test(t9)){ expBtn = b; break; }
      }
      if (expBtn){
        const [d] = await Promise.all([
          pg.waitForEvent('download', { timeout: 45000 }).catch(() => null),
          expBtn.click(),
        ]);
        if (d){ exported = 1; await d.path(); }
      }
      await pg.waitForTimeout(800);

      const apiCalls = await pg.evaluate(() => window.__netCalls || []);
      const external = requests.filter(u => !/^(GET|POST|PUT|HEAD) (file:|data:|blob:)/.test(u));
      if (external.length) bad.push(`${external.length} non-local request(s): ${external.slice(0,3).join(' | ')}`);
      if (apiCalls.length) bad.push(`network API used: ${apiCalls.slice(0,3).join(' | ')}`);
      // non-vacuity: the exercise must have actually happened
      if (didTabs < 6) bad.push(`only ${didTabs} tabs switched — the exercise did not run, so "no requests" proves nothing`);
      if (!exported) bad.push('export produced no file — the heaviest code path never ran');
      if (!gachaChanged) bad.push('the gacha did not change any parameter — that path never really ran');
    } catch (e) { bad.push('threw: ' + String(e.message).slice(0, 110)); }

    const localCount = requests.filter(u => /(file:|data:|blob:)/.test(u)).length;
    console.log('  whole-app exercise        '
      + (bad.length ? 'FAIL — ' + bad.join('; ')
         : `ok (${didTabs} tabs, gacha, expression, export=${exported}; ${requests.length} request(s), all local (${localCount}), fetch/XHR/WebSocket/EventSource/sendBeacon never called)`));
    if (bad.length) failures++;
    await ctx9.close();
  }

  /* --- Round 542: "complete keyboard operation" (SWOT strength #5, WCAG 2.1.1) had never been
     measured, only asserted. Four groups use the roving-tabindex pattern — the tablist, the
     expression bar, the colour swatches and the preset cards — where every member but one carries
     tabindex="-1". That is correct ARIA authoring ONLY if arrow keys actually move focus within the
     group; without a working handler those controls are simply unreachable by keyboard, and a
     static audit cannot tell the two apart because the markup is identical. So this drives the real
     keys.

     Two traps, both of which produced false failures while writing this and are avoided below:
     the entry point must not already sit at the boundary being tested (Home cannot move focus that
     is already on the first item — which reads as a bug and is not), and activating a card
     re-renders the panel, so element handles go stale and every step must re-query. --- */
  console.log('\nkeyboard operation (roving tabindex groups):');
  {
    const c8 = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    const pg = await c8.newPage();
    await pg.goto('file://' + INDEX);
    await pg.waitForTimeout(2500);

    const probe = async (label, openTab, sel) => {
      const bad = [];
      try {
        if (openTab){ await pg.click(openTab); await pg.waitForTimeout(450); }
        // Scope every measurement to the focused element's OWN roving group, not to every element
        // the selector matches. The colour swatches are six independent groups (one per colour row,
        // and the palettes are different lengths - 8, 6, 10 ...), so Home/End correctly move within
        // a row. Measuring against all 54 reported "End went to 7 of 54" and looked like a product
        // bug; it was this test asking the wrong question.
        const idxOf = () => pg.evaluate(q => {
          const leaf = q.split(' ').pop();
          const a = document.activeElement;
          const group = a && a.parentElement ? [...a.parentElement.querySelectorAll(leaf)] : [];
          const items = group.length ? group : [...document.querySelectorAll(q)];
          return { focus: items.indexOf(a), n: items.length,
                   zero: items.filter(e => e.getAttribute('tabindex') === '0').length };
        }, sel);
        const entry = `${sel}[tabindex="0"]`;
        if (!(await pg.$(entry))) { bad.push('no tabindex=0 entry point — the group cannot be reached by Tab'); }
        else {
          const start = await pg.evaluate(q => [...document.querySelectorAll(q)].length, sel);
          if (start < 2) bad.push(`only ${start} member(s); nothing to navigate`);
          else {
            await pg.focus(entry); await pg.waitForTimeout(120);
            const a0 = await idxOf();
            await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(250);
            const a1 = await idxOf();
            if (a1.focus === a0.focus) bad.push('ArrowRight does not move focus');
            await pg.keyboard.press('ArrowLeft'); await pg.waitForTimeout(250);
            const a2 = await idxOf();
            if (a2.focus === a1.focus) bad.push('ArrowLeft does not move focus');
            // step to the middle FIRST, so Home has somewhere to go
            await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(200);
            await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(200);
            const mid = await idxOf();
            await pg.keyboard.press('Home'); await pg.waitForTimeout(250);
            const hm = await idxOf();
            if (mid.focus > 0 && hm.focus !== 0) bad.push(`Home went to ${hm.focus}, expected the first item`);
            await pg.keyboard.press('End'); await pg.waitForTimeout(250);
            const en = await idxOf();
            if (en.focus !== en.n - 1) bad.push(`End went to ${en.focus} of ${en.n}, expected the last item`);
          }
        }
      } catch (e) { bad.push('threw: ' + String(e.message).slice(0, 90)); }
      console.log(`  ${label.padEnd(22)}    ` + (bad.length ? 'FAIL — ' + bad.join('; ') : 'ok (Arrow/Home/End move focus, Tab reaches the group)'));
      if (bad.length) failures++;
    };

    await probe('tablist', null, '[role=tab]');
    await probe('expression bar', null, '.eBtn');
    await probe('colour swatches', '#tab-color', '#tabBody .sw');
    await probe('preset cards', '#tab-preset', '#tabBody .preCard');

    // a preset card must also ACTIVATE from the keyboard, not merely receive focus
    {
      const bad = [];
      try {
        for (const key of ['Enter', 'Space']){
          await pg.click('#tab-preset'); await pg.waitForTimeout(450);
          await pg.focus('#tabBody .preCard[tabindex="0"]'); await pg.waitForTimeout(120);
          await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(250);
          const before = await pg.evaluate(() =>
            [...document.querySelectorAll('#tabBody .preCard')].findIndex(e => e.classList.contains('selected')));
          await pg.keyboard.press(key); await pg.waitForTimeout(800);
          const after = await pg.evaluate(() =>
            [...document.querySelectorAll('#tabBody .preCard')].findIndex(e => e.classList.contains('selected')));
          if (after === before) bad.push(`${key} did not select the focused card (stayed on ${before})`);
        }
      } catch (e) { bad.push('threw: ' + String(e.message).slice(0, 90)); }
      console.log('  preset activation         ' + (bad.length ? 'FAIL — ' + bad.join('; ') : 'ok (Enter and Space both select the focused card)'));
      if (bad.length) failures++;
    }
    await c8.close();
  }

  /* --- Round 538: texture colour fidelity, read out of the exported .vrm itself.
     The oracle is core: randomParams(seed) says exactly which colours seed N must produce, and
     ATLAS says exactly where each one is painted. So this drives the REAL user path
     (?seed=N share URL -> Export button -> downloaded file), then opens the file and checks the
     pixels. No GPU involved, so the SwiftShader texture limitation does not apply.
     The no-seed startup state is not pinned separately: it is PRESETS[0] and goes through this
     same drawAtlas() path, so a second case would add cost without adding coverage. --- */
  console.log('\ntexture colour fidelity (read from the exported .vrm):');
  {
    const H = loadCore();
    const SOLID = { skin:'skinTone', hair:'hairColor', clothMain:'clothMain',
                    clothSub:'clothSub', accent:'clothAccent', shoe:'shoeColor' };
    const c7 = await browser.newContext({ viewport:{width:1200,height:900}, acceptDownloads:true });
    const perSeed = [];   // Round 540: kept for the cross-seed comparison after this loop
    for (const seed of [424242, 7, 99991]){
      const p7 = await c7.newPage();
      const e7 = [];
      p7.on('pageerror', e => e7.push(String(e.message).slice(0,120)));
      const bad = [];
      try {
        await p7.addInitScript(() => { delete window.showSaveFilePicker; });
        await p7.goto('file://' + INDEX + '?seed=' + seed);
        await p7.waitForTimeout(2600);
        await p7.getByRole('tab', { name: /Export|出力/ }).click();
        await p7.waitForTimeout(500);
        let btn = null;
        for (const b of await p7.$$('#tabBody button')){
          const t = (await b.textContent() || '').trim();
          if (/Export VRM|VRM 書き出し/.test(t)){ btn = b; break; }
        }
        if (!btn) throw new Error('export button not found');
        const [dl] = await Promise.all([
          p7.waitForEvent('download', { timeout: 45000 }).catch(() => null),
          btn.click(),
        ]);
        if (!dl) throw new Error('clicking Export produced no download');
        const out = path.join(tmp, 'colour-' + seed + '.vrm');
        await dl.saveAs(out);

        const im = glbImage(fs.readFileSync(out));
        if (im.mime !== 'image/png') bad.push('embedded texture is ' + im.mime + ', not image/png');
        const img = decodePNG(im.bytes);
        if (img.w !== H.TEX || img.h !== H.TEX) bad.push(`texture is ${img.w}x${img.h}, expected ${H.TEX}`);
        const want = H.randomParams(seed);

        // every solid block must carry exactly the colour this seed chose
        for (const [blk, key] of Object.entries(SOLID)){
          const b = H.ATLAS[blk];
          const got = toHex(pixel(img, b[0] + 32, b[1] + 32));
          const exp = String(want[key]).toLowerCase();
          if (got !== exp) bad.push(`${blk} block is ${got}, but ${key}=${exp}`);
        }
        // the derived highlight must match core's own shade()
        {
          const b = H.ATLAS.hairHi;
          const got = toHex(pixel(img, b[0] + 32, b[1] + 32));
          const exp = String(H.shade(want.hairColor, 1.4)).toLowerCase();
          if (got !== exp) bad.push(`hairHi block is ${got}, but shade(hairColor,1.4)=${exp}`);
        }
        // face parts must actually be painted, not left blank
        const region = r => {
          const seen = new Set(); let opaque = 0, n = 0;
          for (let y = r[1]; y < r[3]; y += 3) for (let x = r[0]; x < r[2]; x += 3){
            const c = pixel(img, x, y); n++;
            if (c.a > 127) opaque++;
            seen.add(c.r + ',' + c.g + ',' + c.b + ',' + c.a);
          }
          return { distinct: seen.size, opaque: 100 * opaque / n };
        };
        // Round 540: keep an exact copy of each face region so the seeds can be compared afterwards
        const regionBytes = name => {
          const r = H.ATLAS[name], out = [];
          for (let y = r[1]; y < r[3]; y++) for (let x = r[0]; x < r[2]; x++){
            const c = pixel(img, x, y); out.push(c.r, c.g, c.b, c.a);
          }
          return out.join(',');
        };
        perSeed.push({ seed, params: want,
          regions: { eyeL: regionBytes('eyeL'), browL: regionBytes('browL'),
                     mouth: regionBytes('mouth'), blush: regionBytes('blush') } });
        const eyes = region(H.ATLAS.eyeL), mouth = region(H.ATLAS.mouth), brow = region(H.ATLAS.browL);
        if (eyes.distinct < 20 || eyes.opaque < 10) bad.push(`eye region looks unpainted (${eyes.distinct} colours, ${eyes.opaque.toFixed(1)}% opaque)`);
        if (mouth.distinct < 10 || mouth.opaque < 5) bad.push(`mouth region looks unpainted (${mouth.distinct} colours, ${mouth.opaque.toFixed(1)}% opaque)`);
        if (brow.opaque < 5) bad.push(`brow region looks unpainted (${brow.opaque.toFixed(1)}% opaque)`);
        // blush is alpha-graded and MASK-discarded below 0.5, so only assert it when the seed asked for it
        if (want.blush > 0.5 && region(H.ATLAS.blush).opaque < 1) bad.push('blush requested but nothing opaque was painted');

        // eyeR is produced by mirroring eyeL — verify it is a MIRROR and not a plain copy
        {
          const eL = H.ATLAS.eyeL, eR = H.ATLAS.eyeR, w = eL[2] - eL[0], h = eL[3] - eL[1];
          let asMirror = 0, asCopy = 0, selfSym = 0, n = 0;
          for (let y = 4; y < h; y += 7) for (let x = 4; x < w - 4; x += 7){
            const a = pixel(img, eL[0] + x, eL[1] + y);
            const m = pixel(img, eR[0] + (w - 1 - x), eR[1] + y);
            const c = pixel(img, eR[0] + x, eR[1] + y);
            const s2 = pixel(img, eL[0] + (w - 1 - x), eL[1] + y);
            n++;
            if (a.r===m.r && a.g===m.g && a.b===m.b && a.a===m.a) asMirror++;
            if (a.r===c.r && a.g===c.g && a.b===c.b && a.a===c.a) asCopy++;
            if (a.r===s2.r && a.g===s2.g && a.b===s2.b && a.a===s2.a) selfSym++;
          }
          if (asMirror < n) bad.push(`right eye is not a clean mirror of the left (${asMirror}/${n})`);
          // only meaningful when the eye is actually asymmetric; otherwise mirror and copy coincide
          if (selfSym < n * 0.9 && asCopy >= n) bad.push('right eye is a straight copy, not a mirror');
        }
        /* The VRM also embeds a 256x256 THUMBNAIL (meta.texture), which is what VRChat and
           UniVRM show in an avatar list. It is a crop of the WebGL canvas, so under SwiftShader
           its CONTENT is not representative and is deliberately not judged here — that is the
           same preview limitation described at the top of this file. Its STRUCTURE is fully
           checkable though, and was not covered by anything before: a thumbnail that silently
           stopped being written, or that pointed at the atlas instead of its own image, would
           have shipped unnoticed. */
        {
          const raw = fs.readFileSync(out);
          const jsonLen = raw.readUInt32LE(12);
          const gl = JSON.parse(raw.toString('utf8', 20, 20 + jsonLen));
          const ti = gl.extensions && gl.extensions.VRM && gl.extensions.VRM.meta
            ? gl.extensions.VRM.meta.texture : undefined;
          if (typeof ti !== 'number' || ti < 0) bad.push('VRM meta carries no thumbnail texture index');
          else {
            const src = gl.textures[ti] && gl.textures[ti].source;
            const mainSrc = gl.textures[0] && gl.textures[0].source;
            if (src === mainSrc) bad.push('thumbnail points at the main atlas instead of its own image');
            else {
              const bv = gl.bufferViews[gl.images[src].bufferView];
              const st = 20 + jsonLen + 8 + (bv.byteOffset || 0);
              const th = decodePNG(raw.slice(st, st + bv.byteLength));
              if (th.w !== 256 || th.h !== 256) bad.push(`thumbnail is ${th.w}x${th.h}, expected 256x256`);
              let clear = 0, n = 0;
              for (let y = 0; y < th.h; y += 8) for (let x = 0; x < th.w; x += 8){
                n++; if (pixel(th, x, y).a < 128) clear++;
              }
              if (clear > n * 0.5) bad.push(`thumbnail is mostly transparent (${(100*clear/n).toFixed(0)}%)`);
            }
          }
        }
        if (e7.length) bad.push('page error: ' + e7[0]);
      } catch (e) {
        bad.push(String(e.message).slice(0, 140));
      }
      await p7.close();
      console.log(`  seed ${String(seed).padEnd(14)}       `
        + (bad.length ? 'FAIL — ' + bad.join('; ') : 'ok (7 blocks match randomParams(), face parts painted, right eye mirrored, thumbnail sound)'));
      if (bad.length) failures++;
    }
    await c7.close();

    /* --- Round 540: does each face control actually DO anything?
       Round 539 found a colour picker that changed nothing, because a control being wired up
       (clothSub really was painted into the atlas) does not mean anything consumes it. The same
       question applies to every face parameter. This needs no extra exports: the three seeds above
       already carry different eyeShape / irisSize / eyeColor / browType / hairColor / mouthW /
       blush, so core can say which pairs OUGHT to differ, and the decoded textures say whether
       they do. A region that stays byte-identical while its inputs change is a dead control.
       It skips rather than fails when the seeds happen to agree, so it can never fail vacuously. --- */
    const DRIVERS = {
      eyeL:  ['eyeShape', 'irisSize', 'eyeColor'],
      browL: ['browType', 'hairColor'],
      mouth: ['mouthW'],
      blush: ['blush'],
    };
    for (const [name, keys] of Object.entries(DRIVERS)){
      let compared = 0, differed = 0;
      for (let i = 0; i < perSeed.length; i++) for (let j = i + 1; j < perSeed.length; j++){
        const a = perSeed[i], b = perSeed[j];
        if (keys.every(k => String(a.params[k]) === String(b.params[k]))) continue;  // nothing to expect
        compared++;
        if (a.regions[name] !== b.regions[name]) differed++;
      }
      if (!compared){
        console.log(`  ${name.padEnd(22)}    skipped (these seeds agree on ${keys.join('/')}, nothing to compare)`);
      } else {
        const okc = differed === compared;
        console.log(`  ${name.padEnd(22)}    `
          + (okc ? `ok (${compared} seed pair(s) differ in ${keys.join('/')}, and the painted region differs too)`
                 : `FAIL — ${compared - differed} of ${compared} seed pair(s) changed ${keys.join('/')} but painted an IDENTICAL ${name} region`));
        if (!okc) failures++;
      }
    }
  }

  await browser.close();

  if (KEEP) console.log('\nPNGs kept in ' + tmp);
  else fs.rmSync(tmp, { recursive: true, force: true });

  console.log('\n' + (failures ? `${failures} case(s) FAILED` : `all ${cases.length} cases ok`));
  return failures ? 1 : 0;
}

main().then(c => process.exit(c)).catch(e => { console.error(e); process.exit(2); });
