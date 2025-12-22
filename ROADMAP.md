# CertLab Roadmap

This document outlines the planned features, enhancements, and future direction for CertLab.

**Last Updated**: December 2024  
**Version**: 2.0.0

---

## Table of Contents

- [Vision & Goals](#vision--goals)
- [Current Status](#current-status)
- [Short-Term Roadmap (Q1-Q2 2025)](#short-term-roadmap-q1-q2-2025)
- [Mid-Term Roadmap (Q3-Q4 2025)](#mid-term-roadmap-q3-q4-2025)
- [Long-Term Vision (2026+)](#long-term-vision-2026)
- [Features Under Consideration](#features-under-consideration)
- [Community Requests](#community-requests)
- [Deprecations & Removals](#deprecations--removals)

---

## Vision & Goals

CertLab aims to be the **premier open-source certification study platform** that:

1. **Empowers Learners**: Provides effective tools for certification exam preparation
2. **Respects Privacy**: Offers local-only mode with optional cloud sync
3. **Stays Accessible**: Maintains WCAG 2.1 AA compliance and keyboard navigation
4. **Remains Open**: MIT licensed and community-driven
5. **Embraces Innovation**: Integrates modern learning science and technology

### Core Principles

- **Privacy First**: Users control their data
- **Offline Capable**: Works without internet connection
- **Open Source**: Transparent and community-driven
- **Accessible**: Available to all learners
- **Effective**: Evidence-based learning methods

---

## Current Status

**Version**: 2.0.0  
**Architecture**: Client-side SPA with hybrid storage (IndexedDB + optional Firestore)  
**Status**: Production-ready with active development

### Recent Milestones

- ✅ **v2.0.0 Released** (January 2024)
  - Complete migration to client-side architecture
  - Multi-tenancy support
  - Hybrid storage model (local + cloud)
  - Firebase/Firestore integration (95% complete)
  - Comprehensive test suite (147+ tests)
  - Full accessibility compliance

### Current Focus Areas

1. **Stability & Bug Fixes**: Addressing user-reported issues
2. **Firebase Integration**: Completing remaining 5% of cloud sync
3. **Documentation**: Keeping guides up-to-date
4. **Performance**: Optimizing bundle size and load times
5. **Mobile Experience**: Enhancing mobile UI/UX

---

## Short-Term Roadmap (Q1-Q2 2025)

### Q1 2025: Firebase Completion & Enhancement

#### Firebase/Firestore Integration (5% Remaining)

**Priority**: High  
**Status**: In Progress (95% complete)

- [ ] Complete real-time sync edge cases
- [ ] Implement conflict resolution strategies
- [ ] Add offline queue with retry logic
- [ ] Optimize Firestore query performance
- [ ] Add Firestore connection status indicators
- [ ] Comprehensive Firestore testing

**Related Issues**: Firebase implementation status tracked in `docs/architecture/firebase-status.md`

#### Mobile Experience Improvements

**Priority**: High  
**Status**: Planned

- [ ] Enhanced touch gestures for quiz navigation
- [ ] Improved mobile keyboard handling
- [ ] Optimized mobile layouts for all pages
- [ ] Bottom navigation for mobile
- [ ] Swipe actions for quiz questions
- [ ] Mobile-specific performance optimizations

#### Progressive Web App (PWA)

**Priority**: Medium  
**Status**: Infrastructure Ready (50% complete)

- [x] Service worker infrastructure
- [x] Offline capability via IndexedDB
- [x] App manifest
- [ ] Complete PWA certification
- [ ] Add-to-home-screen prompts
- [ ] App install instructions
- [ ] Push notifications support
- [ ] Background sync
- [ ] Offline-first optimizations

### Q2 2025: Learning Enhancements

#### Spaced Repetition System (SRS)

**Priority**: High  
**Status**: Planned

A scientifically-proven learning method:

- [ ] Implement SRS algorithm (SM-2 or similar)
- [ ] Track question review intervals
- [ ] Smart review scheduling
- [ ] Due questions dashboard
- [ ] Review queue management
- [ ] Performance-based interval adjustment
- [ ] SRS statistics and analytics

**Benefits**: Improved long-term retention and more efficient studying.

#### Enhanced Study Materials

**Priority**: Medium  
**Status**: Planned

- [ ] Rich text editor for study notes
- [ ] Markdown support in lectures
- [ ] Image uploads for notes
- [ ] Code snippet support
- [ ] Formula rendering (LaTeX)
- [ ] Table support
- [ ] Note sharing (with permissions)
- [ ] Export notes to PDF/Markdown

#### Question Explanations V2

**Priority**: Medium  
**Status**: Planned

- [ ] Detailed step-by-step explanations
- [ ] Reference links to study materials
- [ ] Video explanation support
- [ ] Community-contributed explanations
- [ ] Explanation voting system
- [ ] Alternative explanation views

#### Smart Study Recommendations

**Priority**: Medium  
**Status**: Designed

- [ ] AI-powered weak area detection
- [ ] Personalized study plan generation
- [ ] Daily study recommendations
- [ ] Optimal question difficulty selection
- [ ] Study time optimization
- [ ] Certification readiness assessment

---

## Mid-Term Roadmap (Q3-Q4 2025)

### Q3 2025: Collaboration & Community

#### Real-Time Study Groups

**Priority**: High  
**Status**: Designed (requires Cloud Sync)

Enable true collaborative learning:

- [ ] Real-time group quiz sessions
- [ ] Live leaderboards within groups
- [ ] Group chat/discussion threads
- [ ] Shared question pools
- [ ] Group study schedules
- [ ] Member roles and permissions
- [ ] Group analytics dashboard
- [ ] Public vs private groups

#### Community Question Bank

**Priority**: Medium  
**Status**: Under Consideration

- [ ] User-contributed questions
- [ ] Question review and approval system
- [ ] Quality voting system
- [ ] Plagiarism detection
- [ ] Attribution system
- [ ] Licensing framework
- [ ] Question improvement suggestions
- [ ] Community moderation tools

#### Instructor/Mentor Features

**Priority**: Medium  
**Status**: Under Consideration

- [ ] Instructor accounts
- [ ] Create custom question sets
- [ ] Assign quizzes to students
- [ ] Track student progress
- [ ] Provide feedback
- [ ] Virtual classroom integration
- [ ] Grading and assessment tools

### Q4 2025: AI & Advanced Features

#### AI-Powered Features

**Priority**: Medium  
**Status**: Exploratory (requires external API or local models)

**Note**: Original AI lecture generation was removed in v2.0. Reconsidering with privacy-first approach.

Options under consideration:

1. **Local AI Models** (Privacy-preserving)
   - Browser-based models (WebLLM, ONNX)
   - No data sent to external servers
   - Limited by device capabilities
   
2. **Optional External AI** (User opt-in)
   - User provides their own API key
   - Clear data usage disclosure
   - Full transparency

**Potential AI Features**:
- [ ] Question generation from study materials
- [ ] Explanation generation
- [ ] Study plan optimization
- [ ] Personalized hints
- [ ] Natural language Q&A
- [ ] Concept relationship mapping

**Constraints**: Must maintain privacy-first approach and offline capability.

#### Advanced Analytics

**Priority**: Medium  
**Status**: Planned

- [ ] Learning curve visualization
- [ ] Predicted exam readiness
- [ ] Performance forecasting
- [ ] Study efficiency metrics
- [ ] Time investment optimization
- [ ] Retention curve analysis
- [ ] Comparative analytics (anonymized)

#### Gamification V2

**Priority**: Low-Medium  
**Status**: Planned

- [ ] Daily/weekly challenges with rewards
- [ ] Seasonal events and competitions
- [ ] Global leaderboards (opt-in)
- [ ] Team competitions
- [ ] Badge showcase customization
- [ ] Profile customization
- [ ] Social features (opt-in)
- [ ] Streak freeze/insurance system

---

## Long-Term Vision (2026+)

### Certification Ecosystem

**Vision**: Comprehensive platform for all certification learning

- [ ] Expand to 20+ certifications
  - AWS certifications
  - Azure certifications
  - Google Cloud certifications
  - Kubernetes certifications
  - CompTIA full suite
  - ISC2 certifications
  - ISACA certifications
  - Project Management (PMP, CAPM)
  - And more...

- [ ] Industry partnerships
- [ ] Official exam preparation recognition
- [ ] Certification pathways and guides
- [ ] Job market integration

### Advanced Learning Science

**Vision**: Evidence-based, scientifically-optimized learning

- [ ] Cognitive load management
- [ ] Interleaved practice
- [ ] Retrieval practice optimization
- [ ] Elaborative interrogation
- [ ] Self-explanation prompts
- [ ] Learning style adaptation
- [ ] Metacognitive skill development

### Platform Expansion

**Vision**: Multi-platform support

- [ ] Native mobile apps (iOS/Android)
- [ ] Desktop applications (Electron)
- [ ] Browser extensions
- [ ] Watch app (study reminders)
- [ ] API for third-party integrations
- [ ] Zapier/IFTTT integration

### Monetization (Optional, User Choice)

**Vision**: Sustainable development while keeping core free

Current CertLab is 100% free. For sustainability, considering:

- [ ] **Keep core features free forever**
- [ ] Optional premium features:
  - Advanced analytics
  - AI-powered features
  - Priority support
  - Custom branding
  - Team management features
  - Extended storage
- [ ] Self-hosted enterprise version
- [ ] Sponsorship program
- [ ] Donations via GitHub Sponsors

**Commitment**: Core learning features will always remain free and open-source.

---

## Features Under Consideration

These features are being evaluated based on community feedback, technical feasibility, and alignment with project goals.

### High Interest

#### Video-Based Learning

**Status**: Under Consideration  
**Complexity**: High (storage, hosting, player)

- [ ] Video lecture support
- [ ] Video explanations for questions
- [ ] External video linking (YouTube, etc.)
- [ ] Offline video caching

**Challenges**: Storage costs, bandwidth, accessibility (transcripts/captions required)

#### Voice-Based Learning

**Status**: Under Consideration  
**Complexity**: Medium

- [ ] Audio explanations
- [ ] Text-to-speech for questions
- [ ] Voice commands
- [ ] Podcast-style content

**Benefits**: Hands-free studying, accessibility

#### Browser Extension

**Status**: Under Consideration  
**Complexity**: Medium

- [ ] Quick quiz from any page
- [ ] Save web content to study notes
- [ ] Study reminder notifications
- [ ] New tab dashboard

### Medium Interest

#### Peer Learning Features

**Status**: Under Consideration  
**Complexity**: Medium-High

- [ ] Question discussion forums
- [ ] Peer answer explanations
- [ ] Study partner matching
- [ ] Knowledge exchange system

#### Custom Certification Builder

**Status**: Under Consideration  
**Complexity**: High

- [ ] Create custom certifications
- [ ] Define learning paths
- [ ] Generate certificates
- [ ] Share with community

#### Integration with LMS

**Status**: Under Consideration  
**Complexity**: High

- [ ] SCORM export
- [ ] LTI integration
- [ ] Canvas integration
- [ ] Moodle integration
- [ ] Blackboard integration

### Low Priority (But Cool!)

#### Virtual Reality (VR) Study Mode

**Status**: Exploratory  
**Complexity**: Very High

- Immersive study environments
- 3D visualization of concepts
- VR quiz experiences

**Constraints**: Requires VR hardware, complex development

#### Blockchain Credentials

**Status**: Exploratory  
**Complexity**: High

- Blockchain-based achievement records
- Decentralized credential verification
- NFT badges (optional)

**Considerations**: Environmental impact, technical complexity, user understanding

---

## Community Requests

This section tracks features requested by the community. **Want to see something here?** [Open an issue](https://github.com//certlab/issues/new)!

### Requested Features

#### From Users

1. **Question Bookmarking** (High demand)
   - Status: Planned for Q2 2025
   - Allow users to bookmark specific questions for later review

2. **Quiz Templates** (Medium demand)
   - Status: Under Consideration
   - Save quiz configurations as templates
   - Share templates with others

3. **Study Reminders** (Medium demand)
   - Status: Planned for PWA implementation
   - Daily study notifications
   - Goal tracking reminders

4. **Dark Mode Improvements** (Medium demand)
   - Status: Ongoing
   - More theme customization
   - Automatic theme switching (time-based)

5. **Export to Anki** (Low-Medium demand)
   - Status: Under Consideration
   - Export questions in Anki format
   - Integration with spaced repetition

6. **Multi-Language Support** (Low demand currently)
   - Status: Future consideration
   - i18n infrastructure
   - Community translations

#### From Contributors

1. **Better Developer Onboarding**
   - Status: In Progress
   - More code documentation
   - Architecture decision records
   - Setup automation

2. **Plugin System**
   - Status: Long-term consideration
   - Extensibility framework
   - Community plugins
   - Plugin marketplace

3. **GraphQL API**
   - Status: Low priority
   - Alternative to REST
   - Better data fetching

---

## Technical Roadmap

### Code Quality & Maintainability

#### Q1-Q2 2025

- [ ] Reduce TypeScript errors to zero
- [ ] Achieve 80%+ test coverage
- [ ] Add more integration tests
- [ ] Add E2E tests with Playwright
- [ ] Performance benchmarking suite
- [ ] Automated accessibility testing
- [ ] Bundle size monitoring

#### Q3-Q4 2025

- [ ] Migrate to React Server Components (if beneficial)
- [ ] Consider migrating to Next.js (evaluate benefits)
- [ ] Implement micro-frontends (if needed)
- [ ] Advanced state management (if needed)
- [ ] Code splitting optimization

### Infrastructure

#### 2025

- [ ] CDN optimization
- [ ] Image optimization and lazy loading
- [ ] Database query optimization
- [ ] Caching strategy improvements
- [ ] Monitoring and alerting
- [ ] Error tracking and reporting
- [ ] Analytics dashboard for developers

#### 2026+

- [ ] Global edge deployment
- [ ] Multi-region support
- [ ] Advanced disaster recovery
- [ ] Horizontal scaling support
- [ ] Kubernetes deployment options

---

## Deprecations & Removals

### Removed in v2.0.0 (2024)

The following features were removed during the v1 to v2 migration:

1. **Server-Side Architecture**
   - PostgreSQL database
   - Express.js server
   - Server-side rendering
   
2. **AI Lecture Generation**
   - OpenAI integration
   - AI-powered content creation
   - **Reason**: Cost, privacy concerns, dependency on external API
   - **Future**: Reconsidering with privacy-first approach (local models)

3. **Payment System**
   - Polar payment integration
   - Credit purchase system
   - Marketplace payments
   - **Reason**: Complexity, maintenance burden
   - **Future**: May reconsider with different provider for premium features

4. **Multi-User Collaboration** (Temporarily)
   - Real-time collaboration
   - User-to-user messaging
   - **Reason**: Required server-side infrastructure
   - **Future**: Planned with Firebase cloud sync

### Planned Deprecations

#### 2025

- [ ] **Legacy Storage Migration**
  - Deprecate IndexedDB schema v1
  - Provide migration tools
  - Support window: 6 months after v2.1 release

#### 2026

- [ ] **Old Theme System** (Maybe)
  - If UI is significantly redesigned
  - Provide theme migration guide

---

## How to Influence the Roadmap

We welcome community input! Here's how you can help shape CertLab's future:

### 1. Vote on Existing Issues

Browse [GitHub Issues](https://github.com/archubbuck/certlab/issues) and add 👍 reactions to features you'd like to see.

### 2. Propose New Features

[Open a new issue](https://github.com/archubbuck/certlab/issues/new) with:
- Clear description of the feature
- Use cases and benefits
- Mockups or examples (if applicable)
- Willingness to contribute (if applicable)

### 3. Contribute Code

Check [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Setting up your development environment
- Finding good first issues
- Submitting pull requests
- Code review process

### 4. Share Feedback

- Join discussions on GitHub
- Share your experience with CertLab
- Report bugs
- Suggest improvements

### 5. Sponsor Development

If you benefit from CertLab and want to support development:
- GitHub Sponsors (when available)
- Contribute developer time
- Provide infrastructure/hosting

---

## Release Schedule

CertLab follows semantic versioning: `MAJOR.MINOR.PATCH`

### Release Cadence

- **Major Releases** (x.0.0): Yearly or when breaking changes needed
- **Minor Releases** (2.x.0): Quarterly with new features
- **Patch Releases** (2.0.x): As needed for bug fixes

### Upcoming Releases

- **v2.1.0** (Q1 2025): Firebase completion, mobile enhancements
- **v2.2.0** (Q2 2025): SRS implementation, PWA completion
- **v2.3.0** (Q3 2025): Collaboration features, community question bank
- **v2.4.0** (Q4 2025): AI features, advanced analytics
- **v3.0.0** (2026): Major architecture changes (if needed)

---

## Success Metrics

We measure success by:

### User Metrics
- Active users (local + cloud)
- Quiz completion rate
- Study streak maintenance
- Certification success stories
- User satisfaction scores

### Technical Metrics
- Page load performance (< 2s)
- Test coverage (> 80%)
- Build time (< 30s)
- Bundle size (< 500KB gzipped)
- Accessibility score (100%)

### Community Metrics
- GitHub stars and forks
- Contributor count
- Issue response time (< 48h)
- Community engagement
- Documentation quality

---

## Questions & Feedback

Have questions about the roadmap? Want to discuss priorities?

- **GitHub Issues**: [Open an issue](https://github.com/archubbuck/certlab/issues/new)
- **GitHub Discussions**: [Start a discussion](https://github.com/archubbuck/certlab/discussions)
- **Email**: Check [CONTRIBUTING.md](CONTRIBUTING.md) for contact information

---

## Changelog

| Date | Change |
|------|--------|
| Dec 2024 | Initial roadmap created for v2.0.0 |
| Dec 2024 | Added community requests section |
| Dec 2024 | Added technical roadmap |

---

**This is a living document.** The roadmap will evolve based on user feedback, technical constraints, and project resources. Check back regularly for updates!

**Related Documents**:
- [FEATURES.md](FEATURES.md) - Complete list of current features
- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
