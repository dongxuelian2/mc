import * as THREE from 'three';

function makeLimb(geom: THREE.BoxGeometry, material: THREE.Material) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.y = -geom.parameters.height / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

export class PlayerModel {
  public readonly root = new THREE.Group();
  private readonly leftLeg: THREE.Object3D;
  private readonly rightLeg: THREE.Object3D;
  private readonly leftArm: THREE.Object3D;
  private readonly rightArm: THREE.Object3D;

  constructor() {
    const skin = new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 1, metalness: 0 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x2b66d9, roughness: 1, metalness: 0 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 1, metalness: 0 });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), skin);
    head.position.set(0, 1.52, 0);
    head.castShadow = true;
    head.receiveShadow = true;

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.28), shirt);
    body.position.set(0, 1.02, 0);
    body.castShadow = true;
    body.receiveShadow = true;

    this.leftArm = makeLimb(new THREE.BoxGeometry(0.18, 0.62, 0.18), skin);
    this.rightArm = makeLimb(new THREE.BoxGeometry(0.18, 0.62, 0.18), skin);
    this.leftLeg = makeLimb(new THREE.BoxGeometry(0.2, 0.68, 0.2), pants);
    this.rightLeg = makeLimb(new THREE.BoxGeometry(0.2, 0.68, 0.2), pants);

    this.leftArm.position.set(-0.37, 1.34, 0);
    this.rightArm.position.set(0.37, 1.34, 0);
    this.leftLeg.position.set(-0.14, 0.68, 0);
    this.rightLeg.position.set(0.14, 0.68, 0);

    this.root.add(head, body, this.leftArm, this.rightArm, this.leftLeg, this.rightLeg);
    this.root.castShadow = true;
  }

  setVisible(visible: boolean) {
    this.root.visible = visible;
  }

  update(options: { position: THREE.Vector3; yaw: number; velocity: THREE.Vector3; crouching: boolean }) {
    const { position, yaw, velocity, crouching } = options;
    this.root.position.copy(position);
    this.root.rotation.set(0, yaw, 0);
    this.root.position.y += crouching ? 0.18 : 0;

    const speed = Math.hypot(velocity.x, velocity.z);
    const t = performance.now() / 120;
    const swing = Math.min(1, speed / 7) * Math.sin(t) * 0.8;
    const armSwing = -swing * 0.7;

    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;
    this.leftArm.rotation.x = armSwing;
    this.rightArm.rotation.x = -armSwing;

    if (speed < 0.2) {
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
      this.leftArm.rotation.x *= 0.85;
      this.rightArm.rotation.x *= 0.85;
    }
  }
}

