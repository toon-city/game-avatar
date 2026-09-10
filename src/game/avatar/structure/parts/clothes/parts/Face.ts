import {Clothe} from '../Clothe';

export class Face extends Clothe {
  constructor(identifier: string = 'face_default', direction?: number) {
    super('face', identifier, direction ?? 1);
    // No manual position: the texture's own trim metadata places it (see Clothe's class doc).
  }
}
