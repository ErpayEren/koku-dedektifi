import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, DM_Mono, DM_Sans } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
  preload: true,
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-sans',
  display: 'swap',
  preload: true,
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: 'Koku Dedektifi — AI Parfüm Analizi',
    template: '%s — Koku Dedektifi',
  },
  description: 'Parfümünü fotoğrafla ya da tarif et; yapay zekâ koku piramidini, moleküllerini ve benzer profilleri çözümlesin.',
  metadataBase: new URL('https://koku-dedektifi.vercel.app'),
  icons: {
    icon: [
      { url: '/favicon.svg?v=20260330', type: 'image/svg+xml', sizes: 'any' },
      { url: '/icon.svg?v=20260330', type: 'image/svg+xml', sizes: 'any' },
    ],
    shortcut: [{ url: '/favicon.svg?v=20260330', type: 'image/svg+xml' }],
    apple: [{ url: '/icon.svg?v=20260330', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Koku Dedektifi',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#09080A',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
