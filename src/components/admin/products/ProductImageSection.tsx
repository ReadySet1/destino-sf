'use client';

import { useState } from 'react';
import { ProductImageManager } from './ProductImageManager';

interface ProductImageSectionProps {
  initialImages: string[];
}

export function ProductImageSection({ initialImages }: ProductImageSectionProps) {
  const [imageUrls, setImageUrls] = useState<string[]>(initialImages);

  return (
    <>
      <ProductImageManager
        initialImages={imageUrls}
        onImagesChange={setImageUrls}
        maxImages={10}
      />
      <input type="hidden" name="imageUrls" value={JSON.stringify(imageUrls)} />
    </>
  );
}
