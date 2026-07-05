/* ============================================================
   SuvisPlant — Scène Three.js du Strelitzia (strelitzia.html)

   Modèle procédural stylisé (aucun asset externe) : feuilles en
   éventail, hampe florale, spathe « bec » et crête de sépales
   orange / pétales bleus, posés sur un anneau HUD.

   Chorégraphie : GSAP ScrollTrigger fait pivoter et déplacer la
   plante d'un côté à l'autre pour laisser la place aux fiches.
   Pour brancher un vrai modèle GLTF plus tard : remplacer
   buildPlant() par le chargement du .glb et conserver le reste.
   ============================================================ */
import * as THREE from './vendor/three.module.min.js';

const canvas = document.getElementById('strelitzia-canvas');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Renderer / scène / caméra ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 60);
camera.position.set(0, 1.5, 7.2);
const camTarget = new THREE.Vector3(0, 1.15, 0);

/* ---------- Lumières (clé chaude + rim sauge + lueur florale) ---------- */
scene.add(new THREE.AmbientLight(0x4a5a4c, 0.5));
scene.add(new THREE.HemisphereLight(0xdff0e0, 0x0b0e0b, 0.55));
const key = new THREE.DirectionalLight(0xffe8cf, 1.25);
key.position.set(4, 5, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9cb58a, 0.9);
rim.position.set(-5, 3, -4);
scene.add(rim);
const glow = new THREE.PointLight(0xff9a3d, 0.4, 4);
glow.position.set(0.5, 2.4, 0.6);
scene.add(glow);

/* ---------- Construction procédurale de la plante ---------- */
const MAT = {
  leaf: (h) => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#2f5d40').offsetHSL(0, 0, h),
    roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide,
  }),
  stem: new THREE.MeshStandardMaterial({ color: '#3c6b4a', roughness: 0.7 }),
  spathe: new THREE.MeshStandardMaterial({ color: '#5d6252', roughness: 0.55 }),
  sepal: new THREE.MeshStandardMaterial({
    color: '#ef8f2f', roughness: 0.45, emissive: '#4a2404', emissiveIntensity: 0.35,
  }),
  petal: new THREE.MeshStandardMaterial({
    color: '#3f5fd8', roughness: 0.4, emissive: '#101c4a', emissiveIntensity: 0.3,
  }),
};

/* Limbe : ellipse allongée (ShapeGeometry) cintrée vers la pointe */
function makeBlade(len, wid, mat) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(wid * 0.62, len * 0.28, wid * 0.5, len * 0.58);
  s.quadraticCurveTo(wid * 0.34, len * 0.88, 0, len);
  s.quadraticCurveTo(-wid * 0.34, len * 0.88, -wid * 0.5, len * 0.58);
  s.quadraticCurveTo(-wid * 0.62, len * 0.28, 0, 0);
  const g = new THREE.ShapeGeometry(s, 14);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, -Math.pow(y / len, 1.7) * len * 0.28 - Math.abs(x) * 0.22);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/* Tige courbée (tube) de la base vers (lean, h) */
function makeStalk(lean, h, jz, radius) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.sin(lean) * h * 0.35, h * 0.55, jz * 0.5),
    new THREE.Vector3(Math.sin(lean) * h * 0.95, h, jz),
  ]);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, radius, 6), MAT.stem);
  return { mesh, tip: curve.getPoint(1) };
}

const plant = new THREE.Group();
const leafPivots = [];

/* Feuilles distiques : éventail dans le plan de l'écran, moitié miroir */
const LEAVES = [
  { lean: 0.62, h: 1.15, len: 1.35, wid: 0.52, yaw: -0.18, mirror: false, tint: 0.00 },
  { lean: 0.55, h: 1.30, len: 1.45, wid: 0.55, yaw: 0.22, mirror: true, tint: 0.03 },
  { lean: 0.34, h: 1.45, len: 1.55, wid: 0.58, yaw: -0.30, mirror: false, tint: -0.02 },
  { lean: 0.30, h: 1.40, len: 1.50, wid: 0.55, yaw: 0.35, mirror: true, tint: 0.05 },
  { lean: 0.82, h: 0.95, len: 1.10, wid: 0.46, yaw: 0.10, mirror: false, tint: -0.04 },
  { lean: 0.88, h: 0.90, len: 1.05, wid: 0.44, yaw: -0.12, mirror: true, tint: 0.02 },
];
LEAVES.forEach((L, i) => {
  const pivot = new THREE.Group();
  const jz = (i % 2 ? -1 : 1) * 0.06;
  const { mesh: stalk, tip } = makeStalk(L.lean, L.h, jz, 0.024);
  pivot.add(stalk);
  const blade = makeBlade(L.len, L.wid, MAT.leaf(L.tint));
  blade.position.copy(tip);
  blade.rotation.z = -L.lean * 1.15;
  blade.rotation.y = L.yaw;
  pivot.add(blade);
  if (L.mirror) pivot.rotation.y = Math.PI;
  pivot.rotation.y += (i % 2 ? -1 : 1) * 0.12;
  pivot.userData.phase = i * 1.7;
  pivot.userData.baseZ = 0;
  plant.add(pivot);
  leafPivots.push(pivot);
});

/* Hampe florale + fleur (spathe, crête orange, pétales bleus) */
const { mesh: flowerStalk, tip: flowerTip } = makeStalk(0.14, 2.05, 0.04, 0.03);
plant.add(flowerStalk);

const flower = new THREE.Group();
flower.position.copy(flowerTip);
flower.rotation.z = -0.1;

const spathe = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.88, 10), MAT.spathe);
spathe.rotation.z = -Math.PI / 2 + 0.12;   // bec quasi horizontal, pointe légèrement relevée
spathe.scale.z = 0.5;
spathe.position.set(0.36, 0.04, 0);
flower.add(spathe);

/* Crête : sépales orange en éventail au-dessus du bec */
[[0.02, -0.10], [0.13, -0.42], [0.24, -0.72], [0.34, -0.98]].forEach(([px, rz], j) => {
  const sepal = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.95, 6), MAT.sepal);
  sepal.geometry.translate(0, 0.475, 0);   // pivote depuis la base
  sepal.position.set(px, 0.03, (j % 2 ? -0.025 : 0.025));
  sepal.rotation.z = rz;
  sepal.rotation.x = (j % 2 ? -0.08 : 0.08);
  sepal.scale.z = 0.45;
  flower.add(sepal);
});
/* Pétales bleus (la « flèche ») */
[[0.16, -0.5, 0.03], [0.2, -0.62, -0.03]].forEach(([px, rz, pz]) => {
  const petal = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.6, 6), MAT.petal);
  petal.geometry.translate(0, 0.3, 0);
  petal.position.set(px, 0.02, pz);
  petal.rotation.z = rz;
  petal.scale.z = 0.5;
  flower.add(petal);
});
plant.add(flower);

/* Anneaux HUD au sol : écho « nature-tech » de l'interface */
function makeRing(rIn, rOut, opacity) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(rIn, rOut, 72),
    new THREE.MeshBasicMaterial({ color: 0x9cb58a, transparent: true, opacity })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.005;
  return ring;
}
plant.add(makeRing(1.42, 1.435, 0.3));
plant.add(makeRing(1.72, 1.727, 0.12));

const isDesktop = () => window.innerWidth >= 768;
plant.position.x = isDesktop() ? 0.9 : 0;
scene.add(plant);

/* ---------- Chorégraphie au scroll (une étape par fiche) ---------- */
/* Chaque section déclenche, en scrub, le déplacement de la plante vers
   le côté opposé à la fiche + un quart de tour environ. */
const sideX = (dir) => () => (isDesktop() ? dir * 1.75 : 0);
const steps = [
  { sel: '[data-panel-index="1"]', x: sideX(1), ry: 1.15 },
  { sel: '[data-panel-index="2"]', x: sideX(-1), ry: 2.35 },
  { sel: '[data-panel-index="3"]', x: sideX(1), ry: 3.55 },
];
steps.forEach((s) => {
  const st = { trigger: s.sel, start: 'top bottom', end: 'center center', scrub: 1, invalidateOnRefresh: true };
  gsap.to(plant.position, { x: s.x, immediateRender: false, ease: 'none', scrollTrigger: st });
  gsap.to(plant.rotation, { y: s.ry, immediateRender: false, ease: 'none', scrollTrigger: { ...st } });
});
/* Final : retour au centre, caméra qui recule */
const ctaST = { trigger: '[data-gsap-section="cta"]', start: 'top bottom', end: 'center center', scrub: 1, invalidateOnRefresh: true };
gsap.to(plant.position, { x: 0, immediateRender: false, ease: 'none', scrollTrigger: ctaST });
gsap.to(plant.rotation, { y: 4.8, immediateRender: false, ease: 'none', scrollTrigger: { ...ctaST } });
gsap.to(camera.position, { z: 8.6, y: 1.9, immediateRender: false, ease: 'none', scrollTrigger: { ...ctaST } });

/* ---------- Parallaxe souris + balancement organique ---------- */
const mouse = { x: 0, y: 0 };
if (!prefersReducedMotion) {
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}

const camOffset = { x: 0, y: 0 };
function render(time) {
  const t = time * 0.001;
  if (!prefersReducedMotion) {
    plant.rotation.z = Math.sin(t * 0.5) * 0.018;
    leafPivots.forEach((p) => {
      p.rotation.z = Math.sin(t * 0.7 + p.userData.phase) * 0.022;
    });
    camOffset.x += (mouse.x * 0.28 - camOffset.x) * 0.04;
    camOffset.y += (-mouse.y * 0.18 - camOffset.y) * 0.04;
  }
  camera.position.x = camOffset.x;
  camera.lookAt(camTarget);
  renderer.render(scene, camera);
}
/* Un seul RAF pour tout : le ticker GSAP pilote aussi Lenis (cf. strelitzia.html) */
gsap.ticker.add((time) => render(time * 1000));

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
