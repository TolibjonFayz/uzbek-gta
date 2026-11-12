// Mashina modellarini (Quaternius OBJ + RG Poly glTF) bitta siqilgan faylga yig'ish.
// Ishlatish:  node tools/pack-cars.js <quaternius_OBJ_papka> <rgpoly_gLTF_papka>
//   quaternius: "Realistic Car Pack - Nov 2018/OBJ"  (quaternius.itch.io/lowpoly-cars, CC0)
//   rgpoly:     "Cars Free/gLTF"                     (rg-poly.itch.io/cars-low-poly-massive-car-pack, CC0)
// Natija: assets/models/cars.pack.gz (+ rg-*.png teksturalar, Python PIL bilan kichraytiriladi)
//
// Hamma model bitta yo'nalishga keltiriladi: +Z — oldinga, X — eni (chap = +X), Y — tepaga.
// Format (gzip ichida): [uint32 headerLen][header JSON][binar blok]
//   header.models['q/NormalCar1'] = [ { node, t, n, pos, nrm, uv?, idx, ic, g: [[start, count, matKey], ...] } ]
//   matKey: 'paint' (o'yin rangi), 'glass', 'hl' (old fara), 'tl' (orqa chiroq), 'c:#rrggbb', 'tex:atlas|win|signs'
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFileSync } = require('child_process');

const QDIR = process.argv[2], RGDIR = process.argv[3];
if (!QDIR || !RGDIR) { console.error('Ishlatish: node tools/pack-cars.js <quaternius_OBJ> <rgpoly_gLTF>'); process.exit(1); }
const OUT = path.join(__dirname, '..', 'assets', 'models');
fs.mkdirSync(OUT, { recursive: true });

const Q_MODELS = ['NormalCar1', 'NormalCar2', 'SportsCar', 'SportsCar2', 'SUV', 'Taxi', 'Cop'];
const RG_MODELS = ['Ambulance_1_A', 'Truck_A', 'Concrate Truck', 'Car_Police_1_A_1', 'SMAT_1', 'RVCar_A', 'Car_1_B', 'Car_10_ZZ'];

const header = { models: {} };
const chunks = [];
let binLen = 0;
function push(typed) {
  const buf = Buffer.from(typed.buffer, typed.byteOffset, typed.byteLength);
  const off = binLen;
  chunks.push(buf); binLen += buf.length;
  const pad = (4 - (binLen % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); binLen += pad; }
  return off;
}
const srgb = function (c) { return Math.round(255 * Math.pow(Math.min(1, Math.max(0, c)), 1 / 2.2)); };
const hex = function (rgb) { return '#' + rgb.map(function (c) { return srgb(c).toString(16).padStart(2, '0'); }).join(''); };

// part: { node, t, pos[], nrm[], uv[]|null, groups: { key: [indices] } } -> header yozuvi
function emitPart(p) {
  const n = p.pos.length / 3;
  if (n > 65535) throw new Error('uchlar juda ko\'p: ' + p.node);
  const keys = Object.keys(p.groups);
  const idx = [], g = [];
  keys.forEach(function (k) { g.push([idx.length, p.groups[k].length, k]); Array.prototype.push.apply(idx, p.groups[k]); });
  const e = { node: p.node, t: p.t, n: n, pos: push(new Float32Array(p.pos)), nrm: push(new Float32Array(p.nrm)),
    idx: push(new Uint16Array(idx)), ic: idx.length, g: g };
  if (p.uv) e.uv = push(new Float32Array(p.uv));
  return e;
}

// ---------- QUATERNIUS (OBJ + MTL) ----------
const FIXED = { Windows: 'glass', Headlights: 'hl', TailLights: 'tl' };
function readMtl(file) {
  const out = {}; let cur = null;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(function (l) {
    const p = l.trim().split(/\s+/);
    if (p[0] === 'newmtl') cur = out[p[1]] = { kd: [0.8, 0.8, 0.8] };
    else if (p[0] === 'Kd' && cur) cur.kd = p.slice(1, 4).map(Number);
  });
  return out;
}
let qTris = 0;
Q_MODELS.forEach(function (name) {
  const mtl = readMtl(path.join(QDIR, name + '.mtl'));
  const V = [], VN = [];
  const objs = []; let cur = null, mat = null;
  fs.readFileSync(path.join(QDIR, name + '.obj'), 'utf8').split(/\r?\n/).forEach(function (l) {
    const p = l.trim().split(/\s+/);
    if (p[0] === 'v') V.push(p.slice(1, 4).map(Number));
    else if (p[0] === 'vn') VN.push(p.slice(1, 4).map(Number));
    else if (p[0] === 'o') { cur = { name: p[1], faces: [] }; objs.push(cur); }
    else if (p[0] === 'usemtl') mat = p[1];
    else if (p[0] === 'f' && cur) {
      const vs = p.slice(1).map(function (s) {
        const a = s.split('/');
        const vi = parseInt(a[0], 10), ni = a[2] ? parseInt(a[2], 10) : 0;
        return [vi > 0 ? vi - 1 : V.length + vi, ni > 0 ? ni - 1 : (ni < 0 ? VN.length + ni : -1)];
      });
      for (let i = 1; i < vs.length - 1; i++) cur.faces.push({ m: mat, v: [vs[0], vs[i], vs[i + 1]] });
    }
  });
  // bo'yoq = kuzovdagi eng ko'p ishlatilgan "erkin" material
  const body = objs.find(function (o) { return !/Wheel/i.test(o.name); });
  const cnt = {};
  body.faces.forEach(function (f) { if (!FIXED[f.m] && f.m !== 'Black' && f.m !== 'Grey') cnt[f.m] = (cnt[f.m] || 0) + 1; });
  let paint = null, best = 0;
  Object.keys(cnt).forEach(function (k) { if (cnt[k] > best) { best = cnt[k]; paint = k; } });

  const parts = objs.map(function (o) {
    const isWheel = /Wheel/i.test(o.name);
    const nodeName = isWheel ? (/FrontLeft/i.test(o.name) ? 'wheel-front-left' : /FrontRight/i.test(o.name) ? 'wheel-front-right' : 'wheel-back') : 'body';
    const pos = [], nrm = [], groups = {}, map = {};
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    o.faces.forEach(function (f) {
      const key = f.m === paint ? 'paint' : (FIXED[f.m] || ('c:' + hex(mtl[f.m] ? mtl[f.m].kd : [0.5, 0.5, 0.5])));
      // tekis soya: yuzning normali (OBJ normallari ham tekis)
      const a = V[f.v[0][0]], b = V[f.v[1][0]], c = V[f.v[2][0]];
      let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
      let ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
      let nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      (groups[key] || (groups[key] = []));
      f.v.forEach(function (vv) {
        const n0 = vv[1] >= 0 ? VN[vv[1]] : [nx, ny, nz];
        const k = vv[0] + '/' + (vv[1] >= 0 ? vv[1] : (nx.toFixed(3) + ',' + ny.toFixed(3) + ',' + nz.toFixed(3)));
        let id = map[k];
        if (id === undefined) {
          id = map[k] = pos.length / 3;
          const P = V[vv[0]];
          pos.push(P[0], P[1], P[2]); nrm.push(n0[0], n0[1], n0[2]);
          for (let q = 0; q < 3; q++) { mn[q] = Math.min(mn[q], P[q]); mx[q] = Math.max(mx[q], P[q]); }
        }
        groups[key].push(id);
      });
      qTris++;
    });
    const t = isWheel ? [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2].map(function (v) { return +v.toFixed(4); }) : [0, 0, 0];
    return emitPart({ node: nodeName, t: t, pos: pos, nrm: nrm, uv: null, groups: groups });
  });
  header.models['q/' + name] = parts;
});

// ---------- RG POLY (glTF + .bin) ----------
function trs(t, r, s) {
  const x = r ? r[0] : 0, y = r ? r[1] : 0, z = r ? r[2] : 0, w = r ? r[3] : 1;
  const S = s || [1, 1, 1], T = t || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * S[0], (2 * (x * y + z * w)) * S[0], (2 * (x * z - y * w)) * S[0], 0,
    (2 * (x * y - z * w)) * S[1], (1 - 2 * (x * x + z * z)) * S[1], (2 * (y * z + x * w)) * S[1], 0,
    (2 * (x * z + y * w)) * S[2], (2 * (y * z - x * w)) * S[2], (1 - 2 * (x * x + y * y)) * S[2], 0, T[0], T[1], T[2], 1];
}
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
// -X oldinga -> +Z oldinga: (x, y, z) -> (z, y, -x)
const FIX_RG = [0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1];
let rgTris = 0;
RG_MODELS.forEach(function (name) {
  const json = JSON.parse(fs.readFileSync(path.join(RGDIR, name + '.gltf'), 'utf8'));
  const bins = json.buffers.map(function (b) { return fs.readFileSync(path.join(RGDIR, decodeURIComponent(b.uri))); });
  function acc(i) {
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView], bin = bins[bv.buffer];
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const es = { 5126: 4, 5123: 2, 5125: 4, 5121: 1 }[a.componentType];
    const stride = bv.byteStride || comps * es, base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Array(a.count * comps);
    for (let e = 0; e < a.count; e++) for (let c = 0; c < comps; c++) {
      const off = base + e * stride + c * es;
      out[e * comps + c] = a.componentType === 5126 ? bin.readFloatLE(off) : es === 4 ? bin.readUInt32LE(off) : es === 2 ? bin.readUInt16LE(off) : bin.readUInt8(off);
    }
    return out;
  }
  function texKey(mi) {
    const m = json.materials[mi];
    const ti = m.pbrMetallicRoughness && m.pbrMetallicRoughness.baseColorTexture ? m.pbrMetallicRoughness.baseColorTexture.index : -1;
    if (ti < 0) return 'c:#888888';
    const tex = json.textures[ti];
    const src = tex.source !== undefined ? tex.source : (tex.extensions && tex.extensions.EXT_texture_webp ? tex.extensions.EXT_texture_webp.source : 0);
    const uri = decodeURIComponent(json.images[src].uri);
    if (/window/i.test(uri)) return 'tex:win';
    if (/sign/i.test(uri)) return 'tex:signs';
    return 'tex:atlas';
  }
  // butun modelni bitta qismga pishiramiz (RG g'ildiraklari kuzov bilan birga; rul burilmaydi)
  const pos = [], nrm = [], uv = [], groups = {};
  function walk(ni, parent) {
    const nd = json.nodes[ni];
    const m = mul(parent, nd.matrix || trs(nd.translation, nd.rotation, nd.scale));
    if (nd.mesh !== undefined) {
      json.meshes[nd.mesh].primitives.forEach(function (p) {
        if (p.attributes.JOINTS_0) return;
        const P = acc(p.attributes.POSITION), N = acc(p.attributes.NORMAL), T = acc(p.attributes.TEXCOORD_0);
        const I = acc(p.indices);
        const base = pos.length / 3;
        for (let v = 0; v < P.length / 3; v++) {
          const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
          pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
          const a = N[v * 3], b = N[v * 3 + 1], c = N[v * 3 + 2];
          const nx = m[0] * a + m[4] * b + m[8] * c, ny = m[1] * a + m[5] * b + m[9] * c, nz = m[2] * a + m[6] * b + m[10] * c;
          const l = Math.hypot(nx, ny, nz) || 1;
          nrm.push(nx / l, ny / l, nz / l);
          uv.push(T[v * 2], T[v * 2 + 1]);
        }
        const key = texKey(p.material);
        const arr = groups[key] || (groups[key] = []);
        I.forEach(function (i) { arr.push(base + i); });
        rgTris += I.length / 3;
      });
    }
    (nd.children || []).forEach(function (c) { walk(c, m); });
  }
  json.scenes[json.scene || 0].nodes.forEach(function (ni) { walk(ni, FIX_RG); });
  header.models['rg/' + name] = [emitPart({ node: 'body', t: [0, 0, 0], pos: pos, nrm: nrm, uv: uv, groups: groups })];
});

// teksturalar: telefon uchun kichraytiramiz
execFileSync('python', ['-c', [
  'from PIL import Image', 'import sys', 'd, o = sys.argv[1], sys.argv[2]',
  "for f, n, s in [('City Atlas Map_png.png','rg-atlas.png',512), ('Windows.png','rg-win.png',256), ('Signs 2.png','rg-signs.png',128)]:",
  "    Image.open(d + '/' + f).convert('RGB').resize((s, s), Image.LANCZOS).save(o + '/' + n, optimize=True)"
].join('\n'), RGDIR, OUT]);

const hjson = Buffer.from(JSON.stringify(header));
const hpad = (4 - ((4 + hjson.length) % 4)) % 4;
const hlen = Buffer.alloc(4); hlen.writeUInt32LE(hjson.length + hpad, 0);
const raw = Buffer.concat([hlen, hjson, Buffer.alloc(hpad, 0x20)].concat(chunks));
const gz = zlib.gzipSync(raw, { level: 9 });
fs.writeFileSync(path.join(OUT, 'cars.pack.gz'), gz);
console.log(Object.keys(header.models).length + ' ta mashina (Quaternius ' + qTris + ' + RG ' + rgTris + ' uchburchak), ' +
  (raw.length / 1048576).toFixed(2) + ' MB -> ' + (gz.length / 1048576).toFixed(2) + ' MB');
