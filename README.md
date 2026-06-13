# Coach Beurt

Coach Beurt est une PWA personnelle d’entraînement en JavaScript vanilla, sans framework.

## État courant

- Version : `V51.31`
- Source courte de vérité : `ETAT_ACTUEL.md`
- Historique des changements : `CHANGELOG.md`
- Checklist de livraison : `RELEASE_CHECKLIST.md`

## Règle documentaire

À partir de `V51.10`, les modifications de version sont inscrites uniquement dans `CHANGELOG.md`.

Ne plus créer de fichiers de release, audit ou bilan avec un numéro de version dans le nom.

## Données durables à protéger

Ne jamais écraser sans demande explicite :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`

`data/charges.js` contient la configuration d’équipement et des charges fallback. Il ne doit pas être modifié sauf demande explicite.

## Structure principale

- `index.html` : structure HTML et chargement direct des scripts.
- `app.js` : noyau sensible : charges, RPE, historique, sync, cycle, données.
- `styles.css` : interface.
- `manifest.json` : configuration PWA.
- `service-worker.js` : service worker sans cache applicatif durable.
- `programs/` : programmes d’entraînement.
- `scripts/` : vues et modules runtime utilisés par l’app, incluant TMS.
- `dev/` : scripts de validation/développement hors application.
- `docs/` : documentation stable non versionnée.
- `data/` : données/configuration. Les trois fichiers durables ne doivent pas être inclus dans les ZIP update.


Note V51.31 : noms Épaules 3D nettoyés avec alias de transition pour protéger l’historique des charges.
