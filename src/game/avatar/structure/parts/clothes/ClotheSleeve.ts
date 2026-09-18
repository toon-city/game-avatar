import {Texture} from 'pixi.js';
import {AnimatedClothe} from './AnimatedClothe';

/**
 * The part of a garment that the original draws IN FRONT of its own arm — the
 * sleeve, plus whatever trim the SWF placed after the arm clip.
 *
 * It is a layer of its own because the original's draw order is torso, then
 * arm, then sleeve (see game-assets/tools/swf_to_rig.py). Flattening the fabric
 * into one frame would force the arm either in front of the torso or behind
 * the sleeve, and both read wrong. So the exporter cuts the garment at its arm
 * and writes the front half as `{id}_sleeve_*`, in the GARMENT's own sheet, and
 * Avatar stacks the three in that order.
 *
 * A garment with no arm of its own — every slot but tops, and a top's face and
 * back facings, where the body rig draws the arms — has no `_sleeve_` frames at
 * all and this renders nothing, the same "no artwork for this facing"
 * convention every other part uses.
 */
export class ClotheSleeve extends AnimatedClothe {
  constructor(
    clothingId: string,
    /** The clothing category this sleeve belongs to — used by
     *  Avatar.changeClothing() to remove it alongside its garment. */
    public readonly category: string,
    direction: number,
    syncAnimations?: Texture[][],
  ) {
    super(`${clothingId}_sleeve`, category, direction, 0.22, syncAnimations, clothingId);
  }
}
