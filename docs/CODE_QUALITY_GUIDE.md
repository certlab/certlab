# Code Quality Tools Guide

This guide explains the different code quality tools used in CertLab and when to use them.

## Overview

CertLab uses multiple tools to ensure code quality:

1. **ESLint** - Code style and patterns
2. **TypeScript** - Type safety
3. **Prettier** - Code formatting
4. **Vitest** - Testing

Each tool serves a different purpose and checks different aspects of your code.

---

## ESLint (`npm run lint`)

### What It Checks
- Code style and consistency
- Potential runtime errors (unused variables, missing dependencies)
- React-specific patterns (hooks rules)
- Common JavaScript mistakes
- Import/export issues

### What It Does NOT Check
- TypeScript type compatibility
- Missing properties in objects
- Type inference issues
- Type safety

### Example Issues ESLint Catches
```typescript
// ✅ ESLint will catch these:
const unusedVar = 123;  // Warning: unused variable
useEffect(() => {}, [value]);  // Warning: missing dependency
```

### Example Issues ESLint DOES NOT Catch
```typescript
// ❌ ESLint will NOT catch these (but TypeScript will):
interface Quiz {
  id: number;
  title: string;
  score: number | null;
}

const quiz: Quiz = {
  id: 1,
  title: "Test"
  // Missing: score property
};
```

### When to Run
```bash
# Check for issues
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Current Status
- ✅ Runs on all PRs and pushes to main
- ✅ Runs in pre-commit hooks via lint-staged
- ⚠️ Currently shows 251 warnings (not blocking)

---

## TypeScript Type Check (`npm run check`)

### What It Checks
- Type safety and correctness
- Type compatibility between values
- Missing or incorrect properties
- Function signature matching
- Proper use of types and interfaces
- Generic type constraints

### What It Does NOT Check
- Code style or formatting
- Unused variables (unless strict is enabled)
- Import organization

### Example Issues TypeScript Catches
```typescript
// ✅ TypeScript will catch these:
interface Quiz {
  id: number;
  title: string;
  score: number | null;
}

const quiz: Quiz = {
  id: 1,
  title: "Test"
  // Error: Property 'score' is missing
};

const score: number = null;  // Error: Type 'null' is not assignable to type 'number'
```

### When to Run
```bash
# Type check all files
npm run check

# Type check with watch mode (for development)
npx tsc --watch --noEmit
```

### Current Status
- ✅ Runs in Firebase Deploy workflow
- ✅ **NEW:** Now runs in dedicated Type Check workflow on all PRs
- ⚠️ Currently shows 19 pre-existing type errors (not blocking build)

---

## Key Differences: ESLint vs TypeScript

| Aspect | ESLint | TypeScript |
|--------|--------|------------|
| **Purpose** | Code quality & style | Type safety |
| **Speed** | Fast | Slower |
| **Type checking** | ❌ No | ✅ Yes |
| **Style checking** | ✅ Yes | ❌ No |
| **Can auto-fix** | ✅ Yes | ❌ No |
| **Blocking builds** | Optional | Yes (in strict mode) |

**Important:** Both tools are necessary! ESLint does not replace TypeScript, and TypeScript does not replace ESLint.

---

## Prettier (`npm run format`)

### What It Does
- Formats code consistently
- Enforces spacing, line breaks, quotes
- Works with ESLint (some rules disabled to avoid conflicts)

### When to Run
```bash
# Format all files
npm run format

# Check formatting without changing files
npm run format:check
```

### Current Status
- ✅ Runs in pre-commit hooks via lint-staged
- ✅ Automatically formats staged files

---

## Vitest (`npm run test`)

### What It Does
- Runs unit and integration tests
- Verifies functionality
- Catches runtime errors
- Validates business logic

### When to Run
```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Current Status
- ✅ 413 tests total
- ⚠️ 1 test currently failing (pre-existing, unrelated to type issues)

---

## Development Workflow

### Before Committing
1. **Write your code**
2. **Run linter:** `npm run lint` (auto-fixes on commit)
3. **Run type check:** `npm run check` (catches type errors)
4. **Run tests:** `npm run test:run` (verifies functionality)
5. **Commit** (pre-commit hooks will run automatically)

### Pre-commit Hooks (Automatic)
When you commit, Husky and lint-staged automatically run:
1. ESLint with auto-fix
2. Prettier with auto-format
3. Commit is blocked if errors are found

### CI/CD (Automatic)
When you push or create a PR, GitHub Actions runs:
1. **Lint workflow:** ESLint on all files
2. **Type Check workflow:** TypeScript type checking (NEW!)
3. **Firebase Deploy workflow:** Type check + Build + Deploy (on main branch)

---

## Common Scenarios

### Scenario 1: I changed a TypeScript interface
**What to do:**
1. Update the interface in `shared/schema.ts`
2. Update all mock objects in test files
3. Run `npm run check` to verify types
4. Run `npm run test:run` to verify tests
5. Run `npm run lint` to check code quality

### Scenario 2: I'm getting TypeScript errors
**What to do:**
1. Read the error message carefully
2. Check the line number and file mentioned
3. Verify all required properties are present
4. Ensure types match (e.g., `null` vs `undefined`)
5. Run `npm run check` to verify fix

### Scenario 3: ESLint is showing warnings
**What to do:**
1. Try auto-fix: `npm run lint:fix`
2. If warnings persist, review them manually
3. Fix warnings or add ESLint disable comments if justified
4. Commit changes

### Scenario 4: Pre-commit hook is blocking my commit
**What to do:**
1. Review the error messages
2. Fix the issues (usually formatting or unused variables)
3. Stage the fixed files: `git add .`
4. Commit again

### Scenario 5: CI/CD is failing on Type Check
**What to do:**
1. Pull the latest changes
2. Run `npm run check` locally
3. Fix all type errors shown
4. Commit and push the fixes
5. CI/CD will re-run automatically

---

## Best Practices

### 1. Run Type Check Regularly
Don't wait for CI/CD to catch type errors:
```bash
# Add to your workflow:
npm run lint && npm run check && npm run test:run
```

### 2. Fix Type Errors Immediately
Type errors compound over time. Fix them as soon as they appear.

### 3. Keep Mock Objects in Sync
When changing schemas, update all test mock objects:
```typescript
// ✅ Good: Mock has all required properties
const mockQuiz: Quiz = {
  id: 1,
  title: "Test",
  score: null,
  // ... all other required properties
};

// ❌ Bad: Mock is missing properties
const mockQuiz = {
  id: 1,
  title: "Test"
  // Missing properties will cause type errors
};
```

### 4. Use Type Annotations
Help TypeScript understand your intent:
```typescript
// ✅ Good: Explicit type
const quiz: Quiz = createQuiz();

// ⚠️ Okay but less safe: Inferred type
const quiz = createQuiz();
```

### 5. Avoid `any` Type
The ESLint warning `@typescript-eslint/no-explicit-any` is there for a reason:
```typescript
// ❌ Avoid this:
const data: any = getUser();

// ✅ Prefer this:
const data: User = getUser();

// ✅ Or this if type is truly unknown:
const data: unknown = getUser();
```

---

## Schema Change Checklist

When modifying `shared/schema.ts` or any TypeScript interface:

- [ ] Update the schema/interface definition
- [ ] Update all mock objects in test files
- [ ] Run `npm run check` to verify types
- [ ] Run `npm run test:run` to verify tests
- [ ] Run `npm run lint` to check code quality
- [ ] Update any documentation referencing the schema
- [ ] Check for database migration needs (if applicable)
- [ ] Review all files that import the changed type

---

## Troubleshooting

### "Property X is missing from type Y"
**Cause:** An object is missing a required property  
**Fix:** Add the missing property or make it optional in the type definition

### "Type 'undefined' is not assignable to type 'T'"
**Cause:** A value can be undefined but the type doesn't allow it  
**Fix:** Use `null` instead of `undefined`, or make the property optional with `?`

### "Type 'X' is not assignable to type 'Y'"
**Cause:** Two types are incompatible  
**Fix:** Ensure all properties match the expected type, check for missing properties

### ESLint and TypeScript show different errors
**This is normal!** They check different things. Fix both types of errors.

---

## Further Reading

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Documentation](https://eslint.org/docs/latest/)
- [Vitest Documentation](https://vitest.dev/)
- [Prettier Documentation](https://prettier.io/docs/en/index.html)

---

## Summary

**Remember:**
- ✅ ESLint checks code quality
- ✅ TypeScript checks type safety
- ✅ Both are required and complementary
- ✅ Run both before committing: `npm run lint && npm run check`
- ✅ CI/CD will catch issues, but local checks are faster
- ✅ Fix type errors as soon as they appear

**Quick Commands:**
```bash
# Check everything:
npm run lint && npm run check && npm run test:run

# Auto-fix what can be fixed:
npm run lint:fix && npm run format

# Then check types again:
npm run check
```
