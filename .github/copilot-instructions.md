# CertLab - Copilot Instructions

## Repository Overview

**CertLab** is a client-side certification learning platform that runs entirely in the browser using IndexedDB for local data storage. Users can study for certifications like CISSP and CISM with adaptive quizzes, achievements, and progress tracking. **No backend server is required** - all data stays in the browser.

**Key Characteristics:**
- **Size**: Medium (~171 files, ~152 TypeScript/JavaScript files)
- **Type**: Single-page web application (SPA)
- **Languages**: TypeScript (primary), JavaScript
- **Framework**: React 18 with Vite
- **Runtime**: Node.js 20.x (development), Browser (production)
- **Package Manager**: npm (lockfile version 3)
- **Hosting**: GitHub Pages at `/certlab/` base path

## Technology Stack

- **Frontend**: React 18, TypeScript 5.6.3, Vite 5.4.19
- **Styling**: TailwindCSS 3.4.17, Radix UI components
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter (client-side routing)
- **Storage**: IndexedDB via custom `client-storage.ts`
- **Build Tool**: Vite with `@vitejs/plugin-react`

## Build & Validation Commands

### Prerequisites
- **Node.js**: v20.x (verified working with v20.19.5)
- **npm**: v10.x (verified working with v10.8.2)

### Installation
```bash
# ALWAYS use npm install (not npm ci) for development
# npm ci is used in CI/CD workflows only
npm install
```
**Time**: ~10-15 seconds  
**Known Issues**: May show 10 vulnerabilities (1 low, 8 moderate, 1 high) - these are in development dependencies and can be ignored for now.

### TypeScript Type Checking
```bash
npm run check
```
**Command**: Runs `tsc` (TypeScript compiler in check mode)  
**Time**: ~5-10 seconds  
**Known Behavior**: Currently shows 19 TypeScript errors across 8 files. These are pre-existing issues and **do not prevent the build from succeeding**. The build process ignores these type errors.  
**Files with Type Errors**:
- `client/src/components/Header.tsx` (2 errors)
- `client/src/components/StudyGroupCard.tsx` (6 errors)
- `client/src/pages/achievements.tsx` (1 error)
- `client/src/pages/challenges.tsx` (3 errors)
- `client/src/pages/study-groups.tsx` (2 errors)
- `server/routes.ts` (1 error)
- `server/test-checkout.ts` (1 error)
- `server/test-polar-redirect.ts` (3 errors)

**Action**: If you create new type errors in your changes, fix them. Ignore pre-existing errors unless specifically asked to fix them.

### Build for Production
```bash
npm run build
```
**Command**: Runs `vite build`  
**Time**: ~5-7 seconds  
**Output Directory**: `./dist/` (created at project root)  
**Success Indicators**:
- Creates `dist/index.html` (~2 KB)
- Creates `dist/assets/index-*.css` (~133 KB, gzipped: ~21 KB)
- Creates `dist/assets/index-*.js` (~635 KB, gzipped: ~179 KB)
- Shows warning about chunks >500KB (this is expected, can be ignored)

**Important**: The build **always succeeds** even if TypeScript check fails. Vite uses esbuild which is more lenient than `tsc`.

### Development Server
```bash
npm run dev
```
**Port**: 5000 (configured in `vite.config.ts`)  
**URL**: `http://localhost:5000`  
**Hot Module Replacement**: Enabled  
**Time to Start**: ~2-3 seconds

### Preview Production Build
```bash
npm run preview
```
**Requires**: Must run `npm run build` first  
**Purpose**: Serves the `dist/` folder to test production build locally

### Test Suite
```bash
npm run test:run
```
**Framework**: Vitest (configured in `vitest.config.ts`)  
**Test Files**: Located in `client/src/` and `shared/` directories (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`)  
**Time**: ~5-10 seconds  
**Current Coverage**: 6 test files, 67 tests  
**Setup File**: `client/src/test/setup.ts`  

**Test Commands**:
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Run tests with coverage report

**Action**: Run tests after making changes. Add tests for new functionality when appropriate.

## Project Structure

### Root Directory Files
```
.env.example          # Environment variable template (not used for client-only deployment)
.gitignore           # Excludes: node_modules, dist, .DS_Store, server/public, *.tar.gz
.github/             # Contains workflows/deploy.yml for GitHub Pages deployment
components.json      # Radix UI component configuration
drizzle.config.ts    # Database config (legacy from server version, not used in client-only)
package.json         # Dependencies and scripts
package-lock.json    # Locked dependencies (lockfile v3)
postcss.config.js    # PostCSS with Tailwind and Autoprefixer
tailwind.config.ts   # Tailwind configuration with custom theme
tsconfig.json        # TypeScript configuration
vite.config.ts       # Vite build configuration with path aliases
```

### Directory Structure
```
/client/                    # All client-side code
  /src/
    main.tsx               # Entry point: renders <App />
    App.tsx                # Main app component with routing
    index.css              # Global styles (Tailwind directives)
    /components/           # 37 React components (Header, Badge components, etc.)
    /pages/                # 17 page components (dashboard, quiz, results, etc.)
    /lib/                  # Core utilities
      client-storage.ts    # IndexedDB wrapper (mimics server storage API)
      indexeddb.ts         # Low-level IndexedDB service
      seed-data.ts         # Initial data seeding (categories, questions, badges)
      auth-provider.tsx    # Client-side authentication context
      queryClient.ts       # TanStack Query configuration
      theme-provider.tsx   # Theme management (7 themes available)
    /data/                 # Static data files
    /hooks/                # Custom React hooks
  /public/                 # Static assets
    .nojekyll              # Required for GitHub Pages routing
    404.html               # GitHub Pages fallback for client-side routing

/server/                   # Legacy server code (not used in client-only version)
  *.ts                     # Server routes and logic (ignore for client-only deployments)

/shared/                   # Shared types
  schema.ts                # TypeScript types for data models (User, Category, Quiz, etc.)

/scripts/                  # Utility scripts
  generate_questions.js    # Question generation utilities
  import_authentic_*.js    # Data import scripts
  sync_ui_structure.js     # UI structure synchronization

/tools/                    # Additional tooling

/.github/
  /workflows/
    deploy.yml             # GitHub Actions workflow for deployment
```

### Key Configuration Files

**vite.config.ts**:
- Root set to `./client`
- Base path: `/certlab/` in production, `/` in development
- Can override with `VITE_BASE_PATH` environment variable
- Path aliases: `@/` → `client/src/`, `@shared/` → `shared/`
- Build output: `./dist/` at project root

**tsconfig.json**:
- Strict mode enabled
- Module: ESNext with bundler resolution
- Includes: `client/src/`, `shared/`, `server/` (server included for completeness)
- Excludes: `node_modules`, `dist`, `build`, test files

**tailwind.config.ts**:
- Content: `./client/index.html`, `./client/src/**/*.{js,jsx,ts,tsx}`
- Dark mode: class-based
- Custom theme with CSS variables for colors
- Plugins: `tailwindcss-animate`, `@tailwindcss/typography`

## GitHub Actions Workflow

**File**: `.github/workflows/deploy.yml`  
**Trigger**: Push to `main` branch or manual dispatch  
**Jobs**:
1. **Build**:
   - Runs on: `ubuntu-latest`
   - Node.js: v20 (with npm cache)
   - Steps: `npm ci` → `npm run build` → upload `dist/` as artifact
   - Environment: `NODE_ENV=production`
2. **Deploy**:
   - Deploys artifact to GitHub Pages
   - URL: `https://archubbuck.github.io/certlab/`

**To Replicate Locally**:
```bash
# Clean install
npm ci

# Build with production environment
NODE_ENV=production npm run build

# Verify dist/ folder contents
ls -lh dist/
```

## Data Architecture

### IndexedDB Stores
The app uses these stores (defined in `client/src/lib/indexeddb.ts`):
- `users` - User accounts with hashed passwords (SHA-256)
- `categories` - Certification categories (CISSP, CISM, etc.)
- `subcategories` - Topic subcategories
- `questions` - Question bank with answers
- `quizzes` - Quiz attempts and results
- `userProgress` - Learning progress tracking
- `lectures` - Study materials
- `masteryScores` - Performance metrics
- `badges` - Achievement definitions
- `userBadges` - User's earned badges
- `userGameStats` - Gamification statistics
- `challenges` - Daily/quick challenges
- `challengeAttempts` - Challenge completion records
- `studyGroups` - Study group definitions
- `studyGroupMembers` - Group membership records
- `practiceTests` - Practice test definitions
- `practiceTestAttempts` - Practice test results
- `settings` - App settings (including currentUserId)

### Initial Data Seeding
**File**: `client/src/lib/seed-data.ts`  
**Version**: 1 (tracked in IndexedDB settings)  
**Seeds**:
- 2 certification categories (CISSP, CISM)
- 5 subcategories
- 6 sample questions
- 5 achievement badges
- Runs automatically on first app load for new users

## Known Issues & Workarounds

### TypeScript Errors (Pre-existing)
- **Issue**: 19 type errors exist across 8 files
- **Workaround**: These don't prevent build. Vite's esbuild is lenient
- **Action**: Fix new type errors you introduce, ignore pre-existing ones

### Build Warning: Large Chunks
- **Issue**: Build shows warning about chunks >500KB
- **Cause**: Main bundle includes all React, Radix UI, and application code
- **Workaround**: This is expected for a client-side SPA without code-splitting
- **Action**: Can be ignored. Consider code-splitting for future optimization

### npm Audit Vulnerabilities
- **Issue**: `npm install` shows 10 vulnerabilities
- **Cause**: Vulnerabilities in development dependencies
- **Workaround**: These don't affect production build (only dev dependencies)
- **Action**: Can be ignored unless specifically asked to address

### Server Code Present but Unused
- **Issue**: `/server/` directory exists with server-side code
- **Context**: CertLab was migrated from server-based to client-only architecture
- **Workaround**: Server code is not built or deployed (Vite only builds client/)
- **Action**: Ignore server code unless working on legacy features or migration

### Base Path Configuration
- **Issue**: App must work at `/certlab/` path (not root `/`)
- **Configuration**: `vite.config.ts` sets base to `/certlab/` in production
- **Workaround**: For forks or custom domains, set `VITE_BASE_PATH` environment variable
- **Example**: `VITE_BASE_PATH=/my-repo/ npm run build`

## Best Practices for Code Changes

### Before Making Changes
1. **Always run** `npm install` if you haven't yet
2. **Always run** `npm run build` to verify current state
3. Review `npm run check` output to understand pre-existing type errors

### Making Changes
1. **Focus on client-side code** in `/client/src/`
2. **Avoid modifying** `/server/` unless explicitly required
3. **Update shared types** in `/shared/schema.ts` if changing data models
4. **Test in browser** - this is a client-side app, browser testing is critical
5. **Preserve IndexedDB compatibility** - schema changes need migration strategy

### After Making Changes
1. **Run type check**: `npm run check` - fix new errors you introduced
2. **Run tests**: `npm run test:run` - ensure tests pass
3. **Run build**: `npm run build` - must succeed
4. **Test locally**: `npm run dev` - verify functionality at http://localhost:5000
5. **Test production**: `npm run build && npm run preview` - verify production build

### File Modifications
- **Components**: Located in `/client/src/components/` - 37 files
- **Pages**: Located in `/client/src/pages/` - 17 page files
- **Storage Logic**: `/client/src/lib/client-storage.ts` - handles all data operations
- **Styles**: Global styles in `/client/src/index.css`, component styles use Tailwind classes
- **Routing**: Defined in `/client/src/App.tsx` using Wouter

### Common Pitfalls
1. **Don't modify** `vite.config.ts` base path without understanding deployment impact
2. **Don't remove** `.nojekyll` from `/client/public/` (breaks GitHub Pages routing)
3. **Don't add** backend dependencies - this is a client-only app
4. **Don't break** IndexedDB schema without migration plan
5. **Don't commit** `dist/`, `node_modules/`, or `.env` files (already in .gitignore)

## Path Aliases
When importing, use these aliases:
- `@/` maps to `/client/src/`
- `@shared/` maps to `/shared/`

Example:
```typescript
import { Button } from '@/components/ui/button';
import type { User } from '@shared/schema';
```

## Environment Variables
**Client-side only** (no `.env` file needed for development):
- `VITE_BASE_PATH` - Override base path (default: `/certlab/` in production)
- `NODE_ENV` - Set to `production` for production builds

**Server-side** (in `.env.example`, not used for client-only deployment):
- Legacy variables for database, Polar payments, OpenAI - ignore these

## Quick Reference

**Install**: `npm install` (~10-15s)  
**Type Check**: `npm run check` (~5-10s, 19 pre-existing errors OK)  
**Tests**: `npm run test:run` (~5-10s)  
**Build**: `npm run build` (~5-7s, outputs to `dist/`)  
**Dev Server**: `npm run dev` (port 5000)  
**Preview Build**: `npm run preview` (after build)  

**Main Entry**: `/client/src/main.tsx`  
**App Root**: `/client/src/App.tsx`  
**Storage**: `/client/src/lib/client-storage.ts`  
**Types**: `/shared/schema.ts`  
**Config**: `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `vitest.config.ts`  

**Deploy**: Push to `main` → GitHub Actions → GitHub Pages

---

## Instructions for Coding Agents

**Trust these instructions**: This file has been carefully validated. Only search for additional information if you find these instructions incomplete or incorrect.

**Always run**: `npm install` before building (never `npm ci` in development).

**Type errors are OK**: 19 pre-existing TypeScript errors exist. Fix only new errors you introduce.

**Run tests**: Execute `npm run test:run` to verify tests pass. Add tests for new functionality when appropriate.

**Build must succeed**: `npm run build` must complete successfully. Test this early and often.

**Client-side focus**: All your changes should be in `/client/src/`. Ignore `/server/` unless explicitly required.

**Test in browser**: This is a browser app. After building, test functionality manually at http://localhost:5000 using `npm run dev`.

**IndexedDB is critical**: Don't break the storage layer without a migration strategy.

**Base path matters**: The app deploys to `/certlab/` on GitHub Pages. Don't change `vite.config.ts` base path without good reason.
