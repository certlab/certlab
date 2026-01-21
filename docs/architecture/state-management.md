# State Management Guide

This document provides guidelines for choosing the appropriate state management approach in CertLab. The application uses four primary state management patterns, each suited for specific use cases.

## Table of Contents

- [Overview](#overview)
- [Decision Flowchart](#decision-flowchart)
- [useState](#usestate)
- [useReducer](#usereducer)
- [TanStack Query](#tanstack-query)
- [React Context](#react-context)
- [Combining Approaches](#combining-approaches)
- [Examples from the Codebase](#examples-from-the-codebase)
- [Anti-patterns to Avoid](#anti-patterns-to-avoid)

## Overview

| Approach | Use Case | Scope | Examples |
|----------|----------|-------|----------|
| **useState** | Simple local state | Single component | Form inputs, toggles, modals |
| **useReducer** | Complex local state | Single component/hook | Multi-step workflows, state machines |
| **TanStack Query** | Async/server state | Application-wide | Data fetching, caching, mutations |
| **React Context** | Shared global state | Component tree | Auth, theme, feature flags |

## Decision Flowchart

Use this flowchart to determine which state management approach to use:

```
                    ┌─────────────────────┐
                    │ Do you need state?  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Is it async data   │
                    │  from Firestore?    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │ YES            │ NO             │
              ▼                │                │
    ┌─────────────────┐        │                │
    │  TanStack Query │        │                │
    │  (useQuery)     │        │                │
    └─────────────────┘        │                │
                               ▼                │
                    ┌──────────────────────┐    │
                    │ Does multiple        │    │
                    │ components need it?  │    │
                    └──────────┬───────────┘    │
                               │                │
              ┌────────────────┼────────────────┤
              │ YES            │ NO             │
              ▼                │                │
    ┌─────────────────┐        │                │
    │ React Context   │        │                │
    └─────────────────┘        │                │
                               ▼
                    ┌──────────────────────┐
                    │ Is state complex?    │
                    │ (Multiple related    │
                    │  updates, workflows) │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │ YES            │ NO             │
              ▼                ▼                │
    ┌─────────────────┐  ┌─────────────────┐    │
    │   useReducer    │  │    useState     │    │
    └─────────────────┘  └─────────────────┘    │
```

## useState

### When to Use

- Simple, independent state values
- Boolean toggles (modals, dropdowns, expanded sections)
- Form input values (single inputs, not complex forms)
- UI state that doesn't require complex updates

### Characteristics

- One or two state values
- Updates are independent (changing one doesn't require changing others)
- No complex state transitions
- State is used only within the component

### Examples

```typescript
// Good: Simple toggle state
const [isOpen, setIsOpen] = useState(false);

// Good: Single input value
const [searchTerm, setSearchTerm] = useState("");

// Good: UI feedback state
const [isLoading, setIsLoading] = useState(false);
```

### From CertLab Codebase

```typescript
// From useQuizState.ts - Timer and dialog state
const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
const [showFlaggedQuestionsDialog, setShowFlaggedQuestionsDialog] = useState(false);

// From auth-provider.tsx - User and loading state
const [user, setUser] = useState<User | null>(null);
const [isLoading, setIsLoading] = useState(true);
```

## useReducer

### When to Use

- Multiple related state values that update together
- Complex state transitions (state machines)
- State with defined actions/operations
- Multi-step workflows (wizards, quizzes, forms)
- When you need predictable state updates

### Characteristics

- State has 3+ related fields
- Updates involve multiple fields changing at once
- State transitions can be described as actions
- You want to centralize state logic in one place

### Examples

```typescript
// Good: Quiz state with multiple related fields
interface QuizState {
  currentQuestionIndex: number;
  answers: Record<number, number>;
  flaggedQuestions: Set<number>;
  isReviewingFlagged: boolean;
}

type QuizAction = 
  | { type: 'SELECT_ANSWER'; payload: { questionId: number; answer: number } }
  | { type: 'CHANGE_QUESTION'; payload: { index: number } }
  | { type: 'TOGGLE_FLAG'; payload: { questionId: number } };

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SELECT_ANSWER':
      return {
        ...state,
        answers: { ...state.answers, [action.payload.questionId]: action.payload.answer }
      };
    // ... more cases
  }
}
```

### From CertLab Codebase

```typescript
// From components/quiz/quizReducer.ts
export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'SELECT_ANSWER':
      return {
        ...state,
        selectedAnswer: action.payload.answer,
        answers: { ...state.answers, [action.payload.questionId]: action.payload.answer },
        showFeedback: action.payload.showFeedback,
        isCorrect: action.payload.isCorrect
      };
    // Multiple fields updated in a single action
  }
}

// Used in useQuizState hook
const [state, dispatch] = useReducer(quizReducer, initialQuizState);
```

### Benefits Over useState

1. **Atomic Updates**: Multiple state fields update together
2. **Predictable**: All state changes go through defined actions
3. **Testable**: Reducer is a pure function, easy to test
4. **Debuggable**: Actions describe what happened

## TanStack Query

### When to Use

- Fetching data from Firestore (via storage)
- Caching asynchronous data
- Handling loading, error, and success states
- Mutations that update stored data
- Data that needs to be refreshed/invalidated

### Characteristics

- Data comes from an async source (Firestore in CertLab)
- Data needs caching and stale management
- Multiple components might need the same data
- Need optimistic updates for better UX

### Examples

```typescript
// Good: Fetching quiz data
const { data: quiz, isLoading, error } = useQuery<Quiz>({
  queryKey: queryKeys.quiz.detail(quizId),
});

// Good: Mutation with cache invalidation
const submitQuizMutation = useMutation({
  mutationFn: async (answers) => clientStorage.submitQuiz(quizId, answers),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.all(userId) });
  },
});
```

### From CertLab Codebase

```typescript
// From components/QuizInterface.tsx
const { data: quiz } = useQuery<Quiz>({
  queryKey: queryKeys.quiz.detail(quizId),
});

const { data: questions = [], isLoading: isLoadingQuestions } = useQuery<Question[]>({
  queryKey: queryKeys.quiz.questions(quizId),
  enabled: !!quiz, // Only fetch when quiz is loaded
});

// From hooks/useQuizState.ts
const submitQuizMutation = useMutation({
  mutationFn: async (quizAnswers) => {
    const { clientStorage } = await import('@/lib/client-storage');
    return await clientStorage.submitQuiz(quizId, quizAnswers);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.all(quiz?.userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.quiz.detail(quizId) });
    setLocation(`/app/results/${quizId}`);
  },
});
```

### Query Key Patterns

Use the `queryKeys` factory from `lib/queryClient.ts` for consistent keys:

```typescript
import { queryKeys } from '@/lib/queryClient';

// User-specific queries
queryKeys.user.stats(userId)      // ["/api", "user", userId, "stats"]
queryKeys.user.quizzes(userId)    // ["/api", "user", userId, "quizzes"]

// Resource queries
queryKeys.categories.all()        // ["/api", "categories"]
queryKeys.quiz.detail(quizId)     // ["/api", "quiz", quizId]
queryKeys.quiz.questions(quizId)  // ["/api", "quiz", quizId, "questions"]
```

## React Context

### When to Use

- Global state shared across many components
- State that affects the entire app (auth, theme)
- Avoiding prop drilling through many levels
- Feature flags or configuration

### Characteristics

- State is needed by components at different levels of the tree
- State changes infrequently (auth changes on login/logout)
- Not suitable for frequently-changing state (causes re-renders)

### Examples

```typescript
// Good: Authentication state (changes rarely)
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // ...
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
```

### From CertLab Codebase

```typescript
// From lib/auth-provider.tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    refreshUser,
    switchTenant,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage in components
const { user, logout, switchTenant } = useAuth();
```

### Performance Considerations

Context causes re-renders for all consumers when value changes. Mitigate this by:

1. **Split contexts**: Separate rarely-changing state from frequently-changing state
2. **Memoize values**: Use `useMemo` for context value objects
3. **Memoize consumers**: Use `React.memo` on consuming components

```typescript
// Good: Memoized context value
const contextValue = useMemo(() => ({
  user,
  isAuthenticated: !!user,
  logout,
  refreshUser,
  switchTenant,
}), [user]); // Only recreate when user changes
```

## Combining Approaches

Many features combine multiple state management approaches:

### Quiz Feature Example

```typescript
function useQuizState({ quizId, quiz, questions }) {
  // TanStack Query for async data
  const { data: quiz } = useQuery({ queryKey: queryKeys.quiz.detail(quizId) });
  
  // useReducer for complex quiz state
  const [state, dispatch] = useReducer(quizReducer, initialQuizState);
  
  // useState for simple UI state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  
  // TanStack Mutation for submissions
  const submitMutation = useMutation({
    mutationFn: (answers) => clientStorage.submitQuiz(quizId, answers),
  });
}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Component Tree                                 │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     Context Providers                              │  │
│  │   ┌─────────────┐   ┌─────────────┐   ┌────────────────────────┐  │  │
│  │   │ AuthProvider│   │ThemeProvider│   │ QueryClientProvider    │  │  │
│  │   └─────────────┘   └─────────────┘   └────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌─────────────────────────────────▼─────────────────────────────────┐  │
│  │                      Page Component                                │  │
│  │   useQuery (server state) + useReducer (complex local state)       │  │
│  │                                                                    │  │
│  │  ┌──────────────────────────────────────────────────────────────┐ │  │
│  │  │                  Child Components                             │ │  │
│  │  │   useState (simple local state)                               │ │  │
│  │  │   useContext (global state access)                            │ │  │
│  │  └──────────────────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Examples from the Codebase

### Feature: Quiz Taking

| State | Approach | Location | Reason |
|-------|----------|----------|--------|
| Quiz data | TanStack Query | QuizInterface.tsx | Async from Firestore |
| Questions | TanStack Query | QuizInterface.tsx | Async from Firestore |
| Current answer | useReducer | quizReducer.ts | Part of quiz state machine |
| All answers | useReducer | quizReducer.ts | Multiple related values |
| Flagged questions | useReducer | quizReducer.ts | Related to navigation |
| Timer | useState | useQuizState.ts | Simple countdown value |
| Dialog visibility | useState | useQuizState.ts | Simple toggle |
| User authentication | Context | auth-provider.tsx | Needed for userId |

### Feature: Dashboard

| State | Approach | Location | Reason |
|-------|----------|----------|--------|
| User stats | TanStack Query | dashboard.tsx | Async from Firestore |
| Categories | TanStack Query | dashboard.tsx | Async, cached |
| Quiz history | TanStack Query | dashboard.tsx | Async from Firestore |
| Selected category | useState | dashboard.tsx | Simple selection |
| Current user | Context | auth-provider.tsx | Global auth state |
| Theme | Context | theme-provider.tsx | Global theme state |

## Anti-patterns to Avoid

### ❌ Don't: Use useState for Complex Multi-Field State

```typescript
// Bad: Multiple related useState calls
const [currentIndex, setCurrentIndex] = useState(0);
const [answers, setAnswers] = useState({});
const [flagged, setFlagged] = useState(new Set());
const [isReviewing, setIsReviewing] = useState(false);

// Good: Use useReducer
const [state, dispatch] = useReducer(quizReducer, initialState);
```

### ❌ Don't: Use Context for Frequently-Changing State

```typescript
// Bad: Timer in context (updates every second, causes many re-renders)
const TimerContext = createContext({ seconds: 0 });

// Good: Use local state
const [seconds, setSeconds] = useState(0);
```

### ❌ Don't: Bypass TanStack Query for Firestore Data

```typescript
// Bad: Direct Firestore calls in components
useEffect(() => {
  storage.getQuiz(id).then(setQuiz);
}, [id]);

// Good: Use TanStack Query for caching and consistency
const { data: quiz } = useQuery({
  queryKey: queryKeys.quiz.detail(id),
});
```

### ❌ Don't: Duplicate State Between Sources

```typescript
// Bad: Duplicating query data in local state
const { data } = useQuery({ queryKey: ['quiz', id] });
const [quiz, setQuiz] = useState(data); // Unnecessary duplication

// Good: Use query data directly
const { data: quiz } = useQuery({ queryKey: queryKeys.quiz.detail(id) });
```

### ❌ Don't: Use Global State for Local Concerns

```typescript
// Bad: Putting modal state in context
const ModalContext = createContext({ isOpen: false });

// Good: Use local state in the component that owns the modal
const [isModalOpen, setIsModalOpen] = useState(false);
```

## Summary

| Question | Answer | Use |
|----------|--------|-----|
| Is it async data from storage? | Yes | **TanStack Query** |
| Do many components need it? | Yes | **React Context** |
| Is it complex with related updates? | Yes | **useReducer** |
| Is it simple and local? | Yes | **useState** |

When in doubt:
1. Start with **useState** for simplicity
2. Upgrade to **useReducer** when state becomes complex
3. Use **TanStack Query** for all Firestore data
4. Reserve **Context** for truly global state (auth, theme)

## Related Documentation

- [overview.md](overview.md) - System architecture overview
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [lib/queryClient.ts](client/src/lib/queryClient.ts) - Query configuration and key patterns
- [lib/auth-provider.tsx](client/src/lib/auth-provider.tsx) - Authentication context example
- [hooks/useQuizState.ts](client/src/hooks/useQuizState.ts) - Combined state management example
