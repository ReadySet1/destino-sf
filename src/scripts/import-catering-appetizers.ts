// src/scripts/import-catering-appetizers.ts

import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Initialize Prisma client
const prisma = new PrismaClient();

// Types for the JSON structure
interface AppetizerJsonItem {
  name: string;
  ingredients: string[];
  dietary: string[];
}

interface EmpanadaOption {
  name: string;
  ingredients: string[];
  dietary: string[];
}

interface AppetizerJsonData {
  menuName: string;
  restaurant: string;
  cateringNotice: string;
  dietaryLegend: {
    gf: string;
    vg: string;
    vgn: string;
  };
  appetizers: AppetizerJsonItem[];
  empanadas: {
    description: string;
    options: EmpanadaOption[];
  };
  // Additional properties like platters, desserts, etc.
  [key: string]: any;
}

interface AppetizerData {
  name: string;
  ingredients: string[];
  dietary: string[];
}

interface AppetizerImportData extends AppetizerData {
  squareName?: string;
  hasImage?: boolean;
}

// Import the actual appetizer data from JSON
const jsonPath = path.join(process.cwd(), 'src/data/appetizers-from-pdf.json');
const appetizersPdfData: AppetizerJsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Data is now imported from JSON file above

// Square data mapping for appetizers
// TODO: Replace with actual Square item names once we have them
const appetizersSquareData = {
  items: [
    // Appetizers from JSON
    { name: "pintxos vegetarianos" },
    { name: "arepas" },
    { name: "camotitos" },
    { name: "mt. tam montado" },
    { name: "quinoa arancini balls" },
    { name: "causa" },
    { name: "bocadillo de boquerones" },
    { name: "peruvian ceviche" },
    { name: "tiger prawns" },
    { name: "salmon carpaccio" },
    { name: "churrasco" },
    { name: "pa amb tomàquet" },
    { name: "anticuchos de pollo" },
    { name: "sliders" },
    { name: "albondigas" },
    { name: "oxtail" },
    // Empanadas
    { name: "pork empanada" },
    { name: "vegetarian empanada" },
    { name: "tamal verde empanada" },
    { name: "beef empanada" },
    { name: "chicken empanada" },
    { name: "salmon empanada" }
  ]
};

/**
 * Find matching Square item name for a PDF item
 */
function findSquareMatch(pdfName: string): string | undefined {
  const normalizedPdfName = pdfName.toLowerCase().trim();
  
  // Find in Square data using fuzzy matching
  const match = appetizersSquareData.items.find(item => {
    const normalizedSquareName = item.name.toLowerCase().trim();
    return normalizedSquareName === normalizedPdfName || 
           normalizedSquareName.includes(normalizedPdfName) ||
           normalizedPdfName.includes(normalizedSquareName);
  });
  
  return match?.name;
}

/**
 * Parse dietary flags from PDF dietary array
 */
function parseDietaryFlags(dietary: string[]) {
  return {
    isVegetarian: dietary.includes('vg'),
    isVegan: dietary.includes('vgn'), 
    isGlutenFree: dietary.includes('gf')
  };
}

/**
 * Import catering appetizers from PDF data
 */
async function importCateringAppetizers() {
  console.log('🚀 Starting catering appetizers import...');
  
  try {
    // Prepare the import data
    const appetizersToImport: AppetizerImportData[] = [
      // Regular appetizers
      ...appetizersPdfData.appetizers.map(item => ({
        name: item.name,
        ingredients: item.ingredients || [],
        dietary: item.dietary || [],
        // Match with Square data by normalized name
        squareName: findSquareMatch(item.name)
      })),
      
      // Empanada options (they're also appetizers in catering)
      ...appetizersPdfData.empanadas.options.map(item => ({
        name: `${item.name} Empanada`,
        ingredients: item.ingredients || [],
        dietary: item.dietary || [],
        squareName: findSquareMatch(`${item.name} Empanada`)
      }))
    ];
    
    console.log(`📦 Prepared ${appetizersToImport.length} items for import`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    // Import each item
    for (const appetizer of appetizersToImport) {
      try {
        // Check if item already exists
        const existingItem = await prisma.cateringItem.findFirst({
          where: { 
            name: appetizer.name,
            category: 'APPETIZER'
          }
        });
        
        if (existingItem) {
          console.log(`⚠️  Item already exists: ${appetizer.name}`);
          skipped++;
          continue;
        }
        
        // Parse dietary flags
        const { isVegetarian, isVegan, isGlutenFree } = parseDietaryFlags(appetizer.dietary);
        
        // Create the catering item
        await prisma.cateringItem.create({
          data: {
            name: appetizer.name,
            description: appetizer.ingredients.join(', '),
            price: 0, // Will be updated from Square sync
            category: 'APPETIZER',
            isVegetarian,
            isVegan,
            isGlutenFree,
            servingSize: 'per piece',
            isActive: true,
            squareCategory: 'CATERING- APPETIZERS',
            
            // Store PDF data
            ingredients: appetizer.ingredients,
            dietaryTags: appetizer.dietary,
            sourceType: 'MANUAL', // Static import
            
            // Store Square name for later matching (if found)
            squareProductId: appetizer.squareName || null,
            syncEnabled: true
          }
        });
        
        console.log(`✅ Imported: ${appetizer.name}${appetizer.squareName ? ` (linked to: ${appetizer.squareName})` : ''}`);
        imported++;
        
      } catch (error) {
        console.error(`❌ Failed to import ${appetizer.name}:`, error);
        errors++;
      }
    }
    
    console.log('\n📊 Import Summary:');
    console.log(`✅ Imported: ${imported} items`);
    console.log(`⚠️  Skipped: ${skipped} items (already exist)`);
    console.log(`❌ Errors: ${errors} items`);
    
    if (imported > 0) {
      console.log('\n🔄 Next Steps:');
      console.log('1. Review imported items in the admin dashboard');
      console.log('2. Run the price sync to update prices from Square');
      console.log('3. Manually link any unmatched items to Square names');
    }
    
    console.log('✅ Import completed!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  }
}

/**
 * Show current import status
 */
async function showImportStatus() {
  try {
    const total = await prisma.cateringItem.count({
      where: { category: 'APPETIZER' }
    });
    
    const linked = await prisma.cateringItem.count({
      where: { 
        category: 'APPETIZER',
        OR: [
          { squareItemId: { not: null } },
          { squareProductId: { not: null } }
        ]
      }
    });
    
    const withIngredients = await prisma.cateringItem.count({
      where: { 
        category: 'APPETIZER',
        ingredients: { isEmpty: false }
      }
    });
    
    console.log('\n📊 Current Status:');
    console.log(`📦 Total appetizer items: ${total}`);
    console.log(`🔗 Linked to Square: ${linked}`);
    console.log(`🌿 With ingredients data: ${withIngredients}`);
    console.log(`⚠️  Unlinked: ${total - linked}`);
    
  } catch (error) {
    console.error('Failed to get status:', error);
  }
}

/**
 * Main execution
 */
async function main() {
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'import':
        await importCateringAppetizers();
        break;
      case 'status':
        await showImportStatus();
        break;
      default:
        console.log('🍴 Catering Appetizers Import Script');
        console.log('\nUsage:');
        console.log('  npx tsx src/scripts/import-catering-appetizers.ts import  # Import appetizer data');
        console.log('  npx tsx src/scripts/import-catering-appetizers.ts status  # Show current status');
        console.log('\nData source: src/data/appetizers-from-pdf.json');
    }
  } catch (error) {
    console.error('Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main();
