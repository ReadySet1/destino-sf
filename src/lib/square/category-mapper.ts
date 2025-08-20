/**
 * Square Category Mapper
 * 
 * Phase 2 of the fix plan: Fix Category Mapping
 * This module provides unified category mapping between Square and local database.
 */

import { logger } from '@/utils/logger';

/**
 * Category mappings from Square IDs to local category names
 * These mappings are based on the current enhanced-sync implementation
 */
export const CATEGORY_MAPPINGS = {
  // Square ID -> Local category name (normalized)
  'UF2WY4B4635ZDAH4TCJVDQAN': 'CATERING-APPETIZERS',
  'UOWY2ZPV24Q6K6BBD5CZRM4B': 'CATERING-BUFFET-STARTERS',
  'HKLMA3HI34UUW6OCDMEKE224': 'CATERING-BUFFET-ENTREES',
  'ZOWZ26OBOK3KUCT4ZBE6AV26': 'CATERING-BUFFET-SIDES',
  '4YZ7LW7PRJRDICUM76U3FTGU': 'CATERING-SHARE-PLATTERS',
  '5ZH6ON3LTLXC2775JLBI3T3V': 'CATERING-DESSERTS',
  'B527RVCSLNZ5XR3OZR76VNIH': 'CATERING-LUNCH-STARTERS',
  'K2O3B7JUWT7QD7HGQ5AL2R2N': 'CATERING-LUNCH-ENTREES',
  'HVWMJHLJ4Q2GHHT3COZLDYNP': 'CATERING-BOXED-LUNCH-ENTREES', // New category for Build Your Own Box
  '7F45BAY6KVJOBF4YXYBSL4JH': 'CATERING-LUNCH-SIDES',
  // Add missing Square IDs
  'C6GLNU7ZTUEKFZSMMOUISX7B': 'ALFAJORES',
  'CBCQ73NCXQKUAFWGP2KQFOJN': 'EMPANADAS',
  'SDGSB4F4YOUFY3UFJF2KWXUB': 'EMPANADAS', // Alternative Square ID for EMPANADAS
  'UMIXXK727MROE7CKS6OVTWZE': 'SAUCES',
} as const;

/**
 * Complete category mappings for comprehensive sync
 * Includes all main product categories: CATERING + CORE PRODUCTS
 */
export const LEGACY_CATEGORY_MAPPINGS = {
  // CATERING categories
  'UF2WY4B4635ZDAH4TCJVDQAN': 'CATERING- APPETIZERS',
  'UOWY2ZPV24Q6K6BBD5CZRM4B': 'CATERING- BUFFET, STARTERS',
  'HKLMA3HI34UUW6OCDMEKE224': 'CATERING- BUFFET, ENTREES',
  'ZOWZ26OBOK3KUCT4ZBE6AV26': 'CATERING- BUFFET, SIDES',
  '4YZ7LW7PRJRDICUM76U3FTGU': 'CATERING- SHARE PLATTERS',
  '5ZH6ON3LTLXC2775JLBI3T3V': 'CATERING- DESSERTS',
  'B527RVCSLNZ5XR3OZR76VNIH': 'CATERING- LUNCH, STARTERS',
  'K2O3B7JUWT7QD7HGQ5AL2R2N': 'CATERING- LUNCH, ENTREES',
  'JMUA2KUSHYLXVDAIBTW23JJ4': 'CATERING- BOXED LUNCHES',
  'HVWMJHLJ4Q2GHHT3COZLDYNP': 'CATERING- BOXED LUNCH ENTREES', // Actual Square ID found via MCP
  '7F45BAY6KVJOBF4YXYBSL4JH': 'CATERING- LUNCH, SIDES',
  // CORE PRODUCT categories - FIXED SQUARE IDS
  'C6GLNU7ZTUEKFZSMMOUISX7B': 'ALFAJORES',
  'CBCQ73NCXQKUAFWGP2KQFOJN': 'EMPANADAS', // Fixed Square ID
  'SDGSB4F4YOUFY3UFJF2KWXUB': 'EMPANADAS', // Alternative Square ID for EMPANADAS
  'UMIXXK727MROE7CKS6OVTWZE': 'SAUCES',
  'CISOGPONZYWZNS4QIZILKRRN': 'EMPANADAS- OTHER',
} as const;

export type SquareCategoryId = keyof typeof CATEGORY_MAPPINGS;
export type LocalCategoryName = typeof CATEGORY_MAPPINGS[SquareCategoryId];

/**
 * CategoryMapper class provides methods for mapping between Square and local categories
 */
export class CategoryMapper {
  /**
   * Normalize a category name for consistent comparison
   * Removes spaces around hyphens, replaces commas with hyphens, converts to uppercase
   */
  static normalizeCategory(name: string): string {
    return name
      .toUpperCase()
      .replace(/\s*-\s*/g, '-')      // Remove spaces around hyphens: "CATERING- APPETIZERS" -> "CATERING-APPETIZERS"
      .replace(/,\s*/g, '-')         // Replace commas with hyphens: "BUFFET, STARTERS" -> "BUFFET-STARTERS"
      .replace(/\s+/g, '-')          // Replace remaining spaces with hyphens: "SHARE PLATTERS" -> "SHARE-PLATTERS"
      .trim();
  }

  /**
   * Get the normalized local category name from a Square category ID
   */
  static getLocalCategory(squareId: string): string | null {
    const normalizedMapping = CATEGORY_MAPPINGS[squareId as SquareCategoryId];
    if (normalizedMapping) {
      return normalizedMapping;
    }

    logger.warn(`No mapping found for Square category ID: ${squareId}`);
    return null;
  }

  /**
   * Get the legacy local category name from a Square category ID
   * This is used for backward compatibility with existing data
   */
  static getLegacyLocalCategory(squareId: string): string | null {
    const legacyMapping = LEGACY_CATEGORY_MAPPINGS[squareId as SquareCategoryId];
    if (legacyMapping) {
      return legacyMapping;
    }

    logger.warn(`No legacy mapping found for Square category ID: ${squareId}`);
    return null;
  }

  /**
   * Find Square category ID by local category name
   * Handles both normalized and legacy formats
   */
  static findSquareIdByLocalName(localName: string): string | null {
    const normalized = this.normalizeCategory(localName);

    // First try to find in normalized mappings
    for (const [squareId, categoryName] of Object.entries(CATEGORY_MAPPINGS)) {
      if (categoryName === normalized) {
        return squareId;
      }
    }

    // Try to find in legacy mappings
    for (const [squareId, categoryName] of Object.entries(LEGACY_CATEGORY_MAPPINGS)) {
      if (this.normalizeCategory(categoryName) === normalized) {
        return squareId;
      }
    }

    logger.warn(`No Square ID found for local category: ${localName}`);
    return null;
  }

  /**
   * Check if a category name is a catering category
   */
  static isCateringCategory(categoryName: string): boolean {
    const normalized = this.normalizeCategory(categoryName);
    return normalized === 'CATERING' || normalized.startsWith('CATERING-');
  }

  /**
   * Get all Square category IDs
   */
  static getAllSquareIds(): string[] {
    return Object.keys(CATEGORY_MAPPINGS);
  }

  /**
   * Get all local category names (normalized format)
   */
  static getAllLocalNames(): string[] {
    return Object.values(CATEGORY_MAPPINGS);
  }

  /**
   * Get all legacy local category names
   */
  static getAllLegacyNames(): string[] {
    return Object.values(LEGACY_CATEGORY_MAPPINGS);
  }

  /**
   * Get mapping as array of objects for easier iteration
   */
  static getMappingsArray(): Array<{
    squareId: string;
    normalizedName: string;
    legacyName: string;
  }> {
    return Object.entries(CATEGORY_MAPPINGS).map(([squareId, normalizedName]) => ({
      squareId,
      normalizedName,
      legacyName: LEGACY_CATEGORY_MAPPINGS[squareId as SquareCategoryId]
    }));
  }

  /**
   * Validate if a Square category ID is known
   */
  static isValidSquareId(squareId: string): boolean {
    return squareId in CATEGORY_MAPPINGS;
  }

  /**
   * Convert legacy category name to normalized format
   */
  static legacyToNormalized(legacyName: string): string | null {
    for (const [squareId, legacy] of Object.entries(LEGACY_CATEGORY_MAPPINGS)) {
      if (legacy === legacyName) {
        return CATEGORY_MAPPINGS[squareId as SquareCategoryId];
      }
    }

    // If not found in mappings, try normalizing directly
    const normalized = this.normalizeCategory(legacyName);
    if (Object.values(CATEGORY_MAPPINGS).includes(normalized as LocalCategoryName)) {
      return normalized;
    }

    return null;
  }

  /**
   * Convert normalized category name to legacy format
   */
  static normalizedToLegacy(normalizedName: string): string | null {
    for (const [squareId, normalized] of Object.entries(CATEGORY_MAPPINGS)) {
      if (normalized === normalizedName) {
        return LEGACY_CATEGORY_MAPPINGS[squareId as SquareCategoryId];
      }
    }

    return null;
  }

  /**
   * Get category display name for UI
   * Returns a human-readable format
   */
  static getDisplayName(categoryName: string): string {
    const normalized = this.normalizeCategory(categoryName);
    
    // Convert to title case and replace hyphens with spaces
    return normalized
      .split('-')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Validate and suggest correct category name
   */
  static validateCategoryName(categoryName: string): {
    isValid: boolean;
    normalized?: string;
    suggestions?: string[];
  } {
    const normalized = this.normalizeCategory(categoryName);
    
    // Check if it's a valid normalized name
    if (Object.values(CATEGORY_MAPPINGS).includes(normalized as LocalCategoryName)) {
      return { isValid: true, normalized };
    }

    // Check if it's a valid legacy name
    if (Object.values(LEGACY_CATEGORY_MAPPINGS).includes(categoryName as any)) {
      const normalizedEquivalent = this.legacyToNormalized(categoryName);
      return { 
        isValid: true, 
        normalized: normalizedEquivalent || undefined 
      };
    }

    // Generate suggestions based on partial matches
    const suggestions: string[] = [];
    const allNames = [...Object.values(CATEGORY_MAPPINGS), ...Object.values(LEGACY_CATEGORY_MAPPINGS)];
    
    for (const name of allNames) {
      if (name.toLowerCase().includes(categoryName.toLowerCase()) || 
          this.normalizeCategory(name).includes(normalized)) {
        suggestions.push(name);
      }
    }

    return { 
      isValid: false, 
      suggestions: suggestions.slice(0, 5) // Limit to 5 suggestions
    };
  }

  /**
   * Find the most appropriate category for an item name
   * Uses heuristics to suggest category based on item name
   */
  static suggestCategoryFromItemName(itemName: string): string | null {
    const lowerName = itemName.toLowerCase();

    // Define keywords for each category
    const categoryKeywords = {
      'CATERING-APPETIZERS': ['appetizer', 'starter', 'dip', 'bruschetta', 'crostini'],
      'CATERING-DESSERTS': ['dessert', 'cake', 'sweet', 'cookie', 'tart', 'pie'],
      'CATERING-BUFFET-ENTREES': ['entree', 'main', 'chicken', 'beef', 'fish', 'pasta'],
      'CATERING-BUFFET-SIDES': ['side', 'vegetable', 'rice', 'potato', 'salad'],
      'CATERING-BUFFET-STARTERS': ['starter', 'soup', 'breadstick'],
      'CATERING-LUNCH-ENTREES': ['lunch', 'sandwich', 'wrap', 'panini'],
      'CATERING-LUNCH-STARTERS': ['lunch starter', 'lunch soup'],
      'CATERING-LUNCH-SIDES': ['lunch side', 'chips', 'fries'],
      'CATERING-SHARE-PLATTERS': ['platter', 'tray', 'selection', 'assortment']
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          return category;
        }
      }
    }

    return null;
  }

  /**
   * Generate a comprehensive mapping report
   */
  static generateMappingReport(): {
    totalMappings: number;
    mappings: Array<{
      squareId: string;
      normalizedName: string;
      legacyName: string;
      displayName: string;
    }>;
    statistics: {
      appetizers: number;
      entrees: number;
      sides: number;
      desserts: number;
      starters: number;
      platters: number;
    };
  } {
    const mappings = this.getMappingsArray().map(mapping => ({
      ...mapping,
      displayName: this.getDisplayName(mapping.normalizedName)
    }));

    const statistics = {
      appetizers: mappings.filter(m => m.normalizedName.includes('APPETIZER')).length,
      entrees: mappings.filter(m => m.normalizedName.includes('ENTREE')).length,
      sides: mappings.filter(m => m.normalizedName.includes('SIDE')).length,
      desserts: mappings.filter(m => m.normalizedName.includes('DESSERT')).length,
      starters: mappings.filter(m => m.normalizedName.includes('STARTER')).length,
      platters: mappings.filter(m => m.normalizedName.includes('PLATTER')).length,
    };

    return {
      totalMappings: mappings.length,
      mappings,
      statistics
    };
  }
}

/**
 * Default export for convenience
 */
export default CategoryMapper;
