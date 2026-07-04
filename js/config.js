// Vice City uslubidagi ikki orolli shahar xaritasi konstantalari
export const H_ROADS = [-750, -450, -150, 150, 450, 750];
export const WEST_V = [-700, -510, -290];
export const EAST_V = [300, 460, 610];
export const BRIDGE_Z = [-450, 150, 750];
export const ROAD_W = 14;
export const LANE = 3.3;
export const SIDEWALK_OFF = 8.6;

export const ISLANDS = [
  { x1: -760, x2: -250, z1: -820, z2: 820 },   // G'arbiy orol — markaz (downtown)
  { x1: 250,  x2: 660,  z1: -820, z2: 820 },   // Sharqiy orol — plyaj tomoni
];
export const BEACH = { x1: 660, x2: 745, z1: -820, z2: 820 };

export function isOnLand(x, z) {
  for (const r of ISLANDS) if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return true;
  if (x >= BEACH.x1 && x <= BEACH.x2 && z >= BEACH.z1 && z <= BEACH.z2) return true;
  for (const bz of BRIDGE_Z) if (x >= -292 && x <= 302 && z >= bz - 9 && z <= bz + 9) return true;
  return false;
}

export const CRIME_SCENES = [
  { x: 535, z: -40, amb: false },
  { x: -600, z: 320, amb: true },
  { x: 380, z: -640, amb: false },
];

// Bino qurilmaydigan joylar (jinoyat joylari, bozor, choyxona, parklar)
export const RESERVED = [
  ...CRIME_SCENES,
  { x: -600, z: -320 },  // Chorsu bozori
  { x: -390, z: -60 },   // Choyxona
  { x: 380, z: 300 },    // Park 1
  { x: -600, z: 600 },   // Park 2
];
