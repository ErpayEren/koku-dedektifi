'use client';

import { useEffect, useState } from 'react';
import { isNativeShell } from './capacitor';

export function useNativeShell(): boolean {
  const [native, setNative] = useState(false);

  useEffect(() => {
    setNative(isNativeShell());
  }, []);

  return native;
}
