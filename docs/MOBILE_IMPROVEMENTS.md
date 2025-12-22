# Mobile Experience Improvements

This document describes the mobile experience improvements implemented in CertLab, including touch gestures, mobile navigation, keyboard handling, and performance optimizations.

## Overview

The mobile experience improvements focus on making CertLab fully accessible and optimized for mobile devices, following iOS Human Interface Guidelines and Android Material Design best practices.

## Features Implemented

### 1. Swipe Gesture Navigation

**Location**: `client/src/hooks/use-swipe.tsx`, `client/src/components/QuizInterface.tsx`

#### Capabilities:
- **Swipe Detection**: Detects left, right, up, and down swipe gestures
- **Configurable Threshold**: Minimum swipe distance (default: 50px)
- **Visual Feedback**: Shows animated indicator when swiping
- **Quiz Navigation**: Swipe left for next question, right for previous

#### Usage Example:
```tsx
import { useSwipe } from '@/hooks/use-swipe';

const swipeRef = useSwipe({
  onSwipeLeft: () => console.log('Swiped left'),
  onSwipeRight: () => console.log('Swiped right'),
}, { threshold: 50 });

return <div ref={swipeRef}>Swipeable content</div>;
```

#### Visual Feedback:
- Animated chevron icon appears during swipe
- Confirms action to user with clear directional indicator
- Auto-dismisses after 500ms

### 2. Mobile Bottom Navigation

**Location**: `client/src/components/MobileBottomNav.tsx`

#### Features:
- **Fixed Bottom Bar**: Always accessible navigation on mobile
- **Touch-Optimized**: 48px minimum touch targets (WCAG 2.1 compliant)
- **Active State**: Visual indicator for current page
- **Icon + Label**: Clear navigation with both icons and text
- **Responsive**: Only appears on mobile viewports (<768px)

#### Navigation Items:
1. Dashboard - Primary landing page
2. Marketplace - Study materials
3. Study - Study notes and resources
4. Achievements - Progress tracking
5. Profile - User settings

#### Implementation:
- Integrated into `AuthenticatedLayout.tsx`
- Adds 80px spacer to prevent content overlap
- Uses z-index layering for proper stacking

### 3. Mobile Keyboard Handling

**Location**: `client/src/hooks/use-mobile-keyboard.tsx`

#### Capabilities:
- **Auto-Scroll**: Scrolls input fields into view when focused
- **Prevent Zoom**: Temporarily prevents iOS zoom on input focus
- **Smart Focus**: Centers input in viewport for better UX
- **Viewport Management**: Restores viewport after blur

#### Features:
- Handles all input types (text, textarea, select, contentEditable)
- 300ms delay to wait for keyboard appearance
- Smooth scroll animation
- Automatic cleanup on component unmount

### 4. Mobile Performance Optimizations

**Location**: `client/src/lib/mobile-performance.ts`

#### Utilities Provided:

##### `usePrefersReducedMotion()`
Detects if user has enabled reduced motion for accessibility.

##### `useMobileDebounce(value, delay)`
Debounces values with longer delay on mobile for better performance.
- Desktop: Uses specified delay
- Mobile: Uses delay × 1.5

##### `useMobileThrottle(callback, delay)`
Throttles function calls with mobile-specific timing.
- Prevents excessive calls during rapid events (scroll, resize)
- Longer throttle on mobile to reduce CPU usage

##### `useMobileIntersectionObserver(callback, options)`
Implements lazy loading with mobile optimizations.
- More aggressive intersection thresholds on mobile
- 50px root margin for smoother loading
- 0.1 threshold for early triggering

##### `useSlowConnection()`
Detects slow network connections (2G, slow-2G).
- Can be used to reduce quality or defer non-essential loads

### 5. Mobile Layout Utilities

**Location**: `client/src/lib/mobile-layout.ts`

#### Constants and Utilities:

##### Touch Targets
```tsx
TOUCH_TARGET.MIN          // 44x44px (WCAG minimum)
TOUCH_TARGET.RECOMMENDED  // 48x48px (Material Design)
TOUCH_TARGET.COMFORTABLE  // 56x56px (Comfortable)
```

##### Spacing
```tsx
MOBILE_SPACING.TIGHT      // space-y-2 md:space-y-3
MOBILE_SPACING.NORMAL     // space-y-3 md:space-y-4
MOBILE_SPACING.RELAXED    // space-y-4 md:space-y-6
MOBILE_SPACING.LOOSE      // space-y-6 md:space-y-8
```

##### Typography
```tsx
MOBILE_TEXT.HEADING_1     // text-2xl sm:text-3xl lg:text-4xl
MOBILE_TEXT.BODY          // text-base sm:text-base lg:text-lg
MOBILE_TEXT.SMALL         // text-sm sm:text-sm lg:text-base
```

##### Grid Layouts
```tsx
MOBILE_GRID.SINGLE        // grid grid-cols-1
MOBILE_GRID.TWO_COL       // grid grid-cols-1 sm:grid-cols-2
MOBILE_GRID.THREE_COL     // grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```

##### Touch States
```tsx
TOUCH_STATES.DEFAULT      // touch-manipulation select-none
TOUCH_STATES.FEEDBACK     // active:scale-95 transition-transform
TOUCH_STATES.HIGHLIGHT    // active:bg-accent/50
```

#### Helper Functions

##### `mobileCx(...classes)`
Combines mobile layout classes, filtering out falsy values.

##### `mobileContainer(maxWidth)`
Generates responsive container classes with proper padding.

##### `mobileFormField()`
Generates mobile-optimized form field classes.

##### `mobileListItem(interactive)`
Generates mobile-optimized list item classes with optional interactivity.

### 6. Visual Swipe Indicator

**Location**: `client/src/components/SwipeIndicator.tsx`

#### Features:
- Animated appearance/disappearance
- Directional icon (left/right chevron)
- Centered on screen
- 500ms duration (configurable)
- Framer Motion animations

#### Usage:
```tsx
import { SwipeIndicator, useSwipeIndicator } from '@/components/SwipeIndicator';

const { swipeDirection, showSwipeLeft, showSwipeRight } = useSwipeIndicator();

// Trigger on swipe
const handleSwipe = () => {
  showSwipeLeft();
  // ... perform action
};

return <SwipeIndicator direction={swipeDirection} />;
```

## Mobile-Specific UI Components

### MobileTouchOptimized (Existing)

**Location**: `client/src/components/MobileTouchOptimized.tsx`

Wrapper component that provides:
- Haptic-style feedback via visual cues
- Touch target sizing
- Double-tap zoom prevention
- Active state styling

### MobileNavigationEnhanced (Existing)

**Location**: `client/src/components/MobileNavigationEnhanced.tsx`

Full-featured mobile navigation drawer with:
- Sheet/drawer UI pattern
- User profile section
- Organized navigation sections
- Tenant switcher integration
- Touch-optimized list items

## Integration Points

### 1. App.tsx
- Imports and activates `useMobileKeyboard()` hook
- Applied globally to all pages

### 2. AuthenticatedLayout.tsx
- Imports `MobileBottomNav` component
- Positioned below main content area
- Integrated with existing layout

### 3. QuizInterface.tsx
- Imports `useSwipe` hook
- Imports `SwipeIndicator` component
- Enables left/right swipe navigation
- Shows swipe hint on mobile
- Displays visual feedback during swipes

## Testing Recommendations

### Manual Testing

1. **Touch Targets**: Verify all interactive elements meet 44x44px minimum
2. **Swipe Gestures**: Test in quiz interface on mobile device
3. **Bottom Navigation**: Verify navigation works and doesn't overlap content
4. **Keyboard Handling**: Test input focus and scroll behavior
5. **Visual Feedback**: Confirm swipe indicator appears and dismisses correctly

### Viewport Testing

Test on these viewport sizes:
- Mobile: 375x667 (iPhone SE)
- Mobile: 390x844 (iPhone 12/13)
- Mobile: 360x740 (Android)
- Tablet: 768x1024 (iPad)
- Desktop: 1920x1080

### Browser Testing

- Safari iOS (primary mobile browser)
- Chrome Android
- Firefox Mobile
- Samsung Internet

### Performance Testing

1. Test on 3G connection simulation
2. Verify scroll performance with throttling
3. Check animation frame rates
4. Monitor memory usage during navigation

## Accessibility Compliance

### WCAG 2.1 Level AA

✅ **Touch Target Size**: Minimum 44x44px (Success Criterion 2.5.5)
✅ **Motion Control**: Respects `prefers-reduced-motion` (Success Criterion 2.3.3)
✅ **Focus Visible**: Clear focus indicators on all interactive elements
✅ **Keyboard Navigation**: All functions accessible via keyboard
✅ **Screen Reader Support**: Proper ARIA labels and roles

### iOS Compliance

✅ **Touch Targets**: 44pt minimum (matches iOS HIG)
✅ **Safe Area**: Respects device safe areas
✅ **Tap Highlight**: Disabled for custom touch feedback
✅ **Zoom Control**: Managed for form inputs

### Android Compliance

✅ **Touch Targets**: 48dp minimum (matches Material Design)
✅ **Ripple Effects**: Custom touch feedback implemented
✅ **Bottom Navigation**: Follows Material Design patterns

## Performance Metrics

### Target Metrics

- **First Input Delay (FID)**: < 100ms
- **Time to Interactive (TTI)**: < 3.8s on 3G
- **Cumulative Layout Shift (CLS)**: < 0.1
- **Touch Response Time**: < 50ms

### Optimizations Applied

1. **Debouncing**: Search and input handlers
2. **Throttling**: Scroll and resize handlers
3. **Lazy Loading**: Images and non-critical content
4. **Passive Events**: Scroll and touch events
5. **Code Splitting**: Lazy-loaded components

## Future Enhancements

### Planned Improvements

1. **Pull-to-Refresh**: Native-style refresh gesture
2. **Long-Press Actions**: Context menus on long press
3. **Gesture Conflicts**: Better handling of gesture conflicts
4. **Offline Support**: Enhanced offline mode for mobile
5. **Haptic Feedback**: Real haptic feedback via Vibration API
6. **Install Prompt**: Progressive Web App install prompt
7. **Share API**: Native share functionality
8. **Biometric Auth**: Fingerprint/Face ID support

### A/B Testing Opportunities

1. Bottom nav vs. hamburger menu
2. Swipe threshold distances
3. Touch feedback duration
4. Navigation item order

## Known Issues

### Current Limitations

1. **Swipe Conflicts**: May conflict with browser gestures on some devices
2. **Keyboard Coverage**: Virtual keyboard may cover inputs on some Android devices
3. **Safe Areas**: Limited testing on devices with notches/cutouts

### Workarounds

1. Use `preventDefaultTouchmoveEvent` option for critical swipes
2. Adjust scroll margin in keyboard handler
3. Test on physical devices for safe area handling

## References

### Design Guidelines

- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [Material Design Guidelines](https://material.io/design)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Technical Resources

- [Touch Events API](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)

## Maintenance

### Code Ownership

Mobile experience improvements are maintained by the frontend team.

### Update Schedule

- Review quarterly for new mobile patterns
- Update with major React/framework updates
- Monitor user feedback and analytics

### Dependencies

Key dependencies for mobile features:
- `framer-motion`: Animations
- `react-router-dom`: Navigation
- `@tanstack/react-query`: Data management

## Support

For issues or questions about mobile features:
1. Check this documentation first
2. Review component source code
3. Test on actual devices
4. File issue with device details and reproduction steps
