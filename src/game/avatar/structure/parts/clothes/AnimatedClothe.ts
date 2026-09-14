import {AnimatedSprite, Assets, Texture} from 'pixi.js';
import {IClothe} from './IClothe';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

/**
 * Base class for a clothing layer that animates through its own walk cycle
 * (currently: pants) — sibling of `Clothe`, not a subclass of it: `Clothe`
 * extends `Sprite` (one static texture per direction), this extends
 * `AnimatedSprite` (a texture array per direction), and PIXI doesn't let a
 * class be both.
 *
 * Unlike `ClotheSleeve` (arm-sleeve overlays), this does NOT need to be
 * frame-locked to any body part's animation. A sleeve has to match the arm
 * it partially reveals frame-for-frame, or the body's own arm shows through
 * misaligned. An item using this class sits at a z-order that fully covers
 * what's underneath (e.g. `Pant`, order 2.5 in partsConfig.ts), so nothing
 * of the body is ever visible through it; its own frame *content* is
 * entirely independent of the body's, no per-frame matching needed.
 *
 * Its *timing* is a different story: with an unrelated frame count but the
 * same flat `baseAnimationSpeed`, the garment's swing cycle and the leg's
 * own gait cycle have different periods and drift in and out of phase
 * continuously — visible even with the leg itself fully hidden, since the
 * mismatch reads as "two things animating at odds" on its own. The optional
 * `syncAnimations` param (same `Texture[][]` shape as
 * `BaseTextureLoader.HUMAN_LEGS_ANIMATIONS`, indexed by `direction - 1`)
 * fixes that by scaling `animationSpeed` per direction so this item's cycle
 * takes exactly as many ticks as the reference animation's — same start
 * (both fire from `Avatar.walk()`), same period, so they stay phase-locked
 * indefinitely instead of only briefly lining up. Still no frame-for-frame
 * matching, just matched cycle length.
 *
 * Frame contract: `{id}_{direction}_{n}.png`, `n` starting at 0, same 80x120
 * trim canvas as `Clothe` (see its class doc — no app-side offset here
 * either). A direction with only `_0.png` is a static item for that facing
 * (playing an AnimatedSprite with one texture does nothing visible) — this
 * is how a non-animated bottom (a skirt) is expressed, not a separate code
 * path.
 */
export class AnimatedClothe extends AnimatedSprite implements IClothe {
  private _direction: number;
  private _walking = false;
  private readonly _identifier: string;
  private readonly _type: string;

  constructor(
    identifier: string,
    type: string,
    direction: number,
    private readonly baseAnimationSpeed = 0.22,
    /** See class doc — optional per-direction reference animation to phase-lock this item's cycle length to. */
    private readonly syncAnimations?: Texture[][],
  ) {
    super([Texture.EMPTY]);
    this._identifier = identifier;
    this._type = type;
    this._direction = direction;

    if (Assets.cache.has(this.fileURI)) {
      this.applyDirection();
    } else {
      Assets.load(this.fileURI).then(() => this.applyDirection());
    }
  }

  public get fileURI(): string {
    return AssetBaseUrl.resolve(`clothes/${this._type}/${this._identifier}.json`);
  }

  public get identifier(): string {
    return this._identifier;
  }

  public get direction(): number {
    return this._direction;
  }

  public set direction(dir: number) {
    // No-op on an unchanged direction: reassigning textures would restart
    // the animation mid-stride for nothing (same guard as
    // AvatarAnimatedBodyPart/ClotheSleeve).
    if (dir === this._direction) return;
    this._direction = dir;
    this.applyDirection();
  }

  public get walking(): boolean {
    return this._walking;
  }

  setTint(): void {
    // The garment carries its own colors — never tinted by skin color,
    // same as ClotheSleeve.
  }

  walk(): void {
    this._walking = true;
    if (this.textures.length > 1) this.play();
  }

  stopWalk(): void {
    this._walking = false;
    this.stop();
    if (this.textures.length > 0) this.texture = this.textures[0] as Texture;
  }

  /**
   * `baseAnimationSpeed` scaled so this direction's cycle (`ownFrameCount`
   * frames) takes the same number of ticks as `syncAnimations`' cycle for
   * the same direction, if one was given — see class doc. Falls back to
   * the flat `baseAnimationSpeed` when there's no reference to sync to, or
   * the reference has no frames for this direction (nothing to divide by).
   */
  private computeAnimationSpeed(ownFrameCount: number): number {
    const refCount = this.syncAnimations?.[this._direction - 1]?.length ?? 0;
    if (refCount === 0) return this.baseAnimationSpeed;
    return this.baseAnimationSpeed * (ownFrameCount / refCount);
  }

  /** Collect `{identifier}_{direction}_{n}.png` for n = 0, 1, 2, ... until one is missing. */
  private framesForCurrentDirection(): Texture[] {
    if (!Assets.cache.has(this.fileURI)) return [];
    const frames: Texture[] = [];
    for (let n = 0; ; n++) {
      const name = `${this._identifier}_${this._direction}_${n}.png`;
      if (!Assets.cache.has(name)) break;
      frames.push(Texture.from(name));
    }
    return frames;
  }

  private applyDirection(): void {
    const frames = this.framesForCurrentDirection();

    if (frames.length === 0) {
      // Nothing authored for this direction — render nothing rather than
      // freezing on a stale pose from a previous direction (same as
      // ClotheSleeve's "no sleeve on this facing" case).
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      return;
    }

    this.textures = frames;
    this.texture = frames[0] as Texture;
    this.animationSpeed = this.computeAnimationSpeed(frames.length);

    if (this._walking && frames.length > 1) this.play();
  }
}
