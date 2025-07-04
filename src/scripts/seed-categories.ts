import { prisma } from '@/lib/db';

async function seedCategories() {
  console.log('🌱 Seeding categories...');

  const categories = [
    {
      name: 'Alfajores',
      description: 'Our alfajores are buttery shortbread cookies filled with rich, velvety dulce de leche — a beloved Latin American treat made the DESTINO way. We offer a variety of flavors including classic, chocolate, gluten-free, lemon, and seasonal specialties. Each cookie is handcrafted in small batches using a family-honored recipe and premium ingredients for that perfect melt-in-your-mouth texture. Whether you\'re gifting, sharing, or treating yourself, our alfajores bring comfort, flavor, and a touch of tradition to every bite.',
      slug: 'alfajores',
      order: 1,
      isActive: true,
      imageUrl: '/images/menu/alfajores.png',
    },
    {
      name: 'Empanadas',
      description: 'Wholesome, bold, and rooted in Latin American tradition — our empanadas deliver handcrafted comfort in every bite. From our Argentine beef, Caribbean pork, Lomo Saltado, and Salmon, each flavor is inspired by regional flavors and made with carefully selected ingredients. With up to 17 grams of protein, our empanadas are truly protein-packed, making them as healthy as they are delicious. Crafted in small batches, our empanadas are a portable, satisfying option for any time you crave something bold and delicious!',
      slug: 'empanadas',
      order: 2,
      isActive: true,
      imageUrl: '/images/menu/empanadas.png',
    },
    {
      name: 'Catering',
      description: 'Professional catering services for all your events and special occasions.',
      slug: 'catering',
      order: 3,
      isActive: true,
      imageUrl: '/images/menu/catering.jpeg',
    },
  ];

  for (const category of categories) {
    try {
      const result = await prisma.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: {
          name: category.name,
          description: category.description,
          order: category.order,
          isActive: category.isActive,
          imageUrl: category.imageUrl,
        },
      });
      console.log(`✅ Created/updated category: ${result.name} (slug: ${result.slug})`);
    } catch (error) {
      console.error(`❌ Failed to create/update category ${category.name}:`, error);
    }
  }

  console.log('✨ Category seeding completed!');
}

// Run the seeding function
seedCategories()
  .catch((error) => {
    console.error('❌ Error seeding categories:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 