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
 * Colour and texture are NOT verifiable under a software rasteriser: SwiftShader's
 * canvas-to-texture upload yields an empty texture, so the main fragment shader's leading
 * `if (c.a < 0.5) discard;` kills every fragment. (The product is not at fault — the atlas is
 * correct at upload time and UNPACK_FLIP_Y_WEBGL is set.) To see shape at all, this tool
 * renders a PATCHED COPY with that discard removed and the body forced to a flat colour. It
 * therefore judges only objectively-wrong states — occlusion, empty draws, gross asymmetry —
 * never "does this look nice".
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

  await browser.close();

  if (KEEP) console.log('\nPNGs kept in ' + tmp);
  else fs.rmSync(tmp, { recursive: true, force: true });

  console.log('\n' + (failures ? `${failures} case(s) FAILED` : `all ${cases.length} cases ok`));
  return failures ? 1 : 0;
}

main().then(c => process.exit(c)).catch(e => { console.error(e); process.exit(2); });
