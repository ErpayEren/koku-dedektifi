const { withSentryConfig } = require('@sentry/nextjs');
const createMDX = require('@next/mdx');

const withMDX = createMDX({ extension: /\.mdx?$/ });

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
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

module.exports = withSentryConfig(withMDX(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
