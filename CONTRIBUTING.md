# Contributing to CertLab

Thank you for your interest in contributing to CertLab! This guide will help you get started with development and understand our contribution process.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Dependency Management](#dependency-management)
- [Reporting Issues](#reporting-issues)

## Getting Started

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Git**: Latest version

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/archubbuck/certlab.git
cd certlab

# Install dependencies
npm install

# Start development server
npm run dev
```

The development server will start at `http://localhost:5000`

## Development Environment

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production bundle to `./dist` |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript type checking |
| `npm test` | Run test suite |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

### IDE Setup

For the best development experience, we recommend:

1. **VS Code** with extensions:
   - TypeScript and JavaScript Language Features (built-in)
   - Tailwind CSS IntelliSense
   - ES7+ React/Redux/React-Native snippets
   - Prettier - Code formatter

2. Configure your editor to:
   - Use 2 spaces for indentation
   - Format on save
   - Use TypeScript strict mode

## Project Structure

```
certlab/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components (routes)
│   │   ├── lib/               # Core utilities and services
│   │   │   ├── client-storage.ts    # IndexedDB storage layer
│   │   │   ├── indexeddb.ts         # Low-level IndexedDB service
│   │   │   ├── seed-data.ts         # Initial data seeding
│   │   │   ├── auth-provider.tsx    # Authentication context
│   │   │   ├── queryClient.ts       # TanStack Query setup
│   │   │   └── theme-provider.tsx   # Theme management
│   │   ├── hooks/             # Custom React hooks
│   │   ├── data/              # Static data files
│   │   ├── test/              # Test setup and utilities
│   │   │   └── setup.ts       # Vitest test setup
│   │   ├── App.tsx            # Main application component
│   │   ├── main.tsx           # Entry point
│   │   └── index.css          # Global styles
│   └── public/                # Static assets
├── shared/                    # Shared TypeScript types
│   ├── schema.ts              # Data model definitions
│   └── storage-interface.ts   # Storage API interface
├── scripts/                   # Utility scripts
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Actions deployment
├── vite.config.ts             # Vite build configuration
├── vitest.config.ts           # Vitest test configuration
├── tailwind.config.ts         # Tailwind CSS configuration
└── tsconfig.json              # TypeScript configuration
```

### Key Directories

- **`client/src/components/`**: Reusable UI components organized by feature
- **`client/src/pages/`**: Page-level components mapped to routes
- **`client/src/lib/`**: Core services including storage, authentication, and queries
- **`client/src/test/`**: Test setup and utilities for Vitest
- **`shared/`**: TypeScript types and interfaces shared across the application

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-quiz-type`
- `fix/quiz-score-calculation`
- `docs/update-readme`
- `refactor/improve-storage-layer`

### Development Workflow

1. **Create a new branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our code style guidelines

3. **Run type checking**:
   ```bash
   npm run check
   ```
   Note: There are some pre-existing TypeScript errors. Only fix new errors you introduce.

4. **Build to verify**:
   ```bash
   npm run build
   ```
   The build must succeed before submitting.

5. **Test your changes** manually:
   - Run `npm run dev`
   - Test the feature in your browser at http://localhost:5000
   - Verify IndexedDB data persists correctly

6. **Commit your changes** with clear messages

## Code Style Guidelines

### TypeScript

- Use TypeScript for all new code
- Define interfaces and types in `shared/schema.ts` for data models
- Avoid `any` type - use proper typing
- Use path aliases: `@/` for `client/src/`, `@shared/` for `shared/`

```typescript
// Good
import { Button } from '@/components/ui/button';
import type { User } from '@shared/schema';

// Avoid
import { Button } from '../../../components/ui/button';
```

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Use meaningful prop names and TypeScript interfaces

```typescript
// Good
interface QuizCardProps {
  quiz: Quiz;
  onStart: (quizId: number) => void;
}

export function QuizCard({ quiz, onStart }: QuizCardProps) {
  // ...
}
```

### State Management

Choose the right state management approach for your use case. See [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) for detailed guidance.

| Use Case | Approach |
|----------|----------|
| Simple local state (toggles, inputs) | `useState` |
| Complex local state with related updates | `useReducer` |
| Async data from IndexedDB | TanStack Query (`useQuery`) |
| Global state (auth, theme) | React Context |

```typescript
// Async data - use TanStack Query with queryKeys
import { queryKeys } from '@/lib/queryClient';
const { data: quiz } = useQuery({ queryKey: queryKeys.quiz.detail(quizId) });

// Complex local state - use useReducer
const [state, dispatch] = useReducer(quizReducer, initialState);

// Simple local state - use useState
const [isOpen, setIsOpen] = useState(false);

// Global state - use context hooks
const { user } = useAuth();
```

### CSS and Styling

- Use Tailwind CSS utility classes
- Follow the existing color scheme and design patterns
- Support dark mode - use theme-aware colors

```tsx
// Good - uses theme-aware colors
<div className="bg-background text-foreground">

// Avoid - hardcoded colors
<div className="bg-white text-black">
```

### IndexedDB and Storage

- All data operations go through `client-storage.ts`
- Handle errors gracefully
- Consider tenant isolation for multi-tenant features

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

### Manual Testing

Since this is a client-side application, manual testing is critical:

1. Test in multiple browsers (Chrome, Firefox, Safari)
2. Test data persistence by refreshing the page
3. Test offline functionality
4. Verify theme switching works correctly
5. Check mobile responsiveness

### What to Test

- User flows (registration, quiz creation, answering questions)
- Data persistence in IndexedDB
- Error handling and edge cases
- Theme and accessibility features

## Submitting Changes

### Pull Request Process

1. **Update documentation** if you've changed functionality
2. **Ensure the build succeeds**: `npm run build`
3. **Write a clear PR description** explaining:
   - What changes were made
   - Why they were necessary
   - How to test the changes

### PR Title Format

Use conventional commit format:
- `feat: add new quiz difficulty filter`
- `fix: correct score calculation on quiz completion`
- `docs: update installation instructions`
- `refactor: simplify storage layer API`
- `chore: update dependencies`

### Review Process

- PRs require review before merging
- Address review comments promptly
- Keep PRs focused and small when possible

## Dependency Management

### Dependabot Integration

CertLab uses Dependabot for automated dependency updates with the following features:

#### Dependency Grouping

Dependencies are grouped by ecosystem to reduce the number of PRs:

- **radix**: All `@radix-ui/*` packages
- **testing**: Testing libraries (`@testing-library/*`, `vitest`, `jsdom`)
- **typescript**: TypeScript and type definition packages
- **build-tools**: Vite, esbuild, and build-related tools
- **react**: React ecosystem packages
- **linting**: ESLint, Prettier, and linting tools
- **styling**: Tailwind CSS and PostCSS packages
- **firebase**: Firebase SDK packages

#### Automated Merge Policy

Dependabot PRs are automatically merged when:

1. **Patch updates** (e.g., `1.0.0` → `1.0.1`): All dependencies
2. **Minor updates** (e.g., `1.0.0` → `1.1.0`): Development dependencies only
3. **All CI checks pass**: Linting, type checking, and build must succeed

**Manual review required for:**
- Major version updates (e.g., `1.0.0` → `2.0.0`)
- Minor updates to production dependencies

#### How It Works

1. Dependabot creates PRs weekly on Mondays
2. The auto-merge workflow evaluates the update type
3. Safe updates are automatically approved and merged after CI passes
4. Major updates receive a comment alerting that manual review is needed

### Updating Dependencies Manually

If you need to update dependencies manually:

```bash
# Check for outdated packages
npm outdated

# Update a specific package
npm update <package-name>

# Update all packages (use with caution)
npm update
```

## Reporting Issues

### Before Reporting

1. Check existing issues to avoid duplicates
2. Try to reproduce the issue
3. Note your browser and version

### Issue Template

Please include:

```markdown
**Description**
A clear description of the issue

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What you expected to happen

**Actual Behavior**
What actually happened

**Browser/Environment**
- Browser: Chrome 120
- OS: macOS 14

**Screenshots**
If applicable, add screenshots
```

## Questions?

If you have questions about contributing:
1. Check the existing documentation
2. Open a discussion in the repository
3. Create an issue for complex questions

Thank you for contributing to CertLab! 🎉
