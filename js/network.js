import { H_ROADS, WEST_V, EAST_V, BRIDGE_Z } from './config.js';
import { pick } from './utils.js';

// Yo'llar grafigi: transport va piyodalar shu tarmoq bo'ylab yuradi
export function buildNetwork() {
  const map = new Map();
  const node = (x, z) => {
    const k = x + '|' + z;
    if (!map.has(k)) map.set(k, { x, z, nbs: [] });
    return map.get(k);
  };
  const link = (a, b) => { a.nbs.push(b); b.nbs.push(a); };
  for (const vs of [WEST_V, EAST_V]) {
    for (const x of vs)
      for (let i = 0; i < H_ROADS.length - 1; i++)
        link(node(x, H_ROADS[i]), node(x, H_ROADS[i + 1]));
    for (const z of H_ROADS)
      for (let i = 0; i < vs.length - 1; i++)
        link(node(vs[i], z), node(vs[i + 1], z));
  }
  for (const z of BRIDGE_Z) link(node(WEST_V[2], z), node(EAST_V[0], z));
  return { nodes: [...map.values()] };
}

export function randomNode(net) { return pick(net.nodes); }

export function nextNode(cur, prev) {
  const opts = cur.nbs.filter((n) => n !== prev);
  return opts.length ? pick(opts) : prev;
}

export function nearestNode(net, x, z) {
  let best = null, bd = Infinity;
  for (const n of net.nodes) {
    const d = (n.x - x) ** 2 + (n.z - z) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
