# CertLab - Client-Side Certification Learning Platform

CertLab is a browser-based certification study platform that uses IndexedDB for local data storage. Study for certifications like CISSP, CISM, and more with adaptive quizzes, achievements, and progress tracking.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Features

- **Client-Side Storage**: All data stored in browser's IndexedDB - no server required
- **Offline Capable**: Works completely offline after initial load  
- **Adaptive Learning**: Quiz difficulty adapts to your performance
- **Achievement System**: Earn badges and track your progress
- **Multi-Tenancy**: Switch between different learning environments
- **Study Groups**: Create and join study groups (local to your browser)
- **Practice Tests**: Full-length practice exams
- **Export/Import**: Backup and restore your data
- **Theme Options**: Seven themes including dark mode
- **Accessibility**: Keyboard navigation, skip links, ARIA support

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Architecture](#-architecture)
- [Usage](#-usage)
- [Deployment](#-deployment)
- [Technology Stack](#️-technology-stack)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/archubbuck/certlab.git
cd certlab

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5000 and click "Get Started" to create your account!

## 📦 Installation

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher

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

1. Open the app in your browser
2. Click "Get Started" to create an account
3. Initial sample data (categories, questions, badges) will be automatically seeded
4. Select your certification goals and start learning!

## 🏗️ Architecture

### Client-Side Only

CertLab runs entirely in your browser using:

| Technology | Purpose |
|------------|---------|
| **React** | UI framework |
| **TypeScript** | Type safety |
| **IndexedDB** | Data persistence |
| **TanStack Query** | State management |
| **Vite** | Build tool |
| **TailwindCSS** | Styling |

### No Backend Required

All features run locally:
- Authentication is browser-based with SHA-256 password hashing
- Data stays in your browser's IndexedDB
- No API calls or server communication
- Perfect for static hosting platforms like Firebase Hosting

### Data Flow

```
User Action → React Component → TanStack Query → Storage API → IndexedDB
```

For detailed architecture information, see [ARCHITECTURE.md](ARCHITECTURE.md).

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

#### Export Your Data

Navigate to Profile → Export Data, or use the API:

```javascript
import { clientStorage } from './lib/client-storage';

// Export to JSON
const jsonData = await clientStorage.exportData();

// Save to file
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// Download the file
```

#### Import Data

Use the Data Import page at `/app/data-import`, or:

```javascript
import { clientStorage } from './lib/client-storage';

// Import from JSON string
await clientStorage.importData(jsonString);
```

### Multi-Tenancy

CertLab supports multiple isolated learning environments:

1. Click the tenant switcher in the header
2. Select a different tenant (Default Organization, CISSP Training, etc.)
3. Each tenant has its own categories, questions, and progress

For more details, see [TENANT_SWITCHING.md](TENANT_SWITCHING.md).

## 🔒 Security & Privacy

- **Local Only**: Your data never leaves your browser
- **Password Hashing**: Passwords hashed using SHA-256 via Web Crypto API
- **No Tracking**: No analytics or external tracking
- **Private**: Single-user per browser, no data sharing
- **Offline**: Works completely without internet after initial load

## 🌐 Deployment

### Firebase Hosting (Recommended)

CertLab is configured for automatic deployment to Firebase Hosting:

**Automatic Deployment (GitHub Actions):**

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Set up Firebase Hosting in your project
3. Add the following secrets to your GitHub repository:
   - `FIREBASE_SERVICE_ACCOUNT`: Service account JSON from Firebase Console
   - `FIREBASE_PROJECT_ID`: Your Firebase project ID
4. Push to `main` branch - automatic deployment via GitHub Actions

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

For detailed Firebase deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

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

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## 🛠️ Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | React | UI framework |
| **Language** | TypeScript | Type safety |
| **Build Tool** | Vite | Fast builds and HMR |
| **Styling** | TailwindCSS | Utility-first CSS |
| **Components** | Radix UI | Accessible component primitives |
| **State** | TanStack Query | Async state management |
| **Storage** | IndexedDB | Browser data persistence |
| **Routing** | Wouter | Lightweight client-side routing |
| **Validation** | Zod | Schema validation |
| **Animation** | Framer Motion | UI animations |
| **Charts** | Recharts | Data visualization |

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, data flow, and technical decisions |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute, code style, and PR process |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | Detailed deployment instructions |
| [TENANT_SWITCHING.md](TENANT_SWITCHING.md) | Multi-tenancy feature documentation |
| [CHANGELOG.md](CHANGELOG.md) | Version history and changes |
| [CertLab_User_Manual.md](CertLab_User_Manual.md) | End-user feature guide |
| [ISSUES.md](ISSUES.md) | Known issues and planned improvements |

## ⚠️ Limitations

As a client-side only application:

| Limitation | Description |
|------------|-------------|
| **Single User** | One user per browser/profile |
| **Browser-Bound** | Data doesn't sync across devices |
| **Local Storage** | Data tied to browser (can be cleared) |
| **No AI Features** | Original AI lecture generation removed |
| **No Payments** | Credit system and payments removed |
| **No Real-time Collaboration** | Study groups are local only |

## 🔄 Migration from Server Version

If migrating from the original server-based version:

1. Export your data from the old version
2. Deploy the new client-side version
3. Import your data using the Data Import page
4. Note: Some features like AI lectures are no longer available

For more details, see [CHANGELOG.md](CHANGELOG.md).

## 📝 Data Structure

The app stores data in these IndexedDB stores:

| Store | Purpose |
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
