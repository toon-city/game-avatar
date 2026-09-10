import {Assets, Texture} from 'pixi.js';

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
    await this.loadTextures();
    this.loadAnimations();
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
