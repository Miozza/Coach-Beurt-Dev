/* Coach Beurt V50.85 — Navigation helpers
   Extraction prudente : gestion des vues seulement.
   Aucun changement voulu au comportement de l'app.
*/

var VIEWS=["training","phone","results","cycle","history","settings","profile","references","backup"];

function switchView(v){
  VIEWS.forEach(function(x){
    var main=$(x+"View"),tab=$(x+"Tab");
    if(main){if(v===x)main.classList.add("view-active");else main.classList.remove("view-active");}
    if(tab)tab.classList.toggle("active",v===x);
  });
  document.body.classList.toggle("results-view-active", v==="results");
  if(v!=="results") document.body.classList.remove("guided-results-active");
  if(v==="phone"){renderPhoneWod();updateRestDisplay();}
  if(v==="results"){document.body.classList.add("guided-results-active");renderSessionEntry();}
  if(v==="cycle")renderCycle();
  if(v==="history")renderHistory();
  if(v==="profile")renderProfile();
  if(v==="references")renderReferences();
  if(v==="settings")renderSettings();
}
