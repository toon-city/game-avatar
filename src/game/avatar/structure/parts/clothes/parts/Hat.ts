import {AnimatedClothe} from '../AnimatedClothe';

export class Hat extends AnimatedClothe {
  constructor(identifier: string = 'hat_default', direction?: number) {
    super(identifier, 'hat', direction ?? 1);
  }
}
