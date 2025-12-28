import * as THREE from 'three';
import { FACE_DIRECTIONS } from './faceDirections';
import type { TextureAtlas } from './atlas';
import { BLOCK_TYPES, type BlockId } from './blocks';
import { VoxelWorld } from './VoxelWorld';

export function buildWorldMesh(world: VoxelWorld, atlas: TextureAtlas) {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let index = 0;

  for (let x = 0; x < world.width; x += 1) {
    for (let y = 0; y < world.height; y += 1) {
      for (let z = 0; z < world.depth; z += 1) {
        const blockId = world.get(x, y, z) as BlockId;
        const block = BLOCK_TYPES[blockId];
        if (!block?.solid || !block.faces) continue;
        for (const face of FACE_DIRECTIONS) {
          const nx = x + face.dir[0];
          const ny = y + face.dir[1];
          const nz = z + face.dir[2];
          const neighbor = world.get(nx, ny, nz);
          if (neighbor !== 0) continue;

          const uvTile = atlas.uvs[block.faces[face.name]];
          const facePositions = face.corners.map(([cx, cy, cz]) => [cx + x, cy + y, cz + z]);
          positions.push(...facePositions[0], ...facePositions[1], ...facePositions[2], ...facePositions[3]);
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

  const material = new THREE.MeshStandardMaterial({
    map: atlas.texture,
    roughness: 1,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

