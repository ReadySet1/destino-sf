/**
 * Enhanced logger utility for consistent logging throughout the application
 * In development: logs to console with appropriate styling
 * In production: logs to console in a format that can be easily parsed by log services
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// Helper to format complex objects/arrays
const formatValue = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';

  if (typeof value === 'object') {
    try {
      // Special handling for errors
      if (value instanceof Error) {
        return `${value.name}: ${value.message}\n${value.stack || ''}`;
      }

      // Handle circular references safely
      const seen = new WeakSet();
      const safeStringify = (obj: any, indent = 2): string => {
        return JSON.stringify(
          obj,
          (key, value) => {
            // Handle circular references
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) {
                return '[Circular]';
              }
              seen.add(value);
            }
            // Handle BigInt - convert to string
            if (typeof value === 'bigint') {
              return value.toString() + 'n';
            }
            return value;
          },
          indent
        );
      };

      return safeStringify(value);
    } catch (err) {
      return String(value);
    }
  }

  return String(value);
};

// Format arguments for logging
const formatArgs = (args: any[]): string => {
  return args.map(arg => formatValue(arg)).join(' ');
};

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    } else {
      console.log('[INFO]', formatArgs(args));
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    } else {
      console.log('[WARN]', formatArgs(args));
    }
  },
  error: (...args: any[]) => {
    // Always log errors regardless of environment
    if (isDevelopment) {
      console.error('[ERROR]', ...args);
    } else {
      // In production, format errors for better parsing by logging services
      console.error('[ERROR]', formatArgs(args));
    }
  },
};

export default logger;
