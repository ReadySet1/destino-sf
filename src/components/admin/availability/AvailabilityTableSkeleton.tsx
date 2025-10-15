'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AvailabilityTableSkeletonProps {
  rows?: number;
  columns?: number;
}

/**
 * Skeleton loader for availability tables
 * Shows loading state while data is being fetched
 */
export function AvailabilityTableSkeleton({
  rows = 5,
  columns = 7,
}: AvailabilityTableSkeletonProps) {
  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns }).map((_, i) => (
                <TableHead key={i}>
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for stat cards
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="px-6 py-4 bg-white">
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for form sections
 */
export function FormSectionSkeleton() {
  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        <div className="h-3 w-72 bg-gray-100 rounded animate-pulse" />
      </div>
      <div className="px-8 py-8 space-y-4">
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
        <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
