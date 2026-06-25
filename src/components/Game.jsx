import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getTeamName, getLogoUrl, getFranchise, ALL_FRANCHISES } from '../utils/teamNames';
import { saveScore } from './HighScores';
import rostersData from '../data/rosters.json';

const MAX_WRONG = 3;
const WIN_COUNT = 32;

// ── Position classification ──────────────────────────────────────
const OFFENSE  = new Set(['QB','RB','FB','WR','TE','OT','OG','C','G','T','OL']);
const DEFENSE  = new Set(['DE','DT','NT','LB','ILB','OLB','MLB','CB','S','DB','SAF','SS','FS','EDGE','DL']);
const SPEC_TMS = new Set(['K','P','LS']);

function posInfo(pos) {
  const p = (pos ?? '').toUpperCase();
  if (OFFENSE.has(p))  return { label: 'OFFENSE',       pts: 2, cls: 'offense' };
  if (DEFENSE.has(p))  return { label: 'DEFENSE',       pts: 3, cls: 'defense' };
  if (SPEC_TMS.has(p)) return { label: 'SPECIAL TEAMS', pts: 3, cls: 'special' };
  return                        { label: 'SPECIAL TEAMS', pts: 3, cls: 'special' };
}

// ── Player name normalization — strips apostrophes/hyphens so
//    "leveon" matches "Le'Veon Bell", "dk" matches "D.K. Metcalf" ──
function normalizeSearch(s) {
  return s.toLowerCase().replace(/['''’\-\.]/g, '').replace(/\s+/g, ' ').trim();
}

// ── College matching ─────────────────────────────────────────────
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array(b.length + 1);
  for (let i = 0; i < a.length; i++) {
    curr[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      curr[j + 1] = Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + (a[i] === b[j] ? 0 : 1));
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return curr[b.length];
}

// Maps user-typed aliases to normalized stored names (used in validation)
const COLLEGE_ALIASES = {
  'usc':      'southern california',
  'lsu':      'louisiana state',
  'fsu':      'florida state',
  'ohio st':  'ohio state',
  'penn st':  'penn state',
  'uga':      'georgia',
  'bama':     'alabama',
  'ou':       'oklahoma',
  'psu':      'penn state',
  'ole miss': 'mississippi',
  'tcу':      'texas christian',
};

// Maps aliases to stored names for dropdown filtering
const COLLEGE_NICKNAMES = {
  'ole miss': 'mississippi',
  'usc':      'southern california',
  'lsu':      'louisiana state',
  'fsu':      'florida state',
  'ohio st':  'ohio state',
  'penn st':  'penn state',
  'uga':      'georgia',
  'bama':     'alabama',
  'ou':       'oklahoma',
  'psu':      'penn state',
};

function normalizeCollege(s) {
  return s.toLowerCase().replace(/[.()'&]/g, '').replace(/\s+/g, ' ').trim();
}

function collegeMatches(input, college) {
  if (!college || !input.trim()) return false;
  const a = normalizeCollege(input);
  const b = normalizeCollege(college);
  if (a === b) return true;
  for (const [alias, full] of Object.entries(COLLEGE_ALIASES)) {
    if (a === alias && b === full) return true;
    if (b === alias && a === full) return true;
  }
  return levenshtein(a, b) <= 2;
}

// Filters allColleges list for the dropdown — substring + alias aware
function collegeDropFilter(input, college) {
  const a = normalizeCollege(input);
  const b = normalizeCollege(college);
  if (b.includes(a)) return true;
  const expanded = COLLEGE_NICKNAMES[a];
  if (expanded && b.includes(expanded)) return true;
  return false;
}

// ── Helpers ──────────────────────────────────────────────────────
function pickRandom(arr, exclude) {
  const pool = arr.filter(c => !exclude.has(`${c.season}_${c.team}`));
  return (pool.length ? pool : arr)[Math.floor(Math.random() * (pool.length || arr.length))];
}

// ── Franchise tracker grid ───────────────────────────────────────
function FranchiseGrid({ completed }) {
  return (
    <div className="franchise-grid">
      {ALL_FRANCHISES.map(({ franchise, slug, name }) => {
        const done = completed.has(franchise);
        return (
          <div key={franchise} className={`franchise-cell ${done ? 'done' : ''}`} title={name}>
            <img
              src={`https://a.espncdn.com/i/teamlogos/nfl/500/${slug}.png`}
              alt={name}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </div>
        );
      })}
    </div>
  );
}

const MAX_SUGGEST = 8;

// ── Component ────────────────────────────────────────────────────
export default function Game() {
  const allPlayers = useMemo(() => {
    const seen = new Set(); const names = [];
    rostersData.forEach(c => c.players.forEach(p => {
      if (!seen.has(p.name)) { seen.add(p.name); names.push(p.name); }
    }));
    return names.sort();
  }, []);

  const allColleges = useMemo(() => {
    const seen = new Set();
    rostersData.forEach(c => c.players.forEach(p => {
      if (p.college && !seen.has(p.college)) seen.add(p.college);
    }));
    return [...seen].sort();
  }, []);

  const [combo,               setCombo]               = useState(null);
  const [usedCombos,          setUsedCombos]          = useState(new Set());
  const [usedPlayerFranchise, setUsedPlayerFranchise] = useState(new Set());
  const [completedFranchises, setCompletedFranchises] = useState(new Set());
  const [score,               setScore]               = useState(0);
  const [lives,               setLives]               = useState(MAX_WRONG);
  const [phase,               setPhase]               = useState('naming');
  const [lastPlayer,          setLastPlayer]          = useState(null);
  const [feedback,            setFeedback]            = useState(null);
  const [bonusInput,          setBonusInput]          = useState('');
  const [bonusDone,           setBonusDone]           = useState(null);
  const [ledger,              setLedger]              = useState([]);
  const [input,               setInput]               = useState('');
  const [suggestions,         setSuggestions]         = useState([]);
  const [activeIdx,           setActiveIdx]           = useState(-1);
  const [collegeSuggestions,  setCollegeSuggestions]  = useState([]);
  const [collegeActiveIdx,    setCollegeActiveIdx]    = useState(-1);

  const inputRef      = useRef(null);
  const bonusRef      = useRef(null);
  const dropdownRef   = useRef(null);
  const collegeDropRef = useRef(null);
  const busy          = useRef(false);

  // ── Advance ─────────────────────────────────────────────────
  const advance = useCallback((usedCombosSet, newCompleted, currentScore) => {
    if (newCompleted.size >= WIN_COUNT) {
      saveScore(currentScore);
      setPhase('won');
      busy.current = false;
      return;
    }
    const next = pickRandom(rostersData, usedCombosSet);
    const newUsed = new Set(usedCombosSet);
    newUsed.add(`${next.season}_${next.team}`);
    setCombo(next);
    setUsedCombos(newUsed);
    setInput(''); setSuggestions([]); setActiveIdx(-1);
    setBonusInput(''); setCollegeSuggestions([]); setCollegeActiveIdx(-1);
    setFeedback(null); setPhase('naming');
    busy.current = false;
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const startGame = useCallback(() => {
    busy.current = false;
    const first = pickRandom(rostersData, new Set());
    setCombo(first);
    setUsedCombos(new Set([`${first.season}_${first.team}`]));
    setUsedPlayerFranchise(new Set());
    setCompletedFranchises(new Set());
    setScore(0); setLives(MAX_WRONG);
    setPhase('naming'); setLastPlayer(null); setFeedback(null);
    setInput(''); setSuggestions([]); setActiveIdx(-1);
    setBonusInput(''); setCollegeSuggestions([]); setCollegeActiveIdx(-1);
    setBonusDone(null); setLedger([]);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => { startGame(); }, [startGame]);

  // ── Player autocomplete filtering (apostrophe-aware) ──────────
  useEffect(() => {
    const t = input.trim();
    if (!t) { setSuggestions([]); setActiveIdx(-1); return; }
    const norm     = normalizeSearch(t);
    const starts   = allPlayers.filter(p => normalizeSearch(p).startsWith(norm));
    const contains = allPlayers.filter(p => !normalizeSearch(p).startsWith(norm) && normalizeSearch(p).includes(norm));
    setSuggestions([...starts, ...contains].slice(0, MAX_SUGGEST));
    setActiveIdx(-1);
  }, [input, allPlayers]);

  // ── College autocomplete filtering ───────────────────────────
  useEffect(() => {
    if (phase !== 'bonus' || !lastPlayer?.college) return;
    const t = bonusInput.trim();
    if (!t) { setCollegeSuggestions([]); setCollegeActiveIdx(-1); return; }
    const filtered = allColleges.filter(c => collegeDropFilter(t, c)).slice(0, MAX_SUGGEST);
    setCollegeSuggestions(filtered);
    setCollegeActiveIdx(-1);
  }, [bonusInput, allColleges, phase, lastPlayer]);

  // Close both dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      const inPlayer  = dropdownRef.current?.contains(e.target)    || inputRef.current?.contains(e.target);
      const inCollege = collegeDropRef.current?.contains(e.target) || bonusRef.current?.contains(e.target);
      if (!inPlayer)  setSuggestions([]);
      if (!inCollege) setCollegeSuggestions([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (activeIdx >= 0) dropdownRef.current?.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  useEffect(() => {
    if (collegeActiveIdx >= 0) collegeDropRef.current?.children[collegeActiveIdx]?.scrollIntoView({ block: 'nearest' });
  }, [collegeActiveIdx]);

  // ── Select player from dropdown ──────────────────────────────
  const handleSelect = useCallback((playerName) => {
    if (!combo || busy.current || phase !== 'naming') return;
    setInput(''); setSuggestions([]); setActiveIdx(-1);

    const franchise = getFranchise(combo.team);
    const canonicalKey = `${playerName}_${franchise}`;
    if (usedPlayerFranchise.has(canonicalKey)) {
      setFeedback({ type: 'warn', text: `You already used ${playerName} for this franchise — try someone else` });
      setTimeout(() => { setFeedback(null); inputRef.current?.focus(); }, 2000);
      return;
    }

    const found = combo.players.find(p => p.name === playerName);
    if (!found) {
      const newLives = lives - 1;
      const msg = { type: 'wrong', text: `✗ ${playerName} wasn't on this roster` };
      if (newLives <= 0) {
        setLives(0); setFeedback(msg);
        saveScore(score);
        setPhase('gameover');
      } else {
        setLives(newLives); setFeedback(msg);
        setTimeout(() => { setFeedback(null); inputRef.current?.focus(); }, 1400);
      }
      return;
    }

    const newPF = new Set(usedPlayerFranchise);
    newPF.add(canonicalKey);
    setUsedPlayerFranchise(newPF);

    const newCompleted = new Set(completedFranchises);
    newCompleted.add(franchise);
    setCompletedFranchises(newCompleted);

    const info     = posInfo(found.pos);
    const pts      = info.pts;
    const newScore = score + pts;
    setScore(newScore);

    const playerData = { ...found, pts, info };
    setLastPlayer(playerData);
    setBonusInput(''); setBonusDone(null); setFeedback(null);
    setCollegeSuggestions([]); setCollegeActiveIdx(-1);

    setLedger(l => [{
      name: playerData.name, pos: playerData.pos, info, pts, bonusPts: 0,
      college: playerData.college,
      teamName: getTeamName(combo.team, combo.season),
      season: combo.season, team: combo.team,
    }, ...l]);

    if (found.college) {
      setPhase('bonus');
      setTimeout(() => bonusRef.current?.focus(), 80);
    } else {
      busy.current = true;
      setPhase('bonus');
      setTimeout(() => advance(usedCombos, newCompleted, newScore), 1400);
    }
  }, [combo, lives, phase, score, usedCombos, usedPlayerFranchise, completedFranchises, advance]);

  // ── Bonus — accepts an optional college override for dropdown selection ──
  const submitBonus = useCallback((skip = false, collegeOverride = null) => {
    if (busy.current) return;
    busy.current = true;
    setCollegeSuggestions([]); setCollegeActiveIdx(-1);
    const collegeInput = collegeOverride ?? bonusInput;
    if (!skip && collegeInput.trim() && collegeMatches(collegeInput, lastPlayer?.college)) {
      const newScore = score + 1;
      setScore(newScore);
      setLedger(l => l.map((e, i) => i === 0 ? { ...e, bonusPts: 1 } : e));
      setBonusDone('correct');
      setTimeout(() => advance(usedCombos, completedFranchises, newScore), 1600);
    } else {
      setBonusDone(skip ? 'skip' : 'wrong');
      setTimeout(() => advance(usedCombos, completedFranchises, score), 1600);
    }
  }, [bonusInput, lastPlayer, score, usedCombos, completedFranchises, advance]);

  if (!combo) return <div className="loading">Loading…</div>;

  const logoUrl = getLogoUrl(combo.team);

  return (
    <div className="game">

      {/* ── Scoreboard ── */}
      <div className="scoreboard">
        <div className="score-block">
          <span className="score-label">SCORE</span>
          <span className="score-value">{score}</span>
        </div>
        <div className="progress-block">
          <span className="score-label">TEAMS</span>
          <span className="score-value teams-value">{completedFranchises.size}<span className="teams-denom">/{WIN_COUNT}</span></span>
        </div>
        <div className="lives-block">
          {Array.from({ length: MAX_WRONG }, (_, i) => (
            <span key={i} className={`life-icon ${i < lives ? 'alive' : 'gone'}`}>🏈</span>
          ))}
        </div>
      </div>

      <div className="game-body">
      <div className="game-main">

      {/* ── Team card ── */}
      {(phase === 'naming' || phase === 'bonus') && (
        <div className="team-card">
          {logoUrl && (
            <img className="team-logo" src={logoUrl} alt=""
              onError={e => { e.target.style.display = 'none'; }} />
          )}
          <div className="team-season">{combo.season} Season</div>
          <div className="team-name">{getTeamName(combo.team, combo.season)}</div>
          <div className="roster-hint">{combo.players.length} players · offense 2 pts · defense / ST 3 pts</div>
        </div>
      )}

      {/* ── Game over ── */}
      {phase === 'gameover' && (
        <div className="result-panel">
          <div className="result-icon">💀</div>
          <div className="result-title">Game Over</div>
          {feedback && <div className="result-sub">{feedback.text}</div>}
          <div className="final-score">Final score: <strong>{score}</strong></div>
          <div className="final-score" style={{ fontSize: '0.85rem' }}>Teams completed: <strong>{completedFranchises.size}/{WIN_COUNT}</strong></div>
          <button className="btn-primary" onClick={startGame}>Play Again</button>
        </div>
      )}

      {/* ── You win ── */}
      {phase === 'won' && (
        <div className="result-panel won-panel">
          <div className="result-icon">🏆</div>
          <div className="result-title won-title">All 32 Teams!</div>
          <div className="final-score">Final score: <strong>{score}</strong></div>
          <button className="btn-primary" onClick={startGame}>Play Again</button>
        </div>
      )}

      {/* ── Naming phase ── */}
      {phase === 'naming' && (
        <>
          {feedback && <div className={`inline-feedback ${feedback.type}`}>{feedback.text}</div>}
          {!feedback && (
            <div className="autocomplete-wrapper">
              <input
                ref={inputRef} type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (!suggestions.length) return;
                  if      (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
                  else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
                  else if (e.key === 'Enter')     { e.preventDefault(); handleSelect(suggestions[activeIdx >= 0 ? activeIdx : 0]); }
                  else if (e.key === 'Escape')    { setSuggestions([]); setActiveIdx(-1); }
                }}
                placeholder="Start typing a player name…"
                autoComplete="off" autoCorrect="off" spellCheck="false"
              />
              {suggestions.length > 0 && (
                <ul className="dropdown" ref={dropdownRef}>
                  {suggestions.map((name, i) => (
                    <li key={name}
                      className={i === activeIdx ? 'active' : ''}
                      onMouseDown={() => handleSelect(name)}
                      onMouseEnter={() => setActiveIdx(i)}
                    >{name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Bonus phase ── */}
      {phase === 'bonus' && lastPlayer && (
        <div className="bonus-panel">
          <div className={`correct-badge ${lastPlayer.info.cls}`}>
            ✓ {lastPlayer.name}
            <span className="pts-badge">+{lastPlayer.pts} {lastPlayer.info.label}</span>
          </div>
          {!bonusDone && lastPlayer.college && (
            <>
              <div className="bonus-prompt">
                Bonus: Where did <strong>{lastPlayer.name}</strong> go to college?
                <span className="bonus-hint"> +1 pt · no penalty for wrong</span>
              </div>
              <div className="bonus-input-row">
                <div className="autocomplete-wrapper" style={{ flex: 1 }}>
                  <input
                    ref={bonusRef} type="text" value={bonusInput}
                    onChange={e => setBonusInput(e.target.value)}
                    onKeyDown={e => {
                      if (collegeSuggestions.length) {
                        if      (e.key === 'ArrowDown') { e.preventDefault(); setCollegeActiveIdx(i => Math.min(i + 1, collegeSuggestions.length - 1)); }
                        else if (e.key === 'ArrowUp')   { e.preventDefault(); setCollegeActiveIdx(i => Math.max(i - 1, 0)); }
                        else if (e.key === 'Enter')     { e.preventDefault(); submitBonus(false, collegeSuggestions[collegeActiveIdx >= 0 ? collegeActiveIdx : 0]); }
                        else if (e.key === 'Escape')    { setCollegeSuggestions([]); setCollegeActiveIdx(-1); }
                      } else {
                        if (e.key === 'Enter') submitBonus(false);
                        if (e.key === 'Escape') submitBonus(true);
                      }
                    }}
                    placeholder="College name…"
                    autoComplete="off" autoCorrect="off" spellCheck="false"
                  />
                  {collegeSuggestions.length > 0 && (
                    <ul className="dropdown" ref={collegeDropRef}>
                      {collegeSuggestions.map((name, i) => (
                        <li key={name}
                          className={i === collegeActiveIdx ? 'active' : ''}
                          onMouseDown={() => submitBonus(false, name)}
                          onMouseEnter={() => setCollegeActiveIdx(i)}
                        >{name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button className="btn-primary" onClick={() => submitBonus(false)} disabled={!bonusInput.trim()}>Submit</button>
                <button className="btn-ghost" onClick={() => submitBonus(true)}>Skip →</button>
              </div>
            </>
          )}
          {bonusDone === 'correct' && <div className="bonus-result correct">✓ +1 bonus — {lastPlayer.college}</div>}
          {bonusDone === 'wrong'   && <div className="bonus-result wrong">✗ It was <strong>{lastPlayer.college}</strong> · no penalty</div>}
          {bonusDone === 'skip'    && <div className="bonus-result skip">Answer: <strong>{lastPlayer.college}</strong></div>}
        </div>
      )}

      {/* ── Ledger ── */}
      {ledger.length > 0 && (
        <div className="ledger">
          <div className="ledger-header">YOUR PICKS</div>
          <ul className="ledger-list">
            {ledger.map((entry, i) => (
              <li key={i} className="ledger-entry">
                <div className="ledger-player">
                  <span className={`ledger-pos-badge ${entry.info.cls}`}>{entry.info.label[0]}</span>
                  <span className="ledger-name">{entry.name}</span>
                </div>
                <div className="ledger-meta">
                  <span className="ledger-team">{entry.season} {entry.teamName}</span>
                  <span className="ledger-pts">
                    +{entry.pts + entry.bonusPts} pts
                    {entry.bonusPts > 0 && <span className="ledger-bonus"> (+1 bonus)</span>}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      </div>{/* end game-main */}

      {/* ── Franchise grid ── */}
      <FranchiseGrid completed={completedFranchises} />

      </div>{/* end game-body */}

    </div>
  );
}
