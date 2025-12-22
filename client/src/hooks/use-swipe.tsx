/**
 * Swipe Gesture Detection Hook
 *
 * Custom React hook that detects swipe gestures (left/right) on touch devices.
 * Useful for implementing swipe navigation in quiz interfaces and carousels.
 *
 * @module use-swipe
 */

import { useRef, useEffect } from 'react';

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export interface SwipeOptions {
  threshold?: number; // Minimum distance in pixels to register a swipe (default: 50)
  preventDefaultTouchmoveEvent?: boolean; // Whether to prevent default touchmove (default: false)
}

/**
 * Hook that detects swipe gestures and triggers callbacks.
 *
 * @param callbacks - Object containing swipe direction callbacks
 * @param options - Configuration options for swipe detection
 * @returns Ref to attach to the element that should detect swipes
 *
 * @example
 * function QuizCard() {
 *   const swipeRef = useSwipe({
 *     onSwipeLeft: () => console.log('Swiped left - next question'),
 *     onSwipeRight: () => console.log('Swiped right - previous question'),
 *   });
 *
 *   return <div ref={swipeRef}>Swipeable content</div>;
 * }
 */
export function useSwipe(callbacks: SwipeCallbacks, options: SwipeOptions = {}) {
  const { threshold = 50, preventDefaultTouchmoveEvent = false } = options;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (preventDefaultTouchmoveEvent && touchStartRef.current) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

        // Only prevent default if horizontal swipe is detected
        if (deltaX > deltaY && deltaX > threshold / 2) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaTime = Date.now() - touchStartRef.current.time;

      // Calculate absolute distances
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Swipe must be faster than 300ms and exceed threshold
      // Also, the primary direction (X or Y) should be more dominant
      if (deltaTime < 300 && (absDeltaX > threshold || absDeltaY > threshold)) {
        if (absDeltaX > absDeltaY) {
          // Horizontal swipe
          if (deltaX > 0) {
            callbacks.onSwipeRight?.();
          } else {
            callbacks.onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            callbacks.onSwipeDown?.();
          } else {
            callbacks.onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, {
      passive: !preventDefaultTouchmoveEvent,
    });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [callbacks, threshold, preventDefaultTouchmoveEvent]);

  return elementRef;
}
