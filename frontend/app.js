/* ==========================
   Sequence-Filter | app.js
   ========================== */

let sequences = [];
const DEBUG = true;

async function init(){
  const res = await fetch('/api/sequences');
  if (!res.ok) throw new Error('API error');
  sequences = await res.json();

  document.getElementById('findButton').addEventListener('click', findSequences);
  document.getElementById('downloadCsv').addEventListener('click', downloadSequencesCSV);
  document.getElementById('downloadFasta').addEventListener('click', downloadSequencesFasta);
  document.getElementById('inputTextSequence').addEventListener('keypress', (e)=>{ if((e.keyCode||e.which)===13) findSequences(); });
}

function readInputs(){
  const rawText = (document.getElementById('inputTextSequence').value || '').toUpperCase();
  const filterRegex    = rawText ? new RegExp(rawText.replace(/X/gi,'[A-Z]'))     : /(?:)/;
  const highlightRegex = rawText ? new RegExp(rawText.replace(/X/gi,'[A-Z]'),'g') : /(?:)/g;

  const ignoreRaw = (document.getElementById('inputTextIgnoreSequence')?.value || '').toUpperCase();
  const ignorePatterns = (ignoreRaw || '').split(',')
    .map(s=>s.trim()).filter(Boolean).map(s=>new RegExp(s.replace(/X/gi,'[A-Z]')));

  const num = (id)=>{
    const el = document.getElementById(id);
    const raw = String(el?.value || '').trim().replace(',', '.');
    const v = parseFloat(raw);
    return Number.isFinite(v) ? v : null;
  };

  return {
    filterRegex, highlightRegex, ignorePatterns, rawText, ignoreRaw,
    ranges: {
      charge:  [num('minCharge'),      num('maxCharge')],
      isoelec: [num('minIsoelectric'), num('maxIsoelectric')],
      hidro:   [num('minHidrofobic'),  num('maxHidrofobic')],
      boman:   [num('minBoman'),       num('maxBoman')],
      moment:  [num('minMoment'),      num('maxMoment')],
    }
  };
}

function canonicalMetrics(seq){
  const s = cleanSeq(seq);
  const charge_int = Math.round(getCharge(s));   // entero (como tu tabla)
  const pI  = +getIsoEle(s);                     // 1 decimal ya viene de bioutils (primer cruce)
  const H   = +Number(getHidrof(s)).toFixed(2);
  const B   = +Number(getBoman(s)).toFixed(2);
  const MHr = +Number(getMoment(s)).toFixed(2);
  return { charge_int, pI, H, B, MHr, len: s.length };
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
  for (let i=0;i<ignorePatterns.length;i++){
    if (ignorePatterns[i].test(seq)) return false;
  }
  return true;
}

function filterSequences(data, ctx){
  const normalized = data.map(it=>({
    header: cleanHeader(it.header),
    sequence: cleanSeq(it.sequence),
  }));

  return normalized
    .filter(it => ctx.filterRegex.source === '(?:)' || (it.sequence || '').match(ctx.filterRegex))
    .filter(it => passesIgnore(it.sequence, ctx.ignorePatterns))
    .filter(it => {
      const m = canonicalMetrics(it.sequence);
      return (
        inRangeInclusive(m.charge_int, ctx.ranges.charge[0],  ctx.ranges.charge[1]) &&
        inRangeInclusive(m.pI,         ctx.ranges.isoelec[0], ctx.ranges.isoelec[1]) &&
        inRangeInclusive(m.H,          ctx.ranges.hidro[0],   ctx.ranges.hidro[1])   &&
        inRangeInclusive(m.B,          ctx.ranges.boman[0],   ctx.ranges.boman[1])   &&
        inRangeInclusive(m.MHr,        ctx.ranges.moment[0],  ctx.ranges.moment[1])
      );
    });
}

function addHighLights(sequenceFind, seqRegex) {
  if (!seqRegex || seqRegex.source === '(?:)') return sequenceFind;
  const m = sequenceFind.match(seqRegex);
  if (!m) return sequenceFind;
  const repl = `<span class="highlight">${m[0]}</span>`;
  return sequenceFind.replace(seqRegex, repl);
}

function findSequences(){
  const ctx = readInputs();
  const filtered = filterSequences(sequences, ctx);

  // Render
  const tbody = document.querySelector('#archivoInfoTable tbody');
  let html = '';
  for (const it of filtered){
    const highlighted = addHighLights(it.sequence, ctx.highlightRegex);
    html += `<tr><td>${it.header}</td><td>${highlighted}</td></tr>`;
  }
  tbody.innerHTML = html;

  // Stats
  const pct = sequences.length ? (filtered.length*100)/sequences.length : 0;
  document.getElementById('searchNumber').textContent = filtered.length;
  document.getElementById('searchPercentage').textContent = pct.toFixed(2);
  const allSeq = filtered.map(x=>x.sequence).join('');
  document.getElementById('aminoPercentage').textContent =
    allSeq.length ? getMostUsedAminoacids(allSeq, aminoacids_list) : '—';

  // ===== DEBUG =====
  if (DEBUG){
    const rowsOriginal = filtered.map(it=>{
      const m = canonicalMetrics(it.sequence);
      return { header: it.header, pI: m.pI, H: m.H, B: m.B, MHr: m.MHr, charge: m.charge_int };
    });
    const rowsNueva = filtered.map(it=>{
      const m = canonicalMetrics(it.sequence);
      return { 'Secuencia': `${it.header} ${it.sequence}`, 'Long.': m.len, 'Carga': m.charge_int, 'pI': m.pI, '% Hidrofób.': m.H, 'Boman': m.B, 'Momento (MHr)': m.MHr };
    });

    console.groupCollapsed('%cSequence-Filter — DEBUG', 'color:#25806f;font-weight:bold');
    console.log('• Rangos (INCLUSIVOS):', ctx.ranges);
    console.log('%cTabla ORIGINAL','color:#0f1e17;font-weight:600'); console.table(rowsOriginal);
    console.log('%cTabla NUEVA','color:#0f1e17;font-weight:600'); console.table(rowsNueva);
    console.groupEnd();
  }
}

function esc(s){ return String(s).replace(/"/g,'""'); }

function downloadSequencesCSV(){
  const ctx = readInputs();
  const rows = filterSequences(sequences, ctx);
  let out = 'header,sequence\n';
  for (const it of rows){ out += `"${esc(it.header)}","${esc(it.sequence)}"\n`; }
  const uri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(out);
  const a = document.createElement('a'); a.href = uri; a.download = 'sequences.csv';
  document.body.appendChild(a); a.click(); a.remove();
}

function downloadSequencesFasta(){
  const ctx = readInputs();
  const rows = filterSequences(sequences, ctx);
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

init().catch(err=>{
  console.error(err);
  alert('No se pudo cargar la API /api/sequences');
});
