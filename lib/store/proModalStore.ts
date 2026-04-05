'use client';

import { create } from 'zustand';

interface ProModalState {
  open: boolean;
  featureName: string;
  openModal: (featureName: string) => void;
  closeModal: () => void;
}

export const useProModalStore = create<ProModalState>((set) => ({
  open: false,
  featureName: '',
  openModal: (featureName) =>
    set({
      open: true,
      featureName,
    }),
  closeModal: () =>
    set({
      open: false,
      featureName: '',
    }),
}));
