import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Switch } from './switch';

describe('Switch component snapshots', () => {
  it('renders Switch with default props', () => {
    const { container } = render(<Switch />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders checked Switch', () => {
    const { container } = render(<Switch checked />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders disabled Switch', () => {
    const { container } = render(<Switch disabled />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Switch with custom className', () => {
    const { container } = render(<Switch className="custom-class" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
