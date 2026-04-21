import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const base = 'https://koku-dedektifi.vercel.app';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/profil', '/hesap', '/dolap', '/gecmis', '/akis', '/davet/'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
