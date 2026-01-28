# ADR-003: Data Storage & Firestore Collections

**Status:** ✅ Accepted  
**Date:** 2024-12-20  
**Deciders:** CertLab Team  
**Context:** Define the data storage architecture, Firestore collection structure, and data organization patterns for CertLab.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Collection Architecture](#collection-architecture)
- [Data Models](#data-models)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)

---

## Executive Summary

CertLab uses **Cloud Firestore** as its primary data store with a **per-user subcollection pattern** for user-specific data and **root-level collections** for shared content. This architecture ensures data isolation, enables efficient querying, and supports multi-tenancy.

### Quick Reference

| Data Type | Storage Pattern | Access Control |
|-----------|----------------|----------------|
| **User Profile** | Root: `/users/{userId}` | Owner only |
| **User Data** | Subcollection: `/users/{userId}/{collection}` | Owner only |
| **Shared Content** | Root: `/categories`, `/questions`, etc. | All authenticated users (read-only) |
| **Tenant Isolation** | Via `tenantId` field in documents | Query filtering |

**Key Principles:**
- User data is stored in subcollections under `/users/{userId}`
- Shared content is stored in root-level collections
- All data uses consistent TypeScript types from `shared/schema.ts`
- Security rules enforce data isolation at the database level

---

## Context and Problem Statement

CertLab needed a data storage architecture that supports:

1. **User Data Isolation:** Each user's data must be completely isolated from others
2. **Shared Content:** Questions, categories, and badges are shared across users
3. **Multi-Tenancy:** Support multiple learning environments with isolated data
4. **Efficient Queries:** Fast reads for quiz generation and progress tracking
5. **Scalability:** Handle millions of users and questions
6. **Offline Support:** Work with Firestore's offline persistence
7. **Type Safety:** Strong TypeScript typing throughout

### Requirements

**Functional Requirements:**
- ✅ Store user profiles and authentication data
- ✅ Store quiz attempts with answers and scoring
- ✅ Track learning progress per category/subcategory
- ✅ Store earned badges and achievements
- ✅ Store gamification data (points, levels, streaks)
- ✅ Support tenant switching with data isolation
- ✅ Share questions and categories across users

**Non-Functional Requirements:**
- ✅ Query performance < 100ms for most reads
- ✅ Data isolation enforced by security rules
- ✅ Support for 10,000+ questions per tenant
- ✅ Support for 100,000+ quiz attempts per user
- ✅ Efficient indexing for common queries
- ✅ Consistent data types across client and server

---

## Decision

We have adopted a **hybrid collection architecture** with:

1. **Per-User Subcollections** for user-specific data
2. **Root-Level Collections** for shared content
3. **Document-Level Tenant Isolation** using `tenantId` fields
4. **Firestore Indexes** for optimized queries
5. **TypeScript Schemas** for type safety

### Data Architecture Diagram

```
Firestore Root
├── users/                          # Root collection: User profiles
│   └── {userId}/                   # Document: User profile
│       ├── quizzes/                # Subcollection: Quiz attempts
│       │   └── {quizId}            # Document: Quiz result
│       ├── progress/               # Subcollection: Learning progress
│       │   └── {progressId}        # Document: Category progress
│       ├── badges/                 # Subcollection: Earned badges
│       │   └── {badgeId}           # Document: Badge earned record
│       ├── gameStats/              # Subcollection: Game statistics
│       │   └── {statId}            # Document: Points, level, streak
│       ├── lectures/               # Subcollection: Study materials
│       │   └── {lectureId}         # Document: Lecture content
│       ├── challengeAttempts/      # Subcollection: Challenge results
│       │   └── {attemptId}         # Document: Challenge attempt
│       ├── practiceTestAttempts/   # Subcollection: Practice test results
│       │   └── {attemptId}         # Document: Test result
│       └── studyNotes/             # Subcollection: Personal notes
│           └── {noteId}            # Document: Study note
│
├── categories/                     # Root collection: Certification categories
│   └── {categoryId}                # Document: Category (CISSP, CISM, etc.)
│
├── subcategories/                  # Root collection: Topic subcategories
│   └── {subcategoryId}             # Document: Subcategory
│
├── questions/                      # Root collection: Question bank
│   └── {questionId}                # Document: Question with answers
│
├── badges/                         # Root collection: Badge definitions
│   └── {badgeId}                   # Document: Badge metadata
│
├── challenges/                     # Root collection: Challenge definitions
│   └── {challengeId}               # Document: Challenge
│
├── studyGroups/                    # Root collection: Study groups
│   └── {groupId}                   # Document: Study group
│
└── practiceTests/                  # Root collection: Practice test definitions
    └── {testId}                    # Document: Practice test
```

---

## Collection Architecture

### User-Specific Collections (Subcollections)

All user-specific data is stored as subcollections under `/users/{userId}`:

| Subcollection Path | Purpose | Typical Size | Key Fields |
|--------------------|---------|--------------|------------|
| `/users/{userId}/quizzes` | Quiz attempts and results | 100-10,000 docs | `score`, `completedAt`, `answers`, `categoryIds` |
| `/users/{userId}/progress` | Learning progress tracking | 10-100 docs | `categoryId`, `subcategoryId`, `masteryScore` |
| `/users/{userId}/badges` | Earned achievement badges | 1-50 docs | `badgeId`, `earnedAt`, `progress` |
| `/users/{userId}/gameStats` | Gamification statistics | 1-10 docs | `totalPoints`, `level`, `currentStreak` |
| `/users/{userId}/lectures` | Study material progress | 10-500 docs | `categoryId`, `content`, `readAt` |
| `/users/{userId}/challengeAttempts` | Challenge completion records | 10-1,000 docs | `challengeId`, `score`, `completedAt` |
| `/users/{userId}/practiceTestAttempts` | Practice test results | 1-100 docs | `testId`, `score`, `timeSpent` |
| `/users/{userId}/studyNotes` | Personal study notes | 0-1,000 docs | `content`, `tags`, `categoryId` |

**Benefits of Subcollections:**
- Natural data isolation (enforced by Firestore path)
- Easier to write security rules
- Can delete all user data by deleting parent document
- Efficient queries within user's data
- Scales well (subcollections don't affect parent document size)

### Shared Collections (Root-Level)

Shared content accessible to all authenticated users:

| Collection Path | Purpose | Typical Size | Access Pattern |
|----------------|---------|--------------|----------------|
| `/categories` | Certification categories | 5-20 docs | Read-only for users, write for admin |
| `/subcategories` | Topic subcategories | 50-200 docs | Read-only for users, write for admin |
| `/questions` | Question bank | 1,000-50,000 docs | Read-only for users, write for admin |
| `/badges` | Badge definitions | 20-100 docs | Read-only for users, write for admin |
| `/challenges` | Daily/quick challenges | 10-100 docs | Read-only for users, write for admin |
| `/studyGroups` | Study group definitions | 0-10,000 docs | Read/write for authenticated users |
| `/practiceTests` | Practice test definitions | 5-50 docs | Read-only for users, write for admin |

**Benefits of Root Collections:**
- Single source of truth for shared data
- Efficient queries across all users
- Easy to update content for everyone
- Clear separation between user data and content

### Multi-Tenancy with tenantId

Documents in shared collections include a `tenantId` field for tenant isolation:

```typescript
// Example: Category document
{
  id: "cissp-1",
  tenantId: 1,  // Tenant identifier
  name: "CISSP",
  description: "Certified Information Systems Security Professional"
}

// Example: Question document
{
  id: "q-12345",
  tenantId: 1,
  categoryId: "cissp-1",
  text: "What is the CIA triad?",
  options: ["Confidentiality, Integrity, Availability", ...],
  correctAnswer: 0
}
```

**Query Pattern:**
```typescript
// Get categories for current tenant
const categories = await getDocs(
  query(
    collection(db, 'categories'),
    where('tenantId', '==', user.tenantId)
  )
);
```

---

## Data Models

All data models are defined in `shared/schema.ts` using Zod schemas for runtime validation:

### Core User Models

**User Profile:**
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'admin';
  tenantId: number;
  createdAt: Date;
  profileImageUrl?: string;
  preferences?: {
    theme?: string;
    notifications?: boolean;
  };
}
```

**Quiz Attempt:**
```typescript
interface Quiz {
  id: string;
  userId: string;
  tenantId: number;
  categoryIds: string[];
  subcategoryIds: string[];
  mode: 'study' | 'quiz' | 'adaptive';
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  answers: QuizAnswer[];
  completedAt: Date;
  timeSpent: number; // seconds
}

interface QuizAnswer {
  questionId: string;
  selectedAnswer: number | null;
  isCorrect: boolean;
  timeTaken: number;
}
```

**Learning Progress:**
```typescript
interface UserProgress {
  id: string;
  userId: string;
  tenantId: number;
  categoryId: string;
  subcategoryId?: string;
  masteryScore: number; // 0-100
  questionsAttempted: number;
  questionsCorrect: number;
  lastPracticed: Date;
  streak: number;
}
```

**Badge Achievement:**
```typescript
interface UserBadge {
  id: string;
  userId: string;
  tenantId: number;
  badgeId: string;
  earnedAt: Date;
  progress?: number; // For progressive badges
}
```

**Game Statistics:**
```typescript
interface UserGameStats {
  id: string;
  userId: string;
  tenantId: number;
  totalPoints: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: Date;
  totalQuizzesTaken: number;
  perfectScores: number;
}
```

### Shared Content Models

**Category:**
```typescript
interface Category {
  id: string;
  tenantId: number;
  name: string;
  description: string;
  icon?: string;
  order: number;
  isActive: boolean;
}
```

**Subcategory:**
```typescript
interface Subcategory {
  id: string;
  tenantId: number;
  categoryId: string;
  name: string;
  description: string;
  order: number;
}
```

**Question:**
```typescript
interface Question {
  id: string;
  tenantId: number;
  categoryId: string;
  subcategoryId: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  references?: string[];
  isPersonal: boolean; // true for user-imported questions
  createdBy?: string;  // userId if personal question
}
```

**Badge Definition:**
```typescript
interface Badge {
  id: string;
  tenantId: number;
  name: string;
  description: string;
  icon: string;
  requirement: {
    type: 'quiz_count' | 'perfect_score' | 'streak' | 'points';
    threshold: number;
  };
  isActive: boolean;
}
```

---

## Implementation Details

### Firestore Indexes

Required indexes for efficient queries are defined in `firestore.indexes.json`:

**Quiz Queries:**
```json
{
  "collectionGroup": "quizzes",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "completedAt", "order": "DESCENDING" }
  ]
}
```

**Progress Queries:**
```json
{
  "collectionGroup": "progress",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "categoryId", "order": "ASCENDING" },
    { "fieldPath": "masteryScore", "order": "DESCENDING" }
  ]
}
```

**Question Queries:**
```json
{
  "collectionGroup": "questions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "categoryId", "order": "ASCENDING" },
    { "fieldPath": "difficulty", "order": "ASCENDING" }
  ]
}
```

### Storage Abstraction Layer

All Firestore operations go through `storage-factory.ts`:

```typescript
// client/src/lib/storage-factory.ts
import { FirestoreStorage } from './firestore-storage';

// Single storage instance used throughout the app
export const storage = new FirestoreStorage();

// Example usage in components
import { storage } from '@/lib/storage-factory';

// Fetch user's quizzes
const quizzes = await storage.getUserQuizzes(userId);

// Create new quiz
const quiz = await storage.createQuiz({
  userId,
  tenantId,
  categoryIds: ['cissp-1'],
  mode: 'quiz',
  questionCount: 20
});

// Update progress
await storage.updateProgress(userId, {
  categoryId: 'cissp-1',
  subcategoryId: 'security-architecture',
  masteryScore: 85
});
```

### Data Access Patterns

**Common Queries:**

```typescript
// Get all categories for current tenant
async getCategories(tenantId: number): Promise<Category[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'categories'),
      where('tenantId', '==', tenantId),
      where('isActive', '==', true),
      orderBy('order', 'asc')
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get user's quiz history
async getUserQuizzes(
  userId: string,
  limit: number = 20
): Promise<Quiz[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'users', userId, 'quizzes'),
      orderBy('completedAt', 'desc'),
      limit(limit)
    )
  );
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Get random questions for quiz
async getRandomQuestions(
  tenantId: number,
  categoryIds: string[],
  count: number
): Promise<Question[]> {
  // Firestore doesn't support random queries directly
  // Implementation uses client-side shuffle after fetching
  const snapshot = await getDocs(
    query(
      collection(db, 'questions'),
      where('tenantId', '==', tenantId),
      where('categoryId', 'in', categoryIds)
    )
  );
  const questions = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  }));
  return shuffle(questions).slice(0, count);
}

// Track user progress
async updateProgress(
  userId: string,
  data: Partial<UserProgress>
): Promise<void> {
  const progressId = `${data.categoryId}_${data.subcategoryId || 'all'}`;
  await setDoc(
    doc(db, 'users', userId, 'progress', progressId),
    {
      ...data,
      lastPracticed: new Date(),
      updatedAt: new Date()
    },
    { merge: true }
  );
}
```

### Batch Operations

For efficient data operations, use Firestore batch writes:

```typescript
import { writeBatch, doc } from 'firebase/firestore';

async function saveQuizAttempt(quiz: Quiz): Promise<void> {
  const batch = writeBatch(db);
  
  // Save quiz result
  const quizRef = doc(db, 'users', quiz.userId, 'quizzes', quiz.id);
  batch.set(quizRef, quiz);
  
  // Update game stats
  const statsRef = doc(db, 'users', quiz.userId, 'gameStats', 'main');
  batch.update(statsRef, {
    totalPoints: increment(quiz.score * 10),
    totalQuizzesTaken: increment(1),
    perfectScores: increment(quiz.score === 100 ? 1 : 0)
  });
  
  // Update progress for each category
  quiz.categoryIds.forEach(categoryId => {
    const progressRef = doc(
      db, 
      'users', 
      quiz.userId, 
      'progress', 
      `${categoryId}_all`
    );
    batch.set(progressRef, {
      questionsAttempted: increment(quiz.totalQuestions),
      questionsCorrect: increment(quiz.correctAnswers),
      lastPracticed: new Date()
    }, { merge: true });
  });
  
  await batch.commit();
}
```

---

## Consequences

### Positive

✅ **Data Isolation:**
- User data automatically isolated by subcollection path
- Security rules enforce isolation at database level
- No risk of cross-user data leaks
- Easy to implement per-user operations

✅ **Query Performance:**
- Indexes enable fast queries (< 100ms)
- Efficient pagination with Firestore cursors
- Can query within user's data without scanning all documents
- Shared content queries are fast with proper indexes

✅ **Scalability:**
- Firestore automatically shards collections
- Subcollections don't affect parent document size
- Can scale to millions of users
- No manual partitioning required

✅ **Type Safety:**
- TypeScript types ensure consistency
- Zod schemas provide runtime validation
- Easier to catch bugs at compile time
- Self-documenting data models

✅ **Multi-Tenancy:**
- Simple tenant isolation with `tenantId` field
- Easy to query data for specific tenant
- Can support unlimited tenants
- No need for separate databases

✅ **Offline Support:**
- Firestore SDK handles offline caching automatically
- Automatic sync when back online
- Conflict resolution built-in
- Works seamlessly with subcollections

### Negative

❌ **Query Limitations:**
- No joins between collections (NoSQL limitation)
- Limited to 30 `in` clauses per query
- Can't query across subcollections easily
- No full-text search (requires external service)

❌ **Index Management:**
- Complex queries require explicit indexes
- Index creation can take time in production
- Too many indexes can slow writes
- Need to monitor index usage

❌ **Cost Considerations:**
- Charged per document read/write
- Subcollections count toward read costs
- Querying large result sets can be expensive
- Need to optimize for read efficiency

❌ **Data Migration:**
- Changing collection structure requires migration
- No built-in migration tools
- Subcollection changes affect all users
- Need careful planning for schema changes

❌ **Aggregation Limitations:**
- No built-in aggregation queries
- Need to compute aggregates client-side or with Cloud Functions
- Can't do complex analytics in Firestore
- Need BigQuery export for analytics

### Mitigations

1. **Query Limitations:**
   - Denormalize data when needed (e.g., category names in quiz documents)
   - Use client-side filtering for complex queries
   - Consider Algolia or Elastic for full-text search
   - Batch multiple queries when needed

2. **Index Management:**
   - Monitor Firebase Console for missing indexes
   - Review and optimize indexes quarterly
   - Delete unused indexes
   - Use collection group queries sparingly

3. **Cost Optimization:**
   - Cache frequently accessed data client-side
   - Use pagination to limit read counts
   - Aggregate data in game stats to avoid multiple reads
   - Monitor costs in Firebase Console

4. **Migration Strategy:**
   - Version data models in code
   - Plan migrations before making changes
   - Test migrations in development
   - Consider Cloud Functions for automated migrations

---

## Alternatives Considered

### Alternative 1: Flat Collection Structure

Store all user data in root collections with `userId` field:

```
/quizzes/{quizId}  # Contains userId field
/progress/{progressId}  # Contains userId field
```

**Pros:**
- Easier to query across all users
- Simpler document paths
- Can do collection-wide queries

**Cons:**
- Harder to enforce data isolation
- Security rules more complex
- Difficult to delete all user data
- Potential for data leaks

**Rejected Because:** Data isolation and security are critical requirements.

---

### Alternative 2: Single User Document with Arrays

Store all user data in arrays within single user document:

```typescript
{
  id: "user-123",
  quizzes: [...],  // All quizzes as array
  progress: [...],  // All progress as array
  badges: [...]     // All badges as array
}
```

**Pros:**
- Single read to get all user data
- Simpler security rules
- Natural atomic updates

**Cons:**
- Document size limit (1MB max)
- Inefficient for large datasets
- Can't paginate results
- Difficult to query within arrays

**Rejected Because:** Would hit document size limits quickly and limit functionality.

---

### Alternative 3: SQL Database (PostgreSQL)

Use relational database with foreign keys:

**Pros:**
- Powerful joins and aggregations
- ACID transactions
- Complex queries with SQL
- Mature tooling

**Cons:**
- Requires backend server
- No offline-first support
- Manual scaling and sharding
- More complex infrastructure

**Rejected Because:** Firebase's serverless model and offline support better fit the application requirements.

---

## Related Documents

- [ADR-001: Authentication, Authorization, User State Management](ADR-001-authentication-authorization.md)
- [ADR-002: Cloud-First Architecture & Firebase Integration](ADR-002-cloud-first-firebase-integration.md)
- [ADR-004: Security Model & Firestore Rules](ADR-004-security-firestore-rules.md)
- [Architecture Overview](overview.md)
- [Data Import Guide](../DATA_IMPORT_GUIDE.md)

### Code References

| File | Purpose |
|------|---------|
| `shared/schema.ts` | TypeScript data models and Zod schemas |
| `client/src/lib/firestore-storage.ts` | Firestore data operations |
| `client/src/lib/storage-factory.ts` | Storage abstraction layer |
| `firestore.indexes.json` | Firestore query indexes |
| `client/src/lib/firestore-service.ts` | Low-level Firestore helpers |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-20 | CertLab Team | Initial ADR documenting Firestore data architecture |

---

**End of ADR-003**
