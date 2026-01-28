# ADR-008: Client-Side Routing Architecture

**Status:** ✅ Accepted  
**Date:** 2024-12-22  
**Deciders:** CertLab Team  
**Context:** Define the client-side routing strategy including route protection, lazy loading, nested layouts, and mobile navigation patterns.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Routing Architecture](#routing-architecture)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)
- [Code References](#code-references)
- [Revision History](#revision-history)

---

## Executive Summary

CertLab uses **React Router 7.13.0** for declarative client-side routing with **protected routes**, **lazy-loaded components**, **nested layouts**, and **mobile-optimized navigation**. This approach provides fast navigation, code splitting for optimal bundle size, authentication-based route guards, and seamless mobile experience.

### Quick Reference

| Aspect | Technology/Pattern | Purpose |
|--------|-------------------|---------|
| **Router** | React Router 7.13.0 | Client-side routing with BrowserRouter |
| **Route Protection** | ProtectedRoute component | Authentication-based access control |
| **Code Splitting** | React.lazy + Suspense | Lazy load page components on demand |
| **Layout System** | AuthenticatedLayout + nested routes | Consistent layouts with shared chrome |
| **Mobile Navigation** | useMobileKeyboard hook | Handle mobile keyboard visibility |
| **Base Path** | Configurable via VITE_BASE_PATH | Support for subdirectory deployments |
| **Session Persistence** | SessionLoader component | Restore authenticated sessions |
| **Error Handling** | ErrorBoundary per route | Isolated error boundaries |

**Key Metrics:**
- Landing page (eager): ~15 KB
- Lazy routes: 25-50 KB per chunk
- Route transition: < 50ms
- Protected route redirect: < 100ms

---

## Context and Problem Statement

CertLab needed a routing solution that would:

1. **Support authentication-based access control** for protected routes
2. **Enable code splitting** to reduce initial bundle size
3. **Provide consistent layouts** for authenticated and public routes
4. **Handle mobile navigation** with keyboard visibility management
5. **Support flexible deployment paths** (root or subdirectory)
6. **Manage session restoration** after page refresh
7. **Isolate route-level errors** without breaking the entire app
8. **Enable nested route hierarchies** for complex page structures
9. **Provide type-safe route parameters** with TypeScript
10. **Support programmatic navigation** for workflow redirects

### Requirements

**Functional Requirements:**
- ✅ Declarative route definitions with JSX
- ✅ Protected routes requiring authentication
- ✅ Public routes accessible to all users
- ✅ Admin-only routes with role-based access
- ✅ Lazy loading for non-critical routes
- ✅ Nested layouts with shared navigation
- ✅ Query parameter and route parameter support
- ✅ Programmatic navigation (useNavigate)
- ✅ Location-aware components (useLocation)
- ✅ Back/forward browser navigation support

**Non-Functional Requirements:**
- ✅ Route transition < 50ms
- ✅ Initial bundle size < 20 KB for landing page
- ✅ Lazy chunks loaded on-demand < 100ms
- ✅ Mobile keyboard handling (iOS/Android)
- ✅ SEO-friendly URLs (no hash routing)
- ✅ Browser history API support
- ✅ Deployment flexibility (root or subdirectory)

---

## Decision

We have adopted **React Router 7.13.0** with the following routing architecture:

### Routing Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client-Side Routing                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              BrowserRouter (basename: BASE_PATH)       │     │
│  └──────────────────────────┬─────────────────────────────┘     │
│                             │                                   │
│         ┌───────────────────┼───────────────────┐               │
│         │                   │                   │               │
│  ┌──────▼─────┐    ┌────────▼────────┐   ┌─────▼──────┐        │
│  │  Public    │    │   Protected     │   │   Admin    │        │
│  │  Routes    │    │   Routes        │   │   Routes   │        │
│  └────────────┘    └─────────────────┘   └────────────┘        │
│      │                     │                    │               │
│  ┌───▼────┐        ┌───────▼────────┐    ┌─────▼──────┐        │
│  │Landing │        │ Authenticated  │    │  Admin     │        │
│  │        │        │    Layout      │    │  Layout    │        │
│  └────────┘        └────────────────┘    └────────────┘        │
│                            │                                    │
│                    ┌───────┴──────┐                             │
│                    │               │                            │
│            ┌───────▼─────┐  ┌─────▼────────┐                   │
│            │  Eager Load │  │  Lazy Load   │                   │
│            │  (Landing)  │  │  (Dashboard, │                   │
│            │             │  │   Quiz, etc) │                   │
│            └─────────────┘  └──────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Route Hierarchy

```
/ (Landing)                         - Public, eager loaded
/app                                - Protected, redirect to dashboard
├── /app (Dashboard)                - Protected, lazy loaded
├── /app/quiz/:id                   - Protected, lazy loaded
├── /app/results/:id                - Protected, lazy loaded
├── /app/review/:id                 - Protected, lazy loaded
├── /app/lecture/:id                - Protected, lazy loaded
├── /app/study-notes                - Protected, lazy loaded
├── /app/enhanced-study-notes       - Protected, lazy loaded
├── /app/study-timer                - Protected, lazy loaded
├── /app/certificates               - Protected, lazy loaded
├── /app/verify-certificate/:id     - Public (shareable)
├── /app/achievements               - Protected, lazy loaded
├── /app/leaderboard                - Protected, lazy loaded
├── /app/analytics                  - Protected, lazy loaded
├── /app/daily-challenges           - Protected, lazy loaded
├── /app/accessibility              - Protected, lazy loaded
├── /app/credits                    - Protected, lazy loaded
├── /app/profile                    - Protected, lazy loaded
├── /app/practice-tests             - Protected, lazy loaded
├── /app/data-import                - Protected, lazy loaded
├── /app/personal-import            - Protected, lazy loaded
├── /app/marketplace                - Protected, lazy loaded
├── /app/product-detail/:id         - Protected, lazy loaded
├── /app/question-bank              - Protected, lazy loaded
├── /app/wallet                     - Protected, lazy loaded
├── /app/performance                - Protected, lazy loaded
├── /app/quiz-builder               - Protected, lazy loaded
├── /app/my-quizzes                 - Protected, lazy loaded
├── /app/my-materials               - Protected, lazy loaded
└── /app/reporting                  - Protected, lazy loaded

/admin                              - Admin only
├── /admin (Admin Dashboard)        - Admin, lazy loaded
├── /admin/ui-structure             - Admin, lazy loaded
├── /admin/i18n-demo                - Admin, lazy loaded
└── /admin/connection-demo          - Admin, lazy loaded

* (404)                             - Public, lazy loaded
```

---

## Routing Architecture

### 1. Route Types

**Public Routes**
- No authentication required
- Accessible to all users
- Examples: Landing page, verify certificate

**Protected Routes**
- Authentication required
- Redirect to landing if not authenticated
- Examples: Dashboard, quiz, achievements

**Admin Routes**
- Authentication + admin role required
- Redirect to landing if not authenticated or not admin
- Examples: Admin dashboard, UI structure

### 2. Route Protection Strategy

```typescript
// ProtectedRoute component wraps authenticated routes
<ProtectedRoute>
  <AuthenticatedLayout>
    <Dashboard />
  </AuthenticatedLayout>
</ProtectedRoute>

// Admin routes require additional role check
{user?.role === 'admin' && (
  <Route path="/admin" element={<AdminDashboard />} />
)}
```

### 3. Code Splitting Strategy

**Eager Loading** (initial bundle):
- Landing page only
- Critical for fast first paint

**Lazy Loading** (on-demand):
- All authenticated pages
- All admin pages
- 404 page

```typescript
// Lazy load with React.lazy
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Quiz = lazy(() => import('@/pages/quiz'));

// Wrap lazy routes with Suspense
<Suspense fallback={<PageLoader />}>
  <Dashboard />
</Suspense>
```

---

## Implementation Details

### 1. Router Configuration

**File:** `client/src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import PageLoader from '@/components/PageLoader';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';

// Landing page is eagerly loaded for fast first paint
import Landing from '@/pages/landing';

// Lazy load page components for code splitting
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Quiz = lazy(() => import('@/pages/quiz'));
const Results = lazy(() => import('@/pages/results'));
// ... more lazy imports

// Get base path from Vite configuration
// For GitHub Pages: '/certlab/', For root: '/'
const BASE_PATH = import.meta.env.BASE_URL === '/' 
  ? '' 
  : import.meta.env.BASE_URL.replace(/\/$/, '');

function App() {
  return (
    <BrowserRouter basename={BASE_PATH}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrandingProvider>
            <AuthProvider>
              <TooltipProvider>
                <Routes>
                  {/* Public route - eagerly loaded */}
                  <Route path="/" element={<Landing />} />
                  
                  {/* Protected routes - lazy loaded */}
                  <Route path="/app/*" element={
                    <ProtectedRoute>
                      <AuthenticatedLayout>
                        <Suspense fallback={<PageLoader />}>
                          <Routes>
                            <Route index element={<Dashboard />} />
                            <Route path="quiz/:id" element={<Quiz />} />
                            <Route path="results/:id" element={<Results />} />
                            {/* ... more routes */}
                          </Routes>
                        </Suspense>
                      </AuthenticatedLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Admin routes - role-based access */}
                  <Route path="/admin/*" element={
                    <ProtectedRoute requireAdmin>
                      <Suspense fallback={<PageLoader />}>
                        <Routes>
                          <Route index element={<AdminDashboard />} />
                          {/* ... more admin routes */}
                        </Routes>
                      </Suspense>
                    </ProtectedRoute>
                  } />
                  
                  {/* 404 - lazy loaded */}
                  <Route path="*" element={
                    <Suspense fallback={<PageLoader />}>
                      <NotFound />
                    </Suspense>
                  } />
                </Routes>
              </TooltipProvider>
            </AuthProvider>
          </BrandingProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
```

### 2. Protected Route Component

**File:** `client/src/components/ProtectedRoute.tsx`

```typescript
import { useAuth } from '@/lib/auth-provider';
import { Navigate, useLocation } from 'react-router-dom';
import { SessionLoader } from './SessionLoader';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show session loader while auth is initializing
  if (isLoading) {
    return <SessionLoader message="Verifying authentication..." />;
  }

  // Redirect to landing if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check admin role if required
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
```

**Key Features:**
- Shows loading state during auth initialization
- Redirects unauthenticated users to landing
- Preserves intended destination in location state
- Supports admin-only routes with role check
- Type-safe with TypeScript

### 3. Authenticated Layout

**File:** `client/src/components/AuthenticatedLayout.tsx`

```typescript
import { Outlet } from 'react-router-dom';
import Header from './Header';
import { Toaster } from './ui/toaster';
import { useMobileKeyboard } from '@/hooks/use-mobile-keyboard';

export function AuthenticatedLayout() {
  // Handle mobile keyboard visibility
  useMobileKeyboard();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
```

**Purpose:**
- Consistent header across authenticated pages
- Container layout with responsive padding
- Toast notifications
- Mobile keyboard handling
- Renders child routes via `<Outlet />`

### 4. Session Loader Component

**File:** `client/src/components/SessionLoader.tsx`

```typescript
import { Loader2 } from 'lucide-react';

interface SessionLoaderProps {
  message?: string;
}

export function SessionLoader({ 
  message = 'Loading...' 
}: SessionLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
```

**Use Cases:**
- Auth initialization during app load
- Protected route authentication check
- Session restoration after refresh
- Prevents flash of unauthorized content

### 5. Mobile Navigation Handling

**File:** `client/src/hooks/use-mobile-keyboard.ts`

```typescript
import { useEffect } from 'react';

/**
 * Hook to handle mobile keyboard visibility
 * Adjusts viewport and scroll behavior when keyboard opens
 */
export function useMobileKeyboard() {
  useEffect(() => {
    const handleResize = () => {
      // iOS viewport height fix
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Scroll input into view on mobile
        setTimeout(() => {
          target.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }, 300);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('focusin', handleFocus);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('focusin', handleFocus);
    };
  }, []);
}
```

**Features:**
- iOS viewport height fix (--vh custom property)
- Auto-scroll inputs into view on keyboard open
- Smooth scrolling behavior
- Cleanup on unmount

### 6. Page Loader Component

**File:** `client/src/components/PageLoader.tsx`

```typescript
import { Loader2 } from 'lucide-react';

export default function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```

**Usage:**
- Suspense fallback for lazy-loaded routes
- Consistent loading experience
- Minimal layout shift
- Accessible with loading animation

### 7. Route Parameters

**Type-Safe Route Parameters:**

```typescript
import { useParams } from 'react-router-dom';

// Quiz page with ID parameter
export default function Quiz() {
  const params = useParams<{ id: string }>();
  const quizId = params?.id ? parseInt(params.id) : 0;

  if (!quizId || isNaN(quizId)) {
    return <QuizNotFound />;
  }

  return <QuizInterface quizId={quizId} />;
}
```

### 8. Programmatic Navigation

**Navigate Hook Usage:**

```typescript
import { useNavigate } from 'react-router-dom';

function QuizComplete() {
  const navigate = useNavigate();

  const handleViewResults = (quizId: number) => {
    navigate(`/app/results/${quizId}`);
  };

  const handleBackToDashboard = () => {
    navigate('/app', { replace: true });
  };

  return (
    <div>
      <button onClick={() => handleViewResults(123)}>
        View Results
      </button>
      <button onClick={handleBackToDashboard}>
        Back to Dashboard
      </button>
    </div>
  );
}
```

### 9. Location-Aware Components

**useLocation Hook Usage:**

```typescript
import { useLocation } from 'react-router-dom';

function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname
    .split('/')
    .filter(Boolean);

  return (
    <nav aria-label="Breadcrumb">
      {pathSegments.map((segment, index) => (
        <span key={index}>{segment}</span>
      ))}
    </nav>
  );
}
```

---

## Consequences

### Positive

1. **Fast Initial Load**
   - Landing page eager loaded: ~15 KB
   - Authenticated pages lazy loaded on-demand
   - Users see content faster

2. **Code Splitting**
   - Each route is a separate chunk
   - Reduces initial bundle size by ~80%
   - Pay-as-you-go loading

3. **Route Protection**
   - Declarative authentication guards
   - Type-safe protected routes
   - Consistent access control

4. **Mobile Experience**
   - Keyboard handling for iOS/Android
   - Smooth scrolling to focused inputs
   - Viewport height fixes

5. **SEO-Friendly**
   - Clean URLs without hashes
   - Browser history API
   - Shareable links

6. **Developer Experience**
   - Declarative route definitions
   - Type-safe route parameters
   - Easy to add new routes

7. **Error Isolation**
   - Route-level error boundaries
   - Prevents app-wide crashes
   - Graceful error handling

8. **Deployment Flexibility**
   - Configurable base path
   - Supports root or subdirectory
   - Works with GitHub Pages, Firebase, etc.

### Negative

1. **Initial Route Load**
   - First visit to lazy route: 50-100ms delay
   - Mitigated by Suspense fallback

2. **Bundle Size**
   - React Router: ~15 KB (gzipped)
   - Acceptable for features provided

3. **Browser Support**
   - Requires modern browsers with History API
   - No IE11 support (acceptable tradeoff)

4. **Server Configuration**
   - Requires fallback to index.html for all routes
   - Handled by Firebase Hosting config

### Mitigations

1. **Prefetch Critical Routes**
   - Preload dashboard on landing page
   - Use `<link rel="prefetch">` for common routes

2. **Optimize Lazy Chunks**
   - Keep route chunks small (< 50 KB)
   - Split large pages into sub-components

3. **Progressive Enhancement**
   - Provide loading states
   - Show skeleton UI during transitions

4. **Mobile Optimization**
   - Test on real devices
   - Handle viewport changes
   - Optimize touch targets

---

## Alternatives Considered

### Alternative 1: Wouter (Lightweight Router)

**Description:** Minimal router library (~1.6 KB) with hooks-based API.

**Pros:**
- Tiny bundle size (1.6 KB vs 15 KB)
- Hooks-based API
- Simple and fast

**Cons:**
- No built-in lazy loading support
- No nested routes
- Limited features (no Outlet, no basename)
- Less mature ecosystem

**Reason for Rejection:** Lacks features needed for CertLab (nested routes, lazy loading, basename support). React Router's benefits outweigh the small bundle size increase.

### Alternative 2: TanStack Router

**Description:** Type-safe router with built-in data loading and caching.

**Pros:**
- Excellent TypeScript support
- Built-in data loading
- Code splitting built-in
- Modern API

**Cons:**
- Newer library (less proven)
- Steeper learning curve
- Overlaps with TanStack Query
- Larger bundle size

**Reason for Rejection:** React Router is more mature and widely adopted. TanStack Query already handles data loading. No need for additional data loading in router.

### Alternative 3: Next.js App Router

**Description:** Server-side routing with Next.js framework.

**Pros:**
- File-based routing
- Server-side rendering
- Built-in optimizations
- API routes

**Cons:**
- Requires server infrastructure
- Not compatible with Firebase Hosting
- Overkill for CertLab's needs
- Heavier framework

**Reason for Rejection:** CertLab is a cloud-first SPA. No server infrastructure. Firebase Hosting is static-only. Next.js would require significant architecture changes.

---

## Related Documents

- [ADR-002: Cloud-First Architecture & Firebase Integration](ADR-002-cloud-first-firebase-integration.md) - Deployment platform
- [ADR-005: Frontend Technology Stack](ADR-005-frontend-technology-stack.md) - React and TypeScript stack
- [ADR-006: Component Architecture](ADR-006-component-architecture.md) - Component patterns
- [ADR-007: State Management Strategy](ADR-007-state-management.md) - TanStack Query integration
- [ADR-015: Build & Deployment Pipeline](ADR-015-build-deployment.md) - Build process
- [ADR-016: Performance Optimization](ADR-016-performance-optimization.md) - Code splitting strategy

---

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `client/src/App.tsx` | 1-200 | Main router configuration |
| `client/src/components/ProtectedRoute.tsx` | 1-50 | Protected route component |
| `client/src/components/AuthenticatedLayout.tsx` | 1-30 | Authenticated layout wrapper |
| `client/src/components/SessionLoader.tsx` | 1-20 | Session loading component |
| `client/src/components/PageLoader.tsx` | 1-15 | Page loading fallback |
| `client/src/hooks/use-mobile-keyboard.ts` | 1-40 | Mobile keyboard handling |
| `client/src/pages/quiz.tsx` | 1-32 | Route parameter example |
| `vite.config.ts` | 22 | Base path configuration |
| `package.json` | 136 | React Router dependency |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-12-22 | 1.0 | CertLab Team | Initial version - routing architecture with React Router 7.13.0 |
