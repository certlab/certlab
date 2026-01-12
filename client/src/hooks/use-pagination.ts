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

    let page: number;
    if (urlPage !== null) {
      const parsedPage = parseInt(urlPage, 10);
      page = !isNaN(parsedPage) && parsedPage > 0 ? parsedPage : initialPage;
    } else {
      page = initialPage;
    }

    let size: number;
    if (urlPageSize !== null) {
      const parsedSize = parseInt(urlPageSize, 10);
      size = !isNaN(parsedSize) && parsedSize > 0 ? parsedSize : getInitialPageSize();
    } else {
      size = getInitialPageSize();
    }

    return { page, size };
  }, [syncWithUrl, location.search, pageParam, pageSizeParam, initialPage, getInitialPageSize]);

  const initialState = getInitialState();
  const [currentPage, setCurrentPageState] = useState(initialState.page);
  const [pageSize, setPageSizeState] = useState(initialState.size);

  // Store the initial page size for this instance to compare against in URL sync
  const effectiveDefaultPageSize = initialPageSize || DEFAULT_PAGE_SIZE;

  // Listen for URL changes (browser back/forward navigation)
  useEffect(() => {
    if (!syncWithUrl) return;

    const searchParams = new URLSearchParams(location.search);
    const urlPage = searchParams.get(pageParam);
    const urlPageSize = searchParams.get(pageSizeParam);

    // Update page if URL parameter changed
    if (urlPage !== null) {
      const parsedPage = parseInt(urlPage, 10);
      if (!isNaN(parsedPage) && parsedPage > 0 && parsedPage !== currentPage) {
        setCurrentPageState(parsedPage);
      }
    } else if (currentPage !== 1) {
      setCurrentPageState(1);
    }

    // Update page size if URL parameter changed
    if (urlPageSize !== null) {
      const parsedSize = parseInt(urlPageSize, 10);
      if (!isNaN(parsedSize) && parsedSize > 0 && parsedSize !== pageSize) {
        setPageSizeState(parsedSize);
      }
    }
    // Note: We don't reset to default when URL param is absent to avoid infinite loops
    // The user's last selected page size is maintained
  }, [location.search, syncWithUrl, pageParam, pageSizeParam, currentPage, pageSize]);

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

    // Update or remove pageSize param (only if different from this instance's default)
    if (pageSize !== effectiveDefaultPageSize) {
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
