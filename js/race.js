// ============ POYGA MISSIYALARI v2: AI RAQIBLAR BILAN ============
// Mashinada start halqasiga kiring -> raqiblar keladi -> 3-2-1 -> checkpointlar
// bo'ylab poyga. G'alaba = MARRAGA 1-BO'LIB kelish (raqiblardan oldin).
// Tuzatilgan xatolar: checkpoint radiusi (katta yo'l lanelariga yetmasdi),
// marra=start tsikli (avto-restart), yo'l ichida turgan belgi ustunlari.
window.G = window.G || {};

(function () {
  var CP_R = 13; // checkpoint radiusi (asosiy yo'l chekka lane'lari ham sig'adi)

  var RACES = [
    {
      id: 'markaz', name: 'Markaz aylanasi', prize: 150000, par: 80, rivalSpeed: 14.5,
      start: [150, -300], signAt: [168, -300],
      cps: [[150, -150], [150, 150], [-150, 150], [-150, -150], [150, -150]]
    },
    {
      id: 'sergeli', name: 'Sergeli sprinti', prize: 250000, par: 105, rivalSpeed: 17,
      start: [450, 1150], signAt: [468, 1150],
      cps: [[450, 1400], [450, 1900], [0, 1900], [0, 1400], [450, 1400]]
    },
    {
      id: 'olimpiya', name: 'Olimpiya ringi', prize: 350000, par: 125, rivalSpeed: 19,
      start: [1400, -1150], signAt: [1418, -1150],
      cps: [[1400, -1900], [1900, -1900], [1900, -1000], [1400, -1000]]
    },
    {
      id: 'halqa', name: 'Katta halqa marafoni', prize: 800000, par: 330, rivalSpeed: 25,
      start: [-2400, 0], signAt: [-2382, 9],
      cps: [[-2400, -1900], [-1900, -2400], [0, -2400], [1900, -2400], [2400, -1900], [2400, 0]]
    }
  ];

  var RIVAL_DEFS = [
    { name: 'Bek', car: 'BMW M5', color: '#c0392b' },
    { name: 'Timur', car: 'Audi RS7', color: '#2e5f8a' }
  ];

  var scene = null;
  var state = 'idle';    // idle | count | run
  var cur = null, cpIdx = 0, raceT = 0, countT = 0, rearmT = 0, routeT = 0, lastN = 9;
  var needClear = false; // poyga tugagach start zonasidan chiqmaguncha qayta boshlanmaydi
  var cpMesh = null;
  var rivals = [];       // {def, mesh, dist, speed, side, segI, cpPassed}
  var poly = null, cum = null, cpCum = null, polyTotal = 0;

  function fmtSom(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
  }

  // ---------- QURILISH ----------
  function buildStarts() {
    RACES.forEach(function (r) {
      var beam = new THREE.Mesh(
        new THREE.CylinderGeometry(4.5, 4.5, 7, 14, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.26, side: THREE.DoubleSide, depthWrite: false })
      );
      beam.position.set(r.start[0], 3.5, r.start[1]);
      scene.add(beam);
      // belgi ustuni — YO'LDAN TASHQARIDA (signAt)
      var pole = G.box(0.15, 4.5, 0.15, G.mat(0x8a95a5));
      pole.position.set(r.signAt[0], 2.25, r.signAt[1]);
      scene.add(pole);
      var sign = G.signMesh('🏁 ' + r.name.toUpperCase() + ' · ' + fmtSom(r.prize), '#101820', '#ff8c1a', 9.5, 1.0);
      sign.position.set(r.signAt[0], 4.0, r.signAt[1]);
      scene.add(sign);
      var sign2 = sign.clone();
      sign2.rotation.y = Math.PI;
      sign2.position.set(r.signAt[0], 4.0, r.signAt[1] - 0.02);
      scene.add(sign2);

      G.landmarks.push({ x: r.start[0], z: r.start[1], name: 'Poyga: ' + r.name, r: 18, color: '#ff8c1a' });
      if (G.LANDMARK_ICONS) G.LANDMARK_ICONS['Poyga: ' + r.name] = '🏁';
    });

    var g = new THREE.Group();
    var ring = new THREE.Mesh(
      new THREE.CylinderGeometry(CP_R - 1, CP_R - 1, 9, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.position.y = 4.5;
    g.add(ring);
    var pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 44, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.4, depthWrite: false })
    );
    pillar.position.y = 22;
    g.add(pillar);
    g.visible = false;
    scene.add(g);
    cpMesh = g;
    if (G.animated) G.animated.push({ fn: function (dt) { if (cpMesh.visible) cpMesh.rotation.y += dt * 1.2; } });
  }

  // ---------- RAQIBLAR ----------
  // to'liq trassa poly-chizig'i: start -> cp0 -> cp1 -> ... (yo'llar bo'ylab)
  function buildPoly(r) {
    poly = [{ x: r.start[0], z: r.start[1] }];
    cpCum = [];
    var from = { x: r.start[0], z: r.start[1] };
    r.cps.forEach(function (cp) {
      var seg = G.findRoute(from.x, from.z, cp[0], cp[1]);
      if (seg) for (var i = 1; i < seg.length; i++) poly.push(seg[i]);
      cpCum.push(-1); // pastda to'ldiriladi
      from = { x: cp[0], z: cp[1] };
    });
    cum = [0];
    for (var j = 1; j < poly.length; j++) {
      cum.push(cum[j - 1] + Math.hypot(poly[j].x - poly[j - 1].x, poly[j].z - poly[j - 1].z));
    }
    polyTotal = cum[cum.length - 1];
    // har checkpointning poly bo'ylab masofasi (eng yaqin nuqta)
    r.cps.forEach(function (cp, ci) {
      var bd = 1e9, bdist = 0;
      for (var k = 0; k < poly.length; k++) {
        var d = Math.hypot(poly[k].x - cp[0], poly[k].z - cp[1]);
        if (d < bd) { bd = d; bdist = cum[k]; }
      }
      cpCum[ci] = bdist;
    });
  }

  function spawnRivals(r) {
    clearRivals();
    RIVAL_DEFS.forEach(function (def, i) {
      var mesh = G.createCarMesh(def.car, def.color);
      var side = i === 0 ? 1 : -1;
      mesh.position.set(r.start[0] + side * 3.2, 0, r.start[1] + 4 + i * 3);
      scene.add(mesh);
      rivals.push({ def: def, mesh: mesh, dist: 0, speed: 0, side: side * 1.9, segI: 0, cpPassed: 0, finished: false });
    });
  }

  function clearRivals() {
    rivals.forEach(function (rv) { scene.remove(rv.mesh); });
    rivals = [];
  }

  function rivalUpdate(rv, dt, px, pz) {
    if (rv.finished) return;
    // rezinka: oldinda bo'lsa sekinlashadi, orqada bo'lsa tezlashadi (poyga qiziq bo'lsin)
    var band = 1;
    var gap = Math.hypot(rv.mesh.position.x - px, rv.mesh.position.z - pz);
    if (gap > 200) band = rv.cpPassed > cpIdx ? 0.82 : 1.2;
    var target = cur.rivalSpeed * band;
    rv.speed += (target - rv.speed) * Math.min(1, dt * 1.5);
    rv.dist += rv.speed * dt;

    if (rv.dist >= polyTotal - 1) {
      rv.dist = polyTotal - 1;
      rv.finished = true;
      return;
    }
    // poly bo'ylab pozitsiya
    while (rv.segI < cum.length - 2 && cum[rv.segI + 1] < rv.dist) rv.segI++;
    var a = poly[rv.segI], b = poly[rv.segI + 1];
    var segLen = Math.max(0.001, cum[rv.segI + 1] - cum[rv.segI]);
    var t = (rv.dist - cum[rv.segI]) / segLen;
    var dx = (b.x - a.x) / segLen, dz = (b.z - a.z) / segLen;
    // yon siljish (ikkalasi ustma-ust yurmasin)
    rv.mesh.position.set(
      a.x + (b.x - a.x) * t - dz * rv.side,
      0,
      a.z + (b.z - a.z) * t + dx * rv.side
    );
    rv.mesh.rotation.y = -Math.atan2(dz, dx);
    // nechta checkpointdan o'tdi
    rv.cpPassed = 0;
    for (var c = 0; c < cpCum.length; c++) if (rv.dist >= cpCum[c] - CP_R) rv.cpPassed = c + 1;
  }

  function playerPlace() {
    var p = 1;
    rivals.forEach(function (rv) {
      if (rv.finished || rv.cpPassed > cpIdx) p++;
    });
    return p;
  }

  function endRace(msg, color) {
    state = 'idle';
    rearmT = 4;
    needClear = true;
    cpMesh.visible = false;
    clearRivals();
    if (G.routes) G.routes.race = null;
    if (G.showToast) G.showToast(msg, color);
    if (G.tgHaptic) G.tgHaptic(color === '#5be07a' ? 'success' : 'warning');
  }

  G.initRace = function (s) {
    scene = s;
    buildStarts();
  };

  G.raceInfo = function () {
    if (state === 'run') {
      var place = playerPlace();
      return '🏁 <b>' + cur.name + '</b> · ' + (cpIdx + 1) + '/' + cur.cps.length +
        " · O'rin: <b>" + place + '/' + (rivals.length + 1) + '</b> · ' + raceT.toFixed(1) + 's';
    }
    if (state === 'count') return '🏁 <b>' + cur.name + '</b> — raqiblar: Bek (M5), Timur (RS7)';
    return null;
  };

  function setCp(i) {
    cpIdx = i;
    cpMesh.position.set(cur.cps[i][0], 0, cur.cps[i][1]);
    cpMesh.visible = true;
  }

  G.updateRace = function (dt, px, pz, mode) {
    if (rearmT > 0) rearmT -= dt;

    if (state === 'idle') {
      // start zonasidan chiqib ketmaguncha qayta boshlanmaydi (marra=start tsikli tuzatildi)
      if (needClear) {
        var clear = true;
        for (var c = 0; c < RACES.length; c++) {
          if (Math.hypot(px - RACES[c].start[0], pz - RACES[c].start[1]) < 14) { clear = false; break; }
        }
        if (clear) needClear = false;
        return;
      }
      if (mode !== 'drive' || rearmT > 0) return;
      for (var i = 0; i < RACES.length; i++) {
        var r = RACES[i];
        if (Math.hypot(px - r.start[0], pz - r.start[1]) < 7) {
          cur = r;
          state = 'count';
          countT = 3.2;
          lastN = 9;
          spawnRivals(r); // raqiblar start chizig'iga keladi
          break;
        }
      }
      return;
    }

    if (mode !== 'drive') {
      endRace('🏁 Poyga bekor — mashinadan tushdingiz', '#eb5757');
      return;
    }

    if (state === 'count') {
      countT -= dt;
      var n = Math.ceil(countT);
      if (n !== lastN && n > 0) {
        lastN = n;
        if (G.showToast) G.showToast(String(n), '#ffd23f');
      }
      if (countT <= 0) {
        buildPoly(cur);
        rivals.forEach(function (rv) { rv.dist = 0; rv.segI = 0; rv.cpPassed = 0; rv.finished = false; rv.speed = cur.rivalSpeed * 0.5; });
        state = 'run';
        raceT = 0;
        routeT = 0;
        setCp(0);
        if (G.showToast) G.showToast('KETDIK! 🏁', '#5be07a');
        if (G.sfx && G.sfx.ding) G.sfx.ding();
      }
      return;
    }

    // ---- RUN ----
    raceT += dt;
    if (raceT > cur.par * 2.5) {
      endRace('⏱ Vaqt tugadi — poyga muvaffaqiyatsiz', '#eb5757');
      return;
    }

    // raqiblar harakati
    for (var rv = 0; rv < rivals.length; rv++) {
      rivalUpdate(rivals[rv], dt, px, pz);
      if (rivals[rv].finished) {
        endRace('😤 YUTQAZDINGIZ — ' + rivals[rv].def.name + ' (' + rivals[rv].def.car + ') birinchi keldi!', '#eb5757');
        return;
      }
    }

    // checkpoint
    var cp = cur.cps[cpIdx];
    if (Math.hypot(px - cp[0], pz - cp[1]) < CP_R) {
      if (cpIdx + 1 >= cur.cps.length) {
        // MARRA — raqiblardan oldin keldingiz (ular kelganda poyga tugagan bo'lardi)
        G.addMoney(cur.prize);
        var rec = G.raceWin ? G.raceWin(cur.id, raceT, cur.prize) : false;
        endRace("🏆 1-O'RIN! " + raceT.toFixed(1) + 's — +' + fmtSom(cur.prize) + (rec ? ' · YANGI REKORD!' : ''), '#5be07a');
        return;
      }
      setCp(cpIdx + 1);
      if (G.sfx && G.sfx.ding) G.sfx.ding();
    }

    // keyingi checkpointga marshrut
    routeT -= dt;
    if (routeT <= 0 && G.findRoute && G.routes) {
      routeT = 0.8;
      G.routes.race = G.findRoute(px, pz, cur.cps[cpIdx][0], cur.cps[cpIdx][1]);
    }
    // xarita markerlari: checkpoint + raqiblar
    if (G.missionMarkers) {
      G.missionMarkers.push({ x: cur.cps[cpIdx][0], z: cur.cps[cpIdx][1], kind: 'race' });
      rivals.forEach(function (rv2) {
        G.missionMarkers.push({ x: rv2.mesh.position.x, z: rv2.mesh.position.z, kind: 'rival' });
      });
    }
  };
})();
