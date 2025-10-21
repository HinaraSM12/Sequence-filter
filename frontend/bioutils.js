//public/bioutils.js
/* ==========================
   Sequence-Filter | bioutils.js
   ========================== */
window.aminoacids_list = ['A','C','D','E','F','G','H','I','K','L','M','N','P','Q','R','S','T','V','W','Y'];

window.aminosFullName = {
  'A': 'Alaline',
  'R': 'Arginine',
  'N': 'Asparagine',
  'D': 'Aspartic',
  'C': 'Cysteine',
  'Q': 'Glutamine',
  'E': 'Glutamic Acid',
  'G': 'Glycine',
  'H': 'Histidine',
  'I': 'Isoleucine',
  'L': 'Leucine',
  'K': 'Lysine',
  'M': 'Methionine',
  'F': 'Phenylalanine',
  'P': 'Proline',
  'S': 'Serine',
  'T': 'Threonine',
  'W': 'Tryptophan',
  'Y': 'Tyrosine',
  'V': 'Valine'
};

function cleanSeq(seq) {
  return String(seq || '')
    .toUpperCase()
    .replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '');
}
window.cleanSeq = cleanSeq;

function cleanHeader(h) {
  return String(h || '').replace(/\r?\n/g, '');
}
window.cleanHeader = cleanHeader;

window.getCharge = function getCharge(aminoacids, pH = 7.0) {
  const seq = cleanSeq(aminoacids);
  if (!seq) return 0;

  const pow10 = (x) => Math.pow(10, x);
  const pKa = {
    R: 12.48, K: 10.79, H: 6.04,
    D: 3.86,  E: 4.25,  C: 8.33, Y: 10.07,
    Nterm: 9.69, Cterm: 2.34
  };

  let CNi = 0, CNj = 0;

  for (let i = 0; i < seq.length; i++) {
    const aa = seq[i];
    if (aa === 'R' || aa === 'K' || aa === 'H') {
      CNi += pow10(pKa[aa]) / (pow10(pH) + pow10(pKa[aa]));
    } else if (aa === 'D' || aa === 'E' || aa === 'C' || aa === 'Y') {
      CNj += pow10(pH) / (pow10(pH) + pow10(pKa[aa]));
    }
  }

  CNi += pow10(pKa.Nterm) / (pow10(pH) + pow10(pKa.Nterm));
  CNj += pow10(pH) / (pow10(pH) + pow10(pKa.Cterm));

  return CNi - CNj;
};

window.getIsoEle = function getIsoEle(aminoacids) {
  const seq = cleanSeq(aminoacids);
  if (!seq) return 0;

  const pow10 = (x) => Math.pow(10, x);
  const pKa = {
    R: 12.48, K: 10.79, H: 6.04,
    D: 3.86,  E: 4.25,  C: 8.33, Y: 10.07,
    Nterm: 9.69, Cterm: 2.34
  };

  let PI = null;
  for (let i = 0; i < 14; i = +(i + 0.01).toFixed(2)) {
    let CNi = 0, CNj = 0;

    for (let j = 0; j < seq.length; j++) {
      const aa = seq[j];
      switch (aa) {
        case 'R': CNi += pow10(pKa.R) / (pow10(i) + pow10(pKa.R)); break;
        case 'K': CNi += pow10(pKa.K) / (pow10(i) + pow10(pKa.K)); break;
        case 'H': CNi += pow10(pKa.H) / (pow10(i) + pow10(pKa.H)); break;
        case 'D': CNj += pow10(i) / (pow10(i) + pow10(pKa.D)); break;
        case 'E': CNj += pow10(i) / (pow10(i) + pow10(pKa.E)); break;
        case 'C': CNj += pow10(i) / (pow10(i) + pow10(pKa.C)); break;
        case 'Y': CNj += pow10(i) / (pow10(i) + pow10(pKa.Y)); break;
      }
    }

    CNi += pow10(pKa.Nterm) / (pow10(i) + pow10(pKa.Nterm));
    CNj += pow10(i) / (pow10(i) + pow10(pKa.Cterm));

    const CN = CNi - CNj;

    if (CN >= -0.1 && CN <= 0.1) {
      PI = +i.toFixed(1);
      break;
    }
  }
  return PI != null ? PI : 0;
};

window.getHidrof = function getHidrof(aminoacids) {
  const s = cleanSeq(aminoacids);
  if (!s) return 0;
  let H = 0;
  for (let j = 0; j < s.length; j++) {
    switch (s[j]) {
      case 'A': case 'I': case 'L': case 'F':
      case 'V': case 'M': case 'C': case 'W': H++; break;
    }
  }
  return +( (H / s.length) * 100 ).toFixed(2);
};

window.getMoment = function getMoment(aminoacids) {
  const s = cleanSeq(aminoacids);
  if (!s) return 0;

  let sen = 0, cos = 0, i = 0;
  for (let j = 0; j < s.length; j++) {
    i++;
    switch (s[j]) {
      case 'A': sen += 1.8 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos += 1.8 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'I': sen += 4.5 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos += 4.5 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'L': sen += 3.8 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos += 3.8 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'W': sen -= 0.9 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 0.9 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'F': sen += 2.8 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos += 2.8 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'V': sen += 4.2 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos += 4.2 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'M': sen += 1.9 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos += 1.9 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'Y': sen -= 1.3 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 1.3 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'P': sen -= 1.6 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 1.6 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'T': sen -= 0.7 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 0.7 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'S': sen -= 0.8 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 0.8 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'C': sen += 2.5 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos += 2.5 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'G': sen -= 0.4 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 0.4 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'N': case 'D': case 'Q': case 'E':
                sen -= 3.5 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 3.5 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'H': sen -= 3.2 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 3.2 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'K': sen -= 3.9 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 3.9 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
      case 'R': sen -= 4.5 * Math.sin(((i + 1) * 100 * Math.PI) / 180);
                cos -= 4.5 * Math.cos(((i + 1) * 100 * Math.PI) / 180); break;
    }
  }

  const MH = (1 / s.length) * Math.sqrt(sen*sen + cos*cos);
  const MHr = +( (MH / 2.88) * 100 ).toFixed(2);
  return MHr;
};

window.getBoman = function getBoman(aminoacids) {
  const s = cleanSeq(aminoacids);
  if (!s) return 0;

  let IB = 0;
  for (let j = 0; j < s.length; j++) {
    switch (s[j]) {
      case 'A': IB += 1.81; break;
      case 'I': case 'L': IB += 4.92; break;
      case 'W': IB += 2.33; break;
      case 'F': IB += 2.98; break;
      case 'V': IB += 4.04; break;
      case 'M': IB += 2.35; break;
      case 'Y': IB -= 0.14; break;
      case 'T': IB -= 2.57; break;
      case 'S': IB -= 3.40; break;
      case 'C': IB += 1.28; break;
      case 'G': IB += 0.94; break;
      case 'N': IB -= 6.64; break;
      case 'D': IB -= 8.75; break;
      case 'Q': IB -= 5.54; break;
      case 'E': IB -= 6.81; break;
      case 'H': IB -= 4.66; break;
      case 'K': IB -= 5.55; break;
      case 'R': IB -= 14.92; break;
    }
  }
  IB = -IB / s.length;
  return +IB.toFixed(2);
};

window.getMostUsedAminoacids = function getMostUsedAminoacids(allAminoacids, aminoacids_list){
  const s = cleanSeq(allAminoacids);
  if (!s.length) return '—';

  const usage = [];
  for (let i = 0; i < aminoacids_list.length; i++) {
    const aa = aminoacids_list[i];
    const count = (s.match(new RegExp(aa, 'g')) || []).length;
    usage.push({ aa, count });
  }
  usage.sort((a,b)=>b.count - a.count);

  const top = usage.slice(0,5).filter(x=>x.count>0);
  if (!top.length) return '—';

  const pieces = top.map(x=>{
    const pct = ((x.count * 100) / s.length).toFixed(2);
    const name = aminosFullName[x.aa] || x.aa;
    return `${name}(${x.aa}): ${pct}%`;
  });
  return pieces.join(' ');
};
