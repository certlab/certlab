# E2E Skipped Tests Catalog

This document catalogs all skipped end-to-end (e2e) Playwright tests in the CertLab repository.

**Total Skipped Tests: 36**

**Last Updated:** 2026-01-26

---

## Overview

The e2e tests are located in `e2e/tests/*.spec.ts` and use Playwright for browser automation. Tests are skipped for various reasons including:
- **Authentication Requirements**: Tests require Firebase OAuth setup
- **Missing UI Elements**: Features not yet implemented in the UI
- **Active State Requirements**: Tests require a quiz/session to already be in progress
- **Conditional Skips**: Tests dynamically skip if prerequisite elements are not found

---

## Test Files Summary

| File | Total Skipped | Categories |
|------|---------------|------------|
| `01-landing.spec.ts` | 2 | Conditional UI element skips |
| `02-authentication.spec.ts` | 5 | OAuth setup required |
| `03-quiz-flow.spec.ts` | 13 | Authentication + Feature implementation |
| `04-achievements.spec.ts` | 15 | Authentication + Feature implementation |
| `05-accessibility.spec.ts` | 1 | Active quiz required |

---

## Detailed Catalog

### 1. Landing Page Tests (`01-landing.spec.ts`)

#### 1.1 Theme Switching
**Test:** `should allow theme switching` (line 81)  
**Reason:** Conditional skip - Theme switcher button not found on landing page  
**Type:** Dynamic skip based on UI availability  
**Comments:** Test attempts to find theme button and skips if not visible

#### 1.2 Navigation to Login
**Test:** `should navigate to login page from landing page` (line 130)  
**Reason:** Conditional skip - Sign in button not found on landing page  
**Type:** Dynamic skip based on UI availability  
**Comments:** Test looks for sign in/login/get started button and skips if not found

---

### 2. Authentication Flow Tests (`02-authentication.spec.ts`)

All authentication tests require Firebase OAuth setup or emulator configuration.

#### 2.1 Google OAuth Login
**Test:** `should login successfully with Google OAuth` (line 45)  
**Reason:** Requires real Firebase credentials  
**Type:** OAuth setup required  
**Prerequisites:**
- Firebase Auth Emulator setup, OR
- Test credentials from environment variables  
**Impact:** Cannot test complete login flow

#### 2.2 Logout Flow
**Test:** `should logout successfully` (line 73)  
**Reason:** Requires authentication to be set up first  
**Type:** OAuth/auth dependency  
**Prerequisites:** User must be logged in  
**Impact:** Cannot test logout functionality

#### 2.3 Session Persistence
**Test:** `should persist session after page reload` (line 100)  
**Reason:** Requires authentication to be set up first  
**Type:** OAuth/auth dependency  
**Prerequisites:** User must be logged in  
**Impact:** Cannot verify session persistence across page reloads

#### 2.4 Session Clearing After Logout
**Test:** `should clear session after logout and prevent access to protected routes` (line 124)  
**Reason:** Requires authentication to be set up first  
**Type:** OAuth/auth dependency  
**Prerequisites:** User must be logged in  
**Impact:** Cannot test protected route access control

#### 2.5 Session Timeout Handling
**Test:** `should handle session timeout gracefully` (line 172)  
**Reason:** Requires authentication setup and session manipulation  
**Type:** OAuth/auth dependency  
**Prerequisites:** User must be logged in  
**Impact:** Cannot test timeout/expiration behavior

---

### 3. Quiz Flow Tests (`03-quiz-flow.spec.ts`)

All quiz flow tests require authentication and/or active quiz state.

#### 3.1 Basic Quiz Creation
**Test:** `should create a basic quiz` (line 19)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency + conditional skip  
**Additional Skip:** Skips if "Start Learning" or "Create Quiz" button not found (line 30)  
**Impact:** Cannot test quiz creation flow

#### 3.2 Multi-Category Quiz Creation
**Test:** `should create a multi-category quiz` (line 62)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot test multi-category quiz configuration

#### 3.3 Answering Quiz Questions
**Test:** `should answer questions in a quiz` (line 93)  
**Reason:** Requires authentication and quiz to be started  
**Type:** Active state required + conditional skip  
**Additional Skip:** Skips if no quiz questions found (line 105)  
**Impact:** Cannot test answer selection flow

#### 3.4 Progress Indicator Display
**Test:** `should display progress indicator` (line 130)  
**Reason:** Requires active quiz  
**Type:** Active state required  
**Impact:** Cannot verify progress tracking UI

#### 3.5 Question Flagging
**Test:** `should allow flagging questions for review` (line 144)  
**Reason:** Requires active quiz  
**Type:** Active state required  
**Impact:** Cannot test flag/mark for review feature

#### 3.6 Question Navigation
**Test:** `should navigate between questions` (line 172)  
**Reason:** Requires active quiz  
**Type:** Active state required  
**Impact:** Cannot test next/previous navigation

#### 3.7 Quiz Results Display
**Test:** `should display results after quiz completion` (line 206)  
**Reason:** Requires completed quiz  
**Type:** Active state required  
**Impact:** Cannot test results page

#### 3.8 Answer Review
**Test:** `should allow reviewing answers` (line 228)  
**Reason:** Requires completed quiz  
**Type:** Active state required  
**Impact:** Cannot test answer review functionality

#### 3.9 Correct/Incorrect Answer Display
**Test:** `should show correct and incorrect answers in review` (line 247)  
**Reason:** Requires review page (completed quiz)  
**Type:** Active state required  
**Impact:** Cannot verify answer feedback UI

#### 3.10 Explanation Display
**Test:** `should display explanations in review` (line 271)  
**Reason:** Requires review page (completed quiz)  
**Type:** Active state required  
**Impact:** Cannot test explanation feature

#### 3.11 Study Mode Feedback
**Test:** `should show immediate feedback in study mode` (line 290)  
**Reason:** Requires study mode quiz  
**Type:** Active state required  
**Impact:** Cannot test study mode immediate feedback

---

### 4. Achievements and Gamification Tests (`04-achievements.spec.ts`)

All achievement tests require authentication.

#### 4.1 Achievements Page Navigation
**Test:** `should navigate to achievements page` (line 17)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency + conditional skip  
**Additional Skip:** Skips if achievements link not found (line 26)  
**Impact:** Cannot test achievements page access

#### 4.2 Badge Display
**Test:** `should display earned badges` (line 40)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot verify badge rendering

#### 4.3 Badge Details on Hover
**Test:** `should show badge details on hover or click` (line 53)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot test badge tooltips/details

#### 4.4 Streak Information Display
**Test:** `should display streak information` (line 78)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot verify streak tracking UI

#### 4.5 Total Quizzes Display
**Test:** `should display total quizzes taken` (line 93)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot verify quiz count display

#### 4.6 Average Score Display
**Test:** `should display average score` (line 108)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot verify average score calculation

#### 4.7 Level/XP Progress Display
**Test:** `should display level/XP progress` (line 123)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot test gamification level system

#### 4.8 Recent Activity Display
**Test:** `should display recent activity` (line 136)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot verify activity feed

#### 4.9 Badge Earning Notification
**Test:** `should show notification when earning first badge` (line 151)  
**Reason:** Requires completing an action that earns a badge  
**Type:** Active state required (first quiz completion)  
**Impact:** Cannot test achievement notification system

#### 4.10 Category-Specific Progress
**Test:** `should display category-specific progress` (line 169)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot verify per-category progress tracking

#### 4.11 Mastery Scores Display
**Test:** `should show mastery scores` (line 182)  
**Reason:** Requires authentication  
**Type:** OAuth/auth dependency  
**Impact:** Cannot test mastery score feature

#### 4.12 Leaderboard Display
**Test:** `should display leaderboard` (line 197)  
**Reason:** Requires authentication (implicit)  
**Type:** OAuth/auth dependency  
**Impact:** Cannot test leaderboard feature

#### 4.13 Challenges Display
**Test:** `should display challenges` (line 218)  
**Reason:** Requires authentication (implicit)  
**Type:** OAuth/auth dependency  
**Impact:** Cannot verify daily challenges UI

#### 4.14 Daily Challenge Completion
**Test:** `should allow completing daily challenge` (line 233)  
**Reason:** Requires authentication (implicit)  
**Type:** OAuth/auth dependency  
**Impact:** Cannot test challenge participation flow

---

### 5. Accessibility Tests (`05-accessibility.spec.ts`)

#### 5.1 Keyboard Navigation in Quiz
**Test:** `should support keyboard navigation in quiz` (line 61)  
**Reason:** Requires authentication and active quiz  
**Type:** Active state required  
**Impact:** Cannot test keyboard accessibility in quiz interface

---

## Categorization by Root Cause

### Authentication/OAuth Required (25 tests)
Tests that cannot run without Firebase Authentication setup:
- All 5 tests in `02-authentication.spec.ts`
- 11 quiz flow tests in `03-quiz-flow.spec.ts`
- All 14 authentication-dependent tests in `04-achievements.spec.ts`
- 1 test in `05-accessibility.spec.ts`

### Conditional/Dynamic Skips (4 tests)
Tests that skip based on runtime UI element detection:
- 2 tests in `01-landing.spec.ts` (theme switcher, sign in button)
- 2 tests in `03-quiz-flow.spec.ts` (quiz creation button, no quiz questions)
- 1 test in `04-achievements.spec.ts` (achievements link)

### Active State Required (7 tests)
Tests that require an active quiz or completed quiz state:
- 7 quiz-related tests in `03-quiz-flow.spec.ts` (progress, flagging, navigation, results, review, study mode)

---

## Recommendations for Enabling Tests

### Short-Term (Quick Wins)
1. **Set up Firebase Auth Emulator** for local testing
   - Would immediately enable all 25 authentication-dependent tests
   - Required for CI/CD integration
   
2. **Review Conditional Skips** in `01-landing.spec.ts`
   - Verify if theme switcher and sign in button are consistently available
   - Consider making these tests more robust or updating UI to ensure elements exist

### Medium-Term (Feature Implementation)
1. **Implement Missing UI Elements**
   - Add achievements link to navigation (if missing)
   - Add quiz creation/start learning button (if missing)
   - Ensure dashboard statistics are displayed

2. **Create Test Data Setup Helpers**
   - Add utility functions to create authenticated test users
   - Add helpers to set up quiz state (active quiz, completed quiz)
   - Add helpers to seed test data (badges, challenges, etc.)

### Long-Term (Comprehensive Coverage)
1. **Add E2E Test Fixtures**
   - Create authenticated user fixtures
   - Create quiz state fixtures (in-progress, completed)
   - Create achievement/badge state fixtures

2. **Implement Test Data Seeding**
   - Automated seeding of categories, questions, badges
   - Test user creation with various progress states
   - Challenge and leaderboard data seeding

3. **CI/CD Integration**
   - Configure Firebase emulator in GitHub Actions
   - Add environment variables for test credentials
   - Set up parallel test execution

---

## Impact Analysis

### Current Test Coverage
- **Enabled Tests**: ~14 tests (accessibility, landing page basics)
- **Skipped Tests**: 36 tests (~72% of total e2e tests)

### Critical Gaps
1. **Authentication Flow**: 0% coverage (all 5 tests skipped)
2. **Quiz Taking**: 0% coverage (all 11 tests skipped)
3. **Gamification**: 0% coverage (all 14 tests skipped)
4. **Accessibility (quiz)**: Partial coverage (1 test skipped)

### Risk Assessment
- **High Risk**: Authentication and quiz flow are core features with no e2e coverage
- **Medium Risk**: Gamification features have no testing but may be less critical
- **Low Risk**: Landing page and basic accessibility have partial coverage

---

## Related Issues

- Original discussion: https://github.com/certlab/certlab/issues/811#issuecomment-3797562991
- This catalog addresses the investigation of 36 skipped e2e tests separate from the 4 unit test skips that were fixed

---

## Notes

- All test files include clear comments explaining why tests are skipped
- Some tests have nested conditional skips (e.g., skip if authenticated, then skip if button not found)
- Tests are well-structured and ready to enable once prerequisites are met
- No test code changes are required - only infrastructure setup needed

