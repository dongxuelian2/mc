import { BLOCK_TYPES, SELECTABLE_BLOCK_IDS, type BlockId } from '../world/blocks';

export class HUD {
  private readonly root: HTMLDivElement;
  private readonly blockName: HTMLDivElement;
  private readonly status: HTMLDivElement;
  private readonly hotbar: HTMLDivElement;
  private readonly inventory: HTMLDivElement;
  private readonly inventoryGrid: HTMLDivElement;
  private inventorySelectHandler: ((id: BlockId) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud';
    this.root.innerHTML = `
      <div id="crosshair"></div>
      <div id="top-info">
        <div id="status"></div>
        <div id="block-name"></div>
      </div>
      <div id="hotbar"></div>
      <div id="inventory" class="hidden">
        <div class="inventory-title">背包</div>
        <div id="inventory-grid"></div>
      </div>
    `;
    parent.appendChild(this.root);

    this.blockName = this.root.querySelector('#block-name') as HTMLDivElement;
    this.status = this.root.querySelector('#status') as HTMLDivElement;
    this.hotbar = this.root.querySelector('#hotbar') as HTMLDivElement;
    this.inventory = this.root.querySelector('#inventory') as HTMLDivElement;
    this.inventoryGrid = this.root.querySelector('#inventory-grid') as HTMLDivElement;
  }

  setStatus(text: string) {
    this.status.textContent = text;
  }

  setInventoryOpen(open: boolean) {
    this.inventory.classList.toggle('hidden', !open);
  }

  onInventorySelect(handler: (id: BlockId) => void) {
    this.inventorySelectHandler = handler;
  }

  renderSelection(selectedBlockId: BlockId, inventory: Partial<Record<BlockId, number>>, extraText?: string) {
    const block = BLOCK_TYPES[selectedBlockId];
    this.blockName.textContent = `选中：${block?.name ?? 'None'}${extraText ? ` | 获得：${extraText}` : ''}`;

    this.hotbar.innerHTML = '';
    for (const id of SELECTABLE_BLOCK_IDS) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      if (id === selectedBlockId) slot.classList.add('active');
      slot.innerHTML = `<div class="slot-label">${BLOCK_TYPES[id].name}</div><div class="slot-count">${inventory[id] ?? 0}</div>`;
      this.hotbar.appendChild(slot);
    }

    this.inventoryGrid.innerHTML = '';
    for (const id of SELECTABLE_BLOCK_IDS) {
      const cell = document.createElement('div');
      cell.className = 'slot inventory-slot';
      if (id === selectedBlockId) cell.classList.add('active');
      cell.innerHTML = `<div class="slot-label">${BLOCK_TYPES[id].name}</div><div class="slot-count">${inventory[id] ?? 0}</div>`;
      if (this.inventorySelectHandler) {
        cell.addEventListener('click', () => this.inventorySelectHandler?.(id));
      }
      this.inventoryGrid.appendChild(cell);
    }
  }
}

