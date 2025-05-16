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

export default function Pagination({ 
  currentPage, 
  totalPages, 
  searchParams 
}: PaginationProps) {
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
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
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
    <nav className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6" aria-label="Pagination">
      <div className="hidden sm:block">
        <p className="text-sm text-gray-700">
          Showing page <span className="font-medium">{currentPage}</span> of{' '}
          <span className="font-medium">{totalPages}</span>
        </p>
      </div>
      <div className="flex flex-1 justify-between sm:justify-end">
        <div className="flex items-center gap-2">
          {/* Previous button */}
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPreviousPage}
            asChild={hasPreviousPage}
            className="text-sm font-medium"
          >
            {hasPreviousPage ? (
              <Link href={createPageURL(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Link>
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
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
                    <span className="mx-1">
                      <MoreHorizontal className="h-4 w-4 text-gray-400" />
                    </span>
                  )}
                  <Button
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    className="w-8 h-8 p-0"
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

          {/* Next button */}
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            asChild={hasNextPage}
            className="text-sm font-medium"
          >
            {hasNextPage ? (
              <Link href={createPageURL(currentPage + 1)}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            ) : (
              <>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
} 