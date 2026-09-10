import { Application, Container } from 'pixi.js';
import { Avatar } from './Avatar';
import { IHasDepthCalculator } from '../../modules/common/abstract/IHasDepthCalculator';
import { Point } from '../../core/types/Point';
import * as ZOrder from '../../modules/common/ZOrder';

export interface AvatarSpawnOptions {
  showSocle?: boolean;
  direction?: number;
  skinColor?: number;
  clothing?: { [category: string]: string };
  /** Pseudo affiché au-dessus de l'avatar au survol. Par défaut : l'id. */
  username?: string;
}

export interface AvatarMoveResult {
  success: boolean;
  collision?: boolean;
  blockedBy?: 'wall' | 'furniture' | 'boundary';
  message?: string;
}

export class AvatarManager {
  private avatars: Map<string, Avatar> = new Map();
  private avatarCounter = 0;

  constructor(
    private readonly app: Application,
    private readonly gameScene: Container,
    private readonly depthCalculator?: IHasDepthCalculator
  ) {}

  /**
   * Spawn a new avatar at specified position
   */
  spawnAvatar(
    x: number, 
    y: number, 
    id?: string, 
    options: AvatarSpawnOptions = {}
  ): { id: string; avatar: Avatar } {
    const avatarId = id || `avatar_${++this.avatarCounter}`;
    
    if (this.avatars.has(avatarId)) {
      throw new Error(`Avatar with id '${avatarId}' already exists`);
    }

    const avatar = new Avatar(this.app, {
      showSocle: options.showSocle ?? true,
      direction: options.direction ?? 1
    });

    // Set position
    avatar.position.set(x, y);

    // Apply clothing if specified
    if (options.clothing) {
      for (const [category, clothingId] of Object.entries(options.clothing)) {
        avatar.changeClothing(category, clothingId);
      }
    }

    // Apply skin color if specified
    if (options.skinColor !== undefined) {
      avatar.setSkinColor(options.skinColor);
    }

    // Update Z-index based on position
    avatar.updateZIndex();

    // Add to scene and registry
    this.gameScene.addChild(avatar);
    this.avatars.set(avatarId, avatar);

    return { id: avatarId, avatar };
  }

  /**
   * Remove an avatar by ID
   */
  removeAvatar(id: string): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    this.gameScene.removeChild(avatar);
    this.avatars.delete(id);
    avatar.destroy();
    
    return true;
  }

  /**
   * Move an avatar to new position with collision checking
   */
  moveAvatar(id: string, x: number, y: number, checkCollisions = true): AvatarMoveResult {
    const avatar = this.avatars.get(id);
    if (!avatar) {
      return { success: false, message: `Avatar '${id}' not found` };
    }

    const originalX = avatar.x;
    const originalY = avatar.y;

    // Temporarily move avatar to check collision
    avatar.position.set(x, y);

    if (checkCollisions && this.depthCalculator) {
      const hasCollision = this.depthCalculator.checkCollision(avatar, null);
      
      if (hasCollision) {
        // Revert position
        avatar.position.set(originalX, originalY);
        return {
          success: false,
          collision: true,
          blockedBy: 'furniture', // Could be enhanced to detect wall vs furniture
          message: 'Cannot move avatar due to collision'
        };
      }
    }

    // Update depth after successful move
    avatar.updateZIndex();

    return {
      success: true,
      message: `Avatar '${id}' moved to (${x}, ${y})`
    };
  }

  /**
   * Move avatar by direction (e.g., for keyboard movement)
   */
  moveAvatarByDirection(id: string, direction: number, distance = 20): AvatarMoveResult {
    const avatar = this.avatars.get(id);
    if (!avatar) {
      return { success: false, message: `Avatar '${id}' not found` };
    }

    let deltaX = 0;
    let deltaY = 0;

    // Convert direction to movement (based on isometric directions)
    if (direction & 0b1000) deltaX -= distance; // left
    if (direction & 0b0100) deltaX += distance; // right
    if (direction & 0b0010) deltaY -= distance; // up
    if (direction & 0b0001) deltaY += distance; // down

    const newX = avatar.x + deltaX;
    const newY = avatar.y + deltaY;

    // Update avatar direction for animation
    avatar.changeDirection(direction);

    return this.moveAvatar(id, newX, newY);
  }

  /**
   * Change clothing for an avatar
   */
  changeAvatarClothing(id: string, category: string, clothingId?: string): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    return avatar.changeClothing(category, clothingId);
  }

  /**
   * Start walking animation for avatar
   */
  startWalking(id: string): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    avatar.walk();
    return true;
  }

  /**
   * Stop walking animation for avatar
   */
  stopWalking(id: string): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    avatar.stopWalk();
    return true;
  }

  /**
   * Get avatar by ID
   */
  getAvatar(id: string): Avatar | undefined {
    return this.avatars.get(id);
  }

  /**
   * Get all avatars
   */
  getAllAvatars(): Map<string, Avatar> {
    return new Map(this.avatars);
  }

  /**
   * Update avatar depth based on position
   */
  private updateAvatarDepth(avatar: Avatar): void {
    avatar.zIndex = ZOrder.compute({
      x: avatar.x,
      y: avatar.y + avatar.height, // bord avant (pieds)
      layer: ZOrder.ZPriority.SCENE,
      offset: 1
    });
  }

  /**
   * Update all avatars' depth (call this when the scene changes)
   */
  updateAllAvatarsDepth(): void {
    for (const avatar of this.avatars.values()) {
      this.updateAvatarDepth(avatar);
    }
  }

  /**
   * Teleport avatar (no collision checking)
   */
  teleportAvatar(id: string, x: number, y: number): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    avatar.position.set(x, y);
    avatar.updateZIndex();
    
    return true;
  }

  /**
   * Change avatar skin color
   */
  changeAvatarSkinColor(id: string, color: number): boolean {
    const avatar = this.avatars.get(id);
    if (!avatar) return false;

    avatar.setSkinColor(color);
    return true;
  }

  /**
   * Get avatar count
   */
  getAvatarCount(): number {
    return this.avatars.size;
  }

  /**
   * Clear all avatars
   */
  clearAll(): void {
    for (const [id, avatar] of this.avatars) {
      this.gameScene.removeChild(avatar);
      avatar.destroy();
    }
    this.avatars.clear();
    this.avatarCounter = 0;
  }
}