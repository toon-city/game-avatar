# game-avatar

Système de rendu de l'avatar (PixiJS) — extrait de `game-core` pour être
consommé à la fois par `game-core` (qui l'utilise pour `spawnAvatar`) et
directement par les apps qui n'ont besoin que d'un avatar habillé, sans le
reste du moteur de jeu (maison, meubles, input, caméra) : `game-admin`
(l'atelier de vêtements `clothing-studio`) et `game-web` (le badge avatar
de la carte d'identité HUD).

## Contenu

- `Avatar` — le personnage (corps, animations de marche, vêtements par
  direction). Contrat de placement documenté dans
  `game-assets/public/clothes/README.md` (canevas fixe 80×120, trim
  TexturePacker standard).
- `AvatarManager` / `AvatarSpawnOptions` / `AvatarMoveResult` — types de
  spawn/déplacement réutilisés par `game-core`.
- `ClotheRegistry` — table catégorie → classe de vêtement (`hair`, `hat`,
  `face`, `tshirt`, `pant`, extensible).
- `BaseTextureLoader` — singleton chargeant les textures (corps avatar +
  fonds de maison + polices). Chemins relatifs résolus au runtime contre
  ce que l'app consommatrice sert sous `/assets/` — les fichiers restent
  physiquement dans `game-core/assets/`, ce package ne fait que les
  référencer par URL.
- `AssetBaseUrl` — résout les chemins d'assets dynamiques (vêtements,
  meubles) selon l'URL du serveur d'assets configurée par l'app hôte.

## Note d'architecture

`Point`, `IHasPoints`, `IHasDepthCalculator` et `ZOrder` sont dupliqués
ici (copies locales, pas des ré-exports) : `game-core` en a aussi besoin
pour ses propres systèmes maison/meubles, et `game-avatar` ne peut pas
dépendre de `game-core` sans créer un cycle puisque `game-core` dépend de
`game-avatar`. Duplication délibérée vu la taille triviale de ces
fichiers — pas un oubli de refactor.

## Utilisation

Workspace Bun (`game-core`, `game-web`) :

```json
{ "dependencies": { "@toon-live/game-avatar": "workspace:*" } }
```

Apps hors workspace Bun (`game-admin`, npm) : alias TS pointant
directement sur les sources, comme pour `game-core` :

```json
// tsconfig.json
{ "compilerOptions": { "paths": { "game-avatar": ["../game-avatar/src/index.ts"] } } }
```
