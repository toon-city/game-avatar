import {AnimatedClothe} from '../AnimatedClothe';

export class Hair extends AnimatedClothe {
  constructor(identifier: string = 'hair7', direction?: number) {
    super(identifier, 'hair', direction ?? 1);
  }

  /** Hair IS recoloured by the player's hair colour (User.as tints the `c1` clip). */
  public override setTint(tint: number) {
    this.tint = tint;
  }
}
