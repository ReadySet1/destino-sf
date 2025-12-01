/**
 * Next.js 15 Instrumentation File
 *
 * This file is automatically loaded by Next.js and is used to initialize
 * monitoring and observability tools like Sentry.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side Sentry initialization
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime Sentry initialization
    await import('../sentry.edge.config');
  }
}

/**
 * Captures unhandled errors from Next.js server components, API routes, and middleware.
 * This is called by Next.js when an error occurs during request processing.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation#onrequesterror-optional
 */
export const onRequestError = Sentry.captureRequestError;
