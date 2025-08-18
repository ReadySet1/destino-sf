import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ViewCateringItemPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ViewCateringItemPage({ params }: ViewCateringItemPageProps) {
  // Since individual catering item viewing has been removed in favor of Square integration,
  // this page now shows an informational message
  
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
          <CardTitle>Individual Catering Item Viewing</CardTitle>
          <p className="text-sm text-gray-600">
            This feature has been updated to use Square integration
          </p>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Individual catering item viewing has been removed</strong>
              <br />
              Our catering system has been updated to use Square integration for all individual items. 
              This provides better synchronization and eliminates the need for local item management.
              <br /><br />
              You can still manage catering packages and orders through the main catering admin page.
            </AlertDescription>
          </Alert>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4">
              What Changed?
            </h3>
            <ul className="text-blue-700 space-y-2">
              <li>• Individual catering items are now managed through Square</li>
              <li>• No more duplicate data management</li>
              <li>• Automatic price and inventory synchronization</li>
              <li>• Better customer experience with real-time availability</li>
            </ul>
          </div>

          <div className="mt-6 text-center">
            <Button asChild>
              <Link href="/admin/catering">
                Return to Catering Admin
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
