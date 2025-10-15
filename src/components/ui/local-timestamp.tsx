'use client';

import { format, formatDistance } from 'date-fns';
import { logger } from '@/utils/logger';

interface LocalTimestampProps {
  /**
   * The date to format - can be Date object, ISO string, or other parseable date string
   */
  date: Date | string | null | undefined;

  /**
   * Format style to use
   * - 'datetime': Full date and time (default) - e.g., "Oct 13, 2025, 5:51 PM"
   * - 'date': Date only - e.g., "Oct 13, 2025"
   * - 'time': Time only - e.g., "5:51 PM"
   * - 'relative': Relative time - e.g., "2 hours ago"
   * - 'full': More detailed format - e.g., "October 13th, 2025 at 5:51:30 PM"
   */
  formatStyle?: 'datetime' | 'date' | 'time' | 'relative' | 'full';

  /**
   * Custom date-fns format string (overrides formatStyle)
   */
  customFormat?: string;

  /**
   * Additional CSS classes to apply
   */
  className?: string;

  /**
   * Fallback text when date is invalid or missing
   */
  fallback?: string;
}

/**
 * LocalTimestamp Component
 *
 * Displays timestamps in the user's local timezone by formatting dates on the client side.
 * This ensures timestamps always reflect the user's timezone, regardless of where the
 * server is located.
 *
 * @example
 * ```tsx
 * // Display full datetime
 * <LocalTimestamp date={order.createdAt} />
 *
 * // Display relative time
 * <LocalTimestamp date={order.createdAt} formatStyle="relative" />
 *
 * // Custom format
 * <LocalTimestamp date={order.createdAt} customFormat="PPpp" />
 * ```
 */
export function LocalTimestamp({
  date,
  formatStyle = 'datetime',
  customFormat,
  className,
  fallback = 'N/A',
}: LocalTimestampProps) {
  // Handle null/undefined dates
  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  try {
    // Parse the date
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Validate the date
    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      logger.warn('Invalid date passed to LocalTimestamp:', date);
      return <span className={className}>{fallback}</span>;
    }

    // Format the date based on style
    let formattedDate: string;

    if (customFormat) {
      // Use custom date-fns format string
      formattedDate = format(dateObj, customFormat);
    } else {
      switch (formatStyle) {
        case 'datetime':
          // e.g., "Oct 13, 2025, 5:51 PM"
          formattedDate = dateObj.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          break;

        case 'date':
          // e.g., "Oct 13, 2025"
          formattedDate = dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          break;

        case 'time':
          // e.g., "5:51 PM"
          formattedDate = dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
          break;

        case 'relative':
          // e.g., "2 hours ago"
          formattedDate = formatDistance(dateObj, new Date(), { addSuffix: true });
          break;

        case 'full':
          // e.g., "October 13th, 2025 at 5:51:30 PM PDT"
          formattedDate = dateObj.toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZoneName: 'short',
          });
          break;

        default:
          formattedDate = dateObj.toLocaleString('en-US');
      }
    }

    return <span className={className}>{formattedDate}</span>;
  } catch (error) {
    logger.error('Error formatting date in LocalTimestamp:', error);
    return <span className={className}>{fallback}</span>;
  }
}

/**
 * LocalTimestampWithRelative Component
 *
 * Displays a timestamp with relative time in parentheses.
 *
 * @example
 * ```tsx
 * <LocalTimestampWithRelative date={order.createdAt} />
 * // Output: "Oct 13, 2025, 5:51 PM (2 hours ago)"
 * ```
 */
export function LocalTimestampWithRelative({
  date,
  className,
  fallback = 'N/A',
}: Omit<LocalTimestampProps, 'formatStyle' | 'customFormat'>) {
  if (!date) {
    return <span className={className}>{fallback}</span>;
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return <span className={className}>{fallback}</span>;
    }

    const formatted = dateObj.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const relative = formatDistance(dateObj, new Date(), { addSuffix: true });

    return (
      <span className={className}>
        {formatted} <span className="text-gray-500">({relative})</span>
      </span>
    );
  } catch (error) {
    logger.error('Error formatting date in LocalTimestampWithRelative:', error);
    return <span className={className}>{fallback}</span>;
  }
}
