import { useState, useEffect } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronFirst, ChevronLast } from 'lucide-react';

export interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showJumpToPage?: boolean;
  showFirstLastButtons?: boolean;
  maxVisiblePages?: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  showJumpToPage = true,
  showFirstLastButtons = true,
  maxVisiblePages = 5,
}: PaginationControlsProps) {
  const [jumpToValue, setJumpToValue] = useState('');

  // Reset jump input when current page changes
  useEffect(() => {
    setJumpToValue('');
  }, [currentPage]);

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  // Calculate visible page numbers
  const getVisiblePages = () => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      // Calculate range around current page
      let start = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
      const end = Math.min(totalPages - 1, start + maxVisiblePages - 3);

      // Adjust start if we're near the end
      if (end === totalPages - 1) {
        start = Math.max(2, end - maxVisiblePages + 3);
      }

      // Add ellipsis after first page if needed
      if (start > 2) {
        pages.push('ellipsis');
      }

      // Add middle pages
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      // Add ellipsis before last page if needed
      if (end < totalPages - 1) {
        pages.push('ellipsis');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  // Calculate items range
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems ?? currentPage * pageSize);

  return (
    <div className="flex flex-col gap-4 mt-6">
      {/* Top row: Page size selector and items info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Items per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {totalItems !== undefined && (
          <div className="text-sm text-muted-foreground">
            Showing {startItem}-{endItem} of {totalItems} items
          </div>
        )}
      </div>

      {/* Middle row: Main pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent className="flex-wrap">
            {/* First page button */}
            {showFirstLastButtons && (
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  aria-label="Go to first page"
                  className="h-9 w-9"
                >
                  <ChevronFirst className="h-4 w-4" />
                </Button>
              </PaginationItem>
            )}

            {/* Previous button */}
            <PaginationItem>
              <PaginationPrevious
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
              />
            </PaginationItem>

            {/* Page numbers */}
            {visiblePages.map((page, index) => (
              <PaginationItem key={index}>
                {page === 'ellipsis' ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    onClick={() => onPageChange(page)}
                    isActive={currentPage === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}

            {/* Next button */}
            <PaginationItem>
              <PaginationNext
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                aria-disabled={currentPage === totalPages}
                className={
                  currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }
              />
            </PaginationItem>

            {/* Last page button */}
            {showFirstLastButtons && (
              <PaginationItem>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Go to last page"
                  className="h-9 w-9"
                >
                  <ChevronLast className="h-4 w-4" />
                </Button>
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

      {/* Bottom row: Jump to page */}
      {showJumpToPage && totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Jump to page:</span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={jumpToValue}
            onChange={(e) => setJumpToValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="1"
            className="w-20"
            aria-label="Page number"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleJumpToPage}
            disabled={
              !jumpToValue ||
              parseInt(jumpToValue, 10) < 1 ||
              parseInt(jumpToValue, 10) > totalPages
            }
          >
            Go
          </Button>
        </div>
      )}
    </div>
  );
}
