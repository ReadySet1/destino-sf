/**
 * Square Variation Grouper
 *
 * Detects and groups Square items that are size variations of the same product
 * (e.g., "Cheese & Charcuterie Platter - Small" and "Cheese & Charcuterie Platter - Large")
 */

export interface ProductVariation {
  id: string;
  name: string;
  size: string;
  price: number;
  imageUrl?: string;
  description?: string;
  servingSize?: string;
  squareVariantId?: string;
}

export interface GroupedProduct {
  baseName: string;
  baseImageUrl?: string;
  category: string;
  categoryId: string;
  variations: ProductVariation[];
  hasMultipleSizes: boolean;
}

export interface SquareItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  categoryId: string;
  categoryName: string;
  imageUrl?: string;
  servingSize?: string;
  variations?: Array<{
    id: string;
    name: string;
    price?: number;
  }>;
}

export class VariationGrouper {
  /**
   * Detect size pattern in product name and extract base name and size
   */
  static detectSizePattern(name: string): { baseName: string; size?: string } {
    // Common size patterns we see in Square
    const sizePatterns = [
      / - (Small|Large|Regular|Medium)$/i, // "Product - Small"
      / \((Small|Large|Regular|Medium)\)$/i, // "Product (Small)"
      /\s+(Small|Large|Regular|Medium)$/i, // "Product Small"
      /(Small|Large|Regular|Medium)\s*-\s*(.+)$/i, // "Small - Product"
    ];

    for (const pattern of sizePatterns) {
      const match = name.match(pattern);
      if (match) {
        const size = match[1];
        let baseName = name.replace(pattern, '').trim();

        // Clean up any trailing dashes or spaces
        baseName = baseName.replace(/\s*-\s*$/, '').trim();

        return {
          baseName,
          size: size.toLowerCase(),
        };
      }
    }

    // No size pattern found
    return { baseName: name.trim() };
  }

  /**
   * Normalize product name for comparison
   */
  static normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  /**
   * Group Square items by their base product, detecting size variations
   */
  static groupVariations(items: SquareItem[]): GroupedProduct[] {
    const groups = new Map<
      string,
      {
        baseName: string;
        category: string;
        categoryId: string;
        variations: ProductVariation[];
        images: Set<string>;
      }
    >();

    // First pass: group items by normalized base name
    items.forEach(item => {
      const { baseName, size } = this.detectSizePattern(item.name);
      const normalizedBaseName = this.normalizeProductName(baseName);

      if (!groups.has(normalizedBaseName)) {
        groups.set(normalizedBaseName, {
          baseName: baseName, // Use the original case version
          category: item.categoryName,
          categoryId: item.categoryId,
          variations: [],
          images: new Set(),
        });
      }

      const group = groups.get(normalizedBaseName)!;

      // Add this item as a variation
      group.variations.push({
        id: item.id,
        name: item.name,
        size: size || 'regular',
        price: item.price,
        imageUrl: item.imageUrl,
        description: item.description,
        servingSize: item.servingSize,
        squareVariantId: item.id,
      });

      // Track images for selecting best base image
      if (item.imageUrl) {
        group.images.add(item.imageUrl);
      }
    });

    // Second pass: convert to GroupedProduct format
    return Array.from(groups.entries()).map(([normalizedName, group]) => {
      // Sort variations by size (Small -> Regular -> Large)
      const sizeOrder = { small: 1, regular: 2, medium: 2, large: 3 };
      const sortedVariations = group.variations.sort((a, b) => {
        const orderA = sizeOrder[a.size as keyof typeof sizeOrder] || 2;
        const orderB = sizeOrder[b.size as keyof typeof sizeOrder] || 2;
        return orderA - orderB;
      });

      // Select best image (prefer one with highest resolution or from largest size)
      let baseImageUrl: string | undefined;
      if (group.images.size > 0) {
        // Prefer image from Large size, then Regular, then any
        const largeVariation = sortedVariations.find(v => v.size === 'large');
        const regularVariation = sortedVariations.find(v => v.size === 'regular');

        baseImageUrl =
          largeVariation?.imageUrl ||
          regularVariation?.imageUrl ||
          sortedVariations.find(v => v.imageUrl)?.imageUrl;
      }

      return {
        baseName: group.baseName,
        baseImageUrl,
        category: group.category,
        categoryId: group.categoryId,
        variations: sortedVariations,
        hasMultipleSizes: sortedVariations.length > 1,
      };
    });
  }

  /**
   * Check if two items are likely size variations of the same product
   */
  static areVariationsOfSameProduct(item1: SquareItem, item2: SquareItem): boolean {
    const pattern1 = this.detectSizePattern(item1.name);
    const pattern2 = this.detectSizePattern(item2.name);

    // Must have the same base name
    const normalized1 = this.normalizeProductName(pattern1.baseName);
    const normalized2 = this.normalizeProductName(pattern2.baseName);

    if (normalized1 !== normalized2) {
      return false;
    }

    // Must be in the same category
    if (item1.categoryId !== item2.categoryId) {
      return false;
    }

    // At least one should have a size variation pattern
    return !!(pattern1.size || pattern2.size);
  }

  /**
   * Get size display name for UI
   */
  static getSizeDisplayName(size: string): string {
    const sizeMap: Record<string, string> = {
      small: 'Small',
      regular: 'Regular',
      medium: 'Medium',
      large: 'Large',
    };

    return sizeMap[size.toLowerCase()] || size;
  }

  /**
   * Generate a product variant name
   */
  static generateVariantName(baseName: string, size: string, price: number): string {
    const displaySize = this.getSizeDisplayName(size);
    return `${baseName} - ${displaySize} ($${price.toFixed(2)})`;
  }

  /**
   * Find potential duplicates that should be merged into variations
   * Useful for cleanup scripts
   */
  static findDuplicateCandidates(items: SquareItem[]): Array<{
    baseName: string;
    duplicates: SquareItem[];
    shouldMerge: boolean;
  }> {
    const grouped = this.groupVariations(items);

    return grouped
      .filter(group => group.hasMultipleSizes)
      .map(group => ({
        baseName: group.baseName,
        duplicates: items.filter(item => group.variations.some(v => v.id === item.id)),
        shouldMerge: true,
      }));
  }
}

export default VariationGrouper;
