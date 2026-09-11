// 1. Persediaan Asas Scene, Kamera & Renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Keyboard input and camera-follow toggle
const keys = {};
let cameraFollow = true;
let personManualMode = false;
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  keys[e.code.toLowerCase()] = true;
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyR', 'KeyF', 'KeyI', 'KeyJ', 'KeyK', 'KeyL', 'KeyU', 'KeyO', 'KeyP'].includes(e.code)) {
    e.preventDefault();
  }
  
  // Toggle camera follow dengan 'c'
  if (e.key.toLowerCase() === 'c') cameraFollow = !cameraFollow;
  
  // 'P' TOGGLE: BANGUN ATAU TIDUR AUTOMATIK
  if (e.key.toLowerCase() === 'p' && !e.repeat) {
    if (personSleepState === 'sleeping' || personSleepState === 'walking_to_bed' || personSleepState === 'getting_into_bed') {
      // PROSES BANGUN DARI KATIL
      personSleepState = 'getting_up';
      personSleepTimer = 0;
      isSleepMode = false;
      playBloom = true;
      bloomLight.intensity = 0.6;
    } else {
      // PROSES BERJALAN & TIDUR DI KATIL
      personSleepState = 'walking_to_bed';
      personSleepTimer = 0;
      personManualMode = false;
    }
  }

  // Toggle manual control mode dengan 'm'
  if (e.key.toLowerCase() === 'm' && !e.repeat) {
    personManualMode = !personManualMode;
    if (personManualMode) {
      personSleepState = 'manual';
    }
  }

  // space toggles bloom play/pause
  if (e.key === ' ') { playBloom = !playBloom; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
window.addEventListener('keyup', (e) => { keys[e.code.toLowerCase()] = false; });

// 2. Pencahayaan Malam (Dim Bedroom Lighting)
const ambientLight = new THREE.AmbientLight(0x222244, 1.5);
scene.add(ambientLight);

// 3. Membina Dinding Bilik (Bounding Box untuk LiDAR) with colored faces
const roomGeometry = new THREE.BoxGeometry(28, 8, 22);
// create 6 materials for box faces: +X, -X, +Y, -Y, +Z, -Z (use BackSide so interior is visible)
const roomMaterials = [
  new THREE.MeshStandardMaterial({ color: 0xffefe6, side: THREE.BackSide }), // +X
  new THREE.MeshStandardMaterial({ color: 0xe8fff2, side: THREE.BackSide }), // -X
  new THREE.MeshStandardMaterial({ color: 0xf7f4ff, side: THREE.BackSide }), // +Y (ceiling)
  new THREE.MeshStandardMaterial({ color: 0xefeef8, side: THREE.BackSide }), // -Y (floor)
  new THREE.MeshStandardMaterial({ color: 0xfff1e8, side: THREE.BackSide }), // +Z
  new THREE.MeshStandardMaterial({ color: 0xe8f7ff, side: THREE.BackSide })  // -Z
];
const room = new THREE.Mesh(roomGeometry, roomMaterials);
scene.add(room);
// subtle ambient fixture for colored room
const roomLight = new THREE.HemisphereLight(0xfff5f0, 0x445566, 0.25);
scene.add(roomLight);

// --- Bedroom styling: rug, window and wall art -----------------
const rug = new THREE.Mesh(
  new THREE.BoxGeometry(7.5, 0.08, 5.0),
  new THREE.MeshStandardMaterial({ color: 0x2b4960, roughness: 0.95 })
);
rug.position.set(1.0, -3.92, 2.0);
scene.add(rug);

const rugTrim = new THREE.Mesh(
  new THREE.BoxGeometry(7.1, 0.09, 4.6),
  new THREE.MeshStandardMaterial({ color: 0xc58f5c, roughness: 0.9 })
);
rugTrim.position.set(1.0, -3.87, 2.0);
scene.add(rugTrim);

const windowFrame = new THREE.Group();
const windowGlass = new THREE.Mesh(
  new THREE.BoxGeometry(4.4, 2.4, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x6ea9bd, emissive: 0x163044, emissiveIntensity: 0.35 })
);
windowGlass.position.set(4.0, 0.0, -10.88);
windowFrame.add(windowGlass);
const windowBarMaterial = new THREE.MeshStandardMaterial({ color: 0xf0d6b5, roughness: 0.65 });
const windowBarVertical = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 0.14), windowBarMaterial);
windowBarVertical.position.set(4.0, 0.0, -10.82);
windowFrame.add(windowBarVertical);
const windowBarHorizontal = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.12, 0.14), windowBarMaterial);
windowBarHorizontal.position.set(4.0, 0.0, -10.82);
windowFrame.add(windowBarHorizontal);
scene.add(windowFrame);

const wallArt = new THREE.Mesh(
  new THREE.BoxGeometry(2.3, 1.5, 0.08),
  new THREE.MeshStandardMaterial({ color: 0xd99a72, roughness: 0.7 })
);
wallArt.position.set(-5.4, 0.5, -10.82);
scene.add(wallArt);
const wallArtInner = new THREE.Mesh(
  new THREE.BoxGeometry(1.85, 1.05, 0.1),
  new THREE.MeshStandardMaterial({ color: 0x7aa6a1, emissive: 0x122d2b, emissiveIntensity: 0.25 })
);
wallArtInner.position.set(-5.4, 0.5, -10.74);
scene.add(wallArtInner);

// --- Open-plan house zones: living room, work nook and kitchen island ---
const livingRug = new THREE.Mesh(
  new THREE.BoxGeometry(8.5, 0.08, 6.0),
  new THREE.MeshStandardMaterial({ color: 0x6b4f7b, roughness: 0.95 })
);
livingRug.position.set(8.0, -3.87, 3.0);
scene.add(livingRug);

const houseDivider = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 2.2, 9.0),
  new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 })
);
houseDivider.position.set(6.2, -2.8, -3.2);
scene.add(houseDivider);

const sofa = new THREE.Mesh(
  new THREE.BoxGeometry(4.2, 1.0, 1.5),
  new THREE.MeshStandardMaterial({ color: 0x365c6d, roughness: 0.9 })
);
sofa.position.set(9.0, -3.0, 6.2);
scene.add(sofa);

const kitchenIsland = new THREE.Mesh(
  new THREE.BoxGeometry(3.6, 1.2, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x9c6644, roughness: 0.75 })
);
kitchenIsland.position.set(9.0, -3.3, -5.8);
scene.add(kitchenIsland);

const workDesk = new THREE.Mesh(
  new THREE.BoxGeometry(3.0, 0.18, 1.2),
  new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 0.8 })
);
workDesk.position.set(-9.0, -1.8, 5.5);
scene.add(workDesk);
const deskScreen = new THREE.Mesh(
  new THREE.BoxGeometry(1.5, 0.9, 0.08),
  new THREE.MeshStandardMaterial({ color: 0x203c4a, emissive: 0x0c5861, emissiveIntensity: 0.6 })
);
deskScreen.position.set(-9.0, -0.9, 5.5);
scene.add(deskScreen);

// 4. Objek Halangan (Contoh: Katil & Perabot/Mainan)
const obstacles = [];

// Objek 1: Katil/Kotak
const boxGeo = new THREE.BoxGeometry(4, 2, 5);
const boxMat = new THREE.MeshLambertMaterial({ color: 0x444466 });
const box = new THREE.Mesh(boxGeo, boxMat);
box.position.set(-3, -3, -2);
scene.add(box);
obstacles.push(box);

// Objek 2: Silinder Mainan
const cylGeo = new THREE.CylinderGeometry(1, 1, 3, 16);
const cylMat = new THREE.MeshLambertMaterial({ color: 0x664444 });
const cyl = new THREE.Mesh(cylGeo, cylMat);
cyl.position.set(4, -2.5, 2);
scene.add(cyl);
obstacles.push(cyl);

// Objek 3: Katil atas (obstacle yang mencegah BloomBud menembusi dari atas)
const topBedGeo = new THREE.BoxGeometry(4.2, 1.0, 4.6);
const topBedMat = new THREE.MeshLambertMaterial({ color: 0x8b6d4b });
const topBed = new THREE.Mesh(topBedGeo, topBedMat);
topBed.position.set(0, 2.3, 0);
scene.add(topBed);
obstacles.push(topBed);

// Include dinding bilik dalam senarai pengesanan halangan
obstacles.push(room);

// Hazard obstacles (for AI perception) - exclude room walls
const hazardObstacles = [];  // will populate after adding all obstacles

// --- Simulated Ceiling Fan (Hazard) -----------------
const fanGroup = new THREE.Group();
fanGroup.position.set(0, 3.6, -2); // near ceiling

// Fan hub
const hubGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.2, 12);
const hubMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
const hub = new THREE.Mesh(hubGeo, hubMat);
hub.rotation.x = Math.PI / 2;
fanGroup.add(hub);

// Fan blades
const blades = new THREE.Group();
for (let b = 0; b < 4; b++) {
  const bladeGeo = new THREE.BoxGeometry(0.05, 0.02, 1.2);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  const blade = new THREE.Mesh(bladeGeo, bladeMat);
  blade.position.set(0, 0, 0.6);
  blade.rotation.y = (Math.PI / 2) * b;
  blade.userData = { isFanBlade: true, hazard: true };
  blades.add(blade);
}
fanGroup.add(blades);
scene.add(fanGroup);

// Ceiling plate and shaft (visible ceiling/fan mount)
const ceilingY = 4.0; // room top (half-height)
const ceilingThickness = 0.08;
const ceilingPlateGeo = new THREE.CylinderGeometry(1.6, 1.6, ceilingThickness, 32);
const ceilingPlateMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.1, roughness: 0.7 });
const ceilingPlate = new THREE.Mesh(ceilingPlateGeo, ceilingPlateMat);
ceilingPlate.position.set(fanGroup.position.x, ceilingY - ceilingThickness/2, fanGroup.position.z);
scene.add(ceilingPlate);

// Shaft from ceiling to fan hub
let shaft = null;
const shaftLength = ceilingPlate.position.y - fanGroup.position.y;
if (shaftLength > 0.05) {
  const shaftGeo = new THREE.CylinderGeometry(0.06, 0.06, shaftLength, 12);
  const shaftMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.6, roughness: 0.4 });
  shaft = new THREE.Mesh(shaftGeo, shaftMat);
  shaft.position.set(fanGroup.position.x, (ceilingPlate.position.y + fanGroup.position.y) / 2, fanGroup.position.z);
  scene.add(shaft);
}

// Add ceiling plate and shaft to obstacles so device avoids them
obstacles.push(ceilingPlate);
if (shaft) obstacles.push(shaft);

// Add fan hub/blades to obstacles so LiDAR can detect them
obstacles.push(hub);
blades.children.forEach(c => obstacles.push(c));

// Fan rotation speed (radians per frame)
let fanSpeed = 0.25;
// Optional: change fanSpeed dynamically to simulate different speeds
// -------------------------------------------------------------

// --- Bedside table, lamp and remote control -----------------
const bedsideTable = new THREE.Group();
const tableTop = new THREE.Mesh(
  new THREE.BoxGeometry(1.8, 0.16, 1.4),
  new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.75 })
);
tableTop.position.y = -1.35;
bedsideTable.add(tableTop);
const tableLegMaterial = new THREE.MeshStandardMaterial({ color: 0x51352a, roughness: 0.85 });
for (const x of [-0.7, 0.7]) {
  for (const z of [-0.5, 0.5]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), tableLegMaterial);
    leg.position.set(x, -2.55, z);
    bedsideTable.add(leg);
  }
}
bedsideTable.position.set(5.5, 0, -5.0);
scene.add(bedsideTable);

const lamp = new THREE.Group();
const lampStem = new THREE.Mesh(
  new THREE.CylinderGeometry(0.06, 0.06, 0.8, 12),
  new THREE.MeshStandardMaterial({ color: 0xc4a36a, metalness: 0.35 })
);
lampStem.position.y = 0.48;
lamp.add(lampStem);
const lampShade = new THREE.Mesh(
  new THREE.ConeGeometry(0.48, 0.5, 20, 1, true),
  new THREE.MeshStandardMaterial({ color: 0xf5c982, emissive: 0x6e3e16, emissiveIntensity: 0.45, side: THREE.DoubleSide })
);
lampShade.position.y = 0.98;
lamp.add(lampShade);
const lampLight = new THREE.PointLight(0xffb45c, 0.9, 4);
lampLight.position.y = 0.8;
lamp.add(lampLight);
lamp.position.set(5.5, -1.35, -5.0);
scene.add(lamp);

const remoteGroup = new THREE.Group();
const remoteBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.42, 0.12, 1.15),
  new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.55 })
);
remoteBody.userData = { isRemote: true };
remoteGroup.add(remoteBody);
const remoteButtonMaterial = new THREE.MeshStandardMaterial({ color: 0xf06a62, emissive: 0x501414, emissiveIntensity: 0.45 });
const remoteButton = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.035, 16), remoteButtonMaterial);
remoteButton.rotation.x = Math.PI / 2;
remoteButton.position.set(0, 0.075, -0.22);
remoteButton.userData = { isRemote: true };
remoteGroup.add(remoteButton);
remoteGroup.position.set(-3.0, -1.82, -1.5);
remoteGroup.rotation.y = -0.25;
scene.add(remoteGroup);

// A simple stylized person made from primitives; child meshes are LiDAR-visible.
const person = new THREE.Group();
const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xc98263, roughness: 0.8 });
const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0xe07a5f, roughness: 0.8 });
const trouserMaterial = new THREE.MeshStandardMaterial({ color: 0x315a78, roughness: 0.9 });
const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 14), skinMaterial);
head.position.y = 1.35;
person.add(head);
const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.5, 1.05, 16), shirtMaterial);
torso.position.y = 0.55;
person.add(torso);
for (const x of [-0.2, 0.2]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.9, 12), trouserMaterial);
  leg.position.set(x, -0.42, 0);
  person.add(leg);
}
for (const x of [-0.55, 0.55]) {
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.9, 12), skinMaterial);
  arm.position.set(x, 0.58, 0);
  arm.rotation.z = x < 0 ? -0.16 : 0.16;
  person.add(arm);
}
person.position.set(3.8, -2.95, 3.0);
person.scale.setScalar(1.35);
person.userData = { isPerson: true, hazard: true };
person.children.forEach(child => { child.userData.hazard = true; });
scene.add(person);

const defaultPersonPos = new THREE.Vector3(3.8, -2.95, 3.0);
person.position.copy(defaultPersonPos);
person.scale.setScalar(1.35);
person.userData = { isPerson: true, hazard: true };
person.children.forEach(child => { child.userData.hazard = true; });
scene.add(person);

const personFillLight = new THREE.PointLight(0xffc58a, 0.7, 4.5);
personFillLight.position.set(3.8, -0.9, 3.0);
scene.add(personFillLight);

let personSleepState = 'idle';
let personSleepTimer = 0;
const bedSleepPosition = new THREE.Vector3(-3.0, -1.35, -2.0);
const walkTarget = new THREE.Vector3(1.0, -2.95, 0.5);
let bloomFallStarted = false;
let bloomFallTimer = 0;
let bloomFallStart = null;
const bloomFallPosition = new THREE.Vector3(-0.25, -3.25, -2.0);
function updatePersonManual(dt) {
  const direction = new THREE.Vector3();
  if (keys['i'] || keys['keyi']) direction.z -= 1;
  if (keys['k'] || keys['keyk']) direction.z += 1;
  if (keys['j'] || keys['keyj']) direction.x -= 1;
  if (keys['l'] || keys['keyl']) direction.x += 1;
  if (direction.lengthSq() > 0) {
    direction.normalize();
    person.position.x += direction.x * 2.0 * dt;
    person.position.z += direction.z * 2.0 * dt;
    person.rotation.y = Math.atan2(direction.x, direction.z);
  }
  if (keys['u'] || keys['keyu']) person.position.y = Math.min(3.0, person.position.y + 1.2 * dt);
  if (keys['o'] || keys['keyo']) person.position.y = Math.max(-3.2, person.position.y - 1.2 * dt);
  person.position.x = THREE.MathUtils.clamp(person.position.x, -12.5, 12.5);
  person.position.z = THREE.MathUtils.clamp(person.position.z, -9.5, 9.5);
}

// Fungsi pergerakan manual (Kekunci I, J, K, L, U, O)
function updatePersonManual(dt) {
  const direction = new THREE.Vector3();
  if (keys['i'] || keys['keyi']) direction.z -= 1;
  if (keys['k'] || keys['keyk']) direction.z += 1;
  if (keys['j'] || keys['keyj']) direction.x -= 1;
  if (keys['l'] || keys['keyl']) direction.x += 1;
  if (direction.lengthSq() > 0) {
    direction.normalize();
    person.position.x += direction.x * 2.0 * dt;
    person.position.z += direction.z * 2.0 * dt;
    person.rotation.y = Math.atan2(direction.x, direction.z);
  }
  if (keys['u'] || keys['keyu']) person.position.y = Math.min(3.0, person.position.y + 1.2 * dt);
  if (keys['o'] || keys['keyo']) person.position.y = Math.max(-3.2, person.position.y - 1.2 * dt);
  
  person.position.x = THREE.MathUtils.clamp(person.position.x, -12.5, 12.5);
  person.position.z = THREE.MathUtils.clamp(person.position.z, -9.5, 9.5);
  personFillLight.position.set(person.position.x, person.position.y + 2.0, person.position.z);
}

// Fungsi logik tidur, berjalan, dan bangun
function updatePersonSleep(dt) {
  if (personManualMode) {
    updatePersonManual(dt);
    return;
  }

  // 1. Berdiri sahaja (Idle)
  if (personSleepState === 'idle') {
    person.rotation.z = 0;
    personFillLight.position.set(person.position.x, person.position.y + 2.0, person.position.z);
  } 
  // 2. Berjalan ke katil secara automatik
  else if (personSleepState === 'walking_to_bed') {
    const toBed = walkTarget.clone().sub(person.position);
    if (toBed.length() > 0.08) {
      person.position.add(toBed.normalize().multiplyScalar(Math.min(0.65 * dt, toBed.length())));
      person.rotation.y = Math.atan2(toBed.x, toBed.z);
    } else {
      personSleepState = 'getting_into_bed';
      personSleepTimer = 0;
    }
    personFillLight.position.set(person.position.x, person.position.y + 2.0, person.position.z);
  } 
  // 3. Baring di katil
  else if (personSleepState === 'getting_into_bed') {
    personSleepTimer += dt;
    const progress = Math.min(1, personSleepTimer / 2.5);
    person.position.lerpVectors(walkTarget, bedSleepPosition, progress);
    person.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 2, progress);
    if (progress >= 1) {
      personSleepState = 'sleeping';
      personSleepTimer = 0;
    }
  } 
  // 4. Keadaan Tidur
  else if (personSleepState === 'sleeping') {
    personSleepTimer += dt;
    isSleepMode = true;
    person.position.y = bedSleepPosition.y + Math.sin(personSleepTimer * 1.4) * 0.025;
    personFillLight.intensity = 0.55 + Math.sin(personSleepTimer * 1.2) * 0.08;
    
    if (!bloomFallStarted) {
      bloomFallStarted = true;
      bloomFallTimer = 0;
      bloomFallStart = device.position.clone();
    }
    bloomFallTimer += dt;
    const fallProgress = Math.min(1, bloomFallTimer / 1.5);
    device.position.lerpVectors(bloomFallStart, bloomFallPosition, fallProgress);
    device.position.y += Math.sin(Math.PI * fallProgress) * 1.0;
    device.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 2, fallProgress);
    
    if (personSleepTimer > 0.4) {
      playBloom = false;
      bloomLight.intensity = Math.max(0.05, bloomLight.intensity - dt * 0.45);
    }
  } 
  // 5. Bangun dari katil dan kembali berdiri
  else if (personSleepState === 'getting_up') {
    personSleepTimer += dt;
    const progress = Math.min(1, personSleepTimer / 2.0);
    
    person.position.lerpVectors(bedSleepPosition, defaultPersonPos, progress);
    person.rotation.z = THREE.MathUtils.lerp(Math.PI / 2, 0, progress);
    
    if (progress >= 1) {
      personSleepState = 'idle';
      personSleepTimer = 0;
      bloomFallStarted = false;
    }
  }
}

// Remote and person are physical LiDAR targets, but room decorations remain visual only.
obstacles.push(remoteBody, remoteButton);
person.children.forEach(child => obstacles.push(child));

// 1. Model Peranti BloomBud di Tengah
const deviceGeo = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16);
const deviceMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
const device = new THREE.Mesh(deviceGeo, deviceMat);
// Start in the clear area between the room floor and the upper bed.
device.position.set(0, -1.2, 5.0);
scene.add(device);

// Populate hazardObstacles (exclude room from AI perception).
// Keep every physical object here, including the fan's child meshes.
hazardObstacles.push(box, cyl, topBed, fanGroup, ceilingPlate, hub);
if (shaft) hazardObstacles.push(shaft);
blades.children.forEach(child => hazardObstacles.push(child));
hazardObstacles.push(remoteBody, remoteButton);
person.children.forEach(child => hazardObstacles.push(child));

// --- Device movement (autonomous wandering with simple obstacle avoidance)
let deviceSpeed = 1.2; // units per second
let deviceTarget = new THREE.Vector3();
const roomHalf = { x: 13.0, z: 10.0 }; // keep margin from house walls
// vertical movement / bobbing
let bobPhase = 0;
const baseDeviceY = -3.25;
const bobAmplitude = 0.9; // maximum autonomous vertical amplitude
const minDeviceY = -3.8;
const maxDeviceY = 3.2;
function pickNewTarget() {
  const tx = (Math.random() * 2 - 1) * roomHalf.x;
  const tz = (Math.random() * 2 - 1) * roomHalf.z;
  // pick a random Y target within allowed vertical bounds
  const ty = minDeviceY + Math.random() * (maxDeviceY - minDeviceY);
  deviceTarget.set(tx, ty, tz);
}

function isBlockedByObstacle(position, radius = 0.5) {
  for (const obstacle of hazardObstacles) {
    if (!obstacle || !obstacle.geometry) continue;

    // first: box volume test with expanded radius
    const box = new THREE.Box3().setFromObject(obstacle);
    const expanded = box.clone();
    expanded.min.x -= radius;
    expanded.min.y -= radius;
    expanded.min.z -= radius;
    expanded.max.x += radius;
    expanded.max.y += radius;
    expanded.max.z += radius;
    if (expanded.containsPoint(position)) return true;

  }
  return false;
}

pickNewTarget();

function updateDevice(dt = 1.0) {
  // A sleeping human pauses the BloomBud completely; sensing and UI continue.
  if (personSleepState === 'sleeping') {
    return;
  }
  const previousPosition = device.position.clone();

  // Manual vertical control always available: R = up, F = down
  const climbSpeed = 1.2; // units/sec vertical
  if (keys['r']) device.position.y = Math.min(maxDeviceY, device.position.y + climbSpeed * dt);
  if (keys['f']) device.position.y = Math.max(minDeviceY, device.position.y - climbSpeed * dt);

  // manual WASD/Arrow controls override autonomous horizontal movement
  const manual = keys['w'] || keys['a'] || keys['s'] || keys['d'] ||
    keys['keyw'] || keys['keya'] || keys['keys'] || keys['keyd'] ||
    keys['arrowup'] || keys['arrowleft'] || keys['arrowdown'] || keys['arrowright'];
  if (manual) {
    const dir = new THREE.Vector3();
    if (keys['w'] || keys['keyw'] || keys['arrowup']) dir.z -= 1;
    if (keys['s'] || keys['keys'] || keys['arrowdown']) dir.z += 1;
    if (keys['a'] || keys['keya'] || keys['arrowleft']) dir.x -= 1;
    if (keys['d'] || keys['keyd'] || keys['arrowright']) dir.x += 1;
    if (dir.lengthSq() > 0) {
      dir.normalize();
      const step = deviceSpeed * dt;
      device.position.x += dir.x * step;
      device.position.z += dir.z * step;
    }
  } else {
    // autonomous wandering
    // autonomous wandering in 3D (including Y)
    const toTarget = new THREE.Vector3().subVectors(deviceTarget, device.position);
    const dist = toTarget.length();
    if (dist < 0.5) { pickNewTarget(); }
    else {
      let dir = toTarget.normalize();
      // TEMP DISABLED: incorporate hazard avoidance steering (smooth repulsion)
      // if (hazardAvoidance.length() > 0.01) {
      //   dir.add(hazardAvoidance.clone().multiplyScalar(1.2));
      //   dir.normalize();
      // }
      // collision ahead: try to dodge laterally instead of immediate retarget
      raycaster.set(device.position, dir);
      const intersectsAhead = raycaster.intersectObjects(hazardObstacles, true);
      if (intersectsAhead.length > 0 && intersectsAhead[0].distance < 0.6) {
        const lateral = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0,1,0)).normalize();
        const candidates = [
          lateral,
          lateral.clone().negate(),
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(0, -1, 0)
        ];
        const clearDirection = candidates.find(candidate => {
          raycaster.set(device.position, candidate);
          const hits = raycaster.intersectObjects(hazardObstacles, true);
          return hits.length === 0 || hits[0].distance >= 0.8;
        });
        if (clearDirection) dir.copy(clearDirection);
      }
      // move device in 3D toward target, but limit vertical step to climb speed
      // reduce forward speed proportional to hazard urgency for smoother avoidance
      const moveStep = deviceSpeed * dt;
      device.position.x += dir.x * moveStep;
      device.position.z += dir.z * moveStep;
      // vertical movement toward target but limited
      const verticalStep = Math.sign(dir.y) * Math.min(Math.abs(dir.y * moveStep), climbSpeed * dt);
      device.position.y = THREE.MathUtils.clamp(device.position.y + verticalStep, minDeviceY, maxDeviceY);
      // slight autonomous bob added on top
      bobPhase += dt * 0.6;
      const bob = Math.sin(bobPhase) * bobAmplitude * 0.08;
      device.position.y = THREE.MathUtils.clamp(device.position.y + bob, minDeviceY, maxDeviceY);
    }
  }

  // Keep the device out of obstacle volumes. If it was already overlapping
  // an obstacle, allow the current step so it can escape instead of freezing.
  const enteredObstacle = isBlockedByObstacle(device.position, 0.5) && !isBlockedByObstacle(previousPosition, 0.5);
  if (enteredObstacle) {
    device.position.copy(previousPosition);
    if (!manual) pickNewTarget();
  }
}

// --- BloomBud Petal Model (follows device) -----------------
const bloomGroup = new THREE.Group();
bloomGroup.position.copy(device.position);
bloomGroup.position.y += 0.8;
const petalCount = 6;
const petals = [];
for (let p = 0; p < petalCount; p++) {
  const petalGeo = new THREE.SphereGeometry(0.45, 24, 24);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xffccd9, roughness: 0.6, metalness: 0.1, emissive: 0x000000 });
  const petal = new THREE.Mesh(petalGeo, petalMat);
  petal.scale.set(0.8, 0.9, 1.2);
  const angle = (p / petalCount) * Math.PI * 2;
  petal.userData = { angle };
  petal.position.set(Math.sin(angle) * 0.3, 0, Math.cos(angle) * 0.3);
  petal.rotation.x = 0;
  bloomGroup.add(petal);
  petals.push(petal);
}
scene.add(bloomGroup);
// Add petals to obstacles so LiDAR sees the BloomBud shape
petals.forEach(pt => obstacles.push(pt));

// Bloom animation state
let playBloom = true;
let bloomOpenAmount = 0; // 0 closed, 1 open
let bloomSpeed = 1.0;
let previousBloomOpen = 0;

// Add a warm point light near the bloom for nicer visuals
const bloomLight = new THREE.PointLight(0xffd1e0, 0.6, 6);
bloomLight.position.set(bloomGroup.position.x, bloomGroup.position.y + 0.5, bloomGroup.position.z);
scene.add(bloomLight);

// WebAudio chime setup (lazy init)
let audioCtx = null;
function playChime() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    // 3-note arpeggio (pleasant major-ish tones)
    const freqs = [660, 880, 990];
    const noteDur = 0.28; // seconds
    freqs.forEach((freq, i) => {
      const t0 = now + i * (noteDur * 0.6);
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, t0);
      // gentle attack and longer decay
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.12 * (1 - i * 0.18), t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + noteDur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t0);
      o.stop(t0 + noteDur + 0.02);
    });
  } catch (e) {
    // ignore audio errors (autoplay policy) or fallback
  }
}

function updateBloom(dt = 1.0) {
  const target = playBloom ? 1 : 0;
  // smoother approach with easing
  // exponential smoothing for natural motion
  const k = 6.0 * bloomSpeed; // responsiveness (higher = snappier)
  const alpha = 1 - Math.exp(-k * dt);
  bloomOpenAmount += (target - bloomOpenAmount) * alpha;
  const openAngle = Math.PI * 0.65; // how far petals open
  for (let i = 0; i < petals.length; i++) {
    const petal = petals[i];
    const angle = petal.userData.angle;
    const outRadius = 0.3 + 0.45 * bloomOpenAmount;
    petal.position.x = Math.sin(angle) * outRadius;
    petal.position.z = Math.cos(angle) * outRadius;
    petal.position.y = 0.05 + 0.3 * bloomOpenAmount;
    petal.rotation.x = -openAngle * bloomOpenAmount;
    // emissive glow based on openness
    const emissiveStrength = Math.pow(bloomOpenAmount, 1.6);
    if (petal.material && petal.material.emissive) {
      petal.material.emissive.setHex(0xffb6c1);
      if ('emissiveIntensity' in petal.material) petal.material.emissiveIntensity = emissiveStrength * 0.8;
      else petal.material.emissive.multiplyScalar(emissiveStrength * 0.2 + 1.0);
    }
  }

  // move bloom light with the group
  bloomLight.position.set(bloomGroup.position.x, bloomGroup.position.y + 0.5 + bloomOpenAmount * 0.2, bloomGroup.position.z);

  // Trigger chime + haptic when bloom opens past threshold
  // trigger when bloom crosses midpoint (was mostly closed -> now open)
  if (previousBloomOpen < 0.5 && bloomOpenAmount >= 0.5) {
    playChime();
    if (navigator.vibrate) navigator.vibrate(60);
  }
  previousBloomOpen = bloomOpenAmount;
}

// 2. Persediaan LiDAR (Raycaster & Visual Garis Laser)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const interactionRaycaster = new THREE.Raycaster();
let productMode = 'pro';
const productProfiles = {
  pro: {
    label: 'Pro - Raspberry Pi + LiDAR',
    hardware: 'Raspberry Pi + 3D LiDAR + Python AI',
    scanLabel: 'LiDAR 360 / 3 layers'
  },
  lite: {
    label: 'Lite - ESP32 Edge AI',
    hardware: 'ESP32-C3 + 3 IR sensors + PIR',
    scanLabel: 'Edge AI 3-sensor fusion'
  }
};
const productModeSelect = document.getElementById('product-mode');
const hardwareProfileEl = document.getElementById('hardware-profile');
function updateProductProfile() {
  const profile = productProfiles[productMode];
  if (hardwareProfileEl) hardwareProfileEl.innerText = profile.hardware;
  if (productModeSelect) productModeSelect.value = productMode;
  hazardAvoidanceServer = null;
  serverTimestamp = 0;
}
if (productModeSelect) {
  productModeSelect.addEventListener('change', () => {
    productMode = productModeSelect.value === 'lite' ? 'lite' : 'pro';
    updateProductProfile();
  });
}
window.addEventListener('pointerdown', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  interactionRaycaster.setFromCamera(pointer, camera);
  const hits = interactionRaycaster.intersectObjects(remoteGroup.children, true);
  if (hits.length > 0) {
    playBloom = !playBloom;
    const buttonMaterial = remoteButton.material;
    buttonMaterial.emissiveIntensity = playBloom ? 0.8 : 0.15;
  }
});
const numRays = 120; // Bilangan pancaran laser dalam satu pusingan 360°
const layerCount = 3; // top, middle, bottom
const rayLines = [];
const rayGroup = new THREE.Group();
scene.add(rayGroup);

// Bahan untuk Garisan Laser (berbeza warna per layer)
const laserMaterials = [
  new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.4 }), // top: magenta
  new THREE.LineBasicMaterial({ color: 0xff0055, transparent: true, opacity: 0.4 }), // mid: pink
  new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.4 })  // bot: yellow
];

for (let layer = 0; layer < layerCount; layer++) {
  for (let i = 0; i < numRays; i++) {
    const geom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), new THREE.Vector3(0,0,1)]);
    const line = new THREE.Line(geom, laserMaterials[layer]);
    rayGroup.add(line);
    rayLines.push(line);
  }
}

// 3. Point Cloud (Titik Kesan Pantulan LiDAR)
const hitPointsGeometry = new THREE.BufferGeometry();
const hitPointsMaterial = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.15 });
const hitPointsObject = new THREE.Points(hitPointsGeometry, hitPointsMaterial);
scene.add(hitPointsObject);

// 360° Radar ring visualization (shows all LiDAR hits in circular pattern)
const radarGroup = new THREE.Group();
radarGroup.visible = true;
scene.add(radarGroup);

// Static background radar rings (circles at fixed radii)
for (let r = 0.5; r <= 2.5; r += 0.75) {
  const radarRing = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.01, 32, 64),
    new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.15 })
  );
  radarRing.rotation.x = Math.PI / 2;
  radarRing.position.y = 0.05;
  radarGroup.add(radarRing);
}

// Radial grid lines (8 directions)
for (let dir = 0; dir < 8; dir++) {
  const angle = (dir / 8) * Math.PI * 2;
  const linePoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.cos(angle) * 2.8, 0, Math.sin(angle) * 2.8)
  ];
  const radarLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(linePoints),
    new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.12 })
  );
  radarLine.position.y = 0.05;
  radarGroup.add(radarLine);
}

// Dynamic radar point markers (will update each frame with scan hits)
const radarPointsGeometry = new THREE.BufferGeometry();
const radarPointsMaterial = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.08, transparent: true });
const radarPointsObject = new THREE.Points(radarPointsGeometry, radarPointsMaterial);
radarPointsObject.position.y = 0.06;
radarGroup.add(radarPointsObject);

// Radar sweep indicator (rotating line)
const sweepLinePoints = [
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, 3.0)
];
const radarSweepLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(sweepLinePoints),
  new THREE.LineBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.6 })
);
radarSweepLine.position.y = 0.07;
radarGroup.add(radarSweepLine);

// Radar label
const radarLabelDiv = document.createElement('div');
radarLabelDiv.style.position = 'absolute';
radarLabelDiv.style.pointerEvents = 'none';
radarLabelDiv.style.color = '#00ffcc';
radarLabelDiv.style.fontFamily = 'monospace';
radarLabelDiv.style.fontSize = '11px';
radarLabelDiv.style.fontWeight = 'bold';
radarLabelDiv.style.textShadow = '0 0 6px rgba(0,255,204,0.9)';
radarLabelDiv.style.background = 'rgba(0,0,0,0.4)';
radarLabelDiv.style.padding = '2px 6px';
radarLabelDiv.style.borderRadius = '3px';
radarLabelDiv.style.display = 'block';
radarLabelDiv.innerText = 'RADAR';
document.body.appendChild(radarLabelDiv);

// AI debug arrow and warning ring for live decision visualization
const aiArrowGroup = new THREE.Group();
scene.add(aiArrowGroup);
const aiArrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.9 });
const aiArrowCone = new THREE.ConeGeometry(0.15, 0.8, 12);
const aiArrowStem = new THREE.CylinderGeometry(0.04, 0.04, 1.0, 12);
const aiArrowConeMesh = new THREE.Mesh(aiArrowCone, aiArrowMaterial);
aiArrowConeMesh.rotation.z = -Math.PI / 2;
aiArrowConeMesh.position.set(1.1, 0, 0);
aiArrowGroup.add(aiArrowConeMesh);
const aiArrowStemMesh = new THREE.Mesh(aiArrowStem, aiArrowMaterial);
aiArrowStemMesh.rotation.z = -Math.PI / 2;
aiArrowGroup.add(aiArrowStemMesh);
aiArrowGroup.visible = false;

const aiWarningRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.8, 0.06, 12, 40),
  new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8 })
);
aiWarningRing.rotation.x = Math.PI / 2;
aiWarningRing.visible = false;
scene.add(aiWarningRing);

const dangerHotspot = new THREE.Mesh(
  new THREE.SphereGeometry(0.18, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff5e5e, transparent: true, opacity: 0.9 })
);
dangerHotspot.visible = false;
scene.add(dangerHotspot);

const dangerHotspotRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.45, 0.04, 10, 32),
  new THREE.MeshBasicMaterial({ color: 0xff5e5e, transparent: true, opacity: 0.9 })
);
dangerHotspotRing.rotation.x = Math.PI / 2;
dangerHotspotRing.visible = false;
scene.add(dangerHotspotRing);

const aiPathLine = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0)
  ]),
  new THREE.LineBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.9 })
);
aiPathLine.visible = false;
scene.add(aiPathLine);

const aiStatusSprite = document.createElement('div');
aiStatusSprite.style.position = 'absolute';
aiStatusSprite.style.pointerEvents = 'none';
aiStatusSprite.style.color = '#00ffcc';
aiStatusSprite.style.fontFamily = 'monospace';
aiStatusSprite.style.fontSize = '12px';
aiStatusSprite.style.fontWeight = 'bold';
aiStatusSprite.style.textShadow = '0 0 8px rgba(0,255,204,0.8)';
aiStatusSprite.style.background = 'rgba(0,0,0,0.35)';
aiStatusSprite.style.padding = '4px 8px';
aiStatusSprite.style.borderRadius = '4px';
aiStatusSprite.style.display = 'none';
document.body.appendChild(aiStatusSprite);

const dangerLabel = document.createElement('div');
dangerLabel.style.position = 'absolute';
dangerLabel.style.pointerEvents = 'none';
dangerLabel.style.color = '#ff5e5e';
dangerLabel.style.fontFamily = 'monospace';
dangerLabel.style.fontSize = '11px';
dangerLabel.style.fontWeight = 'bold';
dangerLabel.style.textShadow = '0 0 8px rgba(255,94,94,0.9)';
dangerLabel.style.background = 'rgba(0,0,0,0.45)';
dangerLabel.style.padding = '4px 8px';
dangerLabel.style.borderRadius = '4px';
dangerLabel.style.display = 'none';
document.body.appendChild(dangerLabel);

let scanAngle = 0;
let hazardCount = 0;
let isSleepMode = false;
let sleepPulsePhase = 0;
// smooth avoidance vector computed from hazardous LiDAR hits
let hazardAvoidance = new THREE.Vector3();
// WebSocket client to an external Python AI server (optional)
let ws = new WebSocket('wss://bloombud-simulation.onrender.com');
let wsConnected = false;
let hazardAvoidanceServer = null;
ws.onopen = () => {
    console.log('Connected to Render AI Server');
    wsConnected = true;
};

ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        // Sesuaikan variabel di bawah dengan logika AI server kamu
        if (data.avoidance_vector) {
            hazardAvoidanceServer = new THREE.Vector3(
                data.avoidance_vector.x,
                data.avoidance_vector.y,
                data.avoidance_vector.z
            );
        }
    } catch (e) {
        console.error("Error parsing AI data:", e);
    }
};

ws.onerror = (error) => {
    console.error('WebSocket Error:', error);
    wsConnected = false;
};

ws.onclose = () => {
    console.log('Disconnected from AI Server');
    wsConnected = false;
};
let serverTimestamp = 0;
const sensorCanvas = document.getElementById('sensor-canvas');
const sensorContext = sensorCanvas ? sensorCanvas.getContext('2d') : null;
const sensorReadout = document.getElementById('sensor-readout');
function drawSensorPov(rawHits, hazardRays, nearestHazardDist, riskValue) {
  if (!sensorContext || !sensorCanvas) return;
  const width = sensorCanvas.width;
  const height = sensorCanvas.height;
  const centerX = width / 2;
  const originY = height - 24;
  sensorContext.clearRect(0, 0, width, height);
  sensorContext.fillStyle = '#07131c';
  sensorContext.fillRect(0, 0, width, height);

  sensorContext.strokeStyle = 'rgba(72, 180, 170, 0.22)';
  sensorContext.lineWidth = 1;
  for (let ring = 1; ring <= 3; ring++) {
    sensorContext.beginPath();
    sensorContext.arc(centerX, originY, ring * 34, Math.PI, Math.PI * 2);
    sensorContext.stroke();
  }
  sensorContext.beginPath();
  sensorContext.moveTo(centerX, 10);
  sensorContext.lineTo(centerX, originY);
  sensorContext.stroke();
  sensorContext.strokeStyle = 'rgba(150, 230, 220, 0.35)';
  sensorContext.beginPath();
  sensorContext.moveTo(8, originY);
  sensorContext.lineTo(width - 8, originY);
  sensorContext.stroke();

  for (const hit of rawHits) {
    const relative = hit.pos.clone().sub(device.position);
    const distance = Math.max(0.1, relative.length());
    const angle = Math.atan2(relative.x, Math.max(0.01, relative.z));
    const radius = Math.min(116, distance * 28);
    const x = centerX + Math.sin(angle) * radius;
    const y = originY - Math.cos(angle) * radius - relative.y * 18;
    const rayIndex = hit.rayIndex;
    const isHazard = hazardRays.has(rayIndex) || (hit.object.userData && hit.object.userData.hazard);
    sensorContext.strokeStyle = isHazard ? '#ff637d' : '#43e6d0';
    sensorContext.globalAlpha = isHazard ? 0.9 : 0.55;
    sensorContext.beginPath();
    sensorContext.moveTo(centerX, originY);
    sensorContext.lineTo(x, y);
    sensorContext.stroke();
    sensorContext.fillStyle = isHazard ? '#ff637d' : '#43e6d0';
    sensorContext.beginPath();
    sensorContext.arc(x, y, isHazard ? 3 : 2, 0, Math.PI * 2);
    sensorContext.fill();
  }
  sensorContext.globalAlpha = 1;
  sensorContext.fillStyle = '#00ffcc';
  sensorContext.beginPath();
  sensorContext.arc(centerX, originY, 5, 0, Math.PI * 2);
  sensorContext.fill();
  sensorContext.fillStyle = '#9ed8d1';
  sensorContext.font = '10px monospace';
  sensorContext.fillText('UP', centerX - 8, 12);
  sensorContext.fillText(productMode === 'pro' ? '3D LIDAR' : '3 SENSOR EDGE', 8, height - 7);

  const nearest = Number.isFinite(nearestHazardDist) ? `${Math.round(nearestHazardDist * 100)} cm` : '--';
  if (sensorReadout) {
    sensorReadout.innerHTML = `MODE: ${productProfiles[productMode].scanLabel}<br>` +
      `POINTS: ${rawHits.length} &nbsp; HAZARDS: ${hazardCount}<br>` +
      `NEAREST: ${nearest} &nbsp; RISK: ${Number(riskValue || 0).toFixed(2)}`;
  }
}
function connectAIServer() {
  try {
    const socketUrl = window.location.hostname === 'localhost' 
    ? 'ws://localhost:8765' 
    : 'wss://bloombud-simulation.onrender.com';

    ws = new WebSocket(socketUrl);
    ws.addEventListener('open', () => { wsConnected = true; console.log('AI WS connected'); });
    ws.addEventListener('close', () => { wsConnected = false; console.log('AI WS closed'); setTimeout(connectAIServer, 1000); });
    ws.addEventListener('message', (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.type === 'avoid' && Array.isArray(d.vector)) {
          hazardAvoidanceServer = new THREE.Vector3(d.vector[0], d.vector[1], d.vector[2]);
          serverTimestamp = performance.now();
          const aiStateEl = document.getElementById('ai-state');
          const aiRiskEl = document.getElementById('ai-risk');
          const aiSleepEl = document.getElementById('ai-sleep');
          if (aiStateEl) aiStateEl.innerText = d.state || 'standby';
          if (aiRiskEl) aiRiskEl.innerText = (Number(d.urgency) || 0).toFixed(2);
          if (aiSleepEl) aiSleepEl.innerText = String(Boolean(d.sleep));
          const stateText = d.state || 'standby';
          const riskValue = Number(d.urgency) || 0;
          const sleepVal = Boolean(d.sleep);
          const bedtimeSleep = Boolean(d.human_sleeping);
          const vec = new THREE.Vector3(d.vector[0], d.vector[1], d.vector[2]);
          if (d.bloom_action === 'pause_bloom') playBloom = false;
          aiStatusSprite.innerText = `${stateText} | risk ${riskValue.toFixed(2)} | sleep ${String(sleepVal)}`;
          aiStatusSprite.style.display = 'block';
          if (stateText.includes('sleep') || sleepVal) {
            aiStatusSprite.style.color = '#d18cff';
            aiStatusSprite.style.textShadow = '0 0 8px rgba(209,140,255,0.8)';
          } else if (riskValue > 0.6) {
            aiStatusSprite.style.color = '#ff8a00';
            aiStatusSprite.style.textShadow = '0 0 8px rgba(255,138,0,0.8)';
          } else if (riskValue > 0.2) {
            aiStatusSprite.style.color = '#ffd166';
            aiStatusSprite.style.textShadow = '0 0 8px rgba(255,209,102,0.8)';
          } else {
            aiStatusSprite.style.color = '#00ffcc';
            aiStatusSprite.style.textShadow = '0 0 8px rgba(0,255,204,0.8)';
          }

          // Path line color based on state (will be set later with smooth trajectory)
          aiPathLine.material.color.setHex(
            sleepVal ? 0xd18cff : (riskValue > 0.6 ? 0xff8a00 : 0x00ffcc)
          );

          if (vec.lengthSq() > 0.0001) {
            aiArrowGroup.visible = true;
            aiArrowGroup.position.copy(device.position);
            aiArrowGroup.position.y += 1.0;
            aiArrowGroup.lookAt(device.position.clone().add(vec.clone().multiplyScalar(1.5)));
            aiArrowGroup.scale.setScalar(1 + Math.min(1.7, Number(d.urgency) || 0));
          } else {
            aiArrowGroup.visible = false;
          }

          // Track sleep mode for pulsing visual
          isSleepMode = sleepVal || bedtimeSleep;

          if ((Number(d.urgency) || 0) > 0.6 || Boolean(d.sleep)) {
            aiWarningRing.visible = true;
            aiWarningRing.position.set(device.position.x, device.position.y - 0.6, device.position.z);
            aiWarningRing.scale.setScalar(1 + Number(d.urgency) * 2.0);
            // If in sleep mode, pulse the warning ring more dramatically
            if (Boolean(d.sleep)) {
              aiWarningRing.material.color.setHex(0xff00ff);
              aiWarningRing.scale.multiplyScalar(1 + Math.sin(sleepPulsePhase) * 0.4);
            } else {
              aiWarningRing.material.color.setHex(0xffaa00);
            }
          } else {
            aiWarningRing.visible = false;
          }

          // Smooth avoidance trajectory with curved interpolation
          if (vec.lengthSq() > 0.0001) {
            const trajectoryPoints = [device.position.clone()];
            const magnitude = vec.length();
            const normalizedDir = vec.clone().normalize();
            const segmentCount = 12;
            for (let seg = 1; seg <= segmentCount; seg++) {
              const t = seg / segmentCount;
              const easeT = t * (2 - t); // ease-out quadratic for natural curve
              const pt = device.position.clone().add(normalizedDir.clone().multiplyScalar(magnitude * 1.8 * easeT));
              // Add slight vertical drift for visual appeal
              pt.y += Math.sin(t * Math.PI) * 0.3;
              trajectoryPoints.push(pt);
            }
            aiPathLine.geometry.setFromPoints(trajectoryPoints);
            aiPathLine.visible = true;
          } else {
            aiPathLine.visible = false;
          }
        }
      } catch (e) {}
    });
  } catch (e) { setTimeout(connectAIServer, 1500); }
}
// attempt connection
connectAIServer();
// HUD / visualization
const hudCanvas = document.getElementById('hud-canvas');
const hudCtx = hudCanvas ? hudCanvas.getContext('2d') : null;
const hudHistory = { hazards: [], points: [], speed: [] };
const HUD_MAX = 120;
function pushHud(hazardVal, pointVal, speedVal) {
  hudHistory.hazards.push(hazardVal);
  hudHistory.points.push(pointVal);
  hudHistory.speed.push(speedVal);
  if (hudHistory.hazards.length > HUD_MAX) hudHistory.hazards.shift();
  if (hudHistory.points.length > HUD_MAX) hudHistory.points.shift();
  if (hudHistory.speed.length > HUD_MAX) hudHistory.speed.shift();
}
function drawHud() {
  if (!hudCtx) return;
  const w = hudCanvas.width, h = hudCanvas.height;
  hudCtx.clearRect(0,0,w,h);
  // background subtle
  hudCtx.fillStyle = 'rgba(255,255,255,0.02)'; hudCtx.fillRect(0,0,w,h);
  // draw hazards as red line
  const hz = hudHistory.hazards; const maxHz = Math.max(1, ...hz);
  hudCtx.strokeStyle = '#ffcc00'; hudCtx.lineWidth = 2; hudCtx.beginPath();
  for (let i=0;i<hz.length;i++){ const x = (i/(HUD_MAX-1))*w; const y = h - (hz[i]/maxHz)*h; if(i===0) hudCtx.moveTo(x,y); else hudCtx.lineTo(x,y);} hudCtx.stroke();
  // draw points as cyan thinner
  const pts = hudHistory.points; const maxPts = Math.max(1, ...pts);
  hudCtx.strokeStyle = '#00ffff'; hudCtx.lineWidth = 1.2; hudCtx.beginPath();
  for (let i=0;i<pts.length;i++){ const x=(i/(HUD_MAX-1))*w; const y=h-(pts[i]/maxPts)*h; if(i===0) hudCtx.moveTo(x,y); else hudCtx.lineTo(x,y);} hudCtx.stroke();
}

// For simple heuristic classifier: keep last-frame hit positions
let prevHits = [];
let lastTime = performance.now();

// Classifier parameters (tunable)
const CLASSIFIER = {
  clusterRadius: 0.5,       // meters for spatial clustering (very lenient)
  speedThreshold: 1.5,      // m/s above which a cluster is likely hazardous (very strict)
  smallSizeThreshold: 1.5,  // meters: small clusters below this size are suspect
  minPointsForCluster: 5    // require at least 5 points to form cluster (strict)
};

function classifyHazards(rawHits, prevHits, dt) {
  // rawHits: array of {pos: THREE.Vector3, rayIndex: int, object}
  // prevHits: array of THREE.Vector3 from previous frame
  const n = rawHits.length;
  const speeds = new Array(n).fill(0);

  // Estimate per-hit speed by nearest neighbor in previous hits
  for (let i = 0; i < n; i++) {
    const p = rawHits[i].pos;
    let bestDist = Infinity;
    for (let j = 0; j < prevHits.length; j++) {
      const d = p.distanceTo(prevHits[j]);
      if (d < bestDist) bestDist = d;
    }
    const speed = dt > 0 ? bestDist / dt : 0;
    speeds[i] = speed;
  }

  // Simple spatial clustering (agglomerative by radius)
  const clusters = [];
  const assigned = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (assigned[i]) continue;
    const cluster = [i];
    assigned[i] = true;
    for (let j = i + 1; j < n; j++) {
      if (assigned[j]) continue;
      if (rawHits[i].pos.distanceTo(rawHits[j].pos) <= CLASSIFIER.clusterRadius) {
        cluster.push(j);
        assigned[j] = true;
      }
    }
    clusters.push(cluster);
  }

  const hazardRayIndices = new Set();

  // Evaluate each cluster for size and motion
  clusters.forEach(cluster => {
    if (cluster.length < CLASSIFIER.minPointsForCluster) return;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let sumSpeed = 0;
    cluster.forEach(idx => {
      const p = rawHits[idx].pos;
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); minZ = Math.min(minZ, p.z);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); maxZ = Math.max(maxZ, p.z);
      sumSpeed += speeds[idx];
    });
    const sizeX = maxX - minX, sizeY = maxY - minY, sizeZ = maxZ - minZ;
    const maxDim = Math.max(sizeX, sizeY, sizeZ);
    const avgSpeed = sumSpeed / cluster.length;

    // If cluster is small and moving fast, or moving faster than threshold -> hazard
    // TEMP: Disable static hazard detection - only fast-moving things count as hazards
    if (avgSpeed >= CLASSIFIER.speedThreshold) {
      cluster.forEach(idx => hazardRayIndices.add(rawHits[idx].rayIndex));
    }
  });

  return hazardRayIndices;
}

// Animate fan rotation in a separate loop-like update inside the render loop
function updateFan(dt = 1.0) {
  blades.rotation.y += fanSpeed * dt; // rotate blades
}


function trackMaybeLater() {
    console.log("Maybe Later clicked");

    // 1. CARI DAN TUTUP JENDELA SEGERA
    // Kita cari berdasarkan class atau id yang mungkin kamu gunakan
    const section = document.querySelector('.preorder-section') || 
                    document.getElementById('preorder-section') ||
                    document.querySelector('.preorder-container');

    if (section) {
        section.style.display = 'none';
        console.log("UI hidden successfully");
    } else {
        console.error("Could not find preorder section element!");
    }

    // 2. KIRIM ANALYTICS (Gunakan try-catch agar tidak merusak fungsi tutup)
    try {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'analytics',
                event: 'click_maybe_later'
            }));
        }
    } catch (err) {
        console.log("Analytics failed, but UI is already closed.");
    }
}

// Wire up UI controls for Bloom play/pause and speed
const playBtn = document.getElementById('play-btn');
const speedSlider = document.getElementById('bloom-speed');
if (playBtn) {
  playBtn.innerText = playBloom ? 'Pause' : 'Play';
  playBtn.addEventListener('click', () => {
    playBloom = !playBloom;
    playBtn.innerText = playBloom ? 'Pause' : 'Play';
  });
}
if (speedSlider) {
  speedSlider.addEventListener('input', (e) => {
    bloomSpeed = parseFloat(e.target.value) || 1.0;
  });
}

// Hook into the animation using requestAnimationFrame update
function animate() {
  requestAnimationFrame(animate);
  // update timing
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  // update device movement and bloom follow
  updateDevice(dt);
  updatePersonSleep(dt);
  // keep bloomGroup following device
  bloomGroup.position.copy(device.position);
  bloomGroup.position.y = device.position.y + 0.8;

  scanAngle += 0.02; // Kelajuan putaran LiDAR
  updateFan(dt);
  updateBloom(dt);

  // Multi-layer vertical LiDAR scanning: top, middle, bottom
  const rawHits = [];
  const layerOffsets = [
    { y: -0.8, elevation: 0.45, name: 'top', color: 0xff00ff }, // scan upward-facing surfaces
    { y:  0.0, elevation: 0.0,  name: 'mid', color: 0xff0055 }, // scan obstacle sides
    { y:  0.8, elevation: -0.45, name: 'bot', color: 0xffff00 } // scan downward-facing surfaces
  ];

  if (productMode === 'pro') {
    for (const layer of layerOffsets) {
      for (let i = 0; i < numRays; i++) {
        const angle = scanAngle + (i * (Math.PI * 2 / numRays));
        // Give top/bottom rings a real Y component for upper/lower surfaces.
        const horizontalScale = Math.cos(layer.elevation);
        const direction = new THREE.Vector3(
          Math.cos(angle) * horizontalScale,
          Math.sin(layer.elevation),
          Math.sin(angle) * horizontalScale
        ).normalize();
        const scanPos = device.position.clone().add(new THREE.Vector3(0, layer.y, 0));
        raycaster.set(scanPos, direction);
        const intersects = raycaster.intersectObjects(hazardObstacles, true);
        if (intersects.length > 0) {
          const hitPoint = intersects[0].point.clone();
          const hitObj = intersects[0].object;
          const rayIndex = i + (layerOffsets.indexOf(layer) * numRays);
          rawHits.push({ pos: hitPoint, scanPos, angle, rayIndex, object: hitObj, layer: layer.name });
        }
      }
    }
  } else {
    // Lite hardware equivalent: three fixed IR/ToF directions.
    const liteSensors = [
      { name: 'left', angle: scanAngle - 0.7 },
      { name: 'front', angle: scanAngle },
      { name: 'right', angle: scanAngle + 0.7 }
    ];
    for (let i = 0; i < liteSensors.length; i++) {
      const sensor = liteSensors[i];
      const direction = new THREE.Vector3(Math.cos(sensor.angle), 0, Math.sin(sensor.angle)).normalize();
      raycaster.set(device.position, direction);
      const intersects = raycaster.intersectObjects(hazardObstacles, true);
      if (intersects.length > 0) {
        rawHits.push({
          pos: intersects[0].point.clone(),
          scanPos: device.position.clone(),
          angle: sensor.angle,
          rayIndex: i,
          object: intersects[0].object,
          layer: sensor.name
        });
      }
    }
  }

  // Run classifier to identify hazardous rays (based on motion + size)
  const hazardRays = classifyHazards(rawHits, prevHits, dt);

  // Send scan to AI server (best-effort) and prefer server result if recent
  if (productMode === 'pro' && ws && ws.readyState === 1) {
    try {
      const pts = rawHits.map(r => [r.pos.x, r.pos.y, r.pos.z]);
      const payload = {
        type: 'scan',
        points: pts,
        device: [device.position.x, device.position.y, device.position.z],
        human_state: personSleepState,
        dt
      };
      ws.send(JSON.stringify(payload));
    } catch (e) {}
  }

  // If server produced a recent avoidance vector (200ms), use it; otherwise compute locally
  hazardAvoidance.set(0,0,0);
  const serverNow = performance.now();
  if (hazardAvoidanceServer && (serverNow - serverTimestamp) < 220) {
    hazardAvoidance.copy(hazardAvoidanceServer);
  } else {
    // Compute smooth avoidance vector from hazardous hits (repulsion)
    for (let h = 0; h < rawHits.length; h++) {
      const hit = rawHits[h];
      const rayIdx = hit.rayIndex;
      const isHazard = hazardRays.has(rayIdx) || (hit.object.userData && hit.object.userData.hazard);
      if (!isHazard) continue;
      // vector from hazard point toward device (repulsive)
      const v = new THREE.Vector3().subVectors(device.position, hit.pos);
      const dist = Math.max(0.01, v.length());
      v.normalize();
      // weight stronger for closer hazards and for designated-hazard objects
      let w = 1.0 / (dist + 0.1);
      if (hit.object.userData && hit.object.userData.hazard) w *= 2.0;
      hazardAvoidance.add(v.multiplyScalar(w));
    }
    // normalize & clamp strength
    if (hazardAvoidance.lengthSq() > 0.0001) {
      const L = hazardAvoidance.length();
      hazardAvoidance.multiplyScalar(1.0 / L);
      // scale by a small factor representing urgency (capped)
      hazardAvoidance.multiplyScalar(Math.min(1.0, L * 0.8));
    }
  }

  // Build final safe point cloud and update visuals
  const safePositions = [];
  rayLines.forEach(line => { line.visible = false; });
  hazardCount = 0;
  let nearestHazard = null;
  let nearestHazardDist = Infinity;
  // compute device velocity for tilting visualization
  if (!device.userData.lastPos) device.userData.lastPos = device.position.clone();
  const velVec = new THREE.Vector3().subVectors(device.position, device.userData.lastPos).divideScalar(Math.max(dt, 1e-6));
  const speed = velVec.length();
  device.userData.lastSpeed = speed;
  
  // Layer offsets for visualization
  const layerYOffsets = [-0.8, 0.0, 0.8];
  
  for (let h = 0; h < rawHits.length; h++) {
    const hit = rawHits[h];
    const p = hit.pos;
    const rayIdx = hit.rayIndex;
    const isHazard = hazardRays.has(rayIdx) || (hit.object.userData && hit.object.userData.hazard);

    // Determine which layer this ray belongs to
    const layerIdx = Math.floor(rayIdx / numRays);
    const startPos = hit.scanPos || device.position.clone().add(new THREE.Vector3(0, layerYOffsets[layerIdx], 0));

    // Update laser line geometry
    rayLines[rayIdx].visible = true;
    rayLines[rayIdx].geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      startPos.x, startPos.y, startPos.z,
      p.x, p.y, p.z
    ]), 3));
    rayLines[rayIdx].geometry.attributes.position.needsUpdate = true;

    if (isHazard) {
      rayLines[rayIdx].material.color.set(0xffff00);
      rayLines[rayIdx].material.opacity = 0.9;
      hazardCount++;
      const d = device.position.distanceTo(p);
      if (d < nearestHazardDist) {
        nearestHazardDist = d;
        nearestHazard = p.clone();
      }
    } else {
      rayLines[rayIdx].material.color.set(0xff0055);
      rayLines[rayIdx].material.opacity = 0.4;
      safePositions.push(p.x, p.y, p.z);
    }
  }

  const displayedRisk = parseFloat(document.getElementById('ai-risk')?.innerText || '0') || 0;
  drawSensorPov(rawHits, hazardRays, nearestHazardDist, displayedRisk);

  if (nearestHazard) {
    dangerHotspot.position.copy(nearestHazard);
    dangerHotspot.visible = true;
    dangerHotspotRing.position.copy(nearestHazard);
    dangerHotspotRing.visible = true;
    dangerHotspot.scale.setScalar(1 + Math.min(2.5, hazardCount * 0.12));
    dangerHotspotRing.scale.setScalar(1 + Math.min(1.8, hazardCount * 0.15));
    // If in sleep mode, pulse danger hotspot dramatically
    if (isSleepMode) {
      dangerHotspot.material.color.setHex(0xff00ff);
      dangerHotspot.material.opacity = 0.6 + Math.sin(sleepPulsePhase) * 0.3;
      dangerHotspotRing.material.color.setHex(0xff00ff);
      dangerHotspotRing.material.opacity = 0.8 + Math.sin(sleepPulsePhase + 1.57) * 0.2;
      dangerHotspot.scale.multiplyScalar(1 + Math.sin(sleepPulsePhase * 1.5) * 0.25);
    } else {
      dangerHotspot.material.color.setHex(0xff5e5e);
      dangerHotspot.material.opacity = 0.9;
      dangerHotspotRing.material.color.setHex(0xff5e5e);
      dangerHotspotRing.material.opacity = 0.9;
    }
  } else {
    dangerHotspot.visible = false;
    dangerHotspotRing.visible = false;
  }

  hitPointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(safePositions, 3));
  hitPointsGeometry.computeBoundingSphere();
  document.getElementById('point-count').innerText = safePositions.length / 3;
  document.getElementById('hazard-count').innerText = hazardCount;

  // Update 360° radar visualization
  const radarPoints = [];
  const radarColors = [];
  for (let h = 0; h < rawHits.length; h++) {
    const hit = rawHits[h];
    const rayIdx = hit.rayIndex;
    const isHazard = hazardRays.has(rayIdx) || (hit.object.userData && hit.object.userData.hazard);
    const rayIdxInLayer = rayIdx % numRays; // get the ray index within the layer
    const angle = hit.angle !== undefined
      ? hit.angle
      : scanAngle + (rayIdxInLayer * (Math.PI * 2 / numRays));
    const dist = device.position.distanceTo(hit.pos);
    const normalizedDist = Math.min(3.0, dist) / 3.0; // clamp to radar scale
    const x = Math.cos(angle) * normalizedDist * 2.8;
    const z = Math.sin(angle) * normalizedDist * 2.8;
    radarPoints.push(x, 0.06, z);
    if (isHazard) {
      radarColors.push(1, 1, 0); // yellow for hazard
    } else {
      radarColors.push(0, 1, 0.5); // cyan for safe
    }
  }
  radarPointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(radarPoints, 3));
  if (radarColors.length > 0) {
    radarPointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(radarColors, 3));
    radarPointsMaterial.vertexColors = true;
  }
  radarPointsGeometry.computeBoundingSphere();

  // Rotate radar sweep line (indicator that shows active scanning direction)
  radarSweepLine.rotation.y = scanAngle;

  // Position radar group at device location
  radarGroup.position.copy(device.position);

  // Update radar label position
  const radarPos = device.position.clone().add(new THREE.Vector3(0, 0.1, -3.5));
  const radarScreen = radarPos.clone().project(camera);
  const rx = (radarScreen.x * 0.5 + 0.5) * window.innerWidth;
  const ry = (-radarScreen.y * 0.5 + 0.5) * window.innerHeight;
  radarLabelDiv.style.left = `${rx - 20}px`;
  radarLabelDiv.style.top = `${ry - 10}px`;
  radarLabelDiv.style.opacity = hazardCount > 0 ? 1.0 : 0.6;

  // HUD update
  const altEl = document.getElementById('hud-alt');
  const spdEl = document.getElementById('hud-speed');
  const hzEl = document.getElementById('hud-hazard');
  const speedVal = device.userData && device.userData.lastSpeed ? device.userData.lastSpeed : 0;
  if (altEl) altEl.innerText = device.position.y.toFixed(2);
  if (spdEl) spdEl.innerText = speedVal.toFixed(2);
  if (hzEl) hzEl.innerText = hazardCount;
  pushHud(hazardCount, safePositions.length/3, speedVal);
  drawHud();

  // update status indicator (show if AI WS is connected)
  const statusEl = document.getElementById('status');
  const aiStateEl = document.getElementById('ai-state');
  const aiRiskEl = document.getElementById('ai-risk');
  const aiSleepEl = document.getElementById('ai-sleep');
  const humanControlEl = document.getElementById('human-control');
  if (statusEl) {
    if (productMode === 'lite') statusEl.innerText = 'EDGE AI (ESP32 profile)';
    else if (wsConnected) statusEl.innerText = 'SCANNING (AI: connected)';
    else statusEl.innerText = 'SCANNING (AI: offline)';
  }
  if (aiStateEl && !aiStateEl.innerText.trim()) aiStateEl.innerText = 'standby';
  if (aiRiskEl && !aiRiskEl.innerText.trim()) aiRiskEl.innerText = '0.00';
  if (aiSleepEl) aiSleepEl.innerText = personSleepState === 'sleeping' ? 'human sleeping' : 'false';
  if (humanControlEl) humanControlEl.innerText = personManualMode ? 'MANUAL (I/J/K/L)' : 'AUTO';

  const screenPos = device.position.clone().project(camera);
  const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;
  aiStatusSprite.style.left = `${x - 90}px`;
  aiStatusSprite.style.top = `${y - 50}px`;
  if (!aiArrowGroup.visible && !aiWarningRing.visible) {
    aiStatusSprite.style.display = 'none';
  }

  if (nearestHazard) {
    const hotspotScreen = nearestHazard.clone().project(camera);
    const hx = (hotspotScreen.x * 0.5 + 0.5) * window.innerWidth;
    const hy = (-hotspotScreen.y * 0.5 + 0.5) * window.innerHeight;
    dangerLabel.style.left = `${hx - 45}px`;
    dangerLabel.style.top = `${hy - 32}px`;
    const labelColor = (aiStatusSprite.style.color || '#00ffcc');
    const distanceCm = Math.round(nearestHazardDist * 100);
    if (isSleepMode) {
      dangerLabel.style.color = '#ff00ff';
      dangerLabel.style.textShadow = '0 0 12px rgba(255,0,255,1)';
      dangerLabel.innerText = `SLEEP\n${distanceCm}cm`;
    } else {
      dangerLabel.style.color = labelColor === '#d18cff' ? '#d18cff' : (labelColor === '#ff8a00' ? '#ff8a00' : '#ff5e5e');
      dangerLabel.innerText = `HOTSPOT\n${distanceCm}cm`;
    }
    dangerLabel.style.display = 'block';
  } else {
    dangerLabel.style.display = 'none';
  }

  // Update sleep mode pulse phase for dramatic visual effects
  sleepPulsePhase += dt * 4.0; // fast pulse when sleeping
  if (sleepPulsePhase > Math.PI * 2) sleepPulsePhase -= Math.PI * 2;

  // Save current points for next-frame motion estimates
  prevHits = rawHits.map(r => r.pos.clone());

  // Device tilt based on velocity (pitch and roll) for natural leaning
  const vx = device.userData.lastPos ? (device.position.x - device.userData.lastPos.x)/Math.max(dt,1e-6) : 0;
  const vz = device.userData.lastPos ? (device.position.z - device.userData.lastPos.z)/Math.max(dt,1e-6) : 0;
  const vy = device.userData.lastPos ? (device.position.y - device.userData.lastPos.y)/Math.max(dt,1e-6) : 0;
  // tilt factors
  const pitchFromZ = -Math.sign(vz) * Math.min(0.35, Math.abs(vz)*0.08);
  const pitchFromY = Math.sign(vy) * Math.min(0.45, Math.abs(vy)*0.06);
  const rollFromX = -Math.sign(vx) * Math.min(0.35, Math.abs(vx)*0.08);
  const targetPitch = pitchFromZ + pitchFromY;
  const targetRoll = rollFromX;
  // smooth approach
  device.rotation.x += (targetPitch - device.rotation.x) * Math.min(1, 6 * dt);
  device.rotation.z += (targetRoll - device.rotation.z) * Math.min(1, 6 * dt);
  // tilt bloom group a bit as well
  bloomGroup.rotation.x += (targetPitch*0.6 - bloomGroup.rotation.x) * Math.min(1, 4 * dt);
  bloomGroup.rotation.z += (targetRoll*0.6 - bloomGroup.rotation.z) * Math.min(1, 4 * dt);
  device.userData.lastPos = device.position.clone();

  controls.update();
  // camera follow behavior
  if (cameraFollow) {
    const desired = new THREE.Vector3(device.position.x, device.position.y + 6.5, device.position.z + 12);
    camera.position.lerp(desired, Math.min(1, 3 * dt));
    camera.lookAt(device.position.x, device.position.y + 0.5, device.position.z);
  }
  renderer.render(scene, camera);
}

// // Objek untuk simpan status butang yang sedang ditekan
// const mobileKeys = {
//     up: false,
//     down: false,
//     left: false,
//     right: false
// };

// const upBtn = document.getElementById('up');
// upBtn.addEventListener('touchstart', (e) => {
//     e.preventDefault();
//     // Panggil fungsi pergerakan 'W' anda di sini
//     moveForward(); 
// });

// Contoh pemetaan kawalan sentuhan untuk mobile
const buttons = ['up', 'down', 'left', 'right'];

buttons.forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    // Gunakan touchstart untuk tindak balas pantas pada telefon/tablet
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault(); // Elak konflik skrol/zoom
      handleMove(id, true); // Panggil fungsi kawalan anda
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleMove(id, false); // Hentikan pergerakan apabila dilepaskan
    }, { passive: false });
  }
});

// Fungsi untuk daftar event pada setiap butang
function setupMobileButton(id, keyName) {
    const btn = document.getElementById(id);

    // Mula tekan (Touch Start untuk Mobile, Mouse Down untuk Testing di PC)
    const startAction = (e) => {
        e.preventDefault();
        mobileKeys[keyName] = true;
        console.log(`Mula bergerak ke ${keyName}`);
        // Jika anda guna fungsi pergerakan LiDAR, panggil di sini
        // Contoh: moveForward();
    };

    // Lepas tekan
    const stopAction = (e) => {
        e.preventDefault();
        mobileKeys[keyName] = false;
        console.log(`Berhenti bergerak ke ${keyName}`);
    };

    btn.addEventListener('touchstart', startAction);
    btn.addEventListener('touchend', stopAction);
    
    // Sokongan untuk Mouse (untuk testing di komputer guna mode mobile)
    btn.addEventListener('mousedown', startAction);
    btn.addEventListener('mouseup', stopAction);
}

// Hubungkan ID butang dengan arah
setupMobileButton('up', 'up');
setupMobileButton('down', 'down');
setupMobileButton('left', 'left');
setupMobileButton('right', 'right');

let isSleeping = true; // Status asal: Tidur
let humanPosition = { x: 0, z: 0 }; // Kedudukan manusia

const sleepStatusSpan = document.getElementById('ai-sleep');
const toggleSleepBtn = document.getElementById('toggle-sleep-btn');

// Fungsi untuk tukar status tidur/bangun
toggleSleepBtn.onclick = () => {
    isSleeping = !isSleeping;
    
    if (isSleeping) {
        sleepStatusSpan.innerText = "human sleeping";
        sleepStatusSpan.style.color = "#ff4444";
        toggleSleepBtn.innerText = "WAKE UP ⏰";
        toggleSleepBtn.style.background = "#ffcc00";
        console.log("Status: Manusia sedang tidur. Kawalan disekat.");
    } else {
        sleepStatusSpan.innerText = "AWAKE & MOVING";
        sleepStatusSpan.style.color = "#00ffcc";
        toggleSleepBtn.innerText = "PUT TO SLEEP 💤";
        toggleSleepBtn.style.background = "#4444ff";
        toggleSleepBtn.style.color = "white";
        console.log("Status: Manusia bangun. Pergerakan bebas aktif.");
    }
};

// Logik Kawalan (Hanya jalan jika TIDAK tidur)
function handleMovement(direction) {
    if (isSleeping) {
        // Jika tidur, kita abaikan arahan pergerakan
        console.log("❌ Manusia sedang tidur, tidak boleh bergerak!");
        return; 
    }

    // Jika bangun, baru gerakkan kedudukan
    const speed = 0.5;
    if (direction === 'up') humanPosition.z -= speed;
    if (direction === 'down') humanPosition.z += speed;
    if (direction === 'left') humanPosition.x -= speed;
    if (direction === 'right') humanPosition.x += speed;

    updateHumanModel(); // Fungsi untuk kemaskini model 3D anda
}

// Hubungkan dengan Butang Mobile D-Pad anda
document.getElementById('up').addEventListener('touchstart', () => handleMovement('up'));
document.getElementById('down').addEventListener('touchstart', () => handleMovement('down'));
document.getElementById('left').addEventListener('touchstart', () => handleMovement('left'));
document.getElementById('right').addEventListener('touchstart', () => handleMovement('right'));

// Start the custom animate loop
animate();

window.trackMaybeLater = function() {
    console.log("Tombol diklik!");
    // Logika kirim ke websocket...
    const el = document.getElementById('preorder-section');
    if (el) el.style.display = 'none';
};