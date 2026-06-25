const HS_KEY = 'nfl_dude_hs';

export function saveScore(score) {
  const existing = loadScores();
  const updated = [...existing, { score, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  localStorage.setItem(HS_KEY, JSON.stringify(updated));
}

export function loadScores() {
  try { return JSON.parse(localStorage.getItem(HS_KEY) ?? '[]'); }
  catch { return []; }
}

const MEDALS = ['🥇', '🥈', '🥉', '4', '5'];

export default function HighScores({ onClose }) {
  const scores = loadScores();

  return (
    <div className="hs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hs-modal">
        <div className="hs-header">
          <span className="hs-title">HIGH SCORES</span>
          <button className="hs-close" onClick={onClose}>✕</button>
        </div>

        {scores.length === 0 ? (
          <p className="hs-empty">No scores yet — play a game!</p>
        ) : (
          <ul className="hs-list">
            {scores.map((s, i) => (
              <li key={i} className={`hs-row ${i === 0 ? 'hs-top' : ''}`}>
                <span className="hs-medal">{MEDALS[i]}</span>
                <span className="hs-score">{s.score} pts</span>
                <span className="hs-date">{s.date}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="hs-note">Scores are saved on this device only — no account needed.</p>
      </div>
    </div>
  );
}
