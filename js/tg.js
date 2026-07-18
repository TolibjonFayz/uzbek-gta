// ============ TELEGRAM MINI APP + MOBIL LANDSHAFT ============
// Telegram ichida: fullscreen, orientatsiya qulfi, haptika, CloudStorage (progress
// Telegram hisobida saqlanadi — qurilma almashsa ham turadi).
// Oddiy brauzerda: hammasi xavfsiz o'chiq, faqat landshaft nazorati ishlaydi.
window.G = window.G || {};

(function () {
  var tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;
  var inTg = !!(tg && tg.initData && tg.initData.length > 0);
  G.IS_TG = inTg;

  // --- Telegramga tayyorgarlik (script yuklanishi bilan) ---
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes(); // svayp o'yinni yopib yubormasin
      if (tg.setHeaderColor) tg.setHeaderColor('#0b1e3d');
      if (tg.setBackgroundColor) tg.setBackgroundColor('#000000');
    } catch (e) {}
  }

  // BOSHLASH bosilganda chaqiriladi (foydalanuvchi imo-ishorasi kerak bo'lgan API'lar)
  G.tgStart = function () {
    if (tg) {
      try {
        if (tg.isVersionAtLeast && tg.isVersionAtLeast('8.0') && tg.requestFullscreen && !tg.isFullscreen) {
          tg.requestFullscreen();
        }
      } catch (e) {}
    }
    // brauzer/OS darajasida landshaftga qulflashga urinamiz
    if (G.IS_TOUCH && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function () {});
    }
  };

  function tryLockLandscape() {
    // landshaftda turganda Telegram orientatsiyani qulflaydi
    if (tg && tg.lockOrientation && window.innerWidth > window.innerHeight) {
      try { tg.lockOrientation(); } catch (e) {}
    }
  }

  // --- Haptika (faqat Telegramda ishlaydi) ---
  G.tgHaptic = function (kind) {
    if (!tg || !tg.HapticFeedback) return;
    try {
      if (kind === 'success' || kind === 'error' || kind === 'warning') {
        tg.HapticFeedback.notificationOccurred(kind);
      } else {
        tg.HapticFeedback.impactOccurred(kind || 'medium');
      }
    } catch (e) {}
  };

  // --- CloudStorage: progress Telegram hisobida ---
  var lastCloud = 0;
  G.tgCloudSave = function (key, value) {
    if (!inTg || !tg.CloudStorage) return;
    var now = Date.now();
    if (now - lastCloud < 10000) return; // 10 soniyada ko'pi bilan bir marta
    lastCloud = now;
    try { tg.CloudStorage.setItem(key, value, function () {}); } catch (e) {}
  };

  // startapda: lokal saqlov bo'sh bo'lsa — buluttan tiklab, bir marta qayta yuklaymiz
  if (inTg && tg.CloudStorage && !localStorage.getItem('tc_stats_v1') && !sessionStorage.getItem('tc_cloud_try')) {
    sessionStorage.setItem('tc_cloud_try', '1');
    try {
      tg.CloudStorage.getItem('tc_stats_v1', function (err, val) {
        if (!err && val) {
          try {
            localStorage.setItem('tc_stats_v1', val);
            location.reload();
          } catch (e2) {}
        }
      });
    } catch (e) {}
  }

  // --- LANDSHAFT NAZORATI: telefonda vertikal ushlab tursa — o'girish ekrani ---
  var ov = null;
  function updateOrient() {
    if (!ov) ov = document.getElementById('rotateOverlay');
    if (!ov) return;
    var portrait = window.innerHeight > window.innerWidth;
    var mobil = G.IS_TOUCH || (tg && ['android', 'ios'].indexOf(tg.platform) >= 0);
    ov.style.display = (mobil && portrait) ? 'flex' : 'none';
    if (!portrait) tryLockLandscape();
  }
  window.addEventListener('resize', updateOrient);
  window.addEventListener('orientationchange', updateOrient);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateOrient);
  } else {
    updateOrient();
  }
  setTimeout(updateOrient, 400);
})();
