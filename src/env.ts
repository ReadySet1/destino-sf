import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    SQUARE_ACCESS_TOKEN: z.string(),
    SQUARE_WEBHOOK_SIGNATURE_KEY: z.string(),
    // Resend Email Configuration
    RESEND_API_KEY: z.string(),
    FROM_EMAIL: z.string().email(),
    ADMIN_EMAIL: z.string().email(),
    SHOP_NAME: z.string().default("Destino SF"),
    // Add other environment variables here
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
    // Add client-side environment variables here if needed
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_WEBHOOK_SIGNATURE_KEY: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    // Resend Email Configuration
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    SHOP_NAME: process.env.SHOP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    // Add other environment variables here
  },
}); 