// ============ TEMIR YO'L: yuradigan poyezdlar (Afrosiyob uslubi) ============
// Poyezd shahar chetidan kirib keladi, vokzalda to'xtaydi, odamlar chiqib-tushadi,
// keyin shaharning narigi chetidan chiqib ketadi. Keyingisi qarama-qarshi tomondan keladi.
window.G = window.G || {};

(function () {
  var RAIL_Z = 620;           // relslar chizig'i (world.js bilan mos)
  var END = 2660;             // paydo bo'lish / yo'qolish chegarasi (yangi katta xarita)
  var PX1 = 235, PX2 = 365;   // platforma oralig'i (vokzal cx=300)
  var SPEED = 30, ACC = 5.5;  // m/s, m/s^2
  var BOARD_T = 16;           // bekatda turish (soniya)
  var TRAIN_LEN = 77;

  var scene = null;
  var train = null;           // { mesh, dir, x, v, state, t, stopX, horned }
  var pax = [];               // platformadagi odamlar
  var nextDir = 1;
  var spawnT = 5;

  // ---------- POYEZD MESHI (old tomoni local +x, old tumshuq local x=0) ----------
  function buildTrainMesh() {
    var g = new THREE.Group();
    var white = G.mat(0xf2f4f6, { phong: true, shininess: 80 });
    var green = G.mat(0x1c7a45);
    var dark = G.mat(0x14181d);
    var winMat = G.mat(0x1d2733, { phong: true, shininess: 100 });
    var roofMat = G.mat(0xd9dde2);

    function coach(x0, len, nose) { // x0 — old chekka (katta x), orqaga len
      var cx = x0 - len / 2;
      var body = G.box(len - 0.6, 2.5, 3.0, white);
      body.position.set(cx, 1.85, 0);
      g.add(body);
      var stripe = G.box(len - 0.6, 0.34, 3.04, green);
      stripe.position.set(cx, 1.05, 0);
      g.add(stripe);
      var band = G.box(len - 1.6, 0.62, 3.04, winMat);
      band.position.set(cx, 2.35, 0);
      g.add(band);
      var roof = G.box(len - 1.0, 0.22, 2.6, roofMat);
      roof.position.set(cx, 3.2, 0);
      g.add(roof);
      [x0 - len * 0.22, x0 - len * 0.78].forEach(function (bx) {
        var bogie = G.box(2.4, 0.62, 2.5, dark);
        bogie.position.set(bx, 0.42, 0);
        g.add(bogie);
      });
      if (nose) {
        // qiya oq burun + yashil tumshuq (Afrosiyob)
        var noseB = G.box(3.4, 1.9, 2.7, white);
        noseB.position.set(x0 + 1.0, 1.4, 0);
        noseB.rotation.z = -0.38;
        g.add(noseB);
        var tip = G.box(1.6, 1.0, 2.2, green);
        tip.position.set(x0 + 2.1, 0.85, 0);
        tip.rotation.z = -0.30;
        g.add(tip);
        var wsh = G.box(0.2, 1.0, 2.0, winMat);
        wsh.position.set(x0 + 0.5, 2.35, 0);
        wsh.rotation.z = -0.5;
        g.add(wsh);
        [0.9, -0.9].forEach(function (oz) {
          var li = G.box(0.3, 0.22, 0.5, G.mat(0xfff3c8));
          li.position.set(x0 + 2.55, 0.9, oz);
          g.add(li);
        });
      }
    }

    coach(0, 16, true);                                   // bosh vagon
    for (var i = 0; i < 4; i++) coach(-17 - i * 15, 14);   // 4 vagon
    // pantograf
    var p1 = G.box(0.08, 1.1, 0.08, dark); p1.position.set(-9, 3.85, 0.5); p1.rotation.z = 0.5; g.add(p1);
    var p2 = G.box(0.08, 1.1, 0.08, dark); p2.position.set(-9.8, 3.85, 0.5); p2.rotation.z = -0.5; g.add(p2);
    var pBar = G.box(1.6, 0.06, 1.2, dark); pBar.position.set(-9.4, 4.35, 0.3); g.add(pBar);

    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    return g;
  }

  function doorXs(tr) {
    // o'rta vagonlarning eshik joylari (world x)
    return [-24, -39, -54].map(function (p) { return tr.x + tr.dir * p; });
  }

  function trainSpan(tr) {
    return tr.dir > 0 ? [tr.x - TRAIN_LEN, tr.x] : [tr.x, tr.x + TRAIN_LEN];
  }

  // ---------- YO'LOVCHILAR ----------
  function platY(z) { // platforma balandligi (chetidan tushganda pastga)
    return 0.5 * G.clamp((z - 598) / 1.2, 0, 1);
  }

  function addPax(mode, x, z) {
    var h = G.makeHuman();
    h.position.set(x, platY(z), z);
    h.rotation.y = 0; // relslarga qarab
    scene.add(h);
    var p = { mesh: h, mode: mode, phase: G.rand(0, 6), tx: x, tz: z, speed: G.rand(2.6, 3.4) };
    pax.push(p);
    return p;
  }

  function ensureWaiting(n) {
    var count = 0;
    for (var i = 0; i < pax.length; i++) if (pax[i].mode === 'wait') count++;
    for (var j = count; j < n; j++) {
      addPax('wait', G.rand(PX1 + 8, PX2 - 8), G.rand(601, 608));
    }
  }

  function beginBoarding(tr) {
    var doors = doorXs(tr);
    // kutayotganlar eng yaqin eshikka yuradi
    pax.forEach(function (p) {
      if (p.mode !== 'wait') return;
      var best = doors[0], bd = 1e9;
      doors.forEach(function (dx) {
        var d = Math.abs(dx - p.mesh.position.x);
        if (d < bd) { bd = d; best = dx; }
      });
      p.mode = 'board';
      p.tx = best + G.rand(-0.7, 0.7);
      p.tz = 610.6;
    });
    // poyezddan tushuvchilar
    var n = G.randInt(2, 4);
    for (var i = 0; i < n; i++) {
      var door = doors[G.randInt(0, doors.length - 1)];
      var p2 = addPax('leave', door + G.rand(-0.5, 0.5), 610.2);
      p2.tx = G.clamp(door + G.rand(-30, 30), PX1 + 5, PX2 - 5);
      p2.tz = 594; // vokzal binosi tomon
    }
  }

  function removePax(p) {
    scene.remove(p.mesh);
    var i = pax.indexOf(p);
    if (i >= 0) pax.splice(i, 1);
  }

  function walkAnim(p, dt, moving) {
    var parts = p.mesh.userData.parts;
    if (!parts) return;
    if (moving) {
      p.phase += dt * 7;
      var s = Math.sin(p.phase) * 0.55;
      parts.legL.rotation.x = s;
      parts.legR.rotation.x = -s;
      parts.armL.rotation.x = -s * 0.7;
      parts.armR.rotation.x = s * 0.7;
    } else {
      p.phase += dt;
      parts.legL.rotation.x = 0;
      parts.legR.rotation.x = 0;
      parts.armL.rotation.x = Math.sin(p.phase * 0.9) * 0.06;
      parts.armR.rotation.x = -Math.sin(p.phase * 0.9) * 0.06;
    }
  }

  function updatePax(dt) {
    for (var i = pax.length - 1; i >= 0; i--) {
      var p = pax[i];
      if (p.mode === 'wait') { walkAnim(p, dt, false); continue; }
      var m = p.mesh.position;
      var dx = p.tx - m.x, dz = p.tz - m.z;
      var d = Math.hypot(dx, dz);
      if (d < 0.5) {
        if (p.mode === 'board') { removePax(p); continue; }   // poyezdga chiqdi
        if (p.mode === 'leave') { removePax(p); continue; }    // vokzalga kirib ketdi
      }
      var step = Math.min(d, p.speed * dt);
      m.x += (dx / d) * step;
      m.z += (dz / d) * step;
      m.y = platY(m.z);
      p.mesh.rotation.y = Math.atan2(dx, dz);
      walkAnim(p, dt, true);
    }
  }

  // ---------- POYEZD SIKLI ----------
  function spawnTrain() {
    var dir = nextDir;
    nextDir = -nextDir;
    var mesh = buildTrainMesh();
    mesh.rotation.y = dir > 0 ? 0 : Math.PI;
    var x0 = dir > 0 ? -END : END;
    mesh.position.set(x0, 0.2, RAIL_Z);
    scene.add(mesh);
    train = {
      mesh: mesh, dir: dir, x: x0, v: SPEED, state: 'in', t: 0, horned: false,
      stopX: dir > 0 ? PX2 + 14 : PX1 - 14
    };
    ensureWaiting(G.randInt(3, 6));
  }

  G.initTrain = function (s) {
    scene = s;
    ensureWaiting(4); // boshidan platformada odamlar kutadi
  };

  G.trainPos = function () {
    if (!train) return null;
    var span = trainSpan(train);
    return { x: (span[0] + span[1]) / 2, z: RAIL_Z, moving: train.v > 1 };
  };

  G.updateTrain = function (dt, px, pz, playerCar, playerObj) {
    if (!scene) return;
    if (!train) {
      spawnT -= dt;
      if (spawnT <= 0) spawnTrain();
    } else {
      var tr = train;
      if (tr.state === 'in') {
        var dist = (tr.stopX - tr.x) * tr.dir;
        var brake = tr.v * tr.v / (2 * ACC) + 2;
        if (dist <= brake) tr.v = Math.max(0, tr.v - ACC * dt);
        else tr.v = Math.min(SPEED, tr.v + ACC * dt);
        tr.x += tr.dir * tr.v * dt;
        if (!tr.horned && Math.abs(tr.x - 300) < 700) {
          tr.horned = true;
          if (G.sfx && G.sfx.trainHorn) G.sfx.trainHorn();
        }
        if (dist <= 0.5 || (tr.v < 0.2 && dist < 5)) {
          tr.x = tr.stopX;
          tr.v = 0;
          tr.state = 'stop';
          tr.t = BOARD_T;
          beginBoarding(tr);
        }
      } else if (tr.state === 'stop') {
        tr.t -= dt;
        if (tr.t <= 0) {
          tr.state = 'out';
          if (G.sfx && G.sfx.trainHorn) G.sfx.trainHorn();
          // ulgurmaganlar yana kutadi
          pax.forEach(function (p) { if (p.mode === 'board') p.mode = 'wait'; });
        }
      } else { // out
        tr.v = Math.min(SPEED, tr.v + ACC * dt);
        tr.x += tr.dir * tr.v * dt;
        if (Math.abs(tr.x) > END + 90) {
          scene.remove(tr.mesh);
          train = null;
          spawnT = G.rand(6, 12);
        }
      }
      if (train) {
        tr.mesh.position.x = tr.x;

        // ---------- KESISHMADAGI XAVF: poyezd yo'lidagi mashinalar/odam ----------
        if (tr.v > 1) {
          var span = trainSpan(tr);
          if (G.allCars) {
            for (var ci = 0; ci < G.allCars.length; ci++) {
              var c = G.allCars[ci];
              if (Math.abs(c.z - RAIL_Z) < 3.0 && c.x > span[0] - 1.5 && c.x < span[1] + 1.5) {
                var side = c.z >= RAIL_Z ? 1 : -1;
                c.z = RAIL_Z + side * 4.5;
                c.speed *= -0.35;
                if (c === playerCar) {
                  if (G.damageCar) G.damageCar(c, 0.5);
                  if (G.sfx && G.sfx.crash) G.sfx.crash(8);
                }
              }
            }
          }
          if (!playerCar && playerObj &&
              Math.abs(playerObj.position.z - RAIL_Z) < 2.6 &&
              playerObj.position.x > span[0] - 1.5 && playerObj.position.x < span[1] + 1.5) {
            var side2 = playerObj.position.z >= RAIL_Z ? 1 : -1;
            playerObj.position.z = RAIL_Z + side2 * 3.8;
            if (G.sfx && G.sfx.crash) G.sfx.crash(4);
          }
        }
      }
    }
    updatePax(dt);
  };
})();
