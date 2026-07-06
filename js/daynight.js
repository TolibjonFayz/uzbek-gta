// ============ Kun / Tun sikli (js/daynight.js, v7) ============
// Osmon rangi, quyosh/oy diski (tumandan xoli), yorug'lik, yulduzlar,
// ko'cha chiroqlari (haqiqiy nur), mashina faralari (spotlight).
// main.js: G.dayNight.init({scene,sun,hemi,camera}) -> har kadr:
//   update(dt, fastKey); updateStreetLights(px,pz); updateCarHeadlights(car|null)
// Muzlatishdan himoya: barcha harakatlanuvchi obyektlar userData.dynamic=true.
window.G = window.G || {};

(function () {
  var time = 9.0;
  var SPEED = 240;        // real 1s = 240 o'yin-s => to'liq sutka ~6 daqiqa
  var FAST_MULT = 16;

  var refs = null;
  var skyGroup = null;
  var stars = null, moonSpr = null, sunSpr = null;
  var sunDir = { x: 0.4, y: 1, z: 0.35 };

  var poolLights = [];    // ko'cha chiroqlari nuri (o'yinchi atrofidagi eng yaqinlar)
  var headL = null, headR = null;   // mashina faralari
  var nightF = 0;

  var cA = new THREE.Color(), cB = new THREE.Color();
  var ORANGE = new THREE.Color(0xffb060), PALE = new THREE.Color(0xfff6df);

  // t, sky, fog, sunColor, sunI, hemiI, hemiSky, hemiGround, stars(0..1)
  var KF = [
    { t: 0.0,  sky: 0x0a1020, fog: 0x101830, sunC: 0x6577bb, sunI: 0.10, hemiI: 0.56, hSky: 0x36426a, hGnd: 0x272f3e, star: 1.0 },
    { t: 5.0,  sky: 0x1c2a4a, fog: 0x26324f, sunC: 0x6a6fa0, sunI: 0.16, hemiI: 0.58, hSky: 0x44506e, hGnd: 0x323844, star: 0.7 },
    { t: 6.3,  sky: 0xefa866, fog: 0xe8b58a, sunC: 0xffb266, sunI: 0.68, hemiI: 0.60, hSky: 0xbcd0e8, hGnd: 0x6a5a44, star: 0.10 },
    { t: 8.0,  sky: 0x9fcaea, fog: 0xbfd8ec, sunC: 0xfff0d4, sunI: 1.00, hemiI: 0.75, hSky: 0xcfe8ff, hGnd: 0x5a6b4a, star: 0.0 },
    { t: 12.0, sky: 0x8ec4ec, fog: 0xbfd8ec, sunC: 0xfff6e2, sunI: 1.15, hemiI: 0.82, hSky: 0xd4ecff, hGnd: 0x5a6b4a, star: 0.0 },
    { t: 17.0, sky: 0x9fc8ea, fog: 0xbfd8ec, sunC: 0xfff0d4, sunI: 1.00, hemiI: 0.76, hSky: 0xcfe8ff, hGnd: 0x5a6b4a, star: 0.0 },
    { t: 18.7, sky: 0xef9455, fog: 0xe6a074, sunC: 0xff9a4d, sunI: 0.60, hemiI: 0.56, hSky: 0xc0b0c8, hGnd: 0x5a4f42, star: 0.10 },
    { t: 20.0, sky: 0x35386e, fog: 0x3c3e64, sunC: 0x8a6fb0, sunI: 0.26, hemiI: 0.56, hSky: 0x525278, hGnd: 0x363844, star: 0.55 },
    { t: 21.5, sky: 0x0a1020, fog: 0x101830, sunC: 0x6577bb, sunI: 0.11, hemiI: 0.55, hSky: 0x36426a, hGnd: 0x272f3e, star: 1.0 },
    { t: 24.0, sky: 0x0a1020, fog: 0x101830, sunC: 0x6577bb, sunI: 0.10, hemiI: 0.56, hSky: 0x36426a, hGnd: 0x272f3e, star: 1.0 }
  ];

  function sample(t) {
    var i = 0;
    while (i < KF.length - 1 && KF[i + 1].t <= t) i++;
    var a = KF[i], b = KF[Math.min(i + 1, KF.length - 1)];
    var span = (b.t - a.t) || 1;
    var f = G.clamp((t - a.t) / span, 0, 1);
    return {
      sky: cA.setHex(a.sky).lerp(cB.setHex(b.sky), f).clone(),
      fog: cA.setHex(a.fog).lerp(cB.setHex(b.fog), f).clone(),
      sunC: cA.setHex(a.sunC).lerp(cB.setHex(b.sunC), f).getHex(),
      sunI: G.lerp(a.sunI, b.sunI, f),
      hemiI: G.lerp(a.hemiI, b.hemiI, f),
      hSky: cA.setHex(a.hSky).lerp(cB.setHex(b.hSky), f).getHex(),
      hGnd: cA.setHex(a.hGnd).lerp(cB.setHex(b.hGnd), f).getHex(),
      star: G.lerp(a.star, b.star, f)
    };
  }

  function makeStars() {
    var N = 520;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(N * 3);
    for (var i = 0; i < N; i++) {
      var u = Math.random(), v = Math.random();
      var theta = 2 * Math.PI * u;
      var phi = Math.acos(v);
      var R = 780;
      pos[i * 3] = R * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = R * Math.cos(phi) * 0.9 + 80;
      pos[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      color: 0xffffff, size: 3.4, sizeAttenuation: false,
      transparent: true, opacity: 0, depthWrite: false, fog: false
    });
    return new THREE.Points(geo, mat);
  }

  function discSprite(color, size) {
    var cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    var c = cv.getContext('2d');
    var g = c.createRadialGradient(64, 64, 3, 64, 64, 62);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.28, color);
    g.addColorStop(0.5, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(64, 64, 62, 0, Math.PI * 2); c.fill();
    var tex = new THREE.CanvasTexture(cv);
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, depthWrite: false, depthTest: false, fog: false
    }));
    sp.scale.set(size, size, 1);
    return sp;
  }

  G.dayNight = {
    get time() { return time; },
    setTime: function (t) { time = ((t % 24) + 24) % 24; },
    sunDir: sunDir,
    night: 0,

    init: function (r) {
      refs = r;
      skyGroup = new THREE.Group();
      skyGroup.userData.dynamic = true;
      refs.scene.add(skyGroup);

      stars = makeStars();
      stars.userData.dynamic = true;
      skyGroup.add(stars);

      sunSpr = discSprite('#ffe9a8', 130);
      sunSpr.userData.dynamic = true;
      skyGroup.add(sunSpr);

      moonSpr = discSprite('#e6eeff', 95);
      moonSpr.userData.dynamic = true;
      skyGroup.add(moonSpr);

      // --- ko'cha chiroqlari nuri (eng yaqinlar o'yinchini kuzatadi) ---
      // decay=0: masofa ichida to'liq kuchda (yo'lni haqiqatan yoritadi)
      var poolN = G.IS_TOUCH ? 3 : 5;
      for (var i = 0; i < poolN; i++) {
        var pl = new THREE.PointLight(0xffd7a0, 0, 32, 0);
        pl.userData.dynamic = true;
        refs.scene.add(pl);
        poolLights.push(pl);
      }

      // --- mashina faralari (2 ta spotlight) ---
      headL = new THREE.SpotLight(0xfff4d0, 0, 46, 0.6, 0.45, 0);
      headR = new THREE.SpotLight(0xfff4d0, 0, 46, 0.6, 0.45, 0);
      [headL, headR].forEach(function (h) {
        h.userData.dynamic = true;
        h.target.userData.dynamic = true;
        refs.scene.add(h);
        refs.scene.add(h.target);
      });

      this.update(0, false);
    },

    clock: function () {
      var h = Math.floor(time);
      var m = Math.floor((time - h) * 60);
      return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    },
    icon: function () { return (time >= 6.3 && time < 18.9) ? '☀️' : '🌙'; },
    isNight: function () { return nightF > 0.5; },

    update: function (dt, fast) {
      time += dt * SPEED * (fast ? FAST_MULT : 1) / 3600;
      if (time >= 24) time -= 24;

      var s = sample(time);
      if (refs.scene.background && refs.scene.background.copy) refs.scene.background.copy(s.sky);
      if (refs.scene.fog) refs.scene.fog.color.copy(s.fog);
      refs.sun.color.setHex(s.sunC);
      refs.sun.intensity = s.sunI;
      refs.hemi.intensity = s.hemiI;
      refs.hemi.color.setHex(s.hSky);
      refs.hemi.groundColor.setHex(s.hGnd);

      // quyosh yo'nalishi (sharq -> tepa -> g'arb)
      var ang = Math.PI * (time - 6) / 12;
      var alt = Math.sin(ang);
      var hor = Math.cos(ang);
      sunDir.x = hor;
      sunDir.y = Math.max(0.16, alt);
      sunDir.z = 0.35;
      G.dayNight.sunDir = sunDir;

      if (stars) stars.material.opacity = s.star;
      if (refs.camera) skyGroup.position.copy(refs.camera.position);

      // quyosh diski — ufqda paydo bo'lib botadi
      var R = 720;
      sunSpr.position.set(hor * R, alt * R, 0.32 * R);
      sunSpr.material.opacity = G.clamp((alt + 0.18) * 2.6, 0, 1);
      // past turganda apelsin, baland turganda och-sariq
      cA.copy(ORANGE).lerp(PALE, G.clamp(alt * 2, 0, 1));
      sunSpr.material.color.copy(cA);
      var sunScale = 130 + (1 - G.clamp(alt, 0, 1)) * 55; // ufqda kattaroq
      sunSpr.scale.set(sunScale, sunScale, 1);

      // oy — qarama-qarshi tomonda
      moonSpr.position.set(-hor * R, -alt * R, -0.32 * R);
      moonSpr.material.opacity = s.star * 0.95;

      // tunlik koeffitsiyenti (0 kunduz .. 1 tun)
      nightF = G.clamp((0.5 - s.sunI) / 0.42, 0, 1);
      G.dayNight.night = nightF;

      if (G.streetLampMat) {
        cA.setHex(0x6b6552).lerp(cB.setHex(0xfff2c0), nightF);
        G.streetLampMat.color.copy(cA);
      }
      if (G.headlightMat) G.headlightMat.emissive.setHex(nightF > 0.4 ? 0xfff4c8 : 0x8a8158);
      if (G.taillightMat) G.taillightMat.emissive.setHex(nightF > 0.4 ? 0xff2a1a : 0x701414);
    },

    // ko'cha chiroqlari: eng yaqin ustunlarga nur qo'yiladi (faqat tunda)
    updateStreetLights: function (px, pz) {
      var lamps = G.streetLampPositions;
      if (!lamps || !poolLights.length) return;
      var target = nightF * 0.95;
      if (nightF < 0.05) {
        for (var k = 0; k < poolLights.length; k++) poolLights[k].intensity = 0;
        return;
      }
      // eng yaqin N ta ustunni topish (oddiy tanlash)
      var nearest = [];
      for (var i = 0; i < lamps.length; i++) {
        var dx = lamps[i].x - px, dz = lamps[i].z - pz;
        var d2 = dx * dx + dz * dz;
        if (d2 > 110 * 110) continue;
        nearest.push({ d2: d2, x: lamps[i].x, z: lamps[i].z });
      }
      nearest.sort(function (a, b) { return a.d2 - b.d2; });
      for (var j = 0; j < poolLights.length; j++) {
        var pl = poolLights[j];
        if (j < nearest.length) {
          pl.position.set(nearest[j].x, 4.6, nearest[j].z);
          pl.intensity = target;
        } else {
          pl.intensity = 0;
        }
      }
    },

    // mashina faralari: haydayotgan mashina oldiga yo'nalgan spotlight
    updateCarHeadlights: function (car) {
      if (!headL) return;
      if (!car || nightF < 0.15) {
        headL.intensity = 0; headR.intensity = 0;
        return;
      }
      var inten = nightF * 2.4;
      var hx = Math.cos(car.heading), hz = Math.sin(car.heading);
      var perpX = -hz, perpZ = hx;
      var frontX = car.x + hx * car.spec.len * 0.5;
      var frontZ = car.z + hz * car.spec.len * 0.5;
      var y = car.spec.noseH * 0.6 + 0.25;
      var offs = car.spec.wid * 0.32;
      headL.position.set(frontX + perpX * offs, y, frontZ + perpZ * offs);
      headR.position.set(frontX - perpX * offs, y, frontZ - perpZ * offs);
      // nishon — oldinda, yerda (yaqinroq => yo'lni yaxshi yoritadi)
      var tx = car.x + hx * 12, tz = car.z + hz * 12;
      headL.target.position.set(tx + perpX * 2.2, 0.05, tz + perpZ * 2.2);
      headR.target.position.set(tx - perpX * 2.2, 0.05, tz - perpZ * 2.2);
      headL.intensity = inten; headR.intensity = inten;
    }
  };
})();
