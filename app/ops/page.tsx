'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

type MetricsRow = { value: string; count: number };
type DailySeriesRow = { day: string; total: number };
type EventsRow = { event: string; count: number };
type ErrorLogRow = { ts?: string; level?: string; message?: string; url?: string };

type MetricsPayload = {
  total?: number;
  range?: { startDay: string; endDay: string; days: number };
  store?: string;
  funnel?: {
    appOpen?: number;
    analysisTriggered?: number;
    analysisSuccessFromTriggerPct?: number;
    registerFromOpenPct?: number;
    advisorFromOpenPct?: number;
  };
  series?: DailySeriesRow[];
  events?: EventsRow[];
  behavior?: {
    guidedFlows?: MetricsRow[];
    feedbackTypes?: MetricsRow[];
    shelfStates?: MetricsRow[];
    shelfTags?: MetricsRow[];
    compareSources?: MetricsRow[];
    shelfFavorites?: MetricsRow[];
  };
};

type BillingPayload = {
  billing?: {
    provider?: string;
    ready?: boolean;
    missing?: string[];
  };
};

export const metadata = { title: 'Ops Panel - Koku Dedektifi' };
export const dynamic = 'force-dynamic';

function fmtNum(value: unknown): string {
  return Number(value || 0).toLocaleString('tr-TR');
}

function fmtPct(value: unknown): string {
  return `${Number(value || 0).toFixed(1)}%`;
}

function BarList({ rows, emptyText }: { rows: MetricsRow[]; emptyText: string }) {
  if (!rows.length) return <p style={{ color: '#9a90a5', fontSize: 12 }}>{emptyText}</p>;

  const maxCount = Math.max(...rows.map((row) => Number(row.count || 0)), 1);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rows.map((row) => {
        const width = Math.max(4, Math.round((Number(row.count || 0) / maxCount) * 100));
        return (
          <div key={`${row.value}-${row.count}`} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 70px', gap: 10, alignItems: 'center', fontSize: 12 }}>
            <div>{row.value}</div>
            <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${width}%`, borderRadius: 999, background: 'linear-gradient(90deg,#c8a97e,#9b6fa0)' }} />
            </div>
            <div style={{ textAlign: 'right' }}>{fmtNum(row.count)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function OpsPage() {
  const [metricsKey, setMetricsKey] = useState('');
  const [days, setDays] = useState('7');
  const [day, setDay] = useState('');
  const [status, setStatus] = useState('');
  const [billingStatus, setBillingStatus] = useState('');
  const [errorsStatus, setErrorsStatus] = useState('');
  const [metrics, setMetrics] = useState<MetricsPayload | null>(null);
  const [billing, setBilling] = useState<BillingPayload | null>(null);
  const [errorRows, setErrorRows] = useState<ErrorLogRow[]>([]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const keyFromUrl = (url.searchParams.get('key') || '').trim();
    const daysFromUrl = (url.searchParams.get('days') || '').trim();
    const dayFromUrl = (url.searchParams.get('day') || '').trim();
    const stored = localStorage.getItem('koku-metrics-key') || '';

    setMetricsKey(keyFromUrl || stored);
    if (['1', '3', '7', '14', '30'].includes(daysFromUrl)) setDays(daysFromUrl);
    if (dayFromUrl) setDay(dayFromUrl);
  }, []);

  const behaviorTags = useMemo(() => {
    const behavior = metrics?.behavior;
    if (!behavior) return [];
    return [
      ...(behavior.shelfTags || []).map((item) => ({ ...item, value: `Tag: ${item.value}` })),
      ...(behavior.compareSources || []).map((item) => ({ ...item, value: `Compare: ${item.value}` })),
      ...(behavior.shelfFavorites || []).map((item) => ({ ...item, value: `Favori: ${item.value}` })),
    ];
  }, [metrics]);

  const refreshBilling = useCallback(async () => {
    setBillingStatus('Billing readiness cekiliyor...');
    try {
      const response = await fetch('/api/billing-health', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as BillingPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setBilling(payload);
      setBillingStatus(`Billing guncellendi (${new Date().toLocaleTimeString('tr-TR')})`);
    } catch (error) {
      setBillingStatus(`Billing hata: ${(error as Error).message}`);
    }
  }, []);

  const refreshErrors = useCallback(async (key?: string, customDay?: string) => {
    const activeKey = (key ?? metricsKey).trim();
    if (!activeKey) {
      setErrorsStatus('Error log icin metrics key gerekli.');
      return;
    }
    setErrorsStatus('Client hatalari cekiliyor...');
    try {
      const params = new URLSearchParams({
        key: activeKey,
        day: customDay || day || new Date().toISOString().slice(0, 10),
      });
      const response = await fetch(`/api/error-log?${params.toString()}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as { rows?: ErrorLogRow[]; error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setErrorRows(Array.isArray(payload.rows) ? payload.rows : []);
      setErrorsStatus(`Error log guncellendi (${new Date().toLocaleTimeString('tr-TR')})`);
    } catch (error) {
      setErrorsStatus(`Error log hatasi: ${(error as Error).message}`);
    }
  }, [day, metricsKey]);

  const refreshMetrics = useCallback(async () => {
    const activeKey = metricsKey.trim();
    if (!activeKey) {
      setStatus('Metrics key gerekli.');
      return;
    }

    localStorage.setItem('koku-metrics-key', activeKey);
    setStatus('Veri cekiliyor...');

    try {
      const params = new URLSearchParams({ key: activeKey, days: String(days) });
      if (day) params.set('day', day);
      const response = await fetch(`/api/metrics?${params.toString()}`, { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as MetricsPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
      setMetrics(payload);
      setStatus(`Guncellendi (${new Date().toLocaleTimeString('tr-TR')})`);
      await refreshErrors(activeKey, day);
    } catch (error) {
      setStatus(`Hata: ${(error as Error).message}`);
    }
  }, [day, days, metricsKey, refreshErrors]);

  useEffect(() => {
    void refreshBilling();
  }, [refreshBilling]);

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', background: '#09080A', color: '#EBE4D8', minHeight: '100vh' }}>
      <section style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 14 }}>
        <article style={{ background: '#15131a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
          <h1 style={{ margin: 0, color: '#c8a97e', fontSize: 22 }}>Ops Panel</h1>
          <p style={{ color: '#9a90a5', fontSize: 12 }}>Startup funnel, onboarding ve retention sinyalleri burada gorunur.</p>

          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', alignItems: 'end' }}>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: '#9a90a5' }}>
              Metrics API Key
              <input value={metricsKey} onChange={(event) => setMetricsKey(event.target.value)} type="password" placeholder="METRICS_API_KEY" style={inputStyle} />
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: '#9a90a5' }}>
              Gun sayisi
              <select value={days} onChange={(event) => setDays(event.target.value)} style={inputStyle}>
                <option value="1">1 gun</option>
                <option value="3">3 gun</option>
                <option value="7">7 gun</option>
                <option value="14">14 gun</option>
                <option value="30">30 gun</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 5, fontSize: 12, color: '#9a90a5' }}>
              Anchor gun (opsiyonel)
              <input value={day} onChange={(event) => setDay(event.target.value)} type="date" style={inputStyle} />
            </label>
            <button type="button" onClick={() => void refreshMetrics()} style={buttonStyle}>Yenile</button>
          </div>
          <p style={{ color: '#9a90a5', fontSize: 12, minHeight: 17 }}>{status}</p>
        </article>

        <article style={{ background: '#15131a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: '0 0 10px', color: '#c8a97e', fontSize: 13, letterSpacing: '.05em', textTransform: 'uppercase' }}>Billing Readiness</h2>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <OpsKv title="Provider" value={billing?.billing?.provider || '-'} />
            <OpsKv title="Durum" value={(billing?.billing?.ready ? 'Hazir' : 'Eksik Var')} />
            <OpsKv title="Eksik Degiskenler" value={(billing?.billing?.missing || []).join(', ') || 'Yok'} />
          </div>
          <p style={{ color: '#9a90a5', fontSize: 12, minHeight: 17 }}>{billingStatus}</p>
          <button type="button" onClick={() => void refreshBilling()} style={buttonStyle}>Billing Kontrol Et</button>
        </article>

        <article style={{ background: '#15131a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: '0 0 10px', color: '#c8a97e', fontSize: 13, letterSpacing: '.05em', textTransform: 'uppercase' }}>Temel KPI</h2>
          <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <Kpi label="Toplam Event" value={fmtNum(metrics?.total)} />
            <Kpi label="App Open" value={fmtNum(metrics?.funnel?.appOpen)} />
            <Kpi label="Analysis Trigger" value={fmtNum(metrics?.funnel?.analysisTriggered)} />
            <Kpi label="Analysis Success %" value={fmtPct(metrics?.funnel?.analysisSuccessFromTriggerPct)} />
            <Kpi label="Register % (Open bazli)" value={fmtPct(metrics?.funnel?.registerFromOpenPct)} />
            <Kpi label="Advisor Engagement %" value={fmtPct(metrics?.funnel?.advisorFromOpenPct)} />
          </div>
          <p style={{ color: '#9a90a5', fontSize: 12 }}>
            {metrics?.range ? `Aralik: ${metrics.range.startDay} - ${metrics.range.endDay} | gun: ${metrics.range.days} | store: ${metrics.store || 'unknown'}` : `Store: ${metrics?.store || 'unknown'}`}
          </p>
        </article>

        <article style={{ background: '#15131a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: '0 0 10px', color: '#c8a97e', fontSize: 13, letterSpacing: '.05em', textTransform: 'uppercase' }}>Gunluk Seri</h2>
          <BarList rows={metrics?.series || []} emptyText="Seri verisi yok." />
        </article>

        <article style={{ background: '#15131a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: '0 0 10px', color: '#c8a97e', fontSize: 13, letterSpacing: '.05em', textTransform: 'uppercase' }}>Top Eventler</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={thStyle}>Event</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {(metrics?.events || []).length ? (metrics?.events || []).slice(0, 30).map((row) => (
                <tr key={`${row.event}-${row.count}`}>
                  <td style={tdStyle}>{row.event}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtNum(row.count)}</td>
                </tr>
              )) : (
                <tr>
                  <td style={tdStyle} colSpan={2}>Event bulunamadi</td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article style={{ background: '#15131a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: '0 0 10px', color: '#c8a97e', fontSize: 13, letterSpacing: '.05em', textTransform: 'uppercase' }}>Behavior Breakdown</h2>
          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <div><p style={{ color: '#9a90a5', fontSize: 12 }}>Guided Flow</p><BarList rows={metrics?.behavior?.guidedFlows || []} emptyText="Guided flow verisi yok." /></div>
            <div><p style={{ color: '#9a90a5', fontSize: 12 }}>Feedback Tipleri</p><BarList rows={metrics?.behavior?.feedbackTypes || []} emptyText="Feedback verisi yok." /></div>
            <div><p style={{ color: '#9a90a5', fontSize: 12 }}>Shelf Durumlari</p><BarList rows={metrics?.behavior?.shelfStates || []} emptyText="Shelf durum verisi yok." /></div>
            <div><p style={{ color: '#9a90a5', fontSize: 12 }}>Tag + Compare</p><BarList rows={behaviorTags} emptyText="Tag veya compare verisi yok." /></div>
          </div>
        </article>

        <article style={{ background: '#15131a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: 14 }}>
          <h2 style={{ margin: '0 0 10px', color: '#c8a97e', fontSize: 13, letterSpacing: '.05em', textTransform: 'uppercase' }}>Client Error Logs</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={thStyle}>Zaman</th>
                <th style={thStyle}>Level</th>
                <th style={thStyle}>Mesaj</th>
                <th style={thStyle}>URL</th>
              </tr>
            </thead>
            <tbody>
              {errorRows.length ? errorRows.map((row, idx) => (
                <tr key={`${row.ts || 'ts'}-${idx}`}>
                  <td style={tdStyle}>{String(row.ts || '').replace('T', ' ').slice(0, 19)}</td>
                  <td style={tdStyle}>{row.level || '-'}</td>
                  <td style={tdStyle}>{String(row.message || '').slice(0, 120)}</td>
                  <td style={tdStyle}>{String(row.url || '').replace(/^https?:\/\//, '').slice(0, 90)}</td>
                </tr>
              )) : (
                <tr>
                  <td style={tdStyle} colSpan={4}>Bugun kayitli istemci hatasi yok.</td>
                </tr>
              )}
            </tbody>
          </table>
          <p style={{ color: '#9a90a5', fontSize: 12, minHeight: 17 }}>{errorsStatus}</p>
        </article>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, background: 'rgba(255,255,255,0.02)', padding: 10 }}>
      <div style={{ fontSize: 11, color: '#9a90a5', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: '#efe9e3' }}>{value}</div>
    </div>
  );
}

function OpsKv({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 9, background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ fontSize: 11, color: '#9a90a5', textTransform: 'uppercase', letterSpacing: '.35px' }}>{title}</div>
      <div style={{ marginTop: 4, fontSize: 13, fontWeight: 600, color: '#efe9e3', wordBreak: 'break-word' }}>{value}</div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: '#1c1923',
  color: '#efe9e3',
  padding: 10,
  fontSize: 13,
};

const buttonStyle: CSSProperties = {
  width: '100%',
  borderRadius: 10,
  border: '1px solid rgba(200,169,126,0.45)',
  background: 'linear-gradient(180deg, rgba(200,169,126,0.23), rgba(200,169,126,0.12))',
  color: '#efe9e3',
  padding: 10,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const thStyle: CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  padding: '8px 6px',
  color: '#9a90a5',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '.3px',
  fontSize: 11,
};

const tdStyle: CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  padding: '8px 6px',
};
