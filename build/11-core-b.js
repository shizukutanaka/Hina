
/* ---------- skeleton ----------
   VRM 0.x: right-handed Y-up, model faces Z-minus, character right = +X (vrm.dev).
   T-pose normalized: node rotations identity, translations only. */
const HB = ['hips','spine','chest','neck','head',
  'leftShoulder','leftUpperArm','leftLowerArm','leftHand',
  'rightShoulder','rightUpperArm','rightLowerArm','rightHand',
  'leftUpperLeg','leftLowerLeg','leftFoot',
  'rightUpperLeg','rightLowerLeg','rightFoot',
  'leftEye','rightEye'];

function buildSkeleton(p){
  const H = p.height;
  const headR = p.headRatio*H*0.5;
  const headCY = H - headR;
  const neckTopY = headCY - headR*0.8;
  const hipsY = M.clamp(H*0.5*p.legLen, 0.32*H, neckTopY - 0.16*H);
  const neckY = neckTopY - 0.015*H;
  const chestY = hipsY + (neckY-hipsY)*0.62;
  const spineY = hipsY + (neckY-hipsY)*0.30;
  const shoulderY = chestY + (neckY-chestY)*0.62;
  const shX = p.shoulderW*H*0.5;
  const armL = H*0.34*p.armLen;
  const elbowX = shX + armL*0.47, wristX = shX + armL*0.92;
  const legX = p.hipW*H*0.5*0.52;
  const kneeY = hipsY*0.52;
  const ankleY = Math.max(0.035*H, hipsY*0.085);
  const eyeWY = headCY + headR*(-0.05 + (p.eyeY-0.5)*0.4);
  const eyeX = headR*(0.30 + (p.eyeGap-0.5)*0.24);

  const bones = [];
  const B = (name, hb, parent, w) => { bones.push({name, hb, parent, w}); return bones.length-1; };
  const hips  = B('Hips','hips',-1,[0,hipsY,0]);
  const spine = B('Spine','spine',hips,[0,spineY,0]);
  const chest = B('Chest','chest',spine,[0,chestY,0]);
  const neck  = B('Neck','neck',chest,[0,neckY,0]);
  const head  = B('Head','head',neck,[0,headCY-headR*0.55,0]);
  const lSh = B('LeftShoulder','leftShoulder',chest,[-shX*0.42,shoulderY,0]);
  const lUA = B('LeftUpperArm','leftUpperArm',lSh,[-shX,shoulderY,0]);
  const lLA = B('LeftLowerArm','leftLowerArm',lUA,[-elbowX,shoulderY,0]);
  const lH  = B('LeftHand','leftHand',lLA,[-wristX,shoulderY,0]);
  const rSh = B('RightShoulder','rightShoulder',chest,[shX*0.42,shoulderY,0]);
  const rUA = B('RightUpperArm','rightUpperArm',rSh,[shX,shoulderY,0]);
  const rLA = B('RightLowerArm','rightLowerArm',rUA,[elbowX,shoulderY,0]);
  const rH  = B('RightHand','rightHand',rLA,[wristX,shoulderY,0]);
  const lUL = B('LeftUpperLeg','leftUpperLeg',hips,[-legX,hipsY*0.98,0]);
  const lLL = B('LeftLowerLeg','leftLowerLeg',lUL,[-legX,kneeY,0]);
  const lF  = B('LeftFoot','leftFoot',lLL,[-legX,ankleY,0]);
  const rUL = B('RightUpperLeg','rightUpperLeg',hips,[legX,hipsY*0.98,0]);
  const rLL = B('RightLowerLeg','rightLowerLeg',rUL,[legX,kneeY,0]);
  const rF  = B('RightFoot','rightFoot',rLL,[legX,ankleY,0]);
  const lE  = B('LeftEye','leftEye',head,[-eyeX,eyeWY,-headR*0.7]);
  const rE  = B('RightEye','rightEye',head,[eyeX,eyeWY,-headR*0.7]);

  // hair spring chains
  const springs = [];
  const chain = (label, root, step, n, segLen) => {
    let prev = head, pos = root.slice();
    const idxs = [];
    for(let i=0;i<n;i++){
      const idx = B(label+i, null, prev, pos.slice());
      idxs.push(idx); prev = idx;
      pos = M.add(pos, M.scale(M.norm(step), segLen));
    }
    springs.push({boneIdxs: idxs});
  };
  const HL = p.hairLen, HV = p.hairVol;
  if (p.hairStyle==='twin'){
    const len = H*0.30*HL, seg = len/3;
    chain('TailL_', [-headR*0.9*HV, headCY+headR*0.35, headR*0.12], [-0.14,-1,0.10], 4, seg);
    chain('TailR_', [ headR*0.9*HV, headCY+headR*0.35, headR*0.12], [ 0.14,-1,0.10], 4, seg);
  } else if (p.hairStyle==='pony'){
    const len = H*0.32*HL, seg = len/3;
    chain('Pony_', [0, headCY+headR*0.55, headR*0.8], [0,-1,0.28], 4, seg);
  } else if (p.hairStyle==='long'){
    const len = H*0.30*HL, seg = len/2;
    for(const a of [-0.6,0,0.6]){
      chain('Long'+(a<0?'L':a>0?'R':'C')+'_',
        [Math.sin(a)*headR*0.8, headCY+headR*0.05, Math.cos(a)*headR*0.8],
        [Math.sin(a)*0.18,-1,0.10], 3, seg);
    }
  }

  const humanoid = {};
  bones.forEach((b,i)=>{ if(b.hb) humanoid[b.hb]=i; });
  return { bones, springs, humanoid,
    dims:{H, headR, headCY, neckY, chestY, spineY, shoulderY, hipsY, kneeY, ankleY,
          shX, elbowX, wristX, legX, eyeWY, eyeX, armL},
    idx:{hips,spine,chest,neck,head,lSh,lUA,lLA,lH,rSh,rUA,rLA,rH,lUL,lLL,lF,rUL,rLL,rF,lE,rE} };
}

/* ---------- geometry primitives ---------- */
function geoNew(){ return {pos:[],nrm:[],uv:[],jnt:[],wgt:[],idx:[],tags:{}}; }
function addV(g, p, n, uv, skin){
  g.pos.push(p[0],p[1],p[2]);
  const nn = M.norm(n); g.nrm.push(nn[0],nn[1],nn[2]);
  g.uv.push(uv[0],uv[1]);
  let s = skin.slice(0,4), tw=0;
  for(const e of s) tw += e[1];
  if (!(tw>0)){ s=[[0,1]]; tw=1; }
  const j=[0,0,0,0], w=[0,0,0,0];
  s.forEach((e,i)=>{ j[i]=e[0]; w[i]=e[1]/tw; });
  g.jnt.push(j[0],j[1],j[2],j[3]); g.wgt.push(w[0],w[1],w[2],w[3]);
  return g.pos.length/3 - 1;
}
function quad4(g,a,b,c,d){ g.idx.push(a,b,c, a,c,d); }
function tagged(g, name, fn){ const s=g.pos.length/3; fn(); g.tags[name]=[s, g.pos.length/3]; }

/* flat quad: center c, halfwidth wx along +X, halfheight hy along +Y, at fixed z plane facing -Z */
function faceQuad(g, c, wx, hy, uvr, skin){
  const n=[0,0,-1];
  const a=addV(g,[c[0]-wx,c[1]+hy,c[2]],n,[uvr[0],uvr[1]],skin);
  const b=addV(g,[c[0]+wx,c[1]+hy,c[2]],n,[uvr[2],uvr[1]],skin);
  const cc=addV(g,[c[0]+wx,c[1]-hy,c[2]],n,[uvr[2],uvr[3]],skin);
  const d=addV(g,[c[0]-wx,c[1]-hy,c[2]],n,[uvr[0],uvr[3]],skin);
  quad4(g,a,b,cc,d);
}

/* sphere band. dir = [sinφ sinθ, cosφ, sinφ cosθ] → θ=0 faces +Z(back), θ=π faces -Z(front) */
function sphereBand(g, c, r, phi0, phi1, rings, segs, uv, skinFn, deform){
  const grid=[];
  for(let i=0;i<=rings;i++){
    const phi = phi0 + (phi1-phi0)*i/rings;
    const row=[];
    for(let j=0;j<=segs;j++){
      const th = j/segs*Math.PI*2;
      let d=[Math.sin(phi)*Math.sin(th), Math.cos(phi), Math.sin(phi)*Math.cos(th)];
      let rr = r, pos=[c[0]+d[0]*rr, c[1]+d[1]*rr, c[2]+d[2]*rr];
      if (deform){ const o=deform(pos,d,phi,th); pos=o.p; d=o.n||d; }
      row.push(addV(g,pos,d,uv,skinFn(pos,phi,th)));
    }
    grid.push(row);
  }
  // A ring exactly at a sphere pole (phi=0 or phi=π) collapses every vertex in that ring to the
  // same position (sin(phi)=0 for all θ) — distinct vertex indices, identical position. The
  // generic two-triangle quad then always emits one zero-area triangle at a pole row (112 of
  // them in the default avatar: head/hand/foot/scalp poles). Skip only that half of the quad;
  // the surviving triangle keeps its original indices/winding unchanged.
  const poleAtStart = Math.abs(Math.sin(phi0)) < 1e-9;
  const poleAtEnd = Math.abs(Math.sin(phi1)) < 1e-9;
  for(let i=0;i<rings;i++)for(let j=0;j<segs;j++){
    const a=grid[i][j], b=grid[i][j+1], c=grid[i+1][j+1], d=grid[i+1][j];
    if (!(i===0 && poleAtStart)) g.idx.push(a,b,c);
    if (!(i===rings-1 && poleAtEnd)) g.idx.push(a,c,d);
  }
}

/* elliptic lathe around Y. rings: [{y, rx, rz, skin}] */
function latheY(g, rings, segs, uv, deform){
  const grid=[];
  for(let i=0;i<rings.length;i++){
    const R=rings[i], row=[];
    for(let j=0;j<=segs;j++){
      const th=j/segs*Math.PI*2, cx=Math.cos(th), sz=Math.sin(th);
      let pos=[cx*R.rx, R.y, sz*R.rz];
      // slope normal from neighbours
      const rp=rings[Math.max(0,i-1)], rn=rings[Math.min(rings.length-1,i+1)];
      const dr=((rp.rx+rp.rz)-(rn.rx+rn.rz))/2, dy=(rn.y-rp.y)||1e-4;
      let n=M.norm([cx, dr/dy*0.8, sz]);
      if (deform){ const o=deform(pos,th,i); pos=o.p; if(o.n) n=o.n; }
      row.push(addV(g,pos,n,uv,R.skin));
    }
    grid.push(row);
  }
  for(let i=0;i<rings.length-1;i++)for(let j=0;j<segs;j++)
    quad4(g, grid[i][j],grid[i][j+1],grid[i+1][j+1],grid[i+1][j]);
}

/* tube: ringDefs [{pos, r, skin}] open at both ends */
function tube(g, ringDefs, segs, uv){
  const grid=[];
  for(let i=0;i<ringDefs.length;i++){
    const R=ringDefs[i];
    const prev=ringDefs[Math.max(0,i-1)].pos, next=ringDefs[Math.min(ringDefs.length-1,i+1)].pos;
    let t=M.norm(M.sub(next,prev));
    if (M.len(M.sub(next,prev))<1e-6) t=[0,-1,0];
    let up = Math.abs(t[1])>0.92 ? [0,0,1] : [0,1,0];
    const side=M.norm(M.cross(up,t)), up2=M.cross(t,side);
    const row=[];
    for(let j=0;j<=segs;j++){
      const th=j/segs*Math.PI*2, n=M.add(M.scale(side,Math.cos(th)), M.scale(up2,Math.sin(th)));
      row.push(addV(g, M.add(R.pos, M.scale(n,R.r)), n, uv, R.skin));
    }
    grid.push(row);
  }
  for(let i=0;i<grid.length-1;i++)for(let j=0;j<segs;j++)
    quad4(g, grid[i][j],grid[i][j+1],grid[i+1][j+1],grid[i+1][j]);
}

/* closing fan cap at a tube end */
function cap(g, center, normal, ringStartIdx, segs){
  const c=addV(g, center, normal, [g.uv[ringStartIdx*2],g.uv[ringStartIdx*2+1]],
    [[g.jnt[ringStartIdx*4], 1]]);
  for(let j=0;j<segs;j++){
    const a=ringStartIdx+j, b=ringStartIdx+j+1;
    if (normal[1]>0) g.idx.push(c,a,b); else g.idx.push(c,b,a);
  }
}

/* ---------- avatar mesh ---------- */
function buildAvatar(p){
  p = sanitize(p);
  const sk = buildSkeleton(p);
  const {bones, springs, humanoid, dims, idx} = sk;
  const {H, headR, headCY, neckY, chestY, spineY, shoulderY, hipsY, kneeY, ankleY,
         shX, elbowX, wristX, legX, eyeWY, eyeX} = dims;
  const g = geoNew();
  const hipR = p.hipW*H*0.5*0.92;
  const uS=uvBlock('skin'), uH=uvBlock('hair'), uHi=uvBlock('hairHi'), uC=uvBlock('clothMain'),
        uC2=uvBlock('clothSub'), uA=uvBlock('accent'), uSh=uvBlock('shoe'), uW=uvBlock('white');

  /* torso */
  const tor = (w1,b1,w2,b2)=>[[w1,b1],[w2,b2]];
  latheY(g, [
    {y:hipsY-0.07*H, rx:hipR*0.55, rz:hipR*0.45, skin:[[idx.hips,1]]},
    {y:hipsY-0.03*H, rx:hipR*0.96, rz:hipR*0.70, skin:[[idx.hips,1]]},
    {y:hipsY+0.02*H, rx:hipR,      rz:hipR*0.72, skin:[[idx.hips,1]]},
    {y:spineY, rx:hipR*0.78, rz:hipR*0.60, skin:tor(idx.hips,0.35,idx.spine,0.65)},
    {y:chestY, rx:Math.max(hipR*0.84, shX*0.56), rz:hipR*0.66, skin:tor(idx.spine,0.3,idx.chest,0.7)},
    {y:shoulderY, rx:shX*0.66, rz:hipR*0.58, skin:[[idx.chest,1]]},
    {y:neckY+0.01*H, rx:headR*0.34, rz:headR*0.30, skin:tor(idx.chest,0.55,idx.neck,0.45)},
  ], 12, uS, (pos,th,i)=>{
    if (i===4 && Math.sin(th)<-0.25) pos[2] -= p.bust*0.045*H*(-Math.sin(th)-0.25);
    return {p:pos};
  });

  /* neck */
  tube(g, [
    {pos:[0,neckY,0], r:headR*0.30, skin:tor(idx.chest,0.3,idx.neck,0.7)},
    {pos:[0,headCY-headR*0.55,0], r:headR*0.285, skin:tor(idx.neck,0.4,idx.head,0.6)},
  ], 10, uS);

  /* head */
  sphereBand(g, [0,headCY,0.005*H], headR, 0, Math.PI, 12, 16, uS,
    ()=>[[idx.head,1]],
    (pos,d)=>{
      const jaw = M.smooth(0.18, 0.95, -d[1]);
      const s = 1 - 0.26*jaw;
      return {p:[pos[0]*s + 0*0, pos[1], (pos[2]-0.005*H)*0.96*s + 0.005*H]};
    });

  /* arms (single tube each), hands */
  const armR = 0.026*H*p.armTh;
  for(const s of [-1,1]){
    const ua=s<0?idx.lUA:idx.rUA, la=s<0?idx.lLA:idx.rLA, ha=s<0?idx.lH:idx.rH;
    const xs=v=>s*v;
    tube(g, [
      {pos:[xs(shX*0.92),shoulderY,0], r:armR*1.25, skin:[[idx.chest,0.45],[ua,0.55]]},
      {pos:[xs(shX+ (elbowX-shX)*0.45),shoulderY,0], r:armR*1.05, skin:[[ua,1]]},
      {pos:[xs(elbowX),shoulderY,0], r:armR*0.92, skin:[[ua,0.5],[la,0.5]]},
      {pos:[xs(elbowX+(wristX-elbowX)*0.55),shoulderY,0], r:armR*0.82, skin:[[la,1]]},
      {pos:[xs(wristX),shoulderY,0], r:armR*0.68, skin:[[la,0.65],[ha,0.35]]},
    ], 8, uS);
    // mitten hand
    const hcx = xs(wristX+0.030*H*p.armLen);
    sphereBand(g,[hcx,shoulderY,0], 0.030*H*p.armTh, 0, Math.PI, 6, 8, uS,
      ()=>[[ha,1]], (pos,d)=>({p:[hcx+(pos[0]-hcx)*1.35, shoulderY+(pos[1]-shoulderY)*0.82, pos[2]]}));
  }

  /* legs + shoes */
  const legR = 0.040*H*p.legTh;
  for(const s of [-1,1]){
    const ul=s<0?idx.lUL:idx.rUL, ll=s<0?idx.lLL:idx.rLL, ft=s<0?idx.lF:idx.rF;
    const x=s*legX;
    tube(g, [
      {pos:[x,hipsY*0.99,0], r:legR*1.35, skin:[[idx.hips,0.4],[ul,0.6]]},
      {pos:[x,hipsY*0.78,0], r:legR*1.18, skin:[[ul,1]]},
      {pos:[x,kneeY,0], r:legR*0.92, skin:[[ul,0.5],[ll,0.5]]},
      {pos:[x,kneeY*0.55+ankleY*0.45,0], r:legR*0.8, skin:[[ll,1]]},
      {pos:[x,ankleY,0], r:legR*0.62, skin:[[ll,0.6],[ft,0.4]]},
    ], 8, uS);
    sphereBand(g,[x,ankleY*0.72,-0.030*H], legR*1.1, 0, Math.PI, 6, 8, uSh,
      ()=>[[ft,1]], (pos,d)=>({p:[x+(pos[0]-x)*0.8, ankleY*0.72+(pos[1]-ankleY*0.72)*0.62, -0.030*H+(pos[2]+0.030*H)*1.9]}));
    if (p.socks){
      tube(g, [
        {pos:[x,kneeY*0.72+ankleY*0.28,0], r:legR*0.86, skin:[[ll,1]]},
        {pos:[x,ankleY*1.1,0], r:legR*0.70, skin:[[ll,0.6],[ft,0.4]]},
      ], 8, uW);
    }
  }

  /* outfit */
  const skirtTop=hipsY+0.035*H, skirtLenW = (0.10+0.10*p.skirtLen)*H;
  const hasSkirt = p.outfit==='onepiece' || p.outfit==='sailor';
  const topUv = p.outfit==='shirts' ? uC2 : uC;
  // top shell
  latheY(g, [
    {y:spineY-0.03*H, rx:hipR*0.84, rz:hipR*0.66, skin:tor(idx.hips,0.35,idx.spine,0.65)},
    {y:chestY, rx:Math.max(hipR*0.90, shX*0.60), rz:hipR*0.72, skin:tor(idx.spine,0.3,idx.chest,0.7)},
    {y:shoulderY+0.012*H, rx:shX*0.74, rz:hipR*0.64, skin:[[idx.chest,1]]},
    {y:neckY+0.012*H, rx:headR*0.40, rz:headR*0.36, skin:tor(idx.chest,0.6,idx.neck,0.4)},
  ], 12, topUv, (pos,th,i)=>{
    if (i===1 && Math.sin(th)<-0.25) pos[2] -= p.bust*0.05*H*(-Math.sin(th)-0.25);
    return {p:pos};
  });
  if (hasSkirt){
    latheY(g, [
      {y:skirtTop, rx:hipR*1.10, rz:hipR*0.92, skin:[[idx.hips,1]]},
      {y:skirtTop-skirtLenW*0.5, rx:hipR*1.35, rz:hipR*1.15, skin:[[idx.hips,1]]},
      {y:skirtTop-skirtLenW, rx:hipR*1.62, rz:hipR*1.40, skin:[[idx.hips,1]]},
    ], 14, uC, (pos,th,i)=>{
      return {p:pos};
    });
    // re-skin skirt lower rings toward legs (angular): patch last latheY verts
    const n=(14+1)*3, start=g.pos.length/3-n;
    for(let k=0;k<n;k++){
      const vi=start+k, ring=(k/(15))|0, t=ring/2;
      const x=g.pos[vi*3], cx=x/(hipR*1.6);
      const wl=Math.max(0,-cx)*0.5*t, wr=Math.max(0,cx)*0.5*t, wh=1-wl-wr;
      g.jnt[vi*4]=idx.hips; g.wgt[vi*4]=wh;
      g.jnt[vi*4+1]=idx.lUL; g.wgt[vi*4+1]=wl;
      g.jnt[vi*4+2]=idx.rUL; g.wgt[vi*4+2]=wr;
      g.jnt[vi*4+3]=0; g.wgt[vi*4+3]=0;
    }
  } else {
    // shorts / pants
    for(const s of [-1,1]){
      const ul=s<0?idx.lUL:idx.rUL, ll=s<0?idx.lLL:idx.rLL, x=s*legX;
      const bot = p.outfit==='shirts'? hipsY*0.62 : hipsY*0.74;
      tube(g, [
        {pos:[x,hipsY*1.0,0], r:legR*1.5, skin:[[idx.hips,0.4],[ul,0.6]]},
        {pos:[x,bot,0], r:legR*1.3, skin:[[ul,0.85],[ll,0.15]]},
      ], 8, uC);
    }
  }
  // sleeves
  {
    const tEnd = p.sleeves==='long'?0.94:0.40;
    const sUv = p.outfit==='shirts'?uC2:uC;
    for(const s of [-1,1]){
      const ua=s<0?idx.lUA:idx.rUA, la=s<0?idx.lLA:idx.rLA;
      const x0=s*shX*0.9, x1=s*(shX+(wristX-shX)*tEnd);
      tube(g, [
        {pos:[x0,shoulderY,0], r:armR*1.55, skin:[[idx.chest,0.4],[ua,0.6]]},
        {pos:[s*(shX+(wristX-shX)*tEnd*0.5),shoulderY,0], r:armR*1.30, skin:[[ua,tEnd>0.5?0.6:1],[la,tEnd>0.5?0.4:0]]},
        {pos:[x1,shoulderY,0], r:armR*1.12, skin: tEnd>0.5?[[la,1]]:[[ua,1]]},
      ], 8, sUv);
    }
  }
  // sailor collar / accent
  if (p.outfit==='sailor'){
    const cy=neckY+0.005*H, cw=shX*0.62, n=[0,0.3,-1];
    const a=addV(g,[-cw,cy,-hipR*0.55],n,uA,[[idx.chest,1]]);
    const b=addV(g,[ cw,cy,-hipR*0.55],n,uA,[[idx.chest,1]]);
    const c=addV(g,[0,cy-0.085*H,-hipR*0.78],n,uA,[[idx.chest,1]]);
    g.idx.push(a,b,c);
    const a2=addV(g,[-cw*1.05,cy,hipR*0.5],[0,0.3,1],uA,[[idx.chest,1]]);
    const b2=addV(g,[ cw*1.05,cy,hipR*0.5],[0,0.3,1],uA,[[idx.chest,1]]);
    const c2=addV(g,[ cw*1.05,cy-0.10*H,hipR*0.62],[0,0,1],uA,[[idx.chest,1]]);
    const d2=addV(g,[-cw*1.05,cy-0.10*H,hipR*0.62],[0,0,1],uA,[[idx.chest,1]]);
    quad4(g,a2,b2,c2,d2);
  }
  if (p.outfit==='hoodie'){
    sphereBand(g,[0,neckY+0.01*H, headR*0.35], headR*0.95, 0.25*Math.PI, 0.6*Math.PI, 4, 8, uC,
      ()=>[[idx.chest,0.6],[idx.neck,0.4]], null);
  }

  /* hair: scalp + style */
  const hr = headR*1.085*p.hairVol, hc=[0,headCY+headR*0.02, headR*0.02];
  sphereBand(g, hc, hr, 0,         0.18*Math.PI, 3, 16, uHi, ()=>[[idx.head,1]], null);
  sphereBand(g, hc, hr, 0.18*Math.PI, 0.56*Math.PI, 5, 16, uH,  ()=>[[idx.head,1]], null);
  if (p.hairStyle==='bob'){
    sphereBand(g, hc, hr, 0.5*Math.PI, 0.92*Math.PI, 5, 12, uH, ()=>[[idx.head,1]],
      (pos,d,phi,th)=>{ const f=1+0.14*M.smooth(0.5*Math.PI,0.92*Math.PI,phi);
        return {p:[hc[0]+d[0]*hr*f, pos[1]-0.02*H*M.smooth(0.6*Math.PI,0.92*Math.PI,phi), hc[2]+d[2]*hr*f]}; });
  } else if (p.hairStyle==='short'){
    sphereBand(g, hc, hr, 0.5*Math.PI, 0.74*Math.PI, 3, 12, uH, ()=>[[idx.head,1]], null);
  } else {
    sphereBand(g, hc, hr, 0.5*Math.PI, 0.78*Math.PI, 3, 12, uH, ()=>[[idx.head,1]],
      (pos,d,phi,th)=>{
        // nape coverage mostly at back: pull front-side verts back to scalp radius
        if (d[2]<0.1) return {p:M.add(hc, M.scale(d, hr*0.995))};
        return {p:pos};
      });
  }

  /* bangs */
  const bangStrip=(thC, halfW, tipDrop, tipShift)=>{
    const phiTop=0.34*Math.PI;
    const pOn=(th,phi)=>[hc[0]+Math.sin(phi)*Math.sin(th)*hr*1.01, hc[1]+Math.cos(phi)*hr*1.01, hc[2]+Math.sin(phi)*Math.cos(th)*hr*1.01];
    const t0=pOn(thC-halfW, phiTop), t1=pOn(thC+halfW, phiTop);
    const midPhi=0.5*Math.PI;
    const m0=pOn(thC-halfW*0.9, midPhi), m1=pOn(thC+halfW*0.9, midPhi);
    m0[2]-=headR*0.04; m1[2]-=headR*0.04;
    const tipBase=pOn(thC+tipShift, midPhi);
    const tip=[tipBase[0], eyeWY - headR*tipDrop, tipBase[2]-headR*0.05];
    const n=[Math.sin(thC)*0.4,0.15,Math.cos(thC)<0?-1:1];
    const sk=[[idx.head,1]];
    const A=addV(g,t0,n,uH,sk),B2=addV(g,t1,n,uH,sk),C=addV(g,m0,n,uH,sk),D=addV(g,m1,n,uH,sk),T=addV(g,tip,n,uH,sk);
    g.idx.push(A,B2,D, A,D,C, C,D,T);
  };
  const F=Math.PI; // front center θ
  if (p.bangs==='full'){
    for(let i=0;i<7;i++){
      const off=(i-3)*0.13*Math.PI;
      bangStrip(F+off, 0.075*Math.PI, i%2?0.05:0.30, 0);
    }
  } else if (p.bangs==='see'){
    for(let i=0;i<5;i++){
      const off=(i-2)*0.17*Math.PI;
      bangStrip(F+off, 0.05*Math.PI, i%2?0.1:0.35, 0);
    }
  } else { // center part
    bangStrip(F-0.16*Math.PI, 0.10*Math.PI, 0.45, -0.12*Math.PI);
    bangStrip(F+0.16*Math.PI, 0.10*Math.PI, 0.45,  0.12*Math.PI);
    bangStrip(F-0.34*Math.PI, 0.07*Math.PI, 0.2, -0.06*Math.PI);
    bangStrip(F+0.34*Math.PI, 0.07*Math.PI, 0.2,  0.06*Math.PI);
  }
  if (p.ahoge){
    const top=[0,hc[1]+hr*0.99,hc[2]];
    const sk=[[idx.head,1]], n=[0,0,-1];
    const A=addV(g,[top[0]-headR*0.03,top[1],top[2]],n,uH,sk);
    const B2=addV(g,[top[0]+headR*0.03,top[1],top[2]],n,uH,sk);
    const T=addV(g,[top[0]+headR*0.10,top[1]+headR*0.26,top[2]-headR*0.10],n,uH,sk);
    g.idx.push(A,B2,T);
  }

  /* hair tails along spring chains */
  const tailUv=uH;
  const chainPath=(sp)=>sp.boneIdxs.map(bi=>bones[bi].w);
  if (p.hairStyle==='twin' || p.hairStyle==='pony'){
    for(const sp of springs){
      const pts=chainPath(sp);
      const last=pts[pts.length-1], prev=pts[pts.length-2];
      const ext=M.add(last, M.scale(M.norm(M.sub(last,prev)), H*0.05*p.hairLen));
      const path=[...pts, ext];
      const r0=headR*0.34*p.hairVol;
      const rings=path.map((pos,i)=>{
        const t=i/(path.length-1);
        const bi=sp.boneIdxs[Math.min(i, sp.boneIdxs.length-1)];
        const bp=sp.boneIdxs[Math.max(0,Math.min(i, sp.boneIdxs.length-1)-1)];
        return {pos, r:r0*(1-t*0.92)+0.004, skin:[[bi,0.75],[bp,0.25]]};
      });
      tube(g, rings, 8, tailUv);
      cap(g, M.add(path[path.length-1],[0,-0.005,0]), [0,-1,0], g.pos.length/3-9, 8);
      // scrunchie
      tube(g, [
        {pos:M.add(pts[0],[0,0.012*H,0]), r:r0*1.12, skin:[[sp.boneIdxs[0],1]]},
        {pos:M.add(pts[0],[0,-0.012*H,0]), r:r0*1.12, skin:[[sp.boneIdxs[0],1]]},
      ], 8, uA);
    }
  } else if (p.hairStyle==='long'){
    for(const sp of springs){
      const pts=chainPath(sp);
      const last=pts[pts.length-1], prev=pts[pts.length-2];
      const ext=M.add(last, M.scale(M.norm(M.sub(last,prev)), H*0.06*p.hairLen));
      const path=[...pts, ext];
      // ribbon
      const w0=headR*0.40*p.hairVol;
      let pv=[];
      for(let i=0;i<path.length;i++){
        const t=i/(path.length-1);
        const dir=M.norm(M.sub(path[Math.min(i+1,path.length-1)], path[Math.max(0,i-1)]));
        let side=M.norm(M.cross([0,0,1],dir)); if(!M.len(side)) side=[1,0,0];
        const w=w0*(1-t*0.85);
        const bi=sp.boneIdxs[Math.min(i,sp.boneIdxs.length-1)];
        const n=M.norm([path[i][0]*0.3,0.1,1]);
        const sk=[[bi,1]];
        const a=addV(g,M.add(path[i],M.scale(side,w)),n,uH,sk);
        const b=addV(g,M.sub(path[i],M.scale(side,w)),n,uH,sk);
        if (pv.length) quad4(g, pv[0],pv[1],b,a);
        pv=[a,b];
      }
    }
  }

  /* ---- face parts (kept LAST → outline pass excludes from here) ---- */
  const faceStart = g.pos.length/3;
  const faceZ=-headR*0.97 + 0.005*H*0;
  const ew=headR*0.21*p.eyeSize, eh=headR*0.17*p.eyeSize;
  tagged(g,'eyeL', ()=>faceQuad(g,[-eyeX,eyeWY,faceZ],ew,eh,uvRect('eyeL'),[[idx.lE,1]]));
  tagged(g,'eyeR', ()=>faceQuad(g,[ eyeX,eyeWY,faceZ],ew,eh,uvRect('eyeR'),[[idx.rE,1]]));
  const bw=ew*1.12, bh=headR*0.052, by=eyeWY+eh*1.55;
  tagged(g,'browL',()=>faceQuad(g,[-eyeX,by,faceZ],bw,bh,uvRect('browL'),[[idx.head,1]]));
  tagged(g,'browR',()=>faceQuad(g,[ eyeX,by,faceZ],bw,bh,uvRect('browR'),[[idx.head,1]]));
  // mouth fan
  const mc=[0, headCY-headR*0.42, faceZ];
  const mrx=headR*0.14*p.mouthW, mry=headR*0.045;
  const mrect=ATLAS.mouth, mcu=(mrect[0]+mrect[2])/2/TEX, mcv=(mrect[1]+mrect[3])/2/TEX;
  const mru=(mrect[2]-mrect[0])/2/TEX*0.85, mrv=(mrect[3]-mrect[1])/2/TEX*0.85;
  tagged(g,'mouth',()=>{
    const cIdx=addV(g,mc,[0,0,-1],[mcu,mcv],[[idx.head,1]]);
    const ring=[];
    for(let i2=0;i2<8;i2++){
      const a=i2/8*Math.PI*2;
      ring.push(addV(g,[mc[0]+Math.cos(a)*mrx, mc[1]+Math.sin(a)*mry, mc[2]],[0,0,-1],
        [mcu+Math.cos(a)*mru, mcv-Math.sin(a)*mrv],[[idx.head,1]]));
    }
    for(let i2=0;i2<8;i2++) g.idx.push(cIdx, ring[i2], ring[(i2+1)%8]);
  });
  // cheeks
  for(const s of [-1,1])
    faceQuad(g,[s*headR*0.52, headCY-headR*0.26, -headR*0.86], headR*0.14, headR*0.10, uvRect('blush'), [[idx.head,1]]);

  /* ---------- morph targets ---------- */
  const morphNames=['a','i','u','e','o','blink','blink_l','blink_r','joy','angry','sorrow','fun'];
  const sparse={}; morphNames.forEach(n=>sparse[n]=[]);
  const range=n=>g.tags[n];
  const scaleTag=(t,tag,c,sx,sy,dz=0,dy=0,cornerLift=0)=>{
    const [s,e]=range(tag);
    let maxAbsPx=0;
    if(cornerLift) for(let i=s;i<e;i++) maxAbsPx=Math.max(maxAbsPx,Math.abs(g.pos[i*3]-c[0]));
    for(let i=s;i<e;i++){
      const px=g.pos[i*3]-c[0], py=g.pos[i*3+1]-c[1];
      const cl=(cornerLift&&maxAbsPx>0)?cornerLift*Math.abs(px)/maxAbsPx:0;
      const d=[px*(sx-1), py*(sy-1)+dy+cl, dz];
      if (d[0]||d[1]||d[2]) sparse[t].push([i,d[0],d[1],d[2]]);
    }
  };
  const browTilt=(t,tag,innerDy,outerDy)=>{
    const [s,e]=range(tag);
    const sign = tag==='browL' ? 1 : -1; // inner = toward x=0
    for(let i=s;i<e;i++){
      const px=g.pos[i*3];
      const inner = sign>0 ? (px > -eyeX) : (px < eyeX);
      const dy=inner?innerDy:outerDy;
      if(dy) sparse[t].push([i,0,dy,0]);
    }
  };
  const eC_L=[-eyeX,eyeWY,faceZ], eC_R=[eyeX,eyeWY,faceZ];
  // vowels
  scaleTag('a','mouth',mc,1.15,3.4);
  scaleTag('i','mouth',mc,1.55,0.45,0,0,headR*0.015); // /iː/ grin: corners lift
  scaleTag('u','mouth',mc,0.55,1.7,-headR*0.05);
  scaleTag('e','mouth',mc,1.30,2.0,0,0,headR*0.008); // /eː/ slight corner lift
  scaleTag('o','mouth',mc,0.75,2.7,-headR*0.035);
  // blinks — inner brow pulls down more than outer (natural orbicularis motion)
  scaleTag('blink','eyeL',eC_L,1,0.06); scaleTag('blink','eyeR',eC_R,1,0.06);
  browTilt('blink','browL',-headR*0.045,-headR*0.02); browTilt('blink','browR',-headR*0.045,-headR*0.02);
  scaleTag('blink_l','eyeL',eC_L,1,0.06); browTilt('blink_l','browL',-headR*0.045,-headR*0.02);
  scaleTag('blink_r','eyeR',eC_R,1,0.06); browTilt('blink_r','browR',-headR*0.045,-headR*0.02);
  // emotions
  scaleTag('joy','eyeL',eC_L,1,0.12,0,headR*0.02); scaleTag('joy','eyeR',eC_R,1,0.12,0,headR*0.02);
  scaleTag('joy','mouth',mc,1.25,1.9,0,0,headR*0.022);
  browTilt('joy','browL', headR*0.04, headR*0.03); browTilt('joy','browR', headR*0.04, headR*0.03);
  browTilt('angry','browL',-headR*0.085, headR*0.025); browTilt('angry','browR',-headR*0.085, headR*0.025);
  scaleTag('angry','eyeL',eC_L,1,0.62,0,headR*0.008); scaleTag('angry','eyeR',eC_R,1,0.62,0,headR*0.008);
  scaleTag('angry','mouth',mc,0.7,0.85,0,-headR*0.01,-headR*0.02);
  browTilt('sorrow','browL', headR*0.07,-headR*0.02); browTilt('sorrow','browR', headR*0.07,-headR*0.02);
  scaleTag('sorrow','mouth',mc,0.9,0.5,0,-headR*0.015,-headR*0.03);
  scaleTag('sorrow','eyeL',eC_L,1,0.62,0,-headR*0.012); scaleTag('sorrow','eyeR',eC_R,1,0.62,0,-headR*0.012);
  scaleTag('fun','mouth',mc,1.45,1.35,0,0,headR*0.03);
  scaleTag('fun','eyeL',eC_L,1,0.55); scaleTag('fun','eyeR',eC_R,1,0.55);
  browTilt('fun','browL', headR*0.06, headR*0.05); browTilt('fun','browR', headR*0.06, headR*0.05);

  return { geom:g, bones, springs, humanoid, dims, idx, faceStart,
    morphs:{names:morphNames, sparse},
    collider:{ bone: idx.head, offset:[0, 0.0, 0.01*H], radius: headR*0.88 } };
}
