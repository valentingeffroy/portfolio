## Workflow traduction (à faire avant chaque push)

Ce repo est une export statique. On maintient une version :

- **EN** : `public/index.html` (URL `/`)
- **FR** : `public/fr/index.html` (URL `/fr/`)

### Objectif

- **Cohérence** : même intention, même ton, même “design voice”.
- **Naturel** : pas de traduction mot à mot.
- **Concis** : éviter les phrases longues qui cassent la mise en page.
- **Pas d’effet IA** : éviter les formulations artificielles (ex. tirets longs `—`), les explications inutiles, et les tournures trop “littérales”.

### Checklist pré-push

1. **Regarder le diff**
   - Tout changement HTML (ajout/modif/suppression) doit déclencher une vérification de traduction.
   - Cibles prioritaires :
     - `public/index.html`
     - `public/fr/index.html`
     - tout `public/**/index.html` ajouté/modifié

2. **Traduction : règles éditoriales**
   - Réécrire si nécessaire : si la version FR devient longue ou pas “catchy”, on reformule.
   - Garder l’anglais si c’est plus naturel ou plus “product” (ex. noms d’outils, certains termes de métier).
   - Éviter la ponctuation “IA” (notamment `—`).

3. **Accessibilité**
   - Vérifier `aria-label`, `alt`, `title` : ils doivent suivre la langue de la page.

4. **SEO**
   - **Canonical**
     - EN : `https://valentingeffroy.fr/`
     - FR : `https://valentingeffroy.fr/fr/`
   - **hreflang** : les deux pages doivent se référencer (`en` ↔ `fr`) + `x-default` si utilisé.
   - `og:title`, `og:description`, `twitter:*` doivent être cohérents avec la langue.

5. **Toggle langue**
   - Desktop + mobile : liens `/` ↔ `/fr/` corrects, et `w--current` sur la bonne langue.
   - Vérifier que le style reste cohérent avec les boutons du site (réglé via `public/css/overrides.css`).

### Quand tu me dis “commit + push”

Je dois **relire ce fichier** et appliquer la checklist ci-dessus avant toute action git.

