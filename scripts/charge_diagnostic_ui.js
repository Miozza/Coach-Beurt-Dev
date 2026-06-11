// Coach Beurt V50.62
// Diagnostic de charges lecture seule : commentaires de cycle, alertes, export JSON.
// Ne modifie pas les charges actives, l'historique, le cycle ou les fichiers data/.

function chargeDiagNumber(v){
  var n=parseLoad ? parseLoad(v) : Number(String(v||'').match(/\d+(?:\.\d+)?/)||0);
  return Number(n)||0;
}
function chargeDiagRepRange(reps){
  reps=Number(reps)||0;
  if(typeof repRange==='function')return repRange(reps||8);
  if(reps>=15)return 'endurance';
  if(reps>=8)return 'hypertrophy';
  return 'strength';
}
function chargeDiagLabel(exercise){
  if(typeof canonicalMovementLabel==='function')return canonicalMovementLabel((exercise&&exercise.name)||'Mouvement');
  return movementLabelFromKeyOrName ? movementLabelFromKeyOrName((exercise&&exercise.name)||'') : chargeKeyFromName((exercise&&exercise.name)||'Mouvement');
}
function chargeDiagHistory(label){
  var ast=(typeof ensureAthleteState==='function')?ensureAthleteState():{movements:{}};
  var mv=ast.movements&&ast.movements[label];
  return (mv&&Array.isArray(mv.history))?mv.history.slice(-8):[];
}
function chargeDiagRangeCap(label,targetReps){
  var ast=(typeof ensureAthleteState==='function')?ensureAthleteState():{movements:{}};
  var mv=ast.movements&&ast.movements[label];
  if(!mv||!mv.ranges)return null;
  var range=chargeDiagRepRange(targetReps||8);
  return mv.ranges[range]||null;
}
function chargeDiagRecentBest(rows){
  var best=null;
  (rows||[]).forEach(function(r){
    var load=Number(r.load||r.actualLoad||r.capacityLoad||0)||0;
    var reps=Number(r.reps||r.actualReps||r.currentReps||0)||0;
    var rpe=Number(r.rpe||0)||0;
    if(!load)return;
    var score=load*100+reps-(rpe>=9?25:0);
    if(!best||score>best.score)best={load:load,reps:reps,rpe:rpe,status:r.status||'',date:r.date||'',score:score};
  });
  return best;
}
function buildChargeDiagnosticForExercise(exercise, shownLoad, context){
  context=context||{};
  if(!exercise)return null;
  var name=chargeKeyFromName ? chargeKeyFromName(exercise.name||'Mouvement') : (exercise.name||'Mouvement');
  var label=chargeDiagLabel(exercise);
  var parsed=(typeof parseTargetReps==='function')?parseTargetReps(exercise.format||'', context.targetReps||10):{min:context.targetReps||10,max:context.targetReps||10};
  var targetReps=Number(context.targetReps||parsed.min||parsed.max||8)||8;
  var shown=String(shownLoad||exercise.load||'').trim();
  var programLoad=String(exercise.load||context.programLoad||'').trim();
  var shownNum=chargeDiagNumber(shown);
  var programNum=chargeDiagNumber(programLoad);
  var rows=chargeDiagHistory(label);
  var recent=rows.length?rows[rows.length-1]:null;
  var recentBest=chargeDiagRecentBest(rows);
  var cap=chargeDiagRangeCap(label,targetReps);
  var alerts=[];
  var severity='ok';

  function add(code,level,title,detail){
    alerts.push({code:code,level:level,title:title,detail:detail});
    if(level==='critical')severity='critical';
    else if(level==='warning'&&severity!=='critical')severity='warning';
    else if(level==='watch'&&severity==='ok')severity='watch';
  }

  if(!rows.length){
    add('data_low','watch','Données faibles','Aucun historique exploitable trouvé pour ce mouvement. La charge vient surtout du programme ou des références de base.');
  }
  if(shown.indexOf('⚠')>=0){
    add('active_warning','warning','Avertissement actif','Le moteur affiche déjà un triangle. La charge est probablement cappée ou sous surveillance.');
  }
  if(recentBest&&shownNum){
    var gap=recentBest.load-shownNum;
    if(gap>=25 && recentBest.rpe && recentBest.rpe<=8.5){
      add('suspect_too_low','critical','Charge probablement trop basse','Historique récent : '+recentBest.load+' lb × '+recentBest.reps+' @ RPE '+recentBest.rpe+'. Charge affichée : '+shown+'. Écart : '+gap+' lb.');
    }else if(gap>=15 && recentBest.rpe && recentBest.rpe<=8){
      add('maybe_too_low','watch','Charge possiblement basse','Historique récent au-dessus de la suggestion avec RPE contrôlé. À surveiller, pas nécessairement une erreur si la baisse est volontaire.');
    }
  }
  if(recent&&shownNum){
    var lastLoad=Number(recent.load||recent.actualLoad||recent.capacityLoad||0)||0;
    var lastRpe=Number(recent.rpe||0)||0;
    if(lastRpe>=9 && shownNum>lastLoad){
      add('suspect_too_high','critical','Progression bloquée attendue','Dernière donnée RPE '+lastRpe+' à '+lastLoad+' lb. Règle V51 : la prochaine suggestion ne doit jamais augmenter.');
    }
    if(typeof isIsolationMovement==='function'&&isIsolationMovement(label)&&lastRpe>=8.5&&shownNum>lastLoad){
      add('isolation_too_high','warning','Isolation trop agressive','Mouvement d’isolation avec RPE '+lastRpe+'. La suggestion devrait maintenir ou réduire légèrement.');
    }
    if(label==='Overhead Rope Extension'&&lastLoad){
      var fridayCtx=(state&&String(state.day||'').toLowerCase()==='vendredi');
      var maxAllowed=(lastRpe<=8)?lastLoad+5:lastLoad;
      if(fridayCtx&&recentBest&&recentBest.load>=60&&recentBest.rpe<=8)maxAllowed=Math.max(maxAllowed,recentBest.load);
      if(shownNum>maxAllowed){
        add('overhead_rope_jump','critical','Saut Overhead Rope Extension bloqué','Dernière référence '+lastLoad+' lb @ RPE '+lastRpe+'. Progression max +5 lb seulement si RPE ≤ 8.');
      }
    }
  }
  if(typeof isTechnicalMovement==='function'&&isTechnicalMovement(label)&&shownNum&&programNum&&shownNum>programNum){
    add('technique_progression','warning','Technique : progression automatique interdite','Ce mouvement technique ne devrait pas auto-progresser comme un mouvement principal.');
  }
  if(cap&&cap.status){
    if(cap.status==='recalibrating'||cap.status==='watch'){
      add('recalibration','watch','Mouvement sous surveillance','athlete_state indique '+cap.status+'. Le moteur devrait rester prudent jusqu’à confirmation.');
    }
    if(cap.status==='upgrade_ready'){
      add('upgrade_ready','watch','Progression possible','Dernière référence facile ou réussie avec marge. Une petite progression peut être logique.');
    }
    if(cap.status==='hard'){
      add('hard_recent','watch','RPE haut récent','Dernière référence difficile. Maintien ou légère baisse peut être logique.');
    }
  }
  if(programNum&&shownNum&&Math.abs(shownNum-programNum)>=20 && !alerts.some(function(a){return a.code==='suspect_too_low'||a.code==='suspect_too_high';})){
    add('far_from_program','watch','Écart important avec le programme','La charge affichée est loin de la charge prévue. Ce n’est pas forcément une erreur, mais ça mérite vérification.');
  }

  var cycleComment='';
  try{
    var wk=state&&state.week?state.week:null;
    var day=state&&state.day?state.day:null;
    var cfg=focus?focus():{};
    var weekInfo=buildWeekInfo?buildWeekInfo():{};
    var wg=(wk&&weekInfo[wk])?weekInfo[wk].goal:'';
    cycleComment='S'+wk+' '+day+' — '+((cfg&&cfg.label)||'cycle actif')+(wg?' · '+wg:'');
  }catch(e){ cycleComment='Cycle actif non disponible.'; }

  var summary='Charge cohérente avec les données disponibles.';
  if(severity==='critical')summary='Alerte forte : la charge affichée semble incohérente avec l’historique récent.';
  else if(severity==='warning')summary='Avertissement : la charge mérite une vérification avant exécution.';
  else if(severity==='watch')summary='À surveiller : données faibles, contexte différent ou ajustement prudent. Pas nécessairement une erreur.';

  return {
    name:name,
    movementKey:label,
    format:exercise.format||context.format||'',
    targetReps:targetReps,
    programLoad:programLoad,
    shownLoad:shown,
    shownLoadNum:shownNum||null,
    programLoadNum:programNum||null,
    equipment:(typeof equipmentStepLabelForExercise==='function'?equipmentStepLabelForExercise(name, programLoad||shown):''),
    range:chargeDiagRepRange(targetReps),
    severity:severity,
    summary:summary,
    cycleComment:cycleComment,
    alerts:alerts,
    recentBest:recentBest?{date:recentBest.date,load:recentBest.load,reps:recentBest.reps,rpe:recentBest.rpe,status:recentBest.status}:null,
    cap:cap||null,
    recentHistory:rows.slice(-5).reverse()
  };
}
function collectChargeDiagnosticsForDay(day,week){
  day=day||state.day; week=week||state.week;
  var w=buildWorkout(day,week);
  var rows=[];
  (w.blocks||[]).forEach(function(b,bi){
    if(b.exercises&&b.exercises.length){
      b.exercises.forEach(function(e,ei){
        var parsed=parseTargetReps(e.format,10);
        var target=parsed.min||parsed.max||10;
        var shown=athleteSuggestedLoad(e.name,e.load,target);
        var d=buildChargeDiagnosticForExercise(e,shown,{blockTitle:b.title,blockIndex:bi+1,exerciseIndex:ei,targetReps:target});
        if(d){d.blockTitle=b.title;d.blockIndex=bi+1;d.exerciseIndex=ei;rows.push(d);}
      });
    }else if(b.progress&&b.progress.length){
      b.progress.forEach(function(mvKey,j){
        var reps=targetReps(j,b.kind),fmt=setScheme(b.kind,j),base=suggestLoad(mvKey,progressionPct(j),reps);
        var mv=movements[mvKey]||{name:mvKey};
        var shown=lbForExercise(mv.name, roundLoadForExercise(mv.name, base, 'nearest'));
        var d=buildChargeDiagnosticForExercise({name:mv.name,load:shown,format:fmt},shown,{blockTitle:b.title,blockIndex:bi+1,exerciseIndex:j,targetReps:reps});
        if(d){d.blockTitle=b.title;d.blockIndex=bi+1;d.exerciseIndex=j;d.progressKey=mvKey;rows.push(d);}
      });
    }
  });
  return rows;
}
function buildChargeDiagnosticReport(scope){
  scope=scope||'day';
  var rows=[];
  if(scope==='week'){
    currentDayOrder().forEach(function(d){ rows=rows.concat(collectChargeDiagnosticsForDay(d,state.week).map(function(x){x.day=d;return x;})); });
  }else{
    rows=collectChargeDiagnosticsForDay(state.day,state.week).map(function(x){x.day=state.day;return x;});
  }
  var counts={critical:0,warning:0,watch:0,ok:0};
  rows.forEach(function(r){counts[r.severity]=(counts[r.severity]||0)+1;});
  return {
    version:APP_VERSION,
    generatedAt:new Date().toISOString(),
    type:'charge_diagnostic_readonly',
    scope:scope,
    cycle:state.cycle&&state.cycle.goal,
    week:state.week,
    day:scope==='day'?state.day:null,
    summary:counts,
    cycleComment:chargeDiagnosticCycleComment(rows),
    rows:rows
  };
}
function chargeDiagnosticCycleComment(rows){
  var crit=rows.filter(function(r){return r.severity==='critical';}).length;
  var warn=rows.filter(function(r){return r.severity==='warning';}).length;
  var watch=rows.filter(function(r){return r.severity==='watch';}).length;
  if(crit)return 'Alerte : au moins une charge semble aberrante par rapport à l’historique. Ne pas corriger automatiquement sans vérifier le mouvement.';
  if(warn)return 'Séance globalement utilisable, mais certaines charges méritent une vérification avant exécution.';
  if(watch)return 'Séance cohérente, avec quelques mouvements à surveiller à cause du RPE ou du manque de données.';
  return 'Aucune aberration évidente détectée dans les charges de cette sélection.';
}
function renderChargeDiagnosticPanel(){
  var box=$('chargeDiagnosticOutput'); if(!box)return;
  var report=buildChargeDiagnosticReport('day');
  var rows=report.rows||[];
  var flags=rows.filter(function(r){return r.severity!=='ok';});
  var html='<div class="system-tag" style="margin-bottom:10px">Lecture seule · aucune correction automatique</div>'+
    '<p class="muted">'+escapeHtml(report.cycleComment)+'</p>'+
    '<p><strong>'+rows.length+'</strong> mouvements analysés · <strong>'+report.summary.critical+'</strong> critiques · <strong>'+report.summary.warning+'</strong> avertissements · <strong>'+report.summary.watch+'</strong> à surveiller.</p>';
  if(flags.length){
    html+='<div class="history-list">'+flags.map(function(r){
      var icon=r.severity==='critical'?'⚠️':(r.severity==='warning'?'⚠':'•');
      var first=(r.alerts&&r.alerts[0])?r.alerts[0]:null;
      return '<div class="history-item"><strong>'+icon+' '+escapeHtml(r.name)+'</strong><br><small>'+escapeHtml(r.blockTitle||'')+' · '+escapeHtml(r.shownLoad||'—')+' · '+escapeHtml(r.summary)+'</small>'+(first?'<p class="muted">'+escapeHtml(first.detail)+'</p>':'')+'</div>';
    }).join('')+'</div>';
  }else{
    html+='<p class="muted">Aucune alerte pour la séance affichée.</p>';
  }
  box.innerHTML=html;
}
function exportChargeDiagnostic(scope){
  var report=buildChargeDiagnosticReport(scope||'day');
  var name='coach-beurt-charge-diagnostic-'+(report.cycle||'cycle')+'-S'+report.week+'-'+(report.day||'semaine')+'.json';
  download(name,JSON.stringify(report,null,2));
}
function copyChargeDiagnostic(scope){
  var report=buildChargeDiagnosticReport(scope||'day');
  var txt=JSON.stringify(report,null,2);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){alert('Diagnostic copié.');}).catch(function(){download('coach-beurt-charge-diagnostic.json',txt);});
  }else{
    download('coach-beurt-charge-diagnostic.json',txt);
  }
}
function setupChargeDiagnosticBindings(){
  var refresh=$('refreshChargeDiagnosticBtn'); if(refresh)refresh.onclick=renderChargeDiagnosticPanel;
  var copyDay=$('copyChargeDiagnosticDayBtn'); if(copyDay)copyDay.onclick=function(){copyChargeDiagnostic('day');};
  var exportDay=$('exportChargeDiagnosticDayBtn'); if(exportDay)exportDay.onclick=function(){exportChargeDiagnostic('day');};
  var exportWeek=$('exportChargeDiagnosticWeekBtn'); if(exportWeek)exportWeek.onclick=function(){exportChargeDiagnostic('week');};
}
