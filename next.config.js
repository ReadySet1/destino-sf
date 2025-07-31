/** @type {import('next').NextConfig} */

// Environment Detection and Logging
function logEnvironmentInfo() {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const isProd = process.env.NODE_ENV === 'production';
    const isTest = process.env.NODE_ENV === 'test';
    const isVercel = !!process.env.VERCEL;
    const isLocal = !!process.env.USE_LOCAL_DOCKER;
    const isCloud = !!process.env.USE_SUPABASE_CLOUD;
    
    // Database detection
    const dbUrl = process.env.DATABASE_URL || '';
    const isLocalDB = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || dbUrl.includes('host.docker.internal');
    const isSupabaseDB = dbUrl.includes('supabase.co') || dbUrl.includes('supabase.com');
    
    // Square detection
    const squareEnv = process.env.USE_SQUARE_SANDBOX === 'true' ? 'sandbox' : 
                     process.env.SQUARE_ENVIRONMENT || 
                     (isProd ? 'production' : 'sandbox');
    
    console.log('\n🚀 Next.js Environment Configuration');
    console.log('═'.repeat(50));
    console.log(`App Environment:     ${process.env.NODE_ENV?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`Infrastructure:      ${isVercel ? 'Vercel Cloud' : isLocal ? 'Local Docker' : isCloud ? 'Cloud' : 'Local'}`);
    console.log(`Database:            ${isSupabaseDB ? 'Supabase Cloud' : isLocalDB ? 'Local PostgreSQL' : 'External'}`);
    console.log(`Square:              ${squareEnv}`);
    console.log(`Base URL:            ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`);
    
    // Feature flags
    const features = [];
    if (isDev) features.push('Development Mode');
    if (isProd) features.push('Production Mode'); 
    if (isTest) features.push('Test Mode');
    if (process.env.DEBUG === 'true') features.push('Debug Logging');
    if (process.env.VERBOSE_LOGGING === 'true') features.push('Verbose Logging');
    
    if (features.length > 0) {
      console.log(`Features:            ${features.join(', ')}`);
    }
    
    // Connection status
    const connections = [];
    if (process.env.DATABASE_URL) connections.push('Database');
    if (process.env.SQUARE_ACCESS_TOKEN || process.env.SQUARE_SANDBOX_TOKEN) connections.push('Square');
    if (process.env.UPSTASH_REDIS_REST_URL) connections.push('Redis');
    if (process.env.SHIPPO_API_KEY) connections.push('Shippo');
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) connections.push('Supabase');
    
    console.log(`Services:            ${connections.length > 0 ? connections.join(', ') : 'None configured'}`);
    
    // Warnings
    const warnings = [];
    if (isProd && squareEnv === 'sandbox') {
      warnings.push('Production app using Square sandbox');
    }
    if (isDev && isSupabaseDB && !isLocal) {
      warnings.push('Development using cloud database');
    }
    if (!process.env.DATABASE_URL) {
      warnings.push('No database URL configured');
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }
    
    console.log('═'.repeat(50));
    console.log(`🔧 Use 'pnpm env:check' for detailed environment analysis\n`);
    
  } catch (error) {
    console.log('⚠️  Failed to log environment info:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// Log environment info during Next.js startup
if (process.env.NODE_ENV !== 'test') {
  logEnvironmentInfo();
}

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
    // Use main tsconfig.json for builds to ensure proper path resolution
    tsconfigPath: './tsconfig.json',
  },
  // Enable ESLint checking during builds
  eslint: {
    dirs: ['src'],
    ignoreDuringBuilds: false, // Re-enable ESLint checking for production builds
  },
  // Add Sanity to transpile modules to avoid issues with conflicting types
  transpilePackages: ['next-sanity', '@sanity/client'],
  // Configure external packages for Prisma compatibility with Next.js 15.3.2
  serverExternalPackages: ['@prisma/client', 'prisma'],
  // Experimental features
  experimental: {
    // Empty for now
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
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent clickjacking attacks
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Control browser features
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
          },
          // Enforce HTTPS in production
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://analytics.readysetllc.com https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.s3.us-west-2.amazonaws.com https://*.s3.amazonaws.com https://*.squarecdn.com https://*.supabase.co https://destino-sf.square.site https://maps.googleapis.com https://maps.gstatic.com",
              "connect-src 'self' https://analytics.readysetllc.com https://*.supabase.co https://connect.squareup.com https://connect.squareupsandbox.com https://*.upstash.io https://api.resend.com https://vitals.vercel-insights.com https://maps.googleapis.com https://maps.google.com https://*.googleapis.com https://*.gstatic.com",
              "frame-src 'self' https://js.squareup.com https://sandbox.web.squarecdn.com https://web.squarecdn.com",
              "media-src 'self' data: blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              'upgrade-insecure-requests',
            ].join('; '),
          },
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
    // Disable image optimization retries for failed images to prevent infinite loops
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Handle failed images gracefully
    unoptimized: false,
  },
};

export default nextConfig;
