import { useState } from 'react';
import { supabase } from '../utils/supabase';

export default function SignIn({ onClose }) {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <div className="hs-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hs-modal">
        <div className="hs-header">
          <span className="hs-title">SIGN IN</span>
          <button className="hs-close" onClick={onClose}>✕</button>
        </div>

        {sent ? (
          <div className="signin-sent">
            <div className="signin-sent-icon">📬</div>
            <p>Magic link sent to <strong>{email}</strong></p>
            <p className="signin-subtext">Click the link in your email to sign in — scores will sync automatically.</p>
            <button className="btn-ghost" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="signin-form">
            <p className="signin-desc">Sign in to save high scores across devices. No password — we'll email you a login link.</p>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required autoFocus
              className="signin-input"
            />
            {error && <div className="signin-error">{error}</div>}
            <button type="submit" className="btn-primary" disabled={loading || !email.trim()}>
              {loading ? 'Sending…' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
