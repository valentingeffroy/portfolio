# Project Intake Center

Ce repo est une version **statique** (export Webflow) du site. Pour éviter de maintenir les projets à la main dans:
- `public/index.html`
- `public/fr/index.html`

…on utilise une **source de vérité**: `data/projects.json`, puis on **génère** la section “Projects/Projets” en EN/FR.

## Pré-requis

- Node.js installé
- Dépendances installées:

```bash
npm install
```

Playwright nécessite aussi l’installation des navigateurs (une fois):

```bash
npx playwright install
```

## Scripts

- **Bootstrap (1 fois)**: crée `data/projects.json` depuis le HTML actuel et ajoute les marqueurs dans EN/FR.

```bash
npm run projects:bootstrap
```

- **Générer les sections Projects (EN + FR)** à partir de `data/projects.json`:

```bash
npm run projects:generate
```

- **Ajouter un projet** (questions interactives + screenshots + update JSON + génération EN/FR):

```bash
npm run add-project
```

Ou avec URL directe:

```bash
npm run add-project -- --url "https://example.com"
```

## Screenshots (convention)

Le script capture:
- **Desktop**: fullpage → `public/assets/images/<slug>-desktop-full.avif`
- **Mobile**: viewport → `public/assets/images/<slug>-mobile.avif` + variantes `-p-500/-p-800/-p-1080/-p-1600`

## Où sont les marqueurs

La section générée est entre:
- `<!-- PROJECTS:START -->`
- `<!-- PROJECTS:END -->`

dans:
- `public/index.html`
- `public/fr/index.html`

