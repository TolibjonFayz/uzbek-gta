// Kenney GLB modellarini bitta ixcham, siqilgan faylga aylantirish.
// Ishlatish:  node tools/pack-models.js <kenney_yuklab_olingan_papka>
//   papka ichida: car-kit/, city-commercial/, city-suburban/ (kenney.nl zip'lari ochilgan holda)
// Natija: assets/models/kenney.pack.gz + colormap PNG'lar + LICENSE
//
// GLB'ni brauzerda emas, shu yerda o'qiymiz: tugun transformatsiyalari geometriyaga
// "pishiriladi", teksturalar/materiallar tashlanadi (o'yin o'zining materialini beradi).
// Brauzerga faqat toza massivlar boradi -> GLTFLoader kerak emas.
//
// Format (gzip ichida): [uint32 headerLen][header JSON][binar blok]
//   header = { models: { 'car/sedan': [ { node, t:[x,y,z], n, pos, nrm, uv, idx, ic } ] } }
//   pos/nrm/uv/idx — binar blokdagi bayt offsetlari; n — uchlar soni; ic — indekslar soni (uint16)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SRC = process.argv[2];
if (!SRC) { console.error("Kenney papkasini ko'rsating"); process.exit(1); }
const OUT = path.join(__dirname, '..', 'assets', 'models');
fs.mkdirSync(OUT, { recursive: true });

const KITS = {
  car: { dir: 'car-kit', files: ['sedan', 'sedan-sports', 'hatchback-sports', 'suv', 'suv-luxury', 'van', 'police', 'taxi', 'debris-bumper'] },
  city: { dir: 'city-commercial', files: [
    'building-a', 'building-b', 'building-c', 'building-d', 'building-e', 'building-f', 'building-g',
    'building-h', 'building-i', 'building-j', 'building-k', 'building-l', 'building-m', 'building-n',
    'building-skyscraper-a', 'building-skyscraper-b', 'building-skyscraper-c', 'building-skyscraper-d', 'building-skyscraper-e'] },
  sub: { dir: 'city-suburban', files: 'abcdefghijklmnopqrstu'.split('').map(function (c) { return 'building-type-' + c; }) }
};

// ---- 4x4 matritsa (ustun-asosiy, glTF kabi) ----
function trs(t, r, s) {
  const x = r ? r[0] : 0, y = r ? r[1] : 0, z = r ? r[2] : 0, w = r ? r[3] : 1;
  const S = s || [1, 1, 1], T = t || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * S[0], (2 * (x * y + z * w)) * S[0], (2 * (x * z - y * w)) * S[0], 0,
    (2 * (x * y - z * w)) * S[1], (1 - 2 * (x * x + z * z)) * S[1], (2 * (y * z + x * w)) * S[1], 0,
    (2 * (x * z + y * w)) * S[2], (2 * (y * z - x * w)) * S[2], (1 - 2 * (x * x + y * y)) * S[2], 0,
    T[0], T[1], T[2], 1];
}
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function readGlb(file) {
  const b = fs.readFileSync(file);
  const jlen = b.readUInt32LE(12);
  const json = JSON.parse(b.slice(20, 20 + jlen).toString());
  const binOff = 20 + jlen + 8;
  const bin = b.slice(binOff, binOff + b.readUInt32LE(20 + jlen));
  function accessor(i) {
    const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
    const Ctor = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[a.componentType];
    const esize = Ctor.BYTES_PER_ELEMENT;
    const stride = bv.byteStride || comps * esize;
    const base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Ctor(a.count * comps);
    for (let e = 0; e < a.count; e++) {
      for (let c = 0; c < comps; c++) {
        const off = base + e * stride + c * esize;
        out[e * comps + c] = esize === 4 ? (Ctor === Float32Array ? bin.readFloatLE(off) : bin.readUInt32LE(off))
          : esize === 2 ? bin.readUInt16LE(off) : bin.readUInt8(off);
      }
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
  chunks.push(buf);
  binLen += buf.length;
  const pad = (4 - (binLen % 4)) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); binLen += pad; }
  return off;
}

let totalTris = 0;
Object.keys(KITS).forEach(function (kit) {
  const k = KITS[kit];
  const glbDir = path.join(SRC, k.dir, 'Models', 'GLB format');
  k.files.forEach(function (f) {
    const g = readGlb(path.join(glbDir, f + '.glb'));
    const parts = [];
    function walk(ni, parentM) {
      const nd = g.json.nodes[ni];
      const m = mul(parentM, nd.matrix || trs(nd.translation, nd.rotation, nd.scale));
      if (nd.mesh !== undefined) {
        g.json.meshes[nd.mesh].primitives.forEach(function (p) {
          const P = g.accessor(p.attributes.POSITION);
          const N = g.accessor(p.attributes.NORMAL);
          const UV = g.accessor(p.attributes.TEXCOORD_0);
          let IDX = p.indices !== undefined ? g.accessor(p.indices) : null;
          const n = P.length / 3;
          const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
          for (let v = 0; v < n; v++) {
            const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
            pos[v * 3] = m[0] * x + m[4] * y + m[8] * z + m[12];
            pos[v * 3 + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
            pos[v * 3 + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
            const a = N[v * 3], b2 = N[v * 3 + 1], c = N[v * 3 + 2];
            let nx = m[0] * a + m[4] * b2 + m[8] * c, ny = m[1] * a + m[5] * b2 + m[9] * c, nz = m[2] * a + m[6] * b2 + m[10] * c;
            const l = Math.hypot(nx, ny, nz) || 1;
            nrm[v * 3] = nx / l; nrm[v * 3 + 1] = ny / l; nrm[v * 3 + 2] = nz / l;
          }
          if (!IDX) { IDX = new Uint16Array(n); for (let v = 0; v < n; v++) IDX[v] = v; }
          if (n > 65535) throw new Error('uchlar juda ko\'p: ' + f);
          const idx16 = new Uint16Array(IDX);
          totalTris += idx16.length / 3;
          parts.push({
            node: nd.name || ('mesh' + nd.mesh), t: [m[12], m[13], m[14]].map(function (v) { return +v.toFixed(4); }),
            n: n, pos: push(pos), nrm: push(nrm), uv: push(new Float32Array(UV)), idx: push(idx16), ic: idx16.length
          });
        });
      }
      (nd.children || []).forEach(function (c) { walk(c, m); });
    }
    g.json.scenes[g.json.scene || 0].nodes.forEach(function (ni) { walk(ni, I4); });
    header.models[kit + '/' + f] = parts;
  });
  fs.copyFileSync(path.join(glbDir, 'Textures', 'colormap.png'), path.join(OUT, 'colormap-' + kit + '.png'));
});

const hjson = Buffer.from(JSON.stringify(header));
const hpad = (4 - ((4 + hjson.length) % 4)) % 4; // binar blok 4 baytga tekislansin
const hlen = Buffer.alloc(4);
hlen.writeUInt32LE(hjson.length + hpad, 0);
const raw = Buffer.concat([hlen, hjson, Buffer.alloc(hpad, 0x20)].concat(chunks));
const gz = zlib.gzipSync(raw, { level: 9 });
fs.writeFileSync(path.join(OUT, 'kenney.pack.gz'), gz);
fs.copyFileSync(path.join(SRC, 'car-kit', 'License.txt'), path.join(OUT, 'LICENSE-Kenney-CC0.txt'));
console.log(Object.keys(header.models).length + ' ta model, ' + totalTris + ' uchburchak, xom ' +
  (raw.length / 1048576).toFixed(2) + ' MB -> siqilgan ' + (gz.length / 1048576).toFixed(2) + ' MB');
