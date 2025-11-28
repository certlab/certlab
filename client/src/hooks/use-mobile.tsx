/**
 * Mobile Detection Hook (Media Query Implementation)
 * 
 * Custom React hook that detects whether the current viewport
 * is considered mobile-sized using CSS media queries.
 * 
 * This is an alternative implementation using `matchMedia` for
 * better performance compared to resize event listeners.
 * 
 * @module use-mobile
 */

import * as React from "react"

/** Mobile breakpoint in pixels (matches Tailwind CSS's `md` breakpoint) */
const MOBILE_BREAKPOINT = 768

/**
 * Hook that returns whether the current viewport is mobile-sized.
 * 
 * This implementation uses `window.matchMedia` with a CSS media query,
 * which is more performant than listening to resize events as the
 * browser handles the matching internally.
 * 
 * @returns `true` if viewport width is less than 768px, `false` otherwise.
 *          Returns `false` initially before the effect runs (during first render).
 *          Note: This hook requires a browser environment with `window` available.
 * 
 * @example
 * function ResponsiveComponent() {
 *   const isMobile = useIsMobile();
 *   
 *   if (isMobile) {
 *     return <MobileNavigation />;
 *   }
 *   return <DesktopNavigation />;
 * }
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
