// src/app/(dashboard)/admin/products/components/ProductCard.tsx

import { Badge } from '@/components/ui/badge';
import { ArchiveToggleButton } from './ArchiveToggleButton';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    squareId: string;
    active: boolean;
    isArchived: boolean;
    archivedAt: Date | null;
    archivedReason: string | null;
    category?: {
      name: string;
    } | null;
    images?: string[];
    price?: number | null;
  };
  showArchiveButton?: boolean;
}

export function ProductCard({ product, showArchiveButton = true }: ProductCardProps) {
  const isArchived = product.isArchived;
  const productImage = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all
        ${isArchived ? 'opacity-60 grayscale' : ''}
      `}
    >
      {/* Archive Badge - Top Right */}
      {isArchived && (
        <div className="absolute top-2 right-2 z-10">
          <ArchiveBadge reason={product.archivedReason} />
        </div>
      )}

      <div className="flex gap-4">
        {/* Product Image */}
        {productImage && (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
            <Image src={productImage} alt={product.name} fill className="object-cover" />
          </div>
        )}

        {/* Product Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900 truncate">{product.name}</h3>

          {product.category && (
            <p className="text-sm text-gray-500 mt-1">{product.category.name}</p>
          )}

          {product.price && (
            <p className="text-lg font-medium text-gray-900 mt-2">
              ${(product.price / 100).toFixed(2)}
            </p>
          )}

          {/* Archive Metadata */}
          {isArchived && product.archivedAt && (
            <div className="mt-3 text-xs text-gray-500">
              Archived {formatDistanceToNow(product.archivedAt, { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Actions */}
        {showArchiveButton && (
          <div className="flex-shrink-0">
            <ArchiveToggleButton
              productId={product.id}
              productName={product.name}
              isArchived={isArchived}
              variant="icon"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ArchiveBadge({ reason }: { reason: string | null }) {
  const badges = {
    square_archived: { label: 'Square Archived', color: 'bg-blue-100 text-blue-800' },
    removed_from_square: { label: 'Removed', color: 'bg-yellow-100 text-yellow-800' },
    manual: { label: 'Manually Archived', color: 'bg-green-100 text-green-800' },
  };

  const badge = badges[reason as keyof typeof badges] || badges.manual;

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.color}`}>Archived</span>
  );
}
