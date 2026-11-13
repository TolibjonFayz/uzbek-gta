// ============ Mashina shikastlanishi (js/damage.js) ============
// Portlash/tutun YO'Q. Urilganda: bamper tushadi + kuzov pachoq bo'ladi
// (bo'yog'i tirnaladi, biroz qiyshayadi). Mashina hech qachon portlamaydi.
window.G = window.G || {};

(function () {
  var scene = null;
  var debris = [];          // tushgan bamperlar (yerga tushadi)
  var MAX_DEBRIS = 30;
  var SCRATCH = new THREE.Color(0x5a544c); // tirnalgan/kirlangan rang

  G.initDamage = function (s) { scene = s; };

  // ---------- BAMPER TUSHIRISH ----------
  function dropBumper(car, which) {
    var key = 'bump' + which;
    var mesh = car.mesh.userData[key];
    if (!mesh || mesh.userData.dropped) return;
    mesh.userData.dropped = true;
    car[key + 'Off'] = true;
    var wp = new THREE.Vector3(); mesh.getWorldPosition(wp);
    var wq = new THREE.Quaternion(); mesh.getWorldQuaternion(wq);
    car.mesh.remove(mesh); // asl havola saqlanadi (repair uchun)
    var d = new THREE.Mesh(mesh.geometry, mesh.material);
    d.position.copy(wp);
    d.quaternion.copy(wq);
    scene.add(d);
    debris.push({ mesh: d, vy: G.rand(1, 2.5), vx: G.rand(-1.5, 1.5), vz: G.rand(-1.5, 1.5),
      spin: G.rand(-4, 4), settled: false });
    if (debris.length > MAX_DEBRIS) {
      var old = debris.shift();
      scene.remove(old.mesh);
    }
    if (G.sfx) G.sfx.thud();
  }

  // ---------- PACHOQ KO'RINISHI ----------
  function applyDents(car) {
    var dmg = 1 - car.health; // 0..0.92
    var bm = car.mesh.userData.bodyMat;
    if (bm) {
      if (!car._baseCol) car._baseCol = new THREE.Color(car.mesh.userData.color);
      bm.color.copy(car._baseCol).lerp(SCRATCH, Math.min(0.65, dmg * 0.75));
    }
    // qattiq shikastlanganda biroz qiyshayadi (osilgan podveska)
    if (dmg > 0.4) {
      if (car.dentTilt === undefined) car.dentTilt = G.rand(-0.05, 0.05);
      car._dentZ = car.dentTilt * Math.min(1, (dmg - 0.4) / 0.5);   // main.js kuzov harakati bilan qo'shiladi
      car.mesh.rotation.z = car._dentZ;
    }
  }

  // ---------- SHIKAST BERISH ----------
  G.damageCar = function (car, amount) {
    if (!car) return;
    car.health = Math.max(0.08, car.health - amount); // hech qachon 0 emas => portlamaydi
    var h = car.health;
    if (h <= 0.7 && !car.bumpFOff) dropBumper(car, 'F');
    if (h <= 0.5 && !car.bumpROff) dropBumper(car, 'R');
    applyDents(car);
  };

  // ---------- TIKLASH (trafik qayta joylashganda) ----------
  G.repairCar = function (car) {
    car.health = 1;
    car.dentTilt = undefined;
    car._dentZ = 0;
    car.mesh.rotation.z = 0;
    ['F', 'R'].forEach(function (w) {
      var mesh = car.mesh.userData['bump' + w];
      if (mesh && mesh.userData.dropped) {
        mesh.userData.dropped = false;
        car.mesh.add(mesh); // asl transformida qaytadi
      }
      car['bump' + w + 'Off'] = false;
    });
    var bm = car.mesh.userData.bodyMat;
    if (bm && car.mesh.userData.color) bm.color.set(car.mesh.userData.color);
  };

  // ---------- HAR KADR: tushgan bamperlar gravitatsiyasi ----------
  G.updateDamage = function (dt, px, pz) {
    for (var i = 0; i < debris.length; i++) {
      var d = debris[i];
      if (d.settled) continue;
      d.vy -= 12 * dt;
      d.mesh.position.x += d.vx * dt;
      d.mesh.position.y += d.vy * dt;
      d.mesh.position.z += d.vz * dt;
      d.mesh.rotation.x += d.spin * dt;
      if (d.mesh.position.y <= 0.12) {
        d.mesh.position.y = 0.12;
        d.settled = true;
        d.mesh.rotation.x = Math.PI / 2 * (Math.random() < 0.5 ? 1 : 0);
      }
    }
  };
})();
