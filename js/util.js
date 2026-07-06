// ============ Yordamchi funksiyalar / Utilities ============
window.G = window.G || {};

G.rand = function (a, b) { return a + Math.random() * (b - a); };
G.randInt = function (a, b) { return Math.floor(G.rand(a, b + 1)); };
G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
G.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
G.lerp = function (a, b, t) { return a + (b - a) * t; };

G.IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0 && /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent));

// ---- Material cache ----
G._matCache = {};
G.mat = function (color, opts) {
  var key = color + JSON.stringify(opts || {});
  if (!G._matCache[key]) {
    var o = opts || {};
    if (o.phong) {
      G._matCache[key] = new THREE.MeshPhongMaterial({
        color: color, shininess: o.shininess || 60,
        transparent: !!o.transparent, opacity: o.opacity !== undefined ? o.opacity : 1,
        emissive: o.emissive || 0x000000, side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide
      });
    } else {
      G._matCache[key] = new THREE.MeshLambertMaterial({
        color: color,
        transparent: !!o.transparent, opacity: o.opacity !== undefined ? o.opacity : 1,
        emissive: o.emissive || 0x000000, side: o.doubleSide ? THREE.DoubleSide : THREE.FrontSide
      });
    }
  }
  return G._matCache[key];
};

// Avto oynasi (tinted glass) — salon ichidan qarash uchun shaffof
G.glassMat = function () {
  if (!G._glass) {
    G._glass = new THREE.MeshPhongMaterial({
      color: 0x1a2c3d, shininess: 120, transparent: true, opacity: 0.45, side: THREE.DoubleSide
    });
  }
  return G._glass;
};

G.box = function (w, h, d, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
};

// ---- Bino fasadi teksturasi (derazalar bilan) ----
G._texCache = {};
G.buildingTexture = function (baseColor, floors, cols, style) {
  var key = baseColor + '_' + floors + '_' + cols + '_' + style;
  if (G._texCache[key]) return G._texCache[key];
  var cv = document.createElement('canvas');
  cv.width = 256; cv.height = 256;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 256, 256);
  var fh = 256 / floors, fw = 256 / cols;
  for (var f = 0; f < floors; f++) {
    for (var c = 0; c < cols; c++) {
      var x = c * fw + fw * 0.2, y = f * fh + fh * 0.22;
      var w = fw * 0.6, h = fh * 0.56;
      if (style === 'glass') {
        // zamonaviy shisha bino — katta ko'k oynalar
        ctx.fillStyle = (Math.random() < 0.12) ? '#dceaf5' : (Math.random() < 0.5 ? '#3c6e91' : '#2f5d80');
        ctx.fillRect(c * fw + 1, f * fh + 1, fw - 2, fh - 2);
      } else {
        // oddiy uy — deraza + panjur/parda variatsiyasi
        var r = Math.random();
        ctx.fillStyle = r < 0.15 ? '#ffe9a8' : (r < 0.45 ? '#22303c' : '#31465a');
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.fillRect(x, y, w, h * 0.28);
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.strokeRect(x, y, w, h);
        if (style === 'panelka') {
          ctx.strokeStyle = 'rgba(0,0,0,0.12)';
          ctx.strokeRect(c * fw, f * fh, fw, fh);
        }
      }
    }
  }
  // birinchi qavat biroz to'qroq
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 256 - fh, 256, fh);
  var tex = new THREE.CanvasTexture(cv);
  G._texCache[key] = tex;
  return tex;
};

// ---- Viveska (do'kon nomi) teksturasi ----
G.signTexture = function (text, bg, fg, w, h) {
  var cv = document.createElement('canvas');
  cv.width = w || 512; cv.height = h || 96;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 4;
  ctx.strokeRect(3, 3, cv.width - 6, cv.height - 6);
  ctx.fillStyle = fg;
  ctx.font = 'bold ' + Math.floor(cv.height * 0.5) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cv.width / 2, cv.height / 2 + 2);
  return new THREE.CanvasTexture(cv);
};

G.signMesh = function (text, bg, fg, w, h) {
  var tex = G.signTexture(text, bg, fg, Math.round(w * 64), Math.round(h * 64));
  var m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  return m;
};

// ---- O'zbekiston bayrog'i teksturasi ----
G.flagTexture = function () {
  var cv = document.createElement('canvas');
  cv.width = 192; cv.height = 96;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#1eb1e7'; ctx.fillRect(0, 0, 192, 32);
  ctx.fillStyle = '#ce1126'; ctx.fillRect(0, 30, 192, 4);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 34, 192, 28);
  ctx.fillStyle = '#ce1126'; ctx.fillRect(0, 62, 192, 4);
  ctx.fillStyle = '#0e9c3f'; ctx.fillRect(0, 64, 192, 32);
  // yarim oy va yulduzlar
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(24, 16, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1eb1e7';
  ctx.beginPath(); ctx.arc(28, 14, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff';
  for (var i = 0; i < 6; i++) {
    ctx.fillRect(46 + (i % 3) * 14, 8 + Math.floor(i / 3) * 12, 4, 4);
  }
  return new THREE.CanvasTexture(cv);
};

// ---- AABB kollayder ro'yxati + fazoviy indeks (katta xarita uchun) ----
G.colliders = [];
G.addCollider = function (cx, cz, hw, hd) {
  G.colliders.push({ minX: cx - hw, maxX: cx + hw, minZ: cz - hd, maxZ: cz + hd });
};

var GRID_CELL = 80;
var colliderGrid = null;
G.buildColliderIndex = function () {
  colliderGrid = {};
  for (var i = 0; i < G.colliders.length; i++) {
    var c = G.colliders[i];
    var x0 = Math.floor(c.minX / GRID_CELL), x1 = Math.floor(c.maxX / GRID_CELL);
    var z0 = Math.floor(c.minZ / GRID_CELL), z1 = Math.floor(c.maxZ / GRID_CELL);
    for (var gx = x0; gx <= x1; gx++) {
      for (var gz = z0; gz <= z1; gz++) {
        var key = gx + ',' + gz;
        (colliderGrid[key] = colliderGrid[key] || []).push(i);
      }
    }
  }
};

function candidatesFor(x, z, r) {
  if (!colliderGrid) return null;
  var x0 = Math.floor((x - r) / GRID_CELL), x1 = Math.floor((x + r) / GRID_CELL);
  var z0 = Math.floor((z - r) / GRID_CELL), z1 = Math.floor((z + r) / GRID_CELL);
  var out = [];
  for (var gx = x0; gx <= x1; gx++) {
    for (var gz = z0; gz <= z1; gz++) {
      var lst = colliderGrid[gx + ',' + gz];
      if (lst) for (var k = 0; k < lst.length; k++) if (out.indexOf(lst[k]) < 0) out.push(lst[k]);
    }
  }
  return out;
}

// Doira (radius) va AABB to'qnashuvini hal qilish — yangi pozitsiyani qaytaradi
G.resolveCircleVsColliders = function (x, z, r) {
  var cand = candidatesFor(x, z, r + 1);
  var n = cand ? cand.length : G.colliders.length;
  for (var ii = 0; ii < n; ii++) {
    var i = cand ? cand[ii] : ii;
    var c = G.colliders[i];
    var nx = G.clamp(x, c.minX, c.maxX);
    var nz = G.clamp(z, c.minZ, c.maxZ);
    var dx = x - nx, dz = z - nz;
    var d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 0.0001) {
        // markazda qolib ketgan — eng yaqin chetga surish
        var left = Math.abs(x - c.minX), right = Math.abs(c.maxX - x);
        var top = Math.abs(z - c.minZ), bot = Math.abs(c.maxZ - z);
        var m = Math.min(left, right, top, bot);
        if (m === left) x = c.minX - r; else if (m === right) x = c.maxX + r;
        else if (m === top) z = c.minZ - r; else z = c.maxZ + r;
      } else {
        var d = Math.sqrt(d2);
        x = nx + dx / d * r;
        z = nz + dz / d * r;
      }
    }
  }
  return { x: x, z: z };
};
