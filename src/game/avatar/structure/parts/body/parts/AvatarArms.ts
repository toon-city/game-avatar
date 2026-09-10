import { BaseTextureLoader } from '../../../../../textures/BaseTextureLoader';
import { AvatarAnimatedBodyPart } from '../AvatarAnimatedBodyPart';

/**
 * Single class managing both arms.
 *
 * @param side  `'right'` → back arm (rendered behind the body)
 *              `'left'`  → front arm (rendered in front of the body)
 *
 * Two instances of this class are added to the avatar at different z-orders
 * to preserve the correct depth ordering with the body and torso.
 */
export class AvatarArms extends AvatarAnimatedBodyPart {
  constructor(direction: number | null, public readonly side: 'left' | 'right') {
    const loader = BaseTextureLoader.getInstance();
    const animations =
      side === 'left'
        ? loader.HUMAN_ARM_L_ANIMATIONS
        : loader.HUMAN_ARM_R_ANIMATIONS;
    const identifier = side === 'left' ? 'human_al' : 'human_ar';

    super(animations, identifier, direction);
  }

  public override resetAnimationSpeed(): void {
    // Preserve the original per-side speed
    if (this.side === 'left') {
      this.animationSpeed = 0.05 * this.animationFrameCount - 0.15;
    } else {
      this.animationSpeed = 0.05 * this.animationFrameCount - 0.1;
    }
  }
}
