// src/utils/text-formatting.ts
// Utilities for text capitalization and formatting

import React from 'react';

/**
 * Capitalizes text while preserving dashes and special formatting
 * Handles cases like "beet-jicama" → "Beet-Jicama"
 * 
 * @param text - The text to capitalize
 * @param preserveAcronyms - Whether to preserve all-caps acronyms (default: true)
 * @returns Properly capitalized text
 */
export const capitalizeWithDashes = (
  text: string, 
  preserveAcronyms: boolean = true
): string => {
  if (!text || text.trim().length === 0) {
    return text;
  }

  // Common acronyms to preserve
  const acronyms = new Set(['GF', 'SF', 'USA', 'BBQ', 'RSVP']);

  return text
    .split(/(\s+|-|\/)/g) // Split on spaces, dashes, or slashes
    .map((segment, index, array) => {
      // Keep delimiters as-is
      if (segment === ' ' || segment === '-' || segment === '/') {
        return segment;
      }

      // Empty strings
      if (segment.length === 0) {
        return segment;
      }

      // Preserve known acronyms
      if (preserveAcronyms && acronyms.has(segment.toUpperCase())) {
        return segment.toUpperCase();
      }

      // Check if entire segment is uppercase (might be acronym)
      if (preserveAcronyms && segment === segment.toUpperCase() && segment.length <= 4) {
        return segment;
      }

      // Capitalize first letter, lowercase the rest
      return segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();
    })
    .join('');
};

/**
 * Formats product descriptions with bold/italic for specific keywords
 * Keywords like "GF", "Vegan", "Veggie" get bold formatting
 * 
 * @param description - The description text
 * @returns Description with markdown-style formatting
 */
export const formatDescriptionKeywords = (description: string): string => {
  if (!description) {
    return '';
  }

  // Keywords to bold
  const boldKeywords = [
    'GF',
    'Gluten-Free',
    'Vegan', 
    'Vegetarian',
    'Veggie',
    'Organic',
    'Halal',
    'Kosher',
    'Sugar-Free',
    'Dairy-Free',
  ];

  let formatted = description;

  // Apply bold formatting to keywords
  boldKeywords.forEach(keyword => {
    // Case-insensitive replacement with word boundaries
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
    formatted = formatted.replace(regex, '**$1**');
  });

  return formatted;
};

/**
 * Renders markdown-style formatted text to React components
 * Converts **bold** and *italic* markers to appropriate HTML
 * 
 * @param text - Text with markdown formatting
 * @returns JSX with formatted text
 */
export const renderFormattedText = (text: string): React.ReactNode => {
  if (!text) {
    return null;
  }

  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let keyCounter = 0;

  // Regex to match **bold** or *italic*
  const formatRegex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let match;

  while ((match = formatRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > currentIndex) {
      parts.push(text.substring(currentIndex, match.index));
    }

    // Add formatted text
    if (match[2]) {
      // Bold text (**text**)
      parts.push(
        React.createElement(
          'strong',
          { key: `bold-${keyCounter++}`, className: 'font-semibold' },
          match[2]
        )
      );
    } else if (match[3]) {
      // Italic text (*text*)
      parts.push(
        React.createElement(
          'em',
          { key: `italic-${keyCounter++}`, className: 'italic' },
          match[3]
        )
      );
    }

    currentIndex = formatRegex.lastIndex;
  }

  // Add remaining text
  if (currentIndex < text.length) {
    parts.push(text.substring(currentIndex));
  }

  return parts.length > 0 ? React.createElement(React.Fragment, null, ...parts) : text;
};

/**
 * Extracts formatting from Square API HTML descriptions
 * Some Square API responses may include HTML tags
 * 
 * @param htmlString - HTML string from Square API
 * @returns Plain text with markdown formatting
 */
export const extractSquareFormatting = (htmlString: string): string => {
  if (!htmlString) {
    return '';
  }

  let formatted = htmlString;

  // Convert HTML bold to markdown
  formatted = formatted.replace(/<(strong|b)>(.*?)<\/(strong|b)>/gi, '**$2**');
  
  // Convert HTML italic to markdown
  formatted = formatted.replace(/<(em|i)>(.*?)<\/(em|i)>/gi, '*$2*');
  
  // Remove other HTML tags
  formatted = formatted.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  formatted = formatted
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return formatted.trim();
};

/**
 * Auto-formats common food description patterns
 * Applies consistent formatting to descriptions
 * 
 * @param description - Raw description text
 * @returns Formatted description
 */
export const autoFormatFoodDescription = (description: string): string => {
  if (!description) {
    return '';
  }

  let formatted = description;

  // Format dietary restrictions at start of description
  formatted = formatted.replace(
    /^(GF|Vegan|Vegetarian|Veggie|Gluten-Free|Dairy-Free)(\s*[,:]?\s*)/i,
    '**$1**$2'
  );

  // Format lists with slashes (ingredient1 / ingredient2 / ingredient3)
  // Make each major ingredient sentence case
  const parts = formatted.split('/').map(part => {
    const trimmed = part.trim();
    if (trimmed.length === 0) return trimmed;
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  });
  
  if (parts.length > 1) {
    formatted = parts.join(' / ');
  }

  return formatted;
};

/**
 * Validates and normalizes product names
 * Ensures consistent formatting across the site
 * 
 * @param name - Product name
 * @returns Normalized product name
 */
export const normalizeProductName = (name: string): string => {
  if (!name) {
    return '';
  }

  // Apply capitalization with dash handling
  let normalized = capitalizeWithDashes(name);

  // Handle special cases
  const specialCases: Record<string, string> = {
    'empanada': 'Empanada',
    'alfajor': 'Alfajor',
    'alfajores': 'Alfajores',
    'dulce de leche': 'Dulce de Leche',
    'chimichurri': 'Chimichurri',
  };

  // Apply special case replacements (case-insensitive)
  Object.entries(specialCases).forEach(([search, replace]) => {
    const regex = new RegExp(`\\b${search}\\b`, 'gi');
    normalized = normalized.replace(regex, replace);
  });

  return normalized;
};

/**
 * Applies all formatting rules to a product description
 * Use this as the main entry point for description formatting
 * 
 * @param description - Raw description from database
 * @param options - Formatting options
 * @returns Fully formatted description
 */
export interface DescriptionFormatOptions {
  highlightKeywords?: boolean;
  autoFormat?: boolean;
  extractHtml?: boolean;
}

export const formatProductDescription = (
  description: string | null | undefined,
  options: DescriptionFormatOptions = {}
): string => {
  if (!description) {
    return '';
  }

  const {
    highlightKeywords = true,
    autoFormat = true,
    extractHtml = true,
  } = options;

  let formatted = description;

  // Step 1: Extract HTML formatting if present
  if (extractHtml) {
    formatted = extractSquareFormatting(formatted);
  }

  // Step 2: Auto-format common patterns
  if (autoFormat) {
    formatted = autoFormatFoodDescription(formatted);
  }

  // Step 3: Highlight dietary keywords
  if (highlightKeywords) {
    formatted = formatDescriptionKeywords(formatted);
  }

  return formatted;
};

/**
 * Type guard to check if text contains markdown formatting
 */
export const hasMarkdownFormatting = (text: string): boolean => {
  if (!text) return false;
  return /(\*\*.*?\*\*|\*.*?\*)/.test(text);
};

/**
 * Strips all markdown formatting from text
 * Useful for plain text contexts (emails, meta descriptions, etc.)
 */
export const stripMarkdownFormatting = (text: string): string => {
  if (!text) return '';
  return text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1');
};

// Example usage:
/*
import { 
  capitalizeWithDashes, 
  formatProductDescription,
  renderFormattedText 
} from '@/utils/text-formatting';

// In a component:
const formattedName = capitalizeWithDashes("beet-jicama salad");
// Result: "Beet-Jicama Salad"

const formattedDesc = formatProductDescription(
  "GF Shortbread / dulce de leche / lemon royal icing"
);
// Result: "**GF** Shortbread / Dulce De Leche / Lemon Royal Icing"

// In JSX:
<p>{renderFormattedText(formattedDesc)}</p>
// Renders with proper bold/italic HTML elements
*/

const textFormatting = {
  capitalizeWithDashes,
  formatDescriptionKeywords,
  renderFormattedText,
  extractSquareFormatting,
  autoFormatFoodDescription,
  normalizeProductName,
  formatProductDescription,
  hasMarkdownFormatting,
  stripMarkdownFormatting,
};

export default textFormatting;
