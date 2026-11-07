import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data now and re-loads it every `intervalMs` (pauses while the tab is hidden).
 * Keeps showing the last good data if a refresh fails, so a flaky network does not blank the screen.
 */
export function usePolling<T>(load: () => Promise<T>, intervalMs = 6000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const alive = useRef(true);

  const reload = useCallback(async () => {
    try {
      const result = await loadRef.current();
      if (!alive.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (!alive.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void reload();
    const id = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) void reload();
    }, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
  }, [reload, intervalMs]);

  return { data, error, loading, reload };
}
