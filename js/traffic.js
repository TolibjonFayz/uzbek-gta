// ============ Svetaforlar (mustaqil sikllar + sekund hisoblagich) va traffic AI ============
window.G = window.G || {};

(function () {
  // ---------- SVETAFOR SIKLLARI ----------
  // 22s sikl: NS yashil 0-8 | NS sariq 8-10 | hamma qizil 10-11 |
  //           EW yashil 11-19 | EW sariq 19-21 | hamma qizil 21-22
  var CYCLE = 22;
  var clock = 0;

  function offsetFor(ix, iz) {
    return Math.abs(ix * 31 + iz * 17 + 1000000) % CYCLE;
  }
  function phaseT(ix, iz) {
    return (clock + offsetFor(ix, iz)) % CYCLE;
  }

  function stateAt(axis, ix, iz) {
    var t = phaseT(ix, iz);
    if (axis === 'NS') {
      if (t < 8) return 'green';
      if (t < 10) return 'yellow';
      return 'red';
    } else {
      if (t < 11) return 'red';
      if (t < 19) return 'green';
      if (t < 21) return 'yellow';
      return 'red';
    }
  }
  // joriy holat tugashigacha qolgan sekundlar (hisoblagich uchun)
  function remainAt(axis, ix, iz) {
    var t = phaseT(ix, iz);
    if (axis === 'NS') {
      if (t < 8) return 8 - t;        // yashil qolgan
      if (t < 10) return 10 - t;      // sariq
      return CYCLE - t;               // qizil (keyingi yashilgacha)
    } else {
      if (t < 11) return 11 - t;      // qizil
      if (t < 19) return 19 - t;      // yashil
      if (t < 21) return 21 - t;      // sariq
      return 11 + CYCLE - t;          // qizil (o'rab)
    }
  }

  // ---------- HISOBLAGICH TEKSTURALARI ----------
  var cdTex = {}; // key: ix,iz,axis
  G.signalCountdownTexture = function (ix, iz, axis) {
    var key = ix + ',' + iz + ',' + axis;
    if (!cdTex[key]) {
      var cv = document.createElement('canvas');
      cv.width = 64; cv.height = 64;
      var tex = new THREE.CanvasTexture(cv);
      cdTex[key] = { cv: cv, c2: cv.getContext('2d'), tex: tex, last: '', ix: ix, iz: iz, axis: axis };
    }
    return cdTex[key].tex;
  };

  function updateCountdowns(px, pz) {
    for (var key in cdTex) {
      var e = cdTex[key];
      var dx = e.ix - px, dz = e.iz - pz;
      if (dx * dx + dz * dz > 300 * 300) continue; // faqat yaqinlarini yangilash
      var st = stateAt(e.axis, e.ix, e.iz);
      var num = Math.ceil(remainAt(e.axis, e.ix, e.iz));
      var text = st + num;
      if (text === e.last) continue;
      e.last = text;
      var c2 = e.c2;
      c2.clearRect(0, 0, 64, 64);
      c2.fillStyle = 'rgba(10,10,14,0.85)';
      c2.fillRect(6, 8, 52, 48);
      c2.fillStyle = st === 'green' ? '#35e05a' : (st === 'yellow' ? '#ffb020' : '#ff4033');
      c2.font = 'bold 38px Arial';
      c2.textAlign = 'center';
      c2.textBaseline = 'middle';
      c2.fillText(String(num), 32, 33);
      e.tex.needsUpdate = true;
    }
  }

  G.trafficSignals = {
    state: stateAt,
    remain: remainAt,
    // piyoda o'tishi mumkinmi: 'V' = vertikal yo'lni kesish (NS oqim qizil bo'lsin)
    pedCanCross: function (crossAxis, ix, iz) {
      var t = phaseT(ix, iz);
      if (crossAxis === 'V') return t > 11.5 && t < 18.5;
      return t > 0.5 && t < 7.5;
    },
    update: function (dt, px, pz) {
      clock += dt;
      updateCountdowns(px || 0, pz || 0);
      // lampalar (faqat yaqinlarini)
      for (var i = 0; i < G.lightPoles.length; i++) {
        var p = G.lightPoles[i];
        var dx = p.ix - px, dz = p.iz - pz;
        if (dx * dx + dz * dz > 350 * 350) continue;
        var st = stateAt(p.axis, p.ix, p.iz);
        if (p.lastState === st) continue;
        p.lastState = st;
        ['r', 'y', 'g'].forEach(function (k) {
          var mat = p.lamps[k];
          var on = (st === 'red' && k === 'r') || (st === 'yellow' && k === 'y') || (st === 'green' && k === 'g');
          if (on) {
            mat.color.setHex(mat.userData.onColor);
            mat.emissive.setHex(mat.userData.onColor);
          } else {
            mat.color.setHex(0x1c1c1c);
            mat.emissive.setHex(0x000000);
          }
        });
      }
    }
  };

  // ---------- BARCHA MASHINALAR ----------
  G.allCars = [];
  G.onCarCrash = null; // main.js o'rnatadi

  var trafficCars = [];

  // O'zbekiston — O'NG QO'L harakati: har mashina o'z yurish yo'nalishining o'ng tomonida.
  // vertikal yo'l (z bo'ylab): o'ng lane  x = pos - dir*off
  // gorizontal yo'l (x bo'ylab): o'ng lane z = pos + dir*off
  function laneOffsets(road) {
    if (road.main) return [4, 9.8];   // ikki lane har tomonga
    if (road.ring) return [3.5, 7.5];
    return [4.2];                     // bitta lane har tomonga (ikki tomonlama)
  }
  function laneX(road, dir, off) { return road.pos - dir * off; }
  function laneZ(road, dir, off) { return road.pos + dir * off; }

  function spawnTrafficCar(scene, road, dir, along, laneOff) {
    // har ~11 mashinadan biri — xizmat mashinasi (tez yordam, betonovoz, fura)
    var name = (G.SERVICE_NAMES && G.SERVICE_NAMES.length && Math.random() < 0.09) ? G.pick(G.SERVICE_NAMES) : G.pick(G.CAR_NAMES);
    var x, z, heading;
    if (road.vertical) {
      x = laneX(road, dir, laneOff);
      z = along;
      heading = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      z = laneZ(road, dir, laneOff);
      x = along;
      heading = dir > 0 ? 0 : Math.PI;
    }
    var car = G.makeCarEntity(name, x, z, heading);
    car.isTraffic = true;
    car.road = road;
    car.dir = dir;
    car.laneOff = laneOff;
    car.targetSpeed = road.main ? G.rand(12, 17) : (road.ring ? G.rand(14, 18) : G.rand(9, 13));
    scene.add(car.mesh);
    trafficCars.push(car);
    G.allCars.push(car);
    return car;
  }

  // asl sifatdagi model yuklangach: o'yinchidan uzoqdagi bitta trafik mashinasini shu modelga almashtirish
  // (og'ir modellar — har biridan faqat bittasi yuradi)
  G.swapInFullCar = function (name) {
    if (!trafficCars.length || !G.debug || !G.debug.scene) return;
    if (trafficCars.some(function (c) { return c.name === name; })) return;
    var p = G.debug.player || { x: 0, z: 0 };
    var px = p.x || 0, pz = p.z || 0, best = null, bd = -1;
    trafficCars.forEach(function (c) {
      if (c.spec.full || c.spec.service) return;
      var d = (c.x - px) * (c.x - px) + (c.z - pz) * (c.z - pz);
      if (d > bd) { bd = d; best = c; }
    });
    if (!best) return;
    var mesh = G.createCarMesh(name);
    if (!mesh || !mesh.userData.full) return;
    G.debug.scene.remove(best.mesh);
    best.mesh = mesh;
    best.name = name;
    best.spec = G.CAR_SPECS[name];
    best.radius = best.spec.len * 0.5 + 0.2;
    best.bumpFOff = best.bumpROff = true;
    G.debug.scene.add(mesh);
    G.updateCarMesh(best);
    G.fullTraffic = (G.fullTraffic || []).concat([best]);
  };

  G.initTraffic = function (scene) {
    var count = G.IS_TOUCH ? 44 : 84; // katta xarita — ko'proq mashina
    var roads = G.TRAFFIC_ROADS;
    for (var i = 0; i < count; i++) {
      var road = roads[i % roads.length];
      var offs = laneOffsets(road);
      // har yo'lni ikki tomonlama qilamiz: har to'liq o'tishda yo'nalish almashadi
      // (yo'llar soni juft bo'lgani uchun i%2 bir yo'lga faqat bitta yo'nalish berardi)
      var dir = (Math.floor(i / roads.length) % 2 === 0) ? 1 : -1;
      var along = G.rand(-G.MAP + 80, G.MAP - 80);
      spawnTrafficCar(scene, road, dir, along, G.pick(offs));
    }
  };

  G.removeFromTraffic = function (car) {
    var i = trafficCars.indexOf(car);
    if (i >= 0) trafficCars.splice(i, 1);
    car.isTraffic = false;
  };

  // uzoqlashib ketgan mashinani o'yinchi atrofiga qayta joylash
  function recycle(car, px, pz) {
    var roads = G.TRAFFIC_ROADS;
    for (var attempt = 0; attempt < 6; attempt++) {
      var road = G.pick(roads);
      // yo'l o'yinchidan 450 dan uzoq bo'lmasin
      var perp = road.vertical ? Math.abs(road.pos - px) : Math.abs(road.pos - pz);
      if (perp > 450) continue;
      var center = road.vertical ? pz : px;
      var along = center + (Math.random() < 0.5 ? -1 : 1) * G.rand(240, 430);
      if (Math.abs(along) > G.MAP - 60) continue;
      var dir = Math.random() < 0.5 ? 1 : -1;
      var laneOff = G.pick(laneOffsets(road));
      var nx, nz;
      if (road.vertical) { nx = laneX(road, dir, laneOff); nz = along; }
      else { nz = laneZ(road, dir, laneOff); nx = along; }
      // boshqa mashinaga juda yaqin bo'lmasin
      var ok = true;
      for (var j = 0; j < G.allCars.length; j++) {
        var o = G.allCars[j];
        var ddx = o.x - nx, ddz = o.z - nz;
        if (ddx * ddx + ddz * ddz < 15 * 15) { ok = false; break; }
      }
      if (!ok) continue;
      if (G.repairCar) G.repairCar(car); // shikastни tiklab qayta ishlatamiz
      car.road = road;
      car.dir = dir;
      car.laneOff = laneOff;
      car.x = nx; car.z = nz;
      car.heading = road.vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI);
      car.speed = G.rand(4, 9);
      car.targetSpeed = road.main ? G.rand(12, 17) : (road.ring ? G.rand(14, 18) : G.rand(9, 13));
      return;
    }
  }

  var recycleIdx = 0;

  G.updateTraffic = function (dt, px, pz) {
    for (var i = 0; i < trafficCars.length; i++) {
      var car = trafficCars[i];
      var road = car.road;
      var along = road.vertical ? car.z : car.x;
      var axis = road.vertical ? 'NS' : 'EW';
      var desired = car.targetSpeed;

      // masofa bo'yicha qayta joylash (har kadrda bir nechtasini tekshiramiz)
      if (i % 20 === recycleIdx % 20) {
        var pdx = car.x - px, pdz = car.z - pz;
        var pd2 = pdx * pdx + pdz * pdz;
        if (pd2 > 650 * 650) { recycle(car, px, pz); continue; }
        // juda uzoqdagilarni chizmaslik (tuman baribir yashiradi)
        car.mesh.visible = pd2 < 450 * 450;
      }

      // 1) svetafor — yo'ldagi keyingi chiroqli chorraha
      if (road.lightedAt && road.lightedAt.length) {
        var bestDist = 1e9, bestCross = null;
        for (var c = 0; c < road.lightedAt.length; c++) {
          var cr = road.lightedAt[c];
          var stopLine = cr.pos - car.dir * (cr.crossHalfW + 3.5);
          var dist = (stopLine - along) * car.dir;
          if (dist > -1.5 && dist < bestDist) { bestDist = dist; bestCross = cr; }
        }
        if (bestCross && bestDist < 28) {
          var ix = road.vertical ? road.pos : bestCross.pos;
          var iz = road.vertical ? bestCross.pos : road.pos;
          var st = stateAt(axis, ix, iz);
          if (st !== 'green') {
            if (!(st === 'yellow' && bestDist < 7 && car.speed > 6)) {
              desired = Math.min(desired, Math.max(0, (bestDist - 2.5) * 0.8));
              if (bestDist < 3) desired = 0;
            }
          }
        }
      }

      // 2) oldindagi mashina
      for (var j = 0; j < G.allCars.length; j++) {
        var o = G.allCars[j];
        if (o === car) continue;
        var lat, ahead;
        if (road.vertical) {
          lat = Math.abs(o.x - car.x);
          ahead = (o.z - car.z) * car.dir;
        } else {
          lat = Math.abs(o.z - car.z);
          ahead = (o.x - car.x) * car.dir;
        }
        if (lat < 2.4 && ahead > 0 && ahead < 26) {
          var gap = ahead - (car.spec.len + o.spec.len) / 2;
          if (gap < 3) desired = 0;
          else if (gap < 14) desired = Math.min(desired, Math.max(0, o.speed + (gap - 4) * 0.6));
        }
      }

      // tezlik
      if (car.speed < desired) car.speed = Math.min(desired, car.speed + 7 * dt);
      else car.speed = Math.max(desired, car.speed - 15 * dt);

      // harakat
      if (road.vertical) {
        car.z += car.dir * car.speed * dt;
        car.x = G.lerp(car.x, laneX(road, car.dir, car.laneOff), Math.min(1, 2 * dt));
        if (Math.abs(car.z) > G.MAP - 40) recycle(car, px, pz);
      } else {
        car.x += car.dir * car.speed * dt;
        car.z = G.lerp(car.z, laneZ(road, car.dir, car.laneOff), Math.min(1, 2 * dt));
        if (Math.abs(car.x) > G.MAP - 40) recycle(car, px, pz);
      }
      G.updateCarMesh(car);
    }
    recycleIdx++;
  };

  // ---------- MASHINALAR O'ZARO TO'QNASHUVI (aylanalar zanjiri bo'yicha) ----------
  G.resolveCarCollisions = function () {
    for (var i = 0; i < G.allCars.length; i++) {
      var a = G.allCars[i];
      for (var j = i + 1; j < G.allCars.length; j++) {
        var b = G.allCars[j];
        // keng bosqich
        var bdx = b.x - a.x, bdz = b.z - a.z;
        var br = a.radius + b.radius;
        if (bdx * bdx + bdz * bdz > br * br) continue;

        // aniq bosqich: aylanalar juftliklari orasidan eng chuqur kirishni topish
        var ca = G.carCircles(a), cb = G.carCircles(b);
        var maxOv = 0, nX = 0, nZ = 0;
        for (var m = 0; m < ca.length; m++) {
          for (var n = 0; n < cb.length; n++) {
            var dx = cb[n].x - ca[m].x, dz = cb[n].z - ca[m].z;
            var rr = ca[m].r + cb[n].r;
            var d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) {
              var d = Math.sqrt(Math.max(d2, 0.0001));
              var ov = rr - d;
              if (ov > maxOv) { maxOv = ov; nX = dx / d; nZ = dz / d; }
            }
          }
        }
        if (maxOv > 0) {
          var aStatic = a.isParked, bStatic = b.isParked;
          if (aStatic && bStatic) continue;
          var aShare = aStatic ? 0 : (bStatic ? 1 : 0.5);
          var bShare = 1 - aShare;
          a.x -= nX * maxOv * aShare;
          a.z -= nZ * maxOv * aShare;
          b.x += nX * maxOv * bShare;
          b.z += nZ * maxOv * bShare;
          // urilish kuchi (normal bo'yicha nisbiy tezlik)
          var vax = Math.cos(a.heading) * a.speed, vaz = Math.sin(a.heading) * a.speed;
          var vbx = Math.cos(b.heading) * b.speed, vbz = Math.sin(b.heading) * b.speed;
          var impact = Math.abs((vax - vbx) * nX + (vaz - vbz) * nZ);
          a.speed *= 0.72;
          b.speed *= 0.72;
          if (impact > 3.5 && G.onCarCrash) G.onCarCrash(a, b, impact);
          if (impact > 4.5 && G.damageCar) {
            var dmg = Math.min(0.16, impact * 0.007); // ~6 urishda portlaydi
            G.damageCar(a, dmg); G.damageCar(b, dmg);
          }
          G.updateCarMesh(a);
          G.updateCarMesh(b);
        }
      }
    }
  };

  // ---------- TURARGOHDAGI MASHINALAR ----------
  G.initParkedCars = function (scene) {
    var spots = [
      { x: 26, z: -42, h: Math.PI / 2, m: 'Cobalt', c: '#f4f6f5' },
      { x: 26, z: -52, h: Math.PI / 2, m: 'Nexia 3' },
      { x: 95, z: 42, h: 0, m: 'Damas' },
      { x: 103, z: 42, h: 0, m: 'Matiz' },
      { x: 111, z: 42, h: 0, m: 'Spark' },
      { x: 87, z: 42, h: 0, m: 'Tahoe' },
      { x: 45, z: 40, h: 0, m: 'Malibu 2' },
      { x: 60, z: 40, h: 0, m: 'Kia K5' },
      { x: -60, z: 40, h: 0, m: 'Hyundai Elantra' },
      { x: 50, z: 190, h: 0, m: 'Hyundai Sonata' },
      { x: 82, z: 190, h: 0, m: 'Kia Sonet' },
      { x: -600, z: -560, h: 0, m: 'Damas' },
      { x: -610, z: -560, h: 0, m: 'Damas' },
      { x: -590, z: -560, h: 0, m: 'Monza' },
      { x: 420, z: 210, h: Math.PI / 2, m: 'Traverse' },
      { x: 420, z: 220, h: Math.PI / 2, m: 'Onix' }
    ];
    [[99, 47, 40, 14], [52, 45, 30, 14], [-60, 45, 20, 12], [26, -47, 12, 24], [66, 195, 44, 12], [-600, -565, 30, 12], [425, 215, 14, 24]].forEach(function (p) {
      var pad = new THREE.Mesh(new THREE.PlaneGeometry(p[2], p[3]), G.mat(0x4a4d50));
      pad.rotation.x = -Math.PI / 2;
      pad.position.set(p[0], 0.03, p[1]);
      scene.add(pad);
    });
    spots.forEach(function (s) {
      var car = G.makeCarEntity(s.m || G.pick(G.CAR_NAMES), s.x, s.z, s.h, s.c);
      car.isParked = true;
      scene.add(car.mesh);
      G.allCars.push(car);
    });
  };
})();
