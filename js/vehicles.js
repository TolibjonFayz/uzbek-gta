// ============ Mashinalar fabrikasi v3 ============
// Har model haqiqiy o'lchamlar va yon silueti bo'yicha quriladi:
// bamper -> kapot -> old oyna -> tom -> orqa oyna -> bagaj
window.G = window.G || {};

(function () {
  // Barcha o'lchamlar metrda. L2 = len/2 ga nisbatan ulushlar (wsB, roofF, roofR, rwB).
  var SPECS = {
    'Matiz': {
      len: 3.50, wid: 1.51, roofH: 1.50, cl: 0.24, noseH: 0.62, hoodH: 0.88,
      wsB: 0.42, roofF: 0.10, roofR: -0.55, rwB: -0.90, tailH: 1.18,
      wheelR: 0.26, type: 'hatch', accel: 5.5, maxSpeed: 37, ohF: 0.65, ohR: 0.70,
      colors: ['#f4f6f5', '#f4f6f5', '#b8bcc0', '#8e1600', '#2e5f8a']
    },
    'Spark': {
      len: 3.64, wid: 1.60, roofH: 1.52, cl: 0.24, noseH: 0.66, hoodH: 0.92,
      wsB: 0.40, roofF: 0.08, roofR: -0.52, rwB: -0.90, tailH: 1.16,
      wheelR: 0.27, type: 'hatch', accel: 6, maxSpeed: 39, ohF: 0.68, ohR: 0.72,
      colors: ['#f4f6f5', '#c23b2e', '#b8bcc0', '#2e5f8a', '#f4f6f5']
    },
    'Damas': {
      len: 3.40, wid: 1.40, roofH: 1.90, cl: 0.30, noseH: 0.95, hoodH: 1.05,
      wsB: 0.80, roofF: 0.52, roofR: -0.86, rwB: -0.97, tailH: 1.78,
      wheelR: 0.25, type: 'van', accel: 4.5, maxSpeed: 33, ohF: 0.55, ohR: 0.60,
      colors: ['#f7f7f5', '#f7f7f5', '#f7f7f5', '#e8e8e4']
    },
    'Nexia 3': {
      len: 4.30, wid: 1.70, roofH: 1.50, cl: 0.26, noseH: 0.68, hoodH: 0.95,
      wsB: 0.34, roofF: 0.02, roofR: -0.42, rwB: -0.72, tailH: 0.98,
      wheelR: 0.29, type: 'sedan', accel: 7, maxSpeed: 44, ohF: 0.85, ohR: 0.95,
      colors: ['#f4f6f5', '#f4f6f5', '#b8bcc0', '#1b1b1d', '#5b7c99']
    },
    'Cobalt': {
      len: 4.48, wid: 1.74, roofH: 1.52, cl: 0.27, noseH: 0.72, hoodH: 0.97,
      wsB: 0.33, roofF: 0.02, roofR: -0.40, rwB: -0.68, tailH: 1.02,
      wheelR: 0.30, type: 'sedan', accel: 7.5, maxSpeed: 47, ohF: 0.86, ohR: 0.96,
      colors: ['#f4f6f5', '#f4f6f5', '#f4f6f5', '#b8bcc0', '#1b1b1d']
    },
    'Onix': {
      len: 4.47, wid: 1.73, roofH: 1.47, cl: 0.26, noseH: 0.66, hoodH: 0.92,
      wsB: 0.36, roofF: 0.04, roofR: -0.36, rwB: -0.75, tailH: 0.95,
      wheelR: 0.30, type: 'sedan', accel: 8, maxSpeed: 49, ohF: 0.85, ohR: 0.95,
      colors: ['#f4f6f5', '#c0392b', '#b8bcc0', '#26415c', '#f4f6f5']
    },
    'Monza': {
      len: 4.63, wid: 1.80, roofH: 1.47, cl: 0.26, noseH: 0.64, hoodH: 0.90,
      wsB: 0.36, roofF: 0.05, roofR: -0.32, rwB: -0.82, tailH: 0.92,
      wheelR: 0.31, type: 'sedan', accel: 8.5, maxSpeed: 50, ohF: 0.88, ohR: 0.98,
      colors: ['#f4f6f5', '#1b1b1d', '#b8bcc0', '#34495e']
    },
    'Malibu 2': {
      len: 4.92, wid: 1.85, roofH: 1.47, cl: 0.26, noseH: 0.62, hoodH: 0.92,
      wsB: 0.35, roofF: 0.06, roofR: -0.34, rwB: -0.80, tailH: 0.94,
      wheelR: 0.33, type: 'sedan', accel: 10.5, maxSpeed: 58, ohF: 0.92, ohR: 1.02,
      colors: ['#1b1b1d', '#f4f6f5', '#26415c', '#b8bcc0', '#1b1b1d']
    },
    'Traverse': {
      len: 5.20, wid: 2.00, roofH: 1.79, cl: 0.30, noseH: 0.95, hoodH: 1.15,
      wsB: 0.40, roofF: 0.12, roofR: -0.72, rwB: -0.94, tailH: 1.45,
      wheelR: 0.38, type: 'suv', accel: 8.5, maxSpeed: 54, ohF: 0.95, ohR: 1.05,
      colors: ['#f4f6f5', '#1b1b1d', '#4a5568', '#5c3a3a']
    },
    'Tahoe': {
      len: 5.35, wid: 2.06, roofH: 1.93, cl: 0.34, noseH: 1.05, hoodH: 1.25,
      wsB: 0.42, roofF: 0.16, roofR: -0.80, rwB: -0.97, tailH: 1.60,
      wheelR: 0.40, type: 'suv', accel: 9.5, maxSpeed: 56, ohF: 0.95, ohR: 1.05,
      colors: ['#1b1b1d', '#1b1b1d', '#f4f6f5', '#3d4852']
    },
    'Kia K5': {
      len: 4.91, wid: 1.86, roofH: 1.45, cl: 0.25, noseH: 0.58, hoodH: 0.88,
      wsB: 0.38, roofF: 0.08, roofR: -0.28, rwB: -0.86, tailH: 0.88,
      wheelR: 0.32, type: 'sedan', accel: 11.5, maxSpeed: 63, ohF: 0.90, ohR: 1.00,
      colors: ['#101014', '#f4f6f5', '#8e1600', '#b8bcc0']
    },
    'Kia Sonet': {
      len: 3.99, wid: 1.79, roofH: 1.62, cl: 0.28, noseH: 0.85, hoodH: 1.05,
      wsB: 0.40, roofF: 0.10, roofR: -0.62, rwB: -0.92, tailH: 1.30,
      wheelR: 0.33, type: 'suv', accel: 8, maxSpeed: 47, ohF: 0.78, ohR: 0.82,
      colors: ['#c23b2e', '#f4f6f5', '#2e5f8a', '#101014']
    },
    'Hyundai Elantra': {
      len: 4.68, wid: 1.83, roofH: 1.42, cl: 0.25, noseH: 0.58, hoodH: 0.88,
      wsB: 0.37, roofF: 0.06, roofR: -0.32, rwB: -0.84, tailH: 0.90,
      wheelR: 0.31, type: 'sedan', accel: 9.5, maxSpeed: 57, ohF: 0.88, ohR: 0.98,
      colors: ['#b8bcc0', '#f4f6f5', '#1b1b1d', '#26415c']
    },
    'Hyundai Sonata': {
      len: 4.90, wid: 1.86, roofH: 1.44, cl: 0.25, noseH: 0.60, hoodH: 0.90,
      wsB: 0.38, roofF: 0.08, roofR: -0.30, rwB: -0.86, tailH: 0.90,
      wheelR: 0.32, type: 'sedan', accel: 10.5, maxSpeed: 60, ohF: 0.90, ohR: 1.00,
      colors: ['#f4f6f5', '#1b1b1d', '#b8bcc0', '#26415c']
    },
    // ===== PREMIUM (faqat avtosalonlarda sotiladi, trafikda uchramaydi) =====
    // --- Mercedes-Benz ---
    'Mercedes E200': {
      len: 4.94, wid: 1.85, roofH: 1.46, cl: 0.25, noseH: 0.60, hoodH: 0.90,
      wsB: 0.37, roofF: 0.07, roofR: -0.30, rwB: -0.86, tailH: 0.92,
      wheelR: 0.32, type: 'sedan', accel: 11.5, maxSpeed: 63, ohF: 0.90, ohR: 1.00,
      premium: true, colors: ['#0c0e10', '#b8bcc0', '#f4f6f5', '#26415c']
    },
    'Mercedes S500': {
      len: 5.29, wid: 1.92, roofH: 1.50, cl: 0.26, noseH: 0.62, hoodH: 0.93,
      wsB: 0.36, roofF: 0.08, roofR: -0.28, rwB: -0.86, tailH: 0.94,
      wheelR: 0.33, type: 'sedan', accel: 12.5, maxSpeed: 68, ohF: 0.95, ohR: 1.05,
      premium: true, colors: ['#0c0e10', '#b8bcc0', '#f4f6f5']
    },
    'Mercedes Maybach': {
      len: 5.47, wid: 1.92, roofH: 1.52, cl: 0.27, noseH: 0.64, hoodH: 0.95,
      wsB: 0.35, roofF: 0.06, roofR: -0.26, rwB: -0.84, tailH: 0.96,
      wheelR: 0.33, type: 'sedan', accel: 12.5, maxSpeed: 70, ohF: 0.98, ohR: 1.10,
      premium: true, colors: ['#0c0e10', '#1a2028', '#f4f6f5']
    },
    'Mercedes G63': {
      len: 4.87, wid: 1.98, roofH: 1.97, cl: 0.36, noseH: 1.05, hoodH: 1.30,
      wsB: 0.45, roofF: 0.22, roofR: -0.80, rwB: -0.95, tailH: 1.70,
      wheelR: 0.40, type: 'suv', accel: 13, maxSpeed: 64, ohF: 0.85, ohR: 0.90,
      premium: true, colors: ['#14161a', '#0c0e10', '#f4f6f5']
    },
    // --- BMW ---
    'BMW M5': {
      len: 4.98, wid: 1.90, roofH: 1.47, cl: 0.24, noseH: 0.58, hoodH: 0.90,
      wsB: 0.38, roofF: 0.10, roofR: -0.30, rwB: -0.88, tailH: 0.90,
      wheelR: 0.33, type: 'sedan', accel: 14, maxSpeed: 70, ohF: 0.92, ohR: 1.02,
      premium: true, colors: ['#1a2536', '#0c0e10', '#f4f6f5', '#3d6ea5']
    },
    'BMW M8': {
      len: 4.87, wid: 1.90, roofH: 1.35, cl: 0.22, noseH: 0.55, hoodH: 0.84,
      wsB: 0.36, roofF: 0.02, roofR: -0.40, rwB: -0.78, tailH: 0.88,
      wheelR: 0.33, type: 'sedan', accel: 15, maxSpeed: 72, ohF: 0.88, ohR: 0.98,
      premium: true, colors: ['#0c0e10', '#3d6ea5', '#f4f6f5', '#7a1f28']
    },
    'BMW X7': {
      len: 5.15, wid: 2.00, roofH: 1.80, cl: 0.32, noseH: 0.98, hoodH: 1.18,
      wsB: 0.40, roofF: 0.14, roofR: -0.74, rwB: -0.94, tailH: 1.50,
      wheelR: 0.38, type: 'suv', accel: 12, maxSpeed: 64, ohF: 0.95, ohR: 1.05,
      premium: true, colors: ['#0c0e10', '#f4f6f5', '#3d4a58']
    },
    // --- Audi ---
    'Audi A6': {
      len: 4.94, wid: 1.89, roofH: 1.46, cl: 0.25, noseH: 0.60, hoodH: 0.90,
      wsB: 0.37, roofF: 0.07, roofR: -0.32, rwB: -0.85, tailH: 0.92,
      wheelR: 0.32, type: 'sedan', accel: 12, maxSpeed: 62, ohF: 0.90, ohR: 1.00,
      premium: true, colors: ['#0c0e10', '#f4f6f5', '#b8bcc0', '#26415c']
    },
    'Audi A8 L': {
      len: 5.30, wid: 1.94, roofH: 1.49, cl: 0.26, noseH: 0.61, hoodH: 0.92,
      wsB: 0.36, roofF: 0.07, roofR: -0.28, rwB: -0.85, tailH: 0.93,
      wheelR: 0.33, type: 'sedan', accel: 12.5, maxSpeed: 67, ohF: 0.95, ohR: 1.05,
      premium: true, colors: ['#0c0e10', '#1a2028', '#b8bcc0']
    },
    'Audi Q7': {
      len: 5.06, wid: 1.97, roofH: 1.74, cl: 0.30, noseH: 0.95, hoodH: 1.14,
      wsB: 0.40, roofF: 0.12, roofR: -0.72, rwB: -0.93, tailH: 1.44,
      wheelR: 0.37, type: 'suv', accel: 12, maxSpeed: 63, ohF: 0.94, ohR: 1.02,
      premium: true, colors: ['#f4f6f5', '#0c0e10', '#4a5568']
    },
    'Audi RS7': {
      len: 5.01, wid: 1.95, roofH: 1.42, cl: 0.22, noseH: 0.54, hoodH: 0.85,
      wsB: 0.36, roofF: 0.00, roofR: -0.42, rwB: -0.80, tailH: 0.90,
      wheelR: 0.34, type: 'sedan', accel: 15, maxSpeed: 74, ohF: 0.90, ohR: 1.00,
      premium: true, colors: ['#3d4045', '#0c0e10', '#7a1f28', '#f4f6f5']
    },
    'Audi RS Q8': {
      len: 5.01, wid: 2.00, roofH: 1.69, cl: 0.28, noseH: 0.92, hoodH: 1.12,
      wsB: 0.40, roofF: 0.08, roofR: -0.60, rwB: -0.90, tailH: 1.34,
      wheelR: 0.38, type: 'suv', accel: 14, maxSpeed: 70, ohF: 0.92, ohR: 1.00,
      premium: true, colors: ['#0c0e10', '#14324f', '#f4f6f5']
    },
    'Audi R8': {
      len: 4.43, wid: 1.94, roofH: 1.24, cl: 0.20, noseH: 0.48, hoodH: 0.70,
      wsB: 0.30, roofF: -0.05, roofR: -0.45, rwB: -0.75, tailH: 0.95,
      wheelR: 0.33, type: 'sedan', accel: 16, maxSpeed: 78, ohF: 0.75, ohR: 0.85,
      premium: true, colors: ['#c23b2e', '#0c0e10', '#f4f6f5', '#3d4045']
    },
    // --- Volkswagen ---
    'VW Polo': {
      len: 4.05, wid: 1.75, roofH: 1.46, cl: 0.25, noseH: 0.62, hoodH: 0.90,
      wsB: 0.40, roofF: 0.08, roofR: -0.54, rwB: -0.90, tailH: 1.14,
      wheelR: 0.29, type: 'hatch', accel: 9, maxSpeed: 52, ohF: 0.78, ohR: 0.82,
      premium: true, colors: ['#f4f6f5', '#c23b2e', '#3d6ea5', '#0c0e10']
    },
    'VW Jetta': {
      len: 4.70, wid: 1.80, roofH: 1.45, cl: 0.25, noseH: 0.60, hoodH: 0.89,
      wsB: 0.37, roofF: 0.06, roofR: -0.34, rwB: -0.85, tailH: 0.91,
      wheelR: 0.31, type: 'sedan', accel: 10, maxSpeed: 56, ohF: 0.88, ohR: 0.98,
      premium: true, colors: ['#f4f6f5', '#b8bcc0', '#26415c', '#0c0e10']
    },
    'VW Passat': {
      len: 4.87, wid: 1.83, roofH: 1.46, cl: 0.25, noseH: 0.60, hoodH: 0.90,
      wsB: 0.37, roofF: 0.06, roofR: -0.32, rwB: -0.86, tailH: 0.92,
      wheelR: 0.32, type: 'sedan', accel: 10.5, maxSpeed: 60, ohF: 0.90, ohR: 1.00,
      premium: true, colors: ['#0c0e10', '#f4f6f5', '#b8bcc0', '#3d4a58']
    },
    'VW Arteon': {
      len: 4.86, wid: 1.87, roofH: 1.42, cl: 0.23, noseH: 0.56, hoodH: 0.86,
      wsB: 0.36, roofF: 0.02, roofR: -0.42, rwB: -0.80, tailH: 0.89,
      wheelR: 0.33, type: 'sedan', accel: 12, maxSpeed: 64, ohF: 0.88, ohR: 0.98,
      premium: true, colors: ['#7a1f28', '#0c0e10', '#f4f6f5', '#b8bcc0']
    },
    'VW Tiguan': {
      len: 4.51, wid: 1.84, roofH: 1.67, cl: 0.29, noseH: 0.90, hoodH: 1.10,
      wsB: 0.41, roofF: 0.10, roofR: -0.66, rwB: -0.92, tailH: 1.36,
      wheelR: 0.35, type: 'suv', accel: 10, maxSpeed: 56, ohF: 0.84, ohR: 0.90,
      premium: true, colors: ['#f4f6f5', '#3d6ea5', '#0c0e10', '#b8bcc0']
    },
    'VW Touareg': {
      len: 4.88, wid: 1.98, roofH: 1.72, cl: 0.30, noseH: 0.94, hoodH: 1.14,
      wsB: 0.40, roofF: 0.10, roofR: -0.70, rwB: -0.93, tailH: 1.42,
      wheelR: 0.37, type: 'suv', accel: 12, maxSpeed: 63, ohF: 0.92, ohR: 1.00,
      premium: true, colors: ['#0c0e10', '#4a5568', '#f4f6f5']
    }
  };

  // brend va tur (ma'lumot paneli uchun)
  var META = {
    'Matiz': ['Chevrolet', 'xetchbek'], 'Spark': ['Chevrolet', 'xetchbek'],
    'Damas': ['Chevrolet', 'mikroavtobus'], 'Nexia 3': ['Chevrolet', 'sedan'],
    'Cobalt': ['Chevrolet', 'sedan'], 'Onix': ['Chevrolet', 'sedan'],
    'Monza': ['Chevrolet', 'sedan'], 'Malibu 2': ['Chevrolet', 'sedan'],
    'Traverse': ['Chevrolet', 'SUV'], 'Tahoe': ['Chevrolet', 'SUV'],
    'Kia K5': ['Kia', 'sedan'], 'Kia Sonet': ['Kia', 'krossover'],
    'Hyundai Elantra': ['Hyundai', 'sedan'], 'Hyundai Sonata': ['Hyundai', 'sedan'],
    'Mercedes E200': ['Mercedes-Benz', 'biznes sedan'], 'Mercedes S500': ['Mercedes-Benz', 'lyuks sedan'],
    'Mercedes Maybach': ['Mercedes-Maybach', 'flagman lyuks'], 'Mercedes G63': ['Mercedes-Benz', 'SUV (Gelik)'],
    'BMW M5': ['BMW', 'sport sedan'], 'BMW M8': ['BMW', 'sport kupe'], 'BMW X7': ['BMW', 'katta SUV'],
    'Audi A6': ['Audi', 'premium sedan'], 'Audi A8 L': ['Audi', 'flagman sedan'],
    'Audi Q7': ['Audi', 'SUV'], 'Audi RS7': ['Audi', 'super sedan'],
    'Audi RS Q8': ['Audi', 'sport SUV'], 'Audi R8': ['Audi', 'superkar'],
    'VW Polo': ['Volkswagen', 'xetchbek'], 'VW Jetta': ['Volkswagen', 'sedan'],
    'VW Passat': ['Volkswagen', 'sedan'], 'VW Arteon': ['Volkswagen', 'fastbek'],
    'VW Tiguan': ['Volkswagen', 'krossover'], 'VW Touareg': ['Volkswagen', 'SUV']
  };
  Object.keys(META).forEach(function (n) {
    SPECS[n].brand = META[n][0];
    SPECS[n].typeUz = META[n][1];
  });

  // ---------- KUZOV GEOMETRIYASI (keshlangan) ----------
  var bodyGeoCache = {};
  function bodyGeometry(name) {
    if (bodyGeoCache[name]) return bodyGeoCache[name];
    var s = SPECS[name];
    var L2 = s.len / 2;
    var bod = s.cl + 0.05;
    var wxF = L2 - s.ohF, wxR = -(L2 - s.ohR);
    // g'ildirak arkasi radiusi — g'ildirak to'liq sig'sin
    var ar = Math.max(s.wheelR + 0.10, 2 * s.wheelR + 0.08 - bod);

    var sh = new THREE.Shape();
    sh.moveTo(L2 - 0.02, bod);
    // yumaloq old bamper-burun
    sh.quadraticCurveTo(L2 + 0.10, (bod + s.noseH) / 2, L2 - 0.02, s.noseH);
    // qavariq kapot
    sh.quadraticCurveTo((L2 + s.wsB * L2) / 2, s.hoodH + 0.015, s.wsB * L2, s.hoodH);
    // old oyna qiyaligi
    sh.lineTo(s.roofF * L2, s.roofH);
    // kamarli tom
    sh.quadraticCurveTo((s.roofF + s.roofR) / 2 * L2, s.roofH + 0.05, s.roofR * L2, s.roofH);
    // orqa oyna -> bagaj (silliq)
    sh.quadraticCurveTo((s.roofR + s.rwB) / 2 * L2, (s.roofH + s.tailH) / 2 + 0.04, s.rwB * L2, s.tailH);
    sh.lineTo(-L2 + 0.10, s.tailH - 0.01);
    // yumaloq orqa
    sh.quadraticCurveTo(-L2 - 0.06, (s.tailH + bod) / 2, -L2 + 0.06, bod);
    // pastki chiziq + g'ildirak arkalari
    sh.lineTo(wxR - ar, bod);
    sh.absarc(wxR, bod, ar, Math.PI, 0, true);
    sh.lineTo(wxF - ar, bod);
    sh.absarc(wxF, bod, ar, Math.PI, 0, true);
    sh.lineTo(L2 - 0.02, bod);

    var depth = s.wid - 0.20;
    var geo = new THREE.ExtrudeGeometry(sh, {
      depth: depth, steps: 1, curveSegments: 10,
      bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.08, bevelSegments: 3
    });
    geo.translate(0, 0, -depth / 2);

    // tumblehome — bel chizig'idan tepada kuzov ichkariga torayadi
    var belt = s.hoodH + 0.04;
    var span = Math.max(0.3, s.roofH - belt);
    var taper = s.type === 'van' ? 0.07 : 0.16;
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      if (y > belt) {
        var f = 1 - taper * Math.min(1, (y - belt) / span);
        pos.setZ(i, pos.getZ(i) * f);
      }
    }
    geo.computeVertexNormals();
    bodyGeoCache[name] = geo;
    return geo;
  }

  // yon oyna shakli (keshlangan)
  var glassGeoCache = {};
  function sideGlassGeometry(name) {
    if (glassGeoCache[name]) return glassGeoCache[name];
    var s = SPECS[name];
    var L2 = s.len / 2;
    var belt = s.hoodH + 0.02;
    var top = s.roofH - 0.05;
    var sh = new THREE.Shape();
    sh.moveTo(s.wsB * L2 - 0.08, belt);
    sh.lineTo(s.roofF * L2 - 0.02, top);
    sh.quadraticCurveTo((s.roofF + s.roofR) / 2 * L2, top + 0.04, s.roofR * L2 + 0.02, top);
    sh.lineTo(s.rwB * L2 + 0.08, Math.min(belt, s.tailH + 0.02));
    sh.lineTo(s.wsB * L2 - 0.08, belt);
    var geo = new THREE.ShapeGeometry(sh, 6);
    // oynani kuzov toraytirilishiga (tumblehome) mos qiyalatamiz — z geometriyaga yoziladi
    var zOut = s.wid / 2 - 0.005;
    var beltW = s.hoodH + 0.04;
    var spanW = Math.max(0.3, s.roofH - beltW);
    var taper = s.type === 'van' ? 0.07 : 0.16;
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var y = pos.getY(i);
      var f = y > beltW ? 1 - taper * Math.min(1, (y - beltW) / spanW) : 1;
      pos.setZ(i, zOut * f);
    }
    geo.computeVertexNormals();
    glassGeoCache[name] = geo;
    return geo;
  }

  // g'ildirak (keshlangan, oldindan aylantirilgan geometriya — kam obyekt)
  var wheelGeoCache = {};
  function makeWheel(r) {
    var key = Math.round(r * 100);
    if (!wheelGeoCache[key]) {
      var tireGeo = new THREE.CylinderGeometry(r, r, 0.24, 14);
      tireGeo.rotateX(Math.PI / 2); // o'q yon tomonga
      var rimGeo = new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.26, 8);
      rimGeo.rotateX(Math.PI / 2);
      wheelGeoCache[key] = { tire: tireGeo, rim: rimGeo };
    }
    var pivot = new THREE.Group(); // rul burilishi uchun
    pivot.add(new THREE.Mesh(wheelGeoCache[key].tire, G.mat(0x161616)));
    pivot.add(new THREE.Mesh(wheelGeoCache[key].rim, G.mat(0xb9bec4, { phong: true, shininess: 110 })));
    return pivot;
  }

  // ---------- MASHINA MESHI ----------
  G.createCarMesh = function (name, colorOverride, variant) {
    var s = SPECS[name];
    var color = colorOverride || G.pick(s.colors);
    // yangi grafika: Kenney 3D modeli (models.js); bo'lmasa — klassik kod modeli
    if (G.GFX === 'kenney' && G.kenneyCarMesh) {
      var km = G.kenneyCarMesh(name, color, variant);
      if (km) return km;
    }
    var bodyMat = new THREE.MeshPhongMaterial({ color: color, shininess: 95, specular: 0x777777 });
    var darkMat = G.mat(0x1a1a1c);
    var glass = G.glassMat();
    var L2 = s.len / 2, W = s.wid;

    var root = new THREE.Group();

    // kuzov
    var body = new THREE.Mesh(bodyGeometry(name), bodyMat);
    body.castShadow = true;
    root.add(body);

    // yon oynalar (qiyaligi geometriyada, ikki tomon — ko'zgu aks)
    glass.side = THREE.DoubleSide;
    var sgGeo = sideGlassGeometry(name);
    var sg1 = new THREE.Mesh(sgGeo, glass);
    root.add(sg1);
    var sg2 = new THREE.Mesh(sgGeo, glass);
    sg2.scale.z = -1;
    root.add(sg2);

    // old oyna (qiya tekislik)
    var wsX1 = s.wsB * L2, wsX2 = s.roofF * L2;
    var wsLen = Math.hypot(wsX1 - wsX2, s.roofH - s.hoodH) - 0.04;
    var ws = G.box(0.04, wsLen, W * 0.78, glass);
    ws.position.set((wsX1 + wsX2) / 2 + 0.03, (s.hoodH + s.roofH) / 2 + 0.02, 0);
    ws.rotation.z = Math.atan2(wsX1 - wsX2, s.roofH - s.hoodH);
    root.add(ws);
    // orqa oyna
    var rwX1 = s.roofR * L2, rwX2 = s.rwB * L2;
    var rwLen = Math.hypot(rwX1 - rwX2, s.roofH - s.tailH) - 0.04;
    var rw = G.box(0.04, rwLen, W * 0.76, glass);
    rw.position.set((rwX1 + rwX2) / 2 - 0.03, (s.tailH + s.roofH) / 2 + 0.02, 0);
    rw.rotation.z = -Math.atan2(rwX2 - rwX1, s.tailH - s.roofH);
    root.add(rw);

    // panjara + bamperlar
    var grille = G.box(0.06, (s.noseH - s.cl) * 0.35, W * 0.42, darkMat);
    grille.position.set(L2 + 0.02, s.noseH * 0.72, 0);
    root.add(grille);
    var bumpF = G.box(0.10, 0.16, W * 0.94, darkMat);
    bumpF.position.set(L2 + 0.01, s.cl + 0.14, 0);
    root.add(bumpF);
    var bumpR = G.box(0.10, 0.16, W * 0.94, darkMat);
    bumpR.position.set(-L2 - 0.01, s.cl + 0.14, 0);
    root.add(bumpR);
    // shikast tizimi uchun havolalar (bamper tushishi, portlashda qorayish)
    root.userData.bumpF = bumpF;
    root.userData.bumpR = bumpR;
    root.userData.bodyMat = bodyMat;

    // faralar (ulashilgan material — tunda kun/tun tizimi yorqinlashtiradi)
    var hlMat = G.headlightMat || (G.headlightMat = new THREE.MeshLambertMaterial({ color: 0xfff8dc, emissive: 0x8a8158 }));
    var tlMat = G.taillightMat || (G.taillightMat = new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x701414 }));
    [W * 0.31, -W * 0.31].forEach(function (z) {
      var hl = G.box(0.07, 0.12, 0.34, hlMat);
      hl.position.set(L2 + 0.03, s.noseH - 0.10, z);
      root.add(hl);
      var tl = G.box(0.06, 0.11, 0.30, tlMat);
      tl.position.set(-L2 - 0.03, s.tailH - 0.14, z);
      root.add(tl);
    });

    // raqamlar
    var plate = G.box(0.03, 0.12, 0.42, G.mat(0xf5f5f5));
    plate.position.set(L2 + 0.06, s.cl + 0.22, 0);
    root.add(plate);
    var plate2 = plate.clone();
    plate2.position.x = -L2 - 0.06;
    root.add(plate2);

    // ko'zgular
    [W / 2 + 0.08, -W / 2 - 0.08].forEach(function (z) {
      var mir = G.box(0.09, 0.08, 0.15, bodyMat);
      mir.position.set(s.wsB * L2 + 0.12, s.hoodH + 0.12, z);
      root.add(mir);
    });

    // SUV tom relslari
    if (s.type === 'suv') {
      [W * 0.36, -W * 0.36].forEach(function (z) {
        var rail = G.box((s.roofF - s.roofR) * L2 * 0.9, 0.05, 0.05, darkMat);
        rail.position.set((s.roofF + s.roofR) * L2 / 2, s.roofH + 0.06, z);
        root.add(rail);
      });
    }

    // g'ildiraklar (old ikkitasi rulga buriladi)
    var wxF = L2 - s.ohF, wxR = -(L2 - s.ohR);
    var wheelsF = [], wheelsAll = [];
    [[wxF, W / 2 - 0.12, true], [wxF, -W / 2 + 0.12, true], [wxR, W / 2 - 0.12, false], [wxR, -W / 2 + 0.12, false]].forEach(function (p) {
      var w = makeWheel(s.wheelR);
      w.position.set(p[0], s.wheelR, p[1]);
      root.add(w);
      wheelsAll.push(w);
      if (p[2]) wheelsF.push(w);
    });

    // salon (ixcham: panel + rul + o'rindiqlar bloki)
    var dashY = s.hoodH - 0.06;
    var dash = G.box(0.45, 0.20, W * 0.78, G.mat(0x2a2a30));
    dash.position.set(s.wsB * L2 - 0.30, dashY, 0);
    root.add(dash);
    var wheelSt = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 14), G.mat(0x141414));
    wheelSt.position.set(s.wsB * L2 - 0.55, dashY + 0.16, -W * 0.20);
    wheelSt.rotation.y = Math.PI / 2;
    wheelSt.rotation.z = 0.4;
    root.add(wheelSt);
    var bench = G.box(0.48, 0.10, W * 0.72, G.mat(0x33333d));
    bench.position.set(-0.15, s.cl + 0.42, 0);
    root.add(bench);
    var backrest = G.box(0.10, 0.5, W * 0.72, G.mat(0x33333d));
    backrest.position.set(-0.42, s.cl + 0.68, 0);
    root.add(backrest);

    root.userData.spec = s;
    root.userData.name = name;
    root.userData.color = color;
    root.userData.wheelsF = wheelsF;
    root.userData.driverEye = new THREE.Vector3(s.wsB * L2 - 0.55, s.hoodH + 0.38, -W * 0.20);
    return root;
  };

  G.CAR_SPECS = SPECS;
  // trafik faqat oddiy mashinalardan; premium — faqat avtosalonda
  G.CAR_NAMES = Object.keys(SPECS).filter(function (n) { return !SPECS[n].premium; });
  G.PREMIUM_NAMES = Object.keys(SPECS).filter(function (n) { return SPECS[n].premium; });

  // ---------- ENTITY ----------
  G.makeCarEntity = function (name, x, z, heading, colorOverride, variant) {
    var mesh = G.createCarMesh(name, colorOverride, variant);
    mesh.position.set(x, 0, z);
    var spec = SPECS[name];
    var car = {
      mesh: mesh, name: name, spec: spec,
      x: x, z: z, heading: heading, speed: 0,
      radius: spec.len * 0.5 + 0.2, // broadphase uchun
      isTraffic: false,
      health: 1, smoking: false, destroyed: false,
      bumpFOff: false, bumpROff: false,
      fuel: 100
    };
    G.updateCarMesh(car);
    return car;
  };

  G.updateCarMesh = function (car) {
    car.mesh.position.x = car.x;
    car.mesh.position.z = car.z;
    car.mesh.rotation.y = -car.heading;
  };

  // ---------- ANIQ TO'QNASHUV: mashina = aylanalar zanjiri ----------
  // Har mashina bo'ylab 3-4 aylana: eni bo'yicha aniq, uzunligi bo'yicha to'liq qamrov
  G.carCircles = function (car) {
    var s = car.spec;
    var r = s.wid / 2 + 0.04;
    var span = s.len / 2 - r;
    var n = s.len > 4.8 ? 4 : 3;
    var cx = Math.cos(car.heading), sz = Math.sin(car.heading);
    var out = [];
    for (var i = 0; i < n; i++) {
      var t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1; // -1..1
      out.push({ x: car.x + cx * span * t, z: car.z + sz * span * t, r: r });
    }
    return out;
  };

  // mashina va statik binolar — har aylana uchun tuzatish
  G.collideCarWorld = function (car) {
    var circles = G.carCircles(car);
    var dx = 0, dz = 0, hit = false;
    for (var i = 0; i < circles.length; i++) {
      var c = circles[i];
      var res = G.resolveCircleVsColliders(c.x, c.z, c.r);
      if (Math.abs(res.x - c.x) > 0.001 || Math.abs(res.z - c.z) > 0.001) {
        dx += res.x - c.x;
        dz += res.z - c.z;
        hit = true;
      }
    }
    if (hit) {
      car.x += dx;
      car.z += dz;
    }
    return hit;
  };
})();
