/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      // Redirect /en/some/path → /some/path (308 permanent)
      {
        source: '/:locale(en|tr|es|fr|it|ru|zh|pt)/:path*',
        destination: '/:path*',
        permanent: true,
      },
      // Redirect bare /en, /tr, etc. → /
      {
        source: '/:locale(en|tr|es|fr|it|ru|zh|pt)',
        destination: '/',
        permanent: true,
      },
    ];
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['media.base44.com', 'images.unsplash.com'],
  },
  experimental: {
    esmExternals: 'loose',
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'firebase/auth': path.resolve(__dirname, 'node_modules/firebase/auth/dist/esm/index.esm.js'),
      'firebase/firestore': path.resolve(__dirname, 'node_modules/firebase/firestore/dist/esm/index.esm.js'),
      'firebase/storage': path.resolve(__dirname, 'node_modules/firebase/storage/dist/esm/index.esm.js'),
      '@firebase/storage': path.resolve(__dirname, 'node_modules/@firebase/storage/dist/index.esm2017.js'),
      '@firebase/auth': path.resolve(__dirname, 'node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js'),
      '@firebase/firestore': path.resolve(__dirname, 'node_modules/@firebase/firestore/dist/index.esm2017.js'),
    };
    return config;
  },
}

module.exports = nextConfig