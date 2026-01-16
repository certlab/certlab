# Unit Testing Documentation for CertLab

## Overview

This document provides guidance for running and extending the unit test suite in CertLab. The application uses **Vitest** as its test runner with **React Testing Library** for component tests.

## Running Tests

### Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests once
npm run test:run

# Run tests in watch mode (for development)
npm test

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm run test:run -- path/to/test-file.test.tsx
```

### Test Commands

| Command | Purpose |
|---------|---------|
| `npm test` | Run tests in watch mode (interactive) |
| `npm run test:run` | Run all tests once and exit |
| `npm run test:coverage` | Generate coverage report in `coverage/` directory |

## Test Structure

### Test File Organization

Tests are located alongside their source files:

```
client/src/
├── components/
│   ├── Button.tsx
│   └── Button.test.tsx           # Component test
├── lib/
│   ├── utils.ts
│   └── utils.test.ts              # Utility function test
├── pages/
│   ├── quiz.tsx
│   └── quiz.test.tsx              # Page component test
└── hooks/
    ├── useQuizState.tsx
    └── useQuizState.test.tsx      # Custom hook test
```

### Test File Naming

- Component tests: `ComponentName.test.tsx`
- Utility tests: `utilityName.test.ts`
- Hook tests: `useHookName.test.tsx`

## Writing Tests

### Test Template

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const { user } = render(<MyComponent />);
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Component Testing Pattern

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/lib/storage-factory', () => ({
  storage: {
    getData: vi.fn(),
  },
}));

describe('MyComponent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('should fetch and display data', async () => {
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    render(<MyComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Data')).toBeInTheDocument();
    });
  });
});
```

### Hook Testing Pattern

```typescript
import { renderHook, act } from '@testing-library/react';

describe('useMyHook', () => {
  it('should update state correctly', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.updateValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

### Service Testing Pattern

```typescript
import { vi } from 'vitest';
import { myService } from './myService';

// Mock dependencies
vi.mock('./storage-factory', () => ({
  storage: {
    saveData: vi.fn(),
    getData: vi.fn(),
  },
}));

describe('MyService', () => {
  it('should process data correctly', async () => {
    vi.mocked(storage.getData).mockResolvedValue({ data: 'test' });

    const result = await myService.processData();

    expect(result).toEqual({ processed: true });
    expect(storage.saveData).toHaveBeenCalledWith({ data: 'test' });
  });
});
```

## Mocking Strategies

### Mocking Firebase/Firestore

```typescript
// Mock storage-factory (recommended approach)
vi.mock('@/lib/storage-factory', () => ({
  storage: {
    getUserQuizzes: vi.fn().mockResolvedValue([]),
    getUserGameStats: vi.fn().mockResolvedValue({}),
  },
}));
```

### Mocking Auth Context

```typescript
const mockUseAuth = vi.fn();

vi.mock('@/lib/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

// In test:
mockUseAuth.mockReturnValue({
  user: { id: '123', email: 'test@example.com' },
  isAuthenticated: true,
  isLoading: false,
});
```

### Mocking React Router

```typescript
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const wrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/quiz/123']}>
    <Routes>
      <Route path="/quiz/:id" element={children} />
    </Routes>
  </MemoryRouter>
);

render(<QuizPage />, { wrapper });
```

## Test Coverage

### Coverage Thresholds

Configured in `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60,
  },
}
```

### Viewing Coverage Reports

After running `npm run test:coverage`:

1. Open `coverage/index.html` in a browser
2. Navigate through files to see line-by-line coverage
3. Uncovered lines are highlighted in red

## Best Practices

### 1. Test Behavior, Not Implementation

❌ Bad:
```typescript
expect(component.state.count).toBe(1);
```

✅ Good:
```typescript
expect(screen.getByText('Count: 1')).toBeInTheDocument();
```

### 2. Use Semantic Queries

Priority order:
1. `getByRole` - Accessibility-focused
2. `getByLabelText` - Form elements
3. `getByPlaceholderText` - Inputs
4. `getByText` - Non-interactive elements
5. `getByTestId` - Last resort

### 3. Async Testing

Always await async operations:

```typescript
// ❌ Bad
it('loads data', () => {
  render(<Component />);
  expect(screen.getByText('Data')).toBeInTheDocument(); // May fail
});

// ✅ Good
it('loads data', async () => {
  render(<Component />);
  await waitFor(() => {
    expect(screen.getByText('Data')).toBeInTheDocument();
  });
});
```

### 4. Clean Up

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // Clear mock state
});

afterEach(() => {
  vi.restoreAllMocks(); // Restore original functions
});
```

### 5. Mock External Dependencies

Always mock:
- API calls (`storage` methods)
- Firebase/Firestore operations
- Router navigation
- External services

## Common Test Scenarios

### Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn();

  render(<MyForm onSubmit={onSubmit} />);

  await user.type(screen.getByLabelText('Name'), 'John Doe');
  await user.click(screen.getByRole('button', { name: /submit/i }));

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John Doe' });
});
```

### Testing Loading States

```typescript
it('should show loading spinner', () => {
  render(<Component />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
});
```

### Testing Error States

```typescript
it('should display error message', async () => {
  vi.mocked(storage.getData).mockRejectedValue(new Error('Failed'));

  render(<Component />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```typescript
it('should increment counter on click', async () => {
  const user = userEvent.setup();
  render(<Counter />);

  const button = screen.getByRole('button', { name: /increment/i });
  await user.click(button);

  expect(screen.getByText('Count: 1')).toBeInTheDocument();
});
```

## Test Utilities

### Custom Render with Providers

Create `client/src/test/test-utils.tsx`:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

export function renderWithProviders(
  ui: React.ReactElement,
  options?: { initialRoute?: string }
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[options?.initialRoute || '/']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
}
```

Usage:
```typescript
renderWithProviders(<MyComponent />, { initialRoute: '/dashboard' });
```

## Debugging Tests

### View Rendered Output

```typescript
import { screen, render } from '@testing-library/react';

render(<Component />);
screen.debug(); // Prints DOM tree
```

### Check What's Rendered

```typescript
screen.logTestingPlaygroundURL(); // Generate Testing Playground URL
```

### Run Single Test

```typescript
it.only('should focus on this test', () => {
  // Only this test will run
});
```

### Skip Tests

```typescript
it.skip('should skip this test', () => {
  // This test will be skipped
});
```

## Continuous Integration

Tests run automatically on:
- Every push to branches
- Pull request creation/updates
- Pre-commit hooks (via Husky)

## Troubleshooting

### Common Issues

**Issue**: "Cannot find module '@/components/...'"
**Solution**: Check path aliases in `vite.config.ts` match test imports

**Issue**: "ReferenceError: localStorage is not defined"
**Solution**: Use `jsdom` environment in `vitest.config.ts`

**Issue**: "act(...) warning in tests"
**Solution**: Wrap state updates in `await waitFor()` or `act()`

**Issue**: "Module mock not working"
**Solution**: Ensure `vi.mock()` is called before imports

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Test Suite Status

Current test metrics (as of latest update):
- **Test Files**: 57 
- **Total Tests**: 628+
- **Coverage**: Meeting 60% threshold
- **Passing Rate**: 98% (14 pre-existing failures in accessibility tests)

### Test Coverage by Area

| Area | Coverage | Status |
|------|----------|--------|
| Services | ✅ Good | achievement-service, gamification-service |
| Components | ✅ Good | UI components, quiz interface, timers |
| Pages | ✅ Good | quiz, results, marketplace, dashboard |
| Hooks | ⚠️ Partial | useQuizState, use-toast, use-pagination |
| Utilities | ✅ Excellent | All utility modules covered |
| Storage | ⚠️ Needs Work | Firestore operations need mocking improvements |

## Contributing Tests

When adding new features:

1. **Write tests first** (TDD approach recommended)
2. **Cover happy paths** (normal user flows)
3. **Cover edge cases** (empty data, errors, boundary conditions)
4. **Test accessibility** (ARIA attributes, keyboard navigation)
5. **Mock external dependencies** (Firestore, APIs)
6. **Keep tests focused** (one concept per test)
7. **Use descriptive test names** (describe what, not how)

Example test naming:
```typescript
// ❌ Bad
it('test 1', () => {});

// ✅ Good  
it('should display error message when API request fails', () => {});
```

---

For questions or improvements to this documentation, please update this file and submit a PR.
