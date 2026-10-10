import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Required for Hostinger Node.js deployment — bundles everything into .next/standalone
  output: 'standalone',

  // Prevent Prisma Client and native modules from being bundled into client/edge bundles
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(process.cwd(), 'src'),
    };
    return config;
  },

  // Security headers per TECH §10
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
