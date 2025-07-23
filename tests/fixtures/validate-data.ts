import { testProducts, testCustomer, testAdmin, cateringTestData } from '../e2e/fixtures/test-data';

/**
 * Test Data Validation Utility
 * Ensures test data integrity and consistency across the test suite
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TestDataValidator {
  static validateAll(): ValidationResult {
    const results = [
      this.validateProducts(),
      this.validateCustomers(),
      this.validateCateringData(),
    ];

    return {
      isValid: results.every(r => r.isValid),
      errors: results.flatMap(r => r.errors),
      warnings: results.flatMap(r => r.warnings),
    };
  }

  static validateProducts(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    Object.entries(testProducts).forEach(([key, product]) => {
      // Required fields
      if (!product.slug) errors.push(`Product ${key}: Missing slug`);
      if (!product.name) errors.push(`Product ${key}: Missing name`);
      if (typeof product.price !== 'number' || product.price <= 0) {
        errors.push(`Product ${key}: Invalid price`);
      }

      // URL-safe slug validation
      if (product.slug && !/^[a-z0-9-]+$/.test(product.slug)) {
        warnings.push(`Product ${key}: Slug contains invalid characters`);
      }

      // Price reasonableness
      if (product.price && (product.price < 1 || product.price > 100)) {
        warnings.push(`Product ${key}: Price seems unreasonable: $${product.price}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateCustomers(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const customers = { testCustomer, testAdmin };

    Object.entries(customers).forEach(([key, customer]) => {
      // Email validation
      if (!customer.email || !this.isValidEmail(customer.email)) {
        errors.push(`Customer ${key}: Invalid email`);
      }

      // Phone validation
      if (!customer.phone || !this.isValidPhone(customer.phone)) {
        errors.push(`Customer ${key}: Invalid phone`);
      }

      // Name validation
      if (!customer.firstName || !customer.lastName) {
        errors.push(`Customer ${key}: Missing name`);
      }

      // Password strength (for test data)
      if (!customer.password || customer.password.length < 8) {
        warnings.push(`Customer ${key}: Weak password for testing`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static validateCateringData(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Event validation
    if (!cateringTestData.event.name) {
      errors.push('Catering event: Missing name');
    }

    if (!cateringTestData.event.date || !this.isValidDate(cateringTestData.event.date)) {
      errors.push('Catering event: Invalid date');
    }

    if (!cateringTestData.event.guestCount || cateringTestData.event.guestCount <= 0) {
      errors.push('Catering event: Invalid guest count');
    }

    // Contact validation
    if (!cateringTestData.contact.email || !this.isValidEmail(cateringTestData.contact.email)) {
      errors.push('Catering contact: Invalid email');
    }

    if (!cateringTestData.contact.phone || !this.isValidPhone(cateringTestData.contact.phone)) {
      errors.push('Catering contact: Invalid phone');
    }

    // Date should be in the future for realistic testing
    const eventDate = new Date(cateringTestData.event.date);
    const now = new Date();
    if (eventDate <= now) {
      warnings.push('Catering event: Date is in the past');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    // Basic US phone number validation
    const phoneRegex = /^\(\d{3}\)\s\d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  }

  private static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  static checkDataConsistency(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for duplicate emails
    const testEmails = [testCustomer.email, testAdmin.email, cateringTestData.contact.email];
    const uniqueEmails = new Set(testEmails);

    if (testEmails.length !== uniqueEmails.size) {
      warnings.push('Duplicate email addresses in test data');
    }

    // Check for realistic data relationships
    if (testCustomer.email === testAdmin.email) {
      warnings.push('Test customer and admin have the same email');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  static generateReport(): string {
    const validation = this.validateAll();
    const consistency = this.checkDataConsistency();

    let report = '# Test Data Validation Report\n\n';

    if (validation.isValid && consistency.isValid) {
      report += '✅ **All test data is valid!**\n\n';
    } else {
      report += '❌ **Issues found in test data**\n\n';
    }

    if (validation.errors.length > 0 || consistency.errors.length > 0) {
      report += '## Errors (Must Fix)\n';
      [...validation.errors, ...consistency.errors].forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    if (validation.warnings.length > 0 || consistency.warnings.length > 0) {
      report += '## Warnings (Consider Fixing)\n';
      [...validation.warnings, ...consistency.warnings].forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    report += '## Test Data Summary\n';
    report += `- Products: ${Object.keys(testProducts).length}\n`;
    report += `- Test Customers: 2\n`;
    report += `- Catering Scenarios: 1\n\n`;

    report += `Generated: ${new Date().toISOString()}\n`;

    return report;
  }
}

// Main execution when run directly
if (require.main === module) {
  const validation = TestDataValidator.validateAll();
  const consistency = TestDataValidator.checkDataConsistency();

  console.log(TestDataValidator.generateReport());

  if (!validation.isValid || !consistency.isValid) {
    process.exit(1);
  }
}
