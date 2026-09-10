import {Application, Container, Graphics, Sprite, Texture, Text, TextStyle} from 'pixi.js';
import {IAvatarPart} from './structure/parts/IAvatarPart';
import {IAvatar, IAvatarParams} from './IAvatar';
import {IAvatarBodyPart} from './structure/parts/body/IAvatarBodyPart';
import {
  AvatarBody,
  AvatarHead,
  AvatarArms,
  AvatarLegs,
} from './structure/parts/body/parts';
import {Tshirt} from './structure/parts/clothes/parts/Tshirt';
import {Hat} from './structure/parts/clothes/parts/Hat';
import {Hair} from './structure/parts/clothes/parts/Hair';
import {ClotheSleeve} from './structure/parts/clothes/ClotheSleeve';
import { IHasPoints } from '../../modules/common/abstract/IHasPoints';
import { Point } from '../../core/types/Point';
import { PARTS_CONFIG, getPartsInOrder, PartConfig } from './partsConfig';
import ClotheRegistry from './ClotheRegistry';
import * as ZOrder from '../../modules/common/ZOrder';
import { AvatarBubble } from './AvatarBubble';

// 10	2	6
// 8	1	4
// 9	1	5

export class Avatar extends Container implements IAvatar, IHasPoints {
  app: Application;

  private _direction: number = 1;

  // SPRITES
  socle: Sprite | null = null;
  private bubble: AvatarBubble | null = null;
  private usernameNameplate: Container | null = null;
  legs: AvatarLegs | null = null;
  arms: AvatarArms[] = [];
  head: Sprite | null = null;
  hair: Hair | null = null;
  parts: IAvatarPart[] = [];

  isWalking: boolean = false;

  constructor(app: Application, params: IAvatarParams) {
    super();
    this.app = app;
    this.height = 120;
    this.width = 80;
    this._direction = params.direction ?? 1;
    this.init();
    this.changeDirection(this._direction);
  }

  get points(): Point[] {
    // Rectangle de collision centré aux pieds (en dessous du corps, sans le socle)
    const feetY = this.socle ? this.socle.y : this.height;
    const hitW = 40;
    const hitX = (this.width - hitW) / 2; // centré horizontalement
    return [
      {x: this.x + hitX,         y: this.y + feetY - 2},
      {x: this.x + hitX + hitW,  y: this.y + feetY - 2},
      {x: this.x + hitX + hitW,  y: this.y + feetY},
      {x: this.x + hitX,         y: this.y + feetY},
    ];
  }

  public get direction(): number {
    return this._direction;
  }

  private directionText = new Text({text: `${this._direction}`});

  /**
   * Initialize the character container.
   */
  private init() {
    // Set the container size
    this.height = 120;
    this.width = 80;

    // Pointer interactivity
    this.eventMode = 'dynamic';
    this.cursor    = 'pointer';

    // Hover → show/hide username label
    this.on('pointerover',  () => { if (this.usernameNameplate) this.usernameNameplate.visible = true;  });
    this.on('pointerout',   () => { if (this.usernameNameplate) this.usernameNameplate.visible = false; });

    // Add a background sprite
    const background = new Sprite(Texture.WHITE);
    background.tint = 0xffffff;
    background.width = this.width;
    background.height = this.height;
    this.addChild(background);
    this.addChildAt(background, 1);

    // Generate the socle if we have one
    if (this.socle == null) {
      this.socle = new Sprite(Texture.from('socle.png'));
      this.socle.position.set(4, 100);
      this.addChild(this.socle);
    }

    // Initialize parts based on configuration
    this.parts = this.initializeParts();
    this.arms  = this.parts.filter((p): p is AvatarArms => p instanceof AvatarArms);

    // Initial Z-index calculation - will be updated when avatar moves
    this.updateZIndex();

    // Apply default hair color
    const hair = this.parts.find(part => part instanceof Hair) as Hair;
    if (hair) {
      hair.tint = 0x000000;
    }

    // this.addChild(this.directionText);

    this.renderParts();

    this.setSkinColor(0xf7ceaf);
  }

  private renderParts() {
    this.parts.forEach((part) => {
      this.addChild(part);
    });
  }

  /**
   * Start walking.
   */
  public walk() {
    this.isWalking = true;
    this.parts.forEach((part) => {
      part.walk();
    });
  }

  /**
   * Stop walking.
   */
  public stopWalk() {
    this.isWalking = false;
    this.parts.forEach((part) => {
      part.stopWalk();
    });
  }

  private partIsSkin(part: any): part is IAvatarBodyPart {
    return 'isSkin' in part;
  }

  /**
   * Set the skin color.
   *
   * @param color skin color
   */
  public setSkinColor(color: number) {
    this.parts.forEach((part) => {
      if (this.partIsSkin(part)) {
        part.setTint(color);
      }
    });
  }

  /** Bitmask values that actually have artwork — see the diagram at the top of this file. */
  private static readonly VALID_DIRECTIONS = new Set([1, 2, 4, 5, 6, 8, 9, 10]);

  /**
   * Face the avatar towards `direction` (a LEFT/RIGHT/UP/DOWN bitmask).
   *
   * `0` means "no movement key held" and keeps the current facing: an idle
   * avatar keeps looking where it walked. It must NOT rewrite `_direction`
   * without also updating the parts — doing so left the rendered sprite on the
   * old facing while `_direction` claimed another one, and the next
   * changeDirection() to that claimed value was then skipped as a no-op,
   * leaving the avatar walking one way while displaying another.
   */
  public changeDirection(direction: number) {
    const next = Avatar.sanitizeDirection(direction, this._direction);

    if (next === this._direction) {
      // Parts may still lag behind the state (a part added after the last
      // change, or one built before its artwork was loaded), so let them
      // re-sync before bailing out. Each part no-ops if already correct.
      this.syncPartsDirection();
      return;
    }

    this._direction = next;
    this.syncPartsDirection();

    this.directionText.text = `${this._direction} ${this.zIndex}`;
    this.repositionNameplate();
  }

  /**
   * Reduce an input bitmask to a direction that has artwork.
   * Opposite bits on the same axis cancel out; anything left over that has no
   * artwork — including 0 — keeps the current facing rather than blanking it.
   */
  private static sanitizeDirection(direction: number, current: number): number {
    let d = direction & 0b1111;
    if (d & 0b1000 && d & 0b0100) d &= ~0b1100; // left + right cancel out
    if (d & 0b0010 && d & 0b0001) d &= ~0b0011; // up + down cancel out
    return Avatar.VALID_DIRECTIONS.has(d) ? d : current;
  }

  /** Push the current direction down to every part. */
  private syncPartsDirection() {
    this.parts.forEach((part) => {
      part.direction = this._direction;
    });
  }

  private initializeParts(): IAvatarPart[] {
    const parts: IAvatarPart[] = [];
    const orderedParts = getPartsInOrder();

    for (const partConfig of orderedParts) {
      try {
        const part = this.createPartFromConfig(partConfig);
        if (part) {
          parts.push(part);
        }
      } catch (error) {
        console.error(`Failed to create part ${partConfig.className}:`, error);
        if (partConfig.required) {
          throw error; // Re-throw for required parts
        }
      }
    }

    return parts;
  }

  private createPartFromConfig(config: PartConfig): IAvatarPart | null {
    // Handle body parts
    if (config.category === 'body') {
      switch (config.className) {
        case 'AvatarArms':
          return new AvatarArms(this._direction, (config.id ?? 'right') as 'left' | 'right');
        case 'AvatarLegs':
          return new AvatarLegs(this._direction);
        case 'AvatarBody':
          return new AvatarBody(this._direction);
        case 'AvatarHead':
          return new AvatarHead(this._direction);
        default:
          console.warn(`Unknown body part: ${config.className}`);
          return null;
      }
    }

    // Handle clothing parts via registry
    const clothe = ClotheRegistry.create(config.category, config.id, this._direction);
    return clothe;
  }

  /**
   * Change a specific clothing item
   */
  public changeClothing(category: string, id?: string): boolean {
    // Remove existing clothing of this category, and any sleeve overlays it owns.
    this.parts = this.parts.filter(part => {
      const owned = part.constructor.name.toLowerCase().includes(category.toLowerCase())
        || (part instanceof ClotheSleeve && part.category === category);
      if (owned) this.removeChild(part);
      return !owned;
    });

    // Add new clothing if id provided
    if (id) {
      const newClothe = ClotheRegistry.create(category, id, this._direction);
      if (newClothe) {
        // Find the correct position to insert based on configuration
        const config = PARTS_CONFIG.find(p => p.category === category);
        const insertIndex = config ? this.findInsertionIndex(config.order) : this.parts.length;

        this.parts.splice(insertIndex, 0, newClothe);
        if (config?.hasSleeves) this.attachSleeves(category, id);
        this.renderParts();
        return true;
      }
    }

    this.renderParts();
    return false;
  }

  /**
   * Insert left/right sleeve overlays for a just-equipped item, each right
   * next to the AvatarArms instance it must share a z-order with (right
   * sleeve behind the torso like the back arm, left sleeve in front of it
   * like the front arm) — see ClotheSleeve's class doc.
   */
  private attachSleeves(category: string, clothingId: string): void {
    (['right', 'left'] as const).forEach(side => {
      const armIndex = this.parts.findIndex(p => p instanceof AvatarArms && p.side === side);
      if (armIndex === -1) {
        console.warn(`[Avatar] no AvatarArms('${side}') found — sleeve for ${clothingId} skipped`);
        return;
      }
      const sleeve = new ClotheSleeve(clothingId, category, side, this._direction);
      this.parts.splice(armIndex + 1, 0, sleeve);
    });
  }

  private findInsertionIndex(targetOrder: number): number {
    for (let i = 0; i < this.parts.length; i++) {
      const partConfig = this.getPartConfig(this.parts[i]);
      if (partConfig && partConfig.order > targetOrder) {
        return i;
      }
    }
    return this.parts.length;
  }

  private getPartConfig(part: IAvatarPart): PartConfig | undefined {
    const className = part.constructor.name;
    return PARTS_CONFIG.find(config => config.className === className);
  }

  /**
   * Display a speech bubble above the avatar.
   * @param text     Message to show.
   * @param duration Duration in ms (default 3 s). Pass 0 to keep indefinitely.
   */
  public say(text: string, duration = 3000): void {
    if (!this.bubble) {
      this.bubble = new AvatarBubble();
      // Tail tip anchored near the upper-right of the avatar's head
      this.bubble.x = this.width * 0.55;
      this.bubble.y = 20;
      this.addChild(this.bubble);
    }
    this.bubble.show(text, duration);
  }

  /** Hide the speech bubble immediately. */
  public stopSaying(): void {
    this.bubble?.hide();
  }

  /**
   * Set (or update) the pseudo displayed above the avatar on hover.
   * @param name Pseudo text.
   */
  public setUsername(name: string): void {
    const PADDING_X = 7;
    const PADDING_Y = 3;
    const RADIUS    = 4;

    if (!this.usernameNameplate) {
      this.usernameNameplate = new Container();
      this.usernameNameplate.visible = false;
      this.addChild(this.usernameNameplate);
    }

    this.usernameNameplate.removeChildren();

    // ── Text ──────────────────────────────────────────────────
    const label = new Text({
      text: name,
      style: new TextStyle({
        fontSize:   11,
        fill:       0x333333,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        align:      'center',
      }),
    });

    const plateW = label.width  + PADDING_X * 2;
    const plateH = label.height + PADDING_Y * 2;

    // ── Background ──────────────────────────────────────────
    const bg = new Graphics()
      .roundRect(0, 0, plateW, plateH, RADIUS)
      .fill({ color: 0xffffff, alpha: 0.75 });

    label.x = PADDING_X;
    label.y = PADDING_Y;

    this.usernameNameplate.addChild(bg, label);

    // Centre the nameplate horizontally above the head
    this.repositionNameplate();
    this.usernameNameplate.y = -plateH - 2;  // 2 px gap above the avatar
  }

  /**
   * Recalculate the nameplate X so it stays centred for every direction.
   * Front/back (pure vertical directions 1 & 2) need a small leftward nudge
   * because the avatar sprite is asymmetric in those poses.
   */
  private repositionNameplate(): void {
    if (!this.usernameNameplate) return;
    const plateW = this.usernameNameplate.width;
    // Pure vertical direction = no left/right bit set
    const isVertical = !(this._direction & 0b1100);
    const nudge = isVertical ? -3 : 0;
    this.usernameNameplate.x = (this.width - plateW) / 2 + nudge;
  }

  /**
   * Update Z-index based on current position (like furniture)
   */
  public updateZIndex(): void {
    // Use body bottom (feet) for depth, excluding the socle which sits below the feet
    const feetY = this.socle ? this.socle.y : this.height;
    // +0.5 px de biais : garantit que l'avatar est dans un bucket de profondeur
    // supérieur à la porte même quand feetY ≈ doorMidY (round((y+0.5)*100) > round(y*100))
    this.zIndex = ZOrder.compute({
      x: this.x,
      y: this.y + feetY + 0.5,
      layer: ZOrder.ZPriority.SCENE,
      offset: 3 // avatar : toujours devant porte(2), plinthe(1), mur(0)
    });
  }
}
