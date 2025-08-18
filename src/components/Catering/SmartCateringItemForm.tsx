'use client';

import React from 'react';

interface SmartCateringItemFormProps {
  itemId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const SmartCateringItemForm: React.FC<SmartCateringItemFormProps> = ({
  itemId,
  onSuccess,
  onCancel,
}) => {
  // This component is temporarily disabled since individual catering item management
  // has been removed in favor of Square integration
  return (
    <div className="text-center py-8">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">
        Smart Catering Item Form Disabled
      </h3>
      <p className="text-gray-600">
        Individual catering items are now managed through our Square integration. 
        This form has been temporarily disabled.
      </p>
      {onCancel && (
        <button 
          onClick={onCancel}
          className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Close
        </button>
      )}
    </div>
  );
};