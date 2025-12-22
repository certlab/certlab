# CertLab Documentation

This directory contains all technical documentation for the CertLab project.

## 📁 Documentation Structure

### Setup Guides (`setup/`)
Step-by-step instructions for configuring and deploying CertLab:

- **[firebase.md](setup/firebase.md)** - Firebase configuration for cloud sync
- **[google-auth.md](setup/google-auth.md)** - Google OAuth authentication setup
- **[dynatrace.md](setup/dynatrace.md)** - Dynatrace observability and monitoring
- **[dependabot.md](setup/dependabot.md)** - Automated dependency management
- **[deployment.md](setup/deployment.md)** - Deployment to Firebase Hosting and other platforms

### Architecture (`architecture/`)
Technical design and system architecture documentation:

- **[overview.md](architecture/overview.md)** - System design, data flow, and technical decisions
- **[state-management.md](architecture/state-management.md)** - State management patterns and best practices
- **[ADR-001-authentication-authorization.md](architecture/ADR-001-authentication-authorization.md)** - ⭐ Standard approach for auth, authorization, user state, and route protection
- **[firebase-status.md](architecture/firebase-status.md)** - Firebase integration implementation status

### Features (`features/`)
Feature-specific documentation:

- **[tenant-switching.md](features/tenant-switching.md)** - Multi-tenancy feature documentation

### Project Organization

- **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)** - Complete repository structure guide

### Implementation Guides

- **[AUTHENTICATION_QUICK_REFERENCE.md](AUTHENTICATION_QUICK_REFERENCE.md)** - ⚡ Quick reference for auth patterns
- **[AUTHENTICATION_CHECKLIST.md](AUTHENTICATION_CHECKLIST.md)** - ⭐ Developer checklist for implementing auth features
- **[USER_STATE_VALIDATION.md](USER_STATE_VALIDATION.md)** - User state testing and validation guide
- **[USER_STATE_SUMMARY.md](USER_STATE_SUMMARY.md)** - User state configuration summary

### Additional Documentation

- **[user-manual.md](user-manual.md)** - End-user guide and feature walkthrough
- **[dynatrace-examples.md](dynatrace-examples.md)** - Practical Dynatrace integration examples
- **[dynatrace-integration.md](dynatrace-integration.md)** - Dynatrace integration summary
- **[test-report.md](test-report.md)** - Testing coverage and results
- **[favicon-options.md](favicon-options.md)** - Favicon design options
- **[known-issues.md](known-issues.md)** - Known issues and planned improvements

## 📖 Root-Level Documentation

Essential project documents in the repository root:

- **[../README.md](../README.md)** - Project overview and quick start guide
- **[../FEATURES.md](../FEATURES.md)** - 📋 Complete list of all implemented features
- **[../ROADMAP.md](../ROADMAP.md)** - 🗺️ Planned features and future direction
- **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines and development workflow
- **[../CHANGELOG.md](../CHANGELOG.md)** - Version history and release notes
- **[../SECURITY.md](../SECURITY.md)** - Security policy and vulnerability reporting
- **[../LICENSE](../LICENSE)** - MIT License

## 🚀 Getting Started

New to CertLab? Start here:

1. **[../README.md](../README.md)** - Project overview and quick start
2. **[../FEATURES.md](../FEATURES.md)** - Explore all available features
3. **[setup/deployment.md](setup/deployment.md)** - Deploy your own instance
4. **[architecture/overview.md](architecture/overview.md)** - Understand the architecture
5. **[user-manual.md](user-manual.md)** - Learn how to use CertLab

### Planning & Roadmap

Want to know what's coming next?

1. **[../ROADMAP.md](../ROADMAP.md)** - 🗺️ Short, mid, and long-term plans
2. **[../CHANGELOG.md](../CHANGELOG.md)** - Version history and past releases
3. **[known-issues.md](known-issues.md)** - Current issues and planned improvements

### Implementing Features

Developing new features? See:

1. **[architecture/ADR-001-authentication-authorization.md](architecture/ADR-001-authentication-authorization.md)** - Auth standard approach (ADR)
2. **[AUTHENTICATION_CHECKLIST.md](AUTHENTICATION_CHECKLIST.md)** - Step-by-step implementation guide
3. **[architecture/state-management.md](architecture/state-management.md)** - State management patterns

## 🤝 Contributing

Want to contribute? See:

- **[../CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines
- **[architecture/state-management.md](architecture/state-management.md)** - State management patterns
- **[known-issues.md](known-issues.md)** - Known issues that need fixing

## 🔗 Quick Links

| Topic | Document | Description |
|-------|----------|-------------|
| **Features** | [../FEATURES.md](../FEATURES.md) | 📋 All implemented features |
| **Roadmap** | [../ROADMAP.md](../ROADMAP.md) | 🗺️ Planned features & timeline |
| **Organization** | [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Repository structure guide |
| **Setup** | [setup/firebase.md](setup/firebase.md) | Configure cloud sync |
| **Setup** | [setup/deployment.md](setup/deployment.md) | Deploy to production |
| **Architecture** | [architecture/overview.md](architecture/overview.md) | System design |
| **Authentication** | [architecture/ADR-001-authentication-authorization.md](architecture/ADR-001-authentication-authorization.md) | ⭐ Auth standard (ADR) |
| **Implementation** | [AUTHENTICATION_CHECKLIST.md](AUTHENTICATION_CHECKLIST.md) | ⭐ Dev checklist |
| **User Guide** | [user-manual.md](user-manual.md) | End-user documentation |
| **Development** | [../CONTRIBUTING.md](../CONTRIBUTING.md) | How to contribute |

---

**Questions?** Check [known-issues.md](known-issues.md) or open an issue on GitHub.
