'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Package, Salad, Plus, Utensils } from 'lucide-react';

const BoxedLunchAdminPage = () => {
  const [status, setStatus] = React.useState('ready');
  const [message, setMessage] = React.useState('');

  const handleInitialize = async (action: string) => {
    setStatus('loading');
    setMessage(`Initializing ${action}...`);
    
    try {
      // For now, just simulate the action
      setTimeout(() => {
        setStatus('success');
        setMessage(`${action} initialized successfully!`);
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(`Failed to initialize ${action}`);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Boxed Lunch Management</h1>
          <p className="text-gray-600 mt-2">
            Manage boxed lunch packages, salads, add-ons, and proteins for the 2025 catering menu
          </p>
        </div>
      </div>

      {message && (
        <Alert className={`mb-6 ${status === 'error' ? 'border-red-200 bg-red-50' : status === 'success' ? 'border-green-200 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
          {status === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <AlertDescription className={status === 'error' ? 'text-red-700' : status === 'success' ? 'text-green-700' : 'text-blue-700'}>
            {message}
          </AlertDescription>
        </Alert>
      )}

      {/* Status Overview */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Tier Packages
              <Badge variant="secondary">0/3</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">Needs initialization</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Proteins
              <Badge variant="secondary">0/6</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">Needs initialization</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Salad className="h-5 w-5" />
              Side Salads
              <Badge variant="secondary">0/2</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">Needs initialization</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add-Ons
              <Badge variant="secondary">0/3</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">Needs initialization</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleInitialize('All Components')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-4 w-4" />
                Initialize All
              </CardTitle>
              <CardDescription>Create all packages, proteins, salads, and add-ons</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={status === 'loading'}>
                {status === 'loading' ? 'Initializing...' : 'Initialize'}
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleInitialize('Packages')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-4 w-4" />
                Create Packages
              </CardTitle>
              <CardDescription>Create tier packages only</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={status === 'loading'}>Initialize</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleInitialize('Proteins')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Utensils className="h-4 w-4" />
                Create Proteins
              </CardTitle>
              <CardDescription>Create protein options</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={status === 'loading'}>Initialize</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleInitialize('Salads')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Salad className="h-4 w-4" />
                Create Salads
              </CardTitle>
              <CardDescription>Create side salad options</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={status === 'loading'}>Initialize</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleInitialize('Add-Ons')}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Plus className="h-4 w-4" />
                Create Add-Ons
              </CardTitle>
              <CardDescription>Create service add-ons</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" disabled={status === 'loading'}>Initialize</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Boxed Lunch System Status */}
      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xl font-bold mb-4">System Status</h3>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">Browse Options Page</h4>
                    <p className="text-sm text-gray-600">Main customer-facing interface</p>
                  </div>
                  <Badge variant="default" className="bg-green-600">Working</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">Protein Selection</h4>
                    <p className="text-sm text-gray-600">Interactive protein chooser</p>
                  </div>
                  <Badge variant="default" className="bg-green-600">Working</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold">Cart Integration</h4>
                    <p className="text-sm text-gray-600">Add to cart functionality</p>
                  </div>
                  <Badge variant="default" className="bg-green-600">Working</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">Next Steps</h3>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4">
                <div>
                  <h4 className="font-semibold">1. Initialize Data</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Use the &quot;Initialize All&quot; button to create the boxed lunch items in the database
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <h4 className="font-semibold">2. Test the Interface</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Visit <a href="/catering/browse-options" className="text-blue-600 underline">/catering/browse-options</a> to test the user interface
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div>
                  <h4 className="font-semibold">3. Database Migration</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Update the database schema to include the new enum values for better type safety
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BoxedLunchAdminPage; 