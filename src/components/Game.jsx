import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getTeamName, getLogoUrl, getFranchise } from '../utils/teamNames';
import rostersData from '../data/rosters.json';

const MAX_WRONG   = 3;
const MAX_SUGGEST = 8;

// ── Position classification ──────────────────────────────────────
const OFFENSE = new Set(['QB','RB','FB','WR','TE','OT','OG','C','G','T','OL']);
const DEFENSE = new Set(['DE','DT','NT','LB','ILB','OLB','MLB','CB','S','DB','SAF','SS','FS','EDGE','DL']);

function posInfo(pos) {
  const p = (pos ?? '').toUpperCase();
  if (OFFENSE.has(p)) return { label: 'OFFENSE', pts: 2, cls: 'offense' };
  if (DEFENSE.has(p)) return { label: 'DEFENSE', pts: 3, cls: 'defense' };
  return { label: 'SPECIAL TEAMS', pts: 1, cls: 'special' };
}

// ── College matching ─────────────────────────────────────────────
const ALIASES = {
  'usc': 'southern california',
  'lsu': 'louisiana state',
  'fsu': 'florida state',
  'ohio st': 'ohio state',
  'penn st': 'penn state',
  'uga': 'georgia',
  'bama': 'alabama',
  'ou': 'oklahoma',
  'psu': 'penn state',
};

function collegeMatches(input, college) {
  if (!college || !input.trim()) return false;
  const a = input.trim().toLowerCase().replace(/[.()']/g, '');
  const b = college.toLowerCase().replace(/[.()']/g, '');
  if (b.includes(a) || a.includes(b)) return true;
  for (const [alias, full] of Object.entries(ALIASES)) {
    if (a === alias && b.includes(full)) return true;
    if (b === alias && a.includes(full)) return true;
  }
  return false;
}

// ── Random combo picker ─────────────────────────────────────────
function pickRandom(arr, exclude) {
  const pool = arr.filter(c => !exclude.has(`${c.season}_${c.team}`));
  return (pool.length ? pool : arr)[Math.floor(Math.random() * (pool.length || arr.length))];
}

// ── Component ────────────────────────────────────────────────────
export default function Game() {
  const allPlayers = useMemo(() => {
    const seen = new Set();
    const names = [];
    rostersData.forEach(c => c.players.forEach(p => {
      if (!seen.has(p.name)) { seen.add(p.name); names.push(p.name); }
    }));
    return names.sort();
  }, []);

  // core game state
  const [combo,              setCombo]              = useState(null);
  const [usedCombos,         setUsedCombos]         = useState(new Set());
  const [usedPlayerFranchise,setUsedPlayerFranchise]= useState(new Set()); // "playerName_franchise"
  const [score,              setScore]              = useState(0);
  const [lives,              setLives]              = useState(MAX_WRONG);
  const [phase,              setPhase]              = useState('naming'); // naming | bonus | gameover
  const [lastPlayer,         setLastPlayer]         = useState(null);
  const [feedback,           setFeedback]           = useState(null);
  const [bonusInput,         setBonusInput]         = useState('');
  const [bonusDone,          setBonusDone]          = useState(null); // null | correct | wrong | skip
  const [ledger,             setLedger]             = useState([]); // history of correct picks

  // autocomplete
  const [input,       setInput]       = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx,   setActiveIdx]   = useState(-1);

  const inputRef    = useRef(null);
  const bonusRef    = useRef(null);
  const dropdownRef = useRef(null);
  const busy        = useRef(false);

  // ── Advance to next combo ─────────────────────────────────────
  const advance = useCallback((usedCombosSet) => {
    const next = pickRandom(rostersData, usedCombosSet);
    const newUsed = new Set(usedCombosSet);
    newUsed.add(`${next.season}_${next.team}`);
    setCombo(next);
    setUsedCombos(newUsed);
    setInput('');
    setSuggestions([]);
    setActiveIdx(-1);
    setFeedback(null);
    setPhase('naming');
    busy.current = false;
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // ── Start / restart ──────────────────────────────────────────
  const startGame = useCallback(() => {
    busy.current = false;
    const first = pickRandom(rostersData, new Set());
    setCombo(first);
    setUsedCombos(new Set([`${first.season}_${first.team}`]));
    setUsedPlayerFranchise(new Set());
    setScore(0);
    setLives(MAX_WRONG);
    setPhase('naming');
    setLastPlayer(null);
    setFeedback(null);
    setInput('');
    setSuggestions([]);
    setActiveIdx(-1);
    setBonusInput('');
    setBonusDone(null);
    setLedger([]);
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  useEffect(() => { startGame(); }, [startGame]);

  // ── Autocomplete filtering ────────────────────────────────────
  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) { setSuggestions([]); setActiveIdx(-1); return; }
    const lower = trimmed.toLowerCase();
    const starts   = allPlayers.filter(p => p.toLowerCase().startsWith(lower));
    const contains = allPlayers.filter(p => !p.toLowerCase().startsWith(lower) && p.toLowerCase().includes(lower));
    setSuggestions([...starts, ...contains].slice(0, MAX_SUGGEST));
    setActiveIdx(-1);
  }, [input, allPlayers]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return;
      setSuggestions([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (activeIdx >= 0 && dropdownRef.current) {
      dropdownRef.current.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIdx]);

  // ── Player selection ─────────────────────────────────────────
  const handleSelect = useCallback((playerName) => {
    if (!combo || busy.current || phase !== 'naming') return;
    setInput('');
    setSuggestions([]);
    setActiveIdx(-1);

    // Check franchise constraint (no repeating same player for same franchise)
    const franchise = getFranchise(combo.team);
    const pfKey = `${playerName}_${franchise}`;
    if (usedPlayerFranchise.has(pfKey)) {
      setFeedback({
        type: 'warn',
        text: `You already named ${playerName} for this franchise — try someone else`,
      });
      setTimeout(() => { setFeedback(null); inputRef.current?.focus(); }, 2000);
      return;
    }

    // Check if player is on this roster
    const found = combo.players.find(p => p.name === playerName);
    if (!found) {
      const newLives = lives - 1;
      if (newLives <= 0) {
        setLives(0);
        setFeedback({ type: 'wrong', text: `✗ ${playerName} wasn't on this roster` });
        setPhase('gameover');
      } else {
        setLives(newLives);
        setFeedback({ type: 'wrong', text: `✗ ${playerName} wasn't on this roster` });
        setTimeout(() => { setFeedback(null); inputRef.current?.focus(); }, 1400);
      }
      return;
    }

    // Correct — mark player as used for this franchise
    const newPF = new Set(usedPlayerFranchise);
    newPF.add(pfKey);
    setUsedPlayerFranchise(newPF);

    const info = posInfo(found.pos);
    const pts  = info.pts;
    setScore(s => s + pts);
    const playerData = { ...found, pts, info };
    setLastPlayer(playerData);
    setBonusInput('');
    setBonusDone(null);
    setFeedback(null);

    // Add to ledger (we'll update with bonus pts later in submitBonus)
    setLedger(l => [{
      name: playerData.name,
      pos: playerData.pos,
      info,
      pts,
      bonusPts: 0,
      college: playerData.college,
      teamName: getTeamName(combo.team, combo.season),
      season: combo.season,
      team: combo.team,
    }, ...l]);

    if (found.college) {
      setPhase('bonus');
      setTimeout(() => bonusRef.current?.focus(), 80);
    } else {
      busy.current = true;
      setPhase('bonus');
      setTimeout(() => advance(usedCombos), 1500);
    }
  }, [combo, lives, phase, usedCombos, usedPlayerFranchise, advance]);

  const handleNamingKeyDown = useCallback((e) => {
    if (!suggestions.length) return;
    if      (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter')     { e.preventDefault(); const idx = activeIdx >= 0 ? activeIdx : 0; if (suggestions[idx]) handleSelect(suggestions[idx]); }
    else if (e.key === 'Escape')    { setSuggestions([]); setActiveIdx(-1); }
  }, [suggestions, activeIdx, handleSelect]);

  // ── College bonus ────────────────────────────────────────────
  const submitBonus = useCallback((skip = false) => {
    if (busy.current) return;
    busy.current = true;

    let bonusPts = 0;
    let result = 'skip';
    if (!skip && bonusInput.trim() && collegeMatches(bonusInput, lastPlayer?.college)) {
      bonusPts = 1;
      result = 'correct';
      setScore(s => s + 1);
    } else if (!skip) {
      result = 'wrong';
    }

    setBonusDone(result);
    // Update ledger entry with bonus pts
    if (bonusPts > 0) {
      setLedger(l => l.map((e, i) => i === 0 ? { ...e, bonusPts: 1 } : e));
    }
    setTimeout(() => advance(usedCombos), 1600);
  }, [bonusInput, lastPlayer, usedCombos, advance]);

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
        <div className="lives-block">
          {Array.from({ length: MAX_WRONG }, (_, i) => (
            <span key={i} className={`life-icon ${i < lives ? 'alive' : 'gone'}`}>🏈</span>
          ))}
        </div>
      </div>

      {/* ── Team card ── */}
      <div className={`team-card ${phase === 'gameover' ? 'gameover-card' : ''}`}>
        {logoUrl && (
          <img className="team-logo" src={logoUrl} alt=""
            onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="team-season">{combo.season} Season</div>
        <div className="team-name">{getTeamName(combo.team, combo.season)}</div>
        <div className="roster-hint">{combo.players.length} players · offense 2 pts · defense 3 pts</div>
      </div>

      {/* ── Game over ── */}
      {phase === 'gameover' && (
        <div className="result-panel">
          <div className="result-icon">💀</div>
          <div className="result-title">Game Over</div>
          {feedback && <div className="result-sub">{feedback.text}</div>}
          <div className="final-score">Final score: <strong>{score}</strong></div>
          <button className="btn-primary" onClick={startGame}>Play Again</button>
        </div>
      )}

      {/* ── Naming phase ── */}
      {phase === 'naming' && (
        <>
          {feedback && (
            <div className={`inline-feedback ${feedback.type}`}>{feedback.text}</div>
          )}
          {!feedback && (
            <div className="autocomplete-wrapper">
              <input
                ref={inputRef}
                type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleNamingKeyDown}
                placeholder="Name a player on this roster…"
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
                <input
                  ref={bonusRef}
                  type="text" value={bonusInput}
                  onChange={e => setBonusInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitBonus(false); if (e.key === 'Escape') submitBonus(true); }}
                  placeholder="College name…"
                  autoComplete="off" autoCorrect="off" spellCheck="false"
                />
                <button className="btn-primary" onClick={() => submitBonus(false)} disabled={!bonusInput.trim()}>Submit</button>
                <button className="btn-ghost" onClick={() => submitBonus(true)}>Skip →</button>
              </div>
            </>
          )}

          {bonusDone === 'correct' && <div className="bonus-result correct">✓ +1 bonus — {lastPlayer.college}</div>}
          {bonusDone === 'wrong'   && <div className="bonus-result wrong">✗ It was <strong>{lastPlayer.college}</strong> · no penalty</div>}
          {bonusDone === 'skip'    && <div className="bonus-result skip">Answer: <strong>{lastPlayer.college}</strong></div>}
          {!lastPlayer.college     && <div className="bonus-result skip">No college data for this player</div>}
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

    </div>
  );
}
