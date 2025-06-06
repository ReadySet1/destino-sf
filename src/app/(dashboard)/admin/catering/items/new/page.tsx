import React from 'react';
import { SmartCateringItemForm } from '@/components/Catering/SmartCateringItemForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Database } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function NewCateringItemPage() {
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add New Catering Item</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Create a new local catering item with full editing control.
              </p>
            </div>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Database className="h-3 w-3" />
              <span>Local Item</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <SmartCateringItemForm />
        </CardContent>
      </Card>
    </div>
  );
} 