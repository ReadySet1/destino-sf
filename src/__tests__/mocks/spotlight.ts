import { SpotlightPick } from '@/types/spotlight';

export const mockActiveSpotlightPicks: SpotlightPick[] = [
  {
    id: 'pick-1',
    position: 1,
    productId: 'product-1',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: 'product-1',
      name: 'Dulce de Leche Alfajores',
      description: 'Traditional Argentine cookies',
      images: ['/images/alfajores.jpg'],
      price: 12.99,
      slug: 'dulce-leche-alfajores',
      category: {
        name: 'ALFAJORES',
        slug: 'alfajores',
      },
    },
  },
  {
    id: 'pick-2',
    position: 2,
    productId: 'product-2',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: {
      id: 'product-2',
      name: 'Peruvian Coffee',
      description: 'Rich and aromatic coffee beans',
      images: ['/images/coffee.jpg'],
      price: 18.50,
      slug: 'peruvian-coffee',
      category: {
        name: 'COFFEE',
        slug: 'coffee',
      },
    },
  },
]; 