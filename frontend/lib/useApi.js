'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// Small data hook for client pages: loading / error / data + reload.
export function useApi(path, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path && enabled) });
  const ctrl = useRef(null);

  const load = useCallback(async () => {
    if (!path || !enabled) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api(path, { signal: ctrl.current.signal });
      setState({ data: res.data, meta: res.meta, error: null, loading: false });
    } catch (err) {
      if (err.name !== 'AbortError') setState({ data: null, error: err, loading: false });
    }
  }, [path, enabled]);

  useEffect(() => { load(); return () => ctrl.current?.abort(); }, [load]);
  const setData = (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  return { ...state, reload: load, setData };
}

// Opens a signed URL in a new tab without tripping popup blockers.
export async function openSigned(fetchUrl) {
  const w = window.open('', '_blank');
  if (w) w.opener = null;
  try {
    const url = await fetchUrl();
    if (w) w.location.href = url; else window.location.href = url;
  } catch (err) {
    w?.close();
    throw err;
  }
}
