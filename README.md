# Portfolio (Astro)

Portfolio statique : présentation, stack et projets synchronisés depuis l’API GitHub (README, topics, etc.). Interface type « cockpit », Tailwind v4, transitions de page Astro.

## Prérequis

- **Node.js** ≥ 22.12 (voir `package.json` → `engines`)

## Installation

```sh
npm install
```

Copie `.env.example` vers `.env` au premier lancement (`npm run dev` peut aussi t’aider via `scripts/ensure-env.mjs`).

| Variable | Rôle |
|----------|------|
| `GITHUB_USERNAME` | Compte dont on liste les dépôts publics (sans token : uniquement les repos *owner* de ce compte). |
| `API_KEY_PORTFOLIO` ou `GITHUB_TOKEN` | PAT GitHub (lecture) : liste élargie (repos publics dont tu es propriétaire ou collaborateur), meilleur quota API. |
| `GH_TOKEN` | Alias accepté par le script de sync, même usage qu’au-dessus. |

En **GitHub Actions**, le secret du dépôt **`API_KEY_PORTFOLIO`** est injecté pour le build (voir `.github/workflows/ci.yml` et `deploy-gh-pages.yml`).

## Commandes

| Commande | Action |
|----------|--------|
| `npm run dev` | Sync GitHub puis serveur de dev ([localhost:4321](http://localhost:4321)). |
| `npm run build` | Sync puis build statique dans `dist/`. |
| `npm run preview` | Prévisualise le contenu de `dist/` en local. |
| `npm run sync:github` | Régénère uniquement `src/data/github-projects.generated.json`. |

## Déploiement (GitHub Pages)

Le workflow **Build and push gh-pages** (`.github/workflows/deploy-gh-pages.yml`) build le site et pousse le contenu de `dist/` sur la branche **`gh-pages`**. Il se déclenche sur les pushes vers **`main`**, **`master`** ou **`V2`** (et en manuel via *Run workflow*).

1. **Settings → Actions → General → Workflow permissions** : activer **Read and write** pour que le workflow puisse pousser sur `gh-pages`.
2. **Settings → Pages** : source **Deploy from a branch**, branche **`gh-pages`**, dossier **`/`** (root).
3. Le site est servi sous **`https://<utilisateur>.github.io/<nom-du-depot>/`**. Les chemins internes utilisent `base` Astro (dérivé de `GITHUB_REPOSITORY` en CI) pour éviter les 404 sur ce sous-chemin.

## CI

- **`ci.yml`** : sur `push` / `pull_request` vers **`main`** ou **`master`**, installe les dépendances et lance `npm run build` (avec le secret `API_KEY_PORTFOLIO` si défini).

## Structure (aperçu)

```text
├── public/                 # Fichiers statiques (favicon, logo, etc.)
├── scripts/                # sync GitHub, ensure-env, load-env
├── src/
│   ├── components/         # UI (header, rail, cartes projet, …)
│   ├── data/
│   │   └── github-projects.generated.json  # Généré par le sync (versionné ou régénéré en CI)
│   ├── layouts/
│   ├── lib/paths.ts        # Préfixe `base` pour liens / assets (GitHub Pages projet)
│   ├── pages/              # Routes (accueil, fiches projet, mentions légales, 404)
│   ├── scripts/            # JS client (effets, navigation)
│   ├── site.config.ts      # Contenu du site (hors GitHub)
│   └── styles/
├── astro.config.mjs
└── package.json
```

## Références

- [Documentation Astro](https://docs.astro.build)
