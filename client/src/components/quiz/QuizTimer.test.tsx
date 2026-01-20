import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { QuizTimer } from './QuizTimer';

describe('QuizTimer component snapshots', () => {
  it('renders QuizTimer with time remaining', () => {
    const { container } = render(<QuizTimer timeRemaining={600} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders QuizTimer with low time remaining', () => {
    const { container } = render(<QuizTimer timeRemaining={30} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders nothing when timeRemaining is null', () => {
    const { container } = render(<QuizTimer timeRemaining={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders QuizTimer with zero time', () => {
    const { container } = render(<QuizTimer timeRemaining={0} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
