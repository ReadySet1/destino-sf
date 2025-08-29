'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  const pathname = usePathname();

  // Create URL with preserved search params
  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams();

    // Add all existing search params
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(val => params.append(key, val));
        } else {
          params.set(key, value);
        }
      }
    });

    // Update page number
    params.set('page', pageNumber.toString());

    return `${pathname}?${params.toString()}`;
  };

  // Generate page numbers to display
  const generatePaginationItems = () => {
    // Always show first page, last page, current page, and pages immediately before and after current
    const pageItems = [];

    // First page is always shown
    pageItems.push(1);

    // Pages around current page
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      if (!pageItems.includes(i)) {
        pageItems.push(i);
      }
    }

    // Last page is always shown if not already included
    if (totalPages > 1 && !pageItems.includes(totalPages)) {
      pageItems.push(totalPages);
    }

    // Sort page numbers
    return pageItems.sort((a, b) => a - b);
  };

  const pageItems = generatePaginationItems();
  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;

  return (
    <nav
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 border-t border-gray-200/70 px-6 py-6 bg-white rounded-b-xl shadow-sm"
      aria-label="Pagination"
    >
      {/* Page info */}
      <div className="flex-shrink-0">
        <p className="text-sm text-gray-600 font-medium">
          Showing page <span className="font-semibold text-gray-900">{currentPage}</span> of{' '}
          <span className="font-semibold text-gray-900">{totalPages}</span>
        </p>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPreviousPage}
          asChild={hasPreviousPage}
          className="text-sm font-medium px-3 py-2"
        >
          {hasPreviousPage ? (
            <Link href={createPageURL(currentPage - 1)}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Link>
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </>
          )}
        </Button>

        {/* Page numbers */}
        <div className="hidden md:flex items-center gap-1">
          {pageItems.map((page, index) => {
            // Add ellipsis when there's a gap
            const needsEllipsisBefore = index > 0 && pageItems[index - 1] !== page - 1;
            return (
              <div key={page} className="flex items-center">
                {needsEllipsisBefore && (
                  <span className="px-2">
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  </span>
                )}
                <Button
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-10 h-10 p-0 font-medium"
                  asChild={currentPage !== page}
                >
                  {currentPage !== page ? (
                    <Link href={createPageURL(page)}>{page}</Link>
                  ) : (
                    <span>{page}</span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Mobile page indicator */}
        <div className="md:hidden">
          <span className="text-sm text-gray-600 font-medium px-3 py-2 bg-gray-50 rounded-md border">
            {currentPage} / {totalPages}
          </span>
        </div>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNextPage}
          asChild={hasNextPage}
          className="text-sm font-medium px-3 py-2"
        >
          {hasNextPage ? (
            <Link href={createPageURL(currentPage + 1)}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Link>
          ) : (
            <>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </nav>
  );
}
