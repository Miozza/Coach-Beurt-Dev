#!/usr/bin/env node
/*
  Coach Beurt — charge diagnostics helper
  Lecture seule. Ne modifie aucun fichier data/.

  Usage:
    node dev/charge_diagnostics.js diagnostics/charge-engine/coach-beurt-charge-compare-shoulders3d-S4-lundi.json
*/
const fs = require('fs');
const path = require('path');

function readJson(file){
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function num(v){
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function severity(row){
  const diff = Math.abs(num(row.diff));
  const legacy = String(row.legacy || '');
  if (legacy.includes('⚠') || diff >= 20) return 'critique';
  if (diff >= 10) return 'important';
  if (diff > 0) return 'mineur';
  return row.match ? 'ok' : 'à vérifier';
}
function main(){
  const file = process.argv[2];
  if(!file){
    console.error('Usage: node dev/charge_diagnostics.js <compare-json>');
    process.exit(1);
  }
  const data = readJson(file);
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const out = {
    file: path.basename(file),
    version: data.version || null,
    engine: data.engine || null,
    cycle: data.cycle || null,
    week: data.week || null,
    day: data.day || null,
    total: rows.length,
    matches: rows.filter(r => r.match).length,
    mismatches: rows.filter(r => !r.match).length,
    rows: rows.map(r => ({
      name: r.name,
      legacy: r.legacy,
      parallel: r.parallel,
      diff: r.diff,
      match: !!r.match,
      severity: severity(r),
      reason: r.reason || '',
      source: r.source || ''
    }))
  };
  console.log(JSON.stringify(out, null, 2));
}
main();
