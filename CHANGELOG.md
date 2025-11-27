# Changelog

All notable changes to CertLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation for developers (CONTRIBUTING.md, ARCHITECTURE.md)
- Code comments for complex logic in key files
- Developer onboarding instructions
- Test infrastructure documentation

### Changed
- Updated README with expanded installation and setup instructions
- Updated project structure documentation to include test directory and vitest configuration
- Added Vitest to technology stack documentation

## [2.0.0] - 2024-01

### Changed
- Complete migration to client-side only architecture
- All data now stored in browser's IndexedDB
- Removed server-side dependencies and code
- Application now runs entirely in the browser

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
- PostgreSQL database dependency
- Server-side authentication (Passport.js)
- AI lecture generation (OpenAI integration)
- Payment system (Polar integration)
- Multi-user collaboration features

### Migration Notes
- Users migrating from v1.x should export their data before upgrading
- Some features like AI lectures are no longer available
- All user data now stored locally in the browser

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
| 2.0.0 | 2024 | Client-side (IndexedDB) | Multi-tenant, offline-capable |
| 1.0.0 | 2023 | Server-side (PostgreSQL) | Full-featured with AI/payments |

## Upgrade Guide

### From 1.x to 2.0

1. **Export your data** from the old version using the export feature
2. **Deploy the new version** (client-side only)
3. **Import your data** using the data import feature
4. **Note**: AI lecture generation is no longer available

### Breaking Changes in 2.0

- No server required - deploy to static hosting only
- User sessions are browser-specific (no cross-device sync)
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
