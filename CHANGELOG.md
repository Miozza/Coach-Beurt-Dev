# CHANGELOG — Coach Beurt

Toutes les modifications de version doivent être inscrites ici.

Règle fixe depuis `V51.10` : ne plus créer de fichiers `RELEASE_NOTES_*`, `AUDIT_*`, `*_Vxx.xx.md/json/txt` ou autre document historique portant une version dans son nom. Les bilans de version vont dans ce fichier seulement.

---

## V51.12 — Ajustement bas de vue séance et boutons timer

- Réduit la réserve excessive en bas de la vue séance iPhone.
- Corrige l’accessibilité des boutons des timers dans les blocs WOD/AMRAP/EMOM/For Time.
- Rend la carte WOD scrollable seulement quand la hauteur réelle manque.
- Compacte légèrement l’affichage timer sans toucher au programme ni aux données.
- Aucun nouveau fichier de release/audit versionné : historique maintenu uniquement ici.

## V51.11 — Stabilisation vue séance iPhone + témoin GitHub discret

### Changements

- Stabilisation ciblée de la vue séance guidée sur iPhone.
- La vue séance utilise mieux la hauteur réelle disponible avec `--guided-vh` / `100dvh`.
- Les cartes d’exercices deviennent scrollables à l’intérieur du bloc quand un giant set contient plusieurs mouvements.
- Les boutons `Précédent` et `Bloc suivant` restent hors de la zone scrollable pour rester accessibles.
- Le résumé de séance devient scrollable avec une hauteur maximale compatible iPhone et safe-area.
- Le témoin GitHub de la topnav devient une petite pastille discrète au lieu d’un gros badge texte.
- Mise à jour de version : `APP_VERSION`, `index.html`, cache-bust, `manifest.json`, `service-worker.js`, `ETAT_ACTUEL.md`.

### Non modifié

- Aucun programme d’entraînement protégé n’a été réécrit.
- Aucune séance n’a été changée.
- Aucun changement au moteur de charges.
- Aucun changement à `data/charges.js`.
- Aucune donnée durable modifiée.

### Données durables exclues du ZIP update

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`

---

## V51.10 — Nettoyage documentaire et structure fixe

### Changements

- Création de `CHANGELOG.md` comme seul endroit officiel pour l’historique des modifications.
- Suppression des release notes individuelles et documents historiques versionnés à la racine.
- Suppression des vieux documents d’audit/diagnostic non nécessaires à l’exécution de l’app.
- Création d’une structure documentaire stable :
  - `README.md`
  - `CHANGELOG.md`
  - `ETAT_ACTUEL.md`
  - `RELEASE_CHECKLIST.md`
  - `docs/ARCHITECTURE.md`
  - `docs/CHARGE_ENGINE.md`
  - `docs/UI_CONSTRAINTS.md`
- Suppression de `programs/test.js`.
- Retrait du programme `Test` de `programs/index.js`.
- Retrait du script `programs/test.js` de `index.html`.
- Suppression du dossier `diagnostics/`, qui contenait des traces d’audit anciennes non nécessaires à l’app.
- Suppression du dossier `icons/`, doublon non référencé par `index.html` ni `manifest.json`.
- Mise à jour de version : `APP_VERSION`, `index.html`, cache-bust, `manifest.json`, `service-worker.js`, `ETAT_ACTUEL.md`.

### Non modifié

- Aucun programme d’entraînement protégé n’a été réécrit.
- Aucune séance n’a été changée.
- Aucun changement au moteur de charges.
- Aucun changement à `data/charges.js`.
- Aucune donnée durable modifiée.

### Données durables exclues

- `data/resultats.json`
- `data/athlete_state.json`
- `data/cycle_state.json`

---

## V51.09 — Héritage 225 sélectionnable

- Héritage 225 devient visible dans la sélection de cycle.
- Le programme conserve son statut narratif : `Disponible — projet futur`.
- La sélection accepte les phases futures au-delà de Phase 4.
- Aucun changement aux séances, au moteur de charges ou aux données durables.

---

## V51.08 — Reps/RPE compacts avec +/-

- Remplacement des pastilles Reps/RPE en séance guidée par deux contrôles compacts `− valeur +` sur une même ligne.
- Reps augmente/diminue par 1.
- RPE augmente/diminue par 0.5, ce qui donne accès à 7.5 et 8.5 sans débordement.
- Aucun changement aux programmes, au moteur de charges ou aux données durables.

---

## V51.07 — Reps/RPE iPhone lisibles

- Limitation des choix Reps à 5 pastilles maximum.
- Ajout des demi-paliers RPE utiles `7.5` et `8.5`.
- Conservation de `RPE 6`.
- Empilement de la saisie pour réduire les débordements horizontaux sur iPhone.
- Aucun changement aux programmes, au moteur de charges ou aux données durables.

---

## V51.06 — Déduplication helpers programmes

- `programs/epaules_3d.js` utilise des helpers dédiés `shouldersEx()` et `shouldersExFixed()`.
- `programs/workouts.js` garde les helpers génériques `ex()` et `exFixed()`.
- Correction du doublon silencieux entre Épaules 3D et workouts.
- Aucun changement volontaire aux séances, blocs, charges ou moteur de suggestion.

---

## V51.05 — `ETAT_ACTUEL.md` source de vérité

- Ajout de `ETAT_ACTUEL.md` à la racine du ZIP.
- Le document devient la référence courte du projet et doit être mis à jour à chaque release.
- Aucun changement de séance, de moteur de charges ou de données durables.

---

## V51.04 — Roadmap macro + statut sync GitHub

- Ajout d’un onglet PC `Route`.
- Calcul des phases restantes depuis le cycle actif jusqu’à l’objectif macro de janvier 2027.
- Utilisation des durées de programmes plutôt que les vieux `phaseEnd` statiques.
- Ajout d’un indicateur discret de sync GitHub dans la topnav.
- Aucun changement de séance, de moteur de charges ou de données durables.

---

## V51.03 — Moteur de charges corrigé

- Correction de la sous-suggestion Barbell Row quand l’historique réel contrôlé est supérieur.
- Séparation des contextes Overhead Rope Extension lourd/rappel.
- Limitation des gros sauts Bulgarian Split Squat et Hip Thrust.
- Nettoyage du mapping Épaules 3D.
- Alertes moins agressives quand une baisse peut être volontaire.
- Maintien de la règle de prudence : RPE réel `>= 9` bloque toute hausse automatique.
- Aucun changement aux données durables.

---

## V51.02 — Programmes restaurés

- Restauration des cycles travaillés le 2026-06-09.
- Programmes restaurés/protégés :
  - `programs/epaules_3d.js`
  - `programs/hypertrophy_base.js`
  - `programs/force_performance.js`
  - `programs/competition_peak.js`
  - `programs/heritage_225.js`
- Conservation du moteur de charges sécurisé.
- Aucun changement aux données durables.
