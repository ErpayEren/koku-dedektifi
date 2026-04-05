'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

interface ToastSyncInput {
  error?: string;
  notice?: string;
}

export function useToastSync({ error, notice }: ToastSyncInput) {
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  useEffect(() => {
    if (notice) toast.success(notice);
  }, [notice]);
}
