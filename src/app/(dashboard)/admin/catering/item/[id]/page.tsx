import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCateringItemPage({ params }: PageProps) {
  // Since individual catering item management has been removed in favor of Square integration,
  // this page now shows an informational message
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/catering" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Catering
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Catering Item Management</h1>
            <p className="text-gray-600 mt-2">System has been updated</p>
          </div>
        </div>
      </div>

      <Alert className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Individual catering item management has been removed</strong>
          <br />
          Our catering system has been updated to use Square integration for all individual items. 
          This provides better synchronization and eliminates the need for local item management.
          <br /><br />
          You can still manage catering packages and orders through the main catering admin page.
        </AlertDescription>
      </Alert>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">
          What Changed?
        </h2>
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
    </div>
  );
}
