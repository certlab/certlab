# Custom Branding and Theming Implementation Summary

## Overview
CertLab now supports custom branding and theming, allowing organizations to personalize their learning platform with custom logos, colors, typography, and theme configurations.

## Features Implemented

### 1. Data Model & Storage (Firestore)

#### Organization Branding (`OrganizationBranding` interface)
- **Visual Identity**
  - Custom logo URL with configurable dimensions
  - Favicon URL for browser tabs
  - Optional splash screen with duration control
  - Organization name and tagline

- **Color Customization**
  - Primary color (buttons, links, primary elements)
  - Secondary color (supporting elements)
  - Accent color (highlights and notifications)
  - Background color (main application background)
  - Surface color (cards and elevated surfaces)

- **Typography**
  - Custom body font family
  - Custom heading font family
  - Advanced custom CSS injection

- **Theme Configuration**
  - Default theme selection (from 7 available themes)
  - Control over user theme selection permissions
  - Selective theme enablement (choose which themes users can access)

#### User Theme Preferences (`UserThemePreferences` interface)
- User-selected theme stored in Firestore
- Persists across devices and sessions
- Falls back to localStorage for offline support

### 2. Context Providers

#### BrandingProvider (`/client/src/lib/branding-provider.tsx`)
- Loads organization branding from Firestore on app initialization
- Applies branding to DOM via CSS custom properties
- Provides hooks for accessing branding: `useBranding()`
- Supports real-time branding updates
- Automatic favicon and custom CSS injection

#### Enhanced ThemeProvider (`/client/src/lib/theme-provider.tsx`)
- Persists user theme selection to Firestore
- Syncs theme across devices
- Falls back to localStorage for immediate UI response
- Loads user preferences on login

### 3. Storage Layer

#### Firestore Collections
- `/tenants/{tenantId}/branding/config` - Organization branding configuration
- `/users/{userId}/preferences/theme` - User theme preferences

#### Storage Methods
- `getOrganizationBranding(tenantId)` - Retrieve org branding
- `setOrganizationBranding(branding)` - Save/update org branding (admin only)
- `getUserThemePreferences(userId)` - Get user's theme preferences
- `setUserThemePreferences(preferences)` - Save user's theme choice
- `updateUserThemePreferences(userId, updates)` - Partial update

### 4. Admin Interface

#### Organization Branding Settings (`/client/src/components/OrganizationBrandingSettings.tsx`)
Comprehensive admin UI with four tabs:

**Colors Tab**
- Color pickers with hex value inputs
- Live preview of selected colors
- Primary, secondary, accent, background, and surface colors

**Visual Identity Tab**
- Organization name and tagline inputs
- Logo URL with dimension controls
- Favicon URL configuration
- Optional splash screen settings

**Typography Tab**
- Body font family selection
- Heading font family selection
- Custom CSS textarea for advanced customization

**Themes Tab**
- Default theme selection dropdown
- Toggle for allowing user theme selection
- Multi-select for enabling specific themes
- Visual theme list with icons

#### Admin Dashboard Integration
- New "Branding" tab in admin dashboard (`/admin`)
- Accessible to admin users only
- Save/Reset functionality with validation

### 5. User Experience

#### Header Component (`/client/src/components/Header.tsx`)
- Displays organization logo when configured
- Shows organization name from branding
- Uses custom logo dimensions
- Falls back to default Shield icon when no logo is set

#### Theme Selector
- Respects organization branding settings
- Filters themes based on `enabledThemes` configuration
- Shows only default theme if user selection is disabled
- Displays helpful message about theme restrictions

### 6. CSS Variable Integration
The BrandingProvider automatically injects custom colors as CSS variables:
```css
--brand-primary
--brand-secondary
--brand-accent
--brand-background
--brand-surface
--brand-font-family
--brand-heading-font-family
```

These are also aliased to:
```css
--primary (aliased to --brand-primary)
--accent (aliased to --brand-accent)
```

## Available Themes
All 8 existing themes work with custom branding:
1. **Light** - Clean and bright
2. **Dark** - Easy on the eyes
3. **High Contrast** - WCAG AAA compliant
4. **Nord** - Cool arctic palette
5. **Catppuccin** - Warm and cozy
6. **Tokyo Night** - Vibrant neon dark
7. **Dracula** - Bold purple dark
8. **Rose Pine** - Soft pastel elegance

## Usage Guide

### For Administrators

#### Setting Up Organization Branding
1. Navigate to `/admin` in the application
2. Click on the "Branding" tab
3. Configure your organization's branding:
   - **Colors**: Use color pickers to select your brand colors
   - **Visual Identity**: Add your logo URL and organization name
   - **Typography**: Choose custom fonts if desired
   - **Themes**: Select default theme and enable specific themes for users
4. Click "Save Changes"

#### Branding Best Practices
- **Logo**: Use PNG or SVG format, recommended size 40x40px or larger
- **Colors**: Ensure sufficient contrast for accessibility (use WCAG guidelines)
- **Favicon**: Use 16x16 or 32x32 ICO or PNG format
- **Custom CSS**: Test thoroughly before deploying

### For Users

#### Selecting a Theme
1. Click on your profile avatar in the header
2. Select "Theme" from the dropdown menu
3. Choose from available themes (as configured by your organization)
4. Your selection is automatically saved and synced across devices

## Technical Architecture

### Firestore Security Rules
Ensure these rules are added to protect branding data:

```javascript
// Tenant branding (admin access only)
match /tenants/{tenantId}/branding/config {
  allow read: if true; // Public read for branding
  allow write: if request.auth != null && 
               get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// User theme preferences (user access only)
match /users/{userId}/preferences/theme {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

### Provider Hierarchy
```
App
├── QueryClientProvider
├── AuthProvider
├── BrandingProvider  ← Loads org branding
│   ├── ThemeProvider  ← Applies user theme
│   │   └── Application Components
```

### CSS Cascade
1. Base Tailwind CSS
2. Theme CSS classes (light, dark, nord, etc.)
3. Organization branding CSS variables
4. Custom CSS (if provided)

## Future Enhancements
Potential areas for expansion:
- [ ] Image upload directly in admin UI (currently uses URLs)
- [ ] Brand color preview in real-time
- [ ] Theme customization per user (beyond selection)
- [ ] Dark mode auto-detection based on system preferences
- [ ] Import/export branding configurations
- [ ] Branding templates library
- [ ] Advanced CSS editor with syntax highlighting

## Testing Checklist
- [x] Branding configuration saves to Firestore
- [x] Logo displays in header when configured
- [x] Organization name shows in header
- [x] Theme selection respects org settings
- [x] User theme preferences persist across sessions
- [x] Custom colors apply via CSS variables
- [x] Theme filtering works correctly
- [x] Build completes successfully
- [ ] Manual testing across all pages
- [ ] Accessibility testing (WCAG compliance)
- [ ] Cross-browser testing
- [ ] Mobile responsive testing

## Documentation
- Schema: `/shared/schema.ts` - Lines 211-330 (OrganizationBranding, UserThemePreferences)
- Branding Provider: `/client/src/lib/branding-provider.tsx`
- Theme Provider: `/client/src/lib/theme-provider.tsx`
- Storage: `/client/src/lib/firestore-storage.ts` - Lines 5430-5540
- Admin UI: `/client/src/components/OrganizationBrandingSettings.tsx`
- Header Integration: `/client/src/components/Header.tsx`

## Migration Notes
For existing installations:
1. No database migration required (Firestore is schemaless)
2. Branding is optional - app works without configuration
3. Existing theme preferences in localStorage are preserved
4. First admin login will create default branding document if needed
