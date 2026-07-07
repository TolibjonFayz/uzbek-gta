// ============ Militsiya: jinoyat -> quvish -> qo'lga olish ============
window.G = window.G || {};

(function () {
  var cars = [];
  var wanted = 0;
  var heat = 0;      // jinoyat "issiqligi" — tugasa qidiruv bekor
  var spawnCd = 0;
  var sirenOn = false;
  var arrestT = 0;
  var scene = null;

  G.initPolice = function (s) { scene = s; };
  G.getWanted = function () { return wanted; };

  // jinoyat sodir etilganda (peds.js dan chaqiriladi)
  G.onCrime = function () {
    wanted = Math.min(3, wanted + 1);
    heat = 45;
  };

  function makePoliceCar(x, z, heading) {
    var car = G.makeCarEntity('Malibu 2', x, z, heading, '#f4f6f5');
    car.isPolice = true;
    car.blink = 0;
    // tom mig'alkasi
    var matR = new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xff2222 });
    var matB = new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x2244ff });
    var barR = G.box(0.42, 0.14, 0.34, matR);
    var barB = G.box(0.42, 0.14, 0.34, matB);
    var roofY = car.spec.roofH + 0.12;
    barR.position.set(-0.2, roofY, 0.30);
    barB.position.set(-0.2, roofY, -0.30);
    car.mesh.add(barR);
    car.mesh.add(barB);
    car.lampA = matR;
    car.lampB = matB;
    // yon yozuvlar
    [1, -1].forEach(function (s2) {
      var sign = G.signMesh('MILITSIYA', '#f4f6f5', '#1a5c2e', 2.2, 0.4);
      sign.position.set(0.1, car.spec.hoodH - 0.18, s2 * (car.spec.wid / 2 + 0.02));
      sign.rotation.y = s2 > 0 ? 0 : Math.PI;
      car.mesh.add(sign);
    });
    return car;
  }

  function spawnPolice(px, pz) {
    var roads = G.TRAFFIC_ROADS;
    for (var a = 0; a < 8; a++) {
      var road = G.pick(roads);
      var perp = road.vertical ? Math.abs(road.pos - px) : Math.abs(road.pos - pz);
      if (perp > 350) continue;
      var center = road.vertical ? pz : px;
      var along = center + (Math.random() < 0.5 ? -1 : 1) * G.rand(160, 280);
      if (Math.abs(along) > G.MAP - 80) continue;
      var x, z, h;
      // o'ng qo'l harakati (dir=+1): vertikal x=pos-4, gorizontal z=pos+4
      if (road.vertical) { x = road.pos - 4; z = along; h = Math.PI / 2; }
      else { z = road.pos + 4; x = along; h = 0; }
      var car = makePoliceCar(x, z, h);
      scene.add(car.mesh);
      cars.push(car);
      G.allCars.push(car);
      return;
    }
  }

  function removeAll() {
    cars.forEach(function (car) {
      scene.remove(car.mesh);
      var i = G.allCars.indexOf(car);
      if (i >= 0) G.allCars.splice(i, 1);
    });
    cars = [];
  }

  function normAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function arrest() {
    wanted = 0;
    heat = 0;
    arrestT = 0;
    removeAll();
    if (sirenOn) { G.sfx.sirenStop(); sirenOn = false; }
    if (G.onArrest) G.onArrest();
  }

  G.updatePolice = function (dt, px, pz, onFoot, playerCar) {
    if (heat > 0) heat -= dt;
    if (heat <= 0 && wanted > 0) wanted = 0;

    // kerakli miqdorda ekipaj chiqarish
    spawnCd -= dt;
    if (wanted > 0 && cars.length < wanted && spawnCd <= 0) {
      spawnPolice(px, pz);
      spawnCd = 2.5;
    }
    if (wanted === 0 && cars.length) removeAll();

    var anyNear = false;
    for (var i = 0; i < cars.length; i++) {
      var car = cars[i];
      var dx = px - car.x, dz = pz - car.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 200) anyNear = true;

      // ta'qib: o'yinchi tomon burilish
      var targetH = Math.atan2(dz, dx);
      var dh = normAngle(targetH - car.heading);
      var turnRate = 1.5 * G.clamp(Math.abs(car.speed) / 8, 0.3, 1);
      car.heading += G.clamp(dh, -turnRate * dt, turnRate * dt);

      var desired;
      if (dist > 60) desired = 26;
      else if (dist > 14) desired = 21;
      else desired = onFoot ? 3 : 17;
      if (car.speed < desired) car.speed = Math.min(desired, car.speed + 9 * dt);
      else car.speed = Math.max(desired, car.speed - 16 * dt);

      car.x += Math.cos(car.heading) * car.speed * dt;
      car.z += Math.sin(car.heading) * car.speed * dt;
      G.collideCarWorld(car);
      G.updateCarMesh(car);

      // mig'alka
      car.blink += dt;
      var on = Math.floor(car.blink * 5) % 2 === 0;
      car.lampA.emissive.setHex(on ? 0xff2222 : 0x330808);
      car.lampB.emissive.setHex(on ? 0x081033 : 0x2244ff);

      // piyoda o'yinchini ushlash
      if (onFoot && dist < 3.8) { arrest(); return; }
    }

    // mashinadagi o'yinchini ushlash: yaqin + deyarli to'xtagan
    if (!onFoot && playerCar && wanted > 0) {
      var close = false;
      for (var j = 0; j < cars.length; j++) {
        if (Math.hypot(cars[j].x - playerCar.x, cars[j].z - playerCar.z) < 7) { close = true; break; }
      }
      if (close && Math.abs(playerCar.speed) < 2) {
        arrestT += dt;
        if (arrestT > 1.5) { arrest(); return; }
      } else {
        arrestT = 0;
      }
    }

    // sirena
    if (anyNear && wanted > 0 && !sirenOn) { G.sfx.sirenStart(); sirenOn = true; }
    else if ((!anyNear || wanted === 0) && sirenOn) { G.sfx.sirenStop(); sirenOn = false; }
  };
})();
