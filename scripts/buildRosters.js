import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const START_YEAR = 2000;
const END_YEAR = 2026;

function fetch(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'nfl-name-a-dude/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetch(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split('\n');
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

function clean(val) {
  const v = (val ?? '').trim();
  return (v === 'NA' || v === '') ? null : v;
}

async function main() {
  const BASE_URL = 'https://github.com/nflverse/nflverse-data/releases/download/rosters';
  // key → Map<playerName, {pos, college}>
  const combos = {};

  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const url = `${BASE_URL}/roster_${year}.csv`;
    process.stdout.write(`Fetching ${year}... `);
    try {
      const csv = await fetch(url);
      const rows = parseCSV(csv);

      for (const row of rows) {
        const name = clean(row.full_name);
        const team = clean(row.team);
        const pos  = clean(row.position);
        const college = clean(row.college);
        const season = parseInt(row.season, 10) || year;
        if (!name || !team) continue;

        const key = `${season}_${team}`;
        if (!combos[key]) combos[key] = { season, team, players: new Map() };

        // Keep the first entry we see for each player name
        if (!combos[key].players.has(name)) {
          // only store defined fields to keep JSON compact
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
  console.log(`\nWrote ${data.length} team-season combos to src/data/rosters.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
