// Coach Bertin — charges de base / équipement
// Configuration stable unique. Les upgrades/PR viennent de l’historique, pas d’un niveau implicite.

window.DEFAULT_CHARGES = {
  "Strict Press": "115 lb",
  "Lateral Raise": "20-25 lb",
  "Lateral Raise haltères": "modéré",
  "Lateral Raise machine": "modéré",
  "Rear Delt Fly": "20-25 lb",
  "Rear Delt Fly haltères": "modéré",
  "Rear Delt Fly machine": "modéré",
  "Triceps Rope Pushdown": "60-70 lb",
  "Face Pull": "60-70 lb",
  "Chest Supported Row": "115-125 lb",
  "Barbell Row": "155 lb",
  "Trap-3 Raise": "léger",
  "Ring Row Strict": "poids du corps",
  "Front Squat": "165 lb",
  "Back Squat": "185 lb",
  "Bulgarian Split Squat": "50 lb / main",
  "Standing Calf Raise": "25 lb",
  "Power Clean": "155 lb",
  "Overhead Rope Extension": "50-60 lb",
  "Overhead Rope Extension — rappel vendredi": "60-70 lb",
  "Farmer Carry": "lourd propre",
  "Reverse Sled Drag": "léger à modéré",
  "Wall Ball": "14 lb",
  "Power Clean WOD": "léger : 115-135 lb",
  "Light DB Push Press": "35 lb / main",
  "Hang Power Clean": "115-135 lb",
  "KB Swings": "24 kg",
  "DB Snatch": "50 lb"
};

// Contraintes réelles d’équipement.
// Utilisé par les suggestions et les ajustements de charge. Ne pas écrire ici l’historique réel.
window.EQUIPMENT_LOAD_RULES = {
  cable: {
    label: "Machine à câble",
    unit: "lb",
    step: 10,
    min: 0,
    max: 200,
    match: ["cable", "câble", "rope", "pushdown", "face pull", "pulldown", "lat pulldown", "overhead rope"]
  },
  dumbbell: {
    label: "Dumbbells",
    unit: "lb",
    available: [2.5, 5, 10, 12, 15, 17.5, 20, 22.5, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 85],
    match: ["db", "dumbbell", "haltère", "halter", "/ main", "incline db", "rear delt fly", "trap-3", "bulgarian split squat", "farmer carry", "db snatch", "light db"]
  },
  band: {
    label: "Élastique",
    unit: "taille",
    available: ["petit", "moyen", "large", "très large"],
    match: ["élastique", "elastique", "band", "pull apart", "band pull apart", "band external rotation", "band internal rotation"]
  },
  barbell: {
    label: "Barbell",
    unit: "lb",
    step: 5,
    min: 0,
    max: 600,
    match: ["strict press", "bench", "squat", "deadlift", "barbell", "clean", "row principal", "power clean", "front squat", "back squat"]
  }
};

window.CHARGE_ORDER = Object.keys(window.DEFAULT_CHARGES);
