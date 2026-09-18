import {AnimatedSprite, Assets, Texture} from 'pixi.js';
import {IClothe} from './IClothe';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

/**
 * A clothing layer: hair, hat, face, top or bottom. One class for all of them,
 * because in the original every garment is the same thing — a clip dropped into
 * a named placeholder on the body rig and pinned to the current CA state
 * (User.as: `clipType.vmilieu.vetmil.gotoAndStop(_action.CA)`), whose own
 * nested clips then animate on Flash's auto-play while walking.
 *
 * So a garment is never "static" by kind, only by content: an item with one
 * frame for a facing simply doesn't animate there (playing an AnimatedSprite
 * with a single texture does nothing visible). A hat and a walking pair of
 * trousers go through the exact same code path.
 *
 * On the facings where the body rig draws no arm — profiles and upper
 * diagonals — the limb comes from the top, as a sibling `ClotheArm` layer
 * drawn UNDER this one so the sleeve covers it and it can be tinted with the
 * player's skin while the fabric isn't. See game-assets/tools/swf_to_rig.py.
 *
 * Timing: with an unrelated frame count but the same flat
 * `baseAnimationSpeed`, a garment's swing cycle and the legs' gait have
 * different periods and drift in and out of phase continuously — visible on
 * its own as "two things animating at odds". The optional `syncAnimations`
 * param (same `Texture[][]` shape as
 * `BaseTextureLoader.HUMAN_LEGS_ANIMATIONS`, indexed by `direction - 1`)
 * scales `animationSpeed` per direction so this item's cycle takes exactly as
 * many ticks as the reference's — same start (both fire from `Avatar.walk()`),
 * same period, phase-locked indefinitely. Still no frame-for-frame matching,
 * just matched cycle length.
 *
 * Frame contract: `{id}_{direction}_0.png` is the stop pose and the sheet's
 * `animations["{id}_wlk_{direction}"]` lists the walk cycle, on the same 80x120
 * trim canvas as everything else — the exporter bakes placement into each
 * frame's trim metadata, there is no app-side offset here. The walk list names
 * the same frame several times where Flash held one drawing across several
 * frames, so its length is the real cycle length even though the sheet holds
 * far fewer images.
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
    /** Sheet to load frames from, when it isn't named after `identifier` — a
     *  garment's sleeve layer (ClotheSleeve) lives in its garment's own sheet. */
    private readonly sheetId?: string,
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
    return AssetBaseUrl.resolve(`clothes/${this._type}/${this.sheetId ?? this._identifier}.json`);
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
    // AvatarAnimatedBodyPart).
    if (dir === this._direction) return;
    this._direction = dir;
    this.applyDirection();
  }

  public get walking(): boolean {
    return this._walking;
  }

  setTint(_tint: number): void {
    // The garment carries its own colors — never tinted by skin color,
    // carries its own colours.
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

  /** The stop pose followed by this direction's walk cycle — see class doc. */
  private framesForCurrentDirection(): Texture[] {
    if (!Assets.cache.has(this.fileURI)) return [];
    const sheet = Assets.cache.get(this.fileURI);
    const walk: string[] = sheet?.data?.animations?.[`${this._identifier}_wlk_${this._direction}`] ?? [];
    const stop = `${this._identifier}_${this._direction}_0.png`;
    const names = Assets.cache.has(stop) ? [stop, ...walk] : walk;
    return names.filter(n => Assets.cache.has(n)).map(n => Texture.from(n));
  }

  private applyDirection(): void {
    const frames = this.framesForCurrentDirection();

    if (frames.length === 0) {
      // Nothing authored for this direction — render nothing rather than
      // freezing on a stale pose from a previous direction (same as
      // "no artwork for this facing" case).
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
