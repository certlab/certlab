# CertLab Testing Guide

This guide provides comprehensive instructions for running, writing, and extending the test suite in CertLab.

## Table of Contents
- [Overview](#overview)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Mocking Patterns](#mocking-patterns)
- [Coverage](#coverage)
- [Troubleshooting](#troubleshooting)

## Overview

CertLab uses [Vitest](https://vitest.dev/) as its testing framework along with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) for component testing.

### Current Test Coverage
- **Total Test Files**: 49
- **Total Tests**: 651+
- **Framework**: Vitest with jsdom environment
- **Coverage Thresholds**: 60% (lines, functions, branches, statements)

### Test Categories
1. **Unit Tests**: Pure functions, utilities, services
2. **Component Tests**: React components with RTL
3. **Hook Tests**: Custom React hooks
4. **Integration Tests**: Multi-component workflows
5. **Page Tests**: Full page components

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode (re-runs on file changes)
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm run test:run -- client/src/lib/storage-factory.test.ts

# Run tests matching pattern
npm run test:run -- --grep="storage"
```

### Test Output

Tests provide detailed output including:
- ✓ Passed tests (green checkmarks)
- × Failed tests (red X marks) with error messages
- Test execution time
- Coverage statistics (when running with coverage)

### CI/CD Integration

Tests run automatically on:
- Pull request creation
- Push to main branch
- Manual workflow dispatch

## Test Structure

### File Organization

Test files are co-located with source files and follow naming conventions:

```
client/src/
├── components/
│   ├── Header.tsx
│   └── Header.test.tsx          # Component test
├── hooks/
│   ├── use-toast.ts
│   └── use-toast.test.ts        # Hook test
├── lib/
│   ├── storage-factory.ts
│   └── storage-factory.test.ts  # Service/utility test
└── pages/
    ├── dashboard.tsx
    └── dashboard.test.tsx       # Page test
```

### Test File Template

```typescript
/**
 * Unit tests for [module name]
 * 
 * Brief description of what is being tested
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react'; // For components
import { ModuleToTest } from './module-to-test';

// Mock dependencies
vi.mock('./dependency', () => ({
  dependency: vi.fn(),
}));

describe('ModuleToTest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('featureGroup', () => {
    it('should behave correctly in normal case', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = ModuleToTest.someFunction(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should handle edge cases', () => {
      expect(ModuleToTest.someFunction('')).toBe('');
      expect(ModuleToTest.someFunction(null)).toBeNull();
    });
  });
});
```

## Writing Tests

### Component Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyComponent } from './MyComponent';

// Create wrapper for providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />, { wrapper: createWrapper() });
    
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />, { wrapper: createWrapper() });
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Clicked!')).toBeInTheDocument();
    });
  });
});
```

### Hook Testing

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCustomHook } from './useCustomHook';

describe('useCustomHook', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCustomHook());
    
    expect(result.current.value).toBe(0);
  });

  it('should update state on action', () => {
    const { result } = renderHook(() => useCustomHook());
    
    act(() => {
      result.current.increment();
    });
    
    expect(result.current.value).toBe(1);
  });
});
```

### Service/Utility Testing

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myUtilityFunction } from './utils';

describe('myUtilityFunction', () => {
  it('should transform input correctly', () => {
    const input = { name: 'test' };
    const result = myUtilityFunction(input);
    
    expect(result).toEqual({ name: 'TEST' });
  });

  it('should handle null input', () => {
    expect(myUtilityFunction(null)).toBeNull();
  });

  it('should throw on invalid input', () => {
    expect(() => myUtilityFunction('invalid')).toThrow();
  });
});
```

## Mocking Patterns

### Mocking Modules

```typescript
// Simple mock
vi.mock('./storage-factory', () => ({
  storage: {
    getQuiz: vi.fn(),
    createQuiz: vi.fn(),
  },
}));

// Mock with implementation
vi.mock('./auth-provider', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 1, email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
  })),
}));

// Partial mock (keep some real implementations)
vi.mock('./module', async () => {
  const actual = await vi.importActual('./module');
  return {
    ...actual,
    functionToMock: vi.fn(),
  };
});
```

### Mocking Firebase/Firestore

```typescript
vi.mock('./firestore-service', () => ({
  initializeFirestoreService: vi.fn().mockResolvedValue(true),
  isFirestoreInitialized: vi.fn().mockReturnValue(true),
}));

vi.mock('./firebase', () => ({
  getCurrentFirebaseUser: vi.fn().mockReturnValue(null),
  initializeFirebase: vi.fn().mockResolvedValue(undefined),
}));
```

### Mocking Storage

```typescript
import { storage } from './storage-factory';

// In test file, after vi.mock
vi.mocked(storage.getQuiz).mockResolvedValue({
  id: 1,
  title: 'Test Quiz',
  // ... other properties
});

vi.mocked(storage.createQuiz).mockResolvedValue({ id: 2 });
```

### Mocking React Router / Wouter

```typescript
// For wouter
vi.mock('wouter', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ['/current/path', vi.fn()],
  Route: ({ children }: any) => <>{children}</>,
}));

// For react-router-dom
vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useNavigate: () => vi.fn(),
}));
```

### Mocking TanStack Query

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
}

// In test
const queryClient = createTestQueryClient();
render(
  <QueryClientProvider client={queryClient}>
    <Component />
  </QueryClientProvider>
);
```

## Coverage

### Viewing Coverage

```bash
npm run test:coverage
```

This generates:
- Console output with coverage percentages
- HTML report in `coverage/` directory (open `coverage/index.html`)
- JSON report for CI integration

### Coverage Thresholds

Current thresholds (configured in `vitest.config.ts`):
- Lines: 60%
- Functions: 60%
- Branches: 60%
- Statements: 60%

### Improving Coverage

1. **Identify gaps**: Check the HTML report for uncovered lines
2. **Add tests**: Write tests for uncovered code paths
3. **Focus on critical paths**: Prioritize high-value code
4. **Don't over-optimize**: 100% coverage is not always necessary

## Troubleshooting

### Common Issues

#### 1. Module Import Errors

**Problem**: `Cannot find module '@/...'`

**Solution**: Check path aliases in `vitest.config.ts` match `vite.config.ts`

```typescript
resolve: {
  alias: {
    '@': path.resolve(import.meta.dirname, 'client', 'src'),
    '@shared': path.resolve(import.meta.dirname, 'shared'),
  },
},
```

#### 2. Firebase/Firestore Not Mocked

**Problem**: Tests failing with Firestore errors

**Solution**: Mock storage factory before importing module under test

```typescript
vi.mock('./storage-factory', () => ({
  storage: {
    // mock all methods used by the module
  },
}));

// Import after mock
import { ModuleUnderTest } from './module-under-test';
```

#### 3. React Hooks Errors

**Problem**: "Hooks can only be called inside function components"

**Solution**: Wrap hook tests in `renderHook` from RTL

```typescript
import { renderHook } from '@testing-library/react';

const { result } = renderHook(() => useMyHook());
```

#### 4. Async State Updates

**Problem**: "Warning: An update was not wrapped in act(...)"

**Solution**: Use `waitFor` or `act` for async updates

```typescript
import { waitFor, act } from '@testing-library/react';

// Option 1: waitFor
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// Option 2: act
await act(async () => {
  await someAsyncAction();
});
```

#### 5. Test Timing Issues

**Problem**: Tests fail intermittently due to timing

**Solution**: Use proper async utilities and increase timeouts if needed

```typescript
it('should load data', async () => {
  render(<Component />);
  
  // Wait for async operation
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument();
  }, {
    timeout: 3000, // Increase timeout if needed
  });
});
```

### Debugging Tests

```bash
# Run tests with debugging
npm run test:run -- --reporter=verbose

# Run single test file with detailed output
npm run test:run -- client/src/lib/module.test.ts --reporter=verbose

# Debug specific test
npm run test:run -- -t "test name pattern"
```

## Best Practices

### 1. Test Structure (AAA Pattern)

```typescript
it('should do something', () => {
  // Arrange: Set up test data and mocks
  const input = 'test';
  vi.mocked(someMock).mockReturnValue('mocked');
  
  // Act: Execute the code being tested
  const result = functionUnderTest(input);
  
  // Assert: Verify the results
  expect(result).toBe('expected');
});
```

### 2. Test Isolation

- Each test should be independent
- Use `beforeEach` to reset state
- Clear mocks between tests
- Avoid test interdependencies

```typescript
describe('Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any shared state
  });

  it('test 1', () => {
    // This test should not affect test 2
  });

  it('test 2', () => {
    // This test should not depend on test 1
  });
});
```

### 3. Meaningful Test Names

```typescript
// ❌ Bad
it('works', () => { ... });
it('test 1', () => { ... });

// ✅ Good
it('should return empty array when no quizzes exist', () => { ... });
it('should throw error when user is not authenticated', () => { ... });
it('should display loading spinner while fetching data', () => { ... });
```

### 4. Test Edge Cases

```typescript
describe('parseUserInput', () => {
  it('should handle normal input', () => { ... });
  it('should handle empty string', () => { ... });
  it('should handle null', () => { ... });
  it('should handle undefined', () => { ... });
  it('should handle very long input', () => { ... });
  it('should handle special characters', () => { ... });
});
```

### 5. Don't Test Implementation Details

```typescript
// ❌ Bad - testing implementation
it('should call internal function', () => {
  const spy = vi.spyOn(component, 'internalMethod');
  component.publicMethod();
  expect(spy).toHaveBeenCalled();
});

// ✅ Good - testing behavior
it('should display success message after save', async () => {
  render(<Component />);
  await user.click(screen.getByRole('button', { name: /save/i }));
  expect(screen.getByText('Saved successfully')).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [CertLab Contributing Guide](../CONTRIBUTING.md)

## Getting Help

If you encounter issues:
1. Check this guide for common patterns
2. Review existing test files for examples
3. Check the [troubleshooting section](#troubleshooting)
4. Ask in team channels or create an issue

---

*Last Updated: January 2026*
