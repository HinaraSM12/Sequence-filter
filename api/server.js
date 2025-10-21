// api/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const {
  PORT = 3000,
  DB_DATABASE = 'prospeccionydise'
} = process.env;

function parseFastaSmart(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const out = [];
  const hasGt = lines.some(l => l.startsWith('>'));

  if (hasGt) {
    let header = null, seq = [];
    for (const line of lines) {
      if (line.startsWith('>')) {
        if (header) {
          out.push({
            header,
            sequence: seq.join('').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '')
          });
        }
        header = line.trim();
        seq = [];
      } else {
        seq.push(line.trim());
      }
    }
    if (header) {
      out.push({
        header,
        sequence: seq.join('').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '')
      });
    }
  } else {
    for (let i = 0; i < lines.length; i += 2) {
      const header = lines[i] || '';
      const sequence = (lines[i + 1] || '');
      out.push({
        header: header.trim(),
        sequence: sequence.toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '')
      });
    }
  }

  return out;
}

async function listColumns() {
  return db.query(
    `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
     ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [DB_DATABASE]
  );
}

function autoDetectTableAndCols(columnsMeta) {
  const headerCandidates = new Set([
    'header', 'titulo', 'title', 'name', 'nombre', 'id', 'accession', 'acc', 'gi', 'descripcion', 'description'
  ]);
  const seqCandidates = new Set([
    'sequence', 'seq', 'secuencia', 'peptide', 'pep', 'aa', 'cadena'
  ]);

  const byTable = {};
  for (const row of columnsMeta) {
    const t = row.TABLE_NAME;
    if (!byTable[t]) byTable[t] = [];
    byTable[t].push(row);
  }

  const scores = [];
  for (const [table, cols] of Object.entries(byTable)) {
    let headerCol = null, seqCol = null;
    let score = 0;

    for (const c of cols) {
      const name = c.COLUMN_NAME.toLowerCase();
      if (!headerCol && headerCandidates.has(name)) { headerCol = c.COLUMN_NAME; score += 2; }
      if (!seqCol && seqCandidates.has(name)) { seqCol = c.COLUMN_NAME; score += 3; }
      if (['text','varchar','mediumtext','longtext'].includes((c.DATA_TYPE||'').toLowerCase())) score += 0.2;
    }

    if (headerCol && seqCol) scores.push({ table, headerCol, seqCol, score });
  }

  scores.sort((a,b)=> b.score - a.score);
  return scores[0] || null;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/_debug/schema', async (_req, res) => {
  try {
    const cols = await listColumns();
    res.json(cols);
  } catch (e) {
    console.error('schema error', e.message);
    res.status(500).json({ error: 'schema_error', message: e.message });
  }
});

app.get('/api/_auto_config', async (_req, res) => {
  try {
    const cols = await listColumns();
    const guess = autoDetectTableAndCols(cols);
    res.json({ database: DB_DATABASE, guess, columns: cols });
  } catch (e) {
    res.status(500).json({ error: 'auto_detect_error', message: e.message });
  }
});

app.get('/api/sequences', async (req, res) => {
  try {
    const { pattern, ignore } = req.query;

    let t = (process.env.TABLE_NAME || '').trim();
    let hcol = (process.env.HEADER_COLUMN || '').trim();
    let scol = (process.env.SEQUENCE_COLUMN || '').trim();

    if (!t || !hcol || !scol) {
      const cols = await listColumns();
      const guess = autoDetectTableAndCols(cols);
      if (!guess) throw new Error('no_table_autodetected');
      t = guess.table; hcol = guess.headerCol; scol = guess.seqCol;
    }

    const where = [];
    const params = [];

    if (pattern) {
      const rx = String(pattern).toUpperCase()
        .replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
        .replace(/X/gi, '[A-Z]');
      where.push(`${scol} REGEXP ?`);
      params.push(rx);
    }
    if (ignore) {
      const parts = String(ignore).toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        const rx = p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/X/gi, '[A-Z]');
        where.push(`${scol} NOT REGEXP ?`);
        params.push(rx);
      });
    }

    let sql = `SELECT ${hcol} AS header, ${scol} AS sequence FROM ${t}`;
    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' LIMIT 200000';

    const rows = await db.query(sql, params);
    const normalized = rows.map(r => ({
      header: String(r.header || '').replace(/\r?\n/g,''),
      sequence: String(r.sequence || '').toUpperCase().replace(/[^ACDEFGHIKLMNPQRSTVWY]/g, '')
    }));
    return res.json(normalized);
  } catch (err) {
    console.error('DB error, usando FASTA. Motivo:', err.message);
    try {
      const file = path.join(__dirname, 'sequences', 'BD_FINAL.fasta');
      const txt = fs.readFileSync(file, 'utf8');
      const rows = parseFastaSmart(txt);
      return res.json(rows);
    } catch (e2) {
      console.error('FASTA fallback error:', e2.message);
      return res.status(500).json({ error: 'internal_error', detail: err.message });
    }
  }
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
