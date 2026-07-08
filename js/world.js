// ============ TOSHKENT SHAHRI XARITASI v3 (2400x2400 m) ============
// Tumanlar: Markaz, Yunusobod, Chilonzor, Eski shahar, Mirzo Ulug'bek, Sergeli
// + Aeroport, Vokzal, Magic City, Hazrati Imom, Mega Planet va boshqalar
window.G = window.G || {};

(function () {
  var MAP = 2500; // xarita 5000x5000 m (~5 barobar katta)

  G.ROADS = {
    v: [
      { x: -2400, halfW: 10, ring: true }, { x: -1900, halfW: 8 }, { x: -1400, halfW: 9 },
      { x: -1000, halfW: 10 }, { x: -750, halfW: 8 }, { x: -450, halfW: 9 },
      { x: -150, halfW: 8 },
      { x: 0, halfW: 14, main: true, name: "Amir Temur shoh ko'chasi" },
      { x: 150, halfW: 8 }, { x: 450, halfW: 9 }, { x: 750, halfW: 8 },
      { x: 1000, halfW: 10 }, { x: 1400, halfW: 9 }, { x: 1900, halfW: 8 },
      { x: 2400, halfW: 10, ring: true }
    ],
    h: [
      { z: -2400, halfW: 10, ring: true }, { z: -1900, halfW: 8 }, { z: -1400, halfW: 9 },
      { z: -1000, halfW: 10 }, { z: -750, halfW: 8 }, { z: -450, halfW: 9 },
      { z: -150, halfW: 8 },
      { z: 0, halfW: 14, main: true, name: "Navoiy shoh ko'chasi" },
      { z: 150, halfW: 8 }, { z: 450, halfW: 9 }, { z: 750, halfW: 8 },
      { z: 1000, halfW: 10 }, { z: 1400, halfW: 9 }, { z: 1900, halfW: 8 },
      { z: 2400, halfW: 10, ring: true }
    ]
  };

  var LIT = [-450, -150, 0, 150, 450];
  G.LIGHTED = [];
  LIT.forEach(function (ix) { LIT.forEach(function (iz) { G.LIGHTED.push({ x: ix, z: iz }); }); });

  G.pedSegments = [];
  G.crossings = [];
  G.interiorNPCs = [];
  G.landmarks = [];
  G.lightPoles = [];
  G.animated = [];
  G.foodShops = [];
  G.stations = []; // benzokolonka / tuzatish stansiyalari

  // do'kon menyulari (narx so'mda, energiya 0..100)
  G.SHOP_MENUS = {
    fastfood: [
      { n: "Lavash", p: 22000, e: 30 },
      { n: "Gamburger", p: 28000, e: 32 },
      { n: "Hot-dog", p: 15000, e: 20 },
      { n: "Shaurma", p: 24000, e: 30 },
      { n: "Kartoshka fri", p: 15000, e: 15 },
      { n: "Cola", p: 8000, e: 8 }
    ],
    oshxona: [
      { n: "Osh (palov)", p: 30000, e: 45 },
      { n: "Lag'mon", p: 28000, e: 38 },
      { n: "Somsa", p: 6000, e: 14 },
      { n: "Shashlik", p: 15000, e: 25 },
      { n: "Manti", p: 25000, e: 35 },
      { n: "Choy", p: 3000, e: 5 }
    ],
    choyxona: [
      { n: "Osh (palov)", p: 28000, e: 45 },
      { n: "Shashlik", p: 15000, e: 25 },
      { n: "Somsa", p: 6000, e: 14 },
      { n: "Non", p: 4000, e: 10 },
      { n: "Choy", p: 3000, e: 5 }
    ],
    market: [
      { n: "Non", p: 4000, e: 10 },
      { n: "Meva", p: 12000, e: 18 },
      { n: "Shirinlik", p: 10000, e: 14 },
      { n: "Cola", p: 8000, e: 8 },
      { n: "Suv", p: 3000, e: 4 }
    ]
  };
  G.districts = [
    { x: 0, z: 0, r: 320, name: 'Shahar markazi' },
    { x: 0, z: -650, r: 330, name: 'Yunusobod' },
    { x: -650, z: 550, r: 380, name: 'Chilonzor' },
    { x: -650, z: -600, r: 350, name: 'Eski shahar' },
    { x: 680, z: -200, r: 330, name: "Mirzo Ulug'bek" },
    { x: 420, z: 830, r: 320, name: 'Sergeli' },
    { x: 300, z: 1060, r: 220, name: 'Toshkent aeroporti' },
    { x: 350, z: 450, r: 200, name: 'Mirobod' },
    // Yangi O'zbekiston tomoni (sharq) + g'arbiy dala hovlilar
    { x: 1650, z: -300, r: 430, name: "Yangi O'zbekiston bog'i" },
    { x: 1650, z: -1600, r: 480, name: 'Olimpiya shaharchasi' },
    { x: 1650, z: 600, r: 550, name: 'Yangi Shahar' },
    { x: -1650, z: 200, r: 480, name: "G'arbiy dala hovli" }
  ];

  // minimapda diqqatga sazovor joylar uchun iconlar (nom bo'yicha)
  G.LANDMARK_ICONS = {
    'Benzokolonka': '⛽',
    'Avto servis': '🔧',
    'Amir Temur maydoni': '🐎',
    'Hotel Uzbekistan': '🏨',
    'Toshkent Teleminorasi': '📡',
    'Chorsu bozori': '🛒',
    'Minor masjidi': '🕌',
    'Tashkent City': '🏙️',
    'Mustaqillik maydoni': '🏛️',
    'Humo Arena': '🏟️',
    'Bunyodkor stadioni': '⚽',
    'Hazrati Imom majmuasi': '🕌',
    'Magic City': '🎡',
    'Mega Planet': '🛍️',
    'Navoiy teatri': '🎭',
    'Toshkent vokzali': '🚆',
    'Toshkent aeroporti': '✈️',
    'Anhor kanali': '🌊',
    'Kukeldash madrasasi': '🕌',
    "Milliy bog'": '🌳',
    "Botanika bog'i": '🌿',
    "Yangi O'zbekiston bog'i": '🕊️',
    'Olimpiya stadioni': '🥇',
    'Muz saroyi': '⛸️',
    'Yangi Shahar City': '🌆'
  };

  function vRoadAt(x) { for (var i = 0; i < G.ROADS.v.length; i++) if (G.ROADS.v[i].x === x) return G.ROADS.v[i]; return null; }
  function hRoadAt(z) { for (var i = 0; i < G.ROADS.h.length; i++) if (G.ROADS.h[i].z === z) return G.ROADS.h[i]; return null; }

  // Bino/daraxt asfalt ustiga chiqib ketmasin: AABB yo'l polosasi bilan kesishsa true
  function onAsphalt(x, z, hw, hd, margin) {
    var m = (margin === undefined ? 1 : margin);
    for (var i = 0; i < G.ROADS.v.length; i++) {
      if (Math.abs(x - G.ROADS.v[i].x) < G.ROADS.v[i].halfW + m + hw) return true;
    }
    for (var j = 0; j < G.ROADS.h.length; j++) {
      if (Math.abs(z - G.ROADS.h[j].z) < G.ROADS.h[j].halfW + m + hd) return true;
    }
    return false;
  }

  // trafik yuradigan yo'llar ro'yxati (svetafor ma'lumotlari bilan)
  function buildTrafficRoads() {
    G.TRAFFIC_ROADS = [];
    G.ROADS.v.forEach(function (r) {
      var road = { vertical: true, pos: r.x, halfW: r.halfW, main: !!r.main, ring: !!r.ring, lightedAt: [] };
      if (LIT.indexOf(r.x) >= 0) {
        LIT.forEach(function (cz) {
          road.lightedAt.push({ pos: cz, crossHalfW: hRoadAt(cz).halfW });
        });
      }
      G.TRAFFIC_ROADS.push(road);
    });
    G.ROADS.h.forEach(function (r) {
      var road = { vertical: false, pos: r.z, halfW: r.halfW, main: !!r.main, ring: !!r.ring, lightedAt: [] };
      if (LIT.indexOf(r.z) >= 0) {
        LIT.forEach(function (cx) {
          road.lightedAt.push({ pos: cx, crossHalfW: vRoadAt(cx).halfW });
        });
      }
      G.TRAFFIC_ROADS.push(road);
    });
  }

  // ---------- DARAXTLAR (instanced — minglab daraxt, 3 ta draw call) ----------
  var treeList = [];
  function plantTree(x, z, big) {
    if (onAsphalt(x, z, 0.5, 0.5, 0)) return; // asfalt o'rtasida daraxt o'smaydi
    treeList.push({ x: x, z: z, s: big ? G.rand(1.15, 1.6) : G.rand(0.7, 1.05) });
    G.addCollider(x, z, 0.45, 0.45);
  }
  function finalizeTrees(scene) {
    var n = treeList.length;
    if (!n) return;
    var trunkGeo = new THREE.CylinderGeometry(0.14, 0.22, 3.4, 5);
    var crownGeo = new THREE.SphereGeometry(1.9, 7, 6);
    var trunks = new THREE.InstancedMesh(trunkGeo, G.mat(0x6b4f35), n);
    var crowns = new THREE.InstancedMesh(crownGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), n);
    var m4 = new THREE.Matrix4();
    var q = new THREE.Quaternion();
    var greens = [new THREE.Color(0x3e7a3a), new THREE.Color(0x4d8a42), new THREE.Color(0x5d963c), new THREE.Color(0x477e3e)];
    for (var i = 0; i < n; i++) {
      var t = treeList[i];
      m4.compose(new THREE.Vector3(t.x, 1.7 * t.s, t.z), q, new THREE.Vector3(t.s, t.s, t.s));
      trunks.setMatrixAt(i, m4);
      var cs = t.s * G.rand(0.9, 1.25);
      m4.compose(new THREE.Vector3(t.x, 3.4 * t.s + 1.3 * cs, t.z), q, new THREE.Vector3(cs, cs * 0.9, cs));
      crowns.setMatrixAt(i, m4);
      crowns.setColorAt(i, greens[i % greens.length]);
    }
    trunks.instanceMatrix.needsUpdate = true;
    crowns.instanceMatrix.needsUpdate = true;
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    scene.add(trunks);
    scene.add(crowns);
  }

  // ---------- YO'LLAR ----------
  function buildRoads(scene) {
    var asphalt = G.mat(0x35383c);
    var sidewalkMat = G.mat(0x9b9b93);

    var dashCv = document.createElement('canvas');
    dashCv.width = 16; dashCv.height = 128;
    var dc = dashCv.getContext('2d');
    dc.fillStyle = '#e8e6da'; dc.fillRect(5, 10, 6, 58);
    var dashTexBase = new THREE.CanvasTexture(dashCv);

    function dashLine(len, alongZ) {
      var t = dashTexBase.clone();
      t.needsUpdate = true;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1, len / 10);
      var m = new THREE.Mesh(new THREE.PlaneGeometry(0.35, len),
        new THREE.MeshBasicMaterial({ map: t, transparent: true }));
      m.rotation.x = -Math.PI / 2;
      if (!alongZ) m.rotation.z = Math.PI / 2;
      return m;
    }

    G.ROADS.v.forEach(function (r) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(r.halfW * 2, MAP * 2), asphalt);
      p.rotation.x = -Math.PI / 2;
      p.position.set(r.x, 0.02, 0);
      p.receiveShadow = true;
      scene.add(p);
      if (r.main) {
        var med = G.box(1.2, 0.18, MAP * 2, G.mat(0x7a8f6a));
        med.position.set(r.x, 0.09, 0); scene.add(med);
        [-r.halfW / 2, r.halfW / 2].forEach(function (o) {
          var d = dashLine(MAP * 2, true); d.position.set(r.x + o, 0.035, 0); scene.add(d);
        });
      } else {
        var d = dashLine(MAP * 2, true); d.position.set(r.x, 0.035, 0); scene.add(d);
      }
    });
    G.ROADS.h.forEach(function (r) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 2, r.halfW * 2), asphalt);
      p.rotation.x = -Math.PI / 2;
      p.position.set(0, 0.025, r.z);
      p.receiveShadow = true;
      scene.add(p);
      if (r.main) {
        var med = G.box(MAP * 2, 0.18, 1.2, G.mat(0x7a8f6a));
        med.position.set(0, 0.09, r.z); scene.add(med);
        [-r.halfW / 2, r.halfW / 2].forEach(function (o) {
          var d = dashLine(MAP * 2, false); d.position.set(0, 0.04, r.z + o); scene.add(d);
        });
      } else {
        var d = dashLine(MAP * 2, false); d.position.set(0, 0.04, r.z); scene.add(d);
      }
    });

    // chorraha yamoqlari (ajratkich uzilishi uchun)
    G.LIGHTED.forEach(function (it) {
      var vr = vRoadAt(it.x), hr = hRoadAt(it.z);
      var patch = new THREE.Mesh(new THREE.PlaneGeometry(vr.halfW * 2 + 2, hr.halfW * 2 + 2), asphalt);
      patch.rotation.x = -Math.PI / 2;
      patch.position.set(it.x, 0.1, it.z);
      scene.add(patch);
    });

    // ---------- TROTUARLAR ----------
    var SW = 4.5;
    var vXs = G.ROADS.v.map(function (r) { return r.x; });
    var hZs = G.ROADS.h.map(function (r) { return r.z; });
    var vHW = G.ROADS.v.map(function (r) { return r.halfW; });
    var hHW = G.ROADS.h.map(function (r) { return r.halfW; });

    function segmentsAlong(crossPositions, crossHalfWs) {
      var pts = [-MAP];
      crossPositions.forEach(function (c, i) {
        pts.push(c - crossHalfWs[i] - SW);
        pts.push(c + crossHalfWs[i] + SW);
      });
      pts.push(MAP);
      var segs = [];
      for (var i = 0; i < pts.length; i += 2) {
        if (pts[i + 1] - pts[i] > 2) segs.push([pts[i], pts[i + 1]]);
      }
      return segs;
    }

    G.ROADS.v.forEach(function (r) {
      var segs = segmentsAlong(hZs, hHW);
      [-1, 1].forEach(function (side) {
        var sx = r.x + side * (r.halfW + SW / 2);
        segs.forEach(function (s) {
          var len = s[1] - s[0], mid = (s[0] + s[1]) / 2;
          var sw = G.box(SW, 0.24, len, sidewalkMat);
          sw.position.set(sx, 0.12, mid);
          sw.receiveShadow = true;
          scene.add(sw);
          G.pedSegments.push({ x1: sx, z1: s[0] + 1, x2: sx, z2: s[1] - 1 });
        });
      });
    });
    G.ROADS.h.forEach(function (r) {
      var segs = segmentsAlong(vXs, vHW);
      [-1, 1].forEach(function (side) {
        var sz = r.z + side * (r.halfW + SW / 2);
        segs.forEach(function (s) {
          var len = s[1] - s[0], mid = (s[0] + s[1]) / 2;
          var sw = G.box(len, 0.24, SW, sidewalkMat);
          sw.position.set(mid, 0.12, sz);
          sw.receiveShadow = true;
          scene.add(sw);
          G.pedSegments.push({ x1: s[0] + 1, z1: sz, x2: s[1] - 1, z2: sz });
        });
      });
    });

    // ---------- ZEBRALAR (bitta teksturali tekislik — tezlik uchun) ----------
    var zebCv = document.createElement('canvas');
    zebCv.width = 128; zebCv.height = 16;
    var zc = zebCv.getContext('2d');
    for (var zs = 0; zs < 7; zs++) {
      zc.fillStyle = '#dedbd0';
      zc.fillRect(zs * 18 + 4, 0, 9, 16);
    }
    var zebTex = new THREE.CanvasTexture(zebCv);
    var zebMat = new THREE.MeshBasicMaterial({ map: zebTex, transparent: true });

    G.LIGHTED.forEach(function (it) {
      var vr = vRoadAt(it.x), hr = hRoadAt(it.z);
      [-1, 1].forEach(function (side) {
        var cz = it.z + side * (hr.halfW + 2.5);
        var zeb = new THREE.Mesh(new THREE.PlaneGeometry(vr.halfW * 2 * 0.92, 1.9), zebMat);
        zeb.rotation.x = -Math.PI / 2;
        zeb.position.set(it.x, 0.11, cz);
        scene.add(zeb);
        G.crossings.push({
          crossAxis: 'V', ix: it.x, iz: it.z,
          x1: it.x - vr.halfW - SW / 2 - 0.5, z1: cz, x2: it.x + vr.halfW + SW / 2 + 0.5, z2: cz
        });
      });
      [-1, 1].forEach(function (side) {
        var cx = it.x + side * (vr.halfW + 2.5);
        var zeb = new THREE.Mesh(new THREE.PlaneGeometry(hr.halfW * 2 * 0.92, 1.9), zebMat);
        zeb.rotation.x = -Math.PI / 2;
        zeb.rotation.z = Math.PI / 2;
        zeb.position.set(cx, 0.11, it.z);
        scene.add(zeb);
        G.crossings.push({
          crossAxis: 'H', ix: it.x, iz: it.z,
          x1: cx, z1: it.z - hr.halfW - SW / 2 - 0.5, x2: cx, z2: it.z + hr.halfW + SW / 2 + 0.5
        });
      });
    });
  }

  // ---------- SVETAFORLAR (hisoblagich bilan) ----------
  function buildTrafficLights(scene) {
    var poleMat = G.mat(0x44484c);
    var poleGeo = new THREE.CylinderGeometry(0.12, 0.14, 5.6, 6);
    var housingGeo = new THREE.BoxGeometry(0.5, 1.5, 0.5);
    var lampGeo = new THREE.SphereGeometry(0.16, 8, 8);
    var housingMat = G.mat(0x222426);

    G.LIGHTED.forEach(function (it) {
      var vr = vRoadAt(it.x), hr = hRoadAt(it.z);
      var defs = [
        { x: it.x + vr.halfW + 1.5, z: it.z + hr.halfW + 4, axis: 'NS' },
        { x: it.x - vr.halfW - 1.5, z: it.z - hr.halfW - 4, axis: 'NS' },
        { x: it.x + vr.halfW + 4, z: it.z - hr.halfW - 1.5, axis: 'EW' },
        { x: it.x - vr.halfW - 4, z: it.z + hr.halfW + 1.5, axis: 'EW' }
      ];
      defs.forEach(function (d) {
        var g = new THREE.Group();
        var pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.8;
        g.add(pole);
        var housing = new THREE.Mesh(housingGeo, housingMat);
        housing.position.y = 5.2;
        g.add(housing);
        var lamps = {};
        [['r', 0.45, 0xff2222], ['y', 0, 0xffaa00], ['g', -0.45, 0x22cc44]].forEach(function (L) {
          var mat = new THREE.MeshLambertMaterial({ color: 0x1c1c1c, emissive: 0x000000 });
          mat.userData = { onColor: L[2] };
          var lamp = new THREE.Mesh(lampGeo, mat);
          lamp.position.set(0, 5.2 + L[1], 0);
          g.add(lamp);
          lamps[L[0]] = mat;
        });
        // sekund hisoblagichi (haqiqiy Toshkent svetaforlaridek)
        var cdMat = new THREE.SpriteMaterial({ map: G.signalCountdownTexture(it.x, it.z, d.axis), transparent: true });
        var cd = new THREE.Sprite(cdMat);
        cd.scale.set(1.3, 1.3, 1);
        cd.position.y = 6.6;
        g.add(cd);
        g.position.set(d.x, 0, d.z);
        scene.add(g);
        G.lightPoles.push({ axis: d.axis, lamps: lamps, ix: it.x, iz: it.z, lastState: '' });
      });
    });
  }

  // ---------- BINOLAR ----------
  function makeApartment(scene, x, z, w, d, floors, baseColor, style) {
    if (onAsphalt(x, z, w / 2, d / 2)) return null; // yo'l ustiga qurmaymiz
    var h = floors * 3;
    var tex = G.buildingTexture(baseColor, floors, Math.max(3, Math.round(w / 4)), style || 'panelka');
    var mat = new THREE.MeshLambertMaterial({ map: tex });
    var texSide = G.buildingTexture(baseColor, floors, Math.max(3, Math.round(d / 4)), style || 'panelka');
    var matSide = new THREE.MeshLambertMaterial({ map: texSide });
    var roofMat = G.mat(0x5c5650);
    var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      [matSide, matSide, roofMat, roofMat, mat, mat]);
    b.position.set(x, h / 2, z);
    scene.add(b);
    var ac = G.box(1.2, 0.8, 1.2, G.mat(0x8a8f94));
    ac.position.set(x + G.rand(-w / 4, w / 4), h + 0.4, z + G.rand(-d / 4, d / 4));
    scene.add(ac);
    if (style === 'panelka') {
      // balkon ustunlari (birlashtirilgan — tezlik uchun)
      for (var bx = -1; bx <= 1; bx += 2) {
        var bal = G.box(2.2, (floors - 1) * 3 - 1, 0.8, G.mat(0xb8b0a4));
        bal.position.set(x + bx * w * 0.25, ((floors - 1) * 3 - 1) / 2 + 2.4, z + d / 2 + 0.4);
        scene.add(bal);
      }
    }
    G.addCollider(x, z, w / 2, d / 2);
    return b;
  }

  function makeGlassTower(scene, x, z, w, d, h, tint) {
    var floors = Math.round(h / 3.4);
    var tex = G.buildingTexture(tint || '#274b63', floors, Math.max(4, Math.round(w / 3)), 'glass');
    var mat = new THREE.MeshPhongMaterial({ map: tex, shininess: 120, specular: 0x88aacc });
    var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, h / 2, z);
    scene.add(b);
    var top = G.box(w * 0.5, 1.6, d * 0.5, G.mat(0x33454f));
    top.position.set(x, h + 0.8, z);
    scene.add(top);
    G.addCollider(x, z, w / 2, d / 2);
    return b;
  }

  function makeMahallaHouse(scene, x, z, rot) {
    var g = new THREE.Group();
    var w = G.rand(8, 11), d = G.rand(7, 9);
    // hovli devori ham hisobga olinadi (d/2+5 gacha chiqadi)
    if (onAsphalt(x, z, w / 2 + 2, d / 2 + 6)) return null;
    var wallMat = G.mat(G.pick([0xd8c9a8, 0xcfc0a0, 0xe0d2b4]));
    var house = G.box(w, 3.4, d, wallMat);
    house.position.y = 1.7;
    g.add(house);
    var roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.72, 2.2, 4), G.mat(0x7d5236));
    roof.position.y = 4.5;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    var yard = G.box(w + G.rand(5, 8), 2, 0.4, wallMat);
    yard.position.set(0, 1, d / 2 + 5);
    g.add(yard);
    var gate = G.box(3, 2.4, 0.5, G.mat(G.pick([0x27577d, 0x724a26, 0x3f6b42])));
    gate.position.set(w * 0.2, 1.2, d / 2 + 5);
    g.add(gate);
    for (var i = -1; i <= 1; i += 2) {
      var win = G.box(1.4, 1.1, 0.1, G.mat(0x2c3e50));
      win.position.set(i * w * 0.25, 2, d / 2 + 0.06);
      g.add(win);
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot || 0;
    G.addCollider(x, z, w / 2 + 1, d / 2 + 1);
    scene.add(g);
    return g;
  }

  // ---------- DO'KONLAR (interyer bilan) ----------
  function makeShop(scene, opts) {
    // yo'l ustiga tushsa — umuman qurmaymiz (foodShops ro'yxatiga ham kirmaydi)
    var gc = Math.cos(opts.rot || 0), gs = Math.sin(opts.rot || 0);
    var ghw = (Math.abs(gc) * opts.w + Math.abs(gs) * opts.d) / 2;
    var ghd = (Math.abs(gs) * opts.w + Math.abs(gc) * opts.d) / 2;
    if (onAsphalt(opts.x, opts.z, ghw, ghd, 0.5)) return null;
    var g = new THREE.Group();
    var w = opts.w, d = opts.d, h = opts.h || 4.5;
    var wallMat = G.mat(opts.wallColor || 0xd9d4c8);
    var glassMat = new THREE.MeshPhongMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.28, side: THREE.DoubleSide });

    var floor = G.box(w, 0.3, d, G.mat(opts.floorColor || 0xc9bfa8));
    floor.position.y = 0.15;
    g.add(floor);
    var back = G.box(w, h, 0.3, wallMat); back.position.set(0, h / 2, -d / 2); g.add(back);
    var left = G.box(0.3, h, d, wallMat); left.position.set(-w / 2, h / 2, 0); g.add(left);
    var right = G.box(0.3, h, d, wallMat); right.position.set(w / 2, h / 2, 0); g.add(right);
    var frontL = G.box(w / 2 - 1.5, h * 0.75, 0.12, glassMat);
    frontL.position.set(-w / 4 - 0.75, h * 0.375 + 0.3, d / 2);
    g.add(frontL);
    var frontR = G.box(w / 2 - 1.5, h * 0.75, 0.12, glassMat);
    frontR.position.set(w / 4 + 0.75, h * 0.375 + 0.3, d / 2);
    g.add(frontR);
    var lintel = G.box(3, h * 0.25, 0.2, wallMat);
    lintel.position.set(0, h * 0.87, d / 2);
    g.add(lintel);
    var roof = G.box(w + 0.6, 0.35, d + 0.6, G.mat(0x6b655c));
    roof.position.y = h + 0.15;
    g.add(roof);
    var ceil = G.box(w * 0.7, 0.1, d * 0.7, new THREE.MeshBasicMaterial({ color: 0xfff2d0 }));
    ceil.position.y = h - 0.3;
    g.add(ceil);
    var sign = G.signMesh(opts.name, opts.signBg, opts.signFg, Math.min(w * 0.9, 12), 1.3);
    sign.position.set(0, h + 1.05, d / 2 + 0.1);
    g.add(sign);
    var signBack = G.box(Math.min(w * 0.9, 12) + 0.3, 1.5, 0.15, G.mat(0x333333));
    signBack.position.set(0, h + 1.05, d / 2 - 0.02);
    g.add(signBack);

    var tableMat = G.mat(0x8a5a30);
    var chairMat = G.mat(0x5c3a1e);

    function table(tx, tz) {
      var top = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 10), tableMat);
      top.position.set(tx, 1.0, tz); g.add(top);
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0, 6), chairMat);
      leg.position.set(tx, 0.5, tz); g.add(leg);
      var plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.05, 8), G.mat(0xeeeeee));
      plate.position.set(tx + 0.25, 1.06, tz); g.add(plate);
      var osh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), G.mat(0xd9a441));
      osh.position.set(tx + 0.25, 1.1, tz); osh.scale.y = 0.5; g.add(osh);
    }
    function chairAt(tx, tz) {
      var seat = G.box(0.45, 0.08, 0.45, chairMat);
      seat.position.set(tx, 0.55, tz); g.add(seat);
    }

    var cosR = Math.cos(opts.rot || 0), sinR = Math.sin(opts.rot || 0);
    function toWorld(lx, lz) {
      return { x: opts.x + lx * cosR + lz * sinR, z: opts.z - lx * sinR + lz * cosR };
    }

    if (opts.kind === 'oshxona' || opts.kind === 'fastfood' || opts.kind === 'choyxona') {
      var counter = G.box(w * 0.5, 1.1, 1.0, G.mat(opts.kind === 'fastfood' ? 0xc0392b : 0x9a6b3f));
      counter.position.set(0, 0.55, -d / 2 + 1.2);
      g.add(counter);
      var menu = G.signMesh(opts.kind === 'fastfood' ? 'Lavash • Burger • Hotdog' : "Osh • Lag'mon • Somsa • Shashlik", '#222', '#ffd23f', 6, 0.9);
      menu.position.set(0, h - 1.1, -d / 2 + 0.2);
      g.add(menu);
      var cols = Math.floor((w - 3) / 4), rows = Math.floor((d - 5) / 4);
      for (var cx2 = 0; cx2 < cols; cx2++) {
        for (var rz = 0; rz < rows; rz++) {
          var tx = -w / 2 + 3 + cx2 * 4;
          var tz = -d / 2 + 4.5 + rz * 4;
          table(tx, tz);
          var nn = G.randInt(1, 2);
          for (var pi = 0; pi < nn; pi++) {
            var ang = pi === 0 ? 0 : Math.PI;
            var pxx = tx + Math.cos(ang) * 1.15, pzz = tz + Math.sin(ang) * 1.15;
            chairAt(pxx, pzz);
            var wp = toWorld(pxx, pzz);
            G.interiorNPCs.push({ type: 'sit', x: wp.x, z: wp.z, rotY: (opts.rot || 0) + ang + Math.PI / 2, eat: true });
          }
        }
      }
      var cw = toWorld(0, -d / 2 + 2.4);
      G.interiorNPCs.push({ type: 'stand', x: cw.x, z: cw.z, rotY: (opts.rot || 0), chef: true });
    } else if (opts.kind === 'korzinka') {
      var aisles = Math.floor((w - 4) / 4);
      for (var a = 0; a < aisles; a++) {
        var ax = -w / 2 + 3 + a * 4;
        var shelf = G.box(1.2, 2.0, d * 0.55, G.mat(0x88919b));
        shelf.position.set(ax, 1.0, -d * 0.08);
        g.add(shelf);
        for (var lv = 0; lv < 3; lv++) {
          for (var it2 = 0; it2 < 4; it2++) {
            var prod = G.box(0.5, 0.4, 0.7, G.mat(G.pick([0xd64541, 0xe8b23d, 0x3d8ec9, 0x50a85a, 0xe07b39, 0xf2f2f2])));
            prod.position.set(ax + (it2 % 2 === 0 ? 0.4 : -0.4), 0.55 + lv * 0.65, -d * 0.3 + it2 * d * 0.15);
            g.add(prod);
          }
        }
        var p1 = toWorld(ax + 2, d * 0.22), p2 = toWorld(ax + 2, -d * 0.35);
        G.interiorNPCs.push({ type: 'shopper', x1: p1.x, z1: p1.z, x2: p2.x, z2: p2.z });
      }
      for (var k = 0; k < 2; k++) {
        var kassa = G.box(2.2, 0.95, 1.0, G.mat(0x2e7d4f));
        kassa.position.set(-w / 2 + 4 + k * 5, 0.5, d / 2 - 2.2);
        g.add(kassa);
        var kw = toWorld(-w / 2 + 4 + k * 5 - 1.6, d / 2 - 2.2);
        G.interiorNPCs.push({ type: 'stand', x: kw.x, z: kw.z, rotY: (opts.rot || 0) + Math.PI / 2 });
      }
    }

    g.position.set(opts.x, 0, opts.z);
    g.rotation.y = opts.rot || 0;
    scene.add(g);
    var hw = (Math.abs(cosR) * w + Math.abs(sinR) * d) / 2;
    var hd = (Math.abs(sinR) * w + Math.abs(cosR) * d) / 2;
    G.addCollider(opts.x, opts.z, hw, hd);

    // oziq-ovqat do'koni bo'lsa — sotib olish uchun ro'yxatga qo'shamiz
    var mk = opts.kind === 'korzinka' ? 'market' : opts.kind;
    var menu = G.SHOP_MENUS[mk];
    if (menu) {
      var doorZ = d / 2 + 2.6;
      var doorW = toWorld(0, doorZ);
      G.foodShops.push({ x: opts.x, z: opts.z, door: doorW, name: opts.name, menu: menu });
    }
    return g;
  }

  // ---------- KICHIK DO'KON / KIOSK (interyer NPCsiz, tez) ----------
  var KIOSK_BRANDS = [
    { n: 'EVOS', k: 'fastfood', bg: '#d81f26' },
    { n: 'FEEDUP', k: 'fastfood', bg: '#f47b20' },
    { n: 'OQTEPA LAVASH', k: 'fastfood', bg: '#e07b1a' },
    { n: 'KNOPKA', k: 'fastfood', bg: '#c0392b' },
    { n: 'STREET FOOD', k: 'fastfood', bg: '#2c3e50' },
    { n: 'DONER UZ', k: 'fastfood', bg: '#a03528' },
    { n: 'BESHQOZON', k: 'oshxona', bg: '#1c7a45' },
    { n: 'NOMDOR', k: 'oshxona', bg: '#8a2a2a' },
    { n: 'MILLIY TAOMLAR', k: 'oshxona', bg: '#7a3b12' },
    { n: 'SOMSA XONA', k: 'oshxona', bg: '#8a4a1c' },
    { n: 'OSH MARKAZI', k: 'oshxona', bg: '#2e6b3f' },
    { n: 'CHOYXONA', k: 'choyxona', bg: '#1c6b4f' },
    { n: 'RAYHON', k: 'choyxona', bg: '#227a4d' },
    { n: 'korzinka', k: 'korzinka', bg: '#e02020' },
    { n: 'HAVAS', k: 'korzinka', bg: '#2e7d4f' },
    { n: 'MAKRO', k: 'korzinka', bg: '#0e63b3' }
  ];

  function makeKiosk(scene, x, z, rot, brand) {
    var g = new THREE.Group();
    var w = 7, d = 5, h = 4;
    var wallMat = G.mat(0xdcd6c8);
    var body = G.box(w, h, d, wallMat); body.position.y = h / 2; g.add(body);
    var glassMat = new THREE.MeshPhongMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    var win = G.box(w * 0.66, h * 0.5, 0.12, glassMat); win.position.set(0, h * 0.42, d / 2); g.add(win);
    var bgNum = parseInt(brand.bg.slice(1), 16);
    var awn = G.box(w + 0.6, 0.22, 1.4, G.mat(bgNum)); awn.position.set(0, h * 0.72, d / 2 + 0.7); g.add(awn);
    var roof = G.box(w + 0.4, 0.3, d + 0.4, G.mat(0x6b655c)); roof.position.y = h + 0.15; g.add(roof);
    var sw = Math.min(w * 0.92, 8);
    var signBack = G.box(sw + 0.3, 1.35, 0.12, G.mat(0x2a2a2a)); signBack.position.set(0, h + 1, d / 2 - 0.02); g.add(signBack);
    var sign = G.signMesh(brand.n, brand.bg, '#ffffff', sw, 1.2); sign.position.set(0, h + 1, d / 2 + 0.1); g.add(sign);
    // ichki peshtaxta
    var counter = G.box(w * 0.7, 1.0, 0.8, G.mat(0x9a6b3f)); counter.position.set(0, 0.5, d / 2 - 1); g.add(counter);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    scene.add(g);
    var cosR = Math.cos(rot), sinR = Math.sin(rot);
    var hw = (Math.abs(cosR) * w + Math.abs(sinR) * d) / 2;
    var hd = (Math.abs(sinR) * w + Math.abs(cosR) * d) / 2;
    G.addCollider(x, z, hw, hd);
    var doorLocalZ = d / 2 + 2.6;
    var doorX = x + doorLocalZ * sinR;
    var doorZw = z + doorLocalZ * cosR;
    G.foodShops.push({ x: x, z: z, door: { x: doorX, z: doorZw }, name: brand.n,
      menu: G.SHOP_MENUS[brand.k === 'korzinka' ? 'market' : brand.k] });
  }

  // yo'l bo'ylab kiosklar joylash (jami do'konlarni ~targetgacha yetkazish)
  function scatterKiosks(scene, target) {
    var bi = 0, attempts = 0;
    while (G.foodShops.length < target && attempts < 3000) {
      attempts++;
      var vertical = Math.random() < 0.5;
      var road = G.pick(vertical ? G.ROADS.v : G.ROADS.h);
      var along = G.rand(-MAP + 120, MAP - 120);
      var side = Math.random() < 0.5 ? 1 : -1;
      var off = road.halfW + 6.5;
      var kx, kz, dirX, dirZ;
      if (vertical) { kx = road.x + side * off; kz = along; dirX = -side; dirZ = 0; }
      else { kz = road.z + side * off; kx = along; dirX = 0; dirZ = -side; }
      if (overlapsCollider(kx, kz, 5, 5) || inReserved(kx, kz, 5, 5) || onAsphalt(kx, kz, 3.5, 3.5, 0.5)) continue;
      // boshqa kioskka juda yaqin bo'lmasin
      var tooClose = false;
      for (var f = 0; f < G.foodShops.length; f++) {
        var s = G.foodShops[f];
        if ((s.x - kx) * (s.x - kx) + (s.z - kz) * (s.z - kz) < 45 * 45) { tooClose = true; break; }
      }
      if (tooClose) continue;
      makeKiosk(scene, kx, kz, Math.atan2(dirX, dirZ), KIOSK_BRANDS[bi % KIOSK_BRANDS.length]);
      bi++;
    }
  }

  // ---------- BENZOKOLONKA ----------
  function makeGasStation(scene, x, z) {
    var g = new THREE.Group();
    var pad = new THREE.Mesh(new THREE.PlaneGeometry(22, 16), G.mat(0x6a6d70));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05; g.add(pad);
    var canopy = G.box(18, 0.5, 11, G.mat(0xf2f2f2)); canopy.position.y = 5.2; g.add(canopy);
    var stripe = G.box(18.2, 0.35, 0.5, G.mat(0x1a7a3a)); stripe.position.set(0, 4.92, 5.45); g.add(stripe);
    [[-7, -4], [-7, 4], [7, -4], [7, 4]].forEach(function (p) {
      var pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 5.2, 8), G.mat(0xd0d0d0));
      pil.position.set(p[0], 2.6, p[1]); g.add(pil);
    });
    [-3.5, 3.5].forEach(function (px) {
      var pump = G.box(1.1, 1.9, 1.3, G.mat(0xd83030)); pump.position.set(px, 0.95, 0); g.add(pump);
      var scr = G.box(0.9, 0.5, 0.1, G.mat(0x111)); scr.position.set(px, 1.4, 0.7); g.add(scr);
    });
    var shop = G.box(8, 3.5, 4, G.mat(0xdfe3e6)); shop.position.set(0, 1.75, -6); g.add(shop);
    var signBack = G.box(8.3, 1.5, 0.12, G.mat(0x0e7490)); signBack.position.set(0, 5.9, 5.5); g.add(signBack);
    var sign = G.signMesh('BENZOKOLONKA', '#0e7490', '#ffffff', 8, 1.4); sign.position.set(0, 5.9, 5.58); g.add(sign);
    g.position.set(x, 0, z); scene.add(g);
    G.addCollider(x, z - 6, 4, 2);
    G.stations.push({ type: 'fuel', x: x, z: z, r: 12 });
    G.landmarks.push({ x: x, z: z, name: 'Benzokolonka', r: 15, color: '#d83030' });
  }

  // ---------- TUZATISH STANSIYASI (avto servis) ----------
  function makeRepairStation(scene, x, z) {
    var g = new THREE.Group();
    var pad = new THREE.Mesh(new THREE.PlaneGeometry(16, 14), G.mat(0x5c5f62));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05; g.add(pad);
    var wallMat = G.mat(0xb8bcc0);
    var back = G.box(12, 5, 1, wallMat); back.position.set(0, 2.5, -5); g.add(back);
    var left = G.box(1, 5, 10, wallMat); left.position.set(-6, 2.5, -0.5); g.add(left);
    var right = G.box(1, 5, 10, wallMat); right.position.set(6, 2.5, -0.5); g.add(right);
    var roof = G.box(13, 0.4, 11, G.mat(0x555a5e)); roof.position.set(0, 5.1, -0.5); g.add(roof);
    // sariq-qora ogohlantirish chizig'i
    var band = G.box(12, 0.6, 0.1, G.mat(0xe0a020)); band.position.set(0, 4.2, 0.02); g.add(band);
    var signBack = G.box(10.3, 1.5, 0.14, G.mat(0x1a1a1a)); signBack.position.set(0, 6.0, -0.4); g.add(signBack);
    var sign = G.signMesh('AVTO SERVIS', '#1a1a1a', '#ffcc22', 10, 1.4); sign.position.set(0, 6.0, -0.32); g.add(sign);
    // ichkarida ko'targich
    var lift = G.box(3, 0.3, 1.4, G.mat(0x444)); lift.position.set(0, 0.8, -2); g.add(lift);
    g.position.set(x, 0, z); scene.add(g);
    G.addCollider(x, z - 5, 6, 1.2);
    G.addCollider(x - 6, z - 0.5, 1, 5);
    G.addCollider(x + 6, z - 0.5, 1, 5);
    G.stations.push({ type: 'repair', x: x, z: z + 1.5, r: 8 });
    G.landmarks.push({ x: x, z: z, name: 'Avto servis', r: 14, color: '#e0a020' });
  }

  function buildStations(scene) {
    // benzokolonkalar (yo'l bo'yida, tarqoq — yangi hududlarda ham)
    [[172, -260], [-172, 260], [172, 560], [-560, 172], [560, -172], [-172, -560],
     [1428, -600], [-1428, 300], [172, 1428], [1428, -1372]]
      .forEach(function (p) { makeGasStation(scene, p[0], p[1]); });
    // avto servislar
    [[-172, -260], [172, 260], [-560, -172], [560, 172], [1428, 600], [-1428, -500]]
      .forEach(function (p) { makeRepairStation(scene, p[0], p[1]); });
  }

  // ---------- YANGI O'ZBEKISTON BOG'I ----------
  function landYangiPark(scene, cx, cz) {
    var lawn = new THREE.Mesh(new THREE.CircleGeometry(150, 36), G.mat(0x4d8a42));
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(cx, 0.08, cz);
    scene.add(lawn);
    var path = new THREE.Mesh(new THREE.PlaneGeometry(8, 290), G.mat(0xc4b89c));
    path.rotation.x = -Math.PI / 2;
    path.position.set(cx, 0.12, cz);
    scene.add(path);
    var path2 = new THREE.Mesh(new THREE.PlaneGeometry(290, 8), G.mat(0xc4b89c));
    path2.rotation.x = -Math.PI / 2;
    path2.position.set(cx, 0.12, cz);
    scene.add(path2);
    // Istiqlol ustuni + Humo qanotlari
    var col = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 38, 10), G.mat(0xf5f2ea, { phong: true, shininess: 40 }));
    col.position.set(cx, 19, cz);
    scene.add(col);
    var globe = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 9), G.mat(0xd9a441, { phong: true, shininess: 90 }));
    globe.position.set(cx, 40, cz);
    scene.add(globe);
    [-1, 1].forEach(function (s) {
      var wing = G.box(7, 0.5, 2.4, G.mat(0xf5f2ea));
      wing.position.set(cx + s * 4.6, 39, cz);
      wing.rotation.z = s * 0.5;
      scene.add(wing);
    });
    G.addCollider(cx, cz, 3.4, 3.4);
    // ko'l
    var lake = new THREE.Mesh(new THREE.CircleGeometry(38, 26), G.mat(0x2f7fb8, { phong: true, shininess: 130, transparent: true, opacity: 0.92 }));
    lake.rotation.x = -Math.PI / 2;
    lake.position.set(cx + 85, 0.1, cz + 70);
    scene.add(lake);
    // gullar doiralari
    for (var f = 0; f < 8; f++) {
      var ang = f / 8 * Math.PI * 2;
      var bed = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.4, 10), G.mat(G.pick([0xc94b6a, 0xd9a441, 0xba4bc9, 0xc0574a])));
      bed.position.set(cx + Math.cos(ang) * 30, 0.2, cz + Math.sin(ang) * 30);
      scene.add(bed);
    }
    // daraxtlar (ko'l va yo'lakchalardan chetda)
    for (var t = 0; t < 42; t++) {
      var tx = cx + G.rand(-140, 140), tz = cz + G.rand(-140, 140);
      if (Math.hypot(tx - (cx + 85), tz - (cz + 70)) < 44) continue;
      if (Math.abs(tx - cx) < 6 || Math.abs(tz - cz) < 6) continue;
      plantTree(tx, tz, Math.random() < 0.5);
    }
    // bayroq
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 26, 6), G.mat(0xd0d0d0));
    pole.position.set(cx + 24, 13, cz - 24);
    scene.add(pole);
    var flag = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 3.8),
      new THREE.MeshBasicMaterial({ map: G.flagTexture(), side: THREE.DoubleSide }));
    flag.position.set(cx + 27.9, 23, cz - 24);
    scene.add(flag);
    G.addCollider(cx + 24, cz - 24, 0.6, 0.6);
    var sign = G.signMesh("YANGI O'ZBEKISTON BOG'I", '#1c6b4f', '#ffffff', 18, 1.6);
    sign.position.set(cx, 6, cz + 148);
    scene.add(sign);
    G.landmarks.push({ x: cx, z: cz, name: "Yangi O'zbekiston bog'i", r: 150, color: '#4d8a42' });
  }

  // ---------- OLIMPIYA SHAHARCHASI (stadion + muz saroyi) ----------
  function landOlympic(scene, cx, cz) {
    // STADION (oval kosa)
    var sx = cx - 120, sz = cz;
    var bowl = new THREE.Mesh(new THREE.CylinderGeometry(58, 66, 15, 22, 1, true),
      G.mat(0xd8dde2, { phong: true, shininess: 30 }));
    bowl.material.side = THREE.DoubleSide;
    bowl.position.set(sx, 7.5, sz);
    bowl.scale.z = 0.82;
    scene.add(bowl);
    var lip = new THREE.Mesh(new THREE.TorusGeometry(60, 2.2, 8, 22), G.mat(0xc23b2e));
    lip.rotation.x = Math.PI / 2;
    lip.position.set(sx, 15.4, sz);
    lip.scale.y = 0.82;
    scene.add(lip);
    var field = new THREE.Mesh(new THREE.CircleGeometry(48, 22), G.mat(0x3e8a3e));
    field.rotation.x = -Math.PI / 2;
    field.position.set(sx, 0.15, sz);
    field.scale.y = 0.8;
    scene.add(field);
    G.addCollider(sx, sz, 62, 52);
    var sSign = G.signMesh('OLIMPIYA STADIONI', '#12355b', '#ffffff', 18, 1.8);
    sSign.position.set(sx, 18, sz + 52);
    scene.add(sSign);
    G.landmarks.push({ x: sx, z: sz, name: 'Olimpiya stadioni', r: 70, color: '#c23b2e' });

    // MUZ SAROYI (yarim silindr — muzli gumbaz)
    var mx = cx + 110, mz = cz - 60;
    var arch = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 68, 18, 1, false, 0, Math.PI),
      G.mat(0xdfeef5, { phong: true, shininess: 90 }));
    arch.rotation.z = Math.PI / 2;
    arch.position.set(mx, 8, mz);
    scene.add(arch);
    var base = G.box(68, 8, 52, G.mat(0xc9dde8, { phong: true, shininess: 60 }));
    base.position.set(mx, 4, mz);
    scene.add(base);
    var entry = G.box(16, 6, 3, G.mat(0x2a7a8c));
    entry.position.set(mx, 3, mz + 27);
    scene.add(entry);
    G.addCollider(mx, mz, 35, 27);
    var mSign = G.signMesh('MUZ SAROYI', '#2a7a8c', '#ffffff', 13, 1.6);
    mSign.position.set(mx, 12, mz + 28.5);
    scene.add(mSign);
    G.landmarks.push({ x: mx, z: mz, name: 'Muz saroyi', r: 45, color: '#7fd0e8' });

    // Olimpiya halqalari (kirishda)
    var ringCols = [0x0085c7, 0x000000, 0xdf0024, 0xf4c300, 0x009f3d];
    for (var r = 0; r < 5; r++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.45, 8, 20), G.mat(ringCols[r], { phong: true, shininess: 60 }));
      ring.position.set(cx - 18 + r * 9 - (r % 2) * 4.5, r % 2 === 0 ? 10 : 6.6, cz + 130);
      scene.add(ring);
    }
    var stand = G.box(46, 1, 3, G.mat(0x8a95a5));
    stand.position.set(cx, 0.5, cz + 130);
    scene.add(stand);
    G.addCollider(cx, cz + 130, 23, 1.6);

    // sport maydonlari: basketbol + suzish havzasi
    var court = new THREE.Mesh(new THREE.PlaneGeometry(28, 15), G.mat(0xc47b3d));
    court.rotation.x = -Math.PI / 2;
    court.position.set(cx + 60, 0.1, cz + 80);
    scene.add(court);
    var pool = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), G.mat(0x2f9fd8, { phong: true, shininess: 130 }));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(cx - 40, 0.1, cz + 90);
    scene.add(pool);
  }

  // ---------- YANGI SHAHAR (zamonaviy minoralar) ----------
  function landYangiShahar(scene, cx, cz) {
    makeGlassTower(scene, cx - 55, cz - 45, 18, 18, 112, '#1a3c5c');
    makeGlassTower(scene, cx + 50, cz - 50, 15, 15, 96, '#27506b');
    makeGlassTower(scene, cx - 50, cz + 55, 15, 15, 86, '#2a5570');
    makeGlassTower(scene, cx + 58, cz + 48, 20, 14, 124, '#173a52');
    makeGlassTower(scene, cx + 5, cz + 90, 13, 13, 70, '#1f4258');
    var pond = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 0.24, 20),
      G.mat(0x2f7fb8, { phong: true, shininess: 130, opacity: 0.92, transparent: true }));
    pond.position.set(cx, 0.12, cz);
    scene.add(pond);
    for (var i = 0; i < 10; i++) {
      var ang = i / 10 * Math.PI * 2;
      plantTree(cx + Math.cos(ang) * 24, cz + Math.sin(ang) * 24, false);
    }
    var sign = G.signMesh('YANGI SHAHAR', '#173a52', '#7fd0e8', 14, 1.8);
    sign.position.set(cx, 10, cz + 30);
    scene.add(sign);
    G.landmarks.push({ x: cx, z: cz, name: 'Yangi Shahar City', r: 90, color: '#2a5570' });
  }

  // ---------- DIQQATGA SAZOVOR JOYLAR ----------
  function landAmirTemur(scene, cx, cz) {
    var lawn = new THREE.Mesh(new THREE.CylinderGeometry(42, 42, 0.28, 36), G.mat(0x4d8a42));
    lawn.position.set(cx, 0.14, cz);
    scene.add(lawn);
    var path = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 0.34, 24), G.mat(0xb8a988));
    path.position.set(cx, 0.17, cz);
    scene.add(path);
    var bronze = G.mat(0x4a453a, { phong: true, shininess: 30 });
    var ped = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.4, 4, 10), G.mat(0x8a7f6e));
    ped.position.set(cx, 2, cz);
    scene.add(ped);
    var horse = new THREE.Group();
    var hb = G.box(3.2, 1.3, 1.1, bronze); hb.position.y = 1.6; horse.add(hb);
    var hn = G.box(0.9, 1.4, 0.7, bronze); hn.position.set(1.6, 2.4, 0); hn.rotation.z = -0.5; horse.add(hn);
    var hh = G.box(1.0, 0.55, 0.6, bronze); hh.position.set(2.25, 3.0, 0); horse.add(hh);
    for (var i = 0; i < 4; i++) {
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 1.6, 5), bronze);
      leg.position.set(i < 2 ? 1.1 : -1.1, 0.8, i % 2 === 0 ? 0.35 : -0.35);
      if (i === 0) { leg.rotation.z = -0.7; leg.position.y = 1.2; leg.position.x = 1.5; }
      horse.add(leg);
    }
    var rider = G.box(0.7, 1.2, 0.6, bronze); rider.position.set(-0.2, 2.9, 0); horse.add(rider);
    var rhead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 6), bronze); rhead.position.set(-0.2, 3.7, 0); horse.add(rhead);
    var arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 5), bronze);
    arm.position.set(0.35, 3.4, 0.2); arm.rotation.z = -1.1; horse.add(arm);
    horse.position.set(cx, 4, cz);
    scene.add(horse);
    G.addCollider(cx, cz, 4.5, 4.5);
    for (var a = 0; a < 12; a++) {
      var ang = a / 12 * Math.PI * 2;
      plantTree(cx + Math.cos(ang) * 33, cz + Math.sin(ang) * 33, true);
      if (a % 2 === 0) {
        var bench = G.box(2, 0.5, 0.6, G.mat(0x7a5230));
        bench.position.set(cx + Math.cos(ang) * 20, 0.4, cz + Math.sin(ang) * 20);
        bench.rotation.y = -ang;
        scene.add(bench);
      }
    }
    G.landmarks.push({ x: cx, z: cz, name: 'Amir Temur maydoni', r: 46, color: '#4d8a42' });
  }

  function landHotelUzbekistan(scene, cx, cz) {
    var floors = 16;
    var tex = G.buildingTexture('#c8beac', floors, 6, 'flat');
    var mat = new THREE.MeshLambertMaterial({ map: tex });
    var segs = 5, R = 40, H = floors * 2.9;
    for (var i = 0; i < segs; i++) {
      var ang = (i - (segs - 1) / 2) * 0.16;
      var sx = cx + Math.sin(ang) * R * 0.35;
      var sz = cz + (1 - Math.cos(ang)) * R * 0.6;
      var seg = new THREE.Mesh(new THREE.BoxGeometry(11, H, 7), mat);
      seg.position.set(sx, H / 2, sz);
      seg.rotation.y = -ang;
      scene.add(seg);
    }
    G.addCollider(cx, cz + 2, 26, 6);
    var sign = G.signMesh('HOTEL UZBEKISTAN', '#1a2a44', '#ffffff', 20, 1.6);
    sign.position.set(cx, H + 1.2, cz - 3.6);
    sign.rotation.y = Math.PI;
    scene.add(sign);
    G.landmarks.push({ x: cx, z: cz, name: 'Hotel Uzbekistan', r: 34, color: '#c8beac' });
  }

  function landTvTower(scene, cx, cz) {
    var white = G.mat(0xe8e8ea);
    var red = G.mat(0xc23b2e);
    var g = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      var ang = i / 3 * Math.PI * 2;
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 34, 6), white);
      leg.position.set(Math.cos(ang) * 7, 17, Math.sin(ang) * 7);
      leg.rotation.z = Math.cos(ang) * 0.20;
      leg.rotation.x = -Math.sin(ang) * 0.20;
      g.add(leg);
    }
    var shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.2, 74, 8), white);
    shaft.position.y = 37;
    g.add(shaft);
    var pod = new THREE.Mesh(new THREE.CylinderGeometry(6, 4.4, 7, 10), red);
    pod.position.y = 66;
    g.add(pod);
    var pod2 = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.6, 4, 10), white);
    pod2.position.y = 72;
    g.add(pod2);
    var ant = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.7, 36, 6), red);
    ant.position.y = 92;
    g.add(ant);
    g.position.set(cx, 0, cz);
    scene.add(g);
    G.addCollider(cx, cz, 9, 9);
    for (var t = 0; t < 10; t++) plantTree(cx + G.rand(-35, 35), cz + G.rand(14, 40), true);
    G.landmarks.push({ x: cx, z: cz, name: 'Toshkent Teleminorasi', r: 45, color: '#c23b2e' });
  }

  function landChorsu(scene, cx, cz) {
    var dome = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      G.mat(0x2ea8a5, { phong: true, shininess: 50 }));
    dome.position.set(cx, 6, cz);
    scene.add(dome);
    var base = new THREE.Mesh(new THREE.CylinderGeometry(26.5, 27.5, 6, 20), G.mat(0xd8cba8));
    base.position.set(cx, 3, cz);
    scene.add(base);
    var cupola = new THREE.Mesh(new THREE.SphereGeometry(4, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), G.mat(0x2ea8a5));
    cupola.position.set(cx, 31.5, cz);
    scene.add(cupola);
    G.addCollider(cx, cz, 27, 27);
    for (var i = 0; i < 10; i++) {
      var ang = i / 10 * Math.PI * 2;
      var sx = cx + Math.cos(ang) * 37, sz = cz + Math.sin(ang) * 37;
      var stall = new THREE.Group();
      var tbl = G.box(3, 0.9, 1.6, G.mat(0x9a6b3f));
      tbl.position.y = 0.45; stall.add(tbl);
      var awn = G.box(3.4, 0.12, 2.2, G.mat(G.pick([0xc0392b, 0x2e8b57, 0xe8b23d])));
      awn.position.y = 2.4; stall.add(awn);
      for (var p = 0; p < 3; p++) {
        var fruit = new THREE.Mesh(new THREE.SphereGeometry(0.32, 6, 5), G.mat(G.pick([0xd64541, 0xe8b23d, 0x67b346, 0xe07b39])));
        fruit.position.set(-1 + p, 1.15, 0);
        stall.add(fruit);
      }
      var pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 5), G.mat(0x6b4f35));
      pole1.position.set(-1.5, 1.2, 0.9); stall.add(pole1);
      var pole2 = pole1.clone(); pole2.position.x = 1.5; stall.add(pole2);
      stall.position.set(sx, 0, sz);
      stall.rotation.y = -ang + Math.PI / 2;
      scene.add(stall);
      G.addCollider(sx, sz, 1.8, 1.8);
      G.interiorNPCs.push({ type: 'stand', x: sx + Math.cos(ang) * 1.6, z: sz + Math.sin(ang) * 1.6, rotY: ang + Math.PI });
    }
    var sign = G.signMesh('CHORSU BOZORI', '#0e7490', '#ffffff', 14, 1.5);
    sign.position.set(cx, 10, cz + 28.5);
    scene.add(sign);
    G.landmarks.push({ x: cx, z: cz, name: 'Chorsu bozori', r: 48, color: '#2ea8a5' });
  }

  function landMinor(scene, cx, cz) {
    var white = G.mat(0xf2efe8, { phong: true, shininess: 40 });
    var teal = G.mat(0x2a9d9a, { phong: true, shininess: 60 });
    var hall = G.box(22, 10, 18, white);
    hall.position.set(cx, 5, cz);
    scene.add(hall);
    var dome = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teal);
    dome.position.set(cx, 10, cz);
    scene.add(dome);
    var portal = G.box(10, 13, 2, white);
    portal.position.set(cx, 6.5, cz + 9.5);
    scene.add(portal);
    var arch = G.box(6, 8, 2.2, G.mat(0x1c6b8a));
    arch.position.set(cx, 4, cz + 9.6);
    scene.add(arch);
    [-14, 14].forEach(function (mx) {
      var min = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 22, 10), white);
      min.position.set(cx + mx, 11, cz + 8);
      scene.add(min);
      var mdome = new THREE.Mesh(new THREE.SphereGeometry(2, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), teal);
      mdome.position.set(cx + mx, 22, cz + 8);
      scene.add(mdome);
      G.addCollider(cx + mx, cz + 8, 2.2, 2.2);
    });
    G.addCollider(cx, cz, 11, 10);
    G.landmarks.push({ x: cx, z: cz, name: 'Minor masjidi', r: 30, color: '#f2efe8' });
  }

  function landTashkentCity(scene, cx, cz) {
    makeGlassTower(scene, cx - 18, cz - 15, 16, 16, 88, '#1f4258');
    makeGlassTower(scene, cx + 15, cz - 22, 13, 13, 64, '#27506b');
    makeGlassTower(scene, cx + 22, cz + 12, 12, 12, 52, '#2a5570');
    makeGlassTower(scene, cx - 15, cz + 20, 14, 11, 40, '#1f4258');
    var pond = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 0.24, 18),
      G.mat(0x2f7fb8, { phong: true, shininess: 130, opacity: 0.92, transparent: true }));
    pond.position.set(cx, 0.12, cz);
    scene.add(pond);
    for (var i = 0; i < 8; i++) {
      var ang = i / 8 * Math.PI * 2;
      plantTree(cx + Math.cos(ang) * 15, cz + Math.sin(ang) * 15, false);
    }
    G.landmarks.push({ x: cx, z: cz, name: 'Tashkent City', r: 42, color: '#2a5570' });
  }

  function landMustaqillik(scene, cx, cz) {
    var plaza = G.box(70, 0.26, 70, G.mat(0xc4b89c));
    plaza.position.set(cx, 0.13, cz);
    scene.add(plaza);
    var white = G.mat(0xf5f2ea, { phong: true, shininess: 30 });
    for (var i = 0; i < 8; i++) {
      var colX = cx - 21 + i * 6;
      var col = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 12, 8), white);
      col.position.set(colX, 6, cz + 24);
      scene.add(col);
      G.addCollider(colX, cz + 24, 1, 1);
    }
    var beam = G.box(48, 1.2, 2, white);
    beam.position.set(cx, 12.5, cz + 24);
    scene.add(beam);
    for (var s = 0; s < 3; s++) {
      var stork = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 5), white);
      stork.position.set(cx - 8 + s * 8, 13.8, cz + 24);
      stork.scale.set(1.4, 0.8, 0.6);
      scene.add(stork);
    }
    var mon = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 14, 10), white);
    mon.position.set(cx, 7, cz - 8);
    scene.add(mon);
    var globe = new THREE.Mesh(new THREE.SphereGeometry(3.6, 12, 10), G.mat(0x3d7ec9, { phong: true, shininess: 80 }));
    globe.position.set(cx, 17, cz - 8);
    scene.add(globe);
    G.addCollider(cx, cz - 8, 3.4, 3.4);
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 24, 6), G.mat(0xd0d0d0));
    pole.position.set(cx + 22, 12, cz - 14);
    scene.add(pole);
    var flag = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5),
      new THREE.MeshBasicMaterial({ map: G.flagTexture(), side: THREE.DoubleSide }));
    flag.position.set(cx + 25.6, 21.5, cz - 14);
    scene.add(flag);
    G.addCollider(cx + 22, cz - 14, 0.6, 0.6);
    for (var f = 0; f < 6; f++) {
      var bed = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.4, 10), G.mat(G.pick([0xc94b6a, 0xd9a441, 0xba4bc9])));
      bed.position.set(cx - 25 + f * 10, 0.3, cz + 8);
      scene.add(bed);
    }
    G.landmarks.push({ x: cx, z: cz, name: 'Mustaqillik maydoni', r: 42, color: '#f5f2ea' });
  }

  function landHumoArena(scene, cx, cz) {
    var arena = new THREE.Mesh(new THREE.CylinderGeometry(28, 32, 14, 24), G.mat(0xd8dde2, { phong: true, shininess: 60 }));
    arena.scale.z = 0.75;
    arena.position.set(cx, 7, cz);
    scene.add(arena);
    var roofD = new THREE.Mesh(new THREE.SphereGeometry(28, 20, 8, 0, Math.PI * 2, 0, Math.PI / 3), G.mat(0xbfc9d4));
    roofD.scale.set(1, 0.42, 0.75);
    roofD.position.set(cx, 13, cz);
    scene.add(roofD);
    var sign = G.signMesh('HUMO ARENA', '#12355b', '#ffffff', 16, 1.8);
    sign.position.set(cx, 12, cz + 25);
    scene.add(sign);
    G.addCollider(cx, cz, 32, 25);
    G.landmarks.push({ x: cx, z: cz, name: 'Humo Arena', r: 40, color: '#d8dde2' });
  }

  function landBunyodkor(scene, cx, cz) {
    var ring = new THREE.Mesh(new THREE.CylinderGeometry(30, 34, 11, 24), G.mat(0xcfd6dd));
    ring.position.set(cx, 5.5, cz);
    scene.add(ring);
    var inner = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 11.5, 24), G.mat(0x3e7a3a));
    inner.position.set(cx, 5.5, cz);
    scene.add(inner);
    var lip = new THREE.Mesh(new THREE.TorusGeometry(31, 2, 8, 24), G.mat(0xf2f2f2, { phong: true }));
    lip.rotation.x = Math.PI / 2;
    lip.position.set(cx, 11.5, cz);
    scene.add(lip);
    G.addCollider(cx, cz, 33, 33);
    G.landmarks.push({ x: cx, z: cz, name: 'Bunyodkor stadioni', r: 42, color: '#cfd6dd' });
  }

  function landHazratiImom(scene, cx, cz) {
    var white = G.mat(0xf0e9d8, { phong: true, shininess: 30 });
    var teal = G.mat(0x2a9d9a, { phong: true, shininess: 60 });
    var plaza = G.box(90, 0.26, 70, G.mat(0xcfc2a4));
    plaza.position.set(cx, 0.13, cz);
    scene.add(plaza);
    // asosiy masjid
    var hall = G.box(34, 14, 22, white);
    hall.position.set(cx, 7, cz - 12);
    scene.add(hall);
    [-10, 10].forEach(function (dx) {
      var dome = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 9, 0, Math.PI * 2, 0, Math.PI / 2), teal);
      dome.position.set(cx + dx, 14, cz - 12);
      scene.add(dome);
    });
    G.addCollider(cx, cz - 12, 17, 11);
    // 2 baland minora
    [-28, 28].forEach(function (dx) {
      var min = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.8, 42, 10), white);
      min.position.set(cx + dx, 21, cz - 8);
      scene.add(min);
      var top = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), teal);
      top.position.set(cx + dx, 42, cz - 8);
      scene.add(top);
      G.addCollider(cx + dx, cz - 8, 3, 3);
    });
    // madrasa devori
    var wall = G.box(70, 5, 3, G.mat(0xc9b283));
    wall.position.set(cx, 2.5, cz + 22);
    scene.add(wall);
    G.addCollider(cx, cz + 22, 35, 1.8);
    G.landmarks.push({ x: cx, z: cz, name: 'Hazrati Imom majmuasi', r: 55, color: '#f0e9d8' });
  }

  function landMagicCity(scene, cx, cz) {
    // qal'a darvozasi
    var pink = G.mat(0xd98aa8, { phong: true, shininess: 40 });
    var blue = G.mat(0x5a7fc9, { phong: true, shininess: 40 });
    [[-14, pink, 16], [0, blue, 22], [14, pink, 16]].forEach(function (t) {
      var tower = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4, t[2], 10), G.mat(0xf0e6d8));
      tower.position.set(cx + t[0], t[2] / 2, cz);
      scene.add(tower);
      var cone = new THREE.Mesh(new THREE.ConeGeometry(4.4, 7, 10), t[1]);
      cone.position.set(cx + t[0], t[2] + 3.5, cz);
      scene.add(cone);
      G.addCollider(cx + t[0], cz, 4.2, 4.2);
    });
    var wall = G.box(28, 8, 2.5, G.mat(0xf0e6d8));
    wall.position.set(cx, 4, cz);
    scene.add(wall);
    var sign = G.signMesh('MAGIC CITY', '#7a2a8c', '#ffd23f', 14, 1.6);
    sign.position.set(cx, 12, cz + 1.6);
    scene.add(sign);
    // charxpalak (aylanadi!)
    var wheelG = new THREE.Group();
    var rim = new THREE.Mesh(new THREE.TorusGeometry(14, 0.5, 8, 28), G.mat(0xe8b23d, { phong: true }));
    wheelG.add(rim);
    for (var i = 0; i < 8; i++) {
      var sp = G.box(27.5, 0.25, 0.25, G.mat(0xcccccc));
      sp.rotation.z = i / 8 * Math.PI;
      wheelG.add(sp);
    }
    for (var c = 0; c < 12; c++) {
      var ang = c / 12 * Math.PI * 2;
      var cab = G.box(1.6, 1.8, 1.6, G.mat(G.pick([0xc0392b, 0x2e8b57, 0x2e5f8a, 0xd9a441])));
      cab.position.set(Math.cos(ang) * 14, Math.sin(ang) * 14, 0);
      wheelG.add(cab);
    }
    // charxpalak blok ichida, yo'ldan uzoqda
    wheelG.position.set(cx - 45, 16.5, cz + 60);
    wheelG.userData.dynamic = true; // aylanadi — muzlatilmasin
    scene.add(wheelG);
    // tayanchlar
    [[-3.5], [3.5]].forEach(function (o) {
      var legL = G.box(1, 17, 1, G.mat(0x8a8f94));
      legL.position.set(cx - 45 + o[0], 8.5, cz + 60);
      legL.rotation.z = o[0] > 0 ? -0.2 : 0.2;
      scene.add(legL);
    });
    G.addCollider(cx - 45, cz + 60, 4, 3);
    G.animated.push({ fn: function (dt) { wheelG.rotation.z += dt * 0.12; } });
    G.landmarks.push({ x: cx + 20, z: cz, name: 'Magic City', r: 55, color: '#d98aa8' });
  }

  function landMegaPlanet(scene, cx, cz) {
    var mall = G.box(60, 16, 40, G.mat(0x3d6a94, { phong: true, shininess: 70 }));
    mall.position.set(cx, 8, cz);
    scene.add(mall);
    var globe = new THREE.Mesh(new THREE.SphereGeometry(7, 14, 10), G.mat(0xe07b1a, { phong: true, shininess: 60 }));
    globe.position.set(cx, 21, cz);
    scene.add(globe);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.7, 6, 20), G.mat(0xf0c040, { phong: true }));
    ring.rotation.x = Math.PI / 2.4;
    ring.position.set(cx, 21, cz);
    scene.add(ring);
    var sign = G.signMesh('MEGA PLANET', '#e07b1a', '#ffffff', 18, 2);
    sign.position.set(cx, 13, cz + 20.2);
    scene.add(sign);
    G.addCollider(cx, cz, 30, 20);
    G.landmarks.push({ x: cx, z: cz, name: 'Mega Planet', r: 42, color: '#e07b1a' });
  }

  function landNavoiyTeatr(scene, cx, cz) {
    var beige = G.mat(0xd9cba8, { phong: true, shininess: 20 });
    var hall = G.box(34, 14, 26, beige);
    hall.position.set(cx, 7, cz);
    scene.add(hall);
    // old kolonnada
    for (var i = 0; i < 7; i++) {
      var col = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 11, 8), G.mat(0xe8ddc0));
      col.position.set(cx - 12 + i * 4, 5.5, cz + 14);
      scene.add(col);
    }
    var porch = G.box(30, 1.4, 5, beige);
    porch.position.set(cx, 11.5, cz + 14);
    scene.add(porch);
    // zinapoya
    var steps = G.box(32, 0.8, 5, G.mat(0xc0b494));
    steps.position.set(cx, 0.4, cz + 17);
    scene.add(steps);
    // favvora
    var fount = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 0.9, 14), G.mat(0x9fb8c9));
    fount.position.set(cx, 0.45, cz + 28);
    scene.add(fount);
    var water = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 0.5, 14),
      G.mat(0x2f7fb8, { phong: true, shininess: 130, opacity: 0.9, transparent: true }));
    water.position.set(cx, 0.75, cz + 28);
    scene.add(water);
    G.addCollider(cx, cz + 28, 6.6, 6.6);
    G.addCollider(cx, cz, 17, 15.5);
    G.landmarks.push({ x: cx, z: cz, name: 'Navoiy teatri', r: 36, color: '#d9cba8' });
  }

  function landVokzal(scene, cx, cz) {
    var b = G.box(50, 12, 20, G.mat(0xc9d2dd, { phong: true, shininess: 40 }));
    b.position.set(cx, 6, cz);
    scene.add(b);
    var arch = new THREE.Mesh(new THREE.CylinderGeometry(10, 10, 50, 14, 1, false, 0, Math.PI), G.mat(0x8fa5bd));
    arch.rotation.z = Math.PI / 2;
    arch.position.set(cx, 12, cz);
    scene.add(arch);
    var sign = G.signMesh('TOSHKENT', '#12355b', '#ffffff', 16, 2);
    sign.position.set(cx, 14.5, cz + 10.2);
    scene.add(sign);
    G.addCollider(cx, cz, 25, 10);
    // relslar — butun shahar bo'ylab, g'arbdan sharqqacha (poyezd train.js da yuradi)
    var railMat = G.mat(0x55585c, { phong: true, shininess: 60 });
    [-1.2, 1.2].forEach(function (o) {
      var rail = G.box(MAP * 2 + 200, 0.14, 0.24, railMat);
      rail.position.set(0, 0.17, 620 + o);
      scene.add(rail);
    });
    // shpalli yotqizma (teksturali — arzon)
    var bedCv = document.createElement('canvas');
    bedCv.width = 64; bedCv.height = 32;
    var bcx = bedCv.getContext('2d');
    bcx.fillStyle = '#6b6258'; bcx.fillRect(0, 0, 64, 32);
    for (var gi = 0; gi < 80; gi++) {
      bcx.fillStyle = Math.random() < 0.5 ? '#7a7166' : '#5d554c';
      bcx.fillRect(Math.random() * 64, Math.random() * 32, 2, 2);
    }
    bcx.fillStyle = '#4a3b2c';
    bcx.fillRect(26, 0, 12, 32);
    var bedTex = new THREE.CanvasTexture(bedCv);
    bedTex.wrapS = THREE.RepeatWrapping;
    bedTex.repeat.set((MAP * 2 + 200) / 2.4, 1);
    var bed = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 2 + 200, 6.4), new THREE.MeshLambertMaterial({ map: bedTex }));
    bed.rotation.x = -Math.PI / 2;
    bed.position.set(0, 0.06, 620);
    scene.add(bed);

    // 1-platforma (train.js: PX1..PX2 = 235..365) + soyabon
    var plat = G.box(140, 0.5, 12, G.mat(0xb8b2a6));
    plat.position.set(cx, 0.25, 605);
    scene.add(plat);
    var pedge = G.box(140, 0.06, 0.5, G.mat(0xe8c93d));
    pedge.position.set(cx, 0.54, 610.6);
    scene.add(pedge);
    for (var ci = -2; ci <= 2; ci++) {
      var pcol = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3.4, 6), G.mat(0x8a95a5));
      pcol.position.set(cx + ci * 28, 2.2, 602);
      scene.add(pcol);
    }
    var canopy = G.box(146, 0.18, 8, G.mat(0x2e6b8a, { phong: true, shininess: 50 }));
    canopy.position.set(cx, 4.0, 603.5);
    scene.add(canopy);
    var psign = G.signMesh("1-PLATFORMA · AFROSIYOB", '#12355b', '#ffffff', 10, 1);
    psign.position.set(cx, 3.1, 609);
    scene.add(psign);
    G.landmarks.push({ x: cx, z: cz, name: 'Toshkent vokzali', r: 42, color: '#8fa5bd' });
  }

  function landAirport(scene, cx, cz) {
    // uchish-qo'nish yo'lagi (yo'llar orasiga sig'adigan qilib)
    var runway = new THREE.Mesh(new THREE.PlaneGeometry(280, 44), G.mat(0x3d4045));
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(cx, 0.05, cz + 60);
    scene.add(runway);
    for (var s = -120; s <= 120; s += 40) {
      var stripe = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.6), new THREE.MeshBasicMaterial({ color: 0xdedbd0 }));
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(cx + s, 0.08, cz + 60);
      scene.add(stripe);
    }
    // terminal
    var term = G.box(90, 14, 24, G.mat(0xd8dde4, { phong: true, shininess: 60 }));
    term.position.set(cx, 7, cz - 10);
    scene.add(term);
    var sign = G.signMesh('TOSHKENT XALQARO AEROPORTI', '#12355b', '#ffffff', 30, 2.2);
    sign.position.set(cx, 15.5, cz - 10 + 12.2);
    scene.add(sign);
    G.addCollider(cx, cz - 10, 45, 12);
    // boshqaruv minorasi
    var tw = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.6, 22, 8), G.mat(0xcfd6dd));
    tw.position.set(cx + 55, 11, cz - 10);
    scene.add(tw);
    var twTop = new THREE.Mesh(new THREE.CylinderGeometry(4, 3, 4, 8), G.mat(0x2e5f8a, { phong: true, shininess: 80 }));
    twTop.position.set(cx + 55, 24, cz - 10);
    scene.add(twTop);
    G.addCollider(cx + 55, cz - 10, 2.8, 2.8);
    // samolyotlar
    [[-55, 25, 0.5], [55, 30, -0.4]].forEach(function (pp) {
      var plane = new THREE.Group();
      var fus = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.4, 24, 10), G.mat(0xf0f2f4, { phong: true, shininess: 80 }));
      fus.rotation.z = Math.PI / 2;
      fus.position.y = 3;
      plane.add(fus);
      var nose = new THREE.Mesh(new THREE.SphereGeometry(1.8, 8, 6), G.mat(0xf0f2f4, { phong: true }));
      nose.position.set(12, 3, 0);
      nose.scale.x = 1.6;
      plane.add(nose);
      var wing = G.box(3.5, 0.3, 22, G.mat(0xd8dde4));
      wing.position.y = 2.6;
      plane.add(wing);
      var tailW = G.box(1.8, 0.25, 8, G.mat(0xd8dde4));
      tailW.position.set(-10.5, 4, 0);
      plane.add(tailW);
      var fin = G.box(2.4, 5, 0.3, G.mat(0x2ea8a5));
      fin.position.set(-11, 5.5, 0);
      plane.add(fin);
      plane.position.set(cx + pp[0], 0, cz + pp[1]);
      plane.rotation.y = pp[2];
      scene.add(plane);
      G.addCollider(cx + pp[0], cz + pp[1], 13, 11);
    });
    G.landmarks.push({ x: cx, z: cz, name: 'Toshkent aeroporti', r: 90, color: '#3d4045' });
  }

  // ---------- ANHOR KANALI (burilish bilan) ----------
  function buildCanal(scene) {
    var CX = 202, W = 14, BEND_Z = 520;
    var waterMat = new THREE.MeshPhongMaterial({ color: 0x2f7fb8, shininess: 140, transparent: true, opacity: 0.9 });
    // vertikal qism
    var seg1 = new THREE.Mesh(new THREE.PlaneGeometry(W, BEND_Z + MAP), waterMat);
    seg1.rotation.x = -Math.PI / 2;
    seg1.position.set(CX, 0.06, (BEND_Z - MAP) / 2);
    scene.add(seg1);
    // gorizontal qism (sharqqa)
    var seg2 = new THREE.Mesh(new THREE.PlaneGeometry(MAP - CX, W), waterMat);
    seg2.rotation.x = -Math.PI / 2;
    seg2.position.set((CX + MAP) / 2, 0.06, BEND_Z);
    scene.add(seg2);
    // qirg'oqlar
    var bankMat = G.mat(0xa8a094);
    [-1, 1].forEach(function (s) {
      var bank = G.box(1.6, 0.5, BEND_Z + MAP, bankMat);
      bank.position.set(CX + s * (W / 2 + 0.8), 0.25, (BEND_Z - MAP) / 2);
      scene.add(bank);
      var bank2 = G.box(MAP - CX, 0.5, 1.6, bankMat);
      bank2.position.set((CX + MAP) / 2, 0.25, BEND_Z + s * (W / 2 + 0.8));
      scene.add(bank2);
    });
    // ko'prik panjaralari
    G.ROADS.h.forEach(function (r) {
      if (r.z > BEND_Z) return;
      [-1, 1].forEach(function (s) {
        var rail = G.box(W + 4, 1, 0.3, G.mat(0x7f8c99));
        rail.position.set(CX, 0.9, r.z + s * (r.halfW + 0.3));
        scene.add(rail);
      });
    });
    G.ROADS.v.forEach(function (r) {
      if (r.x < CX + 10) return;
      [-1, 1].forEach(function (s) {
        var rail = G.box(0.3, 1, W + 4, G.mat(0x7f8c99));
        rail.position.set(r.x + s * (r.halfW + 0.3), 0.9, BEND_Z);
        scene.add(rail);
      });
    });
    // kanal bo'yi daraxtlari
    for (var z = -MAP + 30; z < BEND_Z - 10; z += 32) {
      var nearRoad = G.ROADS.h.some(function (r) { return Math.abs(z - r.z) < 18; });
      if (!nearRoad) {
        plantTree(CX - W / 2 - 5, z, true);
        plantTree(CX + W / 2 + 5, z + 14, true);
      }
    }
    for (var x = CX + 30; x < MAP - 30; x += 32) {
      var nearRoadV = G.ROADS.v.some(function (r) { return Math.abs(x - r.x) < 18; });
      if (!nearRoadV) {
        plantTree(x, BEND_Z - W / 2 - 5, true);
        plantTree(x + 14, BEND_Z + W / 2 + 5, true);
      }
    }
    G.landmarks.push({ x: CX, z: 100, name: 'Anhor kanali', r: 24, color: '#2f7fb8' });
  }

  // ---------- KO'CHA CHIROQLARI (instanced — 500 ta ustun ~3 draw call) ----------
  function buildStreetLamps(scene) {
    var poleMat = G.mat(0x555a60);
    // kunduzi so'nik, tunda yorug' (kun/tun tizimi rangini boshqaradi)
    var lampMat = new THREE.MeshBasicMaterial({ color: 0x6b6552 });
    G.streetLampMat = lampMat;
    G.streetLampPositions = [];
    // asosiy yo'llar (x=0, z=0) + yirik ko'ndalang yo'llar bo'ylab
    var corridors = [
      { vertical: true, at: 0 }, { vertical: false, at: 0 },
      { vertical: true, at: 150 }, { vertical: true, at: -150 },
      { vertical: false, at: 150 }, { vertical: false, at: -150 },
      { vertical: true, at: 450 }, { vertical: true, at: -450 },
      { vertical: false, at: 450 }, { vertical: false, at: -450 }
    ];
    var poles = [], heads = [], arms = [];
    corridors.forEach(function (cor) {
      for (var t = -1100; t <= 1100; t += 90) {
        [-1, 1].forEach(function (side) {
          var baseX, baseZ, headX, headZ, armX, armZ, armRot;
          if (cor.vertical) {
            baseX = cor.at + side * 16; baseZ = t;
            headX = baseX - side * 1.7; headZ = t;
            armX = baseX - side * 0.8; armZ = t; armRot = 0;
          } else {
            baseX = t; baseZ = cor.at + side * 16;
            headX = t; headZ = baseZ - side * 1.7;
            armX = t; armZ = baseZ - side * 0.8; armRot = Math.PI / 2;
          }
          poles.push({ x: baseX, z: baseZ });
          heads.push({ x: headX, z: headZ });
          arms.push({ x: armX, z: armZ, r: armRot });
          G.streetLampPositions.push({ x: headX, z: headZ });
        });
      }
    });
    var N = poles.length;
    var poleGeo = new THREE.CylinderGeometry(0.09, 0.13, 7, 5); poleGeo.translate(0, 3.5, 0);
    var poleInst = new THREE.InstancedMesh(poleGeo, poleMat, N);
    var headInst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.18, 0.34), lampMat, N);
    var armInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), poleMat, N);
    var m = new THREE.Matrix4(), q = new THREE.Quaternion(), qy = new THREE.Quaternion();
    var one = new THREE.Vector3(1, 1, 1), YA = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3();
    for (var i = 0; i < N; i++) {
      m.compose(v.set(poles[i].x, 0, poles[i].z), q, one); poleInst.setMatrixAt(i, m);
      m.compose(v.set(heads[i].x, 6.8, heads[i].z), q, one); headInst.setMatrixAt(i, m);
      qy.setFromAxisAngle(YA, arms[i].r);
      m.compose(v.set(arms[i].x, 6.9, arms[i].z), qy, one); armInst.setMatrixAt(i, m);
    }
    poleInst.instanceMatrix.needsUpdate = true;
    headInst.instanceMatrix.needsUpdate = true;
    armInst.instanceMatrix.needsUpdate = true;
    scene.add(poleInst); scene.add(headInst); scene.add(armInst);
  }

  function makeMetro(scene, x, z) {
    var g = new THREE.Group();
    var booth = G.box(6, 3.2, 4, G.mat(0xcdd3da));
    booth.position.y = 1.6;
    g.add(booth);
    var roofM = G.box(7, 0.3, 5, G.mat(0x2b6fb3));
    roofM.position.y = 3.35;
    g.add(roofM);
    var sign = G.signMesh('M  TOSHKENT METROSI', '#1450a0', '#ffffff', 6, 1);
    sign.position.set(0, 4.2, 2.1);
    g.add(sign);
    g.position.set(x, 0, z);
    scene.add(g);
    G.addCollider(x, z, 3.2, 2.2);
  }

  // ---------- BLOKLARNI TO'LDIRISH ----------
  function fillResidentialBlock(scene, cx, cz) {
    var colors = ['#cfc5b0', '#c4cdd4', '#d8cbb2', '#bfc8bf'];
    for (var i = -1; i <= 1; i += 2) {
      for (var j = -1; j <= 1; j += 2) {
        makeApartment(scene, cx + i * 30, cz + j * 26, 30, 11, G.randInt(4, 9), G.pick(colors), 'panelka');
      }
    }
    for (var t = 0; t < 7; t++) plantTree(cx + G.rand(-16, 16), cz + G.rand(-14, 14), Math.random() < 0.5);
  }

  function fillMahallaBlock(scene, cx, cz) {
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        if (Math.random() < 0.85) {
          makeMahallaHouse(scene, cx + i * 24 + G.rand(-3, 3), cz + j * 22 + G.rand(-3, 3), G.rand(-0.2, 0.2));
        }
      }
    }
    for (var t = 0; t < 6; t++) plantTree(cx + G.rand(-30, 30), cz + G.rand(-28, 28), false);
  }

  function fillPark(scene, cx, cz, r, withLake) {
    if (withLake) {
      var lake = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.32, r * 0.32, 0.22, 22),
        G.mat(0x2f7fb8, { phong: true, shininess: 130, opacity: 0.92, transparent: true }));
      lake.scale.z = 0.7;
      lake.position.set(cx + r * 0.3, 0.11, cz);
      scene.add(lake);
    }
    for (var t = 0; t < Math.round(r / 3); t++) {
      var tx = cx + G.rand(-r, r), tz = cz + G.rand(-r * 0.9, r * 0.9);
      if (!withLake || Math.abs(tx - (cx + r * 0.3)) > r * 0.36 || Math.abs(tz - cz) > r * 0.28) {
        plantTree(tx, tz, true);
      }
    }
  }

  // ---------- SHAHARNI AVTO-TO'LDIRISH (instanced — yuzlab bino, bir nechta draw call) ----------
  var R_EDGES = [-2400, -1900, -1400, -1000, -750, -450, -150, 0, 150, 450, 750, 1000, 1400, 1900, 2400];
  var usedCells = {};
  function cellIndex(v) {
    for (var i = 0; i < R_EDGES.length - 1; i++) {
      if (v >= R_EDGES[i] && v < R_EDGES[i + 1]) return i;
    }
    return -1;
  }
  function markUsed(x, z) {
    var i = cellIndex(x), j = cellIndex(z);
    if (i >= 0 && j >= 0) usedCells[i + ',' + j] = true;
  }
  G.markUsed = markUsed; // salon.js ham ishlatadi (avtosalonlar + uy)

  var inst = { pan5: [], pan9: [], flatA: [], offG: [], house: [] };
  var INST_DIMS = { pan5: [14, 5.5], pan9: [14, 5.5], flatA: [12, 6], offG: [8, 6.5], house: [4.5, 3.75] };

  function overlapsCollider(x, z, hw, hd) {
    for (var i = 0; i < G.colliders.length; i++) {
      var c = G.colliders[i];
      if (x + hw + 3 > c.minX && x - hw - 3 < c.maxX && z + hd + 3 > c.minZ && z - hd - 3 < c.maxZ) return true;
    }
    return false;
  }
  function inReserved(x, z, hw, hd) {
    if (Math.abs(x - 202) < 14 + hw && z < 535) return true;          // kanal (vertikal)
    if (Math.abs(z - 520) < 14 + hd && x > 185) return true;          // kanal (gorizontal)
    if (Math.abs(z - 620) < 12 + hd) return true;                     // temir yo'l (butun shahar bo'ylab)
    if (x > 225 && x < 375 && z > 592 && z < 634) return true;        // vokzal platformasi
    return false;
  }
  function tryPlace(type, x, z, rot90) {
    var dims = INST_DIMS[type];
    var hw = rot90 ? dims[1] : dims[0];
    var hd = rot90 ? dims[0] : dims[1];
    if (overlapsCollider(x, z, hw, hd) || inReserved(x, z, hw, hd) || onAsphalt(x, z, hw, hd)) return false;
    inst[type].push({ x: x, z: z, r: rot90 });
    G.addCollider(x, z, hw, hd);
    return true;
  }

  function districtAt(x, z) {
    for (var i = 0; i < G.districts.length; i++) {
      var D = G.districts[i];
      var dx = x - D.x, dz = z - D.z;
      if (dx * dx + dz * dz < D.r * D.r) return D.name;
    }
    return null;
  }

  function autoFillCity() {
    for (var i = 0; i < R_EDGES.length - 1; i++) {
      for (var j = 0; j < R_EDGES.length - 1; j++) {
        if (usedCells[i + ',' + j]) continue;
        var left = R_EDGES[i] + 24, right = R_EDGES[i + 1] - 24;
        var top = R_EDGES[j] + 24, bot = R_EDGES[j + 1] - 24;
        if (right - left < 30 || bot - top < 30) continue;
        var ccx = (left + right) / 2, ccz = (top + bot) / 2;
        var d = districtAt(ccx, ccz);
        var plan;
        if (d === 'Shahar markazi' || d === 'Mirobod') plan = 'office';
        else if (d === 'Yunusobod' || d === 'Chilonzor' || d === 'Sergeli') plan = 'panelka';
        else if (d === 'Eski shahar') plan = 'mahalla';
        else if (d === "Mirzo Ulug'bek") plan = 'mix';
        else if (d === 'Yangi Shahar') plan = 'office';               // zamonaviy shisha binolar
        else if (d === "Yangi O'zbekiston bog'i") plan = 'green';     // faqat daraxtlar
        else if (d === 'Olimpiya shaharchasi') plan = 'suburb';
        else plan = 'suburb';

        if (plan === 'green') {
          for (var tg = 0; tg < 12; tg++) {
            var tgx = G.rand(left, right), tgz = G.rand(top, bot);
            if (!overlapsCollider(tgx, tgz, 1, 1) && !inReserved(tgx, tgz, 1, 1)) plantTree(tgx, tgz, Math.random() < 0.6);
          }
          continue;
        }

        if (plan === 'mahalla' || plan === 'suburb') {
          var skip = plan === 'suburb' ? 0.5 : 0.15;
          for (var x = left + 8; x <= right - 8; x += 30) {
            for (var z = top + 8; z <= bot - 8; z += 26) {
              if (Math.random() < skip) continue;
              tryPlace('house', x + G.rand(-4, 4), z + G.rand(-3, 3), Math.random() < 0.3);
            }
          }
        } else if (plan === 'panelka') {
          for (var x2 = left + 18; x2 <= right - 18; x2 += 52) {
            for (var z2 = top + 12; z2 <= bot - 12; z2 += 42) {
              if (Math.random() < 0.22) continue;
              var tall = Math.random() < (d === 'Yunusobod' ? 0.5 : 0.35);
              tryPlace(tall ? 'pan9' : 'pan5', x2 + G.rand(-5, 5), z2 + G.rand(-4, 4), Math.random() < 0.35);
            }
          }
        } else {
          for (var x3 = left + 14; x3 <= right - 14; x3 += 48) {
            for (var z3 = top + 12; z3 <= bot - 12; z3 += 44) {
              if (Math.random() < 0.3) continue;
              var t = plan === 'mix'
                ? (Math.random() < 0.5 ? 'house' : 'pan5')
                : (Math.random() < 0.45 ? 'offG' : 'flatA');
              tryPlace(t, x3 + G.rand(-5, 5), z3 + G.rand(-4, 4), Math.random() < 0.3);
            }
          }
        }
        for (var t2 = 0; t2 < 3; t2++) {
          var tx = G.rand(left + 5, right - 5), tz = G.rand(top + 5, bot - 5);
          if (!overlapsCollider(tx, tz, 1, 1) && !inReserved(tx, tz, 1, 1)) plantTree(tx, tz, Math.random() < 0.4);
        }
      }
    }
  }

  function finalizeInstanced(scene) {
    var q0 = new THREE.Quaternion();
    var q90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    var one = new THREE.Vector3(1, 1, 1);
    var m4 = new THREE.Matrix4();

    function makeInst(list, geo, mat, y, colorize) {
      if (!list.length) return;
      var im = new THREE.InstancedMesh(geo, mat, list.length);
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        m4.compose(new THREE.Vector3(e.x, y, e.z), e.r ? q90 : q0, one);
        im.setMatrixAt(i, m4);
        if (colorize) im.setColorAt(i, colorize[i % colorize.length]);
      }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      scene.add(im);
    }

    function panelMats(color, floors) {
      var front = new THREE.MeshLambertMaterial({ map: G.buildingTexture(color, floors, 7, 'panelka') });
      var side = new THREE.MeshLambertMaterial({ map: G.buildingTexture(color, floors, 3, 'panelka') });
      var roof = G.mat(0x5c5650);
      return [side, side, roof, roof, front, front];
    }

    makeInst(inst.pan5, new THREE.BoxGeometry(28, 15, 11), panelMats('#cfc5b0', 5), 7.5);
    makeInst(inst.pan9, new THREE.BoxGeometry(28, 27, 11), panelMats('#c4cdd4', 9), 13.5);
    makeInst(inst.flatA, new THREE.BoxGeometry(24, 18, 12), panelMats('#c8beac', 6), 9);
    var offMat = new THREE.MeshPhongMaterial({ map: G.buildingTexture('#274b63', 7, 5, 'glass'), shininess: 110, specular: 0x88aacc });
    makeInst(inst.offG, new THREE.BoxGeometry(16, 22, 13), offMat, 11);
    var houseColors = [new THREE.Color(0xd8c9a8), new THREE.Color(0xcfc0a0), new THREE.Color(0xe0d2b4), new THREE.Color(0xd4c4a0)];
    makeInst(inst.house, new THREE.BoxGeometry(9, 3.4, 7.5), new THREE.MeshLambertMaterial({ color: 0xffffff }), 1.7, houseColors);
    // hovli uylari tomlari
    if (inst.house.length) {
      var roofGeo = new THREE.ConeGeometry(6.2, 2.2, 4);
      roofGeo.rotateY(Math.PI / 4);
      var imR = new THREE.InstancedMesh(roofGeo, G.mat(0x7d5236), inst.house.length);
      for (var ri = 0; ri < inst.house.length; ri++) {
        var e2 = inst.house[ri];
        m4.compose(new THREE.Vector3(e2.x, 4.5, e2.z), e2.r ? q90 : q0, one);
        imR.setMatrixAt(ri, m4);
      }
      imR.instanceMatrix.needsUpdate = true;
      scene.add(imR);
    }
  }

  // ---------- BULUTLAR ----------
  function buildClouds(scene) {
    var n = 26;
    var geo = new THREE.SphereGeometry(1, 7, 5);
    var mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    var inst = new THREE.InstancedMesh(geo, mat, n);
    var m4 = new THREE.Matrix4();
    var q = new THREE.Quaternion();
    for (var i = 0; i < n; i++) {
      var sx = G.rand(18, 48);
      m4.compose(
        new THREE.Vector3(G.rand(-MAP, MAP), G.rand(150, 260), G.rand(-MAP, MAP)),
        q,
        new THREE.Vector3(sx, sx * 0.28, sx * 0.6)
      );
      inst.setMatrixAt(i, m4);
    }
    inst.instanceMatrix.needsUpdate = true;
    scene.add(inst);
  }

  // ---------- ASOSIY QURISH ----------
  G.buildWorld = function (scene) {
    buildTrafficRoads();

    var ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 2 + 600, MAP * 2 + 600), G.mat(0x6a8f56));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    buildRoads(scene);
    buildTrafficLights(scene);
    buildCanal(scene);
    buildStreetLamps(scene);
    buildClouds(scene);

    // ===== MARKAZ =====
    landAmirTemur(scene, 75, -75);
    landHotelUzbekistan(scene, 75, -128);
    landTashkentCity(scene, -75, -75);
    landMustaqillik(scene, -75, 75);
    landNavoiyTeatr(scene, -75, 250);
    landMinor(scene, -1650, -1650); // shimoli-g'arbga ko'chirildi (markaz bo'shashsin)

    // Kuranty
    (function () {
      var tower = G.box(5, 22, 5, G.mat(0xd9cba8));
      tower.position.set(32, 11, -32);
      scene.add(tower);
      var clockM = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 12), G.mat(0xf5f0e0));
      clockM.rotation.x = Math.PI / 2;
      clockM.position.set(32, 18, -29.6);
      scene.add(clockM);
      var roofK = new THREE.Mesh(new THREE.ConeGeometry(3.8, 3.4, 4), G.mat(0x2a9d9a));
      roofK.position.set(32, 23.7, -32);
      roofK.rotation.y = Math.PI / 4;
      scene.add(roofK);
      G.addCollider(32, -32, 2.8, 2.8);
    })();

    // Broadway savdo ko'chasi
    makeShop(scene, { x: 40, z: 24, w: 16, d: 12, rot: Math.PI, kind: 'oshxona', name: 'BESHQOZON', signBg: '#1c7a45', signFg: '#ffd23f', wallColor: 0xd9c9a8 });
    makeShop(scene, { x: 66, z: 24, w: 14, d: 12, rot: Math.PI, kind: 'fastfood', name: 'EVOS', signBg: '#d81f26', signFg: '#ffffff', wallColor: 0xe8e2d8 });
    makeShop(scene, { x: 100, z: 26, w: 24, d: 16, rot: Math.PI, kind: 'korzinka', name: 'korzinka', signBg: '#e02020', signFg: '#ffffff', wallColor: 0xf0ede6 });
    makeApartment(scene, 50, 80, 24, 14, 6, '#cdd3da', 'flat');
    makeApartment(scene, 100, 80, 26, 14, 8, '#c8beac', 'flat');
    makeGlassTower(scene, 75, 118, 18, 14, 34, '#2a5570');

    makeShop(scene, { x: 45, z: 190, w: 15, d: 11, rot: Math.PI, kind: 'choyxona', name: 'CHOYXONA RAYHON', signBg: '#1c6b4f', signFg: '#ffd23f', wallColor: 0xd8c9a8 });
    makeShop(scene, { x: 78, z: 190, w: 14, d: 11, rot: Math.PI, kind: 'fastfood', name: 'OQTEPA LAVASH', signBg: '#e07b1a', signFg: '#ffffff', wallColor: 0xe8e2d8 });
    makeShop(scene, { x: 255, z: 26, w: 22, d: 15, rot: Math.PI, kind: 'korzinka', name: 'korzinka', signBg: '#e02020', signFg: '#ffffff', wallColor: 0xf0ede6 });
    makeShop(scene, { x: 288, z: 25, w: 13, d: 11, rot: Math.PI, kind: 'oshxona', name: "NOMDOR", signBg: '#8a2a2a', signFg: '#ffd23f', wallColor: 0xd9c9a8 });

    // ===== YUNUSOBOD (shimol) =====
    landTvTower(scene, 250, -600);
    makeShop(scene, { x: 60, z: -424, w: 20, d: 14, rot: Math.PI, kind: 'korzinka', name: 'korzinka', signBg: '#e02020', signFg: '#ffffff', wallColor: 0xf0ede6 });
    makeShop(scene, { x: 100, z: -424, w: 14, d: 11, rot: Math.PI, kind: 'fastfood', name: 'FEEDUP', signBg: '#f47b20', signFg: '#ffffff', wallColor: 0xe8e2d8 });
    fillPark(scene, -300, -600, 80, true);

    // ===== ESKI SHAHAR (shimoli-g'arb) =====
    landChorsu(scene, -600, -600);
    landHazratiImom(scene, -600, -830);
    // Kukeldash madrasasi
    (function () {
      var cx = -480, cz = -530;
      var brick = G.mat(0xc9a475);
      var portal = G.box(14, 15, 3, brick);
      portal.position.set(cx, 7.5, cz);
      scene.add(portal);
      var arch = G.box(7, 10, 3.2, G.mat(0x1c4a6b));
      arch.position.set(cx, 5, cz + 0.1);
      scene.add(arch);
      var court = G.box(30, 6, 24, brick);
      court.position.set(cx, 3, cz - 13);
      scene.add(court);
      G.addCollider(cx, cz - 8, 16, 15);
      G.landmarks.push({ x: cx, z: cz, name: 'Kukeldash madrasasi', r: 28, color: '#c9a475' });
    })();
    makeShop(scene, { x: -560, z: -424, w: 14, d: 11, rot: Math.PI, kind: 'fastfood', name: 'EVOS', signBg: '#d81f26', signFg: '#ffffff', wallColor: 0xe8e2d8 });

    // ===== CHILONZOR (janubi-g'arb) =====
    landHumoArena(scene, -600, 75);
    landBunyodkor(scene, -1650, 1650); // janubi-g'arbiy kvadrantga — har tomonda bittadan yirik obyekt
    makeShop(scene, { x: -560, z: 476, w: 20, d: 14, rot: Math.PI, kind: 'korzinka', name: 'korzinka', signBg: '#e02020', signFg: '#ffffff', wallColor: 0xf0ede6 });
    makeShop(scene, { x: -520, z: 476, w: 13, d: 11, rot: Math.PI, kind: 'choyxona', name: 'CHILONZOR CHOYXONASI', signBg: '#1c6b4f', signFg: '#ffd23f', wallColor: 0xd8c9a8 });
    fillPark(scene, -450 + 80, 450 + 90, 90, true); // Milliy bog'
    G.landmarks.push({ x: -370, z: 540, name: "Milliy bog'", r: 90, color: '#3e7a3a' });

    // ===== MIRZO ULUG'BEK (sharq) =====
    landMegaPlanet(scene, 600, -1650); // shimolga ko'chirildi
    fillPark(scene, 900, -100, 80, false); // Botanika bog'i
    G.landmarks.push({ x: 900, z: -100, name: "Botanika bog'i", r: 85, color: '#3e7a3a' });
    makeShop(scene, { x: 620, z: 176, w: 14, d: 11, rot: Math.PI, kind: 'oshxona', name: 'BESHQOZON', signBg: '#1c7a45', signFg: '#ffd23f', wallColor: 0xd9c9a8 });

    // ===== MIROBOD / JANUB =====
    landMagicCity(scene, 1630, 1650); // janubi-sharqiy kvadrantga ko'chirildi
    landVokzal(scene, 300, 580);

    // ===== SERGELI =====
    makeShop(scene, { x: 320, z: 776, w: 14, d: 11, rot: Math.PI, kind: 'fastfood', name: 'FEEDUP', signBg: '#f47b20', signFg: '#ffffff', wallColor: 0xe8e2d8 });

    // ===== AEROPORT (janub, halqa tashqarisida) =====
    landAirport(scene, 300, 1070);

    // metro kirishlari
    makeMetro(scene, 24, -24);
    makeMetro(scene, -30, 130);
    makeMetro(scene, 130, 24);
    makeMetro(scene, 60, -480);
    makeMetro(scene, -480, 60);
    makeMetro(scene, -480, -480);

    // trotuar bo'yi daraxtlari (asosiy yo'llar)
    for (var t2 = -1100; t2 <= 1100; t2 += 60) {
      var nearH = G.ROADS.h.some(function (r) { return Math.abs(t2 - r.z) < 22; });
      var nearV = G.ROADS.v.some(function (r) { return Math.abs(t2 - r.x) < 22; });
      if (!nearH) {
        plantTree(-22, t2, false);
        plantTree(22, t2 + 25, false);
      }
      if (!nearV) {
        plantTree(t2, -22, false);
        plantTree(t2 + 25, 22, false);
      }
    }
    // ===== BO'SH KATAKLARNI BINOLAR BILAN TO'LDIRISH =====
    // katta inshootlar joylashgan kataklar to'ldirilmaydi
    // ===== YANGI O'ZBEKISTON TOMONI (sharq) =====
    landYangiPark(scene, 1650, -300);
    landOlympic(scene, 1650, -1600);
    landYangiShahar(scene, 1650, 300);

    [[75, -75], [-75, -75], [-75, 75],            // Amir Temur, Tashkent City, Mustaqillik
     [-75, 250], [245, -75],                       // Navoiy teatri, Minor
     [-600, -600], [-600, -830], [-600, 75],       // Chorsu+Kukeldash, Hazrati Imom, Humo
     [-1650, 1650], [250, -600], [1630, 1650],     // Bunyodkor (JG'), Teleminora, Magic City (JSh)
     [600, -1650], [300, 580], [-1650, -1650],     // Mega Planet (Sh), Vokzal, Minor (ShG')
     [-300, -600], [-370, 540], [900, -100],       // parklar
     [1650, -300], [1650, -160], [1530, -300],     // Yangi O'zbekiston bog'i (3 katak)
     [1530, -1600], [1760, -1600], [1650, -1450],  // Olimpiya shaharchasi
     [1650, 300], [1650, 200]                      // Yangi Shahar minoralari
    ].forEach(function (p) { markUsed(p[0], p[1]); });
    buildStations(scene); // benzokolonka + servislar (autofill'dan oldin — kolliderlar hisobga olinsin)
    if (G.initSalon) G.initSalon(scene); // avtosalon (autofilldan OLDIN — joy band qilinadi)
    autoFillCity();
    finalizeInstanced(scene);
    scatterKiosks(scene, 72); // katta xarita — do'konlar ham ko'proq

    // tumanlardagi tasodifiy daraxtlar (binolarga tegmaydigan joylarda)
    for (var rt = 0; rt < 220; rt++) {
      var tx = G.rand(-MAP + 60, MAP - 60), tz = G.rand(-MAP + 60, MAP - 60);
      var onRoad = G.ROADS.v.some(function (r) { return Math.abs(tx - r.x) < r.halfW + 8; }) ||
                   G.ROADS.h.some(function (r) { return Math.abs(tz - r.z) < r.halfW + 8; });
      if (!onRoad && !inReserved(tx, tz, 1, 1) && !overlapsCollider(tx, tz, 1, 1)) plantTree(tx, tz, Math.random() < 0.4);
    }

    finalizeTrees(scene);
    G.buildColliderIndex();
    G.MAP = MAP;
  };
})();
