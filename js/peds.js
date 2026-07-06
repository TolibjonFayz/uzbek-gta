// ============ Odamlar v3: o'lim, qo'rqish, baqirish, gap pufaklari ============
window.G = window.G || {};

(function () {
  var SKIN = [0xd9a878, 0xc98e5f, 0xe8bd93, 0xb87d4f, 0xdba377];
  var HAIR = [0x1c1410, 0x2e2018, 0x3d2a1a, 0x4a4a4a, 0x0f0d0b];
  var SHIRT = [0x3d6ea5, 0xb04a3a, 0x4a7c59, 0xd9c9a8, 0x8a5a9c, 0x2c3e50, 0xd9a441, 0xf2f2f2, 0x67879c, 0x7a4a2e];
  var PANTS = [0x2c3a47, 0x3d4a58, 0x1c1c24, 0x5c4a3a, 0x424a42, 0x27303d];
  var DRESS = [0xb04a6a, 0x2a7a8c, 0xd9a441, 0x7a4a8c, 0xc0574a, 0x3d8a6a];

  var SHOUT = ["Hoy!!", "Ehtiyot bo'l!", "Ko'zingga qarab yur!", "Voy dod!", "Jinnimisan?!", "Nima qilyapsan?!", "To'xta!!"];
  var HIT_SHOUT = ["Voy!!", "Oh!", "Dodku!", "Uribdi!", "Yordam!!", "Voydod!"];

  G.makeHuman = function (opts) {
    opts = opts || {};
    var g = new THREE.Group();
    var skin = G.mat(G.pick(SKIN));
    var female = opts.female !== undefined ? opts.female : Math.random() < 0.45;
    var h = G.rand(0.92, 1.06);

    var parts = {};
    var pantsMat = female && Math.random() < 0.6 ? G.mat(G.pick(DRESS)) : G.mat(G.pick(PANTS));
    var legGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.8, 6);
    ['legL', 'legR'].forEach(function (k, idx) {
      var pivot = new THREE.Group();
      var leg = new THREE.Mesh(legGeo, pantsMat);
      leg.position.y = -0.4;
      pivot.add(leg);
      var shoe = G.box(0.14, 0.08, 0.24, G.mat(0x2a2226));
      shoe.position.set(0, -0.78, 0.05);
      pivot.add(shoe);
      pivot.position.set(idx === 0 ? -0.1 : 0.1, 0.82, 0);
      g.add(pivot);
      parts[k] = pivot;
    });

    var shirtMat = female ? G.mat(G.pick(DRESS)) : G.mat(G.pick(SHIRT));
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.16, female ? 0.2 : 0.17, 0.55, 8), shirtMat);
    torso.position.y = 1.12;
    g.add(torso);
    parts.torso = torso;
    var shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), shirtMat);
    shoulders.position.y = 1.38;
    shoulders.scale.set(1.15, 0.55, 0.8);
    g.add(shoulders);

    var armGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.62, 6);
    ['armL', 'armR'].forEach(function (k, idx) {
      var pivot = new THREE.Group();
      var arm = new THREE.Mesh(armGeo, shirtMat);
      arm.position.y = -0.28;
      pivot.add(arm);
      var hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), skin);
      hand.position.y = -0.6;
      pivot.add(hand);
      pivot.position.set(idx === 0 ? -0.24 : 0.24, 1.38, 0);
      g.add(pivot);
      parts[k] = pivot;
    });

    var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), skin);
    head.position.y = 1.6;
    head.scale.set(0.92, 1.05, 0.95);
    g.add(head);
    parts.head = head;
    var hairMat = G.mat(G.pick(HAIR));
    var hair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 8, 6, 0, Math.PI * 2, 0, Math.PI / 1.8), hairMat);
    hair.position.y = 1.64;
    g.add(hair);
    if (female) {
      var hairBack = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.06, 0.3, 6), hairMat);
      hairBack.position.set(0, 1.5, -0.1);
      g.add(hairBack);
    }
    if (!female && Math.random() < 0.18) {
      var doppi = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.09, 8), G.mat(0x14141c));
      doppi.position.y = 1.73;
      g.add(doppi);
    }

    g.scale.setScalar(h);
    g.traverse(function (o) { if (o.isMesh) o.castShadow = true; });
    g.userData.parts = parts;
    return g;
  };

  function poseSit(human) {
    var p = human.userData.parts;
    p.legL.rotation.x = -Math.PI / 2 + 0.15;
    p.legR.rotation.x = -Math.PI / 2 + 0.15;
  }

  var peds = [];
  var pedScene = null;

  // ---------- GAP PUFAKLARI ----------
  var bubbles = [];
  function showBubble(mesh, text) {
    var cv = document.createElement('canvas');
    cv.width = 256; cv.height = 64;
    var c2 = cv.getContext('2d');
    c2.fillStyle = 'rgba(15,15,20,0.85)';
    c2.fillRect(4, 4, 248, 56);
    c2.strokeStyle = '#ffd23f';
    c2.lineWidth = 3;
    c2.strokeRect(4, 4, 248, 56);
    c2.fillStyle = '#ffd23f';
    c2.font = 'bold 26px Arial';
    c2.textAlign = 'center';
    c2.textBaseline = 'middle';
    c2.fillText(text, 128, 34);
    var tex = new THREE.CanvasTexture(cv);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sp.scale.set(3.6, 0.9, 1);
    sp.position.copy(mesh.position);
    sp.position.y += 2.3;
    pedScene.add(sp);
    bubbles.push({ s: sp, t: 0, mesh: mesh });
  }
  function updateBubbles(dt) {
    for (var i = bubbles.length - 1; i >= 0; i--) {
      var b = bubbles[i];
      b.t += dt;
      b.s.position.x = b.mesh.position.x;
      b.s.position.z = b.mesh.position.z;
      b.s.position.y = b.mesh.position.y + 2.3 + b.t * 0.5;
      b.s.material.opacity = Math.max(0, 1 - b.t / 1.9);
      if (b.t > 1.9) {
        pedScene.remove(b.s);
        b.s.material.map.dispose();
        b.s.material.dispose();
        bubbles.splice(i, 1);
      }
    }
  }

  // ---------- O'LIM, YIQILISH va QO'RQISH ----------
  function fallPose(m) {
    m.rotation.x = -Math.PI / 2; // yiqiladi
    m.position.y = 0.4;
    var p = m.userData.parts;
    p.legL.rotation.x = 0.15;
    p.legR.rotation.x = -0.1;
    p.armL.rotation.z = 1.3;
    p.armR.rotation.z = -1.3;
    p.armL.rotation.x = 0;
    p.armR.rotation.x = 0;
  }
  function standPose(m) {
    m.rotation.x = 0;
    m.position.y = 0.25;
    var p = m.userData.parts;
    p.armL.rotation.z = 0;
    p.armR.rotation.z = 0;
  }

  function killPed(pd) {
    if (pd.dead) return;
    pd.dead = true;
    pd.deadT = 0;
    pd.knocked = 0;
    fallPose(pd.mesh);
    G.sfx.thud();
    G.sfx.scream();
    if (G.onCrime) G.onCrime(); // militsiya qidiruvi boshlanadi
  }

  // mushtdan yiqilish (vaqtinchalik — o'lmaydi, keyin turib qochadi)
  function knockDown(pd) {
    if (pd.dead || pd.knocked > 0) return;
    pd.knocked = G.rand(2.2, 3.2);
    pd.jump = null;
    fallPose(pd.mesh);
    G.sfx.thud();
    if (Math.random() < 0.7) G.sfx.scream();
  }

  function startFlee(pd, fromX, fromZ) {
    var dx = pd.mesh.position.x - fromX, dz = pd.mesh.position.z - fromZ;
    var d = Math.hypot(dx, dz) || 0.001;
    pd.flee = { dx: dx / d, dz: dz / d, t: G.rand(2.6, 4.6) };
  }

  function revivePed(pd, playerPos) {
    pd.dead = false;
    standPose(pd.mesh);
    if (pd.kind === 'walker') relocateWalker(pd, playerPos);
  }

  function scarePed(pd, nx, nz) {
    pd.scareCd = 6;
    pd.jump = { x: nx * 2.0, z: nz * 2.0, t: 0 };
    var p = pd.mesh.userData.parts;
    p.armL.rotation.z = 1.4; // qo'llar tepaga
    p.armR.rotation.z = -1.4;
    pd.armsUpT = 1.2;
    if (Math.random() < 0.75) G.sfx.scream();
    showBubble(pd.mesh, G.pick(SHOUT));
  }

  // ---------- JANG: musht urish + panika ----------
  // fdx,fdz = o'yinchi qaragan yo'nalish (normalizatsiyalangan)
  G.punchAt = function (px, pz, fdx, fdz) {
    var best = null, bestD2 = 2.6 * 2.6;
    for (var i = 0; i < peds.length; i++) {
      var pd = peds[i];
      if (pd.kind !== 'walker' && pd.kind !== 'crosser') continue;
      if (pd.dead || pd.knocked > 0) continue;
      var m = pd.mesh;
      var dx = m.position.x - px, dz = m.position.z - pz;
      var d2 = dx * dx + dz * dz;
      if (d2 >= bestD2) continue;
      var d = Math.sqrt(d2) || 0.001;
      // faqat oldindagi odam (yo'nalish bo'yicha)
      if ((dx * fdx + dz * fdz) / d < 0.15) continue;
      bestD2 = d2; best = pd;
    }
    if (best) {
      knockDown(best);
      showBubble(best.mesh, G.pick(HIT_SHOUT));
      // atrofdagilar qochadi
      panic(best.mesh.position.x, best.mesh.position.z, 16, px, pz);
    }
    return !!best;
  };

  // markazdan (mx,mz) radius ichidagilar (px,pz) o'yinchidan qochadi
  function panic(mx, mz, radius, px, pz) {
    var r2 = radius * radius, cnt = 0;
    for (var i = 0; i < peds.length; i++) {
      var pd = peds[i];
      if (pd.kind !== 'walker' && pd.kind !== 'crosser') continue;
      if (pd.dead || pd.knocked > 0) continue;
      var m = pd.mesh;
      var dx = m.position.x - mx, dz = m.position.z - mz;
      if (dx * dx + dz * dz > r2) continue;
      startFlee(pd, px, pz);
      if (cnt < 3 && Math.random() < 0.5) { G.sfx.scream(); cnt++; }
    }
  }
  G.panicPeds = function (px, pz, radius) { panic(px, pz, radius, px, pz); };

  // portlash — radius ichidagilarni yiqitadi, atrofdagilar qochadi
  G.blastPeds = function (x, z, radius) {
    var r2 = radius * radius;
    for (var i = 0; i < peds.length; i++) {
      var pd = peds[i];
      if (pd.kind !== 'walker' && pd.kind !== 'crosser') continue;
      if (pd.dead) continue;
      var m = pd.mesh;
      var dx = m.position.x - x, dz = m.position.z - z;
      if (dx * dx + dz * dz < r2) knockDown(pd);
    }
    panic(x, z, radius * 2.5, x, z);
  };

  function scarePed(pd, nx, nz) {
    pd.scareCd = 6;
    pd.jump = { x: nx * 2.0, z: nz * 2.0, t: 0 };
    var p = pd.mesh.userData.parts;
    p.armL.rotation.z = 1.4; // qo'llar tepaga
    p.armR.rotation.z = -1.4;
    pd.armsUpT = 1.2;
    if (Math.random() < 0.75) G.sfx.scream();
    showBubble(pd.mesh, G.pick(SHOUT));
  }

  // ---------- YARATISH ----------
  function relocateWalker(pd, nearPos) {
    for (var a = 0; a < 10; a++) {
      var seg = G.pick(G.pedSegments);
      var mx = (seg.x1 + seg.x2) / 2, mz = (seg.z1 + seg.z2) / 2;
      var dx = mx - nearPos.x, dz = mz - nearPos.z;
      var d2 = dx * dx + dz * dz;
      if (d2 > 120 * 120 && d2 < 380 * 380) {
        pd.seg = seg;
        pd.t = Math.random();
        pd.mesh.position.set(G.lerp(seg.x1, seg.x2, pd.t), 0.25, G.lerp(seg.z1, seg.z2, pd.t));
        return;
      }
    }
  }

  function addWalker(scene, nearPos) {
    var human = G.makeHuman();
    scene.add(human);
    var pd = {
      kind: 'walker', mesh: human, seg: G.pedSegments[0], t: 0,
      dir: Math.random() < 0.5 ? 1 : -1,
      speed: G.rand(0.9, 1.6), phase: Math.random() * 10, scareCd: 0
    };
    relocateWalker(pd, nearPos || { x: 0, z: 0 });
    peds.push(pd);
  }

  function addCrosser(scene) {
    var cr = G.pick(G.crossings);
    if (!cr) return;
    var human = G.makeHuman();
    human.position.set(cr.x1, 0.25, cr.z1);
    scene.add(human);
    peds.push({
      kind: 'crosser', mesh: human, cross: cr,
      state: 'waiting', side: 0, t: 0,
      speed: G.rand(1.3, 1.9), phase: Math.random() * 10,
      waitPatience: G.rand(1, 6), scareCd: 0
    });
  }

  function addInteriorNPCs(scene) {
    G.interiorNPCs.forEach(function (d) {
      if (d.type === 'sit') {
        var human = G.makeHuman();
        human.position.set(d.x, -0.01, d.z);
        human.rotation.y = d.rotY || 0;
        poseSit(human);
        scene.add(human);
        peds.push({ kind: 'sitter', mesh: human, eat: !!d.eat, phase: Math.random() * 10 });
      } else if (d.type === 'stand') {
        var human2 = G.makeHuman();
        human2.position.set(d.x, 0.25, d.z);
        human2.rotation.y = d.rotY || 0;
        scene.add(human2);
        peds.push({ kind: 'stander', mesh: human2, chef: !!d.chef, phase: Math.random() * 10, scareCd: 0 });
      } else if (d.type === 'shopper') {
        var human3 = G.makeHuman();
        human3.position.set(d.x1, 0.25, d.z1);
        var basket = G.box(0.3, 0.2, 0.22, G.mat(0xc0392b));
        basket.position.set(0.3, 0.75, 0);
        human3.add(basket);
        scene.add(human3);
        peds.push({
          kind: 'shopper', mesh: human3,
          x1: d.x1, z1: d.z1, x2: d.x2, z2: d.z2,
          t: Math.random(), dir: 1, speed: G.rand(0.5, 0.9), phase: Math.random() * 10
        });
      }
    });
  }

  G.initPeds = function (scene, playerPos) {
    pedScene = scene;
    var walkers = G.IS_TOUCH ? 24 : 40;
    var crossers = G.IS_TOUCH ? 10 : 18;
    for (var i = 0; i < walkers; i++) addWalker(scene, playerPos);
    for (var c = 0; c < crossers; c++) addCrosser(scene);
    addInteriorNPCs(scene);
  };

  // ---------- MASHINA-ODAM TO'QNASHUVI ----------
  // Bosib ketsa — o'ladi. Yaqinidan tez o'tsa — qo'rqib baqiradi.
  G.checkPedHits = function (car, dt) {
    var circles = G.carCircles(car);
    var sp = Math.abs(car.speed);
    for (var i = 0; i < peds.length; i++) {
      var pd = peds[i];
      if (pd.kind === 'sitter' || pd.kind === 'shopper') continue; // ichkaridagilar
      if (pd.dead) continue;
      var m = pd.mesh;
      var px = m.position.x, pz = m.position.z;
      // keng bosqich
      var bdx = px - car.x, bdz = pz - car.z;
      if (bdx * bdx + bdz * bdz > 15 * 15) continue;
      // avval BARCHA aylanalar bo'yicha eng yaqinini topamiz, keyin qaror
      var minGap = 1e9, minDx = 0, minDz = 0, minD = 1;
      for (var c = 0; c < circles.length; c++) {
        var cc = circles[c];
        var dx = px - cc.x, dz = pz - cc.z;
        var d = Math.sqrt(dx * dx + dz * dz);
        var gap = d - (cc.r + 0.35); // manfiy = ustiga chiqqan
        if (gap < minGap) {
          minGap = gap;
          minD = Math.max(d, 0.03);
          minDx = dx; minDz = dz;
        }
      }
      if (minGap < 0) {
        // tegib ketdi
        if (sp > 4) killPed(pd);
        else pd.jump = { x: minDx / minD * 1.2, z: minDz / minD * 1.2, t: 0 };
      } else if (minGap < 1.8 && sp > 9 && pd.scareCd <= 0) {
        // yaqinidan vizillab o'tdi — qo'rqadi
        scarePed(pd, minDx / minD, minDz / minD);
      }
    }
  };

  // ---------- ANIMATSIYALAR ----------
  function animWalk(mesh, time, phase, intensity) {
    var p = mesh.userData.parts;
    var s = Math.sin(time * 7 + phase) * 0.55 * intensity;
    p.legL.rotation.x = s;
    p.legR.rotation.x = -s;
    p.armL.rotation.x = -s * 0.8;
    p.armR.rotation.x = s * 0.8;
    mesh.position.y = 0.25 + Math.abs(Math.sin(time * 7 + phase)) * 0.035 * intensity;
  }
  function animIdle(mesh, time, phase) {
    var p = mesh.userData.parts;
    p.legL.rotation.x = 0;
    p.legR.rotation.x = 0;
    p.armL.rotation.x = Math.sin(time * 1.4 + phase) * 0.06;
    p.armR.rotation.x = -Math.sin(time * 1.4 + phase) * 0.06;
  }

  var frame = 0;

  G.updatePeds = function (dt, time, playerPos) {
    frame++;
    updateBubbles(dt);

    for (var i = 0; i < peds.length; i++) {
      var pd = peds[i];
      var m = pd.mesh;

      if (pd.scareCd > 0) pd.scareCd -= dt;
      if (pd.armsUpT !== undefined && pd.armsUpT > 0) {
        pd.armsUpT -= dt;
        if (pd.armsUpT <= 0 && !pd.dead) {
          m.userData.parts.armL.rotation.z = 0;
          m.userData.parts.armR.rotation.z = 0;
        }
      }

      var ddx = m.position.x - playerPos.x, ddz = m.position.z - playerPos.z;
      var dist2 = ddx * ddx + ddz * ddz;
      var far = dist2 > 150 * 150;
      m.visible = dist2 < 280 * 280; // uzoqdagilarni chizmaslik

      // o'lgan odam — yotadi, keyin boshqa joyda qayta paydo bo'ladi
      if (pd.dead) {
        pd.deadT += dt;
        if (pd.deadT > 25) revivePed(pd, playerPos);
        continue;
      }

      // mushtdan yiqilgan — yotadi, keyin turib qochadi
      if (pd.knocked > 0) {
        pd.knocked -= dt;
        if (pd.knocked <= 0) {
          pd.knocked = 0;
          standPose(m);
          startFlee(pd, playerPos.x, playerPos.z);
        }
        continue;
      }

      // qochish (panika) — o'yinchidan yugurib uzoqlashadi
      if (pd.flee) {
        pd.flee.t -= dt;
        var fs = 5.8;
        var nx = m.position.x + pd.flee.dx * fs * dt;
        var nz = m.position.z + pd.flee.dz * fs * dt;
        var fp = G.resolveCircleVsColliders(nx, nz, 0.4);
        // devorga urilsa — biroz yon tomonga siljish
        if (Math.abs(fp.x - nx) + Math.abs(fp.z - nz) > 0.05) {
          var t2 = pd.flee.dx; pd.flee.dx = pd.flee.dz; pd.flee.dz = -t2;
        }
        m.position.x = fp.x; m.position.z = fp.z;
        m.rotation.y = Math.atan2(pd.flee.dx, pd.flee.dz);
        if (!far) animWalk(m, time, pd.phase, 1.5);
        if (pd.flee.t <= 0) {
          pd.flee = null;
          if (pd.kind === 'walker') relocateWalker(pd, playerPos);
        }
        continue;
      }

      // qo'rqib sakrash ofseti
      if (pd.jump) {
        pd.jump.t += dt * 3;
        var k = Math.max(0, 1 - pd.jump.t);
        m.position.x += pd.jump.x * dt * 3 * k;
        m.position.z += pd.jump.z * dt * 3 * k;
        if (pd.jump.t >= 1) pd.jump = null;
      }

      if (pd.kind === 'walker') {
        // juda uzoqlashsa — o'yinchi yaqiniga ko'chirish
        if (i % 31 === frame % 31 && dist2 > 500 * 500) {
          relocateWalker(pd, playerPos);
          continue;
        }
        var seg = pd.seg;
        var len = Math.max(0.001, Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1));
        pd.t += pd.dir * pd.speed * dt / len;
        if (pd.t > 1) { pd.t = 1; pd.dir = -1; }
        if (pd.t < 0) { pd.t = 0; pd.dir = 1; }
        var nx = G.lerp(seg.x1, seg.x2, pd.t);
        var nz = G.lerp(seg.z1, seg.z2, pd.t);
        if (!far) {
          if (Math.abs(nx - m.position.x) + Math.abs(nz - m.position.z) > 0.001) {
            m.rotation.y = Math.atan2(nx - m.position.x, nz - m.position.z);
          }
          animWalk(m, time, pd.phase, 1);
        }
        m.position.x = nx; m.position.z = nz;
      } else if (pd.kind === 'crosser') {
        var cr = pd.cross;
        var fromX = pd.side === 0 ? cr.x1 : cr.x2;
        var fromZ = pd.side === 0 ? cr.z1 : cr.z2;
        var toX = pd.side === 0 ? cr.x2 : cr.x1;
        var toZ = pd.side === 0 ? cr.z2 : cr.z1;
        if (pd.state === 'waiting') {
          if (!far) animIdle(m, time, pd.phase);
          pd.waitPatience -= dt;
          if (pd.waitPatience <= 0 && G.trafficSignals.pedCanCross(cr.crossAxis, cr.ix, cr.iz)) {
            pd.state = 'crossing';
            pd.t = 0;
          }
        } else {
          var clen = Math.max(0.001, Math.hypot(toX - fromX, toZ - fromZ));
          pd.t += pd.speed * dt / clen;
          m.position.x = G.lerp(fromX, toX, Math.min(1, pd.t));
          m.position.z = G.lerp(fromZ, toZ, Math.min(1, pd.t));
          m.rotation.y = Math.atan2(toX - fromX, toZ - fromZ);
          if (!far) animWalk(m, time, pd.phase, 1.1);
          if (pd.t >= 1) {
            pd.state = 'waiting';
            pd.side = 1 - pd.side;
            pd.waitPatience = G.rand(2, 10);
          }
        }
      } else if (pd.kind === 'sitter') {
        if (far) continue;
        var parts = m.userData.parts;
        if (pd.eat) {
          var cycle = (time * 0.9 + pd.phase) % 3;
          parts.armR.rotation.x = cycle < 1 ? -G.lerp(0.2, 2.2, cycle) : (cycle < 1.4 ? -2.2 : -0.2);
          parts.armL.rotation.x = -0.5;
        }
      } else if (pd.kind === 'stander') {
        if (far) continue;
        if (pd.chef) {
          var parts2 = m.userData.parts;
          parts2.armR.rotation.x = -1.2 + Math.sin(time * 3 + pd.phase) * 0.3;
          parts2.armL.rotation.x = -0.8;
        } else {
          animIdle(m, time, pd.phase);
        }
      } else if (pd.kind === 'shopper') {
        pd.t += pd.dir * pd.speed * dt / Math.max(0.001, Math.hypot(pd.x2 - pd.x1, pd.z2 - pd.z1));
        if (pd.t > 1) { pd.t = 1; pd.dir = -1; }
        if (pd.t < 0) { pd.t = 0; pd.dir = 1; }
        var sx = G.lerp(pd.x1, pd.x2, pd.t);
        var sz = G.lerp(pd.z1, pd.z2, pd.t);
        if (!far) {
          if (Math.abs(sx - m.position.x) + Math.abs(sz - m.position.z) > 0.001) {
            m.rotation.y = Math.atan2(sx - m.position.x, sz - m.position.z);
          }
          animWalk(m, time, pd.phase, 0.6);
        }
        m.position.x = sx; m.position.z = sz;
      }
    }
  };
})();
