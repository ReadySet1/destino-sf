export interface EmailHealthResult {
  status: 'healthy' | 'unhealthy';
  domains?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  error?: string;
}

export async function checkEmailServiceHealth(): Promise<EmailHealthResult> {
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Check domain status
    const domainsResponse = await resend.domains.list();

    if (domainsResponse.error) {
      return {
        status: 'unhealthy',
        error: domainsResponse.error.message
      };
    }

    // Map the response data to the expected format
    const domains = Array.isArray(domainsResponse.data) 
      ? domainsResponse.data.map((domain: any) => ({
          id: domain.id || '',
          name: domain.name || '',
          status: domain.status || 'unknown'
        }))
      : [];

    return {
      status: 'healthy',
      domains
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Email service check failed'
    };
  }
}
