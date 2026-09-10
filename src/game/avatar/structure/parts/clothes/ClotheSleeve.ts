import {AnimatedSprite, Assets, Texture} from 'pixi.js';
import {IAvatarPart} from '../IAvatarPart';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

/**
 * Animated arm-sleeve overlay for a clothing item (e.g. a tshirt's sleeves).
 *
 * A clothing item's own layer (see Clothe.ts) is a single static sprite
 * roughly at torso z-order. Sleeves are different: they must sit at the
 * EXACT same z-order as the matching body arm (right sleeve behind the
 * torso like the back arm, left sleeve in front of it like the front arm),
 * and they must animate in lockstep with that arm's own walk cycle. So this
 * is its own part, inserted by Avatar.changeClothing() right next to the
 * AvatarArms instance it shadows — not through the usual one-part-per-category
 * clothing slot.
 *
 * Frame contract: `{id}_al_{direction}_{frame}.png` (left) or
 * `{id}_ar_{direction}_{frame}.png` (right), in the SAME spritesheet as the
 * clothing item's main texture, on the same 80x120 trim canvas as everything
 * else (see Clothe's class doc — no app-side offset here either).
 *
 * Frame COUNT for a direction must match the avatar body's own
 * al_wlk_{direction} / ar_wlk_{direction} animation length (toon.json). Given
 * that, using the identical per-side speed formula AvatarArms uses is enough
 * to keep both animations frame-locked — no manual syncing needed. A
 * direction with no frames for this side (typically 1/2 — front/back — since
 * most sleeved items don't need one there, or any direction the item simply
 * doesn't define) renders nothing; equipping a sleeveless item is exactly
 * "no frames for any direction", so this never needs a presence check.
 */
export class ClotheSleeve extends AnimatedSprite implements IAvatarPart {
  private _direction: number;
  private _walking = false;
  readonly identifier: string;

  constructor(
    private readonly clothingId: string,
    /** The clothing category this sleeve belongs to (e.g. "tshirt") — used
     * by Avatar.changeClothing() to find and remove it alongside its parent
     * item, since it isn't itself a category the player equips. */
    public readonly category: string,
    public readonly side: 'left' | 'right',
    direction: number,
  ) {
    super([Texture.EMPTY]);
    this.identifier = `${clothingId}_${side === 'left' ? 'al' : 'ar'}`;
    this._direction = direction;

    if (Assets.cache.has(this.fileURI)) {
      this.applyDirection();
    } else {
      Assets.load(this.fileURI).then(() => this.applyDirection());
    }
  }

  private get fileURI(): string {
    return AssetBaseUrl.resolve(`clothes/${this.category}/${this.clothingId}.json`);
  }

  get direction(): number {
    return this._direction;
  }

  set direction(dir: number) {
    if (dir === this._direction) return;
    this._direction = dir;
    this.applyDirection();
  }

  get walking(): boolean {
    return this._walking;
  }

  setTint(): void {
    // Sleeve art carries its own colors (the clothing's fabric) — never
    // tinted by skin color, unlike a body part.
  }

  walk(): void {
    this._walking = true;
    if (this.textures.length > 1) this.play();
  }

  stopWalk(): void {
    this._walking = false;
    this.stop();
  }

  /** Collect `{identifier}_{direction}_{n}.png` for n = 0, 1, 2, ... until one is missing. */
  private framesForCurrentDirection(): Texture[] {
    if (!Assets.cache.has(this.fileURI)) return [];
    const frames: Texture[] = [];
    for (let n = 0; ; n++) {
      const name = `${this.identifier}_${this._direction}_${n}.png`;
      if (!Assets.cache.has(name)) break;
      frames.push(Texture.from(name));
    }
    return frames;
  }

  private applyDirection(): void {
    const frames = this.framesForCurrentDirection();

    if (frames.length === 0) {
      // Nothing authored for this direction/item — render nothing rather
      // than freezing on a stale pose from a previous direction.
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      return;
    }

    this.textures = frames;
    this.texture = frames[0];
    // Same formula as AvatarArms.resetAnimationSpeed(): frame count already
    // varies a lot per direction (a barely-visible far arm might have just 1
    // frame), and this speed curve is what keeps a full cycle's real-time
    // duration consistent across directions — matching it here is what keeps
    // the sleeve frame-locked to the arm underneath.
    this.animationSpeed = this.side === 'left'
      ? 0.05 * frames.length - 0.15
      : 0.05 * frames.length - 0.1;

    if (this._walking && frames.length > 1) this.play();
  }
}
