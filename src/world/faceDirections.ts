export type FaceName = 'px' | 'nx' | 'py' | 'ny' | 'pz' | 'nz';

export type FaceDirection = Readonly<{
  name: FaceName;
  dir: readonly [number, number, number];
  corners: readonly (readonly [number, number, number])[];
}>;

export const FACE_DIRECTIONS: readonly FaceDirection[] = [
  { name: 'px', dir: [1, 0, 0], corners: [[1, 1, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0]] },
  { name: 'nx', dir: [-1, 0, 0], corners: [[0, 1, 0], [0, 0, 0], [0, 0, 1], [0, 1, 1]] },
  { name: 'py', dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { name: 'ny', dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { name: 'pz', dir: [0, 0, 1], corners: [[0, 1, 1], [0, 0, 1], [1, 0, 1], [1, 1, 1]] },
  { name: 'nz', dir: [0, 0, -1], corners: [[1, 1, 0], [1, 0, 0], [0, 0, 0], [0, 1, 0]] },
] as const;

