'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface PermissionRationaleSheetProps {
  open: boolean;
  onContinue: () => void;
  onDismiss: () => void;
  permission: 'camera' | 'notifications';
}

const COPY = {
  camera: {
    icon: '📷',
    title: 'Kamera İzni Gerekli',
    body: 'Koku Dedektifi, parfüm şişelerini analiz edebilmek ve barkod tarayabilmek için kamera erişimine ihtiyaç duyar. Fotoğraflarınız cihazınızda kalır, sunucuya yalnızca analiz için gönderilir.',
    cta: 'Kamera İznine İzin Ver',
  },
  notifications: {
    icon: '🔔',
    title: 'Bildirim İzni',
    body: 'Analiz tamamlandığında ve Pro teklifler geldiğinde haberdar olabilmek için bildirim iznini etkinleştirebilirsiniz. İstediğiniz zaman ayarlardan kapatabilirsiniz.',
    cta: 'Bildirimlere İzin Ver',
  },
};

export function PermissionRationaleSheet({
  open,
  onContinue,
  onDismiss,
  permission,
}: PermissionRationaleSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const copy = COPY[permission];

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onDismiss]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-sheet-title"
      className="fixed inset-0 z-[9999] flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg mx-auto rounded-t-2xl bg-[#1A1A1A] border-t border-white/10 px-6 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        <div className="text-center mb-6">
          <div className="text-5xl mb-3" role="img" aria-hidden="true">
            {copy.icon}
          </div>
          <h2 id="permission-sheet-title" className="text-lg font-semibold text-white mb-2">
            {copy.title}
          </h2>
          <p className="text-sm text-white/60 leading-relaxed">{copy.body}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onContinue}
            className="w-full h-12 rounded-xl bg-amber-500 text-black font-semibold text-sm active:opacity-80 transition-opacity"
          >
            {copy.cta}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="w-full h-12 rounded-xl bg-white/5 text-white/60 font-medium text-sm active:opacity-60 transition-opacity"
          >
            Şimdi Değil
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
