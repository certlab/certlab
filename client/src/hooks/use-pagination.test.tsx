import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { usePagination } from '@/hooks/use-pagination';

// Wrapper component for hooks that need router context
// Using MemoryRouter instead of BrowserRouter to avoid hanging in test environment
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('usePagination', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(25);
  });

  it('should initialize with custom values', () => {
    const { result } = renderHook(
      () =>
        usePagination({
          initialPage: 2,
          initialPageSize: 50,
          syncWithUrl: false,
        }),
      { wrapper }
    );

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageSize).toBe(50);
  });

  it('should update current page', () => {
    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    act(() => {
      result.current.setCurrentPage(3);
    });

    expect(result.current.currentPage).toBe(3);
  });

  it('should update page size', () => {
    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    act(() => {
      result.current.setPageSize(100);
    });

    expect(result.current.pageSize).toBe(100);
    // Should reset to page 1 when page size changes
    expect(result.current.currentPage).toBe(1);
  });

  it('should reset pagination', () => {
    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    act(() => {
      result.current.setCurrentPage(5);
      result.current.setPageSize(50);
    });

    act(() => {
      result.current.resetPagination();
    });

    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(50); // Page size should remain unchanged
  });

  it('should paginate items correctly', () => {
    // Clear localStorage to avoid interference from previous tests
    localStorage.clear();

    const { result } = renderHook(
      () => usePagination({ initialPageSize: 10, syncWithUrl: false }),
      { wrapper }
    );

    const items = Array.from({ length: 55 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

    const {
      items: page1,
      totalPages,
      startIndex,
      endIndex,
    } = result.current.getPaginatedItems(items);

    expect(page1).toHaveLength(10);
    expect(page1[0]).toEqual({ id: 1, name: 'Item 1' });
    expect(page1[9]).toEqual({ id: 10, name: 'Item 10' });
    expect(totalPages).toBe(6);
    expect(startIndex).toBe(0);
    expect(endIndex).toBe(10);

    act(() => {
      result.current.setCurrentPage(2);
    });

    const { items: page2 } = result.current.getPaginatedItems(items);
    expect(page2).toHaveLength(10);
    expect(page2[0]).toEqual({ id: 11, name: 'Item 11' });
    expect(page2[9]).toEqual({ id: 20, name: 'Item 20' });

    act(() => {
      result.current.setCurrentPage(6);
    });

    const { items: page6 } = result.current.getPaginatedItems(items);
    expect(page6).toHaveLength(5); // Last page has only 5 items
    expect(page6[0]).toEqual({ id: 51, name: 'Item 51' });
    expect(page6[4]).toEqual({ id: 55, name: 'Item 55' });
  });

  it('should save page size preference to localStorage', () => {
    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    act(() => {
      result.current.setPageSize(50);
    });

    expect(localStorage.getItem('preferred_page_size')).toBe('50');
  });

  it('should load page size preference from localStorage', () => {
    // Clear first to isolate this test
    localStorage.clear();
    localStorage.setItem('preferred_page_size', '100');

    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    expect(result.current.pageSize).toBe(100);

    // Clean up
    localStorage.clear();
  });

  it('should prevent invalid page numbers', () => {
    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    act(() => {
      result.current.setCurrentPage(0);
    });

    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.setCurrentPage(-5);
    });

    expect(result.current.currentPage).toBe(1);
  });

  it('should prevent invalid page sizes', () => {
    const { result } = renderHook(() => usePagination({ syncWithUrl: false }), { wrapper });

    act(() => {
      result.current.setPageSize(0);
    });

    expect(result.current.pageSize).toBe(1);

    act(() => {
      result.current.setPageSize(-10);
    });

    expect(result.current.pageSize).toBe(1);
  });

  it('should call onPageChange callback', () => {
    const onPageChange = vi.fn();
    const { result } = renderHook(() => usePagination({ onPageChange, syncWithUrl: false }), {
      wrapper,
    });

    act(() => {
      result.current.setCurrentPage(3);
    });

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('should call onPageSizeChange callback', () => {
    const onPageSizeChange = vi.fn();
    const { result } = renderHook(() => usePagination({ onPageSizeChange, syncWithUrl: false }), {
      wrapper,
    });

    act(() => {
      result.current.setPageSize(50);
    });

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
