# Portfolio (static)

Ce repo contient une version **100% statique** de ton site (export Webflow) prête à être déployée sur **Netlify**.

## Structure

- `public/index.html`: page principale
- `public/css/`: CSS (incluant les CSS Webflow rapatriés)
- `public/js/`: JS (incluant `webflow.js` rapatrié)
- `public/assets/webflow/`: assets rapatriés depuis le CDN Webflow

## Déploiement Netlify

- Le site est publié depuis `public/` (voir `netlify.toml`).
- Sur Netlify, connecte le repo GitHub puis choisis :
  - **Build command**: (vide)
  - **Publish directory**: `public`

## Domaine

Pour `valentingeffroy.fr`, Netlify te donnera les enregistrements DNS à configurer chez ton registrar.
