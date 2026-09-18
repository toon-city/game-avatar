import {AnimatedClothe} from '../AnimatedClothe';

export class Face extends AnimatedClothe {
  constructor(identifier: string = 'face_default', direction?: number) {
    super(identifier, 'face', direction ?? 1);
  }
}
