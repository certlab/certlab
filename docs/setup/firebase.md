# Firebase Setup Guide for CertLab

This guide walks you through setting up Firebase for CertLab's cloud storage and authentication.

> **Note**: Firebase setup is **mandatory** for CertLab. The application requires a properly configured Firebase project to function in both development and production environments.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Create Firebase Project](#step-1-create-firebase-project)
- [Step 2: Enable Authentication](#step-2-enable-authentication)
- [Step 3: Set Up Cloud Firestore](#step-3-set-up-cloud-firestore)
- [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
- [Step 5: Deploy Firestore Rules](#step-5-deploy-firestore-rules)
- [Step 6: Test with Emulators](#step-6-test-with-emulators-optional)
- [Troubleshooting](#troubleshooting)

## Overview

Firebase provides the production infrastructure for CertLab:
- **Authentication**: Google Sign-In and email/password authentication with persistent login
- **Cloud Firestore**: Cloud storage for multi-device sync with offline support
- **Hosting**: Static site hosting via Firebase Hosting

**Current Status**: 
- ✅ Firebase Authentication fully implemented with persistent login
- ✅ Firestore storage fully integrated
- ✅ Offline persistence with automatic IndexedDB caching via Firestore SDK
- ✅ Firebase Hosting configured for deployment
- ✅ Persistent login configured - users remain signed in across browser sessions

**Note**: Firebase/Firestore is mandatory for all environments. The application will not function without proper Firebase configuration. Firestore SDK provides automatic offline support using IndexedDB caching - no separate fallback implementation is needed.

## Prerequisites

- Node.js v20.x or higher
- npm v10.x or higher
- A Google account
- Firebase CLI: `npm install -g firebase-tools`

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "certlab-prod")
4. (Optional) Enable Google Analytics
5. Click **"Create project"** and wait for setup to complete

## Step 2: Enable Authentication

1. In Firebase Console, select your project
2. Go to **Build > Authentication** from the left sidebar
3. Click **"Get started"**

### Enable Email/Password Authentication

1. Click the **"Sign-in method"** tab
2. Click **"Email/Password"**
3. Toggle **"Enable"** to ON
4. Click **"Save"**

### Enable Google Sign-In

1. In the **"Sign-in method"** tab, click **"Google"**
2. Toggle **"Enable"** to ON
3. Select a **"Project support email"** from the dropdown
4. Click **"Save"**

### Add Authorized Domains

1. Click the **"Settings"** tab in Authentication
2. Scroll to **"Authorized domains"**
3. Add your deployment domain(s):
   - For local development: `localhost` (already added by default)
   - For production: Add your Firebase Hosting domain (e.g., `your-project.web.app`)
   - For custom domain: Add your custom domain

### Persistent Login Configuration

CertLab is configured with Firebase Auth persistent login using `browserLocalPersistence`. This means:

- **Users remain signed in** across browser sessions and page refreshes
- **Authentication state persists** even after closing the browser
- **No re-authentication required** unless the user explicitly logs out or the session expires

The persistence is configured automatically during Firebase initialization in `client/src/lib/firebase.ts`. No additional configuration is required.

**How it works:**
1. When a user signs in, Firebase stores their authentication state in the browser's local storage
2. When the app loads, Firebase automatically checks for an existing authentication state
3. If a valid session exists, the user is automatically signed in
4. The auth state listener (`onAuthStateChanged`) detects the signed-in state and loads the user data

**Session Expiration:**
- Firebase Auth tokens are valid for 1 hour
- Tokens are automatically refreshed in the background
- Users remain signed in indefinitely unless they log out or clear browser data

## Step 3: Set Up Cloud Firestore

1. Go to **Build > Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll deploy custom rules)
4. Select a Firestore location (choose one close to your users)
   - Recommended: `us-central1` or your preferred region
5. Click **"Enable"**

**Note**: Don't worry about the security rules warning - we'll deploy custom rules in Step 5.

## Step 4: Configure Environment Variables

### Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ next to **"Project Overview"**
2. Select **"Project settings"**
3. Scroll to **"Your apps"** section
4. If you haven't added a web app yet:
   - Click the **"</>** (Web)" icon
   - Register app with a nickname (e.g., "CertLab Web")
   - Check **"Also set up Firebase Hosting"** if prompted
   - Click **"Register app"**
5. Copy the Firebase configuration object

### Create `.env.local` File

In your CertLab project root, create a `.env.local` file:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Optional: Enable cloud sync (default: true)
VITE_ENABLE_CLOUD_SYNC=true

# Optional: Use Firebase Emulator for local development
VITE_USE_FIREBASE_EMULATOR=false
```

**Security Note**: The Firebase API key is **safe to expose client-side**. Firebase uses API keys for identification, not authentication. Security is enforced by Firestore security rules.

### Update `.firebaserc`

Update the `.firebaserc` file in your project root:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Replace `your-project-id` with your actual Firebase project ID.

## Step 5: Deploy Firestore Rules

CertLab includes pre-configured Firestore security rules that enforce per-user data isolation.

### Login to Firebase CLI

```bash
firebase login
```

### Deploy Firestore Rules

```bash
# Deploy security rules
npm run deploy:firestore:rules

# Deploy database indexes
npm run deploy:firestore:indexes

# Or deploy both at once
npm run deploy:firestore
```

### Verify Rules Deployment

1. Go to **Build > Firestore Database** in Firebase Console
2. Click the **"Rules"** tab
3. Verify that the rules match the content of `firestore.rules` in your project

## Step 6: Test with Emulators (Optional)

Firebase Emulators allow you to test locally without affecting production data.

### Install Emulators

```bash
firebase init emulators
```

Select:
- **Authentication Emulator**
- **Firestore Emulator**
- **Emulator UI**

### Start Emulators

```bash
npm run emulators:start
```

The Emulator UI will be available at http://localhost:4000

### Configure App to Use Emulators

Update your `.env.local`:

```bash
VITE_USE_FIREBASE_EMULATOR=true
```

Restart your dev server:

```bash
npm run dev
```

Your app will now connect to local emulators instead of production Firebase.

## Deployment

### Deploy Full Application

```bash
# Build and deploy everything (hosting + Firestore rules)
npm run deploy:all
```

### Deploy Only Hosting

```bash
# Build and deploy hosting only
npm run deploy:firebase
```

### Deploy Only Firestore

```bash
# Deploy Firestore rules and indexes
npm run deploy:firestore
```

## Monitoring and Maintenance

### Monitor Usage

1. Go to **Build > Firestore Database** in Firebase Console
2. Click the **"Usage"** tab to see:
   - Read/Write operations
   - Storage usage
   - Network egress

### Backups

Firebase automatically backs up Firestore data. For additional safety:

1. Go to **Build > Firestore Database**
2. Click the **"Backups"** tab
3. Set up scheduled backups to Cloud Storage

### Set Up Budget Alerts

1. Go to Google Cloud Console (linked from Firebase Console)
2. Navigate to **Billing > Budgets & alerts**
3. Create a budget to monitor costs

## Troubleshooting

### Issue: "Firebase not configured" error

**Solution**: Ensure all required environment variables are set in `.env.local` and restart your dev server.

### Issue: "Unauthorized domain" error when signing in

**Solution**: 
1. Go to **Authentication > Settings > Authorized domains**
2. Add your domain to the authorized list
3. For local development, ensure `localhost` is in the list

### Issue: Firestore permission denied errors

**Solution**: 
1. Verify Firestore rules are deployed: `npm run deploy:firestore:rules`
2. Check that the user is authenticated
3. Review browser console for specific error messages

### Issue: Changes not syncing to Firestore

**Solution**:
1. Check browser console for errors
2. Verify network connectivity
3. Ensure Firebase is initialized: check for Firestore initialization logs
4. Verify user is signed in with Firebase Auth

### Issue: Emulators not working

**Solution**:
1. Ensure emulators are installed: `firebase init emulators`
2. Check that ports 9099 (Auth) and 8080 (Firestore) are not in use
3. Verify `VITE_USE_FIREBASE_EMULATOR=true` in `.env.local`
4. Clear browser cache and restart dev server

### Issue: Build fails with Firebase errors

**Solution**:
1. Ensure Firebase SDK is installed: `npm install`
2. Check for TypeScript errors: `npm run check`
3. Verify all imports are correct

### Issue: Users not staying logged in

**Solution**:
1. Check browser console for Firebase Auth errors
2. Verify that cookies and local storage are enabled in the browser
3. Check that the user isn't in incognito/private browsing mode (some browsers clear storage on exit)
4. Verify Firebase Auth persistence is configured (should see "[Firebase] Persistence configured" log on initialization)
5. Check for browser extensions that might be clearing storage
6. Ensure the user isn't manually clearing browser data

**Note**: Persistent login uses browser local storage. If a user clears their browser data or is in private browsing mode, they will need to sign in again.

## Security Best Practices

1. **Never commit `.env.local`** - it's already in `.gitignore`
2. **Review Firestore rules regularly** - ensure they match your security requirements
3. **Monitor suspicious activity** - check Firebase Console for unusual patterns
4. **Keep Firebase SDK updated** - run `npm update firebase` periodically
5. **Test rules in emulator** - before deploying to production
6. **Enable App Check** (optional) - for additional security against abuse

## Cost Optimization

Firebase offers a generous free tier. To optimize costs:

1. **Use caching**: Firestore SDK's automatic offline caching reduces read operations
2. **Batch operations**: Group writes together when possible
3. **Limit queries**: Use pagination for large result sets
4. **Clean up old data**: Remove unused documents
5. **Monitor usage**: Set up budget alerts

## Free Tier Limits

Firebase Spark (free) tier includes:
- **Firestore**: 50,000 reads/day, 20,000 writes/day, 1 GB storage
- **Authentication**: Unlimited
- **Hosting**: 10 GB storage, 360 MB/day transfer

Most users will stay within free tier limits. Firestore SDK's automatic offline caching significantly reduces Firestore read operations.

## Need Help?

- **Firebase Documentation**: https://firebase.google.com/docs
- **CertLab Issues**: https://github.com/archubbuck/certlab/issues
- **Firebase Support**: https://firebase.google.com/support

## Next Steps

After completing setup:
1. Run `npm run dev` to test locally
2. Create a test account using email/password
3. Verify data syncs to Firestore (check Firebase Console)
4. Deploy to production: `npm run deploy:all`
5. Test production deployment
6. Enable monitoring and set up budget alerts

---

**Last Updated**: December 2024  
**CertLab Version**: 2.0.0
