'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const initialInputs = { propertyCategory: 'RESIDENTIAL', bhk: null, area: '', kitchens: 1, bedrooms: 2, washrooms: 2, addons: [] };

export const useEstimateStore = create(persist((set) => ({
  step: 1,
  inputs: initialInputs,
  contact: { name: '', mobile: '' },
  preferredPackage: null,
  leadId: null,
  leadToken: null,
  estimateId: null,
  setStep: (step) => set({ step }),
  setInputs: (patch) => set((s) => ({ inputs: { ...s.inputs, ...patch } })),
  setContact: (patch) => set((s) => ({ contact: { ...s.contact, ...patch } })),
  setPreferredPackage: (preferredPackage) => set({ preferredPackage }),
  setLead: (leadId, leadToken) => set({ leadId, leadToken }),
  setEstimate: (estimateId) => set({ estimateId }),
  reset: () => set({ step: 1, inputs: initialInputs, leadId: null, leadToken: null, estimateId: null }),
}), { name: 'ii-estimate', storage: createJSONStorage(() => sessionStorage), version: 1 }));
