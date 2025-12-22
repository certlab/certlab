/**
 * Mobile Layout Utilities
 *
 * Provides responsive CSS classes and utilities optimized for mobile devices.
 * Includes touch target sizing, spacing, and typography optimizations.
 */

/**
 * WCAG 2.1 compliant touch target size (minimum 44x44 pixels)
 * iOS Human Interface Guidelines recommend 44pt minimum
 * Android Material Design recommends 48dp minimum
 */
export const TOUCH_TARGET = {
  MIN: 'min-h-[44px] min-w-[44px]',
  RECOMMENDED: 'min-h-[48px] min-w-[48px]',
  COMFORTABLE: 'min-h-[56px] min-w-[56px]',
} as const;

/**
 * Mobile-optimized spacing scale
 * More compact than desktop but still comfortable for touch
 */
export const MOBILE_SPACING = {
  TIGHT: 'space-y-2 md:space-y-3',
  NORMAL: 'space-y-3 md:space-y-4',
  RELAXED: 'space-y-4 md:space-y-6',
  LOOSE: 'space-y-6 md:space-y-8',
} as const;

/**
 * Mobile-optimized padding scale
 */
export const MOBILE_PADDING = {
  CARD: 'p-4 md:p-6',
  SECTION: 'px-4 py-6 md:px-6 md:py-8',
  CONTAINER: 'px-4 sm:px-6 lg:px-8',
} as const;

/**
 * Mobile-optimized typography scale
 * Larger base size for better readability on small screens
 */
export const MOBILE_TEXT = {
  HEADING_1: 'text-2xl sm:text-3xl lg:text-4xl',
  HEADING_2: 'text-xl sm:text-2xl lg:text-3xl',
  HEADING_3: 'text-lg sm:text-xl lg:text-2xl',
  BODY: 'text-base sm:text-base lg:text-lg',
  SMALL: 'text-sm sm:text-sm lg:text-base',
  TINY: 'text-xs sm:text-xs lg:text-sm',
} as const;

/**
 * Mobile-optimized button classes
 */
export const MOBILE_BUTTON = {
  PRIMARY: `${TOUCH_TARGET.RECOMMENDED} px-6 py-3 text-base font-medium`,
  SECONDARY: `${TOUCH_TARGET.MIN} px-4 py-2 text-sm font-medium`,
  ICON: `${TOUCH_TARGET.MIN} p-2`,
  LARGE: `${TOUCH_TARGET.COMFORTABLE} px-8 py-4 text-lg font-semibold`,
} as const;

/**
 * Mobile-optimized card classes
 */
export const MOBILE_CARD = {
  DEFAULT: `${MOBILE_PADDING.CARD} rounded-lg shadow-md`,
  INTERACTIVE: `${MOBILE_PADDING.CARD} rounded-lg shadow-md active:shadow-lg transition-shadow ${TOUCH_TARGET.RECOMMENDED}`,
  FLAT: `${MOBILE_PADDING.CARD} rounded-lg border`,
} as const;

/**
 * Mobile-optimized grid layouts
 */
export const MOBILE_GRID = {
  SINGLE: 'grid grid-cols-1',
  TWO_COL: 'grid grid-cols-1 sm:grid-cols-2',
  THREE_COL: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  FOUR_COL: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  AUTO_FIT: 'grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))]',
} as const;

/**
 * Mobile-optimized gap spacing
 */
export const MOBILE_GAP = {
  TIGHT: 'gap-2 md:gap-3',
  NORMAL: 'gap-3 md:gap-4',
  RELAXED: 'gap-4 md:gap-6',
  LOOSE: 'gap-6 md:gap-8',
} as const;

/**
 * Common mobile layout patterns
 */
export const MOBILE_LAYOUT = {
  STACK: 'flex flex-col',
  STACK_CENTER: 'flex flex-col items-center',
  SPLIT: 'flex flex-col md:flex-row',
  SPLIT_CENTER: 'flex flex-col md:flex-row items-center',
  BETWEEN: 'flex items-center justify-between',
  WRAP: 'flex flex-wrap',
} as const;

/**
 * Mobile-safe z-index scale
 * Ensures proper layering for mobile overlays
 */
export const MOBILE_Z_INDEX = {
  BASE: 'z-0',
  ELEVATED: 'z-10',
  DROPDOWN: 'z-20',
  STICKY: 'z-30',
  FIXED: 'z-40',
  MODAL: 'z-50',
  TOAST: 'z-60',
} as const;

/**
 * Mobile viewport optimization classes
 */
export const MOBILE_VIEWPORT = {
  FULL_HEIGHT: 'min-h-screen',
  SAFE_AREA: 'min-h-[calc(100vh-env(safe-area-inset-bottom))]',
  WITH_NAV: 'min-h-[calc(100vh-4rem)]', // Account for 4rem nav height
} as const;

/**
 * Touch-optimized interactive states
 */
export const TOUCH_STATES = {
  DEFAULT: 'touch-manipulation select-none',
  FEEDBACK: 'active:scale-95 transition-transform duration-150',
  HIGHLIGHT: 'active:bg-accent/50',
  NO_TAP_HIGHLIGHT: 'tap-highlight-transparent',
} as const;

/**
 * Utility function to combine mobile layout classes
 */
export function mobileCx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Helper to generate responsive container classes
 */
export function mobileContainer(maxWidth: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'lg'): string {
  return mobileCx(
    'w-full mx-auto',
    MOBILE_PADDING.CONTAINER,
    `max-w-${maxWidth === 'sm' ? 'screen-sm' : maxWidth === 'md' ? 'screen-md' : maxWidth === 'lg' ? '7xl' : maxWidth === 'xl' ? 'screen-xl' : 'screen-2xl'}`
  );
}

/**
 * Helper to generate mobile-optimized form field classes
 */
export function mobileFormField(): string {
  return mobileCx(
    TOUCH_TARGET.RECOMMENDED,
    'w-full px-4 py-3 text-base',
    'rounded-lg border border-input',
    'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
    TOUCH_STATES.DEFAULT
  );
}

/**
 * Helper to generate mobile-optimized list item classes
 */
export function mobileListItem(interactive: boolean = false): string {
  return mobileCx(
    MOBILE_PADDING.CARD,
    'rounded-lg',
    interactive && TOUCH_TARGET.RECOMMENDED,
    interactive && TOUCH_STATES.DEFAULT,
    interactive && TOUCH_STATES.FEEDBACK,
    interactive && 'cursor-pointer hover:bg-accent/50'
  );
}
