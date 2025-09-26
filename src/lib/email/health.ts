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

    return {
      status: 'healthy',
      domains: domainsResponse.data || []
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Email service check failed'
    };
  }
}
