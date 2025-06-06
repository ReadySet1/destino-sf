'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Database, 
  Square, 
  CheckCircle, 
  XCircle, 
  Info, 
  RefreshCw,
  Shield,
  Users,
  Settings
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface CateringDataSyncProps {
  totalLocalItems: number;
  totalLocalPackages: number;
  isDbConnected: boolean;
}

export const CateringDataSync: React.FC<CateringDataSyncProps> = ({
  totalLocalItems,
  totalLocalPackages,
  isDbConnected
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Catering Data Management
              </CardTitle>
              <CardDescription>
                Local catering items and packages - separate from Square POS
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Info className="h-4 w-4 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Local Database Status */}
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${isDbConnected ? 'bg-green-100' : 'bg-red-100'}`}>
                <Database className={`h-4 w-4 ${isDbConnected ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <div>
                <div className="font-medium">Local Database</div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  {isDbConnected ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Connected
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 text-red-600" />
                      Disconnected
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Local Items Count */}
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium">{totalLocalItems} Items</div>
                <div className="text-sm text-gray-500">Catering menu items</div>
              </div>
            </div>

            {/* Local Packages Count */}
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-purple-100">
                <Settings className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-medium">{totalLocalPackages} Packages</div>
                <div className="text-sm text-gray-500">Catering packages</div>
              </div>
            </div>
          </div>

          {/* Square Separation Notice */}
          <Separator className="my-6" />
          
          <Alert>
            <Square className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> The catering items and packages managed here are stored locally and are separate from your Square POS products. 
              This prevents conflicts with Square inventory and allows for specialized catering pricing and package configurations.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Detailed Information */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Data Source Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Local Catering Data */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Database className="h-4 w-4 text-green-600" />
                Local Catering Database
                <Badge variant="secondary">Recommended</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Specialized catering pricing and packaging options</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Custom dietary options and serving size information</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Package configurations with multiple items</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>No conflicts with Square POS inventory</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Independent pricing from restaurant menu</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Square Integration */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Square className="h-4 w-4 text-gray-600" />
                Square POS Products
                <Badge variant="outline">Restaurant Menu</Badge>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-3 w-3 text-blue-600" />
                  <span>Used for in-restaurant orders and regular menu items</span>
                </div>
                <div className="flex items-center gap-2">
                  <Info className="h-3 w-3 text-blue-600" />
                  <span>Synced automatically from Square POS system</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  <span>May not have catering-specific configurations</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-600" />
                  <span>Pricing may not be suitable for catering volumes</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Best Practices */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                Best Practices
              </h4>
              <div className="space-y-2 text-sm text-gray-700">
                <div>• Use the local catering database for all catering-specific items and packages</div>
                <div>• Set catering-appropriate pricing that reflects bulk/event service</div>
                <div>• Include detailed descriptions and dietary information for customer clarity</div>
                <div>• Use high-quality images that showcase the catering presentation</div>
                <div>• Create packages that simplify ordering for common event sizes</div>
                <div>• Keep Square POS products separate for restaurant operations</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 