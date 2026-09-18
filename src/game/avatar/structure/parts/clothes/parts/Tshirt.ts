import {AnimatedClothe} from '../AnimatedClothe';
import {BaseTextureLoader} from '../../../../../textures/BaseTextureLoader';

export class Tshirt extends AnimatedClothe {
  constructor(identifier: string = 'tshirt_default', direction?: number) {
    super(
      identifier,
      'tshirt',
      direction ?? 1,
      0.22,
      BaseTextureLoader.getInstance().HUMAN_LEGS_ANIMATIONS,
    );
    // A top carries the arm the body rig does not draw for this facing (see
    // swf_to_rig.py), so it animates through its own walk frames like a pant
    // does. Cycle length is phase-locked to the legs' — see AnimatedClothe.
  }
}
