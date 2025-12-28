import * as THREE from 'three';
import { BLOCK_TYPES } from '../world/blocks';
import { VoxelWorld } from '../world/VoxelWorld';
import type { AABB } from './aabb';
import { blockAABB, intersects } from './aabb';

export function playerAABB(pos: THREE.Vector3, radius: number, height: number): AABB {
  return {
    min: new THREE.Vector3(pos.x - radius, pos.y, pos.z - radius),
    max: new THREE.Vector3(pos.x + radius, pos.y + height, pos.z + radius),
  };
}

export function collidesAt(world: VoxelWorld, aabb: AABB) {
  const EPS = 1e-4;
  const maxX = Math.min(world.width - 1, Math.floor(aabb.max.x - EPS));
  const maxY = Math.min(world.height - 1, Math.floor(aabb.max.y - EPS));
  const maxZ = Math.min(world.depth - 1, Math.floor(aabb.max.z - EPS));
  const minX = Math.max(0, Math.floor(aabb.min.x + EPS));
  const minY = Math.max(0, Math.floor(aabb.min.y + EPS));
  const minZ = Math.max(0, Math.floor(aabb.min.z + EPS));

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const blockId = world.get(x, y, z);
        const def = (BLOCK_TYPES as Record<number, { solid: boolean } | undefined>)[blockId];
        if (!def?.solid) continue;
        if (intersects(aabb, blockAABB(x, y, z))) return true;
      }
    }
  }
  return false;
}

export function collideAxis(options: {
  world: VoxelWorld;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  axis: 'x' | 'y' | 'z';
  amount: number;
  radius: number;
  height: number;
  onGroundHit?: () => void;
}) {
  const { world, pos, vel, axis, amount, radius, height, onGroundHit } = options;
  if (amount === 0) return pos;
  const EPS = 1e-4;

  const nextPos = pos.clone();
  nextPos[axis] += amount;
  const bbox = playerAABB(nextPos, radius, height);

  const maxX = Math.min(world.width - 1, Math.floor(bbox.max.x - EPS));
  const maxY = Math.min(world.height - 1, Math.floor(bbox.max.y - EPS));
  const maxZ = Math.min(world.depth - 1, Math.floor(bbox.max.z - EPS));
  const minX = Math.max(0, Math.floor(bbox.min.x + EPS));
  const minY = Math.max(0, Math.floor(bbox.min.y + EPS));
  const minZ = Math.max(0, Math.floor(bbox.min.z + EPS));

  const extent = axis === 'y' ? height : radius;
  let hit = false;
  let limit = nextPos[axis];

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const blockId = world.get(x, y, z);
        const def = (BLOCK_TYPES as Record<number, { solid: boolean } | undefined>)[blockId];
        if (!def?.solid) continue;
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
  if (axis === 'y') vel.y = 0;
  if (axis === 'y' && amount < 0) onGroundHit?.();
  if (axis !== 'y') vel[axis] = 0;
  return nextPos;
}
