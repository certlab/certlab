/**
 * Mobile Keyboard Handler Hook
 *
 * Handles mobile keyboard behavior including:
 * - Scrolling input fields into view when focused
 * - Preventing viewport zoom on input focus
 * - Handling virtual keyboard appearance/disappearance
 *
 * @module use-mobile-keyboard
 */

import { useEffect } from 'react';
import { useIsMobile } from './use-mobile';

export interface MobileKeyboardOptions {
  scrollMargin?: number; // Additional margin when scrolling (default: 20px)
  preventZoom?: boolean; // Prevent zoom on input focus (default: true)
}

/**
 * Hook to improve mobile keyboard handling and input focus behavior.
 *
 * @param options - Configuration options
 *
 * @example
 * function MyForm() {
 *   useMobileKeyboard({ scrollMargin: 30 });
 *
 *   return <input type="text" placeholder="Enter text" />;
 * }
 */
export function useMobileKeyboard(options: MobileKeyboardOptions = {}) {
  const { scrollMargin = 20, preventZoom = true } = options;
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;

    // Store original viewport meta content
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const originalContent = viewportMeta?.getAttribute('content') || '';

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;

      // Only handle input elements
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        // Prevent zoom on iOS by temporarily modifying viewport
        if (preventZoom && viewportMeta) {
          viewportMeta.setAttribute(
            'content',
            'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
          );
        }

        // Scroll element into view with smooth animation
        setTimeout(() => {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          });
        }, 300); // Wait for keyboard to appear
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;

      // Reset viewport on blur
      if (
        preventZoom &&
        viewportMeta &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        setTimeout(() => {
          viewportMeta?.setAttribute('content', originalContent);
        }, 100);
      }
    };

    // Add event listeners
    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleBlur, true);

    return () => {
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focusout', handleBlur, true);

      // Restore original viewport
      if (preventZoom && viewportMeta) {
        viewportMeta.setAttribute('content', originalContent);
      }
    };
  }, [isMobile, scrollMargin, preventZoom]);
}
