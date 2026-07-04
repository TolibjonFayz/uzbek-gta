import * as THREE from 'three';
import { rand, pick, canvasTexture, mergeGeoms } from './utils.js';
import { H_ROADS, WEST_V, EAST_V, BRIDGE_Z, ROAD_W, ISLANDS, BEACH, RESERVED } from './config.js';

const PASTELS = ['#f3c6d3', '#f7e3b0', '#bfe3dd', '#cbd6f2', '#f2cdb6', '#e8f2c8', '#d9c8f0', '#f5f0e6', '#dfe8ee', '#f0b8c4'];
const SIGNS = [
  'OSHXONA MILLIY TAOMLAR', 'SOMSA TANDIR', 'NON ISSIQ', "DO'KON 24/7", 'APTEKA',
  'SARTAROSHXONA', 'AVTOMOYKA', "GO'SHT DO'KONI", 'QURILISH MOLLARI', 'AVIAKASSA',
  'MOBIL ALOQA', 'SUPERMARKET MAKON', 'KAFE RAYHON', 'BILLIARD', 'AVTOTURARGOH',
  "TO'YXONA VISOL", 'MEBEL SALONI', 'MEHMONXONA SHARQ', 'CHOYXONA GULISTON', 'ATELYE',
];
const SIGN_BG = ['#20304a', '#7a1f35', '#1d5c4a', '#8a4a12', '#3a2a5c', '#134a66'];

function signTex(text, bg) {
  return canvasTexture(512, 80, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, 512, 80);
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 4; g.strokeRect(4, 4, 504, 72);
    g.fillStyle = '#ffe9a8';
    let size = 40;
    do { g.font = `bold ${size}px Arial`; size -= 2; } while (g.measureText(text).width > 480 && size > 12);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, 256, 42);
  });
}

let _winTex = null;
function windowTex() {
  if (!_winTex) {
    _winTex = canvasTexture(64, 64, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
      for (let y = 6; y < 64; y += 22) {
        for (let x = 6; x < 64; x += 16) {
          g.fillStyle = Math.random() < 0.22 ? '#ffd97a' : '#2e3648';
          g.fillRect(x, y, 9, 13);
        }
      }
    });
    _winTex.wrapS = _winTex.wrapT = THREE.RepeatWrapping;
  }
  return _winTex;
}

let _roadTex = null;
function roadTex() {
  if (!_roadTex) {
    _roadTex = canvasTexture(64, 256, (g) => {
      g.fillStyle = '#33363b'; g.fillRect(0, 0, 64, 256);
      g.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < 140; i++) g.fillRect(Math.random() * 64, Math.random() * 256, 2, 2);
      g.fillStyle = 'rgba(232,233,236,0.55)';
      g.fillRect(3, 0, 2, 256); g.fillRect(59, 0, 2, 256);
      g.fillStyle = '#e8e9ec';
      for (let y = 0; y < 256; y += 64) g.fillRect(30, y, 4, 34);
    });
    _roadTex.wrapS = _roadTex.wrapT = THREE.RepeatWrapping;
    _roadTex.anisotropy = 8;
  }
  return _roadTex;
}

function makeRoad(scene, cx, cz, len, horizontal, y) {
  const tex = roadTex().clone();
  tex.needsUpdate = true;
  tex.anisotropy = 8;
  tex.repeat.set(1, len / 22);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, len),
    new THREE.MeshLambertMaterial({ map: tex })
  );
  m.rotation.set(-Math.PI / 2, 0, horizontal ? Math.PI / 2 : 0);
  m.position.set(cx, y, cz);
  scene.add(m);
}

function buildSky(scene) {
  const tex = canvasTexture(4, 512, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, '#2a2f6e');
    gr.addColorStop(0.45, '#7a4f9e');
    gr.addColorStop(0.62, '#d76aa0');
    gr.addColorStop(0.78, '#f2955f');
    gr.addColorStop(1, '#f7c66b');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 512);
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 20, 14),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
  );
  scene.add(sky);

  // Quyosh — g'arbda botayotgan katta shar
  const sunTex = canvasTexture(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 8, 64, 64, 62);
    r.addColorStop(0, 'rgba(255,236,190,1)');
    r.addColorStop(0.35, 'rgba(255,178,105,0.95)');
    r.addColorStop(1, 'rgba(255,140,90,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  });
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }));
  sun.position.set(-1500, 160, 300);
  sun.scale.set(520, 520, 1);
  scene.add(sun);
}

function buildSea(scene) {
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(4200, 4200),
    new THREE.MeshPhongMaterial({ color: 0x17546f, shininess: 90, specular: 0xffb08a })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.4;
  scene.add(sea);

  // Plyaj chetidagi oq ko'pik chizig'i
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 1640),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 })
  );
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(748, -0.32, 0);
  scene.add(foam);
}

function slab(scene, x1, x2, z1, z2, color, topY) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(x2 - x1, 1, z2 - z1),
    new THREE.MeshLambertMaterial({ color })
  );
  m.position.set((x1 + x2) / 2, topY - 0.5, (z1 + z2) / 2);
  scene.add(m);
}

function buildPalms(scene) {
  const positions = [];
  for (let z = -800; z <= 800; z += 42) positions.push([666, z]);
  for (let z = -774; z <= 800; z += 60) positions.push([624, z]);
  for (let i = 0; i < 8; i++) positions.push([380 + rand(-40, 40), 300 + rand(-40, 40)]);
  for (let i = 0; i < 8; i++) positions.push([-600 + rand(-40, 40), 600 + rand(-40, 40)]);
  for (let i = 0; i < 12; i++) {
    const vs = pick([WEST_V, EAST_V]);
    positions.push([pick(vs) + pick([-9.5, 9.5]), pick(H_ROADS) + pick([-9.5, 9.5])]);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.3, 7, 6);
  trunkGeo.translate(0, 3.5, 0);
  const fronds = [];
  for (let i = 0; i < 6; i++) {
    const f = new THREE.PlaneGeometry(0.95, 3.4);
    f.translate(0, 1.7, 0);
    f.rotateX(1.75);
    f.rotateY((i / 6) * Math.PI * 2);
    fronds.push(f);
  }
  const canopyGeo = mergeGeoms(fronds);
  canopyGeo.translate(0, 7, 0);

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e8b4f, side: THREE.DoubleSide });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, positions.length);
  const canopies = new THREE.InstancedMesh(canopyGeo, frondMat, positions.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  positions.forEach(([x, z], i) => {
    const s = rand(0.8, 1.25);
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand(0, Math.PI * 2));
    m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s, s));
    trunks.setMatrixAt(i, m4);
    canopies.setMatrixAt(i, m4);
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  scene.add(trunks); scene.add(canopies);
}

function buildBeachProps(scene) {
  for (let i = 0; i < 12; i++) {
    const x = rand(682, 736), z = rand(-780, 780);
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 5), new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }));
    pole.position.y = 1.1; g.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.8, 8), new THREE.MeshLambertMaterial({ color: pick(['#e63946', '#f1c40f', '#2980ff', '#00c2c7', '#ff7f50']), side: THREE.DoubleSide }));
    top.position.y = 2.3; g.add(top);
    g.position.set(x, 0, z);
    scene.add(g);
  }
  // Uzoqdagi qayiqlar
  for (const [x, z] of [[920, -220], [980, 340]]) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 6.5), new THREE.MeshLambertMaterial({ color: 0xf0ede6 }));
    hull.position.y = 0.2; b.add(hull);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1, 2.2), new THREE.MeshLambertMaterial({ color: 0x3a6f8f }));
    cab.position.set(0, 1.2, -0.8); b.add(cab);
    b.position.set(x, 0, z);
    b.rotation.y = rand(0, Math.PI);
    scene.add(b);
  }
}

function buildBlocks(scene, colliders) {
  const winBase = windowTex();
  let neonDone = false;
  for (const vs of [WEST_V, EAST_V]) {
    const east = vs === EAST_V;
    for (let i = 0; i < vs.length - 1; i++) {
      for (let j = 0; j < H_ROADS.length - 1; j++) {
        const c = { x1: vs[i] + 11, x2: vs[i + 1] - 11, z1: H_ROADS[j] + 11, z2: H_ROADS[j + 1] - 11 };
        const mx = (c.x1 + c.x2) / 2, mz = (c.z1 + c.z2) / 2;
        const lots = [
          { x1: c.x1, x2: mx - 3, z1: c.z1, z2: mz - 3 },
          { x1: mx + 3, x2: c.x2, z1: c.z1, z2: mz - 3 },
          { x1: c.x1, x2: mx - 3, z1: mz + 3, z2: c.z2 },
          { x1: mx + 3, x2: c.x2, z1: mz + 3, z2: c.z2 },
        ];
        for (const lot of lots) {
          const cx = (lot.x1 + lot.x2) / 2, cz = (lot.z1 + lot.z2) / 2;
          if (RESERVED.some((r) => Math.hypot(r.x - cx, r.z - cz) < 75)) continue;

          const w = rand(18, Math.min(34, lot.x2 - lot.x1));
          const d = rand(18, Math.min(34, lot.z2 - lot.z1));
          const bx = rand(lot.x1 + w / 2, lot.x2 - w / 2);
          const bz = rand(lot.z1 + d / 2, lot.z2 - d / 2);
          const h = east ? rand(9, 22) : rand(14, 34) + (Math.abs(cz) < 300 ? rand(0, 26) : 0);
          const color = pick(PASTELS);
          const tex = winBase.clone();
          tex.needsUpdate = true;
          tex.repeat.set(Math.max(2, w / 4), Math.max(2, h / 3.4));
          const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(w, h, d),
            new THREE.MeshLambertMaterial({ color, map: tex })
          );
          mesh.position.set(bx, h / 2, bz);
          scene.add(mesh);
          colliders.push({ x1: bx - w / 2, x2: bx + w / 2, z1: bz - d / 2, z2: bz + d / 2 });

          // Peshtaxta (vyveska)
          if (h < 26 && Math.random() < 0.5) {
            const faceRight = (bx - c.x1) > (c.x2 - bx);
            const sw = Math.min(w * 0.85, 14);
            const sign = new THREE.Mesh(
              new THREE.PlaneGeometry(sw, sw * 0.16),
              new THREE.MeshBasicMaterial({ map: signTex(pick(SIGNS), pick(SIGN_BG)) })
            );
            sign.position.set(bx + (faceRight ? w / 2 + 0.2 : -w / 2 - 0.2), Math.min(h - 2, rand(4, 8)), bz);
            sign.rotation.y = faceRight ? Math.PI / 2 : -Math.PI / 2;
            scene.add(sign);
          }

          // Bitta katta neon mehmonxona — Okean bo'yida
          if (!neonDone && east && vs[i + 1] === 610 && h >= 17) {
            neonDone = true;
            const roof = new THREE.Mesh(
              new THREE.PlaneGeometry(Math.min(w, 22), 3.2),
              new THREE.MeshBasicMaterial({ map: signTex('MEHMONXONA BUXORO', '#8a1650'), side: THREE.DoubleSide })
            );
            roof.position.set(bx, h + 2, bz);
            roof.rotation.y = Math.PI / 2;
            scene.add(roof);
          }
        }
      }
    }
  }
}

function buildParks(scene) {
  for (const [x, z] of [[380, 300], [-600, 600]]) {
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(58, 24),
      new THREE.MeshLambertMaterial({ color: 0x5f9b5f })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.set(x, 0.05, z);
    scene.add(g);
  }
}

function buildChorsu(scene, colliders) {
  const cx = -600, cz = -320;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(20, 21, 8, 16), new THREE.MeshLambertMaterial({ color: 0xd9c9a8 }));
  drum.position.set(cx, 4, cz); scene.add(drum);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(20, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: 0x2e9aa8 })
  );
  dome.position.set(cx, 8, cz); scene.add(dome);
  const entry = new THREE.Mesh(new THREE.BoxGeometry(12, 7, 5), new THREE.MeshLambertMaterial({ color: 0xc9b891 }));
  entry.position.set(cx, 3.5, cz + 22); scene.add(entry);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 1.9),
    new THREE.MeshBasicMaterial({ map: signTex('CHORSU BOZORI', '#1d5c4a') })
  );
  sign.position.set(cx, 5.8, cz + 24.6); scene.add(sign);
  colliders.push({ x1: cx - 21, x2: cx + 21, z1: cz - 21, z2: cz + 25 });

  // Rasta-do'konchalar
  for (let i = 0; i < 4; i++) {
    const sx = cx + pick([-32, 32]), sz = cz + rand(-20, 20);
    const stall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2, 2.6), new THREE.MeshLambertMaterial({ color: pick(['#b6552f', '#8f6f3f', '#5f7f4f']) }));
    stall.position.set(sx, 1, sz); scene.add(stall);
    const awn = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1, 4), new THREE.MeshLambertMaterial({ color: pick(['#e63946', '#f1c40f', '#2980ff']) }));
    awn.position.set(sx, 2.5, sz); awn.rotation.y = Math.PI / 4; scene.add(awn);
    colliders.push({ x1: sx - 1.3, x2: sx + 1.3, z1: sz - 1.3, z2: sz + 1.3 });
  }
}

function buildChoyxona(scene, colliders) {
  const cx = -390, cz = -60;
  const base = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 12), new THREE.MeshLambertMaterial({ color: 0xc9ad7f }));
  base.position.set(cx, 0.25, cz); scene.add(base);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.35, 13), new THREE.MeshLambertMaterial({ color: 0x6b3a2a }));
  roof.position.set(cx, 3.4, cz); scene.add(roof);
  for (const [dx, dz] of [[-7.5, -5.3], [7.5, -5.3], [-7.5, 5.3], [7.5, 5.3]]) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3, 0.35), new THREE.MeshLambertMaterial({ color: 0x4a2f1f }));
    col.position.set(cx + dx, 1.75, cz + dz); scene.add(col);
  }
  for (const dx of [-4.5, 0, 4.5]) {
    const tap = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.55, 2.5), new THREE.MeshLambertMaterial({ color: 0x8f2f3f }));
    tap.position.set(cx + dx, 0.78, cz); scene.add(tap);
  }
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 1.5),
    new THREE.MeshBasicMaterial({ map: signTex("CHOYXONA NAVRO'Z", '#7a1f35') })
  );
  sign.position.set(cx, 4.2, cz + 6.6); scene.add(sign);
  colliders.push({ x1: cx - 8.5, x2: cx + 8.5, z1: cz - 6.5, z2: cz + 6.5 });
}

export function buildWorld(scene) {
  const colliders = [];

  buildSky(scene);
  buildSea(scene);

  // Orollar va plyaj
  slab(scene, ISLANDS[0].x1, ISLANDS[0].x2, ISLANDS[0].z1, ISLANDS[0].z2, 0x8f959b, 0);
  slab(scene, ISLANDS[1].x1, ISLANDS[1].x2, ISLANDS[1].z1, ISLANDS[1].z2, 0x8f959b, 0);
  slab(scene, BEACH.x1, BEACH.x2, BEACH.z1, BEACH.z2, 0xddc088, -0.05);

  // Yo'llar
  for (const x of WEST_V) makeRoad(scene, x, 0, 1520, false, 0.02);
  for (const x of EAST_V) makeRoad(scene, x, 0, 1520, false, 0.02);
  for (const z of H_ROADS) {
    makeRoad(scene, -495, z, 430, true, 0.045);
    makeRoad(scene, 455, z, 330, true, 0.045);
  }

  // Ko'priklar
  for (const bz of BRIDGE_Z) {
    makeRoad(scene, 5, bz, 594, true, 0.045);
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(594, 1, 0.3), new THREE.MeshLambertMaterial({ color: 0xc8ccd2 }));
      rail.position.set(5, 0.55, bz + side * 7.2);
      scene.add(rail);
      colliders.push({ x1: -292, x2: 302, z1: bz + side * 7.2 - 0.2, z2: bz + side * 7.2 + 0.2 });
    }
    for (const px of [-160, -20, 120]) {
      const py = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 16), new THREE.MeshLambertMaterial({ color: 0x707880 }));
      py.position.set(px, -2.4, bz);
      scene.add(py);
    }
  }

  buildBlocks(scene, colliders);
  buildParks(scene);
  buildChorsu(scene, colliders);
  buildChoyxona(scene, colliders);
  buildPalms(scene);
  buildBeachProps(scene);

  return { colliders };
}
