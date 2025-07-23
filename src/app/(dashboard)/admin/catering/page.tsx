import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Eye, Trash2, Star, Users, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CateringPackage,
  CateringItem,
  CateringItemCategory,
  CateringPackageType,
  getItemsForTab,
} from '@/types/catering';
import { getCateringPackages, getCateringItems } from '@/actions/catering';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import Image from 'next/image';
import { BoxedLunchInitializer } from '@/components/Catering/BoxedLunchInitializer';
import { SmartCateringItemsList } from '@/components/Catering/SmartCateringItemsList';
import { Toaster } from 'react-hot-toast';

export const dynamic = 'force-dynamic';

// Updated mock data that matches the user-facing catering page
const mockPackages: CateringPackage[] = [
  {
    id: '1',
    name: 'Appetizer Selection Package',
    description:
      'A curated selection of our most popular appetizers perfect for any gathering. Includes empanadas, share platters, and seasonal favorites.',
    minPeople: 8,
    pricePerPerson: 12.5,
    type: CateringPackageType.INDIVIDUAL,
    imageUrl: '/images/catering/appetizer-package.jpg',
    isActive: true,
    featuredOrder: 1,
    dietaryOptions: ['Vegetarian', 'Gluten-Free'],
    ratings: [
      { id: '1', packageId: '1', rating: 5, reviewerName: 'John D.' },
      { id: '2', packageId: '1', rating: 4, reviewerName: 'Sarah T.' },
      { id: '3', packageId: '1', rating: 5, reviewerName: 'Michael R.' },
    ],
  },
  {
    id: '2',
    name: 'Seasonal Latin American Lunch Buffet',
    description:
      'Bring some Latin flair to your next office lunch with fresh and flavorful food from Destino. This package features healthy yet delicious seasonal offerings, including a variety of vegetarian options.',
    minPeople: 10,
    pricePerPerson: 14.5,
    type: CateringPackageType.BUFFET,
    imageUrl: '/images/catering/buffet.jpg',
    isActive: true,
    featuredOrder: 2,
    dietaryOptions: ['Vegetarian', 'Gluten-Free', 'Vegan'],
    ratings: [
      { id: '4', packageId: '2', rating: 5, reviewerName: 'Lisa P.' },
      { id: '5', packageId: '2', rating: 5, reviewerName: 'Robert K.' },
    ],
  },
];

// Updated mock data that matches the current a-la-carte page
const mockItems: CateringItem[] = [
  {
    id: '1',
    name: 'Tray of Chicken Empanadas',
    description: 'Chicken breast, cream–aji chile reduction and parmesan (25 Pieces)',
    price: 75.0,
    category: CateringItemCategory.STARTER,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '25 Pieces',
    isActive: true,
    imageUrl: '/images/catering/empanadas-chicken.jpg',
  },
  {
    id: '2',
    name: 'Tray of Beef Empanadas',
    description: 'Ground beef, golden raisins, pimiento stuffed olives, egg (25 Pieces)',
    price: 75.0,
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
    price: 75.0,
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
    price: 14.0,
    category: CateringItemCategory.ENTREE,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isActive: true,
  },
  {
    id: '5',
    name: 'Acorn Squash',
    description:
      'Roasted squash, sweet potato puree, mushrooms, coconut milk, carrot, pepitas, romesco salsa',
    price: 8.0,
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
    price: 8.5,
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
    price: 3.5,
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
    price: 3.0,
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
    price: 4.0,
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
    price: 55.0,
    category: CateringItemCategory.DESSERT,
    isVegetarian: true,
    isVegan: false,
    isGlutenFree: false,
    servingSize: '25 Pieces',
    isActive: true,
  },
];

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
        errorMessage =
          'Catering tables do not exist yet in the database. Using mock data for development.';
      }
    } else {
      errorMessage = `Failed to fetch catering data: ${error instanceof Error ? error.message : String(error)}`;
    }

    // Fallback to mock data
    packages = mockPackages;
    items = mockItems;
  }

  const tabs = ['all-items', 'appetizers', 'buffet', 'lunch', 'boxed-lunches'];

  // Statistics for the dashboard
  const totalItems = items.length;
  const totalPackages = packages.length;
  const activeItems = items.filter(item => item.isActive).length;
  const activePackages = packages.filter(pkg => pkg.isActive).length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Catering Management</h1>
          <p className="text-gray-600 mt-2">
            Manage catering items and packages that appear on the customer-facing catering menu
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/catering" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Live Menu
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/catering/item/new" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Item
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/catering/package/new" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Add Package
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">{activeItems} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPackages}</div>
            <p className="text-xs text-muted-foreground">{activePackages} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Range</CardTitle>
            <div className="text-sm">$</div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.min(...items.map(i => Number(i.price))).toFixed(0)} - $
              {Math.max(...items.map(i => Number(i.price))).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Item prices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Source</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{useDbData ? 'Database' : 'Mock'}</div>
            <p className="text-xs text-muted-foreground">
              {useDbData ? 'Live data' : 'Development data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {!useDbData && errorMessage && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Development Mode:</strong> {errorMessage}
            <br />
            <span className="text-sm text-gray-600">
              This interface shows the same data structure that appears on the customer-facing
              catering menu.
            </span>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all-items" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="all-items">
            All Items
            <Badge variant="outline" className="ml-2">
              {items.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="appetizers">
            Appetizers
            <Badge variant="outline" className="ml-2">
              {getItemsForTab(items, 'appetizers').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="buffet">
            Buffet
            <Badge variant="outline" className="ml-2">
              {getItemsForTab(items, 'buffet').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="lunch">
            Lunch
            <Badge variant="outline" className="ml-2">
              {getItemsForTab(items, 'lunch').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="boxed-lunches">
            Boxed Lunches
            <Badge variant="outline" className="ml-2">
              {packages.filter(pkg => pkg.type === CateringPackageType.BOXED_LUNCH).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {tabs.map(tab => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <div className="space-y-8">
              {tab === 'all-items' ? (
                // Smart Items List with Square/Local management
                <SmartCateringItemsList items={items} />
              ) : tab === 'boxed-lunches' ? (
                // Special handling for boxed lunches
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold uppercase tracking-wide">
                      Boxed Lunch Packages
                    </h2>
                    <div className="flex gap-2">
                      <BoxedLunchInitializer
                        hasPackages={
                          packages.filter(pkg => pkg.type === CateringPackageType.BOXED_LUNCH)
                            .length > 0
                        }
                      />
                      <Button asChild size="sm">
                        <Link href="/admin/catering/package/new?type=boxed-lunch">
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Boxed Lunch Package
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {packages
                      .filter(pkg => pkg.type === CateringPackageType.BOXED_LUNCH)
                      .map(pkg => (
                        <PackageCard key={pkg.id} package={pkg} />
                      ))}
                    {packages.filter(pkg => pkg.type === CateringPackageType.BOXED_LUNCH).length ===
                      0 && (
                      <div className="col-span-full text-center py-12">
                        <p className="text-gray-500 mb-4">No boxed lunch packages found</p>
                        <BoxedLunchInitializer hasPackages={false} />
                      </div>
                    )}
                  </div>
                </section>
              ) : (
                // Regular tabs: show items grouped by category
                <>
                  {/* Show packages first for this tab */}
                  {packages.filter(
                    pkg =>
                      (tab === 'appetizers' && pkg.name.toLowerCase().includes('appetizer')) ||
                      (tab === 'buffet' && pkg.type === CateringPackageType.BUFFET) ||
                      (tab === 'lunch' &&
                        pkg.name.toLowerCase().includes('lunch') &&
                        pkg.type !== CateringPackageType.BOXED_LUNCH)
                  ).length > 0 && (
                    <section>
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold uppercase tracking-wide">Packages</h2>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/catering/package/new?category=${tab}`}>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Add Package
                          </Link>
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                        {packages
                          .filter(
                            pkg =>
                              (tab === 'appetizers' &&
                                pkg.name.toLowerCase().includes('appetizer')) ||
                              (tab === 'buffet' && pkg.type === CateringPackageType.BUFFET) ||
                              (tab === 'lunch' &&
                                pkg.name.toLowerCase().includes('lunch') &&
                                pkg.type !== CateringPackageType.BOXED_LUNCH)
                          )
                          .map(pkg => (
                            <PackageCard key={pkg.id} package={pkg} />
                          ))}
                      </div>
                    </section>
                  )}

                  {/* Show items for this tab */}
                  <section>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold uppercase tracking-wide">
                        Individual Items
                      </h2>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/catering/item/new?category=${tab}`}>
                          <PlusCircle className="h-4 w-4 mr-2" />
                          Add Item
                        </Link>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {getItemsForTab(items, tab).map(item => (
                        <ItemCard key={item.id} item={item} />
                      ))}
                      {getItemsForTab(items, tab).length === 0 && (
                        <div className="col-span-full text-center py-12">
                          <p className="text-gray-500 mb-4">No items found for this category</p>
                          <Button asChild>
                            <Link href={`/admin/catering/item/new?category=${tab}`}>
                              Create First Item
                            </Link>
                          </Button>
                        </div>
                      )}
                    </div>
                  </section>
                </>
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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// Enhanced Item Card Component
const ItemCard = ({ item }: { item: CateringItem }) => (
  <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
    {item.imageUrl && (
      <div className="relative h-48 w-full">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
    )}
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <CardTitle className="text-lg leading-tight">{item.name}</CardTitle>
          <CardDescription className="text-xs uppercase tracking-wider mt-1">
            {formatCategoryName(item.category)}
          </CardDescription>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">${item.price.toFixed(2)}</div>
          {item.servingSize && <div className="text-xs text-gray-500">{item.servingSize}</div>}
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

      {/* Dietary badges */}
      <div className="flex flex-wrap gap-1 mb-4">
        {item.isVegetarian && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            Vegetarian
          </Badge>
        )}
        {item.isVegan && (
          <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
            Vegan
          </Badge>
        )}
        {item.isGlutenFree && (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
            Gluten-Free
          </Badge>
        )}
        {!item.isActive && (
          <Badge variant="danger" className="text-xs">
            Inactive
          </Badge>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button asChild size="sm" variant="outline" className="flex-1">
          <Link href={`/admin/catering/item/${item.id}`}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="px-3">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Enhanced Package Card Component
const PackageCard = ({ package: pkg }: { package: CateringPackage }) => {
  const averageRating =
    pkg.ratings && pkg.ratings.length > 0
      ? pkg.ratings.reduce((sum, rating) => sum + rating.rating, 0) / pkg.ratings.length
      : 0;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {pkg.imageUrl && (
        <div className="relative h-48 w-full">
          <Image
            src={pkg.imageUrl}
            alt={pkg.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight">{pkg.name}</CardTitle>
            <CardDescription className="text-xs uppercase tracking-wider mt-1">
              {pkg.type.replace('_', ' ')}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-blue-600">${pkg.pricePerPerson.toFixed(2)}</div>
            <div className="text-xs text-gray-500">per person</div>
          </div>
        </div>

        {averageRating > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
            <span className="text-xs text-gray-500">({pkg.ratings?.length} reviews)</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{pkg.description}</p>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Minimum:</span>
            <span className="font-medium">{pkg.minPeople} people</span>
          </div>

          {/* Dietary options */}
          <div className="flex flex-wrap gap-1">
            {pkg.dietaryOptions.map((option, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {option}
              </Badge>
            ))}
            {!pkg.isActive && (
              <Badge variant="danger" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-4">
          <Button asChild size="sm" variant="outline" className="flex-1">
            <Link href={`/admin/catering/package/${pkg.id}`}>
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="px-3">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCateringPage;
