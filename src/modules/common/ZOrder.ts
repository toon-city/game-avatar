/**
 * DUPLICATED FROM game-core/src/modules/common/ZOrder.ts, kept in manual
 * sync — game-avatar can't import game-core (GameCore itself imports Avatar
 * FROM game-avatar, so the reverse import would be circular), but Avatar's
 * own updateZIndex() (used for every REMOTE player, driven by the socket-echo
 * lerp ticker) needs the exact same depth formula as HouseView's, or a
 * locally-controlled avatar and everyone else's copy of it disagree on where
 * it sits relative to furniture. Confirmed this drifted for real: this file
 * got the ISO_X_WEIGHT fix below, the game-avatar copy didn't, until caught
 * by a direct diff. Any future change here must be copied there too.
 */
export enum ZPriority {
  WALL     = 0,
  FLOOR    = 1,
  SCENE    = 2, // meubles ET avatars : la profondeur iso décide
  EFFECT   = 3
}

/** @deprecated Utiliser ZPriority.SCENE pour tout ce qui est dans la scène */
export const ZPriority_FURNITURE = ZPriority.SCENE;
/** @deprecated Utiliser ZPriority.SCENE avec offset:1 pour les avatars */
export const ZPriority_AVATAR    = ZPriority.SCENE;

export interface ZEntity {
  /** screen X du centre du sol (optionnel, sert de départage) */
  x?: number;
  /** screen Y MAXIMAL des points d'ancrage du sol (bord avant en vue iso) */
  y: number;
  layer?: ZPriority;
  offset?: number;
}

/**
 * Projection isométrique (voir src/utils/project.ts) :
 *   angle = -PI/4,  depthFactor = sqrt(2)
 *   x_screen = x_world + y_world * cos(angle) * df  (+1.00 * y_world)
 *   y_screen = -z    + y_world * sin(angle) * df  (-1.00 * y_world)
 *
 * → La profondeur ISO est portée PRINCIPALEMENT par y_screen, mais x_screen
 *   compte pour de vrai, pas juste comme départage d'égalité — voir
 *   ISO_X_WEIGHT.
 *
 * Formule :  depth_key = y_screen + x_screen * ISO_X_WEIGHT
 *            z_index   = layer * LAYER_SCALE + round(depth_key) * DEPTH_SCALE + offset
 */

/**
 * Poids de x_screen dans la clé de profondeur — anciennement 0.05 (pensé
 * comme un simple départage d'égalité). Recalculé depuis le vrai moteur de
 * l'ancien jeu (Maison.as, DDToTD/getDepthAtPoint, retrouvé dans
 * player_tchat2.swf) :
 *
 *   function DDToTD(x, y, z) {
 *     var y2 = y + z; var x2 = x + y2;
 *     return {x: x2 * scale, y: y2 * scale};
 *   }
 *   function getDepthAtPoint(pt) {
 *     var dx = pt.x - minPoint.x, dy = pt.y - minPoint.y;
 *     var H  = maxPoint.y - minPoint.y;
 *     return round(((dx*2 + dy*7) * H + dy) / 10);
 *   }
 *
 * Confirmé sur 3 sites d'appel indépendants (placement avatar : `el._x =
 * xpos; el._y = ypos;` juste avant `DDToTD(xpos, ypos)` — donc xpos/ypos
 * SONT déjà les coordonnées écran de l'objet, exactement l'espace de nos
 * propres Avatar.x/Furniture.x ; idem pour la collision de déplacement, et
 * pour getDepthAtPointClip qui fait la même chose point par point sur les
 * marqueurs pt1..ptN d'un meuble — l'équivalent exact de notre "points"
 * d'ancrage au sol). En substituant pt = DDToTD(screenX, screenY) dans
 * getDepthAtPoint (le décalage minPoint et le facteur H sont des constantes
 * positives par room, sans effet sur un ORDRE relatif) :
 *
 *   depth ∝ 2*pt.x + 7*pt.y
 *         = 2*(screenX+screenY)*scale + 7*screenY*scale
 *         = scale * (2*screenX + 9*screenY)
 *
 * → poids de x_screen normalisé (coefficient de y_screen ramené à 1) = 2/9.
 * x_screen influe donc pour de vrai sur l'ordre (pas juste les ex-æquo
 * strictes) — un meuble/avatar assez loin sur la gauche peut légitimement
 * passer devant un autre légèrement plus "profond" (y_screen plus grand)
 * mais nettement plus à droite, exactement ce qu'on voit dans une vraie vue
 * isométrique à cette projection.
 */
export const ISO_X_WEIGHT = 2 / 9;

export function compute(entity: ZEntity): number {
  const sy = entity.y ?? 0;
  const sx = entity.x ?? 0;

  // Profondeur isométrique : y principal + x comme fin départage
  const depth = Math.round((sy + sx * ISO_X_WEIGHT) * 100);
  const layer  = (entity.layer  ?? ZPriority.SCENE) & 0xff;
  const offset = Math.floor((entity.offset ?? 0) & 0xff);

  return layer * 10_000_000 + depth * 10 + offset;
}