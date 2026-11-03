"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  options?: number[];
  disabled?: boolean;
  className?: string;
}

export function PageSizeSelector({
  pageSize,
  onPageSizeChange,
  options = [10, 20, 50, 100],
  disabled = false,
  className = "",
}: PageSizeSelectorProps) {
  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        disabled={disabled}
        aria-label="Rows per page"
        className={cn(
          "inline-flex h-8 w-full appearance-none items-center justify-between gap-1.5 rounded-md border border-input bg-card pl-2.5 pr-7 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer select-none"
        )}
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-popover text-foreground">
            {opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 h-3.5 w-3.5 text-muted-foreground pointer-events-none transition-transform duration-200" />
    </div>
  );
}

export interface PaginationProps {
  page: number;
  total: number;
  pageSize?: number;
  defaultPageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  showPageNumbers?: boolean;
  showTotalText?: boolean;
  showPageSize?: boolean;
  maxPageButtons?: number;
  className?: string;
}

export function Pagination({
  page,
  total,
  pageSize: controlledPageSize,
  defaultPageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions: rawPageSizeOptions = [10, 20, 50, 100],
  isLoading = false,
  showPageNumbers = true,
  showTotalText = true,
  showPageSize = true,
  maxPageButtons = 5,
  className = "",
}: PaginationProps) {
  const pageSize = controlledPageSize ?? defaultPageSize;
  const pageSizeOptions = rawPageSizeOptions.includes(pageSize)
    ? rawPageSizeOptions
    : [...rawPageSizeOptions, pageSize].sort((a, b) => a - b);
  const totalPages = Math.ceil(total / pageSize);

  // If there's 1 or 0 pages and no page size selector, nothing to render
  if (totalPages <= 1 && !onPageSizeChange) return null;

  const getPageNumbers = () => {
    const siblingCount = 1;

    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "ellipsis", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + 1 + i
      );
      return [1, "ellipsis", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, "ellipsis", ...middleRange, "ellipsis", totalPages];
    }

    return Array.from({ length: totalPages }, (_, i) => i + 1);
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 w-full text-center sm:text-left ${className}`}>
      {showTotalText && (
        <div className="text-xs sm:text-sm text-muted-foreground order-1 sm:order-1 flex items-center gap-2 flex-wrap">
          <span>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} results
          </span>
        </div>
      )}

      {(totalPages > 1 || (showPageSize && onPageSizeChange)) && (
        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 order-2 sm:order-2 ml-auto">
          {showPageSize && onPageSizeChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Rows:</span>
              <PageSizeSelector
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
                options={pageSizeOptions}
                disabled={isLoading}
              />
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1 || isLoading}
                className="h-8 px-2 text-xs sm:text-sm"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden xs:inline">Previous</span>
              </Button>

              {showPageNumbers && (
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((item, idx) => {
                    if (item === "ellipsis") {
                      return (
                        <span
                          key={`dots-${idx}`}
                          className="w-8 h-8 flex items-center justify-center text-muted-foreground text-sm font-medium select-none"
                        >
                          ...
                        </span>
                      );
                    }

                    const pageNum = item as number;
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(pageNum)}
                        disabled={isLoading}
                        className={`w-8 h-8 p-0 text-xs sm:text-sm ${
                          page === pageNum
                            ? "bg-primary text-primary-foreground"
                            : ""
                        }`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages || isLoading}
                className="h-8 px-2 text-xs sm:text-sm"
              >
                <span className="hidden xs:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}