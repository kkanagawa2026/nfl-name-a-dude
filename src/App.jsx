import Game from './components/Game';

export default function App() {
  return (
    <div className="app">
      <h1>🏈 NFL Name a Dude</h1>
      <p className="subtitle">Name any player on the roster. 3 wrong guesses ends the streak.</p>
      <Game />
    </div>
  );
}
