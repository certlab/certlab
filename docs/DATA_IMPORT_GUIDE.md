# Data Import Guide

This guide explains how to import sample certification questions into CertLab.

## Overview

CertLab uses a **shared content model** where certification questions, categories, and badges are stored in shared Firestore collections that all users can read from. To maintain data integrity and security, only administrators can import data into these shared collections.

## Architecture

### Shared Collections (Read-Only for Users, Write for Admins)
- `/categories` - Certification categories (CISSP, CISM, etc.)
- `/subcategories` - Topic subcategories within certifications
- `/questions` - Question bank with answers and explanations
- `/badges` - Achievement badge definitions

### Per-User Collections (Read/Write for Owner)
- `/users/{userId}/quizzes` - Quiz attempts
- `/users/{userId}/progress` - Learning progress
- `/users/{userId}/badges` - Earned badges
- And more...

## For Regular Users

If you see the message **"Admin Access Required"** on the Data Import page, this is expected behavior. Data import is restricted to administrators to protect the shared question bank.

**What you can do:**
1. Contact your system administrator to import sample data
2. Request admin access if you need to manage shared content

**What you should NOT do:**
- Modify Firestore security rules to bypass permissions (this could expose data to unauthorized access)
- Attempt to write directly to shared collections

## For Administrators

### Prerequisites

1. **Firebase Admin Access**: You need permission to modify Firestore documents
2. **Admin Role**: Your user document must have `role: 'admin'`

### Granting Admin Access

#### Method 1: Firebase Console (Recommended for First Admin)

1. Open the [Firebase Console](https://console.firebase.google.com)
2. Select your CertLab project
3. Navigate to **Firestore Database**
4. Browse to `users` collection
5. Find your user document (the document ID is your Firebase Auth UID)
6. Click to edit the document
7. Change the `role` field from `"user"` to `"admin"`
8. Save the document
9. Refresh the CertLab app

#### Method 2: Firebase Admin SDK Script

For programmatic admin assignment, use a script with Firebase Admin SDK:

```javascript
// grant-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function grantAdminAccess(userEmail) {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', userEmail).get();
  
  if (snapshot.empty) {
    console.log('No user found with that email');
    return;
  }
  
  snapshot.forEach(async (doc) => {
    await doc.ref.update({ role: 'admin' });
    console.log(`Granted admin access to ${userEmail}`);
  });
}

// Usage
grantAdminAccess('admin@example.com');
```

Run with: `node grant-admin.js`

### Importing Sample Data

Once you have admin access:

1. **Sign in to CertLab** with your admin account
2. **Navigate to Data Import** page (visible in the navigation menu)
3. **Choose your import method:**

#### Option A: Import Pre-built Samples

- Click **"Import Sample Data"** for CISSP or CISM
- Wait for the import to complete (500 questions per dataset)
- Review the import results

#### Option B: Upload Custom YAML File

1. Prepare a YAML file with your questions (see format below)
2. Click **"Choose YAML File"**
3. Select your file
4. Wait for import to complete

### YAML File Format

```yaml
category: CISSP
description: Sample CISSP questions
questions:
  - text: "What is the primary purpose of a risk assessment?"
    options:
      - id: 0
        text: "To eliminate all risks"
      - id: 1
        text: "To identify and evaluate risks"
      - id: 2
        text: "To accept all risks"
      - id: 3
        text: "To avoid all risks"
    correctAnswer: 1
    explanation: "Risk assessment helps identify and evaluate risks to determine appropriate mitigation strategies."
    difficultyLevel: 1
    tags: ["risk management", "security"]
    subcategory: "Security Risk Management"
  
  - text: "Which encryption algorithm is asymmetric?"
    options:
      - id: 0
        text: "AES"
      - id: 1
        text: "DES"
      - id: 2
        text: "RSA"
      - id: 3
        text: "3DES"
    correctAnswer: 2
    explanation: "RSA is an asymmetric encryption algorithm that uses public and private key pairs."
    difficultyLevel: 2
    tags: ["cryptography", "encryption"]
    subcategory: "Cryptography"
```

**Field Descriptions:**

- `category` (string, required): The certification name (e.g., "CISSP", "CISM")
- `description` (string, optional): Brief description of the question set
- `questions` (array, required): Array of question objects
  - `text` (string, required): The question text (max 2000 chars)
  - `options` (array, required): 2-4 answer options
    - `id` (number, required): Option identifier (0-based index)
    - `text` (string, required): Option text (max 1000 chars)
  - `correctAnswer` (number, required): The ID of the correct option
  - `explanation` (string, optional): Explanation of the correct answer (max 5000 chars)
  - `difficultyLevel` (number, required): 1 (Easy), 2 (Medium), 3 (Hard)
  - `tags` (array, optional): Array of tag strings for categorization
  - `subcategory` (string, required): The domain/topic name

### Import Process

1. **Validation**: Questions are validated for correct structure and data types
2. **Category Creation**: Creates the category if it doesn't exist
3. **Subcategory Creation**: Creates subcategories as needed
4. **Question Import**: Imports questions in batches of 50
5. **Result**: Shows summary of import (questions imported, skipped, errors)

### Clearing Data

To remove all questions for a certification before re-importing:

1. On the Data Import page, click **"Clear"** next to the certification
2. Confirm the deletion in the dialog
3. All questions for that certification will be permanently deleted
4. You can now import fresh data

**⚠️ Warning:** Clearing data is permanent and cannot be undone. User progress and quiz history will remain, but questions will be gone.

## Troubleshooting

### "Missing or insufficient permissions" Error

**Cause:** Your user account does not have the `admin` role in Firestore.

**Solution:**
1. Verify your role in Firebase Console: `users/{userId}` → check `role` field
2. If role is "user", update it to "admin" (see "Granting Admin Access" above)
3. Sign out and sign back in to CertLab
4. Try importing again

### Import Fails with "Category not found"

**Cause:** The category specified in the YAML doesn't match an existing category or subcategory.

**Solution:**
- Ensure the `category` field matches exactly (case-sensitive)
- Ensure the `subcategory` field in each question is spelled correctly
- The import will create categories and subcategories if they don't exist

### Import Shows Validation Errors

**Cause:** Question data doesn't meet the schema requirements.

**Solution:**
- Check that `correctAnswer` matches a valid option ID
- Ensure all required fields are present
- Verify data types (numbers for IDs and difficulty, strings for text)
- Check that options array has 2-4 items

### Questions Already Exist

**Cause:** You're trying to import questions that were previously imported.

**Solution:**
1. Use the **"Clear"** button for that certification
2. Confirm deletion
3. Re-import the questions

## Best Practices

1. **Backup Before Clearing**: Export your data before clearing questions
2. **Test on Development First**: Test imports on a development Firestore instance
3. **Review Sample Data**: Check the bundled YAML files in `/client/public/data/` for examples
4. **Limit Admin Access**: Only grant admin role to trusted users
5. **Monitor Imports**: Review import results to catch validation errors
6. **Version Control**: Keep your YAML files in version control for reproducibility

## Security Considerations

### Why Admin-Only?

1. **Data Integrity**: Prevents accidental or malicious corruption of shared question bank
2. **Consistency**: Ensures all users see the same curated questions
3. **Quality Control**: Allows review and approval before making questions available
4. **Audit Trail**: Limits who can modify shared content for accountability

### Firestore Security Rules

The security rules enforce this model:

```javascript
// Shared read-only content
match /categories/{categoryId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();  // Admin-only writes
}

match /questions/{questionId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();  // Admin-only writes
}
```

### Custom Claims (Alternative)

For better performance at scale, consider using Firebase Auth custom claims instead of Firestore document checks. Custom claims are included in the ID token and don't require an additional database read for each request.

**Security Rule with Custom Claims:**

```javascript
// Admin check with custom claims (strict equality)
function isAdmin() {
  return request.auth.token.admin === true;
}
```

**Setting Custom Claims with Admin SDK:**

```javascript
// grant-admin-claim.js
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function grantAdminClaim(userUid) {
  try {
    // Set custom claim
    await admin.auth().setCustomUserClaims(userUid, { admin: true });
    console.log(`Successfully granted admin claim to user: ${userUid}`);
    
    // Verify the claim was set
    const user = await admin.auth().getUser(userUid);
    console.log('Custom claims:', user.customClaims);
  } catch (error) {
    console.error('Error setting custom claim:', error);
    throw error;
  }
}

// Usage: Get user UID from Firebase Console or Auth SDK
grantAdminClaim('user-uid-here');
```

**Important Notes:**
- Custom claims require the user to refresh their ID token (sign out/in)
- Maximum custom claim payload size is 1000 bytes
- Use custom claims for high-traffic apps to reduce Firestore reads
- For smaller apps, the Firestore document approach is simpler

## Firebase Admin SDK Alternative

For large-scale imports or automation, use the Firebase Admin SDK instead of the web UI:

```javascript
// Import script using Admin SDK
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();
const yaml = require('js-yaml');
const fs = require('fs');

async function importQuestions(filePath) {
  const yamlContent = fs.readFileSync(filePath, 'utf8');
  const data = yaml.load(yamlContent);
  
  // Create batch
  const batch = db.batch();
  
  // Add questions to batch
  data.questions.forEach((question) => {
    const questionRef = db.collection('questions').doc();
    batch.set(questionRef, {
      ...question,
      categoryId: data.categoryId,
      tenantId: 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  // Commit batch
  await batch.commit();
  console.log(`Imported ${data.questions.length} questions`);
}

// Usage
importQuestions('./cissp-questions.yaml');
```

## Related Documentation

- [Firebase Setup Guide](../FIREBASE_SETUP.md)
- [Firestore Security Rules](../firestore.rules)
- [Firebase Implementation Status](./architecture/firebase-status.md)
- [Contributing Guide](../CONTRIBUTING.md)

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/archubbuck/certlab/issues)
2. Review [Firebase Documentation](https://firebase.google.com/docs/firestore)
3. Open a new issue with:
   - Error message
   - Steps to reproduce
   - Your role (admin or user)
   - Browser console logs

---

**Last Updated**: 2026-01-10  
**Version**: 1.0  
**Maintainer**: @archubbuck
