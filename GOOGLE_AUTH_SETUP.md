# Google Authentication Setup Guide

This guide will help you configure Google Sign-In for CertLab using Firebase.

## Prerequisites

1. A Google account
2. A Firebase project (create one at https://console.firebase.google.com)
3. Admin access to your GitHub repository (to set secrets)

## Step 1: Create or Configure Firebase Project

### 1.1 Create a Firebase Project (if you don't have one)

1. Go to https://console.firebase.google.com
2. Click "Add project" or select an existing project
3. Enter a project name (e.g., "CertLab")
4. Follow the setup wizard (Analytics is optional)

### 1.2 Add a Web App to Your Firebase Project

1. In your Firebase project, click the web icon (`</>`) to add a web app
2. Register the app with a nickname (e.g., "CertLab Web")
3. **Do NOT** enable Firebase Hosting (we use GitHub Pages)
4. Copy the Firebase configuration values that appear - you'll need these later

The configuration looks like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc..."
};
```

## Step 2: Enable Google Sign-In in Firebase

1. In Firebase Console, go to **Authentication** → **Get Started** (if first time)
2. Go to **Authentication** → **Sign-in method**
3. Click on **Google** in the list of providers
4. Toggle **Enable** to ON
5. Set a **Project support email** (usually your email)
6. Click **Save**

## Step 3: Configure Authorized Domains

Google Sign-In only works on authorized domains for security.

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. You should see `localhost` already listed (for local development)
3. Click **Add domain** and add your GitHub Pages domain:
   - For the main repository: `archubbuck.github.io`
   - For forks: `yourusername.github.io`
4. Click **Add**

**Important**: If you use a custom domain, add that domain as well.

## Step 4: Add Firebase Configuration to GitHub Secrets

Now you need to add the Firebase configuration values as GitHub Secrets so they're available during the build process.

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of the following:

### Required Secrets (from firebaseConfig above):

| Secret Name | Value | Example |
|------------|-------|---------|
| `VITE_FIREBASE_API_KEY` | Your Firebase API key | `AIzaSyAbc123...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase auth domain | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID | `your-project-id` |

### Optional Secrets (recommended but not required for Google Sign-In):

| Secret Name | Value | Example |
|------------|-------|---------|
| `VITE_FIREBASE_STORAGE_BUCKET` | Your Firebase storage bucket | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Your Firebase app ID | `1:123456789:web:abc...` |

## Step 5: Deploy and Test

1. **Commit and push** any changes (or trigger a workflow manually)
2. GitHub Actions will automatically build and deploy your app with Firebase configuration
3. Visit your deployed app (e.g., https://archubbuck.github.io/certlab/)
4. Try signing in with Google

## Troubleshooting

### Error: "This domain is not authorized for Google Sign-In"

**Solution**: Add your domain to authorized domains in Firebase Console (Step 3 above).

### Error: "Google Sign-In is not enabled in Firebase Console"

**Solution**: Enable Google Sign-In provider in Firebase Authentication (Step 2 above).

### Error: "Sign-in popup was blocked by your browser"

**Solution**: Allow popups for your site in your browser settings.

### Error: "Firebase API key is invalid"

**Solution**: 
1. Double-check the `VITE_FIREBASE_API_KEY` secret in GitHub
2. Make sure you copied the correct value from Firebase Console
3. Regenerate the API key in Firebase if needed

### Google Sign-In button doesn't appear

**Possible causes**:
1. Firebase secrets are not set in GitHub → Set them (Step 4 above)
2. Firebase secrets are set but empty → Make sure they have valid values
3. Browser cache → Clear browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Error: "Failed to sign in with Google"

This is a generic error. Check the browser console (F12) for more detailed error messages. The enhanced error handling will now show specific errors like:
- Domain authorization issues
- Configuration problems
- Network errors

## Local Development

If you want to test Google Sign-In locally:

1. Create a `.env` file in the project root:
```bash
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...
```

2. Make sure `localhost` is in the authorized domains (it should be by default)

3. Run the development server:
```bash
npm run dev
```

4. Visit http://localhost:5000 and test Google Sign-In

## Security Notes

1. **Firebase API keys are safe to expose**: Firebase API keys are designed to be included in client-side code. They identify your Firebase project but don't grant access to data. Access control is handled by Firebase Security Rules.

2. **Authorized domains protect against abuse**: The authorized domains list in Firebase Console prevents unauthorized sites from using your Firebase project.

3. **Environment variables in builds**: The Firebase configuration is baked into the JavaScript bundle during build. This is normal and expected for client-side Firebase apps.

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Google Sign-In for Web](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## Support

If you encounter issues not covered in this guide:

1. Check the browser console (F12) for detailed error messages
2. Verify all steps in this guide were completed
3. Check Firebase Console for any service status issues
4. Review the Firebase Authentication logs in Firebase Console
