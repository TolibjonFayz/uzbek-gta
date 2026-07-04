import * as THREE from 'three';
import { rand, pick, canvasTexture, blobShadow } from './utils.js';

const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2129 });
const tyreMat = new THREE.MeshLambertMaterial({ color: 0x14171a });
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3c0 });
const tailMat = new THREE.MeshBasicMaterial({ color: 0xd22c2c });
const barMat = new THREE.MeshLambertMaterial({ color: 0x22262c });

const LETTERS = 'ABCDEFHJKLMNPRSTUVXYZ';
export function randomPlate() {
  const d = String(Math.floor(100 + Math.random() * 900));
  return '01 ' + pick(LETTERS) + ' ' + d + ' ' + pick(LETTERS) + pick(LETTERS);
}

function plateTex(text) {
  return canvasTexture(128, 32, (g) => {
    g.fillStyle = '#f8f8f6'; g.fillRect(0, 0, 128, 32);
    g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(1, 1, 126, 30);
    g.fillStyle = '#111'; g.font = 'bold 16px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 64, 17);
  });
}

function sideDecalTex(text, band, fg) {
  return canvasTexture(256, 48, (g) => {
    g.clearRect(0, 0, 256, 48);
    g.fillStyle = band; g.fillRect(0, 8, 256, 32);
    g.fillStyle = fg; g.font = 'bold 26px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 128, 24);
  });
}

// O'zbekistonning eng mashhur mashinalari
export const MODELS = [
  { name: 'Chevrolet Cobalt', kind: 'sedan', len: 4.48, wid: 1.74, colors: ['#f5f5f3', '#f5f5f3', '#f5f5f3', '#d9dadb', '#23262b'], max: 38, acc: 11, w: 5 },
  { name: 'Chevrolet Nexia',  kind: 'sedan', len: 4.30, wid: 1.66, colors: ['#f3f2ee', '#e9e2cd', '#ced3d6', '#f5f5f3'], max: 34, acc: 9.5, w: 4 },
  { name: 'Chevrolet Gentra', kind: 'sedan', len: 4.50, wid: 1.73, colors: ['#f5f5f3', '#17191d', '#b8bcc0'], max: 39, acc: 11.5, w: 2 },
  { name: 'Daewoo Matiz',     kind: 'hatch', len: 3.50, wid: 1.50, colors: ['#f5f5f3', '#d94f4f', '#8ab6d9', '#efd35f'], max: 29, acc: 8, w: 3 },
  { name: 'Chevrolet Spark',  kind: 'hatch', len: 3.64, wid: 1.60, colors: ['#f5f5f3', '#e37c3f', '#9fd0c8'], max: 31, acc: 8.5, w: 2 },
  { name: 'Daewoo Damas',     kind: 'van',   len: 3.40, wid: 1.50, colors: ['#f7f7f5'], max: 27, acc: 7.5, w: 4 },
  { name: 'Chevrolet Labo',   kind: 'pickup',len: 3.50, wid: 1.50, colors: ['#f7f7f5', '#cfe0ee'], max: 26, acc: 7, w: 1 },
  { name: 'Chevrolet Captiva',kind: 'suv',   len: 4.67, wid: 1.85, colors: ['#101216', '#f5f5f3'], max: 41, acc: 12.5, w: 1 },
  { name: 'Chevrolet Malibu', kind: 'sedan', len: 4.92, wid: 1.85, colors: ['#0d0f12', '#f5f5f3'], max: 45, acc: 13.5, w: 1 },
];

export function pickModel() {
  const total = MODELS.reduce((s, m) => s + m.w, 0);
  let r = Math.random() * total;
  for (const m of MODELS) { r -= m.w; if (r <= 0) return m; }
  return MODELS[0];
}

function addWheels(g, model, wr) {
  const wheels = [], front = [];
  const geo = new THREE.CylinderGeometry(wr, wr, 0.24, 10);
  geo.rotateZ(Math.PI / 2);
  const xs = model.wid / 2 - 0.1;
  const zs = model.len / 2 - model.len * 0.19;
  for (const [x, z] of [[-xs, zs], [xs, zs], [-xs, -zs], [xs, -zs]]) {
    const w = new THREE.Mesh(geo, tyreMat);
    w.rotation.order = 'YXZ';
    w.position.set(x, wr, z);
    g.add(w); wheels.push(w);
    if (z > 0) front.push(w);
  }
  return { wheels, front };
}

export function makeVehicle(model, color) {
  const g = new THREE.Group();
  const col = color || pick(model.colors);
  const bodyMat = new THREE.MeshLambertMaterial({ color: col });
  const L = model.len, W = model.wid;
  const wr = model.kind === 'suv' ? 0.38 : 0.33;

  const box = (mat, w, h, d, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); g.add(m); return m;
  };

  if (model.kind === 'van') {
    box(bodyMat, W, 1.35, L, 0, 0.92, 0);
    box(glassMat, W + 0.04, 0.44, L * 0.7, 0, 1.42, 0.08);
    box(bodyMat, W * 0.96, 0.14, L * 0.98, 0, 1.72, 0);
  } else if (model.kind === 'pickup') {
    box(bodyMat, W, 0.5, L, 0, 0.5, 0);
    box(bodyMat, W, 0.62, L * 0.4, 0, 1.05, L * 0.24);
    box(glassMat, W + 0.03, 0.36, L * 0.26, 0, 1.12, L * 0.26);
    box(bodyMat, W, 0.3, L * 0.48, 0, 0.9, -L * 0.24);
  } else if (model.kind === 'suv') {
    box(bodyMat, W, 0.75, L, 0, 0.68, 0);
    box(glassMat, W * 0.9, 0.5, L * 0.56, 0, 1.28, -L * 0.04);
    box(bodyMat, W * 0.88, 0.07, L * 0.5, 0, 1.56, -L * 0.04);
  } else if (model.kind === 'hatch') {
    box(bodyMat, W, 0.5, L, 0, 0.5, 0);
    box(glassMat, W * 0.9, 0.5, L * 0.56, 0, 0.99, -L * 0.08);
    box(bodyMat, W * 0.86, 0.06, L * 0.5, 0, 1.26, -L * 0.08);
  } else { // sedan
    box(bodyMat, W, 0.52, L, 0, 0.51, 0);
    box(glassMat, W * 0.88, 0.46, L * 0.46, 0, 0.98, -L * 0.03);
    box(bodyMat, W * 0.86, 0.06, L * 0.42, 0, 1.23, -L * 0.03);
  }

  // Faralar va stoplar
  box(headMat, 0.3, 0.12, 0.05, -W / 2 + 0.28, 0.62, L / 2 + 0.01);
  box(headMat, 0.3, 0.12, 0.05, W / 2 - 0.28, 0.62, L / 2 + 0.01);
  box(tailMat, 0.3, 0.1, 0.05, -W / 2 + 0.28, 0.62, -L / 2 - 0.01);
  box(tailMat, 0.3, 0.1, 0.05, W / 2 - 0.28, 0.62, -L / 2 - 0.01);

  // Davlat raqami: 01 — Toshkent
  const plate = randomPlate();
  const pt = plateTex(plate);
  const pGeo = new THREE.PlaneGeometry(0.5, 0.125);
  const pmF = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ map: pt }));
  pmF.position.set(0, 0.4, L / 2 + 0.02); g.add(pmF);
  const pmB = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ map: pt }));
  pmB.position.set(0, 0.4, -L / 2 - 0.02); pmB.rotation.y = Math.PI; g.add(pmB);

  const { wheels, front } = addWheels(g, model, wr);

  const sh = blobShadow(L * 1.15);
  sh.scale.x = (W * 1.7) / (L * 1.15);
  g.add(sh);

  return {
    mesh: g, spec: model, kind: 'car', plate,
    heading: 0, speed: 0, vel: new THREE.Vector3(),
    driver: null, isPolice: false, rider: null,
    radius: L * 0.32, wheels, frontWheels: front, lights: null, sinking: false,
  };
}

export function makeMoto() {
  const spec = {
    name: pick(['Moped "Karakum"', 'Skuter "Bars"', 'Moto "Jasur"']),
    kind: 'moto', len: 2.05, wid: 0.75, max: 34, acc: 11,
  };
  const g = new THREE.Group();
  const col = pick(['#c62828', '#1565c0', '#f9a825', '#2e7d32', '#37474f']);
  const mat = new THREE.MeshLambertMaterial({ color: col });
  const box = (m, w, h, d, x, y, z) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    b.position.set(x, y, z); g.add(b); return b;
  };
  box(mat, 0.28, 0.26, 1.15, 0, 0.62, 0);
  box(mat, 0.34, 0.1, 0.55, 0, 0.8, -0.32);           // o'rindiq
  box(mat, 0.3, 0.35, 0.35, 0, 0.75, 0.55);           // old qism
  box(barMat, 0.6, 0.06, 0.06, 0, 1.0, 0.62);          // rul
  box(barMat, 0.08, 0.5, 0.08, 0, 0.55, 0.78);         // vilka
  box(headMat, 0.14, 0.12, 0.05, 0, 0.85, 0.76);

  const wheels = [];
  const wgeo = new THREE.CylinderGeometry(0.31, 0.31, 0.1, 10);
  wgeo.rotateZ(Math.PI / 2);
  for (const z of [0.78, -0.72]) {
    const w = new THREE.Mesh(wgeo, tyreMat);
    w.rotation.order = 'YXZ';
    w.position.set(0, 0.31, z);
    g.add(w); wheels.push(w);
  }
  const sh = blobShadow(2.2); sh.scale.x = 0.5; g.add(sh);

  return {
    mesh: g, spec, kind: 'moto', plate: randomPlate(),
    heading: 0, speed: 0, vel: new THREE.Vector3(),
    driver: null, isPolice: false, rider: null,
    radius: 0.85, wheels, frontWheels: [wheels[0]], lights: null, sinking: false,
  };
}

function addLightbar(veh, y) {
  const g = veh.mesh;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.09, 0.32), barMat);
  base.position.set(0, y, -veh.spec.len * 0.03); g.add(base);
  const r = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.28), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
  r.position.set(-0.22, y + 0.1, -veh.spec.len * 0.03); g.add(r);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.28), new THREE.MeshBasicMaterial({ color: 0x2a6cff }));
  b.position.set(0.22, y + 0.1, -veh.spec.len * 0.03); g.add(b);
  veh.lights = { r, b };
}

function addSideDecals(veh, tex, w, h, y) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
  const W = veh.spec.wid;
  const right = new THREE.Mesh(geo, mat);
  right.position.set(W / 2 + 0.02, y, 0); right.rotation.y = Math.PI / 2;
  veh.mesh.add(right);
  const left = new THREE.Mesh(geo, mat);
  left.position.set(-W / 2 - 0.02, y, 0); left.rotation.y = -Math.PI / 2;
  veh.mesh.add(left);
}

export function makePoliceCar() {
  const spec = { name: 'Politsiya — Cobalt', kind: 'sedan', len: 4.48, wid: 1.74, colors: ['#f5f5f3'], max: 42, acc: 13, w: 0 };
  const veh = makeVehicle(spec, '#f5f5f3');
  addSideDecals(veh, sideDecalTex('POLITSIYA', '#157a3b', '#ffffff'), 2.8, 0.5, 0.55);
  addLightbar(veh, 1.3);
  veh.isPolice = true;
  return veh;
}

export function makeAmbulance() {
  const spec = { name: 'Tez yordam — Damas', kind: 'van', len: 3.4, wid: 1.5, colors: ['#f7f7f5'], max: 30, acc: 8, w: 0 };
  const veh = makeVehicle(spec, '#f7f7f5');
  addSideDecals(veh, sideDecalTex('TEZ YORDAM 103', '#c62f2f', '#ffffff'), 2.4, 0.44, 0.8);
  addLightbar(veh, 1.82);
  return veh;
}
