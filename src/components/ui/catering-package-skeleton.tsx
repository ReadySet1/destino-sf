'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CateringPackageSkeletonProps {
  className?: string;
}

export function CateringPackageSkeleton({ className }: CateringPackageSkeletonProps) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Header skeleton */}
      <div className="text-center space-y-6">
        <div>
          <Skeleton className="h-9 w-80 mx-auto mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full max-w-3xl mx-auto" />
            <Skeleton className="h-4 w-3/4 max-w-2xl mx-auto" />
            <Skeleton className="h-4 w-2/3 max-w-xl mx-auto" />
          </div>
        </div>
      </div>

      {/* Package cards skeleton */}
      <div className="grid gap-6 md:gap-8">
        {Array.from({ length: 2 }).map((_, packageIndex) => (
          <div key={packageIndex} className="border border-gray-200 rounded-xl p-6 bg-white">
            {/* Package header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
              <div className="space-y-2 mb-4 lg:mb-0">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>

            {/* Package description */}
            <div className="mb-6 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Items grid skeleton */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
              {Array.from({ length: 6 }).map((_, itemIndex) => (
                <div key={itemIndex} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  {/* Item image skeleton */}
                  <Skeleton className="h-24 w-full rounded-md" />

                  {/* Item details skeleton */}
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex gap-1">
                      <Skeleton className="h-5 w-8 rounded-full" />
                      <Skeleton className="h-5 w-8 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Package controls skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Additional sections skeleton */}
      <div className="border-t pt-12 space-y-8">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-64 mx-auto" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <Skeleton className="h-32 w-full rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CateringPackageSkeletonSimple({ className }: CateringPackageSkeletonProps) {
  return (
    <div className={cn('space-y-8', className)}>
      {/* Header skeleton */}
      <div className="text-center space-y-6">
        <div>
          <Skeleton className="h-9 w-80 mx-auto mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full max-w-3xl mx-auto" />
            <Skeleton className="h-4 w-3/4 max-w-2xl mx-auto" />
          </div>
        </div>
      </div>

      {/* Simple loading message with animation */}
      <div className="text-center py-12">
        <div className="max-w-md mx-auto space-y-6">
          {/* Animated plate/loading indicator */}
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-amber-200 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 border-2 border-amber-400 rounded-full animate-spin"></div>
              <div className="absolute inset-4 bg-amber-100 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Loading text skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-6 w-64 mx-auto" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-56 mx-auto" />
              <Skeleton className="h-4 w-48 mx-auto" />
            </div>
          </div>

          {/* Contact info skeleton */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <Skeleton className="h-3 w-48 mx-auto" />
            <Skeleton className="h-4 w-36 mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );
}
