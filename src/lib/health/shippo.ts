export interface ShippoHealthResult {
  status: 'healthy' | 'unhealthy';
  apiVersion?: string;
  responseTime?: number;
  error?: string;
}

export async function checkShippoHealth(): Promise<ShippoHealthResult> {
  const start = Date.now();
  
  try {
    const shippo = await import('shippo');
    
    // Test with a simple address validation
    await shippo.default.address.validate({
      name: 'Test Address',
      street1: '123 Test St',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      country: 'US'
    });
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      apiVersion: '2018-02-08',
      responseTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
