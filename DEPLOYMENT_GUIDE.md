# CertLab Deployment Guide

## Quick Start for GitHub Pages

### Prerequisites
- GitHub repository with this code
- GitHub Pages enabled (happens automatically with the workflow)

### Automatic Deployment

1. **Push to Main Branch**
   ```bash
   git push origin main
   ```

2. **GitHub Actions runs automatically**
   - Builds the application
   - Deploys to GitHub Pages
   - Available at `https://[username].github.io/certlab/`

3. **First-Time Setup**
   - Go to repository **Settings** → **Pages**
   - Set **Source** to: **GitHub Actions**
   - Save (if not already set)

### Manual Deployment

If you prefer manual deployment:

```bash
# Build the application
npm run build

# The dist/ folder contains the static site
# Upload to any static hosting service
```

## Environment Variables

### Base Path Configuration

For different repository names:

```bash
# Set before building
export VITE_BASE_PATH=/your-repo-name/
npm run build
```

Or in GitHub Actions:
```yaml
- name: Build
  run: npm run build
  env:
    VITE_BASE_PATH: /your-repo-name/
```

### Default Behavior
- **Development**: Base path is `/`
- **Production**: Base path is `/certlab/` (or VITE_BASE_PATH if set)

## Deployment Targets

### GitHub Pages (Recommended)
✅ Free hosting
✅ Automatic HTTPS
✅ GitHub Actions integration
✅ CDN distribution

**URL**: `https://[username].github.io/[repo-name]/`

### Firebase Hosting

Firebase Hosting is an excellent alternative with fast global CDN and easy setup.

✅ Free tier available (10 GB storage, 360 MB/day transfer)
✅ Automatic HTTPS with SSL certificates
✅ Global CDN (Fastly network)
✅ Easy rollbacks and preview channels
✅ Custom domain support

#### Prerequisites

1. A Google account
2. A Firebase project (create at [console.firebase.google.com](https://console.firebase.google.com))
3. Firebase CLI (included as dev dependency)

#### Manual Deployment

```bash
# 1. Install dependencies (includes Firebase CLI)
npm install

# 2. Login to Firebase
npx firebase login

# 3. Set up your Firebase project
npx firebase use --add
# Select your project from the list

# 4. Build and deploy
npm run deploy:firebase

# Alternative: Build then deploy separately
npm run build:firebase
npx firebase deploy --only hosting
```

#### GitHub Actions Deployment (Automated)

The repository includes a Firebase deployment workflow at `.github/workflows/firebase-deploy.yml`.

**Setup Steps:**

1. **Create Firebase Service Account:**
   - Go to Firebase Console → Project Settings → Service accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Add GitHub Secrets:**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `FIREBASE_SERVICE_ACCOUNT`: Paste the entire JSON content from step 1
     - `FIREBASE_PROJECT_ID`: Your Firebase project ID

3. **Configure Firebase Project:**
   - Update `.firebaserc` with your project ID:
   ```json
   {
     "projects": {
       "default": "your-firebase-project-id"
     }
   }
   ```

4. **Deploy:**
   - Push to `main` branch
   - GitHub Actions will automatically build and deploy to Firebase Hosting

**URL**: `https://[project-id].web.app` or `https://[project-id].firebaseapp.com`

#### Firebase Configuration Files

- `firebase.json`: Hosting configuration including SPA rewrites
- `.firebaserc`: Project aliases and configuration

The configuration includes:
- SPA rewrite rules (all routes redirect to index.html)
- Cache headers for static assets
- Standard ignore patterns

#### Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run build:firebase` | Build with base path set to `/` for Firebase |
| `npm run deploy:firebase` | Build and deploy to Firebase Hosting |

### Netlify
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Set `VITE_BASE_PATH=/` for root domain

### Vercel
1. Import GitHub repository
2. Framework: Vite
3. Build command: `npm run build`
4. Output directory: `dist`
5. Set `VITE_BASE_PATH=/` for root domain

### Custom Server
```bash
# Build
npm run build

# Serve with any static server
cd dist
python -m http.server 8000
# or
npx serve
```

## First User Experience

### When a user visits for the first time:

1. **Landing Page Loads**
   - Shows feature overview
   - "Get Started" button

2. **Registration**
   - User creates account
   - Credentials stored in IndexedDB
   - SHA-256 password hashing

3. **Seed Data Auto-Loads**
   - 2 certification categories (CISSP, CISM)
   - 5 subcategories
   - 6 sample questions
   - 5 achievement badges
   - Version tracked (prevents duplicates)

4. **Dashboard Access**
   - Full quiz functionality
   - Progress tracking
   - Achievement system

## Data Persistence

### Browser Storage
- All data stored in IndexedDB
- Persists across sessions
- Cleared if browser data is cleared
- Unique per browser/profile

### Backup Strategy
Users should export their data regularly:

```javascript
// In browser console or via UI
import { clientStorage } from './lib/client-storage';
const data = await clientStorage.exportData();
// Download or save the JSON
```

## Monitoring

### GitHub Actions
- Check **Actions** tab for build status
- Review deployment logs
- Monitor for failures

### Browser Console
- Check for errors on first load
- Verify IndexedDB is working
- Check seed data version

## Troubleshooting

### Build Fails
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Deployment Fails
1. Check GitHub Pages is enabled
2. Verify workflow permissions
3. Check Actions tab for errors

### App Not Loading
1. Clear browser cache
2. Check browser console for errors
3. Verify JavaScript is enabled
4. Check IndexedDB is available

### Routes Not Working
- Ensure .nojekyll file is present
- Check base path configuration
- Verify GitHub Pages settings

### Data Not Persisting
1. Check browser privacy settings
2. Verify IndexedDB quota
3. Try different browser
4. Check browser console errors

## Browser Compatibility

### Supported Browsers
✅ Chrome 87+
✅ Firefox 78+
✅ Safari 14+
✅ Edge 88+

### Required Features
- IndexedDB
- Web Crypto API (SHA-256)
- ES6+ JavaScript
- LocalStorage (for settings)

### Not Supported
❌ IE 11 and older
❌ Browsers with IndexedDB disabled
❌ Private/Incognito mode (data won't persist)

## Performance

### Initial Load
- ~630 KB JavaScript (gzipped: ~178 KB)
- ~133 KB CSS (gzipped: ~21 KB)
- < 1 second load time on good connection

### Runtime
- All operations local (IndexedDB)
- No network latency
- Instant responses
- Smooth UI transitions

### Optimization Tips
1. Enable browser caching
2. Use service worker (future enhancement)
3. Implement code splitting (future enhancement)

## Security

### Data Security
✅ All data stored locally
✅ No external transmission
✅ SHA-256 password hashing
✅ crypto.randomUUID() for IDs
✅ No tracking or analytics

### Privacy
- Single user per browser
- Data never leaves browser
- No server to compromise
- User controls all data

### Known Limitations
- Passwords hashed with SHA-256 (not bcrypt)
- For local storage only (acceptable trade-off)
- No rate limiting (not needed for local app)

## Updates and Maintenance

### Updating the App
1. Pull latest code
2. Push to main branch
3. GitHub Actions deploys automatically
4. Users get updates on next visit

### Schema Changes
Update seed data version in `client/src/lib/seed-data.ts`:
```typescript
const SEED_VERSION = 2; // Increment this
```

### Breaking Changes
- Document in CHANGELOG
- Provide migration path
- Consider data export/import

## Support

### User Issues
Direct users to:
1. Check browser compatibility
2. Try different browser
3. Export/import data if needed
4. Create GitHub issue

### Developer Issues
1. Check MIGRATION_STATUS.md
2. Review build logs
3. Test locally first
4. Create issue with details

## Success Metrics

After deployment, verify:
- ✅ Registration works
- ✅ Login works
- ✅ Data persists
- ✅ Quizzes work
- ✅ No console errors
- ✅ Mobile responsive

## Next Steps

1. **Test in production**
   - Register test account
   - Create quiz
   - Verify data persists

2. **Share with users**
   - Update documentation
   - Provide usage guide
   - Share URL

3. **Monitor feedback**
   - Watch for issues
   - Collect user feedback
   - Plan improvements

## Additional Resources

- **README.md** - Architecture and features
- **MIGRATION_STATUS.md** - Migration progress
- **GitHub Pages Docs** - https://docs.github.com/en/pages
- **Vite Docs** - https://vitejs.dev/
