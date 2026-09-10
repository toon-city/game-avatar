import {Assets, Sprite, Texture} from 'pixi.js';
import {IClothe} from './IClothe';
import {AssetBaseUrl} from '../../../../../core/AssetBaseUrl';

/**
 * Base class for a clothing layer (hair, hat, tshirt, ...) rendered over the
 * avatar's body.
 *
 * Placement contract: every frame in a clothe's spritesheet JSON must declare
 * standard TexturePacker trim metadata —
 *   "trimmed": true,
 *   "spriteSourceSize": { "x": <offset>, "y": <offset>, "w": <crop w>, "h": <crop h> },
 *   "sourceSize": { "w": 80, "h": 120 }
 * — where sourceSize matches the avatar's fixed 80x120 canvas (see
 * assets/toon/toon.json, which the base body already follows) and
 * spriteSourceSize.x/y is where the cropped artwork sits within that canvas.
 * PixiJS then positions the sprite on its own: a plain `Texture.from(name)`
 * built from that metadata renders at the right spot with anchor (0,0), no
 * app-side offset needed. This is what a generator should target — export
 * every direction on the same 80x120 canvas and there is nothing left to
 * tune by hand.
 */
export abstract class Clothe extends Sprite implements IClothe {
  private _identifier: string; // The identifier of the clothe
  private _direction: number; // The direction of the clothe
  private _type: string; // The type of the clothe

  public get fileURI(): string {
    return AssetBaseUrl.resolve(`clothes/${this._type}/${this._identifier}.json`);
  }

  // Get the URL of the texture based on the identifier and direction
  protected get textureUrl(): string {
    return `${this._identifier}_${this._direction}.png`;
  }

  // Get the direction of the clothe
  public get direction(): number {
    return this._direction;
  }

  // Set the direction of the clothe and update the texture
  public set direction(dir: number) {
    if (dir === this._direction) return;
    this._direction = dir;
    this.refreshTexture();
  }

  private refreshTexture() {
    // Trim offset lives in the texture's own metadata (see class doc) — Pixi
    // applies it automatically, nothing to compute or set here.
    this.texture = Assets.cache.has(this.fileURI)
      ? Texture.from(this.textureUrl)
      : Texture.EMPTY;
  }

  // Get the identifier of the clothe
  public get identifier(): string {
    return this._identifier;
  }

  // Constructor for the Clothe class
  constructor(type: string, identifier: string, direction: number) {
    super(Texture.EMPTY);
    this._identifier = identifier;
    this._direction = direction;
    this._type = type;
    if (Assets.cache.has(this.fileURI)) {
      this.refreshTexture();
    } else {
      Assets.load(this.fileURI).then(() => this.refreshTexture());
    }
  }

  // Get the walking state of the clothe
  public get walking() {
    return this._walking;
  }

  private _walking = false; // The walking state of the clothe

  // Set the tint of the clothe (not implemented)
  setTint(tint: number) {
    return;
  }

  // Set the walking state of the clothe to true
  walk(): void {
    this._walking = true;
  }

  // Set the walking state of the clothe to false
  stopWalk(): void {
    this._walking = false;
  }
}
