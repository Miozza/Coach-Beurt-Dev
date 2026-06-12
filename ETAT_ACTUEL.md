# ETAT_ACTUEL.md — Coach Beurt

## Dernière modification — V51.15

- Vue séance WOD : titres de mouvements nettoyés, ex. `Wall Balls` au lieu de `Wall Balls 14 lb`.
- Pastilles de charge sous le timer WOD retirées en mode séance pour libérer l’espace du timer.
- Timer WOD agrandi uniquement dans la vue séance; autres timers non ciblés.
- Programmes et données durables non modifiés.


Ce document est la source courte de vérité du projet. Il doit être mis à jour à chaque release.

Les modifications de version sont maintenant consignées uniquement dans `CHANGELOG.md`.

---

## 1. Identité

- Application : Coach Beurt / Coach Bertin.
- Type : PWA d’entraînement personnelle, JavaScript vanilla, sans framework.
- Version actuelle du ZIP : `V51.15`.
- Date du document : 2026-06-12.
- Repo GitHub principal : `Miozza/Coach-Beurt`.
- Repo GitHub dev : `Miozza/Coach-Beurt-Dev`.
- Objectif macro déclaré : compétition CrossFit autour du `2027-01-15`.
- Cycle actif réel sur l’iPhone ou le repo officiel : [À CONFIRMER PAR BERTIN].

Détails version :

- `app.js` : `APP_VERSION = "V51.15"`.
- `index.html` : titre/topnav/footer/cache-bust `51.15`.
- `manifest.json` : `Coach Bertin V51.15`.
- `service-worker.js` : `coach-bertin-v51-15-no-cache`.

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

1. Tester V51.15 sur DEV après import.
2. Valider la vue séance sur iPhone : bloc 1 mouvement, bloc 3 mouvements, WOD timer, boutons bas accessibles.
3. Valider que le résumé de séance est scrollable et que `Passer à Sx` / `Fermer` restent accessibles.
4. Valider que la pastille GitHub est discrète et cliquable.
5. Vérifier WOD+, PC, Route, Export IA, sync GitHub sans refonte globale.
6. Garder un œil sur `app.js`, qui reste monolithique et sensible.
7. Future migration possible de `data/charges.js`, mais seulement dans une version dédiée.
8. Améliorer plus tard l’export IA prévu/suggéré/réel/RPE/alertes/historique.

### V51.15 — Correctif UI séance

- La vue séance garde les boutons de navigation accessibles sans réserver une zone morte excessive au bas de l’écran.
- Les boutons des timers WOD/AMRAP/EMOM/For Time sont compactés et restent accessibles; la carte WOD peut scroller si nécessaire.
- Correction limitée à l’interface séance : aucun programme, aucune séance, aucun moteur de charges et aucune donnée durable modifiés.


## V51.15 — Ajustement en cours

- Timer de la vue séance restauré à une taille proche de V51.11.
- Accessibilité V51.12 conservée pour le bas d’écran et les boutons.
- Témoin GitHub discret conservé.
- Aucun programme ni donnée durable modifié.
