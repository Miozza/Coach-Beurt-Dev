// Coach Bertin configuration programme extraite de app.js
// Ne contient pas de données personnelles vivantes comme resultats.json.

var defaultProfile = {bench:300,frontSquat:215,strictPress:185,powerClean:225,backSquat5RM:235,hipThrust8RM:315,bulgarianDb:50,dbRdl:70,row8RM:185,chestRow8RM:160,latPulldown10RM:140,inclineDb10RM:55};

var movements = {
  bench:        {name:"Bench press",           profile:"bench"},
  inclineDb:    {name:"Incline DB press",       profile:"inclineDb10RM"},
  strictPress:  {name:"Strict press",           profile:"strictPress"},
  // aucun Chest Supported Row dans l'app. Alias conservé pour ne pas casser les anciennes données.
  chestRow:     {name:"Barbell row",            profile:"row8RM"},
  barbellRow:   {name:"Barbell row",            profile:"row8RM"},
  latPulldown:  {name:"Weighted pull-up",       profile:null},
  frontSquat:   {name:"Front squat",            profile:"frontSquat"},
  backSquat:    {name:"Back Squat",             profile:"backSquat5RM"},
  hipThrust:    {name:"Hip thrust",             profile:"hipThrust8RM"},
  bulgarian:    {name:"Bulgarian split squat",  profile:"bulgarianDb"},
  powerClean:   {name:"Power clean",            profile:"powerClean"},
  dbSnatch:     {name:"DB snatch",              profile:null},
  farmerCarry:  {name:"Farmer carry",           profile:null},
  lateralRaise: {name:"Lateral raise",          profile:null},
  rearDeltFly:  {name:"Rear delt fly",          profile:null},
  ropePushdown: {name:"Triceps rope pushdown",  profile:null},
  facePull:     {name:"Face pull",              profile:null},
  pushPress:    {name:"Push press léger",        profile:"strictPress"}
};

var estimatedDailyLoads = {lateralRaise:25,rearDeltFly:25,ropePushdown:70,facePull:70,latPulldown:20,dbSnatch:50,farmerCarry:50};

var baseDays = {
  lundi:   {label:"Lundi",   base:"Push",      focus:"Pectoraux, épaules, triceps, serratus.", progress:["bench","inclineDb"],       warmup:"Bike 3 min + band pull-aparts + wall slides + activation serratus.", accessory:"Incline DB press + lateral raise + serratus cable punch.", wod:"10 cal row + 10 DB push press léger + 8 burpees"},
  mardi:   {label:"Mardi",   base:"Pull",      focus:"Dos, biceps, scapula, posture.",         progress:["barbellRow","latPulldown"], warmup:"Row 3 min + dead hang + scap pull-ups + band rows.", accessory:"Weighted pull-up + face pull + DB curls.", wod:"12 cal SkiErg + 12 ring rows stricts"},
  mercredi:{label:"Mercredi",base:"Jour optionnel", focus:"Utilisé seulement par les programmes qui déclarent mercredi.", progress:[], warmup:"Préparation légère.", accessory:"Accessoires légers.", wod:"Conditioning facile"},
  jeudi:   {label:"Jeudi",   base:"Legs",      focus:"Jambes, fessiers, chaîne postérieure.",  progress:["frontSquat","bulgarian"], warmup:"Bike 3 min + air squats + glute bridge + mobilité hanches.", accessory:"Bulgarian split squat + DB RDL.", wod:"12 cal bike + 12 KB swings + 10 box step-ups"},
  vendredi:{label:"Vendredi",base:"Full body", focus:"Moteur, transitions, puissance.",         progress:["powerClean","strictPress"],warmup:"Row 3 min + mobilité hanches/épaules + ramp-up technique.", accessory:"Farmer carry + reverse fly + hollow hold.", wod:"30 wall balls + 30 cal row + 30 DB snatch alternés"},
  samedi:  {label:"Samedi",  base:"Jour optionnel", focus:"Utilisé seulement par les programmes qui déclarent samedi.", progress:[], warmup:"Préparation légère.", accessory:"Accessoires légers.", wod:"Conditioning facile"},
  dimanche:{label:"Dimanche",base:"Jour optionnel", focus:"Utilisé seulement par les programmes qui déclarent dimanche.", progress:[], warmup:"Préparation légère.", accessory:"Mobilité ou récupération.", wod:"Récupération active"}
};

var wodBanks = {
  push:         ["10 cal row + 10 DB push press + 8 burpees","12 cal row + 10 push-ups + 12 sit-ups","10 cal bike + 8 DB thrusters + 8 burpees"],
  pull:         ["12 cal SkiErg + 12 ring rows","10 cal row + 10 KB high pulls + 10 ring rows","40 cal row + 30 ring rows + 20 DB snatch"],
  legs:         ["12 cal bike + 12 KB swings + 10 box step-ups","14 cal bike + 12 goblet squats","50 cal bike + 40 KB swings + 30 step-ups"],
  weightlifting:["EMOM 10 : 2 power cleans légers","10 min qualité : 3 hang power clean + 6 burpees","8 min technique : clean pull + front squat léger"],
  engine:       ["AMRAP 14 : 10 wall balls + 12 cal row + 8 DB snatch","EMOM 16 : row/bike/ski/bodyweight","12 min pacing : bike + step-ups + ring rows"],
  lowimpact:    ["10 min bike zone 2","10 min row zone 2","AMRAP facile : 8 cal row + 8 air squats + 8 ring rows"]
};

// propre — correctifs runtime centralisés dans CE fichier seulement.
(function coachBeurtV5018RuntimePatch(){
  function later(fn){ setTimeout(fn, 0); }
  function norm(s){ return String(s||"").toLowerCase().replace(/[^a-z0-9à-ÿ]+/g," ").trim(); }
  function stripPrefix(s){ return String(s||"").replace(/^[A-Z][0-9]?\.\s*/,"").trim(); }
  function parseNum(v){ if(v===0||v==="0")return 0; var m=String(v||"").replace(",",".").match(/[0-9]+(\.[0-9]+)?/); return m?Number(m[0]):null; }
  function round5Local(n){ if(!n&&n!==0)return null; return Math.round(Number(n)/5)*5; }
  function lbLocal(n){ var r=round5Local(n); return (r===0||r)?r+" lb":"—"; }
  function epleyLocal(load,reps){ load=Number(load)||0; reps=Number(reps)||0; return load&&reps ? load*(1+reps/30) : 0; }
  function loadForReps(oneRm,reps){ oneRm=Number(oneRm)||0; reps=Number(reps)||1; return oneRm ? oneRm/(1+reps/30) : 0; }
  function repRangeLocal(reps){ reps=Number(reps)||0; if(reps<=5)return"strength"; if(reps<=12)return"hypertrophy"; return"endurance"; }
  function canonName(name){
    var n=stripPrefix(name);
    var x=norm(n);
    if(/weighted pull up.*ring row/.test(x)) return "Weighted Pull-up / Ring Row lourd";
    if(/ring row lourd/.test(x)) return "Ring Row lourd";
    if(/weighted pull up/.test(x)) return "Weighted Pull-up";
    if(/db shoulder press.*landmine press/.test(x)) return "DB Shoulder Press / Landmine Press";
    if(/db shoulder press/.test(x)) return "DB Shoulder Press";
    if(/landmine press/.test(x)) return "Landmine Press";
    if(/power clean technique|clean technique/.test(x)) return "Power Clean technique";
    if(/power clean wod/.test(x)) return "Power Clean WOD";
    if(/power clean/.test(x)) return "Power Clean";
    if(/overhead rope extension/.test(x)) return "Overhead Rope Extension";
    if(/strict press/.test(x)) return "Strict Press";
    if(/chest[ -]?supported row|chest row/i.test(n)) return "Barbell Row";
    if(/barbell row/i.test(n)) return "Barbell Row";
    return n;
  }
  function findAthleteMovement(name){
    var ast=(window.state&&state.athleteState&&state.athleteState.movements)?state.athleteState.movements:null;
    if(!ast)return null;
    var wanted=norm(canonName(name));
    var keys=Object.keys(ast);
    for(var i=0;i<keys.length;i++){
      var k=norm(canonName(keys[i]));
      if(k===wanted)return ast[keys[i]];
    }
    return null;
  }
  function bestRange(mv,targetReps){
    if(!mv||!mv.ranges)return null;
    var desired=repRangeLocal(targetReps);
    return mv.ranges[desired] || mv.ranges.hypertrophy || mv.ranges.strength || mv.ranges.endurance || null;
  }
  function historyRows(mv){
    var h=(mv&&Array.isArray(mv.history))?mv.history.slice(-5).reverse():[];
    return h.map(function(x){
      return {
        date:x.date||"?",
        load:x.load||"?",
        reps:x.reps||"?",
        rpe:x.rpe||"?",
        status:x.status||""
      };
    });
  }
  function storeAutoLoadHint(name,suggestion,reason,mv){
    window.__coachLoadHints=window.__coachLoadHints||{};
    var clean=canonName(name);
    window.__coachLoadHints[norm(clean)]={
      name:clean,
      load:lbLocal(suggestion),
      reason:reason,
      rows:historyRows(mv)
    };
  }
  function findAutoLoadHint(name){
    var map=window.__coachLoadHints||{};
    var key=norm(canonName(name));
    // V51.03 : exact seulement pour éviter les mappings ambigus
    // (Weighted Pull-up ≠ Ring Row lourd, Power Clean technique ≠ Power Clean lourd).
    return map[key]||null;
  }
  function smartSuggestedLoad(name,currentLoad,targetReps){
    var staticLoad=parseNum(currentLoad);
    var mv=findAthleteMovement(name);
    var cap=bestRange(mv,targetReps||8);
    if(!cap||(!cap.currentLoad&&!cap.actualLoad&&!cap.estimated1RM)) return currentLoad;
    if(window.coachSafeSuggestedLoad)return window.coachSafeSuggestedLoad(name,currentLoad,targetReps);

    var target=Number(targetReps)||Number(cap.currentReps)||8;
    var actualLoad=Number(cap.actualLoad||cap.currentLoad)||0;
    var actualReps=Number(cap.actualReps||cap.currentReps||target)||target;
    var rpe=Number(cap.rpe)||8;
    var status=String(cap.status||"");
    var base=Number(cap.currentLoad||actualLoad)||0;
    var oneRm=Number(cap.estimated1RM)||epleyLocal(actualLoad,actualReps);
    var projected=loadForReps(oneRm,target)||base;
    var suggestion=base;
    var reason="basé sur historique";

    if(status==="recalibrating"||status==="watch"||rpe>=9.5){
      suggestion=Math.min(staticLoad||base, base);
      reason="surveillance RPE";
    }else if(status==="hard"||rpe>=9){
      suggestion=base;
      reason="RPE haut";
    }else if(status==="upgrade_ready"||status==="easy_success"||rpe<=7){
      var step=base>=100?10:5;
      suggestion=Math.max(base+step, Math.min(projected, base+step));
      reason="séance précédente facile, RPE "+(rpe||"?");
    }else if(status==="success"&&actualReps>target&&rpe<=8){
      suggestion=base+(base>=100?5:5);
      reason="réussi avec marge";
    }else{
      suggestion=Math.max(base, staticLoad||0);
      reason="basé sur historique";
    }

    suggestion=round5Local(suggestion);
    if(!suggestion)return currentLoad;
    if(staticLoad&&suggestion<staticLoad&&!(status==="watch"||status==="recalibrating"))suggestion=staticLoad;
    storeAutoLoadHint(name,suggestion,reason,mv);
    return lbLocal(suggestion);
  }
  function patchBlocks(blocks){
    (blocks||[]).forEach(function(b){
      if(b.text)b.text=String(b.text).replace(/poitrine appuyée/gi,"buste solide").replace(/Chest Supported Row/gi,"Barbell Row").replace(/chest supported row/gi,"barbell row");
      (b.exercises||[]).forEach(function(e){
        if(/chest[ -]?supported row|chest row/i.test(e.name||"")){
          e.name=String(e.name).replace(/Chest Supported Row léger/gi,"Barbell Row léger").replace(/Chest Supported Row/gi,"Barbell Row").replace(/Chest row/gi,"Barbell Row");
          e.load=(/léger|modéré|—/.test(String(e.load||""))) ? "95-115 lb" : e.load;
          e.note="Tirage propre, buste solide, scapulas stables. Pas un max de dos.";
        }
      });
    });
    return blocks;
  }
  later(function(){
    try{
      if(window.COACH_BERTIN_PROGRAMS&&window.COACH_BERTIN_PROGRAMS.shoulders3d){
        var p=window.COACH_BERTIN_PROGRAMS.shoulders3d;
        if(!p.__v5018Patched){
          var oldGet=p.getBlocks;
          p.getBlocks=function(day,week){ return patchBlocks(oldGet.call(p,day,week)); };
          p.dayIntentions=p.dayIntentions||{};
          p.dayIntentions.lundi="Push + épaules session 1 : strict press prioritaire, tampon scapulaire en Barbell Row léger, incline DB, câble latéral, triceps.";
          p.dayIntentions.mardi="Pull + arrière d'épaule + biceps : Barbell Row, pull-up/ring row, rear delt, face pull, trap-3, curl. Aucun triceps, aucun press.";
          p.dayMeta=p.dayMeta||{};
          if(p.dayMeta.lundi)p.dayMeta.lundi.focus="Strict Press, Barbell Row léger tampon scapulaire, Incline DB press, lateral raise câble, triceps, WOD court.";
          if(p.dayMeta.mardi)p.dayMeta.mardi.focus="Barbell Row, pull-up/ring row, rear delt, face pull, trap-3, curls.";
          p.__v5018Patched=true;
        }
      }
      if(window.focusConfigs&&focusConfigs.shoulders3d&&window.COACH_BERTIN_PROGRAMS&&window.COACH_BERTIN_PROGRAMS.shoulders3d){
        focusConfigs.shoulders3d.getBlocks=window.COACH_BERTIN_PROGRAMS.shoulders3d.getBlocks;
        focusConfigs.shoulders3d.dayIntentions=window.COACH_BERTIN_PROGRAMS.shoulders3d.dayIntentions;
        focusConfigs.shoulders3d.dayMeta=window.COACH_BERTIN_PROGRAMS.shoulders3d.dayMeta;
      }
      window.athleteSuggestedLoad=function(nameOrKey,currentLoad,targetReps){ return window.coachSafeSuggestedLoad ? window.coachSafeSuggestedLoad(nameOrKey,currentLoad,targetReps) : smartSuggestedLoad(nameOrKey,currentLoad,targetReps); };

      var originalLoadInfoText=window.loadInfoText;
      window.loadInfoText=function(exercise,shownLoad){
        var hint=exercise?findAutoLoadHint(exercise.name):null;
        if(hint)return "AUTOLOAD_HISTORY::"+JSON.stringify(hint);
        return originalLoadInfoText?originalLoadInfoText(exercise,shownLoad):"";
      };

      var originalLoadInfoButtonHtml=window.loadInfoButtonHtml;
      window.loadInfoButtonHtml=function(exercise,shownLoad){
        var hint=exercise?findAutoLoadHint(exercise.name):null;
        if(hint){
          return '<button type="button" class="tuto-btn load-info-btn" data-load-info="'+encodeURIComponent("AUTOLOAD_HISTORY::"+JSON.stringify(hint))+'">!</button>';
        }
        return originalLoadInfoButtonHtml?originalLoadInfoButtonHtml(exercise,shownLoad):"";
      };

      window.showLoadInfoModal=function(msg){
        msg=String(msg||"").trim();
        if(!msg)return;
        var hint=null;
        if(msg.indexOf("AUTOLOAD_HISTORY::")===0){
          try{hint=JSON.parse(msg.slice("AUTOLOAD_HISTORY::".length));}catch(e){}
        }
        var existing=document.getElementById("loadInfoModal");
        if(existing)existing.remove();
        var modal=document.createElement("div");
        modal.id="loadInfoModal";
        modal.className="tuto-modal";
        if(hint){
          var rows=(hint.rows&&hint.rows.length)?hint.rows:[];
          var lis=rows.length ? rows.map(function(r){
            return "<li>"+escapeHtml((r.date||"?")+" — "+(r.load||"?")+" lb × "+(r.reps||"?")+" — RPE "+(r.rpe||"?"))+(r.status?" <small>"+escapeHtml(r.status)+"</small>":"")+"</li>";
          }).join("") : "<li>Aucune séance précédente enregistrée pour ce mouvement.</li>";
          modal.innerHTML =
            '<div class="tuto-modal-inner">'+
              '<div class="tuto-topline">HISTORIQUE DE CHARGE</div>'+
              '<div class="tuto-title">'+escapeHtml(hint.name||"Mouvement")+'</div>'+
              '<div class="tuto-goal"><strong>Charge suggérée : '+escapeHtml(hint.load||"—")+'</strong></div>'+
              '<div class="tuto-section"><div class="tuto-section-title">Raison</div><p>'+escapeHtml(hint.reason||"Basé sur les dernières séances enregistrées pour ce mouvement.")+'</p></div>'+
              '<div class="tuto-section"><div class="tuto-section-title">Petite historique</div><ul>'+lis+'</ul></div>'+
              '<button id="closeLoadInfoBtn" class="btn-accent" style="width:100%;margin-top:14px">Fermer</button>'+
            '</div>';
        }else{
          modal.innerHTML =
            '<div class="tuto-modal-inner">'+
              '<div class="tuto-topline">EXPLICATION DE CHARGE</div>'+
              '<div class="tuto-title">Pourquoi cette charge?</div>'+
              '<div class="tuto-goal">'+escapeHtml(msg)+'</div>'+
              '<button id="closeLoadInfoBtn" class="btn-accent" style="width:100%;margin-top:14px">Fermer</button>'+
            '</div>';
        }
        document.body.appendChild(modal);
        setTimeout(function(){modal.classList.add("visible");},20);
        var close=function(){modal.classList.remove("visible");setTimeout(function(){modal.remove();},220);};
        var btn=document.getElementById("closeLoadInfoBtn"); if(btn)btn.onclick=close;
        modal.addEventListener("click",function(e){ if(e.target===modal)close(); });
      };

      if(typeof render==="function")render();
      if(typeof renderPhoneWod==="function"&&document.getElementById("phoneView")&&document.getElementById("phoneView").classList.contains("view-active"))renderPhoneWod();
      if(typeof renderSessionEntry==="function")renderSessionEntry();
    }catch(e){ console.warn("Coach Beurt patch non appliqué",e); }
  });
})();
