# Fix: Dynatrace Environment Variable Detection

## Issue
The value of `VITE_DYNATRACE_SCRIPT_URL` was correctly set in the `.env` file, but the UI was not detecting it during build. Vite was showing a warning:
```
(!) %VITE_DYNATRACE_SCRIPT_URL% is not defined in env variables found in /index.html. Is the variable mistyped?
```

## Root Cause
The `vite.config.ts` sets `root: path.resolve(import.meta.dirname, 'client')`, which changes Vite's working directory to the `client/` subdirectory. By default, Vite loads `.env` files from its root directory (the directory specified in the `root` config option).

Since the `.env` file is located at the project root (`/home/runner/work/certlab/certlab/.env`) but Vite's root is configured as `client/` (`/home/runner/work/certlab/certlab/client`), Vite was looking for `.env` in the wrong location (`/home/runner/work/certlab/certlab/client/.env`).

## Solution
Added the `envDir` configuration option to `vite.config.ts` to explicitly tell Vite to load environment files from the project root:

```typescript
export default defineConfig({
  // ... other config
  root: path.resolve(import.meta.dirname, 'client'),
  // Load .env files from the project root, not from the 'client' directory
  envDir: path.resolve(import.meta.dirname),
  // ... other config
});
```

## Files Modified
1. **vite.config.ts**: Added `envDir` option to load `.env` files from project root
2. **client/index.html**: Added `ENABLED_PLACEHOLDER` constant for code clarity (cosmetic improvement)

## Verification
The fix was verified with the following tests:

### Test 1: Build without .env file
- **Expected**: Variables remain as placeholders in built HTML
- **Result**: ✅ PASS

### Test 2: Build with VITE_DYNATRACE_SCRIPT_URL in .env
- **Expected**: Variable is correctly replaced in built HTML
- **Result**: ✅ PASS
- **Expected**: No warning for VITE_DYNATRACE_SCRIPT_URL
- **Result**: ✅ PASS

### Test 3: Dev server with .env file
- **Expected**: Variable is correctly replaced in served HTML
- **Result**: ✅ PASS

## Usage
To use Dynatrace monitoring, create a `.env` file at the project root with:

```bash
VITE_DYNATRACE_SCRIPT_URL=https://js-cdn.dynatrace.com/jstag/YOUR_ENV/YOUR_APP/YOUR_SCRIPT.js
```

The variable will be automatically replaced during build and dev modes.

## References
- Vite documentation on environment variables: https://vitejs.dev/guide/env-and-mode.html
- Vite `envDir` option: https://vitejs.dev/config/shared-options.html#envdir
