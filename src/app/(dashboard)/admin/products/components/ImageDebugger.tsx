'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface DebugResult {
  url: string;
  status: number;
  statusText: string;
  contentType?: string;
  isImage: boolean;
  error?: string;
}

export function ImageDebugger() {
  const [url, setUrl] = useState('');
  const [encodedUrl, setEncodedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<DebugResult[]>([]);
  const [squareId, setSquareId] = useState('');
  const [productImages, setProductImages] = useState<any[]>([]);

  const encodeUrl = () => {
    if (!url) return;
    const encoded = Buffer.from(url).toString('base64');
    setEncodedUrl(encoded);
  };

  const testImageUrl = async () => {
    setIsLoading(true);
    try {
      const newResults: DebugResult[] = [];

      // Test the direct URL
      try {
        const directResponse = await fetch(url, {
          method: 'HEAD',
          headers: {
            Accept: 'image/*',
            'User-Agent': 'Mozilla/5.0 (compatible; DestinoSFApp/1.0)',
          },
        });
        newResults.push({
          url: url,
          status: directResponse.status,
          statusText: directResponse.statusText,
          contentType: directResponse.headers.get('content-type') || undefined,
          isImage: (directResponse.headers.get('content-type') || '').startsWith('image/'),
        });
      } catch (error) {
        newResults.push({
          url: url,
          status: 0,
          statusText: 'Network Error',
          isImage: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Try converting S3 URL to Square CDN format
      if (url.includes('items-images-production.s3') || url.includes('amazonaws.com')) {
        // Extract file path from the URL
        const filePathMatch = url.match(/\/files\/([^\/]+)\/([^\/\?]+)/);

        if (filePathMatch && filePathMatch.length >= 3) {
          const fileId = filePathMatch[1];
          const fileName = filePathMatch[2];

          // Square CDN URL format
          const squareUrl = `https://square-catalog-production.s3.amazonaws.com/files/${fileId}/${fileName}`;

          try {
            const squareResponse = await fetch(squareUrl, { method: 'HEAD' });
            newResults.push({
              url: squareUrl,
              status: squareResponse.status,
              statusText: squareResponse.statusText,
              contentType: squareResponse.headers.get('content-type') || undefined,
              isImage: (squareResponse.headers.get('content-type') || '').startsWith('image/'),
            });
          } catch (error) {
            newResults.push({
              url: squareUrl,
              status: 0,
              statusText: 'Network Error',
              isImage: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // Test the proxied URL
      const encoded = Buffer.from(url).toString('base64');
      const proxiedUrl = `/api/proxy/image?url=${encoded}`;
      try {
        const proxyResponse = await fetch(proxiedUrl, { method: 'HEAD' });
        newResults.push({
          url: proxiedUrl,
          status: proxyResponse.status,
          statusText: proxyResponse.statusText,
          contentType: proxyResponse.headers.get('content-type') || undefined,
          isImage: (proxyResponse.headers.get('content-type') || '').startsWith('image/'),
        });
      } catch (error) {
        newResults.push({
          url: proxiedUrl,
          status: 0,
          statusText: 'Network Error',
          isImage: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      setResults(newResults);
    } finally {
      setIsLoading(false);
    }
  };

  const checkSquareItem = async () => {
    if (!squareId) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/square/check-image?objectId=${squareId}`);
      const data = await response.json();

      if (data.success && data.images) {
        setProductImages(data.images);
      } else {
        setProductImages([{ error: data.error || 'Failed to fetch images' }]);
      }
    } catch (error) {
      setProductImages([
        {
          error: error instanceof Error ? error.message : 'Failed to fetch images',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-md bg-muted/20">
      <h2 className="text-lg font-semibold">Image URL Debugger</h2>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Test Image URL</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter image URL to test"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={encodeUrl} variant="outline" size="sm">
            Encode
          </Button>
          <Button onClick={testImageUrl} disabled={isLoading} size="sm">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Test
          </Button>
        </div>

        {encodedUrl && (
          <div className="text-xs overflow-x-auto p-2 bg-slate-100 rounded">
            <p>Encoded: {encodedUrl}</p>
            <p>Proxy URL: /api/proxy/image?url={encodedUrl}</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 text-sm">
            <h4 className="font-medium">Results:</h4>
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${result.isImage ? 'bg-green-100' : 'bg-red-100'}`}
              >
                <p>
                  <strong>URL:</strong> {result.url.startsWith('/api') ? 'Proxy URL' : 'Direct URL'}
                </p>
                <p>
                  <strong>Status:</strong> {result.status} {result.statusText}
                </p>
                {result.contentType && (
                  <p>
                    <strong>Content Type:</strong> {result.contentType}
                  </p>
                )}
                {result.error && (
                  <p>
                    <strong>Error:</strong> {result.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 pt-4 border-t">
        <h3 className="text-sm font-medium">Check Square Item</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter Square Item ID"
            value={squareId}
            onChange={e => setSquareId(e.target.value)}
            className="flex-1"
          />
          <Button onClick={checkSquareItem} disabled={isLoading} size="sm">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Check
          </Button>
        </div>

        {productImages.length > 0 && (
          <div className="space-y-2 text-sm">
            <h4 className="font-medium">Square Images:</h4>
            {productImages.map((image, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${image.error ? 'bg-red-100' : 'bg-green-100'}`}
              >
                {image.error ? (
                  <p>
                    <strong>Error:</strong> {image.error}
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>ID:</strong> {image.id}
                    </p>
                    <p>
                      <strong>Name:</strong> {image.name}
                    </p>
                    <p className="text-xs break-all">
                      <strong>URL:</strong> {image.originalUrl}
                    </p>
                    {image.originalUrl && (
                      <div className="mt-2">
                        <p>
                          <strong>Image Preview:</strong>
                        </p>
                        <div className="flex gap-4">
                          <div>
                            <p className="text-xs">Direct:</p>
                            <Image
                              src={image.originalUrl}
                              alt="Direct image preview"
                              width={80}
                              height={80}
                              className="h-20 w-20 object-cover border"
                              onError={e => {
                                const target = e.target as HTMLImageElement;
                                target.src =
                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                          <div>
                            <p className="text-xs">Proxied:</p>
                            <Image
                              src={image.proxiedUrl}
                              alt="Proxied image preview"
                              width={80}
                              height={80}
                              className="h-20 w-20 object-cover border"
                              onError={e => {
                                const target = e.target as HTMLImageElement;
                                target.src =
                                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%23ef4444' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E";
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
