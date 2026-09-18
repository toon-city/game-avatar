import {AnimatedSprite, Assets, Texture} from 'pixi.js';
import {IAvatarPart} from '../IAvatarPart';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

interface ArmStep {
  deg: number;
  dx: number;
  dy: number;
}

/**
 * The part of a top the SWF draws IN FRONT of its own arm — the sleeve, plus
 * whatever trim sits after it in the same holder (see swf_to_rig.py).
 *
 * ONE static sprite per direction that rotates RIGIDLY with `ClotheArm`,
 * reusing that same part's rotation track (`meta.arm[direction].walk`) rather
 * than owning one of its own: the two are physically attached at the same
 * joint in the original, so driving them from one shared track is what keeps
 * them moving together with no cross-talk to manage. Its own entry,
 * `meta.sleeve[direction]`, supplies only what differs — the sprite and its
 * own pivot (the SAME physical point as the arm's, expressed relative to this
 * sprite's own crop instead).
 *
 * The trade-off this simplification makes: the original draws a different
 * sleeve SHAPE at each walk frame (the cuff's silhouette actually changes as
 * the arm swings), where this rotates one fixed shape instead. Visually close
 * at rest and through most of the cycle; the original's fidelity at extreme
 * swing angles is not reproduced. See ClotheArm's class doc for the same
 * trade on the limb itself.
 */
export class ClotheSleeve extends AnimatedSprite implements IAvatarPart {
  private _direction: number;
  private _walking = false;
  private steps: ArmStep[] = [];
  private pivotPoint: [number, number] = [0, 0];

  constructor(
    private readonly clothingId: string,
    /** The clothing category this sleeve belongs to — used by
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
    return `${this.clothingId}_sleeve`;
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

  setTint(): void {
    // The sleeve carries its own colours — never tinted by skin colour, same
    // as the garment's own fabric.
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

  private applyStep(frame: number): void {
    const step = this.steps[frame];
    if (!step) return;
    this.angle = step.deg;
    this.position.set(this.pivotPoint[0] + step.dx, this.pivotPoint[1] + step.dy);
  }

  private applyDirection(): void {
    const sheet = Assets.cache.get(this.fileURI);
    const own = sheet?.data?.meta?.sleeve?.[String(this._direction)];
    // The rotation itself always comes from the arm's own track -- see class
    // doc -- even though this direction may have no sleeve sprite of its own.
    this.steps = sheet?.data?.meta?.arm?.[String(this._direction)]?.walk ?? [];

    if (!own || this.steps.length === 0) {
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      this.pivot.set(0, 0);
      this.position.set(0, 0);
      return;
    }

    const scale = Number(sheet?.data?.meta?.scale ?? 1) || 1;
    this.pivotPoint = [own.pivot[0] / scale, own.pivot[1] / scale];
    this.pivot.set(this.pivotPoint[0], this.pivotPoint[1]);

    const texture = Texture.from(own.sprite);
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
