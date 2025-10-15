/**
 * React component for loading Umami analytics script
 * This component provides a clean, reusable way to load Umami
 * with proper TypeScript support and error handling
 */

'use client';

import Script from 'next/script';
import { UMAMI_CONFIG } from './umami';

interface UmamiScriptProps {
  /**
   * Override the default website ID
   */
  websiteId?: string;
  /**
   * Override the default script source
   */
  src?: string;
  /**
   * Loading strategy for the script
   */
  strategy?: 'beforeInteractive' | 'afterInteractive' | 'lazyOnload';
  /**
   * Callback when script loads successfully
   */
  onLoad?: () => void;
  /**
   * Callback when script fails to load
   */
  onError?: (error: Error) => void;
  /**
   * Whether to load only in production
   */
  productionOnly?: boolean;
}

export const UmamiScript: React.FC<UmamiScriptProps> = ({
  websiteId = UMAMI_CONFIG.websiteId,
  src = UMAMI_CONFIG.src,
  strategy = 'afterInteractive',
  onLoad,
  onError,
  productionOnly = false,
}) => {
  // Skip loading in development if productionOnly is true
  if (productionOnly && process.env.NODE_ENV === 'development') {
    return null;
  }

  // Skip loading if website ID is not provided
  if (!websiteId) {
    console.warn('[Umami] No website ID provided, skipping analytics');
    return null;
  }

  const handleLoad = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Umami] Analytics script loaded successfully');
    }
    onLoad?.();
  };

  const handleError = (error: Event | string) => {
    const errorObj =
      error instanceof Event ? new Error('Failed to load Umami script') : new Error(error);

    console.error('[Umami] Failed to load analytics script:', errorObj);
    onError?.(errorObj);
  };

  return (
    <Script
      src={src}
      data-website-id={websiteId}
      data-domains={UMAMI_CONFIG.domains?.join(',')}
      data-auto-track={UMAMI_CONFIG.autoTrack ? 'true' : 'false'}
      data-cache={UMAMI_CONFIG.dataCache ? 'true' : 'false'}
      {...(UMAMI_CONFIG.dataHostUrl && { 'data-host-url': UMAMI_CONFIG.dataHostUrl })}
      strategy={strategy}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
};
