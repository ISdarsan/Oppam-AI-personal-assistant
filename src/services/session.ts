import { SessionUser } from '../types/community';

// sessionStorage is per browser tab, so one browser can hold a senior tab, a helper tab and a family tab at the
// same time without the tokens overwriting each other (the demo needs this). Only the token + display info live
// here; community data always comes from the backend.
const KEY = 'koode_session';
const listeners = new Set<() => void>();

export const session = {
  get(): SessionUser | null {
    try {
      const raw = sessionStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as SessionUser) : null;
    } catch {
      return null;
    }
  },
  set(user: SessionUser): void {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(user));
    } catch {
      /* private mode: the session lasts until reload */
    }
    listeners.forEach((l) => l());
  },
  clear(): void {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
