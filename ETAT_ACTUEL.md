# ETAT_ACTUEL.md — Coach Beurt

Ce document est la source courte de vérité du projet. Il doit être mis à jour à chaque release.

Les modifications de version sont maintenant consignées uniquement dans `CHANGELOG.md`.

---

## 1. Identité

- Application : Coach Beurt / Coach Bertin.
- Type : PWA d’entraînement personnelle, JavaScript vanilla, sans framework.
- Version actuelle du ZIP : `V51.10`.
- Date du document : 2026-06-11.
- Repo GitHub principal : `Miozza/Coach-Beurt`.
- Repo GitHub dev : `Miozza/Coach-Beurt-Dev`.
- Objectif macro déclaré : compétition CrossFit autour du `2027-01-15`.
- Cycle actif réel sur l’iPhone ou le repo officiel : [À CONFIRMER PAR BERTIN].

Détails version :

- `app.js` : `APP_VERSION = "V51.10"`.
- `index.html` : titre/topnav/footer/cache-bust `51.10`.
- `manifest.json` : `Coach Bertin V51.10`.
- `service-worker.js` : `coach-bertin-v51-10-no-cache`.

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
- L’indicateur sync GitHub doit rester discret mais visible.
- Ne pas mélanger migration de données, refactor moteur et modification de programme dans la même release.
- `app.js` reste le centre critique : charges, RPE, historique, sync, cycle, données.

---

## 7. Chantiers ouverts

Priorités à garder séparées :

1. Tester V51.10 sur DEV après import.
2. Valider que la sélection de cycle ne montre plus `Test`.
3. Valider que Héritage 225 reste visible.
4. Vérifier WOD+, Séance, Résultats, PC, Route, Export IA, sync GitHub.
5. Garder un œil sur `app.js`, qui reste monolithique et sensible.
6. Future migration possible de `data/charges.js`, mais seulement dans une version dédiée.
7. Améliorer plus tard l’export IA prévu/suggéré/réel/RPE/alertes/historique.
