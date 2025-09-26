export interface TrackingParams {
  trackingNumber: string;
  carrier: string;
}

export interface TrackingResult {
  success: boolean;
  status?: string;
  history?: any[];
  error?: string;
}

export async function trackShipment(params: TrackingParams): Promise<TrackingResult> {
  try {
    const shippo = await import('shippo');
    
    const tracking = await shippo.default.track.get_status(params.carrier, params.trackingNumber);
    
    return {
      success: true,
      status: tracking.tracking_status?.status,
      history: tracking.tracking_history || []
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tracking failed'
    };
  }
}
