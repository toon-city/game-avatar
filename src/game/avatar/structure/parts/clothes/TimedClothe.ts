import { AnimatedSprite, Assets, Texture } from 'pixi.js';
import { IAvatarPart } from '../IAvatarPart';
import { AssetBaseUrl } from '../../../../../core/AssetBaseUrl';

/**
 * A decorative effect layered over a clothing item (e.g. Michael1's
 * twinkling stars) that loops on its OWN fixed real-time interval,
 * independent of walking — unlike `AnimatedClothe`, which
 * only animate while the avatar walks and are frame-locked to that gait.
 * This plays continuously from the moment the item is equipped, whether the
 * avatar is standing still or moving, same as the original SWF's effect.
 *
 * "Regular recurrence" (the effect pulses every so often rather than
 * animating nonstop) is authored into the frame sequence itself, not
 * special-cased in code: most of the cycle is empty/transparent frames,
 * with the visible effect frames clustered at the end — e.g. 50 empty
 * frames then 10 sparkle frames on a 60-frame loop reads as "sparkle every
 * couple of seconds" at a normal animationSpeed. This keeps the runtime
 * dead simple (just `play()` and let PixiJS loop) and puts all timing
 * control in the artist's hands via the frame count, consistent with how
 * every other clothing animation in this codebase is authored (see
 * AnimatedClothe's class doc).
 *
 * Frame contract: `{id}_fx_{direction}_{n}.png`, `n` starting at 0, same
 * 80x120 trim canvas as every other clothing layer (see Clothe's class doc
 * — no app-side offset here either). A direction with no `_fx_` frames
 * renders nothing, same "no art for this facing" convention as everything
 * else — not every item needs this, and not every direction of an item
 * that has it needs to either.
 */
export class TimedClothe extends AnimatedSprite implements IAvatarPart {
  private _direction: number;
  readonly identifier: string;

  constructor(
    private readonly clothingId: string,
    /** The clothing category this effect belongs to (e.g. "tshirt") — used
     * by Avatar.changeClothing() to find and remove it alongside its parent
     * item, since it isn't itself a category the player equips. */
    public readonly category: string,
    direction: number,
  ) {
    super([Texture.EMPTY]);
    this.identifier = `${clothingId}_fx`;
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
    // Runs on its own clock regardless of gait — never queried by
    // Avatar.walk()/stopWalk() the way a body part's is, but IAvatarPart
    // requires the getter.
    return false;
  }

  setTint(): void {
    // The effect carries its own colors — never tinted by skin color, same
    // as ClotheSleeve/AnimatedClothe.
  }

  /** No-ops: this plays continuously from equip time, not tied to gait — see class doc. */
  walk(): void {}
  stopWalk(): void {}

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
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      return;
    }

    this.textures = frames;
    this.texture = frames[0];
    this.loop = true;
    this.animationSpeed = 0.15;
    this.play();
  }
}
