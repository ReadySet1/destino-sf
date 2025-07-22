'use client';

import { useState } from 'react';
import { Settings, Zap, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Note: Using HTML range input instead of custom Slider component

interface SyncTestingPanelProps {
  onTestSync: (options: TestSyncOptions) => void;
  disabled?: boolean;
}

interface TestSyncOptions {
  mockMode: boolean;
  batchSize: 'small' | 'medium' | 'large';
  includeImages: boolean;
  simulateError: boolean;
  customDuration: number;
}

export function SyncTestingPanel({ onTestSync, disabled }: SyncTestingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testOptions, setTestOptions] = useState<TestSyncOptions>({
    mockMode: true,
    batchSize: 'medium',
    includeImages: true,
    simulateError: false,
    customDuration: 25
  });

  const handleTestSync = () => {
    onTestSync(testOptions);
  };

  const handleDurationChange = (value: number[]) => {
    setTestOptions(prev => ({ ...prev, customDuration: value[0] }));
  };

  if (!isExpanded) {
    return (
      <Card className="border-dashed border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-blue-900">Testing Mode</h3>
                <p className="text-sm text-blue-600">Test sync without hitting Square APIs</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="border-blue-200 text-blue-700 hover:bg-blue-100"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure Test
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Testing Configuration</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-blue-600 hover:bg-blue-100"
          >
            ✕
          </Button>
        </div>
        <CardDescription className="text-blue-700">
          Configure and test the sync functionality without consuming Square API rate limits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mock Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-blue-100">
          <div className="flex items-center gap-3">
            <Zap className="h-4 w-4 text-blue-600" />
            <div>
              <Label htmlFor="mock-mode" className="font-medium">Mock Mode</Label>
              <p className="text-sm text-muted-foreground">Simulate sync without real API calls</p>
            </div>
          </div>
          <Switch
            id="mock-mode"
            checked={testOptions.mockMode}
            onCheckedChange={(checked) => 
              setTestOptions(prev => ({ ...prev, mockMode: checked }))
            }
          />
        </div>

        {testOptions.mockMode && (
          <>
            {/* Test Duration */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <Label>Test Duration: {testOptions.customDuration} seconds</Label>
              </div>
              <input
                type="range"
                value={testOptions.customDuration}
                onChange={(e) => handleDurationChange([parseInt(e.target.value)])}
                max={60}
                min={5}
                step={5}
                className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5s (Quick)</span>
                <span>30s (Normal)</span>
                <span>60s (Long)</span>
              </div>
            </div>

            {/* Batch Size */}
            <div className="space-y-2">
              <Label>Batch Size (affects mock product count)</Label>
              <Select
                value={testOptions.batchSize}
                onValueChange={(value: 'small' | 'medium' | 'large') =>
                  setTestOptions(prev => ({ ...prev, batchSize: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (25 products)</SelectItem>
                  <SelectItem value="medium">Medium (50 products)</SelectItem>
                  <SelectItem value="large">Large (100 products)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Images */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="include-images">Include Image Updates</Label>
                <p className="text-sm text-muted-foreground">Simulate image processing</p>
              </div>
              <Switch
                id="include-images"
                checked={testOptions.includeImages}
                onCheckedChange={(checked) => 
                  setTestOptions(prev => ({ ...prev, includeImages: checked }))
                }
              />
            </div>

            {/* Simulate Error */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <div>
                  <Label htmlFor="simulate-error">Simulate Error</Label>
                  <p className="text-sm text-muted-foreground">Test error handling (30% chance)</p>
                </div>
              </div>
              <Switch
                id="simulate-error"
                checked={testOptions.simulateError}
                onCheckedChange={(checked) => 
                  setTestOptions(prev => ({ ...prev, simulateError: checked }))
                }
              />
            </div>
          </>
        )}

        {/* Warning Alert */}
        {!testOptions.mockMode && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Warning:</strong> Mock mode is disabled. This will make real API calls to Square 
              and consume your rate limits.
            </AlertDescription>
          </Alert>
        )}

        {/* Test Sync Button */}
        <Button 
          onClick={handleTestSync}
          disabled={disabled}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {testOptions.mockMode ? (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Start Test Sync ({testOptions.customDuration}s)
            </>
          ) : (
            <>
              <Settings className="mr-2 h-4 w-4" />
              Start Real Sync
            </>
          )}
        </Button>

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-white p-3 rounded border border-blue-100">
          <p className="font-medium mb-1">💡 Testing Benefits:</p>
          <ul className="space-y-1">
            <li>• No Square API rate limit consumption</li>
            <li>• Controllable test duration and scenarios</li>
            <li>• Safe error simulation</li>
            <li>• Full UI and database testing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 