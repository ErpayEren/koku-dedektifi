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
    default: 'Koku Dedektifi - AI Parfum Analizi',
    template: '%s - Koku Dedektifi',
  },
  description: 'Parfumunu fotografla veya tarif et, yapay zeka koku piramidini, molekullerini ve benzer onerileri analiz etsin.',
  metadataBase: new URL('https://koku-dedektifi.vercel.app'),
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

