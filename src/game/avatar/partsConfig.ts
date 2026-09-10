export type PartConfig = {
  category: string;
  id?: string;
  className: string;
  order: number;
  required?: boolean;
  /**
   * Clothing only: this category can also render animated arm-sleeve overlays
   * (see ClotheSleeve) from the SAME item's spritesheet. Avatar.changeClothing()
   * inserts/removes them next to the matching AvatarArms('right'/'left') parts —
   * not through this config's own `order`, since a sleeve must share its arm's
   * z-order, not the item's.
   */
  hasSleeves?: boolean;
};

export const PARTS_CONFIG: PartConfig[] = [
  { category: 'body', className: 'AvatarArms', id: 'right', order: 0, required: true },
  { category: 'body', className: 'AvatarLegs',             order: 1, required: true },
  // Pants sit on the legs, under the torso — a shirt tucked over a waistband.
  { category: 'pant', className: 'Pant', order: 1.5 },
  { category: 'body', className: 'AvatarBody',             order: 2, required: true },
  { category: 'tshirt', className: 'Tshirt', order: 3, hasSleeves: true },
  { category: 'body', className: 'AvatarArms', id: 'left',  order: 4, required: true },
  { category: 'body', className: 'AvatarHead',             order: 5, required: true },
  { category: 'hair', className: 'Hair', order: 6 },
  // Face accessories (glasses, mask) sit over hair but under a hat's brim.
  // Default order, easy to flip to 5.5 (before hair) if a design needs it.
  { category: 'face', className: 'Face', order: 6.5 },
  { category: 'hat',  className: 'Hat',  order: 7 }
];

export function getPartsInOrder(): PartConfig[] {
  return [...PARTS_CONFIG].sort((a, b) => a.order - b.order);
}

export function getPartsByCategory(category: string): PartConfig[] {
  return PARTS_CONFIG.filter(part => part.category === category);
}

export function addPartConfig(config: PartConfig): void {
  PARTS_CONFIG.push(config);
  PARTS_CONFIG.sort((a, b) => a.order - b.order);
}