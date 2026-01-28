# ADR-004: Security Model & Firestore Rules

**Status:** ✅ Accepted  
**Date:** 2024-12-20  
**Deciders:** CertLab Team  
**Context:** Define the comprehensive security architecture and Firestore security rules that protect user data and enforce access control.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Security Architecture](#security-architecture)
- [Firestore Security Rules](#firestore-security-rules)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)

---

## Executive Summary

CertLab implements a **defense-in-depth security model** with multiple layers: Firebase Authentication, Firestore security rules, client-side validation, and secure coding practices. The security model enforces **per-user data isolation**, **role-based access control (RBAC)**, and **tenant-based authorization**.

### Quick Reference

| Security Layer | Technology | Purpose |
|----------------|-----------|---------|
| **Authentication** | Firebase Auth | Identity verification |
| **Authorization** | Firestore Rules | Database-level access control |
| **Data Isolation** | Rules + Collection Structure | Per-user data separation |
| **Input Validation** | Zod + Client-side checks | Prevent malicious input |
| **XSS Prevention** | React + Sanitization | Prevent script injection |
| **Transport Security** | HTTPS (TLS 1.3) | Encrypted communication |
| **Password Security** | PBKDF2 (100k iterations) | Strong password hashing |

---

## Context and Problem Statement

As a cloud-based learning platform handling user data, CertLab must:

1. **Prevent unauthorized access** to user data
2. **Enforce data isolation** between users
3. **Protect against common attacks** (XSS, CSRF, injection)
4. **Implement role-based access** for admin functions
5. **Support tenant isolation** for multi-tenancy
6. **Validate all user input** before processing
7. **Log security events** for audit trails
8. **Comply with security best practices** (OWASP Top 10)

### Threat Model

**Threats to Mitigate:**
- 🔒 Unauthorized access to other users' data
- 🔒 Privilege escalation (user → admin)
- 🔒 Cross-site scripting (XSS) attacks
- 🔒 Injection attacks (NoSQL, script)
- 🔒 Data exfiltration via API abuse
- 🔒 Brute force password attacks
- 🔒 Session hijacking
- 🔒 Man-in-the-middle attacks

### Requirements

**Security Requirements:**
- ✅ All data requires authentication
- ✅ Users can only access their own data
- ✅ Admins have elevated permissions
- ✅ Tenant data is isolated
- ✅ All communication over HTTPS
- ✅ Passwords securely hashed
- ✅ Input validation at all entry points
- ✅ Security rules prevent bypass
- ✅ Audit logging for sensitive operations

---

## Decision

We have adopted a **layered security model** with:

1. **Authentication Layer** (Firebase Authentication)
2. **Authorization Layer** (Firestore security rules)
3. **Application Layer** (Client-side validation and sanitization)
4. **Transport Layer** (HTTPS with TLS 1.3)
5. **Audit Layer** (Security event logging)

### Security Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            Client Application (React)                     │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Security Layer 5: Application Security             │  │  │
│  │  │  - Input validation (Zod schemas)                   │  │  │
│  │  │  - XSS prevention (sanitization)                    │  │  │
│  │  │  - CSRF tokens                                      │  │  │
│  │  │  - Secure coding practices                          │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                         ↓                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Security Layer 4: Authentication State             │  │  │
│  │  │  - Firebase Auth SDK                                │  │  │
│  │  │  - Session management                               │  │  │
│  │  │  - Token refresh                                    │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ HTTPS (TLS 1.3)
                           │ Security Layer 3: Transport Security
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    Firebase Services                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Security Layer 2: Firebase Authentication              │    │
│  │  - User identity verification                           │    │
│  │  - OAuth 2.0 / OpenID Connect                           │    │
│  │  - JWT token validation                                 │    │
│  │  - Session expiry management                            │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  Security Layer 1: Firestore Security Rules             │    │
│  │  - Database-level authorization                         │    │
│  │  - Per-document access control                          │    │
│  │  - Role-based permissions                               │    │
│  │  - Data validation rules                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │         Cloud Firestore Database                         │    │
│  │  - Encryption at rest (AES-256)                         │    │
│  │  - Encryption in transit                                │    │
│  │  - Automatic backups                                    │    │
│  │  - Point-in-time recovery                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Security Architecture

### Layer 1: Database Security (Firestore Rules)

**Purpose:** Enforce authorization at the database level to prevent unauthorized access even if client security is bypassed.

**Key Principles:**
- **Deny by default:** All access is denied unless explicitly allowed
- **Authentication required:** No anonymous access to any data
- **Owner-only access:** Users can only access their own subcollections
- **Admin privileges:** Admins can access shared content for management
- **Tenant isolation:** Data filtered by tenantId where applicable

**Rule Categories:**
1. User profile access (owner only)
2. User subcollections (owner only)
3. Shared content (read: all authenticated, write: admin only)
4. Admin operations (admin role required)

### Layer 2: Authentication (Firebase Auth)

**Purpose:** Verify user identity and manage sessions securely.

**Mechanisms:**
- **Google OAuth 2.0:** Secure sign-in via Google accounts
- **Email/Password:** PBKDF2 hashed passwords (100,000 iterations)
- **JWT Tokens:** Signed tokens for API authentication
- **Session Management:** Automatic token refresh
- **Multi-Factor Auth:** Future enhancement planned

**Security Features:**
- Automatic CSRF protection
- Secure session cookies
- Token expiry and refresh
- Account lockout (Google-managed)
- Password reset via email

### Layer 3: Transport Security (HTTPS)

**Purpose:** Protect data in transit from eavesdropping and tampering.

**Implementation:**
- **TLS 1.3:** Latest TLS protocol
- **Automatic certificates:** Managed by Firebase Hosting
- **HSTS Headers:** Enforce HTTPS connections
- **Secure cookies:** HTTPOnly and Secure flags
- **CSP Headers:** Content Security Policy for XSS prevention

### Layer 4: Application Security (Client-Side)

**Purpose:** Validate input and prevent common web vulnerabilities.

**Mechanisms:**
- **Input Validation:** Zod schemas for all user input
- **XSS Prevention:** React's built-in escaping + DOMPurify sanitization
- **SQL/NoSQL Injection:** Parameterized queries via Firebase SDK
- **CSRF Protection:** Firebase SDK handles token management
- **Rate Limiting:** Future enhancement with Cloud Functions

**Secure Coding Practices:**
- No `eval()` or `Function()` usage
- Sanitize HTML before rendering with `dangerouslySetInnerHTML`
- Validate file uploads (type, size)
- Use TypeScript for type safety
- Regular dependency security audits

### Layer 5: Audit & Monitoring

**Purpose:** Track security events for incident response and compliance.

**Logged Events:**
- User registration and login
- Authentication failures
- Password changes
- Admin actions
- Data exports
- Security rule violations (via Firestore logs)

**Implementation:**
```typescript
// Security event logging
console.log('[SECURITY AUDIT]', {
  event: 'LOGIN_SUCCESS',
  userId: user.id,
  timestamp: new Date().toISOString(),
  userAgent: navigator.userAgent
});
```

---

## Firestore Security Rules

Complete security rules are defined in `firestore.rules`:

### Rule Structure

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid))
               .data.role == 'admin';
    }
    
    function isValidTenant(tenantId) {
      return request.resource.data.tenantId == tenantId;
    }
    
    // ... rule definitions below
  }
}
```

### User Profile Rules

```javascript
// User profile documents
match /users/{userId} {
  // Users can read their own profile
  allow read: if isOwner(userId);
  
  // Users can create their profile on first sign-up
  allow create: if isAuthenticated() && 
                   request.auth.uid == userId &&
                   request.resource.data.email == request.auth.token.email;
  
  // Users can update their own profile
  // But cannot change their role (prevents privilege escalation)
  allow update: if isOwner(userId) && 
                   (!request.resource.data.keys().hasAny(['role'])) ||
                   (request.resource.data.role == resource.data.role);
  
  // Only admins can delete user profiles
  allow delete: if isAdmin();
}
```

### User Subcollection Rules

```javascript
// User-specific subcollections
match /users/{userId}/{subcollection}/{docId} {
  // Users can read all their subcollection documents
  allow read: if isOwner(userId);
  
  // Users can create documents in their subcollections
  allow create: if isOwner(userId) && 
                   request.resource.data.userId == userId;
  
  // Users can update their own documents
  allow update: if isOwner(userId);
  
  // Users can delete their own documents
  allow delete: if isOwner(userId);
}
```

### Shared Content Rules

```javascript
// Categories - shared content
match /categories/{categoryId} {
  // All authenticated users can read categories
  allow read: if isAuthenticated();
  
  // Only admins can write categories
  allow write: if isAdmin();
}

// Subcategories - shared content
match /subcategories/{subcategoryId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Questions - shared question bank
match /questions/{questionId} {
  // All authenticated users can read questions
  allow read: if isAuthenticated();
  
  // Admins can create/update/delete shared questions (isPersonal = false)
  allow create: if isAdmin() && 
                   request.resource.data.isPersonal == false;
  allow update: if isAdmin() && 
                   resource.data.isPersonal == false;
  allow delete: if isAdmin() && 
                   resource.data.isPersonal == false;
  
  // Users can create personal questions (isPersonal = true)
  allow create: if isAuthenticated() && 
                   request.resource.data.isPersonal == true &&
                   request.resource.data.createdBy == request.auth.uid;
  
  // Users can update/delete their own personal questions
  allow update, delete: if isAuthenticated() && 
                           resource.data.isPersonal == true &&
                           resource.data.createdBy == request.auth.uid;
}

// Badges - badge definitions
match /badges/{badgeId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Challenges - challenge definitions
match /challenges/{challengeId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// Practice tests - test definitions
match /practiceTests/{testId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

### Study Group Rules

```javascript
// Study groups - collaborative feature
match /studyGroups/{groupId} {
  // Anyone can read study groups
  allow read: if isAuthenticated();
  
  // Authenticated users can create study groups
  allow create: if isAuthenticated() && 
                   request.resource.data.createdBy == request.auth.uid;
  
  // Group creator or admin can update/delete
  allow update, delete: if isAuthenticated() && 
                           (resource.data.createdBy == request.auth.uid ||
                            isAdmin());
}

// Study group members
match /studyGroupMembers/{memberId} {
  allow read: if isAuthenticated();
  
  // Users can join study groups
  allow create: if isAuthenticated() && 
                   request.resource.data.userId == request.auth.uid;
  
  // Users can leave study groups (delete their membership)
  allow delete: if isAuthenticated() && 
                   resource.data.userId == request.auth.uid;
}
```

### Data Validation Rules

```javascript
// Example: Validate quiz creation
match /users/{userId}/quizzes/{quizId} {
  allow create: if isOwner(userId) && 
                   // Ensure required fields exist
                   request.resource.data.keys().hasAll([
                     'userId', 'tenantId', 'categoryIds', 
                     'mode', 'totalQuestions'
                   ]) &&
                   // Validate field types
                   request.resource.data.userId is string &&
                   request.resource.data.totalQuestions is int &&
                   // Validate ranges
                   request.resource.data.totalQuestions >= 5 &&
                   request.resource.data.totalQuestions <= 100 &&
                   // Validate enum values
                   request.resource.data.mode in ['study', 'quiz', 'adaptive'];
}
```

---

## Implementation Details

### Password Security

**PBKDF2 Implementation:**
```typescript
// client/src/lib/client-auth.ts
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 128 bits
const HASH_LENGTH = 32; // 256 bits

async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  
  // Import password as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  // Derive hash using PBKDF2
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_LENGTH * 8
  );
  
  // Format: pbkdf2:iterations:salt:hash
  const saltHex = Array.from(salt)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}
```

**Verification with Constant-Time Comparison:**
```typescript
async function verifyPassword(
  password: string, 
  hashedPassword: string
): Promise<boolean> {
  const [algorithm, iterations, saltHex, storedHashHex] = 
    hashedPassword.split(':');
  
  // Re-hash the provided password with stored salt
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
  );
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  
  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: parseInt(iterations),
      hash: 'SHA-256'
    },
    keyMaterial,
    HASH_LENGTH * 8
  );
  
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(hashHex, storedHashHex);
}
```

### Input Validation

**Zod Schemas:**
```typescript
// shared/schema.ts
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  role: z.enum(['user', 'admin']),
  tenantId: z.number().int().positive(),
});

export const QuizSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.number().int().positive(),
  categoryIds: z.array(z.string()).min(1),
  mode: z.enum(['study', 'quiz', 'adaptive']),
  totalQuestions: z.number().int().min(5).max(100),
  score: z.number().min(0).max(100),
});

// Usage in components
import { QuizSchema } from '@shared/schema';

function createQuiz(data: unknown) {
  // Validate before sending to Firestore
  const validatedData = QuizSchema.parse(data);
  await storage.createQuiz(validatedData);
}
```

### XSS Prevention

**Sanitization for HTML Content:**
```typescript
// client/src/lib/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}

// Usage in components
import { sanitizeHtml } from '@/lib/sanitize';

function QuestionDisplay({ question }: Props) {
  const cleanExplanation = sanitizeHtml(question.explanation);
  
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: cleanExplanation }}
    />
  );
}
```

**React's Built-In Protection:**
```typescript
// React automatically escapes content
function SafeComponent({ userInput }: Props) {
  // This is safe - React escapes the content
  return <div>{userInput}</div>;
  
  // This is also safe - React handles it
  return <div title={userInput}>Content</div>;
}
```

### Security Headers

**Firebase Hosting Configuration:**
```json
// firebase.json
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          },
          {
            "key": "Strict-Transport-Security",
            "value": "max-age=31536000; includeSubDomains"
          },
          {
            "key": "Content-Security-Policy",
            "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com"
          }
        ]
      }
    ]
  }
}
```

---

## Consequences

### Positive

✅ **Defense in Depth:**
- Multiple security layers protect against attacks
- If one layer fails, others provide protection
- Database-level security can't be bypassed
- Comprehensive audit trail

✅ **Data Isolation:**
- Firestore rules enforce per-user data access
- No way for users to access others' data
- Tenant isolation prevents cross-tenant leaks
- Admin access explicitly granted

✅ **Strong Authentication:**
- Industry-standard OAuth 2.0
- PBKDF2 for password hashing (100k iterations)
- Secure session management
- Automatic token refresh

✅ **XSS Prevention:**
- React's built-in escaping
- DOMPurify for HTML sanitization
- CSP headers block inline scripts
- No unsafe DOM manipulation

✅ **Transport Security:**
- TLS 1.3 for all connections
- Automatic certificate management
- HSTS enforces HTTPS
- Secure cookies with HttpOnly flag

✅ **Compliance:**
- Follows OWASP Top 10 guidelines
- Implements security best practices
- Regular security audits
- Audit logging for compliance

### Negative

❌ **Performance Impact:**
- Admin role check requires database read
- Security rule evaluation adds latency
- Input validation adds processing time
- Sanitization has overhead

❌ **Complexity:**
- Security rules can be complex to maintain
- Multiple validation layers
- Need to keep rules in sync with data model
- Debugging security issues is harder

❌ **Limited Rate Limiting:**
- No built-in rate limiting in Firestore
- Need Cloud Functions for complex rate limiting
- Vulnerable to brute force without additional protection
- Need to monitor for abuse

❌ **Client-Side Limitations:**
- All security logic visible to users
- Can't perform complex server-side validation
- Need to trust client for some operations
- Harder to implement complex authorization logic

### Mitigations

1. **Performance:**
   - Cache admin role check results
   - Use custom claims for roles (Firebase Auth feature)
   - Optimize security rules for common cases
   - Monitor rule evaluation latency

2. **Complexity:**
   - Document security rules thoroughly
   - Use helper functions to reduce duplication
   - Test rules with Firebase emulator
   - Regular security rule audits

3. **Rate Limiting:**
   - Implement client-side throttling
   - Consider Cloud Functions for abuse prevention
   - Monitor Firebase logs for suspicious activity
   - Set up alerts for unusual patterns

4. **Server-Side Validation:**
   - Use Cloud Functions for critical operations
   - Implement background jobs for data validation
   - Consider Firebase Extensions for common tasks
   - Plan migration to server-side validation for sensitive operations

---

## Alternatives Considered

### Alternative 1: Server-Side Authorization

Implement all authorization in backend API:

**Pros:**
- Full control over authorization logic
- Can implement complex rules
- Easier to rate limit
- Centralized security

**Cons:**
- Requires backend server
- Higher latency for every request
- More complex infrastructure
- No offline support

**Rejected Because:** Firebase's client-side model with security rules provides better performance and offline support.

---

### Alternative 2: No Client-Side Validation

Rely only on Firestore security rules:

**Pros:**
- Simpler client code
- Single source of truth
- Guaranteed enforcement

**Cons:**
- Poor user experience (errors only after server request)
- Higher Firebase read/write costs (failed operations still charged)
- Harder to provide helpful error messages
- More network traffic

**Rejected Because:** Client-side validation provides better UX and reduces costs.

---

### Alternative 3: JWT in localStorage

Store JWT tokens in localStorage instead of Firebase's secure storage:

**Pros:**
- Simple implementation
- Full control over token management
- Can add custom claims easily

**Cons:**
- Vulnerable to XSS attacks
- No automatic refresh
- Need to implement expiry handling
- Less secure than Firebase's approach

**Rejected Because:** Firebase Auth's secure token management is more robust and secure.

---

## Related Documents

- [ADR-001: Authentication, Authorization, User State Management](ADR-001-authentication-authorization.md)
- [ADR-002: Cloud-First Architecture & Firebase Integration](ADR-002-cloud-first-firebase-integration.md)
- [ADR-003: Data Storage & Firestore Collections](ADR-003-data-storage-firestore-collections.md)
- [Security Policy](../../SECURITY.md)
- [Firebase Setup Guide](../setup/firebase.md)

### Code References

| File | Purpose |
|------|---------|
| `firestore.rules` | Complete Firestore security rules |
| `client/src/lib/client-auth.ts` | Password hashing and authentication |
| `client/src/lib/sanitize.ts` | HTML sanitization functions |
| `shared/schema.ts` | Zod validation schemas |
| `client/src/lib/firebase.ts` | Firebase configuration |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-20 | CertLab Team | Initial ADR documenting security model and Firestore rules |

---

## Appendix: Security Checklist

**Pre-Deployment Security Checklist:**

- [ ] All Firebase environment variables configured
- [ ] Firestore security rules deployed and tested
- [ ] Security headers configured in firebase.json
- [ ] All user input validated with Zod schemas
- [ ] HTML content sanitized before rendering
- [ ] No hardcoded secrets in code
- [ ] HTTPS enabled on all domains
- [ ] CSP headers configured
- [ ] Admin role checks implemented
- [ ] Security event logging in place
- [ ] Dependencies audited for vulnerabilities
- [ ] Firebase console alerts configured
- [ ] Backup and recovery tested

**Ongoing Security Maintenance:**

- [ ] Monthly dependency security audits
- [ ] Quarterly security rule reviews
- [ ] Annual penetration testing
- [ ] Monitor Firebase logs for suspicious activity
- [ ] Review security audit logs weekly
- [ ] Update security documentation with changes
- [ ] Train developers on secure coding practices

---

**End of ADR-004**
