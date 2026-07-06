// ============ Pul + topshiriqlar (js/missions.js) ============
// Taksi (yo'lovchi tashish) va yetkazib berish missiyalari.
// main.js: G.initMissions(scene) (freeze'dan KEYIN), har kadr G.updateMissions(dt, mode, px, pz).
window.G = window.G || {};

(function () {
  var scene = null;
  var money = 0;
  var state = 'offering';     // offering | active | respawn
  var offers = [];            // {kind, x, z, name, marker, person/box}
  var active = null;          // {kind, dropX, dropZ, dropName, reward, dist}
  var dropMarker = null;
  var respawnT = 0;
  var animT = 0;

  G.missionMarkers = [];      // minimap uchun: [{x,z,kind}]

  // ---------- MARKERLAR ----------
  function makeBeam(color) {
    var g = new THREE.Group();
    var cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 9, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })
    );
    cyl.position.y = 4.5;
    g.add(cyl);
    var core = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 9, 8),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6, depthWrite: false })
    );
    core.position.y = 4.5;
    g.add(core);
    g.userData.dynamic = true;
    return g;
  }

  function nearestName(x, z) {
    var best = null, bd = 130 * 130;
    for (var i = 0; i < G.landmarks.length; i++) {
      var L = G.landmarks[i];
      var d = (x - L.x) * (x - L.x) + (z - L.z) * (z - L.z);
      if (d < bd) { bd = d; best = L.name; }
    }
    if (best) return best;
    var bd2 = 1e9;
    for (var j = 0; j < G.districts.length; j++) {
      var D = G.districts[j];
      var d2 = (x - D.x) * (x - D.x) + (z - D.z) * (z - D.z);
      if (d2 < bd2) { bd2 = d2; best = D.name; }
    }
    return best || 'shahar';
  }

  function roadPoint() {
    var vertical = Math.random() < 0.5;
    var roads = vertical ? G.ROADS.v : G.ROADS.h;
    var road = G.pick(roads);
    var along = G.rand(-G.MAP + 120, G.MAP - 120);
    var side = Math.random() < 0.5 ? 1 : -1;
    var off = road.halfW + 3;
    var x, z;
    if (vertical) { x = road.x + side * off; z = along; }
    else { z = road.z + side * off; x = along; }
    return { x: x, z: z, name: nearestName(x, z) };
  }

  function roadPointFar(fx, fz, minDist) {
    for (var i = 0; i < 20; i++) {
      var p = roadPoint();
      var d = Math.hypot(p.x - fx, p.z - fz);
      if (d > minDist) { p.dist = d; return p; }
    }
    var q = roadPoint(); q.dist = Math.hypot(q.x - fx, q.z - fz); return q;
  }

  function round500(v) { return Math.round(v / 500) * 500; }

  function updateMarkerList() {
    G.missionMarkers = [];
    if (state === 'offering') {
      offers.forEach(function (o) { G.missionMarkers.push({ x: o.x, z: o.z, kind: o.kind }); });
    } else if (active) {
      G.missionMarkers.push({ x: active.dropX, z: active.dropZ, kind: 'drop' });
    }
  }

  function clearOffers() {
    offers.forEach(function (o) {
      scene.remove(o.marker);
      if (o.person) scene.remove(o.person);
      if (o.box) scene.remove(o.box);
    });
    offers = [];
  }

  function spawnOffers() {
    clearOffers();
    // TAKSI — kutayotgan yo'lovchi
    var a = roadPoint();
    var taxiBeam = makeBeam(0xffd23f);
    taxiBeam.position.set(a.x, 0, a.z);
    scene.add(taxiBeam);
    var person = G.makeHuman({ female: Math.random() < 0.5 });
    person.position.set(a.x, 0.25, a.z);
    scene.add(person);
    offers.push({ kind: 'taxi', x: a.x, z: a.z, name: a.name, marker: taxiBeam, person: person });

    // YETKAZISH — quti
    var b = roadPoint();
    var delBeam = makeBeam(0x3d8ec9);
    delBeam.position.set(b.x, 0, b.z);
    scene.add(delBeam);
    var box = G.box(1, 1, 1, G.mat(0xc08a3a));
    box.position.set(b.x, 0.6, b.z);
    scene.add(box);
    offers.push({ kind: 'delivery', x: b.x, z: b.z, name: b.name, marker: delBeam, box: box });

    state = 'offering';
    updateMarkerList();
  }

  function startMission(offer) {
    var d = roadPointFar(offer.x, offer.z, 350);
    var rate = offer.kind === 'taxi' ? 35 : 30;
    var base = offer.kind === 'taxi' ? 4000 : 6000;
    active = {
      kind: offer.kind,
      dropX: d.x, dropZ: d.z, dropName: d.name,
      reward: round500(base + d.dist * rate),
      dist: 0
    };
    clearOffers();
    dropMarker = makeBeam(0x33e06a);
    dropMarker.position.set(d.x, 0, d.z);
    scene.add(dropMarker);
    state = 'active';
    updateMarkerList();
    if (G.onMissionStart) G.onMissionStart(active);
  }

  function completeMission() {
    money += active.reward;
    if (G.onMissionComplete) G.onMissionComplete(active.reward, active.kind);
    scene.remove(dropMarker); dropMarker = null;
    active = null;
    state = 'respawn';
    respawnT = 3;
    updateMarkerList();
  }

  // ---------- API ----------
  G.getMoney = function () { return money; };
  G.addMoney = function (n) { money += n; };
  G.spendMoney = function (n) { if (money >= n) { money -= n; return true; } return false; };
  G.getActiveMission = function () { return active; };
  G.getMissionState = function () { return state; };

  G.initMissions = function (s) {
    scene = s;
    spawnOffers();
  };

  G.updateMissions = function (dt, mode, px, pz) {
    animT += dt;
    // markerlar pulslashi
    var pulse = 0.9 + Math.sin(animT * 3) * 0.12;
    offers.forEach(function (o) {
      o.marker.rotation.y += dt * 0.6;
      o.marker.scale.set(pulse, 1, pulse);
      if (o.person) {
        // qo'l silkitish
        o.person.userData.parts.armR.rotation.z = -1.9 + Math.sin(animT * 7) * 0.5;
        o.person.rotation.y = animT * 0.7;
      }
      if (o.box) o.box.rotation.y += dt * 1.2;
    });
    if (dropMarker) {
      dropMarker.rotation.y += dt * 0.6;
      dropMarker.scale.set(pulse, 1, pulse);
    }

    if (state === 'offering') {
      if (mode === 'drive') {
        for (var i = 0; i < offers.length; i++) {
          var o = offers[i];
          var dx = px - o.x, dz = pz - o.z;
          if (dx * dx + dz * dz < 6.5 * 6.5) { startMission(o); break; }
        }
      }
    } else if (state === 'active') {
      var ddx = px - active.dropX, ddz = pz - active.dropZ;
      active.dist = Math.sqrt(ddx * ddx + ddz * ddz);
      if (mode === 'drive' && active.dist < 7) completeMission();
    } else if (state === 'respawn') {
      respawnT -= dt;
      if (respawnT <= 0) spawnOffers();
    }
  };
})();
