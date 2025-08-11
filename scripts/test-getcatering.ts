#!/usr/bin/env tsx

// Test script to verify getCateringItems() function works with our synced data
import { getCateringItems } from '../src/actions/catering';

async function main() {
  try {
    console.log('🧪 Testing getCateringItems() function...');
    
    const startTime = Date.now();
    const items = await getCateringItems();
    const endTime = Date.now();
    
    console.log(`✅ getCateringItems() completed in ${endTime - startTime}ms`);
    console.log(`📊 Total items returned: ${items.length}`);
    
    if (items.length > 0) {
      console.log('\n🔍 Sample items:');
      
      // Show some key items we're looking for
      const keyItems = ['locro', 'tropical salad', 'empanada'];
      
      keyItems.forEach(key => {
        const found = items.filter(item => 
          item.name.toLowerCase().includes(key.toLowerCase())
        );
        
        if (found.length > 0) {
          console.log(`   ✅ Found ${found.length} items with "${key}":`);
          found.slice(0, 3).forEach(item => {
            console.log(`      - ${item.name} (${item.category})`);
          });
        } else {
          console.log(`   ❌ No items found with "${key}"`);
        }
      });
      
      // Show category breakdown
      console.log('\n📋 Category breakdown:');
      const categoryCount: Record<string, number> = {};
      items.forEach(item => {
        categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
      });
      
      Object.entries(categoryCount).forEach(([category, count]) => {
        console.log(`   ${category}: ${count} items`);
      });
      
      // Show items with images
      const withImages = items.filter(item => item.imageUrl);
      console.log(`\n🖼️  Items with images: ${withImages.length}/${items.length}`);
      
      console.log('\n🎉 getCateringItems() function working correctly!');
    } else {
      console.log('❌ No items returned - there might be an issue');
    }
    
  } catch (error) {
    console.error('❌ Error testing getCateringItems():', error);
    process.exit(1);
  }
}

main();