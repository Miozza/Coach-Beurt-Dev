# Architecture Coach Beurt

## Type d’application

PWA personnelle d’entraînement en JavaScript vanilla, sans framework.

## Vues principales

- **WOD+** : vue mobile-first pour choisir et lire la séance.
- **Séance** : exécution terrain iPhone, gros texte, saisie rapide.
- **Résultats** : saisie finale des poids/reps/RPE, séparée de PC.
- **PC** : inspection, semaine, route, analyse, export IA. Ce n’est pas un Builder.
- **Historique** : résultats réels sauvegardés dans les données durables.

## Dossiers

- `programs/` : programmes prévus.
- `scripts/` : vues et modules runtime extraits du noyau, incluant TMS.
- `dev/` : scripts de validation/développement hors application.
- `docs/` : documentation stable, non versionnée.
- `data/` : données/configuration.

## Données durables

Ne jamais écraser :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`

`data/charges.js` reste une configuration d’équipement et de fallback. Il ne remplace pas l’historique réel.

## Chargement JS

`index.html` charge les scripts directement, avec cache-bust de version. Ce choix est volontaire pour la stabilité GitHub Pages + Safari/iPhone.

`programs/index.js` est le registre central des programmes, mais ne charge pas les scripts dynamiquement.
