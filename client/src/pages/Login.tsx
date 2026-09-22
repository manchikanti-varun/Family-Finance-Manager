import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setAccessToken } from '../api';
import { useAuth, SessionUser } from '../auth';

// Google Identity Services sign-in. Initializes once, renders the official button,
// exchanges the credential with our API, and stores the session.
export default function Login() {
  const { user, signIn } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) nav('/dashboard', { replace: true }); }, [user, nav]);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { setError('Google sign-in needs VITE_GOOGLE_CLIENT_ID in the client environment.'); return; }
    const exchange = async (credential: string) => {
      setBusy(true);
      try {
        const data = await api.post<{ accessToken: string; user: SessionUser }>('/auth/google', { credential });
        setAccessToken(data.accessToken);
        signIn(data.accessToken, data.user);
        nav('/dashboard', { replace: true });
      } catch (e) { setError(e instanceof Error ? e.message : 'Google sign-in failed'); } finally { setBusy(false); }
    };
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
    s.onload = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) { setError('Google sign-in could not load.'); return; }
      google.accounts.id.initialize({ client_id: clientId, callback: (res: any) => res?.credential ? exchange(res.credential) : setError('No credential returned from Google.') });
      const host = document.getElementById('gsi-button');
      if (host) google.accounts.id.renderButton(host, { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', width: 280 });
      setReady(true);
    };
    s.onerror = () => setError('Could not reach Google sign-in.');
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, [nav, signIn]);

  return (
    <main className="auth-screen">
      <section className="auth-showcase">
        <div className="showcase-brand"><span className="logo">ƒ</span><span>finora</span></div>
        <div className="showcase-copy">
          <p className="eyebrow">FAMILY FINANCE, CLARIFIED</p>
          <h1>Every rupee has<br /><em>its full story.</em></h1>
          <p>See who spent, whose account paid, and where your family's money is going — without the confusion.</p>
        </div>
        <p className="showcase-foot">Private by design · Your data, your workspace</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="mobile-brand"><span className="logo">ƒ</span><b>finora</b></div>
          <p className="eyebrow">WELCOME TO FINORA</p>
          <h1>Your finances, in one place.</h1>
          <p className="sub">Sign in with your Google account to access your private family financial workspace.</p>
          <div id="gsi-button" className="gsi-button" />
          {!ready && !error && <p className="sub">Loading Google sign-in…</p>}
          {busy && <p className="sub">Signing you in…</p>}
          {error && <p className="auth-error">{error}</p>}
          <p className="auth-security">We never see your Google password. A secure private workspace is created on your first sign-in.</p>
        </div>
      </section>
    </main>
  );
}
