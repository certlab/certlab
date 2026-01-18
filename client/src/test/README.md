# Test Utilities and Factories

This directory contains shared testing utilities, mocks, and data factories for CertLab tests. These utilities help reduce duplication and improve test maintainability across the codebase.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Mocks](#mocks)
  - [Firebase Mocks](#firebase-mocks)
  - [Provider Mocks](#provider-mocks)
  - [Service Mocks](#service-mocks)
- [Data Factories](#data-factories)
  - [User Factory](#user-factory)
  - [Quiz Factory](#quiz-factory)
  - [Category Factory](#category-factory)
  - [Question Factory](#question-factory)
  - [Badge Factory](#badge-factory)
  - [Practice Test Factory](#practice-test-factory)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

## Directory Structure

```
client/src/test/
├── mocks/              # Mock utilities for external dependencies
│   ├── firebase.ts     # Firebase, Auth, and Firestore mocks
│   ├── providers.tsx   # React Query, Router, Auth provider wrappers
│   ├── services.ts     # Service mocks (analytics, notifications, etc.)
│   └── index.ts        # Re-exports all mocks
├── factories/          # Test data factories
│   ├── user.ts         # User entity factories
│   ├── quiz.ts         # Quiz entity factories
│   ├── category.ts     # Category/Subcategory factories
│   ├── question.ts     # Question entity factories
│   ├── badge.ts        # Badge/UserBadge factories
│   ├── practiceTest.ts # PracticeTest factories
│   └── index.ts        # Re-exports all factories
├── setup.ts            # Global test setup (already exists)
├── accessibility-setup.ts  # Accessibility testing setup (already exists)
└── README.md           # This file
```

## Mocks

### Firebase Mocks

Located in `mocks/firebase.ts`. Provides consistent Firebase, Auth, and Firestore mocking.

#### Basic Usage

**Important:** Due to Vitest's hoisting of `vi.mock()` calls, you must define mocks inline at the top level of your test file. The mock utility functions (like `mockFirebase()`) are provided as reference implementations but cannot be used directly in `vi.mock()` calls.

```typescript
import { vi } from 'vitest';

// Define mocks inline at the top level (hoisted to top of file)
vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  initializeFirebase: vi.fn().mockReturnValue(true),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/storage-factory', () => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  setStorageMode: vi.fn().mockResolvedValue(undefined),
  isCloudSyncAvailable: vi.fn().mockReturnValue(false),
  storage: {
    getUser: vi.fn().mockResolvedValue(null),
    createUser: vi.fn().mockResolvedValue(null),
    setCurrentUserId: vi.fn().mockResolvedValue(undefined),
    clearCurrentUser: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
}));
```

**Tip:** You can copy the inline mock definitions from existing test files like `ProtectedRoute.test.tsx` or `example.test.tsx`.

#### Creating Mock Users

```typescript
import { createMockFirebaseUser } from '@/test/mocks';

const mockUser = createMockFirebaseUser({
  uid: 'custom-uid',
  email: 'custom@example.com',
  displayName: 'Custom User',
});
```

#### Custom Auth State Changes

```typescript
import { mockFirebase, createMockFirebaseUser } from '@/test/mocks';

const user = createMockFirebaseUser();
let authCallback: ((user: any) => void) | null = null;

vi.mock('@/lib/firebase', () => mockFirebase({
  onAuthStateChanged: (callback) => {
    authCallback = callback;
    setTimeout(() => callback(user), 0);
    return () => {};
  },
}));

// Later in your test, trigger auth state change
if (authCallback) {
  authCallback(null); // Simulate sign out
}
```

### Provider Mocks

Located in `mocks/providers.tsx`. Provides test wrappers for React Query, Router, and Auth contexts.

#### TestProviders Wrapper

Use this for components that don't need authentication:

```typescript
import { render } from '@testing-library/react';
import { TestProviders } from '@/test/mocks';
import MyComponent from './MyComponent';

render(
  <TestProviders>
    <MyComponent />
  </TestProviders>
);
```

#### TestProvidersWithAuth Wrapper

Use this for components that need authentication (requires Firebase mocks):

```typescript
import { render } from '@testing-library/react';
import { TestProvidersWithAuth, createMockFirebaseUser } from '@/test/mocks';
import { createUser } from '@/test/factories';
import MyComponent from './MyComponent';

// Setup Firebase mocks inline at top level (outside of test function)
const mockFirebaseUser = createMockFirebaseUser({ email: 'test@example.com' });
const mockStorageUser = createUser({ 
  id: mockFirebaseUser.uid, 
  email: mockFirebaseUser.email 
});

vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  initializeFirebase: vi.fn().mockReturnValue(true),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    setTimeout(() => callback(mockFirebaseUser), 0);
    return () => {};
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(mockFirebaseUser),
}));

vi.mock('@/lib/storage-factory', () => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  storage: {
    getUser: vi.fn().mockResolvedValue(mockStorageUser),
    // ... other storage methods
  },
}));

// In your test
render(
  <TestProvidersWithAuth>
    <MyComponent />
  </TestProvidersWithAuth>
);
```

#### Mocking useAuth Hook

```typescript
import { vi } from 'vitest';
import { createMockUseAuth } from '@/test/mocks';

vi.mock('@/lib/auth-provider', () => ({
  useAuth: createMockUseAuth({
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'test-user', email: 'test@example.com' },
  }),
}));
```

### Service Mocks

Located in `mocks/services.ts`. Provides mocks for application services.

#### Individual Service Mocks

```typescript
import { vi } from 'vitest';
import { 
  mockAchievementService, 
  mockNotificationService,
  mockAnalyticsService 
} from '@/test/mocks';

vi.mock('@/lib/achievement-service', () => ({
  default: mockAchievementService(),
}));

vi.mock('@/lib/notification-service', () => ({
  default: mockNotificationService(),
}));
```

#### Service Mocks

Individual service mocks must be defined inline at the top level of your test file:

```typescript
import { vi } from 'vitest';
import { mockAchievementService, mockNotificationService } from '@/test/mocks';

// Define service mocks at top level
vi.mock('@/lib/achievement-service', () => ({
  default: mockAchievementService(),
}));

vi.mock('@/lib/notification-service', () => ({
  default: mockNotificationService(),
}));
```

## Data Factories

### User Factory

Located in `factories/user.ts`. Creates test User objects.

```typescript
import { createUser, createAdminUser, createUsers, createFullProfileUser } from '@/test/factories';

// Basic user
const user = createUser({ email: 'custom@example.com' });

// Admin user
const admin = createAdminUser();

// Multiple users
const users = createUsers(5); // Creates 5 users with sequential IDs

// User with full profile
const profileUser = createFullProfileUser({
  firstName: 'Jane',
  lastName: 'Smith',
});
```

### Quiz Factory

Located in `factories/quiz.ts`. Creates test Quiz objects.

```typescript
import { 
  createQuiz, 
  createPassingQuiz, 
  createPerfectQuiz,
  createInProgressQuiz,
  createAdaptiveQuiz 
} from '@/test/factories';

// Basic quiz
const quiz = createQuiz({ title: 'My Test Quiz' });

// Passing quiz (score >= 85%)
const passingQuiz = createPassingQuiz();

// Perfect score
const perfectQuiz = createPerfectQuiz();

// In-progress quiz (not completed)
const inProgress = createInProgressQuiz();

// Adaptive quiz
const adaptiveQuiz = createAdaptiveQuiz();
```

### Category Factory

Located in `factories/category.ts`. Creates test Category and Subcategory objects.

```typescript
import { 
  createCategory, 
  createCategories,
  createSubcategory,
  createSubcategories 
} from '@/test/factories';

// Single category
const category = createCategory({ name: 'Security Management' });

// Multiple categories
const categories = createCategories(5);

// Subcategory
const subcategory = createSubcategory({ 
  categoryId: 1, 
  name: 'Risk Assessment' 
});

// Multiple subcategories for a category
const subcategories = createSubcategories(3, 1); // 3 subcategories for category 1
```

### Question Factory

Located in `factories/question.ts`. Creates test Question objects with various types.

```typescript
import { 
  createQuestion,
  createMultipleAnswerQuestion,
  createTrueFalseQuestion,
  createFillInBlankQuestion,
  createQuestionWithEnhancedExplanation,
  DEFAULT_OPTIONS 
} from '@/test/factories';

// Basic multiple choice question
const question = createQuestion({ 
  text: 'What is security management?' 
});

// Multiple correct answers
const multiAnswer = createMultipleAnswerQuestion();

// True/False question
const trueFalse = createTrueFalseQuestion();

// Fill in the blank
const fillBlank = createFillInBlankQuestion();

// Question with enhanced explanation
const enhancedQ = createQuestionWithEnhancedExplanation({
  text: 'Explain the CIA triad',
});
```

### Badge Factory

Located in `factories/badge.ts`. Creates test Badge and UserBadge objects.

```typescript
import { 
  createBadge,
  createProgressBadge,
  createPerformanceBadge,
  createStreakBadge,
  createMasteryBadge,
  createUserBadge 
} from '@/test/factories';

// Basic badge
const badge = createBadge({ name: 'First Steps' });

// Specific badge types
const progressBadge = createProgressBadge();
const perfBadge = createPerformanceBadge();
const streakBadge = createStreakBadge();
const masteryBadge = createMasteryBadge();

// User's earned badge
const userBadge = createUserBadge({ 
  userId: 'user-123', 
  badgeId: 1 
});
```

### Practice Test Factory

Located in `factories/practiceTest.ts`. Creates test PracticeTest objects.

```typescript
import { 
  createPracticeTest,
  createOfficialPracticeTest,
  createQuickPracticeTest,
  createPracticeTestAttempt,
  createPassingAttempt 
} from '@/test/factories';

// Basic practice test
const test = createPracticeTest({ 
  name: 'CISSP Practice Exam' 
});

// Official test
const official = createOfficialPracticeTest();

// Quick test (fewer questions)
const quick = createQuickPracticeTest();

// Test attempt
const attempt = createPracticeTestAttempt({ 
  userId: 'user-123', 
  testId: 1 
});

// Passing attempt
const passingAttempt = createPassingAttempt();
```

## Usage Examples

### Complete Test Example with Mocks and Factories

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { TestProviders } from '@/test/mocks';
import { createUser, createQuiz, createPassingQuiz } from '@/test/factories';
import Dashboard from './Dashboard';

// Setup mocks inline at top level
vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  initializeFirebase: vi.fn().mockReturnValue(true),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    setTimeout(() => callback(null), 0);
    return () => {};
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(null),
}));

vi.mock('@/lib/storage-factory', () => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  storage: {
    getUser: vi.fn(),
    getQuizzes: vi.fn(),
  },
}));

vi.mock('@/lib/client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(null),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
}));

describe('Dashboard', () => {
  const testUser = createUser({ email: 'test@example.com' });
  const quizzes = [
    createPassingQuiz({ id: 1, score: 90 }),
    createQuiz({ id: 2, score: 75 }),
    createQuiz({ id: 3, score: 60 }),
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Configure mocks for this test
    const { storage } = await import('@/lib/storage-factory');
    vi.mocked(storage.getUser).mockResolvedValue(testUser);
    vi.mocked(storage.getQuizzes).mockResolvedValue(quizzes);
  });

  it('displays user quiz statistics', async () => {
    render(
      <TestProviders>
        <Dashboard />
      </TestProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument(); // Total quizzes
    });
  });
});
```

### Testing with Authentication

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestProvidersWithAuth, createMockFirebaseUser } from '@/test/mocks';
import { createUser } from '@/test/factories';
import ProtectedPage from './ProtectedPage';

// Setup mocks inline at top level
const mockFirebaseUser = createMockFirebaseUser({ email: 'test@example.com' });
const mockStorageUser = createUser({ 
  id: mockFirebaseUser.uid, 
  email: mockFirebaseUser.email 
});

vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  initializeFirebase: vi.fn().mockReturnValue(true),
  onFirebaseAuthStateChanged: vi.fn((callback) => {
    setTimeout(() => callback(mockFirebaseUser), 0);
    return () => {};
  }),
  signOutFromGoogle: vi.fn().mockResolvedValue(undefined),
  getCurrentFirebaseUser: vi.fn().mockReturnValue(mockFirebaseUser),
}));

vi.mock('@/lib/storage-factory', () => ({
  initializeStorage: vi.fn().mockResolvedValue(undefined),
  storage: {
    getUser: vi.fn().mockResolvedValue(mockStorageUser),
    createUser: vi.fn().mockResolvedValue(mockStorageUser),
    setCurrentUserId: vi.fn().mockResolvedValue(undefined),
    clearCurrentUser: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/client-auth', () => ({
  clientAuth: {
    getCurrentUser: vi.fn().mockResolvedValue(mockStorageUser),
    logout: vi.fn().mockResolvedValue({ success: true }),
  },
}));

vi.mock('@/lib/errors', () => ({
  logError: vi.fn(),
}));

describe('ProtectedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders protected content when authenticated', () => {
    render(
      <TestProvidersWithAuth>
        <ProtectedPage />
      </TestProvidersWithAuth>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

## Best Practices

### 1. Use Factories Over Hardcoded Objects

**❌ Don't:**
```typescript
const user = {
  id: 'test-user',
  email: 'test@example.com',
  firstName: 'Test',
  // ... many more fields
};
```

**✅ Do:**
```typescript
import { createUser } from '@/test/factories';

const user = createUser({ email: 'test@example.com' });
```

### 2. Use Inline Mocks at Top Level

**❌ Don't:**
```typescript
// This will fail due to hoisting issues
import { setupFirebaseMocks } from '@/test/mocks';
setupFirebaseMocks();
```

**✅ Do:**
```typescript
// Define mocks inline at top level
vi.mock('@/lib/firebase', () => ({
  isFirebaseConfigured: vi.fn().mockReturnValue(true),
  // ... other mocks
}));
```

### 3. Use Test Providers for Component Tests

**❌ Don't:**
```typescript
render(<MyComponent />); // Missing providers
```

**✅ Do:**
```typescript
import { TestProviders } from '@/test/mocks';

render(
  <TestProviders>
    <MyComponent />
  </TestProviders>
);
```

### 4. Clear Mocks Between Tests

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});
```

### 5. Override Defaults Minimally

Only override what you need for your specific test:

```typescript
// Good: Only override what's needed
const quiz = createQuiz({ score: 100 });

// Avoid: Overriding everything defeats the purpose of factories
const quiz = createQuiz({ 
  id: 1, 
  userId: 'test', 
  title: 'Test', 
  // ... many fields 
});
```

### 6. Use Appropriate Factory Variants

Factories often provide specialized variants:

```typescript
// Instead of creating a quiz and manually setting all passing fields
const quiz = createQuiz({ score: 85, isPassing: true, correctAnswers: 9 });

// Use the specialized factory
const quiz = createPassingQuiz();
```

### 7. Test Both Success and Error Cases

```typescript
describe('My Feature', () => {
  it('handles successful case', () => {
    // Test with valid data
  });

  it('handles error case', () => {
    vi.mock('@/lib/storage-factory', () => ({
      storage: {
        getUser: vi.fn().mockRejectedValue(new Error('Network error')),
      },
    }));
    // Test error handling
  });
});
```

## Adding New Factories

When adding new entities to the application, create corresponding factories:

1. Create a new file in `factories/` (e.g., `factories/lecture.ts`)
2. Export factory functions following the naming pattern:
   - `create{Entity}` - Basic factory
   - `create{Entity}s` - Multiple entities
   - `createInsert{Entity}` - For creation/insert operations
   - Specialized variants as needed
3. Add export to `factories/index.ts`
4. Document the new factory in this README

## Contributing

When modifying test utilities:

1. Keep factories simple and focused
2. Provide sensible defaults that work for most tests
3. Allow overrides for specific test cases
4. Document any complex behavior
5. Update this README with new utilities or patterns

## Questions or Issues?

If you encounter issues with test utilities or have suggestions for improvements, please:

1. Check existing tests for usage examples
2. Refer to this documentation
3. Create an issue in the repository
4. Contact the development team

---

**Last Updated:** January 2026  
**Maintainer:** CertLab Development Team
