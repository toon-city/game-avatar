import { Assets, Container, Sprite, Spritesheet } from 'pixi.js';
import { AssetBaseUrl } from '../../core/AssetBaseUrl';

// Avatar-local units, not CSS px — the avatar's own canvas is 80x120 of
// these and renders roughly 40x60 CSS px on screen (canvas is drawn at 2x
// internal resolution), so keep these modest relative to that box.
const SIZE = 36; // on-screen width of the face art; height follows each frame's own aspect ratio
const BUBBLE_SIZE = 60; // the shared octagon background is bigger than the face crop it frames
// The extracted bubble.png includes the small connector-dots hanging below
// the hexagon itself (part of the original art) — measured directly off the
// asset: the hexagon's own visual center sits 61.4% of the way up from the
// full image's bottom edge (dots included), not at the vertical midpoint.
// Used to lift the face sprite so it centers on the hexagon, not on the
// bubble asset's full (hexagon + dangling dots) bounding box.
const HEXAGON_CENTER_FRAC = 0.614;
const DURATION = 4000; // matches the original Smile.as's setInterval(kill, 4000)
const FADE_OUT = 300; // ms, tail-end fade instead of an abrupt pop-out

let sheetPromise: Promise<Spritesheet> | null = null;
function loadSheet(): Promise<Spritesheet> {
  // Resolved lazily (not a module-level constant) — GameCore.ts only calls
  // AssetBaseUrl.setDynamic() once it initializes, which is after this
  // module is first imported/evaluated; resolving at import time would
  // silently freeze in the pre-setDynamic() fallback ('assets/...' instead
  // of 'http://localhost:3001/...'), same mistake Clothe.ts's fileURI
  // getter already avoids by computing on every access.
  if (!sheetPromise) sheetPromise = Assets.load(AssetBaseUrl.resolve('ui/emotes/smile.json')) as Promise<Spritesheet>;
  return sheetPromise;
}

/**
 * The 12-emoji floating bubble shown above a player's head (AS2:
 * `User.pense(frame)`). Recovered from player_tchat2.swf: each of the 12
 * slots is its own looping MovieClip (an animated face — blink, wobble,
 * sparkle) sitting inside one CONSTANT octagon-shaped bubble shared by all
 * 12 (characterId 198 in the original — extracted separately as smile.json's
 * "bubble" frame, since the per-slot exports only capture each animated
 * face's own art, not the static bubble drawn once behind it). Rendered
 * here as two layered sprites: the bubble (static, behind) and the face
 * (animated, in front), instead of trying to re-bake them together.
 */
export class SmileOverlay extends Container {
  private readonly bubble: Sprite;
  private readonly sprite: Sprite;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;
  private frames: Sprite['texture'][] = [];
  private frameIndex = 0;
  private frameAccumMs = 0;
  private frameDurationMs = 1000 / 24;
  private elapsedMs = 0;
  private lastFrameAt = 0;
  private loadToken = 0;

  constructor() {
    super();
    this.bubble = new Sprite();
    this.bubble.anchor.set(0.5, 1);
    this.addChild(this.bubble);
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 1);
    this.addChild(this.sprite);
    this.visible = false;
  }

  show(slot: number): void {
    this.clearTimer();
    this.clearTicker();
    this.alpha = 1;
    this.elapsedMs = 0;
    this.frameIndex = 0;
    this.frameAccumMs = 0;
    this.visible = true;

    const token = ++this.loadToken;
    loadSheet().then((sheet) => {
      if (token !== this.loadToken) return;
      const fps = (sheet.data.meta as { animationFps?: number }).animationFps ?? 24;
      this.frameDurationMs = 1000 / fps;
      const emojiMeta = (sheet.data.meta as { emojis?: Record<string, { frames: number }> }).emojis;
      const count = emojiMeta?.[String(slot)]?.frames ?? 1;
      this.frames = Array.from({ length: count }, (_, i) => sheet.textures[`${slot}_${i + 1}`]).filter(Boolean);
      if (this.frames.length === 0) return;

      const bubbleTex = sheet.textures['bubble'];
      if (bubbleTex?.width) {
        this.bubble.texture = bubbleTex;
        this.bubble.width = BUBBLE_SIZE;
        this.bubble.height = BUBBLE_SIZE * (bubbleTex.height / bubbleTex.width);
      }

      this.sprite.texture = this.frames[0];
      this.applySize();
    });

    this.lastFrameAt = performance.now();
    this.rafId = requestAnimationFrame(this.onFrame);
    this.hideTimer = setTimeout(() => this.hide(), DURATION);
  }

  hide(): void {
    this.clearTimer();
    this.clearTicker();
    this.visible = false;
  }

  private applySize(): void {
    const tex = this.sprite.texture;
    if (!tex.width) return;
    this.sprite.width = SIZE;
    this.sprite.height = SIZE * (tex.height / tex.width);
    // Center the face on the hexagon (not on the bubble asset's full
    // bounding box, which includes the dangling connector-dots below the
    // hexagon — see HEXAGON_CENTER_FRAC) — both sprites anchor (0.5,1) at
    // the same container-local y:0, so without this the face's own center
    // sits noticeably lower than the hexagon's.
    if (this.bubble.height > 0) {
      const hexagonCenterY = -(this.bubble.height * HEXAGON_CENTER_FRAC);
      this.sprite.y = hexagonCenterY + this.sprite.height / 2;
    }
  }

  private readonly onFrame = (): void => {
    const now = performance.now();
    const deltaMS = now - this.lastFrameAt;
    this.lastFrameAt = now;
    this.elapsedMs += deltaMS;

    if (this.frames.length > 1) {
      this.frameAccumMs += deltaMS;
      while (this.frameAccumMs >= this.frameDurationMs) {
        this.frameAccumMs -= this.frameDurationMs;
        this.frameIndex = (this.frameIndex + 1) % this.frames.length;
      }
      this.sprite.texture = this.frames[this.frameIndex];
      this.applySize();
    }

    const remaining = DURATION - this.elapsedMs;
    if (remaining < FADE_OUT) {
      this.alpha = Math.max(0, remaining / FADE_OUT);
    }

    this.rafId = requestAnimationFrame(this.onFrame);
  };

  private clearTicker(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private clearTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }
}
