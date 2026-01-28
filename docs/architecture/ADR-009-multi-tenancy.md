# ADR-009: Multi-Tenancy Architecture

**Status:** ✅ Accepted  
**Date:** 2024-12-22  
**Deciders:** CertLab Team  
**Context:** Define the multi-tenancy strategy for supporting multiple organizations with isolated data, tenant switching, and organization branding.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Multi-Tenancy Architecture](#multi-tenancy-architecture)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)
- [Code References](#code-references)
- [Revision History](#revision-history)

---

## Executive Summary

CertLab implements **tenant isolation via tenantId field** in Firestore documents, enabling multiple organizations to share the platform while maintaining data privacy. Each tenant has isolated user data, custom branding, and independent configuration, while shared content (questions, categories) remains global.

### Quick Reference

| Aspect | Implementation | Purpose |
|--------|---------------|---------|
| **Tenant Identification** | `tenantId` field (integer) | Unique identifier for each organization |
| **Data Isolation** | Firestore security rules | Enforce per-tenant data access |
| **Shared Content** | Global collections | Questions, categories, badges (no tenantId) |
| **User Data** | Per-tenant collections | Quizzes, progress, achievements (with tenantId) |
| **Tenant Switching** | BrandingProvider context | Switch between organizations |
| **Organization Branding** | Firestore `/tenants/{tenantId}` | Custom logo, colors, name |
| **Default Tenant** | tenantId: 1 | CertLab default organization |
| **Tenant Scoping** | WHERE tenantId = ? | Firestore query filters |

**Key Characteristics:**
- Single database, multiple tenants
- Row-level security via tenantId
- Shared content for efficiency
- Per-tenant branding
- Tenant switching support

---

## Context and Problem Statement

CertLab needed a multi-tenancy solution that would:

1. **Isolate tenant data** while sharing infrastructure
2. **Support shared content** (questions, certifications) across tenants
3. **Enable per-tenant branding** (logo, colors, name)
4. **Allow tenant switching** for users in multiple organizations
5. **Enforce security** at the database level
6. **Scale efficiently** without separate databases per tenant
7. **Support tenant-specific configuration** (features, limits)
8. **Maintain query performance** with tenant filtering
9. **Enable tenant analytics** and reporting
10. **Simplify deployment** with single codebase

### Requirements

**Functional Requirements:**
- ✅ Tenant isolation for user data (quizzes, progress, achievements)
- ✅ Shared content for questions, categories, certifications
- ✅ Per-tenant branding (logo, colors, organization name)
- ✅ Tenant switching for multi-org users
- ✅ Tenant-specific configuration (features, limits, billing)
- ✅ Default tenant (tenantId: 1) for CertLab
- ✅ Firestore security rules enforce tenant isolation
- ✅ Query filters automatically include tenantId

**Non-Functional Requirements:**
- ✅ Query performance with tenantId index
- ✅ Storage efficiency (shared content)
- ✅ Security at database level
- ✅ Scalable to 1000+ tenants
- ✅ Simple tenant onboarding
- ✅ Minimal code complexity

---

## Decision

We have adopted a **single-database multi-tenancy** approach with **tenantId field** for data isolation:

### Multi-Tenancy Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Tenancy Architecture                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                 Firestore Database                     │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │                                                        │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │        Shared Content (No tenantId)          │     │     │
│  │  ├──────────────────────────────────────────────┤     │     │
│  │  │  • /categories                               │     │     │
│  │  │  • /subcategories                            │     │     │
│  │  │  • /questions                                │     │     │
│  │  │  • /badges                                   │     │     │
│  │  │  • /challenges                               │     │     │
│  │  │  • /practiceTests                            │     │     │
│  │  │  • /studyGroups (global)                     │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │                                                        │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │     Per-Tenant Data (With tenantId)          │     │     │
│  │  ├──────────────────────────────────────────────┤     │     │
│  │  │  • /users/{uid} → tenantId field             │     │     │
│  │  │  • /quizzes/{id} → tenantId field            │     │     │
│  │  │  • /userProgress/{uid} → tenantId            │     │     │
│  │  │  • /lectures/{id} → tenantId                 │     │     │
│  │  │  • /masteryScores/{id} → tenantId            │     │     │
│  │  │  • /userBadges/{id} → tenantId               │     │     │
│  │  │  • /userGameStats/{id} → tenantId            │     │     │
│  │  │  • /challengeAttempts/{id} → tenantId        │     │     │
│  │  │  • /studyGroupMembers/{id} → tenantId        │     │     │
│  │  │  • /practiceTestAttempts/{id} → tenantId     │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │                                                        │     │
│  │  ┌──────────────────────────────────────────────┐     │     │
│  │  │       Tenant Configuration                   │     │     │
│  │  ├──────────────────────────────────────────────┤     │     │
│  │  │  • /tenants/{tenantId}                       │     │     │
│  │  │    - name: "Acme Corp"                       │     │     │
│  │  │    - logoUrl: "https://..."                  │     │     │
│  │  │    - primaryColor: "#2563eb"                 │     │     │
│  │  │    - features: ["quizzes", "analytics"]      │     │     │
│  │  │    - limits: { users: 100, storage: "10GB" } │     │     │
│  │  │    - createdAt, status, billingPlan          │     │     │
│  │  └──────────────────────────────────────────────┘     │     │
│  │                                                        │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Security Rules (Tenant Isolation)         │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │  match /quizzes/{quizId} {                             │     │
│  │    allow read: if request.auth.uid != null             │     │
│  │      && get(/databases/$(database)/documents/          │     │
│  │           users/$(request.auth.uid)).data.tenantId     │     │
│  │      == resource.data.tenantId;                        │     │
│  │  }                                                     │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Tenant Data Model

```typescript
// Tenant Configuration (Firestore: /tenants/{tenantId})
interface Tenant {
  id: number;                    // Unique tenant identifier
  name: string;                  // Organization name
  slug: string;                  // URL-friendly identifier
  logoUrl?: string;              // Organization logo
  primaryColor?: string;         // Brand primary color
  secondaryColor?: string;       // Brand secondary color
  features: string[];            // Enabled features
  limits: {
    users: number;               // Max users
    storage: string;             // Storage limit
    quizzesPerMonth: number;     // Quiz limit
  };
  billing: {
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'suspended' | 'cancelled';
    billingEmail: string;
  };
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'suspended';
}

// User with Tenant Association
interface User {
  id: string;
  email: string;
  tenantId: number;              // Primary tenant
  tenantIds?: number[];          // Additional tenants (multi-org users)
  role: 'student' | 'instructor' | 'admin';
  // ... other user fields
}

// Per-Tenant Data Example: Quiz
interface Quiz {
  id: number;
  tenantId: number;              // Owner tenant
  userId: string;
  categoryId: number;
  // ... other quiz fields
}
```

---

## Multi-Tenancy Architecture

### 1. Tenant Isolation Strategy

**Row-Level Security:**
- Every per-tenant document includes `tenantId` field
- Firestore security rules enforce tenant matching
- Queries automatically filter by `tenantId`

**Shared Content:**
- Questions, categories, badges have no `tenantId`
- Accessible to all tenants
- Reduces storage and maintenance

**Hybrid Approach:**
- Shared content for efficiency
- Isolated user data for privacy
- Tenant configuration for customization

### 2. Data Scoping Patterns

**Per-Tenant Collections:**
```typescript
// Always include tenantId in where clause
const quizzes = await storage.getQuizzesByUser(userId, tenantId);

// Firestore query
const quizzesRef = collection(db, 'quizzes');
const q = query(
  quizzesRef,
  where('userId', '==', userId),
  where('tenantId', '==', tenantId)
);
const snapshot = await getDocs(q);
```

**Shared Collections:**
```typescript
// No tenantId filter needed
const categories = await storage.getCategories();

// Firestore query
const categoriesRef = collection(db, 'categories');
const q = query(categoriesRef, orderBy('name'));
const snapshot = await getDocs(q);
```

### 3. Tenant Switching

**BrandingProvider Context:**
```typescript
// User switches to different tenant
const { currentTenantId, switchTenant } = useBranding();

switchTenant(newTenantId);
// Invalidates TanStack Query cache
// Refetches data for new tenant
// Updates branding (logo, colors)
```

---

## Implementation Details

### 1. Tenant Schema

**File:** `shared/schema.ts`

```typescript
// Tenant ID is included in all per-tenant tables
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').unique().notNull(),
  email: text('email').unique().notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  // ... other fields
}, (table) => ({
  tenantIdx: index('users_tenant_idx').on(table.tenantId),
}));

export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  categoryId: integer('category_id').notNull(),
  // ... other fields
}, (table) => ({
  tenantIdx: index('quizzes_tenant_idx').on(table.tenantId),
  tenantUserIdx: index('quizzes_tenant_user_idx').on(table.tenantId, table.userId),
}));

export const userProgress = pgTable('user_progress', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  categoryId: integer('category_id').notNull(),
  // ... other fields
});

export const lectures = pgTable('lectures', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  // ... other fields
});

export const masteryScores = pgTable('mastery_scores', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  tenantId: integer('tenant_id').notNull().default(1),
  // ... other fields
});

// Shared content - no tenantId
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  // No tenantId - shared across all tenants
});

export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull(),
  text: text('text').notNull(),
  // No tenantId - shared across all tenants
});

export const badges = pgTable('badges', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  // No tenantId - shared across all tenants
});
```

**Tenant Configuration:**
```typescript
export const tenants = pgTable('tenants', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  logoUrl: text('logo_url'),
  primaryColor: varchar('primary_color', { length: 7 }),
  secondaryColor: varchar('secondary_color', { length: 7 }),
  features: jsonb('features').$type<string[]>().default([]),
  limits: jsonb('limits').$type<{
    users: number;
    storage: string;
    quizzesPerMonth: number;
  }>(),
  billingPlan: text('billing_plan').default('free'),
  billingStatus: text('billing_status').default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  status: text('status').default('active'),
});
```

### 2. Branding Provider

**File:** `client/src/lib/branding-provider.tsx`

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { storage } from './storage-factory';
import { useAuth } from './auth-provider';
import { queryClient } from './queryClient';

interface BrandingConfig {
  tenantId: number;
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface BrandingContextType {
  branding: BrandingConfig;
  currentTenantId: number;
  switchTenant: (tenantId: number) => Promise<void>;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType>(null!);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentTenantId, setCurrentTenantId] = useState<number>(1);
  const [branding, setBranding] = useState<BrandingConfig>({
    tenantId: 1,
    name: 'CertLab',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load tenant branding from Firestore
  useEffect(() => {
    const loadBranding = async () => {
      if (!user?.tenantId) {
        setIsLoading(false);
        return;
      }

      try {
        const tenantConfig = await storage.getTenantConfig(user.tenantId);
        if (tenantConfig) {
          setBranding({
            tenantId: user.tenantId,
            name: tenantConfig.name,
            logoUrl: tenantConfig.logoUrl,
            primaryColor: tenantConfig.primaryColor,
            secondaryColor: tenantConfig.secondaryColor,
          });
          setCurrentTenantId(user.tenantId);
        }
      } catch (error) {
        console.error('Failed to load tenant branding:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranding();
  }, [user?.tenantId]);

  // Apply branding colors to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    if (branding.primaryColor) {
      root.style.setProperty('--tenant-primary', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--tenant-secondary', branding.secondaryColor);
    }
  }, [branding]);

  const switchTenant = async (tenantId: number) => {
    try {
      // Load new tenant branding
      const tenantConfig = await storage.getTenantConfig(tenantId);
      if (tenantConfig) {
        setBranding({
          tenantId,
          name: tenantConfig.name,
          logoUrl: tenantConfig.logoUrl,
          primaryColor: tenantConfig.primaryColor,
          secondaryColor: tenantConfig.secondaryColor,
        });
        setCurrentTenantId(tenantId);

        // Invalidate TanStack Query cache to refetch data for new tenant
        queryClient.invalidateQueries();
      }
    } catch (error) {
      console.error('Failed to switch tenant:', error);
      throw error;
    }
  };

  return (
    <BrandingContext.Provider 
      value={{ branding, currentTenantId, switchTenant, isLoading }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return context;
}
```

### 3. Storage Layer with Tenant Scoping

**File:** `client/src/lib/firestore-storage.ts`

```typescript
// Get quizzes for a user in a specific tenant
async getQuizzesByUser(
  userId: string, 
  tenantId: number
): Promise<Quiz[]> {
  const quizzesRef = collection(this.db, 'quizzes');
  const q = query(
    quizzesRef,
    where('userId', '==', userId),
    where('tenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: parseInt(doc.id),
    ...doc.data(),
  } as Quiz));
}

// Get user progress (tenant-scoped)
async getUserProgress(
  userId: string, 
  tenantId: number
): Promise<UserProgress[]> {
  const progressRef = collection(this.db, 'userProgress');
  const q = query(
    progressRef,
    where('userId', '==', userId),
    where('tenantId', '==', tenantId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data() as UserProgress);
}

// Get categories (shared - no tenant filter)
async getCategories(): Promise<Category[]> {
  const categoriesRef = collection(this.db, 'categories');
  const q = query(categoriesRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: parseInt(doc.id),
    ...doc.data(),
  } as Category));
}

// Get questions (shared - no tenant filter)
async getQuestionsByCategoryId(categoryId: number): Promise<Question[]> {
  const questionsRef = collection(this.db, 'questions');
  const q = query(
    questionsRef,
    where('categoryId', '==', categoryId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: parseInt(doc.id),
    ...doc.data(),
  } as Question));
}

// Create quiz (with tenantId)
async createQuiz(quiz: Omit<Quiz, 'id'>): Promise<Quiz> {
  const quizzesRef = collection(this.db, 'quizzes');
  const docRef = await addDoc(quizzesRef, {
    ...quiz,
    tenantId: quiz.tenantId || 1, // Default to tenant 1
    createdAt: serverTimestamp(),
  });
  return {
    id: parseInt(docRef.id),
    ...quiz,
  };
}
```

### 4. Firestore Security Rules

**File:** `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user's tenant ID
    function getUserTenantId() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.tenantId;
    }
    
    // Helper function to check if user belongs to tenant
    function belongsToTenant(tenantId) {
      return request.auth.uid != null && getUserTenantId() == tenantId;
    }
    
    // Users collection (tenant-scoped)
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Quizzes collection (tenant-scoped)
    match /quizzes/{quizId} {
      allow read: if request.auth.uid != null 
        && belongsToTenant(resource.data.tenantId);
      allow create: if request.auth.uid != null 
        && request.resource.data.tenantId == getUserTenantId();
      allow update, delete: if request.auth.uid != null 
        && resource.data.userId == request.auth.uid
        && belongsToTenant(resource.data.tenantId);
    }
    
    // User progress (tenant-scoped)
    match /userProgress/{progressId} {
      allow read, write: if request.auth.uid != null
        && belongsToTenant(resource.data.tenantId);
    }
    
    // Categories (shared - no tenant filter)
    match /categories/{categoryId} {
      allow read: if request.auth.uid != null;
      allow write: if false; // Admin only (via Firebase Admin SDK)
    }
    
    // Questions (shared - no tenant filter)
    match /questions/{questionId} {
      allow read: if request.auth.uid != null;
      allow write: if false; // Admin only
    }
    
    // Badges (shared - no tenant filter)
    match /badges/{badgeId} {
      allow read: if request.auth.uid != null;
      allow write: if false; // Admin only
    }
    
    // User badges (tenant-scoped)
    match /userBadges/{userBadgeId} {
      allow read, write: if request.auth.uid != null
        && belongsToTenant(resource.data.tenantId);
    }
    
    // Tenant configuration
    match /tenants/{tenantId} {
      allow read: if request.auth.uid != null 
        && belongsToTenant(int(tenantId));
      allow write: if false; // Admin only
    }
  }
}
```

### 5. TanStack Query Integration

**File:** `client/src/hooks/use-quizzes.ts`

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { storage } from '@/lib/storage-factory';
import { useAuth } from '@/lib/auth-provider';
import { useBranding } from '@/lib/branding-provider';
import { queryClient } from '@/lib/queryClient';

export function useQuizzes() {
  const { user } = useAuth();
  const { currentTenantId } = useBranding();

  // Query key includes tenantId for cache isolation
  const quizzesQuery = useQuery({
    queryKey: ['quizzes', user?.id, currentTenantId],
    queryFn: () => storage.getQuizzesByUser(user!.id, currentTenantId),
    enabled: !!user?.id && !!currentTenantId,
  });

  const createQuizMutation = useMutation({
    mutationFn: (quiz: Omit<Quiz, 'id' | 'tenantId'>) =>
      storage.createQuiz({ ...quiz, tenantId: currentTenantId }),
    onSuccess: () => {
      // Invalidate queries for current tenant
      queryClient.invalidateQueries({
        queryKey: ['quizzes', user?.id, currentTenantId],
      });
    },
  });

  return {
    quizzes: quizzesQuery.data,
    isLoading: quizzesQuery.isLoading,
    createQuiz: createQuizMutation.mutate,
  };
}
```

**Key Points:**
- Query keys include `tenantId` for cache isolation
- Switching tenants invalidates all queries
- Mutations include `tenantId` automatically
- TanStack Query handles cache per tenant

### 6. Header with Tenant Logo

**File:** `client/src/components/Header.tsx`

```typescript
import { useBranding } from '@/lib/branding-provider';
import { useAuth } from '@/lib/auth-provider';

export default function Header() {
  const { branding } = useBranding();
  const { user } = useAuth();

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Tenant logo or name */}
        <div className="flex items-center gap-3">
          {branding.logoUrl ? (
            <img 
              src={branding.logoUrl} 
              alt={branding.name} 
              className="h-8 w-auto"
            />
          ) : (
            <h1 className="text-xl font-bold">{branding.name}</h1>
          )}
        </div>

        {/* User info and tenant switcher */}
        <div className="flex items-center gap-4">
          {user?.tenantIds && user.tenantIds.length > 1 && (
            <TenantSwitcher />
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
```

### 7. Tenant Switcher Component

**File:** `client/src/components/TenantSwitcher.tsx`

```typescript
import { useBranding } from '@/lib/branding-provider';
import { useAuth } from '@/lib/auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';

export function TenantSwitcher() {
  const { user } = useAuth();
  const { currentTenantId, switchTenant, branding } = useBranding();
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitch = async (tenantId: number) => {
    setIsLoading(true);
    try {
      await switchTenant(tenantId);
      // Show success toast
    } catch (error) {
      // Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.tenantIds || user.tenantIds.length <= 1) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <Building2 className="h-4 w-4 mr-2" />
          {branding.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.tenantIds.map((tenantId) => (
          <DropdownMenuItem
            key={tenantId}
            onClick={() => handleSwitch(tenantId)}
            disabled={tenantId === currentTenantId}
          >
            Tenant {tenantId}
            {tenantId === currentTenantId && ' (Current)'}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Consequences

### Positive

1. **Efficient Shared Content**
   - Questions, categories, badges shared across tenants
   - Reduced storage and maintenance costs
   - Consistent content quality

2. **Strong Data Isolation**
   - Firestore security rules enforce tenant boundaries
   - No risk of cross-tenant data leaks
   - Database-level security

3. **Simple Architecture**
   - Single database for all tenants
   - No complex database routing
   - Easy to deploy and maintain

4. **Query Performance**
   - Indexed `tenantId` field
   - Fast tenant-scoped queries
   - Efficient pagination

5. **Flexible Branding**
   - Per-tenant logos and colors
   - Custom organization names
   - CSS variable override

6. **Tenant Switching**
   - Multi-org users can switch tenants
   - Seamless UX with cache invalidation
   - Preserved session

7. **Scalability**
   - Supports 1000+ tenants
   - No per-tenant infrastructure
   - Cost-effective scaling

8. **Simple Onboarding**
   - Add tenant via admin SDK
   - Configure branding in Firestore
   - Immediate availability

### Negative

1. **Schema Changes**
   - Affects all tenants simultaneously
   - Requires careful migration planning
   - No per-tenant schema flexibility

2. **Tenant Size Limits**
   - Single-database architecture has limits
   - Very large tenants may impact performance
   - May need sharding for massive scale

3. **Testing Complexity**
   - Must test with multiple tenants
   - Isolate test data per tenant
   - More test scenarios

4. **Query Complexity**
   - Must always include `tenantId` filter
   - Easy to forget in new queries
   - Risk of exposing cross-tenant data

### Mitigations

1. **Schema Migration Strategy**
   - Test migrations in staging
   - Use Firestore batch operations
   - Monitor migration progress

2. **Query Linter**
   - Add ESLint rule for `tenantId` in queries
   - Code review checklist
   - Integration tests verify tenant isolation

3. **Performance Monitoring**
   - Monitor query latency per tenant
   - Set up alerts for slow queries
   - Optimize indexes regularly

4. **Tenant Size Limits**
   - Set per-tenant quotas
   - Monitor tenant growth
   - Plan sharding strategy for future

---

## Alternatives Considered

### Alternative 1: Separate Database Per Tenant

**Description:** Each tenant has its own Firestore project or database.

**Pros:**
- Complete data isolation
- Per-tenant backups
- Independent schema evolution
- No cross-tenant performance impact

**Cons:**
- High infrastructure cost (N databases)
- Complex deployment (N configurations)
- Difficult to share content across tenants
- Complex tenant switching
- Higher maintenance overhead

**Reason for Rejection:** Cost and complexity outweigh benefits for CertLab's scale. Single-database approach is more efficient and easier to maintain.

### Alternative 2: Subdomain-Based Tenancy

**Description:** Each tenant has a subdomain (acme.certlab.com) with separate deployments.

**Pros:**
- Clear tenant separation
- Independent deployments
- Custom domains per tenant

**Cons:**
- Requires multiple Firebase Hosting sites
- Complex SSL certificate management
- Difficult to share content
- High infrastructure cost
- Complicated tenant switching

**Reason for Rejection:** Over-engineered for CertLab's needs. Single-domain with tenant switching is simpler and more cost-effective.

### Alternative 3: Firestore Collections Per Tenant

**Description:** Separate collections for each tenant (/tenants/{tenantId}/quizzes).

**Pros:**
- Clear data separation
- Easy to understand structure
- Firestore security rules by path

**Cons:**
- Complex queries across tenants
- No shared content
- Difficult to aggregate data
- Nested collection depth limits

**Reason for Rejection:** Makes shared content impossible. Row-level isolation with `tenantId` field is more flexible and efficient.

---

## Related Documents

- [ADR-001: Authentication & Authorization](ADR-001-authentication-authorization.md) - User authentication
- [ADR-003: Data Storage & Firestore Collections](ADR-003-data-storage-firestore-collections.md) - Data model
- [ADR-004: Security & Firestore Rules](ADR-004-security-firestore-rules.md) - Security rules
- [ADR-006: Component Architecture](ADR-006-component-architecture.md) - Branding components
- [ADR-007: State Management Strategy](ADR-007-state-management.md) - TanStack Query integration

---

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `shared/schema.ts` | 10-300 | Tenant ID fields in schema |
| `client/src/lib/branding-provider.tsx` | 1-150 | Branding context and tenant switching |
| `client/src/lib/firestore-storage.ts` | 1-1000 | Tenant-scoped queries |
| `firestore.rules` | 1-200 | Tenant isolation security rules |
| `client/src/components/Header.tsx` | 1-100 | Tenant logo display |
| `client/src/hooks/use-quizzes.ts` | 1-80 | Tenant-scoped TanStack Query |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-12-22 | 1.0 | CertLab Team | Initial version - multi-tenancy via tenantId field |
