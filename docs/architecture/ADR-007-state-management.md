# ADR-007: State Management Strategy

**Status:** ✅ Accepted  
**Date:** 2024-12-21  
**Deciders:** CertLab Team  
**Context:** Define the state management approach for asynchronous data, global state, and local component state.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [State Management Architecture](#state-management-architecture)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)

---

## Executive Summary

CertLab uses a **hybrid state management approach** with **TanStack Query** (React Query) for server/async state, **React Context** for global client state (auth, theme, branding), and **useState/useReducer** for local component state. This approach provides optimal performance, type safety, and developer experience without introducing heavyweight state management libraries.

### Quick Reference

| State Type | Solution | Purpose |
|------------|----------|---------|
| **Server/Async State** | TanStack Query 5.90.20 | Firestore data fetching, caching, synchronization |
| **Auth State** | React Context (AuthProvider) | User authentication, session management |
| **Theme State** | React Context (ThemeProvider) | UI theme selection (7 themes) |
| **Branding State** | React Context (BrandingProvider) | Organization branding configuration |
| **Local State** | useState/useReducer | Component-specific state |
| **Form State** | React Hook Form 7.71.1 | Form validation and submission |
| **URL State** | React Router 7.13.0 | Query parameters, route params |

**Key Principles:**
- Server state !== Client state
- Cache server data aggressively
- Invalidate cache after mutations
- Avoid prop drilling with Context
- Keep local state local

---

## Context and Problem Statement

CertLab needed a state management strategy that would:

1. **Efficiently manage server data** from Firestore
2. **Handle authentication state** across the application
3. **Support theme customization** with persistence
4. **Enable multi-tenancy** with organization branding
5. **Optimize performance** with intelligent caching
6. **Provide type safety** throughout the state layer
7. **Minimize boilerplate** and complexity
8. **Support offline capabilities** with Firestore persistence
9. **Enable optimistic updates** for better UX

### Requirements

**Functional Requirements:**
- ✅ Fetch and cache data from Firestore
- ✅ Automatic background refetching
- ✅ Cache invalidation after mutations
- ✅ Global authentication state
- ✅ Theme persistence across sessions
- ✅ Multi-tenant branding support
- ✅ Type-safe state access
- ✅ Optimistic updates for mutations

**Non-Functional Requirements:**
- ✅ Cache hit rate > 80%
- ✅ State updates < 16ms (60fps)
- ✅ Minimal re-renders
- ✅ Bundle size < 50 KB for state management
- ✅ Developer-friendly API
- ✅ Good DevTools support

---

## Decision

We have adopted a **layered state management approach**:

### State Management Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    State Management Layers                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │   Layer 1: Server/Async State (TanStack Query)         │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  Purpose: Firestore data, caching, synchronization     │     │
│  │                                                        │     │
│  │  • Queries (useQuery)                                  │     │
│  │    - User data (stats, progress, quizzes)             │     │
│  │    - Shared content (categories, questions, badges)   │     │
│  │    - Cache with stale time (30s user, 5min static)    │     │
│  │                                                        │     │
│  │  • Mutations (useMutation)                             │     │
│  │    - Create quiz, update progress, earn badge         │     │
│  │    - Optimistic updates for instant feedback          │     │
│  │    - Auto invalidation of related queries             │     │
│  │                                                        │     │
│  │  • Offline Support                                     │     │
│  │    - Firestore offline persistence                    │     │
│  │    - Automatic sync when online                       │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │   Layer 2: Global Client State (React Context)         │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  Purpose: App-wide state not tied to server            │     │
│  │                                                        │     │
│  │  • AuthProvider                                        │     │
│  │    - user, isLoading, isAuthenticated                 │     │
│  │    - logout(), switchTenant()                         │     │
│  │    - Firebase auth state sync                         │     │
│  │                                                        │     │
│  │  • ThemeProvider                                       │     │
│  │    - theme (7 variants), setTheme()                   │     │
│  │    - Persisted in Firestore + localStorage            │     │
│  │                                                        │     │
│  │  • BrandingProvider                                    │     │
│  │    - Organization logo, colors, typography            │     │
│  │    - Loaded per tenantId                              │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │   Layer 3: Form State (React Hook Form)                │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  Purpose: Form validation, submission, error handling  │     │
│  │                                                        │     │
│  │  • register() - Field registration                    │     │
│  │  • handleSubmit() - Form submission                   │     │
│  │  • formState.errors - Validation errors               │     │
│  │  • watch() - Field value watching                     │     │
│  │  • Zod integration for type-safe validation           │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │   Layer 4: Local Component State (hooks)               │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  Purpose: Component-specific ephemeral state           │     │
│  │                                                        │     │
│  │  • useState - Simple local state                      │     │
│  │  • useReducer - Complex state machines                │     │
│  │  • useRef - DOM refs, mutable values                  │     │
│  └────────────────────────────────────────────────────────┘     │
│                          ↓                                       │
│  ┌────────────────────────────────────────────────────────┐     │
│  │   Layer 5: URL State (React Router)                    │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  Purpose: Shareable, bookmarkable state               │     │
│  │                                                        │     │
│  │  • Route params (/quiz/:id)                           │     │
│  │  • Query params (?category=cissp&difficulty=hard)     │     │
│  │  • Location state (navigate with state)               │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## State Management Architecture

### Layer 1: TanStack Query - Server/Async State

**Purpose:** Manage all data from Firestore with caching and synchronization

**Configuration:**

```typescript
// client/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: how long data is considered fresh
      staleTime: 30 * 1000, // 30 seconds default
      // Cache time: how long data stays in cache when unused
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      // Retry failed queries
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry failed mutations
      retry: 1,
    },
  },
});

// Stale time constants for different data types
export const staleTime = {
  static: 5 * 60 * 1000,  // 5 minutes (categories, badges)
  user: 30 * 1000,        // 30 seconds (user data)
  auth: 60 * 1000,        // 1 minute (auth state)
};
```

**Query Examples:**

```typescript
// Fetch user statistics
function useUserStats(userId: string) {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: () => storage.getUserStats(userId),
    staleTime: staleTime.user,
    enabled: !!userId,
  });
}

// Fetch categories (shared data)
function useCategories(tenantId?: number) {
  return useQuery({
    queryKey: ['categories', tenantId],
    queryFn: () => storage.getCategories(tenantId),
    staleTime: staleTime.static,
  });
}

// Fetch quiz with questions
function useQuiz(quizId: number) {
  return useQuery({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      const quiz = await storage.getQuizById(quizId);
      const questions = await storage.getQuizQuestions(quizId);
      return { ...quiz, questions };
    },
    enabled: !!quizId,
  });
}
```

**Mutation Examples:**

```typescript
// Create a new quiz
function useCreateQuiz() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (quiz: NewQuiz) => storage.createQuiz(quiz),
    onSuccess: (newQuiz) => {
      // Invalidate user quizzes to refetch
      queryClient.invalidateQueries({ 
        queryKey: ['quizzes', user?.id] 
      });
      // Optionally add to cache optimistically
      queryClient.setQueryData(
        ['quiz', newQuiz.id], 
        newQuiz
      );
    },
  });
}

// Update user progress with optimistic update
function useUpdateProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (progress: UserProgress) => 
      storage.createOrUpdateUserProgress(progress),
    
    // Optimistic update
    onMutate: async (newProgress) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: ['progress', user?.id] 
      });

      // Snapshot previous value
      const previousProgress = queryClient.getQueryData([
        'progress', 
        user?.id
      ]);

      // Optimistically update cache
      queryClient.setQueryData(
        ['progress', user?.id],
        (old: UserProgress[]) => [...(old || []), newProgress]
      );

      return { previousProgress };
    },
    
    // Rollback on error
    onError: (err, newProgress, context) => {
      queryClient.setQueryData(
        ['progress', user?.id],
        context?.previousProgress
      );
    },
    
    // Refetch after mutation
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['progress', user?.id] 
      });
    },
  });
}
```

**Cache Invalidation Helpers:**

```typescript
// Invalidate all user data after significant changes
export function invalidateAllUserData(userId: string) {
  queryClient.invalidateQueries({ queryKey: ['userStats', userId] });
  queryClient.invalidateQueries({ queryKey: ['quizzes', userId] });
  queryClient.invalidateQueries({ queryKey: ['progress', userId] });
  queryClient.invalidateQueries({ queryKey: ['badges', userId] });
  queryClient.invalidateQueries({ queryKey: ['gameStats', userId] });
}

// Invalidate static data after admin changes
export function invalidateStaticData() {
  queryClient.invalidateQueries({ queryKey: ['categories'] });
  queryClient.invalidateQueries({ queryKey: ['badges'] });
  queryClient.invalidateQueries({ queryKey: ['practiceTests'] });
}
```

### Layer 2: React Context - Global Client State

**AuthProvider - Authentication State**

```typescript
// client/src/lib/auth-provider.tsx
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tenantId: number | undefined;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchTenant: (tenantId: number) => Promise<void>;
  isCloudSyncEnabled: boolean;
  firebaseUser: FirebaseUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Subscribe to Firebase auth state
  useEffect(() => {
    const unsubscribe = onFirebaseAuthStateChanged(async (fbUser) => {
      if (fbUser) {
        // Load user from Firestore
        const userData = await storage.getUserById(fbUser.uid);
        setUser(userData);
        setFirebaseUser(fbUser);
        
        // Identify user in Dynatrace
        identifyUser(fbUser.uid, userData.email);
      } else {
        setUser(null);
        setFirebaseUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOutFromGoogle();
    setUser(null);
    setFirebaseUser(null);
    endSession(); // End Dynatrace session
  };

  const switchTenant = async (tenantId: number) => {
    if (!user) return;
    const updatedUser = { ...user, tenantId };
    await storage.updateUser(user.id, updatedUser);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        tenantId: user?.tenantId,
        logout,
        refreshUser: async () => {
          if (firebaseUser) {
            const userData = await storage.getUserById(firebaseUser.uid);
            setUser(userData);
          }
        },
        switchTenant,
        isCloudSyncEnabled: isCloudSyncAvailable(),
        firebaseUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

**ThemeProvider - Theme State**

```typescript
// client/src/lib/theme-provider.tsx
type Theme = 'light' | 'dark' | 'nord' | 'catppuccin' | 
             'tokyo-night' | 'dracula' | 'rose-pine' | 'high-contrast';

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeProviderContext = createContext<ThemeProviderState>({
  theme: 'light',
  setTheme: () => null,
  isLoading: true,
});

export function ThemeProvider({ 
  children, 
  defaultTheme = 'light' 
}: ThemeProviderProps) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(
    () => (localStorage.getItem('ui-theme') as Theme) || defaultTheme
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from Firestore on login
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      const preferences = await storage.getUserThemePreferences(user.id);
      if (preferences?.selectedTheme) {
        setThemeState(preferences.selectedTheme);
        localStorage.setItem('ui-theme', preferences.selectedTheme);
      }
      setIsLoading(false);
    };

    loadUserTheme();
  }, [user?.id]);

  // Apply theme to DOM
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'nord', 'catppuccin', 
                          'tokyo-night', 'dracula', 'rose-pine', 'high-contrast');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('ui-theme', newTheme);
    
    // Persist to Firestore if user is logged in
    if (user?.id) {
      await storage.setUserThemePreferences(user.id, {
        selectedTheme: newTheme,
      });
    }
  };

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}
```

**BrandingProvider - Organization Branding**

```typescript
// client/src/lib/branding-provider.tsx
interface BrandingContextValue {
  branding: OrganizationBranding | null;
  isLoading: boolean;
  error: Error | null;
  updateBranding: (branding: OrganizationBranding) => Promise<void>;
  refreshBranding: () => Promise<void>;
}

export function BrandingProvider({ 
  children, 
  tenantId = 1 
}: BrandingProviderProps) {
  const [branding, setBranding] = useState<OrganizationBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBranding = useCallback(async () => {
    const brandingData = await storage.getOrganizationBranding(tenantId);
    setBranding(brandingData);
    if (brandingData) {
      applyBrandingToDOM(brandingData);
    }
    setIsLoading(false);
  }, [tenantId]);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, ... }}>
      {children}
    </BrandingContext.Provider>
  );
}
```

### Layer 3: React Hook Form - Form State

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Define form schema with Zod
const quizFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  categoryId: z.number().min(1, 'Category is required'),
  questionCount: z.number().min(5).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

type QuizFormData = z.infer<typeof quizFormSchema>;

function QuizCreationForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<QuizFormData>({
    resolver: zodResolver(quizFormSchema),
    defaultValues: {
      questionCount: 20,
      difficulty: 'medium',
    },
  });

  const createQuiz = useCreateQuiz();

  const onSubmit = async (data: QuizFormData) => {
    await createQuiz.mutateAsync(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      
      <select {...register('categoryId', { valueAsNumber: true })}>
        <option value="">Select category</option>
        {/* options */}
      </select>
      
      <button type="submit" disabled={isSubmitting}>
        Create Quiz
      </button>
    </form>
  );
}
```

### Layer 4: Local Component State

```typescript
// Simple state with useState
function QuizCard({ quiz }: { quiz: Quiz }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div>
      <button onClick={() => setIsExpanded(!isExpanded)}>
        {quiz.title}
      </button>
      {isExpanded && <QuizDetails quiz={quiz} />}
    </div>
  );
}

// Complex state with useReducer
type QuizState = {
  currentQuestionIndex: number;
  answers: Map<number, string>;
  startTime: number;
  isComplete: boolean;
};

type QuizAction =
  | { type: 'ANSWER_QUESTION'; questionId: number; answer: string }
  | { type: 'NEXT_QUESTION' }
  | { type: 'PREVIOUS_QUESTION' }
  | { type: 'COMPLETE_QUIZ' };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'ANSWER_QUESTION':
      return {
        ...state,
        answers: new Map(state.answers).set(action.questionId, action.answer),
      };
    case 'NEXT_QUESTION':
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
      };
    case 'COMPLETE_QUIZ':
      return {
        ...state,
        isComplete: true,
      };
    default:
      return state;
  }
}

function QuizInterface({ quiz }: { quiz: Quiz }) {
  const [state, dispatch] = useReducer(quizReducer, {
    currentQuestionIndex: 0,
    answers: new Map(),
    startTime: Date.now(),
    isComplete: false,
  });

  // Component logic...
}
```

### Layer 5: URL State

```typescript
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

function QuizPage() {
  // Route params
  const { id } = useParams<{ id: string }>();
  const quizId = parseInt(id!);

  // Query params
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');

  // Navigation with state
  const navigate = useNavigate();
  const startQuiz = () => {
    navigate(`/app/quiz/${quizId}`, {
      state: { fromDashboard: true },
    });
  };

  return (
    <div>
      <h1>Quiz {quizId}</h1>
      {category && <p>Category: {category}</p>}
      {difficulty && <p>Difficulty: {difficulty}</p>}
    </div>
  );
}
```

---

## Implementation Details

### Provider Hierarchy

```tsx
// client/src/App.tsx
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrandingProvider>
            <TooltipProvider>
              <Router>
                {/* App routes */}
              </Router>
            </TooltipProvider>
          </BrandingProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Decision Matrix: When to Use Which State Solution

| State Type | Solution | When to Use |
|------------|----------|-------------|
| **Firestore data** | TanStack Query | Any data from database (users, quizzes, categories) |
| **Authentication** | AuthProvider | User login state, session management |
| **Theme** | ThemeProvider | UI theme selection (light/dark/etc.) |
| **Branding** | BrandingProvider | Organization logos, colors |
| **Form inputs** | React Hook Form | Complex forms with validation |
| **Toggle/expand** | useState | Simple component-level state |
| **Wizard/stepper** | useReducer | Multi-step state machines |
| **Modal visibility** | useState | Show/hide dialogs, modals |
| **Route params** | React Router | Shareable URLs (quiz/:id) |
| **Search filters** | URL search params | Filter state that should be bookmarkable |

---

## Consequences

### Positive Consequences

**Performance:**
- ✅ **Intelligent caching** - 80%+ cache hit rate reduces Firestore reads
- ✅ **Background refetching** - Data stays fresh without user intervention
- ✅ **Optimistic updates** - Instant feedback for mutations
- ✅ **Minimal re-renders** - Context only re-renders when state changes

**Developer Experience:**
- ✅ **Simple API** - useQuery/useMutation are intuitive
- ✅ **Type safety** - Full TypeScript support throughout
- ✅ **DevTools** - React Query DevTools for debugging
- ✅ **Less boilerplate** - No action creators, reducers for server state

**Maintainability:**
- ✅ **Clear separation** - Server state vs. client state
- ✅ **Consistent patterns** - Predictable state management
- ✅ **Easy testing** - Mock queries and providers

### Negative Consequences

**Complexity:**
- ⚠️ **Multiple state solutions** - Team must understand when to use each
- ⚠️ **Learning curve** - TanStack Query has advanced features
- **Mitigation:** Documentation, code examples, training

**Bundle Size:**
- ⚠️ **TanStack Query** - ~40 KB (gzipped: ~12 KB)
- ⚠️ **React Hook Form** - ~24 KB (gzipped: ~8 KB)
- **Mitigation:** Benefits outweigh costs, tree shaking

**Context Re-render Issues:**
- ⚠️ **Context consumers re-render** - When context value changes
- **Mitigation:** Split contexts, memoize values, use selectors

### Mitigations

**Context Optimization:**
```typescript
// Split contexts to avoid unnecessary re-renders
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Memoize context value
  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      // ... methods
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Query Optimization:**
```typescript
// Prefetch data on hover for instant navigation
function QuizCard({ quiz }: { quiz: Quiz }) {
  const queryClient = useQueryClient();

  const prefetchQuiz = () => {
    queryClient.prefetchQuery({
      queryKey: ['quiz', quiz.id],
      queryFn: () => storage.getQuizById(quiz.id),
    });
  };

  return (
    <Link 
      to={`/quiz/${quiz.id}`} 
      onMouseEnter={prefetchQuiz}
    >
      {quiz.title}
    </Link>
  );
}
```

---

## Alternatives Considered

### Alternative 1: Redux Toolkit

**Pros:**
- Battle-tested, widely adopted
- Excellent DevTools
- Clear patterns for complex state
- Time-travel debugging

**Cons:**
- Overkill for our needs
- Server state caching requires RTK Query
- More boilerplate than TanStack Query
- Larger bundle size (~50 KB)

**Why Not Chosen:**
TanStack Query handles server state better with built-in caching, background refetching, and optimistic updates. Redux is unnecessary overhead for our use case.

### Alternative 2: Zustand

**Pros:**
- Lightweight (~3 KB)
- Simple API, minimal boilerplate
- No providers needed
- Good TypeScript support

**Cons:**
- No built-in server state management
- Manual cache invalidation
- No background refetching
- Less mature ecosystem

**Why Not Chosen:**
Zustand doesn't handle async/server state as elegantly as TanStack Query. We'd need to build caching, refetching, and invalidation ourselves.

### Alternative 3: Recoil

**Pros:**
- Created by Facebook (Meta)
- Atom-based state model
- Concurrent mode ready
- Selector caching

**Cons:**
- Still experimental status
- Server state requires custom solutions
- Smaller community than alternatives
- More complex mental model

**Why Not Chosen:**
Experimental status and lack of server state support made it unsuitable. TanStack Query is production-ready and purpose-built for our needs.

---

## Related Documents

### Architecture Decision Records
- [ADR-001: Authentication & Authorization](./ADR-001-authentication-authorization.md) - Firebase Auth
- [ADR-002: Cloud-First Architecture](./ADR-002-cloud-first-firebase-integration.md) - Firestore
- [ADR-003: Data Storage](./ADR-003-data-storage-firestore-collections.md) - Data models
- [ADR-005: Frontend Technology Stack](./ADR-005-frontend-technology-stack.md) - React, TypeScript
- [ADR-006: Component Architecture](./ADR-006-component-architecture.md) - Component patterns
- [ADR-012: Theme & Accessibility](./ADR-012-theme-accessibility.md) - Theme system

### Technical Documentation
- [Query Client Configuration](../../client/src/lib/queryClient.ts) - TanStack Query setup
- [Auth Provider](../../client/src/lib/auth-provider.tsx) - Authentication state
- [Theme Provider](../../client/src/lib/theme-provider.tsx) - Theme state
- [Branding Provider](../../client/src/lib/branding-provider.tsx) - Organization branding

### Code References

| State Type | File Path | Lines |
|------------|-----------|-------|
| Query Client | `client/src/lib/queryClient.ts` | 1-500 |
| Auth Provider | `client/src/lib/auth-provider.tsx` | 1-300 |
| Theme Provider | `client/src/lib/theme-provider.tsx` | 1-150 |
| Branding Provider | `client/src/lib/branding-provider.tsx` | 1-120 |
| Example Queries | `client/src/pages/dashboard.tsx` | 20-50 |

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2024-12-21 | 1.0 | Initial ADR creation | CertLab Team |
