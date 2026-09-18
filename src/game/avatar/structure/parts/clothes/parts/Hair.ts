import {AnimatedClothe} from '../AnimatedClothe';

export class Hair extends AnimatedClothe {
  /** Marks this as tintable for Avatar.setHairColor()'s `'isHair' in part` check. */
  public readonly isHair = true;

  constructor(identifier: string = 'hair7', direction?: number) {
    super(identifier, 'hair', direction ?? 1);
  }

  /** Hair IS recoloured by the player's hair colour (User.as tints the `c1` clip). */
  public override setTint(tint: number) {
    this.tint = tint;
  }
}
