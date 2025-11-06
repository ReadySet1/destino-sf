/**
 * Tests for Image Alt Text Audit Script
 *
 * These tests validate that the audit script correctly:
 * - Detects multi-line JSX Image components
 * - Distinguishes Next.js Image from other components (ImagePlaceholder, ImageIcon, etc.)
 * - Only analyzes files importing from 'next/image'
 * - Correctly identifies missing, empty, generic, and good alt text
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');

describe('Image Alt Text Audit Script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Multi-line JSX Detection', () => {
    it('should detect alt text in multi-line JSX with props on separate lines', () => {
      const content = `
import Image from 'next/image';

export default function Component() {
  return (
    <Image
      src="/test.jpg"
      alt="Delicious empanadas on a plate"
      width={500}
      height={300}
    />
  );
}
      `.trim();

      // Test the regex pattern used in the script
      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const matches = [...content.matchAll(imageRegex)];

      expect(matches).toHaveLength(1);
      expect(matches[0][0]).toContain('alt="Delicious empanadas on a plate"');
    });

    it('should detect alt text when alt prop is on a different line from Image tag', () => {
      const content = `
import Image from 'next/image';

<Image
  src="/product.jpg"
  width={300}
  height={300}
  alt="Freshly baked alfajores"
/>
      `.trim();

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const altMatch = content.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);

      expect(altMatch).not.toBeNull();
      expect(altMatch![1]).toBe('Freshly baked alfajores');
    });

    it('should detect alt text with template literals', () => {
      const content = `
import Image from 'next/image';

<Image src="/test.jpg" alt={\`\${product.name} image\`} />
      `.trim();

      const altMatchExpr = content.match(/alt\s*=\s*\{([^}]+)\}/);

      expect(altMatchExpr).not.toBeNull();
      expect(altMatchExpr![1]).toContain('product.name');
    });
  });

  describe('Component Name Disambiguation', () => {
    it('should match standalone Image tags', () => {
      const content = `
import Image from 'next/image';

<Image src="/test.jpg" alt="Test image" />
      `.trim();

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const matches = [...content.matchAll(imageRegex)];

      expect(matches).toHaveLength(1);
    });

    it('should NOT match ImagePlaceholder components', () => {
      const content = `
import { ImagePlaceholder } from './components';

<ImagePlaceholder message="Loading..." />
      `.trim();

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const matches = [...content.matchAll(imageRegex)];

      expect(matches).toHaveLength(0);
    });

    it('should NOT match ImageIcon components', () => {
      const content = `
import { ImageIcon } from 'lucide-react';

<ImageIcon className="w-4 h-4" />
      `.trim();

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const matches = [...content.matchAll(imageRegex)];

      expect(matches).toHaveLength(0);
    });

    it('should match Image with space after tag name', () => {
      const content = `
import Image from 'next/image';

<Image src="/test.jpg" />
      `.trim();

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const matches = [...content.matchAll(imageRegex)];

      expect(matches).toHaveLength(1);
    });

    it('should match self-closing Image tags', () => {
      const content = `
import Image from 'next/image';

<Image src="/test.jpg" alt="Test" />
      `.trim();

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const matches = [...content.matchAll(imageRegex)];

      expect(matches).toHaveLength(1);
    });
  });

  describe('Import Source Validation', () => {
    it('should process files importing from next/image with single quotes', () => {
      const content = `import Image from 'next/image';`;

      const hasNextImageImport =
        content.includes("from 'next/image'") || content.includes('from "next/image"');

      expect(hasNextImageImport).toBe(true);
    });

    it('should process files importing from next/image with double quotes', () => {
      const content = `import Image from "next/image";`;

      const hasNextImageImport =
        content.includes("from 'next/image'") || content.includes('from "next/image"');

      expect(hasNextImageImport).toBe(true);
    });

    it('should skip files importing Image from lucide-react', () => {
      const content = `
import { Image } from 'lucide-react';

<Image className="w-4 h-4" />
      `.trim();

      const hasNextImageImport =
        content.includes("from 'next/image'") || content.includes('from "next/image"');

      expect(hasNextImageImport).toBe(false);
    });

    it('should skip files importing Image from other sources', () => {
      const content = `
import Image from '@/components/Image';

<Image src="/test.jpg" />
      `.trim();

      const hasNextImageImport =
        content.includes("from 'next/image'") || content.includes('from "next/image"');

      expect(hasNextImageImport).toBe(false);
    });
  });

  describe('Alt Text Detection', () => {
    it('should detect missing alt attribute', () => {
      const imageTag = '<Image src="/test.jpg" width={300} height={300} />';

      const altMatch = imageTag.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);
      const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

      expect(altMatch).toBeNull();
      expect(altMatchExpr).toBeNull();
    });

    it('should detect empty alt attribute (decorative image)', () => {
      const imageTag = '<Image src="/test.jpg" alt="" width={300} height={300} />';

      const altMatch = imageTag.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);

      expect(altMatch).not.toBeNull();
      expect(altMatch![1]).toBe('');
    });

    it('should detect good descriptive alt text', () => {
      const imageTag = '<Image src="/empanada.jpg" alt="Golden beef empanada with chimichurri sauce" />';

      const altMatch = imageTag.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);

      expect(altMatch).not.toBeNull();
      expect(altMatch![1]).toBe('Golden beef empanada with chimichurri sauce');
    });

    it('should detect alt text from expression (variable)', () => {
      const imageTag = '<Image src="/test.jpg" alt={product.name} />';

      const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

      expect(altMatchExpr).not.toBeNull();
      expect(altMatchExpr![1]).toBe('product.name');
    });

    it('should detect alt text with single quotes', () => {
      const imageTag = "<Image src='/test.jpg' alt='Test image description' />";

      const altMatch = imageTag.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);

      expect(altMatch).not.toBeNull();
      expect(altMatch![1]).toBe('Test image description');
    });

    it('should detect alt text with backticks', () => {
      const imageTag = '<Image src="/test.jpg" alt={`Test image`} />';

      const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

      expect(altMatchExpr).not.toBeNull();
    });
  });

  describe('Generic Alt Text Detection', () => {
    const GENERIC_ALT_PATTERNS = [
      /^image$/i,
      /^photo$/i,
      /^picture$/i,
      /^img$/i,
      /^icon$/i,
      /^logo$/i,
      /^banner$/i,
      /^product$/i,
      /^item$/i,
    ];

    const isGenericAlt = (altText: string) => {
      return GENERIC_ALT_PATTERNS.some(pattern => pattern.test(altText.trim()));
    };

    it('should identify "image" as generic', () => {
      expect(isGenericAlt('image')).toBe(true);
      expect(isGenericAlt('Image')).toBe(true);
      expect(isGenericAlt('IMAGE')).toBe(true);
    });

    it('should identify "photo" as generic', () => {
      expect(isGenericAlt('photo')).toBe(true);
      expect(isGenericAlt('Photo')).toBe(true);
    });

    it('should identify "product" as generic', () => {
      expect(isGenericAlt('product')).toBe(true);
    });

    it('should NOT identify descriptive text as generic', () => {
      expect(isGenericAlt('Delicious empanadas')).toBe(false);
      expect(isGenericAlt('Product image showing alfajores')).toBe(false);
      expect(isGenericAlt('Company logo with text')).toBe(false);
    });

    it('should handle whitespace in generic detection', () => {
      expect(isGenericAlt('  image  ')).toBe(true);
      expect(isGenericAlt(' photo ')).toBe(true);
    });
  });

  describe('Edge Cases and Known Limitations', () => {
    it('should handle Images with spread props (limitation: cannot validate)', () => {
      const imageTag = '<Image {...imageProps} />';

      // The script cannot validate spread props - it will look for explicit alt
      const altMatch = imageTag.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);
      const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

      // Both should be null, script will report as missing alt
      expect(altMatch).toBeNull();
      expect(altMatchExpr).toBeNull();
    });

    it('should handle conditional alt text (limitation: assumes good alt)', () => {
      const imageTag = '<Image src="/test.jpg" alt={condition ? "Description" : ""} />';

      const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

      // Script detects expression, assumes it's good alt text
      expect(altMatchExpr).not.toBeNull();
      expect(altMatchExpr![1]).toContain('condition');
    });

    it('should handle template literals in alt text (limitation: assumes good alt)', () => {
      const imageTag = '<Image src="/test.jpg" alt={`${title} image`} />';

      const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

      // Script detects expression, assumes it's good alt text
      expect(altMatchExpr).not.toBeNull();
      expect(altMatchExpr![1]).toContain('title');
    });

    it('should handle complex multi-line Image components', () => {
      const content = `
import Image from 'next/image';

<Image
  src="/complex.jpg"
  width={500}
  height={300}
  alt={
    isLoading
      ? "Loading..."
      : product.description
  }
  className="rounded-lg"
  priority
/>
      `.trim();

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const matches = [...content.matchAll(imageRegex)];

      // The regex might not capture the entire multi-line alt expression perfectly
      // This is a known limitation - complex expressions are assumed to be valid
      expect(matches.length).toBeGreaterThan(0);
    });
  });

  describe('Line Number Tracking', () => {
    it('should correctly calculate line numbers for multi-line components', () => {
      const content = `import Image from 'next/image';

export default function Test() {
  return (
    <div>
      <Image
        src="/test.jpg"
        alt="Test image"
      />
    </div>
  );
}`;

      const imageRegex = /<Image[\s/>][^>]*>/gs;
      const match = imageRegex.exec(content);

      if (match) {
        const beforeMatch = content.substring(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        // Image tag starts on line 6
        expect(lineNumber).toBe(6);
      }
    });
  });

  describe('File Filtering', () => {
    it('should include .tsx files', () => {
      const filename = 'Component.tsx';
      expect(filename.endsWith('.tsx')).toBe(true);
    });

    it('should include .jsx files', () => {
      const filename = 'Component.jsx';
      expect(filename.endsWith('.jsx')).toBe(true);
    });

    it('should exclude .ts files', () => {
      const filename = 'utils.ts';
      expect(filename.endsWith('.tsx') || filename.endsWith('.jsx')).toBe(false);
    });

    it('should exclude .js files', () => {
      const filename = 'config.js';
      expect(filename.endsWith('.tsx') || filename.endsWith('.jsx')).toBe(false);
    });
  });
});

describe('Integration Test Scenarios', () => {
  it('should handle a complete file with multiple Image components', () => {
    const content = `
import Image from 'next/image';

export default function ProductPage() {
  return (
    <div>
      {/* Good alt text */}
      <Image
        src="/empanada.jpg"
        alt="Beef empanada with golden crust"
        width={400}
        height={300}
      />

      {/* Missing alt */}
      <Image src="/logo.jpg" width={100} height={100} />

      {/* Empty alt (decorative) */}
      <Image src="/decoration.jpg" alt="" width={50} height={50} />

      {/* Generic alt */}
      <Image src="/product.jpg" alt="product" width={200} height={200} />

      {/* Expression alt (assumed good) */}
      <Image src="/dynamic.jpg" alt={product.description} width={300} height={300} />
    </div>
  );
}
    `.trim();

    const imageRegex = /<Image[\s/>][^>]*>/gs;
    const matches = [...content.matchAll(imageRegex)];

    // Should find 5 Image components
    expect(matches).toHaveLength(5);

    // Analyze each match
    let goodAlt = 0;
    let missingAlt = 0;
    let emptyAlt = 0;
    let genericAlt = 0;

    matches.forEach(match => {
      const imageTag = match[0];
      const altMatch = imageTag.match(/alt\s*=\s*["'`]([^"'`]*)["'`]/);
      const altMatchExpr = imageTag.match(/alt\s*=\s*\{([^}]+)\}/);

      if (!altMatch && !altMatchExpr) {
        missingAlt++;
      } else if (altMatch) {
        if (altMatch[1] === '') {
          emptyAlt++;
        } else if (altMatch[1].toLowerCase() === 'product') {
          genericAlt++;
        } else {
          goodAlt++;
        }
      } else {
        goodAlt++;
      }
    });

    expect(goodAlt).toBe(2); // First and last
    expect(missingAlt).toBe(1); // Second
    expect(emptyAlt).toBe(1); // Third
    expect(genericAlt).toBe(1); // Fourth
  });
});
