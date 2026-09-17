import { Assets, Container, Sprite, Spritesheet } from 'pixi.js';
import { AssetBaseUrl } from '../../core/AssetBaseUrl';

// Avatar-local units, not CSS px — see SmileOverlay.ts's SIZE comment.
const HEART_SIZE = 34; // on-screen width per heart
const SPREAD = 2.4; // px per SWF unit — turns love.json's threeHeartLayout offsets (a ~30-unit spread) into a compact cluster
const PULSE_PERIOD = 900; // ms per pulse cycle
// Duration = the original's 200-frame "love" clip / its declared 24fps —
// this plays through uninterrupted once triggered (AS2: launchLove() only
// gets cancelled by a NEW launchZZ(), never by a timer), a real multi-
// second moment rather than a quick pulse.
const DURATION = 8300;
const FADE_OUT = 400;

let sheetPromise: Promise<Spritesheet> | null = null;
function loadSheet(): Promise<Spritesheet> {
  // Resolved lazily — see SmileOverlay.ts's loadSheet() for why this can't
  // be a module-level constant (AssetBaseUrl.setDynamic() runs later).
  if (!sheetPromise) sheetPromise = Assets.load(AssetBaseUrl.resolve('ui/emotes/love.json')) as Promise<Spritesheet>;
  return sheetPromise;
}

interface HeartLayout { x: number; y: number; scaleX: number; scaleY: number; }

/**
 * The "cœurs" animation above a player's head (AS2: `User.launchLove()` /
 * `Coeur.as`). The original SWF places 3 static hearts once (no baked
 * motion) — all the life comes from each heart's own `onEnterFrame` scale
 * pulse (`pulse = 10 + abs(sin(tp))*15`, `tp` randomized per heart so they
 * don't pulse in lockstep). Reproduced the same way: 3 sprites positioned
 * per love.json's `threeHeartLayout`, each with an independent phase.
 */
export class LoveOverlay extends Container {
  private readonly hearts: Sprite[] = [];
  private readonly phases: number[] = [];
  private readonly baseScale: number[] = [1, 1, 1];
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private rafId: number | null = null;
  private lastFrameAt = 0;
  private elapsedMs = 0;
  private loadToken = 0;

  constructor() {
    super();
    for (let i = 0; i < 3; i++) {
      const s = new Sprite();
      s.anchor.set(0.5, 1);
      this.addChild(s);
      this.hearts.push(s);
      this.phases.push(Math.random() * Math.PI * 2);
    }
    this.visible = false;
  }

  show(): void {
    this.clearTimer();
    this.clearTicker();
    this.alpha = 1;
    this.elapsedMs = 0;
    this.visible = true;
    for (let i = 0; i < this.phases.length; i++) this.phases[i] = Math.random() * Math.PI * 2;

    const token = ++this.loadToken;
    loadSheet().then((sheet) => {
      if (token !== this.loadToken) return;
      const layout = (sheet.data.meta as { threeHeartLayout?: { hearts: HeartLayout[] } }).threeHeartLayout;
      const texture = sheet.textures['coeur'];
      if (!texture || !layout) return;
      // Middle heart (index 1) is the one meant to sit directly above the
      // head — its own x/y in threeHeartLayout aren't 0 (positioned
      // relative to the composed art's own origin, not to the head), so
      // re-center every heart relative to IT rather than using the raw
      // offsets as-is. In the original, the middle heart has the SMALLEST
      // y (SWF y grows downward — smaller y = higher up), i.e. it sits
      // ABOVE the two side hearts; preserve that same relative order (was
      // inverted before: `-h.y` flipped which pair ended up higher).
      const centerX = layout.hearts[1]?.x ?? 0;
      const centerY = layout.hearts[1]?.y ?? 0;
      const LIFT = 14; // px the whole cluster floats above the anchor point
      layout.hearts.forEach((h, i) => {
        const heart = this.hearts[i];
        heart.texture = texture;
        heart.x = (h.x - centerX) * SPREAD;
        heart.y = (h.y - centerY) * SPREAD - LIFT;
        this.baseScale[i] = HEART_SIZE / texture.width;
        heart.scale.set(this.baseScale[i]);
      });
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

  private readonly onFrame = (): void => {
    const now = performance.now();
    const deltaMS = now - this.lastFrameAt;
    this.lastFrameAt = now;
    this.elapsedMs += deltaMS;

    this.hearts.forEach((heart, i) => {
      this.phases[i] += (deltaMS / PULSE_PERIOD) * Math.PI * 2;
      const pulse = 0.4 + Math.abs(Math.sin(this.phases[i])) * 0.6;
      heart.scale.set(this.baseScale[i] * pulse);
    });

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
