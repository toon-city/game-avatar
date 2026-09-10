/**
 * game-avatar public API
 *
 * @example
 * import { Avatar, BaseTextureLoader, AssetBaseUrl } from '@toon-live/game-avatar';
 */

// ─── Avatar ──────────────────────────────────────────────────────────────────
export { Avatar }                        from './game/avatar/Avatar';
export { AvatarBubble }                  from './game/avatar/AvatarBubble';
export { AvatarManager }                 from './game/avatar/AvatarManager';
export type { AvatarSpawnOptions, AvatarMoveResult } from './game/avatar/AvatarManager';
export type { IAvatar, IAvatarParams }   from './game/avatar/IAvatar';
export { default as ClotheRegistry }     from './game/avatar/ClotheRegistry';

// ─── Textures / assets ───────────────────────────────────────────────────────
export { BaseTextureLoader } from './game/textures/BaseTextureLoader';
export { AssetBaseUrl }      from './core/AssetBaseUrl';

// ─── Shared primitives (duplicated from game-core — see README) ──────────────
export type { Point }              from './core/types/Point';
export type { IHasPoints }         from './modules/common/abstract/IHasPoints';
export type { IHasDepthCalculator } from './modules/common/abstract/IHasDepthCalculator';
export * as ZOrder                 from './modules/common/ZOrder';
