import {AnimatedClothe} from '../AnimatedClothe';

export class Pant extends AnimatedClothe {
  constructor(identifier: string = 'pant_default', direction?: number) {
    super(identifier, 'pant', direction ?? 1);
    // No manual position: the texture's own trim metadata places every
    // frame (see AnimatedClothe/Clothe's class docs). Frame count and
    // timing are this item's own — not locked to the body's leg animation,
    // see AnimatedClothe's class doc for why.
  }
}
