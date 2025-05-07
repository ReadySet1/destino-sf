import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const testProducts = await prisma.product.findMany({
      where: {
        name: {
          startsWith: 'Test'
        }
      }
    });
    
    console.log(JSON.stringify(testProducts, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 