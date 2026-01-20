import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Label } from './label';

describe('Label component snapshots', () => {
  it('renders Label with default props', () => {
    const { container } = render(<Label>Label text</Label>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Label with htmlFor', () => {
    const { container } = render(<Label htmlFor="input-id">Label for input</Label>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Label with custom className', () => {
    const { container } = render(<Label className="custom-class">Custom label</Label>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
