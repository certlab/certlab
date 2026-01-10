# CertLab Architecture

This document describes the technical architecture of CertLab, including the overall system design, data flow, and key components.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Frontend Architecture](#frontend-architecture)
- [Data Layer](#data-layer)
- [Authentication](#authentication)
- [State Management](#state-management)
- [Routing](#routing)
- [Multi-Tenancy](#multi-tenancy)
- [Build and Deployment](#build-and-deployment)
- [Key Design Decisions](#key-design-decisions)

## System Overview

CertLab is a **cloud-first Single-Page Application (SPA)** designed for certification exam preparation. The application uses Firebase for authentication and cloud storage, with offline capability through Firestore's built-in caching.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Type** | Single-Page Application (SPA) |
| **Runtime** | Browser (Chrome, Firefox, Safari, Edge) |
| **Storage** | Cloud Firestore (mandatory) with automatic IndexedDB caching |
| **Authentication** | Firebase Authentication (Google Sign-In, mandatory) |
| **Hosting** | Firebase Hosting |
| **Offline Support** | Offline-first with automatic sync via Firestore SDK |

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              Browser                                      │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                         React Application                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │ │
│  │  │    Pages    │  │  Components │  │    Hooks    │  │   Context  │  │ │
│  │  │  (Routes)   │  │  (UI/Forms) │  │  (Custom)   │  │  Providers │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │ │
│  │           │              │               │                │          │ │
│  │           └──────────────┴───────────────┴────────────────┘          │ │
│  │                                   │                                   │ │
│  │                           ┌───────▼───────┐                          │ │
│  │                           │ TanStack Query│                          │ │
│  │                           │ (State Mgmt)  │                          │ │
│  │                           └───────┬───────┘                          │ │
│  │                                   │                                   │ │
│  │  ┌────────────────────────────────┼────────────────────────────────┐  │ │
│  │  │              Observability Layer (Dynatrace RUM)                 │  │ │
│  │  │  - User session tracking      - Error monitoring                 │  │ │
│  │  │  - Performance metrics        - Custom action tracking           │  │ │
│  │  └────────────────────────────────┼────────────────────────────────┘  │ │
│  │                                   │                                   │ │
│  └───────────────────────────────────┼───────────────────────────────────┘ │
│                                      │                                      │
│  ┌───────────────────────────────────▼───────────────────────────────────┐ │
│  │                          Storage Layer                                 │ │
│  │  ┌─────────────────┐    ┌─────────────────┐                           │ │
│  │  │ storage-factory │───▶│ firestore-      │──────┐                    │ │
│  │  │  (API Layer)    │    │ storage.ts      │      │ HTTPS              │ │
│  │  └─────────────────┘    └─────────────────┘      │                    │ │
│  │                                                    │                    │ │
│  │  ┌────────────────────────────────────────────────┘                    │ │
│  │  │ IndexedDB Cache (Firestore SDK managed)                             │ │
│  │  │ - Automatic offline persistence                                     │ │
│  │  │ - Transparent sync when online                                      │ │
│  │  └─────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      │ Beacon (HTTPS)                       │
│                                      ▼                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       │
                          ┌────────────┴───────────────┐
                          │                            │
                          ▼                            ▼
              ┌──────────────────────────┐  ┌──────────────────────────┐
              │  Cloud Firestore         │  │  Dynatrace Environment   │
              │  - User data             │  │  - Data Collection       │
              │  - Shared content        │  │  - Analytics             │
              │  - Security rules        │  │  - Alerting              │
              │  - Automatic sync        │  │  - Dashboards            │
              └──────────────────────────┘  └──────────────────────────┘
```

## Frontend Architecture

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.6.x | Type safety |
| Vite | 5.4.x | Build tool |
| Vitest | 2.x | Unit testing |
| TailwindCSS | 3.4.x | Styling |
| Radix UI | Latest | Component primitives |
| TanStack Query | 5.x | Async state management |
| Wouter | 3.x | Client-side routing |
| Dynatrace RUM | Latest | Real user monitoring and observability |

### Component Organization

```
client/src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI primitives (buttons, inputs, etc.)
│   ├── Header.tsx       # Navigation header
│   ├── QuizInterface.tsx# Quiz taking component
│   ├── BadgeCard.tsx    # Achievement display
│   └── ...              # Feature-specific components
├── pages/               # Route-level components
│   ├── landing.tsx      # Home/landing page
│   ├── dashboard.tsx    # User dashboard
│   ├── quiz.tsx         # Quiz taking
│   ├── results.tsx      # Quiz results
│   └── ...              # Other pages
├── hooks/               # Custom React hooks
├── test/                # Test setup and utilities
│   └── setup.ts         # Vitest test configuration
└── lib/                 # Core services
    ├── storage-factory.ts # Storage router
    ├── firestore-storage.ts # Firestore implementation
    ├── firestore-service.ts # Firestore operations
    ├── auth-provider.tsx # Auth context
    └── queryClient.ts    # Query configuration
```

## Data Layer

### Firestore Collections

All application data is stored in Cloud Firestore with automatic offline caching:

**Shared Collections** (read: all authenticated users, write: admin only):
| Collection | Purpose | Key Fields |
|-------|---------|------------|
| `categories` | Certification categories | id, name, description |
| `subcategories` | Topic areas | id, categoryId, name |
| `questions` | Question bank | id, text, options, correctAnswer |
| `badges` | Achievement definitions | id, name, requirement |
| `challenges` | Learning challenges | id, type, difficulty |
| `studyGroups` | Study groups | id, name, createdBy |
| `practiceTests` | Practice exams | id, name, questionCount |

**Per-User Collections** (read/write: owner only):
| Collection Path | Purpose | Key Fields |
|-------|---------|------------|
| `users/{userId}` | User profile | email, firstName, lastName, role |
| `users/{userId}/quizzes/` | Quiz attempts | score, completedAt, answers |
| `users/{userId}/progress/` | Learning progress | categoryId, masteryScore |
| `users/{userId}/badges/` | Earned badges | badgeId, earnedAt |
| `users/{userId}/gameStats/` | Gamification stats | points, level, streak |
| `users/{userId}/lectures/` | Study materials | content, topics |
| `users/{userId}/challengeAttempts/` | Challenge results | challengeId, score |
| `users/{userId}/practiceTestAttempts/` | Test results | testId, score |

**Note**: Firestore SDK automatically maintains an IndexedDB cache for offline access. This cache is managed entirely by the SDK and requires no application code.

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   UI Event   │────▶│ TanStack     │────▶│ Storage API  │
│  (e.g. click)│     │ Query/Mutation│     │ (storage-    │
└──────────────┘     └──────────────┘     │  factory.ts) │
                                          └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │ Firestore    │
                                          │ Storage      │
                                          │ (firestore-  │
                                          │  storage.ts) │
                                          └──────┬───────┘
                                                 │
                                    ┌────────────┴────────────┐
                                    │                          │
                             ┌──────▼───────┐         ┌──────▼───────┐
                             │ Cloud        │◀────────│ IndexedDB    │
                             │ Firestore    │  Sync   │ Cache        │
                             │ (Google Cloud)│         │ (SDK managed)│
                             └──────────────┘         └──────────────┘
```

### Storage API Pattern

The `storage` object provides a consistent API for all data operations:

```typescript
// Example usage
import { storage } from '@/lib/storage-factory';

// Get all categories
const categories = await storage.getCategories();

// Create a new quiz
const quiz = await storage.createQuiz({
  userId: user.id,
  title: 'CISSP Practice',
  categoryIds: [1],
  subcategoryIds: [],
  questionCount: 10,
  mode: 'quiz'
});

// Export all data
const jsonData = await storage.exportData();
```

## Authentication

CertLab uses a client-side authentication system:

### Auth Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Register/  │────▶│  Hash        │────▶│   Store in   │
│   Login Form │     │  Password    │     │   IndexedDB  │
└──────────────┘     │  (SHA-256)   │     └──────┬───────┘
                     └──────────────┘            │
                                          ┌──────▼───────┐
                                          │   Update     │
                                          │   AuthContext│
                                          └──────────────┘
```

### Security Considerations

- Passwords are hashed using SHA-256 via Web Crypto API
- Session persists via `currentUserId` in IndexedDB settings
- No external authentication servers
- Single-user per browser profile

## State Management

CertLab uses four complementary state management approaches, each suited for specific use cases.

> **For detailed guidance on when to use each approach, see [state-management.md](state-management.md)**

### Quick Reference

| Approach | When to Use | Example |
|----------|-------------|---------|
| **useState** | Simple local state (toggles, inputs) | Modal visibility, form inputs |
| **useReducer** | Complex local state with related updates | Quiz workflow (answers, navigation, flags) |
| **TanStack Query** | Async data from Firestore | Fetching quizzes, categories, user data |
| **React Context** | Global state shared across components | Authentication, theme |

### TanStack Query (React Query)

Used for all async data operations:

```typescript
// Query configuration (queryClient.ts)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,         // 30 seconds for user data
      refetchOnWindowFocus: false,  // No auto-refetch
      retry: true,                  // Retry failed Firestore requests
    },
  },
});
```

### Query Key Patterns

Use the `queryKeys` factory from `lib/queryClient.ts`:

```typescript
import { queryKeys } from '@/lib/queryClient';

// User-specific data
queryKey: queryKeys.user.stats(userId)
queryKey: queryKeys.user.quizzes(userId)

// Resource data
queryKey: queryKeys.categories.all()
queryKey: queryKeys.quiz.detail(quizId)
```

### useReducer for Complex Workflows

The quiz-taking feature uses `useReducer` for managing complex state:

```typescript
// Quiz state managed by reducer
const [state, dispatch] = useReducer(quizReducer, initialQuizState);

// Actions describe state transitions
dispatch({ type: 'SELECT_ANSWER', payload: { questionId, answer } });
dispatch({ type: 'TOGGLE_FLAG', payload: { questionId } });
dispatch({ type: 'CHANGE_QUESTION', payload: { index } });
```

See `hooks/useQuizState.ts` and `components/quiz/quizReducer.ts` for implementation.

### Context Providers

| Context | Purpose | Location |
|---------|---------|----------|
| AuthProvider | User authentication state | auth-provider.tsx |
| ThemeProvider | Theme switching (7 themes) | theme-provider.tsx |
| QueryClientProvider | TanStack Query instance | App.tsx |
| TooltipProvider | Radix tooltip context | App.tsx |

## Routing

### Client-Side Routing with Wouter

```typescript
// Route definitions (App.tsx)
<Route path="/" component={Landing} />
<Route path="/app" component={Dashboard} />
<Route path="/app/quiz/:id" component={Quiz} />
<Route path="/app/results/:id" component={Results} />
<Route path="/app/achievements" component={Achievements} />
// ... more routes
```

### Base Path Configuration

For Firebase Hosting deployment:

```typescript
// From vite.config.ts
// Firebase Hosting uses root path
base: process.env.VITE_BASE_PATH || '/'
```

## Multi-Tenancy

CertLab supports multiple isolated environments (tenants):

### Tenant Isolation

```
┌──────────────────────────────────────────────────────────────────┐
│                        User Account                               │
│  (email, name, credentials - shared across tenants)               │
└──────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Tenant 1      │  │   Tenant 2      │  │   Tenant 3      │
│   (Default)     │  │   (CISSP)       │  │   (CISM)        │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ - Categories    │  │ - Categories    │  │ - Categories    │
│ - Questions     │  │ - Questions     │  │ - Questions     │
│ - Quiz History  │  │ - Quiz History  │  │ - Quiz History  │
│ - Progress      │  │ - Progress      │  │ - Progress      │
│ - Achievements  │  │ - Achievements  │  │ - Achievements  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Switching Tenants

```typescript
// From auth-provider.tsx
const switchTenant = async (tenantId: number) => {
  const tenant = await clientStorage.getTenant(tenantId);
  if (tenant?.isActive) {
    await clientStorage.updateUser(user.id, { tenantId });
    queryClient.invalidateQueries();
  }
};
```

## Observability

CertLab integrates Dynatrace Real User Monitoring (RUM) for comprehensive observability and analytics.

### Observability Stack

| Component | Purpose | Integration Point |
|-----------|---------|------------------|
| Dynatrace RUM | Real user monitoring | `client/index.html` (script injection) |
| Dynatrace API | Custom action tracking | `client/src/lib/dynatrace.ts` |
| Session Tracking | User identification | `client/src/lib/auth-provider.tsx` |
| Error Reporting | Exception monitoring | Automatic via Dynatrace agent |

### Monitored Metrics

**Automatic Metrics**:
- Page load times and performance
- JavaScript errors and exceptions
- Resource loading (CSS, JS, images)
- User sessions and geographic distribution
- Browser and device analytics
- Network timing and latency

**Custom Actions**:
- User authentication (login, logout, registration)
- Quiz lifecycle (start, complete, results)
- Badge earning events
- Study group interactions
- Practice test completion
- Tenant switching

### Implementation

```typescript
// From main.tsx - Initialize on startup
import { initializeDynatrace } from './lib/dynatrace';
initializeDynatrace();

// From auth-provider.tsx - Track user sessions
import { identifyUser, endSession } from './lib/dynatrace';
identifyUser(user.id);  // On login
endSession();            // On logout

// Custom action tracking example
import { trackAction, completeAction } from './lib/dynatrace';
const actionId = trackAction('Quiz Completed');
// ... perform action ...
completeAction(actionId);
```

### Configuration

Dynatrace is configured via environment variables:

```bash
VITE_DYNATRACE_ENVIRONMENT_ID=your_env_id
VITE_DYNATRACE_APPLICATION_ID=your_app_id
VITE_DYNATRACE_BEACON_URL=https://your_env.live.dynatrace.com/bf
VITE_ENABLE_DYNATRACE=true
VITE_DYNATRACE_DEV_MODE=false  # Disabled in dev by default
```

For detailed setup instructions, see [../setup/dynatrace.md](../setup/dynatrace.md).

### Dashboards and Alerts

**Pre-configured Dashboards**:
1. Overview Dashboard - User sessions, page views, errors
2. Performance Dashboard - Load times, resource loading
3. User Behavior Dashboard - User journeys, conversion funnels

**Recommended Alerts**:
- High JavaScript error rate (> 10 per 1000 sessions)
- Slow page load times (> 3s median)
- Drop in user sessions (< 10 per hour during business hours)
- High quiz failure rate (< 70% completion)

See [../setup/dynatrace.md](../setup/dynatrace.md) for complete dashboard and alerting configuration.

## Build and Deployment

### Build Process

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   TypeScript │────▶│    Vite      │────▶│   Static     │
│   + React    │     │   (esbuild)  │     │   Bundle     │
└──────────────┘     └──────────────┘     │   (./dist)   │
                                          └──────────────┘
```

### Code Splitting

The build uses manual chunks for optimal loading:

| Chunk | Contents |
|-------|----------|
| `vendor-react` | React, React DOM |
| `vendor-ui` | Radix UI components |
| `vendor-charts` | Recharts |
| `vendor-utils` | date-fns, clsx, wouter |
| `index` | Main application code |
| Page chunks | Lazy-loaded page components |

### Testing

The project uses Vitest for unit and component testing:

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

Test configuration is in `vitest.config.ts` with jsdom environment for React component testing.

### Deployment (Firebase Hosting)

```yaml
# .github/workflows/firebase-deploy.yml
- npm ci
- npm run build:firebase
- Deploy ./dist to Firebase Hosting
```

## Key Design Decisions

### Why Cloud-First with Firestore?

1. **Multi-Device Sync**: Access your data from any device
2. **Scalability**: Google Cloud infrastructure handles growth
3. **Security**: Industry-standard authentication and data isolation
4. **Offline Support**: Automatic caching via Firestore SDK
5. **Real-time**: Changes sync instantly across devices

### Why TanStack Query?

1. **Caching**: Efficient data caching
2. **Consistency**: Unified data fetching patterns
3. **Optimistic Updates**: Better UX for mutations
4. **Familiar API**: Similar to server-side patterns

### Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| Multi-device sync | Requires Firebase setup |
| Scalable infrastructure | Depends on Google Cloud |
| Real-time sync | Needs internet connection for sync |
| Managed authentication | Tied to Firebase ecosystem |

## Extending the Architecture

### Adding New Features

1. **New Data Model**: Add to `shared/schema.ts` and update Firestore collections
2. **New Page**: Create in `pages/`, add route to `App.tsx`
3. **New Component**: Create in `components/`
4. **New Hook**: Create in `hooks/`

### Adding New Firestore Collection

```typescript
// In firestore-storage.ts
async getNewCollectionItems(userId: string) {
  const items = await getUserDocuments(userId, 'newCollection');
  return items;
}

async createNewCollectionItem(userId: string, data: any) {
  const id = generateId();
  await setUserDocument(userId, 'newCollection', id, {
    ...data,
    createdAt: new Date(),
  });
  return { id, ...data };
}
```

**Note**: Update `firestore.rules` to include security rules for new collections.

## Related Documentation

- [README.md](README.md) - Getting started and features
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [../setup/deployment.md](../setup/deployment.md) - Deployment instructions
- [../features/tenant-switching.md](../features/tenant-switching.md) - Multi-tenant feature details
