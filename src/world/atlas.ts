import * as THREE from 'three';
import type { TileKey, TilePainter } from './blocks';

export type AtlasUV = Readonly<{ u0: number; v0: number; u1: number; v1: number }>;

export type TextureAtlas = Readonly<{
  texture: THREE.Texture;
  uvs: Record<TileKey, AtlasUV>;
  tileSize: number;
}>;

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return await new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.loading = 'eager';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function buildAtlas(options: {
  tileSize: number;
  painters: Record<TileKey, TilePainter>;
  imagePaths?: Partial<Record<TileKey, string>>;
  baseUrl?: string;
}): Promise<TextureAtlas> {
  const { tileSize, painters, imagePaths = {}, baseUrl = '/assets/blocks/' } = options;
  const tileNames = Object.keys(painters) as TileKey[];
  const atlasSize = Math.ceil(Math.sqrt(tileNames.length));

  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = atlasCanvas.height = atlasSize * tileSize;
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D canvas context for atlas');

  const uvs = {} as Record<TileKey, AtlasUV>;

  await Promise.all(
    tileNames.map(async (name, i) => {
      const x = (i % atlasSize) * tileSize;
      const y = Math.floor(i / atlasSize) * tileSize;

      const externalPath = imagePaths[name];
      const img = externalPath ? await loadImage(`${baseUrl}${externalPath}`) : null;
      if (img) {
        ctx.drawImage(img, x, y, tileSize, tileSize);
      } else {
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = tileCanvas.height = tileSize;
        const tileCtx = tileCanvas.getContext('2d');
        if (!tileCtx) throw new Error('Could not create 2D canvas context for tile');
        painters[name](tileCtx, tileSize);
        ctx.drawImage(tileCanvas, x, y);
      }

      const u0 = x / atlasCanvas.width;
      const v0 = y / atlasCanvas.height;
      const u1 = (x + tileSize) / atlasCanvas.width;
      const v1 = (y + tileSize) / atlasCanvas.height;
      uvs[name] = { u0, v0, u1, v1 };
    }),
  );

  const texture = new THREE.CanvasTexture(atlasCanvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestMipMapNearestFilter;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return { texture, uvs, tileSize };
}

