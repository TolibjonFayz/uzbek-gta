// ============ KATTA XARITA + MARSHRUT TIZIMI ============
// X — butun shahar xaritasi. Ikki marta bosish — marshrut (yo'llar bo'ylab),
// yana ikki marta o'sha joyga bosish — bekor. Missiya manziliga avtomatik marshrut.
window.G = window.G || {};

(function () {
  var WORLD = 2590;   // xarita chegarasi (±)
  var overlay = null, cv = null, c2 = null, open = false;

  G.waypoint = null;                            // {x, z} — qo'lda qo'yilgan manzil
  G.routes = { mission: null, waypoint: null }; // [{x,z}...] yo'llar bo'ylab

  // ---------- ICON BELGISI (minimap ham ishlatadi) ----------
  G.drawBadge = function (c, x, y, icon, ring, r, fs) {
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fillStyle = 'rgba(252,252,248,0.95)';
    c.fill();
    c.lineWidth = 1.6;
    c.strokeStyle = ring || '#444';
    c.stroke();
    c.font = fs + 'px "Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(icon, x, y + 0.5);
  };

  // ---------- YO'L GRAFIGI BO'YICHA MARSHRUT (Dijkstra) ----------
  var VX = null, HZ = null;
  function ensureGrid() {
    if (VX) return;
    VX = G.ROADS.v.map(function (r) { return r.x; });
    HZ = G.ROADS.h.map(function (r) { return r.z; });
  }
  function nodeId(i, j) { return i * HZ.length + j; }

  function snapToRoad(x, z) {
    x = G.clamp(x, -2400, 2400);
    z = G.clamp(z, -2400, 2400);
    var best = null, bd = 1e9;
    for (var i = 0; i < VX.length; i++) {
      var d = Math.abs(x - VX[i]);
      if (d < bd) { bd = d; best = { vert: true, idx: i, x: VX[i], z: z }; }
    }
    for (var j = 0; j < HZ.length; j++) {
      var d2 = Math.abs(z - HZ[j]);
      if (d2 < bd) { bd = d2; best = { vert: false, idx: j, x: x, z: HZ[j] }; }
    }
    return best;
  }

  // snap nuqtaning segment uchlari (chorrahalar) [id, masofa]
  function entries(sp) {
    var out = [], lo = -1, hi = -1, k;
    if (sp.vert) {
      for (k = 0; k < HZ.length; k++) {
        if (HZ[k] <= sp.z) lo = k;
        if (HZ[k] >= sp.z && hi < 0) hi = k;
      }
      if (lo >= 0) out.push([nodeId(sp.idx, lo), Math.abs(sp.z - HZ[lo])]);
      if (hi >= 0 && hi !== lo) out.push([nodeId(sp.idx, hi), Math.abs(HZ[hi] - sp.z)]);
    } else {
      for (k = 0; k < VX.length; k++) {
        if (VX[k] <= sp.x) lo = k;
        if (VX[k] >= sp.x && hi < 0) hi = k;
      }
      if (lo >= 0) out.push([nodeId(lo, sp.idx), Math.abs(sp.x - VX[lo])]);
      if (hi >= 0 && hi !== lo) out.push([nodeId(hi, sp.idx), Math.abs(VX[hi] - sp.x)]);
    }
    return out;
  }

  function dedup(pts) {
    var out = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      var q = out[out.length - 1];
      if (Math.hypot(pts[i].x - q.x, pts[i].z - q.z) > 2) out.push(pts[i]);
    }
    return out;
  }

  G.findRoute = function (sx, sz, txx, tzz) {
    ensureGrid();
    var sp = snapToRoad(sx, sz);
    var tp = snapToRoad(txx, tzz);

    // ikkalasi bir yo'lning bitta segmentida — to'g'ri chiziq
    if (sp.vert === tp.vert && sp.idx === tp.idx) {
      var between = false, k;
      if (sp.vert) {
        for (k = 0; k < HZ.length; k++) if (HZ[k] > Math.min(sp.z, tp.z) && HZ[k] < Math.max(sp.z, tp.z)) { between = true; break; }
      } else {
        for (k = 0; k < VX.length; k++) if (VX[k] > Math.min(sp.x, tp.x) && VX[k] < Math.max(sp.x, tp.x)) { between = true; break; }
      }
      if (!between) {
        return dedup([{ x: sx, z: sz }, { x: sp.x, z: sp.z }, { x: tp.x, z: tp.z }, { x: txx, z: tzz }]);
      }
    }

    var N = VX.length * HZ.length;
    var dist = new Array(N), prev = new Array(N), done = new Array(N);
    for (var n = 0; n < N; n++) { dist[n] = Infinity; prev[n] = -1; done[n] = false; }
    entries(sp).forEach(function (e) { if (e[1] < dist[e[0]]) dist[e[0]] = e[1]; });

    for (var it = 0; it < N; it++) {
      var u = -1, du = Infinity;
      for (var m = 0; m < N; m++) if (!done[m] && dist[m] < du) { du = dist[m]; u = m; }
      if (u < 0) break;
      done[u] = true;
      var ui = Math.floor(u / HZ.length), uj = u % HZ.length;
      var nbs = [[ui - 1, uj], [ui + 1, uj], [ui, uj - 1], [ui, uj + 1]];
      for (var b = 0; b < 4; b++) {
        var ni = nbs[b][0], nj = nbs[b][1];
        if (ni < 0 || ni >= VX.length || nj < 0 || nj >= HZ.length) continue;
        var v = nodeId(ni, nj);
        var w = Math.abs(VX[ni] - VX[ui]) + Math.abs(HZ[nj] - HZ[uj]);
        if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
      }
    }

    var bestN = -1, bestC = Infinity;
    entries(tp).forEach(function (e) {
      var c = dist[e[0]] + e[1];
      if (c < bestC) { bestC = c; bestN = e[0]; }
    });
    if (bestN < 0) return null;

    var chain = [], cur = bestN;
    while (cur >= 0) {
      chain.unshift({ x: VX[Math.floor(cur / HZ.length)], z: HZ[cur % HZ.length] });
      cur = prev[cur];
    }
    return dedup([{ x: sx, z: sz }, { x: sp.x, z: sp.z }].concat(chain, [{ x: tp.x, z: tp.z }, { x: txx, z: tzz }]));
  };

  // ---------- MARSHRUTLARNI YANGILASH ----------
  var recompT = 0;
  G.setWaypoint = function (x, z) { G.waypoint = { x: x, z: z }; recompT = 0; };
  G.clearWaypoint = function () { G.waypoint = null; G.routes.waypoint = null; };

  G.updateMapRoutes = function (dt, px, pz) {
    var mis = G.getActiveMission ? G.getActiveMission() : null;
    if (!mis) G.routes.mission = null;
    recompT -= dt;
    if (recompT <= 0) {
      recompT = 0.7;
      if (mis) G.routes.mission = G.findRoute(px, pz, mis.dropX, mis.dropZ);
      if (G.waypoint) G.routes.waypoint = G.findRoute(px, pz, G.waypoint.x, G.waypoint.z);
    }
    // manzilga yetdik — marshrut yo'qoladi
    if (G.waypoint && Math.hypot(px - G.waypoint.x, pz - G.waypoint.z) < 25) {
      G.clearWaypoint();
      if (G.showToast) G.showToast('📍 Manzilga yetdingiz!', '#5be07a');
    }
  };

  // ---------- KATTA XARITA ----------
  function mapToWorld(mx, my) {
    return { x: mx / cv.width * 2 * WORLD - WORLD, z: my / cv.height * 2 * WORLD - WORLD };
  }

  function ensureDom() {
    if (overlay) return;
    overlay = document.getElementById('mapOverlay');
    cv = document.getElementById('bigMap');
    c2 = cv.getContext('2d');
    document.getElementById('mapClose').addEventListener('click', function () { G.toggleBigMap(); });
    var mb = document.getElementById('mbMap');
    if (mb) mb.addEventListener('pointerdown', function (e) { e.preventDefault(); G.toggleBigMap(); });

    // ikki marta bosish (sichqoncha ham, sensor ham)
    var lastT = 0, lastX = 0, lastY = 0;
    cv.addEventListener('pointerup', function (e) {
      var now = performance.now();
      var r = cv.getBoundingClientRect();
      var mx = (e.clientX - r.left) * (cv.width / r.width);
      var my = (e.clientY - r.top) * (cv.height / r.height);
      if (now - lastT < 400 && Math.hypot(mx - lastX, my - lastY) < 28) {
        var w = mapToWorld(mx, my);
        if (G.waypoint && Math.hypot(w.x - G.waypoint.x, w.z - G.waypoint.z) < 90) {
          G.clearWaypoint();
          if (G.showToast) G.showToast('📍 Marshrut bekor qilindi', '#f2c94c');
        } else {
          G.setWaypoint(w.x, w.z);
          if (G.showToast) G.showToast('📍 Marshrut chizildi', '#5be07a');
        }
        lastT = 0;
      } else {
        lastT = now; lastX = mx; lastY = my;
      }
    });
  }

  G.isMapOpen = function () { return open; };
  G.toggleBigMap = function () {
    ensureDom();
    open = !open;
    overlay.style.display = open ? 'flex' : 'none';
    if (open) {
      var size = Math.max(320, Math.min(window.innerWidth, window.innerHeight) - 70);
      cv.width = size; cv.height = size;
    }
  };

  var NO_LABEL = { 'Benzokolonka': 1, 'Avto servis': 1, 'Anhor kanali': 1 };

  function drawRoute(pts, color, width, sc) {
    if (!pts || pts.length < 2) return;
    c2.strokeStyle = color;
    c2.lineWidth = width;
    c2.lineJoin = 'round';
    c2.lineCap = 'round';
    c2.beginPath();
    c2.moveTo((pts[0].x + WORLD) * sc, (pts[0].z + WORLD) * sc);
    for (var i = 1; i < pts.length; i++) c2.lineTo((pts[i].x + WORLD) * sc, (pts[i].z + WORLD) * sc);
    c2.stroke();
  }

  G.drawBigMap = function (px, pz, heading) {
    if (!open || !cv) return;
    var W = cv.width;
    var sc = W / (2 * WORLD);
    var wx = function (x) { return (x + WORLD) * sc; };
    var wz = function (z) { return (z + WORLD) * sc; };

    // fon
    c2.fillStyle = '#151f16';
    c2.fillRect(0, 0, W, W);
    c2.fillStyle = '#1c2a1d';
    c2.fillRect(wx(-2500), wz(-2500), 5000 * sc, 5000 * sc);

    // tumanlar
    c2.textAlign = 'center'; c2.textBaseline = 'middle';
    G.districts.forEach(function (D) {
      c2.beginPath();
      c2.arc(wx(D.x), wz(D.z), D.r * sc, 0, Math.PI * 2);
      c2.fillStyle = 'rgba(255,255,255,0.025)';
      c2.fill();
      c2.font = 'bold ' + Math.max(9, W * 0.014) + 'px Arial';
      c2.fillStyle = 'rgba(255,255,255,0.30)';
      c2.fillText(D.name.toUpperCase(), wx(D.x), wz(D.z) - D.r * sc * 0.55);
    });

    // yo'llar
    G.ROADS.v.forEach(function (r) {
      var wpx = Math.max(1.6, r.halfW * 2 * sc);
      c2.fillStyle = r.main ? '#a2a8ae' : (r.ring ? '#8a9096' : '#767c82');
      c2.fillRect(wx(r.x) - wpx / 2, wz(-2500), wpx, 5000 * sc);
    });
    G.ROADS.h.forEach(function (r) {
      var wpx = Math.max(1.6, r.halfW * 2 * sc);
      c2.fillStyle = r.main ? '#a2a8ae' : (r.ring ? '#8a9096' : '#767c82');
      c2.fillRect(wx(-2500), wz(r.z) - wpx / 2, 5000 * sc, wpx);
    });

    // kanal (Anhor)
    c2.strokeStyle = '#2f7fb8';
    c2.lineWidth = Math.max(2.5, 14 * sc);
    c2.beginPath();
    c2.moveTo(wx(202), wz(-2500)); c2.lineTo(wx(202), wz(535));
    c2.moveTo(wx(185), wz(520)); c2.lineTo(wx(2500), wz(520));
    c2.stroke();

    // temir yo'l
    c2.strokeStyle = '#b09368';
    c2.lineWidth = 3;
    c2.setLineDash([7, 5]);
    c2.beginPath();
    c2.moveTo(0, wz(620)); c2.lineTo(W, wz(620));
    c2.stroke();
    c2.setLineDash([]);

    // oziq-ovqat do'konlari (mayda nuqtalar)
    c2.fillStyle = 'rgba(240,190,80,0.5)';
    G.foodShops.forEach(function (f) {
      c2.fillRect(wx(f.x) - 1.5, wz(f.z) - 1.5, 3, 3);
    });

    // marshrutlar (yo'llar bo'ylab)
    drawRoute(G.routes.waypoint, 'rgba(125,240,138,0.9)', 4, sc);
    drawRoute(G.routes.mission, 'rgba(255,210,63,0.95)', 5, sc);
    drawRoute(G.routes.race, 'rgba(255,140,26,0.95)', 5, sc);

    // diqqatga sazovor joylar
    var br = Math.max(8, W * 0.015);
    G.landmarks.forEach(function (L) {
      var icon = G.LANDMARK_ICONS[L.name];
      var small = NO_LABEL[L.name];
      if (icon) {
        G.drawBadge(c2, wx(L.x), wz(L.z), icon, L.color, small ? br * 0.72 : br, small ? br : br * 1.3);
        if (!small) {
          c2.font = 'bold ' + Math.max(8, W * 0.012) + 'px Arial';
          c2.lineWidth = 3;
          c2.strokeStyle = 'rgba(10,14,10,0.85)';
          c2.fillStyle = 'rgba(255,245,220,0.95)';
          c2.strokeText(L.name, wx(L.x), wz(L.z) + br * 1.75);
          c2.fillText(L.name, wx(L.x), wz(L.z) + br * 1.75);
        }
      }
    });

    // terilmagan yulduzlar
    if (G.getStars) {
      c2.fillStyle = '#ffd23f';
      c2.strokeStyle = 'rgba(20,14,0,0.7)';
      c2.lineWidth = 1;
      var sts = G.getStars();
      for (var si = 0; si < sts.length; si++) {
        if (sts[si].done) continue;
        c2.beginPath();
        c2.arc(wx(sts[si].x), wz(sts[si].z), 3.2, 0, Math.PI * 2);
        c2.fill();
        c2.stroke();
      }
    }

    // missiya belgilari (taklif — kichikroq, raqib — qizil nuqta)
    if (G.missionMarkers) {
      G.missionMarkers.forEach(function (m) {
        if (m.kind === 'rival') {
          c2.fillStyle = '#ff4444';
          c2.beginPath();
          c2.arc(wx(m.x), wz(m.z), 3.5, 0, Math.PI * 2);
          c2.fill();
          c2.strokeStyle = 'rgba(60,0,0,0.8)';
          c2.lineWidth = 1;
          c2.stroke();
          return;
        }
        var ic = m.kind === 'taxi' ? '🚕' : (m.kind === 'drop' ? '🏁' : '📦');
        var rr = m.kind === 'drop' || m.kind === 'race' ? br : br * 0.72;
        G.drawBadge(c2, wx(m.x), wz(m.z), ic, '#ffd23f', rr, rr * 1.25);
      });
    }

    // poyezd
    if (G.trainPos) {
      var tp = G.trainPos();
      if (tp) G.drawBadge(c2, wx(tp.x), wz(tp.z), '🚆', '#2ecf6a', br * 0.8, br);
    }

    // militsiya
    c2.fillStyle = '#3d7bff';
    G.allCars.forEach(function (c) {
      if (c.isPolice) c2.fillRect(wx(c.x) - 2.5, wz(c.z) - 2.5, 5, 5);
    });

    // manzil (waypoint) bayrog'i
    if (G.waypoint) {
      var wxp = wx(G.waypoint.x), wzp = wz(G.waypoint.z);
      c2.strokeStyle = '#7df08a';
      c2.lineWidth = 2;
      c2.beginPath();
      c2.arc(wxp, wzp, br * 0.9, 0, Math.PI * 2);
      c2.stroke();
      c2.font = (br * 1.5) + 'px "Segoe UI Emoji","Noto Color Emoji",sans-serif';
      c2.fillText('📍', wxp, wzp - br * 0.9);
    }

    // o'yinchi
    c2.save();
    c2.translate(wx(px), wz(pz));
    c2.rotate(heading + Math.PI / 2);
    c2.fillStyle = '#ffd23f';
    c2.strokeStyle = '#1a1a1a';
    c2.lineWidth = 1.5;
    c2.beginPath();
    c2.moveTo(0, -9); c2.lineTo(6, 7); c2.lineTo(0, 4); c2.lineTo(-6, 7);
    c2.closePath();
    c2.fill(); c2.stroke();
    c2.restore();

    // kompas + masshtab
    c2.font = 'bold 14px Arial';
    c2.fillStyle = '#fff';
    c2.fillText('N', W - 22, 26);
    c2.beginPath();
    c2.moveTo(W - 22, 10); c2.lineTo(W - 17, 18); c2.lineTo(W - 27, 18);
    c2.closePath(); c2.fill();
    var bar = 500 * sc;
    c2.strokeStyle = '#fff'; c2.lineWidth = 2;
    c2.beginPath();
    c2.moveTo(14, W - 14); c2.lineTo(14 + bar, W - 14);
    c2.stroke();
    c2.font = '10px Arial';
    c2.textAlign = 'left';
    c2.fillText('500 m', 16, W - 22);
    c2.textAlign = 'center';
  };
})();
