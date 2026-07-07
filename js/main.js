// ============ TASHKENT CITY v3 — asosiy o'yin sikli ============
(function () {
  var canvas = document.getElementById('c');
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !G.IS_TOUCH });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, G.IS_TOUCH ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = !G.IS_TOUCH;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fcaea);
  scene.fog = new THREE.Fog(0xbfd8ec, 240, 680);

  var BASE_FOV = 62;
  // far=820: osmon disklari (R~720) va yulduzlar (R~780) ko'rinadi, uzoq bino kesiladi
  var camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 0.1, 820);
  camera.position.set(30, 10, -50);

  var hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5a6b4a, 0.75);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
  sun.position.set(80, 120, 40);
  sun.castShadow = !G.IS_TOUCH;
  if (sun.castShadow) {
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
    sun.shadow.camera.far = 400;
    sun.shadow.bias = -0.0006;
  }
  scene.add(sun);
  scene.add(sun.target);
  // yorug'liklar har kadrda o'zgaradi — muzlatilmasin
  sun.userData.dynamic = true;
  sun.target.userData.dynamic = true;
  hemi.userData.dynamic = true;

  // --- kun/tun sikli ---
  G.dayNight.init({ scene: scene, sun: sun, hemi: hemi, camera: camera });

  // --- dunyo ---
  G.radio.init();
  G.buildWorld(scene);
  // statik dunyoni "muzlatish" — har kadrda matritsa qayta hisoblanmaydi (katta tezlik)
  scene.traverse(function (o) {
    if (o.userData && o.userData.dynamic) return;
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  });
  G.initTraffic(scene);
  G.initParkedCars(scene);
  G.initPolice(scene);
  G.initDamage(scene); // freeze'dan keyin — zarralar muzlatilmaydi
  G.initMissions(scene);

  var player = G.makeHuman({ female: false });
  player.position.set(22, 0.25, -44);
  player.rotation.y = Math.PI / 2;
  scene.add(player);

  G.initPeds(scene, { x: player.position.x, z: player.position.z });
  if (G.initTrain) G.initTrain(scene);
  if (G.initSkid) G.initSkid(scene);
  if (G.initScore) G.initScore(scene);

  var state = {
    mode: 'foot',
    car: null,
    vy: 0, onGround: true,
    crouch: false,
    interiorView: false,
    enterCooldown: 0,
    punchT: 0
  };

  // ---------- JANG: musht urish ----------
  function doPunch() {
    if (menuOpen || state.mode !== 'foot' || state.punchT > 0.15) return;
    energy = Math.max(0, energy - 1.5);
    state.punchT = 0.42;
    var fdx = Math.sin(player.rotation.y), fdz = Math.cos(player.rotation.y);
    var ox = player.position.x + fdx * 0.5, oz = player.position.z + fdz * 0.5;
    G.unlockAudio();
    var hit = G.punchAt(ox, oz, fdx, fdz);
    G.sfx.punch(hit);
  }

  // avariya ovozi (faqat o'yinchi atrofida)
  G.onCarCrash = function (a, b, impact) {
    var px = state.mode === 'drive' ? state.car.x : player.position.x;
    var pz = state.mode === 'drive' ? state.car.z : player.position.z;
    var dx = a.x - px, dz = a.z - pz;
    if (dx * dx + dz * dz < 90 * 90) G.sfx.crash(impact);
  };

  // qo'lga olinganda
  var bustedTimer = 0;
  G.onArrest = function () {
    el.busted.style.display = 'flex';
    bustedTimer = 3;
    // agar mashinada bo'lsa, tushirib qo'yish
    if (state.mode === 'drive') {
      var c = state.car;
      c.speed = 0; c.isParked = true;
      player.position.set(c.x - Math.sin(c.heading) * 2, 0.25, c.z + Math.cos(c.heading) * 2);
      player.visible = true;
      state.mode = 'foot'; state.car = null; state.interiorView = false;
      G.radio.stop(); G.engineSound.stop(); G.sfx.screechStop();
      camera.fov = BASE_FOV; camera.updateProjectionMatrix();
      updateHudMode();
    }
  };

  // markaziy toast (missiya / stansiya / xabar)
  var toastTimer = 0;
  function showToast(txt, color) {
    el.missionToast.textContent = txt;
    el.missionToast.style.color = color || '#5be07a';
    el.missionToast.style.opacity = 1;
    toastTimer = 2.0;
  }
  G.showToast = showToast; // map.js ham ishlatadi
  G.onMissionComplete = function (reward, kind) {
    showToast((kind === 'taxi' ? '🚕' : '📦') + ' +' + somStr(reward), '#5be07a');
    if (G.scoreEvent) G.scoreEvent('mission', reward);
  };

  // ---------- STANSIYA (yoqilg'i / tuzatish) ----------
  var nearStation = null;
  var fuelBar = document.getElementById('fuelBar');
  var fuelFill = document.getElementById('fuelFill');
  function repairCost(car) { return Math.round((1 - car.health) * 60000 / 500) * 500; }
  function doStation() {
    if (state.mode !== 'drive' || !nearStation) return;
    var car = state.car;
    if (nearStation.type === 'fuel') {
      var need = Math.ceil(100 - car.fuel);
      if (need <= 0) { showToast('⛽ Bak allaqachon to\'la', '#f2c94c'); return; }
      var cost = need * 180;
      if (!G.spendMoney(cost)) { showToast('Pul yetmaydi!', '#eb5757'); return; }
      car.fuel = 100;
      showToast('⛽ To\'ldirildi! −' + somStr(cost), '#5be07a');
    } else {
      var dmg = 1 - car.health;
      if (dmg < 0.02) { showToast('🔧 Mashina soz', '#f2c94c'); return; }
      var rc = repairCost(car);
      if (!G.spendMoney(rc)) { showToast('Pul yetmaydi!', '#eb5757'); return; }
      G.repairCar(car);
      showToast('🔧 Tuzatildi! −' + somStr(rc), '#5be07a');
    }
  }

  // ---------- BOSHQARUV ----------
  var keys = {};
  var joy = { x: 0, y: 0, active: false };
  var mobile = { crouchToggle: false, brakeHeld: false, jumpPressed: false, fastTime: false };

  window.addEventListener('keydown', function (e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ControlLeft', 'ControlRight'].indexOf(e.code) >= 0) e.preventDefault();
    if (keys[e.code]) return;
    keys[e.code] = true;
    if (menuOpen) { if (e.code === 'Escape' || e.code === 'KeyE') closeFoodMenu(); return; }
    if (e.code === 'Enter') tryEnterExit();
    if (e.code === 'KeyE' && state.mode === 'foot' && G.salonBuy && G.salonBuy(player.position.x, player.position.z)) return;
    if (e.code === 'KeyE' && state.mode === 'foot' && nearShop) openFoodMenu(nearShop);
    if (e.code === 'KeyE' && state.mode === 'drive' && nearStation) doStation();
    if (e.code === 'KeyX' && G.toggleBigMap) G.toggleBigMap();
    if (e.code === 'KeyB' && G.toggleStats) G.toggleStats();
    if (e.code === 'Escape') {
      if (G.isStatsOpen && G.isStatsOpen()) G.toggleStats();
      else if (G.isMapOpen && G.isMapOpen()) G.toggleBigMap();
    }
    if (e.code === 'KeyV' && state.mode === 'drive') state.interiorView = !state.interiorView;
    if (e.code === 'KeyM' && state.mode === 'drive') { G.radio.next(); updateSongBar(); }
    if (e.code === 'KeyH' && state.mode === 'drive') G.sfx.horn();
    if (e.code === 'KeyF' && state.mode === 'foot') doPunch();
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });

  function inputAxes() {
    var fwd = 0, turn = 0;
    if (keys['KeyW'] || keys['ArrowUp']) fwd += 1;
    if (keys['KeyS'] || keys['ArrowDown']) fwd -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) turn += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) turn -= 1;
    if (joy.active) { fwd += joy.y; turn += joy.x; }
    return { fwd: G.clamp(fwd, -1, 1), turn: G.clamp(turn, -1, 1) };
  }
  function wantJump() { return keys['Space'] || mobile.jumpPressed; }
  function wantCrouch() { return keys['ControlLeft'] || keys['ControlRight'] || mobile.crouchToggle; }
  function wantHandbrake() { return keys['Space'] || mobile.brakeHeld; }
  function wantRun() { return keys['ShiftLeft'] || keys['ShiftRight'] || (joy.active && Math.hypot(joy.x, joy.y) > 0.92); }

  // ---------- MINISH / TUSHISH ----------
  function nearestCar(maxDist) {
    var best = null, bestD = maxDist * maxDist;
    for (var i = 0; i < G.allCars.length; i++) {
      var c = G.allCars[i];
      var dx = c.x - player.position.x, dz = c.z - player.position.z;
      var d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = c; }
    }
    return best;
  }

  function tryEnterExit() {
    if (state.enterCooldown > 0) return;
    if (state.mode === 'foot') {
      var car = nearestCar(5.5);
      if (car) {
        state.mode = 'drive';
        state.car = car;
        if (car.isTraffic) G.removeFromTraffic(car);
        car.isParked = false;
        player.visible = false;
        state.enterCooldown = 0.5;
        G.unlockAudio();
        G.radio.start();
        G.engineSound.start();
        updateSongBar();
        updateHudMode();
        showCarInfo(car);
      }
    } else {
      var c = state.car;
      c.speed = 0;
      c.isParked = true;
      var lx = c.x - Math.sin(c.heading) * (c.spec.wid / 2 + 1.2);
      var lz = c.z + Math.cos(c.heading) * (c.spec.wid / 2 + 1.2);
      var pos = G.resolveCircleVsColliders(lx, lz, 0.5);
      player.position.set(pos.x, 0.25, pos.z);
      player.visible = true;
      state.mode = 'foot';
      state.car = null;
      state.interiorView = false;
      state.enterCooldown = 0.5;
      G.radio.stop();
      G.engineSound.stop();
      G.sfx.screechStop();
      camera.fov = BASE_FOV;
      camera.updateProjectionMatrix();
      updateHudMode();
    }
  }

  // ---------- HUD ----------
  var el = {
    songBar: document.getElementById('songBar'),
    songTitle: document.getElementById('songTitle'),
    songKeyHint: document.getElementById('songKeyHint'),
    speedo: document.getElementById('speedo'),
    speedVal: document.getElementById('speedVal'),
    hint: document.getElementById('hint'),
    controlsBox: document.getElementById('controlsBox'),
    locName: document.getElementById('locName'),
    minimap: document.getElementById('minimap'),
    carInfo: document.getElementById('carInfo'),
    wanted: document.getElementById('wanted'),
    busted: document.getElementById('busted'),
    clock: document.getElementById('clock'),
    money: document.getElementById('money'),
    missionBar: document.getElementById('missionBar'),
    missionToast: document.getElementById('missionToast'),
    legend: document.getElementById('legend')
  };

  function somStr(n) {
    return (n || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
  }
  function fmtSom(n) { return '💵 ' + somStr(n); }

  // ---------- OVQAT / ENERGIYA ----------
  var energy = 100;
  var menuOpen = false;
  var nearShop = null;
  var fmEl = document.getElementById('foodMenu');
  var fmTitle = document.getElementById('fmTitle');
  var fmList = document.getElementById('fmList');
  var fmMoney = document.getElementById('fmMoney');
  var energyBar = document.getElementById('energyBar');
  var energyFill = document.getElementById('energyFill');
  var fmMsgT = 0;

  function fmMoneyLine(msg, color) {
    fmMoney.innerHTML = (msg ? '<span style="color:' + color + '">' + msg + '</span> · ' : '') + 'Pul: ' + somStr(G.getMoney());
  }
  function renderFoodList(shop) {
    fmList.innerHTML = '';
    shop.menu.forEach(function (item) {
      var afford = G.getMoney() >= item.p;
      var row = document.createElement('div');
      row.className = 'fm-item' + (afford ? '' : ' no');
      row.innerHTML = '<span>' + item.n + '</span><span><span class="en">+' + item.e + '⚡</span><span class="price">' + somStr(item.p) + '</span></span>';
      row.addEventListener('click', function () { buyFood(shop, item); });
      fmList.appendChild(row);
    });
  }
  function openFoodMenu(shop) {
    if (menuOpen || !shop) return;
    menuOpen = true;
    fmTitle.textContent = shop.name;
    renderFoodList(shop);
    fmMoneyLine();
    fmEl.style.display = 'flex';
  }
  function closeFoodMenu() { menuOpen = false; fmEl.style.display = 'none'; }
  function buyFood(shop, item) {
    if (!G.spendMoney(item.p)) {
      fmMoneyLine('Pul yetmaydi!', '#eb5757');
      return;
    }
    energy = Math.min(100, energy + item.e);
    fmMoneyLine('✅ ' + item.n + ' +' + item.e + '⚡', '#5be07a');
    renderFoodList(shop);
    if (fmMsgT) clearTimeout(fmMsgT);
    fmMsgT = setTimeout(function () { if (menuOpen) fmMoneyLine(); }, 1600);
  }
  document.getElementById('fmClose').addEventListener('click', closeFoodMenu);

  function updateSongBar() {
    var s = G.radio.current();
    if (s) el.songTitle.textContent = s.title;
  }

  var carInfoTimer = 0;
  function showCarInfo(car) {
    var s = car.spec;
    var kmh = Math.round(s.maxSpeed * 3.6);
    el.carInfo.innerHTML = '<b>' + s.brand + ' ' + car.name + '</b> &nbsp; <span>' +
      s.typeUz + ' • ' + s.len.toFixed(2) + ' m • max ' + kmh + ' km/soat</span>';
    el.carInfo.style.display = 'block';
    carInfoTimer = 5;
  }

  function updateHudMode() {
    var drive = state.mode === 'drive';
    el.clock.style.display = 'block';
    el.money.style.display = 'block';
    energyBar.style.display = 'block';
    el.legend.style.display = G.IS_TOUCH ? 'none' : 'block';
    el.songBar.style.display = drive ? 'block' : 'none';
    el.speedo.style.display = drive ? 'block' : 'none';
    fuelBar.style.display = drive ? 'block' : 'none';
    if (!drive) el.carInfo.style.display = 'none';
    if (G.IS_TOUCH) {
      el.songKeyHint.textContent = "[🎵 — keyingi qo'shiq]";
      document.getElementById('mbJump').style.display = drive ? 'none' : 'flex';
      document.getElementById('mbCrouch').style.display = drive ? 'none' : 'flex';
      document.getElementById('mbPunch').style.display = drive ? 'none' : 'flex';
      if (drive) document.getElementById('mbFood').style.display = 'none';
      document.getElementById('mbBrake').style.display = drive ? 'flex' : 'none';
      document.getElementById('mbView').style.display = drive ? 'flex' : 'none';
      document.getElementById('mbMusic').style.display = drive ? 'flex' : 'none';
      document.getElementById('mbHorn').style.display = drive ? 'flex' : 'none';
      if (!drive) document.getElementById('mbStation').style.display = 'none';
      document.getElementById('mbTime').style.display = 'flex';
      el.controlsBox.style.display = 'none';
    } else {
      el.controlsBox.innerHTML = drive
        ? "<b>W/S</b> gaz / tormoz<br><b>A/D</b> rul<br><b>Space</b> qo'l tormozi<br><b>V</b> salon kamerasi<br><b>M</b> keyingi qo'shiq<br><b>H</b> klakson<br><b>E</b> stansiya (yoqilgi/tuzatish)<br><b>X</b> xarita · <b>B</b> reyting<br><b>Enter</b> tushish"
        : "<b>W/S</b> oldinga / orqaga<br><b>A/D</b> burilish<br><b>Shift</b> yugurish<br><b>Space</b> sakrash<br><b>Ctrl</b> o'tirish<br><b>F</b> musht<br><b>E</b> ovqat olish<br><b>X</b> xarita · <b>B</b> reyting<br><b>Enter</b> mashinaga minish";
    }
  }

  var lastLoc = '', locTimer = 0;
  function updateLocName(px, pz, dt) {
    locTimer -= dt;
    var found = null;
    for (var i = 0; i < G.landmarks.length; i++) {
      var L = G.landmarks[i];
      var dx = px - L.x, dz = pz - L.z;
      if (dx * dx + dz * dz < L.r * L.r) { found = L.name; break; }
    }
    if (!found) {
      for (var j = 0; j < G.districts.length; j++) {
        var D = G.districts[j];
        var dx2 = px - D.x, dz2 = pz - D.z;
        if (dx2 * dx2 + dz2 * dz2 < D.r * D.r) { found = D.name; break; }
      }
    }
    if (found && found !== lastLoc) {
      lastLoc = found;
      el.locName.textContent = found;
      el.locName.style.opacity = 1;
      locTimer = 3;
    }
    if (!found) lastLoc = '';
    if (locTimer <= 0) el.locName.style.opacity = 0;
  }

  // ---------- MINIMAP (mahalliy ko'rinish) ----------
  var mmCtx = el.minimap.getContext('2d');
  var MM_RANGE = 240; // radiusda ko'rinadigan metrlar
  function drawMinimap(px, pz, heading) {
    var W = 150, C = 75, s = 72 / MM_RANGE;
    mmCtx.clearRect(0, 0, W, W);
    mmCtx.save();
    mmCtx.beginPath();
    mmCtx.arc(C, C, 72, 0, Math.PI * 2);
    mmCtx.clip();
    mmCtx.fillStyle = '#39482f';
    mmCtx.fillRect(0, 0, W, W);
    function tx(wx) { return C + (wx - px) * s; }
    function tz(wz) { return C + (wz - pz) * s; }
    // yo'llar
    G.ROADS.v.forEach(function (r) {
      if (Math.abs(r.x - px) > MM_RANGE + 20) return;
      mmCtx.strokeStyle = '#8b8f93';
      mmCtx.lineWidth = Math.max(2, r.halfW * 2 * s);
      mmCtx.beginPath();
      mmCtx.moveTo(tx(r.x), 0); mmCtx.lineTo(tx(r.x), W);
      mmCtx.stroke();
    });
    G.ROADS.h.forEach(function (r) {
      if (Math.abs(r.z - pz) > MM_RANGE + 20) return;
      mmCtx.strokeStyle = '#8b8f93';
      mmCtx.lineWidth = Math.max(2, r.halfW * 2 * s);
      mmCtx.beginPath();
      mmCtx.moveTo(0, tz(r.z)); mmCtx.lineTo(W, tz(r.z));
      mmCtx.stroke();
    });
    // kanal
    if (Math.abs(202 - px) < MM_RANGE + 20) {
      mmCtx.strokeStyle = '#2f7fb8';
      mmCtx.lineWidth = 4;
      mmCtx.beginPath();
      mmCtx.moveTo(tx(202), 0); mmCtx.lineTo(tx(202), W);
      mmCtx.stroke();
    }
    // temir yo'l (shtrixli chiziq)
    if (Math.abs(620 - pz) < MM_RANGE + 20) {
      mmCtx.strokeStyle = '#8a7a5f';
      mmCtx.lineWidth = 3;
      mmCtx.setLineDash([5, 4]);
      mmCtx.beginPath();
      mmCtx.moveTo(0, tz(620)); mmCtx.lineTo(W, tz(620));
      mmCtx.stroke();
      mmCtx.setLineDash([]);
    }
    // poyezd
    if (G.trainPos) {
      var tp = G.trainPos();
      if (tp) {
        var tdx = tp.x - px, tdz = tp.z - pz;
        if (tdx * tdx + tdz * tdz < (MM_RANGE + 60) * (MM_RANGE + 60)) {
          mmCtx.fillStyle = '#2ecf6a';
          mmCtx.fillRect(tx(tp.x) - 5, tz(tp.z) - 2.5, 10, 5);
        }
      }
    }
    // marshrutlar (yo'llar bo'ylab): sariq — missiya, yashil — qo'lda qo'yilgan
    function mmRoute(pts, color, width) {
      if (!pts || pts.length < 2) return;
      mmCtx.strokeStyle = color;
      mmCtx.lineWidth = width;
      mmCtx.lineJoin = 'round';
      mmCtx.lineCap = 'round';
      mmCtx.beginPath();
      mmCtx.moveTo(tx(pts[0].x), tz(pts[0].z));
      for (var ri = 1; ri < pts.length; ri++) mmCtx.lineTo(tx(pts[ri].x), tz(pts[ri].z));
      mmCtx.stroke();
    }
    if (G.routes) {
      mmRoute(G.routes.waypoint, 'rgba(125,240,138,0.85)', 3);
      mmRoute(G.routes.mission, 'rgba(255,210,63,0.9)', 3.5);
    }
    // diqqatga sazovor joylar
    G.landmarks.forEach(function (L) {
      var dx = L.x - px, dz = L.z - pz;
      if (dx * dx + dz * dz > (MM_RANGE + 40) * (MM_RANGE + 40)) return;
      var mx = tx(L.x), mz = tz(L.z);
      var icon = G.LANDMARK_ICONS[L.name];
      if (icon && G.drawBadge) {
        G.drawBadge(mmCtx, mx, mz, icon, L.color, 8, 11);
      } else {
        mmCtx.fillStyle = L.color;
        mmCtx.beginPath();
        mmCtx.arc(mx, mz, 4, 0, Math.PI * 2);
        mmCtx.fill();
      }
    });
    // terilmagan yulduzlar (yaqin atrofda)
    if (G.getStars) {
      var stArr = G.getStars();
      for (var sti = 0; sti < stArr.length; sti++) {
        var st = stArr[sti];
        if (st.done) continue;
        var sdx = st.x - px, sdz = st.z - pz;
        if (sdx * sdx + sdz * sdz > MM_RANGE * MM_RANGE) continue;
        mmCtx.fillStyle = '#ffd23f';
        mmCtx.beginPath();
        mmCtx.arc(tx(st.x), tz(st.z), 3.5, 0, Math.PI * 2);
        mmCtx.fill();
        mmCtx.strokeStyle = 'rgba(20,14,0,0.8)';
        mmCtx.lineWidth = 1;
        mmCtx.stroke();
      }
    }
    // mashinalar (militsiya — ko'k, ko'zga tashlanadigan)
    G.allCars.forEach(function (c) {
      if (c === state.car) return;
      var dx = c.x - px, dz = c.z - pz;
      if (dx * dx + dz * dz > MM_RANGE * MM_RANGE) return;
      if (c.isPolice) {
        mmCtx.fillStyle = '#3d7bff';
        mmCtx.fillRect(tx(c.x) - 2.5, tz(c.z) - 2.5, 5, 5);
      } else {
        mmCtx.fillStyle = 'rgba(255,255,255,0.8)';
        mmCtx.fillRect(tx(c.x) - 1.5, tz(c.z) - 1.5, 3, 3);
      }
    });
    // missiya belgilari (uzoq bo'lsa — chekkaga bosib, yo'nalish ko'rsatadi)
    G.missionMarkers.forEach(function (m) {
      var mx = (m.x - px) * s, mz = (m.z - pz) * s;
      var dd = Math.hypot(mx, mz);
      var edge = false;
      if (dd > 68) { mx = mx / dd * 68; mz = mz / dd * 68; edge = true; }
      mmCtx.fillStyle = m.kind === 'taxi' ? '#ffd23f' : (m.kind === 'drop' ? '#33e06a' : '#3d8ec9');
      mmCtx.beginPath();
      mmCtx.arc(C + mx, C + mz, edge ? 3.5 : 5, 0, Math.PI * 2);
      mmCtx.fill();
      mmCtx.strokeStyle = '#000'; mmCtx.lineWidth = 1; mmCtx.stroke();
    });
    // qo'lda qo'yilgan manzil (waypoint) — yashil, chetga bosilib yo'nalish ko'rsatadi
    if (G.waypoint) {
      var wmx = (G.waypoint.x - px) * s, wmz = (G.waypoint.z - pz) * s;
      var wd = Math.hypot(wmx, wmz);
      var wedge = false;
      if (wd > 68) { wmx = wmx / wd * 68; wmz = wmz / wd * 68; wedge = true; }
      mmCtx.fillStyle = '#7df08a';
      mmCtx.beginPath();
      mmCtx.arc(C + wmx, C + wmz, wedge ? 3.5 : 5.5, 0, Math.PI * 2);
      mmCtx.fill();
      mmCtx.strokeStyle = '#0a380f';
      mmCtx.lineWidth = 1.5;
      mmCtx.stroke();
    }
    // o'yinchi
    mmCtx.save();
    mmCtx.translate(C, C);
    mmCtx.rotate(heading + Math.PI / 2);
    mmCtx.fillStyle = '#ffd23f';
    mmCtx.beginPath();
    mmCtx.moveTo(0, -7); mmCtx.lineTo(4.5, 5.5); mmCtx.lineTo(-4.5, 5.5);
    mmCtx.closePath();
    mmCtx.fill();
    mmCtx.restore();
    mmCtx.restore();
  }

  // ---------- MOBIL BOSHQARUV ----------
  if (G.IS_TOUCH) {
    var joyZone = document.getElementById('joyZone');
    var joyBase = document.getElementById('joyBase');
    var joyKnob = document.getElementById('joyKnob');
    var joyTouchId = null;
    var baseX = 96, baseY = 0;

    function setBase(cx, cy) {
      joyBase.style.left = (cx - 62) + 'px';
      joyBase.style.top = (cy - 62) + 'px';
      joyBase.style.bottom = 'auto';
    }
    function resetJoy() {
      joy.x = 0; joy.y = 0; joy.active = false;
      joyTouchId = null;
      joyKnob.style.left = '32px';
      joyKnob.style.top = '32px';
      joyBase.style.left = '34px';
      joyBase.style.top = 'auto';
      joyBase.style.bottom = '34px';
    }
    joyZone.addEventListener('touchstart', function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      joyTouchId = t.identifier;
      baseX = t.clientX; baseY = t.clientY;
      setBase(baseX, baseY);
      joy.active = true;
    }, { passive: false });
    joyZone.addEventListener('touchmove', function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier !== joyTouchId) continue;
        var dx = t.clientX - baseX, dy = t.clientY - baseY;
        var d = Math.hypot(dx, dy);
        if (d > 46) { dx = dx / d * 46; dy = dy / d * 46; }
        joyKnob.style.left = (32 + dx) + 'px';
        joyKnob.style.top = (32 + dy) + 'px';
        joy.x = dx / 46;
        joy.y = -dy / 46;
      }
    }, { passive: false });
    var endJoy = function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joyTouchId) resetJoy();
      }
    };
    joyZone.addEventListener('touchend', endJoy);
    joyZone.addEventListener('touchcancel', endJoy);

    function bindBtn(id, onDown, onUp) {
      var b = document.getElementById(id);
      b.addEventListener('touchstart', function (e) { e.preventDefault(); onDown(); }, { passive: false });
      if (onUp) {
        b.addEventListener('touchend', function (e) { e.preventDefault(); onUp(); }, { passive: false });
        b.addEventListener('touchcancel', function () { onUp(); });
      }
    }
    bindBtn('mbEnter', tryEnterExit);
    bindBtn('mbJump', function () { mobile.jumpPressed = true; }, function () { mobile.jumpPressed = false; });
    bindBtn('mbCrouch', function () {
      mobile.crouchToggle = !mobile.crouchToggle;
      document.getElementById('mbCrouch').classList.toggle('on', mobile.crouchToggle);
    });
    bindBtn('mbBrake', function () { mobile.brakeHeld = true; }, function () { mobile.brakeHeld = false; });
    bindBtn('mbView', function () { if (state.mode === 'drive') state.interiorView = !state.interiorView; });
    bindBtn('mbMusic', function () { if (state.mode === 'drive') { G.radio.next(); updateSongBar(); } });
    bindBtn('mbHorn', function () { if (state.mode === 'drive') G.sfx.horn(); });
    bindBtn('mbPunch', function () { doPunch(); });
    bindBtn('mbTime', function () { mobile.fastTime = true; }, function () { mobile.fastTime = false; });
    bindBtn('mbFood', function () { if (nearShop) openFoodMenu(nearShop); });
    bindBtn('mbStation', function () { doStation(); });
  }

  // ---------- PIYODA REJIMI ----------
  var GROUND_Y = 0.25;
  function updateFoot(dt) {
    var ax = menuOpen ? { fwd: 0, turn: 0 } : inputAxes();
    player.rotation.y -= ax.turn * 2.6 * dt;
    // energiya: yugurganda kamayadi, aks holda tiklanadi
    var canRun = wantRun() && energy > 5 && !menuOpen;
    var running = canRun && Math.abs(ax.fwd) > 0.05 && !state.crouch;
    if (running) energy = Math.max(0, energy - 1.1 * dt); // ~90 soniya uzluksiz yugurish
    else energy = Math.min(100, energy + 2.0 * dt);
    var spd = state.crouch ? 1.3 : (canRun ? 6.2 : 3.0);
    var mv = ax.fwd * spd * dt;
    var nx = player.position.x + Math.sin(player.rotation.y) * mv;
    var nz = player.position.z + Math.cos(player.rotation.y) * mv;
    nx = G.clamp(nx, -G.MAP - 150, G.MAP + 150);
    nz = G.clamp(nz, -G.MAP - 150, G.MAP + 150);
    var pos = G.resolveCircleVsColliders(nx, nz, 0.45);
    for (var i = 0; i < G.allCars.length; i++) {
      var c = G.allCars[i];
      var dx = pos.x - c.x, dz = pos.z - c.z;
      var d2 = dx * dx + dz * dz;
      var rr = c.radius * 0.75 + 0.4;
      if (d2 < rr * rr && d2 > 0.001) {
        var d = Math.sqrt(d2);
        pos.x = c.x + dx / d * rr;
        pos.z = c.z + dz / d * rr;
      }
    }
    player.position.x = pos.x;
    player.position.z = pos.z;

    if (wantJump() && state.onGround && !state.crouch) {
      state.vy = 7.6;
      state.onGround = false;
    }
    if (!state.onGround) {
      state.vy -= 21 * dt;
      player.position.y += state.vy * dt;
      if (player.position.y <= GROUND_Y) {
        player.position.y = GROUND_Y;
        state.vy = 0;
        state.onGround = true;
      }
    }

    var wantC = wantCrouch() && state.onGround;
    if (wantC !== state.crouch) {
      state.crouch = wantC;
      player.scale.y = state.crouch ? 0.62 : 1;
    }

    var parts = player.userData.parts;
    if (state.punchT > 0) {
      // musht urish animatsiyasi (o'ng qo'l oldinga otiladi)
      state.punchT -= dt;
      var pk = 1 - Math.abs(state.punchT / 0.42 - 0.5) * 2; // 0..1..0
      parts.armR.rotation.x = -1.8 * pk;
      parts.armL.rotation.x = 0.3 * pk;
      parts.legL.rotation.x = 0;
      parts.legR.rotation.x = 0;
      if (state.punchT <= 0) { parts.armR.rotation.x = 0; parts.armL.rotation.x = 0; }
    } else if (Math.abs(ax.fwd) > 0.05 && state.onGround) {
      var t = performance.now() / 1000;
      var rate = wantRun() ? 11 : 7;
      var s = Math.sin(t * rate) * (state.crouch ? 0.3 : 0.55);
      parts.legL.rotation.x = s;
      parts.legR.rotation.x = -s;
      parts.armL.rotation.x = -s * 0.8;
      parts.armR.rotation.x = s * 0.8;
    } else {
      parts.legL.rotation.x = state.crouch ? -1.1 : 0;
      parts.legR.rotation.x = state.crouch ? -1.1 : 0;
      parts.armL.rotation.x = 0;
      parts.armR.rotation.x = 0;
    }

    var cy = player.rotation.y;
    var camTarget = new THREE.Vector3(
      player.position.x - Math.sin(cy) * 6.5,
      player.position.y + 3.4,
      player.position.z - Math.cos(cy) * 6.5
    );
    camera.position.lerp(camTarget, Math.min(1, 5.5 * dt));
    camera.lookAt(player.position.x, player.position.y + 1.5, player.position.z);

    // yaqin oziq-ovqat do'koni
    nearShop = null;
    if (!menuOpen) {
      for (var fi = 0; fi < G.foodShops.length; fi++) {
        var sh = G.foodShops[fi];
        var sdx = player.position.x - sh.door.x, sdz = player.position.z - sh.door.z;
        if (sdx * sdx + sdz * sdz < 5 * 5) { nearShop = sh; break; }
      }
    }
    if (G.IS_TOUCH) document.getElementById('mbFood').style.display = nearShop ? 'flex' : 'none';

    var near = nearestCar(5.5);
    var sOffer = G.salonOffer ? G.salonOffer(player.position.x, player.position.z) : null;
    if (sOffer) {
      el.hint.innerHTML = sOffer.owned
        ? '✅ ' + sOffer.name + ' sizda bor — yon turargohda'
        : '<b>E</b> — ' + sOffer.name + ' sotib olish (' + somStr(sOffer.price) + ')';
      el.hint.style.display = 'block';
    } else if (near) {
      el.hint.innerHTML = '<b>Enter</b> — ' + near.name + 'ga minish' + (G.IS_TOUCH ? ' (🚗 tugma)' : '');
      el.hint.style.display = 'block';
    } else if (nearShop) {
      el.hint.innerHTML = (G.IS_TOUCH ? '🍽️ tugma' : '<b>E</b>') + ' — ' + nearShop.name + ' dan ovqat oling';
      el.hint.style.display = 'block';
    } else {
      el.hint.style.display = 'none';
    }
  }

  // ---------- HAYDASH REJIMI ----------
  function updateDrive(dt) {
    var car = state.car;
    var spec = car.spec;
    var ax = inputAxes();
    var hb = wantHandbrake();
    energy = Math.min(100, energy + 1.2 * dt); // mashinada dam olinadi

    // yoqilg'i sarfi
    if (Math.abs(car.speed) > 0.3 || ax.fwd > 0.05) {
      // to'liq gazda ~10.5 daqiqa, tinch haydashda ~20+ daqiqa yetadi
      car.fuel = Math.max(0, car.fuel - (0.05 + Math.abs(ax.fwd) * 0.11) * dt);
    }
    var outOfFuel = car.fuel <= 0;

    if (ax.fwd > 0.05 && !outOfFuel) {
      // tezlik oshgani sari tortish kuchi kamayadi (realroq)
      var power = spec.accel * (1 - 0.55 * Math.abs(car.speed) / spec.maxSpeed);
      car.speed += power * ax.fwd * dt;
    } else if (ax.fwd < -0.05 && !outOfFuel) {
      if (car.speed > 0.5) car.speed += 24 * ax.fwd * dt;
      else car.speed = Math.max(car.speed + 6 * ax.fwd * dt, -8);
    } else {
      car.speed *= (1 - 0.55 * dt);
    }
    if (hb) car.speed *= (1 - 3.4 * dt);
    car.speed = G.clamp(car.speed, -8, spec.maxSpeed);
    if (Math.abs(car.speed) < 0.03 && Math.abs(ax.fwd) < 0.05) car.speed = 0;

    // rul — g'ildarak bazasiga va tezlikka bog'liq
    var steerEff = G.clamp(Math.abs(car.speed) / 6, 0, 1) * (1 - Math.abs(car.speed) / (spec.maxSpeed * 2.4));
    var steerRate = 2.2 * (4.4 / spec.len) * steerEff * (hb ? 1.75 : 1);
    car.heading += ax.turn * steerRate * dt * (car.speed >= 0 ? 1 : -1);

    // old g'ildiraklar vizual burilishi
    var wf = car.mesh.userData.wheelsF;
    if (wf) {
      for (var w = 0; w < wf.length; w++) {
        wf[w].rotation.y = G.lerp(wf[w].rotation.y, -ax.turn * 0.45, Math.min(1, 8 * dt));
      }
    }

    // shina izlari + tutun (burnout — faqat kuchli mashinalarda)
    var burnout = G.carSkid ? G.carSkid(dt, car, ax.fwd, hb) : false;

    // shina chiyillashi (qo'l tormozi, keskin tormoz yoki burnout)
    var hardBrake = ax.fwd < -0.05 && car.speed > 12;
    if ((hb && Math.abs(car.speed) > 8) || hardBrake || burnout) G.sfx.screechStart();
    else G.sfx.screechStop();

    car.x += Math.cos(car.heading) * car.speed * dt;
    car.z += Math.sin(car.heading) * car.speed * dt;
    car.x = G.clamp(car.x, -G.MAP - 140, G.MAP + 140);
    car.z = G.clamp(car.z, -G.MAP - 140, G.MAP + 140);

    // binolar bilan to'qnashuv (mashina shakli bo'yicha)
    var prevSpeed = car.speed;
    if (G.collideCarWorld(car)) {
      if (Math.abs(prevSpeed) > 6) {
        G.sfx.crash(Math.abs(prevSpeed) * 0.5);
        G.damageCar(car, Math.min(0.15, Math.abs(prevSpeed) * 0.009)); // ~6+ urishda portlaydi
      }
      car.speed *= (1 - 4 * dt);
    }
    G.updateCarMesh(car);

    // piyodalar bilan to'qnashuv / qo'rqitish
    G.checkPedHits(car, dt);

    G.engineSound.update(Math.abs(car.speed) / spec.maxSpeed, Math.abs(ax.fwd));
    el.speedVal.textContent = Math.round(Math.abs(car.speed) * 3.6);

    // tezlik hissi — FOV kengayadi
    var targetFov = BASE_FOV + Math.abs(car.speed) * 0.22;
    if (Math.abs(camera.fov - targetFov) > 0.3) {
      camera.fov = G.lerp(camera.fov, targetFov, Math.min(1, 3 * dt));
      camera.updateProjectionMatrix();
    }

    if (state.interiorView) {
      var eyeWorld = car.mesh.userData.driverEye.clone();
      car.mesh.localToWorld(eyeWorld);
      camera.position.copy(eyeWorld);
      camera.lookAt(
        eyeWorld.x + Math.cos(car.heading) * 10,
        eyeWorld.y - 0.5,
        eyeWorld.z + Math.sin(car.heading) * 10
      );
    } else {
      var dist = 8.5 + Math.abs(car.speed) * 0.1;
      var camTarget = new THREE.Vector3(
        car.x - Math.cos(car.heading) * dist,
        3.8 + Math.abs(car.speed) * 0.02,
        car.z - Math.sin(car.heading) * dist
      );
      camera.position.lerp(camTarget, Math.min(1, 4.5 * dt));
      camera.lookAt(car.x, 1.6, car.z);
    }

    // yoqilg'i ko'rsatkichi
    fuelFill.style.width = car.fuel + '%';

    // yaqin stansiya (benzokolonka / servis)
    nearStation = null;
    for (var si = 0; si < G.stations.length; si++) {
      var st = G.stations[si];
      var sdx = car.x - st.x, sdz = car.z - st.z;
      if (sdx * sdx + sdz * sdz < st.r * st.r) { nearStation = st; break; }
    }
    if (nearStation) {
      var pre = G.IS_TOUCH ? '⛽/🔧 tugma' : '<b>E</b>';
      var msg;
      if (nearStation.type === 'fuel') {
        var need = Math.ceil(100 - car.fuel);
        msg = need <= 0 ? '⛽ Bak to\'la' : pre + ' — yoqilg\'i to\'ldirish (' + somStr(need * 180) + ')';
      } else {
        var dmg = 1 - car.health;
        msg = dmg < 0.02 ? '🔧 Mashina soz' : pre + ' — tuzatish (' + somStr(repairCost(car)) + ')';
      }
      el.hint.innerHTML = msg;
      el.hint.style.display = 'block';
    } else {
      el.hint.style.display = 'none';
    }
    if (G.IS_TOUCH) document.getElementById('mbStation').style.display = nearStation ? 'flex' : 'none';
    if (outOfFuel && !nearStation) {
      el.hint.innerHTML = '⛽ Yoqilg\'i tugadi! Benzokolonkaga boring';
      el.hint.style.display = 'block';
    }
  }

  // ---------- ASOSIY SIKL ----------
  var clock3 = new THREE.Clock();
  var started = false;
  var lastWanted = 0;
  var clockTick = 0;

  function animate() {
    requestAnimationFrame(animate);
    var dt = Math.min(clock3.getDelta(), 0.05);
    if (!started) { renderer.render(scene, camera); return; }
    var time = performance.now() / 1000;

    if (state.enterCooldown > 0) state.enterCooldown -= dt;

    var px = state.mode === 'drive' ? state.car.x : player.position.x;
    var pz = state.mode === 'drive' ? state.car.z : player.position.z;

    G.trafficSignals.update(dt, px, pz);
    G.updateTraffic(dt, px, pz);
    G.updatePolice(dt, px, pz, state.mode === 'foot', state.car);
    if (G.updateTrain) G.updateTrain(dt, px, pz, state.mode === 'drive' ? state.car : null, player);

    if (state.mode === 'foot') updateFoot(dt);
    else updateDrive(dt);

    G.resolveCarCollisions();
    if (state.mode === 'drive') G.updateCarMesh(state.car);

    // shikast (bamper tushishi + pachoq) — tushgan bamperlar gravitatsiyasi
    G.updateDamage(dt, px, pz);

    // tutun zarralari animatsiyasi (piyoda bo'lganda ham so'nib tugashi uchun)
    if (G.updateSkidFx) G.updateSkidFx(dt);

    // uy ichida — tashqi devorlar/tom shaffoflashadi
    if (G.updateHouse) G.updateHouse(dt, px, pz);

    // missiyalar (taksi / yetkazish) + pul + energiya HUD
    G.updateMissions(dt, state.mode, px, pz);
    el.money.textContent = fmtSom(G.getMoney());
    energyFill.style.width = energy + '%';
    var mis = G.getActiveMission();
    if (mis) {
      el.missionBar.style.display = 'block';
      el.missionBar.innerHTML = (mis.kind === 'taxi' ? '🚕 Yo\'lovchi → ' : '📦 Yetkazish → ') +
        '<b>' + mis.dropName + '</b> — ' + Math.round(mis.dist) + ' m' +
        (state.mode !== 'drive' ? ' <span style="color:#ff8">(mashinaga o\'ting)</span>' : '');
    } else if (G.getMissionState() === 'offering' && state.mode === 'drive') {
      el.missionBar.style.display = 'block';
      el.missionBar.innerHTML = "🚕 Taksi · 📦 Yetkazish — <b>belgiga yeting</b>";
    } else {
      el.missionBar.style.display = 'none';
    }
    if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) el.missionToast.style.opacity = 0; }

    // HUD taймerlar
    if (carInfoTimer > 0) { carInfoTimer -= dt; if (carInfoTimer <= 0) el.carInfo.style.display = 'none'; }
    if (bustedTimer > 0) { bustedTimer -= dt; if (bustedTimer <= 0) el.busted.style.display = 'none'; }
    var w = G.getWanted();
    if (w !== lastWanted) {
      lastWanted = w;
      el.wanted.style.display = w > 0 ? 'block' : 'none';
      el.wanted.textContent = '★★★'.slice(0, w) + '☆☆☆'.slice(0, 3 - w);
    }

    px = state.mode === 'drive' ? state.car.x : player.position.x;
    pz = state.mode === 'drive' ? state.car.z : player.position.z;
    var ph = state.mode === 'drive' ? state.car.heading : (Math.PI / 2 - player.rotation.y);

    G.updatePeds(dt, time, { x: px, z: pz });

    // animatsiyalar (charxpalak va h.k.)
    for (var a = 0; a < G.animated.length; a++) G.animated[a].fn(dt);

    updateLocName(px, pz, dt);
    if (G.updateScore) G.updateScore(dt, px, pz, state.mode === 'drive', state.mode === 'drive' ? Math.abs(state.car.speed) : 0);
    if (G.updateMapRoutes) G.updateMapRoutes(dt, px, pz);
    drawMinimap(px, pz, ph);
    if (G.isMapOpen && G.isMapOpen()) G.drawBigMap(px, pz, ph);

    // kun/tun — vaqt o'tishi, yorug'lik, osmon ('T' yoki ⏩ — tez o'tkazish)
    G.dayNight.update(dt, keys['KeyT'] || mobile.fastTime);
    G.dayNight.updateStreetLights(px, pz);
    G.dayNight.updateCarHeadlights(state.mode === 'drive' ? state.car : null);
    var sd = G.dayNight.sunDir;
    sun.position.set(px + sd.x * 160, sd.y * 170, pz + sd.z * 160);
    sun.target.position.set(px, 0, pz);
    if (clockTick <= 0) {
      el.clock.textContent = G.dayNight.icon() + ' ' + G.dayNight.clock();
      clockTick = 0.25;
    }
    clockTick -= dt;

    renderer.render(scene, camera);
  }
  animate();

  // ---------- BOSHLASH ----------
  document.getElementById('startBtn').addEventListener('click', function () {
    G.unlockAudio();
    document.getElementById('startScreen').style.display = 'none';
    started = true;
    updateHudMode();
    if (G.IS_TOUCH) {
      document.getElementById('joyZone').style.display = 'block';
      document.getElementById('joyBase').style.display = 'block';
      document.getElementById('btns').style.display = 'flex';
      if (window.innerHeight > window.innerWidth) {
        var tip = document.getElementById('orientTip');
        tip.style.display = 'block';
        setTimeout(function () { tip.style.display = 'none'; }, 4500);
      }
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    }
  });

  // test/tekshiruv uchun
  G.debug = {
    player: player, state: state, camera: camera, keys: keys,
    start: function () { document.getElementById('startBtn').click(); },
    openFood: openFoodMenu, buyFood: buyFood, energy: function () { return energy; },
    setEnergy: function (v) { energy = v; },
    doStation: doStation, forceStation: function (s) { nearStation = s; }
  };

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
})();
