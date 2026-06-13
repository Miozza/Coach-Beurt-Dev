// Coach Bertin V51.29
var APP_VERSION = "V51.29";
var GITHUB_OWNER = "Miozza";
var GITHUB_REPO  = "Coach-Beurt";
var GITHUB_FILE  = "data/resultats.json";
var ATHLETE_STATE_FILE = "data/athlete_state.json"; // force actuelle estimée par mouvement. Les upgrades viennent des PR/historique.
var CYCLE_STATE_FILE   = "data/cycle_state.json";

// Architecture stable
// programs/*.js = plan prévu
// data/resultats.json = journal brut
// data/athlete_state.json = force actuelle estimée, sans XP/level
// data/cycle_state.json = position dans le cycle
// data/charges.js = charges de base / équipement / préférences

// Objectifs compétition janvier 2027
var COMPETITION_DATE = new Date("2027-01-15");
var PHASE_TARGETS = {
  1: { bench:null, backSquat:null, note:"Épaules saines, posture améliorée, récupération post-compétition." },
  2: { bench:285,  backSquat:260,  note:"Bench 285 lb, Back squat 260 lb x5, RDL et hip thrust solides." },
  3: { bench:300,  backSquat:285,  note:"Bench 300 lb, Back squat 285 lb, tolérer 75 reps squats compétition." },
  4: { bench:null, backSquat:null, note:"Performance Open CrossFit janvier 2027. Benchmarks, synchro, peaking." }
};

// ─── WeekInfo dynamique selon le programme actif ─────────────────────────────
// Construit à partir des données du programme (4 ou 6 semaines)

function buildWeekInfo(){
  var cfg = focus();
  var labels = cfg.weekLabels || ["S1","S2","S3","S4"];
  var goals  = cfg.weekGoals  || ["Base.","Volume.","Intensité.","Deload."];
  var info = {};
  labels.forEach(function(lbl,i){
    info[i+1] = { label: lbl, goal: goals[i] || "" };
  });
  return info;
}
function totalWeeks(){
  var cfg=focus();
  if(cfg&&cfg.weekLabels&&cfg.weekLabels.length)return cfg.weekLabels.length;
  if(cfg&&cfg.sets&&cfg.sets.length)return cfg.sets.length;
  return 4;
}

// ─── Programmes actifs : source de vérité = programs/index.js ────────────────

var focusConfigs = {};

function programIndexIds(){
  return (window.COACH_BERTIN_PROGRAM_INDEX || [])
    .map(function(item){ return item && item.id; })
    .filter(Boolean);
}

function registerProgramsFromIndex(){
  var programs = window.COACH_BERTIN_PROGRAMS || {};
  var ids = programIndexIds();

  focusConfigs = {};

  ids.forEach(function(id){
    if(programs[id]){
      focusConfigs[id] = Object.assign({}, programs[id]);
    } else {
      console.warn("Programme déclaré dans programs/index.js mais non chargé :", id);
    }
  });

  Object.keys(programs).forEach(function(id){
    if(ids.indexOf(id) === -1){
      console.warn("Programme chargé mais absent de programs/index.js, donc ignoré :", id);
    }
  });

  window.focusConfigs = focusConfigs;
}

function defaultProgramId(){
  var ids = programIndexIds();
  for(var i=0;i<ids.length;i++){
    if(focusConfigs[ids[i]])return ids[i];
  }
  return Object.keys(focusConfigs)[0] || "";
}

registerProgramsFromIndex();

// Données de profil, mouvements et banques WOD chargées depuis programs/config.js

var KEY       = "coachBertinState";       // clé stable : ne change plus avec les versions
var LEGACY_KEYS = ["coachBertinV46", "coachBertinV43", "coachBertinV41"];
var CHARGE_KEY= "coachBertinCustomCharges";
var LEGACY_CHARGE_KEYS = ["coachBertinCustomChargesV46"];
var TOKEN_KEY = "coachBertinGithubToken";
var ALL_DAYS = ["lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche"];
var DEFAULT_PROGRAM_DAYS = ["lundi","mardi","jeudi","vendredi"];
var DAYS_ORDER = DEFAULT_PROGRAM_DAYS; // compatibilité ancienne logique; utiliser currentDayOrder() pour l’affichage.

function activeProgramExists(){
  return !!(state && state.cycle && state.cycle.goal && focusConfigs[state.cycle.goal]);
}
function activeProgramId(){
  return (state && state.cycle && state.cycle.goal) ? state.cycle.goal : defaultProgramId();
}
function currentDayOrder(){
  var cfg = focus ? focus() : {};
  var days = (cfg && Array.isArray(cfg.days) && cfg.days.length) ? cfg.days : DEFAULT_PROGRAM_DAYS;
  return days.filter(function(d){ return ALL_DAYS.indexOf(d) >= 0; });
}
function currentDayMeta(day){
  var cfg = focus ? focus() : {};
  var d = Object.assign({}, baseDays[day] || {label:day, base:"", focus:""});
  if(cfg && cfg.dayMeta && cfg.dayMeta[day]) d = Object.assign(d, cfg.dayMeta[day]);
  return d;
}
function ensureCurrentDay(){
  var days = currentDayOrder();
  if(days.indexOf(state.day) < 0){
    state.lastDayCorrection = {from:state.day,to:(days[0]||"lundi"),cycle:activeProgramId(),date:nowIso ? nowIso() : String(new Date())};
    state.day = days[0] || "lundi";
    state.cycleState=buildCycleStatePayload();
    save();
  }
  return days;
}
function isDayCompleted(day){ return (state.completedDays||[]).indexOf(day)>=0; }
function isDayMissed(day){ return (state.missedDays||[]).some(function(x){return x&&x.day===day&&Number(x.week)===Number(state.week)&&x.cycle===activeProgramId();}); }
function treatedDays(){
  return currentDayOrder().filter(function(d){ return isDayCompleted(d) || isDayMissed(d); });
}
function missingDaysForWeek(){
  return currentDayOrder().filter(function(d){ return !isDayCompleted(d) && !isDayMissed(d); });
}
function dayLabel(day){ var m=currentDayMeta(day); return (m&&m.label)||day; }
function actualDayName(){
  var js=["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  try{return js[new Date().getDay()];}catch(e){return "";}
}

// ─── Références pré-chargées ─────────────────────────────────────────────────

var PRELOADED_REFS = {
  "bench__strength":        {movement:"bench",      range:"strength",   load:265,reps:5, date:"préchargé",lastActual:265,status:"preloaded",quality:"clean",rpe:8},
  "bench__hypertrophy":     {movement:"bench",      range:"hypertrophy",load:215,reps:8, date:"préchargé",lastActual:215,status:"preloaded",quality:"clean",rpe:8},
  "bench__endurance":       {movement:"bench",      range:"endurance",  load:185,reps:15,date:"préchargé",lastActual:185,status:"preloaded",quality:"clean",rpe:8},
  "inclineDb__strength":    {movement:"inclineDb",  range:"strength",   load:85, reps:5, date:"préchargé",lastActual:85, status:"preloaded",quality:"clean",rpe:8},
  "inclineDb__hypertrophy": {movement:"inclineDb",  range:"hypertrophy",load:60, reps:8, date:"préchargé",lastActual:60, status:"preloaded",quality:"clean",rpe:8},
  "strictPress__strength":  {movement:"strictPress",range:"strength",   load:155,reps:5, date:"préchargé",lastActual:155,status:"preloaded",quality:"clean",rpe:8},
  "strictPress__hypertrophy":{movement:"strictPress",range:"hypertrophy",load:135,reps:8,date:"préchargé",lastActual:135,status:"preloaded",quality:"clean",rpe:8},
  "chestRow__strength":     {movement:"chestRow",   range:"strength",   load:155,reps:5, date:"préchargé",lastActual:155,status:"preloaded",quality:"clean",rpe:8},
  "chestRow__hypertrophy":  {movement:"chestRow",   range:"hypertrophy",load:115,reps:8, date:"préchargé",lastActual:115,status:"preloaded",quality:"clean",rpe:8},
  "latPulldown__hypertrophy":{movement:"latPulldown",range:"hypertrophy",load:20,reps:8, date:"préchargé",lastActual:20, status:"preloaded",quality:"clean",rpe:8},
  "frontSquat__strength":   {movement:"frontSquat", range:"strength",   load:224,reps:5, date:"préchargé",lastActual:224,status:"preloaded",quality:"acceptable",rpe:8},
  "frontSquat__hypertrophy":{movement:"frontSquat", range:"hypertrophy",load:185,reps:8, date:"préchargé",lastActual:185,status:"preloaded",quality:"acceptable",rpe:8},
  "hipThrust__strength":    {movement:"hipThrust",  range:"strength",   load:315,reps:5, date:"préchargé",lastActual:315,status:"preloaded",quality:"clean",rpe:8},
  "hipThrust__hypertrophy": {movement:"hipThrust",  range:"hypertrophy",load:315,reps:8, date:"préchargé",lastActual:315,status:"preloaded",quality:"clean",rpe:8},
  "bulgarian__strength":    {movement:"bulgarian",  range:"strength",   load:60, reps:5, date:"préchargé",lastActual:60, status:"preloaded",quality:"clean",rpe:8},
  "bulgarian__hypertrophy": {movement:"bulgarian",  range:"hypertrophy",load:40, reps:8, date:"préchargé",lastActual:40, status:"preloaded",quality:"clean",rpe:8},
  "powerClean__strength":   {movement:"powerClean", range:"strength",   load:215,reps:5, date:"préchargé",lastActual:215,status:"preloaded",quality:"clean",rpe:8},
  "powerClean__hypertrophy":{movement:"powerClean", range:"hypertrophy",load:185,reps:8, date:"préchargé",lastActual:185,status:"preloaded",quality:"clean",rpe:8},
  "dbSnatch__hypertrophy":  {movement:"dbSnatch",   range:"hypertrophy",load:50, reps:8, date:"préchargé",lastActual:50, status:"preloaded",quality:"clean",rpe:8},
  "farmerCarry__hypertrophy":{movement:"farmerCarry",range:"hypertrophy",load:28,reps:8, date:"préchargé",lastActual:28, status:"preloaded",quality:"clean",rpe:8}
};

// ─── State ───────────────────────────────────────────────────────────────────

var state = {
  week: 1,
  day: "lundi",
  history: [],
  profile: copy(defaultProfile),
  trainingMaxPct: 0.925,
  cycle: { goal:"shoulders3d" },
  movementRefs: copy(PRELOADED_REFS),
  // Suivi RPE par mouvement pour progression automatique
  rpeHistory: {},        // { "mvKey__range": [rpe1, rpe2, rpe3] } — 3 dernières séances
  sessionCount: {},      // { "lundi": 2, "mardi": 1, ... } — séances complétées par jour cette semaine
  completedDays: [],     // ["lundi", "mardi"] — jours complétés cette semaine
  missedDays: [],        // [{week, day, cycle, reason, date}] — séances prévues mais manquées
  weekTransitions: [],   // passages manuels/automatiques de semaine
  savedCycles: [],       // cycles mis en pause et récupérables
  archivedCycles: [],    // cycles terminés/abandonnés
  deloadAlert: false,    // true si le système détecte fatigue RPE
  athleteState: { movements:{}, updatedAt:null, version:null }, // Force actuelle durable par mouvement
  cycleState: null       // Où le cycle est rendu, sauvegardable indépendamment des versions
};
var customCharges = {};

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function load(){
  try{
    var found = findFirstStored([KEY].concat(LEGACY_KEYS));
    if(found&&found.raw){
      var p = JSON.parse(found.raw);
      state = Object.assign(state, p);
      state.profile      = Object.assign(copy(defaultProfile), p.profile||{});
      state.cycle        = Object.assign({goal:"shoulders3d"}, p.cycle||{});
      state.movementRefs = Object.assign(copy(PRELOADED_REFS), p.movementRefs||{});
      state.history      = p.history || [];
      state.rpeHistory   = p.rpeHistory || {};
      state.completedDays= p.completedDays || [];
      state.missedDays   = p.missedDays || [];
      state.weekTransitions = p.weekTransitions || [];
      state.savedCycles  = p.savedCycles || [];
      state.archivedCycles = p.archivedCycles || [];
      state.deloadAlert  = p.deloadAlert || false;
      state.athleteState = p.athleteState || { movements:{}, updatedAt:null, version:null };
      state.cycleState   = p.cycleState || null;
      // Migration douce vers la clé stable, sans effacer les anciennes clés.
      if(found.key!==KEY)save();
    }
  }catch(e){}
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){}}

function loadCustomCharges(){
  try{
    var found = findFirstStored([CHARGE_KEY].concat(LEGACY_CHARGE_KEYS));
    customCharges = found&&found.raw ? JSON.parse(found.raw) : {};
    if(found&&found.key!==CHARGE_KEY)saveCustomCharges();
  }catch(e){customCharges={};}
}
function saveCustomCharges(){try{localStorage.setItem(CHARGE_KEY,JSON.stringify(customCharges));}catch(e){}}

function getToken(){return localStorage.getItem(TOKEN_KEY)||"";}
function setToken(t){localStorage.setItem(TOKEN_KEY,t.trim());}

function chargeKeyFromName(n){return String(n||"").replace(/^[A-Z][0-9]?\.\s*/,"").trim();}
function officialCharges(){return window.DEFAULT_CHARGES||{};}
function charge(name,fallback){
  var key=chargeKeyFromName(name);
  var c=customCharges[key];
  if(c!==undefined&&String(c).trim()!=="")return String(c).trim();
  var o=officialCharges()[key];
  if(o!==undefined&&String(o).trim()!=="")return String(o).trim();
  return fallback||"—";
}
function displayChargeText(t){
  t=String(t||"");
  t=t.replace(/Wall Ball 14 lb/g,"Wall Ball "+charge("Wall Ball","14 lb"));
  t=t.replace(/wall balls 14 lb/g,"wall balls "+charge("Wall Ball","14 lb"));
  t=t.replace(/Wall balls 14 lb/g,"Wall balls "+charge("Wall Ball","14 lb"));
  return t;
}
function chargeList(){
  var defs=officialCharges(),order=window.CHARGE_ORDER||Object.keys(defs),seen={},list=[];
  order.forEach(function(k){if(defs[k]!==undefined&&!seen[k]){seen[k]=true;list.push(k);}});
  Object.keys(defs).forEach(function(k){if(!seen[k]){seen[k]=true;list.push(k);}});
  return list;
}


// ─── Athlete State : force actuelle durable par mouvement ─────────────────────

function normalizeExerciseName(name){return chargeKeyFromName(name).toLowerCase().replace(/[^a-z0-9à-ÿ]+/g," ").trim();}
function ensureAthleteState(){
  if(!state.athleteState)state.athleteState={movements:{},updatedAt:null,version:null};
  if(!state.athleteState.movements)state.athleteState.movements={};
  return state.athleteState;
}
function epley1RM(load,reps){load=Number(load)||0;reps=Number(reps)||0;if(!load||!reps)return 0;return load*(1+reps/30);}
function estimateLoadForRepsFrom1RM(oneRm,reps){oneRm=Number(oneRm)||0;reps=Number(reps)||1;if(!oneRm)return 0;return oneRm/(1+reps/30);}
function simpleStrengthIndexFromLoad(load){load=Number(load)||0;return Math.max(1,Math.round(load/12.5));}
function coachNormalizeMoveText(s){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();}
function canonicalMovementLabel(nameOrKey){
  var raw=chargeKeyFromName(nameOrKey||"");
  var n=coachNormalizeMoveText(raw);
  if(!n)return "Mouvement";
  // Séparer les mouvements ambigus : aucun mapping partiel entre deux options.
  if(n.indexOf("weighted pull up ring row lourd")>=0 || n.indexOf("weighted pull up ring row")>=0)return "Weighted Pull-up / Ring Row lourd";
  if(n.indexOf("ring row lourd")>=0)return "Ring Row lourd";
  if(n.indexOf("ring row strict")>=0 || n.indexOf("ring rows strict")>=0)return "Ring Row Strict";
  if(n.indexOf("weighted pull up")>=0)return "Weighted Pull-up";
  if(n.indexOf("db shoulder press landmine press")>=0)return "DB Shoulder Press / Landmine Press";
  if(n.indexOf("landmine press")>=0)return "Landmine Press";
  if(n.indexOf("db shoulder press")>=0)return "DB Shoulder Press";
  if(n.indexOf("power clean technique")>=0 || n.indexOf("clean technique")>=0)return "Power Clean technique";
  if(n.indexOf("power clean wod")>=0)return "Power Clean WOD";
  if(n.indexOf("power clean")>=0)return "Power Clean";
  if(n.indexOf("overhead rope extension rappel vendredi")>=0)return "Overhead Rope Extension — rappel vendredi";
  if(n.indexOf("overhead rope extension")>=0)return "Overhead Rope Extension";
  if(n.indexOf("strict press")>=0)return "Strict Press";
  if(n.indexOf("barbell row")>=0)return "Barbell Row";
  if(n.indexOf("face pull")>=0)return "Face Pull";
  if(n.indexOf("cable curl")>=0)return "Cable Curl";
  if(n.indexOf("rear delt fly cable bas")>=0 || n.indexOf("rear delt fly cable")>=0)return "Rear Delt Fly câble bas";
  if(n.indexOf("rear delt fly halteres")>=0)return "Rear Delt Fly haltères";
  if(n.indexOf("rear delt fly machine")>=0)return "Rear Delt Fly machine";
  if(n.indexOf("rear delt fly")>=0)return "Rear Delt Fly";
  if(n.indexOf("lateral raise cable bas")>=0 || n.indexOf("lateral raise cable")>=0)return "Lateral Raise câble bas";
  if(n.indexOf("lateral raise halteres")>=0)return "Lateral Raise haltères";
  if(n.indexOf("lateral raise machine")>=0)return "Lateral Raise machine";
  if(n.indexOf("lateral raise")>=0)return "Lateral Raise";
  if(n.indexOf("trap 3 raise")>=0)return "Trap-3 Raise";
  if(n.indexOf("bulgarian split squat")>=0)return "Bulgarian Split Squat";
  if(n.indexOf("hip thrust")>=0)return "Hip Thrust";
  if(n.indexOf("front squat")>=0)return "Front Squat";
  if(n.indexOf("db rdl")>=0)return "DB RDL";
  var mvKey=(typeof resolveMovementKey==='function')?resolveMovementKey(raw):null;
  if(mvKey&&movements[mvKey])return movements[mvKey].name;
  return raw;
}
function athleteMoveId(nameOrKey){return canonicalMovementLabel(nameOrKey);}
function movementLabelFromKeyOrName(key){return canonicalMovementLabel(key);}
function coachMovementLookupLabels(nameOrKey){
  var raw=chargeKeyFromName(nameOrKey||"");
  var canonical=canonicalMovementLabel(raw);
  var n=coachNormalizeMoveText(raw+" "+canonical);
  var list=[];
  function add(x){x=String(x||"").trim();if(x&&list.indexOf(x)===-1)list.push(x);}
  add(canonical);add(raw);

  // Aliases officiels anti-régression : les vues ne doivent pas perdre l'historique
  // parce qu'un programme précise une variante ou un contexte de rappel.
  if(/db shoulder press|landmine press/.test(n)){
    add("DB Shoulder Press");
    add("DB Shoulder Press / Landmine Press");
    add("Landmine Press");
  }
  if(/overhead rope extension/.test(n)){
    add("Overhead Rope Extension");
    add("Overhead Rope Extension — rappel vendredi");
  }
  if(/lateral raise/.test(n)){
    add("Lateral Raise");
    add("Lateral Raise haltères");
    add("Lateral Raise câble bas");
    add("Lateral Raise machine");
  }
  if(/rear delt fly/.test(n)){
    add("Rear Delt Fly");
    add("Rear Delt Fly haltères");
    add("Rear Delt Fly câble bas");
    add("Rear Delt Fly machine");
  }
  if(/wide grip cable upright row|upright row/.test(n)){
    add("Wide-Grip Cable Upright Row");
    add("Cable Upright Row");
    add("Upright Row");
  }
  if(/face pull/.test(n))add("Face Pull");
  if(/cable curl/.test(n))add("Cable Curl");
  if(/power clean technique|clean technique/.test(n)){
    add("Power Clean technique");
    add("Power Clean");
  }
  return list;
}
function athleteMovementRecord(label){
  var ast=ensureAthleteState();
  var map=ast&&ast.movements?ast.movements:{};
  var labels=coachMovementLookupLabels(label);
  for(var a=0;a<labels.length;a++){
    if(map[labels[a]])return map[labels[a]];
  }
  var wantedList=labels.map(coachNormalizeMoveText).filter(Boolean);
  var keys=Object.keys(map||{});
  for(var i=0;i<keys.length;i++){
    var kn=coachNormalizeMoveText(keys[i]);
    for(var j=0;j<wantedList.length;j++){
      var wanted=wantedList[j];
      if(kn===wanted)return map[keys[i]];
    }
  }
  // Match tolérant mais prudent pour les noms combinés du vendredi Épaules 3D.
  for(var k=0;k<keys.length;k++){
    var keyNorm=coachNormalizeMoveText(keys[k]);
    for(var w=0;w<wantedList.length;w++){
      var want=wantedList[w];
      if(want.length<8)continue;
      if(keyNorm.indexOf(want)>=0 || want.indexOf(keyNorm)>=0)return map[keys[k]];
    }
  }
  return null;
}
function coachDefaultLoadSeedForMovement(label, targetReps){
  var labels=coachMovementLookupLabels(label);
  var defaults=(typeof officialCharges==='function')?officialCharges():(window.DEFAULT_CHARGES||{});
  for(var i=0;i<labels.length;i++){
    if(defaults&&defaults[labels[i]]){
      var n=parseLoad(defaults[labels[i]]);
      if(n)return n;
    }
  }
  var n=coachNormalizeMoveText(labels.join(' '));
  // Fallbacks internes : ne modifient pas data/charges.js. Ils empêchent seulement
  // les mouvements de vendredi avec "léger/modéré" de rester sans suggestion numérique.
  if(/db shoulder press/.test(n))return 35;
  if(/lateral raise/.test(n))return 20;
  if(/rear delt fly/.test(n))return 20;
  if(/wide grip cable upright row|upright row/.test(n))return 50;
  if(/overhead rope extension/.test(n))return 50;
  if(/face pull/.test(n))return 60;
  if(/cable curl/.test(n))return 40;
  if(/power clean technique|power clean/.test(n))return 115;
  return null;
}
function latestMovementHistory(label){
  var mv=athleteMovementRecord(label);
  var h=(mv&&Array.isArray(mv.history))?mv.history:[];
  return h.length?h[h.length-1]:null;
}
function coachHistoryLoadNumber(row){return Number(row&&(row.load||row.actualLoad||row.capacityLoad||0))||0;}
function coachHistoryRepsNumber(row){return Number(row&&(row.reps||row.actualReps||row.currentReps||0))||0;}
function coachRecentBestControlledLoad(history, maxRpe){
  var rows=Array.isArray(history)?history:[];
  var best=null;
  maxRpe=Number(maxRpe)||8.5;
  rows.forEach(function(r){
    var load=coachHistoryLoadNumber(r), reps=coachHistoryRepsNumber(r), rpe=Number(r&&r.rpe||0)||0;
    if(!load||!rpe||rpe>maxRpe)return;
    var score=load*100+reps-(rpe>=8.5?10:0);
    if(!best||score>best.score)best={row:r,load:load,reps:reps,rpe:rpe,score:score};
  });
  return best;
}
function coachMaxJumpForExercise(label,lastLoad){
  var n=coachNormalizeMoveText(label);
  if(/bulgarian split squat/.test(n))return 10;
  if(/hip thrust/.test(n))return 30;
  if(/barbell row/.test(n))return 10;
  if(/front squat|back squat|strict press|bench press|power clean/.test(n))return 10;
  if(/db rdl/.test(n))return 10;
  if(isIsolationMovement(label))return coachLoadStepForExercise(label,lastLoad||'')||5;
  return 10;
}
function coachIsFridayContext(){return !!(state&&String(state.day||'').toLowerCase()==='vendredi');}
function coachIsMondayContext(){return !!(state&&String(state.day||'').toLowerCase()==='lundi');}
function coachLoadStepForExercise(name,loadText){
  var rule=(typeof equipmentRuleForExercise==='function')?equipmentRuleForExercise(name,loadText):null;
  if(rule&&Array.isArray(rule.available)){
    var nums=rule.available.map(Number).filter(function(x){return !isNaN(x);}).sort(function(a,b){return a-b;});
    if(nums.length>1){var best=5;for(var i=1;i<nums.length;i++){var d=nums[i]-nums[i-1];if(d>0)best=Math.min(best,d);}return best;}
  }
  if(rule&&rule.step)return Number(rule.step)||5;
  return 5;
}
function isIsolationMovement(name){
  var n=coachNormalizeMoveText(name);
  return /lateral raise|rear delt|curl|rope extension|pushdown|face pull|trap 3|serratus|calf|fly/.test(n);
}
function isTechnicalMovement(name){
  var n=coachNormalizeMoveText(name);
  return /technique|leger|light|warm up|warmup/.test(n) || n.indexOf("power clean technique")>=0;
}
function storeLoadDecisionHint(name,loadText,reason,severity,history){
  window.__coachLoadHints=window.__coachLoadHints||{};
  var label=canonicalMovementLabel(name);
  var rows=(history||[]).slice(-5).reverse().map(function(x){return{date:x.date||"?",load:x.load||x.actualLoad||x.capacityLoad||"?",reps:x.reps||x.actualReps||x.currentReps||"?",rpe:x.rpe||"?",status:x.status||""};});
  var payload={name:label,load:loadText,reason:reason||"Charge prévue par le programme.",severity:severity||"ok",rows:rows};
  var aliases=(typeof coachMovementLookupLabels==='function')?coachMovementLookupLabels(label):[label];
  aliases.forEach(function(a){ window.__coachLoadHints[coachNormalizeMoveText(a)]=payload; });
}
function guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps){
  var label=canonicalMovementLabel(nameOrKey);
  var target=Number(targetReps)||8;
  var mv=athleteMovementRecord(label);
  var range=repRange(target);
  var cap=mv&&mv.ranges?(mv.ranges[range]||null):null;
  var hist=(mv&&Array.isArray(mv.history))?mv.history:[];
  var last=hist.length?hist[hist.length-1]:null;
  var lastLoad=coachHistoryLoadNumber(last);
  var lastRpe=last?Number(last.rpe||0):0;
  var bestControlled=coachRecentBestControlledLoad(hist,8.5);
  var programNum=parseLoad(currentLoad);
  var originalText=displayLoadForEquipment(label,currentLoad);
  var seedReason="Charge du programme, arrondie selon l’équipement.";
  if(!programNum){
    var seed=(lastLoad||((bestControlled&&bestControlled.load)||0)||coachDefaultLoadSeedForMovement(label,target));
    if(seed){
      programNum=seed;
      seedReason=lastLoad
        ? "Charge de programme non numérique : suggestion basée sur la dernière charge historique."
        : ((bestControlled&&bestControlled.load)
          ? "Charge de programme non numérique : suggestion basée sur l'historique contrôlé."
          : "Charge de programme non numérique : suggestion basée sur les repères d'équipement.");
    }else{
      storeLoadDecisionHint(label,originalText,"Charge non numérique et aucun historique/repère fiable trouvé.","watch",hist);
      return{label:label,loadText:originalText,loadNum:null,severity:"watch",reason:"Charge non numérique et aucun historique/repère fiable trouvé.",last:last,cap:cap};
    }
  }
  var suggested=programNum;
  var severity="ok";
  var reason=seedReason;
  var mode="nearest";

  if(state&&Number(state.week)===6){
    var deloadBase=lastLoad||((bestControlled&&bestControlled.load)||programNum);
    var deloadCap=deloadBase?Math.min(programNum,deloadBase*0.85):programNum;
    if(deloadCap<suggested){suggested=deloadCap;mode="down";}
    severity="watch";
    reason="Deload S6 : charge réduite/maintenue sous la dernière référence, pas seulement volume réduit.";
  }

  if(isTechnicalMovement(label)){
    suggested=programNum;mode="nearest";severity=severity==="ok"?"watch":severity;
    reason="Mouvement technique : pas d’auto-progression comme un mouvement principal.";
  }

  // V51.03 : si le programme est clairement sous l'historique réel contrôlé, remonter vers la référence réelle.
  // Exemple visé : Barbell Row 145-155 @ RPE 7-8 ne doit pas rester à 115-125.
  if(bestControlled&&bestControlled.load>suggested){
    var gap=bestControlled.load-suggested;
    var n=coachNormalizeMoveText(label);
    var allowLiftFromHistory=false;
    if(/barbell row/.test(n)&&gap>=15)allowLiftFromHistory=true;
    else if(!isIsolationMovement(label)&&!isTechnicalMovement(label)&&gap>=20&&bestControlled.rpe<=8)allowLiftFromHistory=true;
    if(allowLiftFromHistory){
      suggested=Math.min(bestControlled.load+coachMaxJumpForExercise(label,bestControlled.load), bestControlled.load+10);
      mode="nearest";
      severity=severity==="ok"?"watch":severity;
      reason="Historique réel contrôlé détecté : "+bestControlled.load+" lb × "+bestControlled.reps+" @RPE "+bestControlled.rpe+". Le moteur évite de sous-suggérer sous une référence facile.";
    }
  }

  if(last){
    var maxJump=coachMaxJumpForExercise(label,lastLoad);
    if(lastLoad&&lastRpe<=8&&suggested>lastLoad+maxJump){
      suggested=lastLoad+maxJump;mode="down";severity=severity==="ok"?"watch":severity;
      reason="Progression limitée : dernière référence "+lastLoad+" lb @RPE "+lastRpe+". Saut maximal prudent +"+maxJump+" lb.";
    }
    if(lastRpe>=9 && suggested>lastLoad){
      suggested=lastLoad;mode="down";severity="warning";
      reason="Bloqué : dernier RPE réel "+lastRpe+" à "+lastLoad+" lb. Règle V51 : RPE ≥ 9 = aucune hausse automatique.";
    }else if(isIsolationMovement(label)&&lastRpe>=8.5 && suggested>lastLoad){
      suggested=lastRpe>=9.5?Math.max(0,lastLoad-coachLoadStepForExercise(label,currentLoad)):lastLoad;mode="down";severity="warning";
      reason="Isolation prudente : dernier RPE "+lastRpe+". Maintenir ou réduire légèrement, pas augmenter.";
    }
    if(/overhead rope extension/.test(coachNormalizeMoveText(label))){
      var friday=coachIsFridayContext();
      var easyBest=coachRecentBestControlledLoad(hist,8);
      var maxAllowed=(lastRpe<=8)?lastLoad+5:lastLoad;
      // Vendredi = rappel après un contexte différent. Autoriser 60-70 si une vraie référence facile existe,
      // sans autoriser un saut de lundi lourd après press.
      if(friday&&easyBest&&easyBest.load>=60&&easyBest.rpe<=8){
        maxAllowed=Math.max(maxAllowed,easyBest.load);
        if(suggested<60){suggested=Math.min(easyBest.load,70);mode="nearest";severity=severity==="ok"?"watch":severity;}
        reason="Overhead Rope Extension vendredi : contexte rappel distinct. Référence contrôlée "+easyBest.load+" lb @RPE "+easyBest.rpe+" permise, sans forcer le lundi.";
      }
      if(suggested>maxAllowed){
        suggested=maxAllowed;mode="down";severity="warning";
        reason=(lastRpe<=8)?"Overhead Rope Extension : progression limitée à +5 lb max après RPE ≤ 8.":"Overhead Rope Extension : RPE > 8, hausse bloquée dans ce contexte.";
      }
    }
  }
  if(cap&&(cap.status==="recalibrating"||cap.status==="watch"||Number(cap.confidence||1)<0.55)){
    var capLoad=Number(cap.currentLoad||cap.actualLoad||0)||0;
    // Ne pas laisser un cap faible écraser une référence réelle contrôlée clairement supérieure.
    var ignoreLowCap=bestControlled&&capLoad&&bestControlled.load>=capLoad+15&&bestControlled.rpe<=8.5;
    if(capLoad&&suggested>capLoad&&!ignoreLowCap){suggested=capLoad;mode="down";severity="warning";reason="Mouvement sous surveillance dans athlete_state : charge cappée jusqu’à confirmation.";}
    else if(ignoreLowCap){severity=severity==="ok"?"watch":severity;reason="Cap athlete_state ignoré : historique réel contrôlé plus récent/plus fiable que le cap faible.";}
  }
  var rounded=roundLoadForExercise(label,suggested,mode,currentLoad);
  if(/overhead rope extension/.test(coachNormalizeMoveText(label))&&last&&lastLoad){
    var allowed=(lastRpe<=8)?lastLoad+5:lastLoad;
    if(coachIsFridayContext()){
      var eb=coachRecentBestControlledLoad(hist,8);
      if(eb&&eb.load>=60)allowed=Math.max(allowed,eb.load);
    }
    if(rounded>allowed)rounded=roundLoadForExercise(label,allowed,"down",currentLoad)||lastLoad;
  }
  if(last&&lastRpe>=9&&rounded>lastLoad&&!(/overhead rope extension/.test(coachNormalizeMoveText(label))&&coachIsFridayContext()))rounded=roundLoadForExercise(label,lastLoad,"down",currentLoad)||lastLoad;
  var text=(rounded===0||rounded)?rounded+" lb":originalText;
  if(severity==="warning"||severity==="critical")text += " ⚠";
  storeLoadDecisionHint(label,text,reason,severity,hist);
  return{label:label,loadText:text,loadNum:rounded,severity:severity,reason:reason,last:last,cap:cap};
}
function plannedMapFromSessionExercises(){
  var map={};
  try{
    collectSessionExercises().forEach(function(it){
      if(!it||it.isWod)return;
      var label=movementLabelFromKeyOrName(it.key||it.name);
      var plannedLoad=parseLoad(it.suggested);
      var targetMin=Number(it.targetMin)||0;
      var targetMax=Number(it.targetMax)||targetMin||0;
      map[it.key]={name:label,load:plannedLoad,reps:targetMin||targetMax, targetMin:targetMin, targetMax:targetMax, format:it.format||"", kind:it.kind||""};
      map[label]=map[it.key];
      map[normalizeExerciseName(label)]=map[it.key];
    });
  }catch(e){}
  return map;
}
function classifyPerformance(actual, planned){
  var load=parseLoad(actual.load), reps=Number(actual.reps)||0, rpe=Number(actual.rpe)||0;
  var targetReps=Number((planned&&planned.reps)||actual.targetMin||actual.targetMax)||reps||1;
  var ratio=targetReps?reps/targetReps:1;
  var status="logged";
  if(load&&reps&&rpe>=9.5&&ratio<0.60)status="major_fail";
  else if(load&&reps&&rpe>=9&&ratio<1)status="failed";
  else if(load&&reps&&rpe<=7&&ratio>=1)status="easy_success";
  else if(load&&reps&&rpe>=9)status="hard_success";
  else if(load&&reps)status="success";
  return {status:status,ratio:Math.round(ratio*100)/100,targetReps:targetReps};
}
function enrichSessionResults(results){
  var plan=plannedMapFromSessionExercises();
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod||!r.load)return;
    var lookup=plan[key]||plan[movementLabelFromKeyOrName(key)]||plan[normalizeExerciseName(key)]||null;
    if(lookup){
      r.planned={load:lookup.load||null,reps:lookup.reps||null,targetMin:lookup.targetMin||null,targetMax:lookup.targetMax||null,format:lookup.format||"",kind:lookup.kind||""};
      var c=classifyPerformance(r,lookup);
      r.status=c.status;r.performanceRatio=c.ratio;
      if(c.status==="major_fail")r.coachNote="Échec majeur : niveau probablement surestimé aujourd'hui. Recalibrage requis.";
      else if(c.status==="failed")r.coachNote="Échec partiel : ne pas monter la charge avant confirmation.";
    }
  });
  return results;
}
function updateAthleteStateFromResults(results,dateStr){
  var ast=ensureAthleteState();
  dateStr=dateStr||new Date().toLocaleDateString("fr-CA");
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod||!r.load)return;
    var load=parseLoad(r.load), reps=Number(r.reps)||0, rpe=Number(r.rpe)||0;
    if(!load||!reps)return;
    var label=movementLabelFromKeyOrName(key);
    var range=repRange(reps);
    var planned=r.planned||{};
    var targetReps=Number(planned.reps||planned.targetMin)||reps;
    var cls=classifyPerformance(r,planned);
    var oneRM=epley1RM(load,reps);
    var capacityLoad=load;
    var confidence=0.65;
    var status=cls.status;
    if(cls.status==="major_fail"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.35;
      status="recalibrating";
    }else if(cls.status==="failed"){
      capacityLoad=roundLoadForExercise(label, estimateLoadForRepsFrom1RM(oneRM,targetReps), "nearest")||load;
      confidence=0.50;
      status="watch";
    }else if(cls.status==="easy_success"){
      capacityLoad=load;
      confidence=0.85;
      status="upgrade_ready";
    }else if(cls.status==="hard_success"){
      capacityLoad=load;
      confidence=0.70;
      status="hard";
    }
    if(!ast.movements[label]){
      ast.movements[label]={ranges:{},history:[],lastUpdated:null,status:"new"};
    }
    var mv=ast.movements[label];
    mv.ranges=mv.ranges||{};mv.history=mv.history||[];
    var prev=mv.ranges[range]||{};
    var shouldReplace = !prev.currentLoad || cls.status==="major_fail" || cls.status==="failed" || load>=Number(prev.currentLoad||0) || confidence>Number(prev.confidence||0);
    if(shouldReplace){
      mv.ranges[range]={
        currentLoad:capacityLoad,
        currentReps:targetReps,
        actualLoad:load,
        actualReps:reps,
        rpe:rpe,
        confidence:confidence,
        status:status,
        estimated1RM:Math.round(oneRM),
        lastUpdated:dateStr,
        planned:planned||null
      };
    }
    mv.status=status;
    mv.upgradedAt = (cls.status==="easy_success"||cls.status==="success"||cls.status==="hard_success") ? dateStr : (mv.upgradedAt||null);
    mv.lastUpdated=dateStr;
    mv.history.push({date:dateStr,load:load,reps:reps,rpe:rpe,range:range,status:status,capacityLoad:capacityLoad,planned:planned||null});
    if(mv.history.length>12)mv.history=mv.history.slice(-12);
  });
  ast.updatedAt=nowIso();ast.version=APP_VERSION;
}
function athleteSuggestedLoad(nameOrKey, currentLoad, targetReps){
  return guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps).loadText;
}
window.coachSafeSuggestedLoad=function(nameOrKey,currentLoad,targetReps){
  return guardedSuggestedLoadDecision(nameOrKey,currentLoad,targetReps).loadText;
};
function buildCycleStatePayload(){
  return {
    version:APP_VERSION,
    updatedAt:nowIso(),
    activeCycle:state.cycle&&state.cycle.goal?state.cycle.goal:"shoulders3d",
    activeWeek:state.week,
    activeDay:state.day,
    activeDays:currentDayOrder(),
    completedDays:state.completedDays||[],
    missedDays:state.missedDays||[],
    weekTransitions:state.weekTransitions||[],
    savedCycles:state.savedCycles||[],
    archivedCycles:state.archivedCycles||[],
    focus:focus()?focus().label:"",
    cycleStartedAt:(state.cycleState&&state.cycleState.cycleStartedAt)||nowIso()
  };
}
function applyCycleStatePayload(cycleData){
  if(!cycleData||typeof cycleData!=="object")return;
  state.cycleState=cycleData;
  if(cycleData.activeCycle)state.cycle={goal:cycleData.activeCycle};
  if(cycleData.activeWeek)state.week=Number(cycleData.activeWeek)||state.week;
  if(cycleData.activeDay)state.day=cycleData.activeDay;
  if(Array.isArray(cycleData.completedDays))state.completedDays=cycleData.completedDays;
  if(Array.isArray(cycleData.missedDays))state.missedDays=cycleData.missedDays;
  if(Array.isArray(cycleData.weekTransitions))state.weekTransitions=cycleData.weekTransitions;
  if(Array.isArray(cycleData.savedCycles))state.savedCycles=cycleData.savedCycles;
  if(Array.isArray(cycleData.archivedCycles))state.archivedCycles=cycleData.archivedCycles;
  if(!focusConfigs[state.cycle.goal]){
    state.missingCycle = {id:state.cycle.goal,date:nowIso()};
    state.cycle.goal = defaultProgramId();
  }
  ensureCurrentDay();
}

function focus(){return focusConfigs[state.cycle.goal]||focusConfigs[defaultProgramId()]||{};}
function weekIdx(){var tw=Math.max(1,totalWeeks());return Math.max(0,Math.min(tw-1,state.week-1));}
function repRange(reps){reps=Number(reps)||0;if(reps<=5)return"strength";if(reps<=12)return"hypertrophy";return"endurance";}
function repRangeLabel(r){return r==="strength"?"1–5 reps":r==="hypertrophy"?"6–12 reps":"13+ reps";}
function refKey(mvKey,reps){return mvKey+"__"+repRange(reps);}

function tmFromProfile(mvKey){
  var mv=movements[mvKey];if(!mv||!mv.profile)return 0;
  var raw=Number(state.profile[mv.profile]);return raw?raw*Number(state.trainingMaxPct||0.925):0;
}
function referenceBase(mvKey,targetReps){
  var key=mvKey+"__"+repRange(targetReps),ref=state.movementRefs[key];
  if(ref&&ref.load!==undefined&&ref.load!==null&&ref.load!=="")return{value:Number(ref.load),source:"reference",ref:ref};
  if(estimatedDailyLoads[mvKey])return{value:Number(estimatedDailyLoads[mvKey]),source:"estimate",ref:null};
  var fb=tmFromProfile(mvKey);return{value:fb,source:fb?"profile":"none",ref:null};
}
function referenceMultiplier(ref){
  var table={hypertrophy:[0.82,0.85,0.88,0.65],shoulders3d:[0.68,0.72,0.76,0.50],strength:[0.84,0.87,0.90,0.62],weightlifting:[0.72,0.76,0.80,0.55],posture:[0.75,0.78,0.82,0.55],engine:[0.70,0.73,0.76,0.55],recomp:[0.78,0.82,0.85,0.58]};
  var m=(table[state.cycle.goal]||table.hypertrophy)[weekIdx()];
  if(ref){if(ref.status==="hard"||Number(ref.rpe)>=9)m-=0.08;if(ref.quality==="acceptable")m-=0.025;if(ref.quality==="doubtful")m-=0.08;}
  if(Number(state.week)===6)m=Math.min(m,0.55);
  return Math.max(0.40,Math.min(m,0.90));
}
function profileMultiplier(index){var base=focus().mult[weekIdx()];return index===0?base:Math.max(0.45,base-0.12);}
function suggestLoad(mvKey,pct,targetReps){
  var base=referenceBase(mvKey,targetReps);
  if(!base.value)return 0;
  if(base.source==="estimate")return base.value;
  if(base.source==="reference")return base.value*referenceMultiplier(base.ref);
  return base.value*pct;
}
function progressionPct(index){return profileMultiplier(index);}
function targetReps(index,kind){
  var goal=state.cycle.goal,week=weekIdx();
  if(kind==="main")return focus().targetReps[week]||5;
  if(kind==="accessory"){if(goal==="shoulders3d")return 15;if(goal==="strength")return 8;if(goal==="weightlifting")return 3;if(goal==="posture")return 12;return 10;}
  if(kind==="wod")return goal==="shoulders3d"?12:8;
  return focus().targetReps[week]||5;
}
function setScheme(kind,index){
  var goal=state.cycle.goal,week=weekIdx();
  if(kind==="main")return focus().sets[week];
  if(kind==="accessory"){if(goal==="shoulders3d")return"3-4 x 15";if(goal==="strength")return"3 x 8";if(goal==="weightlifting")return"5 x 3 technique";if(goal==="posture")return"3 x 12";if(goal==="engine")return"2 x 10";return"3 x 10";}
  return"—";
}
function restFor(kind){
  if(kind==="main")return focus().rest;
  if(kind==="accessory")return state.cycle.goal==="strength"?"2:00–2:30":state.cycle.goal==="shoulders3d"?"0:30–1:00":"0:45–1:15";
  if(kind==="wod")return"selon WOD";
  return"—";
}
function currentDayLabel(){
  var d=currentDayMeta(state.day);
  return (d&&d.label)||state.day||"—";
}

// Construction des séances chargée depuis programs/workouts.js

// ─── Moteur audio (Web Audio API) ────────────────────────────────────────────
// Fonctionne sans fichier externe, génère les sons en temps réel

var audioCtx = null;
function getAudioCtx(){
  if(!audioCtx){try{audioCtx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  return audioCtx;
}
// Résume le contexte après interaction utilisateur (requis iOS)
function resumeAudio(){var ctx=getAudioCtx();if(ctx&&ctx.state==="suspended")ctx.resume();}

function playBeep(freq,dur,vol,type){
  var ctx=getAudioCtx();if(!ctx)return;
  try{
    var osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain);gain.connect(ctx.destination);
    osc.type=type||"sine";osc.frequency.setValueAtTime(freq,ctx.currentTime);
    gain.gain.setValueAtTime(vol||0.4,ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dur);
    osc.start(ctx.currentTime);osc.stop(ctx.currentTime+dur);
  }catch(e){}
}

// Bip court aigu (countdown 3-2-1)
function bipCountdown(){playBeep(880,0.12,0.5);}
// Bip long grave (départ / fin)
function bipStart(){playBeep(660,0.35,0.6);setTimeout(function(){playBeep(880,0.35,0.6);},180);}
function bipEnd(){playBeep(440,0.5,0.7);setTimeout(function(){playBeep(330,0.7,0.7);},250);}
// Bip minute EMOM
function bipEmom(){playBeep(1047,0.18,0.5);setTimeout(function(){playBeep(1047,0.18,0.5);},220);}
// Bip fin repos
function bipRestDone(){playBeep(660,0.2,0.5);setTimeout(function(){playBeep(880,0.3,0.6);},150);setTimeout(function(){playBeep(1047,0.4,0.7);},320);}

// ─── Timer WOD ───────────────────────────────────────────────────────────────

var wodTimer={duration:0,remaining:0,elapsed:0,running:false,interval:null,mode:"down",label:"",isEmom:false,countdownActive:false};

function wodTimerConfig(block){
  var txt=String((block&&block.text)||""),seconds=parseTimeToSeconds(block&&block.time),label="Timer",mode="down",isEmom=false;
  if(/AMRAP/i.test(txt)){label="AMRAP "+Math.round(seconds/60)+" min";}
  else if(/EMOM/i.test(txt)){label="EMOM "+Math.round(seconds/60)+" min";isEmom=true;}
  else if(/For time|Cap/i.test(txt)){label="CAP "+Math.round(seconds/60)+" min";mode="up";}
  if(!seconds){seconds=8*60;label="Timer 8 min";}
  return{seconds:seconds,label:label,mode:mode,isEmom:isEmom};
}
function stopWodTimer(){
  if(wodTimer.interval){clearInterval(wodTimer.interval);wodTimer.interval=null;}
  wodTimer.running=false;wodTimer.countdownActive=false;

}
function wodTimerCurrentValue(){return wodTimer.mode==="up"?wodTimer.elapsed:wodTimer.remaining;}
function updateWodTimerDisplay(){
  // timer WOD retiré de la vue PC. Aucun élément à mettre à jour.
}
function resetWodTimerState(dur,mode,label,isEmom){
  stopWodTimer();
  wodTimer.duration=dur;wodTimer.mode=mode||"down";wodTimer.label=label||"Timer";
  wodTimer.elapsed=0;wodTimer.remaining=dur;wodTimer.isEmom=!!isEmom;
}

function startWodCountdown(onDone){
  // 10 secondes de countdown avant le départ
  wodTimer.countdownActive=true;
  wodTimer.countdownRemaining=10;
  updateWodTimerDisplay();
  var cd=setInterval(function(){
    wodTimer.countdownRemaining--;
    // Bips aux 3 dernières secondes
    if(wodTimer.countdownRemaining<=3&&wodTimer.countdownRemaining>0){bipCountdown();vibrate([60]);}
    if(wodTimer.countdownRemaining<=0){
      clearInterval(cd);
      wodTimer.countdownActive=false;
      bipStart();vibrate([200,80,200]);
      onDone();
    }
    updateWodTimerDisplay();
  },1000);
}

function setupWodTimer(){
  var box=document.querySelector(".pc-timer");
  if(!box){stopWodTimer();return;}
  var dur=Number(box.getAttribute("data-duration"))||0;
  var mode=box.getAttribute("data-mode")||"down";
  var label=box.getAttribute("data-label")||"Timer";
  var isEmom=box.getAttribute("data-emom")==="1";
  if(wodTimer.duration!==dur||wodTimer.mode!==mode)resetWodTimerState(dur,mode,label,isEmom);
  updateWodTimerDisplay();
  var start=null,pause=null,reset=null; // timer WOD retiré

  if(start)start.onclick=function(){
    resumeAudio();
    if(wodTimer.running||wodTimer.countdownActive)return;
    start.textContent="...";start.disabled=true;
    // Countdown 10s puis démarrage
    startWodCountdown(function(){
      start.textContent="▶";start.disabled=false;
      wodTimer.running=true;
      wodTimer.interval=setInterval(function(){
        if(wodTimer.mode==="up"){
          wodTimer.elapsed=Math.min(wodTimer.duration,wodTimer.elapsed+1);
          updateWodTimerDisplay();
          // Bip à chaque minute EMOM
          if(wodTimer.isEmom&&wodTimer.elapsed>0&&wodTimer.elapsed%60===0){bipEmom();vibrate([100,50,100]);}
          if(wodTimer.elapsed>=wodTimer.duration){stopWodTimer();bipEnd();vibrate([300,100,300,100,300]);}
        } else {
          wodTimer.remaining=Math.max(0,wodTimer.remaining-1);
          updateWodTimerDisplay();
          // Bips 3 dernières secondes
          if(wodTimer.remaining<=3&&wodTimer.remaining>0){bipCountdown();vibrate([60]);}
          // Bip à chaque minute EMOM (quand remaining tombe sur multiple de 60)
          if(wodTimer.isEmom&&wodTimer.remaining>0&&wodTimer.remaining%60===0){bipEmom();vibrate([100,50,100]);}
          if(wodTimer.remaining<=0){stopWodTimer();bipEnd();vibrate([300,100,300,100,300]);}
        }
      },1000);
    });
  };
  if(pause)pause.onclick=function(){stopWodTimer();updateWodTimerDisplay();};
  if(reset)reset.onclick=function(){
    resetWodTimerState(dur,mode,label,isEmom);

    updateWodTimerDisplay();
  };
}

// ─── Timer repos ─────────────────────────────────────────────────────────────

var restTimer={remaining:0,interval:null,running:false};

function currentClockWithSeconds(){
  var n=new Date();
  return String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0")+":"+String(n.getSeconds()).padStart(2,"0");
}


// horloge uniquement dans le mode séance; heure et secondes même grosseur.
var globalClockInterval=null;
function ensureGlobalClock(){
  return $('guidedLiveClock');
}
function updateGlobalClock(){
  var el=ensureGlobalClock();
  if(!el) return;
  var n=new Date();
  var hh=String(n.getHours()).padStart(2,'0');
  var mm=String(n.getMinutes()).padStart(2,'0');
  var ss=String(n.getSeconds()).padStart(2,'0');
  el.innerHTML='<span class="glc-hm">'+hh+':'+mm+'</span><span class="glc-sec">'+ss+'</span>';
}
function startGlobalClock(){
  updateGlobalClock();
  if(globalClockInterval)clearInterval(globalClockInterval);
  globalClockInterval=setInterval(updateGlobalClock,1000);
}
function ensureRestFloatingClock(){
  var el=$("restFloatingClock");
  if(!el){
    el=document.createElement("div");
    el.id="restFloatingClock";
    el.className="rest-floating-clock hidden";
    document.body.appendChild(el);
  }
  return el;
}
function updateRestFloatingClock(){
  // l'heure permanente remplace l'ancienne horloge de repos.
  // Les boutons Pause ont été retirés des vues iPhone et séance.
  var el=$("restFloatingClock");
  if(el){el.className="rest-floating-clock hidden";el.innerHTML="";}
}
function updateRestDisplay(){
  // restDisplay retiré du DOM. Seul updateRestFloatingClock est conservé.
  updateRestFloatingClock();
}
function stopRestTimer(){
  if(restTimer.interval){clearInterval(restTimer.interval);restTimer.interval=null;}
  restTimer.running=false;updateRestDisplay();
}
function startRestTimer(seconds){
  resumeAudio();
  stopRestTimer();restTimer.remaining=seconds;restTimer.running=true;updateRestDisplay();
  restTimer.interval=setInterval(function(){
    restTimer.remaining=Math.max(0,restTimer.remaining-1);
    updateRestDisplay();
    // Bips 3 dernières secondes du repos
    if(restTimer.remaining<=3&&restTimer.remaining>0){bipCountdown();vibrate([60]);}
    if(restTimer.remaining<=0){
      stopRestTimer();bipRestDone();vibrate([300,100,300,100,300]);

    }
  },1000);
}
function setupRestBar(){
  var map={rb45:45,rb60:60,rb90:90,rb120:120};
  Object.keys(map).forEach(function(id){var b=$(id);if(b)b.onclick=function(){resumeAudio();startRestTimer(map[id]);};});

}

// ─── Saisie résultats & GitHub sync ──────────────────────────────────────────

// Extrait la plage de reps cible depuis le format (ex: "4 x 15-20" → {min:15,max:20})
// ou depuis un nombre simple (ex: "5 x 8" → {min:8,max:8})
function parseTargetReps(format, repsHint){
  // Chercher une plage "X-Y" dans le format
  var rangeMatch = String(format||"").match(/(\d+)\s*[–\-]\s*(\d+)/);
  if(rangeMatch) return {min:Number(rangeMatch[1]), max:Number(rangeMatch[2])};
  // Chercher un nombre simple après "x" ou "×"
  var singleMatch = String(format||"").match(/[x×]\s*(\d+)/i);
  if(singleMatch) return {min:Number(singleMatch[1]), max:Number(singleMatch[1])};
  // Fallback sur repsHint
  var r = Number(repsHint)||8;
  return {min:r, max:r};
}

// Génère les chips de reps dynamiques pour la saisie des résultats et la vue séance.
// Règle V51.08 :
// - maximum 5 pastilles de reps pour libérer l’espace iPhone.
// - RPE conserve 6 et ajoute les demi-paliers utiles : 7.5 et 8.5.
// - cible simple (5 reps) → 3 à 7.
// - plage large (10–15 reps) → fenêtre de 5 valeurs centrée autour de la cible utile.
function buildRepsChips(targetMin, targetMax){
  var min = Number(targetMin || targetMax || 1);
  var max = Number(targetMax || targetMin || min);
  if(!isFinite(min) || min < 1) min = 1;
  if(!isFinite(max) || max < 1) max = min;
  min = Math.round(min);
  max = Math.round(max);
  if(max < min){ var tmp = min; min = max; max = tmp; }

  var chips = [];
  var maxChips = 5;

  if(min !== max){
    var width = max - min + 1;
    if(width <= maxChips){
      for(var r = min; r <= max; r++) chips.push(r);
      return chips;
    }
    var mid = Math.round((min + max) / 2);
    var loRange = Math.max(min, mid - 2);
    var hiRange = loRange + (maxChips - 1);
    if(hiRange > max){
      hiRange = max;
      loRange = Math.max(min, hiRange - (maxChips - 1));
    }
    for(var rr = loRange; rr <= hiRange; rr++) chips.push(rr);
    return chips;
  }

  // Cible simple : 5 pastilles maximum, cible au centre quand possible.
  var center = min;
  var lo = Math.max(1, center - 2);
  var hi = lo + (maxChips - 1);
  if(center > hi){
    hi = center;
    lo = Math.max(1, hi - (maxChips - 1));
  }
  for(var i = lo; i <= hi; i++) chips.push(i);
  return chips;
}
function buildRpeChips(){
  return [6,7,7.5,8,8.5,9,10];
}

// ── Analyse la structure d'un WOD pour extraire mouvements + reps + couleurs ──
function parseWodStructure(text){
  if(!text) return null;
  var COLORS = ['mv1','mv2','mv3','mv4'];
  var raw = String(text);
  var moves = [], seen = new Set();

  function cleanMoveName(name, isCal){
    var n = String(name||'')
      .replace(/\bmin\s*\d+\s*=\s*/ig,'')
      .replace(/[;:,.]+$/,'')
      .replace(/\s+/g,' ')
      .trim();

    // dans la vue séance, on doit voir "Cal Row" et non juste "Row".
    // Si le texte original contient "cal", on conserve cette information dans le nom.
    var hadCal = !!isCal || /^cal\s+/i.test(n);
    n = n.replace(/^cal\s+/i,'').trim();

    // En vue séance/résultats WOD, le nom du mouvement reste propre.
    // La charge appartient aux consignes, pas au titre: "Wall Balls 14 lb" => "Wall Balls".
    n = n
      .replace(/\b(?:\d+(?:\.\d+)?\s*)?(?:lb|lbs|kg)\s*(?:\/\s*(?:main|hand|côté|side))?\b/ig,'')
      .replace(/\b(?:light|léger|légers|légères|modéré|modérée|moderate|heavy|lourd|lourds|lourdes)\b/ig,'')
      .replace(/\s+/g,' ')
      .trim();

    if(hadCal){
      if(/^row\b/i.test(n)) return 'Cal Row';
      if(/^bike\b/i.test(n)) return 'Cal Bike';
      if(/^ski\b|^skierg\b/i.test(n)) return 'Cal SkiErg';
      return 'Cal '+n.charAt(0).toUpperCase()+n.slice(1);
    }
    return n;
  }
  function addMove(reps,name,isCal){
    name = cleanMoveName(name,isCal);
    if(!name || name.length<2) return;
    var key = (String(reps)+'_'+name).toLowerCase();
    if(seen.has(key)) return;
    seen.add(key);
    moves.push({name:name, reps:String(reps), color:COLORS[moves.length % COLORS.length]});
  }

  // EMOM : "min 1 = 12 cal row ; min 2 = 10 ring rows stricts"
  if(/\bEMOM\b/i.test(raw)){
    var emomPart = raw.split('.')[0];
    var emomRe = /min\s*\d+\s*=\s*(\d+)\s*(cal\s+)?([^;\.]+)/ig;
    var m;
    while((m = emomRe.exec(emomPart)) !== null){ addMove(m[1], m[3], !!m[2]); }
    if(moves.length) return moves;
  }

  // For time 21-15-9 : les reps sont une pyramide, donc on affiche "21-15-9" pour chaque mouvement.
  var scheme = null;
  var schemeMatch = raw.match(/(\d+\s*[-–]\s*\d+\s*[-–]\s*\d+)/);
  if(/for time|cap/i.test(raw) && schemeMatch){ scheme = schemeMatch[1].replace(/\s/g,''); }

  var main = raw
    .replace(/^[^:]*:\s*/,'')
    .split('.')[0]
    .replace(/\bAMRAP\s*\d+\b/ig,'')
    .replace(/\bEMOM\s*\d+\b/ig,'')
    .replace(/\bFor time\b/ig,'')
    .replace(/\bCap\s*\d+\s*min\b/ig,'')
    .trim();

  if(scheme){
    main = main.replace(/^(\d+\s*[-–]\s*\d+\s*[-–]\s*\d+)\s*:?\s*/,'');
    main.split('+').forEach(function(part){
      var isCalPart = /^\s*cal\s+/i.test(part);
      part = cleanMoveName(part, isCalPart);
      if(part) addMove(scheme, part, false);
    });
    if(moves.length) return moves;
  }

  main.split('+').forEach(function(part){
    part = part.trim();
    var m = part.match(/^(\d+)\s*(cal\s+)?(.+)$/i);
    if(!m) return;
    var reps = Number(m[1]);
    var name = cleanMoveName(m[3], !!m[2]);
    if(reps<1||reps>80||name.length<2) return;
    addMove(reps, name, false);
  });

  return moves.length>=1 ? moves : null;
}
// Estime les rounds attendus selon durée et type
function estimateWodRounds(text, durationMin){
  if(/emom/i.test(text)) return {min:durationMin,max:durationMin,def:durationMin};
  if(/for time|cap/i.test(text)) return {min:1,max:1,def:1};
  if(durationMin<=6)  return {min:2,max:4,def:3};
  if(durationMin<=10) return {min:3,max:6,def:4};
  if(durationMin<=15) return {min:4,max:8,def:5};
  return {min:3,max:6,def:4};
}

// Helpers For Time.
// Ces fonctions doivent exister avant renderSessionEntry(), sinon les WODs For Time
// comme le jeudi Épaules 3D n'affichent pas le champ de temps final.
function parseCapSeconds(text, fallbackMin){
  var raw = String(text || '');
  var m = raw.match(/(?:cap|time cap)\s*[:=]?\s*(\d+)\s*(?:min|minutes?)?/i);
  var min = m ? Number(m[1]) : Number(fallbackMin || 0);
  if(!min || min < 1) min = 8;
  return Math.max(60, Math.round(min * 60));
}
function buildTimeOptions(expectedSec){
  // V51.18 : For Time = liste complète 00:00 → 60:00, à la seconde.
  // L’objectif/cap détecté reste présélectionné, sans réduire la plage disponible.
  var arr = [];
  for(var sec = 0; sec <= 3600; sec += 1) arr.push(sec);
  return arr;
}
function normalizeForTimeGoalSeconds(expectedSec){
  expectedSec = Math.round(Number(expectedSec || 0));
  if(!isFinite(expectedSec)) expectedSec = 0;
  return Math.max(0, Math.min(3600, expectedSec));
}

// Collecte tous les exercices du WOD courant avec leur cible de reps
function collectSessionExercises(){
  var w=buildWorkout(state.day,state.week);
  var items=[];
  w.blocks.forEach(function(b){
    if(b.kind==="warmup"||b.kind==="mobility"||b.kind==="bonus")return;
    if(b.exercises&&b.exercises.length){
      b.exercises.forEach(function(e){
        var parsed = parseTargetReps(e.format, 10);
        items.push({key:e.name.replace(/^[A-Z][0-9]?\.\s*/,"").trim(),name:e.name,
          suggested:athleteSuggestedLoad(e.name,e.load,parsed.min||parsed.max),format:e.format,targetMin:parsed.min,targetMax:parsed.max,kind:b.kind,isWod:false});
      });
    } else if(b.progress&&b.progress.length){
      b.progress.forEach(function(mvKey,j){
        var reps=targetReps(j,b.kind),fmt=setScheme(b.kind,j),parsed=parseTargetReps(fmt,reps);
        items.push({key:mvKey,name:movements[mvKey].name,
          suggested:lb(suggestLoad(mvKey,progressionPct(j),reps)),
          format:fmt,targetMin:parsed.min,targetMax:parsed.max,kind:b.kind,isWod:false});
      });
    } else if(b.kind==="wod"){
      var wodText=b.text||"";
      var durMin=parseTimeToSeconds(b.time)/60;
      var moves=parseWodStructure(wodText);
      var rounds=estimateWodRounds(wodText,durMin);
      items.push({
        key:"wod_"+b.title, name:"WOD — "+b.title, suggested:"",
        kind:"wod", isWod:true,
        wodText:wodText, wodMoves:moves, wodRounds:rounds,
        isAmrap:/amrap/i.test(wodText), isEmom:/emom/i.test(wodText),
        isForTime:/for time|cap/i.test(wodText), durationMin:durMin
      });
    }
  });
  return items;
}

function renderSessionEntry(){
  var items=collectSessionExercises();
  var container=$("sessionFields");if(!container)return;
  container.innerHTML="";

  items.forEach(function(item){
    var card=document.createElement("div");
    card.className="sf-card";

    if(item.isWod){
      // ── Carte WOD intelligente ──
      card.innerHTML = '<div class="sf-name">'+item.name+'</div>';
      container.appendChild(card);

      var wodInner = '';

      if(item.isEmom){
        wodInner += '<div class="wod-expected">EMOM — <strong>RPE seulement</strong></div>';
      } else if(item.isAmrap){
        var r = item.wodRounds;
        wodInner += '<div class="wod-expected">Résultat attendu : <strong>'+r.min+'–'+r.max+' rounds</strong></div>';
      } else if(item.isForTime){
        var expectedSec = parseCapSeconds(item.wodText,item.durationMin);
        if(!expectedSec || isNaN(expectedSec)) expectedSec = Math.max(60, Math.round((item.durationMin || 8) * 60));
        expectedSec = normalizeForTimeGoalSeconds(expectedSec);
        wodInner += '<div class="wod-expected">For time — objectif présélectionné : <strong>'+formatClock(expectedSec)+'</strong> · choix 00:00–60:00</div>';
        wodInner += '<span class="sf-label">TEMPS FINAL</span>';
        wodInner += '<select class="sf-input" id="wod_time_'+item.key+'" data-key="'+item.key+'" data-field="result">';
        buildTimeOptions(expectedSec).forEach(function(sec){
          wodInner += '<option value="'+formatClock(sec)+'"'+(sec===expectedSec?' selected':'')+'>'+formatClock(sec)+'</option>';
        });
        wodInner += '</select>';
        wodInner += '<input class="sf-input" data-key="'+item.key+'" data-field="note" type="text" inputmode="text" placeholder="si cap : reps complétées ou note"/>';
      }

      if(item.isAmrap && item.wodRounds.max > 1){
        var r2 = item.wodRounds;
        wodInner += '<span class="sf-label">ROUNDS COMPLÉTÉS</span>';
        wodInner += '<div class="sf-chips" id="wod_rounds_'+item.key+'">';
        for(var ri=0; ri<=r2.max+2; ri++){
          var inRange = ri>=r2.min && ri<=r2.max;
          wodInner += '<button type="button" class="sf-chip'+(inRange?' target':'')+'" data-round="'+ri+'">'+ri+'</button>';
        }
        wodInner += '</div>';
      }

      if(item.isAmrap && item.wodMoves && item.wodMoves.length){
        wodInner += '<span class="sf-label">REPS DU DERNIER ROUND — 0 inclus pour corriger</span>';
        item.wodMoves.forEach(function(mv, mi){
          var maxReps = mv.reps - (mi === item.wodMoves.length-1 ? 1 : 0);
          var hint = mi < item.wodMoves.length-1
            ? 'si tu complètes les '+mv.reps+' → '+item.wodMoves[mi+1].name+' commence'
            : mv.reps+' = round complet → clique +1 round à la place';
          wodInner += '<div class="wod-mv-label '+mv.color+'">'+mv.name+' <span class="wod-mv-max">(0–'+maxReps+')</span></div>';
          wodInner += '<div class="sf-chips" id="wod_mv_'+item.key+'_'+mi+'">';
          for(var ri2=0; ri2<=maxReps; ri2++){
            wodInner += '<button type="button" class="sf-chip '+mv.color+(ri2===0?' zero':'')+'" data-mv="'+mi+'" data-rep="'+ri2+'">'+ri2+'</button>';
          }
          wodInner += '</div>';
          wodInner += '<div class="wod-mv-hint">'+hint+'</div>';
        });
      }

      if(item.isAmrap){
        wodInner += '<div class="sf-divider">— ou saisie libre —</div>';
        wodInner += '<input class="sf-input" id="wod_free_'+item.key
          +'" data-key="'+item.key+'" data-field="result" type="text" inputmode="text" placeholder="ex: 4 rounds + 1 burpees + 0 row + 0 sit-ups"/>';
      } else if(item.isEmom){
        wodInner += '<input class="sf-input" id="wod_free_'+item.key+'" data-key="'+item.key+'" data-field="result" type="hidden" value="EMOM complété"/>';
      }

      wodInner += '<input class="sf-input" id="wod_rpe_value_'+item.key+'" data-key="'+item.key+'" data-field="rpe" type="hidden" value="8"/>';
      wodInner += '<span class="sf-label" style="margin-top:12px">RPE</span>';
      wodInner += '<div class="sf-chips" id="wod_rpe_'+item.key+'">';
      [6,7,8,9,10].forEach(function(n){
        wodInner += '<button type="button" class="sf-chip'+(n===8?' active':'')+'" data-rpe="'+n+'">'+n+'</button>';
      });
      wodInner += '</div>';

      if(!item.isForTime){
        wodInner += '<span class="sf-label">NOTE (optionnel)</span>';
        wodInner += '<input class="sf-input" data-key="'+item.key+'" data-field="note" type="text" inputmode="text" placeholder="ex: burpees lents, bon rythme row"/>';
      }

      wodInner += '<div class="wod-result-preview" id="wod_preview_'+item.key+'">Résultat prêt</div>';
      card.innerHTML += wodInner;

      (function(it){
        var selectedRounds = it.isAmrap && it.wodRounds ? it.wodRounds.def : 0;
        var selectedMvReps = {};
        if(it.wodMoves) it.wodMoves.forEach(function(_,i){ selectedMvReps[i]=0; });
        var selectedRpe = 8;

        function updatePreview(){
          var freeInp = document.getElementById('wod_free_'+it.key);
          var preview = document.getElementById('wod_preview_'+it.key);
          var rpeInp = document.getElementById('wod_rpe_value_'+it.key);
          if(rpeInp) rpeInp.value = selectedRpe;
          if(!preview) return;

          if(it.isEmom){
            preview.innerHTML = '<strong style="color:var(--cyan)">EMOM</strong> · RPE '+selectedRpe;
            return;
          }

          if(it.isForTime){
            var sel = document.getElementById('wod_time_'+it.key);
            var val = sel ? sel.value : '';
            preview.innerHTML = '<strong style="color:var(--cyan)">'+(val||'—')+'</strong> · RPE '+selectedRpe;
            return;
          }

          var parts = [];
          if(selectedRounds>0) parts.push(selectedRounds+' round'+(selectedRounds>1?'s':''));

          var repParts = [];
          if(it.wodMoves){
            it.wodMoves.forEach(function(mv,i){
              if(selectedMvReps[i]>0) repParts.push(selectedMvReps[i]+' '+mv.name);
            });
          }
          if(repParts.length) parts.push(repParts.join(' + '));

          var resultStr = parts.join(' + ');
          if(freeInp) freeInp.value = resultStr;

          var partialTotal = 0;
          if(it.wodMoves){
            it.wodMoves.forEach(function(mv,i){
              if(selectedMvReps[i]>0){
                for(var pi=0; pi<i; pi++) partialTotal += it.wodMoves[pi].reps;
                partialTotal += selectedMvReps[i];
              }
            });
          }

          var totalStr = '<strong style="color:var(--cyan)">'+(resultStr||'—')+'</strong>';
          if(partialTotal>0) totalStr += ' <span style="color:var(--muted);font-size:11px">(+'+partialTotal+' reps partielles)</span>';
          totalStr += ' · RPE '+selectedRpe;
          preview.innerHTML = totalStr;
        }

        var roundsEl = document.getElementById('wod_rounds_'+it.key);
        if(roundsEl){
          var defBtn = roundsEl.querySelector('[data-round="'+selectedRounds+'"]');
          if(defBtn) defBtn.classList.add('active');
          roundsEl.querySelectorAll('[data-round]').forEach(function(btn){
            btn.addEventListener('click',function(){
              selectedRounds = Number(btn.getAttribute('data-round'));
              roundsEl.querySelectorAll('[data-round]').forEach(function(b){b.classList.remove('active');});
              btn.classList.add('active');
              updatePreview();
            });
          });
        }

        if(it.wodMoves){
          it.wodMoves.forEach(function(mv,mi){
            var mvEl = document.getElementById('wod_mv_'+it.key+'_'+mi);
            if(!mvEl) return;
            var zeroBtn = mvEl.querySelector('[data-rep="0"]');
            if(zeroBtn) zeroBtn.classList.add('active');
            mvEl.querySelectorAll('[data-mv]').forEach(function(btn){
              btn.addEventListener('click',function(){
                var rep = Number(btn.getAttribute('data-rep'));
                selectedMvReps[mi]=rep;
                mvEl.querySelectorAll('[data-mv]').forEach(function(b){b.classList.remove('active');});
                btn.classList.add('active');
                for(var ni=mi+1; ni<it.wodMoves.length; ni++){
                  selectedMvReps[ni]=0;
                  var nextEl=document.getElementById('wod_mv_'+it.key+'_'+ni);
                  if(nextEl){
                    nextEl.querySelectorAll('[data-mv]').forEach(function(b){b.classList.remove('active');});
                    var z=nextEl.querySelector('[data-rep="0"]'); if(z) z.classList.add('active');
                  }
                }
                updatePreview();
              });
            });
          });
        }

        var timeSel = document.getElementById('wod_time_'+it.key);
        if(timeSel) timeSel.addEventListener('change',updatePreview);

        var rpeEl = document.getElementById('wod_rpe_'+it.key);
        if(rpeEl){
          rpeEl.querySelectorAll('[data-rpe]').forEach(function(btn){
            btn.addEventListener('click',function(){
              selectedRpe = Number(btn.getAttribute('data-rpe'));
              rpeEl.querySelectorAll('[data-rpe]').forEach(function(b){b.classList.remove('active');});
              btn.classList.add('active');
              updatePreview();
            });
          });
        }

        updatePreview();
      })(item);

    } else {
      var suggestedNum = parseLoad(item.suggested)||0;
      var suggestedDisplay = suggestedNum?suggestedNum:"";

      // Label cible reps pour affichage
      var repLabel = item.targetMin===item.targetMax
        ? item.targetMin+" reps"
        : item.targetMin+"–"+item.targetMax+" reps";

      var safeKey = escHtml(item.key);
      var loadValue = escHtml(getGuidedResult(item.key,'load',suggestedDisplay));
      var defaultReps = Math.round((item.targetMin + item.targetMax) / 2);
      var currentReps = Number(getGuidedResult(item.key,'reps',defaultReps)) || defaultReps;
      var currentRpe = Number(getGuidedResult(item.key,'rpe',8)) || 8;

      card.innerHTML=
        '<div class="sf-header">'+
          '<div class="sf-name">'+item.name+'</div>'+
          (suggestedNum?'<div class="sf-badge">'+suggestedNum+' lb · '+repLabel+'</div>':'')+
        '</div>'+
        '<div class="results-step-control results-load-step">'+
          '<span class="sf-label">POIDS</span>'+
          '<div class="results-step-row results-load-row">'+
            '<button type="button" class="results-step-btn minus" data-key="'+safeKey+'" data-exercise="'+escHtml(item.name||item.key)+'" data-results-step="load" data-step="-5">−</button>'+
            '<div class="sf-weight-wrap">'+
              '<span class="sf-weight-unit">lb</span>'+
              '<input class="sf-input sf-weight-input" '+
                'data-key="'+safeKey+'" data-field="load" '+
                'type="number" inputmode="decimal" '+
                'value="'+loadValue+'" '+
                'placeholder="'+(suggestedNum||0)+'"/>'+
            '</div>'+
            '<button type="button" class="results-step-btn plus" data-key="'+safeKey+'" data-exercise="'+escHtml(item.name||item.key)+'" data-results-step="load" data-step="5">+</button>'+
          '</div>'+
        '</div>'+
        '<div class="results-step-grid">'+
          '<div class="results-step-control reps-step">'+
            '<span class="sf-label">REPS — cible '+repLabel+'</span>'+
            '<div class="results-step-row">'+
              '<button type="button" class="results-step-btn minus" data-key="'+safeKey+'" data-results-step="reps" data-step="-1" data-min="0">−</button>'+
              '<input class="sf-input sf-reps-input results-mini-input" data-key="'+safeKey+'" data-field="reps" type="number" inputmode="numeric" min="0" step="1" value="'+escHtml(guidedNumberText(currentReps))+'"/>'+
              '<button type="button" class="results-step-btn plus" data-key="'+safeKey+'" data-results-step="reps" data-step="1" data-min="0">+</button>'+
            '</div>'+
          '</div>'+
          '<div class="results-step-control rpe-step">'+
            '<span class="sf-label">RPE</span>'+
            '<div class="results-step-row">'+
              '<button type="button" class="results-step-btn minus" data-key="'+safeKey+'" data-results-step="rpe" data-step="-0.5" data-min="1" data-max="10">−</button>'+
              '<input class="sf-input sf-rpe-input results-mini-input" data-key="'+safeKey+'" data-field="rpe" type="number" inputmode="decimal" min="1" max="10" step="0.5" value="'+escHtml(guidedNumberText(currentRpe))+'"/>'+
              '<button type="button" class="results-step-btn plus" data-key="'+safeKey+'" data-results-step="rpe" data-step="0.5" data-min="1" data-max="10">+</button>'+
            '</div>'+
          '</div>'+
        '</div>';
    }

    container.appendChild(card);

    if(!item.isWod){
      // ── Résultats compacts : poids / reps / RPE en contrôles − valeur + ──
      function syncResultField(field, value){
        setGuidedResult(item.key, field, value);
      }

      card.querySelectorAll('[data-results-step]').forEach(function(btn){
        btn.addEventListener('click',function(){
          var field=btn.getAttribute('data-results-step');
          var step=Number(btn.getAttribute('data-step'))||0;
          var selector='.sf-input[data-field="'+field+'"]';
          var inp=card.querySelector(selector);
          if(!inp)return;

          var current;
          if(field==='load'){
            current=parseLoad(inp.value)||parseLoad(item.suggested)||0;
            inp.value=nextLoadForExercise(item.name||item.key, current, step<0?-1:1, item.suggested||item.load);
          } else {
            current=Number(inp.value)||0;
            var min=btn.getAttribute('data-min');
            var max=btn.getAttribute('data-max');
            var next=current+step;
            if(min!==null&&min!==''&&!isNaN(Number(min))) next=Math.max(Number(min),next);
            if(max!==null&&max!==''&&!isNaN(Number(max))) next=Math.min(Number(max),next);
            inp.value=guidedNumberText(next);
          }
          syncResultField(field, inp.value);
        });
      });

      card.querySelectorAll('.sf-input[data-key][data-field]').forEach(function(inp){
        inp.addEventListener('input',function(){ syncResultField(inp.getAttribute('data-field'), inp.value); });
        inp.addEventListener('change',function(){
          var field=inp.getAttribute('data-field');
          if(field==='load'){
            var n=parseLoad(inp.value);
            if(n!==null&&n!==undefined){
              var rounded=roundLoadForExercise(item.name||item.key, n, 'nearest', item.suggested||item.load);
              if(rounded!==null&&rounded!==undefined) inp.value=guidedNumberText(rounded);
            }
          }
          syncResultField(field, inp.value);
        });
      });
    }
  });
}

function collectSessionResults(){
  var results={};
  var scope=$("sessionFields")||document;
  scope.querySelectorAll(".sf-input").forEach(function(inp){
    var key=inp.getAttribute("data-key"),field=inp.getAttribute("data-field");
    if(!key||!field)return;
    var val=String(inp.value||"").trim();
    if(!val)return;
    if(!results[key])results[key]={};
    results[key][field]=val;
  });
  Object.keys(guidedResultCache||{}).forEach(function(key){
    var r=guidedResultCache[key]||{};
    Object.keys(r).forEach(function(field){
      var val=String(r[field]||"").trim();
      if(!val)return;
      if(!results[key])results[key]={};
      results[key][field]=val;
    });
  });
  return results;
}

function resolveMovementKey(key){
  var mvKey=null;
  var cleanKey=chargeKeyFromName(key);
  Object.keys(movements).forEach(function(k){
    if(k===key || k===cleanKey || movements[k].name===key || movements[k].name===cleanKey){mvKey=k;}
  });
  return mvKey;
}

function updateRefsFromResults(results,dateStr){
  dateStr = dateStr || new Date().toLocaleDateString("fr-CA");
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    var load=parseLoad(r.load),reps=Number(r.reps)||0;
    if(!load||!reps)return;
    var mvKey=resolveMovementKey(key);
    if(!mvKey)return;
    var refK=refKey(mvKey,reps);
    var existing=state.movementRefs[refK];
    if(!existing||load>=existing.load){
      state.movementRefs[refK]={
        movement:mvKey,range:repRange(reps),load:load,reps:reps,
        date:dateStr,lastActual:load,
        status:Number(r.rpe)>=9?"hard":"success",quality:"clean",
        rpe:Number(r.rpe)||8,note:"Saisi depuis l’app"
      };
    }
    // Enregistrer RPE dans l'historique pour progression automatique
    var rpeKey=refK;
    if(!state.rpeHistory[rpeKey])state.rpeHistory[rpeKey]=[];
    state.rpeHistory[rpeKey].push(Number(r.rpe)||8);
    // Garder seulement les 3 dernières
    if(state.rpeHistory[rpeKey].length>3)state.rpeHistory[rpeKey].shift();
  });
}


function historyDeleteUid(s){
  var n=normalizeRemoteSession(s||{});
  var id=sessionUid(n);
  if(id && id.replace(/\|/g,"").trim()) return id;
  return [
    s.uid||"",
    s.date||"",
    s.time||"",
    s.semaine||s.week||"",
    s.jour||s.day||"",
    s.focus||"",
    JSON.stringify(s.results||s.resultats||{})
  ].join("|");
}
function sameHistorySession(a,b){
  return historyDeleteUid(a) === historyDeleteUid(b);
}

function sessionUid(s){
  if(!s)return "";
  return [s.date||"",s.time||"",s.semaine||s.week||"",s.jour||s.day||"",s.focus||""].join("|");
}
function normalizeRemoteSession(s){
  var r=s&&s.resultats?s.resultats:(s&&s.results?s.results:{});
  return {
    date:s.date||"",
    time:s.time||"",
    week:s.semaine||s.week||state.week,
    day:s.jour||s.day||state.day,
    focus:s.focus||"",
    results:r||{},
    version:s.version||"remote"
  };
}
function mergeHistory(localHistory,remoteData){
  var map={},merged=[];
  (localHistory||[]).forEach(function(s){var n=normalizeRemoteSession(s),id=sessionUid(n);if(id&&!map[id]){map[id]=true;merged.push(n);}});
  (remoteData||[]).forEach(function(s){var n=normalizeRemoteSession(s),id=sessionUid(n);if(id&&!map[id]){map[id]=true;merged.push(n);}});
  merged.sort(function(a,b){return String((a.date||"")+" "+(a.time||"")).localeCompare(String((b.date||"")+" "+(b.time||"")));});
  return merged;
}
function rebuildRefsFromHistory(){
  state.movementRefs=copy(PRELOADED_REFS);
  state.rpeHistory={};
  state.athleteState={movements:{},updatedAt:null,version:APP_VERSION};
  (state.history||[]).forEach(function(s){
    var res=s.results||s.resultats||{};
    updateRefsFromResults(res,s.date||new Date().toLocaleDateString("fr-CA"));
    updateAthleteStateFromResults(res,s.date||new Date().toLocaleDateString("fr-CA"));
  });
  checkDeloadAlert();
}

// ─── Progression automatique basée sur RPE ────────────────────────────────────
// RPE ≤ 7 sur 2 séances → +5 lb suggéré
// RPE 8    → progression normale selon cycle
// RPE ≥ 9  sur 2 séances → maintien
// RPE 10   deux fois → alerte deload

function getRpeAdjustment(mvKey, reps){
  var rpeKey = refKey(mvKey, reps);
  var hist = state.rpeHistory[rpeKey];
  var name=(movements[mvKey]&&movements[mvKey].name)||mvKey;
  if(isTechnicalMovement(name))return {adj:0,signal:"technique",arrow:"",color:"var(--yellow)",msg:"Technique : pas d’auto-progression."};
  if(!hist||!hist.length) return { adj:0, signal:"normal", arrow:"" };
  var last=Number(hist[hist.length-1])||0;
  if(last>=9.5)return { adj:0, signal:"deload", arrow:"⚠", color:"var(--red)", msg:"RPE très élevé : hausse bloquée." };
  if(last>=9)return { adj:0, signal:"hard", arrow:"→", color:"var(--yellow)", msg:"Maintien : dernier RPE ≥ 9." };
  if(isIsolationMovement(name)&&last>=8.5)return { adj:0, signal:"isolation_hard", arrow:"→", color:"var(--yellow)", msg:"Isolation RPE ≥ 8.5 : maintien." };
  if(hist.length<2) return { adj:0, signal:"normal", arrow:"" };
  var last2 = hist.slice(-2);
  var avg = (last2[0]+last2[1])/2;
  if(avg<=7)  return { adj:+5,  signal:"easy",    arrow:"↑", color:"var(--green)",  msg:"+5 lb possible (RPE facile)" };
  return              { adj:0,   signal:"normal",  arrow:"",  color:"",              msg:"" };
}

function checkDeloadAlert(){
  // Si 3+ mouvements principaux ont RPE ≥ 9 sur 2 séances consécutives → alerte globale
  var mainMvKeys = Object.keys(movements).filter(function(k){ return movements[k].profile; });
  var highRpeCount = 0;
  mainMvKeys.forEach(function(k){
    var rng = repRange(focus().targetReps[weekIdx()]||8);
    var rpeKey = k+"__"+rng;
    var hist = state.rpeHistory[rpeKey];
    if(hist&&hist.length>=2&&hist.slice(-2).every(function(r){return r>=9;})) highRpeCount++;
  });
  state.deloadAlert = highRpeCount >= 2;
  save();
}

// ─── Résumé post-séance ───────────────────────────────────────────────────────

function buildSessionSummary(results){
  var lines=[], prLines=[], totalExercises=0, rpeSum=0, rpeCount=0;
  var autoPrLines=[];
  Object.keys(results).forEach(function(key){
    var r=results[key];
    if(r.isWod||!r.load)return;
    totalExercises++;
    var rpe=Number(r.rpe)||8; rpeSum+=rpe; rpeCount++;
    var load=parseLoad(r.load);
    // Comparer avec la dernière séance
    var mvKey=key;
    var reps=Number(r.reps)||8;
    var refK=refKey(mvKey,reps);
    var prev=state.movementRefs[refK];
    var prevLoad=prev?prev.lastActual:0;
    var arrow="";
    if(prevLoad&&load>prevLoad) arrow=" ↑ +"+round5(load-prevLoad)+" lb 🟢";
    else if(prevLoad&&load<prevLoad) arrow=" ↓ "+round5(load-prevLoad)+" lb 🔴";
    var name=movements[key]?movements[key].name:key;
    lines.push(name+" : "+load+" lb × "+reps+(arrow?"  "+arrow:"")+(rpe?" | RPE "+rpe:""));
    if(arrow.indexOf("↑")>=0) prLines.push(name);
    if(r.autoPr){
      autoPrLines.push((r.prLabel||name)+" : "+(r.prOld? r.prOld+" → ":"")+r.prNew+" lb × "+r.prReps);
    }
  });
  var avgRpe = rpeCount>0 ? Math.round(rpeSum/rpeCount*10)/10 : 8;
  var rpeSignal = avgRpe<=7?"💚 Léger":avgRpe<=8?"✅ Bon":avgRpe<=8.5?"🟡 Solide":avgRpe<=9?"🟠 Intense":"🔴 Très dur";
  return {
    lines: lines,
    prLines: prLines,
    avgRpe: avgRpe,
    rpeSignal: rpeSignal,
    totalExercises: totalExercises,
    autoPrLines: autoPrLines
  };
}

function showSessionSummaryModal(summary){
  // Supprimer modal existant
  var existing=document.getElementById("summaryModal");
  if(existing)existing.remove();

  var autoPrSection = summary.autoPrLines&&summary.autoPrLines.length>0
    ? '<div class="modal-pr">🏆 Nouveau PR automatique : '+summary.autoPrLines.join(" · ")+'</div>'
    : '';
  var prSection = summary.prLines.length>0
    ? '<div class="modal-pr">🏆 Progression : '+summary.prLines.join(", ")+'</div>'
    : '';

  // Vérifier si on peut avancer de semaine
  var weekAdvanceHtml = "";
  if(canAdvanceWeek()){
    weekAdvanceHtml = '<div class="modal-advance">'+
      '<p>✅ Tu as complété les '+currentDayOrder().length+' jours de la semaine '+state.week+' !</p>'+
      '<button id="advanceWeekBtn" class="btn-accent" style="width:100%;margin-top:8px">Passer à S'+(state.week+1)+' →</button>'+
    '</div>';
  }

  var deloadHtml = state.deloadAlert
    ? '<div class="modal-deload">⚠️ Ton RPE moyen est élevé sur plusieurs séances. Considère un deload cette semaine ou la prochaine.</div>'
    : '';

  var modal = document.createElement("div");
  modal.id = "summaryModal";
  modal.className = "summary-modal";
  modal.innerHTML =
    '<div class="summary-modal-inner">'+
      '<div class="summary-modal-title">📊 Résumé de la séance</div>'+
      '<div class="summary-modal-sub">'+currentDayLabel()+' S'+state.week+' · RPE moyen '+summary.avgRpe+' '+summary.rpeSignal+'</div>'+
      autoPrSection+
      prSection+
      deloadHtml+
      '<div class="summary-lines">'+
        summary.lines.map(function(l){return'<div class="summary-line">'+l+'</div>';}).join("")+
      '</div>'+
      weekAdvanceHtml+
      '<button id="closeSummaryBtn" class="btn-ghost" style="width:100%;margin-top:12px">Fermer</button>'+
    '</div>';
  document.body.appendChild(modal);
  setTimeout(function(){modal.classList.add("visible");},30);

  document.getElementById("closeSummaryBtn").onclick = function(){
    modal.classList.remove("visible");
    setTimeout(function(){modal.remove();},300);
  };
  var adv = document.getElementById("advanceWeekBtn");
  if(adv) adv.onclick = function(){
    advanceWeek("Semaine complétée/traitée");
    modal.classList.remove("visible");
    setTimeout(function(){modal.remove();},300);
  };
}

// ─── Avancement automatique de semaine ───────────────────────────────────────

function markDayCompleted(day){
  if(state.completedDays.indexOf(day)<0){
    state.completedDays.push(day);
    state.missedDays=(state.missedDays||[]).filter(function(x){return !(x&&x.day===day&&Number(x.week)===Number(state.week)&&x.cycle===activeProgramId());});
    state.cycleState=buildCycleStatePayload();
    save();
  }
}

function markDayMissed(day, reason){
  reason=String(reason||"").trim();
  if(!reason)return false;
  state.missedDays=state.missedDays||[];
  state.missedDays=state.missedDays.filter(function(x){return !(x&&x.day===day&&Number(x.week)===Number(state.week)&&x.cycle===activeProgramId());});
  state.missedDays.push({week:state.week,day:day,cycle:activeProgramId(),reason:reason,date:new Date().toLocaleDateString("fr-CA"),actualDate:new Date().toLocaleDateString("fr-CA"),actualDayName:actualDayName()});
  state.cycleState=buildCycleStatePayload();
  save();
  render();
  if(getToken())savePersistentStateToGitHub(getToken());
  return true;
}

function canAdvanceWeek(){
  var tw = totalWeeks();
  if(state.week >= tw) return false;
  return missingDaysForWeek().length===0;
}

function advanceWeek(reason){
  var tw = totalWeeks();
  if(state.week < tw){
    var fromWeek=state.week, fromCompleted=(state.completedDays||[]).slice(), fromMissed=(state.missedDays||[]).filter(function(x){return x&&Number(x.week)===Number(fromWeek)&&x.cycle===activeProgramId();});
    state.weekTransitions=state.weekTransitions||[];
    state.weekTransitions.push({cycle:activeProgramId(),fromWeek:fromWeek,toWeek:fromWeek+1,completedDays:fromCompleted,missedDays:fromMissed,reason:reason||"Semaine traitée",date:new Date().toLocaleDateString("fr-CA"),actualDayName:actualDayName()});
    state.week++;
    state.completedDays = [];
    state.cycleState=buildCycleStatePayload();
    save();
    if(getToken())savePersistentStateToGitHub(getToken());
    render();
    renderWeekProgress();
  }
}

function requestMarkCurrentDayMissed(){
  if(isDayCompleted(state.day)){alert("Cette séance est déjà complétée.");return;}
  var reason=prompt("Pourquoi marquer "+dayLabel(state.day)+" comme manqué?", "Horaire impossible");
  if(reason===null)return;
  if(!String(reason).trim()){alert("Raison obligatoire.");return;}
  markDayMissed(state.day,reason);
}
function requestAdvanceWeek(){
  if(state.week>=totalWeeks()){alert("Tu es déjà à la dernière semaine du cycle.");return;}
  var missing=missingDaysForWeek();
  if(missing.length){
    var labels=missing.map(dayLabel).join(", ");
    var reason=prompt("Jours non traités : "+labels+". Raison pour passer quand même?", "Semaine incomplète — horaire impossible");
    if(reason===null)return;
    if(!String(reason).trim()){alert("Raison obligatoire.");return;}
    missing.forEach(function(d){ markDayMissed(d,reason); });
    advanceWeek(reason);
  }else{
    advanceWeek("Semaine complétée/traitée");
  }
}

// ─── Wake Lock — empêcher l'écran de se mettre en veille ─────────────────────

var wakeLock = null;
var wakeLockWanted = false;
var guidedWakeLockAuto = false;

function updateWakeLockButton(active, unsupported){
  var buttons=[];
  var main=$("wakeLockBtn");
  if(main)buttons.push(main);
  var wodPlus=$("wodPlusWakeBtn");
  if(wodPlus)buttons.push(wodPlus);
  if(!buttons.length)return;
  buttons.forEach(function(btn){
    if(unsupported){
      btn.textContent="⚠️ Écran non supporté";
      btn.classList.remove("active");
      return;
    }
    btn.textContent=active?"🔆 Écran actif":"💤 Écran";
    btn.classList.toggle("active",!!active);
  });
}

async function requestWakeLock(){
  wakeLockWanted = true;
  try{
    if(!("wakeLock" in navigator)){
      updateWakeLockButton(false,true);
      return false;
    }
    if(wakeLock){
      updateWakeLockButton(true,false);
      return true;
    }
    wakeLock = await navigator.wakeLock.request("screen");
    if(wakeLock && wakeLock.addEventListener){
      wakeLock.addEventListener("release",function(){
        wakeLock=null;
        if(wakeLockWanted && document.visibilityState==="visible"){
          setTimeout(function(){ requestWakeLock(); },250);
        }else{
          updateWakeLockButton(false,false);
        }
      });
    }
    updateWakeLockButton(true,false);
    return true;
  }catch(e){
    updateWakeLockButton(false,false);
    return false;
  }
}

function releaseWakeLock(){
  wakeLockWanted = false;
  if(wakeLock){try{wakeLock.release();}catch(e){}wakeLock=null;}
  updateWakeLockButton(false,false);
}

// Re-acquérir si l'app revient au premier plan pendant une séance ou si l'utilisateur l'a demandé.
document.addEventListener("visibilitychange",function(){
  if(document.visibilityState==="visible" && wakeLockWanted && wakeLock===null){
    requestWakeLock();
  }
});

// volontairement neutralisé.
// Les résultats ne doivent plus réécrire les charges locales ou charges.js.
// - charges.js = configuration stable / équipement / charges de départ
// - data/resultats.json = journal brut
// - PR/historique = capacité déjà prouvée et upgrades
function updateCustomChargesFromResults(results){
  return false;
}

function buildSessionPayload(results){
  return{
    version:APP_VERSION,
    date:new Date().toLocaleDateString("fr-CA"),
    time:new Date().toLocaleTimeString("fr-CA"),
    semaine:state.week,
    jour:state.day,
    plannedDay:state.day,
    actualDate:new Date().toLocaleDateString("fr-CA"),
    actualDayName:actualDayName(),
    cycle:state.cycle&&state.cycle.goal?state.cycle.goal:null,
    focus:focus().label,
    cycleState:buildCycleStatePayload(),
    resultats:results
  };
}

// Génère le contenu du fichier charges.js mis à jour avec les nouveaux poids
// supprimé/neutralisé : l'app ne doit jamais écrire charges.js automatiquement.
// charges.js est la seule configuration de charges. Les upgrades viennent des PR/historique.
function buildChargesJsContent(){ return ""; }
async function saveChargesToGitHub(token){
  return {ok:false,msg:"Désactivé : les charges stables ne sont pas modifiées automatiquement."};
}



// ─── Statut sync GitHub discret ─────────────────────────────────────────────
var SYNC_STATUS_KEY = "coachBeurt.syncStatus";
function syncStatusDefault(){return {state:getToken()?"pending":"missing",message:getToken()?"Sync non vérifiée":"Token absent",lastOk:null,lastTry:null};}
function readSyncStatus(){
  try{
    var raw=localStorage.getItem(SYNC_STATUS_KEY);
    if(raw){return Object.assign(syncStatusDefault(), JSON.parse(raw)||{});}
  }catch(e){}
  return syncStatusDefault();
}
function writeSyncStatus(stateName,message){
  var st=readSyncStatus();
  st.state=stateName||st.state||"pending";
  st.message=message||st.message||"";
  st.lastTry=nowIso();
  if(st.state==="ok")st.lastOk=st.lastTry;
  try{localStorage.setItem(SYNC_STATUS_KEY,JSON.stringify(st));}catch(e){}
  renderSyncStatusIndicator();
  return st;
}
function syncDateLabel(iso){
  if(!iso)return "jamais";
  var d=new Date(iso); if(isNaN(d.getTime()))return String(iso).slice(0,16);
  var diff=Math.max(0,Date.now()-d.getTime());
  var min=Math.floor(diff/60000);
  if(min<1)return "à l’instant";
  if(min<60)return "il y a "+min+" min";
  var h=Math.floor(min/60); if(h<24)return "il y a "+h+" h";
  return d.toLocaleDateString("fr-CA");
}
function renderSyncStatusIndicator(){
  var el=$("syncStatusDot"); if(!el)return;
  var st=readSyncStatus();
  var cls="sync-dot ";
  var text="sync";
  if(st.state==="ok"){cls+="ok";text="●";}
  else if(st.state==="error"){cls+="err";text="●";}
  else if(st.state==="missing"){cls+="missing";text="○";}
  else{cls+="pending";text="◐";}
  el.className=cls;
  el.textContent=text;
  var lastOk=syncDateLabel(st.lastOk);
  el.title=(st.state==="ok"?"Synchro OK ":st.state==="error"?"Synchro en erreur ":st.state==="missing"?"Token GitHub absent ":"Synchro non vérifiée ")+
    "· dernière réussite : "+lastOk+(st.message?" · "+st.message:"");
}
function openSyncSettings(){
  switchView("settings");
  var s=$("tokenStatus");
  var st=readSyncStatus();
  if(s){s.textContent=(st.state==="ok"?"✅ ":st.state==="error"?"❌ ":"⚠ ")+(st.message||"Statut GitHub")+" · dernière réussite : "+syncDateLabel(st.lastOk);s.className="status-msg "+(st.state==="ok"?"ok":"err");}
}

// ─── GitHub API helpers ─────────────────────────────────────────────────────
// helpers GitHub globaux. Sans elles, le test token/PR plante.
function githubHeaders(token){
  return {
    "Authorization":"Bearer "+token,
    "Accept":"application/vnd.github+json",
    "X-GitHub-Api-Version":"2022-11-28"
  };
}
async function githubErrorMessage(resp){
  var msg=resp.status+" "+(resp.statusText||"");
  try{
    var j=await resp.json();
    if(j&&j.message)msg += " — "+j.message;
  }catch(e){}
  return msg;
}
function githubEncodeContent(text){
  return btoa(unescape(encodeURIComponent(String(text||""))));
}
function githubDecodeContent(content){
  return decodeURIComponent(escape(atob(String(content||"").replace(/\n/g,""))));
}
async function readGithubJsonFile(token,path){
  var url="https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/contents/"+path;
  try{
    var resp=await fetch(url,{headers:githubHeaders(token)});
    if(resp.status===404)return{ok:false,missing:true,msg:path+" introuvable"};
    if(!resp.ok)return{ok:false,missing:false,msg:await githubErrorMessage(resp)};
    var j=await resp.json();
    var txt=githubDecodeContent(j.content||"");
    var data;
    try{data=JSON.parse(txt||"null");}
    catch(e){return{ok:false,missing:false,msg:path+" contient du JSON invalide : "+e.message};}
    return{ok:true,missing:false,sha:j.sha,data:data,text:txt};
  }catch(e){return{ok:false,missing:false,msg:"Erreur réseau : "+e.message};}
}
async function writeGithubFile(token,path,text,message,sha){
  var url="https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO+"/contents/"+path;
  var body={message:message||("Mise à jour "+path),content:githubEncodeContent(text)};
  if(sha)body.sha=sha;
  try{
    var resp=await fetch(url,{method:"PUT",headers:Object.assign(githubHeaders(token),{"Content-Type":"application/json"}),body:JSON.stringify(body)});
    if(resp.ok){var j=await resp.json();return{ok:true,sha:j.content&&j.content.sha?j.content.sha:null,msg:"OK"};}
    return{ok:false,msg:await githubErrorMessage(resp)};
  }catch(e){return{ok:false,msg:"Erreur réseau : "+e.message};}
}

async function ensureResultatsFile(token){
  var r=await readGithubJsonFile(token,GITHUB_FILE);
  if(r.ok)return{ok:true,msg:"resultats.json OK",sha:r.sha,data:Array.isArray(r.data)?r.data:[]};
  if(!r.missing)return{ok:false,msg:r.msg};
  var init=await writeGithubFile(token,GITHUB_FILE,"[]","Création initiale de resultats.json",null);
  if(!init.ok)return{ok:false,msg:"Création resultats.json impossible : "+init.msg};
  var r2=await readGithubJsonFile(token,GITHUB_FILE);
  return{ok:true,msg:"resultats.json créé",sha:r2.sha,data:[]};
}


async function ensureJsonFile(token,path,initialValue,message){
  var r=await readGithubJsonFile(token,path);
  if(r.ok)return{ok:true,msg:path+" OK",sha:r.sha,data:r.data};
  if(!r.missing)return{ok:false,msg:r.msg};
  var initText=JSON.stringify(initialValue,null,2);
  var init=await writeGithubFile(token,path,initText,message||("Création "+path),null);
  if(!init.ok)return{ok:false,msg:"Création "+path+" impossible : "+init.msg};
  var r2=await readGithubJsonFile(token,path);
  return{ok:true,msg:path+" créé",sha:r2.sha,data:initialValue};
}
async function saveJsonDataFile(token,path,data,message){
  var r=await readGithubJsonFile(token,path);
  var sha=r.ok?r.sha:null;
  if(!r.ok&&!r.missing)return{ok:false,msg:r.msg};
  return await writeGithubFile(token,path,JSON.stringify(data,null,2),message,sha);
}
async function savePersistentStateToGitHub(token){
  if(!token)return{ok:false,msg:"Token manquant"};
  var cycle=buildCycleStatePayload();
  state.cycleState=cycle;
  var c=await saveJsonDataFile(token,CYCLE_STATE_FILE,cycle,"Mise à jour cycle_state — "+new Date().toLocaleDateString("fr-CA"));
  if(!c.ok)return{ok:false,msg:"cycle_state : "+c.msg};
  return{ok:true,msg:"cycle_state OK"};
}

async function saveToGitHub(payload){
  var token=getToken();
  if(!token){return{ok:false,msg:"❌ Token GitHub manquant. Va dans Paramètres ⚙ pour le saisir."};}
  var r=await readGithubJsonFile(token,GITHUB_FILE);
  var sha=null,existingData=[];
  if(r.ok){sha=r.sha;existingData=Array.isArray(r.data)?r.data:[];}
  else if(r.missing){existingData=[];}
  else{return{ok:false,msg:"❌ Lecture resultats.json échouée : "+r.msg};}

  existingData.push(payload);
  var w=await writeGithubFile(token,GITHUB_FILE,JSON.stringify(existingData,null,2),"Séance "+payload.date+" — "+payload.jour+" S"+payload.semaine,sha);
  if(w.ok){writeSyncStatus("ok","Séance sauvegardée sur GitHub");return{ok:true,msg:"✅ Séance sauvegardée sur GitHub !"};}
  writeSyncStatus("error","Sauvegarde resultats.json échouée : "+w.msg);
  return{ok:false,msg:"❌ Sauvegarde resultats.json échouée : "+w.msg};
}

async function testGithubToken(){
  var inp=$("githubToken");
  var token=(inp&&inp.value.trim())||getToken();
  var s=$("tokenStatus");
  if(!token){if(s){s.textContent="Token vide.";s.className="status-msg err";}return;}
  setToken(token);
  if(s){s.textContent="Test GitHub en cours...";s.className="status-msg";}
  try{
    var repoResp=await fetch("https://api.github.com/repos/"+GITHUB_OWNER+"/"+GITHUB_REPO,{headers:githubHeaders(token)});
    if(!repoResp.ok){var gm=await githubErrorMessage(repoResp);writeSyncStatus("error","Repo inaccessible : "+gm);if(s){s.textContent="❌ Repo inaccessible : "+gm;s.className="status-msg err";}return;}

    var ensure=await ensureResultatsFile(token);
    if(!ensure.ok){if(s){s.textContent="❌ "+ensure.msg;s.className="status-msg err";}return;}
    var cyc=await ensureJsonFile(token,CYCLE_STATE_FILE,buildCycleStatePayload(),"Création cycle_state.json");
    if(!cyc.ok){if(s){s.textContent="❌ "+cyc.msg;s.className="status-msg err";}return;}

    writeSyncStatus("ok","Token OK · repo accessible");
    if(s){s.textContent="✅ Token OK · repo accessible · resultats + cycle_state OK";s.className="status-msg ok";}
  }catch(e){
    writeSyncStatus("error","Erreur réseau/test : "+e.message);
    if(s){s.textContent="❌ Erreur réseau/test : "+e.message;s.className="status-msg err";}
  }
}

async function syncHistoryFromGitHub(silent){
  var token=getToken();
  var status=$("tokenStatus")||$("saveStatus");
  if(!token){writeSyncStatus("missing","Token GitHub manquant");if(!silent&&status){status.textContent="Token GitHub manquant.";status.className="status-msg err";}return{ok:false,msg:"Token manquant"};}
  writeSyncStatus("pending","Synchronisation GitHub en cours");
  if(!silent&&status){status.textContent="Synchronisation GitHub en cours...";status.className="status-msg";}
  try{
    var ensure=await ensureResultatsFile(token);
    if(!ensure.ok){writeSyncStatus("error","Sync impossible : "+ensure.msg);if(!silent&&status){status.textContent="❌ Sync impossible : "+ensure.msg;status.className="status-msg err";}return{ok:false,msg:ensure.msg};}
    var before=(state.history||[]).length;
    state.history=mergeHistory(state.history||[],Array.isArray(ensure.data)?ensure.data:[]);
    rebuildRefsFromHistory();
    try{
      var cyc=await readGithubJsonFile(token,CYCLE_STATE_FILE);
      if(cyc.ok&&cyc.data)applyCycleStatePayload(cyc.data);
    }catch(e){}
    save();
    renderHistory();renderWorkout();renderReferences();renderWeekProgress();
    var added=state.history.length-before;
    var msg="✅ Sync GitHub OK · "+state.history.length+" séance"+(state.history.length>1?"s":"")+" chargée"+(added>0?" · +"+added:"");
    writeSyncStatus("ok",msg.replace(/^✅\s*/,""));
    if(!silent&&status){status.textContent=msg;status.className="status-msg ok";}
    return{ok:true,msg:msg,added:added,total:state.history.length};
  }catch(e){
    writeSyncStatus("error","Sync GitHub : "+e.message);
    if(!silent&&status){status.textContent="❌ Sync GitHub : "+e.message;status.className="status-msg err";}
    return{ok:false,msg:e.message};
  }
}

function autoSyncFromGitHub(){
  if(!getToken()){writeSyncStatus("missing","Token GitHub absent");return;}
  // Petit délai : laisse la page finir son rendu avant de parler à GitHub.
  setTimeout(function(){syncHistoryFromGitHub(true);},800);
}

function returnFromResultsToWod(){
  guidedResultsMode=false;
  document.body.classList.remove("guided-results-active");
  document.body.classList.remove("results-view-active");
  guidedLaunchSource="wodplus";
  switchView("training");
  renderWorkout();
}

function setupSessionSave(){
  var back=$("sessionBackPcBtn");
  if(back)back.onclick=returnFromResultsToWod;
  var backTop=$("resultsBackPcTopBtn");
  if(backTop)backTop.onclick=returnFromResultsToWod;
  var btn=$("saveSessionBtn");if(!btn)return;
  btn.onclick=async function(){
    resumeAudio();
    var results=collectSessionResults();
    var hasData=Object.keys(results).length>0;
    if(!hasData){var s=$("saveStatus");if(s){s.textContent="Aucun résultat saisi.";s.className="session-note";}return;}
    btn.disabled=true;btn.textContent="Envoi en cours...";
    results=enrichSessionResults(results);
    var autoPrUpdates=detectAndApplyAutomaticPr(results,todayDateString());
    var payload=buildSessionPayload(results);
    if(autoPrUpdates.length)payload.autoPrUpdates=autoPrUpdates;
    // 1. Mettre à jour références + historique RPE
    updateRefsFromResults(results);
    updateAthleteStateFromResults(results,payload.date);
    // 2. Ne plus modifier les charges locales depuis les résultats :    // charges.js et les charges locales sont une configuration/équipement, pas une capacité réelle.
    // Les upgrades viennent de ce qui a été réellement dépassé dans l’historique/PR.
    // updateCustomChargesFromResults(results);
    // 3. Marquer le jour complété
    markDayCompleted(state.day);
    // 4. Vérifier alerte deload
    checkDeloadAlert();
    // 5. Ajouter à l'historique local
    state.history.push({date:payload.date,time:payload.time,week:state.week,day:state.day,plannedDay:state.day,actualDate:payload.actualDate,actualDayName:payload.actualDayName,cycle:payload.cycle,focus:focus().label,results:results,version:APP_VERSION});
    save();
    if(autoPrUpdates.length){ renderProfile(); renderReferences(); }
    // 6. Envoyer séance sur GitHub
    var result=await saveToGitHub(payload);
    // 7. Sauvegarder les états persistants durables si la séance est bien écrite
    var stateMsg="";
    if(result.ok&&getToken()){
      var stateSave=await savePersistentStateToGitHub(getToken());
      stateMsg=stateSave.ok?" · niveaux/cycle ✅":" · cycle_state non sauvegardé ("+stateSave.msg+")";
    }
    // 8. Ne pas modifier charges.js automatiquement : les charges stables ne doivent pas être écrasées par une mise à jour ou une séance.
    var s=$("saveStatus");
    if(s){s.textContent=result.msg+stateMsg;s.className="session-note"+(result.ok?" ok":" err");}
    btn.disabled=false;btn.textContent="💾 Sauvegarder & envoyer sur GitHub";
    // 8. Construire et afficher le résumé
    var summary=buildSessionSummary(results);
    showSessionSummaryModal(summary);
    if(result.ok){
      renderHistory();renderWorkout();renderWeekProgress();
      if(guidedResultsMode){
        returnFromResultsToWod();
      }
    }
  };
}

// ─── Swipe ───────────────────────────────────────────────────────────────────

function setupSwipeGesture(el,cb){
  // Swipe désactivé.
  // Navigation seulement par boutons pour éviter les changements accidentels
  // de semaine/jour/cycle sur PC.
  return;
}
function setupSwipeNav(){
  // les swipes sont désactivés; seuls les boutons restent actifs.
  // Flèches semaine
  var wp=$("weekPrev"),wn=$("weekNext");
  if(wp)wp.onclick=function(){if(state.week>1){state.week--;save();render();}};
  if(wn)wn.onclick=function(){if(state.week<totalWeeks()){state.week++;save();render();}};
  // Flèches jour
  var dp=$("dayPrev"),dn=$("dayNext");
  if(dp)dp.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();render();}};
  if(dn)dn.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();render();}};
  // Flèches jour mode iPhone
  var pdp=$("phoneDayPrev"),pdn=$("phoneDayNext");
  if(pdp)pdp.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();renderPhoneWod();}};
  if(pdn)pdn.onclick=function(){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();renderPhoneWod();}};
  // Swipe vue entraînement : horizontal = semaine, vertical = jour
  setupSwipeGesture($("trainingView"),function(dir){
    if(dir==="left"&&state.week<totalWeeks()){state.week++;save();render();}
    else if(dir==="right"&&state.week>1){state.week--;save();render();}
    else if(dir==="up"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();render();}}
    else if(dir==="down"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();render();}}
  });
  // Swipe mode iPhone : horizontal = jour
  setupSwipeGesture($("phoneView"),function(dir){
    if(dir==="left"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i<days.length-1){state.day=days[i+1];save();renderPhoneWod();}}
    else if(dir==="right"){var days=currentDayOrder(),i=days.indexOf(state.day);if(i>0){state.day=days[i-1];save();renderPhoneWod();}}
  });
}

// ─── Hamburger ───────────────────────────────────────────────────────────────

function setupHamburger(){
  // V50.51 : menu hamburger fusionné dans la gear Réglages.
  // Conservé comme fonction no-op pour ne pas briser le tronc d'initialisation.
}

// ─── Rendu vue bureau (WOD) ───────────────────────────────────────────────────

function renderWeekProgress(){
  // Barre de progression semaine dans la vue entraînement
  var el=$("weekProgressBar");if(!el)return;
  var tw=totalWeeks(),w=state.week;
  var pct=Math.round(((w-1)/tw)*100);
  el.style.width=pct+"%";
  var lbl=$("weekProgressLabel");
  if(lbl){
    var days=currentDayOrder();
    var daysLeft=missingDaysForWeek().length;
    lbl.textContent="S"+w+"/"+tw+" · "+daysLeft+" jour"+(daysLeft>1?"s":"")+" à traiter cette semaine";
  }
  // Indicateur jours complétés
  var dc=$("daysCompleted");if(!dc)return;
  dc.innerHTML="";
  currentDayOrder().forEach(function(d){
    var done=isDayCompleted(d), missed=isDayMissed(d);
    var meta=currentDayMeta(d);
    var pip=document.createElement("span");
    pip.className="day-pip"+(done?" done":"")+(missed?" missed":"")+(d===state.day?" current":"");
    pip.title=((meta&&meta.label)||d)+(missed?" — manqué":"");
    dc.appendChild(pip);
  });
}

function daysToCompetition(){
  var now=new Date();
  var diff=Math.ceil((COMPETITION_DATE-now)/(1000*60*60*24));
  return Math.max(0,diff);
}


function programWeeks(id){
  var cfg=(focusConfigs&&focusConfigs[id])||{};
  return Number(cfg.durationWeeks||cfg.weeks||((cfg.weekLabels&&cfg.weekLabels.length)||0)||((cfg.sets&&cfg.sets.length)||0)||0)||0;
}
function roadmapProgramOrder(activeId){
  var compRoute=["shoulders3d","hypertrophy_base","force_performance","competition_peak"];
  if(activeId==="heritage225")return ["heritage225"];
  if(compRoute.indexOf(activeId)>=0)return compRoute.slice(compRoute.indexOf(activeId));
  return [activeId,"competition_peak"].filter(function(id,i,a){return id&&a.indexOf(id)===i;});
}
function roadmapRows(activeId, activeWeek){
  activeId=activeId||activeProgramId(); activeWeek=Number(activeWeek||state.week||1);
  var ids=roadmapProgramOrder(activeId), rows=[], cursor=new Date();
  ids.forEach(function(id,idx){
    var cfg=focusConfigs[id]||{};
    var total=programWeeks(id)||6;
    var remaining=idx===0?Math.max(0,total-activeWeek+1):total;
    var start=new Date(cursor);
    var end=new Date(cursor); end.setDate(end.getDate()+remaining*7);
    rows.push({id:id,label:cfg.label||id,totalWeeks:total,remainingWeeks:remaining,start:start,end:end,current:idx===0,phase:cfg.phase||""});
    cursor=end;
  });
  return rows;
}
function formatRoadDate(d){return d instanceof Date&&!isNaN(d.getTime())?d.toLocaleDateString("fr-CA",{month:"short",day:"numeric"}):"—";}
function roadmapSummary(){
  var rows=roadmapRows(activeProgramId(),state.week);
  var totalWeeks=rows.reduce(function(sum,r){return sum+(r.remainingWeeks||0);},0);
  var weeksToComp=Math.floor(daysToCompetition()/7);
  var margin=weeksToComp-totalWeeks;
  var status=margin>=4?"OK":margin>=1?"serré":"trop long";
  return {rows:rows,totalWeeks:totalWeeks,weeksToComp:weeksToComp,margin:margin,status:status};
}

function renderWeeks(){
  var weekInfo=buildWeekInfo();
  var w=$("weekButtons");if(!w)return;w.innerHTML="";
  var tw=totalWeeks();
  for(var k=1;k<=tw;k++){
    (function(wk){
      var info=weekInfo[wk]||{label:"S"+wk,goal:""};
      var b=document.createElement("button");
      b.textContent=info.label;
      b.className="tab"+(wk===state.week?" active":" secondary");
      // Marquer les semaines complétées
      if(wk<state.week)b.style.opacity="0.6";
      b.onclick=function(){state.week=wk;save();render();};
      w.appendChild(b);
    })(k);
  }
  var wi=weekInfo[state.week]||{label:"S"+state.week,goal:""};
  var wg=$("weekGoal");
  var cfg=focus();
  var phaseInfo=cfg.phaseName?"Phase "+cfg.phase+" — "+cfg.phaseName:"";
  var daysLeft=daysToCompetition();
  if(wg)wg.innerHTML=wi.goal+
    (phaseInfo?"<br><small style='color:var(--accent2)'>"+phaseInfo+"</small>":"")+
    "<br><small style='color:var(--muted)'>⏱ "+daysLeft+" jours avant la compétition</small>";
  renderWeekProgress();
}
function renderDays(){
  var w=$("dayButtons");if(!w)return;w.innerHTML="";
  ensureCurrentDay().forEach(function(k){
    var d=currentDayMeta(k),b=document.createElement("button");
    b.textContent=(d&&d.label)||k;b.className="tab"+(k===state.day?" active":" secondary");
    b.onclick=function(){state.day=k;save();render();};w.appendChild(b);
  });
}
// ─── Rendu WOD+ ───────────────────────────────────────────────────────────────
// V50.57: le rendu WOD+ et ses helpers HTML sont maintenant dans scripts/view_wodplus.js.
// Garder ce module chargé avant app.js dans index.html.



// ─── Rendu Vue PC ───────────────────────────────────────────────────────
// V50.54: phoneWodLoadHints() et renderPhoneWod() sont maintenant dans scripts/view_pc.js.
// Garder ce module chargé avant app.js dans index.html.



// ─── Mode séance guidé (optionnel) ──────────────────────────────────────────
// V50.58: le rendu et les contrôles de la séance guidée sont maintenant dans scripts/view_session.js.
// Garder ce module chargé avant app.js dans index.html.


// ─── Cycle ───────────────────────────────────────────────────────────────────

var previewCycleGoal = null;
var previewCycleWeek = 1;
var previewCycleDay = null;

function previewProgramId(){return previewCycleGoal || (state.cycle&&state.cycle.goal) || defaultProgramId();}
function previewCfg(){return focusConfigs[previewProgramId()] || null;}
function previewDays(){
  var cfg=previewCfg();
  var days=(cfg&&Array.isArray(cfg.days)&&cfg.days.length)?cfg.days:DEFAULT_PROGRAM_DAYS;
  return days.filter(function(d){return ALL_DAYS.indexOf(d)>=0;});
}
function previewDayMeta(day){
  var cfg=previewCfg()||{};
  var d=Object.assign({}, baseDays[day] || {label:day,base:"",focus:""});
  if(cfg.dayMeta&&cfg.dayMeta[day])d=Object.assign(d,cfg.dayMeta[day]);
  return d;
}
function previewDayLabel(day){var m=previewDayMeta(day);return (m&&m.label)||day;}
function ensurePreviewPosition(){
  var cfg=previewCfg();
  var tw=cfg&&cfg.weekLabels&&cfg.weekLabels.length?cfg.weekLabels.length:(cfg&&cfg.sets&&cfg.sets.length?cfg.sets.length:1);
  previewCycleWeek=Math.max(1,Math.min(Number(previewCycleWeek)||1,tw));
  var days=previewDays();
  if(!previewCycleDay || days.indexOf(previewCycleDay)<0)previewCycleDay=days[0]||"lundi";
}
function resetPreviewPosition(programId){
  previewCycleGoal=programId||previewCycleGoal||activeProgramId();
  previewCycleWeek=1;
  var cfg=focusConfigs[previewCycleGoal]||{};
  var days=(cfg.days&&cfg.days.length?cfg.days:DEFAULT_PROGRAM_DAYS).filter(function(d){return ALL_DAYS.indexOf(d)>=0;});
  previewCycleDay=days[0]||"lundi";
}

function snapshotCurrentCycle(reason){
  return {
    uid:"cycle_"+Date.now()+"_"+Math.random().toString(16).slice(2),
    id:activeProgramId(),
    label:(focus()&&focus().label)||activeProgramId(),
    week:state.week,
    day:state.day,
    completedDays:(state.completedDays||[]).slice(),
    missedDays:(state.missedDays||[]).slice(),
    pausedAt:nowIso(),
    reason:reason||"Changement de cycle"
  };
}
function pauseCurrentCycle(reason){
  var snap=snapshotCurrentCycle(reason);
  state.savedCycles=state.savedCycles||[];
  // Ne pas dédupliquer par id : on peut avoir plusieurs essais du même programme à des semaines différentes.
  state.savedCycles.push(snap);
}
function populateCycleGoalOptions(){
  var sel=$("cycleGoal");if(!sel)return;
  sel.innerHTML="";
  var selected=previewProgramId();
  var phaseGroups={};
  var ids = programIndexIds().filter(function(id){ return !!focusConfigs[id]; });
  ids.forEach(function(id){
    var cfg=focusConfigs[id];
    var ph=cfg.phase||0;
    if(!phaseGroups[ph])phaseGroups[ph]=[];
    phaseGroups[ph].push({id:id,cfg:cfg});
  });
  Object.keys(phaseGroups).map(function(ph){ return Number(ph)||0; })
    .sort(function(a,b){ if(a===0)return 1; if(b===0)return -1; return a-b; })
    .forEach(function(ph){
    var group=phaseGroups[ph];if(!group||!group.length)return;
    var parent=sel;
    if(ph>0){var og=document.createElement("optgroup");og.label="Phase "+ph;sel.appendChild(og);parent=og;}
    group.forEach(function(item){
      var opt=document.createElement("option");
      opt.value=item.id;opt.textContent=item.cfg.label;
      if(item.id===selected)opt.selected=true;
      parent.appendChild(opt);
    });
  });
}
function programDetailsHtml(cfg){
  if(!cfg || !cfg.label)return '<strong>Aucun programme chargé</strong><br>Vérifie <code>programs/index.js</code>.';
  var target=cfg.phase&&PHASE_TARGETS[cfg.phase]?PHASE_TARGETS[cfg.phase]:null;
  var targetHtml="";
  if(target){targetHtml='<div style="margin-top:10px;padding:10px;background:rgba(124,106,255,.1);border-radius:10px;font-size:13px">'+
    '<strong style="color:var(--accent2)">Objectifs de la phase</strong><br>'+
    (target.bench?'Bench : <strong>'+target.bench+' lb</strong><br>':'')+
    (target.backSquat?'Back squat : <strong>'+target.backSquat+' lb x5</strong><br>':'')+
    '<span style="color:var(--muted)">'+target.note+'</span></div>';}
  var days=(cfg.days||DEFAULT_PROGRAM_DAYS).map(function(d){
    var m=(cfg.dayMeta&&cfg.dayMeta[d])||baseDays[d]||{label:d};
    return m.label||d;
  }).join(' · ');
  var draftHtml = cfg.draft ? '<div class="draft-cycle-warning">⚠️ Brouillon futur — À retravailler lorsque le projet sera activé.</div>' : '';
  return '<strong>'+escapeHtml(cfg.label)+'</strong>'+(cfg.status?' <span class="draft-pill">'+escapeHtml(cfg.status)+'</span>':'')+'<br>'+escapeHtml(cfg.impact||'')+draftHtml+
    '<br><br><strong>Jours :</strong> '+escapeHtml(days)+
    '<br><strong>Structure :</strong> '+escapeHtml((cfg.sets&&cfg.sets.length)?cfg.sets.join(" → "):"non définie")+
    '<br><strong>Repos :</strong> '+escapeHtml(cfg.rest||'—')+targetHtml;
}
function previewBlockHtml(block){
  if(!block)return '';
  var html='<div style="margin-top:8px;padding:10px;border:1px solid rgba(255,255,255,.10);border-radius:12px;background:rgba(255,255,255,.03)">'+
    '<div style="font-weight:800">'+escapeHtml(block.title||'Bloc')+' <small style="color:var(--muted)">'+escapeHtml(block.time||'')+'</small></div>';
  if(block.text)html+='<div style="margin-top:5px;color:var(--muted);font-size:12px;line-height:1.35">'+escapeHtml(block.text)+'</div>';
  if(block.exercises&&block.exercises.length){
    html+='<div style="margin-top:6px">';
    block.exercises.forEach(function(e){
      html+='<div style="font-size:12px;margin-top:4px"><strong>'+escapeHtml(e.name||'')+'</strong> · '+escapeHtml(e.format||'')+' · '+escapeHtml(e.load||'')+(e.note?' <span style="color:var(--muted)">— '+escapeHtml(e.note)+'</span>':'')+'</div>';
    });
    html+='</div>';
  }
  html+='</div>';
  return html;
}
function renderProgramPreviewHtml(){
  var cfg=previewCfg();
  if(!cfg)return '<div class="draft-cycle-warning">Aperçu impossible : programme introuvable.</div>';
  ensurePreviewPosition();
  var weeks=cfg.weekLabels&&cfg.weekLabels.length?cfg.weekLabels.length:(cfg.sets&&cfg.sets.length?cfg.sets.length:1);
  var days=previewDays();
  var html='<div style="margin-top:14px;padding:12px;border:1px solid rgba(124,106,255,.28);border-radius:14px;background:rgba(124,106,255,.06)">'+
    '<strong>Aperçu du programme</strong><br><small style="color:var(--muted)">Tu peux parcourir sans changer le cycle actif.</small>';
  html+='<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">';
  for(var w=1;w<=weeks;w++)html+='<button type="button" class="tab'+(w===previewCycleWeek?' active':' secondary')+' preview-week-btn" data-week="'+w+'">S'+w+'</button>';
  html+='</div><div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap">';
  days.forEach(function(d){html+='<button type="button" class="tab'+(d===previewCycleDay?' active':' secondary')+' preview-day-btn" data-day="'+d+'">'+escapeHtml(previewDayLabel(d))+'</button>';});
  html+='</div>';
  var blocks=[];
  try{blocks=(typeof cfg.getBlocks==='function')?(cfg.getBlocks(previewCycleDay,previewCycleWeek)||[]):[];}catch(e){blocks=[{title:'Erreur aperçu',time:'—',text:e&&e.message?e.message:String(e),kind:'error'}];}
  if(!blocks.length)blocks=[{title:'Séance manquante',time:'—',text:'Ce programme déclare '+previewDayLabel(previewCycleDay)+', mais ne retourne aucun bloc.',kind:'error'}];
  html+='<div style="margin-top:10px"><strong>'+escapeHtml((cfg.weekLabels&&cfg.weekLabels[previewCycleWeek-1])||('S'+previewCycleWeek))+' · '+escapeHtml(previewDayLabel(previewCycleDay))+'</strong></div>';
  blocks.forEach(function(b){html+=previewBlockHtml(b);});
  html+='</div>';
  return html;
}
function cycleStatusLabel(c){
  var st=String((c&&c.status)||'archived');
  if(st==='abandoned')return 'Abandonné';
  if(st==='completed')return 'Terminé';
  if(st==='restored')return 'Restauré';
  return 'Archivé';
}
function cycleSmallMeta(c){
  var parts=[];
  parts.push('S'+escapeHtml(c.week||1));
  parts.push(escapeHtml(dayLabel(c.day)));
  if(c.completedDays&&c.completedDays.length)parts.push(escapeHtml(c.completedDays.length+' fait'+(c.completedDays.length>1?'s':'')));
  if(c.missedDays&&c.missedDays.length)parts.push(escapeHtml(c.missedDays.length+' manqué'+(c.missedDays.length>1?'s':'')));
  if(c.archivedAt)parts.push('archivé '+escapeHtml(String(c.archivedAt).slice(0,10)));
  else if(c.pausedAt)parts.push('pause '+escapeHtml(String(c.pausedAt).slice(0,10)));
  if(c.reason)parts.push(escapeHtml(c.reason));
  return parts.join(' · ');
}
function renderCycleCard(c, idx, type){
  var cls=(c&&c.status)==='abandoned'?'border:1px solid rgba(239,68,68,.35);background:rgba(239,68,68,.06)':'border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03)';
  var html='<div style="margin-top:8px;padding:10px;'+cls+';border-radius:10px">'+
    '<strong>'+escapeHtml((c&&c.label)||((c&&c.id)||'Cycle'))+'</strong>'+
    (type==='archived'?' <span class="draft-pill">'+escapeHtml(cycleStatusLabel(c))+'</span>':'')+
    '<br><small>'+cycleSmallMeta(c||{})+'</small><br>';
  if(type==='saved'){
    html+='<button type="button" class="btn-ghost resume-cycle-btn" data-idx="'+idx+'">Reprendre</button> '+
      '<button type="button" class="btn-ghost archive-saved-cycle-btn" data-idx="'+idx+'">Archiver</button> '+
      '<button type="button" class="btn-danger abandon-saved-cycle-btn" data-idx="'+idx+'">Abandonner</button>';
  }else{
    html+='<button type="button" class="btn-ghost resume-archived-cycle-btn" data-idx="'+idx+'">Reprendre</button> '+
      '<button type="button" class="btn-ghost restore-archived-cycle-btn" data-idx="'+idx+'">Remettre en pause</button> '+
      '<button type="button" class="btn-ghost toggle-archived-status-btn" data-idx="'+idx+'">Archivé/abandonné</button> '+
      '<button type="button" class="btn-danger delete-archived-cycle-btn" data-idx="'+idx+'">Supprimer</button>';
  }
  html+='</div>';
  return html;
}
function renderSavedCyclesHtml(){
  var html='';
  var saved=state.savedCycles||[], archived=state.archivedCycles||[];
  if(saved.length){
    html+='<div style="margin-top:14px"><strong>Cycles en pause</strong>';
    saved.slice().reverse().forEach(function(c,i){var idx=saved.length-1-i;html+=renderCycleCard(c,idx,'saved');});
    html+='</div>';
  }
  if(archived.length){
    html+='<div style="margin-top:14px"><strong>Cycles archivés / abandonnés</strong><br><small>Tu peux les reprendre, les remettre en pause ou les supprimer définitivement.</small>';
    archived.slice().reverse().forEach(function(c,i){var idx=archived.length-1-i;html+=renderCycleCard(c,idx,'archived');});
    html+='</div>';
  }
  return html;
}

function renderRoadmapCycleHtml(){
  var r=roadmapSummary();
  var cls=r.status==="OK"?"ok":(r.status==="serré"?"warn":"danger");
  var html='<div class="roadmap-card"><div><strong>Route vers janvier 2027</strong><br><small>Calcul dynamique : durée des phases restantes, pas les vieux phaseEnd statiques.</small></div>'+
    '<div class="roadmap-status '+cls+'">'+escapeHtml(r.status.toUpperCase())+' · marge '+escapeHtml(String(r.margin))+' sem.</div>'+
    '<div class="roadmap-list">';
  r.rows.forEach(function(row){html+='<div class="roadmap-row"><span>'+(row.current?'▶ ':'')+escapeHtml(row.label)+'</span><b>'+escapeHtml(String(row.remainingWeeks))+' sem.</b><small>'+formatRoadDate(row.start)+' → '+formatRoadDate(row.end)+'</small></div>';});
  html+='</div><p class="muted">Compétition : '+COMPETITION_DATE.toLocaleDateString('fr-CA')+' · '+daysToCompetition()+' jours restants · route estimée '+r.totalWeeks+' semaines.</p></div>';
  return html;
}

function renderFocusDetails(){
  var fd=$("focusDetails");if(!fd)return;
  var id=previewProgramId(), cfg=focusConfigs[id];
  var activeHtml='<div style="margin-bottom:10px;padding:10px;background:rgba(34,197,94,.08);border-radius:10px"><strong>Cycle actif :</strong> '+escapeHtml((focus()&&focus().label)||activeProgramId())+' · S'+state.week+' · '+escapeHtml(dayLabel(state.day))+'</div>';
  var previewHtml=(id!==activeProgramId())?'<div style="margin-bottom:10px;padding:10px;background:rgba(245,158,11,.10);border-radius:10px"><strong>Aperçu seulement.</strong> Rien ne change tant que tu ne démarres pas ce programme.</div>':'<div style="margin-bottom:10px;padding:10px;background:rgba(255,255,255,.04);border-radius:10px"><strong>Aperçu du cycle actif.</strong></div>';
  var missingHtml=state.missingCycle?'<div class="draft-cycle-warning">⚠️ Programme absent détecté : '+escapeHtml(state.missingCycle.id)+'. L’app est revenue au premier programme disponible sans effacer la trace.</div>':'';
  fd.innerHTML=missingHtml+activeHtml+previewHtml+programDetailsHtml(cfg)+renderRoadmapCycleHtml()+renderProgramPreviewHtml()+renderSavedCyclesHtml();
  Array.prototype.forEach.call(fd.querySelectorAll('.preview-week-btn'),function(btn){btn.onclick=function(){previewCycleWeek=Number(btn.getAttribute('data-week'))||1;renderFocusDetails();};});
  Array.prototype.forEach.call(fd.querySelectorAll('.preview-day-btn'),function(btn){btn.onclick=function(){previewCycleDay=btn.getAttribute('data-day')||previewCycleDay;renderFocusDetails();};});
  Array.prototype.forEach.call(fd.querySelectorAll('.resume-cycle-btn'),function(btn){btn.onclick=function(){resumeSavedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.archive-saved-cycle-btn'),function(btn){btn.onclick=function(){archiveSavedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.abandon-saved-cycle-btn'),function(btn){btn.onclick=function(){abandonSavedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.resume-archived-cycle-btn'),function(btn){btn.onclick=function(){resumeArchivedCycle(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.restore-archived-cycle-btn'),function(btn){btn.onclick=function(){restoreArchivedCycleToPaused(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.toggle-archived-status-btn'),function(btn){btn.onclick=function(){toggleArchivedCycleStatus(Number(btn.getAttribute('data-idx')));};});
  Array.prototype.forEach.call(fd.querySelectorAll('.delete-archived-cycle-btn'),function(btn){btn.onclick=function(){deleteArchivedCycle(Number(btn.getAttribute('data-idx')));};});
}
function renderCycle(){populateCycleGoalOptions();ensurePreviewPosition();renderFocusDetails();var sc=$("saveCycleBtn");if(sc)sc.textContent=(previewProgramId()===activeProgramId()?"Redémarrer ce programme":"Démarrer ce programme");var nc=$("newCycleBtn");if(nc)nc.textContent="Archiver cycle actif";}
function saveCycle(){
  var selected=$("cycleGoal").value;
  if(!selected||!focusConfigs[selected]){alert("Programme introuvable.");return;}
  if(!confirm("Démarrer “"+focusConfigs[selected].label+"” comme cycle actif? Le cycle actuel sera mis en pause."))return;
  pauseCurrentCycle("Remplacé par "+focusConfigs[selected].label);
  state.cycle.goal=selected;previewCycleGoal=selected;state.week=1;state.day=(focusConfigs[selected].days||DEFAULT_PROGRAM_DAYS)[0]||"lundi";state.completedDays=[];state.missedDays=[];state.deloadAlert=false;state.cycleState=buildCycleStatePayload();
  resetPreviewPosition(selected);
  save();render();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}
function newCycle(){ archiveActiveCycle(); }
function archiveActiveCycle(){
  if(!confirm("Archiver le cycle actif actuel?"))return;
  state.archivedCycles=state.archivedCycles||[];
  state.archivedCycles.push(Object.assign(snapshotCurrentCycle("Archivé"),{archivedAt:nowIso(),status:"archived"}));
  state.completedDays=[];state.missedDays=[];state.cycleState=buildCycleStatePayload();save();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}
function resumeSavedCycle(idx){
  var saved=state.savedCycles||[], c=saved[idx];
  if(!c){alert("Cycle introuvable.");return;}
  if(!focusConfigs[c.id]){alert("Programme introuvable : "+c.id+". Restaure le fichier avant de reprendre ce cycle.");return;}
  if(!confirm("Reprendre “"+(c.label||c.id)+"” S"+c.week+" "+dayLabel(c.day)+"? Le cycle actuel sera mis en pause."))return;
  pauseCurrentCycle("Mis en pause par reprise d’un autre cycle");
  saved.splice(idx,1);state.savedCycles=saved;state.cycle.goal=c.id;previewCycleGoal=c.id;state.week=Number(c.week)||1;state.day=c.day||((focusConfigs[c.id].days||DEFAULT_PROGRAM_DAYS)[0]);state.completedDays=c.completedDays||[];state.missedDays=c.missedDays||[];ensureCurrentDay();state.cycleState=buildCycleStatePayload();resetPreviewPosition(c.id);save();render();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}
function archiveSavedCycle(idx){
  var saved=state.savedCycles||[], c=saved[idx];if(!c)return;
  if(!confirm("Archiver ce cycle en pause?"))return;
  state.archivedCycles=state.archivedCycles||[];state.archivedCycles.push(Object.assign({},c,{archivedAt:nowIso(),status:"archived"}));saved.splice(idx,1);state.savedCycles=saved;state.cycleState=buildCycleStatePayload();save();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}
function abandonSavedCycle(idx){
  var saved=state.savedCycles||[], c=saved[idx];if(!c)return;
  if(!confirm("Abandonner ce cycle en pause? Il disparaîtra de la liste des cycles récupérables."))return;
  state.archivedCycles=state.archivedCycles||[];state.archivedCycles.push(Object.assign({},c,{archivedAt:nowIso(),status:"abandoned",reason:"Abandonné"}));
  saved.splice(idx,1);state.savedCycles=saved;state.cycleState=buildCycleStatePayload();save();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}

function resumeArchivedCycle(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c){alert("Cycle archivé introuvable.");return;}
  if(!focusConfigs[c.id]){alert("Programme introuvable : "+c.id+". Restaure le fichier avant de reprendre ce cycle.");return;}
  if(!confirm("Reprendre ce cycle archivé? Le cycle actif actuel sera mis en pause."))return;
  pauseCurrentCycle("Mis en pause par reprise d’un cycle archivé");
  archived.splice(idx,1);state.archivedCycles=archived;
  state.cycle.goal=c.id;previewCycleGoal=c.id;state.week=Number(c.week)||1;
  state.day=c.day||((focusConfigs[c.id].days||DEFAULT_PROGRAM_DAYS)[0]);
  state.completedDays=c.completedDays||[];state.missedDays=c.missedDays||[];
  ensureCurrentDay();state.cycleState=buildCycleStatePayload();resetPreviewPosition(c.id);
  save();render();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}
function restoreArchivedCycleToPaused(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c)return;
  if(!confirm("Remettre ce cycle dans les cycles en pause?"))return;
  state.savedCycles=state.savedCycles||[];
  state.savedCycles.push(Object.assign({},c,{restoredAt:nowIso(),status:"paused",reason:"Restauré depuis archives"}));
  archived.splice(idx,1);state.archivedCycles=archived;
  state.cycleState=buildCycleStatePayload();save();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}
function toggleArchivedCycleStatus(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c)return;
  var next=(c.status==="abandoned")?"archived":"abandoned";
  var label=next==="abandoned"?"abandonné":"archivé";
  if(!confirm("Marquer ce cycle comme "+label+"?"))return;
  c.status=next;c.statusChangedAt=nowIso();
  if(next==="abandoned")c.reason="Abandonné";
  archived[idx]=c;state.archivedCycles=archived;state.cycleState=buildCycleStatePayload();save();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}
function deleteArchivedCycle(idx){
  var archived=state.archivedCycles||[], c=archived[idx];
  if(!c)return;
  if(!confirm("Supprimer définitivement ce cycle archivé/abandonné? Cette action ne supprimera pas les séances de l’historique, seulement la fiche du cycle."))return;
  archived.splice(idx,1);state.archivedCycles=archived;state.cycleState=buildCycleStatePayload();save();renderCycle();if(getToken())savePersistentStateToGitHub(getToken());
}

// ─── Historique ──────────────────────────────────────────────────────────────


async function deleteHistorySession(index){
  index = Number(index);
  if(isNaN(index) || !state.history || !state.history[index]) return;

  var item = state.history[index];
  var label = (item.date||"date inconnue")+" · "+((item.day&&baseDays[item.day])?baseDays[item.day].label:(item.jour||item.day||""))+" · "+(item.focus||"");
  if(!confirm("Supprimer cet entraînement de l’historique?\n\n"+label+"\n\nCette action va aussi essayer de le retirer de data/resultats.json sur GitHub.")) return;

  var removed = state.history.splice(index,1)[0];
  rebuildRefsFromHistory();
  save();
  renderHistory();
  renderWorkout();
  renderReferences();
  renderWeekProgress();

  var status = $("historyStatus");
  if(status){status.textContent="Suppression locale OK. Mise à jour GitHub...";status.className="status-msg";}

  var token = getToken();
  if(!token){
    if(status){status.textContent="✅ Supprimé localement. ⚠ GitHub non modifié : token manquant.";status.className="status-msg err";}
    return;
  }

  try{
    var r = await readGithubJsonFile(token, GITHUB_FILE);
    if(!r.ok){
      if(status){status.textContent="✅ Supprimé localement. ❌ GitHub non modifié : "+r.msg;status.className="status-msg err";}
      return;
    }
    var data = Array.isArray(r.data) ? r.data : [];
    var before = data.length;
    data = data.filter(function(s){ return !sameHistorySession(s, removed); });

    if(data.length === before){
      if(status){status.textContent="✅ Supprimé localement. ⚠ Entrée non trouvée dans GitHub resultats.json.";status.className="status-msg err";}
    } else {
      var w = await writeGithubFile(
        token,
        GITHUB_FILE,
        JSON.stringify(data,null,2),
        "Suppression entraînement "+(removed.date||"")+" — "+(removed.jour||removed.day||""),
        r.sha
      );
      if(!w.ok){
        if(status){status.textContent="✅ Supprimé localement. ❌ GitHub resultats.json non modifié : "+w.msg;status.className="status-msg err";}
        return;
      }

      // Sauvegarder aussi la force actuelle recalculée si le fichier existe.
      try{
        await saveJsonDataFile(token, ATHLETE_STATE_FILE, ensureAthleteState(), "Recalcul athlete_state après suppression historique");
      }catch(e){}

      if(status){status.textContent="✅ Entraînement supprimé localement et sur GitHub.";status.className="status-msg ok";}
    }
  }catch(e){
    if(status){status.textContent="✅ Supprimé localement. ❌ Erreur GitHub : "+e.message;status.className="status-msg err";}
  }
}

function renderHistory(){
  var h=$("history");if(!h)return;
  h.innerHTML="";
  var status=$("historyStatus");
  if(!status){
    status=document.createElement("div");
    status.id="historyStatus";
    status.className="status-msg";
    h.parentNode.insertBefore(status,h);
  }
  if(!state.history||!state.history.length){
    h.innerHTML='<p style="color:var(--muted);font-size:13px">Aucune séance enregistrée.</p>';
    return;
  }
  renderProgressCharts();

  state.history.slice().reverse().forEach(function(s,revIndex){
    var originalIndex = state.history.length - 1 - revIndex;
    var div=document.createElement("div");
    div.className="history-item deletable";
    var dayKey=s.day||s.jour;
    var title=(dayKey&&baseDays[dayKey]?baseDays[dayKey].label:dayKey||"")+" — S"+(s.week||s.semaine||"")+" — "+(s.focus||"");
    var rows="";
    var res=s.results||s.resultats||{};
    if(res){
      Object.keys(res).forEach(function(k){
        var r=res[k];
        if(r.load||r.result){
          rows+='<div class="history-row"><span class="mv">'+escHtml(k)+'</span><span class="val">'+
            (r.load?escHtml(r.load+" lb"+(r.reps?" × "+r.reps:"")+(r.rpe?" RPE "+r.rpe:"")):escHtml(r.result||""))+
            '</span></div>';
        }
      });
    }
    div.innerHTML=
      '<div class="history-head">'+
        '<div>'+
          '<div class="history-date">'+escHtml(s.date||"")+'</div>'+
          '<div class="history-title">'+escHtml(title)+'</div>'+
        '</div>'+
        '<button type="button" class="history-delete-btn" data-history-index="'+originalIndex+'">Supprimer</button>'+
      '</div>'+
      '<div class="history-rows">'+rows+'</div>';
    h.appendChild(div);
  });

  h.querySelectorAll(".history-delete-btn").forEach(function(btn){
    btn.onclick=function(){
      deleteHistorySession(btn.getAttribute("data-history-index"));
    };
  });
}

function renderProgressCharts(){
  var c=$("progressCharts");if(!c)return;c.innerHTML="";
  var tracked=["strictPress","frontSquat","powerClean","bench"];
  tracked.forEach(function(mvKey){
    var mv=movements[mvKey];if(!mv)return;
    var loads=[];
    state.history.forEach(function(s){
      if(s.results&&s.results[mvKey]&&s.results[mvKey].load){loads.push(Number(s.results[mvKey].load));}
    });
    if(loads.length<2)return;
    var max=Math.max.apply(null,loads),min=Math.min.apply(null,loads);
    var card=document.createElement("div");card.className="chart-card";
    var bars=loads.slice(-8).map(function(v,i,arr){
      var h=max===min?50:Math.round(((v-min)/(max-min))*46)+4;
      var isLatest=i===arr.length-1;
      return'<div class="chart-bar'+(isLatest?' latest':'')+'" style="height:'+h+'px" title="'+v+' lb"></div>';
    }).join("");
    card.innerHTML='<div class="chart-title">'+mv.name+' — dernier : '+loads[loads.length-1]+' lb</div><div class="chart-bars">'+bars+'</div>';
    c.appendChild(card);
  });
}

// ─── Références ──────────────────────────────────────────────────────────────

function renderReferences(){
  var c=$("referencesList");if(!c)return;c.innerHTML="";
  var rangeLabels={strength:"FORCE 1-5",hypertrophy:"HYPERTROPHIE 6-12",endurance:"ENDURANCE 13+"};
  var rangeColors={strength:"var(--gold)",hypertrophy:"var(--cyan)",endurance:"var(--green)"};
  Object.keys(movements).forEach(function(mvKey){
    ["strength","hypertrophy","endurance"].forEach(function(range){
      var key=mvKey+"__"+range,ref=state.movementRefs[key];
      if(!ref)return;
      var div=document.createElement("div");div.className="ref-item";
      div.style.setProperty("--ref-color",rangeColors[range]);
      div.querySelector?null:null;
      div.innerHTML=
        '<div class="ref-name">'+
          movements[mvKey].name+
          '<span class="ref-range" style="color:'+rangeColors[range]+'">'+rangeLabels[range]+'</span>'+
        '</div>'+
        '<div class="ref-right">'+
          '<span class="ref-value">'+ref.load+' lb × '+ref.reps+'</span>'+
          '<span class="ref-meta">'+ref.date+' · RPE '+ref.rpe+'</span>'+
        '</div>';
      // Couleur de la barre gauche selon range
      div.style.setProperty('--bar-color', rangeColors[range]);
      div.style.cssText+=';--bar-color:'+rangeColors[range];
      c.appendChild(div);
    });
  });
  // Appliquer couleur barre gauche dynamiquement
  c.querySelectorAll('.ref-item').forEach(function(el,i){
    var ranges=["strength","hypertrophy","endurance"];
    var r=ranges[i%3];
    el.style.borderLeftColor=rangeColors[r]||"var(--blue)";
    el.style.borderLeftWidth="2px";
  });
}

// ─── Profil ──────────────────────────────────────────────────────────────────

var PR_FIELD_MAP = {
  prBench:          {profile:"bench",            label:"Bench press",          mvKey:"bench",       reps:1,  range:"strength"},
  prFrontSquat:     {profile:"frontSquat",       label:"Front squat",         mvKey:"frontSquat",  reps:1,  range:"strength"},
  prStrictPress:    {profile:"strictPress",      label:"Strict press",        mvKey:"strictPress", reps:1,  range:"strength"},
  prPowerClean:     {profile:"powerClean",       label:"Power clean",         mvKey:"powerClean",  reps:1,  range:"strength"},
  prBackSquat5RM:   {profile:"backSquat5RM",     label:"Back Squat",          mvKey:"backSquat",   reps:5,  range:"strength"},
  prHipThrust8RM:   {profile:"hipThrust8RM",     label:"Hip thrust",          mvKey:"hipThrust",   reps:8,  range:"hypertrophy"},
  prBulgarianDB:    {profile:"bulgarianDb",      label:"Bulgarian split squat",mvKey:"bulgarian",   reps:8,  range:"hypertrophy"},
  prDbRdl:          {profile:"dbRdl",            label:"DB RDL",              mvKey:null,          reps:8,  range:"hypertrophy"},
  prRow8RM:         {profile:"row8RM",           label:"Barbell row",         mvKey:"barbellRow", reps:8,  range:"hypertrophy"},
  prChestRow8RM:    {profile:"chestRow8RM",      label:"Chest Supported Row", mvKey:"chestRow",   reps:8,  range:"hypertrophy"},
  prLatPulldown10RM:{profile:"latPulldown10RM", label:"Weighted Pull-up",    mvKey:"latPulldown",reps:10, range:"hypertrophy"},
  prInclineDb10RM:  {profile:"inclineDb10RM",    label:"Incline DB press",    mvKey:"inclineDb",  reps:10, range:"hypertrophy"}
};

function todayDateString(){return new Date().toLocaleDateString("fr-CA");}

function renderProfile(){
  Object.keys(PR_FIELD_MAP).forEach(function(id){
    var el=$(id), cfg=PR_FIELD_MAP[id];
    if(el)el.value=state.profile[cfg.profile]||"";
  });
  var d=$("prDate");if(d&&!d.value)d.value=todayDateString();
  var st=$("prStatus");if(st){st.textContent="";st.className="status-msg";}
}

function updateMovementRefFromPR(cfg,load,dateStr){
  if(!cfg||!cfg.mvKey||!load)return;
  var refK=cfg.mvKey+"__"+(cfg.range||repRange(cfg.reps));
  state.movementRefs[refK]={
    movement:cfg.mvKey,
    range:cfg.range||repRange(cfg.reps),
    load:load,
    reps:cfg.reps,
    date:dateStr,
    lastActual:load,
    status:"pr",
    quality:"clean",
    rpe:10,
    note:"PR saisi manuellement"
  };
}

function updateAthleteStateFromPR(cfg,load,dateStr){
  if(!cfg||!load)return;
  var ast=ensureAthleteState();
  var label=cfg.label;
  var range=cfg.range||repRange(cfg.reps);
  var oneRM=epley1RM(load,cfg.reps);
  if(!ast.movements[label]){
    ast.movements[label]={ranges:{},history:[],lastUpdated:null,status:"new"};
  }
  var mv=ast.movements[label];
  mv.ranges=mv.ranges||{};mv.history=mv.history||[];
  mv.ranges[range]={
    currentLoad:load,
    currentReps:cfg.reps,
    actualLoad:load,
    actualReps:cfg.reps,
    rpe:10,
    confidence:0.90,
    status:"pr",
    estimated1RM:Math.round(oneRM),
    lastUpdated:dateStr,
    planned:{source:"manual_pr"}
  };
  mv.status="pr";
  mv.upgradedAt=dateStr;
  mv.lastUpdated=dateStr;
  mv.history.push({date:dateStr,load:load,reps:cfg.reps,rpe:10,range:range,status:"pr",capacityLoad:load,planned:{source:"manual_pr"}});
  if(mv.history.length>12)mv.history=mv.history.slice(-12);
  ast.updatedAt=nowIso();ast.version=APP_VERSION;
}

function normalizePrCompareName(s){
  return String(s||"").toLowerCase()
    .replace(/^[a-z][0-9]?\.\s*/i,"")
    .replace(/technique|l[eé]ger|lourd|strict|contr[oô]l[eé]|c[aâ]ble bas|halt[eè]res|machine|\/|\(|\)/ig," ")
    .replace(/[^a-z0-9à-ÿ]+/g," ")
    .trim();
}
function prCfgMatchesResult(cfg,key){
  if(!cfg||!key)return false;
  var raw=String(key||"");
  var clean=chargeKeyFromName(raw);
  var a=normalizePrCompareName(clean);
  var label=normalizePrCompareName(cfg.label);
  if(a===label)return true;
  if(cfg.mvKey){
    if(clean===cfg.mvKey||raw===cfg.mvKey)return true;
    if(movements&&movements[cfg.mvKey]){
      var mvName=normalizePrCompareName(movements[cfg.mvKey].name);
      if(a===mvName)return true;
    }
  }
  // Correspondances pratiques pour les noms composés du programme.
  if(cfg.label==="Incline DB press" && /incline.*db.*press/i.test(clean))return true;
  if(cfg.label==="Chest Supported Row" && /chest.*supported.*row/i.test(clean))return true;
  if(cfg.label==="Weighted Pull-up" && /(weighted.*pull|pull.*up|ring row)/i.test(clean))return true;
  if(cfg.label==="Back Squat" && /back.*squat/i.test(clean))return true;
  if(cfg.label==="Front squat" && /front.*squat/i.test(clean))return true;
  if(cfg.label==="Hip thrust" && /hip.*thrust/i.test(clean))return true;
  if(cfg.label==="DB RDL" && /(db.*rdl|romanian)/i.test(clean))return true;
  if(cfg.label==="Bulgarian split squat" && /bulgarian/i.test(clean))return true;
  if(cfg.label==="Power clean" && /power.*clean/i.test(clean))return true;
  if(cfg.label==="Strict press" && /strict.*press/i.test(clean))return true;
  if(cfg.label==="Bench press" && /^bench press$/i.test(clean))return true;
  return false;
}
function detectAndApplyAutomaticPr(results,dateStr){
  var updates=[];
  dateStr=dateStr||todayDateString();
  Object.keys(results||{}).forEach(function(key){
    var r=results[key];
    if(!r||r.isWod)return;
    var load=parseLoad(r.load), reps=Number(r.reps)||0;
    if(!load||!reps)return;
    Object.keys(PR_FIELD_MAP).forEach(function(id){
      var cfg=PR_FIELD_MAP[id];
      if(!cfg||!prCfgMatchesResult(cfg,key))return;
      var old=Number(state.profile[cfg.profile])||0;
      // Un 5RM/8RM/10RM automatique exige au moins le nombre de reps du PR enregistré.
      if(reps < Number(cfg.reps||1))return;
      if(load <= old)return;
      state.profile[cfg.profile]=load;
      updateMovementRefFromPR(cfg,load,dateStr);
      updateAthleteStateFromPR(cfg,load,dateStr);
      r.autoPr=true;
      r.prLabel=cfg.label;
      r.prOld=old||null;
      r.prNew=load;
      r.prReps=cfg.reps;
      r.note=(r.note?r.note+" · ":"")+"PR automatique détecté";
      updates.push({label:cfg.label,old:old||null,new:load,reps:cfg.reps,key:key});
    });
  });
  return updates;
}

async function savePrProfile(){
  var dateStr=($("prDate")&&$("prDate").value)||todayDateString();
  var changed={}, results={};
  Object.keys(PR_FIELD_MAP).forEach(function(id){
    var el=$(id), cfg=PR_FIELD_MAP[id];
    if(!el)return;
    var val=parseLoad(el.value);
    if(!val)return;
    var old=Number(state.profile[cfg.profile])||0;
    if(val!==old){
      state.profile[cfg.profile]=val;
      changed[cfg.label]={old:old||null,new:val,reps:cfg.reps};
      results[cfg.label]={load:String(val),reps:String(cfg.reps),rpe:"10",note:"PR saisi manuellement",status:"pr"};
      updateMovementRefFromPR(cfg,val,dateStr);
      updateAthleteStateFromPR(cfg,val,dateStr);
    }
  });
  var st=$("prStatus");
  if(!Object.keys(changed).length){
    if(st){st.textContent="Aucun PR modifié.";st.className="status-msg";}
    return;
  }
  var entry={
    uid:"pr_"+dateStr+"_"+Date.now(),
    type:"pr_update",
    date:dateStr,
    time:new Date().toLocaleTimeString("fr-CA"),
    semaine:state.week,
    jour:state.day,
    week:state.week,
    day:state.day,
    cycle:state.cycle&&state.cycle.goal?state.cycle.goal:null,
    focus:"PR / Records personnels",
    resultats:results,
    results:results,
    changes:changed,
    version:APP_VERSION
  };
  state.history.push(entry);
  save();
  renderReferences();
  renderHistory();

  var token=getToken();
  var msg="✅ PR sauvegardés localement et inscrits dans l’historique.";
  var statusClass="status-msg ok";

  if(!token){
    msg += " ⚠ Non envoyé sur GitHub : token manquant ou non sauvegardé.";
    statusClass="status-msg err";
  } else {
    if(st){st.textContent="Envoi PR vers GitHub...";st.className="status-msg";}
    try{
      // Vérifie/crée les fichiers durables avant l'écriture du PR.
      var ensure=await ensureResultatsFile(token);
      if(!ensure.ok){
        msg += " GitHub resultats ❌ "+ensure.msg;
        statusClass="status-msg err";
      } else {
        var payload=Object.assign({}, entry, { athleteState:ensureAthleteState() });
        var gh=await saveToGitHub(payload);
        var ps=await savePersistentStateToGitHub(token);
        msg += " "+(gh.ok?"GitHub resultats ✅":"GitHub resultats ❌ "+gh.msg);
        msg += " "+(ps.ok?"State ✅":"State ❌ "+ps.msg);
        if(!gh.ok||!ps.ok)statusClass="status-msg err";
      }
    }catch(e){
      msg += " GitHub ❌ "+e.message;
      statusClass="status-msg err";
    }
  }
  if(st){st.textContent=msg;st.className=statusClass;}
}

// ─── Charges ─────────────────────────────────────────────────────────────────

function renderChargeSettings(){
  var c=$("chargeSettingsList");if(!c)return;c.innerHTML="";
  chargeList().forEach(function(key){
    var div=document.createElement("div");div.className="charge-row";
    var val=(customCharges[key]!==undefined)?customCharges[key]:"";
    var official=officialCharges()[key]||"—";
    div.innerHTML='<label>'+key+'<br><small style="font-weight:400;color:var(--muted)">Base: '+official+'</small></label><input class="charge-input" data-charge-key="'+key+'" type="text" value="'+String(val).replace(/"/g,"&quot;")+'" placeholder="'+String(official).replace(/"/g,"&quot;")+'" />';
    c.appendChild(div);
  });
  Array.prototype.forEach.call(c.querySelectorAll("input[data-charge-key]"),function(inp){
    inp.addEventListener("change",function(){
      var key=inp.getAttribute("data-charge-key"),val=inp.value.trim();
      if(val)customCharges[key]=val;else delete customCharges[key];
      saveCustomCharges();renderWorkout();
      if($("phoneView")&&$("phoneView").classList.contains("view-active"))renderPhoneWod();
    });
  });
}
function resetCustomCharges(){if(confirm("Réinitialiser les charges personnalisées?")){customCharges={};saveCustomCharges();renderChargeSettings();renderWorkout();}}

// ─── Paramètres / GitHub token ────────────────────────────────────────────────

function renderSettings(){
  renderBertinProfileSettings();
  var inp=$("githubToken");if(inp)inp.value=getToken();
  renderChargeSettings();
  if(typeof renderChargeDiagnosticPanel==="function")renderChargeDiagnosticPanel();
}
function setupSettingsSave(){
  var btn=$("saveTokenBtn");
  if(btn)btn.onclick=function(){
    var val=$("githubToken").value.trim();
    if(!val){var s=$("tokenStatus");if(s){s.textContent="Token vide.";s.className="status-msg err";}return;}
    setToken(val);
    var s=$("tokenStatus");writeSyncStatus("pending","Token sauvegardé, test GitHub à faire");
    if(s){s.textContent="✅ Token sauvegardé localement. Clique Tester le token pour valider GitHub.";s.className="status-msg ok";}
  };
  var testBtn=$("testTokenBtn");
  if(testBtn)testBtn.onclick=function(){testGithubToken();};
  var syncBtn=$("syncGithubBtn");
  if(syncBtn)syncBtn.onclick=function(){syncHistoryFromGitHub(false);};
}

// ─── Export texte ─────────────────────────────────────────────────────────────

function stableIphoneText(day,week){
  day=day||state.day;week=week||state.week;
  var w=buildWorkout(day,week);
  var txt=w.day.label.toUpperCase()+" - "+w.day.base.toUpperCase()+" - SEMAINE "+week+"\nFocus: "+focus().label+"\n"+dayIntention(day)+"\n\n";
  w.blocks.forEach(function(b){
    txt+=b.title.toUpperCase()+" ("+b.time+")\n";
    if(b.exercises&&b.exercises.length){if(b.text)txt+=cleanLine(displayChargeText(b.text))+"\n";b.exercises.forEach(function(e){var smartLoad=athleteSuggestedLoad(e.name,e.load,(parseTargetReps(e.format,10).min||parseTargetReps(e.format,10).max));txt+=e.name+"\nFormat: "+e.format+"\nPoids: "+smartLoad+"\nRepos: "+e.rest+"\n"+(e.note?"Note: "+e.note+"\n":"")+"\n";});}
    else if(b.progress&&b.progress.length){b.progress.forEach(function(mvKey,j){var reps=targetReps(j,b.kind),load=lb(suggestLoad(mvKey,progressionPct(j),reps));txt+=movements[mvKey].name+"\nFormat: "+setScheme(b.kind,j)+"\nPoids: "+load+"\nRepos: "+restFor(b.kind)+"\n\n";});}
    else{txt+=cleanLine(displayChargeText(b.text||""))+"\n\n";}
  });
  return txt;
}
function weekText(){var txt="SEMAINE "+state.week+" - "+focus().label+"\n\n";currentDayOrder().forEach(function(d){txt+=stableIphoneText(d,state.week)+"\n---\n\n";});return txt;}

function download(name,text){
  var type=name.endsWith(".json")?"application/json;charset=utf-8":"text/plain;charset=utf-8";
  var blob=new Blob([text],{type:type}),url=URL.createObjectURL(blob);
  var a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function exportBackup(){
  var v=String(APP_VERSION||"backup").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
  download("coach-bertin-"+v+"-backup.json",JSON.stringify({version:APP_VERSION,exportedAt:new Date().toISOString(),state:state},null,2));
}
function importBackup(file){
  if(!file)return;
  var r=new FileReader();
  r.onload=function(e){try{var d=JSON.parse(e.target.result);if(d.state){state=Object.assign(state,d.state);save();render();alert("Import réussi.");}}catch(ex){alert("Fichier invalide.");}};
  r.readAsText(file);
}

// ─── Navigation principale ────────────────────────────────────────────────────
// V50.57 : switchView() et la liste des vues sont extraits dans scripts/app_navigation.js.

// ─── Binding ─────────────────────────────────────────────────────────────────

function bind(){
  [["trainingTab","training"],["phoneTab","phone"],["profileTab","profile"],["referencesTab","references"],["cycleTab","cycle"],["historyTab","history"],["settingsTab","settings"]].forEach(function(pair){
    var t=$(pair[0]);if(t)t.onclick=function(){switchView(pair[1]);};
  });
  var pvb=$("phoneViewBtn");if(pvb)pvb.onclick=function(){switchView("phone");};
  var btb=$("backTrainingBtn");if(btb)btb.onclick=function(){switchView("training");};
  var fs=$("fullscreenBtn");if(fs)fs.onclick=function(){var el=document.documentElement,fn=el.requestFullscreen||el.webkitRequestFullscreen;if(fn)try{fn.call(el);}catch(e){}};
  var smb=$("sessionModeBtn");if(smb)smb.onclick=function(){guidedLaunchSource="phone";guidedResultsMode=false;document.body.classList.remove("guided-results-active");document.body.classList.add("guided-session-active");openGuidedSession();};
  var wl=$("wakeLockBtn");if(wl)wl.onclick=function(){if(wakeLockWanted||wakeLock)releaseWakeLock();else requestWakeLock();};
  var wpl=$("wodPlusWakeBtn");if(wpl)wpl.onclick=function(){if(wakeLockWanted||wakeLock)releaseWakeLock();else requestWakeLock();};
  var wpt=$("wodPlusTmsBtn");if(wpt)wpt.onclick=function(){
    if(typeof window.openCoachBeurtTmsChoice==="function"){
      window.openCoachBeurtTmsChoice({fromWodPlus:true});
    }else{
      alert("TMS pas encore chargé. Recharge la page.");
    }
  };
  var cp=$("copyPhoneBtn");if(cp)cp.onclick=function(){navigator.clipboard.writeText(stableIphoneText()).then(function(){alert("Copié.");}).catch(function(){alert("Copie bloquée.");});};
  var sd=$("syncStatusDot");if(sd)sd.onclick=openSyncSettings;
  var sc=$("saveCycleBtn");if(sc)sc.onclick=saveCycle;
  var nc=$("newCycleBtn");if(nc)nc.onclick=newCycle;
  var spr=$("savePrBtn");if(spr)spr.onclick=savePrProfile;
  var cg=$("cycleGoal");if(cg)cg.onchange=function(){resetPreviewPosition(cg.value);renderCycle();};
  var eh=$("exportHistoryBtn");if(eh)eh.onclick=function(){download("coach-bertin-historique.txt","Historique "+APP_VERSION+"\n\n"+JSON.stringify(state.history,null,2));};
  var rh=$("resetHistoryBtn");if(rh)rh.onclick=function(){if(confirm("Effacer tout l'historique?")){state.history=[];save();renderHistory();}};
  var rcb=$("resetCustomChargesBtn");if(rcb)rcb.onclick=resetCustomCharges;
  var ebb=$("exportBackupBtn");if(ebb)ebb.onclick=exportBackup;
  var ibf=$("importBackupFile");if(ibf)ibf.onchange=function(e){importBackup(e.target.files[0]);};
  var ewb=$("exportWeekBtn");if(ewb)ewb.onclick=function(){download("coach-bertin-semaine.txt",weekText());};
  var ebb2=$("exportBackupBtnSettings");if(ebb2)ebb2.onclick=exportBackup;
  var ibf2=$("importBackupFileSettings");if(ibf2)ibf2.onchange=function(e){importBackup(e.target.files[0]);};
  var ewb2=$("exportWeekBtnSettings");if(ewb2)ewb2.onclick=function(){download("coach-bertin-semaine.txt",weekText());};
  if(typeof setupChargeDiagnosticBindings==="function")setupChargeDiagnosticBindings();
}

function render(){ensureCurrentDay();renderWeeks();renderDays();renderWorkout();renderSyncStatusIndicator();}



// ─── Mode Stéphanie local simplifié ──────────────────────────────────────────
// V50.59 : fonctions extraites dans scripts/stephanie_mode.js.

// ─── Init ─────────────────────────────────────────────────────────────────────

load();
if(!focusConfigs[state.cycle.goal]){state.missingCycle={id:state.cycle.goal,date:nowIso()};state.cycle.goal=defaultProgramId();}
ensureCurrentDay();
loadCustomCharges();
bind();
setupHamburger();
setupSwipeNav();
setupRestBar();
setupSettingsSave();
setupSessionSave();
startGlobalClock();

renderProfileSwitchButton();
if(activeLocalProfileId()==="stephanie"){
  renderStephanieSimpleApp();
} else {
  render();
  switchView("training");
  autoSyncFromGitHub();
}

if("serviceWorker" in navigator){window.addEventListener("load",function(){navigator.serviceWorker.register("service-worker.js").catch(function(){});});}

// V50.51 : l’ancien mode iPhone devient la vue PC / inspection. IDs conservés pour éviter de casser le tronc.


// V50.51 : PC placé près de la gear. Aucun bouton PC dans WOD+.


// V50.51 : ménage structurel conservateur. Les IDs phone* sont conservés comme compatibilité interne de la vue PC.
