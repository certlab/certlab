# ADR-001: Authentication, Authorization, User State Management, and Route Protection

**Status:** ✅ Accepted  
**Date:** 2024-12-20  
**Deciders:** CertLab Team  
**Context:** Establish a standardized approach for authentication, authorization, user state management, and route protection in the CertLab React application.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Authentication](#1-authentication)
- [Authorization](#2-authorization)
- [User State Management](#3-user-state-management)
- [Route Protection](#4-route-protection)
- [Session Management](#5-session-management)
- [Implementation Guidelines](#implementation-guidelines)
- [Code Examples](#code-examples)
- [Consequences](#consequences)
- [Related Documents](#related-documents)

---

## Executive Summary

CertLab uses a **cloud-first authentication system** with Firebase Authentication and Firestore storage. User state is managed through **React Context** for global state and **TanStack Query** for async data operations. Route protection is implemented via a **ProtectedRoute Higher-Order Component (HOC)** that wraps authenticated routes.

> **Important**: Firebase Authentication with Firestore storage is mandatory for all deployments. The application will not function without proper Firebase configuration.

### Quick Reference

| Concern | Technology/Pattern | Implementation |
|---------|-------------------|----------------|
| **Authentication** | Firebase Auth (Google Sign-In) | `firebase.ts`, `auth-provider.tsx` |
| **Storage** | Cloud Firestore with offline cache | `firestore-storage.ts`, `storage-factory.ts` |
| **Authorization** | Role-based + Tenant-based | `user.role`, `user.tenantId` |
| **User State** | React Context + TanStack Query | `AuthProvider`, `useAuth()` hook |
| **Route Protection** | Higher-Order Component | `<ProtectedRoute>` wrapper component |
| **Session Management** | Firebase session + Firestore | Session persistence via Firebase Auth and Firestore |

---

## Context and Problem Statement

As a cloud-first SPA with offline support, CertLab needed to establish:

1. **Secure authentication** using Firebase
2. **User state management** that works across the application
3. **Route protection** to secure authenticated pages
4. **Authorization** for role-based and tenant-based access control
5. **Session persistence** across browser refreshes
6. **Cloud sync** via Firebase for multi-device support with offline capability

### Requirements

- ✅ Firebase Authentication (Google Sign-In) - mandatory
- ✅ Cloud storage via Firestore with automatic offline persistence
- ✅ Role-based authorization (user, admin)
- ✅ Multi-tenant data isolation
- ✅ Session persistence across page refreshes
- ✅ Seamless loading experience (no redirect flash)
- ✅ TypeScript type safety throughout
- ✅ Testable and maintainable code

---

## Decision

We have adopted a **cloud-first authentication and authorization architecture**:

1. **Firebase Authentication** (Google Sign-In, mandatory)
2. **Cloud Firestore** for data storage with automatic offline caching via Firestore SDK
3. **React Context** for global authentication state
4. **TanStack Query** for async user data operations
5. **Protected Route HOC** for route-level authorization
6. **Role-based and tenant-based authorization** patterns

---

## 1. Authentication

### 1.1 Authentication Methods

CertLab supports **three authentication methods**:

1. **Local password authentication** (PBKDF2 hashing)
2. **Passwordless authentication** (email-only accounts)
3. **Google Sign-In** (via Firebase Authentication)

### 1.2 Password Authentication (PBKDF2)

**File:** `client/src/lib/client-auth.ts`

**Implementation:**
- Passwords are hashed using **PBKDF2** with 100,000 iterations
- Uses Web Crypto API (`crypto.subtle.deriveBits`)
- Generates unique 128-bit salt for each password
- Hash format: `pbkdf2:iterations:salt:hash`
- Constant-time comparison to prevent timing attacks
- Automatic migration from legacy SHA-256 hashes

**Security Features:**
```typescript
// PBKDF2 Configuration
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 128 bits
const HASH_LENGTH = 32; // 256 bits

// Hash format for version identification
// Format: "pbkdf2:100000:abc123...:def456..."
```

**Password Requirements:**
- Minimum 8 characters
- Email format validation: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

### 1.3 Google Authentication (Firebase)

**File:** `client/src/lib/firebase.ts`

**Implementation:**
- Firebase Authentication with Google provider
- Popup-based sign-in flow
- Automatic user creation on first sign-in
- Profile data sync (email, name, photo)
- Session managed by Firebase SDK

**Configuration:**
```typescript
// Environment variables required
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

### 1.4 Passwordless Authentication

**Implementation:**
- Email-only accounts with no password
- 24-hour session timeout
- Intended for quick demo/trial access
- Can be upgraded to password-protected

---

## 2. Authorization

### 2.1 Role-Based Access Control (RBAC)

**User Roles:**
```typescript
type UserRole = 'user' | 'admin';
```

**Implementation:**
```typescript
// From App.tsx
const { user } = useAuth();
const isAdmin = user?.role === 'admin';

// Conditional route rendering
{isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
```

**Role Patterns:**
- **User role:** Standard access to learning features
- **Admin role:** Access to admin dashboard, data import, UI structure pages

### 2.2 Tenant-Based Access Control

**Multi-Tenancy:**
- Each user belongs to exactly one tenant at a time
- All data queries are scoped by `tenantId`
- Users can switch between tenants via UI
- Tenant switching requires tenant to be active

**Implementation:**
```typescript
// From auth-provider.tsx
const switchTenant = async (tenantId: number) => {
  const tenant = await storage.getTenant(tenantId);
  if (tenant?.isActive) {
    await storage.updateUser(user.id, { tenantId });
    // Invalidate all queries to refetch with new tenant context
    queryClient.invalidateQueries();
  }
};
```

**Data Isolation:**
- Categories scoped by `tenantId`
- Questions scoped by `tenantId`
- Quiz history scoped by `userId` AND `tenantId`
- Achievements scoped by `tenantId`

---

## 3. User State Management

### 3.1 Global Authentication State (React Context)

**File:** `client/src/lib/auth-provider.tsx`

**Implementation:**
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  tenantId: number | undefined;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  switchTenant: (tenantId: number) => Promise<void>;
  isCloudSyncEnabled: boolean;
  firebaseUser: FirebaseUser | null;
}
```

**Usage Pattern:**
```typescript
import { useAuth } from '@/lib/auth-provider';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();
  
  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }
  
  return <div>Hello {user.firstName}!</div>;
}
```

**State Initialization:**
1. Load user from Firebase Auth state (synchronous check for cached state)
2. Set `isLoading: false` immediately to prevent redirect flash
3. Initialize Firebase in background if not already initialized
4. Sync with Firestore for user profile data

### 3.2 Async User Data (TanStack Query)

**File:** `client/src/lib/queryClient.ts`

**Query Keys:**
```typescript
export const queryKeys = {
  user: {
    all: (userId: string) => ['/api', 'user', userId],
    stats: (userId: string) => ['/api', 'user', userId, 'stats'],
    quizzes: (userId: string) => ['/api', 'user', userId, 'quizzes'],
    badges: (userId: string) => ['/api', 'user', userId, 'badges'],
    gameStats: (userId: string) => ['/api', 'user', userId, 'game-stats'],
  },
  // ... more query keys
};
```

**Usage Pattern:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';

function Dashboard() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery({
    queryKey: queryKeys.user.stats(user.id),
    queryFn: async () => {
      const { storage } = await import('@/lib/storage-factory');
      return storage.getUserStats(user.id);
    },
    enabled: !!user,
  });
  
  if (isLoading) return <LoadingSpinner />;
  return <div>Total Points: {stats.totalPoints}</div>;
}
```

### 3.3 Local Component State

**For simple UI state**, use `useState`:
```typescript
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
```

**For complex related state**, use `useReducer`:
```typescript
// Example from quiz feature
const [state, dispatch] = useReducer(quizReducer, initialQuizState);

dispatch({ type: 'SELECT_ANSWER', payload: { questionId, answer } });
dispatch({ type: 'TOGGLE_FLAG', payload: { questionId } });
```

**Decision Matrix:**
- **useState** → Simple, independent values (toggles, single inputs)
- **useReducer** → Complex state with related updates (quiz workflow, multi-step forms)
- **TanStack Query** → Async data from Firestore (all data fetching)
- **React Context** → Global state shared across many components (auth, theme)

See [state-management.md](./state-management.md) for detailed guidance.

---

## 4. Route Protection

### 4.1 Protected Route Component

**File:** `client/src/components/ProtectedRoute.tsx`

**Implementation:**
```typescript
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" label="Loading application..." />
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}
```

**Key Features:**
- ✅ Shows loading spinner during auth check
- ✅ Redirects unauthenticated users to landing page
- ✅ Preserves attempted URL in navigation state for post-login redirect
- ✅ No redirect flash on page refresh (user loaded synchronously)

### 4.2 Route Structure

**File:** `client/src/App.tsx`

**Pattern:**
```typescript
function Router() {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  // Landing page (public)
  if (location.pathname === '/' || location.pathname === '') {
    return <Landing />;
  }

  // Protected app routes
  const isAppRoute = location.pathname.startsWith('/app') || 
                     location.pathname.startsWith('/admin');

  if (isAppRoute) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <Routes>
            <Route path="/app" element={<Dashboard />} />
            <Route path="/app/quiz/:id" element={<Quiz />} />
            <Route path="/app/profile" element={<ProfilePage />} />
            {/* Role-based route */}
            {isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  // All other paths → 404
  return <NotFound />;
}
```

**Route Categories:**
1. **Public routes:** Landing page (`/`)
2. **Protected routes:** All `/app/*` routes require authentication
3. **Admin routes:** `/admin` requires `role === 'admin'`
4. **404 routes:** All other paths

### 4.3 Navigation After Login

**Pattern:**
```typescript
// In login component
const navigate = useNavigate();
const location = useLocation();

const handleLoginSuccess = () => {
  const from = location.state?.from || '/app';
  navigate(from, { replace: true });
};
```

**Behavior:**
- If user tried to access `/app/quiz/123`, after login they're redirected to `/app/quiz/123`
- If user logged in from landing page, they're redirected to `/app` (dashboard)
- Uses `replace: true` to avoid back button issues

---

## 5. Session Management

### 5.1 Session Persistence

**Storage Location:**
```typescript
// Firebase Auth manages session state
// User profile stored in Firestore: /users/{userId}
// Session token stored in browser's localStorage by Firebase SDK
```

### 5.2 Session Timeout

**Password-Protected Accounts:**
- No session timeout
- Session persists until explicit logout
- Requires password for future logins

**Passwordless Accounts:**
- 24-hour absolute timeout (86400000 ms)
- Timeout starts at login, not last activity
- Automatically logged out after 24 hours
- Used for demo/trial accounts

**Google-Authenticated Accounts:**
- 24-hour session timeout (treated as passwordless)
- Firebase manages server-side session
- Can re-authenticate quickly via Google popup

**Implementation:**
```typescript
// From client-auth.ts
const PASSWORDLESS_SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

async isSessionValid(): Promise<boolean> {
  const sessionInfo = await this.getSessionInfo();
  if (!sessionInfo || !sessionInfo.isPasswordless) return true;
  
  const elapsed = Date.now() - sessionInfo.loginAt;
  return elapsed <= PASSWORDLESS_SESSION_TIMEOUT_MS;
}
```

### 5.3 Session Validation on Page Load

**Critical Path (Fast):**
1. Check Firebase Auth state from localStorage (cached by Firebase SDK)
2. If exists, user is authenticated immediately
3. Load user profile from Firestore (or cache)
4. Update `AuthContext` with user
5. Set `isLoading: false` ← **This happens FAST**

**Background (Async):**
1. Verify Firebase Auth token is still valid
2. Refresh user profile from Firestore if needed
3. Update any cached data

**Result:** Users see protected routes immediately on page refresh, no redirect flash.

### 5.4 Logout Flow

**Implementation:**
```typescript
// From auth-provider.tsx
const logout = useCallback(async () => {
  try {
    // 1. End observability session
    endSession();
    
    // 2. Sign out from Firebase if authenticated
    if (firebaseUser) {
      await signOutFromGoogle();
    }
    
    // 3. Clear local auth
    const result = await clientAuth.logout();
    
    // 4. Clear storage
    await storage.clearCurrentUser();
    
    // 5. Update context
    setUser(null);
    setFirebaseUser(null);
  } catch (error) {
    logError('logout', error);
  }
}, [firebaseUser]);
```

**Important:** Components handle navigation after logout, not the auth provider.

```typescript
// In Header.tsx
const handleLogout = async () => {
  await logout();
  navigate('/', { replace: true }); // Component handles navigation
};
```

---

## Implementation Guidelines

### For New Features

#### 1. Adding a New Protected Page

```typescript
// 1. Create the page component
// client/src/pages/my-feature.tsx
export default function MyFeaturePage() {
  const { user } = useAuth(); // Access current user
  
  return <div>My Feature</div>;
}

// 2. Add lazy-loaded import to App.tsx
const MyFeaturePage = lazy(() => import('@/pages/my-feature'));

// 3. Add route inside ProtectedRoute wrapper
<Route path="/app/my-feature" element={<MyFeaturePage />} />
```

#### 2. Checking User Permissions

```typescript
// Role-based check
function AdminButton() {
  const { user } = useAuth();
  
  if (user?.role !== 'admin') {
    return null; // Don't show button for non-admins
  }
  
  return <Button>Admin Action</Button>;
}

// Tenant-based check
function TenantSpecificContent() {
  const { user } = useAuth();
  
  if (user?.tenantId !== EXPECTED_TENANT_ID) {
    return <div>Not available in this environment</div>;
  }
  
  return <div>Tenant-specific content</div>;
}
```

#### 3. Fetching User-Scoped Data

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useAuth } from '@/lib/auth-provider';

function MyComponent() {
  const { user } = useAuth();
  
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.user.custom(user.id, 'my-data'),
    queryFn: async () => {
      return await storage.getMyData(user.id, user.tenantId);
    },
    enabled: !!user, // Only fetch when user is available
  });
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <div>{data}</div>;
}
```

#### 4. Updating User Profile

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';

function ProfileEditor() {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<User>) => {
      return await clientAuth.updateProfile(updates);
    },
    onSuccess: async () => {
      await refreshUser(); // Refresh auth context
      queryClient.invalidateQueries({ queryKey: ['user'] }); // Invalidate user queries
    },
  });
  
  const handleSubmit = (updates: Partial<User>) => {
    updateProfileMutation.mutate(updates);
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### For Testing

#### 1. Testing Authentication State

```typescript
// client/src/lib/auth-provider.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './auth-provider';

describe('AuthProvider', () => {
  it('should load user from storage on mount', async () => {
    function TestComponent() {
      const { user, isLoading } = useAuth();
      if (isLoading) return <div>Loading...</div>;
      return <div>User: {user?.email || 'None'}</div>;
    }
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});
```

#### 2. Testing Protected Routes

```typescript
// client/src/components/ProtectedRoute.test.tsx
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '@/lib/auth-provider';

describe('ProtectedRoute', () => {
  it('should redirect unauthenticated users', () => {
    render(
      <AuthProvider>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </AuthProvider>
    );
    
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
```

### Best Practices

#### ✅ DO

- **Use `useAuth()` hook** for accessing authentication state
- **Check `isLoading`** before checking `isAuthenticated`
- **Invalidate queries** after mutations that affect user data
- **Use `enabled` option** in queries to wait for user availability
- **Handle logout in components**, not in auth provider
- **Use TanStack Query** for all IndexedDB data fetching
- **Use React Context** only for rarely-changing global state
- **Validate permissions** at both route level and component level
- **Log security events** for audit trails

#### ❌ DON'T

- **Don't store passwords** in any state or localStorage
- **Don't bypass ProtectedRoute** for authenticated pages
- **Don't duplicate user state** between context and local state
- **Don't fetch user data directly** without TanStack Query
- **Don't hardcode tenant IDs** in components
- **Don't navigate in auth provider** (components handle navigation)
- **Don't use context for frequently-changing state** (causes re-renders)
- **Don't forget to check role/tenant** when showing admin/tenant-specific features

---

## Code Examples

### Complete Login Flow

```typescript
// Login component
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await clientAuth.login(email, password);
    
    if (result.success) {
      await refreshUser(); // Update auth context
      const from = location.state?.from || '/app';
      navigate(from, { replace: true });
    } else {
      setError(result.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Log In</button>
    </form>
  );
}
```

### Complete Registration Flow

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await clientAuth.register(
      formData.email,
      formData.password,
      formData.firstName,
      formData.lastName
    );
    
    if (result.success) {
      await refreshUser(); // Update auth context
      navigate('/app', { replace: true });
    } else {
      setError(result.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        placeholder="Password (min 8 characters)"
        required
        minLength={8}
      />
      <input
        type="text"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        placeholder="First Name"
      />
      <input
        type="text"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        placeholder="Last Name"
      />
      {error && <div className="error">{error}</div>}
      <button type="submit">Create Account</button>
    </form>
  );
}
```

### Google Sign-In

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

    const result = await clientAuth.signInWithGoogle();
    
    if (result.success) {
      await refreshUser(); // Update auth context
      navigate('/app', { replace: true });
    } else {
      setError(result.message || 'Google sign-in failed');
    }
    
    setIsLoading(false);
  };

  if (!clientAuth.isGoogleAuthAvailable()) {
    return null; // Don't show button if Firebase not configured
  }

  return (
    <div>
      <Button onClick={handleGoogleSignIn} disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
      </Button>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### Tenant Switching

```typescript
import { Select } from '@/components/ui/select';
import { useAuth } from '@/lib/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { storage } from '@/lib/storage-factory';

export function TenantSwitcher() {
  const { user, switchTenant } = useAuth();
  
  const { data: tenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => storage.getAllTenants(),
  });

  const handleSwitchTenant = async (tenantId: number) => {
    try {
      await switchTenant(tenantId);
      // Query invalidation handled by auth provider
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    }
  };

  return (
    <Select
      value={user?.tenantId.toString()}
      onValueChange={(value) => handleSwitchTenant(parseInt(value))}
    >
      {tenants
        .filter(t => t.isActive)
        .map(tenant => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
    </Select>
  );
}
```

---

## Consequences

### Positive

✅ **Security:**
- PBKDF2 with 100,000 iterations provides strong password protection
- Constant-time comparison prevents timing attacks
- No passwords stored in plain text or localStorage
- Firebase handles Google authentication security

✅ **User Experience:**
- No redirect flash on page refresh (fast synchronous user load)
- Seamless multi-device sync with Firebase
- Optional passwordless accounts for quick demos
- Persistent sessions survive browser restarts

✅ **Developer Experience:**
- TypeScript type safety throughout
- Simple `useAuth()` hook for accessing user state
- Consistent TanStack Query patterns for data fetching
- Easy to test with standard React testing patterns
- Clear separation of concerns (auth, storage, UI)

✅ **Architecture:**
- Cloud-first with Firestore
- Offline support via Firestore SDK's automatic caching
- Multi-tenant support built-in
- Role-based authorization ready

### Negative

❌ **Limitations:**
- No true server-side session validation (client-side Firebase Auth)
- 24-hour timeout for passwordless/Google accounts
- No built-in password reset (requires Firebase email verification)

### Mitigations

1. **Client-side password risk:** Users are informed that data is stored locally
2. **Single user limitation:** Browser profiles can be used for multiple users
3. **Session timeout:** Can be configured per account type
4. **Password reset:** Can be implemented via email verification with Firebase

### Trade-offs

| Decision | Pro | Con |
|----------|-----|-----|
| Client-side auth | No server cost, offline capability | Less secure than server-side |
| PBKDF2 100k iterations | Strong password protection | Slower than bcrypt (but acceptable) |
| React Context for auth | Simple, built-in solution | Re-renders all consumers on change |
| ProtectedRoute HOC | Clean, declarative routing | Requires wrapping each protected route |
| 24h timeout (passwordless) | Security for demo accounts | Inconvenient for longer sessions |

---

## Related Documents

- [state-management.md](./state-management.md) - Detailed state management guide
- [overview.md](./overview.md) - System architecture overview
- [../setup/google-auth.md](../setup/google-auth.md) - Firebase setup instructions
- [../setup/firebase.md](../setup/firebase.md) - Firebase configuration
- [../features/tenant-switching.md](../features/tenant-switching.md) - Multi-tenant features
- [USER_STATE_VALIDATION.md](../USER_STATE_VALIDATION.md) - User state testing

### Code References

| File | Purpose |
|------|---------|
| `client/src/lib/client-auth.ts` | Authentication logic and password hashing |
| `client/src/lib/auth-provider.tsx` | Authentication context and state management |
| `client/src/lib/firebase.ts` | Firebase Authentication integration |
| `client/src/components/ProtectedRoute.tsx` | Route protection HOC |
| `client/src/lib/storage-factory.ts` | Storage abstraction layer |
| `client/src/lib/client-storage.ts` | IndexedDB operations |
| `client/src/App.tsx` | Route definitions and structure |
| `client/src/pages/login.tsx` | Login page implementation |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-20 | CertLab Team | Initial ADR documenting current authentication approach |

---

## Appendix: Security Audit Log Events

All authentication operations are logged for security auditing:

```typescript
// Security events logged (console-based for client-side)
- USER_REGISTERED: New account created
- LOGIN_SUCCESS: Successful password login
- LOGIN_FAILED: Failed login attempt with reason
- PASSWORDLESS_LOGIN: Passwordless account login
- GOOGLE_SIGN_IN_SUCCESS: Google authentication
- GOOGLE_SIGN_UP_SUCCESS: New user via Google
- PASSWORD_CHANGED: Password update
- PASSWORD_SET: Password added to passwordless account
- SESSION_EXPIRED: Session timeout
- LOGOUT: User logged out
```

Each event includes:
- Timestamp (ISO 8601)
- User ID (if applicable)
- Email (if applicable)
- User agent
- Event-specific metadata

Example:
```
[SECURITY AUDIT] 2024-12-20T12:34:56.789Z - LOGIN_SUCCESS
{
  userId: "abc-123-def",
  email: "user@example.com",
  isPasswordless: false,
  userAgent: "Mozilla/5.0...",
  timestamp: "2024-12-20T12:34:56.789Z"
}
```

---

**End of ADR-001**
