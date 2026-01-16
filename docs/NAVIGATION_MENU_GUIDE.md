# Navigation Menu Guide

## Overview

The CertLab application uses Radix UI Navigation Menu component to provide a scalable, accessible mega menu navigation system. This guide documents the navigation structure and organization.

## Navigation Structure

### Desktop Navigation (≥768px)

The desktop navigation is organized into four main sections:

#### 1. Dashboard (Direct Link)
- **Route**: `/app` or `/app/dashboard`
- **Icon**: Home
- **Purpose**: Quick access to the main dashboard view
- **Why Direct**: Most frequently accessed page, deserves prominent placement

#### 2. Learning (Mega Menu)
A dropdown menu containing all study and learning-related features:

- **Daily Challenges** (NEW)
  - Route: `/app/daily-challenges`
  - Icon: Target
  - Description: Complete daily and quick challenges
  
- **Performance**
  - Route: `/app/performance`
  - Icon: BarChart3
  - Description: Track your learning progress
  
- **Practice Tests**
  - Route: `/app/practice-tests`
  - Icon: FileText
  - Description: Take full-length practice exams
  
- **Question Bank**
  - Route: `/app/question-bank`
  - Icon: Database
  - Description: Browse and filter question library
  
- **Study Timer**
  - Route: `/app/study-timer`
  - Icon: Timer
  - Description: Track study time and sessions
  
- **Analytics**
  - Route: `/app/analytics`
  - Icon: BarChart3
  - Description: Deep insights into learning patterns

#### 3. Community (Mega Menu)
A dropdown menu for social and achievement features:

- **Achievements**
  - Route: `/app/achievements`
  - Icon: Trophy
  - Description: View earned badges and certifications
  
- **Leaderboard**
  - Route: `/app/leaderboard`
  - Icon: Award
  - Description: Compare rankings and compete
  
- **Certificates**
  - Route: `/app/certificates`
  - Icon: Award
  - Description: View and download certificates

#### 4. Tools & Resources (Mega Menu)
A comprehensive dropdown menu organized into subsections:

##### Study Tools
- **Study Notes** - View and export saved study notes
- **Enhanced Notes** - Advanced note-taking with AI features
- **Quiz Builder** - Create custom quizzes with your own questions
- **My Quizzes** - Manage and duplicate your quiz templates

##### Marketplace & Resources
- **Study Materials** - Browse and purchase study materials
- **My Materials** - View and manage purchased materials
- **Wallet** - Manage tokens and purchases

##### Other Features
- **Import Sample Data** - Load 500+ practice questions per certification
- **I18n Demo** - Internationalization demo page
- **Credits** - Acknowledgments and attributions

##### Admin Tools (Admin Only)
- **Reporting** - Analytics & progress reports
- **Accessibility** - Check color contrast and accessibility
- **UI Structure** - Interactive application architecture

##### Administration (Admin Only)
- **Admin Dashboard** - Manage users, content, and system settings

### Mobile Navigation (< 768px)

On mobile devices, the navigation uses a different component (`MobileNavigationEnhanced`) which provides:
- Bottom navigation bar for quick access
- Hamburger menu for full navigation
- Touch-optimized interface

## Active State Indicators

Navigation items show their active state through:
- **Mega Menu Triggers**: Text color changes to primary when any child route is active
- **Menu Items**: Active items have:
  - Primary color background with 10% opacity
  - 2px primary color border
  - Distinct visual separation from inactive items

## Accessibility Features

### Keyboard Navigation
- All navigation items are keyboard accessible
- Tab navigation follows logical order
- Enter/Space key activates menu items

### Screen Readers
- Proper ARIA labels on all interactive elements
- Semantic HTML structure
- Clear focus indicators

### Visual Indicators
- Active state clearly visible
- Sufficient color contrast
- Icon + text labels for clarity

## Implementation Details

### Component: Header.tsx
Location: `/client/src/components/Header.tsx`

The navigation uses Radix UI's Navigation Menu primitives:
```typescript
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
```

### Active Path Detection
```typescript
const isActivePath = (path: string) => {
  if (path === '/app' || path === '/app/dashboard') {
    return location.pathname === '/app' || location.pathname === '/app/dashboard';
  }
  return location.pathname === path || location.pathname.startsWith(path + '/');
};
```

### Mega Menu Structure
Each mega menu follows this pattern:
```tsx
<NavigationMenuItem>
  <NavigationMenuTrigger>
    <Icon />
    Menu Name
  </NavigationMenuTrigger>
  <NavigationMenuContent>
    <div className="grid gap-3 p-6 w-[width] bg-card">
      {/* Menu items organized in sections */}
    </div>
  </NavigationMenuContent>
</NavigationMenuItem>
```

## Benefits of Mega Menu Approach

### Scalability
- Easy to add new navigation items without horizontal overflow
- Grouped items reduce visual clutter
- Flexible grid layout accommodates varying numbers of items

### Discoverability
- Related features grouped together logically
- Visual hierarchy with section headers
- Descriptive text helps users find what they need

### Maintainability
- Clear component structure
- Consistent styling patterns
- Easy to reorder or reorganize items

### Performance
- Radix UI provides optimized rendering
- Proper code splitting for lazy-loaded pages
- Minimal re-renders through React optimization

## Responsive Behavior

| Screen Size | Navigation Type | Key Features |
|-------------|----------------|--------------|
| < 768px | Mobile Navigation | Bottom bar + hamburger menu |
| 768px - 1024px | Desktop (limited space) | Mega menus with condensed layouts |
| ≥ 1024px | Desktop (full) | Mega menus with full descriptions |

## Future Enhancements

Potential improvements for the navigation system:

1. **Search Integration**: Add global search to quickly find pages/features
2. **Recent Pages**: Track and show recently visited pages
3. **Favorites**: Allow users to pin frequently used pages
4. **Customization**: Let users reorder or hide menu items
5. **Breadcrumbs**: Add breadcrumb navigation for deeper pages

## Testing Considerations

When testing navigation changes:

1. **Keyboard Navigation**: Test all keyboard shortcuts and tab order
2. **Screen Readers**: Verify proper announcements
3. **Active States**: Ensure active indicators work for all routes
4. **Mobile View**: Test on actual devices, not just browser dev tools
5. **Deep Links**: Verify that direct URL navigation shows correct active states
6. **Admin Access**: Test both admin and non-admin user views

## Related Components

- **MobileNavigationEnhanced**: Mobile-specific navigation
- **MobileBottomNav**: Bottom navigation bar for mobile
- **BreadcrumbNavigation**: Breadcrumb trail component
- **navigation-menu.tsx**: Radix UI wrapper components

## Version History

### v2.0.0 (2026-01-16)
- **Major Redesign**: Implemented mega menu navigation structure
- **Reorganization**: Grouped navigation items into logical categories
- **Scalability**: Improved ability to add new navigation items
- **Accessibility**: Enhanced keyboard and screen reader support
- **Visual Polish**: Added active state indicators and improved styling

### Previous Versions
- v1.x: Individual button navigation items (not scalable)
- Early versions: Basic link-based navigation
