import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  }
];

const AdminCateringPage = async () => {
  // In production, this would fetch from the database
  // const packages = await getCateringPackages();
  // const items = await getCateringItems();
  
  // Using mock data for development
  const packages = mockPackages;
  const items = mockItems;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Catering Management</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/catering/packages/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Package
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/catering/items/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Item
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="w-full max-w-md mx-auto grid grid-cols-2 mb-6">
          <TabsTrigger value="packages">Packages</TabsTrigger>
          <TabsTrigger value="items">A La Carte Items</TabsTrigger>
        </TabsList>

        <TabsContent value="packages">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{pkg.name}</CardTitle>
                      <CardDescription>{pkg.type}</CardDescription>
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
                        className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/catering/packages/${pkg.id}`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="items">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>{formatCategoryName(item.category)}</CardDescription>
                    </div>
                    <div className="text-xl font-bold">${item.price.toFixed(2)}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">{item.description}</p>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.isVegetarian && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Vegetarian
                      </span>
                    )}
                    {item.isVegan && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Vegan
                      </span>
                    )}
                    {item.isGlutenFree && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        Gluten-Free
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/catering/items/${item.id}`}>
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
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

export default AdminCateringPage; 