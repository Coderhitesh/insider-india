'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { qs } from '@/lib/admin';

// List state lives in the URL, so filters survive reloads and links can be shared.
export function useList(endpoint, defaults = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const params = useMemo(() => ({ ...defaults, ...Object.fromEntries(sp.entries()) }), [sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const [state, setState] = useState({ rows: [], meta: null, loading: true, error: null, data: null });
  const ctrl = useRef(null);

  const load = useCallback(async () => {
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api(`${endpoint}${qs(params)}`, { signal: ctrl.current.signal });
      setState({ rows: res.data.items || [], meta: res.meta || null, loading: false, error: null, data: res.data });
    } catch (err) {
      if (err.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error: err }));
    }
  }, [endpoint, params]);
  useEffect(() => { load(); }, [load]);

  const setParams = (patch, { resetPage = true } = {}) => {
    const next = { ...Object.fromEntries(sp.entries()), ...patch };
    if (resetPage && !('page' in patch)) delete next.page;
    Object.keys(next).forEach((k) => (next[k] === '' || next[k] == null) && delete next[k]);
    router.replace(`${pathname}${qs(next)}`, { scroll: false });
  };
  return { ...state, params, setParams, reload: load, exportQuery: qs(Object.fromEntries(Object.entries(params).filter(([k]) => !['page', 'limit'].includes(k)))) };
}
