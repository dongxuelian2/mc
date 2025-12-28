import * as THREE from 'three';
import { PHYSICS } from '../config';
import { BLOCK_TYPES, type BlockId } from '../world/blocks';

export type Particle = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  ttl: number;
  color: THREE.Color;
};

export type ParticleSystem = {
  points: THREE.Points;
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  colors: Float32Array;
  alive: Particle[];
  maxParticles: number;
};

export function createParticles(): ParticleSystem {
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
  return { points, geometry, positions, colors, alive: [], maxParticles };
}

export function spawnParticles(system: ParticleSystem, position: THREE.Vector3, blockId: BlockId) {
  const block = BLOCK_TYPES[blockId] ?? BLOCK_TYPES[1];
  const color = new THREE.Color(block.tint ?? '#ffffff');
  const spawnCount = 18;

  for (let i = 0; i < spawnCount; i += 1) {
    if (system.alive.length >= system.maxParticles) break;
    const dir = new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3);
    const life = 0.5 + Math.random() * 0.4;

    system.alive.push({
      pos: position
        .clone()
        .add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).multiplyScalar(0.6)),
      vel: dir,
      life,
      ttl: life,
      color: color.clone(),
    });
  }
}

export function updateParticles(system: ParticleSystem, dt: number) {
  const { positions, colors } = system;
  let ptr = 0;

  for (let i = system.alive.length - 1; i >= 0; i -= 1) {
    const p = system.alive[i];
    p.ttl -= dt;
    if (p.ttl <= 0) {
      system.alive.splice(i, 1);
      continue;
    }

    p.vel.y -= PHYSICS.gravity * 0.4 * dt;
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

