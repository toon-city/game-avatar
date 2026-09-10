import {Clothe} from '../Clothe';

export class Pant extends Clothe {
  constructor(identifier: string = 'pant_default', direction?: number) {
    super('pant', identifier, direction ?? 1);
    // No manual position: the texture's own trim metadata places it (see Clothe's class doc).
  }
}
