import { useState } from 'react';
import Game from './components/Game';
import HighScores from './components/HighScores';

export default function App() {
  const [showHS, setShowHS] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-text">NFL</div>
          <h1>NAME A DUDE</h1>
        </div>
        <button className="btn-hs" onClick={() => setShowHS(true)}>🏆 High Scores</button>
      </header>

      <Game />

      {showHS && <HighScores onClose={() => setShowHS(false)} />}
    </div>
  );
}
