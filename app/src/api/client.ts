/**
 * API client — wraps fetch with JWT auth, friendly error normalization,
 * and an offline queue for habit completions (spec section 61).
 */
import { Capacitor } from '@capacitor/core';

const SERVER_KEY = 'habitgo.serverUrl';

/** Server base URL: user-configured (native builds) > build env > same-origin proxy. */
export function getServerUrl(): string {
  const saved = localStorage.getItem(SERVER_KEY);
  if (saved) return saved.replace(/\/+$/, '');
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (Capacitor.isNativePlatform()) return 'http://10.0.2.2:4000/api/v1'; // emulator -> host machine
  return '/api/v1';
}

export function setServerUrl(url: string | null) {
  if (url && url.trim()) localStorage.setItem(SERVER_KEY, url.trim().replace(/\/+$/, ''));
  else localStorage.removeItem(SERVER_KEY);
}

const BASE = getServerUrl();
const TOKEN_KEY = 'habitgo.token';

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'network_error', 'network');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error || {};
    throw new ApiError(res.status, err.code || 'unknown', err.message || 'error');
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  put: <T>(path: string, data?: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(data ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

/* ---------------- Offline completion queue (spec 61) ---------------- */

type QueuedCompletion = { habitId: string; date: string; value?: number };

const QUEUE_KEY = 'habitgo.offlineQueue';

export function readQueue(): QueuedCompletion[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedCompletion[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function queueCompletion(c: QueuedCompletion) {
  const q = readQueue();
  const existing = q.findIndex((x) => x.habitId === c.habitId && x.date === c.date);
  if (existing >= 0) q[existing] = c;
  else q.push(c);
  writeQueue(q);
}

/** Replay queued completions; idempotent server-side via (habit, date). */
export async function syncQueue(): Promise<number> {
  const q = readQueue();
  if (!q.length || !navigator.onLine || !getToken()) return 0;
  const remaining: QueuedCompletion[] = [];
  let synced = 0;
  for (const item of q) {
    try {
      await api.post(`/habits/${item.habitId}/complete`, { date: item.date, value: item.value });
      synced += 1;
    } catch (e) {
      // already completed server-side counts as synced
      if (e instanceof ApiError && e.code === 'already_completed') synced += 1;
      else remaining.push(item);
    }
  }
  writeQueue(remaining);
  return synced;
}

window.addEventListener('online', () => {
  syncQueue().then((n) => {
    if (n > 0) window.dispatchEvent(new CustomEvent('habitgo:synced', { detail: n }));
  });
});
