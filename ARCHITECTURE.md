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

CertLab is a **client-side only** web application designed for certification exam preparation. The entire application runs in the browser with no backend server required.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Type** | Single-Page Application (SPA) |
| **Runtime** | Browser (Chrome, Firefox, Safari, Edge) |
| **Storage** | IndexedDB (browser storage) |
| **Authentication** | Client-side, browser-based |
| **Hosting** | Static file hosting (GitHub Pages) |
| **Offline Support** | Full offline capability after initial load |

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
│  └───────────────────────────────────┼───────────────────────────────────┘ │
│                                      │                                      │
│  ┌───────────────────────────────────▼───────────────────────────────────┐ │
│  │                          Storage Layer                                 │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐   │ │
│  │  │ client-storage  │───▶│   indexeddb.ts  │───▶│    IndexedDB     │   │ │
│  │  │  (API Layer)    │    │ (DB Operations) │    │  (Browser Store) │   │ │
│  │  └─────────────────┘    └─────────────────┘    └──────────────────┘   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
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
    ├── client-storage.ts # Storage API
    ├── indexeddb.ts      # IndexedDB service
    ├── auth-provider.tsx # Auth context
    └── queryClient.ts    # Query configuration
```

## Data Layer

### IndexedDB Stores

All application data is stored in IndexedDB with the following stores:

| Store | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, passwordHash, tenantId |
| `tenants` | Multi-tenant support | id, name, isActive |
| `categories` | Certification categories | id, tenantId, name |
| `subcategories` | Topic areas | id, tenantId, categoryId |
| `questions` | Question bank | id, tenantId, text, options |
| `quizzes` | Quiz attempts | id, userId, tenantId, score |
| `userProgress` | Learning progress | userId, tenantId, categoryId |
| `masteryScores` | Performance tracking | userId, tenantId, subcategoryId |
| `badges` | Achievement definitions | id, name, requirement |
| `userBadges` | Earned badges | userId, tenantId, badgeId |
| `userGameStats` | Gamification stats | userId, tenantId, points |
| `lectures` | Study materials | id, userId, content |
| `challenges` | Learning challenges | id, userId, type |
| `challengeAttempts` | Challenge results | userId, tenantId, score |
| `studyGroups` | Study groups | id, tenantId, name |
| `studyGroupMembers` | Group membership | groupId, userId |
| `practiceTests` | Practice exams | id, tenantId, name |
| `practiceTestAttempts` | Test results | userId, tenantId, score |
| `settings` | App settings | key, value |

### Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   UI Event   │────▶│ TanStack     │────▶│ Storage API  │
│  (e.g. click)│     │ Query/Mutation│     │ (client-     │
└──────────────┘     └──────────────┘     │  storage.ts) │
                                          └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │ IndexedDB    │
                                          │ Service      │
                                          │ (indexeddb.ts)│
                                          └──────┬───────┘
                                                 │
                                          ┌──────▼───────┐
                                          │ Browser      │
                                          │ IndexedDB    │
                                          └──────────────┘
```

### Storage API Pattern

The `clientStorage` object provides a consistent API mimicking server-side patterns:

```typescript
// Example usage
import { clientStorage } from '@/lib/client-storage';

// Get all categories for current tenant
const categories = await clientStorage.getCategoriesByTenant(tenantId);

// Create a new quiz
const quiz = await clientStorage.createQuiz({
  userId: user.id,
  tenantId: user.tenantId,
  title: 'CISSP Practice',
  categoryIds: [1],
  subcategoryIds: [],
  questionCount: 10,
  mode: 'quiz'
});

// Export all data
const jsonData = await clientStorage.exportData();
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

### TanStack Query (React Query)

Used for all async data operations:

```typescript
// Query configuration (queryClient.ts)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,          // Data never considered stale
      refetchOnWindowFocus: false,  // No auto-refetch
      retry: 1,                     // Minimal retries
    },
  },
});
```

### Query Key Patterns

```typescript
// Categories filtered by tenant
queryKey: ['/api/categories', user?.tenantId]

// User-specific data
queryKey: ['/api/user', user?.id, 'quizzes']

// Single resource
queryKey: ['/api/quiz', quizId]
```

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

For GitHub Pages deployment:

```typescript
// From vite.config.ts
base: process.env.VITE_BASE_PATH || 
      (process.env.NODE_ENV === 'production' ? '/certlab/' : '/')
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

### Deployment (GitHub Pages)

```yaml
# .github/workflows/deploy.yml
- npm ci
- npm run build
- Deploy ./dist to GitHub Pages
```

## Key Design Decisions

### Why Client-Side Only?

1. **Privacy**: All data stays in the user's browser
2. **Cost**: No server infrastructure needed
3. **Offline**: Works completely offline
4. **Simplicity**: No API complexity
5. **Hosting**: Free hosting on GitHub Pages

### Why IndexedDB?

1. **Capacity**: Stores large amounts of data (questions, history)
2. **Persistence**: Survives browser restarts
3. **Structured**: Supports indexes and queries
4. **Async**: Non-blocking operations

### Why TanStack Query?

1. **Caching**: Efficient data caching
2. **Consistency**: Unified data fetching patterns
3. **Optimistic Updates**: Better UX for mutations
4. **Familiar API**: Similar to server-side patterns

### Trade-offs

| Benefit | Trade-off |
|---------|-----------|
| Privacy (local data) | No cross-device sync |
| Free hosting | No server-side features |
| Offline capable | Single-user per browser |
| No backend | No real multi-user collaboration |

## Extending the Architecture

### Adding New Features

1. **New Data Model**: Add to `shared/schema.ts` and `indexeddb.ts`
2. **New Page**: Create in `pages/`, add route to `App.tsx`
3. **New Component**: Create in `components/`
4. **New Hook**: Create in `hooks/`

### Adding New IndexedDB Store

```typescript
// In indexeddb.ts
if (!db.objectStoreNames.contains('newStore')) {
  const store = db.createObjectStore('newStore', { 
    keyPath: 'id', 
    autoIncrement: true 
  });
  store.createIndex('userId', 'userId');
}

// In client-storage.ts
async getNewStoreItems(userId: string) {
  const db = await getDatabase();
  const tx = db.transaction('newStore', 'readonly');
  const index = tx.store.index('userId');
  return await index.getAll(userId);
}
```

## Related Documentation

- [README.md](README.md) - Getting started and features
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deployment instructions
- [TENANT_SWITCHING.md](TENANT_SWITCHING.md) - Multi-tenant feature details
