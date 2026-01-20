import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Input } from './input';

describe('Input component snapshots', () => {
  it('renders Input with default props', () => {
    const { container } = render(<Input />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Input with placeholder', () => {
    const { container } = render(<Input placeholder="Enter text..." />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Input with type', () => {
    const { container } = render(<Input type="email" placeholder="Email" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders disabled Input', () => {
    const { container } = render(<Input disabled placeholder="Disabled input" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Input with custom className', () => {
    const { container } = render(<Input className="custom-class" />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Input with value', () => {
    const { container } = render(<Input value="Test value" readOnly />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
