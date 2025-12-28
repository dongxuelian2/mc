import type { FaceName } from './faceDirections';

export type TileKey =
  | 'grass_top'
  | 'grass_side'
  | 'dirt'
  | 'stone'
  | 'sand'
  | 'wood_side'
  | 'wood_top'
  | 'leaves'
  | 'plank';

export type TilePainter = (ctx: CanvasRenderingContext2D, size: number) => void;

function addSpeckles(ctx: CanvasRenderingContext2D, size: number, color: string, density: number) {
  const count = Math.floor(size * size * density);
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    ctx.fillRect(x, y, 1, 1);
  }
}

function paintNoise(ctx: CanvasRenderingContext2D, size: number, colorA: string, colorB: string) {
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, colorA);
  gradient.addColorStop(1, colorB);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  addSpeckles(ctx, size, 'rgba(0,0,0,0.08)', 0.03);
}

export const TILE_PAINTERS: Record<TileKey, TilePainter> = {
  grass_top: (ctx, size) => paintNoise(ctx, size, '#4e8c30', '#6cb340'),
  grass_side: (ctx, size) => {
    paintNoise(ctx, size, '#6a4b2f', '#7a5736');
    ctx.fillStyle = '#4e8c30';
    ctx.fillRect(0, 0, size, Math.floor(size * 0.35));
    addSpeckles(ctx, size, '#7abf42', 0.07);
  },
  dirt: (ctx, size) => paintNoise(ctx, size, '#6a4b2f', '#7a5736'),
  stone: (ctx, size) => {
    paintNoise(ctx, size, '#7c7f82', '#9a9da1');
    addSpeckles(ctx, size, '#5f6468', 0.05);
  },
  sand: (ctx, size) => paintNoise(ctx, size, '#d8c796', '#e8d7a6'),
  wood_side: (ctx, size) => {
    paintNoise(ctx, size, '#7d5a36', '#8d6a3f');
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let y = 3; y < size; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(size, y + 0.5);
      ctx.stroke();
    }
  },
  wood_top: (ctx, size) => {
    paintNoise(ctx, size, '#9b7446', '#b38452');
    ctx.strokeStyle = 'rgba(70, 40, 20, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, size - 2, size - 2);
  },
  leaves: (ctx, size) => {
    paintNoise(ctx, size, '#3c7a33', '#4e9a44');
    addSpeckles(ctx, size, '#64b34f', 0.1);
  },
  plank: (ctx, size) => {
    paintNoise(ctx, size, '#c19a6b', '#d6b07d');
    ctx.strokeStyle = 'rgba(90,60,20,0.3)';
    ctx.lineWidth = 1;
    for (let y = 0; y < size; y += size / 4) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(size, y + 0.5);
      ctx.stroke();
    }
  },
};

export const TILE_IMAGE_PATHS: Record<TileKey, string> = {
  grass_top: 'grass_block_top.png',
  grass_side: 'grass_block_side.png',
  dirt: 'dirt.png',
  stone: 'stone.png',
  sand: 'sand.png',
  wood_side: 'oak_log.png',
  wood_top: 'oak_log_top.png',
  leaves: 'oak_leaves.png',
  plank: 'oak_planks.png',
};

export type BlockId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type BlockDef = Readonly<{
  name: string;
  solid: boolean;
  faces?: Readonly<Record<FaceName, TileKey>>;
  tint?: string;
}>;

export const BLOCK_TYPES: Readonly<Record<BlockId, BlockDef>> = {
  0: { name: 'Air', solid: false },
  1: {
    name: 'Grass',
    solid: true,
    faces: { px: 'grass_side', nx: 'grass_side', py: 'grass_top', ny: 'dirt', pz: 'grass_side', nz: 'grass_side' },
    tint: '#6cb340',
  },
  2: { name: 'Dirt', solid: true, faces: { px: 'dirt', nx: 'dirt', py: 'dirt', ny: 'dirt', pz: 'dirt', nz: 'dirt' }, tint: '#7a5736' },
  3: { name: 'Stone', solid: true, faces: { px: 'stone', nx: 'stone', py: 'stone', ny: 'stone', pz: 'stone', nz: 'stone' }, tint: '#8d9196' },
  4: { name: 'Sand', solid: true, faces: { px: 'sand', nx: 'sand', py: 'sand', ny: 'sand', pz: 'sand', nz: 'sand' }, tint: '#e8d7a6' },
  5: { name: 'Wood', solid: true, faces: { px: 'wood_side', nx: 'wood_side', py: 'wood_top', ny: 'wood_top', pz: 'wood_side', nz: 'wood_side' }, tint: '#a17444' },
  6: { name: 'Leaves', solid: true, faces: { px: 'leaves', nx: 'leaves', py: 'leaves', ny: 'leaves', pz: 'leaves', nz: 'leaves' }, tint: '#4e9a44' },
  7: { name: 'Planks', solid: true, faces: { px: 'plank', nx: 'plank', py: 'plank', ny: 'plank', pz: 'plank', nz: 'plank' }, tint: '#d6b07d' },
};

export const SELECTABLE_BLOCK_IDS: readonly BlockId[] = [1, 2, 3, 4, 5, 6, 7] as const;

