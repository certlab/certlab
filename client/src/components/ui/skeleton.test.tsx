import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton component snapshots', () => {
  it('renders Skeleton with default props', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Skeleton with custom className', () => {
    const { container } = render(<Skeleton className="w-full h-12" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders multiple Skeleton elements', () => {
    const { container } = render(
      <div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
