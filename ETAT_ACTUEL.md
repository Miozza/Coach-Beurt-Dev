# ETAT_ACTUEL.md — Coach Beurt

## Dernière modification — V51.19
### V51.19 — Correction ciblée

- Timer WOD en mode séance : auto-fit strict pour empêcher le débordement horizontal sur iPhone.
- Le JS applique `font-size` et `letter-spacing` avec priorité `!important` pour battre les anciennes règles CSS.
- Aucun programme ni donnée durable modifié.


- Résultats For Time : la liste déroulante couvre maintenant `00:00` à `60:00` avec toutes les secondes possibles.
- L’objectif/cap détecté est présélectionné automatiquement.
- Aucun programme, aucune séance, aucun fichier durable et aucun réglage `data/charges.js` modifié.

Ce document est la source courte de vérité du projet. Il doit être mis à jour à chaque release.

Les modifications de version sont maintenant consignées uniquement dans `CHANGELOG.md`.

---

## 1. Identité

- Application : Coach Beurt / Coach Bertin.
- Type : PWA d’entraînement personnelle, JavaScript vanilla, sans framework.
- Version actuelle : V51.19
- Date du document : 2026-06-12.
- Repo GitHub principal : `Miozza/Coach-Beurt`.
- Repo GitHub dev : `Miozza/Coach-Beurt-Dev`.
- Objectif macro déclaré : compétition CrossFit autour du `2027-01-15`.
- Cycle actif réel sur l’iPhone ou le repo officiel : [À CONFIRMER PAR BERTIN].

Détails version :

- `app.js` : `APP_VERSION = "V51.19"`.
- `index.html` : titre/topnav/footer/cache-bust `51.19`.
- `manifest.json` : `Coach Bertin V51.19`.
- `service-worker.js` : `coach-bertin-v51-19-no-cache`.

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
- `tools/` : outils complémentaires hors UI.
- `docs/` : documentation stable non versionnée.

`diagnostics/` et les vieux documents versionnés ne font plus partie de la base propre.

---

## 6. Décisions en vigueur

- Service worker volontairement sans cache applicatif durable.
- `theme-color` uniforme : `#04060f`.
- WOD+ est la vue mobile-first principale.
- Séance guidée est la vue terrain iPhone.
- Résultats est séparé de PC.
- PC reste une vue d’inspection/logistique, pas un Builder.
- La section PC `Route` calcule la feuille de route vers janvier 2027.
- L’indicateur sync GitHub est une pastille discrète, cliquable, sans gros badge texte.
- Ne pas mélanger migration de données, refactor moteur et modification de programme dans la même release.
- `app.js` reste le centre critique : charges, RPE, historique, sync, cycle, données.

---

## 7. Chantiers ouverts

Priorités à garder séparées :

1. Tester V51.19 sur DEV après import.
2. Valider Résultats For Time : liste `00:00` à `60:00`, objectif présélectionné, sauvegarde correcte.
3. Revalider la vue séance sur iPhone : WOD timer, boutons timer, boutons bas accessibles.
4. Vérifier WOD+, PC, Route, Export IA, sync GitHub sans refonte globale.
5. Garder un œil sur `app.js`, qui reste monolithique et sensible.
6. Future migration possible de `data/charges.js`, mais seulement dans une version dédiée.

### V51.19 — Résultats For Time

- Priorité : saisie des résultats For Time.
- Liste déroulante complète de `00:00` à `60:00`, seconde par seconde.
- Objectif/cap présélectionné automatiquement quand détecté.
- Programmes, séances, données durables et `data/charges.js` protégés.
