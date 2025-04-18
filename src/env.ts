import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    SQUARE_ACCESS_TOKEN: z.string(),
    SQUARE_WEBHOOK_SIGNATURE_KEY: z.string(),
    // Add other environment variables here
  },
  client: {
    // Add client-side environment variables here if needed
  },
  runtimeEnv: {
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_WEBHOOK_SIGNATURE_KEY: process.env.SQUARE_WEBHOOK_SIGNATURE_KEY,
    // Add other environment variables here
  },
}); 