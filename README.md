# CertLab - Certification Learning Platform

CertLab is a modern, cloud-based certification study platform. Study for certifications like CISSP, CISM, and more with adaptive quizzes, achievements, and progress tracking.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🌟 Key Features

- **Firebase Authentication** - Secure Google Sign-In
- **Cloud Storage** - Multi-device sync with Firestore
- **Adaptive Learning** - Quiz difficulty adapts to your performance
- **Achievement System** - Earn badges and track progress
- **Practice Tests** - Full-length certification exams
- **Theme Options** - Seven themes including dark mode
- **Accessibility** - WCAG 2.2 Level AA compliance ([Learn more](ACCESSIBILITY.md))

📋 **[View Complete Feature List](FEATURES.md)** | 🗺️ **[View Roadmap](ROADMAP.md)** | 📖 **[Full Documentation](docs/README.md)**

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Setup & Configuration](#-setup--configuration)
- [Usage](#-usage)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## 🚀 Quick Start

### Option 1: Firebase Emulator (Recommended for Contributors)

No Firebase account or credentials needed! Perfect for local development:

```bash
# Clone and install
git clone https://github.com/certlab/certlab.git
cd certlab
npm install

# Configure for emulator
cp .env.example .env.local
# Add to .env.local:
# VITE_USE_FIREBASE_EMULATOR=true
# VITE_FIREBASE_API_KEY=demo-api-key
# VITE_FIREBASE_AUTH_DOMAIN=localhost
# VITE_FIREBASE_PROJECT_ID=demo-certlab

# Terminal 1: Start Firebase Emulators
npm run emulators:start

# Terminal 2: Seed data and start development server
npm run emulators:seed
npm run dev
```

Open http://localhost:5000 and click **Continue with Google** to sign in using the Auth Emulator Google popup (no real Google account required).

📖 **Emulator Setup Guide**: [docs/setup/firebase-emulator-setup.md](docs/setup/firebase-emulator-setup.md)

### Option 2: Live Firebase

For production-like testing with real Firebase project:

```bash
# Clone and install
git clone https://github.com/certlab/certlab.git
cd certlab
npm install

# Configure Firebase credentials
cp .env.example .env.local
# Edit .env.local with your Firebase project credentials

# Start development server
npm run dev
```

Open http://localhost:5000 and sign in with Google to get started!

**Prerequisites**: Firebase project (required), Dynatrace account (recommended for monitoring)

📖 **Detailed Setup Instructions**: [docs/setup/firebase.md](docs/setup/firebase.md) | [docs/setup/dynatrace.md](docs/setup/dynatrace.md)

## 🛠️ Setup & Configuration

### Prerequisites

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Firebase Project**: Required for authentication and storage
- **Dynatrace Account**: Recommended for monitoring (optional)

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server at http://localhost:5000 |
| `npm run build` | Build production bundle to `./dist` |
| `npm run check` | Run TypeScript type checking |
| `npm test` | Run unit/integration tests |
| `npm run test:e2e` | Run end-to-end tests with Playwright |
| `npm run deploy:firebase` | Build and deploy to Firebase Hosting |

📖 **Detailed Information**:
- **Firebase Setup**: [docs/setup/firebase.md](docs/setup/firebase.md)
- **Dynatrace Setup**: [docs/setup/dynatrace.md](docs/setup/dynatrace.md)
- **Deployment Guide**: [docs/setup/deployment.md](docs/setup/deployment.md)
- **Project Structure**: [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## 📚 Usage

### Quick Start Guide

1. **Sign In**: Use Google Sign-In for authentication
2. **Select Certification**: Choose CISSP, CISM, or other certifications
3. **Create Quiz**: Select categories, difficulty level, and question count
4. **Study & Practice**: Use Study, Quiz, or Adaptive modes
5. **Track Progress**: View achievements, streaks, and mastery levels

### Key Features

- **Quiz Modes**: Study (immediate feedback), Quiz (final score), Adaptive (adjusts to performance)
- **Achievements**: Earn badges for milestones and consistent practice
- **Study Groups**: Join groups focused on specific certifications
- **Practice Tests**: Full-length certification practice exams
- **Data Management**: Export/import your data for backup

📖 **Complete User Guide**: [docs/user-manual.md](docs/user-manual.md)  
📖 **Data Import Guide (Admin)**: [docs/DATA_IMPORT_GUIDE.md](docs/DATA_IMPORT_GUIDE.md)  
📖 **Personal Question Import (Users)**: [docs/PERSONAL_IMPORT_GUIDE.md](docs/PERSONAL_IMPORT_GUIDE.md)

## 📖 Documentation

Comprehensive documentation is available in the [docs/](docs/) directory:

### Essential Guides
- **[Documentation Index](docs/README.md)** - Complete documentation overview
- **[User Manual](docs/user-manual.md)** - End-user guide and features
- **[Architecture Overview](docs/architecture/overview.md)** - System design and technical details
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute to the project

### Setup & Configuration
- **[Firebase Setup](docs/setup/firebase.md)** - Configure authentication and cloud storage
- **[Dynatrace Setup](docs/setup/dynatrace.md)** - Configure observability and monitoring
- **[Deployment Guide](docs/setup/deployment.md)** - Deploy to Firebase Hosting or other platforms
- **[E2E Testing Guide](docs/E2E_TESTING.md)** - End-to-end test automation with Playwright

### Project Information
- **[Features](FEATURES.md)** - Complete list of all implemented features
- **[Roadmap](ROADMAP.md)** - Planned features and future direction
- **[Changelog](CHANGELOG.md)** - Version history and release notes
- **[Security Policy](SECURITY.md)** - Security and vulnerability reporting

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for:

- Development environment setup
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

# Make your changes, then verify
npm run check  # Type check
npm run build  # Build verification
npm test       # Run tests

# Submit a pull request
```

📖 **[Full Contributing Guide](CONTRIBUTING.md)**

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Need Help?**
- 📖 [Documentation](docs/README.md)
- 🐛 [Report Issues](https://github.com/archubbuck/certlab/issues)
- 💬 [Discussions](https://github.com/archubbuck/certlab/discussions)

Built for certification students worldwide who want a free, private, and powerful study tool.
