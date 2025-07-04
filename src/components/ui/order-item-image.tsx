'use client';

import { useState } from 'react';
import Image from 'next/image';

interface OrderItemImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function OrderItemImage({ src, alt, className = '' }: OrderItemImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  
  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={100}
      height={100}
      className={className}
      onError={() => {
        setImgSrc('/images/catering/default-item.jpg');
      }}
    />
  );
} 