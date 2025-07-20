# UI Structure - SecuraCert Learning Platform

## Document Metadata
- **Type**: UI Structure Documentation
- **Version**: 1.0
- **Created**: 2025-07-20
- **Format**: Hierarchical Label-Based Structure
- **Machine Readable**: Yes

---

## Application Architecture

### Root Application Container
- **Label**: `app`
- **Type**: `root-container`
- **Provider Components**:
  - **Label**: `query-client-provider`
    - **Type**: `data-provider`
    - **Library**: `@tanstack/react-query`
  - **Label**: `theme-provider`
    - **Type**: `context-provider`
    - **Storage**: `localStorage`
    - **Themes**: `[light, dark, ocean, forest, sunset, purple, high-contrast]`
  - **Label**: `tooltip-provider`
    - **Type**: `ui-provider`
    - **Library**: `@radix-ui/react-tooltip`
  - **Label**: `toaster`
    - **Type**: `notification-system`
    - **Library**: `shadcn/ui`

---

## Routing Structure

### Authentication Router
- **Label**: `auth-router`
- **Type**: `conditional-routing`
- **Condition**: `user-authentication-status`

#### Unauthenticated Routes
- **Label**: `login-page`
  - **Type**: `auth-page`
  - **Path**: `/login`
  - **Component**: `Login`

#### Authenticated Routes
- **Label**: `main-routes`
  - **Type**: `protected-routes`
  - **Router**: `wouter`

##### Core Application Routes
- **Label**: `dashboard-route`
  - **Type**: `main-page`
  - **Paths**: `[/, /app]`
  - **Component**: `Dashboard`

- **Label**: `quiz-routes`
  - **Type**: `learning-pages`
  - **Routes**:
    - **Label**: `quiz-page`
      - **Paths**: `[/quiz/:id, /app/quiz/:id]`
      - **Component**: `Quiz`
    - **Label**: `results-page`
      - **Paths**: `[/results/:id, /app/results/:id]`
      - **Component**: `Results`
    - **Label**: `review-page`
      - **Paths**: `[/review/:id, /app/review/:id]`
      - **Component**: `Review`

- **Label**: `content-routes`
  - **Type**: `educational-pages`
  - **Routes**:
    - **Label**: `lecture-page`
      - **Paths**: `[/lecture/:id, /app/lecture/:id]`
      - **Component**: `Lecture`
    - **Label**: `achievements-page`
      - **Paths**: `[/achievements, /app/achievements]`
      - **Component**: `Achievements`

- **Label**: `utility-routes`
  - **Type**: `tool-pages`
  - **Routes**:
    - **Label**: `accessibility-page`
      - **Paths**: `[/accessibility, /app/accessibility]`
      - **Component**: `Accessibility`

- **Label**: `admin-route`
  - **Type**: `administration-page`
  - **Path**: `/admin`
  - **Component**: `AdminDashboard`

- **Label**: `not-found-route`
  - **Type**: `fallback-page`
  - **Component**: `NotFound`

---

## Layout Components

### Global Header
- **Label**: `header-component`
- **Type**: `navigation-layout`
- **Component**: `Header`
- **Features**:
  - **Label**: `branding-section`
    - **Type**: `brand-identity`
    - **Elements**: `[logo, app-name]`
  - **Label**: `navigation-menu`
    - **Type**: `primary-navigation`
    - **Display**: `desktop-only`
    - **Structure**:
      - **Label**: `dashboard-nav`
        - **Type**: `nav-item`
        - **Icon**: `Home`
      - **Label**: `learning-dropdown`
        - **Type**: `nav-dropdown`
        - **Icon**: `BookOpen`
        - **Items**: `[achievements, progress-reports, study-materials, study-groups]`
      - **Label**: `tools-dropdown`
        - **Type**: `nav-dropdown`
        - **Icon**: `Settings`
        - **Items**: `[accessibility, coming-soon-features]`
      - **Label**: `admin-nav`
        - **Type**: `nav-item`
        - **Icon**: `Shield`
        - **Access**: `admin-only`
  - **Label**: `user-menu`
    - **Type**: `user-account-dropdown`
    - **Elements**: `[avatar, username, sign-out]`
  - **Label**: `theme-toggle`
    - **Type**: `theme-selector`
    - **Options**: `theme-list`
  - **Label**: `mobile-menu`
    - **Type**: `mobile-navigation`
    - **Display**: `mobile-only`
    - **Component**: `Sheet`

---

## Page Layouts

### Dashboard Page
- **Label**: `dashboard-page`
- **Type**: `main-layout`
- **Structure**:
  - **Label**: `header`
    - **Type**: `global-navigation`
    - **Component**: `Header`
  - **Label**: `main-content`
    - **Type**: `content-area`
    - **Layout**: `grid-layout`
    - **Sections**:
      - **Label**: `hero-section`
        - **Type**: `dashboard-overview`
        - **Component**: `DashboardHero`
        - **Grid**: `full-width`
      - **Label**: `content-grid`
        - **Type**: `two-column-layout`
        - **Breakpoint**: `lg:grid-cols-3`
        - **Sections**:
          - **Label**: `primary-content`
            - **Type**: `main-learning-area`
            - **Component**: `LearningModeSelector`
            - **Grid**: `lg:col-span-2`
          - **Label**: `sidebar-content`
            - **Type**: `activity-sidebar`
            - **Component**: `ActivitySidebar`
            - **Grid**: `lg:col-span-1`
      - **Label**: `mastery-section`
        - **Type**: `progress-overview`
        - **Component**: `MasteryMeter`
        - **Grid**: `full-width`

### Quiz Page
- **Label**: `quiz-page`
- **Type**: `learning-interface`
- **Component**: `Quiz`
- **Structure**:
  - **Label**: `header`
    - **Type**: `global-navigation`
  - **Label**: `quiz-interface`
    - **Type**: `interactive-learning`
    - **Component**: `QuizInterface`

### Results Page
- **Label**: `results-page`
- **Type**: `feedback-interface`
- **Component**: `Results`

### Review Page
- **Label**: `review-page`
- **Type**: `study-interface`
- **Component**: `Review`

### Achievements Page
- **Label**: `achievements-page`
- **Type**: `gamification-interface`
- **Component**: `Achievements`
- **Structure**:
  - **Label**: `header`
    - **Type**: `global-navigation`
  - **Label**: `achievement-content`
    - **Type**: `tabbed-interface`
    - **Tabs**: `[earned-badges, progress, category-overview]`

### Admin Dashboard
- **Label**: `admin-page`
- **Type**: `administration-interface`
- **Component**: `AdminDashboard`
- **Structure**:
  - **Label**: `header`
    - **Type**: `admin-navigation`
    - **Features**: `[admin-badge, back-to-app-button]`
  - **Label**: `admin-content`
    - **Type**: `multi-tenant-management`
    - **Layout**: `sidebar-with-tabs`
    - **Sections**:
      - **Label**: `tenant-sidebar`
        - **Type**: `tenant-selector`
      - **Label**: `management-tabs`
        - **Type**: `tabbed-interface`
        - **Tabs**: `[overview, categories, questions, users, settings]`

### Accessibility Page
- **Label**: `accessibility-page`
- **Type**: `tool-interface`
- **Component**: `Accessibility`
- **Features**: `[contrast-analyzer, wcag-compliance-testing]`

---

## Core Components

### Dashboard Components
- **Label**: `dashboard-hero`
  - **Type**: `overview-component`
  - **Component**: `DashboardHero`
  - **Features**: `[user-stats, quick-actions, ai-assistant-avatar]`

- **Label**: `learning-mode-selector`
  - **Type**: `quiz-configuration`
  - **Component**: `LearningModeSelector`
  - **Features**: `[mode-selection, category-selection, session-info]`

- **Label**: `activity-sidebar`
  - **Type**: `activity-tracking`
  - **Component**: `ActivitySidebar`
  - **Features**: `[recent-quizzes, quick-actions, study-guide-generation]`

- **Label**: `mastery-meter`
  - **Type**: `progress-visualization`
  - **Component**: `MasteryMeter`
  - **Features**: `[category-mastery-scores, color-coded-progress]`

### Learning Components
- **Label**: `quiz-interface`
  - **Type**: `interactive-quiz`
  - **Component**: `QuizInterface`
  - **Features**: `[question-display, answer-selection, progress-tracking]`

- **Label**: `quiz-creator`
  - **Type**: `content-creation`
  - **Component**: `QuizCreator`

### Gamification Components
- **Label**: `achievement-badges`
  - **Type**: `badge-system`
  - **Component**: `AchievementBadges`
  - **Categories**: `[progress, performance, streak, mastery, special]`

- **Label**: `achievement-progress`
  - **Type**: `progress-tracking`
  - **Component**: `AchievementProgress`

- **Label**: `achievement-notification`
  - **Type**: `notification-system`
  - **Component**: `AchievementNotification`

- **Label**: `level-progress`
  - **Type**: `level-system`
  - **Component**: `LevelProgress`
  - **Features**: `[current-level, xp-progress, level-stats]`

### Utility Components
- **Label**: `contrast-analyzer`
  - **Type**: `accessibility-tool`
  - **Component**: `ContrastAnalyzer`
  - **Features**: `[wcag-compliance, color-testing, accessibility-metrics]`

- **Label**: `theme-toggle`
  - **Type**: `theme-selector`
  - **Component**: `ThemeToggle`
  - **Themes**: `[light, dark, ocean, forest, sunset, purple, high-contrast]`

---

## UI Library Components

### ShadCN/UI Components
- **Label**: `ui-library`
- **Type**: `component-library`
- **Library**: `shadcn/ui`
- **Components**:
  - **Navigation**: `[navigation-menu, dropdown-menu, sheet]`
  - **Layout**: `[card, tabs, separator, scroll-area]`
  - **Forms**: `[form, input, textarea, select, checkbox, radio-group]`
  - **Feedback**: `[toast, alert, dialog, alert-dialog]`
  - **Data Display**: `[table, badge, avatar, progress]`
  - **Interactive**: `[button, toggle, switch, slider]`
  - **Overlay**: `[popover, tooltip, hover-card, context-menu]`

---

## State Management

### Global State
- **Label**: `global-state`
- **Type**: `application-state`
- **Providers**:
  - **Label**: `query-client`
    - **Type**: `server-state`
    - **Library**: `@tanstack/react-query`
    - **Features**: `[caching, mutations, invalidation]`
  - **Label**: `theme-context`
    - **Type**: `ui-state`
    - **Storage**: `localStorage`
  - **Label**: `user-session`
    - **Type**: `auth-state`
    - **Storage**: `localStorage`

### Local State Patterns
- **Label**: `component-state`
- **Type**: `local-state`
- **Patterns**: `[useState, useForm, modal-state, sidebar-state]`

---

## Responsive Design

### Breakpoints
- **Label**: `responsive-system`
- **Type**: `responsive-design`
- **Framework**: `tailwindcss`
- **Breakpoints**: `[sm:640px, md:768px, lg:1024px, xl:1280px]`

### Mobile Adaptations
- **Label**: `mobile-optimizations`
- **Type**: `mobile-first-design`
- **Features**:
  - **Navigation**: `hamburger-menu`
  - **Layout**: `stacked-columns`
  - **Touch**: `optimized-tap-targets`
  - **Typography**: `responsive-font-sizes`

---

## Accessibility Features

### WCAG Compliance
- **Label**: `accessibility-features`
- **Type**: `wcag-compliance`
- **Features**: `[color-contrast, keyboard-navigation, screen-reader-support, focus-management]`

### Contrast System
- **Label**: `contrast-system`
- **Type**: `accessibility-testing`
- **Component**: `ContrastAnalyzer`
- **Standards**: `[wcag-aa, wcag-aaa]`

---

## Data Flow Architecture

### API Integration
- **Label**: `api-layer`
- **Type**: `data-integration`
- **Pattern**: `rest-api`
- **Base URL**: `/api`

### Endpoints Structure
- **Label**: `api-endpoints`
- **Type**: `endpoint-mapping`
- **Categories**:
  - **User**: `[/api/user/:id/*, /api/login, /api/logout]`
  - **Learning**: `[/api/categories, /api/subcategories, /api/quiz, /api/questions]`
  - **Progress**: `[/api/user/:id/stats, /api/user/:id/mastery, /api/user/:id/quizzes]`
  - **Gamification**: `[/api/user/:id/achievements, /api/user/:id/badges]`
  - **Admin**: `[/api/admin/tenants/*, /api/admin/questions/*]`

---

## Performance Optimizations

### Code Splitting
- **Label**: `performance-features`
- **Type**: `optimization-strategy`
- **Features**: `[route-based-splitting, component-lazy-loading, query-caching]`

### Caching Strategy
- **Label**: `caching-system`
- **Type**: `data-caching`
- **Library**: `@tanstack/react-query`
- **Patterns**: `[stale-while-revalidate, cache-invalidation, optimistic-updates]`