'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  purchaseShippingLabel,
  refreshAndRetryLabel,
  forceRetryLabelPurchase,
  releaseLabelLock,
} from '@/app/actions/labels';
import { toast } from 'sonner';
import {
  RefreshCcw,
  Package,
  ExternalLink,
  AlertCircle,
  Download,
  RotateCcw,
  Unlock,
} from 'lucide-react';

interface ShippingLabelButtonProps {
  orderId: string;
  shippingRateId: string | null;
  trackingNumber: string | null;
  labelUrl: string | null;
  shippingCarrier: string | null;
  fulfillmentType: string | null;
  paymentStatus: string;
  retryCount?: number;
}

export function ShippingLabelButton({
  orderId,
  shippingRateId,
  trackingNumber,
  labelUrl,
  shippingCarrier,
  fulfillmentType,
  paymentStatus,
  retryCount = 0,
}: ShippingLabelButtonProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isForceRetrying, setIsForceRetrying] = useState(false);
  const [isReleasingLock, setIsReleasingLock] = useState(false);
  const [showForceRetry, setShowForceRetry] = useState(false);

  // Only show for nationwide shipping orders
  if (fulfillmentType !== 'nationwide_shipping') {
    return null;
  }

  const hasLabel = !!trackingNumber;
  const canCreateLabel = paymentStatus === 'PAID' && shippingRateId;
  const hasRetryIssues = retryCount > 0;

  const handleCreateLabel = async () => {
    if (!shippingRateId) {
      toast.error('No shipping rate ID found. Cannot create label.');
      return;
    }

    setIsCreating(true);
    try {
      const result = await purchaseShippingLabel(orderId, shippingRateId);

      if (result.success) {
        // Show success with label URL
        toast.success(`Label created! Tracking: ${result.trackingNumber}`, {
          duration: 10000,
          description: result.labelUrl
            ? `PDF URL: ${result.labelUrl}`
            : 'Check console for PDF URL',
        });

        // If we have a label URL, offer to download it immediately
        if (result.labelUrl) {
          const download = confirm('Download shipping label PDF now?');
          if (download) {
            window.open(result.labelUrl, '_blank');
          }
        }

        // Refresh the page to show updated data
        window.location.reload();
      } else {
        // Handle specific error cases
        if (result.errorCode === 'CONCURRENT_PROCESSING') {
          toast.warning('Label creation blocked', {
            description:
              'Another process may be in progress. Use "Force Retry" to bypass the lock.',
            duration: 8000,
          });
          // Show the Force Retry button so admin can bypass the lock
          setShowForceRetry(true);
        } else {
          toast.error(`Failed to create label: ${result.error}`);
          // Show Force Retry for other errors too
          setShowForceRetry(true);
        }
      }
    } catch (error) {
      console.error('Error creating label:', error);
      toast.error('Unexpected error creating label');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRefreshAndRetry = async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshAndRetryLabel(orderId);

      if (result.success) {
        toast.success(`Label created successfully! Tracking: ${result.trackingNumber}`);
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        toast.error(`Failed to refresh and retry: ${result.error}`);
      }
    } catch (error) {
      console.error('Error refreshing label:', error);
      toast.error('Unexpected error refreshing label');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleForceRetry = async () => {
    if (!shippingRateId) {
      toast.error('No shipping rate ID found. Cannot create label.');
      return;
    }

    setIsForceRetrying(true);
    try {
      const result = await forceRetryLabelPurchase(orderId, shippingRateId);

      if (result.success) {
        toast.success(`Label created! Tracking: ${result.trackingNumber}`, {
          duration: 10000,
          description: result.labelUrl
            ? `PDF URL: ${result.labelUrl}`
            : 'Check console for PDF URL',
        });

        if (result.labelUrl) {
          const download = confirm('Download shipping label PDF now?');
          if (download) {
            window.open(result.labelUrl, '_blank');
          }
        }

        window.location.reload();
      } else {
        toast.error(`Force retry failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in force retry:', error);
      toast.error('Unexpected error in force retry');
    } finally {
      setIsForceRetrying(false);
    }
  };

  const handleReleaseLock = async () => {
    setIsReleasingLock(true);
    try {
      const result = await releaseLabelLock(orderId);

      if (result.success) {
        toast.success('Lock released! You can now try creating the label again.', {
          duration: 5000,
        });
        // Reset UI state
        setShowForceRetry(false);
      } else {
        toast.error(`Failed to release lock: ${result.message}`);
      }
    } catch (error) {
      console.error('Error releasing lock:', error);
      toast.error('Unexpected error releasing lock');
    } finally {
      setIsReleasingLock(false);
    }
  };

  const openTrackingLink = () => {
    if (!trackingNumber || !shippingCarrier) return;

    let trackingUrl = '';
    const carrier = shippingCarrier.toLowerCase();

    if (carrier.includes('ups')) {
      trackingUrl = `https://www.ups.com/track?loc=en_US&tracknum=${trackingNumber}`;
    } else if (carrier.includes('fedex')) {
      trackingUrl = `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`;
    } else if (carrier.includes('usps')) {
      trackingUrl = `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`;
    } else if (carrier.includes('dhl')) {
      trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`;
    } else {
      // Generic search for unknown carriers
      trackingUrl = `https://www.google.com/search?q=${encodeURIComponent(`track package ${trackingNumber} ${shippingCarrier}`)}`;
    }

    window.open(trackingUrl, '_blank');
  };

  const downloadLabel = () => {
    if (!labelUrl) return;

    // Create a download link and trigger download
    const link = document.createElement('a');
    link.href = labelUrl;
    link.download = `shipping-label-${orderId}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4" />
        <span className="font-medium">Shipping Label</span>
        {hasRetryIssues && (
          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
            <AlertCircle className="h-3 w-3 mr-1" />
            {retryCount} retry{retryCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {hasLabel ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-300">
              Label Created
            </Badge>
            <div className="flex gap-2">
              {trackingNumber && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openTrackingLink}
                  className="text-xs h-7"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Track Package
                </Button>
              )}
              {labelUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadLabel}
                  className="text-xs h-7 bg-green-50 hover:bg-green-100 border-green-300 text-green-700"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download Label
                </Button>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <div>
              Tracking: <span className="font-mono">{trackingNumber}</span>
            </div>
            {shippingCarrier && <div>Carrier: {shippingCarrier}</div>}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {paymentStatus !== 'PAID' ? (
            <Badge variant="outline" className="text-gray-500">
              Waiting for payment
            </Badge>
          ) : !shippingRateId ? (
            <Badge variant="outline" className="text-red-500">
              No shipping rate ID
            </Badge>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={handleCreateLabel}
                disabled={isCreating || !canCreateLabel}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isCreating ? (
                  <>
                    <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Create Label
                  </>
                )}
              </Button>

              {hasRetryIssues && (
                <Button
                  onClick={handleRefreshAndRetry}
                  disabled={isRefreshing}
                  size="sm"
                  variant="outline"
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Refresh & Retry
                    </>
                  )}
                </Button>
              )}

              {/* Force Retry button - shown when Create Label fails or user has retry issues */}
              {(showForceRetry || hasRetryIssues) && (
                <>
                  <Button
                    onClick={handleForceRetry}
                    disabled={isForceRetrying || isReleasingLock}
                    size="sm"
                    variant="outline"
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {isForceRetrying ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        Forcing...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Force Retry
                      </>
                    )}
                  </Button>

                  {/* Release Lock button - clears lock without retrying */}
                  <Button
                    onClick={handleReleaseLock}
                    disabled={isReleasingLock || isForceRetrying}
                    size="sm"
                    variant="outline"
                    className="border-gray-300 text-gray-600 hover:bg-gray-50"
                    title="Release stuck lock without creating label"
                  >
                    {isReleasingLock ? (
                      <>
                        <Unlock className="h-4 w-4 mr-2 animate-pulse" />
                        Releasing...
                      </>
                    ) : (
                      <>
                        <Unlock className="h-4 w-4 mr-2" />
                        Release Lock
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}

          {hasRetryIssues && (
            <div className="text-xs text-gray-500">
              Previous attempts failed. Try &quot;Refresh &amp; Retry&quot; to get fresh shipping
              rates, or &quot;Force Retry&quot; to bypass the blocking lock.
            </div>
          )}

          {!hasRetryIssues && !showForceRetry && paymentStatus === 'PAID' && shippingRateId && (
            <div className="text-xs text-gray-500">
              Note: Labels are created automatically when payment is confirmed. Manual creation is
              for backup only.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
