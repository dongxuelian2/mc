import './style.css';
import * as THREE from 'three';

const WORLD_WIDTH = 64;
const WORLD_DEPTH = 64;
const WORLD_HEIGHT = 32;
const GRAVITY = 24;
const PLAYER_EYE_HEIGHT = 1.75;
const PLAYER_HEIGHT = 1.8;
const PLAYER_RADIUS = 0.35;
const STEP_SIZE = 0.2;

const faceDirections = [
  { name: 'px', dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]] },
  { name: 'nx', dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]] },
  { name: 'py', dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { name: 'ny', dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { name: 'pz', dir: [0, 0, 1], corners: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]] },
  { name: 'nz', dir: [0, 0, -1], corners: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]] },
];

const tilePainters = {
  grass_top: (ctx, size) => paintNoise(ctx, size, '#4e8c30', '#6cb340'),
  grass_side: (ctx, size) => {
    paintNoise(ctx, size, '#6a4b2f', '#7a5736');
    ctx.fillStyle = '#4e8c30';
    ctx.fillRect(0, 0, size, Math.floor(size * 0.35));
    addSpeckles(ctx, size, '#7abf42', 0.07);
  },
  dirt: (ctx, size) => paintNoise(ctx, size, '#6a4b2f', '#7a5736'),
  stone: (ctx, size) => {
    paintNoise(ctx, size, '#7c7f82', '#9a9da1');
    addSpeckles(ctx, size, '#5f6468', 0.05);
  },
  sand: (ctx, size) => paintNoise(ctx, size, '#d8c796', '#e8d7a6'),
  wood_side: (ctx, size) => {
    paintNoise(ctx, size, '#7d5a36', '#8d6a3f');
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let y = 3; y < size; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(size, y + 0.5);
      ctx.stroke();
    }
  },
  wood_top: (ctx, size) => {
    paintNoise(ctx, size, '#9b7446', '#b38452');
    ctx.strokeStyle = 'rgba(70, 40, 20, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  },
  leaves: (ctx, size) => {
    paintNoise(ctx, size, '#3c7a33', '#4e9a44');
    addSpeckles(ctx, size, '#64b34f', 0.1);
  },
  plank: (ctx, size) => {
    paintNoise(ctx, size, '#c19a6b', '#d6b07d');
    ctx.strokeStyle = 'rgba(90,60,20,0.3)';
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += size / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(size, y + 0.5);
      ctx.stroke();
    }
  },
};

const blockTypes = {
  0: { name: 'Air', solid: false },
  1: { name: 'Grass', solid: true, faces: { px: 'grass_side', nx: 'grass_side', py: 'grass_top', ny: 'dirt', pz: 'grass_side', nz: 'grass_side' }, tint: '#6cb340' },
  2: { name: 'Dirt', solid: true, faces: { px: 'dirt', nx: 'dirt', py: 'dirt', ny: 'dirt', pz: 'dirt', nz: 'dirt' }, tint: '#7a5736' },
  3: { name: 'Stone', solid: true, faces: { px: 'stone', nx: 'stone', py: 'stone', ny: 'stone', pz: 'stone', nz: 'stone' }, tint: '#8d9196' },
  4: { name: 'Sand', solid: true, faces: { px: 'sand', nx: 'sand', py: 'sand', ny: 'sand', pz: 'sand', nz: 'sand' }, tint: '#e8d7a6' },
  5: { name: 'Wood', solid: true, faces: { px: 'wood_side', nx: 'wood_side', py: 'wood_top', ny: 'wood_top', pz: 'wood_side', nz: 'wood_side' }, tint: '#a17444' },
  6: { name: 'Leaves', solid: true, faces: { px: 'leaves', nx: 'leaves', py: 'leaves', ny: 'leaves', pz: 'leaves', nz: 'leaves' }, tint: '#4e9a44' },
  7: { name: 'Planks', solid: true, faces: { px: 'plank', nx: 'plank', py: 'plank', ny: 'plank', pz: 'plank', nz: 'plank' }, tint: '#d6b07d' },
};

const selectableBlocks = [1, 2, 3, 4, 5, 6, 7];
const app = document.querySelector('#app');
app.innerHTML = '';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const hud = document.createElement('div');
hud.id = 'hud';
hud.innerHTML = `
  <div id="crosshair"></div>
  <div id="top-info">
    <div id="status">单击画面锁定鼠标 | 左键破坏 | 右键放置 | 滚轮/数字切换物品 | 空格跳跃/双击飞行 | E 打开背包</div>
    <div id="block-name">选中：草方块</div>
  </div>
  <div id="hotbar"></div>
  <div id="inventory" class="hidden">
    <div class="inventory-title">背包</div>
    <div id="inventory-grid"></div>
  </div>
`;
app.appendChild(hud);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fc7ff);
scene.fog = new THREE.Fog(0x9fc7ff, 40, 140);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.05, 500);

const hemiLight = new THREE.HemisphereLight(0xbdd8ff, 0x556055, 0.8);
scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 30, 10);
scene.add(dirLight);

const clock = new THREE.Clock();

function paintNoise(ctx, size, colorA, colorB) {
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  addSpeckles(ctx, size, 'rgba(0,0,0,0.08)', 0.03);
}

function addSpeckles(ctx, size, color, density) {
  const count = Math.floor(size * size * density);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    ctx.fillRect(x, y, 1, 1);
  }
}

function buildAtlas() {
  const tileSize = 32;
  const tileNames = Object.keys(tilePainters);
  const atlasSize = Math.ceil(Math.sqrt(tileNames.length));
  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = atlasCanvas.height = atlasSize * tileSize;
  const ctx = atlasCanvas.getContext('2d');
  const uvs = {};

  tileNames.forEach((name, i) => {
    const x = (i % atlasSize) * tileSize;
    const y = Math.floor(i / atlasSize) * tileSize;
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileCanvas.height = tileSize;
    const tileCtx = tileCanvas.getContext('2d');
    tilePainters[name](tileCtx, tileSize);
    ctx.drawImage(tileCanvas, x, y);
    const u0 = x / atlasCanvas.width;
    const v0 = y / atlasCanvas.height;
    const u1 = (x + tileSize) / atlasCanvas.width;
    const v1 = (y + tileSize) / atlasCanvas.height;
    uvs[name] = { u0, v0, u1, v1 };
  });

  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipMapNearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return { texture, uvs };
}

class VoxelWorld {
  constructor(width, height, depth) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.data = new Uint8Array(width * height * depth);
  }

  index(x, y, z) {
    return x + z * this.width + y * this.width * this.depth;
  }

  inBounds(x, y, z) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.height && z < this.depth;
  }

  get(x, y, z) {
    if (!this.inBounds(x, y, z)) return 0;
    return this.data[this.index(x, y, z)];
  }

  set(x, y, z, v) {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.index(x, y, z)] = v;
  }

  surfaceY(x, z) {
    for (let y = this.height - 1; y >= 0; y -= 1) {
      if (this.get(x, y, z) !== 0) return y + 1;
    }
    return 1;
  }
}

function generateFlatWorld(world) {
  const groundHeight = 6;
  for (let x = 0; x < world.width; x += 1) {
    for (let z = 0; z < world.depth; z += 1) {
      for (let y = 0; y < world.height; y += 1) {
        let blockId = 0;
        if (y < groundHeight - 3) {
          blockId = 3; // stone
        } else if (y < groundHeight - 1) {
          blockId = 2; // dirt
        } else if (y === groundHeight - 1) {
          blockId = 1; // grass surface
        }
        world.set(x, y, z, blockId);
      }
    }
  }
}

function buildMesh(world, atlas) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let index = 0;

  for (let x = 0; x < world.width; x += 1) {
    for (let y = 0; y < world.height; y += 1) {
      for (let z = 0; z < world.depth; z += 1) {
        const blockId = world.get(x, y, z);
        const block = blockTypes[blockId];
        if (!block || !block.solid) continue;
        for (const face of faceDirections) {
          const nx = x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = z + face.dir[2];
          const neighbor = world.get(nx, ny, nz);
          if (neighbor !== 0) continue;
          const uvTile = atlas.uvs[block.faces[face.name]];
          const facePositions = face.corners.map(([cx, cy, cz]) => [cx + x, cy + y, cz + z]);
          positions.push(
            ...facePositions[0], ...facePositions[1], ...facePositions[2], ...facePositions[3],
          );
          normals.push(...face.dir, ...face.dir, ...face.dir, ...face.dir);
          uvs.push(
            uvTile.u1, uvTile.v0,
            uvTile.u1, uvTile.v1,
            uvTile.u0, uvTile.v1,
            uvTile.u0, uvTile.v0,
          );
          indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
          index += 4;
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  const material = new THREE.MeshLambertMaterial({ map: atlas.texture });
  return new THREE.Mesh(geometry, material);
}

function createParticles() {
  const maxParticles = 400;
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, geometry, positions, colors, pool: [], alive: [], maxParticles };
}

function spawnParticles(system, position, blockId) {
  const block = blockTypes[blockId] || blockTypes[1];
  const color = new THREE.Color(block.tint || '#ffffff');
  const spawnCount = 18;
  for (let i = 0; i < spawnCount; i += 1) {
    if (system.alive.length >= system.maxParticles) break;
    const dir = new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      Math.random() * 3,
      (Math.random() - 0.5) * 3,
    );
    const life = 0.5 + Math.random() * 0.4;
    system.alive.push({
      pos: position.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).multiplyScalar(0.6)),
      vel: dir,
      life,
      ttl: life,
      color: color.clone(),
    });
  }
}

function updateParticles(system, dt) {
  const { positions, colors } = system;
  let ptr = 0;
  for (let i = system.alive.length - 1; i >= 0; i -= 1) {
    const p = system.alive[i];
    p.ttl -= dt;
    if (p.ttl <= 0) {
      system.alive.splice(i, 1);
      continue;
    }
    p.vel.y -= GRAVITY * 0.4 * dt;
    p.pos.addScaledVector(p.vel, dt);
    if (ptr < system.maxParticles) {
      positions[ptr * 3] = p.pos.x;
      positions[ptr * 3 + 1] = p.pos.y;
      positions[ptr * 3 + 2] = p.pos.z;
      const fade = p.ttl / p.life;
      colors[ptr * 3] = p.color.r * fade;
      colors[ptr * 3 + 1] = p.color.g * fade;
      colors[ptr * 3 + 2] = p.color.b * fade;
      ptr += 1;
    }
  }
  system.geometry.setDrawRange(0, ptr);
  system.geometry.attributes.position.needsUpdate = true;
  system.geometry.attributes.color.needsUpdate = true;
  if (ptr === 0) {
    system.geometry.attributes.position.array.fill(0);
    system.geometry.attributes.color.array.fill(0);
  }
}

function createBreakAudio() {
  const ctx = new AudioContext();
  const trigger = () => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220 + Math.random() * 60, now);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(now + 0.25);
  };
  trigger.ctx = ctx;
  return trigger;
}

const atlas = buildAtlas();
const world = new VoxelWorld(WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH);
generateFlatWorld(world);
let worldMesh = buildMesh(world, atlas);
scene.add(worldMesh);

const particles = createParticles();
scene.add(particles.points);
const playBreakSound = createBreakAudio();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);
let selectedBlockId = selectableBlocks[0];
let inventoryOpen = false;
let pointerLocked = false;
const inventory = {};
selectableBlocks.forEach((id) => {
  inventory[id] = 64;
});

const player = {
  pos: new THREE.Vector3(
    world.width / 2 + 0.5,
    world.surfaceY(Math.floor(world.width / 2), Math.floor(world.depth / 2)) + 2,
    world.depth / 2 + 0.5,
  ),
  vel: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  grounded: false,
};

let flyMode = false;
let lastSpaceTap = 0;

camera.position.copy(player.pos);

function blockAABB(x, y, z) {
  return { min: new THREE.Vector3(x, y, z), max: new THREE.Vector3(x + 1, y + 1, z + 1) };
}

function playerAABB(pos) {
  return {
    min: new THREE.Vector3(pos.x - PLAYER_RADIUS, pos.y, pos.z - PLAYER_RADIUS),
    max: new THREE.Vector3(pos.x + PLAYER_RADIUS, pos.y + PLAYER_HEIGHT, pos.z + PLAYER_RADIUS),
  };
}

function intersects(a, b) {
  return a.min.x < b.max.x && a.max.x > b.min.x &&
    a.min.y < b.max.y && a.max.y > b.min.y &&
    a.min.z < b.max.z && a.max.z > b.min.z;
}

function collide(pos, axis, amount) {
  if (amount === 0) return pos;
  const EPS = 1e-4;
  const nextPos = pos.clone();
  nextPos[axis] += amount;
  const bbox = playerAABB(nextPos);

  const maxX = Math.min(world.width - 1, Math.floor(bbox.max.x - EPS));
  const maxY = Math.min(world.height - 1, Math.floor(bbox.max.y - EPS));
  const maxZ = Math.min(world.depth - 1, Math.floor(bbox.max.z - EPS));
  const minX = Math.max(0, Math.floor(bbox.min.x + EPS));
  const minY = Math.max(0, Math.floor(bbox.min.y + EPS));
  const minZ = Math.max(0, Math.floor(bbox.min.z + EPS));

  const extent = axis === 'y' ? PLAYER_HEIGHT : PLAYER_RADIUS;
  let hit = false;
  let limit = nextPos[axis];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const blockId = world.get(x, y, z);
        if (!blockId || !blockTypes[blockId].solid) continue;
        const blockBox = blockAABB(x, y, z);
        if (!intersects(bbox, blockBox)) continue;

        hit = true;
        if (amount > 0) {
          const candidate = blockBox.min[axis] - extent - EPS;
          if (candidate < limit) limit = candidate;
        } else {
          const candidate = blockBox.max[axis] + (axis === 'y' ? 0 : extent) + EPS;
          if (candidate > limit) limit = candidate;
        }
      }
    }
  }

  if (!hit) return nextPos;
  nextPos[axis] = limit;
  if (axis === 'y' && amount < 0) {
    player.grounded = true;
    player.vel.y = 0;
  }
  if (axis !== 'y') player.vel[axis] = 0;
  return nextPos;
}

function movePlayer(dt) {
  const sprint = !inventoryOpen && !flyMode && (pressed['ShiftLeft'] || pressed['ShiftRight']);
  const speed = flyMode ? 12 : (player.grounded ? (sprint ? 10 : 8) : 6);
  const accel = flyMode ? 28 : (player.grounded ? 26 : 12);
  const friction = flyMode ? 8 : (player.grounded ? 18 : 1.5);
  const moveDir = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.yaw);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

  if (!inventoryOpen) {
    if (pressed['KeyW']) moveDir.add(forward);
    if (pressed['KeyS']) moveDir.sub(forward);
    if (pressed['KeyD']) moveDir.add(right);
    if (pressed['KeyA']) moveDir.sub(right);
    if (flyMode) {
      if (pressed['Space']) moveDir.y += 1;
      if (pressed['ShiftLeft'] || pressed['ShiftRight']) moveDir.y -= 1;
    }
    moveDir.y = flyMode ? moveDir.y : 0;
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(accel * dt);
      player.vel.add(moveDir);
    }

    player.vel.x -= player.vel.x * friction * dt;
    player.vel.z -= player.vel.z * friction * dt;
    if (flyMode) player.vel.y -= player.vel.y * friction * dt;
  } else {
    player.vel.x = 0;
    player.vel.z = 0;
  }

  if (!flyMode) player.vel.y -= GRAVITY * dt;
  player.grounded = false;

  // Jump is handled on keydown (edge-triggered).

  player.vel.x = THREE.MathUtils.clamp(player.vel.x, -speed, speed);
  player.vel.z = THREE.MathUtils.clamp(player.vel.z, -speed, speed);
  if (flyMode) player.vel.y = THREE.MathUtils.clamp(player.vel.y, -speed, speed);

  const stepX = collide(player.pos, 'x', player.vel.x * dt);
  player.pos.copy(stepX);
  const stepY = collide(player.pos, 'y', player.vel.y * dt);
  player.pos.copy(stepY);
  const stepZ = collide(player.pos, 'z', player.vel.z * dt);
  player.pos.copy(stepZ);

  // Keep player inside world bounds (XZ).
  player.pos.x = THREE.MathUtils.clamp(player.pos.x, PLAYER_RADIUS, world.width - PLAYER_RADIUS);
  player.pos.z = THREE.MathUtils.clamp(player.pos.z, PLAYER_RADIUS, world.depth - PLAYER_RADIUS);

  if (player.pos.y < -20) {
    // Failsafe: respawn on surface if we ever fall out of world bounds.
    player.pos.set(
      world.width / 2 + 0.5,
      world.surfaceY(Math.floor(world.width / 2), Math.floor(world.depth / 2)) + 2,
      world.depth / 2 + 0.5,
    );
    player.vel.set(0, 0, 0);
  }
}

function updateCamera() {
  camera.position.copy(player.pos).add(new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0));
  const euler = new THREE.Euler(player.pitch, player.yaw, 0, 'YXZ');
  camera.quaternion.setFromEuler(euler);
}

function rebuildWorldMesh() {
  scene.remove(worldMesh);
  worldMesh.geometry.dispose();
  worldMesh.material.dispose();
  worldMesh = buildMesh(world, atlas);
  scene.add(worldMesh);
}

function pickBlock() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObject(worldMesh, false);
  if (!intersects.length) return null;
  const hit = intersects[0];
  const point = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
  const target = point.floor();
  return { block: target, normal: hit.face.normal };
}

function placeBlock() {
  const picked = pickBlock();
  if (!picked || selectedBlockId === 0) return;
  if (inventory[selectedBlockId] <= 0) return;
  const placePos = picked.block.clone().add(picked.normal);
  if (!world.inBounds(placePos.x, placePos.y, placePos.z)) return;
  const playerBox = playerAABB(player.pos);
  const bBox = blockAABB(placePos.x, placePos.y, placePos.z);
  if (intersects(playerBox, bBox)) return;
  world.set(placePos.x, placePos.y, placePos.z, selectedBlockId);
  inventory[selectedBlockId] -= 1;
  rebuildWorldMesh();
  refreshUI();
}

function breakBlock() {
  const picked = pickBlock();
  if (!picked) return;
  const { block } = picked;
  const currentId = world.get(block.x, block.y, block.z);
  if (!currentId) return;
  world.set(block.x, block.y, block.z, 0);
  inventory[currentId] = (inventory[currentId] || 0) + 1;
  spawnParticles(particles, block.clone().addScalar(0.5), currentId);
  playBreakSound();
  rebuildWorldMesh();
  refreshUI(blockTypes[currentId].name);
}

const pressed = {};
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    if (!e.repeat && !inventoryOpen) {
      if (!flyMode && player.grounded) {
        e.preventDefault();
        player.vel.y = 9.5;
        player.grounded = false;
      }
    }
    const now = performance.now();
    if (!e.repeat && !inventoryOpen && now - lastSpaceTap < 300) {
      flyMode = !flyMode;
      player.vel.set(0, 0, 0);
      player.grounded = false;
    }
    lastSpaceTap = now;
  }
  if (e.code === 'KeyE') {
    e.preventDefault();
    inventoryOpen = !inventoryOpen;
    document.getElementById('inventory').classList.toggle('hidden', !inventoryOpen);
    if (inventoryOpen) {
      document.exitPointerLock();
      pointerLocked = false;
    }
    return;
  }
  if (e.code.startsWith('Digit')) {
    const idx = parseInt(e.code.replace('Digit', ''), 10) - 1;
    if (selectableBlocks[idx] !== undefined) {
      selectedBlockId = selectableBlocks[idx];
      refreshUI();
    }
  }
  pressed[e.code] = true;
});

document.addEventListener('keyup', (e) => {
  pressed[e.code] = false;
});

renderer.domElement.addEventListener('click', async () => {
  if (!pointerLocked) {
    await renderer.domElement.requestPointerLock();
    if (playBreakSound && playBreakSound.ctx) playBreakSound.ctx.resume?.();
  }
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === renderer.domElement;
});

document.addEventListener('mousemove', (e) => {
  if (!pointerLocked) return;
  const sensitivity = 0.0025;
  const mx = THREE.MathUtils.clamp(e.movementX, -120, 120);
  const my = THREE.MathUtils.clamp(e.movementY, -120, 120);
  player.yaw -= mx * sensitivity;
  player.pitch -= my * sensitivity;
  if (Math.abs(player.yaw) > 1e6) player.yaw = player.yaw % (Math.PI * 2);
  player.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, player.pitch));
});

renderer.domElement.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

renderer.domElement.addEventListener('mousedown', (e) => {
  if (!pointerLocked) return;
  if (e.button === 0) breakBlock();
  if (e.button === 2) placeBlock();
});

renderer.domElement.addEventListener('wheel', (e) => {
  const dir = e.deltaY > 0 ? 1 : -1;
  let idx = selectableBlocks.indexOf(selectedBlockId);
  idx = (idx + dir + selectableBlocks.length) % selectableBlocks.length;
  selectedBlockId = selectableBlocks[idx];
  refreshUI();
});

function refreshUI(extraText) {
  const blockName = blockTypes[selectedBlockId]?.name || 'None';
  document.getElementById('block-name').textContent = `选中：${blockName}${extraText ? ` | 获得：${extraText}` : ''}`;
  const hotbar = document.getElementById('hotbar');
  hotbar.innerHTML = '';
  selectableBlocks.forEach((id) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (id === selectedBlockId) slot.classList.add('active');
    slot.innerHTML = `<div class="slot-label">${blockTypes[id].name}</div><div class="slot-count">${inventory[id] ?? 0}</div>`;
    hotbar.appendChild(slot);
  });
  const grid = document.getElementById('inventory-grid');
  grid.innerHTML = '';
  selectableBlocks.forEach((id) => {
    const cell = document.createElement('div');
    cell.className = 'slot inventory-slot';
    if (id === selectedBlockId) cell.classList.add('active');
    cell.innerHTML = `<div class="slot-label">${blockTypes[id].name}</div><div class="slot-count">${inventory[id] ?? 0}</div>`;
    cell.addEventListener('click', () => {
      selectedBlockId = id;
      refreshUI();
    });
    grid.appendChild(cell);
  });
}

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  movePlayer(dt);
  updateCamera();
  updateParticles(particles, dt);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

refreshUI();
animate();
