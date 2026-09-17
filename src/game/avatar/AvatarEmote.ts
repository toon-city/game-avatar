import { Assets, Container, Sprite } from 'pixi.js';

const SIZE = 32;
const RISE = 22; // px drifted upward over the animation's lifetime
const PULSE_PERIOD = 900; // ms per pulse cycle (LOVE only — see show())

/**
 * A floating icon overlay above an avatar — smile/coeurs/zzz. Same
 * attach-as-child-of-Avatar recipe as AvatarBubble (see that file), but
 * image-based instead of text, and with its own float+fade instead of a
 * static bubble: the original Flash game's Coeur.as pulsed scale via
 * onEnterFrame and Smile.as just gotoAndStop(frame) + auto-killed after
 * 4s — this reproduces both with a single rAF-driven animation, using
 * pulse for LOVE and a plain drift-up-and-fade for SMILE/ZZZ.
 */
export class AvatarEmote extends Container {
  private readonly sprite: Sprite;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;
  private lastFrameAt = 0;
  private elapsedMs = 0;
  private durationMs = 0;
  private pulsing = false;
  /** Guards against a stale load resolving after a newer show() call
   *  (e.g. clicking a second emoji before the first's texture finished
   *  loading) from clobbering the sprite with the wrong image. */
  private loadToken = 0;

  constructor() {
    super();
    this.sprite = new Sprite();
    this.sprite.anchor.set(0.5, 1);
    this.addChild(this.sprite);
    this.visible = false;
  }

  /**
   * @param textureUrl Resolved the same way every other in-scene texture is
   *                    (AreaView, WallView, ...): a plain relative path, Pixi
   *                    loads it on demand — no preload bundle entry needed
   *                    for an occasional overlay like this.
   * @param duration   ms before auto-hide (original: 4000 for smile).
   * @param pulse      LOVE gets a continuous scale pulse (Coeur.as); SMILE/ZZZ don't.
   */
  show(textureUrl: string, duration = 4000, pulse = false): void {
    this.clearTimer();
    this.clearTicker();

    this.y = 0;
    this.alpha = 1;
    this.pulsing = pulse;
    this.elapsedMs = 0;
    this.durationMs = duration;
    this.visible = true;

    // Texture.from() on an unresolved URL returns an EMPTY placeholder
    // synchronously — setting sprite.width/height against it computes a
    // ~0 scale that never gets reapplied once the real image lands, so
    // the icon rendered as an invisible 1px dot. Assets.load() resolves
    // to the real texture (same convention Clothe.ts already uses).
    const token = ++this.loadToken;
    Assets.load(textureUrl).then((texture) => {
      if (token !== this.loadToken) return; // superseded by a newer show()
      this.sprite.texture = texture;
      this.sprite.width = SIZE;
      this.sprite.height = SIZE;
    });

    this.lastFrameAt = performance.now();
    this.rafId = requestAnimationFrame(this.onFrame);

    if (duration > 0) {
      this.hideTimer = setTimeout(() => this.hide(), duration);
    }
  }

  hide(): void {
    this.clearTimer();
    this.clearTicker();
    this.visible = false;
  }

  private readonly onFrame = (): void => {
    const now = performance.now();
    const deltaMS = now - this.lastFrameAt;
    this.lastFrameAt = now;
    this.elapsedMs += deltaMS;

    if (this.pulsing) {
      const phase = (this.elapsedMs % PULSE_PERIOD) / PULSE_PERIOD;
      const scale = 0.75 + Math.abs(Math.sin(phase * Math.PI * 2)) * 0.35;
      this.sprite.scale.set(scale);
    }

    if (this.durationMs > 0) {
      const t = Math.min(this.elapsedMs / this.durationMs, 1);
      this.y = -RISE * t;
      this.alpha = 1 - t * 0.6;
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
