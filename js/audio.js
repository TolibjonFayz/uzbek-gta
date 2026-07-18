// ============ Radio + ovoz effektlari ============
// Haqiqiy MP3 qo'shiqlar: music/ papkasiga .mp3 tashlang yoki music/playlist.json to'ldiring.
// MP3 topilmasa — sintez qilingan xalq kuylari chalinadi (zaxira rejim).
window.G = window.G || {};

(function () {
  var ctx = null, master = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function midiHz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // --- Zaxira: sintez kuylar (MP3 bo'lmasa) ---
  var SYNTH_SONGS = [
    {
      title: "Boychechak (sintez)", bpm: 96, lead: 'triangle',
      mel: [[69,1],[71,1],[72,1],[74,1],[76,2],[74,1],[72,1],[71,2],[69,1],[71,1],[72,1],[74,1],[72,1],[71,1],[69,2],[0,1],
            [76,1],[77,1],[76,1],[74,1],[72,2],[74,1],[76,1],[74,1],[72,1],[71,2],[69,1],[71,1],[72,2],[69,2],[0,1]],
      bass: [[45,2],[52,2],[45,2],[52,2]]
    },
    {
      title: "Yallama yorim (sintez)", bpm: 122, lead: 'square',
      mel: [[74,0.5],[76,0.5],[77,1],[76,0.5],[74,0.5],[72,1],[74,0.5],[76,0.5],[77,0.5],[79,0.5],[77,0.5],[76,0.5],[74,1],[0,0.5],
            [72,0.5],[74,0.5],[76,1],[74,0.5],[72,0.5],[71,1],[72,0.5],[74,0.5],[72,0.5],[71,0.5],[69,1.5],[0,0.5],
            [69,0.5],[72,0.5],[76,0.5],[77,0.5],[79,1],[77,0.5],[76,0.5],[74,1],[76,0.5],[74,0.5],[72,0.5],[71,0.5],[69,2]],
      bass: [[45,1],[45,1],[48,1],[52,1]]
    },
    {
      title: "Andijon polkasi (sintez)", bpm: 138, lead: 'sawtooth',
      mel: [[76,0.5],[76,0.5],[77,0.5],[79,0.5],[79,0.5],[77,0.5],[76,0.5],[74,0.5],[72,0.5],[72,0.5],[74,0.5],[76,0.5],[76,1],[74,1],
            [74,0.5],[74,0.5],[76,0.5],[72,0.5],[74,0.5],[76,0.5],[77,0.5],[76,0.5],[74,0.5],[72,0.5],[71,0.5],[74,0.5],[72,1],[69,1]],
      bass: [[45,0.5],[57,0.5],[45,0.5],[57,0.5],[48,0.5],[57,0.5],[52,0.5],[57,0.5]]
    },
    {
      title: "Omon yor (sintez)", bpm: 84, lead: 'triangle',
      mel: [[69,1.5],[72,0.5],[74,1],[76,1],[77,1.5],[76,0.5],[74,1],[72,1],[74,2],[72,1],[71,1],[69,3],[0,1],
            [72,1.5],[74,0.5],[76,1],[77,1],[80,1.5],[79,0.5],[77,1],[76,1],[74,2],[76,1],[72,1],[69,3],[0,1]],
      bass: [[45,2],[48,2],[52,2],[45,2]]
    },
    {
      title: "Doira raqsi (sintez)", bpm: 132, lead: 'square',
      mel: [[81,0.5],[79,0.5],[77,0.5],[76,0.5],[77,0.5],[79,0.5],[81,1],[79,0.5],[77,0.5],[76,0.5],[74,0.5],[76,1],[0,0.5],
            [76,0.5],[77,0.5],[79,0.5],[77,0.5],[76,0.5],[74,0.5],[72,1],[74,0.5],[76,0.5],[74,0.5],[72,0.5],[71,0.5],[69,1.5],[0,0.5]],
      bass: [[45,0.5],[45,0.5],[52,0.5],[45,0.5],[48,0.5],[48,0.5],[52,0.5],[43,0.5]]
    }
  ];

  // ---------- RADIO ----------
  var radio = {
    songs: SYNTH_SONGS,
    tracks: null,      // haqiqiy MP3 ro'yxati [{title, url}]
    idx: -1,
    playing: false,
    _audioEl: null,
    _timer: null,
    _melT: 0, _melI: 0, _bassT: 0, _bassI: 0, _drumT: 0, _drumI: 0,
    _gain: null,

    // MP3 ro'yxatini yuklash (o'yin boshida chaqiriladi)
    // MUHIM: deployда (Netlify/Vercel/GitHub Pages) papka ro'yxati YO'Q —
    // shuning uchun asosiy manba playlist.json bo'lishi shart.
    init: function () {
      var self = this;
      // 1) music/playlist.json — hamma joyda ishlaydi
      fetch('music/playlist.json').then(function (r) {
        if (!r.ok) throw 0;
        return r.json();
      }).then(function (j) {
        var list = (j && j.tracks) || [];
        var ok = list.filter(function (t) { return t && t.file; }).map(function (t) {
          return {
            title: t.title || cleanName(t.file),
            url: /^https?:/.test(t.file) ? t.file : 'music/' + encPath(t.file)
          };
        });
        if (ok.length) { self.tracks = ok; }
        else throw 0;
      }).catch(function () {
        // 2) zaxira: papka ro'yxati (faqat lokal dev serverda — http-server/python)
        fetch('music/').then(function (r) {
          if (!r.ok) throw 0;
          return r.text();
        }).then(function (html) {
          var found = [];
          var re = /href="([^"]+\.(mp3|ogg|m4a|wav))"/gi;
          var m;
          while ((m = re.exec(html))) {
            var f = m[1].replace(/^\.?\//, ''); // "./" prefiksini olib tashlaymiz
            found.push({ title: cleanName(f), url: 'music/' + encPath(f) });
          }
          if (found.length) self.tracks = found;
        }).catch(function () {});
      });
    },

    hasReal: function () { return !!(this.tracks && this.tracks.length); },

    start: function () {
      ensureCtx();
      if (this.idx < 0) this.idx = 0;
      this._play();
    },
    next: function () {
      ensureCtx();
      var n = this.hasReal() ? this.tracks.length : SYNTH_SONGS.length;
      this.idx = (this.idx + 1) % n;
      this._play();
    },
    stop: function () {
      this.playing = false;
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      if (this._audioEl) { this._audioEl.pause(); this._audioEl = null; }
      if (this._gain && ctx) {
        var g = this._gain;
        g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        setTimeout(function () { try { g.disconnect(); } catch (e) {} }, 500);
      }
      this._gain = null;
    },
    current: function () {
      if (this.idx < 0) return null;
      if (this.hasReal()) return this.tracks[this.idx % this.tracks.length];
      return SYNTH_SONGS[this.idx % SYNTH_SONGS.length];
    },

    _play: function () {
      this.stop();
      this.playing = true;
      if (this.hasReal()) {
        var tr = this.tracks[this.idx % this.tracks.length];
        var a = new Audio(tr.url);
        a.volume = 0.75;
        var self = this;
        a.onended = function () { if (self.playing) self.next(); };
        a.onerror = function () { if (self.playing) setTimeout(function(){ self.next(); }, 800); };
        a.play().catch(function () {});
        this._audioEl = a;
        return;
      }
      this._playSynth();
    },

    _playSynth: function () {
      var song = SYNTH_SONGS[this.idx % SYNTH_SONGS.length];
      this._gain = ctx.createGain();
      this._gain.gain.value = 0.85;
      this._gain.connect(master);

      var spb = 60 / song.bpm;
      var t0 = ctx.currentTime + 0.1;
      this._melT = t0; this._melI = 0;
      this._bassT = t0; this._bassI = 0;
      this._drumT = t0; this._drumI = 0;

      var self = this;
      var out = this._gain;

      function noteOn(midi, when, dur, type, vol, detune) {
        var o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = midiHz(midi);
        if (detune) o.detune.value = detune;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0, when);
        g.gain.linearRampToValueAtTime(vol, when + 0.02);
        g.gain.setTargetAtTime(0, when + dur * 0.8, 0.06);
        o.connect(g); g.connect(out);
        o.start(when); o.stop(when + dur + 0.4);
      }
      function drum(kind, when) {
        if (kind === 'bak') {
          var o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.setValueAtTime(140, when);
          o.frequency.exponentialRampToValueAtTime(48, when + 0.11);
          var g = ctx.createGain();
          g.gain.setValueAtTime(0.55, when);
          g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
          o.connect(g); g.connect(out);
          o.start(when); o.stop(when + 0.2);
        } else {
          var len = 0.06;
          var buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
          var d = buf.getChannelData(0);
          for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
          var s = ctx.createBufferSource();
          s.buffer = buf;
          var f = ctx.createBiquadFilter();
          f.type = 'highpass'; f.frequency.value = 3500;
          var g2 = ctx.createGain(); g2.gain.value = 0.22;
          s.connect(f); f.connect(g2); g2.connect(out);
          s.start(when);
        }
      }

      var drumPat = [['bak', 0], ['chak', 0.5], ['chak', 1], ['bak', 1.5], ['bak', 2], ['chak', 2.5], ['chak', 3], ['chak', 3.5]];
      var drumLen = 4;

      this._timer = setInterval(function () {
        if (!self.playing) return;
        var ahead = ctx.currentTime + 0.35;
        while (self._melT < ahead) {
          var n = song.mel[self._melI % song.mel.length];
          if (n[0] > 0) {
            noteOn(n[0], self._melT, n[1] * spb, song.lead, 0.16);
            noteOn(n[0] + 12, self._melT, n[1] * spb, 'sine', 0.05, 6);
          }
          self._melT += n[1] * spb;
          self._melI++;
        }
        while (self._bassT < ahead) {
          var b = song.bass[self._bassI % song.bass.length];
          if (b[0] > 0) noteOn(b[0], self._bassT, b[1] * spb * 0.9, 'sine', 0.28);
          self._bassT += b[1] * spb;
          self._bassI++;
        }
        while (self._drumT < ahead) {
          var cyc = self._drumI % drumPat.length;
          var hit = drumPat[cyc];
          drum(hit[0], self._drumT);
          var nextIdx = (cyc + 1) % drumPat.length;
          var cur = hit[1], nxt = drumPat[nextIdx][1];
          var gap = (nextIdx === 0 ? drumLen - cur : nxt - cur);
          self._drumT += gap * spb;
          self._drumI++;
        }
      }, 120);
    }
  };

  function cleanName(f) {
    try { f = decodeURIComponent(f); } catch (e) {}
    return f.replace(/\.[a-z0-9]+$/i, '').replace(/[_\-]+/g, ' ').trim();
  }

  // Fayl yo'lini URL uchun xavfsiz qiladi (bo'sh joy, kirill, qavslar).
  // Allaqachon kodlangan bo'lagni qayta kodlamaydi.
  function encPath(p) {
    return String(p).split('/').map(function (seg) {
      if (!seg) return seg;
      try { if (decodeURIComponent(seg) !== seg) return seg; } catch (e) { return seg; }
      return encodeURIComponent(seg);
    }).join('/');
  }

  // ---------- MOTOR OVOZI (qatlamli, realistik) ----------
  // asosiy sawtooth + detune juft (gurullash) + sub-oktava (vixlop) + yuqori garmonika
  // + havo/yo'l shovqini + yumshoq distorsiya + salda "lop-lop" tebranish
  var engine = { on: false };
  G.engineSound = {
    start: function () {
      ensureCtx();
      if (engine.on) return;
      engine.on = true;

      // yumshoq tanh distorsiya — sinuslarni "temir" ovozga aylantiradi
      var curve = new Float32Array(256);
      for (var i = 0; i < 256; i++) {
        var x = i / 128 - 1;
        curve[i] = Math.tanh(2.2 * x);
      }
      var shaper = ctx.createWaveShaper();
      shaper.curve = curve;
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 300; lp.Q.value = 0.8;
      var gain = ctx.createGain();
      gain.gain.value = 0;
      shaper.connect(lp); lp.connect(gain); gain.connect(master);

      function mkOsc(type, f, g0, det) {
        var o = ctx.createOscillator();
        o.type = type; o.frequency.value = f;
        if (det) o.detune.value = det;
        var g = ctx.createGain(); g.gain.value = g0;
        o.connect(g); g.connect(shaper);
        o.start();
        return { o: o, g: g };
      }
      engine.a = mkOsc('sawtooth', 60, 0.5);          // asosiy otashlanish toni
      engine.b = mkOsc('sawtooth', 60, 0.35, 9);      // detune juft — gurullash
      engine.sub = mkOsc('square', 30, 0.5);          // sub-oktava — vixlop bosimi
      engine.hi = mkOsc('sawtooth', 121, 0.16);       // yuqori garmonika — mexanika

      // havo kirishi / yo'l shovqini
      var nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var nd = nb.getChannelData(0);
      for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1;
      var ns = ctx.createBufferSource();
      ns.buffer = nb; ns.loop = true;
      var nf = ctx.createBiquadFilter();
      nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.6;
      var ng = ctx.createGain(); ng.gain.value = 0;
      ns.connect(nf); nf.connect(ng); ng.connect(master);
      ns.start();

      // salda notekis ishlash (idle wobble)
      var lfo = ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.value = 11;
      var lfoG = ctx.createGain(); lfoG.gain.value = 0.008;
      lfo.connect(lfoG); lfoG.connect(gain.gain);
      lfo.start();

      engine.gain = gain; engine.lp = lp; engine.shaper = shaper;
      engine.noiseSrc = ns; engine.noiseF = nf; engine.noiseG = ng;
      engine.lfo = lfo; engine.lfoG = lfoG;
    },
    update: function (speedRatio, throttle) {
      if (!engine.on) return;
      var t = ctx.currentTime;
      // vites qutisi: har vitesda RPM ko'tarilib, keyingisiga o'tganda tushadi
      var frac = (speedRatio * 3.4) % 1;
      var rpm = 850 + frac * 2900 + throttle * 500;   // 850..~4250 rpm
      var f = rpm / 30;                                // 4 silindr otashlanish chastotasi
      engine.a.o.frequency.setTargetAtTime(f, t, 0.06);
      engine.b.o.frequency.setTargetAtTime(f * 1.003, t, 0.06);
      engine.sub.o.frequency.setTargetAtTime(f / 2, t, 0.06);
      engine.hi.o.frequency.setTargetAtTime(f * 2.02, t, 0.06);
      engine.lp.frequency.setTargetAtTime(240 + speedRatio * 800 + throttle * 700, t, 0.09);
      engine.gain.gain.setTargetAtTime(0.020 + speedRatio * 0.045 + throttle * 0.028, t, 0.1);
      engine.noiseG.gain.setTargetAtTime(0.003 + speedRatio * 0.016 + throttle * 0.008, t, 0.12);
      engine.noiseF.frequency.setTargetAtTime(600 + speedRatio * 1600, t, 0.1);
      engine.lfoG.gain.setTargetAtTime(Math.max(0, 0.010 - speedRatio * 0.03), t, 0.2);
    },
    stop: function () {
      if (!engine.on) return;
      engine.on = false;
      var t = ctx.currentTime;
      engine.gain.gain.setTargetAtTime(0, t, 0.08);
      engine.noiseG.gain.setTargetAtTime(0, t, 0.08);
      engine.lfoG.gain.setTargetAtTime(0, t, 0.05);
      var parts = [engine.a, engine.b, engine.sub, engine.hi];
      var ns = engine.noiseSrc, lfo = engine.lfo;
      var gg = engine.gain, ngg = engine.noiseG, lg = engine.lfoG, sh = engine.shaper, lpf = engine.lp;
      setTimeout(function () {
        try {
          parts.forEach(function (p) { p.o.stop(); p.o.disconnect(); p.g.disconnect(); });
          ns.stop(); ns.disconnect();
          lfo.stop(); lfo.disconnect(); lg.disconnect();
          gg.disconnect(); ngg.disconnect(); sh.disconnect(); lpf.disconnect();
        } catch (e) {}
      }, 450);
      engine.a = engine.b = engine.sub = engine.hi = null;
    }
  };

  // ---------- OVOZ EFFEKTLARI ----------
  function noiseBuf(len) {
    var buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * len)), ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  var screech = { src: null, gain: null };
  var siren = { osc: null, lfo: null, gain: null };

  G.sfx = {
    // klakson — ikki tonli signal
    horn: function () {
      ensureCtx();
      var t = ctx.currentTime;
      [440, 554].forEach(function (f) {
        var o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.09, t);
        g.gain.setValueAtTime(0.09, t + 0.28);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 0.4);
      });
    },
    // yulduz terilganda jarang (arpedjio)
    ding: function () {
      ensureCtx();
      var t = ctx.currentTime;
      [880, 1174.7, 1568].forEach(function (f, i) {
        var o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + i * 0.07);
        g.gain.linearRampToValueAtTime(0.12, t + i * 0.07 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.5);
        o.connect(g); g.connect(master);
        o.start(t + i * 0.07); o.stop(t + i * 0.07 + 0.6);
      });
    },
    // poyezd gudogi — ikki tonli havo signali
    trainHorn: function () {
      ensureCtx();
      var t = ctx.currentTime;
      [311, 392].forEach(function (f) {
        var o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        var fl = ctx.createBiquadFilter();
        fl.type = 'lowpass'; fl.frequency.value = 900;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.065, t + 0.06);
        g.gain.setValueAtTime(0.065, t + 0.9);
        g.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
        o.connect(fl); fl.connect(g); g.connect(master);
        o.start(t); o.stop(t + 1.3);
      });
    },
    // avariya — kuchiga qarab
    crash: function (power) {
      ensureCtx();
      var t = ctx.currentTime;
      var vol = G.clamp(0.1 + power * 0.06, 0.1, 0.5);
      var s = ctx.createBufferSource();
      s.buffer = noiseBuf(0.25);
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t);
      // metal zang
      var o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.setValueAtTime(320, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.2);
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(vol * 0.5, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g2); g2.connect(master);
      o.start(t); o.stop(t + 0.3);
    },
    // portlash — kuchli gumburlash
    explosion: function () {
      ensureCtx();
      var t = ctx.currentTime;
      // past gumburlash
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 0.6);
      var og = ctx.createGain();
      og.gain.setValueAtTime(0.7, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      o.connect(og); og.connect(master);
      o.start(t); o.stop(t + 1.0);
      // shovqin portlashi
      var s = ctx.createBufferSource();
      s.buffer = noiseBuf(0.7);
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1800, t);
      f.frequency.exponentialRampToValueAtTime(200, t + 0.6);
      var sg = ctx.createGain();
      sg.gain.setValueAtTime(0.6, t);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
      s.connect(f); f.connect(sg); sg.connect(master);
      s.start(t);
      // metal parchalanishi
      var o2 = ctx.createOscillator();
      o2.type = 'square';
      o2.frequency.setValueAtTime(420, t);
      o2.frequency.exponentialRampToValueAtTime(70, t + 0.3);
      var g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.25, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o2.connect(g2); g2.connect(master);
      o2.start(t); o2.stop(t + 0.4);
    },
    // odam qichqirig'i
    scream: function () {
      ensureCtx();
      var t = ctx.currentTime;
      var base = 500 + Math.random() * 300;
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.3, t + 0.09);
      o.frequency.exponentialRampToValueAtTime(base * 0.55, t + 0.42);
      var v = ctx.createOscillator(); // vibrato
      v.frequency.value = 22;
      var vg = ctx.createGain(); vg.gain.value = 28;
      v.connect(vg); vg.connect(o.frequency);
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 1.4;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.5);
      v.start(t); v.stop(t + 0.5);
    },
    // musht zarbi (havo shovqini + gup)
    punch: function (hit) {
      ensureCtx();
      var t = ctx.currentTime;
      // havo shovqini (whoosh)
      var s = ctx.createBufferSource();
      s.buffer = noiseBuf(0.14);
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.setValueAtTime(1200, t);
      f.frequency.exponentialRampToValueAtTime(400, t + 0.12); f.Q.value = 1.2;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t);
      // tegsa — gup zarbi
      if (hit) {
        var o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, t + 0.05);
        o.frequency.exponentialRampToValueAtTime(55, t + 0.17);
        var g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.45, t + 0.05);
        g2.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        o.connect(g2); g2.connect(master);
        o.start(t + 0.05); o.stop(t + 0.22);
      }
    },
    // gup etib urilish
    thud: function () {
      ensureCtx();
      var t = ctx.currentTime;
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + 0.25);
    },
    // shina chiyillashi (uzluksiz, yoqish/o'chirish)
    screechStart: function () {
      ensureCtx();
      if (screech.src) return;
      var s = ctx.createBufferSource();
      s.buffer = noiseBuf(1);
      s.loop = true;
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 6;
      var g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(0.07, ctx.currentTime, 0.05);
      s.connect(f); f.connect(g); g.connect(master);
      s.start();
      screech.src = s; screech.gain = g;
    },
    screechStop: function () {
      if (!screech.src) return;
      var s = screech.src, g = screech.gain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.06);
      setTimeout(function () { try { s.stop(); } catch (e) {} }, 300);
      screech.src = null; screech.gain = null;
    },
    // militsiya sirenasi (ikki tonli, uzluksiz)
    sirenStart: function () {
      ensureCtx();
      if (siren.osc) return;
      var o = ctx.createOscillator();
      o.type = 'sawtooth';
      var lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 1.6; // ton almashish tezligi
      var lfoGain = ctx.createGain();
      lfoGain.gain.value = 160;
      lfo.connect(lfoGain);
      lfoGain.connect(o.frequency);
      o.frequency.value = 720;
      var f = ctx.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2;
      var g = ctx.createGain();
      g.gain.value = 0;
      g.gain.setTargetAtTime(0.09, ctx.currentTime, 0.1);
      o.connect(f); f.connect(g); g.connect(master);
      o.start(); lfo.start();
      siren.osc = o; siren.lfo = lfo; siren.gain = g;
    },
    sirenStop: function () {
      if (!siren.osc) return;
      var o = siren.osc, l = siren.lfo, g = siren.gain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
      setTimeout(function () { try { o.stop(); l.stop(); } catch (e) {} }, 400);
      siren.osc = null; siren.lfo = null; siren.gain = null;
    }
  };

  G.radio = radio;
  G.unlockAudio = ensureCtx;
})();
