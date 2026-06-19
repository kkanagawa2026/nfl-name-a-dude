import { useState, useEffect, useRef, useCallback } from 'react';
import Fuse from 'fuse.js';
import { getTeamName } from '../utils/teamNames';
import rostersData from '../data/rosters.json';

const MAX_WRONG = 3;

function pickRandom(arr, exclude) {
  const available = arr.filter(c => !exclude.has(`${c.season}_${c.team}`));
  const pool = available.length > 0 ? available : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

export default function Game() {
  const [combo, setCombo] = useState(null);
  const [input, setInput] = useState('');
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(MAX_WRONG);
  const [feedback, setFeedback] = useState(null); // { type: 'correct'|'wrong', text: string }
  const [gameOver, setGameOver] = useState(false);
  const [used, setUsed] = useState(new Set());
  const inputRef = useRef(null);
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
    const emptyUsed = new Set();
    const first = pickRandom(rostersData, emptyUsed);
    const newUsed = new Set([`${first.season}_${first.team}`]);
    setCombo(first);
    setUsed(newUsed);
    setInput('');
    setStreak(0);
    setLives(MAX_WRONG);
    setFeedback(null);
    setGameOver(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => { startGame(); }, [startGame]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() || !combo || transitioning.current || gameOver) return;

    const fuse = new Fuse(combo.players, {
      threshold: 0.4,
      ignoreLocation: true,
    });
    const results = fuse.search(input.trim());

    if (results.length > 0) {
      const matched = results[0].item;
      transitioning.current = true;
      setFeedback({ type: 'correct', text: `✓ ${matched}` });
      setStreak(s => s + 1);
      setInput('');

      setTimeout(() => {
        setFeedback(null);
        nextCombo(used);
        transitioning.current = false;
        setTimeout(() => inputRef.current?.focus(), 50);
      }, 1300);
    } else {
      const newLives = lives - 1;
      setInput('');
      if (newLives <= 0) {
        setFeedback({ type: 'wrong', text: '✗ Wrong!' });
        setGameOver(true);
      } else {
        setLives(newLives);
        setFeedback({ type: 'wrong', text: `✗ Not on this roster` });
        setTimeout(() => {
          setFeedback(null);
          inputRef.current?.focus();
        }, 1300);
      }
    }
  }, [input, combo, lives, used, nextCombo, gameOver]);

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
            <div className="input-row">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Name a player..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={!input.trim()}
              >
                Submit
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
