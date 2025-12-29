# Daily Challenges & Rewards - Firestore Implementation

## Overview

This document describes the Firestore data structure and implementation for the Daily Challenges & Rewards system in CertLab.

## Firestore Collections

### Shared Collections (Top-Level)

These collections contain shared content accessible to all users:

#### `quests`
Defines available quests (daily, weekly, monthly challenges).

**Document Structure:**
```typescript
{
  id: number,
  title: string,
  description: string,
  type: 'daily' | 'weekly' | 'monthly' | 'special',
  requirement: {
    type: 'quizzes_completed' | 'questions_answered' | 'perfect_scores' | 'study_streak',
    target: number,
    categoryId?: number, // Optional category restriction
  },
  reward: {
    points: number,
    title?: string,        // Optional title unlock
    badgeId?: number,      // Optional badge unlock
  },
  isActive: boolean,
  validFrom: Date,
  validUntil: Date | null, // null = no expiration
  createdAt: Date,
}
```

**Document ID:** String representation of numeric ID (e.g., "1", "2", "3")

**Examples:**
- Quest #1: Complete 3 quizzes today (daily, 50 points)
- Quest #4: Complete 20 quizzes this week (weekly, 250 points + "Study Warrior" title)
- Quest #7: Complete 100 quizzes this month (monthly, 1000 points + "Quiz Master" title)

#### `dailyRewards`
Defines the 7-day daily login reward cycle.

**Document Structure:**
```typescript
{
  id: number,
  day: number,           // 1-7 for weekly cycle
  reward: {
    points: number,
    title?: string,
    streakFreeze?: boolean, // Day 7 grants a streak freeze
  },
  description: string,
}
```

**Document ID:** String representation of numeric ID (e.g., "1", "2", "7")

**Examples:**
- Day 1: 10 points
- Day 7: 50 points + streak freeze

### Per-User Subcollections

These subcollections are stored under `/users/{userId}/` and contain user-specific data:

#### `questProgress`
Tracks user's progress on each quest they've interacted with.

**Path:** `/users/{userId}/questProgress/{questId}`

**Document Structure:**
```typescript
{
  id: number,
  userId: string,
  tenantId: number,
  questId: number,
  progress: number,           // Current progress towards target
  isCompleted: boolean,
  completedAt: Date | null,
  rewardClaimed: boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

**Document ID:** String representation of questId (e.g., "1", "4", "7")

**Lifecycle:**
1. Created when user makes first progress on a quest
2. Updated as user progresses
3. `isCompleted` set to true when `progress >= requirement.target`
4. `rewardClaimed` set to true when user claims the reward

#### `dailyRewardClaims`
Records which daily rewards the user has claimed.

**Path:** `/users/{userId}/dailyRewardClaims/{claimId}`

**Document Structure:**
```typescript
{
  id: number,
  userId: string,
  tenantId: number,
  day: number,              // Which day of the 7-day cycle
  claimedAt: Date,
  rewardData: {
    points: number,
    streakFreeze?: boolean,
  },
}
```

**Document ID:** Timestamp-based unique ID (e.g., "1703721234567")

**Notes:**
- One claim per day per user (enforced by application logic)
- Used to check if user has already claimed reward for a specific day
- 7-day cycle resets based on `consecutiveLoginDays % 7`

#### `titles`
Stores titles unlocked by the user (from quests, achievements, etc.).

**Path:** `/users/{userId}/titles/{titleId}`

**Document Structure:**
```typescript
{
  id: number,
  userId: string,
  tenantId: number,
  title: string,            // e.g., "Quiz Master", "Streak Champion"
  description: string,
  source: string,           // 'quest', 'badge', 'achievement', 'special'
  unlockedAt: Date,
}
```

**Document ID:** Timestamp-based unique ID (e.g., "1703721234567")

**Notes:**
- Multiple titles can be unlocked by a user
- Current selected title is stored in `userGameStats.selectedTitle`

### Modified Collections

#### `userGameStats`
Extended to support daily login tracking and selected titles.

**Path:** `/users/{userId}/gameStats`

**New/Modified Fields:**
```typescript
{
  lastLoginDate: Date,              // Last login date (used for streak tracking)
  consecutiveLoginDays: number,     // Number of consecutive days logged in
  selectedTitle: string | null,     // Currently selected/displayed title
  // ... existing fields
}
```

## Implementation Status

### ✅ Completed

1. **Firestore Storage Methods**
   - ✅ `getQuests()` - Get all quests
   - ✅ `getActiveQuests()` - Get active (non-expired) quests
   - ✅ `getQuestsByType(type)` - Filter quests by type
   - ✅ `getUserQuestProgress(userId, tenantId)` - Get all user quest progress
   - ✅ `getUserQuestProgressByQuest(userId, questId, tenantId)` - Get specific quest progress
   - ✅ `updateUserQuestProgress(userId, questId, progress, tenantId)` - Update progress
   - ✅ `completeQuest(userId, questId, tenantId)` - Mark quest complete
   - ✅ `claimQuestReward(userId, questId, tenantId)` - Claim quest reward
   - ✅ `getDailyRewards()` - Get all daily rewards
   - ✅ `getUserDailyRewards(userId, tenantId)` - Get user's claims
   - ✅ `hasClaimedDailyReward(userId, day)` - Check if claimed
   - ✅ `claimDailyReward(userId, day, tenantId)` - Claim daily reward
   - ✅ `unlockTitle(userId, title, description, source, tenantId)` - Unlock title
   - ✅ `getUserTitles(userId, tenantId)` - Get user's titles
   - ✅ `setSelectedTitle(userId, title)` - Set selected title

2. **Query Client Integration**
   - ✅ Query keys for quests, daily rewards, quest progress
   - ✅ Route handlers in `getQueryFn`
   - ✅ Proper caching and invalidation

3. **UI Components**
   - ✅ Daily Challenges page exists (`/client/src/pages/daily-challenges.tsx`)
   - ✅ Uses gamification service for business logic
   - ✅ Displays daily/weekly/monthly quests
   - ✅ Shows 7-day reward cycle with claim button

### 🔄 Pending

1. **Data Seeding**
   - 🔄 Run seed script to populate Firestore
   - 🔄 Verify data in Firebase Console
   - 🔄 Test with real user accounts

2. **Testing**
   - 🔄 Test quest progress tracking
   - 🔄 Test daily reward claims
   - 🔄 Test 7-day cycle reset logic
   - 🔄 Test edge cases (missed days, expired quests)
   - 🔄 UI consistency validation

3. **Documentation**
   - 🔄 Admin seeding instructions
   - 🔄 Firestore security rules (if needed)

## Seeding Data

### Prerequisites

1. **Firebase Admin SDK Service Account**
   - Download service account key from Firebase Console
   - Go to Project Settings > Service Accounts > Generate New Private Key
   - Save as `firebase-service-account.json` (DO NOT commit to git)

2. **Set Environment Variable**
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY="$(cat firebase-service-account.json)"
   ```

### Running the Seed Script

```bash
# Install project dependencies (firebase-admin should already be in package.json)
npm install

# Run the seed script
export FIREBASE_SERVICE_ACCOUNT_KEY="$(cat firebase-service-account.json)"
npx tsx scripts/seed-gamification-data.ts
```

**Expected Output:**
```
Starting gamification data seeding...

Seeding quests...
✓ Seeded 9 quests
Seeding daily rewards...
✓ Seeded 7 daily rewards

✓ All gamification data seeded successfully!

Summary:
  - 3 daily quests
  - 3 weekly quests
  - 3 monthly quests
  - 7 daily rewards (7-day cycle)
```

### Verifying Data

Check Firebase Console:
1. Go to Firestore Database
2. Verify collections:
   - `quests` should have 9 documents
   - `dailyRewards` should have 7 documents

## Security Rules

Add these rules to your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Shared content - read-only for authenticated users
    match /quests/{questId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }
    
    match /dailyRewards/{rewardId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }
    
    // Per-user data
    match /users/{userId} {
      // Quest progress
      match /questProgress/{questId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Daily reward claims
      match /dailyRewardClaims/{claimId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Titles
      match /titles/{titleId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

## Usage Examples

### Checking User's Quest Progress

```typescript
import { storage } from '@/lib/storage-factory';

// Get all active quests
const activeQuests = await storage.getActiveQuests();

// Get user's progress for each quest
const userId = currentUser.id;
const tenantId = currentUser.tenantId;

for (const quest of activeQuests) {
  const progress = await storage.getUserQuestProgressByQuest(userId, quest.id, tenantId);
  console.log(`Quest "${quest.title}": ${progress?.progress || 0}/${quest.requirement.target}`);
}
```

### Claiming Daily Reward

```typescript
import { gamificationService } from '@/lib/gamification-service';

// Process daily login (checks if user should receive reward)
const loginResult = await gamificationService.processDailyLogin(userId, tenantId);

if (loginResult.shouldShowReward) {
  // Show reward UI, let user click claim button
  // On claim:
  const result = await gamificationService.claimDailyReward(userId, loginResult.day, tenantId);
  console.log(`Claimed ${result.pointsEarned} points!`);
}
```

### Updating Quest Progress After Quiz

```typescript
import { gamificationService } from '@/lib/gamification-service';

// After quiz completion
const result = await gamificationService.processQuestUpdates(userId, quiz, tenantId);

if (result.completedQuests.length > 0) {
  console.log(`Completed ${result.completedQuests.length} quests!`);
  console.log(`Earned ${result.pointsEarned} points`);
  
  if (result.titlesUnlocked.length > 0) {
    console.log(`Unlocked titles: ${result.titlesUnlocked.join(', ')}`);
  }
}
```

## Testing

### Prerequisites for Testing

Since Firebase credentials are required to test the Firestore implementation:

1. **Set up Firebase project** (if not already done)
   - See `FIREBASE_SETUP.md` for instructions
   
2. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Add your Firebase credentials:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```

3. **Seed the data**
   ```bash
   export FIREBASE_SERVICE_ACCOUNT_KEY="$(cat firebase-service-account.json)"
   npx tsx scripts/seed-gamification-data.ts
   ```

### Manual Testing Steps

#### 1. Test Quest Display

**Steps:**
1. Start the dev server: `npm run dev`
2. Log in to the application
3. Navigate to "Daily Challenges" page (`/daily-challenges`)
4. Verify you see three tabs: Daily, Weekly, Monthly
5. Click through each tab and verify quests are displayed
6. Check that each quest shows:
   - Title and description
   - Progress bar (0/target initially)
   - Point reward
   - Type badge (Daily/Weekly/Monthly)

**Expected Results:**
- Daily tab: 3 quests (Complete 3 quizzes, Answer 20 questions, Get perfect score)
- Weekly tab: 3 quests (Complete 20 quizzes, Answer 100 questions, 7-day streak)
- Monthly tab: 3 quests (Complete 100 quizzes, Answer 500 questions, 10 perfect scores)

**Console Check:**
- Open browser console
- Should NOT see warnings about "not yet implemented"
- Check Network tab for Firestore requests (if online)

#### 2. Test Quest Progress Tracking

**Steps:**
1. While on Daily Challenges page, note current progress
2. Navigate to Quiz page and complete a quiz
3. Return to Daily Challenges page
4. Verify progress has updated for relevant quests

**Expected Results:**
- "Complete 3 quizzes" quest: progress increases by 1
- "Answer X questions correctly" quest: progress increases by number of correct answers
- "Perfect Score" quest: progress increases by 1 if you got 100%
- Progress bars update to show new percentage
- When quest reaches 100%, "Claim Reward" button appears

**Console Check:**
```javascript
// Open browser console and run:
import { storage } from './lib/storage-factory';
const userId = '<your-user-id>'; // Get from auth context
const tenantId = 1;

// Check quest progress
const progress = await storage.getUserQuestProgress(userId, tenantId);
console.log('Quest Progress:', progress);
```

#### 3. Test Quest Reward Claiming

**Steps:**
1. Complete a quest (get progress to 100%)
2. Click "Claim Reward" button
3. Verify celebration animation plays
4. Verify toast notification shows points earned
5. Verify button changes to "Completed" with checkmark
6. Refresh page and verify quest still shows as completed

**Expected Results:**
- Celebration animation appears
- Toast: "✨ Quest Reward Claimed! You earned X points for completing '[Quest Title]'!"
- Button text changes from "Claim Reward" to "Completed"
- If quest unlocks a title, toast shows "and unlocked [Title]!"
- Points added to user's total (check profile/stats)

**Console Check:**
```javascript
// Verify reward was claimed
const progress = await storage.getUserQuestProgressByQuest(userId, questId, tenantId);
console.log('Reward Claimed:', progress.rewardClaimed); // Should be true
```

#### 4. Test Daily Login Rewards

**Steps:**
1. Navigate to Daily Challenges page
2. Look at "Daily Login Rewards" section
3. Note which day of the cycle you're on
4. Click "Claim Today's Reward" button
5. Verify celebration animation
6. Verify toast shows points earned
7. Button should change to "Already Claimed"
8. Close and reopen the page - button should still show "Already Claimed"

**Expected Results:**
- Shows "Day X of 7-day cycle"
- Current day has pulsing border and different styling
- Previous days show checkmark (if consecutive logins)
- Claim button shows appropriate state
- On Day 7: "You earned 50 points and a Streak Freeze!"

**Test Consecutive Days:**
1. Note current `consecutiveLoginDays` in userGameStats
2. Come back tomorrow and login
3. Day number should increment
4. After claiming 7 days consecutively, cycle resets to Day 1

**Console Check:**
```javascript
// Check user's consecutive login days
const gameStats = await storage.getUserGameStats(userId);
console.log('Consecutive Login Days:', gameStats.consecutiveLoginDays);
console.log('Last Login:', gameStats.lastLoginDate);

// Check claimed rewards
const claims = await storage.getUserDailyRewards(userId, tenantId);
console.log('Claimed Rewards:', claims);
```

#### 5. Test 7-Day Cycle Reset

**Steps:**
1. Check current day in cycle: `(consecutiveLoginDays % 7) + 1`
2. Simulate 7 consecutive days of logins (may require manual date manipulation in console)
3. Verify cycle resets to Day 1 after Day 7
4. Verify streak freeze is granted on Day 7

**Manual Date Testing (Console):**
```javascript
// WARNING: This is for testing only - manipulates dates
const userId = '<your-user-id>';

// Simulate advancing to next day
const gameStats = await storage.getUserGameStats(userId);
const newDate = new Date();
newDate.setDate(newDate.getDate() + 1); // Next day
await storage.updateUserGameStats(userId, {
  lastLoginDate: newDate,
  consecutiveLoginDays: gameStats.consecutiveLoginDays + 1
});

// Check new cycle day
const updated = await storage.getUserGameStats(userId);
const currentDay = (updated.consecutiveLoginDays % 7) + 1;
console.log('Current Day:', currentDay);
```

#### 6. Test Edge Cases

##### Missed Days
**Steps:**
1. Note current `consecutiveLoginDays`
2. Simulate missing 2+ days:
   ```javascript
   const pastDate = new Date();
   pastDate.setDate(pastDate.getDate() - 3);
   await storage.updateUserGameStats(userId, { lastLoginDate: pastDate });
   ```
3. Reload page and trigger daily login
4. Verify `consecutiveLoginDays` resets to 1
5. Verify Daily Reward cycle restarts at Day 1

**Expected Results:**
- Streak is broken (unless streak freeze is used)
- `consecutiveLoginDays` resets to 1
- Daily reward cycle shows Day 1
- Previous claims are preserved but cycle restarts

##### Double Claim Prevention
**Steps:**
1. Claim today's daily reward
2. Try to claim again (button should be disabled)
3. Check console for error if attempting programmatically

**Expected Results:**
- Button shows "Already Claimed" and is disabled
- If called via console: Error thrown "Daily reward for day X has already been claimed"

##### Expired Quests
**Steps:**
1. Create a quest with `validUntil` in the past
2. Verify it doesn't appear in active quests
3. Check `getActiveQuests()` filters it out

**Console Check:**
```javascript
const allQuests = await storage.getQuests();
const activeQuests = await storage.getActiveQuests();
console.log('Total Quests:', allQuests.length);
console.log('Active Quests:', activeQuests.length);
// Active should be <= Total
```

#### 7. Test Title Unlocking

**Steps:**
1. Complete a quest that grants a title (e.g., Quest #3: "Perfectionist")
2. Verify toast shows title unlock
3. Navigate to Profile page
4. Check if titles section exists
5. Verify unlocked title appears in list

**Expected Results:**
- Quest reward claim shows: "You earned X points and unlocked '[Title]'!"
- Title appears in user's titles collection
- Title can be selected as display title

**Console Check:**
```javascript
const titles = await storage.getUserTitles(userId, tenantId);
console.log('Unlocked Titles:', titles);

// Should include title from quest
const hasTitle = titles.some(t => t.title === 'Perfectionist');
console.log('Has Perfectionist Title:', hasTitle);
```

### Automated Testing

Currently, the codebase doesn't have automated tests for the gamification system. To add tests:

1. **Unit Tests** (with Vitest)
   - Test storage methods in isolation
   - Mock Firestore calls
   - Test edge cases and error handling

2. **Integration Tests**
   - Test full quest completion flow
   - Test daily reward claiming flow
   - Test streak calculation logic

3. **E2E Tests** (with Playwright or Cypress)
   - Test full user journey
   - Test UI interactions
   - Test multi-day scenarios

Example test structure:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firestoreStorage } from '@/lib/firestore-storage';

describe('Quest Management', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should fetch all quests', async () => {
    const quests = await firestoreStorage.getQuests();
    expect(quests).toHaveLength(9);
  });

  it('should filter active quests', async () => {
    const active = await firestoreStorage.getActiveQuests();
    // Verify no expired quests
    active.forEach(quest => {
      if (quest.validUntil) {
        expect(new Date(quest.validUntil)).toBeAfter(new Date());
      }
    });
  });

  it('should track quest progress', async () => {
    const userId = 'test-user';
    const questId = 1;
    const tenantId = 1;
    
    await firestoreStorage.updateUserQuestProgress(userId, questId, 5, tenantId);
    const progress = await firestoreStorage.getUserQuestProgressByQuest(userId, questId, tenantId);
    
    expect(progress?.progress).toBe(5);
  });
});
```

### Troubleshooting

### Issue: "Firestore is not initialized"
**Solution:** Ensure Firebase is configured with valid credentials. Check `VITE_FIREBASE_*` environment variables.

### Issue: "Permission denied" when reading quests
**Solution:** 
1. User must be authenticated
2. Check Firestore security rules
3. Verify user's authentication token

### Issue: Daily reward already claimed
**Solution:** This is expected behavior. The 7-day cycle resets based on consecutive login days. Check `userGameStats.consecutiveLoginDays`.

### Issue: Quest progress not updating
**Solution:**
1. Verify `gamificationService.processQuestUpdates()` is called after quiz completion
2. Check that quest requirement type matches the user action
3. Verify quest is active and not expired

## Future Enhancements

1. **Automatic Quest Reset**
   - Cloud function to reset daily/weekly/monthly quests
   - Schedule based on quest type

2. **Quest Expiration**
   - Automatic deactivation of expired quests
   - Notification when quest is about to expire

3. **Dynamic Quest Generation**
   - AI-generated personalized quests
   - Based on user's weak areas and goals

4. **Leaderboards**
   - Track quest completion across users
   - Monthly/weekly top performers

5. **Quest Chains**
   - Multi-step quests that unlock progressively
   - Story-based quest progression
