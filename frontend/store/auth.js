'use client';

import { create } from 'zustand';

// Access token lives in memory only; the refresh token is an httpOnly cookie.
export const useAuth = create((set) => ({
  status: 'idle', // idle | loading | authenticated | anonymous
  accessToken: null,
  user: null,
  setLoading: () => set({ status: 'loading' }),
  setSession: ({ accessToken, user }) => set({ accessToken, user, status: 'authenticated' }),
  clear: () => set({ accessToken: null, user: null, status: 'anonymous' }),
}));
