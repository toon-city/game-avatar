import {Clothe} from '../Clothe';

export class Hair extends Clothe {
  constructor(identifier: string = 'hair7', direction?: number) {
    super('hair', identifier, direction ?? 1);
  }

  public override setTint(tint: number) {
    this.tint = tint;
  }
}
