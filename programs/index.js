// Coach Beurt — registre central des programmes
// Rôle : définir l’ordre et la visibilité des programmes dans l’app.
// Important : ce fichier ne charge PAS les scripts. Les scripts restent listés directement dans index.html pour garder Safari/iPhone stable.
//
// Modifier un programme existant : modifier seulement son fichier dans /programs/.
// Ajouter un programme : créer le fichier dans /programs/, ajouter son entrée ici, puis ajouter son script dans index.html.
// Supprimer un programme : retirer son entrée ici, retirer son script dans index.html, puis supprimer son fichier.

(function(){
  window.COACH_BERTIN_PROGRAM_INDEX = [
    { id: "shoulders3d",        file: "programs/epaules_3d.js",          name: "Phase 1 — Épaules 3D + Triceps",          phase: 1 },
    { id: "hypertrophy_base",   file: "programs/hypertrophy_base.js",    name: "Phase 2 — Hypertrophie / Force Base",      phase: 2 },
    { id: "force_performance",  file: "programs/force_performance.js",   name: "Phase 3 — Force + Résistance musculaire",  phase: 3 },
    { id: "competition_peak",   file: "programs/competition_peak.js",    name: "Phase 4 — Compétition CrossFit Peak",      phase: 4 },
    { id: "hypertrophie_fesse", file: "programs/hypertrophie_fesse.js",  name: "Hypertrophie Fessiers — 4 semaines",       phase: 0 },
    { id: "posture",            file: "programs/posture_cyphose.js",     name: "Posture / Cyphose",                        phase: 0 },
    { id: "strength",           file: "programs/force.js",               name: "Force classique",                          phase: 0 },
    { id: "heritage225",        file: "programs/heritage_225.js",        name: "Héritage 225",                              phase: 0 }
  ];
})();
