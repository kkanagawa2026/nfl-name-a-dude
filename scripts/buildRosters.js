import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const START_YEAR = 2000;
const END_YEAR   = 2026;

function fetchText(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'nfl-name-a-dude/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function splitLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n');
  if (!lines.length) return [];
  const headers = splitLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const vals = splitLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function clean(val) {
  let v = (val ?? '').trim();
  if (v.includes('&')) v = decodeHtmlEntities(v);
  return (v === 'NA' || v === '') ? null : v;
}

// Build gsis_id → college from the nflverse players master file
async function buildCollegeMap() {
  console.log('Fetching players.csv for college supplement…');
  try {
    const csv = await fetchText(
      'https://github.com/nflverse/nflverse-data/releases/download/players/players.csv'
    );
    const rows = parseCSV(csv);
    const map = new Map();
    for (const row of rows) {
      const id = clean(row.gsis_id);
      const college = clean(row.college_name) || clean(row.college);
      if (id && college) map.set(id, college);
    }
    console.log(`  → ${map.size} college entries loaded\n`);
    return map;
  } catch (err) {
    console.log(`  → Could not fetch players.csv (${err.message}), skipping supplement\n`);
    return new Map();
  }
}

async function main() {
  const collegeMap = await buildCollegeMap();
  const BASE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/rosters';
  const combos = {};

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    process.stdout.write(`Fetching ${year}… `);
    try {
      const csv = await fetchText(`${BASE_URL}/roster_${year}.csv`);
      const rows = parseCSV(csv);

      for (const row of rows) {
        const name    = clean(row.full_name);
        const team    = clean(row.team);
        const pos     = clean(row.position);
        const gsisId  = clean(row.gsis_id);
        const season  = parseInt(row.season, 10) || year;
        // Prefer roster-level college; fall back to master players map
        const college = clean(row.college) || (gsisId ? collegeMap.get(gsisId) ?? null : null);
        if (!name || !team) continue;

        const key = `${season}_${team}`;
        if (!combos[key]) combos[key] = { season, team, players: new Map() };
        if (!combos[key].players.has(name)) {
          const entry = {};
          if (pos)     entry.pos     = pos;
          if (college) entry.college = college;
          combos[key].players.set(name, entry);
        }
      }

      const teams = Object.keys(combos).filter(k => k.startsWith(`${year}_`)).length;
      console.log(`${teams} teams`);
    } catch (err) {
      console.log(`FAILED — ${err.message}`);
    }
  }

  const data = Object.values(combos)
    .map(c => ({
      season: c.season,
      team: c.team,
      players: [...c.players.entries()]
        .map(([name, extra]) => ({ name, ...extra }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.season - b.season || a.team.localeCompare(b.team));

  const outPath = path.join(__dirname, '../src/data/rosters.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data));
  console.log(`\nWrote ${data.length} team-season combos → src/data/rosters.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
