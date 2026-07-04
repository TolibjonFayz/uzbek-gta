import * as THREE from 'three';
import { buildWorld } from './world.js';
import { buildNetwork } from './network.js';
import { setColliders } from './physics.js';
import { TrafficManager } from './traffic.js';
import { PedManager } from './peds.js';
import { PoliceManager } from './police.js';
import { Player } from './player.js';
import { Hud } from './hud.js';
import { GameAudio } from './audio.js';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe8a7bf, 260, 1250);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 4000);
camera.position.set(650, 4, 95);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// Botayotgan quyosh yorug'ligi
scene.add(new THREE.HemisphereLight(0xffc7dd, 0x55606b, 0.85));
const sun = new THREE.DirectionalLight(0xffd2a0, 1.6);
sun.position.set(-350, 260, 120);
scene.add(sun);
scene.add(new THREE.AmbientLight(0x604858, 0.5));

// Dunyo
const world = buildWorld(scene);
setColliders(world.colliders);
const net = buildNetwork();

const registry = [];   // barcha transport vositalari
const hud = new Hud();
const audio = new GameAudio();

const traffic = new TrafficManager(scene, net, registry, { cars: 24, motos: 6, parked: 10 });
const peds = new PedManager(scene, net, 34);
const player = new Player(scene, net, registry, hud, audio);
const police = new PoliceManager(scene, net, registry, peds, hud, audio);

player.traffic = traffic;
player.police = police;
player.peds = peds;

// Debug uchun
window.game = { player, police, traffic, peds, registry, net };

// O'yin sikli
const clock = new THREE.Clock();
let time = 0;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  time += dt;

  player.update(dt, camera);
  traffic.update(dt, player.mode === 'foot' ? player.getPos() : null);
  peds.update(dt, player.getPos(), player.currentSpeed());
  police.update(dt, player);
  hud.tick(player, police, time);
  audio.setEngine(player.mode === 'car' && !player.vehicle?.sinking,
    player.currentSpeed(), player.vehicle?.kind === 'moto');

  renderer.render(scene, camera);
}
loop();

// Boshlash ekrani
document.getElementById('playBtn').addEventListener('click', () => {
  audio.init();
  document.getElementById('start').classList.add('hidden');
  hud.message("Vice City UZga xush kelibsiz! Yonigizdagi oq Cobaltga F bilan o'tiring 😎", 5000);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
