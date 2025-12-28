import type { BlockId } from '../world/blocks';

type SoundGroup = 'grass' | 'dirt' | 'stone' | 'sand' | 'wood' | 'leaves';

const BASE = '/assets/sounds/';

const BREAK: Record<SoundGroup, readonly string[]> = {
  grass: ['block/grass/break1.ogg', 'block/grass/break2.ogg', 'block/grass/break3.ogg', 'block/grass/break4.ogg'],
  dirt: ['block/gravel/break1.ogg', 'block/gravel/break2.ogg', 'block/gravel/break3.ogg', 'block/gravel/break4.ogg'],
  stone: ['block/stone/break1.ogg', 'block/stone/break2.ogg', 'block/stone/break3.ogg', 'block/stone/break4.ogg'],
  sand: ['block/sand/break1.ogg', 'block/sand/break2.ogg', 'block/sand/break3.ogg', 'block/sand/break4.ogg'],
  wood: ['block/wood/break1.ogg', 'block/wood/break2.ogg', 'block/wood/break3.ogg', 'block/wood/break4.ogg'],
  leaves: ['block/grass/break1.ogg', 'block/grass/break2.ogg', 'block/grass/break3.ogg', 'block/grass/break4.ogg'],
};

const PLACE: Record<SoundGroup, readonly string[]> = {
  grass: ['block/grass/place1.ogg', 'block/grass/place2.ogg', 'block/grass/place3.ogg', 'block/grass/place4.ogg'],
  dirt: ['block/gravel/place1.ogg', 'block/gravel/place2.ogg', 'block/gravel/place3.ogg', 'block/gravel/place4.ogg'],
  stone: ['block/stone/place1.ogg', 'block/stone/place2.ogg', 'block/stone/place3.ogg', 'block/stone/place4.ogg'],
  sand: ['block/sand/place1.ogg', 'block/sand/place2.ogg', 'block/sand/place3.ogg', 'block/sand/place4.ogg'],
  wood: ['block/wood/place1.ogg', 'block/wood/place2.ogg', 'block/wood/place3.ogg', 'block/wood/place4.ogg'],
  leaves: ['block/grass/place1.ogg', 'block/grass/place2.ogg', 'block/grass/place3.ogg', 'block/grass/place4.ogg'],
};

const STEP: Record<SoundGroup, readonly string[]> = {
  grass: ['block/grass/step1.ogg', 'block/grass/step2.ogg', 'block/grass/step3.ogg', 'block/grass/step4.ogg'],
  dirt: ['block/gravel/step1.ogg', 'block/gravel/step2.ogg', 'block/gravel/step3.ogg', 'block/gravel/step4.ogg'],
  stone: ['block/stone/step1.ogg', 'block/stone/step2.ogg', 'block/stone/step3.ogg', 'block/stone/step4.ogg'],
  sand: ['block/sand/step1.ogg', 'block/sand/step2.ogg', 'block/sand/step3.ogg', 'block/sand/step4.ogg'],
  wood: ['block/wood/step1.ogg', 'block/wood/step2.ogg', 'block/wood/step3.ogg', 'block/wood/step4.ogg'],
  leaves: ['block/grass/step1.ogg', 'block/grass/step2.ogg', 'block/grass/step3.ogg', 'block/grass/step4.ogg'],
};

function groupForBlock(id: BlockId): SoundGroup {
  switch (id) {
    case 1:
      return 'grass';
    case 2:
      return 'dirt';
    case 3:
      return 'stone';
    case 4:
      return 'sand';
    case 5:
    case 7:
      return 'wood';
    case 6:
      return 'leaves';
    default:
      return 'stone';
  }
}

function toUrls(paths: readonly string[]) {
  return paths.map((p) => `${BASE}${p}`);
}

export function breakSoundUrls(blockId: BlockId) {
  return toUrls(BREAK[groupForBlock(blockId)]);
}

export function placeSoundUrls(blockId: BlockId) {
  return toUrls(PLACE[groupForBlock(blockId)]);
}

export function stepSoundUrls(blockId: BlockId) {
  return toUrls(STEP[groupForBlock(blockId)]);
}

