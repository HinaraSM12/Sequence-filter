// frontend/filter_seq.js
// Compat layer: expone funciones en window si algún código legacy las llama
(function(w){
  'use strict';
  const B = w.Bio;
  if (!B) return;

  // Solo alias; NO redeclaran constantes globales
  w.getCharge = B.getCharge;
  w.getIsoEle = B.getIsoEle;
  w.getHidrof = B.getHidrof;
  w.getMoment = B.getMoment;
  w.getBoman = B.getBoman;
  w.getMostUsedAminoacids = B.getMostUsedAminoacids;
  w.addHighLights = B.addHighLights;
})(window);
