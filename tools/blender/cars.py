# Mashinalar generatori v2 — o'yindagi barcha o'zimiz chizgan mashinalar shu yerda.
# Ishlatish:
#   blender --background --python tools/blender/cars.py -- <id> <art_papka> [render_papka]
#   id: nexia3 | cobalt | malibu2 | spark | tahoe | damas | svj
# Natija: <art>/<id>.glb (o'yin uchun) + <art>/export/<id>/<id>.{blend,fbx,obj}
#
# Kuzov: ~30 ta ko'ndalang kesim (har birida 20 nuqta) loft'i. Yon profil egri (kapot gumbazi,
# qavariq old/orqa oyna, yumaloq burun), rejada burchaklar yumaloq, g'ildirak ustida "son" bo'rtishi.
# Oynalar — yuz materiallari: alohida A-ustun, oyna rezinasi, B/C ustunlar.
# Detallar (fara bloki, chiroqlar, choklar, tutqich, ko'zgu, artgich, antenna) — sirtga raycast (place_on).
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import bpy, bmesh
from mathutils import Vector

# ---------------------------------------------------------------------------------------------
# MASHINALAR. f — oldinga (m, 0 = markaz), z — balandlik (m).
# top: yon profil (f, ztop, tur): nose, hood, ws (old oyna pasti), roof, rw (orqa oyna pasti), deck, tail
# pillars: (f, eni, 'trim'|'paint') — B/C ustunlar; glass_start/glass_end — yon oynalar chegarasi
# seams_v: eshik choklari (f); hood_seam / trunk_seam: ko'ndalang choklar (f)
# ---------------------------------------------------------------------------------------------
CARS = {
    'nexia3': dict(
        W=1.71, AF=1.30, AR=-1.18, R=0.29, TW=0.20, clear=0.20, belt=0.96, gh=0.72,
        top=[(2.155, 0.74, 'nose'), (2.02, 0.84, 'hood'), (1.30, 0.92, 'hood'), (0.80, 0.97, 'ws'),
             (0.02, 1.47, 'roof'), (-0.86, 1.46, 'roof'), (-1.45, 1.05, 'rw'), (-2.02, 1.02, 'deck'), (-2.155, 0.94, 'tail')],
        pillars=[(-0.36, 0.09, 'trim')], glass_start=0.62, glass_end=-1.04,
        seams_v=[0.72, -0.36, -1.12], hood_seam=1.98, trunk_seam=-1.50,
        hl=dict(x=0.56, z=0.77, w=0.36, h=0.16), tl=dict(x=0.56, z=0.87, w=0.34, h=0.15),
        grille=dict(z=0.67, w=0.66, h=0.13, bars=2), lower=dict(z=0.40, w=0.84, h=0.13),
        spokes=6, rim='#c9ced4', paint='#f4f6f5', seal='trim'),
    'cobalt': dict(
        W=1.735, AF=1.38, AR=-1.24, R=0.30, TW=0.20, clear=0.22, belt=1.00, gh=0.72,
        top=[(2.24, 0.80, 'nose'), (2.10, 0.90, 'hood'), (1.40, 0.97, 'hood'), (0.86, 1.01, 'ws'),
             (0.02, 1.51, 'roof'), (-0.96, 1.50, 'roof'), (-1.55, 1.11, 'rw'), (-2.12, 1.09, 'deck'), (-2.24, 1.00, 'tail')],
        pillars=[(-0.42, 0.10, 'trim')], glass_start=0.66, glass_end=-1.14,
        seams_v=[0.78, -0.42, -1.22], hood_seam=2.06, trunk_seam=-1.60,
        hl=dict(x=0.58, z=0.82, w=0.42, h=0.17), tl=dict(x=0.58, z=0.93, w=0.40, h=0.17),
        grille=dict(z=0.72, w=0.60, h=0.17, bars=3), lower=dict(z=0.43, w=0.90, h=0.15),
        spokes=5, rim='#b9bec5', paint='#f4f6f5', seal='chrome'),
    'malibu2': dict(
        W=1.85, AF=1.54, AR=-1.29, R=0.33, TW=0.22, clear=0.18, belt=0.95, gh=0.70,
        top=[(2.46, 0.70, 'nose'), (2.30, 0.81, 'hood'), (1.50, 0.91, 'hood'), (0.86, 0.96, 'ws'),
             (-0.08, 1.44, 'roof'), (-0.82, 1.43, 'roof'), (-1.78, 1.00, 'rw'), (-2.35, 0.98, 'deck'), (-2.46, 0.90, 'tail')],
        pillars=[(-0.40, 0.09, 'trim')], glass_start=0.66, glass_end=-1.30,
        seams_v=[0.78, -0.40, -1.36], hood_seam=2.24, trunk_seam=-1.82,
        hl=dict(x=0.64, z=0.74, w=0.50, h=0.11), tl=dict(x=0.62, z=0.85, w=0.52, h=0.10),
        grille=dict(z=0.66, w=0.80, h=0.11, bars=1), lower=dict(z=0.38, w=1.20, h=0.20),
        spokes=10, rim='#d0d4d9', paint='#26415c', seal='chrome', antenna=True),
    'spark': dict(
        W=1.60, AF=1.14, AR=-1.235, R=0.27, TW=0.18, clear=0.18, belt=1.00, gh=0.75,
        top=[(1.82, 0.70, 'nose'), (1.66, 0.85, 'hood'), (1.20, 0.96, 'hood'), (0.86, 1.01, 'ws'),
             (0.14, 1.50, 'roof'), (-1.40, 1.48, 'roof'), (-1.72, 1.17, 'rw'), (-1.82, 0.92, 'tail')],
        pillars=[(-0.28, 0.09, 'trim'), (-1.22, 0.16, 'paint')], glass_start=0.68, glass_end=-1.48,
        seams_v=[0.78, -0.28, -1.10], hood_seam=1.64, trunk_seam=None,
        hl=dict(x=0.52, z=0.82, w=0.38, h=0.22), tl=dict(x=0.66, z=1.02, w=0.14, h=0.32),
        grille=dict(z=0.70, w=0.50, h=0.14, bars=2), lower=dict(z=0.40, w=0.74, h=0.16),
        spokes=5, rim='#b9bec5', paint='#7ac943', seal='trim', hatch=True),
    'tahoe': dict(
        W=2.06, AF=1.725, AR=-1.225, R=0.40, TW=0.27, clear=0.30, belt=1.30, gh=0.86, hgh=0.92,
        top=[(2.675, 1.04, 'nose'), (2.58, 1.20, 'hood'), (1.60, 1.26, 'hood'), (0.95, 1.30, 'ws'),
             (0.30, 1.91, 'roof'), (-2.55, 1.91, 'roof'), (-2.675, 1.84, 'tail')],
        pillars=[(-0.32, 0.10, 'trim'), (-1.45, 0.12, 'trim')], glass_start=0.80, glass_end=-2.40,
        seams_v=[0.88, -0.32, -1.40], hood_seam=2.55, trunk_seam=None,
        hl=dict(x=0.70, z=1.08, w=0.44, h=0.15), tl=dict(x=0.88, z=1.32, w=0.13, h=0.44),
        grille=dict(z=0.98, w=1.04, h=0.36, bars=3), lower=dict(z=0.56, w=1.36, h=0.22),
        spokes=6, rim='#2e3238', paint='#1b1b1d', seal='chrome', suv=True, rear_glass=True, rocker='trim'),
    'damas': dict(
        W=1.40, AF=1.12, AR=-1.08, R=0.27, TW=0.18, clear=0.28, belt=1.10, gh=0.93, hgh=0.90,
        top=[(1.70, 0.66, 'nose'), (1.66, 0.94, 'hood'), (1.57, 1.08, 'ws'),
             (1.18, 1.85, 'roof'), (-1.62, 1.89, 'roof'), (-1.70, 1.82, 'tail')],
        pillars=[(0.46, 0.10, 'paint'), (-0.40, 0.10, 'paint')], glass_start=1.10, glass_end=-1.55,
        seams_v=[1.16, 0.40, -0.46], hood_seam=None, trunk_seam=None,
        hl=dict(x=0.47, z=0.80, w=0.30, h=0.17), tl=dict(x=0.58, z=0.82, w=0.14, h=0.36),
        grille=dict(z=0.78, w=0.48, h=0.10, bars=1), lower=dict(z=0.42, w=0.80, h=0.14),
        spokes=0, rim='#d9dde1', paint='#f4f3ef', seal='trim', rear_glass=True, van=True),
    'svj': dict(
        W=2.10, AF=1.36, AR=-1.34, R=0.34, RR=0.36, TW=0.26, TWR=0.33, clear=0.12, belt=0.78, gh=0.52, hgh=0.80,
        top=[(2.47, 0.42, 'nose'), (2.30, 0.55, 'hood'), (1.60, 0.70, 'hood'), (1.20, 0.74, 'hood'), (0.95, 0.80, 'ws'),
             (0.0, 1.12, 'roof'), (-0.40, 1.12, 'roof'), (-1.00, 1.02, 'deck'), (-2.10, 0.95, 'deck'), (-2.47, 0.92, 'tail')],
        pillars=[], glass_start=0.84, glass_end=-0.50,
        seams_v=[0.80, -0.55], hood_seam=None, trunk_seam=None,
        hl=None, tl=None, grille=None, lower=None,
        spokes=5, rim='#3b3f46', spoke_col='#8d939b', paint='#f07a1a', seal='trim', sport=True, bulge_r=0.05),
}


# ---------------------------------------------------------------------------------------------
# AVTOMATIK: qolgan mashinalar o'yin spec'laridan (art/specs.json — vehicles.js dan eksport).
# Spec: len, wid, roofH, cl, noseH, hoodH, tailH; wsB/roofF/roofR/rwB — L/2 ga nisbatan; ohF/ohR, wheelR, type.
# id = nomdan slug ('Mercedes G63' -> mercedes_g63); o'yin models.js 'b/<slug>' ni avtomatik oladi.
# ---------------------------------------------------------------------------------------------
import json, re as _re


def slug(name):
    return _re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


BRAND = {   # panjara uslubi, spitsalar, rim rangi, oyna rezinasi
    'Mercedes-Benz': dict(grille='merc', spokes=5, rim='#c9ced4', seal='chrome'),
    'Mercedes-Maybach': dict(grille='merc', spokes=10, rim='#d6dade', seal='chrome'),
    'BMW': dict(grille='kidney', spokes=5, rim='#b9bec5', seal='trim'),
    'Audi': dict(grille='single', spokes=5, rim='#c4c9cf', seal='trim'),
    'Volkswagen': dict(grille='slim', spokes=5, rim='#c4c9cf', seal='chrome'),
    'Kia': dict(grille='tiger', spokes=10, rim='#c4c9cf', seal='chrome'),
    'Hyundai': dict(grille='cascade', spokes=6, rim='#c9ced4', seal='chrome'),
    'Chevrolet': dict(grille='bars', spokes=6, rim='#c9ced4', seal='trim'),
}


def auto_cfg(name, s):
    L2, W = s['len'] / 2, s['wid']
    t = s['type']
    nose, hood, tail, rh = s['noseH'], s['hoodH'], s['tailH'], s['roofH']
    sport = rh < 1.32
    big = s.get('service') and name in ('Betonovoz', 'Fura')
    b = BRAND.get(s.get('brand', ''), dict(grille='bars', spokes=6, rim='#c9ced4', seal='trim'))
    if big:     # yuk mashinasi: loft faqat kabina, qolgani extras
        cab = 2.25
        top = [(L2, nose, 'nose'), (L2 - 0.10, hood, 'hood'), (L2 - 0.16, hood + 0.04, 'ws'),
               (L2 - 0.42, rh - 0.05, 'roof'), (L2 - cab + 0.12, rh - 0.05, 'roof'), (L2 - cab, rh - 0.2, 'tail')]
        gs, ge, pil = L2 - 0.5, L2 - cab + 0.4, []
    elif t == 'van':
        top = [(L2, nose, 'nose'), (L2 - 0.08, hood, 'hood'), (s['wsB'] * L2, hood + 0.08, 'ws'),
               (s['roofF'] * L2, rh - 0.02, 'roof'), (-L2 + 0.10, rh, 'roof'), (-L2, rh - 0.08, 'tail')]
        gs, ge = s['wsB'] * L2 - 0.15, -L2 + 0.25
        pil = [(gs - 0.75, 0.10, 'paint'), (gs - 1.9, 0.10, 'paint')]
    else:
        top = [(L2, nose, 'nose'), (L2 - 0.16, nose + 0.62 * (hood - nose), 'hood'), (s['wsB'] * L2 + 0.25, hood - 0.01, 'hood'),
               (s['wsB'] * L2, hood + 0.02, 'ws'), (s['roofF'] * L2, rh, 'roof'), (s['roofR'] * L2, rh - 0.01, 'roof')]
        if t == 'sedan':
            top += [(s['rwB'] * L2, tail + 0.03, 'rw'), (-L2 + 0.12, tail, 'deck'), (-L2, tail - 0.07, 'tail')]
            gs, ge = s['wsB'] * L2 - 0.17, s['roofR'] * L2 - (0.22 if not sport else 0.12)
        elif t == 'hatch':
            top += [(s['rwB'] * L2, tail, 'rw'), (-L2, tail - 0.30, 'tail')]
            gs, ge = s['wsB'] * L2 - 0.17, s['roofR'] * L2 - 0.12
        else:   # suv
            top += [(s['rwB'] * L2, tail, 'rw'), (-L2, tail - 0.28, 'tail')]
            gs, ge = s['wsB'] * L2 - 0.17, s['rwB'] * L2 + 0.20
        bp = (s['roofF'] * L2 + s['roofR'] * L2) / 2 + 0.05
        pil = [(bp, 0.09, 'trim')]
        if t == 'suv':
            pil.append(((bp + ge) / 2 - 0.1, 0.11, 'trim'))
    AF, AR = L2 - s['ohF'], -(L2 - s['ohR'])
    cfg = dict(
        W=W, AF=AF, AR=AR, R=s['wheelR'], TW=round(0.17 + 0.07 * (W - 1.5), 3), clear=s['cl'],
        belt=hood + (0.05 if t in ('sedan', 'hatch') else 0.04), gh=0.62 if sport else (0.84 if t == 'suv' else (0.92 if t == 'van' else 0.72)),
        hgh=0.92 if t in ('suv', 'van') else 0.88, top=top, pillars=pil, glass_start=gs, glass_end=ge,
        seams_v=[gs + 0.08] + [p[0] for p in pil] + ([ge - 0.06] if t == 'sedan' else []),
        hood_seam=L2 - 0.2 if not big else None, trunk_seam=(s['rwB'] * L2 - 0.06) if t == 'sedan' else None,
        hl=dict(x=W * 0.33, z=nose - 0.07, w=W * 0.2, h=0.12 if not big else 0.18),
        tl=dict(x=W * 0.36, z=tail - 0.09, w=W * 0.17 if t != 'suv' else 0.14, h=0.11 if t != 'suv' else 0.36),
        grille=dict(z=nose - 0.17, w=W * 0.34, h=0.14, bars=2, style=b['grille']),
        lower=dict(z=s['cl'] + 0.2, w=W * 0.5, h=0.14),
        spokes=b['spokes'], rim=b['rim'], paint='#f4f6f5', seal=b['seal'],
        suv=t == 'suv', van=t == 'van', sport=False, hatch=t == 'hatch', rear_glass=t in ('suv', 'van'),
        rocker='trim' if t == 'suv' else 'paint', antenna=t == 'sedan', bulge_r=0.035 if sport else 0.02)
    if sport:
        cfg['bulge_r'] = 0.04
    if name == 'Mercedes G63':
        cfg.update(gh=0.93, hgh=0.97, extras='g63', rear_glass=True)
    if name == 'Tez yordam':
        cfg.update(extras='ambulance', paint='#f4f6f5', spokes=0)
    if name == 'Betonovoz':
        cfg.update(extras='mixer', paint='#e8b23a', spokes=0, rim='#c9ced4', truck=True, rear_glass=False)
    if name == 'Fura':
        cfg.update(extras='fura', paint='#c0392b', spokes=0, rim='#c9ced4', truck=True, rear_glass=False)
    return cfg


_SPEC_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'art', 'specs.json')
if os.path.exists(_SPEC_PATH):
    _SPECS = json.load(open(_SPEC_PATH, encoding='utf-8'))
    _HAND = {'Nexia 3', 'Cobalt', 'Malibu 2', 'Spark', 'Tahoe', 'Damas', 'Lamborghini SVJ'}
    for _n, _s in _SPECS.items():
        if _n in _HAND or _s.get('full'):
            continue
        CARS[slug(_n)] = auto_cfg(_n, _s)
# politsiya: Malibu 2 asosida (police.js: variant 'police')
CARS['malibu2_police'] = dict(CARS['malibu2'], extras='police', paint='#f4f6f5')

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
CID = argv[0] if argv else 'nexia3'
ART = argv[1] if len(argv) > 1 else 'art'
RENDER_DIR = argv[2] if len(argv) > 2 else None
C = CARS[CID]
scene = reset()

M = {
    'paint': material('paint', os.environ.get('PAINT', C['paint']), 0.28),
    'glass': material('glass', '#26313e', 0.05),
    'trim': material('trim', '#1c1f24', 0.6),
    'chrome': material('chrome', '#cfd4da', 0.15, 0.9),
    'hl': material('hl', '#fff6dc', 0.15, emit=0.7),
    'tl': material('tl', '#d8332b', 0.25, emit=0.6),
    'housing': material('housing', '#3a3f47', 0.25, 0.6),
    'tlhouse': material('tlhouse', '#5a1616', 0.3),
    'amber': material('amber', '#f2a33a', 0.3, emit=0.4),
    'seam': material('seam', '#2a2d33', 0.7),
    'tire': material('tire', '#202326', 0.9),
    'barrel': material('barrel', '#1a1c20', 0.7),
    'rim': material('rim', C['rim'], 0.25, 0.7),
    'spoke': material('spoke', C.get('spoke_col', C['rim']), 0.25, 0.7),
    'disc': material('disc', '#7d828a', 0.4, 0.6),
    'plate': material('plate', '#f2f2f2', 0.6),
    'mesh': material('mesh', '#121316', 0.8),
    'exhaust': material('exhaust', '#8a8f96', 0.25, 0.8),
}
MAT_ORDER = ['paint', 'glass', 'trim', 'chrome']
HALF = C['W'] / 2
TOP = C['top']
F0, FN = TOP[0][0], TOP[-1][0]
F_WS = next(f for f, z, k in TOP if k == 'ws')
ROOFS = [f for f, z, k in TOP if k == 'roof']
F_RF, F_RR = max(ROOFS), min(ROOFS)
F_RW = next((f for f, z, k in TOP if k == 'rw'), None)
F_CAB_END = F_RW if F_RW is not None else FN


def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def sstep(a, b, x):
    t = clamp((x - a) / (b - a))
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


# ---------------- yon profil: egri bo'laklar ----------------
def ztop_at(f):
    for (f0, z0, k0), (f1, z1, k1) in zip(TOP, TOP[1:]):
        if f1 <= f <= f0:
            t = (f0 - f) / (f0 - f1)
            bulge = 0.0
            if k0 == 'nose':
                t = 1 - (1 - t) ** 2.2                     # yumaloq burun
            elif k0 == 'ws' and k1 == 'roof':
                t = 1 - (1 - t) ** 1.6                     # qavariq old oyna
            elif k0 == 'roof' and k1 in ('rw', 'deck', 'tail'):
                t = t ** 1.5                               # qavariq orqa oyna / tom tushishi
            elif k0 == 'roof' and k1 == 'roof':
                bulge = 0.022 * math.sin(math.pi * t)      # tom gumbazi
            elif k0 in ('hood', 'deck') and k1 == k0:
                bulge = 0.014 * math.sin(math.pi * t)      # kapot/bagaj gumbazi
            elif k1 == 'tail':
                t = t ** 2.0
            return z0 + (z1 - z0) * t + bulge
    return TOP[-1][1]


def gw_at(f):
    """0 = kapot/bagaj (keng tepa), 1 = tom (tor kabina)"""
    if F_RR <= f <= F_RF:
        return 1.0
    if F_RF < f <= F_WS:
        return clamp((F_WS - f) / (F_WS - F_RF)) ** 0.8
    if F_CAB_END <= f < F_RR:
        return clamp((f - F_CAB_END) / (F_RR - F_CAB_END)) ** 0.8 if F_RR > F_CAB_END else 1.0
    return 0.0


def cab_at(f):
    return sstep(F_CAB_END - 0.10, F_CAB_END + 0.04, f) * (1 - sstep(F_WS - 0.04, F_WS + 0.10, f))


def ring_pts(f, end_shrink=0.0):
    zt_c = ztop_at(f)
    # rejada yumaloq burchaklar + g'ildirak ustida bo'rtish
    sf = clamp((f - (F0 - 0.50)) / 0.50)
    sr = clamp(((FN + 0.50) - f) / 0.50)
    kplan = 1 - 0.10 * sf * sf - 0.07 * sr * sr
    ws = HALF * kplan + 0.016 * math.exp(-((f - C['AF']) / 0.45) ** 2) + C.get('bulge_r', 0.02) * math.exp(-((f - C['AR']) / 0.50) ** 2)
    ws = min(ws, HALF + 0.03)
    zb = C['clear'] + 0.09 * (sf * sf + sr * sr)
    zs = C['clear'] + (0.40 if C.get('suv') or C.get('van') else (0.22 if C.get('sport') else 0.27))
    zsh = min(C['belt'], zt_c - 0.06)
    zsh = max(zsh, zs + 0.07)
    wsh = ws - 0.032
    g = gw_at(f)
    cw = cab_at(f)
    wt = wsh * lerp(C.get('hgh', 0.88), C['gh'], g)
    zt = zt_c - lerp(0.028, 0.035, g)
    zt = max(zt, zsh + 0.03)
    p = [None] * 11
    p[0] = (0.0, zb)
    p[1] = (ws - 0.12, zb)
    p[2] = (ws - 0.026, zb + 0.07)
    p[3] = (ws, zs)
    p[4] = (ws - 0.004, zs + 0.62 * (zsh - zs))      # yon xarakter chizig'i
    p[5] = (wsh, zsh)
    p[8] = (wt, zt)
    p[6] = (lerp(wsh, wt, 0.10) - 0.014 * cw, lerp(zsh, zt, 0.10))      # oyna rezinasi
    p[7] = (lerp(wsh, wt, 0.86) - 0.006 * cw, lerp(zsh, zt, 0.86))      # oyna tepasi
    p[9] = (wt * 0.55, zt_c - 0.006)
    p[10] = (0.0, zt_c)
    if end_shrink:
        zc = (zb + zt_c) / 2
        p = [(x * (1 - end_shrink), zc + (z - zc) * (1 - end_shrink * 0.8)) for x, z in p]
    full = p + [(-x, z) for x, z in reversed(p[1:10])]
    return [(x, -f, z) for x, z in full]


# ---------------- stansiyalar ----------------
keys = set(f for f, z, k in TOP)
keys.update([F0 - 0.05, FN + 0.05, C['glass_start'], C['glass_end'], F_WS - 0.04])
for pf, pw, _ in C['pillars']:
    keys.update([pf + pw / 2, pf - pw / 2])
keys = sorted(set(round(k, 3) for k in keys if FN <= k <= F0), reverse=True)
stations = list(keys)
f = F0
while f > FN:
    if all(abs(f - k) > 0.05 for k in keys):
        stations.append(round(f, 3))
    f -= 0.14
stations = sorted(set(stations), reverse=True)


def face_mat(seg, fm):
    hook = FACE_HOOK.get(CID)
    if hook:
        r = hook(seg, fm)
        if r:
            return r
    in_glass = C['glass_end'] < fm < C['glass_start']
    if seg == 0:
        return 'trim'
    if seg == 1:
        return C.get('rocker', 'paint')
    if seg in (8, 9):
        if F_RF + 0.01 < fm < F_WS:
            return 'glass'
        if F_RW is not None and F_RW < fm < F_RR - 0.01:
            return 'glass'
        return C.get('roof', 'paint')
    if seg == 6 and in_glass:
        for pf, pw, pm in C['pillars']:
            if abs(fm - pf) < pw / 2:
                return pm
        return 'glass'
    if seg == 5 and C['glass_end'] - 0.03 < fm < C['glass_start'] + 0.03:
        return C.get('seal', 'trim')
    if seg == 7 and F_CAB_END < fm < F_WS:
        return C.get('apillar', 'paint')
    return 'paint'


def svj_face(seg, fm):
    if seg in (3, 4) and -1.05 < fm < -0.62:
        return 'trim'      # eshik ortidagi katta havo olgich
    if seg in (6, 7) and -1.60 < fm < -1.00:
        return 'trim'      # yelkadagi havo olgich
    return None


FACE_HOOK = {'svj': svj_face}

bm = bmesh.new()
rings = []
for i, f in enumerate(stations):
    shrink = 0.10 if (i == 0 or i == len(stations) - 1) else 0.0
    rings.append([bm.verts.new(p) for p in ring_pts(f, shrink)])
n = len(rings[0])
for i in range(len(rings) - 1):
    fm = (stations[i] + stations[i + 1]) / 2
    for k in range(n):
        seg = k if k < 10 else n - 1 - k
        fc = bm.faces.new([rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k]])
        fc.material_index = MAT_ORDER.index(face_mat(seg, fm))
bm.faces.new(rings[0]).material_index = 0
bm.faces.new(list(reversed(rings[-1]))).material_index = 0
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new('body')
bm.to_mesh(me)
bm.free()
body = link(bpy.data.objects.new('body', me))
for k in MAT_ORDER:
    body.data.materials.append(M[k])

R_F, R_R = C['R'], C.get('RR', C['R'])
TW_F, TW_R = C['TW'], C.get('TWR', C['TW'])
for fa, r in ((C['AF'], R_F), (C['AR'], R_R)):
    for side in (1, -1):
        cut = cyl('cut', (side * (HALF + 0.22), fa, r), r + 0.055, 0.66, M['trim'], 32)
        b = body.modifiers.new('arch', 'BOOLEAN')
        b.operation = 'DIFFERENCE'
        b.object = cut
        b.solver = 'EXACT'
        b.material_mode = 'TRANSFER'
        apply_mods(body)
        bpy.data.objects.remove(cut, do_unlink=True)
smooth(body, 34)

# ---------------- DETALLAR ----------------
parts = [body]
UP, DOWN = 4.0, (0, 0, -1)


def keep(ob, ok):
    if ok:
        parts.append(ob)
        return ob
    bpy.data.objects.remove(ob, do_unlink=True)


def on_front(name, x, z, size, m, r=0.02, off=0.006, yaw=0.0):
    ob = rbox(name, (0, 0, 0), size, m, r, 1)
    return keep(ob, place_on(ob, body, (x, -(F0 + 2), z), (0, 1, 0), off, yaw))


def on_back(name, x, z, size, m, r=0.02, off=0.006):
    ob = rbox(name, (0, 0, 0), size, m, r, 1)
    return keep(ob, place_on(ob, body, (x, -(FN - 2), z), (0, -1, 0), off))


def on_top(name, x, f, size, m, r=0.01, off=0.004, yaw=0.0):
    ob = rbox(name, (0, 0, 0), size, m, r, 1)
    return keep(ob, place_on(ob, body, (x, -f, UP), DOWN, off, yaw))


def on_side(name, side, f, z, size, m, r=0.01, off=0.004):
    """size: (uzunligi f bo'ylab, balandligi, qalinligi)"""
    ob = rbox(name, (0, 0, 0), size, m, r, 1)
    return keep(ob, place_on(ob, body, (side * 3.0, -f, z), (-side, 0, 0), off))


def headlight(side, d):
    x, z, w, h = side * d['x'], d['z'], d['w'], d['h']
    on_front('hlhouse', x, z, (w + 0.04, h + 0.04, 0.03), M['housing'], min(0.04, h / 2.2), 0.004)
    on_front('hl', x + side * w * 0.12, z + 0.005, (w * 0.62, h * 0.70, 0.04), M['hl'], min(0.03, h / 3), 0.012)
    on_front('proj', x - side * w * 0.30, z, (h * 0.55, h * 0.55, 0.04), M['chrome'], h * 0.2, 0.014)
    on_front('drl', x, z - h / 2 - 0.015, (w * 0.85, 0.018, 0.03), M['hl'], 0.008, 0.008)
    on_front('ind', x + side * (w / 2 + 0.035), z, (0.04, h * 0.7, 0.03), M['amber'], 0.012, 0.006)


def taillight(side, d):
    x, z, w, h = side * d['x'], d['z'], d['w'], d['h']
    on_back('tlhouse', x, z, (w + 0.03, h + 0.03, 0.03), M['tlhouse'], min(0.03, min(w, h) / 2.5), 0.004)
    on_back('tl', x, z + h * 0.12, (w * 0.86, h * 0.45, 0.04), M['tl'], min(0.02, h / 5), 0.010)
    on_back('rev', x - side * w * 0.2, z - h * 0.28, (w * 0.32, h * 0.18, 0.04), M['hl'], 0.008, 0.010)


def common_details():
    for side in (1, -1):
        if C['hl']:
            headlight(side, C['hl'])
        if C['tl'] and not C.get('truck'):
            taillight(side, C['tl'])
        # ko'zgu: ustun + korpus
        hit = surface(body, (side * 3.0, -(F_WS - 0.12), C['belt'] + 0.02), (-side, 0, 0))
        if hit:
            p0 = hit[0]
            parts.append(rbox('mstalk', (p0.x + side * 0.05, F_WS - 0.12, p0.z + 0.01), (0.10, 0.06, 0.04), M['trim'], 0))
            parts.append(rbox('mirror', (p0.x + side * 0.13, F_WS - 0.15, p0.z + 0.07), (0.07, 0.16, 0.12), M['paint'], 0.035, 2))
            parts.append(rbox('mglass', (p0.x + side * 0.13, F_WS - 0.235, p0.z + 0.07), (0.055, 0.01, 0.10), M['chrome'], 0.01, 1))
        # eshik choklari (vertikal), tutqichlar
        for fs in C['seams_v']:
            zs0, zs1 = C['clear'] + 0.16, C['belt'] - 0.03
            nseg = 4
            for q in range(nseg):
                za = lerp(zs0, zs1, (q + 0.5) / nseg)
                on_side('seam', side, fs, za, (0.006, (zs1 - zs0) / nseg + 0.01, 0.004), M['seam'], 0, 0.001)
        doors = [C['seams_v'][0] - 0.30]
        if len(C['seams_v']) > 1 and (len(C['seams_v']) > 2 or C.get('van')):
            doors.append(C['seams_v'][1] - 0.30)
        for fd in doors:
            on_side('handle', side, fd, C['belt'] - 0.08, (0.16, 0.035, 0.022), M['chrome'] if C.get('seal') == 'chrome' else M['paint'], 0.012, 0.006)
    # kapot va bagaj choklari (ko'ndalang)
    for fseam in (C.get('hood_seam'), C.get('trunk_seam')):
        if fseam is None:
            continue
        nseg = 6
        span = HALF * 0.80
        for q in range(nseg):
            x = lerp(-span, span, (q + 0.5) / nseg)
            on_top('seamT', x, fseam, (2 * span / nseg + 0.01, 0.006, 0.004), M['seam'], 0, 0.001)
    # old oyna artgichlari
    if not C.get('sport'):
        for side in (1, -1):
            on_top('wiper', side * HALF * 0.25, F_WS - 0.07, (HALF * 0.55, 0.02, 0.014), M['trim'], 0.006, 0.012, side * 0.10)
    # panjara, pastki havo olgich, nomerlar
    g = C.get('grille')
    if g:
        st = g.get('style', 'bars')
        if st == 'kidney':      # BMW: ikki "buyrak"
            for sx in (-1, 1):
                on_front('kidney', sx * g['w'] * 0.27, g['z'] + 0.02, (g['w'] * 0.42, g['h'] * 1.35, 0.03), M['chrome'], 0.04, 0.004)
                on_front('kidneyIn', sx * g['w'] * 0.27, g['z'] + 0.02, (g['w'] * 0.36, g['h'] * 1.2, 0.03), M['mesh'], 0.035, 0.008)
        elif st == 'single':    # Audi: katta yagona panjara
            on_front('grilleS', 0, g['z'] - 0.06, (g['w'] * 1.15, g['h'] * 2.1, 0.03), M['chrome'], 0.05, 0.004)
            on_front('grilleSi', 0, g['z'] - 0.06, (g['w'] * 1.08, g['h'] * 1.95, 0.03), M['mesh'], 0.045, 0.008)
        elif st == 'merc':      # Mercedes: gorizontal xrom chiziqlar + markaziy doira
            on_front('grille', 0, g['z'], (g['w'] * 1.05, g['h'] * 1.4, 0.03), M['mesh'], 0.03, 0.004)
            for q in (-1, 1):
                on_front('gbar', 0, g['z'] + q * g['h'] * 0.3, (g['w'] * 0.98, 0.02, 0.03), M['chrome'], 0.008, 0.012)
            on_front('emblem', 0, g['z'], (0.11, 0.11, 0.03), M['chrome'], 0.05, 0.016)
        elif st == 'slim':      # VW: faralar orasida ingichka panjara
            on_front('grille', 0, g['z'] + 0.05, (C['hl']['x'] * 2 - C['hl']['w'] * 0.6, g['h'] * 0.6, 0.03), M['mesh'], 0.02, 0.004)
            on_front('gbar', 0, g['z'] + 0.05, (C['hl']['x'] * 2 - C['hl']['w'] * 0.6, 0.018, 0.03), M['chrome'], 0.006, 0.012)
        elif st == 'tiger':     # Kia: "yo'lbars burni"
            on_front('grille', 0, g['z'] + 0.03, (g['w'] * 0.9, g['h'] * 0.75, 0.03), M['mesh'], 0.035, 0.004)
            on_front('gframe', 0, g['z'] + 0.03 + g['h'] * 0.4, (g['w'] * 0.92, 0.02, 0.03), M['chrome'], 0.008, 0.012)
        elif st == 'cascade':   # Hyundai: keng, pastga kengayuvchi panjara
            on_front('grille', 0, g['z'] - 0.04, (g['w'] * 1.3, g['h'] * 1.7, 0.03), M['mesh'], 0.05, 0.004)
            for q in range(3):
                on_front('gbar', 0, g['z'] - 0.04 + (q - 1) * g['h'] * 0.45, (g['w'] * 1.2, 0.016, 0.03), M['chrome'], 0.006, 0.012)
        else:                   # Chevrolet: ikki qavatli
            on_front('grille', 0, g['z'], (g['w'], g['h'], 0.03), M['mesh'], min(0.03, g['h'] / 3), 0.004)
            for q in range(g.get('bars', 2)):
                zz = g['z'] + (q - (g['bars'] - 1) / 2) * (g['h'] / (g['bars'] + 0.5))
                on_front('gbar', 0, zz, (g['w'] * 0.94, 0.022, 0.03), M['chrome'], 0.008, 0.012)
    lo = C.get('lower')
    if lo:
        on_front('lower', 0, lo['z'], (lo['w'], lo['h'], 0.03), M['mesh'], 0.03, 0.004)
        for side in (1, -1):
            on_front('fog', side * (lo['w'] / 2 + 0.11), lo['z'], (0.12, 0.06, 0.03), M['hl'], 0.025, 0.006)
        on_front('plateF', 0, lo['z'] + lo['h'] / 2 + 0.075, (0.42, 0.11, 0.012), M['plate'], 0.008, 0.008)
        on_front('plateFt', 0, lo['z'] + lo['h'] / 2 + 0.075, (0.34, 0.035, 0.012), M['seam'], 0, 0.012)
    zplate = (C['tl']['z'] - 0.28) if C.get('tl') else C['clear'] + 0.45
    if C.get('truck'):
        return
    on_back('plateR', 0, zplate, (0.42, 0.11, 0.012), M['plate'], 0.008, 0.008)
    on_back('plateRt', 0, zplate, (0.34, 0.035, 0.012), M['seam'], 0, 0.012)
    on_back('rearlower', 0, C['clear'] + 0.13, (C['W'] * 0.72, 0.10, 0.03), M['trim'], 0.03, 0.004)
    if C.get('rear_glass'):
        on_back('rearglass', 0, C['belt'] + 0.30, (C['W'] * 0.70, 0.46, 0.02), M['glass'], 0.06, 0.006)
    if C.get('hatch'):
        on_back('hatchglass', 0, ztop_at(FN) + 0.12, (C['W'] * 0.6, 0.12, 0.02), M['glass'], 0.03, 0.004)
    if C.get('antenna'):
        on_top('antenna', 0, F_RR + 0.10, (0.05, 0.16, 0.06), M['paint'], 0.025, 0.03)
    # egzoz
    if not C.get('sport'):
        parts.append(cyl('exh', (HALF * 0.55, FN + 0.02, C['clear'] + 0.10), 0.035, 0.12, M['exhaust'], 10, 'Y'))


def tahoe_extras():
    for side in (1, -1):   # tom relslari + yon zinapoya
        g = surface(body, (side * HALF * C['gh'] * 0.82, 0.0, UP), DOWN)
        if g:
            parts.append(rbox('rail', (side * HALF * C['gh'] * 0.82, (F_RF + F_RR) / 2 - 0.1, g[0].z + 0.02),
                              (0.05, (F_RF - F_RR) - 0.3, 0.04), M['trim'], 0.015, 1))
        parts.append(rbox('step', (side * (HALF - 0.02), (C['AF'] + C['AR']) / 2, C['clear'] + 0.02),
                          (0.16, (C['AF'] - C['AR']) - 2 * C['R'] - 0.25, 0.05), M['trim'], 0.02, 1))


def damas_extras():
    for side in (1, -1):   # surma eshik relsi
        on_side('slide', side, -0.95, C['belt'] + 0.02, (1.10, 0.025, 0.010), M['seam'], 0.004, 0.002)


def svj_extras():
    for side in (1, -1):
        h = rbox('hl', (0, 0, 0), (0.34, 0.09, 0.02), M['hl'], 0.012, 1)
        keep(h, place_on(h, body, (side * 0.64, -2.31, UP), DOWN, 0.006, side * math.radians(-14)))
        h2 = rbox('drl', (0, 0, 0), (0.035, 0.20, 0.02), M['hl'], 0.01, 1)
        keep(h2, place_on(h2, body, (side * 0.80, -2.20, UP), DOWN, 0.006, side * math.radians(-32)))
        on_front('intake', side * 0.50, 0.27, (0.40, 0.15, 0.05), M['mesh'], 0.02, 0.0)
        parts.append(rbox('tl', (side * 0.62, -2.475, 0.80), (0.48, 0.03, 0.05), M['tl'], 0.012, 1, rot=(0, side * math.radians(-6), 0)))
        parts.append(rbox('tl2', (side * 0.80, -2.47, 0.72), (0.05, 0.03, 0.18), M['tl'], 0.012, 1, rot=(0, side * math.radians(28), 0)))
        deck = surface(body, (side * 0.42, 2.22, UP), DOWN)
        z0 = deck[0].z if deck else 0.94
        parts.append(rbox('pylon', (side * 0.42, -2.22, (z0 + 1.19) / 2), (0.04, 0.10, 1.19 - z0 + 0.02), M['trim'], 0.012, 1))
        parts.append(rbox('endplate', (side * 0.93, -2.30, 1.17), (0.025, 0.36, 0.13), M['trim'], 0.01, 1))
        parts.append(cyl('exh', (side * 0.11, -2.48, 0.70), 0.075, 0.08, M['exhaust'], 6, 'Y'))
        parts.append(cyl('exhIn', (side * 0.11, -2.52, 0.70), 0.055, 0.02, M['mesh'], 6, 'Y'))
        hit = surface(body, (side * 3.0, -0.78, 0.84), (-side, 0, 0))
        if hit:
            parts.append(rbox('mstalk', (hit[0].x + side * 0.05, 0.80, 0.84), (0.10, 0.03, 0.025), M['trim'], 0))
            parts.append(rbox('mirror', (hit[0].x + side * 0.13, 0.78, 0.88), (0.10, 0.13, 0.08), M['paint'], 0.03, 1))
    on_front('intakeC', 0, 0.30, (0.46, 0.08, 0.05), M['mesh'], 0.02, 0.0)
    parts.append(rbox('splitter', (0, 2.36, 0.11), (1.50, 0.24, 0.03), M['trim'], 0.012, 1))
    parts.append(rbox('wing', (0, -2.30, 1.20), (1.86, 0.32, 0.035), M['trim'], 0.015, 1, rot=(math.radians(-6), 0, 0)))
    parts.append(rbox('diffuser', (0, -2.40, 0.20), (1.50, 0.22, 0.10), M['trim'], 0.02, 1))
    on_back('rearmesh', 0, 0.55, (1.50, 0.30, 0.02), M['mesh'], 0.03, 0.002)
    on_top('louvre', 0, -1.45, (0.62, 0.90, 0.02), M['mesh'], 0.02, 0.012)
    for k in range(5):
        on_top('rib', 0, -1.10 - k * 0.17, (0.60, 0.03, 0.025), M['trim'], 0, 0.024)


def static_wheel(f, x, r, tw):
    """harakatlanmaydigan qo'shimcha g'ildirak (yuk mashinasining 2-orqa o'qi)"""
    t = cyl('xw', (x, f, r), r, tw, M['tire'], 20, 'X', r * 0.12)
    out = x + (1 if x > 0 else -1) * (tw / 2 - 0.004)
    parts.extend([t, cyl('xr', (out, f, r), r * 0.62, 0.02, M['rim'], 16, 'X')])


def g63_extras():
    parts.append(cyl('spare', (0, FN - 0.12, 1.15), 0.36, 0.22, M['tire'], 20, 'Y', 0.05))
    parts.append(cyl('sparec', (0, FN - 0.24, 1.15), 0.24, 0.03, M['paint'], 16, 'Y'))
    for side in (1, -1):
        on_front('roundhl', side * C['W'] * 0.36, C['hl']['z'] + 0.02, (0.2, 0.2, 0.04), M['hl'], 0.095, 0.014)


def ambulance_extras():
    lb = rbox('lightbar', (0, F_RF - 0.25, ztop_at(F_RF - 0.25) + 0.06), (C['W'] * 0.7, 0.22, 0.10), M['trim'], 0.03, 1)
    parts.append(lb)
    for side, m in ((1, M['tl']), (-1, mat_blue)):
        parts.append(rbox('beacon', (side * C['W'] * 0.2, F_RF - 0.25, ztop_at(F_RF - 0.25) + 0.12), (C['W'] * 0.26, 0.18, 0.08), m, 0.03, 1))
    for side in (1, -1):
        on_side('stripe', side, (F0 + FN) / 2 - 0.2, C['belt'] - 0.25, ((F0 - FN) * 0.82, 0.16, 0.006), M['tl'], 0.004, 0.002)
        on_side('cross', side, FN + 1.2, C['belt'] + 0.35, (0.36, 0.10, 0.006), M['tl'], 0, 0.004)
        on_side('cross2', side, FN + 1.2, C['belt'] + 0.35, (0.10, 0.36, 0.006), M['tl'], 0, 0.004)


def police_extras():
    zt = ztop_at((F_RF + F_RR) / 2)
    parts.append(rbox('lightbar', (0, (F_RF + F_RR) / 2, zt + 0.05), (C['W'] * 0.62, 0.2, 0.07), M['trim'], 0.025, 1))
    for side, m in ((1, M['tl']), (-1, mat_blue)):
        parts.append(rbox('beacon', (side * C['W'] * 0.17, (F_RF + F_RR) / 2, zt + 0.1), (C['W'] * 0.24, 0.16, 0.06), m, 0.025, 1))
    for side in (1, -1):
        on_side('pstripe', side, (C['AF'] + C['AR']) / 2, C['belt'] - 0.22, ((C['AF'] - C['AR']) * 1.25, 0.12, 0.006), mat_blue, 0.004, 0.002)
    on_front('pushbar', 0, C['lower']['z'] + 0.05, (C['W'] * 0.55, 0.2, 0.06), M['trim'], 0.02, 0.03)


def truck_chassis(cab_end):
    z0 = C['clear'] + 0.18
    parts.append(rbox('frame', (0, (cab_end + FN_TRUCK) / 2, z0), (C['W'] * 0.55, cab_end - FN_TRUCK, 0.24), M['trim'], 0.02, 1))
    for side in (1, -1):    # orqa qanotlar va 2-o'q
        parts.append(rbox('fender', (side * (HALF - 0.16), C['AR'] + 0.68, C['R'] * 2 + 0.12), (0.34, 2.2, 0.06), M['trim'], 0.02, 1))
        static_wheel(C['AR'] + 1.36, side * (HALF - TW_F / 2 - 0.045), C['R'], TW_F)
        parts.append(cyl('tank', (side * (HALF - 0.32), cab_end - 0.6, C['clear'] + 0.42), 0.26, 0.9, M['chrome'], 16, 'Y'))
        parts.append(rbox('ttl', (side * (HALF - 0.25), FN_TRUCK + 0.03, C['clear'] + 0.32), (0.3, 0.05, 0.12), M['tl'], 0.02, 1))
    parts.append(rbox('rbump', (0, FN_TRUCK + 0.06, C['clear'] + 0.2), (C['W'] * 0.9, 0.1, 0.14), M['trim'], 0.02, 1))


def mixer_extras():
    cab_end = TOP[-1][0]
    truck_chassis(cab_end)
    drum_c = Vector((0, (cab_end + FN_TRUCK) / 2 - 0.2, 1.85))
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=1.12, radius2=0.55, depth=3.6, location=(0, -drum_c.y, drum_c.z),
                                    rotation=(math.pi / 2 + 0.12, 0, 0))
    d = bpy.context.active_object
    set_mat(d, M['paint'])
    for p in d.data.polygons:
        p.use_smooth = True
    parts.append(d)
    for k in range(4):   # baraban chiziqlari
        bpy.ops.mesh.primitive_torus_add(major_radius=1.0 - k * 0.13, minor_radius=0.035, major_segments=24, minor_segments=4,
                                         location=(0, -(drum_c.y + 1.2 - k * 0.8), drum_c.z + (1.2 - k * 0.8) * 0.12),
                                         rotation=(math.pi / 2 + 0.12, 0, 0))
        tb = bpy.context.active_object
        set_mat(tb, M['trim'])
        parts.append(tb)
    parts.append(rbox('chute', (0, FN_TRUCK + 0.15, 1.05), (0.3, 0.6, 0.12), M['trim'], 0.02, 1, rot=(0.5, 0, 0)))


def fura_extras():
    cab_end = TOP[-1][0]
    truck_chassis(cab_end)
    parts.append(cyl('fifth', (0, C['AR'] + 0.3, C['clear'] + 0.36), 0.55, 0.08, M['trim'], 20, 'Z'))
    for side in (1, -1):
        parts.append(cyl('stack', (side * (HALF - 0.12), cab_end - 0.12, 2.6), 0.07, 1.6, M['chrome'], 12, 'Z'))
    parts.append(rbox('deflector', (0, cab_end + 0.5, ztop_at(cab_end + 0.6) + 0.35), (C['W'] * 0.9, 0.9, 0.5), M['paint'], 0.08, 2))


mat_blue = material('blue', '#2f6fd6', 0.3, emit=0.5)
FN_TRUCK = -TOP[0][0]   # yuk mashinasining haqiqiy orqa uchi (= -L/2; loft faqat kabina)
if CID != 'svj':
    common_details()
{'tahoe': tahoe_extras, 'damas': damas_extras, 'svj': svj_extras, 'g63': g63_extras, 'ambulance': ambulance_extras,
 'police': police_extras, 'mixer': mixer_extras, 'fura': fura_extras}.get(C.get('extras', CID), lambda: None)()
body = join(parts, 'body')

# ---------------- G'ILDIRAKLAR ----------------
for fa, R, TW, tag in ((C['AF'], R_F, TW_F, 'front'), (C['AR'], R_R, TW_R, 'back')):
    for side, sname in ((1, 'left'), (-1, 'right')):
        x = side * (HALF - TW / 2 - 0.045)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=R, depth=TW, location=(x, -fa, R), rotation=(0, math.pi / 2, 0))
        tire = bpy.context.active_object
        set_mat(tire, M['tire'])
        bvt = tire.modifiers.new('bv', 'BEVEL')
        bvt.width = R * 0.17
        bvt.segments = 2
        apply_mods(tire)
        smooth(tire, 55)
        out = x + side * (TW / 2 - 0.004)
        bits = [tire, cyl('barrel', (out - side * 0.02, fa, R), R * 0.68, 0.02, M['barrel'], 16, 'X'),
                cyl('disc', (out - side * 0.008, fa, R), R * 0.46, 0.012, M['disc'], 16, 'X')]
        bpy.ops.mesh.primitive_torus_add(major_radius=R * 0.66, minor_radius=R * 0.05, major_segments=20, minor_segments=4,
                                         location=(out, -fa, R), rotation=(0, math.pi / 2, 0))
        lip = bpy.context.active_object
        set_mat(lip, M['rim'])
        bits.append(lip)
        ns = C['spokes']
        if ns:
            for k in range(ns):
                a = 2 * math.pi * k / ns
                bits.append(rbox('spoke', (out + side * 0.004, fa + math.cos(a) * R * 0.33, R + math.sin(a) * R * 0.33),
                                 (0.022, (0.05 if ns > 6 else 0.075), R * 0.62), M['spoke'], 0, 1, rot=(-a + math.pi / 2, 0, 0)))
        else:   # oddiy po'lat disk (Damas)
            bits.append(cyl('steel', (out - side * 0.004, fa, R), R * 0.62, 0.02, M['rim'], 20, 'X'))
        bits.append(cyl('hubc', (out + side * 0.012, fa, R), R * 0.17, 0.025, M['spoke'], 12, 'X', 0.006))
        wheel = join(bits, 'wheel-%s-%s' % (tag, sname))
        set_origin(wheel, (x, -fa, R))

tri_report(CID)
export_glb(os.path.join(ART, CID + '.glb'))
export_extra(os.path.join(ART, 'export', CID), CID)

if RENDER_DIR:
    L = (F0 - FN) if not C.get('truck') else 2 * F0
    d = L * 1.30
    render_views(RENDER_DIR, CID, [
        ('front', (d * 0.78, -d * 0.95, 2.2)),
        ('rear', (-d * 0.80, d * 0.90, 2.4)),
        ('side', (d * 1.50, 0, 0.95)),
    ], target=(0, 0, 0.62))


# ---------------- LOD: uzoq masofa uchun yengil nusxa (g'ildiraklar kuzovga qo'shiladi) ----------------
lod_objs = [o for o in scene.objects if o.type == 'MESH' and (o.name == 'body' or o.name.startswith('wheel-'))]
bpy.ops.object.select_all(action='DESELECT')
for o in lod_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = lod_objs[0]
bpy.ops.object.join()
lod = bpy.context.view_layer.objects.active
lod.name = 'lod'
lod.data.calc_loop_triangles()
target = 1400 if not C.get('truck') else 2200
if len(lod.data.loop_triangles) > target:
    d = lod.modifiers.new('dec', 'DECIMATE')
    d.ratio = target / len(lod.data.loop_triangles)
    d.use_collapse_triangulate = True
    activate(lod)
    bpy.ops.object.modifier_apply(modifier='dec')
for o in list(scene.objects):
    if o.type == 'MESH' and o is not lod:
        bpy.data.objects.remove(o, do_unlink=True)
export_glb(os.path.join(ART, CID + '_lod.glb'))
