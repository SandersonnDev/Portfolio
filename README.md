# Portfolio — extrait minimal

Ce dépôt ne contient plus que :

- la **navigation nav** (`src/components/nav.astro` + styles dans `src/styles/app.css`) ;
- le **thème** clair / sombre (`src/scripts/client/theme-toggle.ts`) ;
- les **animations GSAP** des **tags** (`.chip` sous `#about-stack-tags`) et des **badges** (`.project-cardstack-badge` dans `.project-cardstack`) via `src/scripts/client/stack-chips.ts`.

La page d’accueil est une **démo** dans `src/pages/index.astro`.

## Commandes

```sh
npm install
npm run dev
```

Node **≥ 22.12** (voir `package.json` → `engines`).
