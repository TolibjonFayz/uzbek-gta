// ============ SHINA IZLARI + TUTUN ============
// Tormoz — hamma mashinada iz qoldiradi.
// Joyidan gazni bosish (burnout) — faqat kuchli mashinalarda: iz + tutun + chiyillash.
window.G = window.G || {};

(function () {
  var scene = null;

  // ---------- IZLAR: bitta geometriyada aylanma quad pool ----------
  var MAXQ = 600;          // segmentlar soni (eski izlar asta o'chib boradi — ustiga yoziladi)
  var HALF_W = 0.11;       // iz yarim eni
  var Y = 0.125;           // zebra (0.11) dan tepada, trotuar (0.24) dan pastda
  var STEP = 0.55;         // har necha metrda yangi segment
  var head = 0;
  var geo = null, posAttr = null;

  function initMarks() {
    geo = new THREE.BufferGeometry();
    var positions = new Float32Array(MAXQ * 4 * 3);
    posAttr = new THREE.BufferAttribute(positions, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    var idx = new Uint16Array(MAXQ * 6);
    for (var q = 0; q < MAXQ; q++) {
      var v = q * 4, o = q * 6;
      idx[o] = v; idx[o + 1] = v + 1; idx[o + 2] = v + 2;
      idx[o + 3] = v; idx[o + 4] = v + 2; idx[o + 5] = v + 3;
    }
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    var mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: 0x151515, transparent: true, opacity: 0.45,
      depthWrite: false, side: THREE.DoubleSide
    }));
    mesh.frustumCulled = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
  }

  function putQuad(x1, z1, x2, z2) {
    var dx = x2 - x1, dz = z2 - z1;
    var d = Math.hypot(dx, dz);
    if (d < 0.001) return;
    var px = (-dz / d) * HALF_W, pz = (dx / d) * HALF_W;
    var a = posAttr.array, o = head * 12;
    a[o] = x1 + px; a[o + 1] = Y; a[o + 2] = z1 + pz;
    a[o + 3] = x1 - px; a[o + 4] = Y; a[o + 5] = z1 - pz;
    a[o + 6] = x2 - px; a[o + 7] = Y; a[o + 8] = z2 - pz;
    a[o + 9] = x2 + px; a[o + 10] = Y; a[o + 11] = z2 + pz;
    posAttr.needsUpdate = true;
    head = (head + 1) % MAXQ;
  }

  // ---------- TUTUN ----------
  var smokeTex = null;
  var smokes = [];        // {s, t, life, vx, vz, grow}
  var MAXS = 70;

  function makeSmokeTex() {
    var cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    var c2 = cv.getContext('2d');
    var gr = c2.createRadialGradient(32, 32, 4, 32, 32, 30);
    gr.addColorStop(0, 'rgba(210,210,215,0.65)');
    gr.addColorStop(0.6, 'rgba(190,190,196,0.30)');
    gr.addColorStop(1, 'rgba(180,180,186,0)');
    c2.fillStyle = gr;
    c2.fillRect(0, 0, 64, 64);
    smokeTex = new THREE.CanvasTexture(cv);
  }

  function spawnSmoke(x, z, vx, vz) {
    var sm = null;
    for (var i = 0; i < smokes.length; i++) {
      if (smokes[i].t >= smokes[i].life) { sm = smokes[i]; break; }
    }
    if (!sm) {
      if (smokes.length >= MAXS) return;
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: smokeTex, transparent: true, depthWrite: false
      }));
      sm = { s: sp, t: 0, life: 0, vx: 0, vz: 0, grow: 0 };
      scene.add(sp);
      smokes.push(sm);
    }
    sm.t = 0;
    sm.life = G.rand(0.7, 1.1);
    sm.vx = vx + G.rand(-0.8, 0.8);
    sm.vz = vz + G.rand(-0.8, 0.8);
    sm.grow = G.rand(2.2, 3.4);
    sm.s.position.set(x + G.rand(-0.2, 0.2), 0.35, z + G.rand(-0.2, 0.2));
    sm.s.scale.setScalar(G.rand(0.8, 1.2));
    sm.s.material.opacity = 0.55;
    sm.s.visible = true;
  }

  // har kadrda (mashinada ham, piyoda ham) — tutun animatsiyasi
  G.updateSkidFx = function (dt) {
    for (var i = 0; i < smokes.length; i++) {
      var sm = smokes[i];
      if (sm.t >= sm.life) { sm.s.visible = false; continue; }
      sm.t += dt;
      var k = sm.t / sm.life;
      sm.s.position.x += sm.vx * dt;
      sm.s.position.z += sm.vz * dt;
      sm.s.position.y += dt * 1.1;
      var sc = 0.9 + k * sm.grow;
      sm.s.scale.setScalar(sc);
      sm.s.material.opacity = 0.55 * (1 - k);
      if (sm.t >= sm.life) sm.s.visible = false;
    }
  };

  // ---------- MASHINA SKIDI ----------
  // orqa g'ildiraklar oxirgi nuqtalari (chap/o'ng)
  var lastL = null, lastR = null;
  var smokeCd = 0;

  // Kuchli mashina: burnout qila oladi (accel >= 8.5 — Malibu, Tahoe, K5, Sonata...)
  function isPowerful(spec) { return spec.accel >= 8.5; }

  // main.js updateDrive dan chaqiriladi. burnout=true qaytarsa chiyillash ham yoqiladi.
  G.carSkid = function (dt, car, fwd, hb) {
    if (!geo) return false;
    var spec = car.spec;
    var braking = fwd < -0.05 && car.speed > 8;                  // tormoz — hammada
    var drifting = (hb && Math.abs(car.speed) > 8) || car.drifting; // qo'l tormozi yoki yonga sirpanish (main.js)
    var burnout = fwd > 0.6 && car.fuel > 0 && isPowerful(spec) &&
                  car.speed >= -0.5 && car.speed < spec.maxSpeed * 0.35;

    var skidding = braking || drifting || burnout;
    if (!skidding) { lastL = null; lastR = null; return false; }

    // orqa g'ildiraklar dunyo koordinatalari
    var L2 = spec.len / 2;
    var lx = -(L2 - spec.ohR);                 // orqa o'q (lokal)
    var ly = spec.wid / 2 - 0.12;
    var cos = Math.cos(car.heading), sin = Math.sin(car.heading);
    var wl = { x: car.x + cos * lx - sin * ly, z: car.z + sin * lx + cos * ly };
    var wr = { x: car.x + cos * lx + sin * ly, z: car.z + sin * lx - cos * ly };

    if (lastL) {
      var dL = Math.hypot(wl.x - lastL.x, wl.z - lastL.z);
      if (dL > 8) { lastL = wl; lastR = wr; }                    // teleport/katta sakrash
      else if (dL > STEP) {
        putQuad(lastL.x, lastL.z, wl.x, wl.z);
        putQuad(lastR.x, lastR.z, wr.x, wr.z);
        lastL = wl; lastR = wr;
      }
    } else { lastL = wl; lastR = wr; }

    // tutun — faqat burnoutda (kuchli mashina), drift/tormozda ozgina
    smokeCd -= dt;
    if (smokeCd <= 0) {
      if (burnout) {
        smokeCd = 0.05;
        spawnSmoke(wl.x, wl.z, -cos * 2.5, -sin * 2.5);
        spawnSmoke(wr.x, wr.z, -cos * 2.5, -sin * 2.5);
      } else if (drifting && Math.abs(car.speed) > 14 && Math.random() < 0.5) {
        smokeCd = 0.09;
        spawnSmoke(Math.random() < 0.5 ? wl.x : wr.x, Math.random() < 0.5 ? wl.z : wr.z, 0, 0);
      }
    }
    return burnout;
  };

  G.skidStats = function () {
    var live = 0;
    for (var i = 0; i < smokes.length; i++) if (smokes[i].t < smokes[i].life) live++;
    return { head: head, smokes: live, pool: smokes.length };
  };

  G.initSkid = function (s) {
    scene = s;
    makeSmokeTex();
    initMarks();
  };
})();
