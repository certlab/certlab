# GitHub Issue: Refactor app to use side navigation drawer with 2-level navigation items

**Title:** Refactor app to use side navigation drawer with 2-level navigation items

**Labels:** enhancement, ux, navigation, accessibility

---

## Overview

Refactor the CertLab application to use a persistent side navigation drawer with 2-level navigation items for improved usability across devices with varying screen sizes.

## Current State

The application currently uses multiple navigation patterns:

### Desktop (≥768px)
- **Header.tsx** (~1,168 lines): Horizontal navigation bar with dropdown mega-menus
  - Home button with logo
  - "Learn" mega-menu with 3 sections: Study Materials, Core Features, Progress & Performance
  - "Community" mega-menu with achievements, leaderboard, certificates
  - "Tools & Resources" mega-menu with 4 sections: Study Tools, Progress Tracking, Other Features, Admin Tools
  - User dropdown with profile, wallet, theme, settings, logout
- Complex nested structure with visual noise from multiple dropdowns

### Mobile (<768px)
- **MobileNavigationEnhanced.tsx** (~300 lines): Left-side Sheet drawer with flat navigation list
  - Triggered by hamburger menu icon in header
  - ~25+ navigation items in a long, flat scrollable list
  - Admin items conditionally added at bottom
  - No hierarchical organization
  
- **MobileBottomNav.tsx** (~121 lines): Fixed bottom navigation bar
  - 4 primary items: Dashboard, Marketplace, Study, Achievements
  - Limited to most frequently accessed features

### Navigation Items
The app includes ~30+ navigation items organized into logical groups:
- **Dashboard & Analytics**: Dashboard, Analytics, Performance
- **Learning**: Quiz Builder, My Quizzes, Practice Tests, Question Bank, Daily Challenges
- **Study Resources**: Study Notes, Enhanced Notes, Study Timer, Marketplace, My Materials
- **Community**: Achievements, Leaderboard, Certificates
- **Progress**: Wallet (tokens)
- **Tools**: Data Import, Personal Import, I18n Demo
- **Admin** (conditionally): Admin Dashboard, User Roles, Reporting, Accessibility, UI Structure

## Problem Statement

The current navigation has several usability issues:

1. **Inconsistent Experience**: Desktop uses dropdown mega-menus while mobile uses a side drawer, creating different mental models
2. **Poor Discoverability**: On mobile, 25+ flat items in a scrollable list make it hard to find specific features
3. **Inefficient Navigation**: Users must remember where items are located in long lists or nested dropdowns
4. **Limited Screen Estate**: Desktop mega-menus take up significant vertical space when opened
5. **Cognitive Load**: Flat mobile navigation doesn't communicate feature relationships or hierarchy
6. **Maintenance Burden**: Three separate navigation implementations (~1,600 lines total) with different structures

## Proposed Solution

Implement a unified side navigation drawer with collapsible 2-level navigation items across all screen sizes.

### Design Approach

**Use existing shadcn/ui Sidebar component** (`client/src/components/ui/sidebar.tsx`, ~729 lines)
- Already integrated into the project
- Supports expandable/collapsible states
- Built-in mobile sheet behavior
- Responsive with touch-friendly interactions
- Includes keyboard shortcuts (toggle with 'b')

### Navigation Structure (2-Level Hierarchy)

```
🏠 Dashboard
📚 Learn
  ├─ 🎯 Daily Challenges (NEW badge)
  ├─ ✏️ Quiz Builder
  ├─ 📝 My Quizzes
  ├─ 📄 Practice Tests
  └─ 🗃️ Question Bank
  
📖 Study Resources
  ├─ 📓 Study Notes
  ├─ ✨ Enhanced Notes
  ├─ ⏱️ Study Timer
  ├─ 🛒 Marketplace
  ├─ 📁 My Materials
  
🏆 Community
  ├─ 🏅 Achievements
  ├─ 📊 Leaderboard
  └─ 🎓 Certificates
  
📈 Progress & Analytics
  ├─ 📊 Analytics
  ├─ 📈 Performance
  └─ 💰 Wallet
  
🔧 Tools
  ├─ 📥 Import Sample Data
  ├─ ➕ Import Personal Questions
  ├─ 🌐 I18n Demo
  └─ ❤️ Credits

⚙️ Admin (if isAdmin)
  ├─ 🏛️ Admin Dashboard
  ├─ 👥 User Roles
  ├─ 📊 Reporting
  ├─ ♿ Accessibility
  └─ 🗂️ UI Structure
```

### Behavior

**Desktop (≥768px)**
- Persistent sidebar on the left (default: expanded, can collapse to icons-only)
- Collapsible groups (click to expand/collapse)
- State persisted to localStorage
- Keyboard shortcut: 'b' to toggle sidebar
- Header remains but simplified (logo, search, notifications, user dropdown)

**Tablet (768px - 1024px)**
- Same as desktop but default to collapsed (icons-only) to save space
- Expand on hover or click

**Mobile (<768px)**
- Sidebar as overlay Sheet (same as current MobileNavigationEnhanced)
- Triggered by hamburger menu in header
- Full-screen overlay when open
- Close on navigation or backdrop click
- Keep bottom navigation for quick access to 4 primary features

### Benefits

1. **Consistent UX**: Same navigation pattern across all devices
2. **Better Organization**: 2-level hierarchy groups related features
3. **Improved Discoverability**: Clear categories make features easier to find
4. **Reduced Cognitive Load**: Collapsible groups hide complexity until needed
5. **Space Efficiency**: Collapsed sidebar reclaims screen estate on desktop
6. **Maintainability**: Single source of truth for navigation items (~60% code reduction)
7. **Accessibility**: Keyboard navigation, ARIA labels, skip links
8. **Modern UX**: Aligns with contemporary web app patterns (similar to Notion, Linear, GitHub)

## Technical Implementation Notes

### Files to Modify
- `client/src/components/AuthenticatedLayout.tsx`: Add SidebarProvider and Sidebar
- `client/src/components/Header.tsx`: Simplify to basic header (logo, search, user menu)
- Create new: `client/src/components/AppNavigation.tsx`: Main navigation component with 2-level structure
- Keep: `client/src/components/MobileBottomNav.tsx`: Quick access to primary features

### Files to Remove (After Refactor)
- `client/src/components/MobileNavigationEnhanced.tsx`: Replaced by unified sidebar
- Navigation mega-menus from Header.tsx: ~600 lines of dropdown code

### Navigation Item Data Structure
```typescript
interface NavGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  items?: NavItem[];  // If undefined, it's a single-level item
  adminOnly?: boolean;
  defaultOpen?: boolean;
}

interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href: string;
  badge?: string;  // e.g., "NEW"
  adminOnly?: boolean;
}
```

### Responsive Breakpoints
- Mobile: < 768px (Sheet overlay)
- Tablet: 768px - 1024px (Collapsed by default, expandable)
- Desktop: ≥ 1024px (Expanded by default, collapsible)

## Success Criteria

- [ ] Single navigation component used across all screen sizes
- [ ] 2-level collapsible navigation structure implemented
- [ ] Sidebar state persists across page refreshes
- [ ] Keyboard shortcut ('b') toggles sidebar
- [ ] Mobile bottom nav preserved for quick access
- [ ] All existing routes accessible from new navigation
- [ ] Navigation accessible (ARIA labels, keyboard navigation)
- [ ] TypeScript types properly defined
- [ ] Reduced code complexity (target: ~60% reduction in navigation code)
- [ ] Smooth animations for expand/collapse
- [ ] No broken routes or missing navigation items

## Open Questions

1. Should the sidebar be collapsible on mobile, or always full-screen Sheet?
2. Should we keep the mobile bottom nav, or consolidate everything into the sidebar?
3. Default sidebar state: expanded or collapsed on desktop?
4. Should search/global actions be in sidebar or remain in header?
5. Visual design: Material-style or keep current CertLab theme aesthetic?

## References

- Existing Sidebar component: `client/src/components/ui/sidebar.tsx`
- Current navigation: 
  - Header: `client/src/components/Header.tsx`
  - Mobile: `client/src/components/MobileNavigationEnhanced.tsx`
  - Bottom nav: `client/src/components/MobileBottomNav.tsx`
- Layout: `client/src/components/AuthenticatedLayout.tsx`

## Priority

Medium-High - This is a significant UX improvement that will benefit all users across devices and reduce technical debt.

## Estimated Effort

3-5 days for a senior developer:
- Day 1: Design navigation structure, create AppNavigation component
- Day 2: Integrate sidebar into AuthenticatedLayout, implement 2-level collapsible groups
- Day 3: Responsive behavior, state persistence, keyboard shortcuts
- Day 4: Migrate all navigation items, update Header, remove old code
- Day 5: Testing, accessibility audit, polish animations

---

## Instructions for Creating the Issue

To create this issue on GitHub:

1. Go to https://github.com/certlab/certlab/issues/new
2. Copy the title above
3. Copy the entire content after the "---" separator
4. Add labels: `enhancement`, `ux`, `navigation`, `accessibility`
5. Submit the issue
