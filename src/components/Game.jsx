import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getTeamName } from '../utils/teamNames';
import rostersData from '../data/rosters.json';

const MAX_WRONG = 3;
const MAX_SUGGESTIONS = 8;

function pickRandom(arr, exclude) {
  const available = arr.filter(c => !exclude.has(`${c.season}_${c.team}`));
  const pool = available.length > 0 ? available : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Game() {
  const allPlayers = useMemo(() => {
    const names = new Set();
    rostersData.forEach(c => c.players.forEach(p => names.add(p)));
    return [...names].sort();
  }, []);

  const [combo, setCombo] = useState(null);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(MAX_WRONG);
  const [feedback, setFeedback] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const [used, setUsed] = useState(new Set());
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const transitioning = useRef(false);

  const nextCombo = useCallback((usedSet) => {
    const next = pickRandom(rostersData, usedSet);
    const newUsed = new Set(usedSet);
    newUsed.add(`${next.season}_${next.team}`);
    setCombo(next);
    setUsed(newUsed);
  }, []);

  const startGame = useCallback(() => {
    transitioning.current = false;
    const first = pickRandom(rostersData, new Set());
    setCombo(first);
    setUsed(new Set([`${first.season}_${first.team}`]));
    setInput('');
    setSuggestions([]);
    setActiveIndex(-1);
    setStreak(0);
    setLives(MAX_WRONG);
    setFeedback(null);
    setGameOver(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { startGame(); }, [startGame]);

  // Filter suggestions as user types — names starting with input rank first
  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) { setSuggestions([]); setActiveIndex(-1); return; }
    const lower = trimmed.toLowerCase();
    const starts = allPlayers.filter(p => p.toLowerCase().startsWith(lower));
    const contains = allPlayers.filter(p => !p.toLowerCase().startsWith(lower) && p.toLowerCase().includes(lower));
    setSuggestions([...starts, ...contains].slice(0, MAX_SUGGESTIONS));
    setActiveIndex(-1);
  }, [input, allPlayers]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleSelect = useCallback((playerName) => {
    if (!combo || transitioning.current || gameOver) return;
    setInput('');
    setSuggestions([]);
    setActiveIndex(-1);

    const isCorrect = combo.players.includes(playerName);

    if (isCorrect) {
      transitioning.current = true;
      setFeedback({ type: 'correct', text: `✓ ${playerName}` });
      setStreak(s => s + 1);
      setTimeout(() => {
        setFeedback(null);
        nextCombo(used);
        transitioning.current = false;
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 1300);
    } else {
      const newLives = lives - 1;
      const text = `✗ ${playerName} wasn't on this roster`;
      if (newLives <= 0) {
        setFeedback({ type: 'wrong', text });
        setGameOver(true);
      } else {
        setLives(newLives);
        setFeedback({ type: 'wrong', text });
        setTimeout(() => {
          setFeedback(null);
          inputRef.current?.focus();
        }, 1300);
      }
    }
  }, [combo, lives, used, nextCombo, gameOver]);

  const handleKeyDown = useCallback((e) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      if (suggestions[idx]) handleSelect(suggestions[idx]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  }, [suggestions, activeIndex, handleSelect]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const item = dropdownRef.current.children[activeIndex];
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!combo) return <div className="loading">Loading...</div>;

  return (
    <div className="game">
      <div className="header">
        <div className="streak-display">
          <span className="streak-label">Streak</span>
          <span className="streak-value">{streak}</span>
        </div>
        <div className="lives-display">
          {Array.from({ length: MAX_WRONG }, (_, i) => (
            <span key={i} className={`heart ${i < lives ? 'alive' : 'lost'}`}>♥</span>
          ))}
        </div>
      </div>

      {gameOver ? (
        <div className="game-over">
          <div className="game-over-emoji">💀</div>
          <h2>Game Over</h2>
          <p className="final-streak">Streak: <strong>{streak}</strong></p>
          <p className="reveal">
            That was the <strong>{combo.season} {getTeamName(combo.team, combo.season)}</strong>
          </p>
          <button className="btn-primary" onClick={startGame}>Play Again</button>
        </div>
      ) : (
        <>
          <div className="team-card">
            <div className="season-label">{combo.season} Season</div>
            <div className="team-name">{getTeamName(combo.team, combo.season)}</div>
            <div className="player-count">{combo.players.length} players on roster</div>
          </div>

          {feedback && (
            <div className={`feedback feedback-${feedback.type}`}>{feedback.text}</div>
          )}

          {!feedback && (
            <div className="autocomplete-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Start typing a player name..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              {suggestions.length > 0 && (
                <ul className="dropdown" ref={dropdownRef}>
                  {suggestions.map((name, i) => (
                    <li
                      key={name}
                      className={i === activeIndex ? 'active' : ''}
                      onMouseDown={() => handleSelect(name)}
                      onMouseEnter={() => setActiveIndex(i)}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
