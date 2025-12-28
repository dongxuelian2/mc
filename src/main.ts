import './style.css';
import * as THREE from 'three';
import { AudioManager } from './audio/AudioManager';
import { breakSoundUrls, placeSoundUrls, stepSoundUrls } from './audio/blockSounds';
import { PlayerModel } from './entities/PlayerModel';
import { createParticles, spawnParticles, updateParticles } from './effects/particles';
import { Input } from './input/Input';
import { blockAABB, intersects } from './physics/aabb';
import { playerAABB } from './physics/collision';
import { PlayerController } from './player/PlayerController';
import { addDefaultLighting } from './render/lighting';
import { createRenderer } from './render/renderer';
import { WORLD, PLAYER } from './config';
import { buildAtlas } from './world/atlas';
import { BLOCK_TYPES, SELECTABLE_BLOCK_IDS, TILE_IMAGE_PATHS, TILE_PAINTERS, type BlockId } from './world/blocks';
import { buildWorldMesh } from './world/mesher';
import { generateFlatWorld } from './world/terrain';
import { VoxelWorld } from './world/VoxelWorld';
import { HUD } from './ui/HUD';

async function assetExists(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

async function start() {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) throw new Error('#app not found');
  app.innerHTML = '';

  const renderer = createRenderer(app);

  const hud = new HUD(app);
  hud.setStatus(
    '单击画面锁定鼠标 | 左键破坏 | 右键放置 | Ctrl/双击W 疾跑 | Shift 潜行 | 空格跳跃/双击飞行 | E 背包 | F5 第三人称',
  );

  const scene = new THREE.Scene();
  addDefaultLighting(scene);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 250);

  const hasExternalTextures = await assetExists(`/assets/blocks/${TILE_IMAGE_PATHS.grass_top}`);
  const atlas = await buildAtlas({
    tileSize: 32,
    painters: TILE_PAINTERS,
    imagePaths: hasExternalTextures ? TILE_IMAGE_PATHS : undefined,
    baseUrl: '/assets/blocks/',
  });
  atlas.texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const world = new VoxelWorld(WORLD.width, WORLD.height, WORLD.depth);
  generateFlatWorld(world);

  let worldMesh = buildWorldMesh(world, atlas);
  scene.add(worldMesh);

  const particles = createParticles();
  scene.add(particles.points);

  const input = new Input(renderer.domElement);
  const audio = new AudioManager();
  const hasSoundPack = await assetExists('/assets/sounds/block/grass/break1.ogg');
  let soundPreloaded = false;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(0, 0);

  let selectedBlockId: BlockId = SELECTABLE_BLOCK_IDS[0];
  let inventoryOpen = false;
  const inventory: Partial<Record<BlockId, number>> = {};
  for (const id of SELECTABLE_BLOCK_IDS) inventory[id] = 64;

  const spawn = new THREE.Vector3(
    WORLD.width / 2 + 0.5,
    world.surfaceY(Math.floor(WORLD.width / 2), Math.floor(WORLD.depth / 2)) + 2,
    WORLD.depth / 2 + 0.5,
  );
  const player = new PlayerController(spawn);
  const playerModel = new PlayerModel();
  scene.add(playerModel.root);

  const rebuildWorldMesh = () => {
    scene.remove(worldMesh);
    worldMesh.geometry.dispose();
    (worldMesh.material as THREE.Material).dispose();
    worldMesh = buildWorldMesh(world, atlas);
    scene.add(worldMesh);
  };

  const pickBlock = () => {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(worldMesh, false);
    if (!hits.length) return null;
    const hit = hits[0];
    if (!hit.face) return null;
    const point = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
    const target = point.floor();
    return { block: target, normal: hit.face.normal.clone() };
  };

  const placeBlock = () => {
    const picked = pickBlock();
    if (!picked || selectedBlockId === 0) return;
    if ((inventory[selectedBlockId] ?? 0) <= 0) return;
    const placePos = picked.block.clone().add(picked.normal);
    if (!world.inBounds(placePos.x, placePos.y, placePos.z)) return;

    const pBox = playerAABB(player.pos, PLAYER.radius, player.height);
    const bBox = blockAABB(placePos.x, placePos.y, placePos.z);
    if (intersects(pBox, bBox)) return;

    world.set(placePos.x, placePos.y, placePos.z, selectedBlockId);
    inventory[selectedBlockId] = (inventory[selectedBlockId] ?? 0) - 1;
    if (hasSoundPack) {
      audio.playAnyLoadedOrFallback(placeSoundUrls(selectedBlockId), () => {}, { volume: 0.4 });
    }
    rebuildWorldMesh();
    refreshUI();
  };

  const breakBlock = () => {
    const picked = pickBlock();
    if (!picked) return;
    const { block } = picked;
    const currentId = world.get(block.x, block.y, block.z) as BlockId;
    if (!currentId) return;
    world.set(block.x, block.y, block.z, 0);
    inventory[currentId] = (inventory[currentId] ?? 0) + 1;
    spawnParticles(particles, block.clone().addScalar(0.5), currentId);
    if (hasSoundPack) {
      audio.playAnyLoadedOrFallback(breakSoundUrls(currentId), () => audio.playBreakFallback(), {
        volume: 0.65,
        playbackRate: 0.95 + Math.random() * 0.1,
      });
    } else {
      audio.playBreakFallback();
    }
    rebuildWorldMesh();
    refreshUI(BLOCK_TYPES[currentId].name);
  };

  const refreshUI = (extraText?: string) => {
    hud.renderSelection(selectedBlockId, inventory, extraText);
    hud.setInventoryOpen(inventoryOpen);
  };
  hud.onInventorySelect((id) => {
    selectedBlockId = id;
    refreshUI();
  });

  const openInventory = (open: boolean) => {
    inventoryOpen = open;
    hud.setInventoryOpen(inventoryOpen);
    if (inventoryOpen) document.exitPointerLock();
  };

  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE') {
      e.preventDefault();
      openInventory(!inventoryOpen);
      refreshUI();
      return;
    }
    if (e.code.startsWith('Digit')) {
      const idx = Number.parseInt(e.code.replace('Digit', ''), 10) - 1;
      const id = SELECTABLE_BLOCK_IDS[idx];
      if (id !== undefined) {
        selectedBlockId = id;
        refreshUI();
      }
    }
  });

  renderer.domElement.addEventListener('click', async () => {
    if (inventoryOpen) return;
    if (!input.pointerLocked) {
      await input.requestPointerLock();
      await audio.resume();
      if (hasSoundPack && !soundPreloaded) {
        soundPreloaded = true;
        // Warm up a few common clips; missing files are ignored.
        const warm = [
          ...breakSoundUrls(1),
          ...breakSoundUrls(3),
          ...placeSoundUrls(1),
          ...stepSoundUrls(1),
        ];
        for (const url of warm) void audio.load(url).catch(() => {});
      }
    }
  });

  renderer.domElement.addEventListener('contextmenu', (e: MouseEvent) => e.preventDefault());
  renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
    if (!input.pointerLocked || inventoryOpen) return;
    if (e.button === 0) breakBlock();
    if (e.button === 2) placeBlock();
  });
  renderer.domElement.addEventListener('wheel', (e: WheelEvent) => {
    if (inventoryOpen) return;
    const dir = e.deltaY > 0 ? 1 : -1;
    let idx = SELECTABLE_BLOCK_IDS.indexOf(selectedBlockId);
    idx = (idx + dir + SELECTABLE_BLOCK_IDS.length) % SELECTABLE_BLOCK_IDS.length;
    selectedBlockId = SELECTABLE_BLOCK_IDS[idx];
    refreshUI();
  });

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  const clock = new THREE.Clock();
  const cameraRaycaster = new THREE.Raycaster();
  let stepAccum = 0;

  const animate = () => {
    const dt = Math.min(0.05, clock.getDelta());
    if (!inventoryOpen) player.update({ dt, input, world });
    else {
      player.vel.x = 0;
      player.vel.z = 0;
    }

    player.updateCamera({ camera, worldMesh, raycaster: cameraRaycaster });

    playerModel.setVisible(player.cameraMode !== 'first');
    playerModel.update({
      position: player.pos,
      yaw: player.yaw,
      velocity: player.vel,
      crouching: player.isCrouching,
    });

    if (hasSoundPack && !inventoryOpen && input.pointerLocked && player.grounded) {
      const speed = Math.hypot(player.vel.x, player.vel.z);
      if (speed > 0.35) {
        stepAccum += speed * dt;
        const stride = player.isCrouching ? 2.0 : speed > 8.2 ? 1.25 : 1.55;
        if (stepAccum >= stride) {
          stepAccum = 0;
          const bx = Math.floor(player.pos.x);
          const by = Math.floor(player.pos.y - 0.01);
          const bz = Math.floor(player.pos.z);
          const groundId = world.get(bx, by, bz) as BlockId;
          if (groundId) {
            audio.playAnyLoadedOrFallback(stepSoundUrls(groundId), () => {}, {
              volume: 0.35,
              playbackRate: 0.95 + Math.random() * 0.1,
            });
          }
        }
      } else {
        stepAccum = 0;
      }
    } else {
      stepAccum = 0;
    }

    updateParticles(particles, dt);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  };

  refreshUI();
  animate();
}

start();
