/* ============================================================
   SuvisPlant — Scène Three.js du Strelitzia (strelitzia.html)

   Modèle procédural stylisé (aucun asset externe), calé sur une
   photo de référence d'un Strelitzia reginae adulte : larges
   feuilles paddle à nervure centrale claire, pétioles striés de
   bordeaux à la base, spathes redressées et crête de sépales
   orange fournie autour de pétales bleu indigo.

   Chorégraphie : GSAP ScrollTrigger fait pivoter et déplacer la
   plante d'un côté à l'autre pour laisser la place aux fiches.
   Pour brancher un vrai modèle GLTF plus tard : remplacer la
   construction ci-dessous par le chargement du .glb et conserver
   la chorégraphie (steps/render) telle quelle.
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

/* ---------- Matériaux ---------- */
const MAT = {
  /* Feuilles : vert profond glacé (clearcoat léger = reflet du feuillage ciré) */
  leaf: (h) => new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#1f5233').offsetHSL(0, 0, h),
    roughness: 0.5, metalness: 0.04, clearcoat: 0.35, clearcoatRoughness: 0.35,
    side: THREE.DoubleSide,
  }),
  midrib: new THREE.MeshStandardMaterial({ color: '#b9d69c', roughness: 0.35, emissive: '#3c5327', emissiveIntensity: 0.3 }),
  stem: new THREE.MeshStandardMaterial({ color: '#3f6a42', roughness: 0.65 }),
  stemBlush: new THREE.MeshStandardMaterial({ color: '#7a2a2a', roughness: 0.6 }),
  spathe: new THREE.MeshStandardMaterial({ color: '#463726', roughness: 0.5 }),
  sepal: new THREE.MeshStandardMaterial({
    color: '#ff8c1f', roughness: 0.4, emissive: '#7a3200', emissiveIntensity: 0.4,
  }),
  petal: new THREE.MeshStandardMaterial({
    color: '#1f2f8f', roughness: 0.35, emissive: '#0b1240', emissiveIntensity: 0.35,
  }),
};

/* Limbe paddle : profil en sinus (large, épaules pleines, pointe et base arrondies) */
function makeBlade(len, wid, mat) {
  const N = 22;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const w = wid * 0.5 * Math.pow(Math.sin(Math.PI * t), 0.62);
    pts.push(new THREE.Vector2(w, t * len));
  }
  const shape = new THREE.Shape();
  shape.moveTo(pts[0].x, pts[0].y);
  pts.forEach((p) => shape.lineTo(p.x, p.y));
  for (let i = N; i >= 0; i--) shape.lineTo(-pts[i].x, pts[i].y);
  const g = new THREE.ShapeGeometry(shape, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    /* cintrage : gouttière le long de la nervure + retombée vers la pointe */
    pos.setZ(i, -Math.pow(y / len, 1.6) * len * 0.22 - Math.pow(Math.abs(x) / (wid * 0.5 || 1), 1.4) * 0.16);
  }
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

/* Nervure centrale claire, calée sur le même cintrage que le limbe */
function makeMidrib(len) {
  const pts = [];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const y = (i / N) * len;
    const z = -Math.pow(y / len, 1.6) * len * 0.22 + 0.006;
    pts.push(new THREE.Vector3(0, y, z));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 14, Math.max(len * 0.017, 0.009), 5), MAT.midrib);
}

/* Tige/pétiole courbé (tube) de la base vers (lean, h), avec liseré bordeaux */
function makeStalk(lean, h, jz, radius) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.sin(lean) * h * 0.35, h * 0.55, jz * 0.5),
    new THREE.Vector3(Math.sin(lean) * h * 0.95, h, jz),
  ]);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, radius, 6), MAT.stem));
  /* Liseré bordeaux : fin ruban sur le premier tiers, comme la base rougie du pétiole */
  const blushCurve = new THREE.CatmullRomCurve3([
    curve.getPoint(0), curve.getPoint(0.18), curve.getPoint(0.4),
  ]);
  const blush = new THREE.Mesh(new THREE.TubeGeometry(blushCurve, 8, radius * 1.02, 6), MAT.stemBlush);
  group.add(blush);
  return { mesh: group, tip: curve.getPoint(1) };
}

const plant = new THREE.Group();
const leafPivots = [];

/* Feuilles distiques : grandes paddles en éventail, moitié miroir */
const LEAVES = [
  { lean: 0.60, h: 1.10, len: 1.30, wid: 0.72, yaw: -0.16, mirror: false, tint: 0.00 },
  { lean: 0.52, h: 1.25, len: 1.42, wid: 0.78, yaw: 0.20, mirror: true, tint: 0.03 },
  { lean: 0.32, h: 1.42, len: 1.55, wid: 0.85, yaw: -0.28, mirror: false, tint: -0.02 },
  { lean: 0.28, h: 1.38, len: 1.50, wid: 0.82, yaw: 0.32, mirror: true, tint: 0.05 },
  { lean: 0.80, h: 0.92, len: 1.05, wid: 0.62, yaw: 0.10, mirror: false, tint: -0.04 },
  { lean: 0.86, h: 0.88, len: 1.00, wid: 0.60, yaw: -0.12, mirror: true, tint: 0.02 },
  { lean: 0.14, h: 1.55, len: 1.62, wid: 0.86, yaw: 0.05, mirror: false, tint: 0.01 },
];
LEAVES.forEach((L, i) => {
  const pivot = new THREE.Group();
  const jz = (i % 2 ? -1 : 1) * 0.06;
  const { mesh: stalk, tip } = makeStalk(L.lean, L.h, jz, 0.026);
  pivot.add(stalk);
  const blade = makeBlade(L.len, L.wid, MAT.leaf(L.tint));
  blade.position.copy(tip);
  blade.rotation.z = -L.lean * 1.15;
  blade.rotation.y = L.yaw;
  pivot.add(blade);
  const midrib = makeMidrib(L.len);
  midrib.position.copy(blade.position);
  midrib.rotation.copy(blade.rotation);
  pivot.add(midrib);
  if (L.mirror) pivot.rotation.y = Math.PI;
  pivot.rotation.y += (i % 2 ? -1 : 1) * 0.12;
  pivot.userData.phase = i * 1.7;
  plant.add(pivot);
  leafPivots.push(pivot);
});

/* Hampe + fleur : bec redressé, crête orange fournie, pétales indigo nichés */
function buildFlower(scale, sepalAngles) {
  const flower = new THREE.Group();

  const spathe = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.82 * scale, 10), MAT.spathe);
  spathe.rotation.z = -Math.PI / 2 + 0.58;   // bec redressé (~33° au-dessus de l'horizontale)
  spathe.scale.z = 0.48;
  spathe.position.set(0.22 * scale, 0.05 * scale, 0);
  flower.add(spathe);

  sepalAngles.forEach(([px, rz], j) => {
    const sepal = new THREE.Mesh(new THREE.ConeGeometry(0.045 * scale, 0.9 * scale, 6), MAT.sepal);
    sepal.geometry.translate(0, 0.45 * scale, 0);
    sepal.position.set(px * scale, 0.04 * scale, (j % 2 ? -0.03 : 0.03) * scale);
    sepal.rotation.z = rz;
    sepal.rotation.x = (j % 2 ? -0.09 : 0.09);
    sepal.scale.z = 0.42;
    flower.add(sepal);
  });

  [[0.16, -0.78, 0.035], [0.20, -0.92, -0.035]].forEach(([px, rz, pz]) => {
    const petal = new THREE.Mesh(new THREE.ConeGeometry(0.038 * scale, 0.56 * scale, 6), MAT.petal);
    petal.geometry.translate(0, 0.28 * scale, 0);
    petal.position.set(px * scale, 0.03 * scale, pz * scale);
    petal.rotation.z = rz;
    petal.scale.z = 0.48;
    flower.add(petal);
  });

  return flower;
}

const MAIN_SEPALS = [[0.02, -0.18], [0.10, -0.52], [0.17, -0.86], [0.23, -1.16], [0.28, -1.42]];
const { mesh: flowerStalk, tip: flowerTip } = makeStalk(0.16, 2.05, 0.04, 0.032);
plant.add(flowerStalk);
const flower = buildFlower(1, MAIN_SEPALS);
flower.position.copy(flowerTip);
flower.rotation.z = -0.06;
plant.add(flower);

/* Seconde inflorescence, plus courte et décalée sur le côté dégagé, pour une touffe plus fournie */
const SECOND_SEPALS = [[0.02, -0.16], [0.09, -0.48], [0.15, -0.80], [0.20, -1.06]];
const { mesh: flowerStalk2, tip: flowerTip2 } = makeStalk(-0.55, 1.5, 0.22, 0.026);
plant.add(flowerStalk2);
const flower2 = buildFlower(0.78, SECOND_SEPALS);
flower2.position.copy(flowerTip2);
flower2.rotation.z = 0.08;
flower2.rotation.y = -0.35;
plant.add(flower2);

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
plant.add(makeRing(1.55, 1.565, 0.3));
plant.add(makeRing(1.86, 1.868, 0.12));

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
