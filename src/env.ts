import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    SQUARE_ACCESS_TOKEN: z.string(),
    SQUARE_WEBHOOK_SIGNATURE_KEY: z.string(),
    SQUARE_WEBHOOK_SECRET: z.string(),
    // Resend Email Configuration
    RESEND_API_KEY: z.string(),
    FROM_EMAIL: z.string().email(),
    ADMIN_EMAIL: z.string().email(),
    SHOP_NAME: z.string().default('Destino SF'),
    // Supabase Configuration
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    // NextAuth Configuration
    NEXTAUTH_SECRET: z.string().optional(),
    NEXTAUTH_URL: z.string().url().optional(),
    // Sanity CMS Configuration
    SANITY_API_TOKEN: z.string().optional(),
    // Shipping Configuration
    SHIPPO_API_KEY: z.string().optional(),
    SHIPPO_WEBHOOK_SECRET: z.string().optional(),
    // Twilio Configuration
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    // Rate Limiting Configuration
    UPSTASH_REDIS_REST_URL: z.string().url().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    BYPASS_RATE_LIMIT: z.string().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    // Sanity CMS Configuration
    NEXT_PUBLIC_SANITY_PROJECT_ID: z.string().optional(),
    NEXT_PUBLIC_SANITY_DATASET: z.string().default('production'),
    // Google Maps Configuration
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
    // Error Tracking
    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional(),
    // Analytics
    NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_WEBHOOK_SIGNATURE_KEY: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    SQUARE_WEBHOOK_SECRET: process.env.SQUARE_WEBHOOK_SECRET,
    // Resend Email Configuration
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    SHOP_NAME: process.env.SHOP_NAME,
    // Supabase Configuration
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    // NextAuth Configuration
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    // Sanity CMS Configuration
    SANITY_API_TOKEN: process.env.SANITY_API_TOKEN,
    // Shipping Configuration
    SHIPPO_API_KEY: process.env.SHIPPO_API_KEY,
    SHIPPO_WEBHOOK_SECRET: process.env.SHIPPO_WEBHOOK_SECRET,
    // Twilio Configuration
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    // Rate Limiting Configuration
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    BYPASS_RATE_LIMIT: process.env.BYPASS_RATE_LIMIT,
    // Client-side environment variables
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SANITY_PROJECT_ID: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    NEXT_PUBLIC_SANITY_DATASET: process.env.NEXT_PUBLIC_SANITY_DATASET,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    NEXT_PUBLIC_MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
  },
});
