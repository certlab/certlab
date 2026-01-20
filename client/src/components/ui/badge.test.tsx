import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Badge } from './badge';

describe('Badge component snapshots', () => {
  it('renders Badge with default variant', () => {
    const { container } = render(<Badge>Default Badge</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Badge with secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Secondary Badge</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Badge with destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Destructive Badge</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Badge with outline variant', () => {
    const { container } = render(<Badge variant="outline">Outline Badge</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Badge with custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom Badge</Badge>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
