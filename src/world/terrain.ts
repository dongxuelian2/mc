import { VoxelWorld } from './VoxelWorld';

export function generateFlatWorld(world: VoxelWorld) {
  const groundHeight = 6;
  for (let x = 0; x < world.width; x += 1) {
    for (let z = 0; z < world.depth; z += 1) {
      for (let y = 0; y < world.height; y += 1) {
        let blockId = 0;
        if (y < groundHeight - 3) blockId = 3; // stone
        else if (y < groundHeight - 1) blockId = 2; // dirt
        else if (y === groundHeight - 1) blockId = 1; // grass surface
        world.set(x, y, z, blockId);
      }
    }
  }
}

