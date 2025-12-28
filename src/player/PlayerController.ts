import * as THREE from 'three';
import { CAMERA, INPUT, PHYSICS, PLAYER, WORLD } from '../config';
import { collidesAt, collideAxis, playerAABB } from '../physics/collision';
import type { Input as InputState } from '../input/Input';
import type { VoxelWorld } from '../world/VoxelWorld';

export type CameraMode = 'first' | 'third_back' | 'third_front';

export class PlayerController {
  public readonly pos: THREE.Vector3;
  public readonly vel = new THREE.Vector3();
  public yaw = 0;
  public pitch = 0;
  public grounded = false;
  public flyMode = false;
  public cameraMode: CameraMode = 'first';

  private crouching = false;
  private lastSpaceTap = 0;
  private lastForwardTap = 0;
  private sprintLatch = false;

  constructor(spawnPos: THREE.Vector3) {
    this.pos = spawnPos.clone();
  }

  get isCrouching() {
    return this.crouching;
  }

  get height() {
    return this.crouching ? PLAYER.crouchHeight : PLAYER.standingHeight;
  }

  get eyeHeight() {
    return this.crouching ? PLAYER.crouchEyeHeight : PLAYER.eyeHeight;
  }

  update(options: { dt: number; input: InputState; world: VoxelWorld }) {
    const { dt, input, world } = options;

    const mouse = input.consumeMouseDelta();
    const mx = THREE.MathUtils.clamp(mouse.x, -120, 120);
    const my = THREE.MathUtils.clamp(mouse.y, -120, 120);
    this.yaw -= mx * INPUT.mouseSensitivity;
    this.pitch -= my * INPUT.mouseSensitivity;
    if (Math.abs(this.yaw) > 1e6) this.yaw = this.yaw % (Math.PI * 2);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI / 2, Math.PI / 2);

    if (input.consumePressed('F5')) {
      this.cameraMode =
        this.cameraMode === 'first' ? 'third_back' : this.cameraMode === 'third_back' ? 'third_front' : 'first';
    }

    if (input.consumePressed('Space')) {
      const now = performance.now();
      if (now - this.lastSpaceTap < 300) {
        this.flyMode = !this.flyMode;
        this.vel.set(0, 0, 0);
        this.grounded = false;
      } else if (!this.flyMode && this.grounded) {
        this.vel.y = PHYSICS.jumpVelocity;
        this.grounded = false;
      }
      this.lastSpaceTap = now;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const wishDir = new THREE.Vector3();
    if (input.isDown('KeyW')) wishDir.add(forward);
    if (input.isDown('KeyS')) wishDir.sub(forward);
    if (input.isDown('KeyD')) wishDir.add(right);
    if (input.isDown('KeyA')) wishDir.sub(right);
    wishDir.y = 0;

    const shift = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const ctrl = input.isDown('ControlLeft') || input.isDown('ControlRight');

    if (!this.flyMode) {
      if (shift) this.crouching = true;
      else if (this.crouching) {
        const standAabb = playerAABB(this.pos, PLAYER.radius, PLAYER.standingHeight);
        if (!collidesAt(world, standAabb)) this.crouching = false;
      }
    } else {
      this.crouching = false;
    }

    if (input.consumePressed('KeyW')) {
      const now = performance.now();
      if (now - this.lastForwardTap < INPUT.sprintDoubleTapMs) this.sprintLatch = true;
      this.lastForwardTap = now;
    }
    if (!input.isDown('KeyW')) this.sprintLatch = false;

    const sprinting = !this.flyMode && !this.crouching && (ctrl || this.sprintLatch) && wishDir.lengthSq() > 0;
    if (wishDir.lengthSq() > 0) wishDir.normalize();

    const maxSpeed = this.flyMode ? 12 : this.crouching ? 3.4 : sprinting ? 9.2 : 6.6;
    const accel = this.flyMode ? 35 : this.grounded ? 45 : 18;
    const friction = this.flyMode ? 10 : this.grounded ? 16 : 0.8;

    if (this.flyMode) {
      if (input.isDown('Space')) wishDir.y += 1;
      if (shift) wishDir.y -= 1;
    }

    if (!this.flyMode) {
      const speed = Math.hypot(this.vel.x, this.vel.z);
      if (speed > 0) {
        const drop = speed * friction * dt;
        const newSpeed = Math.max(0, speed - drop);
        const scale = newSpeed / speed;
        this.vel.x *= scale;
        this.vel.z *= scale;
      }
    }

    if (wishDir.lengthSq() > 0) {
      const wishSpeed = maxSpeed;
      const currentSpeed = this.vel.dot(wishDir);
      const addSpeed = wishSpeed - currentSpeed;
      if (addSpeed > 0) {
        const accelSpeed = accel * dt * wishSpeed;
        const actual = Math.min(accelSpeed, addSpeed);
        this.vel.addScaledVector(wishDir, actual);
      }
    } else if (this.flyMode) {
      this.vel.y -= this.vel.y * friction * dt;
    }

    if (!this.flyMode) this.vel.y -= PHYSICS.gravity * dt;
    this.grounded = false;

    if (this.flyMode) {
      this.vel.x = THREE.MathUtils.clamp(this.vel.x, -maxSpeed, maxSpeed);
      this.vel.y = THREE.MathUtils.clamp(this.vel.y, -maxSpeed, maxSpeed);
      this.vel.z = THREE.MathUtils.clamp(this.vel.z, -maxSpeed, maxSpeed);
    } else {
      const clampH = sprinting ? 10.5 : 8.8;
      this.vel.x = THREE.MathUtils.clamp(this.vel.x, -clampH, clampH);
      this.vel.z = THREE.MathUtils.clamp(this.vel.z, -clampH, clampH);
    }

    const radius = PLAYER.radius;
    const height = this.height;
    this.pos.copy(collideAxis({ world, pos: this.pos, vel: this.vel, axis: 'x', amount: this.vel.x * dt, radius, height }));
    this.pos.copy(
      collideAxis({
        world,
        pos: this.pos,
        vel: this.vel,
        axis: 'y',
        amount: this.vel.y * dt,
        radius,
        height,
        onGroundHit: () => {
          this.grounded = true;
        },
      }),
    );
    this.pos.copy(collideAxis({ world, pos: this.pos, vel: this.vel, axis: 'z', amount: this.vel.z * dt, radius, height }));

    this.pos.x = THREE.MathUtils.clamp(this.pos.x, radius, WORLD.width - radius);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, radius, WORLD.depth - radius);

    if (this.pos.y < -20) {
      this.pos.set(
        WORLD.width / 2 + 0.5,
        world.surfaceY(Math.floor(WORLD.width / 2), Math.floor(WORLD.depth / 2)) + 2,
        WORLD.depth / 2 + 0.5,
      );
      this.vel.set(0, 0, 0);
    }
  }

  updateCamera(options: { camera: THREE.PerspectiveCamera; worldMesh: THREE.Object3D; raycaster: THREE.Raycaster }) {
    const { camera, worldMesh, raycaster } = options;
    const yawForCamera = this.cameraMode === 'third_front' ? this.yaw + Math.PI : this.yaw;
    const euler = new THREE.Euler(this.pitch, yawForCamera, 0, 'YXZ');
    camera.quaternion.setFromEuler(euler);

    const head = this.pos.clone().add(new THREE.Vector3(0, this.eyeHeight, 0));
    if (this.cameraMode === 'first') {
      camera.position.copy(head);
      return;
    }

    const playerForward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    playerForward.y = 0;
    playerForward.normalize();
    const backDir = playerForward.clone().multiplyScalar(this.cameraMode === 'third_front' ? 1 : -1);
    const desired = head
      .clone()
      .addScaledVector(new THREE.Vector3(0, 1, 0), CAMERA.thirdPersonHeight)
      .addScaledVector(backDir, CAMERA.thirdPersonDistance);

    raycaster.set(head, desired.clone().sub(head).normalize());
    raycaster.far = head.distanceTo(desired);
    const hits = raycaster.intersectObject(worldMesh, false);
    const hit = hits[0];

    if (hit) {
      const dist = Math.max(CAMERA.thirdPersonMinDistance, hit.distance - 0.15);
      camera.position.copy(head).addScaledVector(desired.clone().sub(head).normalize(), dist);
    } else {
      camera.position.copy(desired);
    }
  }
}
