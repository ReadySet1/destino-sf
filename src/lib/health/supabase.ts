export interface SupabaseHealthResult {
  status: 'healthy' | 'unhealthy';
  services?: {
    auth: 'healthy' | 'unhealthy';
    database?: 'healthy' | 'unhealthy';
    storage?: 'healthy' | 'unhealthy';
  };
  responseTime?: number;
  error?: string;
}

export async function checkSupabaseHealth(): Promise<SupabaseHealthResult> {
  const start = Date.now();
  
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    // Test auth service
    const { data, error } = await supabase.auth.getUser();
    
    if (error && error.message !== 'Invalid JWT') {
      throw error;
    }
    
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      services: {
        auth: 'healthy'
      },
      responseTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
