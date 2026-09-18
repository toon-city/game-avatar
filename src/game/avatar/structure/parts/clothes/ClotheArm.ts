import {AnimatedSprite, Assets, Matrix, Texture} from 'pixi.js';
import {IAvatarPart} from '../IAvatarPart';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

/** One entry of a sheet's `meta.arm[direction]` track: the frame to draw and
 *  the matrix (a, b, c, d, tx, ty) that places it, in atlas px like every other
 *  length in the sheet — see applyStep(). */
interface ArmStep {
  t: string;
  m: [number, number, number, number, number, number];
}

/**
 * The limb a top draws itself, on the facings where the body rig draws none —
 * profiles and upper diagonals (see game-assets/tools/swf_to_rig.py).
 *
 * It is one sprite per direction driven by a matrix, not a frame sequence,
 * because that is how the SWF stores it: the garment's nested walk clip holds a
 * single arm drawing whose transform changes frame to frame, with the sleeve as
 * a sibling shape drawn after it. Reproducing that instead of baking it gives
 * three things at once — the arm is tinted with the player's skin colour while
 * the fabric touching it isn't, the sleeve covers the top of the arm, and a
 * top's frame count roughly halves.
 *
 * The exporter writes an arm frame's trim as its content offset from the arm
 * symbol's ORIGIN, unlike every other frame in a sheet, whose trim is a canvas
 * position: a rotating sprite has no fixed one, so the matrix supplies it.
 *
 * There is a track per gait, indexed like the garment's own cycle for that
 * gait, and both are phase-locked to the legs the same way (see
 * AnimatedClothe) — so the arm and its sleeve stay in step with no cross-talk
 * between the two parts.
 */
export class ClotheArm extends AnimatedSprite implements IAvatarPart {
  /** Marks this as tintable for Avatar.setSkinColor()'s `'isSkin' in part` check. */
  public readonly isSkin = true;

  private _direction: number;
  private _walking = false;
  private steps: ArmStep[] = [];

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
    this.applyDirection();
  }

  stopWalk(): void {
    this._walking = false;
    this.applyDirection();
  }

  /** The `meta.arm` track for the current direction and gait, or null where the
   *  rig draws the arm itself (face/back) and for garments that have none. */
  private track(): ArmStep[] | null {
    const sheet = Assets.cache.get(this.fileURI);
    const dir = sheet?.data?.meta?.arm?.[String(this._direction)];
    // Same stop fallback as AnimatedClothe.framesForCurrentState().
    return (this._walking ? dir?.walk : null) ?? dir?.stop ?? null;
  }

  private applyStep(frame: number): void {
    const step = this.steps[frame];
    if (!step) return;
    // Every length in a sheet is in ATLAS pixels and PixiJS divides them by
    // `meta.scale` when it builds the textures — including the trim this arm's
    // placement starts from. The track is written in the same unit for
    // consistency, so its translation has to go through the same division;
    // a, b, c, d are ratios and don't.
    const [a, b, c, d, tx, ty] = step.m;
    const s = Number(Assets.cache.get(this.fileURI)?.data?.meta?.scale ?? 1) || 1;
    this.setFromMatrix(new Matrix(a, b, c, d, tx / s, ty / s));
  }

  private applyDirection(): void {
    this.steps = this.track() ?? [];

    if (this.steps.length === 0) {
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      return;
    }

    this.textures = this.steps.map(s => Texture.from(s.t));
    this.animationSpeed = this.computeAnimationSpeed(this.steps.length);
    // `textures =` resets to frame 0 without firing onFrameChange, so place it.
    this.applyStep(0);

    // Plays in both gaits, same reasoning as AnimatedClothe.applyDirection().
    if (this.steps.length > 1) this.play();
  }

  /** Same cycle-length matching as AnimatedClothe.computeAnimationSpeed(). */
  private computeAnimationSpeed(ownFrameCount: number): number {
    const refCount = this.syncAnimations?.[this._direction - 1]?.length ?? 0;
    if (refCount === 0) return this.baseAnimationSpeed;
    return this.baseAnimationSpeed * (ownFrameCount / refCount);
  }
}
