# Checklist de livraison Coach Beurt

## Avant génération du ZIP

- Confirmer l’objectif de la version.
- Ne pas mélanger correction de programme, refactor moteur et migration de données dans la même version.
- Ne pas modifier les données durables.
- Ne pas modifier `data/charges.js` sauf demande explicite.
- Ne pas modifier les programmes/séances sauf demande explicite.
- Protéger les programmes restaurés du 2026-06-09 :
  - `programs/epaules_3d.js`
  - `programs/hypertrophy_base.js`
  - `programs/force_performance.js`
  - `programs/competition_peak.js`
  - `programs/heritage_225.js`

## Versionnement obligatoire

À chaque version, mettre à jour :

- `APP_VERSION` dans `app.js`
- titre/version/footer/cache-bust `?v=` dans `index.html`
- `manifest.json`
- `CACHE_NAME` dans `service-worker.js`
- `CHANGELOG.md`
- `ETAT_ACTUEL.md`

Le nom du dossier et des ZIP doit correspondre à la version.

## Validation technique

Exécuter :

```bash
node --check app.js
find programs scripts tools data -name '*.js' -print0 | xargs -0 -n1 node --check
node --check service-worker.js
```

## Validation terrain minimale

- Ouvrir WOD+.
- Ouvrir la sélection de cycle.
- Vérifier que Héritage 225 reste visible sans activation automatique.
- Démarrer une séance guidée.
- Vérifier les contrôles Reps/RPE compacts.
- Vérifier Résultats.
- Vérifier PC/Route/Export IA.
- Vérifier le statut sync GitHub.

## ZIP update-files-no-durable-data

Doit exclure :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`


## Validation vue séance verrouillée

Avant de livrer une version qui touche à `styles.css`, `scripts/view_session.js`, `app.js` ou `index.html`, vérifier :

- Le timer WOD affiche `9:12`, `8:00`, `0:45`, `10:00`, jamais `09:12`, `08:00`, `00:45`.
- Le timer WOD utilise presque toute la largeur disponible sans dépasser.
- La taille du timer reste stable pendant le décompte et ne change pas selon la forme des chiffres.
- Les boutons Play / Pause / Reset du timer sont accessibles.
- Les boutons `Précédent` et `Bloc suivant` sont accessibles en portrait iPhone.
- Un WOD court, un AMRAP/CAP et un bloc long avec plusieurs mouvements restent utilisables sans bouton caché.
