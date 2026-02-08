# Firebase Emulator Setup Guide

This guide walks you through setting up Firebase Emulator Suite for local development of CertLab. Using emulators allows you to develop and test without a Firebase account, production credentials, or internet connection.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Working with Emulators](#working-with-emulators)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

## Overview

### What is Firebase Emulator Suite?

Firebase Emulator Suite is a set of local emulators that replicate Firebase services on your machine:
- **Authentication Emulator** - Test user authentication flows
- **Firestore Emulator** - Local database with full Firestore API
- **Storage Emulator** - File storage testing
- **Emulator UI** - Web interface to view and manage emulator data

### Why Use Emulators?

✅ **No Firebase Account Required** - Start developing immediately  
✅ **Offline Development** - Work without internet connection  
✅ **Isolated Environment** - No risk of affecting production data  
✅ **Fast Iteration** - Instant resets, no cloud latency  
✅ **Free** - No Firebase usage costs  
✅ **Security Rules Testing** - Test Firestore rules locally

## Prerequisites

### Required Software

- **Node.js** v20.x or higher
- **npm** v10.x or higher
- **Firebase CLI** (installed globally)

### Install Firebase CLI

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Verify installation
firebase --version
```

If you see a version number (e.g., `13.0.0`), you're ready to go!

## Quick Start

### 1. Clone and Install

```bash
# Clone repository (if not already done)
git clone https://github.com/certlab/certlab.git
cd certlab

# Install dependencies
npm install
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local and set:
# VITE_USE_FIREBASE_EMULATOR=true
```

Or manually add this line to `.env.local`:
```bash
VITE_USE_FIREBASE_EMULATOR=true
```

### 3. Start Emulators

```bash
# In Terminal 1: Start emulators
npm run emulators:start
```

Wait for the message:
```
✔  All emulators ready! It is now safe to connect.

┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! View status and logs at             │
│     http://localhost:4000                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4. Start Development Server

```bash
# In Terminal 2: Start dev server
npm run dev
```

### 5. Access the Application

Open your browser to:
- **Application**: http://localhost:5000
- **Emulator UI**: http://localhost:4000

## Detailed Setup

### Understanding Emulator Ports

The emulators run on these ports (configured in `firebase.json`):

| Service | Port | URL |
|---------|------|-----|
| **Emulator UI** | 4000 | http://localhost:4000 |
| **Authentication** | 9099 | http://localhost:9099 |
| **Firestore** | 8080 | http://localhost:8080 |
| **Storage** | 9199 | http://localhost:9199 |

### Environment Configuration

The application checks `VITE_USE_FIREBASE_EMULATOR` to determine whether to connect to emulators or production Firebase.

**In `.env.local`:**
```bash
# For local development with emulators
VITE_USE_FIREBASE_EMULATOR=true

# No other Firebase credentials needed!
```

**Connection Logic** (in `client/src/lib/firestore-service.ts:130-134`):
```typescript
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';
if (useEmulator) {
  console.log('[Firestore] Connecting to Firebase Emulator Suite');
  connectFirestoreEmulator(firestoreInstance, 'localhost', 8080);
}
```

### Initial Data Seeding

When emulators start fresh, they have no data. You have several options:

**Option 1: Manual Data Creation**
- Use the Emulator UI at http://localhost:4000
- Navigate to Firestore
- Create collections and documents manually

**Option 2: Use the Application**
- Sign in with any email/password (emulator accepts all credentials)
- Create quizzes, categories, and other data through the UI
- Data persists as long as emulators are running

**Option 3: Import/Export Data**
```bash
# Export data from emulators
firebase emulators:export ./emulator-data

# Start emulators with exported data
firebase emulators:start --import=./emulator-data
```

**Option 4: Seed Script** (Future Enhancement)
```bash
# Planned feature
npm run emulators:seed
```

## Working with Emulators

### Daily Workflow

**Starting Your Day:**
```bash
# Terminal 1: Start emulators
npm run emulators:start

# Terminal 2: Start dev server
npm run dev
```

**Stopping:**
- Press `Ctrl+C` in the emulator terminal
- Press `Ctrl+C` in the dev server terminal

### Resetting Emulator Data

Emulator data is stored in memory by default. To reset:

**Option 1: Restart Emulators**
```bash
# Stop emulators (Ctrl+C)
# Start again
npm run emulators:start
```

**Option 2: Clear Data via UI**
- Open http://localhost:4000
- Navigate to Firestore
- Delete collections manually

### Using Emulator UI

The Emulator UI (http://localhost:4000) provides:

**Firestore Tab:**
- View collections and documents
- Edit document data
- Create/delete documents
- Run queries

**Authentication Tab:**
- View registered users
- Create test users
- Clear all users

**Storage Tab:**
- View uploaded files
- Upload/download test files

### Authentication in Emulators

The Authentication Emulator accepts **any** credentials:

```typescript
// All of these work in emulators:
email: "test@example.com", password: "password123"
email: "admin@test.com", password: "admin"
email: "any@email.com", password: "anypassword"
```

**Google Sign-In:**
- Emulator shows a popup with test accounts
- Select any test account to sign in
- No real Google account needed

### Testing Features

**Test User Flows:**
1. Sign up with test email
2. Create quiz data
3. Test achievements and badges
4. Verify data persistence

**Test Admin Features:**
1. Create user with admin role via Emulator UI:
   - Open Firestore tab
   - Navigate to `users` collection
   - Edit user document
   - Set `role: "admin"`
2. Refresh app to see admin features

## Troubleshooting

### Emulators Won't Start

**Error: Port already in use**
```
Error: Could not start Firestore Emulator, port taken.
```

**Solution:** Kill processes on emulator ports
```bash
# On macOS/Linux
lsof -ti:4000,8080,9099,9199 | xargs kill -9

# On Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F
```

**Error: Firebase CLI not found**
```
firebase: command not found
```

**Solution:** Install Firebase CLI globally
```bash
npm install -g firebase-tools
firebase --version
```

### App Not Connecting to Emulators

**Symptom:** Application shows "Firebase not configured" warning

**Check 1: Environment Variable**
```bash
# In .env.local, ensure:
VITE_USE_FIREBASE_EMULATOR=true
```

**Check 2: Restart Dev Server**
```bash
# Vite needs restart to pick up .env changes
# Stop dev server (Ctrl+C)
npm run dev
```

**Check 3: Check Browser Console**
```javascript
// Should see in browser console:
[Firestore] Connecting to Firebase Emulator Suite
[Firestore] Initialized successfully
```

**Check 4: Verify Emulator is Running**
- Open http://localhost:4000
- Should see Emulator UI dashboard
- Check that Firestore shows "running"

### Data Not Persisting

**Symptom:** Data disappears when restarting emulators

**Explanation:** Emulators store data in memory by default.

**Solution 1: Export/Import Data**
```bash
# Before stopping emulators
firebase emulators:export ./my-data

# Start with data
firebase emulators:start --import=./my-data
```

**Solution 2: Add to package.json** (Future Enhancement)
```json
"emulators:start:persist": "firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data"
```

### Authentication Not Working

**Symptom:** Cannot sign in even with test credentials

**Check 1: Auth Emulator Running**
- Open http://localhost:4000
- Check Authentication tab
- Should show "Running on port 9099"

**Check 2: Clear Browser Data**
- Clear localStorage and cookies
- Restart browser
- Try signing in again

**Check 3: Check Network Tab**
- Open browser DevTools → Network
- Look for requests to `localhost:9099`
- Should see auth API calls

### Firestore Rules Not Working

**Symptom:** Security rules behave differently than expected

**Solution 1: Check Rules in Emulator UI**
- Open http://localhost:4000
- Go to Firestore tab
- Click "Rules" to view active rules

**Solution 2: Reload Rules**
```bash
# Restart emulators to reload firestore.rules
npm run emulators:start
```

**Solution 3: Test Rules Programmatically**
```bash
# Use Firebase emulator test suite (future enhancement)
npm run test:rules
```

## Next Steps

### For Contributors

Now that you have emulators running:

1. **Explore the Application**
   - Create test user accounts
   - Build quizzes and test features
   - Experiment without fear of breaking production

2. **Read Documentation**
   - [CONTRIBUTING.md](../../CONTRIBUTING.md) - Development guidelines
   - [docs/TESTING.md](../TESTING.md) - Testing guide
   - [docs/E2E_TESTING.md](../E2E_TESTING.md) - End-to-end tests

3. **Start Contributing**
   - Pick an issue from GitHub
   - Make changes and test locally
   - Submit pull request

### For Testing

**Run E2E Tests Against Emulators** (Future Enhancement):
```bash
# Terminal 1: Emulators running
npm run emulators:start

# Terminal 2: Run E2E tests
npm run test:e2e
```

### For Advanced Users

**Custom Emulator Configuration:**

Edit `firebase.json` to customize ports:
```json
{
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "storage": { "port": 9199 },
    "ui": { "enabled": true, "port": 4000 }
  }
}
```

**Automated Seed Script** (Planned):
```bash
# Will populate emulators with test data
npm run emulators:seed
```

**Combined Startup** (Planned):
```bash
# One command to start emulators and dev server
npm run dev:emulator
```

## Resources

### Documentation
- [Firebase Emulator Suite Official Docs](https://firebase.google.com/docs/emulator-suite)
- [Firestore Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_firestore)
- [Auth Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_auth)

### CertLab Documentation
- [Firebase Setup Guide](./firebase.md) - Production Firebase setup
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - How to contribute
- [docs/issues/firebase-local-testing-limitation.md](../issues/firebase-local-testing-limitation.md) - Background on this issue

### Getting Help
- Check existing issues on GitHub
- Open a new issue with the `firebase-emulator` label
- Ask in GitHub Discussions

---

**Happy Developing!** 🚀

With Firebase Emulator Suite, you can develop CertLab features without a Firebase account, production credentials, or internet connection. This lowers the barrier for contributors and enables faster, safer local development.
