import * as THREE from 'three';
import { rand, pick, clamp, normAngle, canvasTexture, fmtSum } from './utils.js';
import { CRIME_SCENES, isOnLand } from './config.js';
import { makePoliceCar, makeAmbulance } from './cars.js';
import { TrafficCar } from './traffic.js';
import { pushOut } from './physics.js';

function tapeTex() {
  return canvasTexture(512, 40, (g) => {
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 512, 40);
    g.fillStyle = '#c62f2f';
    g.fillRect(0, 0, 512, 5); g.fillRect(0, 35, 512, 5);
    g.font = 'bold 19px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText("POLITSIYA · O'TISH TAQIQLANADI", 256, 21);
  });
}

function chalkTex() {
  return canvasTexture(128, 64, (g) => {
    g.clearRect(0, 0, 128, 64);
    g.strokeStyle = 'rgba(245,245,245,0.9)';
    g.lineWidth = 3;
    g.beginPath(); g.arc(28, 32, 11, 0, Math.PI * 2); g.stroke();
    g.beginPath();
    g.moveTo(39, 32); g.lineTo(84, 32);          // tana
    g.moveTo(50, 32); g.lineTo(62, 12);          // qo'llar
    g.moveTo(50, 32); g.lineTo(66, 50);
    g.moveTo(84, 32); g.lineTo(108, 18);         // oyoqlar
    g.moveTo(84, 32); g.lineTo(110, 46);
    g.stroke();
  });
}

const COP_LINES = [
  'Hujjatlaringiz bilan tanishamiz...',
  'Qayerga shoshilyapmiz, uka?',
  'Protokol yozamiz endi.',
];

export class PoliceManager {
  constructor(scene, net, registry, pedMgr, hud, audio) {
    this.scene = scene; this.net = net;
    this.registry = registry; this.pedMgr = pedMgr;
    this.hud = hud; this.audio = audio;

    this.heat = 0;
    this.lastCrime = -99;
    this.time = 0;
    this.catchT = 0;
    this.sortT = 0;
    this.allLights = [];
    this.sceneWarn = CRIME_SCENES.map(() => -99);

    this.units = [];
    for (let i = 0; i < 6; i++) {
      const veh = makePoliceCar();
      veh.driver = 'ai';
      const tc = new TrafficCar(veh, net);
      tc.base = rand(7, 9);
      registry.push(veh);
      scene.add(veh.mesh);
      this.allLights.push(veh.lights);
      this.units.push({ veh, tc, mode: 'patrol', stuck: 0, revT: 0, dist: 1e9 });
    }

    this.buildScenes();
  }

  get level() { return Math.min(5, Math.floor(this.heat)); }

  report(type, n = 1) {
    const add = { ped: 1.2, car: 0.35, jack: 0.8, cop: 1.4, police_steal: 2.2 }[type] || 0.5;
    this.heat = Math.min(5.6, this.heat + add * n);
    this.lastCrime = this.time;
  }

  buildScenes() {
    const tTex = tapeTex();
    for (const cs of CRIME_SCENES) {
      const { x: cx, z: cz } = cs;
      const g = new THREE.Group();

      // Lenta ustunlari va lentalar
      const w = 13, d = 10;
      const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]];
      for (const [dx, dz] of corners) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1, 5), new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
        pole.position.set(dx, 0.55, dz);
        g.add(pole);
      }
      for (let i = 0; i < 4; i++) {
        const [x1, z1] = corners[i], [x2, z2] = corners[(i + 1) % 4];
        const len = Math.hypot(x2 - x1, z2 - z1);
        const tape = new THREE.Mesh(
          new THREE.PlaneGeometry(len, 0.32),
          new THREE.MeshBasicMaterial({ map: tTex, side: THREE.DoubleSide })
        );
        tape.position.set((x1 + x2) / 2, 0.85, (z1 + z2) / 2);
        tape.rotation.y = Math.atan2(x2 - x1, z2 - z1) + Math.PI / 2;
        g.add(tape);
      }

      // Bo'r bilan chizilgan tana konturi
      const chalk = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 1.6),
        new THREE.MeshBasicMaterial({ map: chalkTex(), transparent: true })
      );
      chalk.rotation.x = -Math.PI / 2;
      chalk.rotation.z = rand(0, Math.PI);
      chalk.position.set(0, 0.06, 0);
      g.add(chalk);

      // Qon dog'i
      const blood = new THREE.Mesh(
        new THREE.CircleGeometry(0.55, 10),
        new THREE.MeshBasicMaterial({ color: 0x5a1414, transparent: true, opacity: 0.8 })
      );
      blood.rotation.x = -Math.PI / 2;
      blood.position.set(1.1, 0.05, 0.5);
      g.add(blood);

      // Dalil belgilari (sariq raqamlar)
      for (let i = 1; i <= 3; i++) {
        const mk = new THREE.Mesh(
          new THREE.PlaneGeometry(0.4, 0.5),
          new THREE.MeshBasicMaterial({
            map: canvasTexture(32, 40, (gg) => {
              gg.fillStyle = '#f2c419'; gg.fillRect(0, 0, 32, 40);
              gg.fillStyle = '#111'; gg.font = 'bold 24px Arial';
              gg.textAlign = 'center'; gg.textBaseline = 'middle';
              gg.fillText(String(i), 16, 22);
            }),
            side: THREE.DoubleSide,
          })
        );
        mk.position.set(rand(-3, 3), 0.25, rand(-2.5, 2.5));
        mk.rotation.x = -0.4;
        mk.rotation.y = rand(0, Math.PI * 2);
        g.add(mk);
      }

      g.position.set(cx, 0, cz);
      this.scene.add(g);

      // Turgan politsiya mashinasi (kirsa bo'ladi — lekin katta jinoyat!)
      const pcar = makePoliceCar();
      pcar.mesh.position.set(cx + 9.5, 0, cz + 4);
      pcar.heading = rand(0, Math.PI * 2);
      pcar.mesh.rotation.y = pcar.heading;
      this.registry.push(pcar);
      this.scene.add(pcar.mesh);
      this.allLights.push(pcar.lights);

      // Xodimlar
      this.pedMgr.addStatic('militsioner', cx - 4.5, cz + 6.2, Math.PI + rand(-0.4, 0.4));
      this.pedMgr.addStatic('militsioner', cx + 4, cz - 6.5, rand(-0.4, 0.4));
      this.pedMgr.addStatic('erkak', cx - 7.5, cz - 2, Math.PI / 2);

      if (cs.amb) {
        const amb = makeAmbulance();
        amb.mesh.position.set(cx - 10, 0, cz - 5);
        amb.heading = Math.PI / 3;
        amb.mesh.rotation.y = amb.heading;
        this.registry.push(amb);
        this.scene.add(amb.mesh);
        this.allLights.push(amb.lights);
        this.pedMgr.addStatic('shifokor', cx - 7, cz - 4, Math.PI / 2);
      }
    }
  }

  chaseUpdate(u, dt, targetPos) {
    const v = u.veh;
    const spec = v.spec;
    const p = v.mesh.position;
    const tx = targetPos.x - p.x, tz = targetPos.z - p.z;
    const dist = Math.hypot(tx, tz);
    u.dist = dist;

    const desired = Math.atan2(tx, tz);
    const diff = normAngle(desired - v.heading);
    let steer = clamp(diff * 1.8, -1, 1);
    let accel = 1;
    if (Math.abs(diff) > 2.2 && v.speed > 4) accel = -0.5;
    if (dist < 5) accel = 0.35;

    if (Math.abs(v.speed) < 1) u.stuck += dt; else u.stuck = Math.max(0, u.stuck - dt * 2);
    if (u.stuck > 1.6) { u.revT = 1.1; u.stuck = 0; }
    if (u.revT > 0) { u.revT -= dt; accel = -1; steer = -steer; }

    v.speed += (accel > 0 ? spec.acc * accel : spec.acc * 2 * accel) * dt;
    v.speed = clamp(v.speed, -8, spec.max);
    v.speed *= Math.pow(0.996, dt * 60);
    v.heading += steer * 2.4 * Math.min(1, Math.abs(v.speed) / 12) * dt * (v.speed < 0 ? -1 : 1);

    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const nx = p.x + fx * v.speed * dt;
    const nz = p.z + fz * v.speed * dt;
    if (isOnLand(nx, nz)) { p.x = nx; p.z = nz; }
    else { v.speed = 0; u.stuck += dt * 2; }

    if (pushOut(p, 1.4)) v.speed *= 0.4;

    v.mesh.rotation.y = v.heading;
    for (const w of v.wheels) w.rotation.x += v.speed * dt / 0.33;
    v.vel.set(fx * v.speed, 0, fz * v.speed);
  }

  bust(player) {
    const lvl = Math.max(1, this.level);
    const fine = lvl * 495000;
    this.hud.busted(fmtSum(fine), pick(COP_LINES));
    this.heat = 0;
    this.catchT = 0;
    player.stopVehicle();
  }

  update(dt, player) {
    this.time += dt;
    if (this.time - this.lastCrime > 7) this.heat = Math.max(0, this.heat - dt * 0.085);
    const lvl = this.level;
    const tp = player.getPos();

    // Chiroqlar miltillashi
    const phase = Math.floor(this.time * 5) % 2 === 0;
    for (const l of this.allLights) {
      l.r.visible = phase;
      l.b.visible = !phase;
    }

    // Eng yaqin ekipajlar quvadi
    this.sortT -= dt;
    if (this.sortT <= 0) {
      this.sortT = 0.6;
      for (const u of this.units) {
        u.dist = Math.hypot(u.veh.mesh.position.x - tp.x, u.veh.mesh.position.z - tp.z);
      }
      const sorted = [...this.units].sort((a, b) => a.dist - b.dist);
      sorted.forEach((u, i) => {
        const want = i < lvl ? 'chase' : 'patrol';
        if (want !== u.mode) {
          u.mode = want;
          if (want === 'patrol') {
            // Yo'l tarmog'iga qaytish
            const v = u.veh;
            let bn = null, bd = 1e18;
            for (const n of this.net.nodes) {
              const d = (n.x - v.mesh.position.x) ** 2 + (n.z - v.mesh.position.z) ** 2;
              if (d < bd) { bd = d; bn = n; }
            }
            u.tc.setEdge(bn, bn.nbs[0]);
            u.tc.cur = 0;
          }
        }
      });
    }

    let minChase = 1e9;
    for (const u of this.units) {
      if (u.veh.driver !== 'ai') continue; // o'g'irlangan
      if (u.mode === 'chase' && lvl > 0) {
        this.chaseUpdate(u, dt, tp);
        minChase = Math.min(minChase, u.dist);
      } else {
        u.tc.update(dt, this.registry, player.mode === 'foot' ? tp : null);
      }
    }

    // Qo'lga tushish
    if (lvl > 0 && minChase < 4.5 && Math.abs(player.currentSpeed()) < 2) {
      this.catchT += dt;
      if (this.catchT > 2.2) this.bust(player);
    } else {
      this.catchT = 0;
    }

    this.audio.siren(lvl > 0, minChase);

    // Jinoyat joyi ogohlantirishi
    CRIME_SCENES.forEach((cs, i) => {
      const d = Math.hypot(tp.x - cs.x, tp.z - cs.z);
      if (d < 17 && this.time - this.sceneWarn[i] > 25) {
        this.sceneWarn[i] = this.time;
        this.hud.message('Jinoyat joyi! Yaqinlashish taqiqlangan.');
      }
    });
  }
}
