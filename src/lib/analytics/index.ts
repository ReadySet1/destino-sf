/**
 * Umami Analytics Integration Exports
 * 
 * This barrel file exports all Umami-related utilities, hooks, and components
 * for easy importing throughout the application.
 */

// Core Umami utilities and types
export {
  UMAMI_CONFIG,
  isUmamiLoaded,
  trackEvent,
  identifySession,
  UmamiTracking,
  type UmamiConfig,
  type UmamiEventData,
  type UmamiEventType,
} from './umami';

// React hooks for analytics
export {
  useUmamiPageTracking,
  useUmamiTracking,
  useUmamiFormTracking,
  useUmamiPerformanceTracking,
} from './hooks';

// React component for script loading
export { UmamiScript } from './UmamiScript';