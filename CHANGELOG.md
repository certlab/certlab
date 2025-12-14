# Changelog

All notable changes to CertLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Firebase/Firestore as exclusive backend for cloud storage
- Firebase Authentication for secure user management
- Firestore security rules for per-user data isolation
- Firebase Hosting deployment automation
- IndexedDB as local cache for offline support

### Changed
- **BREAKING**: Firebase is now required (no longer optional)
- Updated all documentation to reflect Firebase as exclusive backend
- Removed PostgreSQL/server references from documentation
- Updated architecture diagrams to show Firebase backend
- Deprecated DATABASE_URL and server-related environment variables

### Removed
- Support for non-Firebase storage backends
- PostgreSQL/server configuration options
- Legacy server-side environment variables

## [2.0.0] - 2024-01

### Changed
- Complete migration to client-side architecture
- Transitioned from PostgreSQL to local-first storage
- Removed server-side dependencies and code
- Application runs in the browser with local storage

### Added
- Multi-tenancy support with tenant switching
- IndexedDB-based storage layer (`client-storage.ts`)
- Client-side authentication system
- Automatic data seeding for new users
- Export/import functionality for data backup
- Lazy loading for improved performance
- Code splitting with manual chunks
- Error boundaries for graceful error handling
- Accessibility improvements (skip links, ARIA labels)
- Seven theme options including dark mode

### Removed
- Server-side Express application
- PostgreSQL database (replaced with IndexedDB)
- Server-side authentication (Passport.js)
- AI lecture generation (OpenAI integration)
- Payment system (Polar integration)
- Multi-user collaboration features

### Migration Notes
- Users migrating from v1.x should export their data before upgrading
- Some features like AI lectures are no longer available
- Data initially stored locally in browser (Firebase integration added later)

## [1.0.0] - 2023

### Added
- Initial release with server-side architecture
- User authentication with Passport.js
- PostgreSQL database for data storage
- Quiz creation and taking functionality
- CISSP and CISM certification categories
- Achievement/badge system
- Study groups feature
- Practice tests
- AI-powered lecture generation (OpenAI)
- Payment integration (Polar)
- Admin dashboard

---

## Version History Summary

| Version | Release | Architecture | Key Features |
|---------|---------|--------------|--------------|
| Unreleased | 2024 | Firebase backend + IndexedDB cache | Cloud sync, Firebase Auth, offline support |
| 2.0.0 | 2024 | Client-side (IndexedDB only) | Multi-tenant, local-only |
| 1.0.0 | 2023 | Server-side (PostgreSQL) | Full-featured with AI/payments |

## Upgrade Guide

### From 1.x to 2.0

1. **Export your data** from the old version using the export feature
2. **Deploy the new version** (client-side only)
3. **Import your data** using the data import feature
4. **Note**: AI lecture generation is no longer available

### Breaking Changes in 2.0

- No server required - deploy to static hosting only
- User sessions are browser-specific (no cross-device sync in v2.0)
- Note: Firebase integration in future releases will add cloud sync

### From 2.x to Future (Firebase-based)

The latest version requires Firebase:
1. **Set up Firebase** following [FIREBASE_SETUP.md](FIREBASE_SETUP.md)
2. **Configure environment** with Firebase credentials in `.env.local`
3. **Deploy Firestore rules** using `npm run deploy:firestore`
4. **Existing data** will be migrated to Firestore on first Firebase login
- Single user per browser profile
- Study groups are local only (no real collaboration)

## Feature Status

| Feature | v1.0 | v2.0 | Notes |
|---------|------|------|-------|
| Quiz System | ✅ | ✅ | Core functionality |
| Achievements | ✅ | ✅ | Badge system |
| Progress Tracking | ✅ | ✅ | Per-user, per-tenant |
| Study Groups | ✅ | ⚠️ | Local only in v2 |
| Practice Tests | ✅ | ✅ | Full support |
| AI Lectures | ✅ | ❌ | Removed in v2 |
| Payments | ✅ | ❌ | Removed in v2 |
| Offline Mode | ❌ | ✅ | New in v2 |
| Multi-Tenant | ❌ | ✅ | New in v2 |
| Export/Import | ❌ | ✅ | New in v2 |

---

[Unreleased]: https://github.com/archubbuck/certlab/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/archubbuck/certlab/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/archubbuck/certlab/releases/tag/v1.0.0
