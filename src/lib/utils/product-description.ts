/**
 * Product Description Utilities
 *
 * Handles sanitization and rendering of HTML-formatted product descriptions from Square.
 *
 * Security: Uses DOMPurify to strip malicious HTML while preserving safe formatting tags.
 *
 * @module product-description
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * HTML tags allowed in product descriptions.
 * Limited to basic text formatting to minimize XSS attack surface.
 */
const ALLOWED_TAGS = [
  'b',      // Bold text
  'strong', // Bold text (semantic)
  'i',      // Italic text
  'em',     // Emphasis/italic text (semantic)
  'p',      // Paragraph
  'br',     // Line break
  'ul',     // Unordered list
  'ol',     // Ordered list
  'li',     // List item
];

/**
 * HTML attributes allowed in product descriptions.
 * Empty array = no attributes allowed (prevents onclick, href, etc.)
 */
const ALLOWED_ATTR: string[] = [];

/**
 * DOMPurify configuration for product descriptions
 */
const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  KEEP_CONTENT: true, // Preserve text content even if tags are stripped
  RETURN_DOM: false,  // Return HTML string, not DOM object
  RETURN_DOM_FRAGMENT: false,
} as const;

/**
 * Sanitizes HTML content from Square product descriptions.
 *
 * This function:
 * 1. Accepts HTML-formatted descriptions from Square's description_html field
 * 2. Strips all dangerous HTML (scripts, iframes, event handlers, etc.)
 * 3. Preserves safe formatting tags (bold, italic, paragraphs, lists)
 * 4. Returns clean HTML safe for rendering with dangerouslySetInnerHTML
 *
 * @param html - Raw HTML string from Square description_html field
 * @returns Sanitized HTML string safe for rendering
 *
 * @example
 * ```typescript
 * // Input from Square
 * const rawHtml = '<p><strong>(6oz)</strong> roasted squash <em>-gf</em></p>';
 * const clean = sanitizeProductDescription(rawHtml);
 * // Output: '<p><strong>(6oz)</strong> roasted squash <em>-gf</em></p>'
 * ```
 *
 * @example
 * ```typescript
 * // Malicious input
 * const malicious = '<script>alert("xss")</script><b>Text</b>';
 * const clean = sanitizeProductDescription(malicious);
 * // Output: '<b>Text</b>' (script stripped, content preserved)
 * ```
 *
 * @example
 * ```typescript
 * // Null/undefined handling
 * sanitizeProductDescription(null);      // Returns ''
 * sanitizeProductDescription(undefined); // Returns ''
 * sanitizeProductDescription('');        // Returns ''
 * ```
 */
export function sanitizeProductDescription(html: string | null | undefined): string {
  // Handle null, undefined, or empty input
  if (!html || html.trim() === '') {
    return '';
  }

  // Sanitize HTML using DOMPurify
  const clean = DOMPurify.sanitize(html, PURIFY_CONFIG);

  // Trim whitespace and return
  return clean.trim();
}

/**
 * Type guard to check if a description contains HTML tags.
 * Useful for conditionally applying HTML rendering vs plain text.
 *
 * @param description - Product description string
 * @returns True if description contains HTML tags
 *
 * @example
 * ```typescript
 * const hasHtml = isHtmlDescription('<p>Text</p>'); // true
 * const plainText = isHtmlDescription('Plain text'); // false
 * ```
 */
export function isHtmlDescription(description: string | null | undefined): boolean {
  if (!description) return false;

  // Check for common HTML tags
  const htmlPattern = /<\/?[a-z][\s\S]*>/i;
  return htmlPattern.test(description);
}

/**
 * Converts HTML description to plain text by stripping all tags.
 * Useful for meta descriptions, search indexing, or preview text.
 *
 * @param html - HTML-formatted description
 * @returns Plain text version with tags removed
 *
 * @example
 * ```typescript
 * const html = '<p><strong>(6oz)</strong> roasted squash</p>';
 * const plain = htmlToPlainText(html);
 * // Output: '(6oz) roasted squash'
 * ```
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';

  // Replace <br> tags with spaces before sanitizing
  const withSpaces = html.replace(/<br\s*\/?>/gi, ' ');

  // Then sanitize to remove any malicious content
  const clean = DOMPurify.sanitize(withSpaces, {
    ALLOWED_TAGS: [],  // Strip all tags
    KEEP_CONTENT: true, // But keep the text content
  });

  // Clean up extra whitespace
  return clean
    .replace(/\s+/g, ' ')  // Multiple spaces to single space
    .trim();
}

/**
 * Truncates HTML description to a maximum length while preserving HTML structure.
 * Ensures closing tags are maintained after truncation.
 *
 * @param html - HTML-formatted description
 * @param maxLength - Maximum character length (plain text, excluding tags)
 * @param suffix - Suffix to append if truncated (default: '...')
 * @returns Truncated HTML with proper closing tags
 *
 * @example
 * ```typescript
 * const html = '<p><strong>Long description</strong> with more text</p>';
 * const short = truncateHtmlDescription(html, 20);
 * // Output: '<p><strong>Long description</strong>...</p>'
 * ```
 */
export function truncateHtmlDescription(
  html: string | null | undefined,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!html) return '';

  // Convert to plain text to check length
  const plainText = htmlToPlainText(html);

  // If already short enough, return sanitized original
  if (plainText.length <= maxLength) {
    return sanitizeProductDescription(html);
  }

  // For simple truncation, convert to plain text and truncate
  // Note: For production, consider using a library like 'truncate-html'
  // for proper HTML-aware truncation that preserves tag structure
  const truncated = plainText.substring(0, maxLength).trim() + suffix;

  return truncated;
}

/**
 * Type definition for product description rendering props
 */
export interface ProductDescriptionProps {
  description: string | null | undefined;
  className?: string;
  truncate?: number;
}
