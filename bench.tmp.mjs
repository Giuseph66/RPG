import * as CANNON from 'cannon-es';
import { readFileSync } from 'node:fs';

const PASSO = 1/60;
function meta(id){ return JSON.parse(readFileSync(`public/dice/${id}.json`,'utf8')); }
function mundo(lim=20){
  const w = new CANNON.World();
  w.gravity.set(0,-981,0); w.allowSleep = true;
  w.broadphase = new CANNON.SAPBroadphase(w);
  w.solver.iterations = 14;
  const chao = new CANNON.Body({mass:0, shape:new CANNON.Plane()});
  chao.quaternion.setFromEuler(-Math.PI/2,0,0); w.addBody(chao);
  for (const [p,r] of [[[-lim,0,0],[0,Math.PI/2,0]],[[lim,0,0],[0,-Math.PI/2,0]],[[0,0,-lim],[0,0,0]],[[0,0,lim],[0,Math.PI,0]]]) {
    const b = new CANNON.Body({mass:0, shape:new CANNON.Plane()});
    b.position.set(...p); b.quaternion.setFromEuler(...r); w.addBody(b);
  }
  return w;
}
function corpo(w,m){
  const b = new CANNON.Body({mass:m.mass, shape:new CANNON.ConvexPolyhedron({
    vertices:m.collider.vertices.map(([x,y,z])=>new CANNON.Vec3(x,y,z)), faces:m.collider.faces}),
    allowSleep:true, linearDamping:0.06, angularDamping:0.12});
  b.sleepSpeedLimit=0.9; b.sleepTimeLimit=0.35;
  const r = m.collider.vertices.map(([x,y,z])=>Math.hypot(x,y,z)).reduce((a,c)=>a+c,0)/m.collider.vertices.length;
  const i = 0.4*b.mass*r*r; b.inertia.set(i,i,i); b.invInertia.set(1/i,1/i,1/i); b.updateInertiaWorld(true);
  w.addBody(b); return b;
}
for (const id of ['d6','d20','d100']) {
  const m = meta(id);
  for (const n of [6,12,20,30]) {
    const w = mundo(); const bs=[];
    for (let k=0;k<n;k++){ const b=corpo(w,m);
      b.position.set(Math.cos(k)*8, 20+k*0.7, Math.sin(k)*8);
      b.velocity.set(10,-20,10); b.angularVelocity.set(15,15,15); }
    const t0=performance.now();
    for (let s=0;s<420;s++) w.step(PASSO);
    const ms=performance.now()-t0;
    console.log(`${id.padEnd(5)} n=${String(n).padEnd(3)} 420 passos = ${ms.toFixed(0)} ms`);
  }
}
