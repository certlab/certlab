import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Checkbox } from './checkbox';

describe('Checkbox component snapshots', () => {
  it('renders Checkbox with default props', () => {
    const { container } = render(<Checkbox />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders checked Checkbox', () => {
    const { container } = render(<Checkbox checked />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders disabled Checkbox', () => {
    const { container } = render(<Checkbox disabled />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Checkbox with custom className', () => {
    const { container } = render(<Checkbox className="custom-class" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
