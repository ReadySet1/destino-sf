/**
 * Content Security Policy Configuration
 * Centralized CSP management for Destino SF
 */

export interface CSPConfig {
  environment: 'development' | 'production' | 'test';
  nonce?: string;
  reportOnly?: boolean;
}

/**
 * External domains and services used by the application
 */
export const TRUSTED_DOMAINS = {
  // Square Payment Services
  square: [
    'https://js.squareup.com',
    'https://sandbox.web.squarecdn.com',
    'https://web.squarecdn.com',
    'https://connect.squareup.com',
    'https://connect.squareupsandbox.com',
    'https://*.squarecdn.com',
  ],

  // Supabase Services
  supabase: ['https://*.supabase.co', 'https://*.supabase.io'],

  // Google Services
  google: [
    'https://maps.googleapis.com',
    'https://maps.gstatic.com',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
  ],

  // AWS S3 Storage
  aws: [
    'https://*.s3.us-west-2.amazonaws.com',
    'https://*.s3.amazonaws.com',
    'https://items-images-sandbox.s3.us-west-2.amazonaws.com',
    'https://items-images-production.s3.us-west-2.amazonaws.com',
    'https://square-marketplace.s3.amazonaws.com',
    'https://square-marketplace-sandbox.s3.amazonaws.com',
    'https://square-catalog-production.s3.amazonaws.com',
    'https://square-catalog-sandbox.s3.amazonaws.com',
  ],

  // Other Services
  other: [
    'https://destino-sf.square.site',
    'https://*.upstash.io', // Redis
    'https://api.resend.com', // Email
    'https://vitals.vercel-insights.com', // Analytics
    'https://*.sentry.io', // Error monitoring (future)
  ],
};

/**
 * Generate Content Security Policy based on environment and configuration
 */
export function generateCSP(config: CSPConfig): string {
  const { environment, nonce, reportOnly } = config;

  // Base policy directives
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],

    'script-src': [
      "'self'",
      // Allow inline scripts with nonce in development
      ...(environment === 'development' ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      // Add nonce if provided
      ...(nonce ? [`'nonce-${nonce}'`] : []),
      // External script sources
      ...TRUSTED_DOMAINS.square,
      ...TRUSTED_DOMAINS.google,
    ],

    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS and dynamic styles
      ...TRUSTED_DOMAINS.google, // Google Fonts
    ],

    'font-src': [
      "'self'",
      'data:', // Data URLs for fonts
      ...TRUSTED_DOMAINS.google.filter(domain => domain.includes('gstatic')),
    ],

    'img-src': [
      "'self'",
      'data:', // Data URLs
      'blob:', // Blob URLs
      ...TRUSTED_DOMAINS.aws,
      ...TRUSTED_DOMAINS.square,
      ...TRUSTED_DOMAINS.supabase,
      ...TRUSTED_DOMAINS.google,
      ...TRUSTED_DOMAINS.other.filter(
        domain => !domain.includes('upstash') && !domain.includes('resend')
      ),
    ],

    'connect-src': [
      "'self'",
      ...TRUSTED_DOMAINS.supabase,
      ...TRUSTED_DOMAINS.square.filter(domain => domain.includes('connect')),
      ...TRUSTED_DOMAINS.other,
    ],

    'frame-src': ["'self'", ...TRUSTED_DOMAINS.square],

    'media-src': ["'self'", 'data:', 'blob:'],

    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  };

  // Add report-uri in production
  if (environment === 'production' && !reportOnly) {
    directives['report-uri'] = ['/api/security/csp-report'];
  }

  // Convert directives to CSP string
  const cspString = Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');

  return cspString;
}

/**
 * Get CSP for different environments
 */
export function getCSPForEnvironment(
  environment: 'development' | 'production' | 'test',
  nonce?: string
): string {
  return generateCSP({ environment, nonce });
}

/**
 * Development CSP (more permissive for development tools)
 */
export function getDevelopmentCSP(nonce?: string): string {
  return getCSPForEnvironment('development', nonce);
}

/**
 * Production CSP (strict security)
 */
export function getProductionCSP(nonce?: string): string {
  return getCSPForEnvironment('production', nonce);
}

/**
 * Validate CSP configuration
 */
export function validateCSPConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required domains
  const requiredDomains = ['js.squareup.com', 'supabase.co'];
  const allDomains = Object.values(TRUSTED_DOMAINS).flat().join(' ');

  for (const domain of requiredDomains) {
    if (!allDomains.includes(domain)) {
      errors.push(`Missing required domain: ${domain}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Security headers configuration
 */
export const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',

  // XSS Protection
  'X-XSS-Protection': '1; mode=block',

  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Permissions Policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'interest-cohort=()',
    'payment=(self)',
    'usb=()',
    'bluetooth=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', '),

  // HSTS (only in production)
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Additional security headers
  'X-DNS-Prefetch-Control': 'off',
  'X-Download-Options': 'noopen',
  'X-Permitted-Cross-Domain-Policies': 'none',
} as const;
