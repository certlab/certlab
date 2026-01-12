import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PaginationControls } from '@/components/ui/pagination-controls';

describe('PaginationControls', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 10,
    pageSize: 25,
    totalItems: 250,
    onPageChange: vi.fn(),
  };

  it('should render page navigation buttons', () => {
    render(<PaginationControls {...defaultProps} />);

    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
  });

  it('should display items range correctly', () => {
    render(<PaginationControls {...defaultProps} />);

    expect(screen.getByText(/Showing 1-25 of 250 items/)).toBeInTheDocument();
  });

  it('should display "No items to display" when totalItems is 0', () => {
    render(<PaginationControls {...defaultProps} totalItems={0} totalPages={0} />);

    expect(screen.getByText('No items to display')).toBeInTheDocument();
  });

  it('should disable previous button on first page', () => {
    render(<PaginationControls {...defaultProps} currentPage={1} />);

    const prevButton = screen.getByLabelText('Go to previous page');
    expect(prevButton).toHaveClass('pointer-events-none');
  });

  it('should disable next button on last page', () => {
    render(<PaginationControls {...defaultProps} currentPage={10} />);

    const nextButton = screen.getByLabelText('Go to next page');
    expect(nextButton).toHaveClass('pointer-events-none');
  });

  it('should call onPageChange when clicking page numbers', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />);

    const page2Button = screen.getByText('2', { selector: 'a' });
    fireEvent.click(page2Button);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when clicking next button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />);

    const nextButton = screen.getByLabelText('Go to next page');
    fireEvent.click(nextButton);

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('should call onPageChange when clicking previous button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    const prevButton = screen.getByLabelText('Go to previous page');
    fireEvent.click(prevButton);

    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('should render page size selector when enabled', () => {
    const onPageSizeChange = vi.fn();
    render(
      <PaginationControls
        {...defaultProps}
        showPageSizeSelector={true}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByText('Items per page:')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select items per page' })).toBeInTheDocument();
  });

  it('should not render page size selector when disabled', () => {
    render(<PaginationControls {...defaultProps} showPageSizeSelector={false} />);

    expect(screen.queryByText('Items per page:')).not.toBeInTheDocument();
  });

  it('should render jump to page input when enabled', () => {
    render(<PaginationControls {...defaultProps} showJumpToPage={true} />);

    expect(screen.getByText('Jump to page:')).toBeInTheDocument();
    expect(screen.getByLabelText('Page number')).toBeInTheDocument();
  });

  it('should not render jump to page when disabled', () => {
    render(<PaginationControls {...defaultProps} showJumpToPage={false} />);

    expect(screen.queryByText('Jump to page:')).not.toBeInTheDocument();
  });

  it('should call onPageChange when using jump to page', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText('Page number');
    const goButton = screen.getByRole('button', { name: 'Go' });

    fireEvent.change(input, { target: { value: '5' } });
    fireEvent.click(goButton);

    expect(onPageChange).toHaveBeenCalledWith(5);
  });

  it('should call onPageChange when pressing Enter in jump to page input', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText('Page number');

    fireEvent.change(input, { target: { value: '7' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onPageChange).toHaveBeenCalledWith(7);
  });

  it('should not jump to invalid page numbers', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} onPageChange={onPageChange} />);

    const input = screen.getByLabelText('Page number');
    const goButton = screen.getByRole('button', { name: 'Go' });

    // Try invalid page (0)
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(goButton);
    expect(onPageChange).not.toHaveBeenCalled();

    // Try page beyond total
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.click(goButton);
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it('should render first and last page buttons when enabled', () => {
    render(<PaginationControls {...defaultProps} showFirstLastButtons={true} />);

    expect(screen.getByLabelText('Go to first page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to last page')).toBeInTheDocument();
  });

  it('should not render first and last page buttons when disabled', () => {
    render(<PaginationControls {...defaultProps} showFirstLastButtons={false} />);

    expect(screen.queryByLabelText('Go to first page')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Go to last page')).not.toBeInTheDocument();
  });

  it('should call onPageChange when clicking first page button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    const firstButton = screen.getByLabelText('Go to first page');
    fireEvent.click(firstButton);

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when clicking last page button', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls {...defaultProps} currentPage={5} onPageChange={onPageChange} />);

    const lastButton = screen.getByLabelText('Go to last page');
    fireEvent.click(lastButton);

    expect(onPageChange).toHaveBeenCalledWith(10);
  });

  it('should disable first page button when on first page', () => {
    render(<PaginationControls {...defaultProps} currentPage={1} />);

    const firstButton = screen.getByLabelText('Go to first page');
    expect(firstButton).toBeDisabled();
  });

  it('should disable last page button when on last page', () => {
    render(<PaginationControls {...defaultProps} currentPage={10} />);

    const lastButton = screen.getByLabelText('Go to last page');
    expect(lastButton).toBeDisabled();
  });

  it('should show ellipsis for large page counts', () => {
    render(<PaginationControls {...defaultProps} currentPage={50} totalPages={100} />);

    // Should show ellipsis for pages not near current page
    const ellipses = screen.getAllByText('More pages');
    expect(ellipses.length).toBeGreaterThan(0);
  });

  it('should highlight current page', () => {
    render(<PaginationControls {...defaultProps} currentPage={3} />);

    const currentPageLink = screen.getByText('3', { selector: 'a[aria-current="page"]' });
    expect(currentPageLink).toHaveAttribute('aria-current', 'page');
  });

  it('should not render pagination when totalPages is 1 or less', () => {
    const { container } = render(<PaginationControls {...defaultProps} totalPages={1} />);

    // Should only have the top row with items info, no pagination navigation
    expect(container.querySelector('nav')).not.toBeInTheDocument();
  });

  it('should calculate items range correctly for middle page', () => {
    render(<PaginationControls {...defaultProps} currentPage={5} pageSize={25} totalItems={250} />);

    expect(screen.getByText(/Showing 101-125 of 250 items/)).toBeInTheDocument();
  });

  it('should calculate items range correctly for last page with partial items', () => {
    render(
      <PaginationControls {...defaultProps} currentPage={10} pageSize={25} totalItems={235} />
    );

    expect(screen.getByText(/Showing 226-235 of 235 items/)).toBeInTheDocument();
  });
});
