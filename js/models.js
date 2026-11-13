// ============ Tashqi 3D modellar (Kenney, CC0) ============
// Grafika rejimi: 'kenney' (yangi 3D modellar) yoki 'classic' (kod bilan yasalgan).
// Modellar assets/models/kenney.pack.gz da (tools/pack-models.js yasaydi).
// Yuklanmasa yoki brauzer gzip ocha olmasa — avtomatik klassik rejimga qaytadi.
window.G = window.G || {};

(function () {
  var KEY = 'tc_gfx';
  var mode = 'kenney';
  try {
    var saved = localStorage.getItem(KEY);
    if (saved === 'classic' || saved === 'kenney') mode = saved;
  } catch (e) {}
  var qs = location.search.match(/[?&]gfx=(classic|kenney)/);
  if (qs) mode = qs[1];
  G.GFX = mode;

  G.setGfx = function (m) {
    try { localStorage.setItem(KEY, m); } catch (e) {}
    location.reload();
  };

  // ---------- tayyorlik ----------
  var ready = false, cbs = [];
  G.whenModelsReady = function (cb) { if (ready) cb(); else cbs.push(cb); };
  function finish(ok) {
    if (!ok) G.GFX = 'classic';
    ready = true;
    setBtnLoading(false);
    updateGfxToggle();
    var list = cbs; cbs = [];
    list.forEach(function (cb) { cb(); });
  }

  // ---------- start ekranidagi tugmalar ----------
  var btnHtml = null;
  function setBtnLoading(on) {
    var b = document.getElementById('startBtn');
    if (!b) return;
    if (on) {
      if (btnHtml === null) btnHtml = b.innerHTML;
      b.disabled = true;
      b.classList.add('loading');
      b.innerHTML = '3D modellar yuklanmoqda…';
    } else if (btnHtml !== null) {
      b.disabled = false;
      b.classList.remove('loading');
      b.innerHTML = btnHtml;
    }
  }
  function updateGfxToggle() {
    var el = document.getElementById('gfxToggle');
    if (!el) return;
    var btns = el.querySelectorAll('button[data-gfx]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', btns[i].getAttribute('data-gfx') === G.GFX);
    }
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('#gfxToggle button[data-gfx]') : null;
    if (!t) return;
    var m = t.getAttribute('data-gfx');
    if (m !== G.GFX) G.setGfx(m);
  });

  // ---------- materiallar (har to'plamga bitta umumiy tekstura) ----------
  var kitMats = {};
  function kitMat(kit) {
    if (kitMats[kit]) return kitMats[kit];
    var tex = new THREE.TextureLoader().load('assets/models/colormap-' + kit + '.png');
    tex.flipY = false; // glTF UV koordinatalari
    kitMats[kit] = new THREE.MeshLambertMaterial({ map: tex });
    return kitMats[kit];
  }

  // ---------- pack o'qish ----------
  var RAW = {}; // 'car/sedan' -> [{node, t, geo}]
  function parsePack(buf) {
    var dv = new DataView(buf);
    var hlen = dv.getUint32(0, true);
    var header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hlen)));
    var binBase = 4 + hlen;
    Object.keys(header.models).forEach(function (name) {
      RAW[name] = header.models[name].map(function (p) {
        var geo = new THREE.BufferGeometry();
        if (p.qs) {
          // blender.pack: siqilgan (pozitsiya Int16 * qs metr, normal Int8)
          var qp = new Int16Array(buf, binBase + p.pos, p.n * 3), qn = new Int8Array(buf, binBase + p.nrm, p.n * 3);
          var fp = new Float32Array(p.n * 3), fn = new Float32Array(p.n * 3), k = p.qs / 32767;
          for (var qi = 0; qi < fp.length; qi++) { fp[qi] = qp[qi] * k; fn[qi] = qn[qi] / 127; }
          geo.setAttribute('position', new THREE.BufferAttribute(fp, 3));
          geo.setAttribute('normal', new THREE.BufferAttribute(fn, 3));
        } else {
          geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, binBase + p.pos, p.n * 3), 3));
          geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buf, binBase + p.nrm, p.n * 3), 3));
        }
        // 'vc' guruhi: oddiy ranglar uchlarda (bitta chizish chaqiruvi)
        if (p.col !== undefined) geo.setAttribute('color', new THREE.BufferAttribute(new Uint8Array(buf, binBase + p.col, p.n * 3), 3, true));
        if (p.uv !== undefined) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, binBase + p.uv, p.n * 2), 2));
        geo.setIndex(new THREE.BufferAttribute(new Uint16Array(buf, binBase + p.idx, p.ic), 1));
        // material guruhlari (cars.pack): har guruhga kalit — 'paint', 'glass', 'c:#hex', 'tex:atlas'...
        var keys = null;
        if (p.g) {
          keys = [];
          p.g.forEach(function (gr, i) { geo.addGroup(gr[0], gr[1], i); keys.push(gr[2]); });
        }
        return { node: p.node, t: p.t, geo: geo, keys: keys };
      });
    });
  }

  // ---------- ODAMLAR (Quaternius Ultimate Modular Men/Women, CC0) ----------
  // tools/pack-people.js: har odam 5 bo'lak (body, legL, legR, armL, armR) + pivot nuqtalari.
  // peds.js G.makeHuman bo'laklarni o'z pivotlariga qo'yadi -> eski animatsiyalar o'zgarmay ishlaydi.
  var PEOPLE = [];
  var peopleMat = null;
  function parsePeople(buf) {
    var dv = new DataView(buf);
    var hlen = dv.getUint32(0, true);
    var header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hlen)));
    var base = 4 + hlen;
    peopleMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    header.people.forEach(function (pp) {
      var geos = {};
      Object.keys(pp.parts).forEach(function (k) {
        var d = pp.parts[k];
        var qp = new Int16Array(buf, base + d.pos, d.n * 3), qn = new Int8Array(buf, base + d.nrm, d.n * 3);
        var pos = new Float32Array(d.n * 3), nrm = new Float32Array(d.n * 3), col = new Float32Array(d.n * 3);
        var qc = new Uint8Array(buf, base + d.col, d.n * 3);
        for (var i = 0; i < d.n * 3; i++) { pos[i] = qp[i] / 8000; nrm[i] = qn[i] / 127; col[i] = qc[i] / 255; }
        var g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
        g.setAttribute('color', new THREE.BufferAttribute(col, 3));
        g.setIndex(new THREE.BufferAttribute(new Uint16Array(buf, base + d.idx, d.ic), 1));
        geos[k] = g;
      });
      PEOPLE.push({ name: pp.name, female: pp.female, pivots: pp.pivots, geos: geos });
    });
  }
  // tasodifiy 3D odam (jinsi bo'yicha); yo'q bo'lsa null
  G.peopleModel = function (female) {
    if (G.GFX !== 'kenney' || !PEOPLE.length) return null;
    var pool = PEOPLE.filter(function (p) { return p.female === !!female; });
    var p = G.pick(pool.length ? pool : PEOPLE);
    return { pivots: p.pivots, geos: p.geos, mat: peopleMat };
  };

  function gunzip(buf) {
    var u8 = new Uint8Array(buf);
    if (!(u8[0] === 0x1f && u8[1] === 0x8b)) return Promise.resolve(buf); // server o'zi ochib bergan
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('DecompressionStream yo\'q'));
    var stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }

  function load() {
    setBtnLoading(true);
    var timer = setTimeout(function () { if (!ready) { console.warn('[models] vaqt tugadi — klassik grafika'); finish(false); } }, 25000);
    function getPack(url) {
      return fetch(url)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url); return r.arrayBuffer(); })
        .then(gunzip);
    }
    // odamlar ixtiyoriy: yuklanmasa oddiy odamchalar qoladi, 3D rejim buzilmaydi
    var people = getPack('assets/models/people.pack.gz?v=1').catch(function (e) {
      console.warn('[models] odamlar yuklanmadi:', e && e.message);
      return null;
    });
    // o'zimiz Blender'da yasagan modellar (tools/pack-blender.js) — ixtiyoriy
    var own = getPack('assets/models/blender.pack.gz?v=5').catch(function (e) {
      console.warn('[models] blender.pack yuklanmadi:', e && e.message);
      return null;
    });
    // hamma mashinalar endi o'zimizniki (blender.pack, tools/blender/cars.py) — eski Quaternius/RG paketi
    // (cars.pack, ~620 KB) faqat blender.pack yo'q bo'lsa kerak edi; telefon uchun yuklamaymiz
    var LEGACY_CARS = false;
    Promise.all([getPack('assets/models/kenney.pack.gz?v=2'), LEGACY_CARS ? getPack('assets/models/cars.pack.gz?v=1') : Promise.resolve(null), loadImages(), people, own])
      .then(function (res) {
        if (ready) return;
        parsePack(res[0]);
        if (res[1]) parsePack(res[1]);
        if (res[4]) parsePack(res[4]);
        if (res[3]) parsePeople(res[3]);
        kitMat('car');
        clearTimeout(timer);
        finish(true);
      })
      .catch(function (err) {
        console.warn('[models] yuklanmadi, klassik grafika:', err && err.message);
        clearTimeout(timer);
        if (!ready) finish(false);
      });
  }

  // ---------- REALISTIK FASADLAR (Quaternius Downtown City MegaKit teksturalari, CC0) ----------
  // Binolar oddiy quti bo'lib qoladi (12 uchburchak), realizm — teksturada:
  // haqiqiy g'isht/beton/suvoq devor, ortida xona ko'rinadigan derazalar, karniz, vitrina.
  var TEX_NAMES = ['brick', 'concrete', 'metal', 'plaster', 'slate', 'int1', 'int2', 'int3'];
  var IMG = {};
  function loadImages() {
    return Promise.all(TEX_NAMES.map(function (n) {
      return new Promise(function (res, rej) {
        var im = new Image();
        im.onload = function () { IMG[n] = im; res(); };
        im.onerror = function () { rej(new Error('tekstura: ' + n)); };
        im.src = 'assets/textures/' + n + '.jpg?v=1';
      });
    }));
  }

  // deterministik "tasodif" (bir xil kalit — bir xil fasad)
  function rng(seed) {
    var s = 0;
    for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;
    return function () { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) % 10000) / 10000; };
  }
  function hexToRgb(h) {
    var n = parseInt(String(h).replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  // devor naqshi: tekstura plitkasi (tileH px balandlikda), baseColor bilan bo'yaladi
  function wallPattern(ctx, name, tileH, tint, tintAlpha) {
    var im = IMG[name];
    var t = document.createElement('canvas');
    t.width = Math.max(8, Math.round(tileH)); t.height = Math.max(8, Math.round(tileH));
    var c = t.getContext('2d');
    c.drawImage(im, 0, 0, t.width, t.height);
    if (tint) {
      c.globalCompositeOperation = 'multiply';
      c.globalAlpha = tintAlpha;
      c.fillStyle = tint;
      c.fillRect(0, 0, t.width, t.height);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    }
    return ctx.createPattern(t, 'repeat');
  }
  function drawWindow(ctx, x, y, w, h, r, frame, opts) {
    opts = opts || {};
    // ramka + tokcha
    ctx.fillStyle = frame;
    ctx.fillRect(x - w * 0.06, y - h * 0.05, w * 1.12, h * 1.1);
    ctx.fillStyle = 'rgba(235,230,215,0.9)';
    ctx.fillRect(x - w * 0.1, y + h * 1.03, w * 1.2, Math.max(2, h * 0.06));
    // ichkari (xona surati)
    var im = IMG[r() < 0.45 ? 'int3' : (r() < 0.5 ? 'int1' : 'int2')];
    ctx.drawImage(im, x, y, w, h);
    // oyna: osmon aksi + qorong'ilik
    var g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, opts.glass || 'rgba(170,200,230,0.42)');
    g.addColorStop(1, 'rgba(15,22,32,0.38)');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    // parda/jalyuzi (ba'zilarida)
    var cr = r();
    if (cr < 0.22) {
      ctx.fillStyle = 'rgba(232,222,196,0.88)';
      ctx.fillRect(x, y, w, h * (0.35 + r() * 0.5));
    } else if (cr < 0.32) {
      ctx.fillStyle = 'rgba(200,205,210,0.8)';
      for (var b = 0; b < h; b += 3) ctx.fillRect(x, y + b, w, 1.4);
    }
    // ko'zgu yaltirashi
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.15, y); ctx.lineTo(x + w * 0.45, y); ctx.lineTo(x + w * 0.1, y + h); ctx.lineTo(x, y + h);
    ctx.closePath(); ctx.fill();
    // romlar
    ctx.fillStyle = frame;
    var mw = Math.max(1, w * 0.05);
    ctx.fillRect(x + w / 2 - mw / 2, y, mw, h);
    if (!opts.noTransom) ctx.fillRect(x, y + h * 0.32, w, mw);
  }

  // style: 'panelka' | 'flat' | 'glass' | 'house'
  function realFacade(baseColor, floors, cols, style) {
    var r = rng(baseColor + floors + cols + style);
    var S = G.IS_TOUCH ? 256 : 512;
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    var ctx = cv.getContext('2d');
    var fh = S / floors, fw = S / cols;

    if (style === 'glass') {
      // zamonaviy ofis: shisha devor, metall romlar
      ctx.fillStyle = '#3a4048';
      ctx.fillRect(0, 0, S, S);
      for (var f = 0; f < floors; f++) {
        for (var c = 0; c < cols; c++) {
          drawWindow(ctx, c * fw + fw * 0.04, f * fh + fh * 0.06, fw * 0.92, fh * 0.82, r, '#5b6570',
            { glass: 'rgba(90,150,200,0.62)', noTransom: true });
        }
        ctx.fillStyle = '#6b737c';
        ctx.fillRect(0, f * fh + fh * 0.9, S, fh * 0.1);
      }
      return new THREE.CanvasTexture(cv);
    }

    // devor materiali
    var wall, tint = baseColor, tintA = 0.35;
    if (style === 'panelka') { wall = 'concrete'; tintA = 0.55; }
    else if (style === 'house') { wall = r() < 0.5 ? 'brick' : 'plaster'; tintA = wall === 'brick' ? 0.15 : 0.45; }
    else { var pick = r(); wall = pick < 0.45 ? 'brick' : (pick < 0.8 ? 'plaster' : 'concrete'); tintA = wall === 'brick' ? 0.12 : 0.4; }
    ctx.fillStyle = wallPattern(ctx, wall, Math.min(fh, fw) * 1.6, tint, tintA);
    ctx.fillRect(0, 0, S, S);

    var frame = style === 'panelka' ? '#e6e3dc' : (r() < 0.5 ? '#2c2c2e' : '#ece4d0');
    for (var f2 = 0; f2 < floors; f2++) {
      var ground = f2 === floors - 1;
      // panelka choklari
      if (style === 'panelka') {
        ctx.strokeStyle = 'rgba(40,40,40,0.35)';
        ctx.lineWidth = Math.max(1, S / 300);
        ctx.strokeRect(0, f2 * fh, S, fh);
        for (var cc = 0; cc <= cols; cc++) { ctx.beginPath(); ctx.moveTo(cc * fw, f2 * fh); ctx.lineTo(cc * fw, (f2 + 1) * fh); ctx.stroke(); }
      }
      if (ground && style === 'flat') {
        // birinchi qavat: metall-beton vitrina
        ctx.fillStyle = wallPattern(ctx, 'metal', fh, null, 0);
        ctx.fillRect(0, f2 * fh, S, fh);
        for (var c2 = 0; c2 < cols; c2++) {
          if (r() < 0.25) {
            ctx.fillStyle = '#3b2f28';
            ctx.fillRect(c2 * fw + fw * 0.3, f2 * fh + fh * 0.25, fw * 0.4, fh * 0.75); // eshik
          } else {
            drawWindow(ctx, c2 * fw + fw * 0.08, f2 * fh + fh * 0.2, fw * 0.84, fh * 0.66, r, '#1e1f22', { noTransom: true });
          }
        }
        continue;
      }
      for (var c3 = 0; c3 < cols; c3++) {
        if (style === 'house' && ground && c3 === Math.floor(cols / 2)) {
          ctx.fillStyle = '#5a3a24';
          ctx.fillRect(c3 * fw + fw * 0.3, f2 * fh + fh * 0.28, fw * 0.4, fh * 0.72); // eshik
          continue;
        }
        drawWindow(ctx, c3 * fw + fw * 0.24, f2 * fh + fh * 0.22, fw * 0.52, fh * 0.55, r, frame);
        // panelka balkoni (ba'zi qavatlarda)
        if (style === 'panelka' && !ground && c3 % 3 === 1 && r() < 0.6) {
          ctx.fillStyle = 'rgba(205,200,190,0.95)';
          ctx.fillRect(c3 * fw + fw * 0.08, f2 * fh + fh * 0.62, fw * 0.84, fh * 0.34);
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(c3 * fw + fw * 0.08, f2 * fh + fh * 0.62, fw * 0.84, Math.max(1, fh * 0.04));
        }
      }
      // qavatlar orasidagi tasma
      if (style === 'flat' && !ground) {
        ctx.fillStyle = 'rgba(230,224,208,0.55)';
        ctx.fillRect(0, (f2 + 1) * fh - fh * 0.05, S, fh * 0.05);
      }
    }
    // karniz (tepada) + yer yaqinidagi soya
    ctx.fillStyle = style === 'panelka' ? 'rgba(60,60,60,0.5)' : 'rgba(236,228,208,0.95)';
    ctx.fillRect(0, 0, S, Math.max(3, fh * 0.12));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, Math.max(3, fh * 0.12), S, Math.max(1, fh * 0.03));
    var sh = ctx.createLinearGradient(0, S - fh * 0.5, 0, S);
    sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, S - fh * 0.5, S, fh * 0.5);
    return new THREE.CanvasTexture(cv);
  }

  // util.js dagi oddiy fasad generatorini 3D rejimda realistik bilan almashtiramiz
  var plainBuildingTexture = G.buildingTexture;
  var realCache = {};
  G.buildingTexture = function (baseColor, floors, cols, style) {
    if (G.GFX !== 'kenney' || !IMG.brick) return plainBuildingTexture(baseColor, floors, cols, style);
    var key = baseColor + '_' + floors + '_' + cols + '_' + style;
    if (!realCache[key]) realCache[key] = realFacade(baseColor, floors, cols, style);
    return realCache[key];
  };
  // tom uchun shifer teksturasi
  G.roofTexture = function () {
    if (G.GFX !== 'kenney' || !IMG.slate) return null;
    if (realCache._slate) return realCache._slate;
    var t = new THREE.CanvasTexture(IMG.slate);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    realCache._slate = t;
    return t;
  };

  // ---------- MASHINALAR ----------
  // Asosiy: Quaternius "Realistic Car Pack" (q/...), xizmat mashinalari: RG Poly (rg/...),
  // Damas: o'zimizning Blender modeli (b/damas), bo'lmasa Kenney furgoni (car/van). spec.model bilan aniq model berish mumkin.
  function slug(name) { return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }
  function carModelFor(name, spec, variant) {
    if (variant === 'police') return RAW['b/malibu2_police'] ? 'b/malibu2_police' : 'q/Cop';
    if (variant === 'taxi') return 'q/Taxi';
    if (spec.model && /^b\//.test(spec.model)) return spec.model;
    if (RAW['b/' + slug(name)]) return 'b/' + slug(name);   // tools/blender/cars.py avtomatik modellari
    if (spec.model) return spec.model;
    if (spec.type === 'van') return RAW['b/damas'] ? 'b/damas' : 'car/van';
    if (spec.type === 'hatch') return 'q/NormalCar2';
    if (spec.type === 'suv') return 'q/SUV';
    if (spec.premium) return /R8|M8|RS7|Arteon/.test(name) ? 'q/SportsCar' : 'q/SportsCar2';
    return 'q/NormalCar1';
  }

  // umumiy materiallar (kalit bo'yicha); 'paint' — har mashinaga alohida
  var sharedMats = {};
  function matFor(key, paint) {
    if (key === 'paint') return paint;
    if (sharedMats[key]) return sharedMats[key];
    var m;
    if (key === 'glass') m = new THREE.MeshPhongMaterial({ color: 0x18202a, shininess: 120, specular: 0x8899aa });
    else if (key === 'vc') m = new THREE.MeshLambertMaterial({ vertexColors: true });
    else if (key === 'hl') m = G.headlightMat || (G.headlightMat = new THREE.MeshLambertMaterial({ color: 0xfff8dc, emissive: 0x8a8158 }));
    else if (key === 'tl') m = G.taillightMat || (G.taillightMat = new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x701414 }));
    else if (key.indexOf('c:') === 0) m = new THREE.MeshLambertMaterial({ color: key.slice(2) });
    else if (key.indexOf('tex:') === 0) {
      var tex = new THREE.TextureLoader().load('assets/models/rg-' + key.slice(4) + '.png');
      tex.flipY = false;
      m = new THREE.MeshLambertMaterial({ map: tex });
    } else if (key.indexOf('kit:') === 0) m = kitMat(key.slice(4));
    else m = G.mat(0x888888);
    sharedMats[key] = m;
    return m;
  }
  function matsFor(keys, paint) { return keys.map(function (k) { return matFor(k, paint); }); }
  function oneOrMany(keys, paint) {
    if (!keys) return matFor('kit:car', paint);
    return keys.length === 1 ? matFor(keys[0], paint) : matsFor(keys, paint);
  }

  var carCache = {};
  function prepCar(model) {
    if (carCache[model]) return carCache[model];
    var parts = RAW[model];
    if (!parts) return null;
    var body = null, extras = [], wheels = [];
    parts.forEach(function (p) {
      if (/^wheel/.test(p.node)) wheels.push(p);
      else if (p.node === 'body') body = p;
      else extras.push(p);
    });
    if (!body) return null;

    var geo, keys;
    if (body.keys) {
      // cars.pack: guruhlar va material kalitlari tayyor
      geo = body.geo;
      keys = body.keys;
    } else {
      // Kenney: bo'yoq = palitraning 2-qatoridagi eng ko'p ishlatilgan katak
      geo = body.geo.clone();
      var idx = geo.index.array, uv = geo.attributes.uv.array;
      var triCount = idx.length / 3, cellOf = new Array(triCount), hist = {};
      for (var t = 0; t < triCount; t++) {
        var v = idx[t * 3];
        var key = Math.floor(uv[v * 2] * 16) + ',' + Math.floor(uv[v * 2 + 1] * 4);
        cellOf[t] = key;
        if (/,1$/.test(key)) hist[key] = (hist[key] || 0) + 1;
      }
      var paintKey = null, best = 0;
      Object.keys(hist).forEach(function (k) { if (hist[k] > best) { best = hist[k]; paintKey = k; } });
      var paintIdx = [], restIdx = [];
      for (var t2 = 0; t2 < triCount; t2++) {
        var dst = cellOf[t2] === paintKey ? paintIdx : restIdx;
        dst.push(idx[t2 * 3], idx[t2 * 3 + 1], idx[t2 * 3 + 2]);
      }
      geo.setIndex(paintIdx.concat(restIdx));
      geo.clearGroups();
      geo.addGroup(0, paintIdx.length, 1);
      geo.addGroup(paintIdx.length, restIdx.length, 0);
      keys = ['kit:car', 'paint'];
    }
    geo.computeBoundingBox();
    var bb = geo.boundingBox;
    var kitKey = /^car\//.test(model) ? ['kit:car'] : null;

    var info = {
      body: geo, keys: keys,
      hasLights: keys.indexOf('hl') >= 0,
      extras: extras.map(function (p) { return { geo: p.geo, keys: p.keys || kitKey }; }),
      wheels: wheels.map(function (p) {
        var g = p.geo.clone();
        g.translate(-p.t[0], -p.t[1], -p.t[2]);
        return { geo: g, keys: p.keys || kitKey, t: p.t, front: /front/.test(p.node) };
      }),
      kW: bb.max.x - bb.min.x, kH: bb.max.y, kL: bb.max.z - bb.min.z,
      zMid: (bb.max.z + bb.min.z) / 2, zMax: bb.max.z, zMin: bb.min.z
    };
    carCache[model] = info;
    return info;
  }

  // bamper (shikastda tushadi) — Kenney "debris-bumper"
  var bumperGeo = null;
  function getBumperGeo() {
    if (bumperGeo) return bumperGeo;
    var p = RAW['car/debris-bumper'];
    if (!p) return null;
    bumperGeo = p[0].geo.clone();
    bumperGeo.computeBoundingBox();
    var bb = bumperGeo.boundingBox;
    bumperGeo.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
    bumperGeo.scale(1.25, 1.25, 1.25);
    return bumperGeo;
  }

  // ---------- ASL SIFATDAGI MODELLAR (yuklab olingan, GLTFLoader + Draco, fonda) ----------
  // tools/blender/import_full.py: 'body' + 'wheel-front-left' ... tugunlari, metrda, +Z oldinga.
  // Og'ir (yuz minglab uchburchak) — o'yin ochilishini kutmaydi; tayyor bo'lgach trafikdagi bitta mashina almashtiriladi.
  var FULL = {}, FULL_LOD = {};
  var LOD_DIST = 42;   // shu masofadan uzoqda mashinalar yengil nusxada chiziladi
  G.loadFullCars = function () {
    if (G.GFX !== 'kenney' || !THREE.GLTFLoader || !G.FULL_NAMES) return;
    var loader = new THREE.GLTFLoader();
    if (THREE.DRACOLoader) {
      var draco = new THREE.DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
      loader.setDRACOLoader(draco);
    }
    G.FULL_NAMES.forEach(function (name) {
      var t0 = performance.now();
      loader.load(G.CAR_SPECS[name].full, function (gltf) {
        var tris = 0;
        gltf.scene.traverse(function (o) {
          if (o.isMesh) {
            o.castShadow = true;
            // metall bo'yoq aks ettirishi uchun osmon-yer muhiti (asl ko'rinishga yaqin)
            var env = fullEnvMap();
            (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) {
              if (m && m.isMeshStandardMaterial && env) { m.envMap = env; m.envMapIntensity = 1.0; m.needsUpdate = true; }
            });
            tris += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3;
          }
        });
        FULL[name] = gltf.scene;
        console.log('[models] asl model tayyor:', name, Math.round(tris) + ' uchburchak,', Math.round(performance.now() - t0) + ' ms');
        // LOD nusxa (teksturasiz fayl) — materiallar asl modeldan nom bo'yicha olinadi
        var byName = {};
        gltf.scene.traverse(function (o) {
          if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { byName[m.name] = m; });
        });
        loader.load(G.CAR_SPECS[name].full.replace('.glb', '_lod.glb'), function (lg) {
          lg.scene.traverse(function (o) {
            if (!o.isMesh) return;
            o.castShadow = true;
            o.material = Array.isArray(o.material) ? o.material.map(function (m) { return byName[m.name] || m; }) : (byName[o.material.name] || o.material);
          });
          FULL_LOD[name] = lg.scene;
          if (G.swapInFullCar) G.swapInFullCar(name);
        }, undefined, function () { if (G.swapInFullCar) G.swapInFullCar(name); });
      }, undefined, function (e) { console.warn('[models] asl model yuklanmadi:', name, e && e.message); });
    });
  };
  G.fullCarReady = function (name) { return !!FULL[name]; };
  // oddiy osmon/ufq/yer gradientidan PMREM muhit xaritasi (bir marta)
  var envTex = null;
  function fullEnvMap() {
    if (envTex || !G.debug || !G.debug.renderer) return envTex;
    var es = new THREE.Scene();
    var g = new THREE.SphereGeometry(50, 32, 16);
    var cols = [], pos = g.attributes.position, c = new THREE.Color();
    var sky = new THREE.Color(0x9ccbf0), hor = new THREE.Color(0xf2f4f6), gnd = new THREE.Color(0x6b6f74);
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i) / 50;
      if (y >= 0) c.copy(hor).lerp(sky, Math.pow(y, 0.6)); else c.copy(hor).lerp(gnd, Math.min(1, -y * 3));
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    var pm = new THREE.PMREMGenerator(G.debug.renderer);
    envTex = pm.fromScene(es, 0.02).texture;
    pm.dispose();
    return envTex;
  }
  function fullCarMesh(name, color) {
    var s = G.CAR_SPECS[name];
    var root = new THREE.Group();
    var inner = FULL[name].clone(true);   // geometriya va materiallar umumiy (xotira tejaladi)
    inner.rotation.y = Math.PI / 2;        // model +Z oldinga, o'yin +X oldinga
    if (FULL_LOD[name]) {
      var low = FULL_LOD[name].clone(true);
      low.rotation.y = Math.PI / 2;
      var lod = new THREE.LOD();
      lod.addLevel(inner, 0);
      lod.addLevel(low, LOD_DIST);
      root.add(lod);
    } else {
      root.add(inner);
    }
    var wheelsF = [];
    inner.traverse(function (o) { if (/^wheel-front/.test(o.name)) wheelsF.push(o); });
    root.userData.spec = s;
    root.userData.name = name;
    root.userData.color = color;
    root.userData.bodyMat = new THREE.MeshPhongMaterial({ color: color }); // shikast rangi uchun (asl bo'yoq o'zgarmaydi)
    root.userData.wheelsF = wheelsF;
    root.userData.kenney = true;
    root.userData.full = true;
    root.userData.driverEye = new THREE.Vector3(s.wsB * s.len / 2 - 0.55, s.hoodH + 0.38, -s.wid * 0.20);
    return root;
  }

  // 3D model mashinasi — vehicles.js dagi createCarMesh bilan bir xil interfeys
  // (userData: spec, name, color, wheelsF, driverEye, bodyMat, bumpF, bumpR)
  G.kenneyCarMesh = function (name, color, variant, forceModel) {
    var s = G.CAR_SPECS[name];
    if (s.full) return FULL[name] ? fullCarMesh(name, color) : null;
    var modelKey = forceModel || carModelFor(name, s, variant);
    var info = prepCar(modelKey);
    if (!info) return null;
    var paint = new THREE.MeshPhongMaterial({ color: color, shininess: 90, specular: 0x666666 });

    var root = new THREE.Group();
    // modellar: +Z oldinga, X — eni. O'yin: +X oldinga, Z — eni.
    var inner = new THREE.Group();
    inner.rotation.y = Math.PI / 2;
    root.add(inner);

    // o'zimizning Blender modellari (b/...) haqiqiy metrda — cho'zmaymiz (ko'zgu/qanot o'lchamni buzmasin)
    var trueSize = /^b\//.test(modelKey);
    var sx = trueSize ? 1 : s.wid / info.kW, sy = trueSize ? 1 : s.roofH / info.kH, sz = trueSize ? 1 : s.len / info.kL;
    var body = new THREE.Mesh(info.body, matsFor(info.keys, paint));
    body.scale.set(sx, sy, sz);
    body.position.z = -info.zMid * sz; // uzunlik bo'yicha markazlash
    body.castShadow = true;
    inner.add(body);
    info.extras.forEach(function (e) {
      var m = new THREE.Mesh(e.geo, oneOrMany(e.keys, paint));
      m.scale.copy(body.scale);
      m.position.copy(body.position);
      inner.add(m);
    });

    // g'ildiraklar: bir xil (aylana) masshtab, joyi kuzov masshtabida
    var ws = Math.min(sy, sz) * 0.98;
    var wheelsF = [];
    info.wheels.forEach(function (w) {
      var pivot = new THREE.Group();
      pivot.position.set(w.t[0] * sx, w.t[1] * ws, w.t[2] * sz + body.position.z);
      var wm = new THREE.Mesh(w.geo, oneOrMany(w.keys, paint));
      wm.scale.set(ws, ws, ws);
      pivot.add(wm);
      inner.add(pivot);
      if (w.front) wheelsF.push(pivot);
    });

    // LOD: uzoqda yengil nusxa (g'ildiraklar kuzovga qo'shilgan, ~1,4k uchburchak) — telefon uchun asosiy tejash
    var lodRaw = trueSize && RAW[modelKey + '_lod'];
    if (lodRaw && lodRaw[0]) {
      var lp = lodRaw[0];
      var low = new THREE.Group();
      low.rotation.y = Math.PI / 2;
      var lm = new THREE.Mesh(lp.geo, lp.keys ? matsFor(lp.keys, paint) : paint);
      lm.position.z = body.position.z;
      lm.castShadow = true;
      low.add(lm);
      root.remove(inner);
      var lod = new THREE.LOD();
      lod.addLevel(inner, 0);
      lod.addLevel(low, LOD_DIST);
      root.add(lod);
    }

    // tushadigan bamperlar (ko'rinmas — kuzovda bamper bor; urilganda nusxasi uchib ketadi)
    var bg = getBumperGeo();
    var bumps = {};
    if (bg) {
      // to'g'ridan-to'g'ri root'ga (damage.js repairCar ularni car.mesh'ga qaytaradi)
      [['F', info.zMax, Math.PI / 2], ['R', info.zMin, -Math.PI / 2]].forEach(function (b) {
        var bm = new THREE.Mesh(bg, paint);
        bm.visible = false;
        bm.position.set((b[1] - info.zMid) * sz, 0.22 * sy, 0);
        bm.rotation.y = b[2];
        root.add(bm);
        bumps[b[0]] = bm;
      });
    }

    // tungi faralar — modelda o'z faralari bo'lmasa qo'shamiz (umumiy materiallar)
    var L2 = s.len / 2, W = s.wid;
    if (!info.hasLights) {
      var hlMat = matFor('hl'), tlMat = matFor('tl');
      [W * 0.3, -W * 0.3].forEach(function (z) {
        var hl = G.box(0.05, 0.1, 0.28, hlMat);
        hl.position.set(L2 + 0.01, 0.62 * sy, z);
        root.add(hl);
        var tl = G.box(0.05, 0.1, 0.26, tlMat);
        tl.position.set(-L2 - 0.01, 0.7 * sy, z);
        root.add(tl);
      });
    }

    root.userData.spec = s;
    root.userData.name = name;
    root.userData.color = color;
    root.userData.bodyMat = paint;
    root.userData.bumpF = bumps.F;
    root.userData.bumpR = bumps.R;
    root.userData.wheelsF = wheelsF;
    root.userData.kenney = true;
    root.userData.driverEye = new THREE.Vector3(s.wsB * L2 - 0.55, s.hoodH + 0.38, -W * 0.20);
    return root;
  };
  // tekshiruv/ko'rgazma uchun: mavjud mashina modellari
  G.carModelKeys = function () { return Object.keys(RAW).filter(function (k) { return /^(q|rg|b)\//.test(k) || k === 'car/van'; }); };

  if (G.GFX === 'kenney') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
    else load();
  } else {
    // klassik — darhol tayyor (main.js keyinroq ro'yxatdan o'tadi)
    setTimeout(function () { finish(true); }, 0);
    ready = true;
  }
})();
