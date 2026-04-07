/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  async redirects() {
    return [
      { source: '/pricing.html', destination: '/paketler', permanent: true },
      { source: '/privacy.html', destination: '/gizlilik', permanent: true },
      { source: '/privacy-policy.html', destination: '/gizlilik', permanent: true },
      { source: '/gizlilik.html', destination: '/gizlilik', permanent: true },
      { source: '/terms.html', destination: '/kullanim-kosullari', permanent: true },
      { source: '/terms-and-conditions.html', destination: '/kullanim-kosullari', permanent: true },
      { source: '/kullanim-kosullari.html', destination: '/kullanim-kosullari', permanent: true },
      { source: '/refund-policy.html', destination: '/iade-politikasi', permanent: true },
      { source: '/iade-politikasi.html', destination: '/iade-politikasi', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'generativelanguage.googleapis.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
