import {AnimatedSprite, Assets, Texture} from 'pixi.js';
import {IAvatarBodyPart} from './IAvatarBodyPart';

/**
 * Represents an abstract class for an animated body part of an avatar.
 * @abstract
 * @class
 * @extends AnimatedSprite
 * @implements IAvatarPart
 */
export abstract class AvatarAnimatedBodyPart
  extends AnimatedSprite
  implements IAvatarBodyPart
{
  private _direction: number;
  private _identifier: string;

  public get isSkin() {
    return true;
  }

  /**
   * Gets the identifier of the body part.
   * @public
   * @readonly
   */
  public get identifier(): string {
    return this._identifier;
  }

  /**
   * Gets the number of animation frames.
   * @public
   * @readonly
   */
  public get animationFrameCount(): number {
    return this.textures.length;
  }

  /**
   * Gets the direction of the body part.
   * @public
   * @readonly
   */
  public get direction(): number {
    return this._direction;
  }

  /**
   * Sets the direction of the body part.
   * @public
   * @param {number} dir - The direction value.
   */
  /** Does the body rig draw this part at all for `direction`? */
  private hasArtwork(direction: number): boolean {
    return Assets.cache.has(`${this._identifier}_${direction}_0.png`);
  }

  public set direction(dir: number) {
    // Ne rien faire si la direction n'a pas changé : évite de réassigner
    // les textures (ce qui appelle gotoAndStop en interne PIXI et brise
    // l'animation en cours).
    if (dir === this._direction) return;

    this._direction = dir;

    // A part can legitimately have NO artwork for a facing: the rig only draws
    // arms on face/back (both) and the lower diagonals (the far one), because
    // elsewhere the garment supplies the arm and animates it — see
    // game-assets/tools/swf_to_rig.py. Render nothing rather than keeping the
    // previous facing's pose, which would leave a stray arm floating.
    if (!this.hasArtwork(dir)) {
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      return;
    }

    this.texture = Texture.from(`${this._identifier}_${this._direction}_0.png`);
    const frames = this._animations[dir - 1];
    this.textures = frames && frames.length > 0 ? frames : [this.texture];
    this.resetAnimationSpeed();
    // PIXI's AnimatedSprite stops when textures are replaced (internal gotoAndStop).
    // If the part was walking, restart the animation with the new direction frames.
    if (this._walking && this.textures.length > 1) this.play();
  }

  /**
   * Creates an instance of AvatarAnimatedBodyPart.
   * @constructor
   * @param {Texture[][]} _animations - The animation textures for each direction.
   * @param {string} identifier - The identifier of the body part.
   * @param {number|null} direction - The initial direction value (default: 1).
   */
  constructor(
    private _animations: Texture[][],
    identifier: string,
    direction: number | null
  ) {
    super(_animations[0]?.length ? _animations[0] : [Texture.EMPTY]);
    this._identifier = identifier;
    this._direction = direction ?? 1;
    // super() seeded the frames of direction 1. Without this, an avatar spawned
    // facing any other direction — every player already in the room when you
    // walk in — kept animating with direction 1's frames, because the setter
    // below rightly treats its direction as already applied.
    if (!this.hasArtwork(this._direction)) {
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      return;
    }
    this.texture = Texture.from(`${this._identifier}_${this._direction}_0.png`);
    const frames = _animations[this._direction - 1];
    this.textures = frames && frames.length > 0 ? frames : [this.texture];
  }

  /**
   * Gets the walking state of the body part.
   * @public
   * @readonly
   */
  public get walking(): boolean {
    return this._walking;
  }

  private _walking = false;

  /**
   * Sets the tint color of the body part.
   * @public
   * @param {number} tint - The tint color value.
   */
  setTint(tint: number): void {
    this.tint = tint;
  }

  /**
   * Initiates the walking animation of the body part.
   * @public
   */
  walk(): void {
    this._walking = true;
    if (this.textures.length > 1) this.play();
  }

  /**
   * Stops the walking animation of the body part.
   * @public
   */
  stopWalk(): void {
    this._walking = false;
    this.stop();
    if (!this.hasArtwork(this._direction)) {
      this.texture = Texture.EMPTY;
      return;
    }
    this.texture = Texture.from(`${this._identifier}_${this._direction}_0.png`);
  }

  /**
   * Resets the animation speed of the body part.
   * @protected
   */
  protected resetAnimationSpeed(): void {
    return;
  }
}
