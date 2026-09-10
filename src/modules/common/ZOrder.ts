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
 *   angle = -PI/4,  depthFactor = 1.5
 *   x_screen = x_world + y_world * cos(angle) * df  (+1.06 * y_world)
 *   y_screen = -z    + y_world * sin(angle) * df  (-1.06 * y_world)
 *
 * → La profondeur ISO est portée UNIQUEMENT par y_screen.
 *   Objets avec y_screen plus grand = plus « devant » la caméra = z-index plus haut.
 *
 * Pour des objets au MÊME y_screen (même rangée ISO) :
 *   le vecteur de profondeur en espace écran est (cos, sin) = (+1, –1) normalisé.
 *   La gauche (petit x_screen) est donc légèrement plus profonde que la droite.
 *   On ajoute un très petit poids sur x pour résoudre les ex-æquo sans perturber
 *   l'ordre principal.
 *
 * Formule :  depth_key = y_screen + x_screen * ISO_X_WEIGHT
 *            z_index   = layer * LAYER_SCALE + round(depth_key) * DEPTH_SCALE + offset
 */

// Poids isométrique de x (beaucoup plus petit que y pour ne pas briser l'ordre principal)
export const ISO_X_WEIGHT = 0.05;

export function compute(entity: ZEntity): number {
  const sy = entity.y ?? 0;
  const sx = entity.x ?? 0;

  // Profondeur isométrique : y principal + x comme fin départage
  const depth = Math.round((sy + sx * ISO_X_WEIGHT) * 100);
  const layer  = (entity.layer  ?? ZPriority.SCENE) & 0xff;
  const offset = Math.floor((entity.offset ?? 0) & 0xff);

  return layer * 10_000_000 + depth * 10 + offset;
}