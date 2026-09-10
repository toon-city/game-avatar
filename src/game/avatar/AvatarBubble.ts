import { Container, Graphics, Text, TextStyle } from 'pixi.js';

const PADDING   = 10;
const RADIUS    = 8;
const MAX_W     = 160; // max bubble width before wrapping
// Tail geometry: base sits at the bottom-left of the bubble body,
// tip points down-left to (0, 0) – anchored near the avatar's head.
const TAIL_TIP_X  =  0;  // tail tip  (anchor = head position)
const TAIL_TIP_Y  =  0;
const TAIL_BASE_X =  8;  // where the tail joins the bubble body (left edge offset)
const TAIL_BASE_W = 10;  // width of the tail base
const TAIL_H      = 10;  // vertical gap between bubble bottom and tail tip
// Horizontal offset: bubble body starts this many px to the RIGHT of the anchor
const BODY_OFFSET_X = 2;

/**
 * A speech‑bubble overlay that can be attached as a child of an Avatar.
 *
 * Position the bubble so its tail tip is at (0, 0) of the parent container;
 * the bubble body grows upward. Usually you want to set `bubble.x` to
 * half the avatar width and leave `bubble.y` at 0 (top of avatar).
 *
 * @example
 * const bubble = new AvatarBubble();
 * avatar.addChild(bubble);
 * bubble.x = avatar.width / 2;
 * bubble.show('Hello!', 3000);
 */
export class AvatarBubble extends Container {
  private readonly bg:   Graphics;
  private readonly labelText: Text;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();

    this.bg = new Graphics();
    this.addChild(this.bg);

    const style = new TextStyle({
      fontSize:      13,
      fill:          0x222222,
      fontFamily:    'Arial, sans-serif',
      wordWrap:      true,
      wordWrapWidth: MAX_W - PADDING * 2,
      align:         'center',
    });
    this.labelText = new Text({ text: '', style });
    this.addChild(this.labelText);

    this.visible = false;
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Display a message.
   *
   * @param text     Message to show.
   * @param duration How long to show the bubble in ms. Pass `0` to keep it
   *                 visible indefinitely (call `hide()` manually).
   */
  show(text: string, duration = 3000): void {
    // Cancel any pending auto‑hide
    this.clearTimer();

    this.labelText.text = text;
    this.redraw();
    this.visible = true;

    if (duration > 0) {
      this.hideTimer = setTimeout(() => this.hide(), duration);
    }
  }

  /** Hide and reset the bubble immediately. */
  hide(): void {
    this.clearTimer();
    this.visible = false;
  }

  // ─── Private ───────────────────────────────────────────────────────────────

  private clearTimer(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
  }

  private redraw(): void {
    const tw = this.labelText.width;
    const th = this.labelText.height;

    const bubbleW = Math.min(tw + PADDING * 2, MAX_W + PADDING * 2);
    const bubbleH = th + PADDING * 2;

    // Bubble body: extends to the RIGHT of the anchor point.
    // Bottom of body is TAIL_H above the tail tip.
    const bodyX       = BODY_OFFSET_X;            // left edge of bubble body
    const bodyTopY    = -(bubbleH + TAIL_H);       // top edge
    const bodyBottomY = -TAIL_H;                   // bottom edge

    // Text: top-left inside the bubble
    this.labelText.x = bodyX + PADDING;
    this.labelText.y = bodyTopY + PADDING;

    this.bg.clear();

    // ── Body ────────────────────────────────────────────────────────────────
    this.bg
      .roundRect(bodyX, bodyTopY, bubbleW, bubbleH, RADIUS)
      .fill({ color: 0xffffff, alpha: 0.95 })
      .stroke({ color: 0xcccccc, width: 1.5, alignment: 1 });

    // ── Tail: triangle from bottom-left of body down-left to (0, 0) ────────
    // Base of tail sits on the bottom edge of the bubble (bodyBottomY)
    const tailBaseLeft  = bodyX + TAIL_BASE_X;
    const tailBaseRight = bodyX + TAIL_BASE_X + TAIL_BASE_W;
    this.bg
      .moveTo(tailBaseLeft,  bodyBottomY)
      .lineTo(tailBaseRight, bodyBottomY)
      .lineTo(TAIL_TIP_X,    TAIL_TIP_Y)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.95 });
  }
}
