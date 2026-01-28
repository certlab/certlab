# ADR-005: Frontend Technology Stack

**Status:** ✅ Accepted  
**Date:** 2024-12-21  
**Deciders:** CertLab Team  
**Context:** Define the frontend technology stack including frameworks, libraries, build tools, and UI components.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Technology Architecture](#technology-architecture)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)

---

## Executive Summary

CertLab uses a **modern React-based technology stack** with **TypeScript 5.6**, **Vite 7.3** as the build tool, **TailwindCSS 4.1** for styling, and **Radix UI** for accessible component primitives. This stack provides type safety, fast development experience, production performance, and accessibility out of the box.

### Quick Reference

| Aspect | Technology | Version | Purpose |
|--------|-----------|---------|---------|
| **UI Framework** | React | 19.2.3 | Component-based UI development |
| **Type System** | TypeScript | 5.9.3 | Static type checking & safety |
| **Build Tool** | Vite | 7.3.1 | Fast dev server & production builds |
| **Styling** | TailwindCSS | 4.1.17 | Utility-first CSS framework |
| **UI Primitives** | Radix UI | 1.x | Accessible component primitives |
| **Routing** | React Router | 7.13.0 | Client-side routing |
| **State Management** | TanStack Query | 5.90.20 | Async state management |
| **Forms** | React Hook Form | 7.71.1 | Form validation & management |
| **Icons** | Lucide React | 0.563.0 | Icon library |
| **Animations** | Framer Motion | 12.29.0 | UI animations & transitions |

**Key Characteristics:**
- Type-safe development with TypeScript
- Sub-second HMR with Vite
- Production builds ~635 KB JS (gzipped: ~179 KB)
- Accessible by default with Radix UI
- Utility-first styling with TailwindCSS

---

## Context and Problem Statement

CertLab needed to select a frontend technology stack that would:

1. **Enable rapid development** with fast iteration cycles
2. **Ensure type safety** to catch errors at compile time
3. **Provide excellent performance** for production deployments
4. **Support accessibility** as a first-class concern
5. **Offer modern developer experience** (HMR, TypeScript, ESM)
6. **Allow component reusability** across the application
7. **Enable easy maintenance** with clear patterns and conventions
8. **Support future scalability** as the application grows

### Requirements

**Functional Requirements:**
- ✅ Fast development server with HMR (<100ms)
- ✅ Type-safe component development
- ✅ Production builds optimized for size and speed
- ✅ Accessible UI components (WCAG 2.2 Level AA)
- ✅ Responsive design system
- ✅ Code splitting and lazy loading
- ✅ Modern JavaScript/TypeScript features (ES2022+)

**Non-Functional Requirements:**
- ✅ Initial load time < 2 seconds on 3G
- ✅ Lighthouse score > 90 for performance
- ✅ Build time < 10 seconds
- ✅ Bundle size < 200 KB gzipped
- ✅ Browser support: modern evergreen browsers
- ✅ Developer onboarding time < 1 day

---

## Decision

We have adopted a **React + TypeScript + Vite** stack with the following core technologies:

### Core Stack
1. **React 19.2.3** - UI framework
2. **TypeScript 5.9.3** - Type system
3. **Vite 7.3.1** - Build tool and dev server
4. **TailwindCSS 4.1.17** - Styling framework
5. **Radix UI 1.x** - Accessible component primitives
6. **React Router 7.13.0** - Client-side routing

### Technology Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Technology Stack                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Development Layer                         │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • TypeScript 5.9.3 (type checking)                   │     │
│  │  • Vite 7.3.1 (dev server, HMR, builds)               │     │
│  │  • ESLint 9.39 (code linting)                         │     │
│  │  • Prettier 3.8.1 (code formatting)                   │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              UI Framework Layer                        │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • React 19.2.3 (component rendering)                 │     │
│  │  • React DOM 19.2.3 (browser rendering)               │     │
│  │  • JSX/TSX (component syntax)                         │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Routing & State Layer                     │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • React Router 7.13.0 (client routing)               │     │
│  │  • TanStack Query 5.90.20 (async state)               │     │
│  │  • React Context (auth, theme, branding)              │     │
│  │  • React Hook Form 7.71.1 (form state)                │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              UI Component Layer                        │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • Radix UI 1.x (accessible primitives)               │     │
│  │  • Custom Components (37 components)                  │     │
│  │  • Lucide React 0.563.0 (icons)                       │     │
│  │  • Framer Motion 12.29.0 (animations)                 │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Styling Layer                             │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • TailwindCSS 4.1.17 (utility classes)               │     │
│  │  • PostCSS 8.4.47 (CSS processing)                    │     │
│  │  • Tailwind Merge (conditional classes)               │     │
│  │  • CVA (component variants)                           │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Production Build                          │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • ES2022 target                                       │     │
│  │  • Code splitting (manual chunks)                     │     │
│  │  • Tree shaking                                        │     │
│  │  • Minification (esbuild)                             │     │
│  │  • Output: dist/ (index.html, assets/)                │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Architecture

### 1. React 19.2.3 - UI Framework

**Why React:**
- **Component-based architecture** enables reusability and composability
- **Large ecosystem** with extensive libraries and tooling
- **Concurrent features** for improved UX (Suspense, transitions)
- **Strong TypeScript support** with well-maintained type definitions
- **Mature and stable** with long-term support from Meta

**Usage in CertLab:**
```typescript
// Example: Functional component with TypeScript
import { useState } from 'react';

interface QuizCardProps {
  title: string;
  questionCount: number;
  onStart: () => void;
}

export function QuizCard({ title, questionCount, onStart }: QuizCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="p-4 border rounded-lg"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{questionCount} questions</p>
      <button onClick={onStart}>Start Quiz</button>
    </div>
  );
}
```

### 2. TypeScript 5.9.3 - Type System

**Why TypeScript:**
- **Catch errors at compile time** before runtime
- **Enhanced IDE support** with autocomplete and IntelliSense
- **Better refactoring** with type-safe code transformations
- **Self-documenting code** through type annotations
- **Improved maintainability** for large codebases

**Configuration:**
```json
// tsconfig.json highlights
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

**Usage in CertLab:**
```typescript
// Shared type definitions
import type { User, Quiz, Question } from '@shared/schema';

// Type-safe function
export function calculateQuizScore(
  quiz: Quiz, 
  answers: Map<number, string>
): number {
  let correct = 0;
  
  quiz.questions.forEach((question: Question) => {
    if (answers.get(question.id) === question.correctAnswer) {
      correct++;
    }
  });
  
  return (correct / quiz.questions.length) * 100;
}
```

### 3. Vite 7.3.1 - Build Tool

**Why Vite:**
- **Lightning-fast dev server** with native ESM
- **Instant HMR** (<100ms) for rapid development
- **Optimized production builds** using Rollup
- **Built-in TypeScript support** without additional configuration
- **Plugin ecosystem** for extending functionality

**Configuration:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['@radix-ui/*'],
          'vendor-charts': ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5000,
  },
});
```

**Performance:**
- Dev server start: ~2-3 seconds
- HMR: <100ms
- Production build: ~5-7 seconds
- Build output: ~635 KB JS (gzipped: ~179 KB)

### 4. TailwindCSS 4.1.17 - Styling

**Why TailwindCSS:**
- **Utility-first approach** for rapid UI development
- **Consistency** through design tokens
- **No CSS bloat** - only used classes are included
- **Responsive design** with mobile-first breakpoints
- **Dark mode support** built-in

**Configuration:**
```typescript
// tailwind.config.ts
export default {
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... CSS variable-based colors
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
};
```

**Usage:**
```tsx
// Utility classes for rapid development
<div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
  <h3 className="text-lg font-semibold">Quiz Title</h3>
  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
    Start
  </button>
</div>
```

### 5. Radix UI 1.x - Component Primitives

**Why Radix UI:**
- **Accessibility first** - WCAG 2.2 Level AA compliant
- **Unstyled primitives** - full styling control
- **Keyboard navigation** built-in
- **Screen reader support** with proper ARIA attributes
- **Composable** - build complex components from primitives

**Components Used:**
- Dialog, Dropdown Menu, Tooltip, Popover
- Accordion, Tabs, Collapsible
- Select, Radio Group, Checkbox, Switch
- Progress, Slider, Scroll Area

**Usage:**
```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function QuizDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button>Start Quiz</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <Dialog.Title>Choose Quiz Type</Dialog.Title>
          <Dialog.Description>
            Select a quiz type to begin studying.
          </Dialog.Description>
          {/* Quiz options */}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### 6. React Router 7.13.0 - Client-Side Routing

**Why React Router:**
- **Declarative routing** with JSX
- **Nested routes** for complex layouts
- **Lazy loading** for code splitting
- **Protected routes** for authentication
- **Type-safe navigation** with TypeScript

**Usage:**
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/dashboard'));
const Quiz = lazy(() => import('@/pages/quiz'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AuthenticatedLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="quiz/:id" element={<Quiz />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

---

## Implementation Details

### Project Structure

```
/client/
  /src/
    main.tsx              # Entry point
    App.tsx               # Root component with routing
    index.css             # Global styles with Tailwind
    /components/          # 37 reusable components
      /ui/                # Radix UI wrappers
        button.tsx
        dialog.tsx
        dropdown-menu.tsx
    /pages/               # 17 route pages
      dashboard.tsx
      quiz.tsx
    /lib/                 # Utilities and providers
      auth-provider.tsx
      theme-provider.tsx
      queryClient.ts
    /hooks/               # Custom React hooks
    /data/                # Static data
  /public/                # Static assets
```

### Build Configuration

**Development:**
```bash
npm run dev        # Vite dev server on port 5000
# Features:
# - Instant HMR (<100ms)
# - TypeScript checking
# - TailwindCSS JIT compilation
# - Source maps for debugging
```

**Production:**
```bash
npm run build      # Vite production build
# Output:
# - dist/index.html (~2 KB)
# - dist/assets/index-[hash].css (~133 KB, gzipped: ~21 KB)
# - dist/assets/index-[hash].js (~635 KB, gzipped: ~179 KB)
# - Vendor chunks (react, ui, charts, utils)
```

### Code Splitting Strategy

```typescript
// vite.config.ts - Manual chunking
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-ui': [
    '@radix-ui/react-accordion',
    '@radix-ui/react-dialog',
    // ... 20+ Radix components
  ],
  'vendor-charts': ['recharts'],
  'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'react-router-dom'],
}

// Lazy loading pages
const Dashboard = lazy(() => import('@/pages/dashboard'));
```

### Type Safety Examples

```typescript
// Shared types from shared/schema.ts
import type { User, Category, Quiz, Question } from '@shared/schema';

// Type-safe component props
interface DashboardProps {
  user: User;
  categories: Category[];
}

// Type-safe hooks
function useDashboardData(userId: string) {
  const { data: quizzes } = useQuery<Quiz[]>({
    queryKey: ['quizzes', userId],
    queryFn: () => storage.getUserQuizzes(userId),
  });
  
  return { quizzes };
}
```

---

## Consequences

### Positive Consequences

**Development Experience:**
- ✅ **Fast iteration cycles** - HMR in <100ms enables instant feedback
- ✅ **Type safety** - Catch 90%+ of bugs at compile time
- ✅ **Great tooling** - IntelliSense, auto-import, refactoring support
- ✅ **Clear patterns** - React best practices are well-documented
- ✅ **Easy onboarding** - Popular stack with abundant resources

**Performance:**
- ✅ **Fast initial load** - Optimized bundles with code splitting
- ✅ **Excellent runtime performance** - React's efficient rendering
- ✅ **Small bundle size** - Tree shaking removes unused code
- ✅ **Lighthouse score** - 95+ for performance

**Maintainability:**
- ✅ **Type-safe refactoring** - Rename variables across entire codebase
- ✅ **Component reusability** - 37 shared components
- ✅ **Consistent styling** - TailwindCSS utility classes
- ✅ **Easy testing** - Well-supported testing libraries

**Accessibility:**
- ✅ **WCAG 2.2 Level AA** - Radix UI components are accessible by default
- ✅ **Keyboard navigation** - All interactive elements accessible via keyboard
- ✅ **Screen reader support** - Proper ARIA attributes

### Negative Consequences

**Bundle Size:**
- ⚠️ **Large initial bundle** - 635 KB JS (179 KB gzipped) is acceptable but could be optimized further
- ⚠️ **Radix UI overhead** - 20+ Radix packages add to bundle size
- **Mitigation:** Manual chunking, lazy loading, tree shaking

**Build Complexity:**
- ⚠️ **Multiple build tools** - Vite, TypeScript, Tailwind, PostCSS
- ⚠️ **Configuration required** - Several config files to maintain
- **Mitigation:** Well-documented setup, sensible defaults

**Learning Curve:**
- ⚠️ **TypeScript learning** - Team must understand type system
- ⚠️ **TailwindCSS approach** - Different from traditional CSS
- **Mitigation:** Training, documentation, code reviews

**Browser Support:**
- ⚠️ **Modern browsers only** - ES2022 target excludes older browsers
- **Mitigation:** Acceptable for target audience (tech-savvy learners)

### Mitigations

**Bundle Size Optimization:**
```typescript
// Current: Manual chunking in vite.config.ts
// Future: Route-based code splitting
const routes = [
  { path: '/app/dashboard', component: lazy(() => import('./dashboard')) },
  { path: '/app/quiz/:id', component: lazy(() => import('./quiz')) },
];

// Future: Dynamic imports for heavy libraries
const loadChartsLibrary = () => import('recharts');
```

**Build Time Optimization:**
```bash
# Current build time: ~5-7 seconds
# Future: Incremental builds with caching
npm run build    # First build: ~5s
npm run build    # Subsequent builds: ~2s (with cache)
```

---

## Alternatives Considered

### Alternative 1: Next.js (React Framework)

**Pros:**
- Server-side rendering (SSR) and static site generation (SSG)
- Built-in routing and API routes
- Image optimization and performance features
- Great developer experience

**Cons:**
- Overkill for client-only application
- Requires Node.js server for SSR
- More complex deployment (not just static hosting)
- Higher learning curve

**Why Not Chosen:**
CertLab is a **client-only SPA** that doesn't need SSR. Firebase Hosting provides static file serving, making Next.js unnecessary complexity.

### Alternative 2: Vue 3 + Vite

**Pros:**
- Simpler learning curve than React
- Excellent TypeScript support
- Composition API similar to React Hooks
- Smaller bundle size

**Cons:**
- Smaller ecosystem than React
- Less job market demand (harder to hire)
- Fewer third-party component libraries
- Team has more React experience

**Why Not Chosen:**
React's **larger ecosystem** and **community support** provide more resources. The team's existing React expertise reduces development time.

### Alternative 3: Svelte + SvelteKit

**Pros:**
- Smallest bundle sizes (compiler-based)
- No virtual DOM overhead
- Simple syntax and learning curve
- Reactive by default

**Cons:**
- Smaller ecosystem and community
- Less mature tooling and libraries
- Fewer TypeScript examples
- Limited component library options

**Why Not Chosen:**
While Svelte offers performance benefits, React's **mature ecosystem** and **accessibility-focused libraries** (like Radix UI) were more important for CertLab's needs.

---

## Related Documents

### Architecture Decision Records
- [ADR-001: Authentication & Authorization](./ADR-001-authentication-authorization.md) - Firebase Auth integration
- [ADR-002: Cloud-First Architecture](./ADR-002-cloud-first-firebase-integration.md) - Firebase infrastructure
- [ADR-006: Component Architecture](./ADR-006-component-architecture.md) - Component organization
- [ADR-007: State Management](./ADR-007-state-management.md) - TanStack Query and React Context
- [ADR-008: Client-Side Routing](./ADR-008-client-side-routing.md) - React Router implementation
- [ADR-012: Theme & Accessibility](./ADR-012-theme-accessibility.md) - Accessibility features

### Technical Documentation
- [package.json](../../package.json) - Dependencies and versions
- [vite.config.ts](../../vite.config.ts) - Vite configuration
- [tsconfig.json](../../tsconfig.json) - TypeScript configuration
- [tailwind.config.ts](../../tailwind.config.ts) - TailwindCSS configuration

### Code References

| Aspect | File Path | Lines |
|--------|-----------|-------|
| Entry Point | `client/src/main.tsx` | 1-50 |
| App Root | `client/src/App.tsx` | 1-200 |
| Vite Config | `vite.config.ts` | 1-78 |
| TypeScript Config | `tsconfig.json` | 1-30 |
| Tailwind Config | `tailwind.config.ts` | 1-100 |
| UI Components | `client/src/components/ui/` | All files |
| Page Components | `client/src/pages/` | All files |
| Custom Hooks | `client/src/hooks/` | All files |

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-12-21 | 1.0 | Initial ADR creation | CertLab Team |

