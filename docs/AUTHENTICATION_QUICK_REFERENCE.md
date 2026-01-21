# Authentication & Authorization - Quick Reference

> **For complete details**, see [ADR-001](./architecture/ADR-001-authentication-authorization.md) and [Implementation Checklist](./AUTHENTICATION_CHECKLIST.md)

## Overview

CertLab uses a **cloud-based authentication system** with:
- Firebase Authentication (Google Sign-In)
- React Context for global auth state
- TanStack Query for async data operations
- ProtectedRoute HOC for route-level security

---

## Quick Access

### For Developers

**Need to add authentication to a feature?**
→ See [AUTHENTICATION_CHECKLIST.md](./AUTHENTICATION_CHECKLIST.md)

**Need architectural details?**
→ See [ADR-001](./architecture/ADR-001-authentication-authorization.md)

**Need state management patterns?**
→ See [state-management.md](./architecture/state-management.md)

### Core Files

| File | Purpose |
|------|---------|
| `client/src/lib/auth-provider.tsx` | Auth context & state |
| `client/src/lib/client-auth.ts` | Auth logic & password hashing |
| `client/src/components/ProtectedRoute.tsx` | Route protection |
| `client/src/lib/firebase.ts` | Google authentication |
| `client/src/App.tsx` | Route definitions |

---

## Common Tasks

### Access Current User

```typescript
import { useAuth } from '@/lib/auth-provider';

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <div>Please log in</div>;
  
  return <div>Hello, {user.firstName}!</div>;
}
```

### Protect a Route

```typescript
// In App.tsx
<ProtectedRoute>
  <Route path="/app/my-feature" element={<MyFeaturePage />} />
</ProtectedRoute>
```

### Check User Role

```typescript
const { user } = useAuth();
const isAdmin = user?.role === 'admin';

if (!isAdmin) return null; // Hide for non-admins
```

### Fetch User Data

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';

const { data, isLoading } = useQuery({
  queryKey: queryKeys.user.stats(user.id),
  queryFn: () => storage.getUserStats(user.id),
  enabled: !!user,
});
```

### Login Flow

```typescript
import { clientAuth } from '@/lib/client-auth';
import { useAuth } from '@/lib/auth-provider';

const { refreshUser } = useAuth();
const result = await clientAuth.login(email, password);

if (result.success) {
  await refreshUser();
  navigate('/app', { replace: true });
}
```

### Logout Flow

```typescript
import { useAuth } from '@/lib/auth-provider';

const { logout } = useAuth();
await logout(); // Handles Firebase, storage, session cleanup
navigate('/', { replace: true }); // Component handles navigation
```

---

## Authentication Methods

| Method | Implementation | Session |
|--------|---------------|---------|
| **Local Password** | PBKDF2 (100k iterations) | No timeout |
| **Passwordless** | Email-only accounts | 24-hour timeout |
| **Google Sign-In** | Firebase Authentication | 24-hour timeout |

---

## Authorization Patterns

### Role-Based Access Control

```typescript
type UserRole = 'user' | 'admin';

// Check in component
if (user?.role !== 'admin') return null;

// Check in routes
{isAdmin && <Route path="/admin" element={<AdminDashboard />} />}
```

### Tenant-Based Access Control

```typescript
// All data scoped by tenantId
const categories = await storage.getCategoriesByTenant(user.tenantId);

// Switch tenants
await switchTenant(newTenantId); // Invalidates all queries
```

---

## State Management

| Approach | When to Use | Example |
|----------|-------------|---------|
| **useState** | Simple local state | Modal visibility, toggles |
| **useReducer** | Complex related state | Quiz workflow with answers/flags |
| **TanStack Query** | Async data from storage | All data fetching |
| **React Context** | Global shared state | Authentication, theme |

See [state-management.md](./architecture/state-management.md) for detailed guidance.

---

## Security Features

✅ **Password Security:**
- PBKDF2 with 100,000 iterations
- Unique 128-bit salt per password
- Constant-time comparison (prevents timing attacks)
- Automatic migration from legacy SHA-256

✅ **Session Security:**
- Persistent sessions via IndexedDB
- 24-hour timeout for passwordless/Google accounts
- No timeout for password-protected accounts
- Session validation on page load

✅ **Audit Logging:**
- All auth operations logged to console
- Includes user ID, email, timestamp, user agent
- Events: LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, etc.

---

## Common Issues & Solutions

### Issue: User redirected on page refresh

**Solution:** Already handled - user loads synchronously from IndexedDB before Firebase init.

### Issue: Queries run before user available

**Solution:** Add `enabled: !!user` to query options.

### Issue: Role check not working

**Solution:** Check role directly from `user` object, don't cache in local state.

---

## Testing

### Test with Authentication

```typescript
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/lib/auth-provider';
import { queryClient } from '@/lib/queryClient';

const renderWithAuth = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};
```

---

## Best Practices

### ✅ DO

- Use `useAuth()` hook for auth state
- Check `isLoading` before `isAuthenticated`
- Use TanStack Query for all data fetching
- Invalidate queries after mutations
- Handle logout navigation in components
- Use `enabled` option in queries
- Validate permissions at both route and component level

### ❌ DON'T

- Store passwords in state or localStorage
- Bypass ProtectedRoute
- Duplicate user state
- Fetch data without TanStack Query
- Navigate in auth provider
- Cache role/tenant in local state
- Hardcode tenant IDs

---

## Architecture Decisions

See [ADR-001](./architecture/ADR-001-authentication-authorization.md) for full context on:

- Why client-side authentication
- Why PBKDF2 over bcrypt
- Why React Context for auth state
- Why ProtectedRoute HOC pattern
- Why 24-hour timeout for passwordless accounts
- Trade-offs and consequences

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ADR-001](./architecture/ADR-001-authentication-authorization.md) | Full architectural decision record |
| [AUTHENTICATION_CHECKLIST.md](./AUTHENTICATION_CHECKLIST.md) | Step-by-step implementation guide |
| [state-management.md](./architecture/state-management.md) | State management patterns |
| [overview.md](./architecture/overview.md) | System architecture |
| [setup/google-auth.md](./setup/google-auth.md) | Firebase setup |

---

**Last Updated:** 2024-12-20  
**Status:** ✅ Accepted and Documented  
**Team:** CertLab Development Team
