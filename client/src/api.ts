// Central API client. Attaches the in-memory access token, refreshes on 401 once, and
// exposes typed helpers. The refresh token lives in an HTTP-only cookie handled by the browser.
const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };
export const getAccessToken = () => accessToken;

export class ApiError extends Error { status: number; details?: unknown; constructor(m: string, s: number, d?: unknown){ super(m); this.status=s; this.details=d; } }

async function request<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> || {}) };
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers, credentials: 'include' });

  if (res.status === 401 && retry && path !== '/auth/refresh') {
    // Attempt a single silent refresh, then replay the original request.
    const refreshed = await refresh();
    if (refreshed) return request<T>(path, opts, false);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.details);
  return data as T;
}

type RefreshResponse = { accessToken: string; user: { id: string; email: string; workspaceId: string } };

// Refresh and return the user (used on app load). Returns null if there's no valid session.
export async function refreshWithUser(): Promise<RefreshResponse['user'] | null> {
  try {
    const res = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) { setAccessToken(null); return null; }
    const data: RefreshResponse = await res.json();
    setAccessToken(data.accessToken);
    return data.user;
  } catch { setAccessToken(null); return null; }
}

// Refresh just the token (used by the 401 retry path).
export async function refresh(): Promise<boolean> {
  const u = await refreshWithUser();
  return !!u;
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' })
};

// UUID for idempotency keys (crypto.randomUUID is available in modern browsers).
export const uuid = (): string => (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
