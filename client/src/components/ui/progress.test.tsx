import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress component snapshots', () => {
  it('renders Progress with default value', () => {
    const { container } = render(<Progress value={0} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Progress with 50% value', () => {
    const { container } = render(<Progress value={50} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Progress with 100% value', () => {
    const { container } = render(<Progress value={100} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Progress with custom className', () => {
    const { container } = render(<Progress value={75} className="custom-class" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
