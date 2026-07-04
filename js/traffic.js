import * as THREE from 'three';
import { rand, pick, clamp, angleLerp } from './utils.js';
import { LANE, isOnLand } from './config.js';
import { randomNode, nextNode } from './network.js';
import { makeVehicle, makeMoto, pickModel, MODELS } from './cars.js';
import { makeSeatedRider } from './peds.js';
import { pushOut } from './physics.js';

export class TrafficCar {
  constructor(veh, net) {
    this.veh = veh;
    this.net = net;
    this.active = true;
    this.stopT = 0;
    this.cur = 0;
    this.base = rand(8, 13) * (veh.kind === 'moto' ? 1.25 : 1);
    const from = randomNode(net);
    this.setEdge(from, nextNode(from, null));
    this.t = rand(0, this.len);
    veh.mesh.position.set(this.ix(), 0, this.iz());
    veh.heading = Math.atan2(this.dirx, this.dirz);
    veh.mesh.rotation.y = veh.heading;
  }

  setEdge(from, to) {
    this.from = from; this.to = to;
    const dx = to.x - from.x, dz = to.z - from.z;
    this.len = Math.hypot(dx, dz);
    this.dirx = dx / this.len; this.dirz = dz / this.len;
    this.rx = -this.dirz; this.rz = this.dirx;
    this.t = 0;
  }

  ix() { return this.from.x + this.dirx * this.t + this.rx * LANE; }
  iz() { return this.from.z + this.dirz * this.t + this.rz * LANE; }

  update(dt, registry, playerFootPos) {
    const v = this.veh;
    if (!this.active || v.driver !== 'ai') return;
    if (this.stopT > 0) {
      this.stopT -= dt;
      this.cur = 0; v.speed = 0; v.vel.set(0, 0, 0);
      return;
    }
    let target = this.base;
    if (this.len - this.t < 16) target = Math.min(target, 6);

    const px = v.mesh.position.x, pz = v.mesh.position.z;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    for (const o of registry) {
      if (o === v || o.sinking) continue;
      const ox = o.mesh.position.x - px, oz = o.mesh.position.z - pz;
      const d = Math.hypot(ox, oz);
      if (d > 12 || d < 0.001) continue;
      if ((ox * fx + oz * fz) / d > 0.72) target = Math.min(target, Math.max(0, (d - 4.5) * 1.1));
    }
    if (playerFootPos) {
      const ox = playerFootPos.x - px, oz = playerFootPos.z - pz;
      const d = Math.hypot(ox, oz);
      if (d < 9 && d > 0.001 && (ox * fx + oz * fz) / d > 0.6) {
        target = Math.min(target, Math.max(0, (d - 3) * 1.2));
      }
    }

    this.cur += clamp(target - this.cur, -16 * dt, 7 * dt);
    this.t += this.cur * dt;
    if (this.t >= this.len) {
      const carry = this.t - this.len;
      const prev = this.to;
      const nn = nextNode(this.to, this.from);
      this.setEdge(prev, nn);
      this.t = carry;
    }
    const k = 1 - Math.exp(-6 * dt);
    v.mesh.position.x += (this.ix() - v.mesh.position.x) * k;
    v.mesh.position.z += (this.iz() - v.mesh.position.z) * k;
    v.heading = angleLerp(v.heading, Math.atan2(this.dirx, this.dirz), 1 - Math.exp(-7 * dt));
    v.mesh.rotation.y = v.heading;
    for (const w of v.wheels) w.rotation.x += this.cur * dt / 0.33;
    v.speed = this.cur;
    v.vel.set(fx * this.cur, 0, fz * this.cur);
  }
}

export class TrafficManager {
  constructor(scene, net, registry, { cars = 24, motos = 6, parked = 10 } = {}) {
    this.scene = scene; this.net = net; this.registry = registry;
    this.list = [];
    this.byVeh = new Map();

    for (let i = 0; i < cars; i++) {
      const veh = makeVehicle(pickModel());
      veh.driver = 'ai';
      this.add(veh);
    }
    for (let i = 0; i < motos; i++) {
      const veh = makeMoto();
      veh.driver = 'ai';
      veh.rider = makeSeatedRider();
      veh.rider.position.set(0, 0.55, -0.32);
      veh.mesh.add(veh.rider);
      this.add(veh);
    }

    // Turargohda turgan mashinalar — birinchisi doim spawn yonidagi oq Cobalt
    this.spawnParkedAt(MODELS[0], '#f5f5f3', 615.8, 82, Math.PI);
    for (let i = 0; i < parked - 1; i++) this.spawnParkedRandom();
  }

  add(veh) {
    const tc = new TrafficCar(veh, this.net);
    this.list.push(tc);
    this.byVeh.set(veh, tc);
    this.registry.push(veh);
    this.scene.add(veh.mesh);
  }

  spawnParkedAt(model, color, x, z, heading) {
    const veh = makeVehicle(model, color);
    veh.mesh.position.set(x, 0, z);
    veh.heading = heading;
    veh.mesh.rotation.y = heading;
    this.registry.push(veh);
    this.scene.add(veh.mesh);
    return veh;
  }

  spawnParkedRandom() {
    for (let tries = 0; tries < 20; tries++) {
      const from = randomNode(this.net);
      const to = nextNode(from, null);
      const len = Math.hypot(to.x - from.x, to.z - from.z);
      if (len > 400) continue; // ko'priklarga qo'ymaymiz
      const dirx = (to.x - from.x) / len, dirz = (to.z - from.z) / len;
      const t = rand(15, len - 15);
      const side = pick([1, -1]);
      const x = from.x + dirx * t + (-dirz) * 5.8 * side;
      const z = from.z + dirz * t + dirx * 5.8 * side;
      if (!isOnLand(x, z)) continue;
      const heading = Math.atan2(dirx * side, dirz * side);
      this.spawnParkedAt(pickModel(), null, x, z, heading);
      return;
    }
  }

  steal(veh) {
    const tc = this.byVeh.get(veh);
    if (tc) tc.active = false;
  }

  onHit(veh) {
    const tc = this.byVeh.get(veh);
    if (tc && tc.active) tc.stopT = 6;
  }

  update(dt, playerFootPos) {
    for (const tc of this.list) tc.update(dt, this.registry, playerFootPos);

    // Haydovchisiz dumalab ketayotgan mashinalar (o'yinchi tashlab ketgan)
    for (const v of this.registry) {
      if (v.driver !== null || v.sinking) continue;
      if (v.vel.lengthSq() < 0.02) { v.vel.set(0, 0, 0); continue; }
      v.vel.multiplyScalar(Math.pow(0.93, dt * 60));
      v.mesh.position.addScaledVector(v.vel, dt);
      pushOut(v.mesh.position, v.radius);
    }
  }
}
