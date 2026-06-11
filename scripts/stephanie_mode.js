// ─── Mode Stéphanie local simplifié ──────────────────────────────────────────
// V50.59 : extrait de app.js. Profil local séparé, sans GitHub sync.

var LOCAL_PROFILE_KEY = "coachBeurtLocalProfile";
var STEPH_STATE_KEY = "coachBeurtStephState";

function activeLocalProfileId(){
  try{
    var params = new URLSearchParams(window.location.search||"");
    var requested = (params.get("profile")||"").toLowerCase().trim();
    if(requested === "stephanie" || requested === "bertin"){
      localStorage.setItem(LOCAL_PROFILE_KEY, requested);
      return requested;
    }
    return localStorage.getItem(LOCAL_PROFILE_KEY) || "bertin";
  }catch(e){return "bertin";}
}
function switchLocalProfile(profile){
  profile = (profile === "stephanie") ? "stephanie" : "bertin";
  try{ localStorage.setItem(LOCAL_PROFILE_KEY, profile); }catch(e){}
  try{
    var url = new URL(window.location.href);
    url.searchParams.set("profile", profile);
    window.location.href = url.toString();
  }catch(e){
    window.location.search = "?profile=" + profile;
  }
}
function renderProfileSwitchButton(){
  // V50.51 : plus de bouton flottant. Le changement de profil se fait dans les réglages.
  var old = document.getElementById("profileSwitchBtn");
  if(old)old.remove();
}

function renderBertinProfileSettings(){
  // V50.51 : le changement de profil est maintenant dans le panneau statique
  // "Profil et actions rapides" de la gear Réglages. Aucun panneau injecté.
  var btn = $("openStephanieProfileBtn");
  if(btn)btn.onclick=function(){ switchLocalProfile("stephanie"); };
}

function stephDifficultyLabel(v){
  if(v==="too_easy")return "Trop facile";
  if(v==="too_hard")return "Trop difficile";
  return "Correct";
}
function stephPainLabel(v){return v==="yes"?"Oui":"Non";}
function stephHistoryText(){
  var st=loadStephState();
  var hist=(st.history||[]).slice();
  var lines=[];
  lines.push("Historique Stéphanie");
  lines.push("Export : "+new Date().toLocaleString("fr-CA"));
  lines.push("Version app : "+APP_VERSION);
  lines.push("");
  if(!hist.length){
    lines.push("Aucune séance enregistrée.");
    return lines.join("\n");
  }
  hist.forEach(function(h,i){
    lines.push("Séance "+(i+1));
    lines.push("Date : "+(h.date||"—")+" "+(h.time||""));
    lines.push("Entraînement : "+(h.title||h.sessionId||"—"));
    lines.push("RPE général : "+(h.rpe||"—"));
    lines.push("Difficulté : "+stephDifficultyLabel(h.difficulty));
    lines.push("Douleur : "+stephPainLabel(h.pain));
    lines.push("Note : "+(h.note&&String(h.note).trim()?h.note:"—"));
    lines.push("Version : "+(h.version||"—"));
    lines.push("");
  });
  return lines.join("\n");
}
function exportStephanieHistoryTxt(){
  var d=new Date().toLocaleDateString("fr-CA");
  download("historique-stephanie-"+d+".txt", stephHistoryText());
}
function deleteStephanieHistoryEntry(index){
  var st=loadStephState();
  var hist=st.history||[];
  if(index<0||index>=hist.length)return;
  var h=hist[index];
  var label=(h.date||"")+" · "+(h.title||h.sessionId||"séance");
  if(!confirm("Supprimer cette séance de l’historique local de Stéphanie ?\n\n"+label))return;
  hist.splice(index,1);
  st.history=hist;
  rebuildStephanieFeedbackFromHistory(st);
  saveStephState(st);
  openStephanieSettings();
}
function rebuildStephanieFeedbackFromHistory(st){
  var feedback={};
  (st.history||[]).forEach(function(h){
    if(!h||!h.sessionId)return;
    feedback[h.sessionId]=feedback[h.sessionId]||[];
    feedback[h.sessionId].push(h);
    if(feedback[h.sessionId].length>6)feedback[h.sessionId]=feedback[h.sessionId].slice(-6);
  });
  st.sessionFeedback=feedback;
}
function stephHistorySettingsHtml(){
  var st=loadStephState();
  var hist=(st.history||[]).slice();
  var html='<div class="steph-settings-section"><h4>Historique visible</h4>';
  if(!hist.length){
    html+='<p class="steph-sub">Aucune séance enregistrée pour l’instant.</p>';
  }else{
    html+='<div class="steph-history-list">';
    hist.slice().reverse().forEach(function(h,revIndex){
      var realIndex=hist.length-1-revIndex;
      html+='<div class="steph-history-row">'+
        '<div><strong>'+escapeHtml(h.date||"—")+'</strong> · '+escapeHtml(h.title||h.sessionId||"Séance")+'</div>'+
        '<div class="steph-history-meta">RPE '+escapeHtml(h.rpe||"—")+' · '+escapeHtml(stephDifficultyLabel(h.difficulty))+' · Douleur : '+escapeHtml(stephPainLabel(h.pain))+'</div>'+
        (h.note?'<div class="steph-history-note">'+escapeHtml(h.note)+'</div>':'')+
        '<button class="steph-mini-danger" data-steph-delete-history="'+realIndex+'">Supprimer cette séance</button>'+
      '</div>';
    });
    html+='</div>';
  }
  html+='<div class="steph-export-box"><button id="stephExportHistoryBtn" class="steph-btn">Exporter tout l’historique .TXT</button></div></div>';
  return html;
}
function openStephanieSettings(){
  var existing = document.getElementById("stephSettingsOverlay");
  if(existing)existing.remove();
  var overlay = document.createElement("div");
  overlay.id = "stephSettingsOverlay";
  overlay.className = "steph-settings-overlay";
  overlay.innerHTML =
    '<div class="steph-settings-modal">'+
      '<div class="steph-settings-head"><h3>Réglages Stéphanie</h3><button id="stephSettingsClose" class="steph-icon-btn">×</button></div>'+
      '<p class="steph-sub">Profil local sur cet appareil. Données séparées de Coach Beurt. Rien n’est envoyé sur GitHub.</p>'+
      stephHistorySettingsHtml()+
      '<div class="steph-settings-section steph-profile-section"><h4>Profil</h4><button id="stephToBertinBtn" class="steph-subtle-profile-btn">Coach Beurt</button></div>'+
    '</div>';
  document.body.appendChild(overlay);
  var close = document.getElementById("stephSettingsClose");
  if(close)close.onclick=function(){ overlay.remove(); };
  overlay.addEventListener("click",function(e){ if(e.target===overlay)overlay.remove(); });
  var toBertin = document.getElementById("stephToBertinBtn");
  if(toBertin)toBertin.onclick=function(){ switchLocalProfile("bertin"); };
  var exp = document.getElementById("stephExportHistoryBtn");
  if(exp)exp.onclick=exportStephanieHistoryTxt;
  overlay.querySelectorAll('[data-steph-delete-history]').forEach(function(btn){
    btn.onclick=function(){ deleteStephanieHistoryEntry(Number(btn.getAttribute('data-steph-delete-history'))); };
  });
}
function stephProgram(){
  var map = window.COACH_STEPHANIE_PROGRAMS || {};
  return map.hypertrophie_fesse_stephanie || {sessions:[], label:"Hypertrophie Fessiers"};
}
function loadStephState(){
  try{
    var raw=localStorage.getItem(STEPH_STATE_KEY);
    if(raw)return Object.assign({history:[], sessionFeedback:{}, selectedSessionId:null}, JSON.parse(raw));
  }catch(e){}
  return {profile:"stephanie", history:[], sessionFeedback:{}, selectedSessionId:null, createdAt:nowIso()};
}
function saveStephState(st){
  st.updatedAt=nowIso();
  try{localStorage.setItem(STEPH_STATE_KEY, JSON.stringify(st));}catch(e){}
}
function stephLastFeedback(sessionId){
  var st=loadStephState();
  var list=(st.sessionFeedback&&st.sessionFeedback[sessionId])||[];
  return list.length?list[list.length-1]:null;
}
function stephSuggestionText(sessionId){
  var last=stephLastFeedback(sessionId);
  if(!last)return "Première fois : choisir des charges prudentes, viser RPE 7.";
  var r=Number(last.rpe)||0;
  if(last.pain==="yes")return "Dernière séance avec douleur : réduire, simplifier ou choisir Core + mobilité.";
  if(r<=6)return "Dernière fois trop facile : augmenter légèrement la charge ou les reps.";
  if(r<=8)return "Dernière fois correcte : garder semblable ou petite progression.";
  if(r>=9)return "Dernière fois trop dure : garder ou réduire un peu.";
  return "Utiliser le RPE de la dernière séance pour ajuster.";
}
function renderStephanieSimpleApp(selectedId){
  document.body.classList.add("stephanie-mode");
  var existing=document.getElementById("stephanieApp");
  if(!existing){existing=document.createElement("div");existing.id="stephanieApp";document.body.appendChild(existing);}
  var program=stephProgram();
  var sessions=program.sessions||[];
  var st=loadStephState();
  if(selectedId)st.selectedSessionId=selectedId;
  saveStephState(st);
  var selected=sessions.filter(function(x){return x.id===st.selectedSessionId;})[0]||null;
  if(selected)renderStephanieSession(existing,program,selected);
  else renderStephanieSelector(existing,program,sessions,st);
}
function renderStephanieSelector(root,program,sessions,st){
  var hist=(st.history||[]).slice(-3).reverse();
  var html='<div class="steph-app">'+
    '<div class="steph-head"><div><h1 class="steph-title">Stéphanie</h1><p class="steph-sub">'+escapeHtml(program.label||"Hypertrophie Fessiers")+' · Choisis une séance et complète-la. Données locales seulement.</p></div><div class="steph-head-actions"><div class="steph-badge">Local · sans GitHub</div><button class="steph-gear-btn" data-steph-settings="1" title="Réglages">⚙</button></div></div>'+
    '<div class="steph-card"><h3>Choisir un entraînement</h3><p class="steph-sub">Épaule à respecter : pas d’overhead, pas de burpees en volume, pas de front rack lourd.</p></div>';
  sessions.forEach(function(s){
    var contenu = Array.isArray(s.contenu) ? s.contenu.join(' · ') : (s.contenu || '');
    var ev = s.evaluation || {};
    html+='<div class="steph-card steph-session-card"><div class="steph-card-top"><h3>'+escapeHtml(s.title)+'</h3><span class="steph-eval-pill">'+escapeHtml(ev.niveau||'Évalué')+'</span></div>'+      '<div class="steph-meta">'+escapeHtml(s.duration)+' · fatigue '+escapeHtml(s.fatigue)+'</div>'+      '<div class="steph-goal"><strong>Intention :</strong> '+escapeHtml(s.intention||s.goal)+'</div>'+      (contenu?'<div class="steph-detail"><strong>Dans la séance :</strong> '+escapeHtml(contenu)+'</div>':'')+      (s.meilleurChoix?'<div class="steph-detail"><strong>À choisir quand :</strong> '+escapeHtml(s.meilleurChoix)+'</div>':'')+      '<div class="steph-eval"><strong>Évaluation :</strong> '+escapeHtml(ev.raison||'Structure cohérente pour le but de la séance.')+(ev.surveillance?' <br><span>À surveiller : '+escapeHtml(ev.surveillance)+'</span>':'')+'</div>'+      '<div class="steph-caution">'+escapeHtml(stephSuggestionText(s.id))+'</div>'+      '<div class="steph-card-action"><button class="steph-btn steph-start-btn" data-steph-start="'+escapeHtml(s.id)+'">Démarrer</button></div></div>';
  });
  if(hist.length){
    html+='<div class="steph-card"><h3>Dernières séances</h3><div class="steph-history">'+hist.map(function(h){return escapeHtml(h.date+' · '+h.title+' · RPE '+h.rpe+(h.pain==='yes'?' · douleur':''));}).join('<br>')+'</div></div>';
  }
  html+='</div>';
  root.innerHTML=html;
  root.querySelectorAll('[data-steph-start]').forEach(function(btn){btn.onclick=function(){renderStephanieSimpleApp(btn.getAttribute('data-steph-start'));};});
  root.querySelectorAll('[data-steph-settings]').forEach(function(btn){btn.onclick=openStephanieSettings;});
}
function renderStephanieSession(root,program,session){
  var ev = session.evaluation || {};
  var contenu = Array.isArray(session.contenu) ? session.contenu.join(' · ') : (session.contenu || '');
  var html='<div class="steph-app">'+
    '<div class="steph-head"><div><h1 class="steph-title">'+escapeHtml(session.title)+'</h1><p class="steph-sub">'+escapeHtml(session.duration)+' · fatigue '+escapeHtml(session.fatigue)+' · '+escapeHtml(session.goal)+'</p></div><div class="steph-head-actions"><div class="steph-badge">Stéphanie</div><button class="steph-gear-btn" data-steph-settings="1" title="Réglages">⚙</button></div></div>'+    '<div class="steph-card"><div class="steph-goal"><strong>Intention :</strong> '+escapeHtml(session.intention||session.goal)+'</div>'+(contenu?'<div class="steph-detail"><strong>Dans la séance :</strong> '+escapeHtml(contenu)+'</div>':'')+'<div class="steph-eval"><strong>Évaluation :</strong> '+escapeHtml(ev.raison||'Structure cohérente.')+(ev.surveillance?' <br><span>À surveiller : '+escapeHtml(ev.surveillance)+'</span>':'')+'</div><div class="steph-caution">'+escapeHtml(session.caution||program.shoulderNote||'')+'</div><div class="steph-goal"><strong>Suggestion :</strong> '+escapeHtml(stephSuggestionText(session.id))+'</div></div>';
  (session.blocks||[]).forEach(function(b){
    html+='<div class="steph-block"><div class="steph-block-title">'+escapeHtml(b.title)+'</div><div class="steph-time">'+escapeHtml(b.time||'')+'</div>';
    if(b.text)html+='<div class="steph-goal">'+escapeHtml(b.text)+'</div>';
    (b.exercises||[]).forEach(function(e){
      html+='<div class="steph-ex"><div class="steph-ex-name">'+escapeHtml(e.name)+'</div><div class="steph-ex-line">'+escapeHtml(e.format)+' · '+escapeHtml(e.load)+'</div>'+(e.note?'<div class="steph-ex-line">'+escapeHtml(e.note)+'</div>':'')+'</div>';
    });
    html+='</div>';
  });
  html+='<div class="steph-card"><h3>Fin de séance</h3>'+
    '<label class="steph-label">RPE général</label><select id="stephRpe" class="steph-select"><option value="6">6 — facile</option><option value="7">7 — bon</option><option value="8" selected>8 — solide</option><option value="9">9 — très dur</option><option value="10">10 — trop dur</option></select>'+
    '<label class="steph-label">Difficulté</label><select id="stephDifficulty" class="steph-select"><option value="too_easy">Trop facile</option><option value="correct" selected>Correct</option><option value="too_hard">Trop difficile</option></select>'+
    '<label class="steph-label">Douleur</label><select id="stephPain" class="steph-select"><option value="no" selected>Non</option><option value="yes">Oui</option></select>'+
    '<label class="steph-label">Note optionnelle</label><input id="stephNote" class="steph-input" placeholder="ex: épaule ok, jambes lourdes" />'+
    '<div class="steph-actions steph-session-bottom-actions"><button class="steph-btn" id="stephBackBtn">Retour</button><button class="steph-btn" id="stephSaveBtn">Terminer</button></div><div id="stephStatus" class="steph-status"></div></div>'+
    '</div>';
  root.innerHTML=html;
  root.querySelectorAll('[data-steph-settings]').forEach(function(btn){btn.onclick=openStephanieSettings;});
  function goBackStephanie(){var st=loadStephState();st.selectedSessionId=null;saveStephState(st);renderStephanieSimpleApp();}
  var back=document.getElementById('stephBackBtn');if(back)back.onclick=goBackStephanie;
  var saveBtn=document.getElementById('stephSaveBtn');if(saveBtn)saveBtn.onclick=function(){saveStephanieSession(session);};
}
function saveStephanieSession(session){
  var st=loadStephState();
  var rpe=(document.getElementById('stephRpe')||{}).value||'8';
  var difficulty=(document.getElementById('stephDifficulty')||{}).value||'correct';
  var pain=(document.getElementById('stephPain')||{}).value||'no';
  var note=(document.getElementById('stephNote')||{}).value||'';
  var row={
    profile:'stephanie',
    date:new Date().toLocaleDateString('fr-CA'),
    time:new Date().toLocaleTimeString('fr-CA'),
    sessionId:session.id,
    title:session.title,
    rpe:Number(rpe),
    difficulty:difficulty,
    pain:pain,
    note:note,
    version:APP_VERSION
  };
  st.history=st.history||[];st.history.push(row);
  st.sessionFeedback=st.sessionFeedback||{};st.sessionFeedback[session.id]=st.sessionFeedback[session.id]||[];st.sessionFeedback[session.id].push(row);
  if(st.sessionFeedback[session.id].length>6)st.sessionFeedback[session.id]=st.sessionFeedback[session.id].slice(-6);
  st.selectedSessionId=null;
  saveStephState(st);
  var status=document.getElementById('stephStatus');if(status)status.textContent='Séance sauvegardée localement. Visible dans ⚙ Réglages.';
  setTimeout(function(){renderStephanieSimpleApp();},500);
}
