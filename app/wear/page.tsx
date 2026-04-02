'use client';

import Link from 'next/link';
import { Bell, BellRing, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { TopBar } from '@/components/TopBar';
import { Card } from '@/components/ui/Card';
import { CardTitle } from '@/components/ui/CardTitle';
import { EmptyState } from '@/components/ui/EmptyState';
import { getHistory } from '@/lib/client/storage';
import type { AnalysisResult } from '@/lib/client/types';
import { UI } from '@/lib/strings';

function formatMemoryDate(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 'Tarih belirsiz';
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

function resolveDaysSince(value: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed) / (24 * 60 * 60 * 1000)));
}

function resolveMemoryCopy(item: AnalysisResult): string {
  const days = resolveDaysSince(item.createdAt);
  if (days >= 90) {
    return `${days} gün önce bu kokuyla tanışmıştın. Şimdi aynı izi yeniden okumaya ne dersin?`;
  }
  if (days >= 30) {
    return `${days} gündür bu profil hafızanda. Koku sahnenin nasıl değiştiğini görmek için tekrar analiz edebilirsin.`;
  }
  return 'Yeni tanıştığın bu izi koleksiyonuna ekleyip zaman içindeki değişimini izleyebilirsin.';
}

function reminderStorageKey(id: string): string {
  return `kd:memory-reminded:${id}`;
}

export default function WearPage() {
  const history = useMemo(() => getHistory(), []);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    'default',
  );

  const summary = useMemo(() => {
    const familyCounter = new Map<string, number>();
    history.forEach((item) => {
      const key = item.family || 'Diğer';
      familyCounter.set(key, (familyCounter.get(key) || 0) + 1);
    });
    const topFamilies = Array.from(familyCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const oldestItem = [...history]
      .filter((item) => item.createdAt)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0] || null;
    const milestoneItem = [...history]
      .filter((item) => resolveDaysSince(item.createdAt) >= 90)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0] || null;

    return { total: history.length, topFamilies, oldestItem, milestoneItem };
  }, [history]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (notificationPermission !== 'granted' || typeof window === 'undefined' || !summary.milestoneItem) return;
    const remindedKey = reminderStorageKey(summary.milestoneItem.id);
    if (window.localStorage.getItem(remindedKey)) return;

    const notification = new Notification('Koku Hafızası', {
      body: `3 ay önce ${summary.milestoneItem.name} ile tanışmıştın. İzi yeniden okumak ister misin?`,
      tag: `memory-${summary.milestoneItem.id}`,
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = `/?replay=${encodeURIComponent(summary.milestoneItem?.id || '')}`;
    };
    window.localStorage.setItem(remindedKey, new Date().toISOString());
  }, [notificationPermission, summary.milestoneItem]);

  async function requestNotifications(): Promise<void> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  }

  if (summary.total === 0) {
    return (
      <AppShell>
        <TopBar title={UI.pageWear} />
        <div className="px-5 py-10 md:px-12">
          <Card className="mx-auto max-w-[760px] p-6 md:p-10">
            <EmptyState
              icon={<div className="h-3.5 w-3.5 rounded-full bg-gold/35" />}
              title={UI.wearEmptyTitle}
              subtitle={UI.wearEmptyBody}
              action={
                <Link
                  href="/"
                  className="inline-flex items-center rounded-md border border-[var(--gold-line)] bg-[var(--gold-dim)] px-5 py-3 text-[11px] font-mono uppercase tracking-[.08em] text-gold no-underline transition-colors hover:bg-gold/15"
                >
                  {UI.emptyWardrobeBtn}
                </Link>
              }
            />
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopBar title={UI.pageWear} />
      <div className="px-5 py-8 pb-24 md:px-12 md:pb-10">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card className="p-5 md:p-6 hover-lift" glow="amber">
              <CardTitle>Koku Hafızası</CardTitle>
              <p className="mt-2 text-[2.2rem] font-semibold leading-[1.02] text-cream">{summary.total}</p>
              <p className="mt-1 text-[12px] text-muted">Kayıtlı analiz</p>
              <p className="mt-4 text-[13px] leading-relaxed text-cream/78">
                Geçmiş analizlerin bir zaman çizgisinde toplanır. Böylece hangi kokuya ne zaman çekildiğini geriye dönük okuyabilirsin.
              </p>
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>Hatırlatma İzni</CardTitle>
              <p className="mt-3 text-[13px] leading-relaxed text-cream/78">
                Üç ay önce tanıştığın kokular için masaüstü bildirimi aç. Böylece koku hafızan seni yeniden çağırır.
              </p>
              <button
                type="button"
                onClick={() => void requestNotifications()}
                disabled={notificationPermission === 'granted'}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 px-4 py-3 text-[11px] font-mono uppercase tracking-[.14em] text-gold transition-colors hover:bg-[var(--gold-dim)]/25 disabled:opacity-60"
              >
                {notificationPermission === 'granted' ? (
                  <>
                    <BellRing className="h-4 w-4" strokeWidth={1.8} />
                    Bildirimler Açık
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" strokeWidth={1.8} />
                    Hatırlatmayı Aç
                  </>
                )}
              </button>
              {notificationPermission === 'unsupported' ? (
                <p className="mt-3 text-[12px] text-muted">Bu tarayıcı bildirim desteği sunmuyor.</p>
              ) : null}
            </Card>

            <Card className="p-5 md:p-6 hover-lift">
              <CardTitle>En Baskın Aileler</CardTitle>
              <div className="mt-4 space-y-3">
                {summary.topFamilies.map(([family, count]) => (
                  <div key={family}>
                    <div className="mb-1.5 flex items-center justify-between text-[12px]">
                      <span className="text-cream">{family}</span>
                      <span className="text-muted">{count}</span>
                    </div>
                    <div className="h-[6px] overflow-hidden rounded-full bg-white/[.08]">
                      <div
                        className="h-full rounded-full bg-gold transition-all duration-500"
                        style={{ width: `${Math.max(8, Math.min(100, (count / summary.total) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card className="p-5 md:p-6 hover-lift">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>Timeline</CardTitle>
              {summary.oldestItem ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-mono uppercase tracking-[.12em] text-muted">
                  İlk kayıt: {formatMemoryDate(summary.oldestItem.createdAt)}
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-4">
              {history.map((item, index) => (
                <div key={item.id} className="relative pl-8">
                  {index < history.length - 1 ? (
                    <span className="absolute left-[11px] top-7 h-[calc(100%+12px)] w-px bg-white/[.08]" />
                  ) : null}
                  <span className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--gold-line)] bg-[var(--gold-dim)]/15 text-gold">
                    <Clock3 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </span>

                  <Link
                    href={`/?replay=${encodeURIComponent(item.id)}`}
                    className="block rounded-[22px] border border-white/8 bg-white/[.03] p-4 transition-all duration-300 hover:border-[var(--gold-line)] hover:bg-white/[.05]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[12px] font-mono uppercase tracking-[.14em] text-gold/80">
                        {formatMemoryDate(item.createdAt)}
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[.12em] text-cream/70">
                        {item.family}
                      </span>
                    </div>

                    <h3 className="mt-3 text-[1.35rem] font-semibold leading-tight text-cream">{item.name}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-cream/76">{resolveMemoryCopy(item)}</p>
                  </Link>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
