'use client';

import { useCallback } from 'react';
import { useProModalStore } from '@/lib/store/proModalStore';
import { useUserStore } from '@/lib/store/userStore';

export function useProGate() {
  const isPro = useUserStore((state) => state.isPro);
  const openModal = useProModalStore((state) => state.openModal);

  const requirePro = useCallback(
    (featureName: string): boolean => {
      if (isPro) return true;
      openModal(featureName);
      return false;
    },
    [isPro, openModal],
  );

  return {
    isPro,
    requirePro,
  };
}
