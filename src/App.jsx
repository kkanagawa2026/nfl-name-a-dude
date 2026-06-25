import { useState, useEffect } from 'react';
import Game from './components/Game';
import HighScores from './components/HighScores';
import SignIn from './components/SignIn';
import { supabase } from './utils/supabase';

export default function App() {
  const [showHS,     setShowHS]     = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [user,       setUser]       = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-text">IQ</div>
          <h1>ROSTER IQ</h1>
        </div>
        <div className="header-right">
          {supabase && (
            user ? (
              <div className="user-pill">
                <span className="user-email">{user.email?.split('@')[0]}</span>
                <button className="btn-signout" onClick={() => supabase.auth.signOut()}>Sign Out</button>
              </div>
            ) : (
              <button className="btn-signin" onClick={() => setShowSignIn(true)}>Sign In</button>
            )
          )}
          <button className="btn-hs" onClick={() => setShowHS(true)}>🏆 High Scores</button>
        </div>
      </header>

      <Game />

      {showHS     && <HighScores onClose={() => setShowHS(false)} />}
      {showSignIn && <SignIn     onClose={() => setShowSignIn(false)} />}
    </div>
  );
}
