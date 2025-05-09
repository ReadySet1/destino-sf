import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import Image from 'next/image';
import { twMerge } from 'tailwind-merge';
import { CateringPackages, ALaCarteMenu } from '@/components/Catering';
import ContactCateringPage from '../contact-catering/page';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CateringPackage, CateringItem, CateringItemCategory, CateringPackageType } from '@/types/catering';

export const dynamic = 'force-dynamic';

// Mock data for development until database migration is complete
const mockPackages: CateringPackage[] = [
  {
    id: '1',
    name: 'Individual Modern Latin Meals',
    description: 'Bring some Latin flair to your next office lunch with fresh and flavorful food from Destino. This package features healthy yet delicious seasonal offerings, including a variety of vegetarian options.',
    minPeople: 5,
    pricePerPerson: 14.00,
    type: CateringPackageType.INDIVIDUAL,
    imageUrl: '/images/catering/individual.jpg',
    isActive: true,
    featuredOrder: 1,
    dietaryOptions: ['Vegetarian', 'Gluten-Free'],
    ratings: [
      { id: '1', packageId: '1', rating: 5, reviewerName: 'John D.' },
      { id: '2', packageId: '1', rating: 4, reviewerName: 'Sarah T.' },
      { id: '3', packageId: '1', rating: 5, reviewerName: 'Michael R.' },
    ]
  },
  {
    id: '2',
    name: 'Seasonal Latin American Lunch Buffet',
    description: 'Bring some Latin flair to your next office lunch with fresh and flavorful food from Destino. This package features healthy yet delicious seasonal offerings, including a variety of vegetarian options.',
    minPeople: 10,
    pricePerPerson: 14.50,
    type: CateringPackageType.BUFFET,
    imageUrl: '/images/catering/buffet.jpg',
    isActive: true,
    featuredOrder: 2,
    dietaryOptions: ['Vegetarian', 'Gluten-Free', 'Vegan'],
    ratings: [
      { id: '4', packageId: '2', rating: 5, reviewerName: 'Lisa P.' },
      { id: '5', packageId: '2', rating: 5, reviewerName: 'Robert K.' },
    ]
  }
];

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

const CateringPage = async () => {
  // In production, this would fetch from the database
  // const cateringPackages = await getCateringPackages();
  // const cateringItems = await getCateringItems();
  
  // Using mock data for development
  const cateringPackages = mockPackages;
  const cateringItems = mockItems;

  return (
    <div className="min-h-screen bg-white">
      <CateringBanner />

      <div className="max-w-[1200px] mx-auto px-4">
        {/* Catering content */}
        <div className="mt-10">
          <h1
            className={twMerge(
              'text-3xl md:text-3xl lg:text-3xl font-normal text-gray-900',
              'leading-tight tracking-normal max-w-4xl mb-16'
            )}
          >
            Offering a diverse selection of savory Latin American dishes, we would be delighted to
            provide our catering services for your next event!
          </h1>

          <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
            <div className="space-y-4 flex-1">
              <h3 className="text-2xl md:text-3xl font-semibold text-gray-800">We Cater For:</h3>
              <ul className="space-y-3 text-xl text-gray-600">
                <li>• Happy Hour Events</li>
                <li>• Cocktail Receptions</li>
                <li>• Birthday Celebrations</li>
                <li>• Dinner Parties</li>
                <li>• Corporate Meet & Greets</li>
                <li>• Corporate Luncheons</li>
              </ul>
            </div>
            <div className="flex-1">
              <Image
                src="/images/catering/catering.png"
                alt="Catering service"
                width={800}
                height={600}
                className="rounded-lg object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Dietary Options section - Full width */}
      <div className="bg-[#fdc32d] py-16 my-16">
        <div className="max-w-[1200px] mx-auto px-4">
          <h3 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-4">Dietary Options</h3>
          <p className="text-xl text-gray-600">
            Customizable menus with a great selection of Gluten-free, Vegetarian & Vegan options!
          </p>
        </div>
      </div>

      {/* Catering Options - Packages and A La Carte */}
      <div className="max-w-[1200px] mx-auto px-4 mb-16">
        <Tabs defaultValue="packages" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-10">
            <TabsTrigger value="packages" className="text-lg py-3">Catering Packages</TabsTrigger>
            <TabsTrigger value="alacarte" className="text-lg py-3">A La Carte Menu</TabsTrigger>
          </TabsList>
          
          <TabsContent value="packages" className="mt-4">
            <CateringPackages packages={cateringPackages} />
          </TabsContent>
          
          <TabsContent value="alacarte" className="mt-4">
            <ALaCarteMenu items={cateringItems} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Contact form at the bottom */}
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="mb-16">
          <ContactCateringPage />
        </div>
      </div>
    </div>
  );
};

export default CateringPage;
