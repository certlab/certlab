import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Separator } from './separator';

describe('Separator component snapshots', () => {
  it('renders horizontal Separator', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders vertical Separator', () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Separator with custom className', () => {
    const { container } = render(<Separator className="custom-class" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
