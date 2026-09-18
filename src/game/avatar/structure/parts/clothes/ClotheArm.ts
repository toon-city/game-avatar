import {AnimatedSprite, Assets, Texture} from 'pixi.js';
import {IAvatarPart} from '../IAvatarPart';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

/** One entry of a sheet's `meta.arm[direction].walk` track: rotation (degrees,
 *  relative to the sprite's own baked resting pose) plus a small translate
 *  correction, both already in world px — see swf_to_rig.py's export_milieu(). */
interface ArmStep {
  deg: number;
  dx: number;
  dy: number;
}

/**
 * The limb a top draws itself, on the facings where the body rig draws none —
 * profiles and upper diagonals (see game-assets/tools/swf_to_rig.py).
 *
 * ONE static sprite per direction, not a frame per walk step: the exporter
 * bakes the limb's resting rotation into the pixels (same technique as every
 * other frame in the sheet -- its trim is a plain canvas position, no runtime
 * placement needed), and walking only ever ROTATES that one image further,
 * around a fixed pivot the sheet also supplies. That's what the SWF itself
 * does -- a nested walk clip holds a single arm drawing whose transform
 * changes frame to frame -- so reproducing it this way needs one sprite
 * instead of one per frame, tints correctly (the fabric beside it doesn't),
 * and the sleeve (ClotheSleeve, the top's own frame drawn AFTER this one)
 * still covers it.
 *
 * `meta.arm[direction]`: `{ sprite, pivot: [x, y], walk: ArmStep[] }`. `pivot`
 * is in the SAME space as every frame's own canvas position (relative to the
 * sheet's shared, untrimmed `sourceSize` box) -- NOT relative to the sprite's
 * own visible/trimmed pixels, which is a different space PixiJS's own
 * `Sprite.pivot` never uses. Standing still
 * uses `walk[0]`'s frame, i.e. the sprite's own baseline pose (deg 0): the
 * original doesn't have a separately authored resting angle for this
 * simplified rig, and re-using the walk cycle's first frame reads the same as
 * the SWF's own dedicated stop pose (verified by rendering both).
 */
export class ClotheArm extends AnimatedSprite implements IAvatarPart {
  /** Marks this as tintable for Avatar.setSkinColor()'s `'isSkin' in part` check. */
  public readonly isSkin = true;

  private _direction: number;
  private _walking = false;
  private steps: ArmStep[] = [];
  private pivotPoint: [number, number] = [0, 0];

  constructor(
    private readonly clothingId: string,
    /** The clothing category this arm belongs to — used by
     *  Avatar.changeClothing() to remove it alongside its garment. */
    public readonly category: string,
    direction: number,
    private readonly baseAnimationSpeed = 0.22,
    /** Per-direction reference animation to phase-lock the cycle length to —
     *  same role and shape as AnimatedClothe's, see its class doc. */
    private readonly syncAnimations?: Texture[][],
  ) {
    super([Texture.EMPTY]);
    this._direction = direction;
    // The visible texture never changes (one static sprite) -- only the
    // rotation/offset does, per step, driven by the SAME frame-advance timer
    // AnimatedSprite already gives every other part (so this stays phase
    // locked with no separate ticker to manage).
    this.onFrameChange = (frame: number) => this.applyStep(frame);

    if (Assets.cache.has(this.fileURI)) {
      this.applyDirection();
    } else {
      Assets.load(this.fileURI).then(() => this.applyDirection());
    }
  }

  public get fileURI(): string {
    return AssetBaseUrl.resolve(`clothes/${this.category}/${this.clothingId}.json`);
  }

  public get identifier(): string {
    return `${this.clothingId}_arm`;
  }

  public get direction(): number {
    return this._direction;
  }

  public set direction(dir: number) {
    if (dir === this._direction) return;
    this._direction = dir;
    this.applyDirection();
  }

  public get walking(): boolean {
    return this._walking;
  }

  public setTint(tint: number): void {
    this.tint = tint;
  }

  walk(): void {
    this._walking = true;
    if (this.steps.length > 1) this.play();
  }

  stopWalk(): void {
    this._walking = false;
    this.stop();
    this.gotoAndStop(0);
  }

  /** The `meta.arm` entry for the current direction, or null where the rig
   *  draws the arm itself (face/back) and for garments that have none. */
  private meta(): {sprite: string; pivot: [number, number]; walk: ArmStep[]} | null {
    const sheet = Assets.cache.get(this.fileURI);
    return sheet?.data?.meta?.arm?.[String(this._direction)] ?? null;
  }

  private applyStep(frame: number): void {
    const step = this.steps[frame];
    if (!step) return;
    this.angle = step.deg;
    // `position` is where PIXI projects `pivot` into the parent's space, so
    // setting both to the SAME point keeps that point fixed on screen (the
    // sprite's own baked/trimmed placement is unaffected) while making it the
    // rotation centre -- `dx`/`dy` then nudge it by the frame's small drift.
    this.position.set(this.pivotPoint[0] + step.dx, this.pivotPoint[1] + step.dy);
  }

  private applyDirection(): void {
    const meta = this.meta();
    this.steps = meta?.walk ?? [];

    if (!meta || this.steps.length === 0) {
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      this.pivot.set(0, 0);
      this.position.set(0, 0);
      return;
    }

    // Every length in a sheet is in ATLAS px; PixiJS divides the texture's
    // own trim by `meta.scale` when it builds it, and the pivot has to go
    // through the same division to land on the same point in that texture.
    const scale = Number(Assets.cache.get(this.fileURI)?.data?.meta?.scale ?? 1) || 1;
    this.pivotPoint = [meta.pivot[0] / scale, meta.pivot[1] / scale];
    this.pivot.set(this.pivotPoint[0], this.pivotPoint[1]);

    const texture = Texture.from(meta.sprite);
    // One texture repeated once per walk step: nothing to swap (one static
    // sprite), but AnimatedSprite still needs `textures.length` steps long to
    // advance `onFrameChange` at the right rate and phase-lock correctly.
    this.textures = this.steps.map(() => texture);
    this.texture = texture;
    this.animationSpeed = this.computeAnimationSpeed(this.steps.length);
    this.applyStep(0);

    if (this._walking && this.steps.length > 1) this.play();
  }

  /** Same cycle-length matching as AnimatedClothe.computeAnimationSpeed(). */
  private computeAnimationSpeed(ownFrameCount: number): number {
    const refCount = this.syncAnimations?.[this._direction - 1]?.length ?? 0;
    if (refCount === 0) return this.baseAnimationSpeed;
    return this.baseAnimationSpeed * (ownFrameCount / refCount);
  }
}
