/**
 * Mobile Performance Optimizations
 *
 * Collection of utilities and hooks to improve performance on mobile devices.
 * Includes lazy loading, debouncing, and reduced motion support.
 *
 * @module mobile-performance
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

/**
 * Hook to detect if user prefers reduced motion for accessibility
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to debounce a value for mobile performance
 * Useful for search inputs, resize handlers, etc.
 */
export function useMobileDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Use longer delay on mobile
    const actualDelay = isMobile ? delay * 1.5 : delay;
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, actualDelay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, isMobile]);

  return debouncedValue;
}

/**
 * Hook to throttle a callback function for mobile performance
 * Prevents excessive function calls during rapid events (scroll, resize, etc.)
 */
export function useMobileThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 200
): T {
  const isMobile = useIsMobile();
  const lastRun = useRef(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const actualDelay = isMobile ? delay * 1.5 : delay;

      if (now - lastRun.current >= actualDelay) {
        callback(...args);
        lastRun.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(
          () => {
            callback(...args);
            lastRun.current = Date.now();
          },
          actualDelay - (now - lastRun.current)
        );
      }
    },
    [callback, delay, isMobile]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return throttledCallback;
}

/**
 * Hook to enable/disable passive event listeners for better scroll performance
 * Returns appropriate options object for addEventListener
 */
export function useMobilePassiveEvents() {
  const isMobile = useIsMobile();

  return useCallback(
    (options?: AddEventListenerOptions): AddEventListenerOptions => {
      if (!isMobile) return options || {};

      return {
        ...options,
        passive: true,
      };
    },
    [isMobile]
  );
}

/**
 * Hook to implement intersection observer for lazy loading on mobile
 * Useful for images, cards, and other content that can be loaded on-demand
 */
export function useMobileIntersectionObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Use more aggressive intersection thresholds on mobile to save resources
    const actualOptions: IntersectionObserverInit = isMobile
      ? {
          ...options,
          rootMargin: options?.rootMargin || '50px',
          threshold: options?.threshold || 0.1,
        }
      : options || {};

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);
        }
      });
    }, actualOptions);

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [callback, options, isMobile]);

  return ref;
}

/**
 * Utility to apply mobile-optimized CSS classes conditionally
 */
export function getMobileOptimizedClasses(baseClasses: string, mobileClasses: string): string {
  return `${baseClasses} md:${baseClasses.split(' ').join(' md:')} ${mobileClasses}`;
}

/**
 * Hook to detect slow network connection (useful for loading optimizations)
 */
export function useSlowConnection(): boolean {
  const [isSlowConnection, setIsSlowConnection] = useState(false);

  useEffect(() => {
    // Check if Network Information API is available
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) {
      setIsSlowConnection(false);
      return;
    }

    const updateConnectionStatus = () => {
      // 2G and slow 3G are considered slow
      const effectiveType = connection.effectiveType;
      setIsSlowConnection(effectiveType === '2g' || effectiveType === 'slow-2g');
    };

    updateConnectionStatus();
    connection.addEventListener('change', updateConnectionStatus);

    return () => {
      connection.removeEventListener('change', updateConnectionStatus);
    };
  }, []);

  return isSlowConnection;
}
