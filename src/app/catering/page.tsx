import CateringBanner from '@/components/CateringBanner';
import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { CateringContactForm } from '@/components/Catering/CateringContactForm';
import CateringFaqSection from '@/components/FAQ/CateringFaqSection';
import { CateringPackages, ALaCarteMenu } from '@/components/Catering';
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
    ],
    squareCategory: 'LUNCH PACKETS'
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
    ],
    squareCategory: 'CATERING- BUFFET, ENTREES'
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
    squareCategory: 'CATERING- APPETIZERS',
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
    squareCategory: 'CATERING- SHARE PLATTERS',
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
    squareCategory: 'CATERING- SHARE PLATTERS',
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
    squareCategory: 'LUNCH PACKETS',
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
    squareCategory: 'CATERING- LUNCH, ENTREES',
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
    squareCategory: 'CATERING- BUFFET, ENTREES',
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
    squareCategory: 'CATERING- BUFFET, SIDES',
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
    squareCategory: 'CATERING- LUNCH, SIDES',
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
    squareCategory: 'CATERING- LUNCH, SIDES',
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
    squareCategory: 'CATERING- DESSERTS',
  }
];

// Define catering services
const cateringServices: string[] = [
  'Corporate Events & Office Catering',
  'Weddings & Engagement Parties',
  'Birthday Celebrations',
  'Holiday Gatherings',
  'Private Dinner Parties',
  'Film & Photo Shoots',
  'Conferences & Meetings',
  'Social Events & Reunions'
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
      {/* Banner Section */}
      <CateringBanner />

      {/* Main Content Container */}
      <div className="max-w-[1200px] mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <Card className="border-none shadow-none mb-12">
          <CardContent className="p-0">
            <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-8">
              Planning an event? Let us assist with vibrant Latin American flavors everyone will love.
            </h1>

            <div className="flex flex-col md:flex-row gap-10 items-start">
              {/* Services List */}
              <div className="space-y-6 flex-1">
                <h3 className="text-2xl md:text-3xl font-semibold text-gray-800">We Cater:</h3>
                <ul className="space-y-3">
                  {cateringServices.map((service, index) => (
                    <li key={index} className="flex items-start gap-3 text-xl text-gray-600">
                      <span className="text-[#fdc32d] font-bold">•</span>
                      <span>{service}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Image Container */}
              <div className="w-full md:w-2/3 overflow-hidden rounded-lg">
                <Image
                  src="/images/catering/catering.png"
                  alt="Catering service"
                  width={800}
                  height={600}
                  className="object-cover w-full h-auto hover:scale-105 transition-transform duration-500"
                  priority
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dietary Options Section - Full-width accent */}
      <div className="bg-[#fdc32d] py-8 md:py-12 my-12 md:my-16 transform transition-all hover:bg-[#fdc32d]/90">
        <div className="max-w-[1200px] mx-auto px-4">
          <h3 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-gray-800 leading-tight">
            Our menus are fully customizable and include plenty of gluten-free, vegetarian, and
            vegan options to meet your needs.
          </h3>
        </div>
      </div>

      {/* Catering Options - Packages and A La Carte */}
      <div className="max-w-[1200px] mx-auto px-4 mb-16">
        <h2 className="text-3xl font-bold text-center mb-8">Catering Menu</h2>
        <Tabs defaultValue="appetizers" className="w-full">
          <TabsList className="w-full max-w-md mx-auto grid grid-cols-4 mb-10">
            <TabsTrigger value="appetizers" className="text-lg py-3">Appetizers</TabsTrigger>
            <TabsTrigger value="buffet" className="text-lg py-3">Buffet</TabsTrigger>
            <TabsTrigger value="lunch" className="text-lg py-3">Lunch</TabsTrigger>
            <TabsTrigger value="lunch-packets" className="text-lg py-3">Lunch Packets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="appetizers" className="mt-4">
            <ALaCarteMenu items={cateringItems} activeCategory="appetizers" />
          </TabsContent>
          
          <TabsContent value="buffet" className="mt-4">
            <ALaCarteMenu items={cateringItems} activeCategory="buffet" />
          </TabsContent>
          
          <TabsContent value="lunch" className="mt-4">
            <ALaCarteMenu items={cateringItems} activeCategory="lunch" />
          </TabsContent>
          
          <TabsContent value="lunch-packets" className="mt-4">
            <CateringPackages packages={cateringPackages.filter(pkg => pkg.type === CateringPackageType.INDIVIDUAL)} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Contact form and FAQ Section */}
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Contact form */}
        <div className="mb-16">
          <CateringContactForm />
        </div>

        {/* FAQ Section */}
        <Card className="border-none shadow-none">
          <CardContent className="p-0">
            <CateringFaqSection />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CateringPage;
