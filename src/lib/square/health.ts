export interface SquareHealthResult {
  status: 'healthy' | 'unhealthy';
  error?: string;
}

export async function checkSquareConnection(): Promise<SquareHealthResult> {
  try {
    const { squareClient } = await import('@/lib/square/client');
    
    // Test connection by retrieving first location
    const response = await squareClient.locationsApi.listLocations();
    
    if (response.result.locations && response.result.locations.length > 0) {
      return {
        status: 'healthy'
      };
    } else {
      return {
        status: 'unhealthy',
        error: 'No locations found'
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Square connection failed'
    };
  }
}
