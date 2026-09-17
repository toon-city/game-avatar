import { Container, Text, TextStyle } from 'pixi.js';

// Recovered from player_tchat2.swf's "zzz" clip (characterId 491): the "Z"
// itself is a DefineText using a device font with no embedded glyph outlines
// (FFDec's own font export came back empty), so there's no bitmap to extract
// — reproduced as real text instead, using the raw per-frame placement deltas
// that WERE recoverable: a new Z spawns roughly every 8 frames, drifts up-
// and-right (~+35x/-56y per 2-frame step) over ~24-32 frames, 2-3 concurrent,
// at the original's 24fps with no loop-back action once it reaches frame 40
// (the original just stopped there — a single non-repeating play()). The
// user explicitly wants this to be a continuous, uninterrupted snore effect
// that only stops on move/talk, so this reimplements it as an actual
// repeating spawner rather than a fixed 40-frame one-shot.
const SPAWN_INTERVAL_MS = (8 / 24) * 1000;
const LIFETIME_MS = (28 / 24) * 1000;
const DRIFT_X = 14; // px over the Z's lifetime (scaled down from the raw SWF delta — see module doc)
const DRIFT_Y = -22;
const FONT_SIZE = 15;

interface ZInstance {
  text: Text;
  bornAt: number;
  baseX: number;
}

const STYLE = new TextStyle({
  fontSize: FONT_SIZE,
  fontWeight: '900',
  fontFamily: 'Nunito, Arial, sans-serif',
  fill: 0x236981, // --toon-petrol
  stroke: { color: 0xffffff, width: 3 },
});

/**
 * Continuous "zzzZZZ" snore loop above a player's head (AS2:
 * `User.launchZZ()`). Unlike SmileOverlay/LoveOverlay this has no fixed
 * duration — call start() to begin looping, stop() to end it (the caller
 * — Avatar.ts — is responsible for calling stop() the moment the player
 * talks or moves, per the user's explicit request).
 */
export class SnoreOverlay extends Container {
  private readonly instances: ZInstance[] = [];
  private spawnTimer: ReturnType<typeof setInterval> | null = null;
  private rafId: number | null = null;
  private lastFrameAt = 0;

  start(): void {
    if (this.spawnTimer !== null) return; // already running
    this.visible = true;
    this.spawnOne();
    this.spawnTimer = setInterval(() => this.spawnOne(), SPAWN_INTERVAL_MS);
    this.lastFrameAt = performance.now();
    this.rafId = requestAnimationFrame(this.onFrame);
  }

  stop(): void {
    if (this.spawnTimer !== null) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.instances.forEach((z) => z.text.destroy());
    this.instances.length = 0;
    this.removeChildren();
    this.visible = false;
  }

  get running(): boolean {
    return this.spawnTimer !== null;
  }

  private spawnOne(): void {
    const text = new Text({ text: 'Z', style: STYLE });
    text.anchor.set(0.5, 1);
    const baseX = (Math.random() - 0.5) * 10;
    text.x = baseX;
    text.y = 0;
    this.addChild(text);
    this.instances.push({ text, bornAt: performance.now(), baseX });
  }

  private readonly onFrame = (): void => {
    const now = performance.now();
    this.lastFrameAt = now;

    for (let i = this.instances.length - 1; i >= 0; i--) {
      const z = this.instances[i];
      const age = now - z.bornAt;
      if (age >= LIFETIME_MS) {
        z.text.destroy();
        this.instances.splice(i, 1);
        continue;
      }
      const t = age / LIFETIME_MS;
      z.text.x = z.baseX + DRIFT_X * t;
      z.text.y = DRIFT_Y * t;
      z.text.alpha = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.7) / 0.3);
      z.text.scale.set(0.7 + t * 0.5);
    }

    this.rafId = requestAnimationFrame(this.onFrame);
  };
}
