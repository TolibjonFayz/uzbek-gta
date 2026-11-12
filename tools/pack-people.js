// Quaternius "Ultimate Modular Men/Women" odamlarini o'yin uchun bo'lak-bo'lak (rigid) modellarga aylantirish.
// Ishlatish:  node tools/pack-people.js <Men glTF papka> <Women glTF papka>
//   (Drive zip'lari ichida: "Individual Characters/glTF")
// Natija: assets/models/people.pack.gz
//
// Nima qilinadi:
//  1) har model "Idle" animatsiyasining 0-kadridagi pozaga keltiriladi (CPU skinning shu yerda);
//  2) har uchburchak eng kuchli bog'langan suyagiga qarab 5 bo'lakka bo'linadi:
//     body (tana+bosh), legL, legR, armL, armR — o'yindagi odam "pivot"lari bilan bir xil;
//  3) material ranglari uchlarga (vertex color) yoziladi -> har bo'lak bitta draw call;
//  4) bo'yi 1.72 m ga keltiriladi, oyoq tagi y=0, yuzi +Z tomonga.
// Format (gzip): [uint32 headerLen][header JSON][binar]
//   header.people = [{ name, female, pivots: {legL:[x,y,z],...}, parts: { body: {n,pos,nrm,col,idx,ic}, ... } }]
//   pos: Int16 (x/8000 m), nrm: Int8 (x/127), col: Uint8 RGB, idx: Uint16
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const MEN = process.argv[2], WOMEN = process.argv[3];
if (!MEN || !WOMEN) { console.error('Ishlatish: node tools/pack-people.js <Men glTF> <Women glTF>'); process.exit(1); }
const OUT = path.join(__dirname, '..', 'assets', 'models');

const LIST = [
  [MEN, 'Casual_2', false], [MEN, 'Casual_Hoodie', false], [MEN, 'Suit', false], [MEN, 'Worker', false],
  [MEN, 'Farmer', false], [MEN, 'Beach', false],
  [WOMEN, 'Casual', true], [WOMEN, 'Formal', true], [WOMEN, 'Suit', true], [WOMEN, 'Worker', true]
];
const SKIP_MESH = /Pistol|Gun|Sword|Rifle|Knife|Axe|Shield|Bow|Wand|Staff/i;
const HEIGHT = 1.72;

// ---- matritsa yordamchilari (ustun-asosiy) ----
function trs(t, r, s) {
  const x = r[0], y = r[1], z = r[2], w = r[3];
  return [(1 - 2 * (y * y + z * z)) * s[0], (2 * (x * y + z * w)) * s[0], (2 * (x * z - y * w)) * s[0], 0,
    (2 * (x * y - z * w)) * s[1], (1 - 2 * (x * x + z * z)) * s[1], (2 * (y * z + x * w)) * s[1], 0,
    (2 * (x * z + y * w)) * s[2], (2 * (y * z - x * w)) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1];
}
function mul(a, b) {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
const I4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const srgb = function (c) { return Math.round(255 * Math.pow(Math.min(1, Math.max(0, c)), 1 / 2.2)); };

function partOf(jointName) {
  if (/^(UpperLeg|LowerLeg|Foot|PT)\.L$/.test(jointName)) return 'legL';
  if (/^(UpperLeg|LowerLeg|Foot|PT)\.R$/.test(jointName)) return 'legR';
  if (/\.L$/.test(jointName) && !/^Shoulder/.test(jointName)) return 'armL';
  if (/\.R$/.test(jointName) && !/^Shoulder/.test(jointName)) return 'armR';
  return 'body';
}

const header = { people: [] };
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

let totalTris = 0;
LIST.forEach(function (item) {
  const file = path.join(item[0], item[1] + '.gltf');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const bins = j.buffers.map(function (b) {
    if (/^data:/.test(b.uri)) return Buffer.from(b.uri.split(',')[1], 'base64');
    return fs.readFileSync(path.join(item[0], decodeURIComponent(b.uri)));
  });
  function acc(i) {
    const a = j.accessors[i], bv = j.bufferViews[a.bufferView], bin = bins[bv.buffer];
    const comps = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[a.type];
    const es = { 5126: 4, 5123: 2, 5125: 4, 5121: 1 }[a.componentType];
    const stride = bv.byteStride || comps * es, base = (bv.byteOffset || 0) + (a.byteOffset || 0);
    const out = new Array(a.count * comps);
    for (let e = 0; e < a.count; e++) for (let c = 0; c < comps; c++) {
      const off = base + e * stride + c * es;
      let v = a.componentType === 5126 ? bin.readFloatLE(off) : es === 4 ? bin.readUInt32LE(off) : es === 2 ? bin.readUInt16LE(off) : bin.readUInt8(off);
      if (a.normalized && a.componentType === 5121) v /= 255;
      if (a.normalized && a.componentType === 5123) v /= 65535;
      out[e * comps + c] = v;
    }
    return out;
  }

  // ---- poza: Idle animatsiyasining 0-kadri ----
  const local = j.nodes.map(function (n) {
    return { t: (n.translation || [0, 0, 0]).slice(), r: (n.rotation || [0, 0, 0, 1]).slice(), s: (n.scale || [1, 1, 1]).slice(), m: n.matrix };
  });
  const anim = (j.animations || []).find(function (a) { return a.name === 'Idle'; }) || (j.animations || [])[0];
  if (anim) {
    anim.channels.forEach(function (ch) {
      const smp = anim.samplers[ch.sampler];
      const out = acc(smp.output);
      const key = { translation: 't', rotation: 'r', scale: 's' }[ch.target.path];
      if (!key) return;
      const n = key === 'r' ? 4 : 3;
      local[ch.target.node][key] = out.slice(0, n);
    });
  }
  const parent = new Array(j.nodes.length).fill(-1);
  j.nodes.forEach(function (n, i) { (n.children || []).forEach(function (c) { parent[c] = i; }); });
  const world = new Array(j.nodes.length);
  function worldOf(i) {
    if (world[i]) return world[i];
    const L = local[i].m || trs(local[i].t, local[i].r, local[i].s);
    world[i] = parent[i] >= 0 ? mul(worldOf(parent[i]), L) : L;
    return world[i];
  }

  const skin = j.skins[0];
  const IBM = acc(skin.inverseBindMatrices);
  const jointNames = skin.joints.map(function (ji) { return j.nodes[ji].name; });
  const skinMats = skin.joints.map(function (ji, k) { return mul(worldOf(ji), IBM.slice(k * 16, k * 16 + 16)); });
  const jointPos = {};
  skin.joints.forEach(function (ji) { const w = worldOf(ji); jointPos[j.nodes[ji].name] = [w[12], w[13], w[14]]; });

  const parts = { body: [], legL: [], legR: [], armL: [], armR: [] }; // har biri: [{p:[..],n:[..],c:[..]} x3] uchburchaklar
  let minY = 1e9, maxY = -1e9, eyeZ = 0, eyeN = 0, headZ = 0, headN = 0;
  j.nodes.forEach(function (nd) {
    if (nd.mesh === undefined || nd.skin === undefined || SKIP_MESH.test(nd.name || '')) return;
    j.meshes[nd.mesh].primitives.forEach(function (p) {
      const P = acc(p.attributes.POSITION), N = acc(p.attributes.NORMAL);
      const J = acc(p.attributes.JOINTS_0), W = acc(p.attributes.WEIGHTS_0);
      const I = acc(p.indices);
      const mat = j.materials[p.material] || {};
      const bc = (mat.pbrMetallicRoughness && mat.pbrMetallicRoughness.baseColorFactor) || [0.6, 0.6, 0.6, 1];
      const col = [srgb(bc[0]), srgb(bc[1]), srgb(bc[2])];
      const isEye = /^Eye$/i.test(mat.name || '');
      const nv = P.length / 3;
      const vp = new Array(nv), vn = new Array(nv), vpart = new Array(nv);
      for (let v = 0; v < nv; v++) {
        let x = 0, y = 0, z = 0, a = 0, b = 0, c = 0, best = -1, bw = -1;
        for (let k = 0; k < 4; k++) {
          const w = W[v * 4 + k]; if (w <= 0) continue;
          const jIdx = J[v * 4 + k], m = skinMats[jIdx];
          const px = P[v * 3], py = P[v * 3 + 1], pz = P[v * 3 + 2];
          x += w * (m[0] * px + m[4] * py + m[8] * pz + m[12]);
          y += w * (m[1] * px + m[5] * py + m[9] * pz + m[13]);
          z += w * (m[2] * px + m[6] * py + m[10] * pz + m[14]);
          const nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
          a += w * (m[0] * nx + m[4] * ny + m[8] * nz);
          b += w * (m[1] * nx + m[5] * ny + m[9] * nz);
          c += w * (m[2] * nx + m[6] * ny + m[10] * nz);
          if (w > bw) { bw = w; best = jIdx; }
        }
        const l = Math.hypot(a, b, c) || 1;
        vp[v] = [x, y, z]; vn[v] = [a / l, b / l, c / l];
        vpart[v] = partOf(jointNames[best]);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        if (isEye) { eyeZ += z; eyeN++; }
        if (jointNames[best] === 'Head') { headZ += z; headN++; }
      }
      for (let t = 0; t < I.length; t += 3) {
        // uchburchak — ko'pchilik uchlarining bo'lagiga
        const ps = [vpart[I[t]], vpart[I[t + 1]], vpart[I[t + 2]]];
        const part = ps[1] === ps[2] ? ps[1] : ps[0];
        parts[part].push([0, 1, 2].map(function (q) { const v = I[t + q]; return { p: vp[v], n: vn[v], c: col }; }));
      }
    });
  });

  // yuz yo'nalishi: ko'zlar boshning oldida bo'lishi kerak (+Z)
  const flip = eyeN && headN && (eyeZ / eyeN) < (headZ / headN) ? -1 : 1;
  const sc = HEIGHT / (maxY - minY);
  function tf(p) { return [p[0] * sc * flip, (p[1] - minY) * sc, p[2] * sc * flip]; }
  const pivots = {
    legL: tf(jointPos['UpperLeg.L']), legR: tf(jointPos['UpperLeg.R']),
    armL: tf(jointPos['UpperArm.L']), armR: tf(jointPos['UpperArm.R'])
  };
  // o'yinda legL — chap (-X) tomonda; kerak bo'lsa nomlarni almashtiramiz
  if (pivots.legL[0] > pivots.legR[0]) {
    const sw = function (a, b) { const t = parts[a]; parts[a] = parts[b]; parts[b] = t; const u = pivots[a]; pivots[a] = pivots[b]; pivots[b] = u; };
    sw('legL', 'legR'); sw('armL', 'armR');
  }

  const out = { name: item[1], female: item[2], pivots: pivots, parts: {} };
  Object.keys(parts).forEach(function (k) {
    const piv = k === 'body' ? [0, 0, 0] : pivots[k];
    const pos = [], nrm = [], col = [], idx = [], map = {};
    parts[k].forEach(function (tri) {
      tri.forEach(function (v) {
        const p = tf(v.p);
        const nn = [v.n[0] * flip, v.n[1], v.n[2] * flip];
        const key = p.map(function (x) { return x.toFixed(4); }).join(',') + '|' + nn.map(function (x) { return x.toFixed(2); }).join(',') + '|' + v.c.join(',');
        let id = map[key];
        if (id === undefined) {
          id = map[key] = pos.length / 3;
          pos.push(p[0] - piv[0], p[1] - piv[1], p[2] - piv[2]);
          nrm.push(nn[0], nn[1], nn[2]);
          col.push(v.c[0], v.c[1], v.c[2]);
        }
        idx.push(id);
      });
    });
    totalTris += idx.length / 3;
    // kvantlash: pozitsiya Int16 (1/8000 m, ±4 m), normal Int8 — hajm ~2 barobar kichik
    const qp = new Int16Array(pos.map(function (v) { return Math.round(v * 8000); }));
    const qn = new Int8Array(nrm.map(function (v) { return Math.round(v * 127); }));
    out.parts[k] = { n: pos.length / 3, pos: push(qp), nrm: push(qn),
      col: push(new Uint8Array(col)), idx: push(new Uint16Array(idx)), ic: idx.length };
  });
  header.people.push(out);
});

const hjson = Buffer.from(JSON.stringify(header));
const hpad = (4 - ((4 + hjson.length) % 4)) % 4;
const hlen = Buffer.alloc(4); hlen.writeUInt32LE(hjson.length + hpad, 0);
const raw = Buffer.concat([hlen, hjson, Buffer.alloc(hpad, 0x20)].concat(chunks));
const gz = zlib.gzipSync(raw, { level: 9 });
fs.writeFileSync(path.join(OUT, 'people.pack.gz'), gz);
console.log(header.people.length + ' ta odam, ' + totalTris + ' uchburchak, ' +
  (raw.length / 1048576).toFixed(2) + ' MB -> ' + (gz.length / 1048576).toFixed(2) + ' MB');
header.people.forEach(function (p) { console.log('  ' + p.name + (p.female ? ' (ayol)' : '') + ' pivots ' + JSON.stringify(p.pivots, function (k, v) { return typeof v === 'number' ? +v.toFixed(2) : v; })); });
