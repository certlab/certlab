import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  syncWithUrl?: boolean;
  pageParam?: string;
  pageSizeParam?: string;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export interface UsePaginationReturn {
  currentPage: number;
  pageSize: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
  getPaginatedItems: <T>(items: T[]) => {
    items: T[];
    totalPages: number;
    startIndex: number;
    endIndex: number;
  };
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_KEY = 'preferred_page_size';

/**
 * Custom hook for managing pagination state with URL synchronization
 * and user preference persistence
 */
export function usePagination({
  initialPage = 1,
  initialPageSize,
  syncWithUrl = true,
  pageParam = 'page',
  pageSizeParam = 'pageSize',
  onPageChange,
  onPageSizeChange,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const location = useLocation();
  const navigate = useNavigate();

  // Get preferred page size from localStorage or use provided initial value
  const getInitialPageSize = useCallback(() => {
    if (initialPageSize) return initialPageSize;

    try {
      const stored = localStorage.getItem(PAGE_SIZE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Failed to read page size preference:', error);
    }

    return DEFAULT_PAGE_SIZE;
  }, [initialPageSize]);

  // Initialize state from URL params or defaults
  const getInitialState = useCallback(() => {
    if (!syncWithUrl) {
      return {
        page: initialPage,
        size: getInitialPageSize(),
      };
    }

    const searchParams = new URLSearchParams(location.search);
    const urlPage = searchParams.get(pageParam);
    const urlPageSize = searchParams.get(pageSizeParam);

    const page = urlPage ? Math.max(1, parseInt(urlPage, 10)) : initialPage;
    const size = urlPageSize ? Math.max(1, parseInt(urlPageSize, 10)) : getInitialPageSize();

    return { page, size };
  }, [syncWithUrl, location.search, pageParam, pageSizeParam, initialPage, getInitialPageSize]);

  const initialState = getInitialState();
  const [currentPage, setCurrentPageState] = useState(initialState.page);
  const [pageSize, setPageSizeState] = useState(initialState.size);

  // Update URL when pagination changes
  useEffect(() => {
    if (!syncWithUrl) return;

    const searchParams = new URLSearchParams(location.search);

    // Update or remove page param
    if (currentPage > 1) {
      searchParams.set(pageParam, currentPage.toString());
    } else {
      searchParams.delete(pageParam);
    }

    // Update or remove pageSize param (only if different from default)
    if (pageSize !== DEFAULT_PAGE_SIZE) {
      searchParams.set(pageSizeParam, pageSize.toString());
    } else {
      searchParams.delete(pageSizeParam);
    }

    const newSearch = searchParams.toString();
    const newPath = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;

    // Only navigate if URL actually changed
    if (location.pathname + location.search !== newPath) {
      navigate(newPath, { replace: true });
    }
  }, [
    currentPage,
    pageSize,
    syncWithUrl,
    location.pathname,
    location.search,
    navigate,
    pageParam,
    pageSizeParam,
  ]);

  // Set current page
  const setCurrentPage = useCallback(
    (page: number) => {
      const validPage = Math.max(1, page);
      setCurrentPageState(validPage);
      onPageChange?.(validPage);
    },
    [onPageChange]
  );

  // Set page size
  const setPageSize = useCallback(
    (size: number) => {
      const validSize = Math.max(1, size);
      setPageSizeState(validSize);
      setCurrentPageState(1); // Reset to first page when page size changes

      // Save to localStorage for future sessions
      try {
        localStorage.setItem(PAGE_SIZE_KEY, validSize.toString());
      } catch (error) {
        console.warn('Failed to save page size preference:', error);
      }

      onPageSizeChange?.(validSize);
    },
    [onPageSizeChange]
  );

  // Reset pagination to initial state
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, [setCurrentPage]);

  // Paginate items helper
  const getPaginatedItems = useCallback(
    <T>(items: T[]) => {
      const totalPages = Math.ceil(items.length / pageSize);
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, items.length);
      const paginatedItems = items.slice(startIndex, endIndex);

      return {
        items: paginatedItems,
        totalPages,
        startIndex,
        endIndex,
      };
    },
    [currentPage, pageSize]
  );

  return {
    currentPage,
    pageSize,
    setCurrentPage,
    setPageSize,
    resetPagination,
    getPaginatedItems,
  };
}
