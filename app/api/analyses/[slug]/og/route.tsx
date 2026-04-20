import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { getAnalysisBySlug } from '@/lib/server/core-analysis';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const analysis = await getAnalysisBySlug(params.slug).catch(() => null);

  const name = analysis?.name ?? 'Parfüm Analizi';
  const brand = analysis?.brand ?? '';
  const confidence = analysis?.confidence ?? 0;
  const topNotes = analysis?.pyramid?.top?.slice(0, 3) ?? [];
  const description = analysis?.description?.slice(0, 80) ?? 'Moleküler parfüm analizi';

  const ringColor =
    confidence >= 70 ? '#D4AF55' : confidence >= 40 ? '#D4903A' : '#C0614A';

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0A0A0A 0%, #121012 60%, #1a1208 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px',
          fontFamily: 'system-ui, sans-serif',
          color: '#F5EDD8',
          position: 'relative',
        }}
      >
        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: '#D4AF5515',
            border: '1px solid #D4AF5540',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
          }}>🧴</div>
          <span style={{ fontSize: '14px', letterSpacing: '0.15em', color: '#D4AF55', textTransform: 'uppercase', fontWeight: 600 }}>
            Koku Dedektifi
          </span>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', flex: 1, gap: '64px', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            {brand ? (
              <div style={{ fontSize: '18px', color: '#D4AF55', marginBottom: '12px', letterSpacing: '0.1em' }}>
                {brand}
              </div>
            ) : null}
            <div style={{ fontSize: '56px', fontWeight: 700, lineHeight: 1.05, marginBottom: '20px', letterSpacing: '-0.02em' }}>
              {name}
            </div>
            <div style={{ fontSize: '20px', color: 'rgba(245,237,216,0.65)', lineHeight: 1.5, marginBottom: '28px' }}>
              {description}
            </div>
            {topNotes.length > 0 ? (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {topNotes.map((note) => (
                  <span key={note} style={{
                    fontSize: '13px',
                    border: '1px solid rgba(212,175,85,0.3)',
                    borderRadius: '100px',
                    padding: '6px 14px',
                    color: '#D4AF55',
                    background: 'rgba(212,175,85,0.08)',
                    letterSpacing: '0.08em',
                  }}>{note}</span>
                ))}
              </div>
            ) : null}
          </div>

          {/* Confidence ring */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="58" stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
              <circle
                cx="70" cy="70" r="58"
                stroke={ringColor}
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(confidence / 100) * 364.4} 364.4`}
                transform="rotate(-90 70 70)"
              />
              <text x="70" y="62" textAnchor="middle" fontSize="28" fontWeight="700" fill={ringColor}>{confidence}</text>
              <text x="70" y="82" textAnchor="middle" fontSize="11" fill="rgba(245,237,216,0.5)" letterSpacing="2">GÜVEN</text>
            </svg>
            <span style={{ fontSize: '13px', color: 'rgba(245,237,216,0.5)', letterSpacing: '0.1em' }}>
              {confidence >= 70 ? 'Yüksek Güven' : confidence >= 40 ? 'Orta Güven' : 'Düşük Güven'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '14px', color: 'rgba(245,237,216,0.4)', letterSpacing: '0.06em' }}>
            kokudedektifi.com
          </span>
          <span style={{ fontSize: '13px', color: '#D4AF55', letterSpacing: '0.1em' }}>
            Moleküler Parfüm Analizi
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
