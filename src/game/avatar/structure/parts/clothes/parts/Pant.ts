import {AnimatedClothe} from '../AnimatedClothe';
import {BaseTextureLoader} from '../../../../../textures/BaseTextureLoader';

export class Pant extends AnimatedClothe {
  constructor(identifier: string = 'pant_default', direction?: number) {
    super(
      identifier,
      'pant',
      direction ?? 1,
      0.22,
      BaseTextureLoader.getInstance().HUMAN_LEGS_ANIMATIONS,
    );
    // No manual position: the texture's own trim metadata places every
    // frame (see AnimatedClothe/Clothe's class docs). Frame *content* is
    // this item's own — not locked to the body's leg animation frame-for-
    // frame — but its cycle *timing* is phase-locked to the legs' via the
    // syncAnimations param above, see AnimatedClothe's class doc for why.
  }
}
