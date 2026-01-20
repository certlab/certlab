import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Alert, AlertTitle, AlertDescription } from './alert';

describe('Alert component snapshots', () => {
  it('renders Alert with default variant', () => {
    const { container } = render(
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>This is an alert message.</AlertDescription>
      </Alert>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Alert with destructive variant', () => {
    const { container } = render(
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Something went wrong.</AlertDescription>
      </Alert>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Alert with custom className', () => {
    const { container } = render(
      <Alert className="custom-class">
        <AlertTitle>Custom Alert</AlertTitle>
        <AlertDescription>Custom alert message.</AlertDescription>
      </Alert>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders AlertTitle standalone', () => {
    const { container } = render(<AlertTitle>Title Only</AlertTitle>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders AlertDescription standalone', () => {
    const { container } = render(<AlertDescription>Description Only</AlertDescription>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
