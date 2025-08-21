import { z } from 'zod'

// Environment validation schema
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  DIRECT_URL: z.string().url('DIRECT_URL must be a valid URL').optional(),
  
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  // App Configuration
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXT_PUBLIC_SITE_URL: z.string().url('NEXT_PUBLIC_SITE_URL must be a valid URL'),
  ADMIN_EMAIL: z.string().email('ADMIN_EMAIL must be a valid email'),
  FROM_EMAIL: z.string().email('FROM_EMAIL must be a valid email'),
  
  // API Keys
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().min(1, 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is required'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  

  
  // Square Payment
  SQUARE_ENVIRONMENT: z.enum(['sandbox', 'production'], {
    errorMap: () => ({ message: 'SQUARE_ENVIRONMENT must be either "sandbox" or "production"' })
  }),
  SQUARE_LOCATION_ID: z.string().min(1, 'SQUARE_LOCATION_ID is required'),
  SQUARE_ACCESS_TOKEN: z.string().min(1, 'SQUARE_ACCESS_TOKEN is required'),
  SQUARE_WEBHOOK_SIGNATURE_KEY: z.string().min(1, 'SQUARE_WEBHOOK_SIGNATURE_KEY is required'),
  
  // Optional Square fields
  SQUARE_PRODUCTION_TOKEN: z.string().optional(),
  SQUARE_SANDBOX_APPLICATION_ID: z.string().optional(),
  SQUARE_SANDBOX_TOKEN: z.string().optional(),
  SQUARE_CATALOG_USE_PRODUCTION: z.string().optional(),
  SQUARE_TRANSACTIONS_USE_SANDBOX: z.string().optional(),
  USE_SQUARE_SANDBOX: z.string().optional(),
  
  // Shipping
  SHIPPING_ORIGIN_CITY: z.string().min(1, 'SHIPPING_ORIGIN_CITY is required'),
  SHIPPING_ORIGIN_EMAIL: z.string().email('SHIPPING_ORIGIN_EMAIL must be a valid email'),
  SHIPPING_ORIGIN_NAME: z.string().min(1, 'SHIPPING_ORIGIN_NAME is required'),
  SHIPPING_ORIGIN_PHONE: z.string().min(1, 'SHIPPING_ORIGIN_PHONE is required'),
  SHIPPING_ORIGIN_STATE: z.string().min(2, 'SHIPPING_ORIGIN_STATE must be at least 2 characters'),
  SHIPPING_ORIGIN_STREET1: z.string().min(1, 'SHIPPING_ORIGIN_STREET1 is required'),
  SHIPPING_ORIGIN_ZIP: z.string().min(1, 'SHIPPING_ORIGIN_ZIP is required'),
  SHIPPO_API_KEY: z.string().min(1, 'SHIPPO_API_KEY is required'),
  
  // Shop
  SHOP_NAME: z.string().min(1, 'SHOP_NAME is required'),
  
  // Redis
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required'),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL must be a valid URL'),
  
  // Optional configuration
  BYPASS_RATE_LIMIT: z.string().optional().default('false'),
  NX_DAEMON: z.string().optional().default('false'),
  
  // Turbo
  TURBO_CACHE: z.string().optional(),
  TURBO_DOWNLOAD_LOCAL_ENABLED: z.string().optional(),
  TURBO_REMOTE_ONLY: z.string().optional(),
  TURBO_RUN_SUMMARY: z.string().optional(),
  
  // Vercel (auto-populated)
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
  VERCEL_TARGET_ENV: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_OIDC_TOKEN: z.string().optional(),
})

// Export validated environment variables
export const env = envSchema.parse(process.env)

// Type definitions
export type Environment = z.infer<typeof envSchema>

// Helper functions
export const isDevelopment = () => process.env.NODE_ENV === 'development'
export const isProduction = () => process.env.NODE_ENV === 'production'
export const isTest = () => process.env.NODE_ENV === 'test'

// Database helper
export const getDatabaseConfig = () => ({
  url: env.DATABASE_URL,
  directUrl: env.DIRECT_URL,
  ssl: isProduction()
})

// Supabase helper
export const getSupabaseConfig = () => ({
  url: env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY
})

// Square helper
export const getSquareConfig = () => ({
  environment: env.SQUARE_ENVIRONMENT,
  locationId: env.SQUARE_LOCATION_ID,
  accessToken: env.SQUARE_ACCESS_TOKEN,
  webhookSignatureKey: env.SQUARE_WEBHOOK_SIGNATURE_KEY,
  useSandbox: env.USE_SQUARE_SANDBOX === 'true' || env.SQUARE_ENVIRONMENT === 'sandbox'
})
