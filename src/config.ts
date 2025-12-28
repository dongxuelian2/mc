export const WORLD = {
  width: 64,
  depth: 64,
  height: 32,
} as const;

export const PHYSICS = {
  gravity: 24,
  jumpVelocity: 9.5,
} as const;

export const PLAYER = {
  radius: 0.35,
  standingHeight: 1.8,
  crouchHeight: 1.45,
  eyeHeight: 1.75,
  crouchEyeHeight: 1.3,
} as const;

export const CAMERA = {
  thirdPersonDistance: 3.6,
  thirdPersonHeight: 1.3,
  thirdPersonMinDistance: 0.25,
} as const;

export const INPUT = {
  mouseSensitivity: 0.0025,
  sprintDoubleTapMs: 250,
} as const;

