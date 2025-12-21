import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetailPage from './product-detail';

describe('ProductDetailPage', () => {
  it('renders product details for valid product ID', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/1']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that product title is displayed
    expect(screen.getByText('Advanced Algorithms Notes')).toBeInTheDocument();

    // Check that price is displayed
    expect(screen.getByText('$12')).toBeInTheDocument();

    // Check that rating is displayed
    expect(screen.getByText('4.9')).toBeInTheDocument();
  });

  it('renders back button to marketplace', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/1']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    const backButtons = screen.getAllByText('Back to Marketplace');
    expect(backButtons.length).toBeGreaterThan(0);
  });

  it('renders product description and details', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/1']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that description section exists
    expect(screen.getByText('Description')).toBeInTheDocument();

    // Check that details section exists
    expect(screen.getByText('Details')).toBeInTheDocument();

    // Check that "What's Included" section exists
    expect(screen.getByText("What's Included")).toBeInTheDocument();
  });

  it('renders Add to Cart button', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/1']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Add to Cart')).toBeInTheDocument();
  });

  it('shows error message for non-existent product', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/999']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check that error message is displayed
    expect(screen.getByText('Product Not Found')).toBeInTheDocument();
    expect(
      screen.getByText("The product you're looking for doesn't exist or has been removed.")
    ).toBeInTheDocument();
  });

  it('shows return to marketplace button on error page', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/999']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Return to Marketplace')).toBeInTheDocument();
  });

  it('renders video product details correctly', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/2']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check video product
    expect(screen.getByText('Organic Chem Video Course')).toBeInTheDocument();
    expect(screen.getByText('$45')).toBeInTheDocument();

    // Check that duration is displayed for video
    expect(screen.getByText('Duration')).toBeInTheDocument();
  });

  it('renders PDF product details correctly', () => {
    render(
      <MemoryRouter initialEntries={['/app/marketplace/1']}>
        <Routes>
          <Route path="/app/marketplace/:id" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Check PDF product
    expect(screen.getByText('Advanced Algorithms Notes')).toBeInTheDocument();

    // Check that format/size is displayed for PDF
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Size')).toBeInTheDocument();
  });
});
