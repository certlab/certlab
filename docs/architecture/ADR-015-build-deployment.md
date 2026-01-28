# ADR-015: Build & Deployment Pipeline

**Status:** ✅ Accepted  
**Date:** 2024-12-22  
**Deciders:** CertLab Team  
**Context:** Define the build process with Vite, manual code splitting strategy, Firebase Hosting deployment, and GitHub Actions CI/CD pipeline.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)
- [Code References](#code-references)
- [Revision History](#revision-history)

---

## Executive Summary

CertLab uses **Vite 7.3.1** for builds with **manual code splitting** (vendor-react, vendor-ui, vendor-charts chunks), **Firebase Hosting** for deployment, and **GitHub Actions** for automated CI/CD.

### Quick Reference

| Aspect | Technology | Purpose |
|--------|-----------|---------|
| **Build Tool** | Vite 7.3.1 | Fast builds with esbuild |
| **Code Splitting** | Manual chunks | Optimize caching |
| **Hosting** | Firebase Hosting | Static site hosting + CDN |
| **CI/CD** | GitHub Actions | Automated testing + deployment |
| **Node Version** | 20.x | LTS version |
| **Package Manager** | npm 10.x | Dependency management |
| **Build Time** | ~5-7s | Production builds |
| **Bundle Size** | ~635 KB JS (gzipped: ~179 KB) | Optimized chunks |

**Build Outputs:**
- `dist/index.html` (~2 KB)
- `dist/assets/index-*.css` (~133 KB, gzipped: ~21 KB)
- `dist/assets/index-*.js` (~635 KB, gzipped: ~179 KB)
- Vendor chunks: vendor-react, vendor-ui, vendor-charts

---

## Context and Problem Statement

CertLab needed a build and deployment strategy that would:

1. **Fast development builds** with HMR <100ms
2. **Optimized production builds** <10s
3. **Code splitting** for better caching
4. **Automated CI/CD** with testing
5. **Zero-downtime deployments** to Firebase
6. **Environment variable management** for secrets
7. **Build validation** (type check, tests)
8. **Rollback capability** if issues occur

### Requirements

**Functional Requirements:**
- ✅ Vite build with esbuild
- ✅ Manual code splitting (vendor chunks)
- ✅ Firebase Hosting deployment
- ✅ GitHub Actions CI/CD
- ✅ Environment variables from secrets
- ✅ TypeScript type checking
- ✅ Unit + E2E tests
- ✅ Build artifacts uploaded

**Non-Functional Requirements:**
- ✅ Build time <10s
- ✅ HMR <100ms
- ✅ Deploy time <2m
- ✅ 99.9% uptime
- ✅ CDN edge caching
- ✅ HTTPS by default

---

## Decision

We adopted **Vite + Firebase Hosting + GitHub Actions**:

### Build & Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│               CI/CD Pipeline (GitHub Actions)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Trigger: Push to main branch                           │
│       ▼                                                     │
│  2. Job: Unit Tests (Vitest)                               │
│       • npm ci                                              │
│       • npm run test:run                                    │
│       • Timeout: 5 minutes                                  │
│       ▼                                                     │
│  3. Job: E2E Tests (Playwright)                            │
│       • npm ci                                              │
│       • npx playwright install chromium                     │
│       • npm run build                                       │
│       • npm run preview                                     │
│       • npm run test:e2e                                    │
│       • Upload artifacts (reports)                          │
│       ▼                                                     │
│  4. Job: Build & Deploy                                     │
│       • npm ci                                              │
│       • npm run check (TypeScript)                          │
│       • npm run build:firebase                              │
│       • Deploy Firestore rules + indexes                    │
│       • Deploy to Firebase Hosting (live channel)          │
│       • Rollback on failure                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Vite Configuration

**File:** `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { getBasePath } from './shared/env';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@assets': path.resolve(__dirname, 'attached_assets'),
    },
  },

  root: path.resolve(__dirname, 'client'),
  envDir: path.resolve(__dirname),
  base: getBasePath(), // '/' for Firebase Hosting
  publicDir: path.resolve(__dirname, 'client', 'public'),

  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    
    rollupOptions: {
      output: {
        // Manual code splitting for better caching
        manualChunks: {
          // React core (~40 KB gzipped)
          'vendor-react': ['react', 'react-dom'],
          
          // Radix UI components (~80 KB gzipped)
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            // ... all other Radix components
          ],
          
          // Charting library (~20 KB gzipped)
          'vendor-charts': ['recharts'],
          
          // Utilities (~15 KB gzipped)
          'vendor-utils': [
            'date-fns',
            'clsx',
            'tailwind-merge',
            'react-router-dom'
          ],
        },
      },
    },
  },

  server: {
    port: 5000,
    fs: {
      strict: true,
      deny: ['**/.*'], // Deny hidden files
    },
  },
});
```

### 2. Package Scripts

**File:** `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:strict": "tsc && vite build",
    "build:firebase": "cross-env VITE_BASE_PATH=/ vite build",
    "preview": "vite preview",
    "check": "tsc",
    "test:run": "vitest run",
    "test:e2e": "playwright test",
    "deploy:firebase": "npm run build:firebase && firebase deploy --only hosting",
    "deploy:all": "npm run build:firebase && firebase deploy"
  }
}
```

### 3. Firebase Hosting Configuration

**File:** `firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|woff2|woff|ttf|eot|svg|png|jpg|jpeg|webp|gif|ico)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### 4. GitHub Actions Workflow

**File:** `.github/workflows/firebase-deploy.yml`

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test:run
        timeout-minutes: 10

  e2e-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: test
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          # ... other Firebase secrets

      - name: Start preview server
        run: |
          npm run preview &
          npx wait-on http://localhost:4173 --timeout 60000

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:4173
          CI: true

      - name: Upload test report
        uses: actions/upload-artifact@v6
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

  build-and-deploy:
    needs: [test, e2e-tests]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Type Check
        run: npm run check

      - name: Build
        run: npm run build:firebase
        env:
          NODE_ENV: production
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ secrets.VITE_FIREBASE_PROJECT_ID }}
          # ... other env vars

      - name: Deploy Firestore Rules
        run: |
          CREDS_FILE=$(mktemp)
          printf '%s' "$FIREBASE_SERVICE_ACCOUNT" > "$CREDS_FILE"
          export GOOGLE_APPLICATION_CREDENTIALS="$CREDS_FILE"
          npx firebase deploy --only firestore:rules,firestore:indexes \
            --project "$FIREBASE_PROJECT_ID" --non-interactive
          shred -u "$CREDS_FILE"
        env:
          FIREBASE_SERVICE_ACCOUNT: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0.10.0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
          channelId: live
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
```

### 5. Build Verification

**Build Output Example:**
```
vite v7.3.1 building for production...
✓ 247 modules transformed.
dist/index.html                       2.13 kB │ gzip:  0.87 kB
dist/assets/index-BwP8kl9f.css      133.47 kB │ gzip: 20.82 kB
dist/assets/vendor-react-C5PZho7_.js 155.23 kB │ gzip: 49.84 kB
dist/assets/vendor-ui-DfXjhR2k.js   289.67 kB │ gzip: 81.92 kB
dist/assets/vendor-charts-EpQw8K.js  87.45 kB │ gzip: 24.15 kB
dist/assets/vendor-utils-FqR3nL.js   45.12 kB │ gzip: 13.67 kB
dist/assets/index-GhT9mN5p.js       102.89 kB │ gzip: 31.24 kB
✓ built in 5.42s
```

### 6. Environment Variables

**Required Secrets (GitHub):**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `FIREBASE_SERVICE_ACCOUNT` (JSON)
- `FIREBASE_PROJECT_ID`
- `VITE_DYNATRACE_SCRIPT_URL` (optional)
- `VITE_ENABLE_DYNATRACE` (optional)

### 7. Deployment Verification

**Post-Deploy Checks:**
1. Visit live URL: https://certlab.web.app
2. Verify Firebase Hosting console
3. Check Dynatrace RUM for traffic
4. Monitor error rates
5. Test critical user journeys
6. Verify CDN cache hit rate

---

## Consequences

### Positive

1. **Fast Builds** - Vite builds in 5-7 seconds
2. **Optimized Bundles** - Manual chunks improve caching
3. **Automated CI/CD** - GitHub Actions handles testing + deploy
4. **Zero Downtime** - Firebase Hosting atomic deploys
5. **CDN Caching** - Global edge network
6. **Rollback Support** - Firebase Hosting history
7. **Environment Isolation** - Secrets in GitHub

### Negative

1. **Build Warnings** - Large chunks >500 KB (expected)
2. **Manual Chunk Maintenance** - Must update chunk config
3. **Firebase Dependency** - Vendor lock-in

### Mitigations

1. Ignore chunk size warnings (expected for SPA)
2. Review chunks quarterly for optimization
3. Keep build config documented

---

## Alternatives Considered

### Alternative 1: Webpack Instead of Vite

Use Webpack for builds.

**Pros:** Mature, widely used  
**Cons:** Slower builds, complex config

**Reason for Rejection:** Vite is 10x faster with simpler config.

### Alternative 2: Vercel Instead of Firebase

Deploy to Vercel.

**Pros:** Great DX, automatic previews  
**Cons:** No Firestore integration, more expensive

**Reason for Rejection:** Firebase provides hosting + Firestore in one platform.

### Alternative 3: Manual Deployment

Deploy manually with firebase CLI.

**Pros:** Simple, no CI setup  
**Cons:** No testing, error-prone, no automation

**Reason for Rejection:** GitHub Actions provides automated testing + deployment.

---

## Related Documents

- [ADR-002: Cloud-First Architecture](ADR-002-cloud-first-firebase-integration.md)
- [ADR-005: Frontend Technology Stack](ADR-005-frontend-technology-stack.md)
- [ADR-013: Testing Strategy](ADR-013-testing-strategy.md)

---

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `vite.config.ts` | 1-78 | Vite build configuration |
| `package.json` | 28-61 | Build scripts |
| `firebase.json` | 1-40 | Firebase Hosting config |
| `.github/workflows/firebase-deploy.yml` | 1-234 | CI/CD pipeline |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-12-22 | 1.0 | CertLab Team | Initial version - build & deployment |
