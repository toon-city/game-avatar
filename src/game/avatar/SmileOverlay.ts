import { Assets, Container, Sprite, Spritesheet } from 'pixi.js';
import { AssetBaseUrl } from '../../core/AssetBaseUrl';

const SIZE = 36; // on-screen width; height follows each frame's own aspect ratio
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
 * sparkle — already composited with its bubble border in the exported
 * frames, see smile.json's schema comment) rather than a single static
 * image, hence this plays a per-slot frame sequence instead of just
 * swapping one texture.
 */
export class SmileOverlay extends Container {
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
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 1);
    this.addChild(this.sprite);
    this.visible = false;
  }

  show(slot: number): void {
    this.clearTimer();
    this.clearTicker();
    this.alpha = 1;
    this.y = 0;
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
