# Authentication & Authorization Implementation Checklist

This checklist provides step-by-step guidance for implementing authentication and authorization features in CertLab.

## Table of Contents

- [Quick Start](#quick-start)
- [Adding Protected Pages](#adding-protected-pages)
- [Implementing Login/Signup](#implementing-loginsignup)
- [Working with User Data](#working-with-user-data)
- [Authorization Checks](#authorization-checks)
- [Testing](#testing)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

Before implementing authentication features:

- [ ] Review [ADR-001](./architecture/ADR-001-authentication-authorization.md) for full context
- [ ] Understand [state-management.md](./architecture/state-management.md) patterns
- [ ] Have Node.js 20.x and npm installed
- [ ] Project dependencies installed (`npm install`)

### Core Files to Know

| File | Purpose |
|------|---------|
| `client/src/lib/auth-provider.tsx` | Global auth state (React Context) |
| `client/src/lib/client-auth.ts` | Authentication logic |
| `client/src/components/ProtectedRoute.tsx` | Route protection HOC |
| `client/src/lib/storage-factory.ts` | Data storage abstraction |
| `client/src/App.tsx` | Route definitions |

---

## Adding Protected Pages

### Step 1: Create the Page Component

```typescript
// client/src/pages/my-feature.tsx
import { useAuth } from '@/lib/auth-provider';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function MyFeaturePage() {
  const { user, isAuthenticated } = useAuth();
  
  // User is guaranteed to be authenticated here (due to ProtectedRoute)
  return (
    <div className="container mx-auto p-6">
      <h1>Welcome, {user.firstName}!</h1>
      {/* Your page content */}
    </div>
  );
}
```

**Checklist:**
- [ ] Import `useAuth` hook from `@/lib/auth-provider`
- [ ] Access `user` and `isAuthenticated` from the hook
- [ ] Design page assuming user is authenticated
- [ ] Add proper TypeScript types

### Step 2: Add Lazy Import to App.tsx

```typescript
// In client/src/App.tsx, add near other lazy imports (line ~21-40)
const MyFeaturePage = lazy(() => import('@/pages/my-feature'));
```

**Checklist:**
- [ ] Add import near other page imports
- [ ] Use `lazy()` for code splitting
- [ ] Import from `@/pages/` path alias

### Step 3: Add Route Definition

```typescript
// In client/src/App.tsx, inside the <ProtectedRoute> block (line ~82-104)
<Route path="/app/my-feature" element={<MyFeaturePage />} />
```

**Checklist:**
- [ ] Add route inside `<ProtectedRoute>` wrapper
- [ ] Use `/app/` prefix for authenticated routes
- [ ] Wrap in `<Suspense>` if not already (should be auto-wrapped in Routes)
- [ ] Test navigation to `/app/my-feature`

### Step 4: Add Navigation Link (Optional)

```typescript
// In relevant component (e.g., Header.tsx or sidebar)
import { Link } from 'react-router-dom';

<Link to="/app/my-feature">My Feature</Link>
```

**Checklist:**
- [ ] Use React Router's `<Link>` component
- [ ] Use absolute path (`/app/my-feature`)
- [ ] Add proper styling/icons

---

## Implementing Login/Signup

### Login Component

```typescript
// client/src/pages/login.tsx (or create new)
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await clientAuth.login(email, password);
      
      if (result.success) {
        // Refresh auth context
        await refreshUser();
        
        // Redirect to original destination or dashboard
        const from = location.state?.from || '/app';
        navigate(from, { replace: true });
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Log In</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email">Email</label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label htmlFor="password">Password</label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={8}
          />
        </div>
        
        {error && (
          <div className="text-red-600 text-sm">{error}</div>
        )}
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Logging in...' : 'Log In'}
        </Button>
      </form>
    </div>
  );
}
```

**Checklist:**
- [ ] Import `clientAuth` from `@/lib/client-auth`
- [ ] Import `useAuth` from `@/lib/auth-provider`
- [ ] Import navigation hooks from `react-router-dom`
- [ ] Handle form submission with `clientAuth.login()`
- [ ] Call `refreshUser()` after successful login
- [ ] Navigate to intended destination or `/app`
- [ ] Use `replace: true` to avoid back button issues
- [ ] Show loading state during login
- [ ] Display error messages
- [ ] Disable inputs while loading
- [ ] Validate email format
- [ ] Require minimum password length (8 chars)

### Registration Component

```typescript
// Similar to login but use clientAuth.register()
const result = await clientAuth.register(
  email,
  password,
  firstName,  // optional
  lastName    // optional
);
```

**Checklist:**
- [ ] Import same dependencies as login
- [ ] Use `clientAuth.register()` instead of `login()`
- [ ] Collect email, password, firstName (optional), lastName (optional)
- [ ] Validate password requirements (min 8 characters)
- [ ] Validate email format
- [ ] Call `refreshUser()` after successful registration
- [ ] Navigate to `/app` after registration
- [ ] Handle and display errors
- [ ] Show loading state

### Google Sign-In Component

```typescript
import { Button } from '@/components/ui/button';
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';
import { useNavigate } from 'react-router-dom';

export function GoogleSignInButton() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await clientAuth.signInWithGoogle();
      
      if (result.success) {
        await refreshUser();
        navigate('/app', { replace: true });
      } else {
        setError(result.message || 'Google sign-in failed');
      }
    } catch (err) {
      setError('Failed to sign in with Google');
      console.error('Google sign-in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Only show if Firebase is configured
  if (!clientAuth.isGoogleAuthAvailable()) {
    return null;
  }

  return (
    <div>
      <Button onClick={handleGoogleSignIn} disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
      </Button>
      {error && <div className="text-red-600 text-sm">{error}</div>}
    </div>
  );
}
```

**Checklist:**
- [ ] Check if Firebase configured with `clientAuth.isGoogleAuthAvailable()`
- [ ] Use `clientAuth.signInWithGoogle()` for authentication
- [ ] Call `refreshUser()` after successful sign-in
- [ ] Handle popup blockers gracefully
- [ ] Display error messages
- [ ] Show loading state
- [ ] Hide button if Firebase not configured

---

## Working with User Data

### Accessing Current User

```typescript
import { useAuth } from '@/lib/auth-provider';

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Always check loading state first
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Then check authentication
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  // Now user is guaranteed to be non-null
  return <div>Hello, {user.firstName}!</div>;
}
```

**Checklist:**
- [ ] Import `useAuth` hook
- [ ] Destructure needed values (`user`, `isAuthenticated`, `isLoading`)
- [ ] Check `isLoading` first
- [ ] Check `isAuthenticated` second
- [ ] TypeScript will narrow `user` type after checks

### Fetching User-Scoped Data

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useAuth } from '@/lib/auth-provider';

function Dashboard() {
  const { user } = useAuth();
  
  const { data: stats, isLoading, error } = useQuery({
    queryKey: queryKeys.user.stats(user.id),
    queryFn: async () => {
      return await storage.getUserStats(user.id);
    },
    enabled: !!user, // Only run when user is available
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>Total Points: {stats.totalPoints}</div>;
}
```

**Checklist:**
- [ ] Import `useQuery` from `@tanstack/react-query`
- [ ] Import `queryKeys` from `@/lib/queryClient`
- [ ] Import `storage` from `@/lib/storage-factory`
- [ ] Use appropriate query key from `queryKeys` factory
- [ ] Use `enabled: !!user` to prevent running before user loads
- [ ] Handle loading and error states
- [ ] Include `tenantId` in queries if data is tenant-scoped

### Updating User Data

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';

function ProfileEditor() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      const result = await clientAuth.updateProfile(updates);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result.user;
    },
    onSuccess: async () => {
      // Refresh auth context
      await refreshUser();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['user', user.id] 
      });
    },
  });
  
  const handleSave = () => {
    updateProfileMutation.mutate({
      firstName: 'New Name',
      // ... other fields
    });
  };
  
  return (
    <button 
      onClick={handleSave}
      disabled={updateProfileMutation.isPending}
    >
      {updateProfileMutation.isPending ? 'Saving...' : 'Save'}
    </button>
  );
}
```

**Checklist:**
- [ ] Import `useMutation` and `useQueryClient`
- [ ] Use `clientAuth.updateProfile()` for updates
- [ ] Call `refreshUser()` in `onSuccess` to update context
- [ ] Invalidate related queries with `queryClient.invalidateQueries()`
- [ ] Handle loading state (`isPending`)
- [ ] Handle errors appropriately
- [ ] Show success feedback to user

---

## Authorization Checks

### Role-Based Authorization

```typescript
import { useAuth } from '@/lib/auth-provider';

function AdminButton() {
  const { user } = useAuth();
  
  // Only show button for admins
  if (user?.role !== 'admin') {
    return null;
  }
  
  return <Button>Admin Action</Button>;
}

// In routes (App.tsx)
const isAdmin = user?.role === 'admin';
{isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
```

**Checklist:**
- [ ] Check `user?.role === 'admin'` for admin features
- [ ] Return `null` for non-authorized users
- [ ] Conditionally render routes based on role
- [ ] Don't rely solely on client-side checks for sensitive actions

### Tenant-Based Authorization

```typescript
import { useAuth } from '@/lib/auth-provider';

function TenantFeature() {
  const { user } = useAuth();
  const REQUIRED_TENANT = 1; // Example: CISSP tenant
  
  if (user?.tenantId !== REQUIRED_TENANT) {
    return <div>This feature is not available in your current environment</div>;
  }
  
  return <div>Tenant-specific content</div>;
}
```

**Checklist:**
- [ ] Check `user?.tenantId` against required tenant
- [ ] Always scope data queries by `tenantId`
- [ ] Show appropriate messages for unauthorized tenants
- [ ] Consider using constants for tenant IDs

### Tenant Switching

```typescript
import { useAuth } from '@/lib/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { storage } from '@/lib/storage-factory';

function TenantSwitcher() {
  const { user, switchTenant } = useAuth();
  const [error, setError] = useState('');
  
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => storage.getAllTenants(),
  });
  
  const handleSwitch = async (tenantId: number) => {
    try {
      setError('');
      await switchTenant(tenantId);
      // Queries automatically invalidated by auth provider
    } catch (err) {
      setError('Failed to switch environment');
      console.error('Tenant switch error:', err);
    }
  };
  
  return (
    <select 
      value={user?.tenantId} 
      onChange={(e) => handleSwitch(Number(e.target.value))}
    >
      {tenants
        .filter(t => t.isActive)
        .map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
    </select>
  );
}
```

**Checklist:**
- [ ] Import `switchTenant` from `useAuth()`
- [ ] Fetch all tenants with TanStack Query
- [ ] Filter for active tenants only
- [ ] Handle errors during switch
- [ ] Note: Query invalidation happens automatically in auth provider

---

## Testing

### Testing Components with Authentication

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/lib/auth-provider';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  const renderWithAuth = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {component}
        </AuthProvider>
      </QueryClientProvider>
    );
  };
  
  it('should display user information', async () => {
    renderWithAuth(<MyComponent />);
    
    // Wait for auth to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
    
    // Test authenticated state
    // Note: In tests, you may need to mock user state
  });
});
```

**Checklist:**
- [ ] Wrap components in `AuthProvider` and `QueryClientProvider`
- [ ] Wait for loading to complete with `waitFor`
- [ ] Mock IndexedDB with `fake-indexeddb` if needed
- [ ] Test both authenticated and unauthenticated states
- [ ] Test loading states

### Testing Protected Routes

```typescript
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '@/lib/auth-provider';

describe('ProtectedRoute', () => {
  it('should redirect when not authenticated', () => {
    const { container } = render(
      <MemoryRouter>
        <AuthProvider>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );
    
    // Should not see protected content
    expect(container.textContent).not.toContain('Protected Content');
  });
});
```

**Checklist:**
- [ ] Use `MemoryRouter` for testing navigation
- [ ] Test redirect behavior when unauthenticated
- [ ] Test rendering when authenticated (with mocked state)
- [ ] Test loading state display

---

## Common Patterns

### Logout Flow

```typescript
import { useAuth } from '@/lib/auth-provider';
import { useNavigate } from 'react-router-dom';

function LogoutButton() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      // Still navigate even if logout had errors
      navigate('/', { replace: true });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Logging out...' : 'Log Out'}
    </button>
  );
}
```

**Checklist:**
- [ ] Import `logout` from `useAuth()`
- [ ] Call `logout()` which handles Firebase, storage, and session cleanup
- [ ] Navigate to landing page after logout
- [ ] Use `replace: true` to prevent back button issues
- [ ] Handle errors gracefully
- [ ] Show loading state
- [ ] **Important:** Component handles navigation, not auth provider

### Password Change

```typescript
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { refreshUser } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    const result = await clientAuth.changePassword(
      currentPassword,
      newPassword
    );
    
    if (result.success) {
      setSuccess(true);
      await refreshUser();
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setError(result.message || 'Password change failed');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="password"
        placeholder="Current Password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="New Password (min 8 chars)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={8}
      />
      {error && <div className="error">{error}</div>}
      {success && <div className="success">Password changed!</div>}
      <button type="submit">Change Password</button>
    </form>
  );
}
```

**Checklist:**
- [ ] Use `clientAuth.changePassword()`
- [ ] Require current password for verification
- [ ] Validate new password (min 8 characters)
- [ ] Call `refreshUser()` after change
- [ ] Clear form on success
- [ ] Show success and error messages

### Conditional Navigation

```typescript
import { useAuth } from '@/lib/auth-provider';
import { Navigate } from 'react-router-dom';

function ConditionalPage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // Redirect non-admins
  if (user?.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }
  
  return <div>Admin Content</div>;
}
```

**Checklist:**
- [ ] Check `isLoading` first
- [ ] Use `<Navigate>` for redirects in render
- [ ] Use `replace` prop to avoid back button issues
- [ ] Provide alternative paths for unauthorized users

---

## Troubleshooting

### Issue: User redirected to landing on page refresh

**Cause:** Auth context not loading fast enough

**Solution:**
```typescript
// Check auth-provider.tsx initialization
// User should be loaded synchronously from IndexedDB BEFORE Firebase init
// This is already implemented in the codebase
```

**Checklist:**
- [ ] Verify `isLoading` is set to `false` after user loads
- [ ] Verify user loaded from IndexedDB before Firebase
- [ ] Check browser console for errors

### Issue: Queries running before user available

**Cause:** Query runs before user loads

**Solution:**
```typescript
const { data } = useQuery({
  queryKey: ['data', user?.id],
  queryFn: () => fetchData(user!.id),
  enabled: !!user, // Add this line
});
```

**Checklist:**
- [ ] Add `enabled: !!user` to query options
- [ ] Verify query key includes user ID
- [ ] Check that `user` is not null when accessing

### Issue: Role-based features showing for wrong users

**Cause:** Client-side check bypassed or cached

**Solution:**
```typescript
// Always check role at render time
if (user?.role !== 'admin') return null;

// Don't cache role in local state
const isAdmin = user?.role === 'admin'; // ✅ Good
const [isAdmin] = useState(user?.role === 'admin'); // ❌ Bad (stale)
```

**Checklist:**
- [ ] Check role directly from `user` object
- [ ] Don't cache role in local state
- [ ] Verify route protection in place

### Issue: Session not persisting across refreshes

**Cause:** Session storage not working

**Solution:**
1. Check IndexedDB in browser DevTools
2. Verify `currentUserId` in settings store
3. Check console for storage errors

**Checklist:**
- [ ] Open DevTools → Application → IndexedDB → CertLabDB
- [ ] Check settings store for `currentUserId`
- [ ] Verify user exists in users store
- [ ] Check console for errors

### Issue: Firebase Google Sign-In not working

**Cause:** Firebase not configured or domain not authorized

**Solution:**
1. Verify environment variables set
2. Check authorized domains in Firebase Console
3. Verify API key valid

**Checklist:**
- [ ] Check `.env` file has Firebase variables
- [ ] Verify `VITE_FIREBASE_*` variables set correctly
- [ ] Check Firebase Console → Authentication → Sign-in method → Google → Authorized domains
- [ ] Test with console logs to see exact error
- [ ] Check browser console for Firebase errors

---

## Best Practices Summary

### ✅ DO

- Use `useAuth()` hook for accessing authentication state
- Check `isLoading` before checking `isAuthenticated`
- Use TanStack Query for all data fetching
- Invalidate queries after mutations
- Use `enabled` option in queries to wait for user
- Handle logout navigation in components
- Use `replace: true` for post-login navigation
- Log security events for audit trails
- Validate permissions at both route and component level

### ❌ DON'T

- Don't store passwords in any state or localStorage
- Don't bypass ProtectedRoute for authenticated pages
- Don't duplicate user state between context and local state
- Don't fetch data directly from IndexedDB without TanStack Query
- Don't navigate in auth provider (components handle navigation)
- Don't cache role/tenant in local state (always get from `user` object)
- Don't hardcode tenant IDs in components
- Don't forget error handling

---

## Additional Resources

- **Full ADR:** [ADR-001](./architecture/ADR-001-authentication-authorization.md)
- **State Management Guide:** [state-management.md](./architecture/state-management.md)
- **Architecture Overview:** [overview.md](./architecture/overview.md)
- **Firebase Setup:** [../setup/google-auth.md](./setup/google-auth.md)
- **Testing Guide:** See test files in `client/src/lib/*.test.tsx`

---

**Last Updated:** 2024-12-20  
**Maintainers:** CertLab Team
