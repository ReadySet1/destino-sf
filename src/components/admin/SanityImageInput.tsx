'use client';

import { useState, useCallback, ChangeEvent } from 'react';
import Image from 'next/image';
import { client } from '@/sanity/lib/client';

// Define the structure of a Sanity image reference/object
interface SanityImageAsset {
  _ref: string;
  _type: 'reference';
}

interface SanityImage {
  _key?: string;
  _type: 'image';
  asset: SanityImageAsset;
}

interface SanityImageResponse {
  asset?: {
    url?: string;
  };
}

interface SanityImageInputProps {
  initialImages?: SanityImage[];
  name: string;
}

export function SanityImageInput({ initialImages = [], name }: SanityImageInputProps) {
  const [images, setImages] = useState<SanityImage[]>(initialImages);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<SanityImage | null>(null);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // Upload the image asset to Sanity
      const assetDocument = await client.assets.upload('image', file, {
        contentType: file.type,
        filename: file.name,
      });

      // Create the image object structure for the document
      const newImage: SanityImage = {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: assetDocument._id,
        },
        _key: Math.random().toString(36).substring(2, 15),
      };

      setImages(prevImages => [...prevImages, newImage]);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsLoading(false);
      event.target.value = '';
    }
  }, []);

  const handleRemoveImage = useCallback(async (imageToRemove: SanityImage) => {
    setImageToDelete(imageToRemove);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!imageToDelete) return;

    setIsDeletingImage(true);
    try {
      // Extract the asset ID from the reference
      const assetId = imageToDelete.asset._ref;

      // First, find all product documents that reference this image
      const query = `*[_type == "product" && references($assetId)]`;
      const productsWithImage = await client.fetch(query, { assetId });

      console.log('Products referencing this image:', productsWithImage);

      // Remove the image reference from all product documents that use it
      for (const product of productsWithImage) {
        console.log('Removing image from product:', product._id);
        await client
          .patch(product._id)
          .unset([`images[_key=="${imageToDelete._key}"]`])
          .commit();

        // Get the current product's images from Sanity after removing the image
        const updatedProduct = await client.fetch(
          `*[_type == "product" && _id == $productId][0]{ 
            squareId,
            "images": images[]{
              asset-> {
                url
              }
            }
          }`,
          { productId: product._id }
        );

        // Convert Sanity image references to URLs
        const updatedImageUrls = (updatedProduct?.images || [])
          .map((img: SanityImageResponse) => img?.asset?.url)
          .filter(Boolean);

        console.log('Updating Prisma with new image URLs:', {
          productId: product._id,
          squareId: updatedProduct.squareId,
          imageUrls: updatedImageUrls,
        });

        // Update Prisma database with the new image URLs
        const response = await fetch('/api/products/update-images', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productId: updatedProduct.squareId || product._id,
            images: updatedImageUrls,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('Failed to update Prisma:', error);
          throw new Error('Failed to update product images in database');
        }
      }

      // Wait a moment for Sanity to process the reference removals
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        // Now try to delete the asset
        console.log('Attempting to delete asset:', assetId);
        await client.delete(assetId);
        console.log('Asset deleted successfully');
      } catch (deleteError) {
        console.error('Error deleting asset:', deleteError);
        // Even if asset deletion fails, we continue since the image reference is removed
      }

      // Update local state to remove the image
      setImages(prevImages =>
        prevImages.filter(img =>
          img._key ? img._key !== imageToDelete._key : img.asset._ref !== imageToDelete.asset._ref
        )
      );

      // Force a hard refresh to ensure all caches are cleared
      window.location.reload();

      // Clear the image to delete
      setImageToDelete(null);
    } catch (err) {
      console.error('Error in delete process:', err);
      setError('Failed to delete image. Please try again.');
      setImageToDelete(null);
    } finally {
      setIsDeletingImage(false);
    }
  }, [imageToDelete]);

  // Function to get the URL for a Sanity image asset reference
  const getImageUrl = (assetRef: string): string | null => {
    const parts = assetRef.split('-');
    if (parts.length < 3 || parts[0] !== 'image') return null;
    const dataset = client.config().dataset!;
    const projectId = client.config().projectId!;
    const filename = parts.slice(1).join('-');
    return `https://cdn.sanity.io/images/${projectId}/${dataset}/${filename.replace('-webp', '.webp').replace('-jpg', '.jpg').replace('-png', '.png')}`;
  };

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">Product Images</label>

      {/* Hidden input to store image data for form submission */}
      <input type="hidden" name={name} value={JSON.stringify(images)} />

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {images.map(image => {
          const imageUrl = getImageUrl(image.asset._ref);
          return imageUrl ? (
            <div key={image._key || image.asset._ref} className="relative group aspect-square">
              <Image
                src={imageUrl}
                alt="Product Image"
                fill
                className="object-cover rounded-md border border-gray-200"
                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16.6vw"
              />
              <button
                type="button"
                onClick={() => void handleRemoveImage(image)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                X
              </button>
            </div>
          ) : (
            <div
              key={image._key || image.asset._ref}
              className="aspect-square bg-gray-100 rounded-md flex items-center justify-center text-xs text-gray-500"
            >
              Invalid Image Ref
            </div>
          );
        })}

        {/* Upload Button/Area */}
        <div className="aspect-square border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors">
          <label htmlFor="image-upload" className="cursor-pointer p-4 text-center">
            {isLoading ? 'Uploading...' : '+ Add Image'}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={void handleFileChange}
              className="sr-only"
              disabled={isLoading}
            />
          </label>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {imageToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">Delete Image</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this image? This action cannot be undone.
            </p>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setImageToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
                disabled={isDeletingImage}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={void confirmDelete}
                className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50 flex items-center space-x-2"
                disabled={isDeletingImage}
              >
                {isDeletingImage ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500">
        Upload images directly to Sanity. Changes will be saved when you update the product.
      </p>
    </div>
  );
}

export type { SanityImage, SanityImageAsset };
