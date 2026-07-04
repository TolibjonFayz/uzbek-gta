import * as THREE from 'three';

export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function normAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
export function angleLerp(a, b, t) { return a + normAngle(b - a) * t; }

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

let _blobTex = null;
export function blobShadow(size) {
  if (!_blobTex) {
    _blobTex = canvasTexture(128, 128, (g) => {
      const r = g.createRadialGradient(64, 64, 10, 64, 64, 62);
      r.addColorStop(0, 'rgba(0,0,0,0.4)');
      r.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    });
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: _blobTex, transparent: true, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}

const _spriteCache = new Map();
export function phraseSprite(text) {
  let tex = _spriteCache.get(text);
  if (!tex) {
    const w = 256, h = 64;
    tex = canvasTexture(w, h, (g) => {
      g.fillStyle = 'rgba(10,10,16,0.75)';
      g.beginPath();
      g.roundRect(4, 8, w - 8, h - 16, 14);
      g.fill();
      g.fillStyle = '#fff';
      g.font = 'bold 21px Arial';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, w / 2, h / 2);
    });
    _spriteCache.set(text, tex);
  }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
  s.scale.set(3.6, 0.9, 1);
  return s;
}

export function mergeGeoms(geoms) {
  const pos = [], norm = [], uv = [];
  for (const g0 of geoms) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    pos.push(...g.attributes.position.array);
    norm.push(...g.attributes.normal.array);
    uv.push(...g.attributes.uv.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return out;
}

export function fmtSum(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
