# ADR-006: Component Architecture

**Status:** ✅ Accepted  
**Date:** 2024-12-21  
**Deciders:** CertLab Team  
**Context:** Define the component organization, composition patterns, UI primitive library usage, and code splitting strategy.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Component Architecture](#component-architecture)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)

---

## Executive Summary

CertLab uses a **hierarchical component architecture** with three distinct layers: **UI primitives** (Radix UI wrappers), **shared components** (37 reusable components), and **page components** (17 routes). Components follow **composition patterns** with clear separation of concerns, and leverage **lazy loading** for optimal performance.

### Quick Reference

| Aspect | Technology/Pattern | Purpose |
|--------|-------------------|---------|
| **UI Primitives** | Radix UI + Custom Wrappers | Accessible base components |
| **Component Library** | 37 Shared Components | Reusable business logic components |
| **Page Components** | 17 Route Pages | Top-level route handlers |
| **Composition** | Props, Children, Render Props | Component reusability |
| **Code Splitting** | React.lazy() + Suspense | Performance optimization |
| **Organization** | Feature-based + Type-based | Clear structure |
| **Styling** | TailwindCSS + CVA | Utility classes + variants |

**Architecture Principles:**
- Composition over inheritance
- Single responsibility per component
- Accessibility first (WCAG 2.2 Level AA)
- Type-safe props with TypeScript
- Lazy load pages, eager load shared components

---

## Context and Problem Statement

CertLab needed a component architecture that would:

1. **Enable component reusability** across different pages and features
2. **Maintain consistency** in UI patterns and behavior
3. **Ensure accessibility** for all users including keyboard and screen reader users
4. **Support code splitting** to optimize bundle size
5. **Provide clear organization** for 50+ components
6. **Allow easy customization** of UI primitives
7. **Enable type-safe development** with TypeScript
8. **Support multiple themes** (7 theme variants)
9. **Scale with application growth** without becoming unwieldy

### Requirements

**Functional Requirements:**
- ✅ 37+ reusable shared components
- ✅ 17+ page-level components
- ✅ 20+ UI primitive wrappers (Radix UI)
- ✅ Lazy loading for route components
- ✅ Composition patterns for flexibility
- ✅ Consistent prop interfaces
- ✅ Theme-aware styling

**Non-Functional Requirements:**
- ✅ Component load time < 50ms
- ✅ Type-safe props with IntelliSense
- ✅ WCAG 2.2 Level AA compliance
- ✅ Bundle size per chunk < 150 KB
- ✅ Component test coverage > 60%
- ✅ Clear documentation in code

---

## Decision

We have adopted a **three-layer component architecture**:

1. **Layer 1: UI Primitives** - Wrapped Radix UI components with custom styling
2. **Layer 2: Shared Components** - Reusable business logic components
3. **Layer 3: Page Components** - Route-level components with lazy loading

### Component Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Component Architecture                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │           Layer 3: Page Components (17)                │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • dashboard.tsx        • quiz.tsx                     │     │
│  │  • achievements.tsx     • leaderboard.tsx              │     │
│  │  • practice-tests.tsx   • marketplace.tsx              │     │
│  │                                                        │     │
│  │  Characteristics:                                      │     │
│  │  - Lazy loaded with React.lazy()                      │     │
│  │  - Route-level components                             │     │
│  │  - Compose shared components                          │     │
│  │  - Handle page-specific state                         │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │        Layer 2: Shared Components (37)                 │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • QuizInterface        • AchievementBadges            │     │
│  │  • Header               • DashboardStats               │     │
│  │  • ProtectedRoute       • AuthenticatedLayout          │     │
│  │  • ThemeToggle          • StudyTimer                   │     │
│  │                                                        │     │
│  │  Characteristics:                                      │     │
│  │  - Eagerly loaded (no lazy)                           │     │
│  │  - Business logic encapsulation                       │     │
│  │  - Compose UI primitives                              │     │
│  │  - Reusable across pages                              │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │         Layer 1: UI Primitives (20+)                   │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  • Button               • Dialog                       │     │
│  │  • Card                 • Dropdown Menu                │     │
│  │  • Input                • Tooltip                      │     │
│  │  • Badge                • Tabs                         │     │
│  │                                                        │     │
│  │  Characteristics:                                      │     │
│  │  - Radix UI wrappers                                  │     │
│  │  - Custom Tailwind styling                            │     │
│  │  - Accessible by default                              │     │
│  │  - Composable primitives                              │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Layer 1: UI Primitives (20+ Components)

**Purpose:** Provide accessible, styled base components

**Location:** `client/src/components/ui/`

**Examples:**
- `button.tsx` - Clickable actions with variants
- `dialog.tsx` - Modal dialogs and alerts
- `dropdown-menu.tsx` - Contextual menus
- `input.tsx` - Text input fields
- `card.tsx` - Container with header/content/footer
- `badge.tsx` - Status indicators
- `tooltip.tsx` - Hover hints
- `tabs.tsx` - Tabbed interfaces
- `progress.tsx` - Progress indicators
- `toast.tsx` - Notification toasts

**Pattern: Radix UI Wrapper**

```tsx
// client/src/components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Usage:**
```tsx
import { Button } from '@/components/ui/button';

// Different variants
<Button variant="default">Save</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

### Layer 2: Shared Components (37 Components)

**Purpose:** Encapsulate business logic and complex UI patterns

**Location:** `client/src/components/`

**Categories:**

1. **Layout Components**
   - `Header.tsx` - Application header with navigation
   - `AuthenticatedLayout.tsx` - Main app layout
   - `RightSidebar.tsx` - Sidebar for contextual info
   - `MobileBottomNav.tsx` - Mobile navigation bar

2. **Feature Components**
   - `QuizInterface.tsx` - Quiz taking interface
   - `QuizCreator.tsx` - Quiz creation form
   - `DashboardStats.tsx` - Dashboard statistics cards
   - `AchievementBadges.tsx` - Achievement display
   - `StudyTimer.tsx` - Study session timer

3. **Auth & Security**
   - `ProtectedRoute.tsx` - Auth-required routes
   - `ProtectedResource.tsx` - Auth-required content
   - `SessionLoader.tsx` - Auth state loader

4. **Theme & Accessibility**
   - `ThemeToggle.tsx` - Theme switcher
   - `ThemeDialog.tsx` - Theme selection dialog
   - `ContrastAnalyzer.tsx` - Color contrast checker

5. **Data Display**
   - `ActivityTimeline.tsx` - Activity history
   - `ContributionHeatmap.tsx` - Activity heatmap
   - `LevelProgress.tsx` - User level progress
   - `MasteryMeter.tsx` - Topic mastery visualization

**Example: Complex Component**

```tsx
// client/src/components/QuizInterface.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { storage } from '@/lib/storage-factory';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Quiz, Question } from '@shared/schema';

interface QuizInterfaceProps {
  quizId: number;
}

export function QuizInterface({ quizId }: QuizInterfaceProps) {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    const loadQuiz = async () => {
      if (!user) return;
      const quizData = await storage.getQuizById(quizId);
      setQuiz(quizData);
    };
    loadQuiz();
  }, [quizId, user]);

  if (!quiz) return <div>Loading quiz...</div>;

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    setAnswers(new Map(answers).set(currentQuestion.id, answer));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question card */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">{currentQuestion.text}</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(option)}
                className={cn(
                  'w-full p-4 text-left border rounded-lg transition-colors',
                  selectedAnswer === option
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        <Button
          onClick={handleNext}
          disabled={!selectedAnswer}
        >
          {currentQuestionIndex === quiz.questions.length - 1 ? 'Finish' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
```

### Layer 3: Page Components (17 Components)

**Purpose:** Top-level route handlers with lazy loading

**Location:** `client/src/pages/`

**Pages:**
- `landing.tsx` - Public landing page (eager loaded)
- `dashboard.tsx` - User dashboard
- `quiz.tsx` - Quiz taking page
- `results.tsx` - Quiz results
- `achievements.tsx` - Achievement gallery
- `leaderboard.tsx` - Competitive leaderboard
- `practice-tests.tsx` - Practice test mode
- `marketplace.tsx` - Content marketplace
- `profile.tsx` - User profile settings
- `admin.tsx` - Admin dashboard
- `not-found.tsx` - 404 error page

**Pattern: Lazy Loaded Route**

```tsx
// client/src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PageLoader from '@/components/PageLoader';
import Landing from '@/pages/landing'; // Eager loaded for fast first paint

// Lazy load all other pages
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Quiz = lazy(() => import('@/pages/quiz'));
const Achievements = lazy(() => import('@/pages/achievements'));
const Leaderboard = lazy(() => import('@/pages/leaderboard'));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<AuthenticatedLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="quiz/:id" element={<Quiz />} />
            <Route path="achievements" element={<Achievements />} />
            <Route path="leaderboard" element={<Leaderboard />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
```

**Page Component Structure:**

```tsx
// client/src/pages/dashboard.tsx
import { useAuth } from '@/lib/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { storage } from '@/lib/storage-factory';
import { DashboardStats } from '@/components/DashboardStats';
import { QuickStartMode } from '@/components/QuickStartMode';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { AchievementBadges } from '@/components/AchievementBadges';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['userStats', user?.id],
    queryFn: () => storage.getUserStats(user!.id),
    enabled: !!user,
  });

  const { data: recentQuizzes } = useQuery({
    queryKey: ['recentQuizzes', user?.id],
    queryFn: () => storage.getUserQuizzes(user!.id),
    enabled: !!user,
  });

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <DashboardStats stats={stats} />
      </section>

      <section>
        <QuickStartMode />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
        <ActivityTimeline quizzes={recentQuizzes} />
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Achievements</h2>
        <AchievementBadges userId={user!.id} />
      </section>
    </div>
  );
}
```

---

## Implementation Details

### Component Organization

```
/client/src/
  /components/
    /ui/                      # Layer 1: UI Primitives
      button.tsx              # Button component with variants
      dialog.tsx              # Modal dialog
      dropdown-menu.tsx       # Contextual menu
      input.tsx               # Text input
      card.tsx                # Card container
      badge.tsx               # Status badge
      tooltip.tsx             # Hover tooltip
      tabs.tsx                # Tabbed interface
      progress.tsx            # Progress bar
      toast.tsx               # Toast notification
      toaster.tsx             # Toast container
      ... (10+ more)
    
    # Layer 2: Shared Components (alphabetical)
    AccessDenied.tsx          # 403 error page
    AchievementBadges.tsx     # Achievement display
    ActivityTimeline.tsx      # Activity history
    AuthenticatedLayout.tsx   # Main app layout
    DashboardStats.tsx        # Dashboard statistics
    Header.tsx                # Application header
    ProtectedRoute.tsx        # Auth-required route
    QuizInterface.tsx         # Quiz taking interface
    StudyTimer.tsx            # Study session timer
    ThemeToggle.tsx           # Theme switcher
    ... (27+ more)
  
  /pages/                     # Layer 3: Page Components
    landing.tsx               # Landing page (eager)
    dashboard.tsx             # Dashboard (lazy)
    quiz.tsx                  # Quiz page (lazy)
    achievements.tsx          # Achievements (lazy)
    ... (14+ more)
```

### Composition Patterns

**1. Props Composition**
```tsx
interface CardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

function Card({ title, description, children, actions }: CardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// Usage
<Card 
  title="Quiz Results" 
  description="Your performance summary"
  actions={<Button>Retry</Button>}
>
  <ResultsTable />
</Card>
```

**2. Render Props Pattern**
```tsx
interface DataLoaderProps<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  children: (data: T) => React.ReactNode;
}

function DataLoader<T>({ queryKey, queryFn, children }: DataLoaderProps<T>) {
  const { data, isLoading, error } = useQuery({ queryKey, queryFn });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return <>{children(data)}</>;
}

// Usage
<DataLoader
  queryKey={['quizzes', userId]}
  queryFn={() => storage.getUserQuizzes(userId)}
>
  {(quizzes) => (
    <QuizList quizzes={quizzes} />
  )}
</DataLoader>
```

**3. Higher-Order Components (HOC)**
```tsx
function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return (props: P) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return <SessionLoader />;
    if (!user) return <Navigate to="/" />;

    return <Component {...props} />;
  };
}

// Usage
const ProtectedDashboard = withAuth(Dashboard);
```

### Code Splitting Strategy

**Page-Level Splitting:**
```tsx
// All pages lazy loaded except landing
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Quiz = lazy(() => import('@/pages/quiz'));
const Achievements = lazy(() => import('@/pages/achievements'));

// Wrap in Suspense with fallback
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/app/dashboard" element={<Dashboard />} />
    <Route path="/app/quiz/:id" element={<Quiz />} />
    <Route path="/app/achievements" element={<Achievements />} />
  </Routes>
</Suspense>
```

**Library-Level Splitting:**
```typescript
// vite.config.ts - Manual vendor chunking
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-ui': ['@radix-ui/*'], // All Radix UI components
  'vendor-charts': ['recharts'],
  'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
}
```

**Dynamic Imports for Heavy Features:**
```tsx
// Lazy load heavy editor only when needed
const RichTextEditor = lazy(() => import('@/components/RichTextEditor'));

function NoteEditor() {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <>
      <Button onClick={() => setShowEditor(true)}>Open Editor</Button>
      {showEditor && (
        <Suspense fallback={<div>Loading editor...</div>}>
          <RichTextEditor />
        </Suspense>
      )}
    </>
  );
}
```

### Type Safety

**Component Props with TypeScript:**
```tsx
// Strict prop types
interface QuizCardProps {
  quiz: Quiz; // From @shared/schema
  onStart: (quizId: number) => void;
  showProgress?: boolean;
  className?: string;
}

// Type-safe component
export function QuizCard({ 
  quiz, 
  onStart, 
  showProgress = true,
  className 
}: QuizCardProps) {
  // TypeScript ensures quiz has all required properties
  return (
    <Card className={className}>
      <CardHeader>
        <h3>{quiz.title}</h3>
        <p>{quiz.questions.length} questions</p>
      </CardHeader>
      {showProgress && <Progress value={quiz.progress} />}
      <Button onClick={() => onStart(quiz.id)}>Start</Button>
    </Card>
  );
}
```

**Generic Components:**
```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// Usage with type inference
<List<Quiz>
  items={quizzes}
  renderItem={(quiz) => <QuizCard quiz={quiz} />}
  keyExtractor={(quiz) => quiz.id}
/>
```

---

## Consequences

### Positive Consequences

**Development Efficiency:**
- ✅ **Component reusability** - 37 shared components reduce duplication
- ✅ **Clear organization** - Easy to find and modify components
- ✅ **Type safety** - Catch prop errors at compile time
- ✅ **IntelliSense support** - Auto-complete for props and methods

**Performance:**
- ✅ **Optimized loading** - Lazy loading reduces initial bundle size
- ✅ **Efficient rendering** - React's reconciliation algorithm
- ✅ **Code splitting** - Only load what's needed
- ✅ **Tree shaking** - Remove unused exports

**Maintainability:**
- ✅ **Single responsibility** - Each component has one purpose
- ✅ **Composition** - Build complex UIs from simple components
- ✅ **Testability** - Isolated components are easy to test
- ✅ **Consistent patterns** - Predictable component structure

**Accessibility:**
- ✅ **Radix UI base** - WCAG 2.2 Level AA compliant
- ✅ **Keyboard navigation** - Built-in for all primitives
- ✅ **Screen reader support** - Proper ARIA attributes
- ✅ **Focus management** - Automatic focus handling

### Negative Consequences

**Complexity:**
- ⚠️ **Three-layer abstraction** - Can be confusing for new developers
- ⚠️ **Wrapper overhead** - Extra files for UI primitive wrappers
- **Mitigation:** Documentation, component storybook, code examples

**Bundle Size:**
- ⚠️ **Radix UI package size** - 20+ Radix packages add to bundle
- ⚠️ **Component duplication** - Some patterns repeated across components
- **Mitigation:** Manual chunking, tree shaking, lazy loading

**Type Safety Trade-offs:**
- ⚠️ **Generic type complexity** - Generic components can be hard to type
- ⚠️ **Prop drilling** - Type definitions must be passed through layers
- **Mitigation:** Context API, state management, clear type exports

### Mitigations

**Complexity Management:**
```tsx
// Create component index files for easier imports
// client/src/components/index.ts
export { QuizInterface } from './QuizInterface';
export { DashboardStats } from './DashboardStats';
export { AchievementBadges } from './AchievementBadges';
// ... all shared components

// Usage
import { QuizInterface, DashboardStats } from '@/components';
```

**Bundle Size Optimization:**
```typescript
// Future: Implement virtual scrolling for large lists
import { useVirtualizer } from '@tanstack/react-virtual';

function QuizList({ quizzes }: { quizzes: Quiz[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: quizzes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      {virtualizer.getVirtualItems().map((virtualItem) => (
        <QuizCard key={virtualItem.key} quiz={quizzes[virtualItem.index]} />
      ))}
    </div>
  );
}
```

---

## Alternatives Considered

### Alternative 1: Flat Component Structure

**Approach:** All components in single directory without layers

**Pros:**
- Simpler directory structure
- No need to decide component layer
- Faster to locate files (all in one place)

**Cons:**
- Difficult to distinguish UI primitives from business components
- No clear separation of concerns
- Harder to maintain as component count grows
- Mixing of abstraction levels

**Why Not Chosen:**
With 50+ components, a flat structure would be **difficult to navigate and maintain**. The three-layer architecture provides **clear separation** between UI primitives, shared components, and pages.

### Alternative 2: Feature-Based Structure

**Approach:** Organize components by feature/domain

```
/components/
  /quiz/
    QuizInterface.tsx
    QuizCard.tsx
    QuizResults.tsx
  /achievements/
    AchievementBadges.tsx
    AchievementProgress.tsx
  /dashboard/
    DashboardStats.tsx
    QuickStart.tsx
```

**Pros:**
- Components grouped by business domain
- Easy to find feature-related components
- Clear boundaries between features

**Cons:**
- Cross-feature components difficult to place
- UI primitives still need separate directory
- Can lead to duplication across features

**Why Not Chosen:**
Many components are **used across multiple features** (e.g., cards, buttons, headers). A feature-based structure would create **artificial boundaries** and make reusability harder.

### Alternative 3: Atomic Design Pattern

**Approach:** Components organized as Atoms, Molecules, Organisms, Templates, Pages

**Pros:**
- Well-defined hierarchy
- Clear progression from simple to complex
- Popular design system pattern

**Cons:**
- Can be confusing to categorize components
- Creates more directories to navigate
- Artificial distinction between molecules and organisms
- Steeper learning curve

**Why Not Chosen:**
The **three-layer architecture** (UI primitives, shared components, pages) is **simpler and more intuitive** than Atomic Design while providing similar benefits. Developers can easily understand the distinction between layers.

---

## Related Documents

### Architecture Decision Records
- [ADR-005: Frontend Technology Stack](./ADR-005-frontend-technology-stack.md) - React, TypeScript, Vite
- [ADR-007: State Management](./ADR-007-state-management.md) - TanStack Query, Context API
- [ADR-008: Client-Side Routing](./ADR-008-client-side-routing.md) - React Router implementation
- [ADR-012: Theme & Accessibility](./ADR-012-theme-accessibility.md) - Theme system, WCAG compliance

### Technical Documentation
- [Component Directory](../../client/src/components/) - All shared components
- [UI Components](../../client/src/components/ui/) - UI primitive wrappers
- [Pages Directory](../../client/src/pages/) - Page components

### Code References

| Component Type | File Path | Count |
|---------------|-----------|-------|
| UI Primitives | `client/src/components/ui/` | 20+ |
| Shared Components | `client/src/components/` | 37 |
| Page Components | `client/src/pages/` | 17 |
| Entry Point | `client/src/App.tsx` | 1 |
| Layout | `client/src/components/AuthenticatedLayout.tsx` | 1 |

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-12-21 | 1.0 | Initial ADR creation | CertLab Team |
