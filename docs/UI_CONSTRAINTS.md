# Contraintes UI Coach Beurt

## Priorité

Coach Beurt est utilisé en entraînement réel. La priorité est :

1. lisibilité;
2. rapidité d’action;
3. stabilité iPhone/PWA;
4. absence de débordement horizontal.

## Mobile

- WOD+ et Séance restent mobile-first.
- Les vues doivent rester lisibles autour de 402 px CSS de largeur.
- Les actions critiques doivent être faciles à toucher avec le pouce.
- Ne pas dépendre d’une hauteur fixe.
- Respecter les safe areas iOS.
- Garder le zoom natif accessible; ne pas bloquer l’accessibilité pour masquer un problème UI.

## Séance guidée

- Timer visible.
- Start/Pause/Reset faciles à toucher.
- Poids/Reps/RPE utilisables fatigué.
- Éviter les petits contrôles précis.
- Les contrôles Reps/RPE compacts `− valeur +` doivent rester sur une ligne autant que possible.

## Résultats

- Résultats reste séparé de PC.
- Retour WOD visible.
- Sauvegarde claire.

## PC

PC sert à inspecter, comprendre et exporter. Il ne doit pas devenir un Builder et ne doit pas modifier directement les programmes.

## Vue séance — règles verrouillées

Ces règles sont obligatoires à partir de V51.24.

### Timer WOD

- Format : minutes sans zéro inutile.
  - OK : `9:12`, `8:00`, `0:45`, `10:00`, `60:00`.
  - Interdit : `09:12`, `08:00`, `00:45`.
- Les secondes restent toujours à deux chiffres.
- La taille du timer ne doit pas être fixe.
- La taille doit viser environ 95 % de la largeur interne disponible.
- La taille doit rester stable par format : utiliser un gabarit de mesure (`8:88` ou `88:88`) plutôt que la forme exacte des chiffres affichés.
- Le timer ne doit jamais dépasser horizontalement.
- Les boutons du timer doivent rester accessibles.

### Accessibilité vue séance

- Les boutons `Précédent` et `Bloc suivant` doivent toujours rester accessibles en portrait iPhone.
- Les boutons internes du timer doivent toujours rester accessibles.
- Le contenu d’un bloc long doit scroller à l’intérieur de la vue au lieu de pousser les actions hors écran.
- La vue séance est prioritaire sur les autres vues mobiles : ne pas casser son layout pour corriger PC, Historique ou WOD+.

## Socle anti-régression — règles courtes

Ces règles ne doivent pas devenir une longue liste. Elles protègent seulement les acquis sensibles.

1. **Vue séance iPhone** : tout élément d’action doit rester accessible en portrait.
2. **Timer WOD** : minutes sans zéro inutile, secondes à deux chiffres, viser environ 95 % de la largeur utile, jamais coupé.
3. **Résultats** : poids, reps et RPE utilisent les contrôles compacts `− valeur +`.
4. **Charges haltères** : aucune vue ne doit recréer sa propre liste; utiliser les helpers d’équipement communs.
5. **Historique** : `CHANGELOG.md` reste le seul historique de version.

Les règles de format timer, de charges disponibles, de RPE et de résultats doivent vivre dans des helpers communs lorsque possible. Une vue ne doit pas recopier une logique déjà existante dans une autre vue.

## Contrat charge / avertissement séance

- Le bouton jaune `!` / `⚠` de la vue séance doit afficher l’historique des poids utilisés quand une charge est suggérée ou surveillée.
- La source ne doit pas dépendre uniquement de `athlete_state`; `state.history` doit servir de fallback.

## Bouton jaune `!` / `⚠` — historique de charge

Contrat court : la modale doit rester utile et courte. Elle doit afficher d’abord `Historique des poids utilisés`, puis seulement une raison courte.

Sources obligatoires : `athlete_state` et `state.history`.

Correspondance obligatoire : le mouvement peut arriver sous `name`, `title`, `label` ou `movement`; les noms alternatifs/partiels doivent matcher, par exemple `DB Shoulder Press` avec `DB Shoulder Press / Landmine Press`.
