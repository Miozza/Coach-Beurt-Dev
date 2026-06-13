# CHANGELOG — Coach Beurt

Toutes les modifications de version doivent être inscrites ici.

Règle fixe depuis `V51.10` : ne plus créer de fichiers `RELEASE_NOTES_*`, `AUDIT_*`, `*_Vxx.xx.md/json/txt` ou autre document historique portant une version dans son nom. Les bilans de version vont dans ce fichier seulement.

---

## V51.27 — Historique de charge dans le ! séance

- Correction du bouton jaune `!` / `⚠` en vue séance : la modale affiche maintenant l’historique des poids utilisés même si l’information vient de `state.history` plutôt que seulement de `athlete_state`.
- Recherche de mouvement renforcée : noms canoniques, noms nettoyés et résultats locaux sont comparés pour éviter les trous d’historique.
- Ajout d’un garde-fou anti-régression pour conserver la section `Historique des poids utilisés`.
- Aucun programme, aucune charge officielle et aucune donnée durable modifiés.

## V51.27 — Socle anti-régression

- Ajoute `dev/regression_checks.js`, fichier fixe de garde-fous techniques.
- Vérifie les règles critiques : données durables exclues des ZIP update, absence d’artefacts versionnés, présence des programmes protégés, cohérence des versions et présence de `heritage_225`.
- Verrouille par test le format du timer WOD : `9:12`, `0:45`, `10:00`, `60:00`, sans zéro inutile devant les minutes.
- Vérifie les contrôles Résultats : poids/reps/RPE en `− valeur +`, RPE par pas de 0.5, For Time `00:00` à `60:00`, charges haltères selon la liste du gym.
- Centralise le format timer WOD dans `scripts/app_helpers.js` et fait utiliser ce helper par `scripts/view_session.js`.
- Renforce `RELEASE_CHECKLIST.md` et `docs/UI_CONSTRAINTS.md` sans créer de fichier de release/audit versionné.
- Aucun programme, aucune séance, aucune charge et aucune donnée durable modifiés.

## V51.24 — Sécurisation timer WOD et vue séance

- Verrouille officiellement le format du timer WOD en vue séance : `9:12`, `8:00`, `0:45`, `10:00`, sans zéro inutile devant les minutes.
- Documente la règle de taille : viser 95 % de la largeur interne utile, avec mesure stable par gabarit (`8:88` ou `88:88`).
- Ajoute la validation obligatoire dans `RELEASE_CHECKLIST.md` pour éviter les régressions sur les boutons du timer et les boutons `Précédent` / `Bloc suivant`.
- Ajoute les règles dans `docs/UI_CONSTRAINTS.md`.
- Aucun changement de programme, de séance, de charges ou de données durables.

## V51.22 — Timer WOD sans zéro inutile

- Le timer WOD en mode séance n’affiche plus de zéro devant les minutes sous 10.
- Exemple : `9:12` au lieu de `09:12`; `10:00` reste `10:00`.
- L’auto-fit mesure un gabarit stable (`8:88` ou `88:88`) pour éviter que la taille change selon la forme des chiffres.
- Correction limitée au timer WOD en vue séance.

## V51.21 — Timer WOD 95 % largeur + hauteur utile

- Le timer WOD vise environ 95 % de la largeur interne disponible.
- Le calcul tient compte de la hauteur utile de la boîte timer.
- Correction limitée au timer WOD en mode séance.

## V51.20 — Timer WOD mesuré pleine largeur

- Correction du timer WOD en vue séance : auto-fit basé sur mesure du texte, pas sur `scrollWidth`.
- Le timer doit prendre presque toute la largeur disponible sans être coupé à droite.
- Correction ciblée : aucun programme, aucune donnée durable et aucun moteur de charge modifié.

## V51.19 — Timer WOD auto-fit strict

- Correction du timer WOD en mode séance qui pouvait encore dépasser horizontalement sur iPhone.
- Le calcul JS applique la taille avec priorité suffisante pour battre les anciennes règles CSS.
- Correction ciblée sur le timer WOD de la vue séance seulement.

## V51.18 — Résultats For Time : choix complet 00:00–60:00

- Résultats For Time : liste complète de `00:00` à `60:00`.
- Toutes les secondes sont disponibles dans la liste déroulante.
- L’objectif/cap détecté reste présélectionné automatiquement.
- Aucun changement aux programmes, aux séances, au moteur de charges ou aux données durables.

## V51.17 — Timer WOD auto-ajusté pleine largeur

- Ajoute un ajustement automatique de la taille du timer WOD en mode séance.
- Le timer essaie d'occuper presque toute la largeur disponible sans déborder.
- Correction ciblée à la vue séance WOD; les autres timers ne sont pas modifiés.

## V51.16 — Timer WOD sans débordement + résultats plus lisibles

- Correction du timer WOD en mode séance : retour à un gabarit large, mais sans débordement horizontal.
- Maintien de l’accessibilité des boutons du timer.
- Agrandissement du texte des noms de mouvements dans la vue Résultats.

## V51.15 — Vue séance WOD : noms propres + timer prioritaire

- Nettoie les noms de mouvements WOD en mode séance/résultats : une charge comme `14 lb` n’est plus intégrée au titre du mouvement.
- Retire les pastilles de charge sous le timer WOD en mode séance.
- Redonne l’espace libéré au timer WOD sans modifier les autres timers de l’app.

## V51.14 — Résultats avec contrôles compacts

- La vue Résultats adopte la même logique de saisie que la vue Séance : `− valeur +` pour poids, reps et RPE.
- Les anciennes pastilles de reps/RPE sont retirées de la saisie standard des résultats.
- Les valeurs restent synchronisées avec le cache guidé et la sauvegarde existante.

## V51.13 — Timer séance restauré

- Restaure la taille lisible du timer en mode séance.
- Conserve les protections V51.12 : carte WOD scrollable, boutons de navigation accessibles, bas d’écran moins gaspillé.

## V51.12 — Ajustement bas de vue séance et boutons timer

- Réduit la réserve excessive en bas de la vue séance iPhone.
- Corrige l’accessibilité des boutons des timers dans les blocs WOD/AMRAP/EMOM/For Time.
- Rend la carte WOD scrollable seulement quand la hauteur réelle manque.

## V51.11 — Stabilisation vue séance iPhone + témoin GitHub discret

- Stabilise la vue séance guidée sur iPhone.
- Rend le témoin GitHub plus discret dans la topnav.

## V51.10 — Nettoyage documentaire et structure fixe

- Nettoie les release notes/audits versionnés.
- `CHANGELOG.md` devient le seul endroit officiel pour l’historique.
- Retire `programs/test.js`.
