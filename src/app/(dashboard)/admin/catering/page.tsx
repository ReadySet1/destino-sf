import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CateringPackage, CateringItem, CateringItemCategory, CateringPackageType, SQUARE_CATEGORY_MAPPING, getItemsForTab } from '@/types/catering';
import { getCateringPackages, getCateringItems } from '@/actions/catering';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export const dynamic = 'force-dynamic';

// Mock data for development or when database tables are not yet available
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
    squareCategory: 'CATERING- APPETIZERS'
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
    squareCategory: 'CATERING- SHARE PLATTERS'
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
    squareCategory: 'CATERING- SHARE PLATTERS'
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
    squareCategory: 'LUNCH PACKETS'
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
    squareCategory: 'CATERING- LUNCH, ENTREES'
  }
];

// Función que agrupa los items por categoría de Square
function groupItemsBySquareCategory(items: CateringItem[]): Record<string, CateringItem[]> {
  const result: Record<string, CateringItem[]> = {};
  
  items.forEach(item => {
    if (!item.squareCategory) return;
    
    if (!result[item.squareCategory]) {
      result[item.squareCategory] = [];
    }
    
    result[item.squareCategory].push(item);
  });
  
  return result;
}

const AdminCateringPage = async () => {
  // Try to fetch data from the database, fallback to mock data if tables don't exist yet
  let packages: CateringPackage[] = [];
  let items: CateringItem[] = [];
  let useDbData = true;
  let errorMessage = '';

  try {
    // Attempt to fetch from the database
    packages = await getCateringPackages();
    items = await getCateringItems();
  } catch (error) {
    console.error('Error fetching catering data:', error);
    useDbData = false;
    
    // Check for specific Prisma errors
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2021') {
        errorMessage = 'Catering tables do not exist yet in the database. Using mock data instead.';
      }
    } else {
      errorMessage = `Failed to fetch catering data: ${error instanceof Error ? error.message : String(error)}`;
    }
    
    // Fallback to mock data
    packages = mockPackages;
    items = mockItems;
  }

  // Tabs que queremos mostrar
  const tabs = ['appetizers', 'buffet', 'lunch', 'lunch-packets', 'boxed-lunches'];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Catering Management</h1>
      </div>

      {!useDbData && errorMessage && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 rounded">
          <p className="font-bold">Note:</p>
          <p>{errorMessage}</p>
        </div>
      )}

      <Tabs defaultValue="appetizers" className="w-full">
        <TabsList>
          <TabsTrigger value="appetizers">
            Appetizers
          </TabsTrigger>
          <TabsTrigger value="buffet">
            Buffet
          </TabsTrigger>
          <TabsTrigger value="lunch">
            Lunch
          </TabsTrigger>
          <TabsTrigger value="lunch-packets">
            Lunch Packets
          </TabsTrigger>
          <TabsTrigger value="boxed-lunches">
            Boxed Lunches
          </TabsTrigger>
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <div className="space-y-8">
              {tab === 'boxed-lunches' ? (
                <section>
                  <div className="text-center py-12">
                    <h2 className="text-2xl font-bold mb-4">Boxed Lunch Management</h2>
                    <p className="text-gray-600 mb-6">
                      Manage the 2025 Individual Packaged Lunch Options including tiers, proteins, salads, and add-ons.
                    </p>
                    <Link href="/admin/catering/boxed-lunch">
                      <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Manage Boxed Lunches
                      </Button>
                    </Link>
                  </div>
                </section>
              ) : tab === 'lunch-packets' ? (
                <section>
                  <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">Lunch Packets</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {packages.filter(pkg => SQUARE_CATEGORY_MAPPING[pkg.squareCategory || ''] === 'lunch-packets').map((pkg) => (
                      <PackageCard key={pkg.id} package={pkg} />
                    ))}
                    {getItemsForTab(items, 'lunch-packets').map((item) => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </section>
              ) : (
                // Para los otros tabs, agrupamos por categoría de Square
                Object.entries(groupItemsBySquareCategory(getItemsForTab(items, tab))).map(([category, categoryItems]) => (
                  <section key={category}>
                    <h2 className="text-2xl font-bold mb-4 uppercase tracking-wide">{category.replace('CATERING- ', '')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryItems.map((item) => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

// Helper function to format category names for display
function formatCategoryName(category: CateringItemCategory): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Extract components for better organization
const ItemCard = ({ item }: { item: CateringItem }) => (
  <Card key={item.id} className="overflow-hidden">
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="capitalize">{item.name}</CardTitle>
          <CardDescription className="text-xs uppercase tracking-wider">{formatCategoryName(item.category)}</CardDescription>
        </div>
        <div className="text-xl font-bold">${item.price.toFixed(2)}</div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-500 mb-4">{item.description}</p>
      <div className="flex flex-wrap gap-1 mb-4">
        {item.isVegetarian && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            Vegetarian
          </span>
        )}
        {item.isVegan && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
            Vegan
          </span>
        )}
        {item.isGlutenFree && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
            Gluten-Free
          </span>
        )}
      </div>
    </CardContent>
  </Card>
);

const PackageCard = ({ package: pkg }: { package: CateringPackage }) => (
  <Card key={pkg.id}>
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="capitalize">{pkg.name}</CardTitle>
          <CardDescription className="text-xs uppercase tracking-wider">{pkg.type}</CardDescription>
        </div>
        <div className="text-xl font-bold">${pkg.pricePerPerson.toFixed(2)}/person</div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-500 mb-4">{pkg.description}</p>
      <div className="flex flex-wrap gap-1 mb-4">
        {pkg.dietaryOptions.map((option, index) => (
          <span 
            key={index} 
            className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium"
          >
            {option}
          </span>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default AdminCateringPage; 