'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface TestResult {
  url: string;
  status: number;
  contentType?: string;
  isSuccess: boolean;
  error?: string;
}

export function TestSquareImage() {
  const [imageId, setImageId] = useState('3abab40863f0ded13e7f1c53f1a66dc2ada6307c');
  const [fileName, setFileName] = useState('original.jpeg');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  // Test multiple URL formats to see which one works
  const testImageUrls = async () => {
    setIsLoading(true);
    const newResults: TestResult[] = [];

    // List of URL formats to try based on Square documentation and observed patterns
    const urlFormats = [
      // Current format
      `https://square-catalog-production.s3.amazonaws.com/files/${imageId}/${fileName}`,
      
      // Alternative formats to try
      `https://items-images-production.s3.us-west-2.amazonaws.com/files/${imageId}/${fileName}`,
      
      // Try with different structure 
      `https://square-catalog-production.s3.amazonaws.com/${imageId}/${fileName}`,
      
      // Try square-items format
      `https://square-items-production.s3.amazonaws.com/files/${imageId}/${fileName}`,
      
      // Try without files directory
      `https://square-catalog-production.s3.amazonaws.com/${imageId}/${fileName}`,
      
      // Try with square sandbox
      `https://square-catalog-sandbox.s3.amazonaws.com/files/${imageId}/${fileName}`,
      
      // Try original format with proxy
      `/api/proxy/image?url=${Buffer.from(`https://items-images-production.s3.us-west-2.amazonaws.com/files/${imageId}/${fileName}`).toString('base64')}`,
    ];

    // Test each URL
    for (const url of urlFormats) {
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          headers: {
            'Accept': 'image/*'
          }
        });
        
        newResults.push({
          url,
          status: response.status,
          contentType: response.headers.get('content-type') || undefined,
          isSuccess: response.ok && (response.headers.get('content-type') || '').startsWith('image/'),
          error: response.ok ? undefined : response.statusText
        });
      } catch (error) {
        newResults.push({
          url,
          status: 0,
          isSuccess: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    setResults(newResults);
    setIsLoading(false);
  };
  
  // Direct Square API call to get the correct image URL 
  const fetchFromSquareApi = async () => {
    try {
      setIsLoading(true);
      
      // Example image ID: EC2ZW4Y6E7QBQJUY6QCCPABD
      const response = await fetch(`/api/square/check-image?imageId=${imageId}`);
      const data = await response.json();
      
      if (data.success && data.image?.originalUrl) {
        // Add the actual URL from Square API to our results
        setResults(prev => [
          ...prev,
          {
            url: data.image.originalUrl,
            status: 200,
            contentType: 'From Square API',
            isSuccess: true,
            error: undefined
          }
        ]);
      } else {
        setResults(prev => [
          ...prev,
          {
            url: 'Square API Check',
            status: 404,
            isSuccess: false,
            error: data.error || 'Could not get image URL from Square API'
          }
        ]);
      }
    } catch (error) {
      setResults(prev => [
        ...prev,
        {
          url: 'Square API Check',
          status: 500,
          isSuccess: false,
          error: error instanceof Error ? error.message : String(error)
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Clear previous results
  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <h2 className="text-lg font-semibold">Square Image URL Tester</h2>
      
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm font-medium">Image ID</label>
            <Input
              value={imageId}
              onChange={(e) => setImageId(e.target.value)}
              placeholder="e.g., 3abab40863f0ded13e7f1c53f1a66dc2ada6307c"
            />
          </div>
          <div>
            <label className="text-sm font-medium">File Name</label>
            <Input
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., original.jpeg"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={testImageUrls} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Test URL Formats
          </Button>
          <Button onClick={fetchFromSquareApi} disabled={isLoading} variant="outline">
            Check Square API
          </Button>
          <Button onClick={clearResults} variant="ghost" size="sm">
            Clear
          </Button>
        </div>
      </div>
      
      {results.length > 0 && (
        <div className="space-y-2 text-sm">
          <h3 className="font-medium">Results:</h3>
          {results.map((result, idx) => (
            <div key={idx} className={`p-2 rounded ${result.isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
              <p><strong>URL:</strong> {result.url}</p>
              <p><strong>Status:</strong> {result.status}</p>
              {result.contentType && <p><strong>Content Type:</strong> {result.contentType}</p>}
              {result.error && <p><strong>Error:</strong> {result.error}</p>}
              
              {result.isSuccess && !result.url.startsWith('/api') && (
                <div className="mt-2">
                  <p><strong>Preview:</strong></p>
                  <img 
                    src={result.url} 
                    alt="Test" 
                    className="h-20 w-20 object-cover border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 