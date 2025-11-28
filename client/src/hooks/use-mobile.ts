/**
 * Mobile Detection Hook
 * 
 * Custom React hook that detects whether the current viewport
 * is considered mobile-sized (less than 768px wide).
 * 
 * @module use-mobile
 */

import { useState, useEffect } from 'react';

/**
 * Hook that returns whether the current viewport is mobile-sized.
 * 
 * This hook uses the window resize event to reactively update when
 * the viewport size changes. The mobile breakpoint is 768px, which
 * aligns with Tailwind CSS's default `md` breakpoint.
 * 
 * @returns `true` if viewport width is less than 768px, `false` otherwise
 * 
 * @example
 * function ResponsiveComponent() {
 *   const isMobile = useIsMobile();
 *   
 *   return isMobile ? <MobileLayout /> : <DesktopLayout />;
 * }
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Check on mount
    checkIsMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}