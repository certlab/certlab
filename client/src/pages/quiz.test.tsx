/**
 * Quiz Page Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Quiz from './quiz';

// Mock QuizInterface component
vi.mock('@/components/QuizInterface', () => ({
  default: ({ quizId }: { quizId: number }) => (
    <div data-testid="quiz-interface">Quiz Interface for ID: {quizId}</div>
  ),
}));

describe('Quiz Page', () => {
  it('should render quiz interface with valid ID', () => {
    render(
      <MemoryRouter initialEntries={['/quiz/123']}>
        <Routes>
          <Route path="/quiz/:id" element={<Quiz />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('quiz-interface')).toBeInTheDocument();
    expect(screen.getByText(/Quiz Interface for ID: 123/i)).toBeInTheDocument();
  });

  it('should show error message for invalid quiz ID', () => {
    render(
      <MemoryRouter initialEntries={['/quiz/invalid']}>
        <Routes>
          <Route path="/quiz/:id" element={<Quiz />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Quiz Not Found/i)).toBeInTheDocument();
    expect(screen.getByText(/doesn't exist/i)).toBeInTheDocument();
  });

  it('should show error message when quiz ID is missing', () => {
    render(
      <MemoryRouter initialEntries={['/quiz/']}>
        <Routes>
          <Route path="/quiz/:id?" element={<Quiz />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Quiz Not Found/i)).toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <MemoryRouter initialEntries={['/quiz/456']}>
        <Routes>
          <Route path="/quiz/:id" element={<Quiz />} />
        </Routes>
      </MemoryRouter>
    );

    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveAttribute('id', 'main-content');
    expect(mainContent).toHaveAttribute('aria-label', 'Quiz interface');
  });

  it('should display alert role for error message', () => {
    render(
      <MemoryRouter initialEntries={['/quiz/abc']}>
        <Routes>
          <Route path="/quiz/:id" element={<Quiz />} />
        </Routes>
      </MemoryRouter>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});
