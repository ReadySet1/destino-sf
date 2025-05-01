import { PrismaClient } from '@prisma/client';
import { slugify } from '../lib/slug'; // Adjust path if necessary

const prisma = new PrismaClient();

async function batchUpdateSlugs() {
  console.log('Starting batch slug update...');

  try {
    // Find products where slug is null or an empty string
    const productsToUpdate = await prisma.product.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: '' }
        ],
        active: true, // Optional: only update active products, adjust if needed
      },
      select: {
        id: true,
        name: true,
        slug: true, // Select current slug for logging
      },
    });

    if (productsToUpdate.length === 0) {
      console.log('No products found needing a slug update.');
      return;
    }

    console.log(`Found ${productsToUpdate.length} products to update.`);

    let updatedCount = 0;
    let failedCount = 0;

    for (const product of productsToUpdate) {
      if (!product.name) {
        console.warn(`Skipping product ID ${product.id}: Name is missing, cannot generate slug.`);
        failedCount++;
        continue;
      }

      const generatedSlug = slugify(product.name);

      // Optional: Check if a product with the generated slug already exists
      // This prevents potential unique constraint violations if 'slug' must be unique
      const existingProductWithSlug = await prisma.product.findUnique({
        where: { slug: generatedSlug },
        select: { id: true },
      });

      if (existingProductWithSlug && existingProductWithSlug.id !== product.id) {
        console.warn(
          `Skipping product ID ${product.id} (Name: "${product.name}"): 
           Generated slug "${generatedSlug}" already exists for product ID ${existingProductWithSlug.id}. 
           Consider manually assigning a unique slug.`
        );
        failedCount++;
        continue;
      }
      
      if (!generatedSlug) {
         console.warn(`Skipping product ID ${product.id} (Name: "${product.name}"): Generated slug is empty.`);
         failedCount++;
         continue;
      }

      try {
        await prisma.product.update({
          where: { id: product.id },
          data: { slug: generatedSlug },
        });
        console.log(`Updated product ID ${product.id} (Name: "${product.name}") with slug: "${generatedSlug}"`);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to update product ID ${product.id}:`, error);
        failedCount++;
      }
    }

    console.log(
      `Batch update finished. 
       Successfully updated: ${updatedCount}
       Failed/Skipped: ${failedCount}`
    );

  } catch (error) {
    console.error('Error during batch slug update process:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Database connection closed.');
  }
}

batchUpdateSlugs(); 