'use client';

import { useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

interface ProductImageManagerProps {
  initialImages: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ProductImageManager({
  initialImages,
  onImagesChange,
  maxImages = 10,
}: ProductImageManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    setImages(newImages);
    onImagesChange(newImages);
  };

  const handleImageError = (url: string) => {
    setImageErrors(prev => new Set(prev).add(url));
  };

  const canAddMore = images.length < maxImages;

  return (
    <div className="space-y-6">
      {/* Existing Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className="relative group aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50"
            >
              {!imageErrors.has(imageUrl) ? (
                <Image
                  src={imageUrl}
                  alt={`Product image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  onError={() => handleImageError(imageUrl)}
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center p-4">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    <p className="text-xs text-gray-500">Failed to load</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => handleRemoveImage(index)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Image {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area Placeholder */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Add New Images</h3>
            <p className="text-sm text-gray-600 mb-3">Upload functionality coming soon</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-500">
                Current: {images.length} / {maxImages}
              </span>
              {canAddMore && (
                <span className="text-green-600 font-medium">
                  ({maxImages - images.length} slots available)
                </span>
              )}
              {!canAddMore && <span className="text-amber-600 font-medium">(Maximum reached)</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Image Count Badge */}
      {images.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-blue-900">
              {images.length} {images.length === 1 ? 'image' : 'images'} selected
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setImages([]);
              onImagesChange([]);
            }}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
