'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, X } from 'lucide-react';
import { BulkRuleModal } from './BulkRuleModal';
import { cn } from '@/lib/utils';

interface BulkRuleActionsProps {
  selectedProductIds: string[];
  productNames: string[];
  onClearSelection: () => void;
  onSuccess?: () => void;
  className?: string;
}

export function BulkRuleActions({
  selectedProductIds,
  productNames,
  onClearSelection,
  onSuccess,
  className
}: BulkRuleActionsProps) {
  const [showModal, setShowModal] = useState(false);

  if (selectedProductIds.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-2",
          className
        )}
      >
        <div className="bg-gray-900 text-white rounded-full shadow-2xl border border-gray-700 px-6 py-3 flex items-center gap-4">
          {/* Selection Count */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30">
              {selectedProductIds.length}
            </Badge>
            <span className="text-sm font-medium">
              product{selectedProductIds.length !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-6 bg-gray-700" />

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Rules
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              className="hover:bg-white/10 text-white"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Rule Modal */}
      <BulkRuleModal
        open={showModal}
        onOpenChange={setShowModal}
        selectedProductIds={selectedProductIds}
        productNames={productNames}
        onSuccess={() => {
          onSuccess?.();
          onClearSelection();
        }}
      />
    </>
  );
}
