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
  ok(['a','i','u','e','o','blink','joy'].every(n => B.morphs.sparse[n].length > 0), 'key morphs non-empty');
  ok(B.morphs.sparse.a.every(e => e.length === 4 && e[0] < nV), 'morph entries [vi,dx,dy,dz]');
  ok(B.springs.length === 2, 'twin: 2 spring chains');
  ok(B.collider && B.collider.bone === B.idx.head && B.collider.radius > 0, 'head collider present');
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
  ok(est.bones === 29 && est.mat === 1 && est.skinned === 1, 'estimate bones/mat/skinned');
  ok(est.pbComp === 2 && est.pbTrans === 8, 'estimate physbones (twin springs on)');
  const off = H.estimate(B, Object.assign({}, P, { springOff: true }));
  ok(off.pbComp === 0 && off.pbTrans === 0 && off.pbCheck === 0, 'springOff zeroes physbones');
  ok(est.texMB > 0 && est.texMB < 10, 'texMB sane');
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
    const v = j.bufferViews[a.bufferView];
    return a.count * SZ[a.componentType] * NC[a.type] <= v.byteLength &&
           (v.byteOffset || 0) + v.byteLength <= j.buffers[0].byteLength;
  }), 'all accessors within views within buffer');
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
  ok(V.humanoid.humanBones.every(hb => H.HB.includes(hb.bone) && hb.node >= 1 && hb.node <= B.bones.length),
    'humanBones names + node range');
  ok(V.firstPerson.firstPersonBone === B.idx.head + 1, 'firstPersonBone = head node');
  ok(V.firstPerson.lookAtTypeName === 'Bone', 'lookAt Bone type');
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
  ok(st.results.length >= 18 && st.results.every(r => r.ok), 'selfTest all 18+ checks pass');
}

/* ---- summary ---- */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail){ console.error('FAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
