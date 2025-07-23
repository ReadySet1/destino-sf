import React from 'react';
import { formatOrderNotes } from '@/lib/email-utils';

interface FormattedNotesProps {
  notes: string | null;
  showRaw?: boolean;
  className?: string;
}

export function FormattedNotes({ notes, showRaw = false, className = '' }: FormattedNotesProps) {
  if (!notes) {
    return null;
  }

  const formattedNotes = formatOrderNotes(notes);

  if (showRaw) {
    return (
      <div className={className}>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
          {notes}
        </pre>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Shipping Address Section */}
      {formattedNotes.hasShippingAddress && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Shipping Address:</h4>
          <div className="bg-blue-50 p-3 rounded-md">
            <pre className="text-sm text-gray-800 whitespace-pre-line font-sans">
              {formattedNotes.shippingAddress}
            </pre>
          </div>
        </div>
      )}

      {/* Special Notes Section */}
      {formattedNotes.otherNotes && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Special Requests:</h4>
          <div className="bg-yellow-50 p-3 rounded-md">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {formattedNotes.otherNotes}
            </p>
          </div>
        </div>
      )}

      {/* If no structured data found, show as plain text */}
      {!formattedNotes.hasShippingAddress && !formattedNotes.otherNotes && (
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-800 whitespace-pre-wrap">
            {notes}
          </p>
        </div>
      )}
    </div>
  );
} 