# CertLab - Certification Learning Platform

CertLab is a modern, cloud-based certification study platform. Study for certifications like CISSP, CISM, and more with adaptive quizzes, achievements, and progress tracking.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **Firebase Authentication**: Secure Google Sign-In
- **Cloud Storage**: All data stored in Firestore for multi-device sync
- **Adaptive Learning**: Quiz difficulty adapts to your performance
- **Achievement System**: Earn badges and track your progress
- **Multi-Tenancy**: Switch between different learning environments
- **Study Groups**: Create and join study groups
- **Practice Tests**: Full-length practice exams
- **Multiple Content Types**: Support for text, video, PDF, interactive content, and code examples
- **Export/Import**: Backup and restore your data
- **Theme Options**: Seven themes including dark mode for reduced eye strain
- **Accessibility**: WCAG 2.2 AA compliant with keyboard navigation, skip links, ARIA support, screen reader optimization, color contrast tools, and comprehensive accessibility documentation ([Learn more](ACCESSIBILITY.md))

📋 **[View Complete Feature List](FEATURES.md)** | 🗺️ **[View Roadmap](ROADMAP.md)**

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Firebase Setup (Required)](#-firebase-setup-required)
- [Architecture](#-architecture)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Technology Stack](#️-technology-stack)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Quick Start

**Prerequisites**: 
- Firebase project (required for authentication and storage)
- Dynatrace account (recommended for monitoring and error detection)

See setup instructions below.

```bash
# Clone the repository
git clone https://github.com/archubbuck/certlab.git
cd certlab

# Install dependencies
npm install

# Configure Firebase (required) and Dynatrace (recommended)
cp .env.example .env.local
# Edit .env.local and add your Firebase credentials and Dynatrace script URL (optional)

# Start development server
npm run dev
```

Open http://localhost:5000 and sign in with Google to get started!

## 📦 Installation

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Firebase Project**: Required for authentication and storage (see [Firebase Setup](#-firebase-setup-required))
- **Dynatrace Account**: Recommended for monitoring and error detection (see [Dynatrace Setup](#-dynatrace-setup-recommended))

### Development Setup

```bash
# Install dependencies
npm install

# Run development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run TypeScript type checking
npm run check

# Run tests
npm test
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server at http://localhost:5000 |
| `npm run build` | Build production bundle to `./dist` |
| `npm run preview` | Preview production build locally |
| `npm run check` | Run TypeScript type checking |
| `npm test` | Run test suite |
| `npm run test:run` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

### First Time Setup

**Option 1: Quick Start (Local Development)**
1. Install dependencies: `npm install`
2. Set development bypass: Add `VITE_DYNATRACE_DEV_SKIP=true` to `.env.local`
3. Start dev server: `npm run dev`
4. The app will run without Dynatrace for initial testing
5. Complete Firebase and Dynatrace setup before deploying

**Option 2: Full Setup (Recommended)**
1. Complete Firebase setup (see [Firebase Setup](#-firebase-setup-required))
2. Complete Dynatrace setup (see [Dynatrace Setup](#-dynatrace-setup-recommended)) for monitoring
3. Open the app in your browser
4. Click "Sign in with Google"
5. **For first admin**: Grant yourself admin access in Firestore (`/users/{userId}` → set `role: "admin"`)
6. **Import sample data**: Navigate to Data Import page and import CISSP/CISM questions (see [Data Import Guide](docs/DATA_IMPORT_GUIDE.md))
7. Select your certification goals and start learning!

**⚠️ Important**: The `VITE_DYNATRACE_DEV_SKIP` flag is ONLY for local development. Deployments to production, staging, or via CI/CD will fail without proper Dynatrace configuration.

### Firebase Setup (Required)

Firebase is required for authentication (Google Sign-In) and cloud storage (Firestore):

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Click "Add project" and follow the setup wizard
   - Enable Google Analytics (optional)

2. **Enable Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Google" provider
   - Add authorized domains (localhost, your production domain)

3. **Create Firestore Database**:
   - Go to Firestore Database
   - Click "Create database"
   - Start in production mode
   - Choose a location

4. **Get Firebase Config**:
   - Go to Project Settings > General
   - Scroll to "Your apps" section
   - Click the Web icon (</>)
   - Register your app and copy the config

5. **Configure Environment**:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` and add your Firebase credentials:
   ```
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

6. **Install Firebase CLI** (required for deploying Firestore rules):
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

7. **Deploy Firestore Rules and Indexes** (optional for initial setup, required before production):
   ```bash
   npm run deploy:firestore:rules
   # If you have custom Firestore indexes, deploy them as well:
   npm run deploy:firestore:indexes
   ```
   Note: These steps can be skipped during initial development. Deploy security rules and indexes before going to production.

For detailed instructions, see [docs/setup/firebase.md](docs/setup/firebase.md).

### Dynatrace Setup (Recommended)

Dynatrace observability is recommended for proper monitoring and error detection:

1. **Create Dynatrace Account**: 
   - Sign up at [dynatrace.com/trial](https://www.dynatrace.com/trial) (free 15-day trial available)

2. **Create Web Application**:
   - Navigate to Applications & Microservices > Web applications
   - Create a new web application or select existing
   - Give it a name (e.g., "CertLab")

3. **Get RUM Script URL**:
   - Click "..." > Edit > Setup > Instrumentation code
   - Copy the complete `src` URL from the `<script>` tag
   - Example: `https://js-cdn.dynatrace.com/jstag/abc123/xyz789/script.js`

4. **Configure Environment**:
   ```bash
   # Add to .env.local
   VITE_DYNATRACE_SCRIPT_URL=https://js-cdn.dynatrace.com/jstag/YOUR_ENV/YOUR_APP/script.js
   ```

5. **Verify Configuration**:
   ```bash
   npm run check:dynatrace
   ```

6. **Deploy and Monitor**:
   - Build and deploy the application
   - Dynatrace will automatically begin collecting metrics
   - Access dashboards in your Dynatrace environment

For detailed instructions, see [docs/setup/dynatrace.md](docs/setup/dynatrace.md).

**Monitoring Capabilities**:
- Real user monitoring (RUM) for user experience tracking
- Performance metrics and bottleneck identification
- JavaScript error tracking and debugging
- User journey analytics and conversion funnels
- Custom action tracking for business metrics

## 🏗️ Architecture

### Cloud-First Architecture

CertLab uses Firebase for authentication and storage:

| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework |
| **TypeScript** | Type safety |
| **Firebase Auth** | Google Sign-In authentication |
| **Firestore** | Cloud database and storage |
| **TanStack Query** | State management and caching |
| **Vite** | Build tool |
| **TailwindCSS** | Styling |

### Data Flow

```
User Action → React Component → TanStack Query → Storage API → Firestore
```

For detailed architecture information, see [docs/architecture/overview.md](docs/architecture/overview.md).

## 📚 Usage

### Creating a Quiz

1. Navigate to the dashboard
2. Select certification categories (CISSP, CISM, etc.)
3. Choose difficulty level and question count
4. Select quiz mode (Study, Quiz, or Adaptive)
5. Start your quiz!

### Quiz Modes

| Mode | Description |
|------|-------------|
| **Study Mode** | See correct answers immediately after each question |
| **Quiz Mode** | Full test experience with final score at the end |
| **Adaptive Mode** | Difficulty automatically adjusts based on your performance |

### Features Overview

| Feature | Description |
|---------|-------------|
| **Dashboard** | View progress, streaks, and quick access to quizzes |
| **Achievements** | Track earned badges and progress toward new ones |
| **Challenges** | Daily and quick challenges for focused practice |
| **Practice Tests** | Full-length certification practice exams |
| **Study Groups** | Join groups focused on specific certifications |
| **Profile** | View your stats and manage your account |

### Data Management

#### Importing Sample Questions (Admins Only)

Sample certification questions can be imported by administrators:

1. **Grant Admin Access**: Update your user's `role` field to `"admin"` in Firestore
2. **Navigate to Data Import**: Access the data import page from the menu
3. **Import Sample Data**: Click "Import Sample Data" for CISSP or CISM (500 questions each)
4. **Or Upload Custom YAML**: Upload your own question bank in YAML format

📖 **Detailed Guide**: See [Data Import Guide](docs/DATA_IMPORT_GUIDE.md) for complete instructions, YAML format, and troubleshooting.

**Note**: Data import is restricted to administrators to maintain data integrity in the shared question bank. Regular users will see a message explaining this restriction.

#### Export Your Data

Navigate to Profile → Export Data, or use the API:

```javascript
import { storage } from './lib/storage-factory';

// Export to JSON
const jsonData = await storage.exportData();

// Save to file
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// Download the file
```

#### Import Data

Use the Data Import page at `/app/data-import`, or:

```javascript
import { storage } from './lib/storage-factory';

// Import from JSON string
await storage.importData(jsonString);
```

### Multi-Tenancy

CertLab supports multiple isolated learning environments:

1. Click the tenant switcher in the header
2. Select a different tenant (Default Organization, CISSP Training, etc.)
3. Each tenant has its own categories, questions, and progress

For more details, see [docs/features/tenant-switching.md](docs/features/tenant-switching.md).

## 🔒 Security & Privacy

CertLab uses Firebase and Firestore for secure, cloud-based storage:

- **Firebase Authentication**: Industry-standard Google Sign-In
- **Firestore Security Rules**: Per-user data isolation and access control
- **Encryption**: TLS in transit, Google Cloud encryption at rest
- **Privacy**: Your data is yours - not shared or sold
- **Offline-First**: Works offline with automatic sync when online
- **Local Caching**: Firestore SDK uses IndexedDB automatically for offline persistence

**Note**: Firebase/Firestore is mandatory for CertLab. The application requires a properly configured Firebase project to function.

## 🌐 Deployment

### Firebase Hosting (Recommended)

CertLab is configured for automatic deployment to Firebase Hosting:

**Automatic Deployment (GitHub Actions):**

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Set up Firebase Hosting in your project
3. Set up Dynatrace (see [Dynatrace Setup](#-dynatrace-setup-recommended)) for monitoring (optional)
4. Add the following secrets to your GitHub repository (`Settings` > `Secrets and variables` > `Actions` > `New repository secret`):
   
   **Firebase Secrets (Required):**
   - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON from Firebase Console
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
   - `VITE_FIREBASE_API_KEY`: Firebase API key
   - `VITE_FIREBASE_AUTH_DOMAIN`: Firebase auth domain
   - `VITE_FIREBASE_PROJECT_ID`: Firebase project ID
   - `VITE_FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
   - `VITE_FIREBASE_APP_ID`: Firebase app ID
   
   **Dynatrace Secrets (Recommended):**
   - `VITE_DYNATRACE_SCRIPT_URL`: Your Dynatrace RUM script URL from the Dynatrace console (optional but recommended)
   
5. Push to `main` branch - automatic deployment via GitHub Actions

**Note**: The application will run without Dynatrace, but monitoring and error detection will be disabled. It is recommended to configure Dynatrace for production deployments.

**Manual Deployment:**

```bash
# Install Firebase CLI (already included as dev dependency)
npm install

# Login to Firebase
npx firebase login

# Initialize project (select your Firebase project)
npx firebase use --add

# Build and deploy
npm run deploy:firebase
```

For detailed Firebase deployment instructions, see [docs/setup/deployment.md](docs/setup/deployment.md).

### Alternative Platforms

| Platform | Build Command | Output Directory |
|----------|--------------|------------------|
| **Firebase Hosting** | `npm run build:firebase` | `dist` |
| **Netlify** | `npm run build:firebase` | `dist` |
| **Vercel** | `npm run build:firebase` | `dist` |
| **Cloudflare Pages** | `npm run build:firebase` | `dist` |

### Manual Deployment

```bash
# Build for production
npm run build

# Deploy the dist/ folder to any static hosting
# All files are in: ./dist/
```

For detailed deployment instructions, see [docs/setup/deployment.md](docs/setup/deployment.md).

## 🛠️ Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | React | UI framework |
| **Language** | TypeScript | Type safety |
| **Build Tool** | Vite | Fast builds and HMR |
| **Styling** | TailwindCSS | Utility-first CSS |
| **Components** | Radix UI | Accessible component primitives |
| **State** | TanStack Query | Async state management |
| **Authentication** | Firebase Auth | Google Sign-In authentication |
| **Storage** | Firestore | Cloud database with offline persistence |
| **Routing** | Wouter | Lightweight client-side routing |
| **Validation** | Zod | Schema validation |
| **Animation** | Framer Motion | UI animations |
| **Charts** | Recharts | Data visualization |
| **Observability** | Dynatrace RUM | Real user monitoring and analytics |

## 📖 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

### Quick Start Guides
- **[Getting Started](docs/README.md)** - Documentation overview
- **[User Manual](docs/user-manual.md)** - End-user guide
- **[Deployment Guide](docs/setup/deployment.md)** - Deploy your own instance

### Project Planning
- **[Features](FEATURES.md)** - 📋 Complete list of all implemented features
- **[Roadmap](ROADMAP.md)** - 🗺️ Planned features and future direction
- **[Changelog](CHANGELOG.md)** - Version history

### Architecture & Development
- **[Architecture Overview](docs/architecture/overview.md)** - System design and data flow
- **[ADR-001: Authentication & Authorization](docs/architecture/ADR-001-authentication-authorization.md)** - ⭐ Standard approach for auth
- **[Authentication Quick Reference](docs/AUTHENTICATION_QUICK_REFERENCE.md)** - ⚡ Quick auth patterns
- **[Authentication Checklist](docs/AUTHENTICATION_CHECKLIST.md)** - Developer implementation guide
- **[State Management Guide](docs/architecture/state-management.md)** - State patterns and best practices

### Setup & Configuration
- **[Firebase Setup](docs/setup/firebase.md)** - Configure cloud sync and authentication
- **[Google Auth Setup](docs/setup/google-auth.md)** - Enable Google Sign-In
- **[Dynatrace Setup](docs/setup/dynatrace.md)** - Configure observability

### Additional Resources
- **[Project Structure](docs/PROJECT_STRUCTURE.md)** - Repository organization
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute
- **[Known Issues](docs/known-issues.md)** - Current limitations and planned improvements

## ⚠️ Limitations

### Current Limitations

| Limitation | Description |
|------------|-------------|
| **Firebase Required** | Production deployment requires Firebase project with Firestore |
| **No AI Features** | Original AI lecture generation removed |
| **No Payments** | Credit system and payments removed |
| **Study Groups** | Local to device (no real-time collaboration) |

### Firebase/Firestore Benefits

With Firebase/Firestore:
- ✅ Multi-device sync
- ✅ Cloud backup
- ✅ Data persistence across browser clears
- ✅ Access from any device
- ✅ Offline-first with automatic sync
- ✅ Secure Google Sign-In authentication

## 🔄 Migration from Server Version

If migrating from the original server-based version:

1. Export your data from the old version
2. Deploy the new client-side version
3. Import your data using the Data Import page
4. Note: Some features like AI lectures are no longer available

For more details, see [CHANGELOG.md](CHANGELOG.md).

## 📝 Data Structure

The app stores data in Firestore collections (with local IndexedDB caching for offline access):

| Collection | Purpose |
|-------|---------|
| `users` | User accounts and profiles |
| `tenants` | Multi-tenant organizations |
| `categories` | Certification categories (CISSP, CISM, etc.) |
| `subcategories` | Topic subcategories |
| `questions` | Question bank |
| `quizzes` | Quiz attempts and results |
| `userProgress` | Learning progress per category |
| `masteryScores` | Performance tracking per subcategory |
| `badges` | Achievement definitions |
| `userBadges` | User's earned badges |
| `userGameStats` | Gamification stats (points, streaks, levels) |
| `lectures` | Study materials |
| `challenges` | Daily/quick challenges |
| `challengeAttempts` | Challenge results |
| `studyGroups` | Study groups |
| `studyGroupMembers` | Group memberships |
| `practiceTests` | Practice test definitions |
| `practiceTestAttempts` | Practice test results |
| `settings` | App settings and current user |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Setting up your development environment
- Code style guidelines
- How to submit pull requests
- Reporting issues

### Quick Start for Contributors

```bash
# Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/certlab.git
cd certlab

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then
npm run check  # Type check
npm run build  # Build verification

# Submit a pull request
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Built for certification students worldwide who want a free, private, and offline-capable study tool.

---

**Report Issues**: [GitHub Issues](https://github.com/archubbuck/certlab/issues)

**Questions?**: Check [CONTRIBUTING.md](CONTRIBUTING.md) or open a discussion.
