import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Koku Dedektifi',
    short_name: 'KokuDet',
    description: 'AI destekli parfum analizi',
    start_url: '/',
    display: 'standalone',
    background_color: '#09080A',
    theme_color: '#09080A',
    icons: [
      {
        src: '/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
      },
    ],
  };
}

