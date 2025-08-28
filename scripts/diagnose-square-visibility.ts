#!/usr/bin/env tsx

/**
 * Diagnostic script to check what Square actually returns for visibility settings
 */

import { squareClient } from '../src/lib/square/client';
import { logger } from '../src/utils/logger';

interface SquareCatalogObject {
  type: string;
  id: string;
  item_data?: {
    name: string;
    description?: string | null;
    visibility?: string;
    available_online?: boolean;
    available_for_pickup?: boolean;
    present_at_all_locations?: boolean;
  };
  custom_attribute_values?: Record<string, any>;
  is_deleted?: boolean;
}

async function diagnoseSquareVisibility() {
  console.log('🔍 Diagnosing Square visibility settings...\n');
  
  try {
    // Get all catalog objects from Square
    const { result } = await squareClient.catalogApi.listCatalog('ITEM');
    const items = result.objects || [];
    
    console.log(`📦 Found ${items.length} items in Square catalog\n`);
    
    // Check specific problem items
    const problemItems = [
      'Pride',
      'Lucuma', 
      'Gingerbread'
    ];
    
    for (const searchTerm of problemItems) {
      const matchingItems = items.filter((item: SquareCatalogObject) => 
        item.item_data?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (matchingItems.length === 0) {
        console.log(`❌ No items found matching "${searchTerm}"`);
        continue;
      }
      
      for (const item of matchingItems) {
        const itemName = item.item_data?.name || 'Unknown';
        console.log(`\n📋 Analyzing: ${itemName}`);
        console.log(`   Square ID: ${item.id}`);
        console.log(`   Type: ${item.type}`);
        console.log(`   Is Deleted: ${item.is_deleted || false}`);
        
        if (item.item_data) {
          console.log('\n   📊 Item Data:');
          console.log(`   - Visibility: ${item.item_data.visibility || 'not set'}`);
          console.log(`   - Available Online: ${item.item_data.available_online ?? 'not set'}`);
          console.log(`   - Available for Pickup: ${item.item_data.available_for_pickup ?? 'not set'}`);
          console.log(`   - Present at All Locations: ${item.item_data.present_at_all_locations ?? 'not set'}`);
          console.log(`   - Description: ${item.item_data.description || 'none'}`);
        }
        
        if (item.custom_attribute_values) {
          console.log('\n   🏷️  Custom Attributes:');
          for (const [key, value] of Object.entries(item.custom_attribute_values)) {
            console.log(`   - ${key}: ${JSON.stringify(value)}`);
          }
        } else {
          console.log('\n   🏷️  Custom Attributes: none');
        }
        
        // Check for any other relevant fields
        const otherFields = Object.keys(item).filter(key => 
          !['type', 'id', 'item_data', 'custom_attribute_values', 'is_deleted'].includes(key)
        );
        
        if (otherFields.length > 0) {
          console.log('\n   🔧 Other Fields:');
          otherFields.forEach(field => {
            console.log(`   - ${field}: ${JSON.stringify((item as any)[field])}`);
          });
        }
        
        console.log('\n' + '─'.repeat(80));
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    const itemsWithVisibility = items.filter((item: SquareCatalogObject) => 
      item.item_data?.visibility && item.item_data.visibility !== 'PUBLIC'
    );
    
    const itemsWithAvailability = items.filter((item: SquareCatalogObject) => 
      item.item_data?.available_online === false
    );
    
    const itemsWithCustomAttribs = items.filter((item: SquareCatalogObject) => 
      item.custom_attribute_values && Object.keys(item.custom_attribute_values).length > 0
    );
    
    console.log(`- Items with non-PUBLIC visibility: ${itemsWithVisibility.length}`);
    console.log(`- Items with available_online=false: ${itemsWithAvailability.length}`);  
    console.log(`- Items with custom attributes: ${itemsWithCustomAttribs.length}`);
    
    if (itemsWithCustomAttribs.length > 0) {
      console.log('\n🏷️  Sample custom attributes found:');
      const sampleItem = itemsWithCustomAttribs[0] as SquareCatalogObject;
      console.log(`   Item: ${sampleItem.item_data?.name}`);
      for (const [key, value] of Object.entries(sampleItem.custom_attribute_values || {})) {
        console.log(`   - ${key}: ${JSON.stringify(value)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error diagnosing Square visibility:', error);
  }
}

// Run the diagnostic
diagnoseSquareVisibility()
  .then(() => {
    console.log('\n✅ Diagnostic complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Diagnostic failed:', error);
    process.exit(1);
  });
