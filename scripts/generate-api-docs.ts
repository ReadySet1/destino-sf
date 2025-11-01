/**
 * Generate OpenAPI Documentation
 *
 * Generates OpenAPI 3.1 specification from Zod schemas
 * for API documentation and contract testing.
 */

import fs from 'fs/promises';
import path from 'path';
import { generateOpenAPISpec } from '../src/lib/api/schema-generator';
import {
  validateOpenAPISchema,
  validateEndpointDocumentation,
  validateRequestSchemas,
  validateResponseSchemas,
} from '../src/lib/openapi-validator';

// Import and register all API schemas
import { initializeOpenAPIRegistry } from '../src/lib/api/register-schemas';

async function main() {
  console.log('🚀 Generating OpenAPI specification...\n');

  try {
    // Initialize OpenAPI registry with all schemas and routes
    console.log('📝 Registering schemas and routes...');
    initializeOpenAPIRegistry();
    console.log('✅ Schemas and routes registered\n');

    // Generate OpenAPI specification
    const spec = generateOpenAPISpec();

    // Validate the generated specification
    console.log('📋 Validating OpenAPI schema...');
    const schemaValidation = await validateOpenAPISchema(spec);

    if (!schemaValidation.valid) {
      console.error('❌ OpenAPI schema validation failed:');
      schemaValidation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }
    console.log('✅ OpenAPI schema is valid\n');

    // Validate endpoint documentation
    console.log('📋 Validating endpoint documentation...');
    const docsValidation = validateEndpointDocumentation(spec);

    if (!docsValidation.valid) {
      console.error('❌ Endpoint documentation validation failed:');
      docsValidation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    if (docsValidation.warnings.length > 0) {
      console.warn('⚠️  Documentation warnings:');
      docsValidation.warnings.forEach(warn => console.warn(`  - ${warn}`));
      console.log('');
    } else {
      console.log('✅ Endpoint documentation is complete\n');
    }

    // Validate request schemas
    console.log('📋 Validating request schemas...');
    const requestValidation = validateRequestSchemas(spec);

    if (!requestValidation.valid) {
      console.error('❌ Request schema validation failed:');
      requestValidation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    if (requestValidation.warnings.length > 0) {
      console.warn('⚠️  Request schema warnings:');
      requestValidation.warnings.forEach(warn => console.warn(`  - ${warn}`));
      console.log('');
    } else {
      console.log('✅ Request schemas are valid\n');
    }

    // Validate response schemas
    console.log('📋 Validating response schemas...');
    const responseValidation = validateResponseSchemas(spec);

    if (!responseValidation.valid) {
      console.error('❌ Response schema validation failed:');
      responseValidation.errors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    if (responseValidation.warnings.length > 0) {
      console.warn('⚠️  Response schema warnings:');
      responseValidation.warnings.forEach(warn => console.warn(`  - ${warn}`));
      console.log('');
    } else {
      console.log('✅ Response schemas are valid\n');
    }

    // Write specification to file
    const outputPath = path.join(process.cwd(), 'openapi.json');
    await fs.writeFile(outputPath, JSON.stringify(spec, null, 2), 'utf-8');

    console.log(`✅ OpenAPI specification generated: ${outputPath}\n`);

    // Print summary
    const pathCount = Object.keys(spec.paths || {}).length;
    const schemaCount = Object.keys(spec.components?.schemas || {}).length;

    console.log('📊 Summary:');
    console.log(`  - API Paths: ${pathCount}`);
    console.log(`  - Schema Components: ${schemaCount}`);
    console.log(`  - OpenAPI Version: ${spec.openapi}`);
    console.log(`  - API Version: ${spec.info.version}\n`);

    console.log('✅ Done! API documentation generated successfully.');
  } catch (error) {
    console.error('❌ Error generating OpenAPI documentation:');
    console.error(error);
    process.exit(1);
  }
}

export { main as generateApiDocs };

// Run if called directly (ES module check)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
