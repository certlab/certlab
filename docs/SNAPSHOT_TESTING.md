# Snapshot Testing Guide

This document explains how to use snapshot testing in CertLab to catch UI regressions and ensure component rendering consistency.

## Overview

CertLab uses [Vitest's snapshot testing](https://vitest.dev/guide/snapshot.html) to automatically detect visual and structural changes in React components. Snapshot tests capture the rendered output of components and compare them against previously approved snapshots.

## Why Snapshot Testing?

- **Catch UI Regressions**: Automatically detect unintended changes to component output
- **Document Component Behavior**: Snapshots serve as visual documentation of how components render
- **Fast Feedback**: Get immediate feedback when component structure or styling changes
- **Complement Unit Tests**: While unit tests verify logic, snapshots verify visual output

## Running Snapshot Tests

### Run All Tests (Including Snapshots)
```bash
npm run test:run
```

### Run Tests in Watch Mode
```bash
npm run test
```

### Run Only UI Component Snapshot Tests
```bash
npm run test:run -- client/src/components/ui/*.test.tsx
```

### Run Only Quiz Component Snapshot Tests
```bash
npm run test:run -- client/src/components/quiz/*.test.tsx
```

## Working with Snapshots

### Initial Snapshot Generation

When you first create a snapshot test, run it with the `-u` flag to generate the initial snapshot:

```bash
npm run test:run -- -u path/to/component.test.tsx
```

This creates a `__snapshots__` directory alongside your test file containing the snapshot file.

### Updating Snapshots

When you intentionally change a component's output (e.g., update styling, add props, modify structure), you need to update the snapshots:

```bash
# Update all snapshots
npm run test:run -- -u

# Update snapshots for a specific test file
npm run test:run -- -u client/src/components/ui/button.test.tsx
```

### Reviewing Snapshot Changes

When a snapshot test fails, it means the component's rendered output has changed. To review:

1. **Check the test output** - It will show what changed
2. **Review the diff** - Examine if the change is intentional
3. **If intentional**: Update the snapshot with `npm run test:run -- -u`
4. **If unintentional**: Fix the component to match the expected output

## Writing Snapshot Tests

### Basic Example

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Button } from './button';

describe('Button component snapshots', () => {
  it('renders with default props', () => {
    const { container } = render(<Button>Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Testing Multiple Variants

```typescript
describe('Button variants', () => {
  it('renders primary variant', () => {
    const { container } = render(<Button variant="default">Primary</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders destructive variant', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
```

### Testing with Props

```typescript
it('renders disabled state', () => {
  const { container } = render(<Button disabled>Disabled</Button>);
  expect(container.firstChild).toMatchSnapshot();
});

it('renders with custom className', () => {
  const { container } = render(<Button className="custom-class">Custom</Button>);
  expect(container.firstChild).toMatchSnapshot();
});
```

## Best Practices

### DO:
- ✅ Create snapshots for all UI components in `client/src/components/ui/`
- ✅ Create snapshots for quiz components with different states
- ✅ Review snapshot diffs carefully before updating
- ✅ Commit snapshot files to version control
- ✅ Use descriptive test names that explain what's being tested
- ✅ Test multiple variants and states of components
- ✅ Keep snapshots focused on specific component scenarios

### DON'T:
- ❌ Blindly update snapshots without reviewing changes
- ❌ Create snapshots for components with dynamic/random data without mocking
- ❌ Include entire page snapshots (too brittle and hard to review)
- ❌ Snapshot test components that depend on external APIs without mocking
- ❌ Commit snapshot changes without understanding what changed

## Snapshot Coverage

### Current Coverage

The following components have snapshot tests:

**UI Components (`client/src/components/ui/`):**
- ✅ Alert
- ✅ Badge
- ✅ Button
- ✅ Card
- ✅ Checkbox
- ✅ Input
- ✅ Label
- ✅ Progress
- ✅ Separator
- ✅ Skeleton
- ✅ Switch

**Quiz Components (`client/src/components/quiz/`):**
- ✅ QuestionNavigator
- ✅ QuizTimer

### Adding Snapshot Tests for New Components

When creating a new UI component:

1. **Create the component** in the appropriate directory
2. **Create a test file** with `.test.tsx` extension
3. **Write snapshot tests** for different states/variants
4. **Generate snapshots** with `npm run test:run -- -u path/to/test.tsx`
5. **Review the snapshots** to ensure they capture expected output
6. **Commit both test file and snapshots**

Example structure:
```
client/src/components/ui/
├── new-component.tsx          # Component implementation
├── new-component.test.tsx     # Test file with snapshots
└── __snapshots__/
    └── new-component.test.tsx.snap  # Generated snapshots
```

## CI Integration

Snapshot tests run automatically in CI as part of the standard test suite:

```yaml
- name: Run tests
  run: npm run test:run
```

If snapshot tests fail in CI:
1. The build will fail
2. Review the failure logs to see what changed
3. Update snapshots locally if the change is intentional
4. Commit and push the updated snapshots

## Troubleshooting

### Snapshots are inconsistent across environments

**Cause**: Different Node.js versions or operating systems may produce slightly different output.

**Solution**: Ensure CI and local environments use the same Node.js version (v20.x for CertLab).

### Too many snapshot updates

**Cause**: Refactoring common styling or structure causes many snapshots to update.

**Solution**: This is expected. Review changes carefully and update all affected snapshots together.

### Snapshot diffs are hard to read

**Cause**: Large snapshots or deeply nested structures.

**Solution**: Break down tests into smaller, more focused snapshots. Test individual component variants separately.

## Related Documentation

- [Vitest Snapshot Testing Guide](https://vitest.dev/guide/snapshot.html)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
- [CertLab Testing Setup](../client/src/test/setup.ts)
- [CertLab Project Structure](./PROJECT_STRUCTURE.md)

## Questions?

If you have questions about snapshot testing in CertLab, please:
- Check the [Vitest documentation](https://vitest.dev/guide/snapshot.html)
- Review existing snapshot tests for examples
- Ask in pull request discussions
