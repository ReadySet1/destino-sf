/** @type {import('next').NextConfig} */
const nextConfig = {
  compiler: {
    styledComponents: true,
  },
  reactStrictMode: true,
  // Remove X-Powered-By header
  poweredByHeader: false,
  // Configure TypeScript checking
  typescript: {
    // Re-enable TypeScript checking for production builds
    ignoreBuildErrors: false,
    // Use build-specific tsconfig.json to exclude test files
    tsconfigPath: './tsconfig.build.json',
  },
  // Enable ESLint checking during builds
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: false, // Re-enable ESLint checking for production builds
  },

  // Configure external packages for Prisma compatibility with Next.js 15.3.2
  serverExternalPackages: ['@prisma/client', 'prisma'],

  // Optimize output
  output: 'standalone',
  // Experimental features
  experimental: {
    // Enable experimental features for better performance
    optimizePackageImports: ['lucide-react', '@supabase/ssr'],
  },
  // Configure webpack for client-side to avoid Node.js modules
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Suppress the realtime-js warning and other performance warnings
    config.ignoreWarnings = [
      {
        module: /node_modules\/@supabase\/realtime-js/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /node_modules\/ws/,
        message: /Critical dependency/,
      },
      {
        module: /node_modules\/bufferutil/,
        message: /Critical dependency/,
      },
      {
        module: /node_modules\/utf-8-validate/,
        message: /Critical dependency/,
      },
      {
        module: /node_modules\/@opentelemetry\/instrumentation/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
    ];

    return config;
  },
  // Security headers configuration
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks (relaxed for dev)
          {
            key: 'X-Frame-Options',
            value: isDev ? 'SAMEORIGIN' : 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection (disabled in dev for Safari)
          ...(isDev
            ? []
            : [
                {
                  key: 'X-XSS-Protection',
                  value: '1; mode=block',
                },
              ]),
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'no-referrer-when-downgrade',
          },
          // Control browser features (relaxed for dev)
          {
            key: 'Permissions-Policy',
            value: isDev
              ? 'camera=*, microphone=*, geolocation=*'
              : 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          // Skip HTTPS enforcement in development
          ...(isDev
            ? []
            : [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=63072000; includeSubDomains; preload',
                },
              ]),
          // Content Security Policy - Safari-friendly version, relaxed for development
          ...(isDev
            ? []
            : [
                {
                  key: 'Content-Security-Policy',
                  value: [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://analytics.readysetllc.com https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com",
                    "style-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com data: blob:",
                    "font-src 'self' https://fonts.gstatic.com data:",
                    "img-src 'self' data: blob: https://*.s3.us-west-2.amazonaws.com https://*.s3.amazonaws.com https://*.squarecdn.com https://*.supabase.co https://destino-sf.square.site https://maps.googleapis.com https://maps.gstatic.com",
                    "connect-src 'self' https://analytics.readysetllc.com https://*.supabase.co https://connect.squareup.com https://connect.squareupsandbox.com https://*.upstash.io https://api.resend.com https://vitals.vercel-insights.com https://maps.googleapis.com https://maps.google.com https://*.googleapis.com https://*.gstatic.com ws: wss:",
                    "frame-src 'self' https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com",
                    "media-src 'self' data: blob:",
                    "object-src 'self' data:",
                    "base-uri 'self'",
                    "form-action 'self'",
                    "frame-ancestors 'self'",
                    "worker-src 'self' blob:",
                  ].join('; '),
                },
              ]),
          // Add Safari development compatibility headers
          ...(isDev
            ? [
                {
                  key: 'Access-Control-Allow-Origin',
                  value: '*',
                },
                {
                  key: 'Cross-Origin-Embedder-Policy',
                  value: 'unsafe-none',
                },
                {
                  key: 'Cross-Origin-Opener-Policy',
                  value: 'unsafe-none',
                },
              ]
            : []),
        ],
      },
      // API routes specific headers
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      // CSS files specific headers for Safari compatibility
      {
        source: '/:path*.css',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Next.js CSS files specific headers
      {
        source: '/_next/static/css/:path*.css',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/css; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Admin routes specific headers
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'items-images-sandbox.s3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'items-images-production.s3.us-west-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.squarecdn.com',
      },
      {
        protocol: 'https',
        hostname: 'square-marketplace.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'square-marketplace-sandbox.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'square-catalog-production.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'square-catalog-sandbox.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'destino-sf.square.site',
      },
    ],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Fix for S3 image optimization timeouts
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Configure for better handling of slow S3 images
    loader: 'default',
    formats: ['image/webp', 'image/avif'],
    // Handle failed images gracefully - keep optimization enabled but with better error handling
    unoptimized: false,
    // Add timeout and quality settings for better performance
    minimumCacheTTL: 3600, // 1 hour
    // Configure image qualities (required for Next.js 16+)
    qualities: [50, 75, 85, 90, 95, 100],
  },
};

export default nextConfig;
