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

  private loadAnimations() {
    const animations = Object.values<string[]>(
      Assets.cache.get('assets/toon/toon.json').data.animations
    );
    this._HUMAN_LEGS_ANIMATIONS = [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    for (const element of animations[0]) {
      this._HUMAN_LEGS_ANIMATIONS[0].push(Texture.from(element));
    }

    this._HUMAN_ARM_R_ANIMATIONS = [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    for (const element of animations[1]) {
      this._HUMAN_ARM_R_ANIMATIONS[0].push(Texture.from(element));
    }

    this._HUMAN_ARM_L_ANIMATIONS = [
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
      [],
    ];
    for (const element of animations[2]) {
      this._HUMAN_ARM_L_ANIMATIONS[0].push(Texture.from(element));
    }

    for (const element of animations[3]) {
      this._HUMAN_LEGS_ANIMATIONS[1].push(Texture.from(element));
    }

    for (const element of animations[4]) {
      this._HUMAN_ARM_R_ANIMATIONS[1].push(Texture.from(element));
    }

    for (const element of animations[5]) {
      this._HUMAN_ARM_L_ANIMATIONS[1].push(Texture.from(element));
    }

    for (const element of animations[6]) {
      this._HUMAN_LEGS_ANIMATIONS[3].push(Texture.from(element));
    }

    for (const element of animations[7]) {
      this._HUMAN_ARM_R_ANIMATIONS[3].push(Texture.from(element));
    }

    for (const element of animations[8]) {
      this._HUMAN_ARM_L_ANIMATIONS[3].push(Texture.from(element));
    }

    for (const element of animations[9]) {
      this._HUMAN_LEGS_ANIMATIONS[4].push(Texture.from(element));
    }

    for (const element of animations[10]) {
      this._HUMAN_ARM_R_ANIMATIONS[4].push(Texture.from(element));
    }

    for (const element of animations[11]) {
      this._HUMAN_ARM_L_ANIMATIONS[4].push(Texture.from(element));
    }

    for (const element of animations[12]) {
      this._HUMAN_LEGS_ANIMATIONS[5].push(Texture.from(element));
    }

    for (const element of animations[13]) {
      this._HUMAN_ARM_R_ANIMATIONS[5].push(Texture.from(element));
    }

    for (const element of animations[14]) {
      this._HUMAN_ARM_L_ANIMATIONS[5].push(Texture.from(element));
    }

    for (const element of animations[15]) {
      this._HUMAN_LEGS_ANIMATIONS[7].push(Texture.from(element));
    }

    for (const element of animations[16]) {
      this._HUMAN_ARM_R_ANIMATIONS[7].push(Texture.from(element));
    }

    for (const element of animations[17]) {
      this._HUMAN_ARM_L_ANIMATIONS[7].push(Texture.from(element));
    }

    for (const element of animations[18]) {
      this._HUMAN_LEGS_ANIMATIONS[8].push(Texture.from(element));
    }

    for (const element of animations[19]) {
      this._HUMAN_ARM_R_ANIMATIONS[8].push(Texture.from(element));
    }

    for (const element of animations[20]) {
      this._HUMAN_ARM_L_ANIMATIONS[8].push(Texture.from(element));
    }

    for (const element of animations[21]) {
      this._HUMAN_LEGS_ANIMATIONS[9].push(Texture.from(element));
    }

    for (const element of animations[22]) {
      this._HUMAN_ARM_R_ANIMATIONS[9].push(Texture.from(element));
    }

    for (const element of animations[23]) {
      this._HUMAN_ARM_L_ANIMATIONS[9].push(Texture.from(element));
    }
  }
}
