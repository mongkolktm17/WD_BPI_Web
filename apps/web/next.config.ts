import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    const apiInternalUrl = process.env.API_INTERNAL_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternalUrl}/api/:path*`,
      },
      {
        source: '/cctv-images/:path*',
        destination: `${apiInternalUrl}/cctv-images/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/reports/radio',
        destination: '/radio-inspection',
        permanent: false,
      },
      {
        source: '/reports/radio/:path*',
        destination: '/radio-inspection',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;