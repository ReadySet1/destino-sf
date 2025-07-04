import React from 'react';
import { notFound } from 'next/navigation';
import { SmartCateringItemForm } from '@/components/Catering/SmartCateringItemForm';
import { getEnhancedCateringItem } from '@/actions/catering-overrides';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditCateringItemPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCateringItemPage({ params }: EditCateringItemPageProps) {
  const { id } = await params;
  const item = await getEnhancedCateringItem(id);

  if (!item) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/catering">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Catering
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Catering Item</CardTitle>
          <p className="text-sm text-gray-600">
            {item.isSquareItem 
              ? 'This item syncs from Square. You can override description, images, and dietary information.'
              : 'This is a local item. You have full editing control.'
            }
          </p>
        </CardHeader>
        <CardContent>
          <SmartCateringItemForm 
            itemId={id}
          />
        </CardContent>
      </Card>
    </div>
  );
} 