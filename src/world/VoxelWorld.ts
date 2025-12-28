export class VoxelWorld {
  public readonly width: number;
  public readonly height: number;
  public readonly depth: number;
  private readonly data: Uint8Array;

  constructor(width: number, height: number, depth: number) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.data = new Uint8Array(width * height * depth);
  }

  index(x: number, y: number, z: number) {
    return x + z * this.width + y * this.width * this.depth;
  }

  inBounds(x: number, y: number, z: number) {
    return x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.height && z < this.depth;
  }

  get(x: number, y: number, z: number) {
    if (!this.inBounds(x, y, z)) return 0;
    return this.data[this.index(x, y, z)];
  }

  set(x: number, y: number, z: number, value: number) {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.index(x, y, z)] = value;
  }

  surfaceY(x: number, z: number) {
    for (let y = this.height - 1; y >= 0; y -= 1) {
      if (this.get(x, y, z) !== 0) return y + 1;
    }
    return 1;
  }
}

