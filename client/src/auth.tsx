import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, refreshWithUser, setAccessToken } from './api';

export type SessionUser = { id: string; email: string; workspaceId: string };
type AuthState = { user: SessionUser | null; ready: boolean; signIn: (accessToken: string, user: SessionUser) => void; signOut: () => Promise<void> };

const AuthContext = createContext<AuthState | null>(null);
export const useAuth = () => { const c = useContext(AuthContext); if (!c) throw new Error('useAuth must be used within AuthProvider'); return c; };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  // On load, try to restore a session via the refresh cookie.
  useEffect(() => {
    (async () => {
      const u = await refreshWithUser();
      setUser(u);
      setReady(true);
    })();
  }, []);

  const signIn = (accessToken: string, u: SessionUser) => { setAccessToken(accessToken); setUser(u); };
  const signOut = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setAccessToken(null); setUser(null);
  };

  return <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="auth-screen"><p style={{ margin: 'auto' }}>Checking your private session…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
