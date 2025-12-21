import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MarketplacePage from './marketplace';

describe('MarketplacePage', () => {
  it('renders all study materials', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Check that materials are rendered
    expect(screen.getByText('Advanced Algorithms Notes')).toBeInTheDocument();
    expect(screen.getByText('Organic Chem Video Course')).toBeInTheDocument();
    expect(screen.getByText('Economics 101 Guide')).toBeInTheDocument();
  });

  it('renders clickable cards to navigate to product details', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Find all clickable cards with role="button"
    const cards = screen.getAllByRole('button');

    // Should have 6 product cards (each card has role="button")
    // Filter out the cart buttons by checking if they have aria-label
    const productCards = cards.filter((card) => !card.getAttribute('aria-label'));
    expect(productCards.length).toBe(6);

    // Cards should have tabIndex for keyboard navigation
    expect(productCards[0]).toHaveAttribute('tabindex', '0');
  });

  it('displays search bar', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search study materials...');
    expect(searchInput).toBeInTheDocument();
  });

  it('displays price and rating for each material', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Check that prices are displayed
    expect(screen.getByText('$12')).toBeInTheDocument();
    expect(screen.getByText('$45')).toBeInTheDocument();

    // Check that ratings are displayed (using getAllByText for duplicates)
    const ratings = screen.getAllByText('4.9');
    expect(ratings.length).toBeGreaterThan(0);
  });

  it('displays material type badges', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Check that type badges exist
    const badges = screen.getAllByText(/PDF|VIDEO/);
    expect(badges.length).toBeGreaterThan(0);
  });
});
