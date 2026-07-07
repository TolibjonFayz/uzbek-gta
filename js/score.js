// ============ REYTING / SCORE + OLTIN YULDUZLAR ============
// Masofa, terilgan yulduzlar (25 ta shahar bo'ylab), missiyalar, rekord tezlik.
// Hammasi localStorage'da saqlanadi. B — reyting paneli.
window.G = window.G || {};

(function () {
  var scene = null;
  var LS_KEY = 'tc_stats_v1';

  // Yulduzlar joylari: mashhur joylar oldi + chorraha burchaklari (bino yo'q zonalar)
  var STAR_SPOTS = [
    [75, -40],      // Amir Temur maydoni
    [-75, -105],    // Tashkent City
    [-95, 75],      // Mustaqillik maydoni
    [245, -95],     // Minor masjidi oldi
    [75, -100],     // Hotel Uzbekistan
    [-75, 222],     // Navoiy teatri
    [32, -55],      // Kuranty
    [-600, -560],   // Chorsu bozori oldi
    [-433, -167],   // Eski shahar chorrahasi
    [250, -560],    // Teleminora
    [420, 210],     // Magic City
    [640, -390],    // Mega Planet
    [300, 545],     // Vokzal maydoni
    [180, 1022],    // Aeroport yo'li
    [-600, 902],    // Bunyodkor ortida
    [900, -60],     // Botanika bog'i
    [-370, 505],    // Milliy bog'
    [-733, -733],   // shimoli-g'arbiy burchak
    [767, 767],     // janubi-sharqiy burchak
    [-733, 767],    // janubi-g'arbiy burchak
    [767, -733],    // shimoli-sharqiy burchak
    [21, 469],      // markaz janubi
    [-467, 21],     // g'arbiy chorraha
    [467, -133],    // sharqiy chorraha
    [167, -467]     // shimoliy chorraha
  ];

  var stats = { dist: 0, distDrive: 0, stars: [], missions: 0, earned: 0, topSpeed: 0, time: 0, money: 0, owned: [] };
  var starMeshes = [];
  var starsPublic = [];
  var saveT = 0, hudT = 0, lastX = null, lastZ = null, hudEl = null;

  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (raw) {
        var d = JSON.parse(raw);
        for (var k in stats) if (d[k] !== undefined) stats[k] = d[k];
        if (!Array.isArray(stats.stars)) stats.stars = [];
        if (!Array.isArray(stats.owned)) stats.owned = [];
      }
    } catch (e) {}
  }
  function save() {
    try {
      if (G.getMoney) stats.money = G.getMoney(); // pul ham saqlanadi
      localStorage.setItem(LS_KEY, JSON.stringify(stats));
    } catch (e) {}
  }
  function fmt(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

  function starGeo() {
    var sh = new THREE.Shape();
    for (var i = 0; i < 10; i++) {
      var ang = i / 10 * Math.PI * 2 - Math.PI / 2;
      var r = i % 2 === 0 ? 0.55 : 0.24;
      if (i === 0) sh.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else sh.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    return new THREE.ExtrudeGeometry(sh, { depth: 0.12, bevelEnabled: false });
  }

  G.initScore = function (s) {
    scene = s;
    load();
    // saqlangan pulni tiklash (o'yin 0 so'mdan boshlanadi)
    if (stats.money > 0 && G.addMoney) G.addMoney(stats.money);
    // sotib olingan mashinalarni salon turargohiga qo'yish
    if (G.salonSpawnOwned) G.salonSpawnOwned(stats.owned);
    var geo = starGeo();
    var mat = new THREE.MeshPhongMaterial({ color: 0xffd23f, emissive: 0x8a6a10, shininess: 120 });
    STAR_SPOTS.forEach(function (p, id) {
      var done = stats.stars.indexOf(id) >= 0;
      starsPublic.push({ x: p[0], z: p[1], done: done });
      if (done) return;
      var m = new THREE.Mesh(geo, mat);
      m.position.set(p[0], 1.3, p[1]);
      m.userData.id = id;
      m.userData.phase = G.rand(0, 6);
      scene.add(m);
      starMeshes.push(m);
    });
    var sp = document.getElementById('spClose');
    if (sp) sp.addEventListener('click', function () { G.toggleStats(); });
    var ms = document.getElementById('mapStats');
    if (ms) ms.addEventListener('click', function () { G.toggleStats(); });
  };

  G.getStars = function () { return starsPublic; };
  G.getStats = function () { return stats; };
  G.getOwned = function () { return stats.owned; };
  G.addOwned = function (name) {
    if (stats.owned.indexOf(name) < 0) { stats.owned.push(name); save(); }
  };
  G.starTotal = STAR_SPOTS.length;

  G.scoreOf = function () {
    return Math.round(stats.dist / 1000 * 15 + stats.stars.length * 400 + stats.missions * 250 + stats.earned / 1000);
  };
  var TITLES = [
    [15000, 'TOSHKENT QIROLI 👑'],
    [7000, 'Shahar afsonasi'],
    [3500, "Ko'cha ustasi"],
    [1500, 'Toshkent haydovchisi'],
    [500, "Shahar o'rganuvchisi"],
    [0, 'Yangi kelgan']
  ];
  G.titleOf = function (sc) {
    for (var i = 0; i < TITLES.length; i++) if (sc >= TITLES[i][0]) return TITLES[i][1];
    return TITLES[TITLES.length - 1][1];
  };

  G.scoreEvent = function (kind, amount) {
    if (kind === 'mission') {
      stats.missions++;
      stats.earned += amount || 0;
      save();
    }
  };

  G.updateScore = function (dt, px, pz, driving, speedAbs) {
    stats.time += dt;

    // masofa (teleportlarni hisobga olmaymiz)
    if (lastX !== null) {
      var d = Math.hypot(px - lastX, pz - lastZ);
      if (d < 40) {
        stats.dist += d;
        if (driving) stats.distDrive += d;
      }
    }
    lastX = px; lastZ = pz;
    var kmh = speedAbs * 3.6;
    if (driving && kmh > stats.topSpeed) stats.topSpeed = kmh;

    // yulduzlar: aylanadi, suzadi, terib olinadi
    for (var i = starMeshes.length - 1; i >= 0; i--) {
      var m = starMeshes[i];
      m.rotation.y += dt * 2.2;
      m.position.y = 1.3 + Math.sin(stats.time * 2 + m.userData.phase) * 0.25;
      var dx = m.position.x - px, dz = m.position.z - pz;
      if (dx * dx + dz * dz < 3.2 * 3.2) {
        stats.stars.push(m.userData.id);
        starsPublic[m.userData.id].done = true;
        scene.remove(m);
        starMeshes.splice(i, 1);
        G.addMoney(25000);
        stats.earned += 25000;
        if (G.sfx && G.sfx.ding) G.sfx.ding();
        var n = stats.stars.length;
        if (G.showToast) G.showToast('⭐ Yulduz! ' + n + '/' + STAR_SPOTS.length + " (+25 000 so'm)", '#ffd23f');
        if (n === STAR_SPOTS.length) {
          G.addMoney(1000000);
          stats.earned += 1000000;
          setTimeout(function () {
            if (G.showToast) G.showToast("🏆 BARCHA YULDUZLAR TERILDI! +1 000 000 so'm", '#ffd23f');
          }, 2300);
        }
        save();
      }
    }

    // HUD hisoblagichi (yarim soniyada bir)
    hudT -= dt;
    if (hudT <= 0) {
      hudT = 0.5;
      if (!hudEl) hudEl = document.getElementById('starHud');
      if (hudEl) {
        hudEl.style.display = 'block';
        hudEl.textContent = '⭐ ' + stats.stars.length + '/' + STAR_SPOTS.length + ' · ' + (stats.dist / 1000).toFixed(1) + ' km';
      }
    }

    saveT -= dt;
    if (saveT <= 0) { saveT = 5; save(); }
  };

  // ---------- PANEL (B) ----------
  var panel = null;
  G.toggleStats = function () {
    if (!panel) panel = document.getElementById('scorePanel');
    var show = panel.style.display !== 'flex';
    if (show) {
      var sc = G.scoreOf();
      document.getElementById('spScore').textContent = fmt(sc) + ' ball';
      document.getElementById('spTitle').textContent = G.titleOf(sc);
      document.getElementById('spDist').textContent = (stats.dist / 1000).toFixed(1) + ' km (mashinada ' + (stats.distDrive / 1000).toFixed(1) + ')';
      document.getElementById('spStars').textContent = stats.stars.length + ' / ' + STAR_SPOTS.length;
      document.getElementById('spMis').textContent = stats.missions + ' ta';
      document.getElementById('spEarn').textContent = fmt(stats.earned) + " so'm";
      document.getElementById('spSpeed').textContent = Math.round(stats.topSpeed) + ' km/soat';
      document.getElementById('spTime').textContent = Math.floor(stats.time / 60) + ' daqiqa';
    }
    panel.style.display = show ? 'flex' : 'none';
  };
  G.isStatsOpen = function () { return !!panel && panel.style.display === 'flex'; };
})();
