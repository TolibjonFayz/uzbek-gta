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
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, binBase + p.pos, p.n * 3), 3));
        geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buf, binBase + p.nrm, p.n * 3), 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buf, binBase + p.uv, p.n * 2), 2));
        geo.setIndex(new THREE.BufferAttribute(new Uint16Array(buf, binBase + p.idx, p.ic), 1));
        return { node: p.node, t: p.t, geo: geo };
      });
    });
  }

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
    fetch('assets/models/kenney.pack.gz?v=1')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
      .then(gunzip)
      .then(function (buf) {
        if (ready) return;
        parsePack(buf);
        ['car', 'city', 'sub'].forEach(kitMat);
        clearTimeout(timer);
        finish(true);
      })
      .catch(function (err) {
        console.warn('[models] yuklanmadi, klassik grafika:', err && err.message);
        clearTimeout(timer);
        if (!ready) finish(false);
      });
  }

  // ---------- BINOLAR ----------
  // Bitta mesh'li model: geometriya + o'lchamlar (Kenney birligida)
  var bCache = {};
  G.kenneyBuilding = function (name) {
    if (bCache[name]) return bCache[name];
    var parts = RAW[name];
    if (!parts || !parts.length) return null;
    var geo = parts[0].geo;
    geo.computeBoundingBox();
    var bb = geo.boundingBox;
    bCache[name] = {
      geo: geo, mat: kitMat(name.split('/')[0]),
      w: bb.max.x - bb.min.x, h: bb.max.y - bb.min.y, d: bb.max.z - bb.min.z,
      cx: (bb.max.x + bb.min.x) / 2, cz: (bb.max.z + bb.min.z) / 2
    };
    return bCache[name];
  };
  G.KENNEY_OFFICE = ['a', 'b', 'c', 'd', 'f', 'g', 'h', 'i', 'l', 'm', 'skyscraper-a', 'skyscraper-b', 'skyscraper-c', 'skyscraper-d', 'skyscraper-e']
    .map(function (s) { return 'city/building-' + s; });
  G.KENNEY_WIDE = ['e', 'j', 'k', 'n'].map(function (s) { return 'city/building-' + s; });
  G.KENNEY_HOUSE = 'abcdefghijklmnopqrstu'.split('').map(function (c) { return 'sub/building-type-' + c; });

  // ---------- MASHINALAR ----------
  function carModelFor(spec, variant) {
    if (variant === 'police') return 'car/police';
    if (variant === 'taxi') return 'car/taxi';
    if (spec.type === 'van') return 'car/van';
    if (spec.type === 'hatch') return 'car/hatchback-sports';
    if (spec.type === 'suv') return spec.premium ? 'car/suv-luxury' : 'car/suv';
    return spec.premium ? 'car/sedan-sports' : 'car/sedan';
  }

  // Kuzovni 2 guruhga ajratamiz: bo'yoq (o'yin rangi) va qolgani (Kenney teksturasi).
  // Bo'yoq = palitraning 2-qatoridagi eng ko'p ishlatilgan katak.
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

    var geo = body.geo.clone();
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
    geo.computeBoundingBox();
    var bb = geo.boundingBox;

    var info = {
      body: geo,
      extras: extras.map(function (p) { return p.geo; }),
      wheels: wheels.map(function (p) {
        var g = p.geo.clone();
        g.translate(-p.t[0], -p.t[1], -p.t[2]);
        return { geo: g, t: p.t, front: /front/.test(p.node) };
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

  // Kenney mashinasi — vehicles.js dagi createCarMesh bilan bir xil interfeys
  // (userData: spec, name, color, wheelsF, driverEye, bodyMat, bumpF, bumpR)
  G.kenneyCarMesh = function (name, color, variant) {
    var s = G.CAR_SPECS[name];
    var info = prepCar(carModelFor(s, variant));
    if (!info) return null;
    var mat = kitMat('car');
    var paint = new THREE.MeshPhongMaterial({ color: color, shininess: 90, specular: 0x666666 });

    var root = new THREE.Group();
    // Kenney: +Z oldinga, X — eni. O'yin: +X oldinga, Z — eni.
    var inner = new THREE.Group();
    inner.rotation.y = Math.PI / 2;
    root.add(inner);

    var sx = s.wid / info.kW, sy = s.roofH / info.kH, sz = s.len / info.kL;
    var body = new THREE.Mesh(info.body, [mat, paint]);
    body.scale.set(sx, sy, sz);
    body.position.z = -info.zMid * sz; // uzunlik bo'yicha markazlash
    body.castShadow = true;
    inner.add(body);
    info.extras.forEach(function (g) {
      var m = new THREE.Mesh(g, mat);
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
      var wm = new THREE.Mesh(w.geo, mat);
      wm.scale.set(ws, ws, ws);
      pivot.add(wm);
      inner.add(pivot);
      if (w.front) wheelsF.push(pivot);
    });

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

    // tungi faralar (umumiy materiallar — kun/tun tizimi yoritadi)
    var L2 = s.len / 2, W = s.wid;
    var hlMat = G.headlightMat || (G.headlightMat = new THREE.MeshLambertMaterial({ color: 0xfff8dc, emissive: 0x8a8158 }));
    var tlMat = G.taillightMat || (G.taillightMat = new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x701414 }));
    [W * 0.3, -W * 0.3].forEach(function (z) {
      var hl = G.box(0.05, 0.1, 0.28, hlMat);
      hl.position.set(L2 + 0.01, 0.62 * sy, z);
      root.add(hl);
      var tl = G.box(0.05, 0.1, 0.26, tlMat);
      tl.position.set(-L2 - 0.01, 0.7 * sy, z);
      root.add(tl);
    });

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

  if (G.GFX === 'kenney') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load);
    else load();
  } else {
    // klassik — darhol tayyor (main.js keyinroq ro'yxatdan o'tadi)
    setTimeout(function () { finish(true); }, 0);
    ready = true;
  }
})();
