'use client';

import { useState, useEffect } from 'react';
import { SafeImage } from '@/components/ui/safe-image';
import Link from 'next/link';
import { ChevronLeft, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/store/cart';
import { toast } from 'sonner';
import { formatPrice, getProxiedImageUrl } from '@/lib/utils';

interface Variant {
  name: string;
  price: number;
  squareVariantId: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string | null;
  price: number;
  images: string[];
  category: {
    _id: string;
    name: string;
    slug: { current: string };
  };
  variants: Variant[];
  slug: { current: string };
}

interface ProductDetailProps {
  product: Product;
}

// Image validation is now handled by SafeImage component

export function ProductDetail({ product }: ProductDetailProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    product.variants && product.variants.length > 0 ? product.variants[0] : null
  );
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCartStore();

  // Add state for image handling
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Default fallback image
  const fallbackImage = '/images/menu/empanadas.png';

  // Calculate the current price based on selected variant
  const currentPrice = selectedVariant ? selectedVariant.price : product.price;

  // Set image URL on component mount and when product changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);

    // Get the first image from product.images if it exists
    const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;

    if (firstImage) {
      // Process the URL through our proxy if it's external
      const processedUrl = getProxiedImageUrl(firstImage);
      setImageUrl(processedUrl);
    } else {
      // No image available, use fallback
      setImageUrl(fallbackImage);
      setImageError(true);
    }

    setImageLoading(false);
  }, [product._id, product.images, product.name]);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product._id,
        name: product.name + (selectedVariant ? ` - ${selectedVariant.name}` : ''),
        price: currentPrice,
        image: imageUrl || fallbackImage,
        variantId: selectedVariant?.squareVariantId,
        quantity: 1,
      });
    }

    toast.success(`Added ${quantity} ${product.name} to cart`);
  };

  const incrementQuantity = () => {
    setQuantity(prev => Math.min(prev + 1, 20)); // Set a maximum quantity
  };

  const decrementQuantity = () => {
    setQuantity(prev => Math.max(prev - 1, 1)); // Minimum quantity is 1
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2">
          <li>
            <Link href="/" className="text-gray-500 hover:text-gray-700">
              Home
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link href="/menu" className="text-gray-500 hover:text-gray-700">
              Menu
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li>
            <Link
              href={`/menu?category=${product.category._id}`}
              className="text-gray-500 hover:text-gray-700"
            >
              {product.category.name}
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-700">{product.name}</li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Product Images */}
        <div className="overflow-hidden rounded-lg bg-gray-100">
          {imageLoading ? (
            <div className="flex aspect-square items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
            </div>
          ) : imageUrl ? (
            <div className="relative aspect-square">
              <SafeImage
                src={imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                priority
                fallbackSrc={fallbackImage}
                maxRetries={0}
              />
            </div>
          ) : (
            <div className="flex aspect-square items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          <Link
            href={`/menu?category=${product.category._id}`}
            className="mb-2 inline-block text-sm font-medium text-yellow-600"
          >
            {product.category.name}
          </Link>

          <h1 className="mb-4 text-3xl font-bold">{product.name}</h1>

          <div className="mb-6">
            <p className="text-2xl font-bold">${formatPrice(currentPrice)}</p>
          </div>

          {product.description && (
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-medium">Description</h2>
              <p className="text-gray-700">{product.description}</p>
            </div>
          )}

          {/* Variants Selection */}
          {product.variants && product.variants.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-medium">Options</h2>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(variant => (
                  <Button
                    key={variant.squareVariantId}
                    type="button"
                    variant={
                      selectedVariant?.squareVariantId === variant.squareVariantId
                        ? 'default'
                        : 'outline'
                    }
                    onClick={() => setSelectedVariant(variant)}
                    className="h-auto py-2"
                  >
                    {variant.name}
                    {variant.price !== null && ` - $${formatPrice(variant.price)}`}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-6">
            <h2 className="mb-2 text-lg font-medium">Quantity</h2>
            <div className="flex items-center">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={decrementQuantity}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <span className="w-12 text-center text-lg font-medium">{quantity}</span>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={incrementQuantity}
                disabled={quantity >= 20}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Add to Cart Button */}
          <Button onClick={handleAddToCart} size="lg" className="mb-4 w-full">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Add to Cart
          </Button>

          {/* Back to Menu Button */}
          <Link href="/menu">
            <Button variant="outline" className="w-full">
              <ChevronLeft className="mr-2 h-5 w-5" />
              Back to Menu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
