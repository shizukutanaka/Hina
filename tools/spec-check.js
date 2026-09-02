#!/usr/bin/env node
/* 雛 (Hina) spec compliance check — official Khronos glTF-Validator + the three-vrm reference
   loader, run against every export variant.  Run: node tools/spec-check.js

   Why this file exists (Round 550): Rounds 524/525 established these two measurements by hand and
   SWOT has cited them ever since as strength #3. Twenty-five rounds later the tooling was gone —
   node_modules does not survive a container restart — and re-doing it meant rediscovering several
   environment details that are not obvious. Encoding them here makes the claim re-checkable with
   one command instead of an afternoon:

     - three-vrm is a browser bundle: it touches `self` and `window` at module-evaluation time, so
       the globals must exist BEFORE the import is evaluated. In ESM, imports hoist above the module
       body, so setting them in the body is too late — hence the dynamic import() below.
     - it must resolve `three` from the repo's node_modules, so run it from the repo root.
     - loading in Node logs "Couldn't load texture blob:nodedata:…" for every case. That is the
       absence of a browser image decoder, NOT a defect in the file: the texture bytes themselves
       are checked straight out of the .vrm by tools/render-check.js (Round 538).
     - two validator warnings are intrinsic to the VRM 0.x layout and are expected, not tolerated
       sloppiness: INVALID_EXTENSION_NAME_FORMAT (the "VRM" extension name predates the naming
       convention) and NODE_SKINNED_MESH_NON_ROOT (VRM 0.x parents the skinned mesh under a node).

   Like tools/render-check.js this exits 0 and explains itself when its dependencies are absent, so
   it never blocks anyone who only has the zero-dependency test suite:
     npm install --no-save gltf-validator three @pixiv/three-vrm
*/
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');

function loadCore(){
  const html = fs.readFileSync(INDEX, 'utf8');
  const cs = html.indexOf('/*HINA-CORE-START*/'), ce = html.indexOf('/*HINA-CORE-END*/');
  if (cs < 0 || ce < 0) throw new Error('core markers not found in index.html');
  const mod = { exports: {} };
  new Function('module', 'exports', html.slice(cs, ce))(mod, mod.exports);
  return mod.exports;
}

/* every shape the exporter can emit, so a regression in any one of them shows up */
function buildCases(H){
  const out = [];
  for (const pre of H.PRESETS) out.push([pre.id, H.presetParams(pre)]);
  for (const hs of H.PARAMS.hairStyle.opts) out.push(['hair:' + hs, Object.assign(H.defaults(), { hairStyle: hs })]);
  for (const o of H.PARAMS.outfit.opts) out.push(['outfit:' + o, Object.assign(H.defaults(), { outfit: o })]);
  out.push(['outline', Object.assign(H.defaults(), { outline: true, hairStyle: 'twin' })]);
  out.push(['springOff', Object.assign(H.defaults(), { springOff: true, hairStyle: 'twin' })]);
  out.push(['exprMix', H.defaults()]);
  return out;
}

function exportOf(H, name, p0){
  const p = H.sanitize(p0);
  const build = H.buildAvatar(p);
  const emx = name === 'exprMix'
    ? Object.assign(H.defaultExprMix(), { joy: { a: 40, blink: 30 } })
    : H.defaultExprMix();
  return H.exportVRM(build, p, H.sanitizeMeta({ title: 'SpecCheck' }), H.b64ToBytes(H.PNG1), null, emx).bytes;
}

const EXPECTED_WARNINGS = new Set(['INVALID_EXTENSION_NAME_FORMAT', 'NODE_SKINNED_MESH_NON_ROOT']);

async function runValidator(H, cases){
  let validator;
  try { validator = require(path.join(ROOT, 'node_modules', 'gltf-validator')); }
  catch (e) {
    console.log('  gltf-validator not installed — skipping (npm install --no-save gltf-validator)');
    return 0;
  }
  let errors = 0;
  const warnings = new Set();
  for (const [name, p0] of cases){
    const bytes = exportOf(H, name, p0);
    const r = await validator.validateBytes(new Uint8Array(bytes), { uri: name + '.vrm' });
    const iss = r.issues;
    if (iss.numErrors){
      errors += iss.numErrors;
      const msgs = iss.messages.filter(m => m.severity === 0).slice(0, 3);
      console.log(`  ${name.padEnd(16)} ${iss.numErrors} ERROR(S): ${JSON.stringify(msgs)}`);
    }
    for (const m of iss.messages) if (m.severity === 1) warnings.add(m.code);
  }
  const unexpected = [...warnings].filter(w => !EXPECTED_WARNINGS.has(w));
  console.log(`  ${String(cases.length).padStart(3)} case(s) validated  errors=${errors}`);
  console.log(`  warnings: ${[...warnings].join(', ') || '(none)'}`
    + (unexpected.length ? `   <-- UNEXPECTED: ${unexpected.join(', ')}` : '  (both expected for VRM 0.x)'));
  return errors + unexpected.length;
}

async function runReferenceLoader(H, cases){
  // must exist before three-vrm evaluates; see the header note
  globalThis.self = globalThis;
  globalThis.window = globalThis;
  let THREE, GLTFLoader, VRMLoaderPlugin;
  try {
    THREE = await import('three');
    ({ GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js'));
    ({ VRMLoaderPlugin } = await import('@pixiv/three-vrm'));
  } catch (e) {
    console.log('  three-vrm not installed — skipping (npm install --no-save three @pixiv/three-vrm)');
    return 0;
  }
  const loader = new GLTFLoader();
  loader.register(p => new VRMLoaderPlugin(p));
  let bad = 0;
  for (const [name, p0] of cases){
    const bytes = exportOf(H, name, p0);
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    try {
      const gltf = await loader.parseAsync(buf, '');
      const vrm = gltf.userData.vrm;
      if (!vrm){ console.log(`  ${name.padEnd(16)} loaded but carries no VRM data`); bad++; continue; }
      const bones = Object.keys((vrm.humanoid && vrm.humanoid.humanBones) || {}).length;
      const exprs = vrm.expressionManager ? vrm.expressionManager.expressions.length : 0;
      const problems = [];
      if (bones < 15) problems.push(`humanBones=${bones}`);
      if (exprs < 10) problems.push(`expressions=${exprs}`);
      if (!vrm.firstPerson) problems.push('no firstPerson');
      if (problems.length){ console.log(`  ${name.padEnd(16)} ${problems.join(', ')}`); bad++; }
    } catch (e) {
      console.log(`  ${name.padEnd(16)} THREW: ${String(e.message).slice(0, 80)}`); bad++;
    }
  }
  console.log(`  ${String(cases.length).padStart(3)} case(s) loaded     problems=${bad}`
    + '   (texture blob warnings above are a Node artifact, not a file defect)');
  return bad;
}

(async () => {
  const H = loadCore();
  const cases = buildCases(H);
  console.log('official Khronos glTF-Validator:');
  const a = await runValidator(H, cases);
  console.log('\nthree-vrm reference loader:');
  const b = await runReferenceLoader(H, cases);
  const total = a + b;
  console.log(total === 0 ? '\nspec compliance ok' : `\n${total} problem(s) FOUND`);
  process.exit(total === 0 ? 0 : 1);
})();
