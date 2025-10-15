export interface IntegrationHealthCheck {
  square: {
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
  email: {
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
  sentry: {
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
  supabase: {
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
  redis: {
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
  shippo: {
    status: 'healthy' | 'unhealthy';
    error?: string;
  };
  overall: {
    status: 'healthy' | 'unhealthy' | 'degraded';
    failedServices?: string[];
  };
}

export async function performIntegrationHealthCheck(): Promise<IntegrationHealthCheck> {
  const results: IntegrationHealthCheck = {
    square: { status: 'healthy' },
    email: { status: 'healthy' },
    sentry: { status: 'healthy' },
    supabase: { status: 'healthy' },
    redis: { status: 'healthy' },
    shippo: { status: 'healthy' },
    overall: { status: 'healthy' },
  };

  const failedServices: string[] = [];

  // Check Square
  try {
    const { checkSquareConnection } = await import('@/lib/square/health');
    const squareHealth = await checkSquareConnection();
    results.square = squareHealth;
    if (squareHealth.status === 'unhealthy') {
      failedServices.push('square');
    }
  } catch (error) {
    results.square = { status: 'unhealthy', error: 'Square check failed' };
    failedServices.push('square');
  }

  // Check Email (simplified)
  try {
    // Just check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured');
    }
    results.email = { status: 'healthy' };
  } catch (error) {
    results.email = { status: 'unhealthy', error: 'Email service not configured' };
    failedServices.push('email');
  }

  // Check Sentry
  try {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      throw new Error('Sentry DSN not configured');
    }
    results.sentry = { status: 'healthy' };
  } catch (error) {
    results.sentry = { status: 'unhealthy', error: 'Sentry not configured' };
    failedServices.push('sentry');
  }

  // Check Supabase
  try {
    const { checkSupabaseHealth } = await import('@/lib/health/supabase');
    const supabaseHealth = await checkSupabaseHealth();
    results.supabase = supabaseHealth;
    if (supabaseHealth.status === 'unhealthy') {
      failedServices.push('supabase');
    }
  } catch (error) {
    results.supabase = { status: 'unhealthy', error: 'Supabase check failed' };
    failedServices.push('supabase');
  }

  // Check Redis
  try {
    const { checkRedisHealth } = await import('@/lib/health/redis');
    const redisHealth = await checkRedisHealth();
    results.redis = redisHealth;
    if (redisHealth.status === 'unhealthy') {
      failedServices.push('redis');
    }
  } catch (error) {
    results.redis = { status: 'unhealthy', error: 'Redis check failed' };
    failedServices.push('redis');
  }

  // Check Shippo
  try {
    const { checkShippoHealth } = await import('@/lib/health/shippo');
    const shippoHealth = await checkShippoHealth();
    results.shippo = shippoHealth;
    if (shippoHealth.status === 'unhealthy') {
      failedServices.push('shippo');
    }
  } catch (error) {
    results.shippo = { status: 'unhealthy', error: 'Shippo check failed' };
    failedServices.push('shippo');
  }

  // Determine overall status
  if (failedServices.length === 0) {
    results.overall = { status: 'healthy' };
  } else if (failedServices.length < 3) {
    results.overall = { status: 'degraded', failedServices };
  } else {
    results.overall = { status: 'unhealthy', failedServices };
  }

  return results;
}
