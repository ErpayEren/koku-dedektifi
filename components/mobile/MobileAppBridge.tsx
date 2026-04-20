'use client';

import { useEffect, useState } from 'react';
import {
  configureNativeChrome,
  getNativeNetworkStatus,
  hideNativeSplash,
  initializePushNotifications,
  isNativeShell,
  onNativeNetworkStatusChange,
} from '@/lib/mobile/capacitor';

export function MobileAppBridge() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!isNativeShell()) return;

    const root = document.documentElement;
    const body = document.body;

    root.classList.add('kd-capacitor-app');
    body.classList.add('kd-capacitor-app');

    void configureNativeChrome();
    void hideNativeSplash();
    void initializePushNotifications();

    void getNativeNetworkStatus().then((status) => setOffline(!status.connected));

    let removeListener: () => void = () => {};

    void onNativeNetworkStatusChange((status) => {
      setOffline(!status.connected);
    }).then((cleanup) => {
      removeListener = cleanup;
    });

    return () => {
      root.classList.remove('kd-capacitor-app');
      body.classList.remove('kd-capacitor-app');
      removeListener();
    };
  }, []);

  if (!isNativeShell() || !offline) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+14px)] z-[90] md:hidden">
      <div className="pointer-events-auto rounded-2xl border border-white/[.08] bg-[rgba(11,11,18,0.94)] px-4 py-3 shadow-[0_20px_45px_rgba(0,0,0,.42)] backdrop-blur-xl">
        <p className="text-[11px] font-mono uppercase tracking-[.16em] text-gold">Bağlantı bekleniyor</p>
        <p className="mt-1 text-[13px] leading-relaxed text-cream">
          Ağ geri geldiğinde deneyim kaldığın yerden devam edecek.
        </p>
      </div>
    </div>
  );
}
