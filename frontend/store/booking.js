'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Only identifiers are persisted locally; form data lives on the server lead (autosaved per step).
export const useBookingStore = create(persist((set) => ({
  leadId: null,
  leadToken: null,
  setLead: (leadId, leadToken) => set({ leadId, leadToken }),
  clearToken: () => set({ leadToken: null }),
  reset: () => set({ leadId: null, leadToken: null }),
}), { name: 'ii-booking', storage: createJSONStorage(() => localStorage), version: 1 }));
