import {Assets, Texture, TextureSource} from 'pixi.js';

export class BaseTextureLoader {
  private static instance: BaseTextureLoader;

  private _HUMAN_LEGS_ANIMATIONS: Texture[][] = [];
  public get HUMAN_LEGS_ANIMATIONS(): Texture[][] {
    return this._HUMAN_LEGS_ANIMATIONS;
  }

  private _HUMAN_ARM_L_ANIMATIONS: Texture[][] = [];
  public get HUMAN_ARM_L_ANIMATIONS(): Texture[][] {
    return this._HUMAN_ARM_L_ANIMATIONS;
  }

  private _HUMAN_ARM_R_ANIMATIONS: Texture[][] = [];
  public get HUMAN_ARM_R_ANIMATIONS(): Texture[][] {
    return this._HUMAN_ARM_R_ANIMATIONS;
  }

  private constructor() {}

  public static getInstance(): BaseTextureLoader {
    if (!BaseTextureLoader.instance) {
      BaseTextureLoader.instance = new BaseTextureLoader();
    }

    return BaseTextureLoader.instance;
  }

  public async load() {
    BaseTextureLoader.enableMipmaps();
    await this.loadTextures();
    this.loadAnimations();
  }

  /**
   * Every sheet in the game is authored well above its on-screen size (the
   * body/clothes atlases at `"scale": "3"`, furniture at `"2"`), so everything
   * is drawn minified. PixiJS ships with `autoGenerateMipmaps` off, which
   * leaves a single full-resolution mip level and a plain bilinear filter:
   * four source texels per output pixel, no matter how many the pixel actually
   * covers — that's the residual jaggies/shimmer on the avatar and the
   * previews. Turning it on makes `GlTextureSystem` derive the level count
   * itself (`floor(log2(biggest)) + 1`) and the style map resolves to
   * LINEAR_MIPMAP_LINEAR, i.e. real trilinear minification.
   *
   * Safe for our atlases specifically because every sheet is packed with 6px
   * of padding around each frame, and nothing in game is minified past ~1.5x
   * (a 3x sheet on a canvas already supersampled to resolution >= 2), so only
   * mip levels 0-1 are ever sampled — far from the level where a neighbouring
   * frame could bleed across that padding.
   *
   * Mutating the shared default rather than each source: it must be set
   * before a TextureSource is constructed, and this runs before any sheet
   * loads. `VideoSource.defaultOptions` snapshots `TextureSource.defaultOptions`
   * at import time, so the loading video is untouched and doesn't end up
   * regenerating a mip chain on every frame it plays.
   */
  private static enableMipmaps(): void {
    TextureSource.defaultOptions.autoGenerateMipmaps = true;
  }

  private async loadTextures() {
    await Assets.load([
      'assets/ui/loading.webm',
      'assets/toon/toon.json',
      'assets/house/baseboard.png',
      'assets/house/quizz_tapisserie.jpg',
      'assets/house/ha_mur1.jpg',
      'assets/house/base_wall.png',
      'assets/house/base_floor.png',
      'assets/house/quizz_sol.jpg',
      'assets/house/disco_mur.png',
      'assets/house/ha_sol.jpg',
      // 'assets/house/jardinherbe.png',
      // 'assets/furnitures/jardin/haie.json',
      // 'assets/furnitures/jardin/banc.json',
      // 'assets/furnitures/jardin/herbe.json',
      // 'assets/furnitures/jardin/pave.json',
      // 'assets/furnitures/jardin/rond_centre.json',
      // 'assets/furnitures/jardin/statut.json',
      // 'assets/furnitures/jardin/statut1.json',
      // 'assets/furnitures/jardin/statut2.json',
      // 'assets/furnitures/jardin/statut3.json',
      // 'assets/furnitures/jardin/statut4.json',
    ]);

    Assets.addBundle('fonts', [
      {
        alias: 'Brady Bunch Remastered', src: 'assets/fonts/BradyBunchRemastered.ttf',
      },
      {
        alias: 'Cute Dino', src: 'assets/fonts/Cute Dino.ttf',
      }
    ]);

    await Assets.loadBundle('fonts');
  }

  /** Directions that have artwork — see the diagram at the top of Avatar.ts. */
  private static readonly DIRECTIONS = [1, 2, 4, 5, 6, 8, 9, 10];

  /**
   * Build `[direction - 1] -> Texture[]` from toon.json's `animations`, looked
   * up BY NAME (`lg_wlk_4`, `ar_wlk_1`, ...).
   *
   * Not by position: the rig only draws arms in the directions it actually has
   * them (both on face/back, the far one alone on the lower diagonals, none on
   * profiles/upper diagonals — the garment supplies the arm there), so the set
   * of animations is sparse and its ordering carries no meaning. A direction
   * with no entry stays an empty array, which AvatarAnimatedBodyPart already
   * reads as "no artwork for this facing".
   */
  private buildAnimations(prefix: string): Texture[][] {
    const animations = Assets.cache.get('assets/toon/toon.json').data.animations ?? {};
    const out: Texture[][] = Array.from({ length: 12 }, () => []);
    for (const direction of BaseTextureLoader.DIRECTIONS) {
      const frames: string[] | undefined = animations[`${prefix}_wlk_${direction}`];
      if (frames) out[direction - 1] = frames.map(name => Texture.from(name));
    }
    return out;
  }

  private loadAnimations() {
    this._HUMAN_LEGS_ANIMATIONS = this.buildAnimations('lg');
    this._HUMAN_ARM_L_ANIMATIONS = this.buildAnimations('al');
    this._HUMAN_ARM_R_ANIMATIONS = this.buildAnimations('ar');
  }

}
