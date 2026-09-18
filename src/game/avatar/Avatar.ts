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
import {ClotheArm} from './structure/parts/clothes/ClotheArm';
import {ClotheSleeve} from './structure/parts/clothes/ClotheSleeve';
import {BaseTextureLoader} from '../textures/BaseTextureLoader';
import { IHasPoints } from '../../modules/common/abstract/IHasPoints';
import { Point } from '../../core/types/Point';
import { PARTS_CONFIG, getPartsInOrder, PartConfig } from './partsConfig';
import ClotheRegistry from './ClotheRegistry';
import * as ZOrder from '../../modules/common/ZOrder';
import { AvatarBubble } from './AvatarBubble';
import { SmileOverlay, DURATION as SMILE_DURATION } from './SmileOverlay';
import { LoveOverlay, DURATION as LOVE_DURATION } from './LoveOverlay';
import { SnoreOverlay } from './SnoreOverlay';

// 10	2	6
// 8	1	4
// 9	1	5

export class Avatar extends Container implements IAvatar, IHasPoints {
  app: Application;

  private _direction: number = 1;

  // SPRITES
  socle: Sprite | null = null;
  private bubble: AvatarBubble | null = null;
  private smileOverlay: SmileOverlay | null = null;
  private loveOverlay: LoveOverlay | null = null;
  private snoreOverlay: SnoreOverlay | null = null;
  private usernameNameplate: Container | null = null;
  legs: AvatarLegs | null = null;
  arms: AvatarArms[] = [];
  head: Sprite | null = null;
  hair: Hair | null = null;
  parts: IAvatarPart[] = [];

  isWalking: boolean = false;

  // Preview-only device (identity-card badge, clothing-studio preview) — an
  // in-room avatar standing/walking around a house shouldn't show it. Still
  // constructed either way since `points`/`updateZIndex` read `socle.y` for
  // hit-rect/depth math regardless of whether it's actually drawn.
  private showSocle: boolean = true;

  constructor(app: Application, params: IAvatarParams) {
    super();
    this.app = app;
    this.height = 120;
    this.width = 80;
    this._direction = params.direction ?? 1;
    this.showSocle = params.showSocle ?? true;
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
      if (this.showSocle) this.addChild(this.socle);
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

    this.setSkinColor(0xffffff);
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
    this.stopSnore(); // moving cancels an in-progress snore, same as talking does
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
    this.skinColor = color;
    this.parts.forEach((part) => {
      if (this.partIsSkin(part)) {
        part.setTint(color);
      }
    });
  }

  /** Last colour passed to setSkinColor — a garment's arm layer is attached
   *  after the fact (on equip) and has to pick it up, see attachArm(). */
  private skinColor = 0xffffff;

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
    // Remove existing clothing of this category, and any arm/sleeve/timed-overlay it owns.
    this.parts = this.parts.filter(part => {
      const owned = part.constructor.name.toLowerCase().includes(category.toLowerCase())
        || ((part instanceof ClotheArm || part instanceof ClotheSleeve)
            && part.category === category);
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
        if (config?.hasArm) this.attachArm(category, id);
        this.renderParts();
        return true;
      }
    }

    this.renderParts();
    return false;
  }

  /**
   * Stack a just-equipped item's own arm and sleeve on top of it, in the
   * original's own draw order: the item's frame is the garment BEHIND its arm
   * (the torso), then the arm, then the sleeve in front of it. See
   * ClotheArm's and ClotheSleeve's class docs, and swf_to_rig.py.
   *
   * Attached for every item in a `hasArm` category, without looking at what
   * that item actually has: on face/back, where the body rig draws the arms
   * itself, both layers simply render nothing — the same "no artwork for this
   * facing" convention every other part uses.
   */
  private attachArm(category: string, clothingId: string): void {
    const itemIndex = this.parts.findIndex(p =>
      p.constructor.name.toLowerCase().includes(category.toLowerCase()));
    if (itemIndex === -1) return;
    const legs = BaseTextureLoader.getInstance().HUMAN_LEGS_ANIMATIONS;
    const arm = new ClotheArm(clothingId, category, this._direction, 0.22, legs);
    const sleeve = new ClotheSleeve(clothingId, category, this._direction, legs);
    this.parts.splice(itemIndex + 1, 0, arm, sleeve);
    arm.setTint(this.skinColor);
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
   * @param isPrivate Italic, lighter gray text — see AvatarBubble.show().
   */
  public say(text: string, duration = 3000, isPrivate = false): void {
    // Talking cancels an in-progress snore, same as the original (AS2:
    // Bulle.setText / User.say() both call initZZ()).
    this.stopSnore();
    if (!this.bubble) {
      this.bubble = new AvatarBubble();
      // Tail tip anchored near the upper-right of the avatar's head
      this.bubble.x = this.width * 0.55;
      this.bubble.y = 20;
      this.addChild(this.bubble);
    }
    this.bubble.show(text, duration, isPrivate);
  }

  /** Hide the speech bubble immediately. */
  public stopSaying(): void {
    this.bubble?.hide();
  }

  /** Play one of the 12 emoji bubbles above the avatar's head (1-12). */
  public playSmile(slot: number): void {
    this.stopSnore();
    if (!this.smileOverlay) {
      this.smileOverlay = new SmileOverlay();
      // Centered on the head (0.5, not the speech bubble's 0.55 — that
      // offset exists only to clear room for the bubble's own tail, which
      // this doesn't have), and much closer to head-top than the speech
      // bubble's y:20 — that gap reads right for a text bubble that needs
      // to clear its own tail, but left this floating well above the head.
      this.smileOverlay.x = 0;
      this.smileOverlay.y = 28;
      this.addChild(this.smileOverlay);
    }
    this.smileOverlay.show(slot);
    // Overlay is a child of this avatar, so it draws wherever this avatar's
    // own zIndex places it among its siblings (other avatars/furniture) —
    // it doesn't automatically float above a neighbour just because it's
    // visually higher on screen. Bump to the EFFECT layer (always wins,
    // see ZOrder.compute) for as long as the bubble is up, then revert —
    // hide() fires on its own internal timer this class never hears about,
    // hence the matching setTimeout here instead of a callback.
    this.updateZIndex();
    setTimeout(() => this.updateZIndex(), SMILE_DURATION);
  }

  /** Play the "cœurs" animation above the avatar's head. */
  public playLove(): void {
    this.stopSnore();
    if (!this.loveOverlay) {
      this.loveOverlay = new LoveOverlay();
      this.loveOverlay.x = this.width * 0.44;
      this.loveOverlay.y = 40;
      this.addChild(this.loveOverlay);
    }
    this.loveOverlay.show();
    // Same reasoning as playSmile() above.
    this.updateZIndex();
    setTimeout(() => this.updateZIndex(), LOVE_DURATION);
  }

  /**
   * Start the continuous "zzz" snore loop above the avatar's head. Unlike
   * playSmile/playLove this has no fixed duration — the caller must call
   * stopSnore() when the player talks or moves (say() and walk() already
   * do this for this avatar's own overlay; a caller driving a REMOTE
   * avatar from network events needs to call stopSnore() itself on that
   * avatar's own move/say broadcasts).
   */
  public startSnore(): void {
    if (!this.snoreOverlay) {
      this.snoreOverlay = new SnoreOverlay();
      this.snoreOverlay.x = this.width * 0.58;
      this.snoreOverlay.y = 42;
      this.addChild(this.snoreOverlay);
    }
    this.snoreOverlay.start();
    // Same reasoning as playSmile() — no fixed duration here, so no revert
    // timer to schedule; stopSnore() below calls updateZIndex() itself.
    this.updateZIndex();
  }

  /** Stop the snore loop immediately, if running. */
  public stopSnore(): void {
    this.snoreOverlay?.stop();
    this.updateZIndex();
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
    // Smile/love/snore overlays are children of this avatar (they need to
    // move/rotate with it), so they draw wherever THIS avatar's own zIndex
    // places it among its siblings (other avatars/furniture) — a neighbour
    // depth-sorted in front of this avatar covers the bubble too, even
    // though it's visually well above the avatar's head. Bumping to the
    // EFFECT layer (always wins — see ZOrder.compute's layer*10_000_000
    // term) for as long as any overlay is showing keeps the emote readably
    // on top of the room instead of being clipped by whoever's standing
    // nearby; see playSmile/playLove/startSnore/stopSnore for the calls
    // that keep this in sync with each overlay's own show/hide timing.
    const emoting = !!(this.smileOverlay?.visible || this.loveOverlay?.visible || this.snoreOverlay?.visible);
    // +0.5 px de biais : garantit que l'avatar est dans un bucket de profondeur
    // supérieur à la porte même quand feetY ≈ doorMidY (round((y+0.5)*100) > round(y*100))
    this.zIndex = ZOrder.compute({
      x: this.x,
      y: this.y + feetY + 0.5,
      layer: emoting ? ZOrder.ZPriority.EFFECT : ZOrder.ZPriority.SCENE,
      offset: 3 // avatar : toujours devant porte(2), plinthe(1), mur(0)
    });
  }
}
