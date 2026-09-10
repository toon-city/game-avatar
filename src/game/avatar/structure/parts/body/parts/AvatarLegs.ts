import {BaseTextureLoader} from '../../../../../textures/BaseTextureLoader';
import {AvatarAnimatedBodyPart} from '../AvatarAnimatedBodyPart';

export class AvatarLegs extends AvatarAnimatedBodyPart {
  constructor(direction: number | null) {
    super(
      BaseTextureLoader.getInstance().HUMAN_LEGS_ANIMATIONS,
      'human_lg',
      direction
    );
    this.animationSpeed = 0.22;
  }
}
