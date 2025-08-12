import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { SyncSquareButton } from '../products/sync-square';
import { FilteredSyncButton } from '../products/filtered-sync-button';
import { EnhancedSyncButton } from '../products/enhanced-sync-button';
import { ProductTools } from '../products/components/ProductTools';

export const metadata = {
  title: 'Square Sync | Admin',
  description: 'Synchronize products and catering items with Square',
};

export default async function SquareSyncPage() {
  // Check authentication
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login');
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">Square Synchronization</h1>
        <p className="mt-2 text-gray-600">
          Manage product and catering item synchronization with Square POS system
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Complete Sync</h3>
          <p className="text-blue-700 text-sm">
            Full synchronization of all products, images, and catering setup from Square.
          </p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">Filtered Sync</h3>
          <p className="text-green-700 text-sm">
            Sync only alfajores and empanadas while protecting catering items.
          </p>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">Enhanced Sync</h3>
          <p className="text-purple-700 text-sm">
            Sync ALL missing catering items while intelligently protecting existing data.
          </p>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important Notice</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">
                Products can only be edited in Square Dashboard. These sync tools update your local database 
                with changes from Square.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Always test syncs on development environment first</li>
                <li>Existing catering appetizers, empanadas, and alfajores are protected</li>
                <li>Use Enhanced Sync to add missing items without affecting existing data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Enhanced Sync - Highlighted as recommended */}
        <div className="col-span-full">
          <div className="bg-white border-2 border-purple-200 rounded-lg shadow-lg">
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-purple-900">
                  🌟 Enhanced Sync (Recommended)
                </h2>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Smart Sync
                </span>
              </div>
              <p className="mt-2 text-purple-700">
                Intelligently syncs ALL missing catering items while protecting your existing data structure.
              </p>
            </div>
            <div className="p-6">
              <EnhancedSyncButton />
            </div>
          </div>
        </div>

        {/* Complete Sync */}
        <div className="bg-white border border-gray-200 rounded-lg shadow">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
            <h2 className="text-xl font-semibold text-blue-900">Complete Sync</h2>
            <p className="mt-1 text-blue-700">
              Full synchronization including product setup and catering restoration.
            </p>
          </div>
          <div className="p-6">
            <SyncSquareButton />
          </div>
        </div>

        {/* Filtered Sync */}
        <div className="bg-white border border-gray-200 rounded-lg shadow">
          <div className="bg-green-50 px-6 py-4 border-b border-green-200">
            <h2 className="text-xl font-semibold text-green-900">Filtered Sync</h2>
            <p className="mt-1 text-green-700">
              Selective sync for alfajores and empanadas only.
            </p>
          </div>
          <div className="p-6">
            <FilteredSyncButton />
          </div>
        </div>

        {/* Product Tools */}
        <div className="col-span-full">
          <div className="bg-white border border-gray-200 rounded-lg shadow">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Additional Tools</h2>
              <p className="mt-1 text-gray-700">
                Additional utilities for product and image management.
              </p>
            </div>
            <div className="p-6">
              <ProductTools />
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow mt-8">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Sync Options Guide</h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-purple-900">🌟 When to use Enhanced Sync</h3>
              <p className="text-gray-700 mt-1">
                Use this when you want to add new catering items from Square without affecting existing data. 
                Perfect for adding missing entrees, sides, desserts, or share platters.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-blue-900">When to use Complete Sync</h3>
              <p className="text-gray-700 mt-1">
                Use for major updates when you want to sync everything from Square including new categories, 
                products, and full catering setup restoration.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-green-900">When to use Filtered Sync</h3>
              <p className="text-gray-700 mt-1">
                Use when you only want to update individual products (alfajores and empanadas) 
                without touching catering categories.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}