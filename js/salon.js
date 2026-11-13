// ============ 3 TA PREMIUM AVTOSALON + MENING GARAJIM ============
// Lux Motors (Mercedes/BMW), Audi Markazi, VW Salon — har birida har xil mashinalar,
// trafikda uchramaydi. Sotib olingan mashina UYINGIZ garajiga qo'yiladi (10 joy).
// Uy — 1 qavat, keng: mehmonxona + uxlash xonasi + oshxona. Ichkariga kirganda
// tashqi devorlar va tom shaffof bo'ladi (kamera to'sig'i yo'q), ichki devorlar past.
window.G = window.G || {};

(function () {
  var PRICES = {
    // Lux Motors
    'Mercedes E200': 800000, 'Mercedes S500': 1400000, 'Mercedes Maybach': 3000000, 'Mercedes G63': 2200000,
    'BMW M5': 1000000, 'BMW M8': 1900000, 'BMW X7': 1700000,
    // Audi Markazi
    'Audi A6': 600000, 'Audi A8 L': 1300000, 'Audi Q7': 1500000,
    'Audi RS7': 2000000, 'Audi RS Q8': 2400000, 'Audi R8': 3500000,
    'Lamborghini SVJ': 8000000,
    // VW Salon
    'VW Polo': 350000, 'VW Jetta': 500000, 'VW Passat': 700000,
    'VW Arteon': 1200000, 'VW Tiguan': 900000, 'VW Touareg': 1600000
  };

  var SALONS = [
    { cx: 1650, cz: 870, title: 'LUX MOTORS', sub: 'MERCEDES-BENZ · BMW', showcase: 'Mercedes G63',
      lm: 'Avtosalon Lux', icon: '🏎️',
      cars: ['Mercedes E200', 'Mercedes S500', 'Mercedes Maybach', 'Mercedes G63', 'BMW M5', 'BMW M8', 'BMW X7'] }, // Yangi Shaharda
    { cx: 320, cz: -672, title: 'AUDI MARKAZI', sub: 'RS · QUATTRO · LAMBORGHINI', showcase: 'Lamborghini SVJ',
      lm: 'Avtosalon Audi', icon: '🏎️',
      cars: ['Audi A6', 'Audi A8 L', 'Audi Q7', 'Audi RS7', 'Audi RS Q8', 'Audi R8', 'Lamborghini SVJ'] },
    { cx: -320, cz: 672, title: 'VW SALON', sub: 'VOLKSWAGEN', showcase: 'VW Touareg',
      lm: 'Avtosalon VW', icon: '🚙',
      cars: ['VW Polo', 'VW Jetta', 'VW Passat', 'VW Arteon', 'VW Tiguan', 'VW Touareg'] }
  ];

  var HOUSE = { x: -1650, z: 75 }; // g'arbiy dala hovli — tinch joyda
  var GARAGE_CAP = 10;

  var scene = null;
  var displays = [];
  var lotUsed = 0;

  function fmtSom(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
  }

  // ---------- BITTA SALON (parametrik) ----------
  function buildSalon(cfg) {
    var cx = cfg.cx, cz = cfg.cz;
    var n = cfg.cars.length;
    var padW = Math.max(56, n * 12 + 18);

    var pad = new THREE.Mesh(new THREE.PlaneGeometry(padW, 40), G.mat(0xb8bcc2));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(cx, 0.07, cz);
    scene.add(pad);

    var glassMat = new THREE.MeshPhongMaterial({ color: 0x9fc4d8, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    var frame = G.mat(0xe8eaec);
    var back = G.box(44, 6.5, 0.3, glassMat); back.position.set(cx, 3.25, cz + 20); scene.add(back);
    var front = G.box(44, 6.5, 0.3, glassMat); front.position.set(cx, 3.25, cz + 8); scene.add(front);
    [cx - 22, cx + 22].forEach(function (x) {
      var side = G.box(0.3, 6.5, 12, glassMat); side.position.set(x, 3.25, cz + 14); scene.add(side);
    });
    [cx - 22, cx - 7, cx + 7, cx + 22].forEach(function (x) {
      var c1 = G.box(0.5, 6.5, 0.5, frame); c1.position.set(x, 3.25, cz + 8); scene.add(c1);
      var c2 = G.box(0.5, 6.5, 0.5, frame); c2.position.set(x, 3.25, cz + 20); scene.add(c2);
    });
    var roof = G.box(46, 0.5, 14, G.mat(0x2c3a47)); roof.position.set(cx, 6.75, cz + 14); scene.add(roof);
    G.addCollider(cx, cz + 14, 22, 6.5);

    var signBack = G.box(26, 2.0, 0.2, G.mat(0x101820));
    signBack.position.set(cx, 8.3, cz + 8.2); scene.add(signBack);
    var sign = G.signMesh(cfg.title, '#101820', '#ffd23f', 24, 1.8);
    sign.position.set(cx, 8.3, cz + 8.35); sign.rotation.y = Math.PI; scene.add(sign);
    var sub = G.signMesh(cfg.sub, '#1a2536', '#ffffff', 17, 1.0);
    sub.position.set(cx, 7.1, cz + 8.35); sub.rotation.y = Math.PI; scene.add(sub);

    var ped = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.4, 18), G.mat(0x3d4450));
    ped.position.set(cx, 0.2, cz + 14); scene.add(ped);
    var spinGroup = new THREE.Group();
    spinGroup.add(G.createCarMesh(cfg.showcase));
    spinGroup.position.set(cx, 0.4, cz + 14);
    scene.add(spinGroup);
    if (G.animated) G.animated.push({ fn: function (dt) { spinGroup.rotation.y += dt * 0.4; } });

    cfg.cars.forEach(function (name, i) {
      var x = cx - (n - 1) * 6 + i * 12, z = cz - 12;
      var mesh = G.createCarMesh(name);
      mesh.position.set(x, 0.02, z);
      mesh.rotation.y = Math.PI / 2 - 0.25;
      scene.add(mesh);
      G.addCollider(x, z, 1.6, 1.6);
      displays.push({ name: name, price: PRICES[name], x: x, z: z });
      var board = G.signMesh(name + ' — ' + fmtSom(PRICES[name]), '#101820', '#ffd23f', 7.5, 0.85);
      board.position.set(x, 2.8, z - 1.3);
      board.rotation.y = Math.PI;
      scene.add(board);
    });

    G.landmarks.push({ x: cx, z: cz, name: cfg.lm, r: 30, color: '#3d8ec9' });
    if (G.LANDMARK_ICONS) G.LANDMARK_ICONS[cfg.lm] = cfg.icon;
    if (G.markUsed) G.markUsed(cx, cz);
  }

  // ---------- MENING UYIM (1 qavat) + GARAJ ----------
  // Ichkariga kirganda shaffoflashadigan tashqi qobiq materiallari
  var shellFade = [];   // {m, base}
  var houseZone = null;

  function shellMat(color, baseOpacity, phong) {
    var m = phong
      ? new THREE.MeshPhongMaterial({ color: color, transparent: true, opacity: baseOpacity, side: THREE.DoubleSide })
      : new THREE.MeshLambertMaterial({ color: color, transparent: true, opacity: baseOpacity });
    shellFade.push({ m: m, base: baseOpacity });
    return m;
  }

  function buildHouse() {
    var hx = HOUSE.x, hz = HOUSE.z;
    var woodMat = G.mat(0x8a5a30);
    var darkMat = G.mat(0x3a3f46);
    var wallS = shellMat(0xe0d6c4, 1);        // tashqi devor — shaffoflashadi
    var roofS = shellMat(0x6b4a3a, 1);        // tom — shaffoflashadi
    var glassS = shellMat(0x9fc4d8, 0.3, true);
    var lowMat = G.mat(0xcfc5b2);             // ichki PAST devorlar (kamera ustidan ko'radi)

    // hovli
    var pad = new THREE.Mesh(new THREE.PlaneGeometry(58, 36), G.mat(0xb0a894));
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(hx, 0.07, hz);
    scene.add(pad);

    // ===== GARAJ (10 joy, old tomonda) =====
    var gFloor = new THREE.Mesh(new THREE.PlaneGeometry(52, 7.5), G.mat(0x8a8d90));
    gFloor.rotation.x = -Math.PI / 2;
    gFloor.position.set(hx + 0.5, 0.09, hz - 12);
    scene.add(gFloor);
    var gRoof = G.box(52, 0.3, 7.5, darkMat);
    gRoof.position.set(hx + 0.5, 3.0, hz - 12);
    scene.add(gRoof);
    for (var ci = 0; ci <= 5; ci++) {
      var col = G.box(0.35, 3, 0.35, G.mat(0xd0d0d0));
      col.position.set(hx - 25 + ci * 10.2, 1.5, hz - 8.6);
      scene.add(col);
      G.addCollider(hx - 25 + ci * 10.2, hz - 8.6, 0.3, 0.3);
    }
    for (var li = 0; li <= GARAGE_CAP; li++) {
      var line = G.box(0.12, 0.02, 6.5, G.mat(0xe8c93d));
      line.position.set(hx - 25 + li * 5, 0.12, hz - 12);
      scene.add(line);
    }
    var gSignBack = G.box(14, 1.4, 0.15, G.mat(0x101820));
    gSignBack.position.set(hx, 3.9, hz - 15.6);
    scene.add(gSignBack);
    var gSign = G.signMesh('MENING GARAJIM', '#101820', '#5be07a', 13, 1.2);
    gSign.position.set(hx, 3.9, hz - 15.7);
    gSign.rotation.y = Math.PI;
    scene.add(gSign);

    // ===== UY: 26 x 18, bitta qavat, balandligi 3.5 =====
    var fx1 = hx - 13, fx2 = hx + 13, fz1 = hz + 2, fz2 = hz + 18;
    houseZone = { x1: fx1 - 4, x2: fx2 + 4, z1: fz1 - 3, z2: fz2 + 3 };

    // pol
    var floor1 = G.box(26, 0.25, 16, woodMat);
    floor1.position.set(hx, 0.14, hz + 10);
    scene.add(floor1);

    function wall(wx, wy, wz, w, h, d, mat) {
      var m = G.box(w, h, d, mat);
      m.position.set(wx, wy, wz);
      scene.add(m);
      return m;
    }

    // tashqi devorlar (h 3.5) — eshik oralig'i old markazda
    wall(hx, 1.75, fz2, 26, 3.5, 0.35, wallS);              // orqa
    G.addCollider(hx, fz2, 13, 0.4);
    wall(fx1, 1.75, hz + 10, 0.35, 3.5, 16, wallS);         // chap
    G.addCollider(fx1, hz + 10, 0.4, 8);
    wall(fx2, 1.75, hz + 10, 0.35, 3.5, 16, wallS);         // o'ng
    G.addCollider(fx2, hz + 10, 0.4, 8);
    wall(hx - 7.1, 1.75, fz1, 11.8, 3.5, 0.35, wallS);      // old chap
    G.addCollider(hx - 7.1, fz1, 5.9, 0.4);
    wall(hx + 7.1, 1.75, fz1, 11.8, 3.5, 0.35, wallS);      // old o'ng
    G.addCollider(hx + 7.1, fz1, 5.9, 0.4);
    // old oynalar
    [hx - 7, hx + 7].forEach(function (wx2) {
      var win = G.box(4.5, 1.5, 0.15, glassS);
      win.position.set(wx2, 1.9, fz1 - 0.12);
      scene.add(win);
    });
    // tom
    var roof = G.box(27.5, 0.3, 17.5, roofS);
    roof.position.set(hx, 3.75, hz + 10);
    scene.add(roof);

    // ===== ICHKI PAST DEVORLAR (h 1.3) — xonalarni ajratadi, kamerani to'smaydi =====
    // orqa xonalar chizig'i z = hz+10: [yotoqxona eshigi] va [oshxona eshigi] oraliqlari bilan
    wall(hx - 8.8, 0.65, hz + 10, 8.4, 1.3, 0.3, lowMat);   // chap segment
    G.addCollider(hx - 8.8, hz + 10, 4.2, 0.15);
    wall(hx + 1.1, 0.65, hz + 10, 6.6, 1.3, 0.3, lowMat);   // o'rta segment
    G.addCollider(hx + 1.1, hz + 10, 3.3, 0.15);
    wall(hx + 9.9, 0.65, hz + 10, 6.2, 1.3, 0.3, lowMat);   // o'ng segment
    G.addCollider(hx + 9.9, hz + 10, 3.1, 0.15);
    // yotoqxona | oshxona ajratkichi
    wall(hx + 0.5, 0.65, hz + 14, 0.3, 1.3, 8, lowMat);
    G.addCollider(hx + 0.5, hz + 14, 0.15, 4);

    // ===== MEHMONXONA (old qism) =====
    var gilam = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 4.2), G.mat(0x8f2f3f));
    gilam.rotation.x = -Math.PI / 2;
    gilam.position.set(hx - 5.5, 0.28, hz + 6.4);
    scene.add(gilam);
    var tv = G.box(2.6, 1.4, 0.12, G.mat(0x0c0e10)); tv.position.set(hx - 7, 1.6, fz1 + 0.4); scene.add(tv);
    var divan = G.box(3.4, 0.8, 1.15, G.mat(0x2a5f7a)); divan.position.set(hx - 7, 0.65, hz + 8.6); scene.add(divan);
    var divanBack = G.box(3.4, 0.75, 0.3, G.mat(0x24506a)); divanBack.position.set(hx - 7, 1.35, hz + 9.15); scene.add(divanBack);
    var stol = G.box(1.7, 0.5, 1, woodMat); stol.position.set(hx - 7, 0.55, hz + 6.3); scene.add(stol);
    var kreslo = G.box(1.1, 0.8, 1.1, G.mat(0x7a4a2e)); kreslo.position.set(hx - 2.6, 0.65, hz + 6.4); scene.add(kreslo);

    // ===== UXLASH XONASI (orqa-chap) =====
    var krovat = G.box(2.3, 0.5, 1.9, G.mat(0xf2f2f0)); krovat.position.set(hx - 9, 0.55, hz + 15.2); scene.add(krovat);
    var korpa = G.box(2.3, 0.18, 1.3, G.mat(0x7a3b52)); korpa.position.set(hx - 9, 0.85, hz + 15.5); scene.add(korpa);
    var yostiq = G.box(0.8, 0.16, 0.5, G.mat(0xeaeaea)); yostiq.position.set(hx - 9, 0.85, hz + 14.5); scene.add(yostiq);
    var bosh = G.box(2.3, 1.0, 0.2, woodMat); bosh.position.set(hx - 9, 0.9, hz + 16.2); scene.add(bosh);
    var shkaf = G.box(0.7, 2.3, 3, woodMat); shkaf.position.set(fx1 + 0.75, 1.3, hz + 12.5); scene.add(shkaf);
    var tumba = G.box(0.6, 0.6, 0.6, woodMat); tumba.position.set(hx - 6.9, 0.45, hz + 16.2); scene.add(tumba);

    // ===== OSHXONA (orqa-o'ng) =====
    var counter = G.box(5.5, 0.95, 0.85, G.mat(0xd0d5da)); counter.position.set(hx + 7.5, 0.62, fz2 - 0.95); scene.add(counter);
    var plita = G.box(1.3, 0.1, 0.72, G.mat(0x14171a)); plita.position.set(hx + 6.2, 1.15, fz2 - 0.95); scene.add(plita);
    var muzlatgich = G.box(0.95, 2.1, 0.95, G.mat(0xe8eaec)); muzlatgich.position.set(fx2 - 1.2, 1.2, fz2 - 1.2); scene.add(muzlatgich);
    var oshStol = G.box(1.9, 0.55, 1.25, woodMat); oshStol.position.set(hx + 6, 0.6, hz + 12.6); scene.add(oshStol);
    [hx + 4.8, hx + 7.2].forEach(function (sx2) {
      var stul = G.box(0.5, 0.5, 0.5, G.mat(0x5c3a1e));
      stul.position.set(sx2, 0.4, hz + 13.8);
      scene.add(stul);
    });

    // shift chiroqlari (tom bilan birga shaffoflashadi)
    [[hx - 6, hz + 6.5], [hx - 8, hz + 14.5], [hx + 7, hz + 13]].forEach(function (p) {
      var lampM = new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 1 });
      shellFade.push({ m: lampM, base: 1 });
      var lamp = G.box(0.9, 0.08, 0.9, lampM);
      lamp.position.set(p[0], 3.45, p[1]);
      scene.add(lamp);
    });

    // panjara (old tomon ochiq — mashina uchun)
    var fenceMat = G.mat(0x8a95a5);
    var fL = G.box(0.3, 1.1, 36, fenceMat); fL.position.set(hx - 29, 0.55, hz); scene.add(fL);
    G.addCollider(hx - 29, hz, 0.3, 18);
    var fR = G.box(0.3, 1.1, 36, fenceMat); fR.position.set(hx + 29, 0.55, hz); scene.add(fR);
    G.addCollider(hx + 29, hz, 0.3, 18);
    var fS = G.box(58, 1.1, 0.3, fenceMat); fS.position.set(hx, 0.55, hz + 18 + 2.5);
    scene.add(fS);
    G.addCollider(hx, hz + 20.5, 29, 0.3);

    G.landmarks.push({ x: hx, z: hz, name: 'Mening uyim', r: 32, color: '#d9a441' });
    if (G.LANDMARK_ICONS) G.LANDMARK_ICONS['Mening uyim'] = '🏠';
    if (G.markUsed) G.markUsed(hx, hz);
  }

  // Har kadrda: uy ichida bo'lsangiz tashqi qobiq shaffoflashadi
  G.updateHouse = function (dt, px, pz) {
    if (!houseZone) return;
    var inside = px > houseZone.x1 && px < houseZone.x2 && pz > houseZone.z1 && pz < houseZone.z2;
    var k = Math.min(1, dt * 7);
    for (var i = 0; i < shellFade.length; i++) {
      var e = shellFade[i];
      var target = inside ? e.base * 0.12 : e.base;
      e.m.opacity += (target - e.m.opacity) * k;
      e.m.depthWrite = e.m.opacity > 0.5;
    }
  };

  // garaj joyiga mashina qo'yish
  function spawnOwnedCar(name) {
    if (lotUsed >= GARAGE_CAP) return null;
    var x = HOUSE.x - 22.5 + lotUsed * 5;
    var z = HOUSE.z - 12;
    lotUsed++;
    var car = G.makeCarEntity(name, x, z, -Math.PI / 2);
    scene.add(car.mesh);
    G.allCars.push(car);
    return car;
  }

  G.initSalon = function (s) {
    scene = s;
    SALONS.forEach(buildSalon);
    buildHouse();
  };

  G.salonSpawnOwned = function (owned) {
    if (!scene || !owned) return;
    owned.forEach(function (name) {
      if (PRICES[name]) spawnOwnedCar(name);
    });
  };

  G.salonOffer = function (px, pz) {
    for (var i = 0; i < displays.length; i++) {
      var d = displays[i];
      var dx = px - d.x, dz = pz - d.z;
      if (dx * dx + dz * dz < 3.5 * 3.5) {
        var owned = G.getOwned && G.getOwned().indexOf(d.name) >= 0;
        return { name: d.name, price: d.price, owned: owned };
      }
    }
    return null;
  };

  G.salonBuy = function (px, pz) {
    var offer = G.salonOffer(px, pz);
    if (!offer) return false;
    if (offer.owned) {
      if (G.showToast) G.showToast('✅ ' + offer.name + ' sizda bor — garajingizda (xaritada 🏠)', '#f2c94c');
      return true;
    }
    if (G.getOwned && G.getOwned().length >= GARAGE_CAP) {
      if (G.showToast) G.showToast("Garaj to'la! (" + GARAGE_CAP + '/' + GARAGE_CAP + ' joy band)', '#eb5757');
      return true;
    }
    if (!G.spendMoney(offer.price)) {
      if (G.showToast) G.showToast('Pul yetmaydi! ' + offer.name + ' — ' + fmtSom(offer.price), '#eb5757');
      return true;
    }
    G.addOwned(offer.name);
    spawnOwnedCar(offer.name);
    if (G.sfx && G.sfx.ding) G.sfx.ding();
    if (G.showToast) G.showToast('🔑 ' + offer.name + ' sizniki! Uyingiz garajida (xaritada 🏠)', '#5be07a');
    return true;
  };
})();
