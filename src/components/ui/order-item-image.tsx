'use client';

import { useState } from 'react';

interface OrderItemImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function OrderItemImage({ src, alt, className = '' }: OrderItemImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  
  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => {
        setImgSrc('/images/catering/default-item.jpg');
      }}
    />
  );
} 