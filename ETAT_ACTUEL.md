# ETAT_ACTUEL.md — Coach Beurt

## Dernière modification — V51.27
### V51.27 — Socle anti-régression

- Ajout de `dev/regression_checks.js` comme fichier fixe de validation anti-régression.
- Le script vérifie les garanties sensibles : version cohérente, pas d’artefacts versionnés, données durables protégées, programmes protégés présents, `heritage_225` visible, timer WOD verrouillé, contrôles Résultats compacts et charges haltères du gym.
- `scripts/app_helpers.js` expose maintenant le helper commun `formatTimerDisplay(sec)` pour le timer WOD.
- `scripts/view_session.js` utilise ce helper au lieu de maintenir sa propre logique isolée.
- `RELEASE_CHECKLIST.md` et `docs/UI_CONSTRAINTS.md` documentent les contrats courts à protéger.
- Aucun fichier de release/audit versionné ajouté.
- Aucun programme, aucune séance, aucune charge et aucune donnée durable modifiés.

## 1. Identité

- Application : Coach Beurt / Coach Bertin.
- Type : PWA d’entraînement personnelle, JavaScript vanilla, sans framework.
- Version actuelle : V51.27
- Date du document : 2026-06-12.
- Repo GitHub principal : `Miozza/Coach-Beurt`.
- Repo GitHub dev : `Miozza/Coach-Beurt-Dev`.
- Objectif macro déclaré : compétition CrossFit autour du `2027-01-15`.
- Cycle actif réel sur l’iPhone ou le repo officiel : [À CONFIRMER PAR BERTIN].

Détails version :

- `app.js` : `APP_VERSION = "V51.27"`.
- `index.html` : titre/topnav/footer/cache-bust `51.27`.
- `manifest.json` : `Coach Bertin V51.27`.
- `service-worker.js` : `coach-bertin-v51-27-no-cache`.

---

## 2. Règle documentaire fixe

À partir de `V51.10` :

- `CHANGELOG.md` est le seul endroit où entreposer l’historique des modifications.
- Ne plus créer de fichiers `RELEASE_NOTES_*`.
- Ne plus créer de fichiers d’audit, bilan, checklist ou état portant une version dans le nom.
- Les documents utiles doivent avoir des noms stables, sans version.
- Les vieux fichiers redondants ou historiques doivent être supprimés du ZIP final, pas accumulés.

Documents fixes conservés :

- `README.md`
- `CHANGELOG.md`
- `ETAT_ACTUEL.md`
- `RELEASE_CHECKLIST.md`
- `docs/ARCHITECTURE.md`
- `docs/CHARGE_ENGINE.md`
- `docs/UI_CONSTRAINTS.md`

---

## 3. Règles inviolables

Ne jamais modifier ou écraser sans demande explicite :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`

Ne pas modifier `data/charges.js` sauf demande explicite.

Ne pas réécrire les programmes ou les séances sauf demande explicite.

Les ZIP `update-files-no-durable-data` doivent toujours exclure :

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`

---

## 4. Programmes protégés

Les programmes restaurés du 2026-06-09 doivent rester présents :

- `programs/epaules_3d.js` — Phase 1, Épaules 3D + Triceps.
- `programs/hypertrophy_base.js` — Phase 2, Hypertrophie / Force Base.
- `programs/force_performance.js` — Phase 3, Force + Résistance musculaire.
- `programs/competition_peak.js` — Phase 4, Compétition CrossFit Peak.
- `programs/heritage_225.js` — Héritage 225.

Héritage 225 doit rester visible dans la sélection de cycle, sans activation automatique.

`programs/test.js` a été retiré en `V51.10`.

---

## 5. Architecture actuelle

Racine :

- `index.html` : structure HTML, vues, scripts chargés explicitement.
- `app.js` : noyau sensible de l’app.
- `styles.css` : UI.
- `manifest.json` : PWA, icônes, theme-color.
- `service-worker.js` : service worker sans cache applicatif durable.

Dossiers :

- `programs/` : programmes d’entraînement.
- `scripts/` : vues et modules UI.
- `data/` : données/configuration.
- `dev/` : scripts de validation/développement hors application.
- `scripts/` : code runtime utilisé par l’app, incluant TMS.
- `docs/` : documentation stable non versionnée.

---

## 6. Décisions en vigueur

- Service worker volontairement sans cache applicatif durable.
- `theme-color` uniforme : `#04060f`.
- WOD+ est la vue mobile-first principale.
- Séance guidée est la vue terrain iPhone prioritaire.
- Résultats est séparé de PC.
- PC reste une vue d’inspection/logistique, pas un Builder.
- La section PC `Route` calcule la feuille de route vers janvier 2027.
- L’indicateur sync GitHub est une pastille discrète, cliquable, sans gros badge texte.
- Ne pas mélanger migration de données, refactor moteur et modification de programme dans la même release.
- `app.js` reste le centre critique : charges, RPE, historique, sync, cycle, données.

---

## 7. Règles UI verrouillées — vue séance

### Timer WOD

- Format obligatoire : `9:12`, `8:00`, `0:45`, `10:00`, `60:00`.
- Interdit : `09:12`, `08:00`, `00:45`.
- Secondes toujours à deux chiffres.
- Taille non fixe.
- Viser environ 95 % de la largeur interne utile.
- Mesure stable par gabarit (`8:88` ou `88:88`) pour éviter que la taille change selon la forme des chiffres.
- Aucun dépassement horizontal.
- Boutons Play / Pause / Reset accessibles.

### Vue séance iPhone

- Boutons `Précédent` et `Bloc suivant` toujours accessibles en portrait iPhone.
- Les blocs longs doivent scroller sans pousser les actions hors écran.
- La vue séance est prioritaire sur les autres vues mobiles.

---

## 8. Chantiers ouverts

Priorités à garder séparées :

1. Tester V51.27 sur DEV après import.
2. Revalider la vue séance sur iPhone : timer WOD sans zéro inutile, taille stable, boutons timer et boutons bas accessibles.
3. Valider Résultats For Time : liste `00:00` à `60:00`, objectif présélectionné, sauvegarde correcte.
4. Vérifier WOD+, PC, Route, Export IA, sync GitHub sans refonte globale.
5. Garder un œil sur `app.js`, qui reste monolithique et sensible.
6. Future migration possible de `data/charges.js`, mais seulement dans une version dédiée.


## Structure clarifiée V51.27

- `scripts/` contient le code runtime chargé par l’app, incluant `scripts/tms_session.js`.
- `dev/` contient les scripts de validation/développement, incluant `dev/regression_checks.js`.
- `tools/` est supprimé et ne doit pas revenir.
