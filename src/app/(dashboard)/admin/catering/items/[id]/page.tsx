import React from 'react';
import { notFound } from 'next/navigation';
import { getEnhancedCateringItem, getItemEditCapabilities } from '@/actions/catering-overrides';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Square, Database, Image, Clock } from 'lucide-react';
import Link from 'next/link';
import { ItemSource } from '@/types/catering';

interface ViewCateringItemPageProps {
  params: {
    id: string;
  };
}

export default async function ViewCateringItemPage({ params }: ViewCateringItemPageProps) {
  const [item, capabilities] = await Promise.all([
    getEnhancedCateringItem(params.id),
    getItemEditCapabilities(params.id)
  ]);

  if (!item) {
    notFound();
  }

  const isSquareItem = capabilities.source === ItemSource.SQUARE;

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/catering">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catering
          </Link>
        </Button>
        <Button asChild>
          <Link href={`/admin/catering/items/${params.id}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            {isSquareItem ? 'Edit Overrides' : 'Edit Item'}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{item.name}</CardTitle>
                  <div className="flex items-center space-x-2 mt-2">
                    {isSquareItem ? (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Square className="h-3 w-3" />
                        <span>Square Item</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <Database className="h-3 w-3" />
                        <span>Local Item</span>
                      </Badge>
                    )}
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-green-600">
                    ${Number(item.price).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.category.replace('_', ' ')}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                {item.finalDescription || 'No description available'}
              </p>
              {item.finalServingSize && (
                <p className="text-sm text-gray-500 mt-2">
                  Serving size: {item.finalServingSize}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Dietary Information */}
          <Card>
            <CardHeader>
              <CardTitle>Dietary Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {item.finalIsVegetarian && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Vegetarian
                  </Badge>
                )}
                {item.finalIsVegan && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Vegan
                  </Badge>
                )}
                {item.finalIsGlutenFree && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Gluten-Free
                  </Badge>
                )}
                {!item.finalIsVegetarian && !item.finalIsVegan && !item.finalIsGlutenFree && (
                  <span className="text-gray-500">No special dietary requirements</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Override Information (for Square items) */}
          {isSquareItem && item.overrides && (
            <Card>
              <CardHeader>
                <CardTitle>Local Overrides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Description Override:</span>
                    <Badge variant={item.overrides.overrideDescription ? "default" : "secondary"} className="ml-2">
                      {item.overrides.overrideDescription ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Image Override:</span>
                    <Badge variant={item.overrides.overrideImage ? "default" : "secondary"} className="ml-2">
                      {item.overrides.overrideImage ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Dietary Override:</span>
                    <Badge variant={item.overrides.overrideDietary ? "default" : "secondary"} className="ml-2">
                      {item.overrides.overrideDietary ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Serving Size Override:</span>
                    <Badge variant={item.overrides.overrideServingSize ? "default" : "secondary"} className="ml-2">
                      {item.overrides.overrideServingSize ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                
                {item.overrides.localDietaryOptions && item.overrides.localDietaryOptions.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Local Dietary Options:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.overrides.localDietaryOptions.map((option, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {option}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Image className="h-4 w-4" />
                <span>Image</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.finalImageUrl ? (
                <div className="space-y-2">
                  <img
                    src={item.finalImageUrl}
                    alt={item.name}
                    className="w-full h-48 object-cover rounded-lg border"
                  />
                  {isSquareItem && item.overrides?.overrideImage && (
                    <p className="text-xs text-blue-600">
                      Using local override image
                    </p>
                  )}
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg border flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Image className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">No image available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Metadata</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                             {item.overrides && (
                 <>
                   <div>
                     <span className="text-sm font-medium">Override Created:</span>
                     <p className="text-sm text-gray-600">
                       {new Date(item.overrides.createdAt).toLocaleDateString()}
                     </p>
                   </div>
                   <div>
                     <span className="text-sm font-medium">Override Updated:</span>
                     <p className="text-sm text-gray-600">
                       {new Date(item.overrides.updatedAt).toLocaleDateString()}
                     </p>
                   </div>
                 </>
               )}
               {isSquareItem && (
                 <>
                   <div>
                     <span className="text-sm font-medium">Item Source:</span>
                     <p className="text-sm text-gray-600">
                       Square Product
                     </p>
                   </div>
                   {item.squareData?.lastSyncedAt && (
                     <div>
                       <span className="text-sm font-medium">Last Synced:</span>
                       <p className="text-sm text-gray-600">
                         {new Date(item.squareData.lastSyncedAt).toLocaleDateString()}
                       </p>
                     </div>
                   )}
                 </>
               )}
            </CardContent>
          </Card>

          {/* Edit Capabilities */}
          <Card>
            <CardHeader>
              <CardTitle>Edit Capabilities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <Badge variant={capabilities.canEditName ? "default" : "secondary"} className="text-xs">
                    {capabilities.canEditName ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <Badge variant={capabilities.canEditPrice ? "default" : "secondary"} className="text-xs">
                    {capabilities.canEditPrice ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Description:</span>
                  <Badge variant={capabilities.canEditDescription ? "default" : "secondary"} className="text-xs">
                    {capabilities.canEditDescription ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Image:</span>
                  <Badge variant={capabilities.canEditImage ? "default" : "secondary"} className="text-xs">
                    {capabilities.canEditImage ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
              {capabilities.warnings && capabilities.warnings.length > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 rounded border">
                  <p className="text-xs text-yellow-800 font-medium">Warnings:</p>
                  <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                    {capabilities.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 