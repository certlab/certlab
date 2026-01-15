# CertLab Administrator Guide

**Version**: 2.0.0  
**Last Updated**: January 15, 2026  
**Audience**: System Administrators, Educational Institution IT Staff

---

## Table of Contents

1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [User Management](#user-management)
5. [Content Management](#content-management)
6. [Access Control](#access-control)
7. [Data Management](#data-management)
8. [Monitoring & Analytics](#monitoring--analytics)
9. [Security Administration](#security-administration)
10. [Privacy & Compliance](#privacy--compliance)
11. [Backup & Recovery](#backup--recovery)
12. [Troubleshooting](#troubleshooting)
13. [Best Practices](#best-practices)

---

## Introduction

This guide provides comprehensive instructions for administrators managing CertLab deployments. Whether you're deploying for an educational institution, corporate training, or personal use, this guide covers everything you need to know.

### Administrator Responsibilities

As a CertLab administrator, you are responsible for:

- **User Management**: Creating admin accounts, managing user access
- **Content Management**: Importing questions, managing categories
- **Security**: Maintaining security rules, monitoring vulnerabilities
- **Privacy Compliance**: Ensuring GDPR/FERPA compliance
- **Performance**: Monitoring system health and performance
- **Data Integrity**: Backups, data validation, recovery

---

## Prerequisites

### Technical Requirements

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Firebase Project**: Required for production deployment
- **Git**: For version control
- **Firebase CLI**: For deployment (`npm install -g firebase-tools`)

### Knowledge Requirements

- Basic command line proficiency
- Understanding of Firebase/Firestore
- Familiarity with web application deployment
- Basic understanding of security principles

### Access Requirements

- GitHub account (for repository access)
- Firebase project with owner or editor role
- Firestore database access
- (Optional) Dynatrace account for monitoring

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/archubbuck/certlab.git
cd certlab
npm install
```

### 2. Firebase Configuration

#### Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name (e.g., "certlab-prod")
4. Enable/disable Google Analytics (optional)
5. Click "Create project"

#### Enable Authentication

1. Navigate to **Authentication** → **Sign-in method**
2. Enable **Google** provider:
   - Click "Google"
   - Toggle "Enable"
   - Set project support email
   - Click "Save"
3. (Optional) Enable **Email/Password**:
   - Click "Email/Password"
   - Toggle "Enable"
   - Click "Save"

#### Create Firestore Database

1. Navigate to **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (security rules deployed separately)
4. Select location (choose closest to your users)
5. Click "Enable"

#### Get Firebase Configuration

1. Go to **Project Settings** → **General**
2. Scroll to "Your apps"
3. Click web icon (</>)
4. Register app name (e.g., "CertLab Web")
5. Copy configuration object

#### Configure Environment

Create `.env.local` file:

```bash
# Firebase Configuration (Required)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Dynatrace Configuration (Optional)
VITE_DYNATRACE_SCRIPT_URL=https://js-cdn.dynatrace.com/jstag/...
```

### 3. Deploy Security Rules

```bash
# Login to Firebase
firebase login

# Select your project
firebase use --add

# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy storage rules (if using Firebase Storage)
firebase deploy --only storage

# Deploy indexes
firebase deploy --only firestore:indexes
```

### 4. Create First Admin User

#### Option A: Via Firestore Console

1. Sign in to your app with a Google account
2. Go to Firestore console
3. Navigate to `users` collection
4. Find your user document (by email)
5. Edit the document:
   - Add field: `role` (string) = `"admin"`
   - Save

#### Option B: Via Firebase CLI

```bash
# Use Firebase CLI to update user role
firebase firestore:write users/{userId} '{"role": "admin"}'
```

### 5. Verify Installation

```bash
# Start development server
npm run dev

# Open http://localhost:5000
# Sign in with your admin account
# Verify admin menu appears
```

---

## User Management

### User Roles

CertLab supports two roles:

| Role | Permissions |
|------|-------------|
| **User** | Take quizzes, view progress, manage own data |
| **Admin** | All user permissions + content management, user management, analytics |

### Granting Admin Access

**Via Firestore Console**:
1. Go to Firestore → `users` collection
2. Find user document
3. Set `role: "admin"`

**Via Admin Panel** (if already admin):
1. Navigate to Admin → User Management
2. Search for user
3. Click "Promote to Admin"

### Revoking Admin Access

1. Go to Firestore → `users` collection
2. Find admin user document
3. Change `role` to `"user"` or remove field

### Disabling User Accounts

**Via Firebase Console**:
1. Go to Authentication → Users
2. Find user
3. Click three dots → Disable account

**Note**: Disabled users cannot sign in but their data is retained.

### Deleting User Accounts

**User Self-Service**:
- Users can delete their own accounts via Profile → Settings → Delete Account

**Admin Action** (for GDPR/compliance):
1. Go to Authentication → Users
2. Find user → Delete user
3. Manually delete user data from Firestore:
   ```
   users/{userId} - Delete document
   quizzes (where userId == {userId}) - Delete all
   userProgress (where userId == {userId}) - Delete all
   userBadges (where userId == {userId}) - Delete all
   userGameStats/{userId} - Delete document
   ```

**Important**: Firestore security rules may prevent manual deletion. Use admin SDK or Firebase console.

### User Data Export (GDPR Compliance)

**User Self-Service**:
- Profile → Export Data → Download JSON

**Admin Export**:
```javascript
// Use Firebase Admin SDK
const userId = 'user-id-here';
const userData = {
  profile: await getDoc(doc(db, 'users', userId)),
  quizzes: await getDocs(query(collection(db, 'quizzes'), where('userId', '==', userId))),
  progress: await getDocs(query(collection(db, 'userProgress'), where('userId', '==', userId))),
  // ... export all user data
};
```

---

## Content Management

### Importing Questions

#### Via Admin Panel

1. Navigate to **Admin → Data Import**
2. Choose import method:
   - **Sample Data**: CISSP (500 questions) or CISM (500 questions)
   - **Upload YAML**: Custom question file
3. Click "Import"
4. Wait for completion
5. Verify in Question Bank

#### Sample YAML Format

```yaml
questions:
  - id: "q1"
    text: "What is the primary purpose of access control?"
    options:
      - "Prevent unauthorized access"
      - "Monitor user activity"
      - "Log system events"
      - "Backup data"
    correctAnswer: 0
    explanation: "Access control primarily prevents unauthorized access to resources."
    category: "Access Control"
    subcategory: "Authentication"
    difficulty: "medium"
    
  - id: "q2"
    text: "Which encryption algorithm is symmetric?"
    options:
      - "RSA"
      - "AES"
      - "ECC"
      - "DSA"
    correctAnswer: 1
    explanation: "AES (Advanced Encryption Standard) is a symmetric encryption algorithm."
    category: "Cryptography"
    subcategory: "Symmetric Encryption"
    difficulty: "easy"
```

#### Via Script

```bash
# Import questions from YAML file
node scripts/import_questions.js --file questions.yaml --tenant default
```

### Managing Categories

#### Create Category

1. Navigate to **Admin → Categories**
2. Click "Add Category"
3. Fill in:
   - **Name**: Category name (e.g., "CISSP")
   - **Description**: Brief description
   - **Icon**: Icon name from Lucide Icons
   - **Color**: Hex color code
   - **Tenant**: Organization/tenant
4. Click "Create"

#### Add Subcategories

1. Select category
2. Click "Add Subcategory"
3. Enter:
   - **Name**: Subcategory name (e.g., "Access Control")
   - **Description**: Optional description
4. Click "Create"

### Managing Study Materials

#### Create Lecture

1. Navigate to **Admin → Study Materials**
2. Click "Create Lecture"
3. Fill in:
   - **Title**: Lecture title
   - **Category**: Select category
   - **Subcategory**: Select subcategory
   - **Content Type**: Text, Video, PDF, Interactive, Code
   - **Content**: Enter or upload content
4. Click "Save"

#### Content Type Guidelines

| Type | Best For | Format |
|------|----------|--------|
| **Text** | Study guides, notes | Markdown |
| **Video** | Tutorials, explanations | YouTube/Vimeo URL or upload |
| **PDF** | Reference materials | PDF upload |
| **Interactive** | Quizzes, simulations | HTML embed |
| **Code** | Programming examples | Code snippets |

### Managing Badges

Badges are predefined in the system. To add custom badges:

1. Navigate to **Admin → Achievements**
2. Click "Create Badge"
3. Configure:
   - **Name**: Badge name
   - **Description**: What it represents
   - **Icon**: Icon name
   - **Rarity**: Common, Rare, Epic, Legendary
   - **Requirements**: JSON config for earning criteria
4. Click "Save"

---

## Access Control

### Firestore Security Rules

**Location**: `firestore.rules`

#### Key Rules

```javascript
// Users can only access their own data
match /users/{userId} {
  allow read, write: if request.auth.uid == userId;
}

// Users can read shared content
match /categories/{categoryId} {
  allow read: if request.auth != null;
  allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Users can only access their own quizzes
match /quizzes/{quizId} {
  allow read, write: if request.auth.uid == resource.data.userId;
}
```

#### Deploy Rules

```bash
firebase deploy --only firestore:rules
```

#### Test Rules

```bash
# Use Firebase Emulator Suite
firebase emulators:start

# Run security rules tests
npm run test:rules
```

### Role-Based Access Control (RBAC)

**Implementing Custom Roles**:

1. Define roles in Firestore:
```javascript
// In users/{userId}
{
  role: 'admin' | 'teacher' | 'student',
  permissions: ['read', 'write', 'delete', 'manage_users']
}
```

2. Update security rules:
```javascript
function hasPermission(permission) {
  let user = get(/databases/$(database)/documents/users/$(request.auth.uid));
  return user.data.permissions.hasAny([permission]);
}

match /questions/{questionId} {
  allow read: if request.auth != null;
  allow write: if hasPermission('write');
}
```

### Multi-Tenancy

**Enable Multi-Tenant Mode**:

1. Each tenant is a separate organization
2. Categories and questions are scoped to tenants
3. Users can switch between tenants

**Create Tenant**:
1. Navigate to **Admin → Tenants**
2. Click "Add Tenant"
3. Configure:
   - **Name**: Organization name
   - **ID**: Unique identifier
   - **Settings**: Tenant-specific settings
4. Click "Create"

---

## Data Management

### Backup Strategies

#### Firestore Backups

**Automated Backups** (Recommended):

```bash
# Using Firebase CLI
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)

# Schedule with cron (Linux/Mac)
0 2 * * * firebase firestore:export gs://your-bucket/backups/$(date +\%Y\%m\%d)
```

**Manual Backups**:

1. Go to Firestore console
2. Click "Import/Export"
3. Select "Export"
4. Choose collections
5. Specify Cloud Storage bucket
6. Click "Export"

#### User Data Exports

**Bulk Export Script**:

```javascript
// scripts/export-all-users.js
import { db } from '../client/src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function exportAllUsers() {
  const users = await getDocs(collection(db, 'users'));
  const exports = [];
  
  for (const userDoc of users.docs) {
    const userId = userDoc.id;
    // Export user data...
    exports.push(await exportUserData(userId));
  }
  
  return exports;
}
```

### Data Restoration

#### Restore from Firestore Backup

```bash
firebase firestore:import gs://your-bucket/backups/20260115
```

#### Restore Individual User

1. Navigate to **Admin → Data Import**
2. Click "Import User Data"
3. Upload JSON export file
4. Select user or create new
5. Click "Import"

### Data Validation

**Validate Question Bank**:

```bash
# Run validation script
node scripts/validate_questions.js

# Check for:
# - Duplicate IDs
# - Missing required fields
# - Invalid option counts
# - Orphaned subcategories
```

**Validate User Data**:

1. Navigate to **Admin → Data Tools**
2. Click "Validate Data"
3. Review report
4. Fix issues manually or via script

### Data Cleanup

**Remove Orphaned Data**:

```bash
# Remove quizzes with no user
node scripts/cleanup_orphaned_data.js --type quizzes

# Remove progress with no category
node scripts/cleanup_orphaned_data.js --type progress
```

---

## Monitoring & Analytics

### Dynatrace Integration (Optional)

**Setup**:

1. Sign up at [dynatrace.com](https://www.dynatrace.com)
2. Create Web Application
3. Get RUM script URL
4. Add to `.env.local`:
   ```
   VITE_DYNATRACE_SCRIPT_URL=https://js-cdn.dynatrace.com/jstag/...
   ```
5. Deploy with environment variable

**What Dynatrace Monitors**:
- Real user monitoring (page load times, interactions)
- JavaScript errors and stack traces
- User journey analytics
- Performance bottlenecks
- Custom business metrics

**Accessing Dashboards**:
1. Log in to Dynatrace
2. Navigate to Applications → CertLab
3. View metrics, sessions, errors

### Firebase Analytics

**Enable**:
1. Go to Firebase Console → Analytics
2. Enable Google Analytics integration
3. Configure properties

**Metrics Tracked**:
- User sign-ups
- Quiz completions
- Feature usage
- Retention rates

### Custom Logging

**Application Logs**:
- Located in browser console (development)
- Sent to Dynatrace (production, if configured)

**Server Logs** (if using Firebase Functions):
- View in Firebase Console → Functions → Logs

### Performance Monitoring

**Key Metrics to Monitor**:

| Metric | Target | Tool |
|--------|--------|------|
| Page Load Time | < 2s | Dynatrace, Lighthouse |
| Time to Interactive | < 3s | Lighthouse |
| First Contentful Paint | < 1.5s | Lighthouse |
| Cumulative Layout Shift | < 0.1 | Lighthouse |
| JavaScript Errors | < 0.1% users | Dynatrace |

**Run Performance Audit**:

```bash
# Build production
npm run build

# Run Lighthouse
npm run lighthouse
```

---

## Security Administration

### Vulnerability Management

**Automated Scanning**:
- **Dependabot**: Configured in `.github/dependabot.yml`
- **npm audit**: Run `npm audit` weekly
- **GitHub Security Advisories**: Auto-enabled

**Review Vulnerabilities**:

```bash
# Check current vulnerabilities
npm audit

# Fix vulnerabilities (safe)
npm audit fix

# Fix all (may include breaking changes)
npm audit fix --force
```

**Dependabot Alerts**:
1. Go to GitHub → Security → Dependabot alerts
2. Review each alert
3. Click "Create Dependabot security update" or update manually
4. Test and merge PR

### Security Monitoring

**Enable Security Alerts**:
1. GitHub repository → Settings → Security & analysis
2. Enable all features:
   - Dependency graph
   - Dependabot alerts
   - Dependabot security updates
   - Code scanning (GitHub Advanced Security)

**Review Security Logs**:
- Firebase Console → Authentication → Users (check for suspicious activity)
- Firestore Console → Usage (monitor for unusual patterns)
- Dynatrace → Sessions (review user journeys)

### Incident Response

**If Security Incident Detected**:

1. **Immediate Actions**:
   - Disable affected accounts (Firebase Auth)
   - Revoke compromised tokens
   - Block malicious IPs (Cloud Armor or Firestore rules)
   - Document incident details

2. **Assessment**:
   - Determine scope of breach
   - Identify affected users
   - Review access logs

3. **Remediation**:
   - Patch vulnerability
   - Reset affected user credentials
   - Deploy security updates

4. **Notification** (GDPR requires within 72 hours if high risk):
   - Notify affected users
   - Report to authorities if required
   - Document in incident log

5. **Post-Incident**:
   - Conduct root cause analysis
   - Update security procedures
   - Implement additional controls

### Firestore Security Best Practices

**Review Security Rules**:
```bash
# Test security rules
firebase emulators:start --only firestore
npm run test:rules
```

**Key Principles**:
- ✅ Always validate user authentication
- ✅ Implement per-user data isolation
- ✅ Validate data types and formats
- ✅ Limit query complexity
- ✅ Use least privilege principle
- ❌ Never expose admin operations to clients

---

## Privacy & Compliance

### GDPR Compliance

**Data Subject Rights**:

| Right | Implementation | Admin Action |
|-------|----------------|--------------|
| Right to Access | User: Export Data<br>Admin: Provide data dump | Assist with export if needed |
| Right to Rectification | User: Edit Profile | Allow updates |
| Right to Erasure | User: Delete Account | Verify complete deletion |
| Right to Portability | User: Export JSON | Ensure format compatibility |
| Right to Object | User: Contact admin | Review and respond |

**Data Processing Records**:
- Maintain log of processing activities
- Document legal basis for processing
- Record data retention policies
- Keep processor agreements (Firebase, Dynatrace)

### FERPA Compliance (Educational Institutions)

**Student Privacy**:
- ✅ Implement role-based access (students, teachers, admins)
- ✅ Require parental consent for users under 18
- ✅ Restrict access to student records
- ✅ Log all access to student data
- ✅ Provide parents with access to student records

**Admin Actions**:
1. Configure strict access controls
2. Train staff on FERPA requirements
3. Obtain necessary consents
4. Document data access
5. Respond to parental requests within 45 days

### Data Retention Policy

**Recommended Retention Periods**:

| Data Type | Retention | Reason |
|-----------|-----------|--------|
| Active User Accounts | Indefinite | User actively using |
| Inactive Accounts | 2 years | Compliance, re-engagement |
| Deleted Accounts | 30 days (backups) | Recovery period |
| Quiz Results | Lifetime of account | Educational record |
| Audit Logs | 90 days | Security investigation |
| Error Logs | 30 days | Debugging |

**Implement Retention Policy**:

```javascript
// Schedule cleanup (Firebase Functions)
export const cleanupInactiveUsers = functions.pubsub
  .schedule('0 2 1 * *') // Monthly
  .onRun(async (context) => {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    
    const inactiveUsers = await db.collection('users')
      .where('lastLoginAt', '<', twoYearsAgo)
      .get();
    
    // Send warning email, then delete if no response
  });
```

### Privacy Requests

**Handling User Requests**:

1. **Access Request**:
   - Verify user identity
   - Generate data export
   - Provide within 30 days (GDPR) or 45 days (FERPA)

2. **Deletion Request**:
   - Verify user identity
   - Confirm request (prevent accidental deletion)
   - Delete account and all data
   - Provide confirmation

3. **Correction Request**:
   - Verify user identity
   - Make requested changes
   - Provide confirmation

**Document Template**:
```
Privacy Request Log

Date: __________
User: __________
Request Type: [ ] Access [ ] Deletion [ ] Correction [ ] Other
Details: _______________
Action Taken: _______________
Completed By: __________
Completion Date: __________
```

---

## Backup & Recovery

### Backup Strategy

**Frequency**:
- **Daily**: Automated Firestore exports
- **Weekly**: Full manual backup verification
- **Monthly**: Disaster recovery test

**Backup Locations**:
- Google Cloud Storage (primary)
- Local/secondary storage (optional)

**What to Back Up**:
- ✅ Firestore database (all collections)
- ✅ Firebase Authentication users
- ✅ Firebase Storage files (if used)
- ✅ Configuration files
- ✅ Security rules
- ✅ Indexes

### Disaster Recovery Plan

**Recovery Time Objective (RTO)**: 4 hours  
**Recovery Point Objective (RPO)**: 24 hours

**Recovery Steps**:

1. **Assess Damage**:
   - Determine scope of data loss
   - Identify last good backup

2. **Restore Firestore**:
   ```bash
   firebase firestore:import gs://your-bucket/backups/latest
   ```

3. **Restore Authentication**:
   - Use Firebase Auth export/import (requires Firebase plan)

4. **Verify Data Integrity**:
   - Run validation scripts
   - Test core functionality
   - Check user accounts

5. **Notify Users**:
   - Inform of any data loss
   - Provide recovery timeline

### Testing Backups

**Monthly Test**:

```bash
# 1. Export current state
firebase firestore:export gs://your-bucket/test-backup

# 2. Create test project
firebase use test-project

# 3. Import backup
firebase firestore:import gs://your-bucket/test-backup

# 4. Verify data
node scripts/verify-backup.js

# 5. Document results
```

---

## Troubleshooting

### Common Issues

#### Users Can't Sign In

**Symptoms**: "Authentication failed" or infinite loading

**Solutions**:
1. Check Firebase Authentication is enabled
2. Verify authorized domains in Firebase Console
3. Check browser console for CORS errors
4. Verify environment variables are set
5. Check Firebase project quota limits

#### Questions Not Loading

**Symptoms**: Empty question bank, "No questions available"

**Solutions**:
1. Verify questions imported: Firestore → `questions` collection
2. Check category/subcategory filters
3. Review Firestore security rules
4. Verify user has permission to read questions
5. Check browser console for errors

#### Data Not Syncing

**Symptoms**: Changes not appearing, "Offline" indicator

**Solutions**:
1. Check internet connection
2. Verify Firebase project is active
3. Check Firestore quota limits
4. Review browser console for errors
5. Clear IndexedDB cache: DevTools → Application → IndexedDB

#### Performance Issues

**Symptoms**: Slow page loads, laggy interactions

**Solutions**:
1. Run Lighthouse audit: `npm run lighthouse`
2. Check Firestore query complexity
3. Review bundle size: `npm run build` (should be ~635KB)
4. Enable production build optimizations
5. Check Dynatrace for bottlenecks

#### Import Failures

**Symptoms**: "Import failed", partial data import

**Solutions**:
1. Validate YAML/JSON format
2. Check for duplicate IDs
3. Verify all required fields present
4. Review import logs in console
5. Split large imports into smaller batches

### Debugging Tools

**Browser DevTools**:
- Console: Check for JavaScript errors
- Network: Monitor Firebase requests
- Application: Inspect IndexedDB, localStorage
- Performance: Profile page load

**Firebase Console**:
- Firestore: Query data directly
- Authentication: Check user accounts
- Usage: Monitor quotas

**Logs**:
```bash
# View application logs
# Development: Browser console
# Production: Dynatrace or Firebase Functions logs
```

### Getting Help

**Resources**:
- GitHub Issues: https://github.com/archubbuck/certlab/issues
- Documentation: `docs/` directory
- Firebase Docs: https://firebase.google.com/docs
- Community: GitHub Discussions

**When Reporting Issues**:
- Include browser/OS version
- Provide error messages
- Describe steps to reproduce
- Share relevant logs (remove sensitive data)

---

## Best Practices

### Security Best Practices

- ✅ Keep dependencies updated (npm audit, Dependabot)
- ✅ Use strong authentication (OAuth, MFA)
- ✅ Implement least privilege access
- ✅ Regularly review security rules
- ✅ Monitor for suspicious activity
- ✅ Backup regularly and test restores
- ✅ Document security incidents

### Performance Best Practices

- ✅ Use indexes for complex Firestore queries
- ✅ Limit query result sizes (pagination)
- ✅ Enable compression (Firestore automatically does this)
- ✅ Use CDN for static assets (Firebase Hosting does this)
- ✅ Monitor Core Web Vitals
- ✅ Optimize images and media

### Data Management Best Practices

- ✅ Validate data before import
- ✅ Use consistent naming conventions
- ✅ Document data schemas
- ✅ Implement soft deletes for recovery
- ✅ Archive old data
- ✅ Maintain data quality

### Privacy Best Practices

- ✅ Review privacy policy annually
- ✅ Respond to privacy requests promptly
- ✅ Train staff on privacy requirements
- ✅ Document data processing activities
- ✅ Conduct privacy impact assessments
- ✅ Minimize data collection

### Operational Best Practices

- ✅ Document changes in CHANGELOG.md
- ✅ Use version control (Git)
- ✅ Test in staging before production
- ✅ Communicate with users about updates
- ✅ Monitor system health continuously
- ✅ Plan for scale (user growth)

---

## Appendix

### Firestore Data Model

```
/users/{userId}
  - email: string
  - name: string
  - role: 'admin' | 'user'
  - createdAt: timestamp

/categories/{categoryId}
  - name: string
  - description: string
  - tenantId: string

/questions/{questionId}
  - text: string
  - options: string[]
  - correctAnswer: number
  - category: string
  - subcategory: string

/quizzes/{quizId}
  - userId: string
  - categoryIds: string[]
  - score: number
  - completedAt: timestamp

/userProgress/{userId}/{categoryId}
  - questionsAttempted: number
  - correctAnswers: number
  - masteryScore: number
```

### Useful Scripts

**Export All Data**:
```bash
node scripts/export-all-data.js --output backup.json
```

**Import Questions**:
```bash
node scripts/import-questions.js --file questions.yaml
```

**Validate Data**:
```bash
node scripts/validate-data.js --collection questions
```

**Cleanup Orphaned Data**:
```bash
node scripts/cleanup-orphaned-data.js --dry-run
```

### Support Contacts

- **Technical Issues**: GitHub Issues
- **Security Concerns**: GitHub Issues (label: `security`)
- **Privacy Requests**: GitHub Issues (label: `privacy`)
- **General Questions**: GitHub Discussions

---

**Document Version**: 1.0.0  
**Last Updated**: January 15, 2026  
**Next Review**: April 15, 2026

For the latest version of this guide, visit: [GitHub Repository](https://github.com/archubbuck/certlab)
