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
    // Use Shippo directly for label creation
    const shippo = await import('shippo');
    
    const transaction = await shippo.default.transaction.create({
      rate: params.rateId,
      label_file_type: params.labelFileType === 'PDF' ? 'PDF_4x6' : params.labelFileType,
    });

    if (transaction.status === 'SUCCESS' && transaction.label_url && transaction.tracking_number) {
      return {
        success: true,
        labelUrl: transaction.label_url,
        trackingNumber: transaction.tracking_number
      };
    } else {
      const errorMessage = transaction.messages?.map((m: any) => m.text).join(', ') || 
                          `Transaction failed with status: ${transaction.status}`;
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
