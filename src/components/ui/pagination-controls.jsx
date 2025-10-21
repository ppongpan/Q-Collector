/**
 * PaginationControls Component v0.7.34-dev
 * Responsive pagination with items-per-page selector
 *
 * Features:
 * - Items per page: 20, 50, 80, 100
 * - Smart page number display with ellipsis
 * - Previous/Next buttons
 * - "Showing X-Y of Z" summary
 * - Mobile responsive (compact layout)
 */

import React from 'react';
import { GlassButton } from './glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faList } from '@fortawesome/free-solid-svg-icons';

export const PaginationControls = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange
}) => {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7; // Show max 7 page numbers

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first, last, and pages around current
      if (currentPage <= 3) {
        // Near start: 1 2 3 4 ... last
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Near end: 1 ... last-3 last-2 last-1 last
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        // Middle: 1 ... current-1 current current+1 ... last
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="space-y-4">
      {/* Items per page + Summary */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Items per page selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            แสดงต่อหน้า:
          </span>
          <div className="relative flex-shrink-0 flex items-center">
            <FontAwesomeIcon
              icon={faList}
              className="absolute left-3 text-primary pointer-events-none z-10 text-sm"
            />
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(parseInt(e.target.value))}
              className="pl-9 pr-8 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none cursor-pointer h-10 flex items-center"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={80}>80</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Summary text */}
        <div className="text-sm text-muted-foreground">
          <span className="hidden sm:inline">แสดง </span>
          <span className="font-semibold text-foreground">{startIndex}-{endIndex}</span>
          {' '}
          <span className="hidden sm:inline">จาก </span>
          <span className="sm:hidden">/ </span>
          <span className="font-semibold text-foreground">{totalItems}</span>
          <span className="hidden sm:inline"> รายการ</span>
        </div>
      </div>

      {/* Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
          {/* Previous button */}
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 sm:px-3"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="sm:mr-1" />
            <span className="hidden sm:inline">ก่อนหน้า</span>
          </GlassButton>

          {/* Page numbers */}
          {pageNumbers.map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            const isActive = currentPage === page;
            return (
              <GlassButton
                key={page}
                variant={isActive ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => onPageChange(page)}
                className={`min-w-[36px] sm:min-w-[40px] px-2 sm:px-3 transition-all ${
                  isActive
                    ? 'font-bold !bg-primary !text-primary-foreground shadow-lg shadow-primary/30 scale-105'
                    : 'hover:bg-muted'
                }`}
              >
                {page}
              </GlassButton>
            );
          })}

          {/* Next button */}
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 sm:px-3"
          >
            <span className="hidden sm:inline">ถัดไป</span>
            <FontAwesomeIcon icon={faChevronRight} className="sm:ml-1" />
          </GlassButton>
        </div>
      )}
    </div>
  );
};

export default PaginationControls;
