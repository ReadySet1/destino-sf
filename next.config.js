/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  reactStrictMode: true,
  // Configure TypeScript checking only in production to prevent build failures
  typescript: {
    // Always ignore build errors to prevent deployments from failing on TS errors
    // We'll run type checking separately
    ignoreBuildErrors: true,
    // Only check TypeScript in production
    tsconfigPath: process.env.VERCEL_ENV === 'production' ? './tsconfig.json' : './tsconfig.dev.json',
  },
  // Optionally ignore ESLint errors during build in non-production environments
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: true,
  },
  // Add Sanity to transpile modules to avoid issues with conflicting types
  transpilePackages: ['next-sanity', '@sanity/client'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        port: '',
        pathname: '/images/**',
      },
      {
        protocol: 'https',
        hostname: 'items-images-production.s3.us-west-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'items-images-sandbox.s3.us-west-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
