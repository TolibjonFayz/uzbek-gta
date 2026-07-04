import { isOnLand } from './config.js';

let colliders = [];
export function setColliders(list) { colliders = list; }
export function getColliders() { return colliders; }

// pos (THREE.Vector3) binolardan tashqariga suriladi. Normal {x,z} yoki null qaytadi.
export function pushOut(pos, r) {
  let hit = null;
  for (const b of colliders) {
    if (pos.x < b.x1 - r || pos.x > b.x2 + r || pos.z < b.z1 - r || pos.z > b.z2 + r) continue;
    const cx = Math.max(b.x1, Math.min(pos.x, b.x2));
    const cz = Math.max(b.z1, Math.min(pos.z, b.z2));
    let dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 < 1e-9) {
      const dl = pos.x - (b.x1 - r), dr = (b.x2 + r) - pos.x;
      const dn = pos.z - (b.z1 - r), ds = (b.z2 + r) - pos.z;
      const m = Math.min(dl, dr, dn, ds);
      if (m === dl) { pos.x = b.x1 - r; hit = { x: -1, z: 0 }; }
      else if (m === dr) { pos.x = b.x2 + r; hit = { x: 1, z: 0 }; }
      else if (m === dn) { pos.z = b.z1 - r; hit = { x: 0, z: -1 }; }
      else { pos.z = b.z2 + r; hit = { x: 0, z: 1 }; }
    } else {
      const d = Math.sqrt(d2); dx /= d; dz /= d;
      pos.x = cx + dx * r; pos.z = cz + dz * r;
      hit = { x: dx, z: dz };
    }
  }
  return hit;
}

export { isOnLand };
