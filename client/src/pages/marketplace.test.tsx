import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    // Should have 6 product cards plus 1 Filters button and 1 sort dropdown
    // Filter to get only the product cards (ones without aria-label and not the filters button)
    const productCards = cards.filter(
      (card) =>
        !card.getAttribute('aria-label') &&
        !card.textContent?.includes('Filters') &&
        card.getAttribute('role') === 'button' &&
        card.getAttribute('tabindex') === '0'
    );
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

  it('filters materials by search query', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    const searchInput = screen.getByPlaceholderText('Search study materials...');

    // Search for "calculus"
    fireEvent.change(searchInput, { target: { value: 'calculus' } });

    // Should show Calculus Lecture Series
    expect(screen.getByText('Calculus Lecture Series')).toBeInTheDocument();

    // Should not show other materials
    expect(screen.queryByText('Economics 101 Guide')).not.toBeInTheDocument();
    expect(screen.queryByText('Advanced Algorithms Notes')).not.toBeInTheDocument();
    expect(screen.queryByText('Organic Chem Video Course')).not.toBeInTheDocument();
    expect(screen.queryByText('Physics Lab Manual')).not.toBeInTheDocument();
    expect(screen.queryByText('Chemistry Study Pack')).not.toBeInTheDocument();

    // Verify results count shows only 1 filtered material
    expect(screen.getByText(/Showing 1 of 1 materials/)).toBeInTheDocument();
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

  it('displays sort dropdown', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Check that sort dropdown exists (multiple comboboxes now exist, including page size selector)
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThan(0);
  });

  it('displays filters button', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Check that filters button exists
    const filtersButton = screen.getByText('Filters');
    expect(filtersButton).toBeInTheDocument();
  });

  it('displays results count', () => {
    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Check that results count is displayed
    expect(screen.getByText(/Showing \d+ of \d+ materials/)).toBeInTheDocument();
  });
});
