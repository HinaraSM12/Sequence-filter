/* ==========================
   Sequence-Filter | app.js
   ========================== */

// Silenciador de consola opcional (útil en producción)
const MUTE_CONSOLE = false;
(function hardMuteConsole(){
  if (!MUTE_CONSOLE) return;
  const noop = function(){};
  const methods = [
    'log','info','debug','warn','error','table','group','groupCollapsed','groupEnd',
    'dir','trace','time','timeEnd','timeLog','assert','count','countReset','clear'
  ];
  for (const m of methods) { if (m in console) console[m] = noop; }
})();

const API_BASE = '/api';

let sequences = [];
let cachedMetrics = new Map();
let lastFiltered = [];

/* ========= HELPERS ========= */
const $id = (id)=>document.getElementById(id);

/* ---------- Overlay ---------- */
function ensureOverlayOnTop(){
  const ov = $id('loadingOverlay');
  if (!ov) return null;
  if (ov.parentNode !== document.body) document.body.appendChild(ov);

  // Forzar sobre todo
  Object.assign(ov.style, {
    position:'fixed', left:'0', top:'0', width:'100vw', height:'100vh',
    zIndex:'2147483647', display:'grid', placeItems:'center',
    background:'rgba(255,255,255,.75)', backdropFilter:'blur(1.5px)',
    transition:'opacity .2s ease', visibility:'visible'
  });
  return ov;
}
function showLoader(msg='Cargando…'){
  const ov = ensureOverlayOnTop(); if (!ov) return;
  const t = ov.querySelector('.sf-loading__text'); if (t) t.textContent = msg;
  ov.style.opacity = '1'; ov.style.pointerEvents = 'auto'; ov.style.visibility = 'visible';
  document.documentElement.style.overflow = 'hidden';
  ['findButton','downloadCsv','downloadFasta'].forEach(id=>{ const el=$id(id); if (el) el.disabled = true; });
}
function hideLoader(){
  const ov = $id('loadingOverlay'); if (!ov) return;
  ov.style.opacity = '0'; ov.style.pointerEvents = 'none'; ov.style.visibility = 'hidden';
  document.documentElement.style.overflow = '';
  ['findButton','downloadCsv','downloadFasta'].forEach(id=>{ const el=$id(id); if (el) el.disabled = false; });
}
async function paintOverlay(){
  await new Promise(requestAnimationFrame);
  const ov = $id('loadingOverlay'); if (ov) void ov.offsetHeight;
  await new Promise(requestAnimationFrame);
}

/* ---------- Inputs ---------- */
function escapeRegexExceptX(str){
  const ESC = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return ESC.replace(/X/gi, '[A-Z]');
}
function readInputs(){
  const rawText = ($id('inputTextSequence').value || '').toUpperCase().trim();
  const filterRegex    = rawText ? new RegExp(escapeRegexExceptX(rawText))     : /(?:)/;
  const highlightRegex = rawText ? new RegExp(escapeRegexExceptX(rawText),'g') : /(?:)/g;

  const ignoreRaw = ($id('inputTextIgnoreSequence')?.value || '').toUpperCase();
  const ignorePatterns = (ignoreRaw || '').split(',').map(s=>s.trim()).filter(Boolean)
    .map(s=>new RegExp(escapeRegexExceptX(s)));

  const num = (id)=>{
    const el = $id(id);
    const raw = String(el?.value || '').trim().replace(',', '.');
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  };

  return {
    filterRegex, highlightRegex, ignorePatterns,
    ranges: {
      charge:  [num('minCharge'),      num('maxCharge')],
      isoelec: [num('minIsoelectric'), num('maxIsoelectric')],
      hidro:   [num('minHidrofobic'),  num('maxHidrofobic')],
      boman:   [num('minBoman'),       num('maxBoman')],
      moment:  [num('minMoment'),      num('maxMoment')],
    }
  };
}

/* ---------- Métricas con caché ---------- */
function canonicalMetrics(seq){
  const s = cleanSeq(seq);
  if (cachedMetrics.has(s)) return cachedMetrics.get(s);
  const charge_int = Math.round(getCharge(s));
  const pI  = +getIsoEle(s);
  const H   = +Number(getHidrof(s)).toFixed(2);
  const B   = +Number(getBoman(s)).toFixed(2);
  const MHr = +Number(getMoment(s)).toFixed(2);
  const out = { charge_int, pI, H, B, MHr, len: s.length };
  cachedMetrics.set(s, out);
  return out;
}
function inRangeInclusive(val, min, max){
  if (val == null || Number.isNaN(val)) return false;
  const hasMin = min != null && !Number.isNaN(min);
  const hasMax = max != null && !Number.isNaN(max);
  if (hasMin && hasMax) return val >= min && val <= max;
  if (hasMin)           return val >= min;
  if (hasMax)           return val <= max;
  return true;
}
function passesIgnore(seq, ignorePatterns){
  if (!ignorePatterns.length) return true;
  for (let i=0;i<ignorePatterns.length;i++){ if (ignorePatterns[i].test(seq)) return false; }
  return true;
}

/* ---------- Filtrado asíncrono ---------- */
async function filterSequencesAsync(data, ctx, onProgress, chunkSize=2500){
  const out = [];
  const total = data.length || 1;
  for (let i=0;i<data.length;i++){
    const it = data[i];
    if (ctx.filterRegex.source === '(?:)' || (it.sequence || '').match(ctx.filterRegex)){
      if (passesIgnore(it.sequence, ctx.ignorePatterns)){
        const m = canonicalMetrics(it.sequence);
        if (
          inRangeInclusive(m.charge_int, ctx.ranges.charge[0],  ctx.ranges.charge[1]) &&
          inRangeInclusive(m.pI,         ctx.ranges.isoelec[0], ctx.ranges.isoelec[1]) &&
          inRangeInclusive(m.H,          ctx.ranges.hidro[0],   ctx.ranges.hidro[1])   &&
          inRangeInclusive(m.B,          ctx.ranges.boman[0],   ctx.ranges.boman[1])   &&
          inRangeInclusive(m.MHr,        ctx.ranges.moment[0],  ctx.ranges.moment[1])
        ){ out.push(it); }
      }
    }
    if (i % chunkSize === 0){
      if (onProgress) onProgress(i / total);
      await new Promise(requestAnimationFrame);
    }
  }
  if (onProgress) onProgress(1);
  return out;
}

/* ---------- Render por lotes ---------- */
function addHighLights(sequenceFind, seqRegex) {
  if (!seqRegex || seqRegex.source === '(?:)') return sequenceFind;
  if (!seqRegex.global) seqRegex = new RegExp(seqRegex.source, 'g');
  return sequenceFind.replace(seqRegex, m=>`<span class="highlight">${m}</span>`);
}
async function renderRowsBatched(tbody, rows, highlightRegex, onProgress, batchSize = 600){
  if (!tbody) return;
  tbody.innerHTML = '';
  const frag = document.createDocumentFragment();
  let htmlBuffer = [];
  const total = rows.length || 1;

  for (let i=0;i<rows.length;i++){
    const it = rows[i];
    const highlighted = addHighLights(it.sequence, highlightRegex);
    htmlBuffer.push(`<tr><td>${it.header}</td><td>${highlighted}</td></tr>`);

    if (htmlBuffer.length >= batchSize){
      const temp = document.createElement('tbody');
      temp.innerHTML = htmlBuffer.join('');
      while (temp.firstChild) frag.appendChild(temp.firstChild);
      htmlBuffer = [];
      if (onProgress) onProgress(i / total);
      await new Promise(requestAnimationFrame);
    }
  }
  if (htmlBuffer.length){
    const temp = document.createElement('tbody');
    temp.innerHTML = htmlBuffer.join('');
    while (temp.firstChild) frag.appendChild(temp.firstChild);
  }
  tbody.appendChild(frag);
  if (onProgress) onProgress(1);
}

/* ---------- Buscar ---------- */
async function findSequences(){
  showLoader('Preparando…');
  await paintOverlay();
  try{
    const ctx = readInputs();

    showLoader('Filtrando… 0%');
    const filtered = await filterSequencesAsync(
      sequences,
      ctx,
      (p)=>{ const t=$id('loadingOverlay').querySelector('.sf-loading__text'); if (t) t.textContent = `Filtrando… ${(p*100).toFixed(0)}%`; }
    );
    lastFiltered = filtered;

    showLoader('Renderizando… 0%');
    const tbody = document.querySelector('#archivoInfoTable tbody');
    await renderRowsBatched(
      tbody,
      filtered,
      ctx.highlightRegex,
      (p)=>{ const t=$id('loadingOverlay').querySelector('.sf-loading__text'); if (t) t.textContent = `Renderizando… ${(p*100).toFixed(0)}%`; }
    );

    const pct = sequences.length ? (filtered.length*100)/sequences.length : 0;
    $id('searchNumber').textContent = filtered.length;
    $id('searchPercentage').textContent = pct.toFixed(2);
    const allSeq = filtered.map(x=>x.sequence).join('');
    $id('aminoPercentage').textContent = allSeq.length ? getMostUsedAminoacids(allSeq, aminoacids_list) : '—';

  } catch(_err){
    alert('Error durante la búsqueda.');
  } finally{
    hideLoader();
  }
}

/* ---------- Descargas ---------- */
const esc = (s)=>String(s).replace(/"/g,'""');
function downloadSequencesCSV(){
  const rows = lastFiltered.length ? lastFiltered : sequences;
  let out = 'header,sequence\n';
  for (const it of rows){ out += `"${esc(it.header)}","${esc(it.sequence)}"\n`; }
  const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(out);
  const a = document.createElement('a'); a.href = uri; a.download = 'sequences.csv';
  document.body.appendChild(a); a.click(); a.remove();
}
function downloadSequencesFasta(){
  const rows = lastFiltered.length ? lastFiltered : sequences;
  let out = '';
  for (const it of rows){
    let header = String(it.header||'').trim();
    if (header.charAt(0) !== '>') header = '>' + header;
    out += header + '\n' + (it.sequence||'') + '\n';
  }
  const uri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(out);
  const a = document.createElement('a'); a.href = uri; a.download = 'sequences.fasta';
  document.body.appendChild(a); a.click(); a.remove();
}

/* ---------- Init ---------- */
async function init(){
  showLoader('Cargando base de secuencias…');
  await paintOverlay();
  try{
    const res = await fetch(`${API_BASE}/sequences`, { headers: { 'Accept':'application/json' } });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const raw = await res.json();

    sequences = raw.map(it=>({
      header: cleanHeader(it.header),
      sequence: cleanSeq(it.sequence)
    }));

    // precache en lotes (cede frames)
    let i = 0, step = 1000;
    while (i < sequences.length){
      const end = Math.min(i + step, sequences.length);
      for (let j=i;j<end;j++) canonicalMetrics(sequences[j].sequence);
      i = end;
      if (i % (step*3) === 0) {
        const t=$id('loadingOverlay').querySelector('.sf-loading__text');
        if (t) t.textContent = `Cargando… ${Math.round((i*100)/sequences.length)}%`;
      }
      await new Promise(requestAnimationFrame);
    }

    $id('findButton').addEventListener('click', findSequences);
    $id('downloadCsv').addEventListener('click', downloadSequencesCSV);
    $id('downloadFasta').addEventListener('click', downloadSequencesFasta);
    $id('inputTextSequence').addEventListener('keypress', (e)=>{ if((e.keyCode||e.which)===13) findSequences(); });

  } catch(err){
    console.error(err);
    alert('No se pudo cargar /api/sequences');
  } finally{
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', init);
