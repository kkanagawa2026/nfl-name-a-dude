import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';

const HS_KEY = 'roster_iq_hs';
const DATE_FMT = { month: 'short', day: 'numeric', year: 'numeric' };

function dateStr() {
  return new Date().toLocaleDateString('en-US', DATE_FMT);
}

function loadScoresLocal() {
  try { return JSON.parse(localStorage.getItem(HS_KEY) ?? '[]'); }
  catch { return []; }
}

export async function saveScore(score) {
  // Always save to localStorage
  const updated = [...loadScoresLocal(), { score, date: dateStr() }]
    .sort((a, b) => b.score - a.score).slice(0, 5);
  localStorage.setItem(HS_KEY, JSON.stringify(updated));

  // Sync to Supabase when signed in
  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('high_scores').insert({ user_id: user.id, score, date: dateStr() });
    }
  }
}

const MEDALS = ['🥇', '🥈', '🥉', '4', '5'];

export default function HighScores({ onClose }) {
  const [scores,  setScores]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [fromCloud, setFromCloud] = useState(false);

  useEffect(() => {
    async function fetchScores() {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('high_scores')
            .select('score, date')
            .eq('user_id', user.id)
            .order('score', { ascending: false })
            .limit(5);
          if (data) {
            setScores(data);
            setFromCloud(true);
            setLoading(false);
            return;
          }
        }
      }
      setScores(loadScoresLocal());
      setLoading(false);
    }
    fetchScores();
  }, []);

  return (
    <div className="hs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hs-modal">
        <div className="hs-header">
          <span className="hs-title">HIGH SCORES</span>
          <button className="hs-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <p className="hs-empty">Loading…</p>
        ) : scores.length === 0 ? (
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

        <p className="hs-note">
          {fromCloud ? '☁️ Synced across devices' : 'Scores saved on this device only'}
        </p>
      </div>
    </div>
  );
}
