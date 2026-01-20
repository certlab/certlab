import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';

describe('Card component snapshots', () => {
  it('renders Card with default props', () => {
    const { container } = render(<Card>Card content</Card>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Card with custom className', () => {
    const { container } = render(<Card className="custom-class">Card content</Card>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders complete Card structure', () => {
    const { container } = render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>This is the card content.</p>
        </CardContent>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders CardHeader', () => {
    const { container } = render(<CardHeader>Header content</CardHeader>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders CardTitle', () => {
    const { container } = render(<CardTitle>Title</CardTitle>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders CardDescription', () => {
    const { container } = render(<CardDescription>Description</CardDescription>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders CardContent', () => {
    const { container } = render(<CardContent>Content</CardContent>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders CardFooter', () => {
    const { container } = render(<CardFooter>Footer</CardFooter>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
