import * as THREE from 'three';
import { WORLD } from '../config';

export function addDefaultLighting(scene: THREE.Scene) {
  scene.background = new THREE.Color('#86c5ff');
  scene.fog = new THREE.Fog('#86c5ff', 20, 110);

  const hemi = new THREE.HemisphereLight(0xbfe6ff, 0x3b2a16, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(WORLD.width * 0.6, 40, WORLD.depth * 0.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0002;

  const d = Math.max(WORLD.width, WORLD.depth);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 120;
  sun.shadow.camera.left = -d;
  sun.shadow.camera.right = d;
  sun.shadow.camera.top = d;
  sun.shadow.camera.bottom = -d;

  scene.add(sun);
  return { sun };
}

