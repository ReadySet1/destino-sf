'use client';

import { ArchiveToggleButton } from '../../components/ArchiveToggleButton';
import Link from 'next/link';

interface ProductEditActionsProps {
  productId: string;
  productName: string;
  isArchived: boolean;
}

export function ProductEditActions({ productId, productName, isArchived }: ProductEditActionsProps) {
  return (
    <div className="flex-shrink-0 flex gap-3">
      <ArchiveToggleButton
        productId={productId}
        productName={productName}
        isArchived={isArchived}
      />
      <Link
        href="/admin/products"
        className="inline-flex items-center px-5 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Products
      </Link>
    </div>
  );
}
