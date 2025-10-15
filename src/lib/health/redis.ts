export interface RedisHealthResult {
  status: 'healthy' | 'unhealthy';
  connected?: boolean;
  responseTime?: number;
  error?: string;
}

export async function checkRedisHealth(): Promise<RedisHealthResult> {
  const start = Date.now();

  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    await redis.ping();

    const responseTime = Date.now() - start;

    return {
      status: 'healthy',
      connected: true,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
