import * as THREE from 'three';
import { rand, pick, canvasTexture, phraseSprite, blobShadow, angleLerp } from './utils.js';
import { SIDEWALK_OFF, isOnLand } from './config.js';
import { randomNode, nextNode } from './network.js';

const SKINS = ['#e8b98f', '#d9a06b', '#c98a5a', '#f0c9a2'];
const SHIRTS = ['#e8e6e0', '#7fa8d9', '#c9d97f', '#d97f7f', '#8fd9c9', '#e0c98f', '#b09fd0'];
const PANTS = ['#2b2f38', '#3d4450', '#4a3b30', '#26333d'];
const SCARFS = ['#d94f6b', '#f2b705', '#7fb2d9', '#e37c3f', '#ffffff'];

export const PHRASES = [
  "Hoy, ko'zingga qara!",
  'Voy-bo\'y!',
  'Nima qilyapsan, uka?!',
  "YPXga qo'ng'iroq qilaman!",
  "Ehtiyot bo'l!",
  'Jinni bo\'ldingmi?!',
  'Astag\'firulloh!',
];

// Atlas (ikat) matosi — ayollar ko'ylagi uchun
const _atlasCache = [];
function atlasTex() {
  if (_atlasCache.length < 4) {
    const cols = pick([
      ['#e63946', '#f1c40f', '#2980ff', '#27ae60'],
      ['#8e44ad', '#f1c40f', '#e63946', '#00c2c7'],
      ['#ff7f50', '#2980ff', '#f1c40f', '#e63946'],
      ['#00c2c7', '#e63946', '#f5f0e6', '#2980ff'],
    ]);
    const t = canvasTexture(64, 64, (g) => {
      for (let i = 0; i < 8; i++) {
        g.fillStyle = cols[i % cols.length];
        g.beginPath();
        const x = i * 8;
        g.moveTo(x, 0);
        for (let y = 0; y <= 64; y += 8) g.lineTo(x + (y % 16 === 0 ? 4 : -2), y);
        g.lineTo(x + 12, 64);
        for (let y = 64; y >= 0; y -= 8) g.lineTo(x + 12 + (y % 16 === 0 ? 4 : -2), y);
        g.closePath(); g.fill();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    _atlasCache.push(t);
  }
  return pick(_atlasCache);
}

let _chapanTex = null;
function chapanTex() {
  if (!_chapanTex) {
    _chapanTex = canvasTexture(64, 64, (g) => {
      g.fillStyle = '#232a4d'; g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#3d4a7a';
      for (let x = 0; x < 64; x += 10) g.fillRect(x, 0, 4, 64);
      g.fillStyle = '#c9a227'; g.fillRect(29, 0, 3, 64);
    });
  }
  return _chapanTex;
}

function limb(w, h, d, mat) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, -h / 2, 0);
  return new THREE.Mesh(geo, mat);
}

// style: 'erkak' | 'chapan' | 'ayol' | 'militsioner' | 'shifokor' | 'player'
export function makeHuman(style) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: pick(SKINS) });
  let topMat, legMat, hat = null;

  if (style === 'militsioner') {
    topMat = new THREE.MeshLambertMaterial({ color: 0x2f6b3f });
    legMat = new THREE.MeshLambertMaterial({ color: 0x275633 });
  } else if (style === 'shifokor') {
    topMat = new THREE.MeshLambertMaterial({ color: 0xf2f2f0 });
    legMat = new THREE.MeshLambertMaterial({ color: 0xd8d8d4 });
  } else if (style === 'player') {
    topMat = new THREE.MeshLambertMaterial({ color: 0xf0efe8 });
    legMat = new THREE.MeshLambertMaterial({ color: 0x22252c });
  } else if (style === 'ayol') {
    topMat = new THREE.MeshLambertMaterial({ map: atlasTex() });
    legMat = new THREE.MeshLambertMaterial({ color: 0x3a3126 });
  } else if (style === 'chapan') {
    topMat = new THREE.MeshLambertMaterial({ map: chapanTex() });
    legMat = new THREE.MeshLambertMaterial({ color: 0x2b2620 });
  } else {
    topMat = new THREE.MeshLambertMaterial({ color: pick(SHIRTS) });
    legMat = new THREE.MeshLambertMaterial({ color: pick(PANTS) });
  }

  const lLeg = limb(0.15, 0.75, 0.15, legMat); lLeg.position.set(-0.11, 0.75, 0); g.add(lLeg);
  const rLeg = limb(0.15, 0.75, 0.15, legMat); rLeg.position.set(0.11, 0.75, 0); g.add(rLeg);

  if (style === 'ayol') {
    const dress = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.36, 1.0, 7), topMat);
    dress.position.y = 0.85; g.add(dress);
  } else {
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.24), topMat);
    torso.position.y = 1.02; g.add(torso);
    if (style === 'chapan') {
      const robe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), topMat);
      robe.position.y = 0.88; g.add(robe);
    }
  }

  const lArm = limb(0.11, 0.62, 0.11, style === 'ayol' ? topMat : topMat);
  lArm.position.set(-0.28, 1.28, 0); g.add(lArm);
  const rArm = limb(0.11, 0.62, 0.11, topMat);
  rArm.position.set(0.28, 1.28, 0); g.add(rArm);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.27, 0.24), skin);
  head.position.y = 1.46; g.add(head);

  if (style === 'chapan' || (style !== 'ayol' && style !== 'militsioner' && style !== 'shifokor' && (style === 'player' || Math.random() < 0.45))) {
    // Do'ppi
    hat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.22), new THREE.MeshLambertMaterial({ color: 0x14151a }));
    hat.position.y = 1.63; g.add(hat);
  } else if (style === 'ayol' && Math.random() < 0.6) {
    // Ro'mol
    const scarf = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshLambertMaterial({ color: pick(SCARFS) }));
    scarf.position.set(0, 1.5, -0.02); g.add(scarf);
  } else if (style === 'militsioner') {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.26), new THREE.MeshLambertMaterial({ color: 0x275633 }));
    cap.position.y = 1.64; g.add(cap);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.12), new THREE.MeshLambertMaterial({ color: 0x1b3d24 }));
    brim.position.set(0, 1.6, 0.16); g.add(brim);
  }

  g.add(blobShadow(1.1));
  return { group: g, parts: { lLeg, rLeg, lArm, rArm, head } };
}

export function animHuman(parts, phase, amp) {
  const s = Math.sin(phase) * amp;
  parts.lLeg.rotation.x = s;
  parts.rLeg.rotation.x = -s;
  parts.lArm.rotation.x = -s * 0.8;
  parts.rArm.rotation.x = s * 0.8;
}

export function makeSeatedRider(style) {
  const { group, parts } = makeHuman(style || pick(['erkak', 'erkak', 'chapan']));
  parts.lLeg.rotation.x = -1.35;
  parts.rLeg.rotation.x = -1.35;
  parts.lArm.rotation.x = -0.75;
  parts.rArm.rotation.x = -0.75;
  group.scale.setScalar(0.95);
  return group;
}

class Ped {
  constructor(scene, net, style, opts = {}) {
    const { group, parts } = makeHuman(style);
    this.group = group; this.parts = parts;
    this.style = style; this.net = net;
    this.scene = scene;
    this.phase = rand(0, 6);
    this.sprite = null; this.spriteT = 0;
    if (opts.static) {
      this.state = 'idle';
      group.position.set(opts.static.x, 0, opts.static.z);
      group.rotation.y = opts.static.rot || 0;
    } else {
      this.state = 'walk';
      this.resetPath();
      group.position.set(this.ix(), 0, this.iz());
    }
    scene.add(group);
  }

  resetPath() {
    this.from = randomNode(this.net);
    this.to = nextNode(this.from, null);
    this.calcEdge();
    this.t = rand(4, Math.max(5, this.len - 4));
    this.speed = rand(1.1, 1.7);
  }

  calcEdge() {
    const dx = this.to.x - this.from.x, dz = this.to.z - this.from.z;
    this.len = Math.hypot(dx, dz);
    this.dirx = dx / this.len; this.dirz = dz / this.len;
    this.rx = -this.dirz; this.rz = this.dirx;
  }

  ix() { return this.from.x + this.dirx * this.t + this.rx * SIDEWALK_OFF; }
  iz() { return this.from.z + this.dirz * this.t + this.rz * SIDEWALK_OFF; }

  say(text) {
    if (this.sprite) this.group.remove(this.sprite);
    this.sprite = phraseSprite(text);
    this.sprite.position.y = 2.15;
    this.spriteT = 2.4;
    this.group.add(this.sprite);
  }

  knock(dir) {
    if (this.state === 'down') return;
    this.state = 'down';
    this.downT = 0;
    this.group.rotation.y = Math.atan2(dir.x, dir.z);
    this.group.rotation.x = -Math.PI / 2;
    this.group.position.y = 0.3;
  }

  respawn() {
    this.group.rotation.set(0, 0, 0);
    this.group.position.y = 0;
    this.state = 'walk';
    this.resetPath();
    this.group.position.set(this.ix(), 0, this.iz());
  }

  update(dt, playerPos, playerSpeed) {
    if (this.sprite) {
      this.spriteT -= dt;
      if (this.spriteT <= 0) { this.group.remove(this.sprite); this.sprite = null; }
      else this.sprite.material.opacity = Math.min(1, this.spriteT / 0.5);
    }
    if (this.state === 'idle') {
      this.phase += dt;
      this.parts.lArm.rotation.x = Math.sin(this.phase * 0.8) * 0.06;
      this.parts.rArm.rotation.x = -Math.sin(this.phase * 0.8) * 0.06;
      return;
    }
    if (this.state === 'down') {
      this.downT += dt;
      if (this.downT > 16) {
        this.group.position.y -= dt * 0.5;
        if (this.group.position.y < -2.2) this.respawn();
      }
      return;
    }

    const p = this.group.position;

    // Vahima: tez mashina yaqin kelsa qochadi
    if (this.state !== 'panic' && playerPos && Math.abs(playerSpeed) > 9) {
      const d = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
      if (d < 7) {
        this.state = 'panic';
        this.panicT = 2.5;
        const inv = 1 / Math.max(0.001, d);
        this.pdx = (p.x - playerPos.x) * inv;
        this.pdz = (p.z - playerPos.z) * inv;
        if (Math.random() < 0.4) this.say(pick(PHRASES));
      }
    }

    if (this.state === 'panic') {
      this.panicT -= dt;
      const nx = p.x + this.pdx * 4.2 * dt;
      const nz = p.z + this.pdz * 4.2 * dt;
      if (isOnLand(nx, nz)) { p.x = nx; p.z = nz; }
      this.group.rotation.y = Math.atan2(this.pdx, this.pdz);
      this.phase += dt * 9;
      animHuman(this.parts, this.phase, 0.9);
      if (this.panicT <= 0) this.state = 'walk';
      return;
    }

    this.t += this.speed * dt;
    if (this.t >= this.len) {
      const prev = this.to;
      this.to = nextNode(this.to, this.from);
      this.from = prev;
      this.calcEdge();
      this.t = 0;
    }
    const k = 1 - Math.exp(-2.5 * dt);
    const tx = this.ix(), tz = this.iz();
    p.x += (tx - p.x) * k;
    p.z += (tz - p.z) * k;
    this.group.rotation.y = angleLerp(this.group.rotation.y, Math.atan2(this.dirx, this.dirz), 1 - Math.exp(-5 * dt));
    this.phase += this.speed * dt * 3.4;
    animHuman(this.parts, this.phase, 0.55);
  }
}

export class PedManager {
  constructor(scene, net, count) {
    this.scene = scene; this.net = net;
    this.list = [];
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const style = r < 0.34 ? 'ayol' : r < 0.72 ? 'erkak' : r < 0.88 ? 'chapan' : 'erkak';
      this.list.push(new Ped(scene, net, style));
    }
  }

  addStatic(style, x, z, rot) {
    const p = new Ped(this.scene, this.net, style, { static: { x, z, rot } });
    this.list.push(p);
    return p;
  }

  update(dt, playerPos, playerSpeed) {
    for (const p of this.list) p.update(dt, playerPos, playerSpeed);
  }

  // Mashina piyodani urib yubordimi?
  tryHit(carPos, carVel) {
    const sp = carVel.length();
    if (sp < 4) return [];
    const hits = [];
    for (const p of this.list) {
      if (p.state === 'down') continue;
      const dx = p.group.position.x - carPos.x;
      const dz = p.group.position.z - carPos.z;
      if (dx * dx + dz * dz < 2.6) {
        const d = Math.max(0.001, Math.hypot(dx, dz));
        p.knock({ x: dx / d, z: dz / d });
        hits.push(p.style);
      }
    }
    return hits;
  }

  honkAt(pos) {
    let said = 0;
    for (const p of this.list) {
      if (said >= 2 || p.state !== 'walk') continue;
      const d = Math.hypot(p.group.position.x - pos.x, p.group.position.z - pos.z);
      if (d < 10 && Math.random() < 0.45) { p.say(pick(PHRASES)); said++; }
    }
  }
}
