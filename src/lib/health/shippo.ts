export interface ShippoHealthResult {
  status: 'healthy' | 'unhealthy';
  apiVersion?: string;
  responseTime?: number;
  error?: string;
}

export async function checkShippoHealth(): Promise<ShippoHealthResult> {
  const start = Date.now();

  try {
    const { ShippoClientManager } = await import('@/lib/shippo/client');

    // Validate the connection using the centralized client manager
    const validation = await ShippoClientManager.validateConnection();

    if (!validation.connected) {
      return {
        status: 'unhealthy',
        error: validation.error || 'Shippo connection failed',
      };
    }

    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      apiVersion: validation.version,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
