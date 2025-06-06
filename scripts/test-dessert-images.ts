#!/usr/bin/env tsx

/**
 * Test script to verify that dessert images are working correctly
 * This calls the getCateringItems function and checks the dessert items
 */

import { getCateringItems } from '@/actions/catering';

async function testDessertImages() {
  console.log('🧪 Testing dessert images in catering system...\n');

  try {
    // Fetch all catering items using the actual function
    const items = await getCateringItems();
    
    // Filter for dessert items
    const dessertItems = items.filter(item => item.category === 'DESSERT');
    
    console.log(`Found ${dessertItems.length} dessert items:\n`);
    
    dessertItems.forEach((item, index) => {
      const hasImage = !!item.imageUrl;
      const statusIcon = hasImage ? '✅' : '❌';
      
      console.log(`${index + 1}. ${statusIcon} ${item.name}`);
      console.log(`   Price: $${item.price}`);
      console.log(`   Description: ${item.description || 'No description'}`);
      
      if (hasImage) {
        const isS3 = item.imageUrl!.includes('amazonaws.com') || item.imageUrl!.includes('s3.');
        const imageType = isS3 ? 'S3' : 'Local';
        console.log(`   Image (${imageType}): ${item.imageUrl}`);
      } else {
        console.log(`   Image: No image URL`);
      }
      
      console.log('');
    });
    
    // Summary
    const itemsWithImages = dessertItems.filter(item => item.imageUrl).length;
    const s3Images = dessertItems.filter(item => 
      item.imageUrl && (item.imageUrl.includes('amazonaws.com') || item.imageUrl.includes('s3.'))
    ).length;
    
    console.log('📊 SUMMARY');
    console.log('===========');
    console.log(`Total dessert items: ${dessertItems.length}`);
    console.log(`Items with images: ${itemsWithImages}/${dessertItems.length} (${Math.round((itemsWithImages/dessertItems.length) * 100)}%)`);
    console.log(`S3 images: ${s3Images}`);
    console.log(`Local images: ${itemsWithImages - s3Images}`);
    
    if (itemsWithImages === dessertItems.length && s3Images === dessertItems.length) {
      console.log('\n🎉 SUCCESS: All dessert items have S3 images!');
      console.log('The catering system should display dessert images correctly.');
    } else if (itemsWithImages === dessertItems.length) {
      console.log('\n✅ All dessert items have images, but some are local files.');
    } else {
      console.log('\n⚠️  Some dessert items are missing images.');
    }
    
  } catch (error) {
    console.error('❌ Error testing dessert images:', error);
    process.exit(1);
  }
}

// Run the test
testDessertImages(); 