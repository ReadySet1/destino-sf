export interface CreateShippingLabelParams {
  rateId: string;
  labelFileType: 'PDF' | 'PNG' | 'ZPL';
}

export interface ShippingLabelResult {
  success: boolean;
  labelUrl?: string;
  trackingNumber?: string;
  error?: string;
}

export async function createShippingLabel(params: CreateShippingLabelParams): Promise<ShippingLabelResult> {
  try {
    const { ShippoClientManager } = await import('@/lib/shippo/client');
    const shippoClient = ShippoClientManager.getInstance();
    
    if (!shippoClient) {
      return {
        success: false,
        error: 'Shippo client not available'
      };
    }
    
    // Note: This is a placeholder for transaction creation
    // The actual Shippo SDK v2.15+ API structure may be different
    // This would need to be updated based on the actual Shippo v2.15+ documentation
    const transaction = await shippoClient.transactions?.create?.({
      rate: params.rateId,
      label_file_type: params.labelFileType === 'PDF' ? 'PDF_4x6' : params.labelFileType,
    });

    if (transaction?.status === 'SUCCESS' && transaction.label_url && transaction.tracking_number) {
      return {
        success: true,
        labelUrl: transaction.label_url,
        trackingNumber: transaction.tracking_number
      };
    } else {
      const errorMessage = transaction?.messages?.map((m: any) => m.text).join(', ') || 
                          `Transaction failed with status: ${transaction?.status}`;
      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create shipping label'
    };
  }
}
