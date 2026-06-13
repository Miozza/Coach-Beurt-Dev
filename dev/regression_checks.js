#!/usr/bin/env node
/*
  Coach Beurt — garde-fous anti-régression.
  Fichier fixe : ne pas créer de rapport versionné à chaque release.

  Usage :
    node dev/regression_checks.js
    node dev/regression_checks.js --update-package
*/
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const isUpdatePackage = process.argv.includes('--update-package');
const errors = [];
const notes = [];

function rel(p){ return path.join(root, p); }
function exists(p){ return fs.existsSync(rel(p)); }
function read(p){ return fs.readFileSync(rel(p), 'utf8'); }
function fail(msg){ errors.push(msg); }
function ok(msg){ notes.push(msg); }
function assert(cond, msg){ if(!cond) fail(msg); }

function walk(dir){
  const start = rel(dir);
  if(!fs.existsSync(start)) return [];
  const out = [];
  (function recur(abs){
    for(const entry of fs.readdirSync(abs, {withFileTypes:true})){
      const full = path.join(abs, entry.name);
      const rp = path.relative(root, full).replace(/\\/g, '/');
      if(entry.isDirectory()) recur(full); else out.push(rp);
    }
  })(start);
  return out;
}

function formatTimerDisplay(sec){
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  return String(Math.floor(sec / 60)) + ':' + String(sec % 60).padStart(2, '0');
}

function getVersion(){
  const app = read('app.js');
  const m = app.match(/APP_VERSION\s*=\s*"(V\d+\.\d+)"/);
  return m && m[1];
}

// 1. Documents et artefacts interdits.
const allFiles = walk('.').filter(f => !f.startsWith('.git/'));
const forbidden = [
  /^RELEASE_NOTES_V\d+\.\d+\.md$/,
  /^OFFICIAL_RELEASE_.*V\d+\.\d+.*\.md$/,
  /^STRUCTURE_AUDIT.*V\d+\.\d+.*\.(md|json|txt)$/,
  /^AUDIT.*V\d+\.\d+.*\.(md|json|txt)$/,
  /^REGRESSION_REPORT.*V\d+\.\d+.*\.(md|json|txt)$/,
  /^VERSION_HISTORY\.md$/
];
allFiles.forEach(f => {
  const base = path.basename(f);
  if(forbidden.some(rx => rx.test(base))) fail('Fichier versionné/interdit détecté : ' + f);
});
assert(!exists('diagnostics'), 'Dossier diagnostics interdit dans la base propre.');
assert(!exists('programs/test.js'), 'programs/test.js ne doit pas revenir.');
assert(exists('CHANGELOG.md'), 'CHANGELOG.md doit exister et rester le seul historique.');

// 2. Données durables.
const durable = ['data/resultats.json','data/athlete_state.json','data/cycle_state.json'];
if(isUpdatePackage){
  durable.forEach(f => assert(!exists(f), 'ZIP update ne doit pas contenir ' + f));
} else {
  durable.forEach(f => exists(f) ? ok('Donnée durable présente : ' + f) : ok('Donnée durable absente dans cette base : ' + f));
}
assert(exists('data/charges.js'), 'data/charges.js doit exister.');

// 3. Programmes protégés.
[
  'programs/epaules_3d.js',
  'programs/hypertrophy_base.js',
  'programs/force_performance.js',
  'programs/competition_peak.js',
  'programs/heritage_225.js'
].forEach(f => assert(exists(f), 'Programme protégé manquant : ' + f));
assert(read('programs/index.js').includes('heritage_225'), 'heritage_225 doit rester dans programs/index.js.');
assert(!read('programs/index.js').match(/test\.js|\btest\b/i), 'Le programme Test ne doit pas revenir dans programs/index.js.');

// 4. Cohérence de version.
const version = getVersion();
assert(!!version, 'APP_VERSION introuvable dans app.js.');
if(version){
  const plain = version.replace(/^V/, '');
  const cache = plain;
  const cacheName = 'coach-bertin-v' + plain.replace('.', '-') + '-no-cache';
  assert(read('index.html').includes('Coach Bertin ' + version), 'index.html doit contenir le titre ' + version + '.');
  assert(read('index.html').includes('?v=' + cache), 'index.html doit utiliser le cache-bust ?v=' + cache + '.');
  assert(read('manifest.json').includes('Coach Bertin ' + version), 'manifest.json doit contenir ' + version + '.');
  assert(read('service-worker.js').includes(cacheName), 'service-worker CACHE_NAME incohérent : attendu ' + cacheName + '.');
  assert(read('CHANGELOG.md').includes(version), 'CHANGELOG.md doit contenir ' + version + '.');
  assert(read('ETAT_ACTUEL.md').includes(version), 'ETAT_ACTUEL.md doit contenir ' + version + '.');
}

// 5. Timer WOD verrouillé.
assert(formatTimerDisplay(45) === '0:45', 'Timer attendu : 45 sec -> 0:45.');
assert(formatTimerDisplay(552) === '9:12', 'Timer attendu : 552 sec -> 9:12.');
assert(formatTimerDisplay(600) === '10:00', 'Timer attendu : 600 sec -> 10:00.');
assert(formatTimerDisplay(3600) === '60:00', 'Timer attendu : 3600 sec -> 60:00.');
const helperSrc = read('scripts/app_helpers.js');
const sessionSrc = read('scripts/view_session.js');
assert(helperSrc.includes('function formatTimerDisplay'), 'formatTimerDisplay doit rester dans scripts/app_helpers.js.');
assert(helperSrc.includes('function timerMeasureSampleForDisplay'), 'timerMeasureSampleForDisplay doit rester dans scripts/app_helpers.js.');
assert(sessionSrc.includes('formatTimerDisplay'), 'view_session.js doit utiliser le helper commun formatTimerDisplay.');
assert(sessionSrc.includes('targetWidth') && sessionSrc.includes('0.95'), 'Timer WOD doit viser environ 95 % de la largeur utile.');
assert(!/formatGuidedTimerClock[\s\S]{0,220}padStart\(2,\s*["']0["']\)\s*\+\s*["']:["']/.test(sessionSrc), 'Timer WOD ne doit pas padder les minutes à 2 chiffres.');

// 6. Résultats / équipement / For Time.
assert(helperSrc.includes('available:[2.5,5,10,12,15,17.5,20,22.5,25,30,35,40,45,50,55,60,65,70,85]'), 'Liste DB officielle incomplète ou déplacée sans mise à jour du test.');
assert(helperSrc.includes('function nextLoadForExercise'), 'nextLoadForExercise doit rester disponible pour les contrôles compacts.');
const appSrc = read('app.js');
assert(appSrc.includes('data-results-step="load"'), 'Résultats doit garder le contrôle compact de charge.');
assert(appSrc.includes('data-results-step="reps"'), 'Résultats doit garder le contrôle compact de reps.');
assert(appSrc.includes('data-results-step="rpe"'), 'Résultats doit garder le contrôle compact de RPE.');
assert(appSrc.includes('step="0.5"') && appSrc.includes('data-max="10"'), 'RPE résultats doit garder les pas de 0.5 jusqu’à 10.');
assert(appSrc.includes('for(var sec = 0; sec <= 3600; sec += 1)'), 'For Time doit garder les choix 00:00 à 60:00 à la seconde.');
assert(appSrc.includes('normalizeForTimeGoalSeconds'), 'For Time doit garder la présélection de l’objectif/cap.');
assert(appSrc.includes('function coachMovementLookupLabels'), 'Les alias de mouvements doivent rester centralisés pour éviter les suggestions manquantes.');
assert(appSrc.includes('function coachDefaultLoadSeedForMovement'), 'Les charges textuelles léger/modéré doivent garder un repère numérique prudent.');
assert(appSrc.includes('DB Shoulder Press / Landmine Press'), 'Alias DB Shoulder Press / Landmine Press requis pour le vendredi Épaules 3D.');
assert(appSrc.includes('Overhead Rope Extension — rappel vendredi'), 'Ancien alias Overhead Rope Extension rappel vendredi conservé seulement pour lecture historique.');
assert(appSrc.includes('Wide-Grip Cable Upright Row'), 'Alias Wide-Grip Cable Upright Row requis pour les suggestions du vendredi.');
assert(appSrc.includes('storeLoadDecisionHint(label,originalText'), 'Les charges non numériques sans repère doivent encore alimenter le bouton !.');
assert(appSrc.includes('DB ≠ câble ≠ machine ≠ barre ≠ poids du corps'), 'Le contrat d’alias par équipement doit rester documenté dans le code.');
assert(appSrc.includes('Lateral Raise câble bas') && appSrc.includes('Lateral Raise haltères'), 'Les variantes Lateral Raise câble/haltères doivent rester distinctes.');
assert(appSrc.includes('Rear Delt Fly câble bas') && appSrc.includes('Rear Delt Fly haltères'), 'Les variantes Rear Delt Fly câble/haltères doivent rester distinctes.');
assert(!/if\(\/lateral raise\/\.test\(n\)\)\{[\s\S]{0,240}add\("Lateral Raise haltères"\)[\s\S]{0,240}add\("Lateral Raise câble bas"\)/.test(appSrc), 'Lateral Raise ne doit pas fusionner haltères et câble dans le même alias large.');
assert(!/if\(\/rear delt fly\/\.test\(n\)\)\{[\s\S]{0,240}add\("Rear Delt Fly haltères"\)[\s\S]{0,240}add\("Rear Delt Fly câble bas"\)/.test(appSrc), 'Rear Delt Fly ne doit pas fusionner haltères et câble dans le même alias large.');
assert(helperSrc.includes('function displayMovementName'), 'displayMovementName doit nettoyer les suffixes internes sans modifier les programmes.');
assert(sessionSrc.includes('displayMovementName(e.title)'), 'La vue séance doit afficher les noms nettoyés.');
assert(read('programs/epaules_3d.js').includes('Lateral Raise DB'), 'Épaules 3D doit utiliser le nom propre Lateral Raise DB.');
assert(read('programs/epaules_3d.js').includes('Lateral Raise câble'), 'Épaules 3D doit utiliser le nom propre Lateral Raise câble.');
assert(read('programs/epaules_3d.js').includes('Rear Delt Fly DB'), 'Épaules 3D doit utiliser le nom propre Rear Delt Fly DB.');
assert(read('programs/epaules_3d.js').includes('Rear Delt Fly câble'), 'Épaules 3D doit utiliser le nom propre Rear Delt Fly câble.');
assert(!read('programs/epaules_3d.js').includes('Overhead Rope Extension — rappel vendredi'), 'Épaules 3D ne doit plus contenir Overhead Rope Extension — rappel vendredi dans le programme source.');
assert(appSrc.includes('DB Shoulder Press / Landmine Press') && appSrc.includes('transition historique'), 'Ancien nom DB Shoulder Press / Landmine Press doit rester en alias de transition.');
assert(appSrc.includes('Lateral Raise haltères') && appSrc.includes('Rear Delt Fly haltères'), 'Anciens noms haltères doivent rester comme alias de transition historique.');


// 7. UI critique.
const html = read('index.html');
assert(html.includes('id="syncStatusDot"'), 'Témoin GitHub discret #syncStatusDot manquant.');
assert(html.includes('id="guidedSession"'), 'Vue séance guidée #guidedSession manquante.');
assert(html.includes('scripts/view_session.js'), 'view_session.js doit être chargé.');
assert(html.includes('scripts/tms_session.js'), 'TMS doit être chargé depuis scripts/tms_session.js, pas tools/.');
assert(!exists('tools'), 'Le dossier tools/ ne doit pas revenir; utiliser scripts/ pour runtime et dev/ pour validation.');
assert(html.includes('scripts/app_helpers.js'), 'app_helpers.js doit être chargé avant view_session.js/app.js.');

// 8. Bouton jaune de charge / historique en séance.
const modalSrc = read('scripts/ui_modals.js');

assert(appSrc.includes('function coachMovementEquipmentFamily'), 'Le mapping de charge doit identifier la famille d’équipement.');
assert(appSrc.includes('coachEquipmentCompatibleForAlias'), 'Le mapping de charge doit refuser les alias entre équipements incompatibles.');
assert(modalSrc.includes('function loadHistoryEquipmentFamily'), 'La modale ! doit protéger l’historique contre les conflits DB/câble/machine/barre.');
assert(modalSrc.includes('loadHistoryEquipmentCompatible'), 'La modale ! doit vérifier la compatibilité d’équipement avant un match partiel.');
assert(modalSrc.includes('function loadHistoryRowsForExercise'), 'Le bouton ! charge doit conserver loadHistoryRowsForExercise.');
assert(modalSrc.includes('loadHistoryRowsFromSessionHistory'), 'Le bouton ! charge doit utiliser state.history comme fallback.');
assert(modalSrc.includes('athlete_state') || modalSrc.includes('athleteState'), 'Le bouton ! charge doit conserver athlete_state comme source.');
assert(modalSrc.includes('Historique des poids utilisés'), 'La modale ! charge doit afficher la section Historique des poids utilisés.');
assert(modalSrc.includes('function loadHistoryExerciseName') && modalSrc.includes('exercise.name||exercise.title'), 'Le bouton ! charge doit accepter exercise.title quand exercise.name est absent.');
assert(modalSrc.includes('function loadHistoryNamesMatch'), 'Le bouton ! charge doit matcher les noms partiels/alternatifs.');
assert(!modalSrc.includes('<div class="tuto-section"><div class="tuto-section-title">Diagnostic'), 'La modale ! charge ne doit pas redevenir trop chargée avec un bloc Diagnostic complet.');


if(errors.length){
  console.error('\nÉCHEC regression_checks.js');
  errors.forEach((e,i) => console.error((i+1) + '. ' + e));
  process.exit(1);
}
console.log('OK regression_checks.js — ' + (version || 'version inconnue'));
if(isUpdatePackage) console.log('Mode update-package : données durables exclues vérifiées.');
