# CertLab Feature Documentation

This directory contains detailed documentation for individual features and implementations.

## Feature Documentation Index

### Analytics & Insights
- **[Analytics UI Guide](ANALYTICS_UI_GUIDE.md)** - Visual wireframes and UI guidelines for the analytics dashboard
- **[Performance Insights Architecture](../architecture/PERFORMANCE_INSIGHTS_ARCHITECTURE.md)** - System architecture for performance insights
- **[Performance Insights Implementation](PERFORMANCE_INSIGHTS_IMPLEMENTATION.md)** - Implementation details for performance insights
- **[Smart Recommendations Docs](SMART_RECOMMENDATIONS_DOCS.md)** - Complete documentation for smart study recommendations
- **[Smart Recommendations UI](SMART_RECOMMENDATIONS_UI.md)** - UI design for smart recommendations

### Gamification & Challenges
- **[Daily Challenges (Firestore)](DAILY_CHALLENGES_FIRESTORE.md)** - Firestore implementation for daily challenges
- **[Daily Rewards Implementation](DAILY_REWARDS_IMPLEMENTATION.md)** - Reward system implementation details

### Study Features
- **[Study Timer Integration](STUDY_TIMER_INTEGRATION.md)** - Study timer and Pomodoro integration
- **[Study Timer Mockup](STUDY_TIMER_MOCKUP.md)** - Visual mockups for study timer feature

### UI/UX Improvements
- **[Dashboard Redesign](DASHBOARD_REDESIGN.md)** - Dashboard layout redesign documentation (archived - completed)
- **[Heatmap Firebase Requirement](HEATMAP_FIREBASE_REQUIREMENT.md)** - Firebase requirements for contribution heatmap
- **[Tenant Switching](tenant-switching.md)** - Multi-tenancy switching feature

### Marketplace
- **[Marketplace Implementation](MARKETPLACE_IMPLEMENTATION.md)** - Implementation details for the marketplace feature

## Organization

Feature documentation is organized into subdirectories:

- **`/docs/features/`** - Individual feature documentation and implementation details
- **`/docs/architecture/`** - System architecture and design documents
- **`/docs/requirements/`** - Feature requirements and design documents (FRD)
- **`/docs/setup/`** - Setup and configuration guides

## Root-Level Documentation

For high-level documentation, see:

- **[README.md](../../README.md)** - Main project documentation
- **[FEATURES.md](../../FEATURES.md)** - Complete feature catalog
- **[ROADMAP.md](../../ROADMAP.md)** - Product roadmap and future plans
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)** - Contribution guidelines
- **[CHANGELOG.md](../../CHANGELOG.md)** - Version history

## Contributing

When adding new feature documentation:

1. Place detailed implementation docs in `/docs/features/`
2. Place architecture diagrams and system designs in `/docs/architecture/`
3. Keep only high-level summaries in the root directory
4. Update this index when adding new documentation
5. Use clear, descriptive filenames (e.g., `FEATURE_NAME_IMPLEMENTATION.md`)
