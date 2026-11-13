// O'zimiz Blender'da yasagan modellarni (art/*.glb) bitta siqilgan faylga yig'ish.
// Ishlatish:  node tools/pack-blender.js
//   art/*.glb  ->  assets/models/blender.pack.gz   (model nomi: 'b/<fayl nomi>', masalan 'b/damas')
// Modellarni tools/blender/*.py skriptlari yasaydi (README: tools/blender/README.md).
//
// Qoidalar (cars.pack bilan bir xil format):
//   +Z oldinga, X eni (chap = +X), Y tepaga; metrda.
//   Tugunlar: 'body' + 'wheel-front-left' / 'wheel-back-right' ... (g'ildirak tuguni markazi = o'q)
//   Material nomi -> kalit: paint | glass | hl | tl, qolganlari 'c:#rrggbb' (baseColor'dan).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'art');
const OUT = path.join(ROOT, 'assets', 'models');
const KEYS = { paint: 1, glass: 1, hl: 1, tl: 1 };

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
const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const srgb = function (c) { c = Math.min(1, Math.max(0, c)); return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); };
const hex = function (rgb) { return '#' + rgb.slice(0, 3).map(function (c) { return srgb(c).toString(16).padStart(2, '0'); }).join(''); };

function readGlb(file) {
  const b = fs.readFileSync(file);
  const jlen = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jlen).toString());
  const binOff = 20 + jlen + 8;
  const bin = b.slice(binOff, binOff + b.readUInt32LE(20 + jlen));
  function accessor(i) {
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
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
  return { json, accessor };
}

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

const files = fs.readdirSync(SRC).filter(function (f) { return /\.glb$/i.test(f); });
if (!files.length) { console.error('art/ ichida .glb yo\'q'); process.exit(1); }
files.forEach(function (f) {
  const g = readGlb(path.join(SRC, f));
  const matKey = function (mi) {
    if (mi === undefined) return 'c:#888888';
    const m = g.json.materials[mi];
    if (KEYS[m.name]) return m.name;
    const pbr = m.pbrMetallicRoughness || {};
    return 'c:' + hex(pbr.baseColorFactor || [0.5, 0.5, 0.5, 1]);
  };
  const parts = [];
  let tris = 0;
  function walk(ni, parentM) {
    const nd = g.json.nodes[ni];
    const m = mul(parentM, nd.matrix || trs(nd.translation, nd.rotation, nd.scale));
    if (nd.mesh !== undefined) {
      // 'c:#rrggbb' ranglar bitta 'vc' (vertex color) guruhiga birlashtiriladi -> telefonda chizish chaqiruvlari kam
      const pos = [], nrm = [], col = [], groups = {};
      let hasVc = false;
      g.json.meshes[nd.mesh].primitives.forEach(function (p) {
        const P = g.accessor(p.attributes.POSITION), N = g.accessor(p.attributes.NORMAL), I = g.accessor(p.indices);
        const base = pos.length / 3;
        let key = matKey(p.material);
        let rgb = [255, 255, 255];
        if (key.indexOf('c:') === 0) {
          const h = parseInt(key.slice(3), 16);
          rgb = [(h >> 16) & 255, (h >> 8) & 255, h & 255];
          key = 'vc';
          hasVc = true;
        }
        for (let v = 0; v < P.length / 3; v++) {
          const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
          pos.push(m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]);
          const a = N[v * 3], b = N[v * 3 + 1], c = N[v * 3 + 2];
          const nx = m[0] * a + m[4] * b + m[8] * c, ny = m[1] * a + m[5] * b + m[9] * c, nz = m[2] * a + m[6] * b + m[10] * c;
          const l = Math.hypot(nx, ny, nz) || 1;
          nrm.push(nx / l, ny / l, nz / l);
          col.push(rgb[0], rgb[1], rgb[2]);
        }
        const arr = groups[key] || (groups[key] = []);
        I.forEach(function (i) { arr.push(base + i); });
      });
      const n = pos.length / 3;
      if (n > 65535) throw new Error('uchlar juda ko\'p: ' + f + ' / ' + nd.name);
      const idx = [], gr = [];
      Object.keys(groups).forEach(function (k) { gr.push([idx.length, groups[k].length, k]); Array.prototype.push.apply(idx, groups[k]); });
      tris += idx.length / 3;
      // siqish: pozitsiya Int16 (qs — masshtab, metr), normal Int8
      let qs = 0;
      for (let i = 0; i < pos.length; i++) qs = Math.max(qs, Math.abs(pos[i]));
      qs = qs || 1;
      const qp = new Int16Array(pos.length), qn = new Int8Array(nrm.length);
      for (let i = 0; i < pos.length; i++) qp[i] = Math.round(pos[i] / qs * 32767);
      for (let i = 0; i < nrm.length; i++) qn[i] = Math.round(nrm[i] * 127);
      const part = {
        node: nd.name, t: [m[12], m[13], m[14]].map(function (v) { return +v.toFixed(4); }), n: n, qs: qs,
        pos: push(qp), nrm: push(qn), idx: push(new Uint16Array(idx)), ic: idx.length, g: gr
      };
      if (hasVc) part.col = push(new Uint8Array(col));
      parts.push(part);
    }
    (nd.children || []).forEach(function (c) { walk(c, m); });
  }
  g.json.scenes[g.json.scene || 0].nodes.forEach(function (ni) { walk(ni, I4); });
  const name = 'b/' + f.replace(/\.glb$/i, '');
  header.models[name] = parts;
  console.log(name + ': ' + parts.map(function (p) { return p.node; }).join(', ') + ' — ' + tris + ' uchburchak');
});

const hjson = Buffer.from(JSON.stringify(header));
const hpad = (4 - ((4 + hjson.length) % 4)) % 4;
const hlen = Buffer.alloc(4); hlen.writeUInt32LE(hjson.length + hpad, 0);
const raw = Buffer.concat([hlen, hjson, Buffer.alloc(hpad, 0x20)].concat(chunks));
const gz = zlib.gzipSync(raw, { level: 9 });
fs.writeFileSync(path.join(OUT, 'blender.pack.gz'), gz);
console.log(Object.keys(header.models).length + ' ta model, ' + (raw.length / 1024).toFixed(0) + ' KB -> ' + (gz.length / 1024).toFixed(0) + ' KB');
