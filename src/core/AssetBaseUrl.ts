/**
 * Singleton qui stocke l'URL de base du serveur d'assets dynamiques.
 * Initialisé une fois au démarrage via GameCore.
 */
export class AssetBaseUrl {
  private static dynamicBase = "";

  /** Définit l'URL de base (ex: "http://localhost:3001"). Le slash final est retiré. */
  static setDynamic(url: string): void {
    this.dynamicBase = url.replace(/\/+$/, "");
  }

  /**
   * Retourne l'URL résolue pour un path d'asset dynamique.
   * - Avec URL configurée : `${base}/clothes/hair/hair7.json`
   * - Sans URL (dev local) : `assets/clothes/hair/hair7.json` (chemin relatif webpack)
   *
   * @param assetPath  Chemin relatif sans slash initial (ex: "furnitures/jardin/banc.json")
   */
  static resolve(assetPath: string): string {
    const clean = assetPath.replace(/^\/+/, "");
    if (!this.dynamicBase) return `assets/${clean}`;
    return `${this.dynamicBase}/${clean}`;
  }
}
