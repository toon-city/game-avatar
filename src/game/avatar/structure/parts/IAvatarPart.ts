import {Sprite} from 'pixi.js';

/**
 * Represents an avatar part in the game.
 */
export interface IAvatarPart extends Sprite {
  /**
   * Indicates whether the avatar part is currently walking.
   */
  readonly walking: boolean;

  /**
   * The identifier of the avatar part.
   */
  readonly identifier: string;

  /**
   * The direction of the avatar part.
   */
  direction: number;

  /**
   * Change the skin color of the avatar part.
   *
   * @param tint - The new tint color.
   */
  setTint(tint: number): void;

  /**
   * Make the avatar part start walking.
   */
  walk(): void;

  /**
   * Stop the avatar part from walking.
   */
  stopWalk(): void;
}
