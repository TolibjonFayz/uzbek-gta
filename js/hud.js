import { H_ROADS, WEST_V, EAST_V, BRIDGE_Z, ISLANDS, BEACH, CRIME_SCENES } from './config.js';

const MX = (x) => (x + 850) * 0.1;
const MY = (z) => (z + 950) * 0.1;

export class Hud {
  constructor() {
    this.speedEl = document.getElementById('speed');
    this.nameEl = document.getElementById('carname');
    this.plateEl = document.getElementById('plate');
    this.wantedEl = document.getElementById('wanted');
    this.msgEl = document.getElementById('msg');
    this.bustedEl = document.getElementById('busted');
    this.fineEl = document.getElementById('fine');
    this.copLineEl = document.getElementById('copline');
    this.map = document.getElementById('minimap');
    this.ctx = this.map.getContext('2d');
    this.msgTimer = null;
    this.static = this.prerenderMap();
  }

  prerenderMap() {
    const c = document.createElement('canvas');
    c.width = 170; c.height = 190;
    const g = c.getContext('2d');
    g.fillStyle = '#0b2740';
    g.fillRect(0, 0, 170, 190);
    // Orollar
    g.fillStyle = '#787e86';
    for (const r of ISLANDS) g.fillRect(MX(r.x1), MY(r.z1), (r.x2 - r.x1) * 0.1, (r.z2 - r.z1) * 0.1);
    g.fillStyle = '#d9c189';
    g.fillRect(MX(BEACH.x1), MY(BEACH.z1), (BEACH.x2 - BEACH.x1) * 0.1, (BEACH.z2 - BEACH.z1) * 0.1);
    // Parklar
    g.fillStyle = '#4f8b4f';
    g.beginPath(); g.arc(MX(380), MY(300), 5.5, 0, 7); g.fill();
    g.beginPath(); g.arc(MX(-600), MY(600), 5.5, 0, 7); g.fill();
    // Yo'llar
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 1.4;
    for (const x of [...WEST_V, ...EAST_V]) {
      g.beginPath(); g.moveTo(MX(x), MY(-760)); g.lineTo(MX(x), MY(760)); g.stroke();
    }
    for (const z of H_ROADS) {
      g.beginPath(); g.moveTo(MX(-710), MY(z)); g.lineTo(MX(-280), MY(z)); g.stroke();
      g.beginPath(); g.moveTo(MX(290), MY(z)); g.lineTo(MX(620), MY(z)); g.stroke();
    }
    for (const z of BRIDGE_Z) {
      g.beginPath(); g.moveTo(MX(-292), MY(z)); g.lineTo(MX(302), MY(z)); g.stroke();
    }
    return c;
  }

  message(text, dur = 3200) {
    this.msgEl.textContent = text;
    this.msgEl.classList.add('show');
    clearTimeout(this.msgTimer);
    this.msgTimer = setTimeout(() => this.msgEl.classList.remove('show'), dur);
  }

  busted(fineStr, copLine) {
    this.fineEl.textContent = `Jarima: ${fineStr} so'm`;
    this.copLineEl.textContent = `YPX xodimi: «${copLine}»`;
    this.bustedEl.classList.add('show');
    setTimeout(() => this.bustedEl.classList.remove('show'), 3200);
  }

  tick(player, police, time) {
    // Tezlik
    const kmh = Math.abs(Math.round(player.currentSpeed() * 3.6));
    this.speedEl.textContent = kmh;
    if (player.mode === 'car') {
      this.nameEl.textContent = player.vehicle.spec.name;
      this.plateEl.textContent = player.vehicle.plate;
    } else {
      this.nameEl.textContent = 'Piyoda';
      this.plateEl.textContent = '';
    }

    // Qidiruv darajasi
    const lvl = police.level;
    this.wantedEl.innerHTML =
      'QIDIRUV &nbsp;<span class="' + (lvl > 0 ? 'hot' : '') + '">' +
      '★'.repeat(lvl) + '<span class="dim">' + '★'.repeat(5 - lvl) + '</span></span>';

    // Minimap
    const g = this.ctx;
    g.clearRect(0, 0, 170, 190);
    g.drawImage(this.static, 0, 0);

    // Jinoyat joylari — qizil pulsatsiya
    const pulse = 2.4 + Math.sin(time * 5) * 0.9;
    g.fillStyle = '#ff4d4d';
    for (const cs of CRIME_SCENES) {
      g.beginPath(); g.arc(MX(cs.x), MY(cs.z), pulse, 0, 7); g.fill();
    }
    // Politsiya
    g.fillStyle = '#37d67a';
    for (const u of police.units) {
      const p = u.veh.mesh.position;
      g.beginPath(); g.arc(MX(p.x), MY(p.z), 2, 0, 7); g.fill();
    }
    // O'yinchi
    const pp = player.getPos();
    const h = player.currentHeading();
    g.save();
    g.translate(MX(pp.x), MY(pp.z));
    g.rotate(Math.atan2(Math.cos(h), Math.sin(h)));
    g.fillStyle = '#ffd21f';
    g.beginPath();
    g.moveTo(5.5, 0); g.lineTo(-3.5, 3.4); g.lineTo(-3.5, -3.4);
    g.closePath(); g.fill();
    g.restore();
  }
}
