import React from 'react';
import CateringBanner from '@/components/CateringBanner';
import { ALaCarteMenu } from '@/components/Catering';
import ContactCateringPage from '@/app/contact-catering/page';
import { CateringItem, CateringItemCategory } from '@/types/catering';

export const dynamic = 'force-dynamic';

// Mock data for development until database migration is complete
const mockItems: CateringItem[] = [
  {
    id: '1',
    name: 'Tray of Chicken Empanadas',
    description: 'Chicken breast, cream–aji chile reduction and parmesan (25 Pieces)',
    price: 75.00,
    category: CateringItemCategory.STARTER,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '25 Pieces',
    isActive: true,
  },
  {
    id: '2',
    name: 'Tray of Beef Empanadas',
    description: 'Ground beef, golden raisins, pimiento stuffed olives, egg (25 Pieces)',
    price: 75.00,
    category: CateringItemCategory.STARTER,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '25 Pieces',
    isActive: true,
  },
  {
    id: '3',
    name: 'Tray of Vegetarian Empanadas',
    description: 'Hearts of palms, white cheddar, cilantro, aji amarillo (25 Pieces)',
    price: 75.00,
    category: CateringItemCategory.STARTER,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '25 Pieces',
    isActive: true,
  },
  {
    id: '4',
    name: 'Individual Latin Combo Plate',
    description: 'Your choice of one entree and sides',
    price: 14.00,
    category: CateringItemCategory.ENTREE,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isActive: true,
  },
  {
    id: '5',
    name: 'Acorn Squash',
    description: 'Roasted squash, sweet potato puree, mushrooms, coconut milk, carrot, pepitas, romesco salsa',
    price: 8.00,
    category: CateringItemCategory.ENTREE,
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    servingSize: '6 Ounces',
    isActive: true,
  },
  {
    id: '6',
    name: 'Chicken with Mojo',
    description: 'Grilled chicken breast, piquillo pepper, onions, orange-garlic mojo',
    price: 8.50,
    category: CateringItemCategory.ENTREE,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: true,
    servingSize: '6 Ounces',
    isActive: true,
  },
  {
    id: '7',
    name: 'Arroz Verde',
    description: 'Cilantro infused rice, red bell pepper, english peas, aji amarillo, spices',
    price: 3.50,
    category: CateringItemCategory.SIDE,
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isActive: true,
  },
  {
    id: '8',
    name: 'Arroz Rojo',
    description: 'White rice, tomatoes, onion, oregano',
    price: 3.00,
    category: CateringItemCategory.SIDE,
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isActive: true,
  },
  {
    id: '9',
    name: 'Quinoa Salad',
    description: 'Organic white quinoa, arugula, red bell pepper, toybox squash, mint mojo',
    price: 4.00,
    category: CateringItemCategory.SALAD,
    isVegetarian: true,
    isVegan: true,
    isGlutenFree: true,
    isActive: true,
  },
  {
    id: '10',
    name: 'Tray of Alfajores',
    description: 'South american butter cookies, dulce de leche',
    price: 55.00,
    category: CateringItemCategory.DESSERT,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '25 Pieces',
    isActive: true,
  }
];

const ALaCartePage = async () => {
  // In production, this would fetch from the database
  // const cateringItems = await getCateringItems();
  
  // Using mock data for development
  const cateringItems = mockItems;

  return (
    <div className="min-h-screen bg-white">
      <CateringBanner />

      <div className="max-w-[1200px] mx-auto px-4">
        <div className="mt-10 mb-16">
          <h1 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-8">
            A La Carte Menu
          </h1>
          <p className="text-center text-gray-600 max-w-3xl mx-auto mb-12">
            If our catering packages don't fit your needs, Destino also offers a la carte ordering.
            Select individual items for your event based on your specific requirements.
          </p>

          <ALaCarteMenu items={cateringItems} />
        </div>

        {/* Contact form at the bottom */}
        <div className="mb-16">
          <h2 className="text-2xl md:text-3xl font-semibold text-center text-gray-800 mb-8">
            Ready to Order?
          </h2>
          <ContactCateringPage />
        </div>
      </div>
    </div>
  );
};

export default ALaCartePage; 