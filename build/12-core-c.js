
/* ---------- binary writer (little-endian; glTF requires LE) ---------- */
function BinWriter(){ this.parts=[]; this.len=0; }
BinWriter.prototype.align = function(n){
  const pad=(n-(this.len%n))%n;
  if (pad){ this.parts.push(new Uint8Array(pad)); this.len+=pad; }
};
BinWriter.prototype.push = function(ta){
  this.align(4);
  const off=this.len;
  const u8 = ta instanceof Uint8Array ? ta : new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength);
  this.parts.push(u8); this.len+=u8.length;
  return off;
};
BinWriter.prototype.bytes = function(){
  const out=new Uint8Array(this.len); let o=0;
  for(const p of this.parts){ out.set(p,o); o+=p.length; }
  return out;
};

function utf8(str){
  if (typeof TextEncoder!=='undefined') return new TextEncoder().encode(str);
  const out=[];
  for(let i=0;i<str.length;i++){
    let c=str.codePointAt(i); if (c>0xFFFF) i++;
    if (c<0x80) out.push(c);
    else if (c<0x800) out.push(0xC0|c>>6, 0x80|c&63);
    else if (c<0x10000) out.push(0xE0|c>>12, 0x80|c>>6&63, 0x80|c&63);
    else out.push(0xF0|c>>18, 0x80|c>>12&63, 0x80|c>>6&63, 0x80|c&63);
  }
  return new Uint8Array(out);
}

/* ---------- VRM 0.x export ----------
   GLB container (glTF 2.0) + extensions.VRM (specVersion "0.0").
   Spec notes (vrm.dev): Y-up right-handed, model faces Z-, T-pose with identity
   rotations (translations only) → IBM = translate(-worldPos).
   Field names keep official VRM0 typos: "stiffiness", "*UssageName". */
function exportVRM(build, p, meta, pngBytes, thumbPngBytes){
  p = sanitize(p);
  meta = (meta && typeof meta==='object') ? meta : {};
  const g = build.geom, bones = build.bones;
  const nV = g.pos.length/3;
  if (nV>=65536) throw new Error('vertex count exceeds uint16 index range');
  if (bones.length>=256) throw new Error('bone count exceeds uint8 joint range');
  const png = pngBytes instanceof Uint8Array ? pngBytes : new Uint8Array(pngBytes||[]);

  const bw = new BinWriter();
  const views=[], accessors=[];
  const addView=(byteOffset,byteLength,target)=>{
    const v={buffer:0, byteOffset, byteLength};
    if (target) v.target=target;
    views.push(v); return views.length-1;
  };
  const addAcc=(bufferView,componentType,count,type,extra)=>{
    accessors.push(Object.assign({bufferView,componentType,count,type},extra||{}));
    return accessors.length-1;
  };
  const minMax3=arr=>{
    const mn=[Infinity,Infinity,Infinity], mx=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<arr.length;i+=3)for(let k=0;k<3;k++){
      const v=arr[i+k]; if(v<mn[k])mn[k]=v; if(v>mx[k])mx[k]=v;
    }
    return {min:mn, max:mx};
  };

  /* vertex attributes */
  const fPos=new Float32Array(g.pos), fNrm=new Float32Array(g.nrm), fUv=new Float32Array(g.uv);
  const uJnt=new Uint8Array(g.jnt), fWgt=new Float32Array(g.wgt), uIdx=new Uint16Array(g.idx);
  const mmP=minMax3(fPos);
  const aPos=addAcc(addView(bw.push(fPos),fPos.byteLength,34962),5126,nV,'VEC3',{min:mmP.min,max:mmP.max});
  const aNrm=addAcc(addView(bw.push(fNrm),fNrm.byteLength,34962),5126,nV,'VEC3');
  const aUv =addAcc(addView(bw.push(fUv ),fUv.byteLength ,34962),5126,nV,'VEC2');
  const aJnt=addAcc(addView(bw.push(uJnt),uJnt.byteLength,34962),5121,nV,'VEC4');
  const aWgt=addAcc(addView(bw.push(fWgt),fWgt.byteLength,34962),5126,nV,'VEC4');
  const aIdx=addAcc(addView(bw.push(uIdx),uIdx.byteLength,34963),5123,uIdx.length,'SCALAR');

  /* morph targets — glTF sparse accessor (only non-zero delta verts; SPEC §9 "スパース化") */
  const targetNames = build.morphs.names.slice();
  const targets = targetNames.map(name=>{
    const entries = build.morphs.sparse[name];
    // glTF sparse requires ascending index order
    const sorted = entries.slice().sort((a,b)=>a[0]-b[0]);
    const sc = sorted.length;
    // min/max must include implicit zeros from non-sparse entries
    let mnx=0,mny=0,mnz=0,mxx=0,mxy=0,mxz=0;
    for(const e of sorted){
      if(e[1]<mnx)mnx=e[1]; if(e[1]>mxx)mxx=e[1];
      if(e[2]<mny)mny=e[2]; if(e[2]>mxy)mxy=e[2];
      if(e[3]<mnz)mnz=e[3]; if(e[3]>mxz)mxz=e[3];
    }
    const acc={componentType:5126,count:nV,type:'VEC3',min:[mnx,mny,mnz],max:[mxx,mxy,mxz]};
    if(sc>0){
      const idxBuf=new Uint16Array(sc), valBuf=new Float32Array(sc*3);
      sorted.forEach((e,i)=>{ idxBuf[i]=e[0]; valBuf[i*3]=e[1]; valBuf[i*3+1]=e[2]; valBuf[i*3+2]=e[3]; });
      const idxView=addView(bw.push(idxBuf),idxBuf.byteLength);
      const valView=addView(bw.push(valBuf),valBuf.byteLength);
      acc.sparse={count:sc,indices:{bufferView:idxView,componentType:5123},values:{bufferView:valView}};
    }
    accessors.push(acc);
    return {POSITION: accessors.length-1};
  });

  /* inverse bind matrices: translate(-world), column-major */
  const ibm=new Float32Array(bones.length*16);
  bones.forEach((b,i)=>{
    const m=M.mId(); m[12]=-b.w[0]; m[13]=-b.w[1]; m[14]=-b.w[2];
    ibm.set(m,i*16);
  });
  const aIBM=addAcc(addView(bw.push(ibm),ibm.byteLength),5126,bones.length,'MAT4');

  /* texture images (0 = atlas; 1 = optional portrait thumbnail) */
  const vImg=addView(bw.push(png),png.length);
  const images=[{bufferView:vImg, mimeType:'image/png'}];
  const textures=[{sampler:0, source:0}];
  let metaTexture=-1;
  const thumb = thumbPngBytes instanceof Uint8Array ? thumbPngBytes : null;
  if (thumb && thumb.length){
    const vTh=addView(bw.push(thumb),thumb.length);
    images.push({bufferView:vTh, mimeType:'image/png'});
    textures.push({sampler:0, source:1});
    metaTexture=1;
  }

  /* nodes: 0=Root, bones → i+1, mesh node last */
  const nodeOf=i=>i+1;
  const meshNode=bones.length+1;
  const childMap={};
  bones.forEach((b,i)=>{ if(b.parent>=0)(childMap[b.parent]=childMap[b.parent]||[]).push(nodeOf(i)); });
  const nodes=[{name:'Root', children:[nodeOf(0), meshNode]}];
  bones.forEach((b,i)=>{
    const pw = b.parent>=0 ? bones[b.parent].w : [0,0,0];
    const n={name:b.name, translation:[b.w[0]-pw[0], b.w[1]-pw[1], b.w[2]-pw[2]]};
    if (childMap[i]) n.children=childMap[i];
    nodes.push(n);
  });
  nodes.push({name:'Body', mesh:0, skin:0});

  /* VRM meta (sanitized) */
  const str=(v,d)=>(typeof v==='string' && v.trim()) ? v.replace(/[\u0000-\u001f]/g,'').slice(0,256) : d;
  const pick=(v,arr,d)=>arr.includes(v)?v:d;
  const vrmMeta={
    title: str(meta.title,'Hina Avatar'),
    version: str(meta.version,'1.0'),
    author: str(meta.author,'unknown'),
    contactInformation: str(meta.contact,''),
    reference: str(meta.reference,''),
    texture: metaTexture,
    allowedUserName: pick(meta.allowed,['OnlyAuthor','ExplicitlyLicensedPerson','Everyone'],'OnlyAuthor'),
    violentUssageName: pick(meta.violent,['Disallow','Allow'],'Disallow'),
    sexualUssageName: pick(meta.sexual,['Disallow','Allow'],'Disallow'),
    commercialUssageName: pick(meta.commercial,['Disallow','Allow'],'Disallow'),
    otherPermissionUrl: '',
    licenseName: pick(meta.license,
      ['Redistribution_Prohibited','CC0','CC_BY','CC_BY_NC','CC_BY_SA','CC_BY_NC_SA','CC_BY_ND','CC_BY_NC_ND','Other'],
      'Redistribution_Prohibited'),
    otherLicenseUrl: '',
  };

  const humanBones = HB.map(hb=>({bone:hb, node:nodeOf(build.humanoid[hb]), useDefaultValues:true}));

  const curve={curve:[0,0,0,1,1,1,1,0], xRange:90, yRange:10};
  const r3=v=>Math.round(v*1000)/1000;
  const fpY=r3(build.dims.eyeWY - bones[build.idx.head].w[1]);
  const fpZ=r3(-build.dims.headR*0.7);
  const firstPerson={
    firstPersonBone: nodeOf(build.idx.head),
    firstPersonBoneOffset:{x:0,y:fpY,z:fpZ},
    meshAnnotations:[{mesh:0, firstPersonFlag:'Auto'}],
    lookAtTypeName:'Bone',
    lookAtHorizontalInner: curve,
    lookAtHorizontalOuter: curve,
    lookAtVerticalDown: curve,
    lookAtVerticalUp: curve,
  };

  const grp=(name,preset,binds)=>({name, presetName:preset, binds:binds||[], materialValues:[], isBinary:false});
  const bind1=n=>[{mesh:0, index:targetNames.indexOf(n), weight:100}];
  const blendShapeGroups=[
    grp('Neutral','neutral'),
    grp('A','a',bind1('a')), grp('I','i',bind1('i')), grp('U','u',bind1('u')),
    grp('E','e',bind1('e')), grp('O','o',bind1('o')),
    grp('Blink','blink',bind1('blink')),
    grp('Blink_L','blink_l',bind1('blink_l')),
    grp('Blink_R','blink_r',bind1('blink_r')),
    grp('Joy','joy',bind1('joy')), grp('Angry','angry',bind1('angry')),
    grp('Sorrow','sorrow',bind1('sorrow')), grp('Fun','fun',bind1('fun')),
    grp('LookUp','lookup'), grp('LookDown','lookdown'),
    grp('LookLeft','lookleft'), grp('LookRight','lookright'),
  ];

  const hasSprings = !p.springOff && build.springs.length>0;
  const secondaryAnimation = hasSprings ? {
    boneGroups:[{
      comment:'hair',
      stiffiness: Math.round(p.hairStiff*4*100)/100,   // VRM0 official typo
      gravityPower: p.hairGrav,
      gravityDir:{x:0,y:-1,z:0},
      dragForce: p.hairDrag,
      center:-1,
      hitRadius:0.02,
      bones: build.springs.map(s=>nodeOf(s.boneIdxs[0])),
      colliderGroups:[0],
    }],
    colliderGroups:[{
      node: nodeOf(build.collider.bone),
      colliders:[{offset:{x:build.collider.offset[0], y:build.collider.offset[1], z:build.collider.offset[2]},
                  radius: Math.round(build.collider.radius*1000)/1000}],
    }],
  } : {boneGroups:[], colliderGroups:[]};

  const materialProperties=[{
    name:'HinaMain',
    shader:'VRM/MToon',
    renderQueue:2450,
    floatProperties:{
      _Cutoff:0.5, _BumpScale:1, _ReceiveShadowRate:1, _ShadingGradeRate:1,
      _ShadeShift:0, _ShadeToony:0.9, _LightColorAttenuation:0, _IndirectLightIntensity:0.1,
      _RimLightingMix:0, _RimFresnelPower:1, _RimLift:0,
      _OutlineWidth:0.07, _OutlineScaledMaxDistance:1, _OutlineLightingMix:1,
      _OutlineColorMode:0, _OutlineWidthMode:0, _OutlineCullMode:1,
      _UvAnimScrollX:0, _UvAnimScrollY:0, _UvAnimRotation:0,
      _MToonVersion:38, _DebugMode:0, _BlendMode:1, _CullMode:0,
      _SrcBlend:1, _DstBlend:0, _ZWrite:1,
    },
    vectorProperties:{
      _Color:[1,1,1,1], _ShadeColor:[0.9,0.85,0.95,1], _EmissionColor:[0,0,0,1],
      _OutlineColor:[0.12,0.10,0.14,1], _RimColor:[0,0,0,1],
      _MainTex:[0,0,1,1], _ShadeTexture:[0,0,1,1],
    },
    textureProperties:{_MainTex:0, _ShadeTexture:0},
    keywordMap:{_ALPHATEST_ON:true},
    tagMap:{RenderType:'TransparentCutout'},
  }];

  const gltf={
    asset:{version:'2.0', generator:'Hina '+VERSION},
    scene:0,
    scenes:[{nodes:[0]}],
    nodes,
    meshes:[{
      name:'Body',
      primitives:[{
        attributes:{POSITION:aPos, NORMAL:aNrm, TEXCOORD_0:aUv, JOINTS_0:aJnt, WEIGHTS_0:aWgt},
        indices:aIdx, material:0, mode:4, targets,
        extras:{targetNames},
      }],
      extras:{targetNames},
    }],
    skins:[{name:'Skin', joints:bones.map((b,i)=>nodeOf(i)), skeleton:nodeOf(0), inverseBindMatrices:aIBM}],
    materials:[{
      name:'HinaMain',
      pbrMetallicRoughness:{baseColorTexture:{index:0}, metallicFactor:0, roughnessFactor:0.9},
      alphaMode:'MASK', alphaCutoff:0.5, doubleSided:true,
    }],
    textures,
    samplers:[{magFilter:9729, minFilter:9987, wrapS:10497, wrapT:10497}],
    images,
    buffers:[{byteLength: bw.len}],
    bufferViews:views,
    accessors,
    extensionsUsed:['VRM'],
    extensions:{VRM:{
      exporterVersion:'Hina-'+VERSION,
      specVersion:'0.0',
      meta:vrmMeta,
      humanoid:{
        humanBones,
        armStretch:0.05, legStretch:0.05,
        upperArmTwist:0.5, lowerArmTwist:0.5, upperLegTwist:0.5, lowerLegTwist:0.5,
        feetSpacing:0, hasTranslationDoF:false,
      },
      firstPerson,
      blendShapeMaster:{blendShapeGroups},
      secondaryAnimation,
      materialProperties,
    }},
  };

  /* GLB assembly */
  const jsonBytes=utf8(JSON.stringify(gltf));
  const jPad=(4-(jsonBytes.length%4))%4;
  const binBytes=bw.bytes();
  const bPad=(4-(binBytes.length%4))%4;
  const total=12 + 8+jsonBytes.length+jPad + 8+binBytes.length+bPad;
  const out=new Uint8Array(total);
  const dv=new DataView(out.buffer);
  dv.setUint32(0,0x46546C67,true);            // 'glTF'
  dv.setUint32(4,2,true);
  dv.setUint32(8,total,true);
  dv.setUint32(12,jsonBytes.length+jPad,true);
  dv.setUint32(16,0x4E4F534A,true);           // 'JSON'
  out.set(jsonBytes,20);
  for(let i=0;i<jPad;i++) out[20+jsonBytes.length+i]=0x20;
  const bo=20+jsonBytes.length+jPad;
  dv.setUint32(bo,binBytes.length+bPad,true);
  dv.setUint32(bo+4,0x004E4942,true);         // 'BIN\0'
  out.set(binBytes,bo+8);
  return {bytes:out, json:gltf};
}

/* ---------- self test (runs in browser ?selftest and Node) ---------- */
function selfTest(){
  const R=[];
  const T=(name,fn)=>{
    try{ R.push({name, ok: fn()===true}); }
    catch(e){ R.push({name, ok:false, msg:String(e && e.message || e)}); }
  };
  const p=defaults();
  let build=null, ex=null;
  T('build default', ()=>{ build=buildAvatar(p); return !!build && build.geom.idx.length>0; });
  T('humanoid 21 bones mapped', ()=>HB.every(hb=>Number.isInteger(build.humanoid[hb])));
  T('VRM0 orientation: leftUpperArm x<0, rightUpperArm x>0', ()=>{
    return build.bones[build.idx.lUA].w[0]<0 && build.bones[build.idx.rUA].w[0]>0;
  });
  T('weights normalized', ()=>{
    const w=build.geom.wgt;
    for(let i=0;i<w.length;i+=4){ const s=w[i]+w[i+1]+w[i+2]+w[i+3]; if (Math.abs(s-1)>1e-4) return false; }
    return true;
  });
  T('joint indices in range', ()=>{
    const j=build.geom.jnt, n=build.bones.length;
    for(let i=0;i<j.length;i++) if (j[i]<0||j[i]>=n) return false;
    return true;
  });
  T('positions finite', ()=>build.geom.pos.every(Number.isFinite));
  T('tris < Quest Excellent 7500', ()=>build.geom.idx.length/3 < 7500);
  T('bones < Quest Excellent 75', ()=>build.bones.length < 75);
  T('morph "a" non-empty', ()=>build.morphs.sparse.a.length>0);
  T('export GLB', ()=>{ ex=exportVRM(build,p,{},b64ToBytes(PNG1)); return ex.bytes.length>100; });
  T('GLB magic+version', ()=>{
    const dv=new DataView(ex.bytes.buffer,ex.bytes.byteOffset,ex.bytes.byteLength);
    return dv.getUint32(0,true)===0x46546C67 && dv.getUint32(4,true)===2 && dv.getUint32(8,true)===ex.bytes.length;
  });
  T('VRM ext present', ()=>ex.json.extensionsUsed.includes('VRM') && ex.json.extensions.VRM.specVersion==='0.0');
  T('blendShapeGroups = 17', ()=>ex.json.extensions.VRM.blendShapeMaster.blendShapeGroups.length===17);
  T('accessors within buffer', ()=>{
    const SZ={5126:4,5123:2,5121:1}, N={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
    const blen=ex.json.buffers[0].byteLength;
    return ex.json.accessors.every(a=>{
      if(a.bufferView===undefined && a.sparse){
        if(!a.sparse.count) return true;
        const iv=ex.json.bufferViews[a.sparse.indices.bufferView];
        const vv=ex.json.bufferViews[a.sparse.values.bufferView];
        return iv && vv &&
          a.sparse.count*2<=iv.byteLength && (iv.byteOffset||0)+iv.byteLength<=blen &&
          a.sparse.count*SZ[a.componentType]*N[a.type]<=vv.byteLength && (vv.byteOffset||0)+vv.byteLength<=blen;
      }
      const v=ex.json.bufferViews[a.bufferView];
      return v && a.count*SZ[a.componentType]*N[a.type] <= v.byteLength &&
             (v.byteOffset||0)+v.byteLength <= blen;
    });
  });
  T('rank: PC Excellent', ()=>rank(estimate(build,p),'pc').rank==='Excellent');
  T('rank: Quest Good with springs', ()=>rank(estimate(build,p),'quest').rank==='Good');
  T('rank: Quest Excellent with springOff', ()=>{
    const p2=Object.assign({},p,{springOff:true});
    return rank(estimate(build,p2),'quest').rank==='Excellent';
  });
  T('humanoid bone node indices in range', ()=>{
    const nLen=ex.json.nodes.length;
    return ex.json.extensions.VRM.humanoid.humanBones.every(hb=>hb.node>=0 && hb.node<nLen);
  });
  T('spring bone node indices in range', ()=>{
    if (!ex.json.extensions.VRM.secondaryAnimation.boneGroups.length) return true;
    const nLen=ex.json.nodes.length;
    const cg=ex.json.extensions.VRM.secondaryAnimation.colliderGroups;
    return cg.every(g=>g.node>=0 && g.node<nLen);
  });
  T('serialize roundtrip', ()=>{
    const d=deserialize(serialize(p,{title:'t'}));
    return !!d && d.params.height===p.height && d.params.hairStyle===p.hairStyle;
  });
  return {ok:R.every(r=>r.ok), results:R};
}

return {
  VERSION, M, hex2rgb, shade, HEXRE, PAL,
  PARAMS, defaults, sanitize, PRESETS, presetParams, rng, randomParams,
  I18N, TEX, ATLAS, uvBlock, uvRect,
  RANKS, RANK_NAMES, estimate, rank,
  serialize, deserialize, PNG1, b64ToBytes,
  HB, buildSkeleton, buildAvatar, BinWriter, exportVRM, selfTest,
};
})();
if (typeof module!=='undefined' && module.exports) module.exports = HINA;
/*HINA-CORE-END*/
</script>
