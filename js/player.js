import * as THREE from 'three';
import { clamp, normAngle } from './utils.js';
import { pushOut, isOnLand } from './physics.js';
import { makeHuman, animHuman } from './peds.js';
import { nearestNode } from './network.js';

const _fwd = new THREE.Vector3();
const _tmp = new THREE.Vector3();

export class Player {
  constructor(scene, net, registry, hud, audio) {
    this.scene = scene; this.net = net;
    this.registry = registry;
    this.hud = hud; this.audio = audio;
    this.traffic = null; this.police = null; this.peds = null;

    this.mode = 'foot';
    this.vehicle = null;
    this.heading = Math.PI;
    this.walkPhase = 0;
    this.camFar = false;

    const { group, parts } = makeHuman('player');
    this.human = group; this.parts = parts;
    group.position.set(616.5, 0, 87);
    scene.add(group);

    this.keys = {};
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys[e.code] = true;
      if (e.repeat) return;
      if (e.code === 'KeyF' || e.code === 'KeyE') this.toggleEnter();
      if (e.code === 'KeyC') this.camFar = !this.camFar;
      if (e.code === 'KeyH') {
        this.audio.horn();
        if (this.peds) this.peds.honkAt(this.getPos());
      }
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
  }

  getPos() {
    return this.mode === 'car' ? this.vehicle.mesh.position : this.human.position;
  }
  currentSpeed() {
    return this.mode === 'car' ? this.vehicle.speed : 0;
  }
  currentHeading() {
    return this.mode === 'car' ? this.vehicle.heading : this.heading;
  }
  stopVehicle() {
    if (this.vehicle) { this.vehicle.vel.set(0, 0, 0); this.vehicle.speed = 0; }
  }

  toggleEnter() {
    if (this.mode === 'car') { this.exitVehicle(); return; }
    // Eng yaqin transportni topamiz
    let best = null, bd = 3.6 * 3.6;
    for (const v of this.registry) {
      if (v.sinking) continue;
      const d = (v.mesh.position.x - this.human.position.x) ** 2 + (v.mesh.position.z - this.human.position.z) ** 2;
      if (d < bd) { bd = d; best = v; }
    }
    if (!best) return;

    if (best.driver === 'ai') {
      if (best.isPolice) { this.hud.message("Bo'lmaydi, uka — ichida politsiya o'tiribdi!"); return; }
      this.traffic.steal(best);
      this.police.report('jack');
      this.hud.message("Mashinani tortib oldingiz! Haydovchi qochib ketdi...");
    } else if (best.isPolice) {
      this.police.report('police_steal');
      this.hud.message("Politsiya mashinasini o'g'irladingiz! Endi qattiq izlashadi!");
    } else {
      this.hud.message(`${best.spec.name} — chiqish uchun F`);
    }

    best.driver = 'player';
    if (best.rider) best.rider.visible = true;
    this.vehicle = best;
    this.mode = 'car';
    this.human.visible = false;
  }

  exitVehicle() {
    const v = this.vehicle;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    for (const side of [1, -1]) {
      const ex = v.mesh.position.x + (-fz) * -1.9 * side;
      const ez = v.mesh.position.z + fx * -1.9 * side;
      if (isOnLand(ex, ez)) {
        this.human.position.set(ex, 0, ez);
        pushOut(this.human.position, 0.35);
        this.human.visible = true;
        this.heading = v.heading;
        v.driver = null;
        if (v.rider) v.rider.visible = false;
        this.vehicle = null;
        this.mode = 'foot';
        return;
      }
    }
    this.hud.message('Bu yerda chiqib bo\'lmaydi!');
  }

  update(dt, camera) {
    if (this.mode === 'car') this.updateCar(dt);
    else this.updateFoot(dt);
    this.updateCamera(dt, camera);
  }

  updateFoot(dt) {
    const k = this.keys;
    const turn = ((k['KeyA'] || k['ArrowLeft']) ? 1 : 0) - ((k['KeyD'] || k['ArrowRight']) ? 1 : 0);
    this.heading += turn * 2.7 * dt;
    const run = k['ShiftLeft'] || k['ShiftRight'];
    let sp = 0;
    if (k['KeyW'] || k['ArrowUp']) sp = run ? 6.2 : 3.1;
    else if (k['KeyS'] || k['ArrowDown']) sp = -1.9;

    if (sp !== 0) {
      const nx = this.human.position.x + Math.sin(this.heading) * sp * dt;
      const nz = this.human.position.z + Math.cos(this.heading) * sp * dt;
      if (isOnLand(nx, nz)) { this.human.position.x = nx; this.human.position.z = nz; }
      pushOut(this.human.position, 0.35);
      // Mashinalarga urilib qolmaslik
      for (const v of this.registry) {
        if (v.sinking) continue;
        const dx = this.human.position.x - v.mesh.position.x;
        const dz = this.human.position.z - v.mesh.position.z;
        const r = 0.4 + v.radius;
        const d = Math.hypot(dx, dz);
        if (d < r && d > 0.001) {
          this.human.position.x = v.mesh.position.x + (dx / d) * r;
          this.human.position.z = v.mesh.position.z + (dz / d) * r;
        }
      }
      this.walkPhase += sp * dt * 3.2;
      animHuman(this.parts, this.walkPhase, run ? 0.85 : 0.55);
    } else {
      animHuman(this.parts, this.walkPhase, 0.08);
    }
    this.human.rotation.y = this.heading;
  }

  updateCar(dt) {
    const v = this.vehicle;
    const spec = v.spec;
    const k = this.keys;

    if (v.sinking) {
      v.mesh.position.y -= 1.6 * dt;
      v.vel.multiplyScalar(Math.pow(0.9, dt * 60));
      v.mesh.position.addScaledVector(v.vel, dt);
      if (v.mesh.position.y < -2.2) {
        // Cho'kdi — qirg'oqqa piyoda qaytamiz
        const n = nearestNode(this.net, v.mesh.position.x, v.mesh.position.z);
        this.scene.remove(v.mesh);
        const idx = this.registry.indexOf(v);
        if (idx >= 0) this.registry.splice(idx, 1);
        this.vehicle = null;
        this.mode = 'foot';
        this.human.position.set(n.x + 6, 0, n.z + 6);
        this.human.visible = true;
        this.hud.message("Mashina cho'kib ketdi! Endi piyodasiz...");
      }
      return;
    }

    _fwd.set(Math.sin(v.heading), 0, Math.cos(v.heading));
    let speed = v.vel.dot(_fwd);

    let force = 0;
    if (k['KeyW'] || k['ArrowUp']) force += spec.acc;
    if (k['KeyS'] || k['ArrowDown']) force -= speed > 0.5 ? spec.acc * 2.2 : spec.acc * 0.65;

    const sIn = ((k['KeyA'] || k['ArrowLeft']) ? 1 : 0) - ((k['KeyD'] || k['ArrowRight']) ? 1 : 0);
    const speedFactor = Math.min(1, Math.abs(speed) / 9) / (1 + Math.abs(speed) * 0.022);
    v.heading += sIn * 2.3 * speedFactor * dt * (speed < 0 ? -1 : 1);
    for (const w of v.frontWheels) w.rotation.y = sIn * 0.42;

    _fwd.set(Math.sin(v.heading), 0, Math.cos(v.heading));
    v.vel.addScaledVector(_fwd, force * dt);

    // Yon siljish (drift) va ishqalanish
    const fDot = v.vel.dot(_fwd);
    _tmp.copy(_fwd).multiplyScalar(fDot);
    const lat = v.vel.clone().sub(_tmp);
    const hand = k['Space'];
    lat.multiplyScalar(Math.pow(hand ? 0.985 : 0.90, dt * 60));
    _tmp.multiplyScalar(Math.pow(force === 0 ? 0.985 : 0.997, dt * 60));
    if (hand) _tmp.multiplyScalar(Math.pow(0.965, dt * 60));
    v.vel.copy(_tmp.add(lat));

    speed = v.vel.dot(_fwd);
    if (speed > spec.max) v.vel.multiplyScalar(spec.max / speed);
    if (speed < -9) v.vel.multiplyScalar(9 / -speed);
    if (force === 0 && Math.abs(speed) < 0.35 && v.vel.lengthSq() < 0.5) v.vel.set(0, 0, 0);

    v.mesh.position.addScaledVector(v.vel, dt);
    v.mesh.rotation.y = v.heading;
    for (const w of v.wheels) w.rotation.x += speed * dt / 0.33;
    v.speed = v.vel.dot(_fwd);

    // Binolar bilan to'qnashuv
    const n = pushOut(v.mesh.position, v.radius);
    if (n) {
      const vn = v.vel.x * n.x + v.vel.z * n.z;
      if (vn < 0) {
        v.vel.x -= n.x * vn * 1.55;
        v.vel.z -= n.z * vn * 1.55;
      }
    }

    // Boshqa mashinalar bilan to'qnashuv
    for (const o of this.registry) {
      if (o === v || o.sinking) continue;
      const dx = v.mesh.position.x - o.mesh.position.x;
      const dz = v.mesh.position.z - o.mesh.position.z;
      const minD = (v.radius + o.radius) * 0.95;
      const d = Math.hypot(dx, dz);
      if (d < minD && d > 0.001) {
        const push = (minD - d);
        v.mesh.position.x += (dx / d) * push;
        v.mesh.position.z += (dz / d) * push;
        const rel = v.vel.clone().sub(o.vel).length();
        const vn2 = v.vel.x * (dx / d) + v.vel.z * (dz / d);
        if (vn2 < 0) {
          v.vel.x -= (dx / d) * vn2 * 1.35;
          v.vel.z -= (dz / d) * vn2 * 1.35;
        }
        if (rel > 7) {
          this.traffic.onHit(o);
          if (o.isPolice) { this.police.report('cop'); this.hud.message('Politsiyaga urildingiz! Ehtiyot bo\'ling!'); }
          else this.police.report('car');
        }
      }
    }

    // Piyodalarni urib yuborish
    const hits = this.peds.tryHit(v.mesh.position, v.vel);
    if (hits.length) {
      const copHit = hits.includes('militsioner');
      this.police.report(copHit ? 'cop' : 'ped', hits.length);
      this.hud.message(copHit ? 'Politsiya xodimini urdingiz!! Katta muammo!' : 'Piyodani urib yubordingiz! Politsiya izlamoqda!');
    }

    // Suvga tushib ketish
    if (!isOnLand(v.mesh.position.x, v.mesh.position.z)) {
      v.sinking = true;
    }
  }

  updateCamera(dt, camera) {
    const target = this.getPos();
    const h = this.currentHeading();
    const car = this.mode === 'car';
    const dist = car ? (this.camFar ? 12.5 : 8.5) : 5.2;
    const height = car ? (this.camFar ? 5.2 : 3.8) : 2.7;
    const fx = Math.sin(h), fz = Math.cos(h);
    _tmp.set(target.x - fx * dist, height, target.z - fz * dist);
    const k = 1 - Math.exp(-4.5 * dt);
    camera.position.lerp(_tmp, k);
    camera.lookAt(target.x + fx * 4, target.y + 1.6, target.z + fz * 4);
  }
}
