import * as THREE from 'three';

export type AABB = Readonly<{ min: THREE.Vector3; max: THREE.Vector3 }>;

export function blockAABB(x: number, y: number, z: number): AABB {
  return { min: new THREE.Vector3(x, y, z), max: new THREE.Vector3(x + 1, y + 1, z + 1) };
}

export function intersects(a: AABB, b: AABB) {
  return (
    a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y &&
    a.min.z < b.max.z &&
    a.max.z > b.min.z
  );
}

