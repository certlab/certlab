# Migration Guide: IndexedDB to Firestore

This guide explains how CertLab's data migration works and what users need to know.

## Table of Contents

- [Overview](#overview)
- [What's Changing](#whats-changing)
- [For Existing Users](#for-existing-users)
- [For New Users](#for-new-users)
- [Migration Process](#migration-process)
- [Data Security](#data-security)
- [Offline Mode](#offline-mode)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Overview

CertLab is transitioning from a local-only app to a hybrid model that supports:
- **Local storage**: All data stored in your browser's IndexedDB (no account required)
- **Cloud sync**: Optional cloud backup and sync via Firebase/Firestore (requires account)

This migration is **completely optional** - you can continue using CertLab locally without creating an account.

## What's Changing

### Before (Local Only)
- All data stored in browser IndexedDB
- No account required
- Data only available on one device
- No backup if browser data is cleared

### After (Hybrid Model)
- IndexedDB remains as local cache
- Optional Firebase account for cloud sync
- Access data from multiple devices
- Automatic cloud backup
- Offline-first architecture (works offline)

## For Existing Users

If you've been using CertLab without an account:

### Option 1: Continue Local-Only (No Migration)

You can keep using CertLab exactly as before:
- No account needed
- All data stays local
- Nothing changes for you

### Option 2: Migrate to Cloud Sync

To enable cloud backup and multi-device access:

1. **Create an Account**
   - Click "Sign Up" in the header
   - Choose email/password or Google sign-in
   - Your email is used for account recovery only

2. **Upload Local Data**
   - After signing in, you'll see a "Cloud Sync" prompt
   - Click "Upload Local Data to Cloud"
   - Review what will be uploaded (quizzes, progress, badges, etc.)
   - Click "Start Migration"

3. **Wait for Completion**
   - Migration typically takes 5-30 seconds
   - Progress bar shows upload status
   - Do not close the browser during migration

4. **Verify Migration**
   - Check your profile to see sync status
   - Your local data remains as a cache
   - Cloud sync indicator shows connection status

## For New Users

New users have two options:

### Start with Cloud Sync (Recommended)
1. Click "Sign Up" on the landing page
2. Create account with email or Google
3. Start learning - data automatically syncs

### Start Local-Only
1. Click "Get Started" without signing up
2. Use CertLab locally
3. Migrate to cloud sync later if desired

## Migration Process

### What Gets Migrated

The following data is uploaded to your personal Firestore account:
- ✅ User profile (name, preferences, goals)
- ✅ Quiz history and results
- ✅ Learning progress per category
- ✅ Earned badges and achievements
- ✅ Game statistics (points, streaks, level)
- ✅ Study notes
- ✅ Practice test attempts

### What Stays Local

The following data remains in shared collections (not migrated):
- ❌ Question bank (shared across all users)
- ❌ Category definitions (shared)
- ❌ Badge definitions (shared)
- ❌ Lecture content (shared)

### Migration Algorithm

1. **User Profile**: Creates Firestore user document
2. **Incremental Sync**: Uploads collections one at a time
3. **Deduplication**: Uses timestamps to prevent duplicates
4. **Error Handling**: Retries failed items, continues on errors
5. **Sync Metadata**: Tracks sync status in IndexedDB

### Sync Strategy

After initial migration, CertLab uses two-way sync:
- **Writes**: Saved to both IndexedDB and Firestore
- **Reads**: Served from IndexedDB cache first
- **Conflicts**: Server (Firestore) wins by default
- **Offline**: Changes queued and synced when online

## Data Security

### Privacy

- **Your data is yours**: Each user has isolated data in Firestore
- **No sharing by default**: Your quizzes and progress are private
- **Firestore rules**: Enforce per-user access control
- **Firebase Auth**: Industry-standard authentication

### Security Rules

CertLab uses strict Firestore security rules:
```javascript
// Example: Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}
```

### Data Encryption

- **In transit**: TLS/HTTPS encryption
- **At rest**: Google Cloud encryption
- **API keys**: Safe to expose (security enforced by rules)

## Offline Mode

CertLab works offline after initial load:

### Local-Only Mode
- Full functionality without internet
- Data never leaves your device
- No account needed

### Cloud Sync Mode
- Works offline using IndexedDB cache
- Changes queued for sync when online
- Sync indicator shows connection status
- Automatic retry when network returns

### Offline Indicator

Look for the cloud sync indicator in the header:
- 🟢 **Green**: Connected and synced
- 🟡 **Yellow**: Syncing in progress
- 🔴 **Red**: Offline (changes queued)
- ⚫ **Gray**: Local-only mode

## Troubleshooting

### Migration Failed

**Symptoms**: Error message during migration, sync status shows "error"

**Solutions**:
1. Check internet connection
2. Refresh the page and try again
3. Check browser console for error details
4. Contact support if issue persists

### Data Not Syncing

**Symptoms**: Changes made offline not appearing in cloud

**Solutions**:
1. Wait for internet connection to restore
2. Check sync indicator in header
3. Manually trigger sync from Settings
4. Verify Firebase account is active

### Duplicate Data After Migration

**Symptoms**: Seeing duplicate quizzes or progress entries

**Solutions**:
1. This shouldn't happen (migration is idempotent)
2. If it occurs, clear browser cache and re-sync
3. Contact support to investigate

### Lost Local Data

**Symptoms**: Local data disappeared after migration

**Solutions**:
1. Don't panic - data is in Firestore
2. Sign in with your account
3. Data will re-sync to IndexedDB
4. Check Settings > Data Management to download backup

### Can't Sign In

**Symptoms**: Login errors, authentication failures

**Solutions**:
1. Verify email and password
2. Check for "forgot password" link
3. Try Google sign-in as alternative
4. Clear browser cache and cookies
5. Contact support if issue persists

## FAQ

### Do I need to migrate?

No, migration is completely optional. You can continue using CertLab locally without an account.

### Will my local data be deleted?

No, your local IndexedDB data remains as a cache even after migration.

### Can I migrate multiple times?

Yes, the migration is idempotent (safe to run multiple times). It won't create duplicates.

### Can I undo migration?

You can delete your cloud data from Settings, but this won't restore local-only mode. Your IndexedDB cache remains intact.

### How long does migration take?

Typically 5-30 seconds depending on how much data you have (quizzes, progress, etc.).

### What if migration is interrupted?

If your browser closes during migration, simply sign in again and restart the migration. It will resume where it left off.

### Can I sync across devices?

Yes! After migration, sign in on any device to access your data.

### Is there a storage limit?

Firebase free tier includes 1 GB storage. Most users will stay well below this limit.

### Can I export my data?

Yes, CertLab supports data export in Settings > Data Management. You can download JSON backups of all your data.

### What happens if I delete my browser data?

- **Local-only mode**: All data is lost (no backup)
- **Cloud sync mode**: Data is safe in Firestore, will re-sync when you sign in

### Can I switch back to local-only?

Yes, you can disable cloud sync in Settings. Your local cache remains functional.

### Is my email shared with anyone?

No, your email is only used for account authentication and recovery. CertLab doesn't sell or share user data.

### What about my password?

- **Email/password**: Passwords are hashed by Firebase Auth (never stored in plain text)
- **Google sign-in**: CertLab never sees your Google password

## Migration Checklist

Before migrating:
- [ ] Ensure stable internet connection
- [ ] Create Firebase account (email or Google)
- [ ] Review what will be uploaded
- [ ] Keep browser tab open during migration

During migration:
- [ ] Click "Upload Local Data to Cloud"
- [ ] Wait for progress bar to complete
- [ ] Don't close browser or tab

After migration:
- [ ] Verify sync status in profile
- [ ] Test creating a quiz to confirm sync works
- [ ] (Optional) Sign in on another device to verify multi-device sync
- [ ] (Optional) Export backup from Settings

## Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review browser console for error messages
3. Check [Firebase Setup Guide](FIREBASE_SETUP.md) for configuration issues
4. Open an issue: https://github.com/archubbuck/certlab/issues
5. Include error messages and browser console logs

## Technical Details

For developers interested in the implementation:

### Architecture
- **IndexedDB**: Local cache and offline fallback
- **Firestore**: Source of truth when online
- **Sync Service**: Bidirectional sync engine
- **Conflict Resolution**: Server (Firestore) wins

### Data Model
```
/users/{userId}
  - profile (User document)
  - /quizzes/{quizId} (Quiz subcollection)
  - /progress/{progressId} (UserProgress subcollection)
  - /badges/{badgeId} (UserBadge subcollection)
  - /gameStats/{userId} (UserGameStats document)
```

### Implementation Files
- `client/src/lib/firestore-service.ts`: Firestore operations
- `client/src/lib/firestore-migration.ts`: Migration logic
- `firestore.rules`: Security rules
- `firestore.indexes.json`: Query indexes

---

**Last Updated**: December 2024  
**CertLab Version**: 2.0.0
