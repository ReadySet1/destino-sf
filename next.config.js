/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  reactStrictMode: true,
  // Configure TypeScript checking only in production to prevent build failures
  typescript: {
    // Disable TypeScript during development for faster rebuilds
    ignoreBuildErrors: process.env.VERCEL_ENV !== 'production',
    // Only check TypeScript in production
    tsconfigPath: process.env.VERCEL_ENV === 'production' ? './tsconfig.json' : './tsconfig.dev.json',
  },
  // Optionally ignore ESLint errors during build in non-production environments
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: process.env.VERCEL_ENV !== 'production',
  },
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
