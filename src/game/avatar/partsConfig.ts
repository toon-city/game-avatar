export type PartConfig = {
  category: string;
  id?: string;
  className: string;
  order: number;
  required?: boolean;
  /**
   * Clothing only: this category can also render a `TimedClothe` decorative
   * overlay (e.g. Michael1's twinkling stars) from the SAME item's
   * spritesheet, looping on its own real-time clock regardless of walking —
   * see TimedClothe's class doc. Avatar.changeClothing() inserts/removes it
   * right above the item itself (`order + 0.1`), not through this config's
   * own `order` directly.
   */
  hasTimedOverlay?: boolean;
  /**
   * Clothing only: items in this category carry their own arm on the facings
   * where the body rig draws none, so Avatar.changeClothing() stacks a
   * `ClotheArm` and a `ClotheSleeve` on top of the item (see their class docs).
   * Only tops do — `vmilieu` is the one placeholder the rig leaves armless —
   * and the exporter enforces the same rule, so this is not a per-item switch:
   * a top with no arm for a facing simply renders nothing for both layers.
   */
  hasArm?: boolean;
};

/**
 * Draw order, taken from the original rig's own depths (perso_V3.swf, sprite
 * "toon"): bras2 1 < bras1 7 < jambes 13 < torse 24 < tete 31 < vbas 39 <
 * vmilieu 41 < maquillage 43 < cheveux 45 < casquette 47.
 *
 * Both body arms sit BEHIND the torso, and every garment sits in front of the
 * whole body — which is exactly why a garment can carry the arm the rig does
 * not draw for that facing (see swf_to_rig.py) and have it read correctly in
 * front of the fabric.
 */
export const PARTS_CONFIG: PartConfig[] = [
  { category: 'body', className: 'AvatarArms', id: 'right', order: 0, required: true },
  { category: 'body', className: 'AvatarArms', id: 'left',  order: 1, required: true },
  { category: 'body', className: 'AvatarLegs',              order: 2, required: true },
  { category: 'body', className: 'AvatarBody',              order: 3, required: true },
  { category: 'body', className: 'AvatarHead',              order: 4, required: true },
  { category: 'pant',   className: 'Pant',   order: 5 },
  { category: 'tshirt', className: 'Tshirt', order: 6, hasArm: true, hasTimedOverlay: true },
  { category: 'face',   className: 'Face',   order: 7 },
  { category: 'hair',   className: 'Hair',   order: 8 },
  { category: 'hat',    className: 'Hat',    order: 9 }
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