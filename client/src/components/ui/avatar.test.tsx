import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';

describe('Avatar component snapshots', () => {
  it('renders Avatar with image and fallback', () => {
    const { container } = render(
      <Avatar>
        <AvatarImage src="https://example.com/avatar.jpg" alt="User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Avatar with fallback only', () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders Avatar with custom className', () => {
    const { container } = render(
      <Avatar className="custom-avatar">
        <AvatarFallback>CD</AvatarFallback>
      </Avatar>
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
