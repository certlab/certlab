# Cert Lab

## Overview
Cert Lab is an AI-powered certification learning platform featuring Helen, an intelligent learning assistant. It offers an advanced learning environment for mastering certifications through AI-guided experiences, adaptive assessments, personalized study paths, and intelligent feedback. The platform aims to be a comprehensive "Cert Lab" study environment, preparing users for certifications with practical, AI-supported learning.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Updates (October 2025)
- **Fixed subscription email issue**: Resolved session data caching - subscription system now fetches fresh user data from database to recognize email updates immediately
- **Simplified dashboard**: Reduced clutter on /app with focused layout showing only essential information
- **Enhanced routing**: Separated marketing landing page (/) from authenticated dashboard (/app)

## System Architecture

### Core Technologies
- **Frontend**: React with TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Backend**: Express.js with TypeScript.
- **Database**: PostgreSQL with Drizzle ORM.
- **State Management**: TanStack Query.
- **Routing**: Wouter.

### Design Principles
- **UI/UX**: Modern, borderless design with enhanced shadows and clear visual hierarchy. Emphasizes spacious card layouts, improved typography, and consistent visual priority.
- **Mobile Responsiveness**: Comprehensive mobile optimization with touch-friendly components, responsive layouts, and a dedicated mobile navigation system.
- **Theming**: Implemented a comprehensive theme system with 7 distinct color schemes (Light, Dark, Ocean, Forest, Sunset, Purple, High Contrast) and WCAG contrast compliance.
- **User Engagement**: Incorporates gamification elements like a daily learning streak, achievement badges, XP, and level progression to motivate learners.
- **Learning Methodology**: Focuses on continuous learning with immediate feedback, AI-driven adaptive learning paths, personalized study plans, and comprehensive results analysis. Helen, the AI assistant, guides users with natural language insights.
- **Architectural Patterns**: Full-stack TypeScript for type safety, component-driven UI development, and a scalable RESTful API structure.

### Key Features and Components
- **AI-Powered Learning**: Helen provides adaptive assessments, personalized study paths, intelligent feedback, and AI-generated lecture notes based on quiz performance (integrated with OpenAI GPT-3.5-turbo).
- **Quiz System**: Features authentic certification questions, real-time feedback, and a comprehensive review system. Supports adaptive question adjustment based on user performance.
- **Simplified Dashboard**: Clean, focused dashboard at /app with welcome section, primary actions, key stats, and recent activity. Removed clutter for improved user experience.
- **Dual-Path Navigation**: Separate marketing landing page (/) accessible to all users, with authenticated app experience under /app/* routes.
- **User Profile Management**: Comprehensive profile page with personal information, learning preferences, skills assessment, and subscription management in one location.
- **Multi-Tenant Admin System**: Comprehensive platform for managing tenants (organizations), categories, questions, and users, supporting tenant isolation.
- **Gamification**: Includes a learning streak feature with visual progression, a robust achievement system with 90+ badges, and XP/level progression.
- **Accessibility**: Built-in accessibility color contrast analyzer for WCAG compliance.

### Database Schema
Core entities include: Users, Categories, Subcategories, Questions, Quizzes, User Progress, Achievements, and Tenant-specific data for multi-tenancy.

## External Dependencies

### Frontend
- `@radix-ui/*`: Accessible UI component primitives.
- `@tanstack/react-query`: Server state management.
- `react-hook-form`, `@hookform/resolvers`: Form management and validation.
- `tailwindcss`, `class-variance-authority`, `clsx`: Styling utilities.
- `wouter`: Lightweight client-side routing.

### Backend
- `@neondatabase/serverless`, `drizzle-orm`, `drizzle-zod`: PostgreSQL database interaction.
- `bcrypt`: Password hashing.
- `connect-pg-simple`: PostgreSQL session store.
- `date-fns`: Date manipulation utilities.
- `openai`: Integration for AI-powered content generation.

### Development
- `vite`, `esbuild`: Build tools.
- `typescript`: Language support.
- `tsx`: TypeScript execution.
- `@replit/*`: Replit integration plugins.

## Platform Enhancement Plan (December 2024)

### PHASE 1: CRITICAL FIXES & SECURITY (Week 1-2)
#### 1.1 Security & Access Control
- Fix Tools/Admin exposure - remove backend UI visibility from regular users
- Implement role-based access control
- Secure all administrative API endpoints

#### 1.2 Core Quiz System Bugs
- Fix "Failed to create quiz" error for study paths
- Fix answer review display incorrect/correct flag bug
- Fix answer tracking to properly distinguish selected vs correct answers
- Activate practice quiz button in quiz summary

#### 1.3 Mastery Tracking Fixes  
- Fix static mastery percentage not updating
- Fix domain mastery progression after 5-10 exams
- Add proper progress persistence across sessions

### PHASE 2: POLAR MEMBERSHIP INTEGRATION (Week 2-3)
#### 2.1 Polar Setup
- Install @polar-sh/sdk package
- Configure POLAR_API_KEY and POLAR_WEBHOOK_SECRET
- Add database tables: user_subscriptions, subscription_events, membership_features

### Polar Sandbox Integration (Implemented)
The application now supports automatic environment switching between Polar sandbox and production:

#### Sandbox Mode (Development)
- Automatically activated when NODE_ENV=development
- Uses `https://sandbox.polar.sh/api/v1` endpoint
- Reads POLAR_SANDBOX_API_KEY environment variable
- Shows `🧪 SANDBOX MODE` indicator in console logs
- Safe for testing payment flows without real money

#### Production Mode
- Activated when NODE_ENV=production
- Uses `https://api.polar.sh/api/v1` endpoint
- Reads POLAR_API_KEY environment variable
- Shows `🚀 PRODUCTION MODE` indicator in console logs

#### Environment Variables Required
- **Development**: POLAR_SANDBOX_API_KEY (already set)
- **Production**: POLAR_API_KEY, POLAR_PRO_PRODUCT_ID, POLAR_ENTERPRISE_PRODUCT_ID

#### 2.2 Subscription Management
- Implement membership validation via Polar API
- Set up 7-day free trial with tracking
- Configure webhook handler for subscription events
- Implement 3-day grace period for failed payments

#### 2.3 User-Facing Features
- Integrate Polar customer portal
- Create upgrade/downgrade flows
- Display membership status and billing info
- Link payment method management

### PHASE 3: USER EXPERIENCE (Week 3-4)
#### 3.1 Mode-Specific Fixes
- Study Mode: Implement immediate per-question feedback
- Quiz Mode: Fix flag-for-review and mastery meter updates
- Practice Test: Fix retake functionality and history

#### 3.2 Placeholder Management
- Add "Coming Soon" messaging for incomplete features
- Properly disable inactive links with tooltips
- Update study materials and groups with launch dates

#### 3.3 Quiz Quality
- Fix answer length bias issue
- Implement proper difficulty distribution
- Improve question randomization

### PHASE 4: FEATURE ENHANCEMENTS (Week 4-6)
#### 4.1 Gamification
- Adjust achievement thresholds (High Achiever: 25+ sessions at 90%+)
- Make thresholds configurable via admin panel
- Add domain-specific and speed achievements

#### 4.2 Content Framework
- Create modular system for study materials
- Build admin interface for content management
- Implement progressive access based on membership

#### 4.3 Personalization
- Add profile customization (themes, pictures, display names)
- Implement study preferences
- Add notification settings

### PHASE 5: ADVANCED FEATURES (Month 2-3)
- Study Groups with chat and scheduling
- Advanced analytics for premium tier
- Enterprise features for business tier

### Polar Subscription Tiers
- **Free Trial**: 7 days, full access, credit card required
- **Basic** ($19/month): Core features, 100 quizzes/month  
- **Premium** ($39/month): Unlimited quizzes, advanced analytics, study groups
- **Business** ($99/month): Team features, API access, white-label options