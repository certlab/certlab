# Tenant Switching Feature

## Overview

CertLab now supports multi-tenancy, allowing users to switch between different tenant environments. This enables organizations to provide isolated learning environments for different teams, programs, or certifications.

## Features

### What is a Tenant?

A tenant is an isolated environment within CertLab that has its own:
- Categories (e.g., CISSP, CISM)
- Subcategories (topic areas)
- Questions and quizzes
- Study groups and practice tests
- Settings and configurations

Users can belong to a tenant and switch between tenants they have access to, allowing them to work in different learning environments without mixing data.

### Default Tenants

CertLab comes with three pre-configured tenants:
1. **Default Organization** - General purpose tenant
2. **CISSP Training Center** - Focused on CISSP certification
3. **CISM Academy** - Focused on CISM certification

## User Interface

### Desktop View

The tenant switcher appears in the header bar as a dropdown button between the token balance and main navigation:

```
[Cert Lab Logo] [Token Badge] [Tenant Switcher ▼] [Navigation] [Theme] [Profile]
```

### Mobile View

On mobile devices, the tenant switcher appears in the mobile navigation sheet, below the user information.

### Switching Tenants

1. Click on the tenant switcher button (shows current tenant name)
2. A dropdown menu appears showing all available active tenants
3. The current tenant is marked with a "Current" badge and checkmark
4. Click on a different tenant to switch
5. The app will:
   - Update your user profile with the new tenant
   - Invalidate all cached data
   - Reload data from the new tenant
   - Show a toast notification confirming the switch

## Technical Implementation

### Database Schema

#### Tenants Table
```typescript
interface Tenant {
  id: number;              // Auto-increment primary key
  name: string;            // Display name
  domain: string | null;   // Optional custom domain
  settings: object;        // Tenant-specific settings
  isActive: boolean;       // Whether tenant is active
  createdAt: Date;         // Creation timestamp
}
```

#### Users Table Enhancement
Users now have a `tenantId` field:
```typescript
interface User {
  // ... other fields
  tenantId: number;        // Current tenant (defaults to 1)
}
```

### Data Isolation

**Complete Tenant Isolation**: When a user switches tenants, they get a completely fresh start with no data transfer:

**Tenant-Specific Content** (filtered by `tenantId`):
- Categories (certifications)
- Subcategories (topic areas)
- Questions
- Study groups
- Practice tests
- Badges

**User Data** (filtered by both `userId` AND `tenantId`):
- Quizzes and quiz history
- User progress tracking
- Mastery scores
- Lectures
- User badges and achievements
- Game statistics (points, streaks, levels)
- Challenge attempts
- Practice test attempts

**What Persists Across Tenants:**
- User identity (email, name, profile)
- User account settings
- Authentication credentials

When switching tenants, the user maintains their identity but all learning progress, achievements, and activity history are isolated per tenant.

### IndexedDB Changes

The database version was upgraded from 1 to 2 to add the tenants store:
- `tenants` store with auto-increment ID
- Domain index for future domain-based tenant lookup
- Existing users are automatically migrated with `tenantId: 1`

## API Reference

### Auth Provider Methods

```typescript
// Switch to a different tenant
const { switchTenant } = useAuth();
await switchTenant(tenantId);
```

### Storage Methods

```typescript
// Get all tenants
const tenants = await clientStorage.getTenants();

// Get specific tenant
const tenant = await clientStorage.getTenant(tenantId);

// Create tenant
const newTenant = await clientStorage.createTenant({
  name: 'My Organization',
  domain: null,
  settings: {},
  isActive: true,
});

// Update tenant
await clientStorage.updateTenant(tenantId, {
  name: 'Updated Name',
  isActive: false,
});

// Get users by tenant
const users = await clientStorage.getUsersByTenant(tenantId);
```

### Query Client

Categories and subcategories are automatically filtered by the current user's tenant:
```typescript
// This automatically uses the user's current tenantId
const { data: categories } = useQuery({
  queryKey: ['/api/categories'],
});
```

## Development Guide

### Adding a New Tenant

To programmatically add a new tenant:

```typescript
import { clientStorage } from '@/lib/client-storage';

const newTenant = await clientStorage.createTenant({
  name: 'CompTIA Training',
  domain: null,
  settings: {
    focusArea: 'CompTIA Security+',
    theme: 'blue',
  },
  isActive: true,
});
```

### Creating Tenant-Specific Content

When creating categories, subcategories, or questions, specify the `tenantId`:

```typescript
const category = await clientStorage.createCategory({
  tenantId: 2,
  name: 'Security+',
  description: 'CompTIA Security+ Certification',
  icon: 'shield',
});
```

### Testing Tenant Switching

To test tenant switching in development:
1. Open the browser console
2. Use the tenant switcher UI to switch between tenants
3. Verify that categories and data change appropriately
4. Check IndexedDB to confirm data isolation

## Migration Guide

### For Existing Users

Existing users are automatically assigned to tenant 1 (Default Organization) when the database is upgraded. No manual migration is needed.

### For Developers

If you have custom code that creates categories, subcategories, or questions, ensure you specify a `tenantId`:

```typescript
// Old code (will default to tenant 1)
await clientStorage.createCategory({
  name: 'My Category',
});

// New code (explicitly set tenant)
await clientStorage.createCategory({
  tenantId: user.tenantId,  // Use current user's tenant
  name: 'My Category',
});
```

## Use Cases

### Educational Institutions
- Different departments can have separate tenants
- Each tenant can have its own certification programs
- Students automatically see content for their department

### Training Companies
- Separate tenants for different client organizations
- Customized content per client
- Isolated progress tracking and reporting

### Individual Users
- Switch between different certification paths
- Organize learning by topic area
- Maintain separate progress for different goals

## Future Enhancements

Potential future improvements to the tenant system:
- Tenant-level branding and theming
- Cross-tenant analytics for administrators
- Tenant invitation and user management
- Role-based permissions per tenant
- Tenant-level settings and preferences
- Export/import tenant data
- Multi-tenant domains (automatic tenant selection by domain)

## Security Considerations

- **Active Tenant Validation**: Users can only switch to active tenants. Both the UI (TenantSwitcher) and backend (auth-provider) validate that the target tenant is active before allowing the switch.
- **Data Isolation**: Data is isolated at the query level with tenantId filtering applied to:
  - Categories and subcategories (queryClient.ts)
  - Questions (filtered by tenantId index)
  - Study groups and practice tests (tenantId indices added for future filtering)
- **Tenant Access Control**: The switchTenant function validates that the tenant exists and is active before allowing the switch
- **Tenant ID Validation**: All tenant operations validate tenant IDs before processing
- **Query-Level Protection**: All queries respect the current user's tenantId to prevent cross-tenant data access

## Support

For questions or issues with tenant switching:
1. Check the browser console for error messages
2. Verify tenants exist in IndexedDB
3. Ensure user has a valid `tenantId`
4. Check that categories exist for the target tenant
5. Review this documentation for API usage

## Changelog

### Version 2 (Current)
- Added tenant table to IndexedDB
- Implemented tenant switcher UI component
- Added switchTenant method to auth provider
- Updated queries to filter by tenantId
- Created initial seed data for 3 tenants
- Added tenant management functions to client-storage

### Version 1
- Basic multi-tenant schema with tenantId fields
- No UI for tenant switching
- All users defaulted to tenant 1
