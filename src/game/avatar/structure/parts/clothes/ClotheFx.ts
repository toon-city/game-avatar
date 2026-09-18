import {AnimatedSprite, Assets, Texture} from 'pixi.js';
import {IAvatarPart} from '../IAvatarPart';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

/**
 * One of a garment's decorative overlay clips, drawn on top of everything
 * else it owns (torso, arm, sleeve) — e.g. michael_tshirt's twinkling stars.
 *
 * In the original these are nested MovieClips baked directly into the SWF
 * alongside the torso shape, playing on their own timeline regardless of
 * gait or direction. swf_to_rig.py's classify_root_use() pulls them out
 * before the torso is composed (so the torso is a single static frame like
 * every other top) and exports each as its own frame sequence, listed under
 * `meta.fx[direction]` — a garment can carry more than one, hence `slot`, an
 * index into that list.
 *
 * The SAME clip is normally reused by every direction with only its
 * placement differing (a chest decal moves with the shirt, but doesn't
 * redraw itself over it), so its frames are shared rather than duplicated:
 * `meta.fx[direction][slot]` is `{anim, x, y, mirror}` — `anim` names the
 * `animations` entry (shared across directions that use the same clip),
 * `x, y` is where this direction places it and `mirror` whether to flip it,
 * both applied here instead of being baked into the art. The rare direction
 * that genuinely rotates the clip gets its own one-off baked `anim` instead,
 * with `x: 0, y: 0, mirror: false` (already placed, nothing left to apply).
 *
 * Always playing once it has frames: there is no walk/stop split here, same
 * as the original, and Avatar.changeClothing() attaches one instance per
 * `MAX_FX_SLOTS` regardless of how many a given item actually has — an
 * index past what's available just renders nothing, the usual "no artwork"
 * convention every other part uses.
 */
export class ClotheFx extends AnimatedSprite implements IAvatarPart {
  private _direction: number;

  constructor(
    private readonly clothingId: string,
    /** The clothing category this overlay belongs to — used by
     *  Avatar.changeClothing() to remove it alongside its garment. */
    public readonly category: string,
    direction: number,
    /** Index into meta.fx[direction] — see class doc. */
    private readonly slot: number,
  ) {
    super([Texture.EMPTY]);
    this._direction = direction;

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
    return `${this.clothingId}_fx${this.slot}`;
  }

  public get direction(): number {
    return this._direction;
  }

  public set direction(dir: number) {
    if (dir === this._direction) return;
    this._direction = dir;
    this.applyDirection();
  }

  /** Runs on its own clock regardless of gait — never queried the way a body
   *  part's is, but IAvatarPart requires the getter. */
  public get walking(): boolean {
    return false;
  }

  setTint(): void {
    // Carries its own colours — never tinted by skin colour.
  }

  /** No-ops: this plays continuously once equipped, not tied to gait. */
  walk(): void {}
  stopWalk(): void {}

  private applyDirection(): void {
    const sheet = Assets.cache.get(this.fileURI);
    const entry = sheet?.data?.meta?.fx?.[String(this._direction)]?.[this.slot];
    const names: string[] = (entry && sheet?.data?.animations?.[entry.anim]) ?? [];
    const frames = names.filter(n => Assets.cache.has(n)).map(n => Texture.from(n));

    if (!entry || frames.length === 0) {
      this.stop();
      this.textures = [Texture.EMPTY];
      this.texture = Texture.EMPTY;
      return;
    }

    // Every length in a sheet is in ATLAS px; PixiJS divides the texture's
    // own trim by `meta.scale` when it builds it, and this position has to
    // go through the same division to land on the same point.
    const scale = Number(sheet?.data?.meta?.scale ?? 1) || 1;
    this.position.set(entry.x / scale, entry.y / scale);
    this.scale.x = entry.mirror ? -1 : 1;

    this.textures = frames;
    this.texture = frames[0] as Texture;
    // Flat rate, not phase-locked to anything: this clip's cycle has no
    // relationship to the legs' or the garment's own, same as the original.
    this.animationSpeed = 0.2;
    if (frames.length > 1) this.play();
  }
}
