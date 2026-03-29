/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/pricing.html', destination: '/paketler', permanent: true },
      { source: '/privacy.html', destination: '/gizlilik', permanent: true },
      { source: '/privacy-policy.html', destination: '/gizlilik', permanent: true },
      { source: '/terms.html', destination: '/kullanim-kosullari', permanent: true },
      { source: '/terms-and-conditions.html', destination: '/kullanim-kosullari', permanent: true },
      { source: '/refund-policy.html', destination: '/iade-politikasi', permanent: true },
    ];
  },
};

module.exports = nextConfig;
