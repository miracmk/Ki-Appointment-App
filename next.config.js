/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  output: 'standalone',
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
      '@firebase/auth': path.resolve(__dirname, 'node_modules/firebase/node_modules/@firebase/auth/dist/esm2017/index.js'),
      '@firebase/firestore': path.resolve(__dirname, 'node_modules/@firebase/firestore/dist/index.esm2017.js'),
    };
    return config;
  },
}

module.exports = nextConfig