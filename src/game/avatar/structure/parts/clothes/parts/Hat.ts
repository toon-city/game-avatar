import {Clothe} from '../Clothe';

export class Hat extends Clothe {
  constructor(identifier: string = 'hat_default', direction?: number) {
    super('hat', identifier, direction ?? 1);
  }
}
