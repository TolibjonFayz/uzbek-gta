import { clamp } from './utils.js';

export class GameAudio {
  init() {
    if (this.ctx) return;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);

    // Dvigatel
    this.engOsc = ctx.createOscillator();
    this.engOsc.type = 'sawtooth';
    this.engOsc.frequency.value = 70;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.engOsc.connect(lp); lp.connect(this.engGain); this.engGain.connect(this.master);
    this.engOsc.start();

    // Sirena
    this.sirOsc = ctx.createOscillator();
    this.sirOsc.type = 'triangle';
    this.sirOsc.frequency.value = 700;
    this.sirGain = ctx.createGain();
    this.sirGain.gain.value = 0;
    this.sirOsc.connect(this.sirGain); this.sirGain.connect(this.master);
    this.sirOsc.start();
  }

  setEngine(active, speed, moto) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engGain.gain.setTargetAtTime(active ? (moto ? 0.05 : 0.06) : 0, t, 0.12);
    const f = (moto ? 130 : 65) + Math.abs(speed) * (moto ? 6.5 : 3.6);
    this.engOsc.frequency.setTargetAtTime(f, t, 0.06);
  }

  siren(on, dist) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const g = on ? clamp((0.1 * 45) / Math.max(12, dist), 0.008, 0.09) : 0;
    this.sirGain.gain.setTargetAtTime(g, t, 0.15);
    if (on) {
      const f = Math.floor(t * 2.4) % 2 === 0 ? 660 : 920;
      this.sirOsc.frequency.setTargetAtTime(f, t, 0.05);
    }
  }

  horn() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const f of [400, 505]) {
      const o = ctx.createOscillator();
      o.type = 'square'; o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.045, t);
      g.gain.setTargetAtTime(0, t + 0.22, 0.05);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 0.45);
    }
  }
}
