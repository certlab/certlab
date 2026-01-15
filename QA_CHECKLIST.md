# CertLab QA Checklist

**Version**: 2.0.0  
**Last Updated**: January 15, 2026  
**Purpose**: Comprehensive quality assurance testing procedures for CertLab releases

---

## Table of Contents

1. [Pre-Release Testing](#pre-release-testing)
2. [Automated Testing](#automated-testing)
3. [Manual Testing](#manual-testing)
4. [Cross-Device Testing](#cross-device-testing)
5. [Regression Testing](#regression-testing)
6. [Performance Testing](#performance-testing)
7. [Accessibility Testing](#accessibility-testing)
8. [Security Testing](#security-testing)
9. [Sign-Off](#sign-off)

---

## Pre-Release Testing

### Prerequisites

Before starting QA, ensure:

- [ ] All code changes merged to release branch
- [ ] Dependencies updated and `npm audit` reviewed
- [ ] TypeScript compilation passes (`npm run check`)
- [ ] Build completes successfully (`npm run build`)
- [ ] Documentation updated
- [ ] CHANGELOG.md updated with version and changes

---

## Automated Testing

### Unit & Integration Tests

**Command**: `npm run test:run`

**Expected Results**:
- [ ] All test suites pass (0 failures)
- [ ] Code coverage > 75% (target: 78%)
- [ ] No console errors during test execution
- [ ] Test execution time < 30 seconds

**Test Categories to Verify**:
- [ ] Component tests (45 tests)
- [ ] Integration tests (38 tests)
- [ ] Utility function tests (40 tests)
- [ ] Accessibility tests (24 tests)

### TypeScript Type Checking

**Command**: `npm run check`

**Expected Results**:
- [ ] All new code type-checks without errors
- [ ] Pre-existing type errors documented (currently 19 across 8 files)
- [ ] No new TypeScript errors introduced

### Linting

**Command**: `npm run lint` (if configured)

**Expected Results**:
- [ ] No linting errors
- [ ] Code follows style guidelines
- [ ] JSX accessibility rules pass

### Build Verification

**Command**: `npm run build`

**Expected Results**:
- [ ] Build completes without errors
- [ ] `dist/` folder created
- [ ] `dist/index.html` exists (~2 KB)
- [ ] `dist/assets/index-*.css` exists (~133 KB)
- [ ] `dist/assets/index-*.js` exists (~635 KB)
- [ ] Large chunk warning expected and acceptable

---

## Manual Testing

### Critical User Flows

#### 1. Authentication Flow

**Test**: User Registration (Firebase)
- [ ] Navigate to application
- [ ] Click "Sign in with Google"
- [ ] Complete Google OAuth flow
- [ ] Redirected to dashboard
- [ ] User profile created in Firestore
- [ ] Session persists after page reload

**Test**: User Logout
- [ ] Click user menu
- [ ] Click "Logout"
- [ ] Session cleared
- [ ] Redirected to landing page
- [ ] Cannot access protected routes

**Test**: Session Persistence
- [ ] Sign in to application
- [ ] Close browser
- [ ] Reopen browser
- [ ] Navigate to application
- [ ] Still signed in (session restored)

#### 2. Quiz Creation Flow

**Test**: Basic Quiz Creation
- [ ] Navigate to Dashboard
- [ ] Click "Create Quiz" or "Start Learning"
- [ ] Select at least one category (e.g., CISSP)
- [ ] Choose difficulty level
- [ ] Set question count (10-50)
- [ ] Select quiz mode (Study/Quiz/Adaptive)
- [ ] Click "Start Quiz"
- [ ] Quiz loads with questions

**Test**: Multi-Category Quiz
- [ ] Select multiple categories (CISSP + CISM)
- [ ] Choose subcategories
- [ ] Create quiz
- [ ] Verify questions from both categories appear

**Test**: Quick Start
- [ ] Click "Quick Practice" button
- [ ] Quiz starts immediately (5-10 questions)
- [ ] Uses recently studied categories

#### 3. Quiz Taking Flow

**Test**: Answering Questions
- [ ] Select an answer option
- [ ] Answer highlights correctly
- [ ] Click "Next" or "Submit"
- [ ] Progress indicator updates
- [ ] Can navigate back to previous questions
- [ ] Timer displays (if timed quiz)

**Test**: Study Mode (Immediate Feedback)
- [ ] Select answer
- [ ] Click "Check Answer"
- [ ] Correct/incorrect feedback shown immediately
- [ ] Explanation displayed
- [ ] Can proceed to next question

**Test**: Quiz Mode (Final Results)
- [ ] Select answers for all questions
- [ ] No immediate feedback
- [ ] Click "Submit Quiz"
- [ ] Results page displayed

**Test**: Flag for Review
- [ ] Flag a question
- [ ] Navigate away
- [ ] Return to flagged question
- [ ] Flag indicator visible
- [ ] Can unflag question

#### 4. Results and Review Flow

**Test**: Results Display
- [ ] Quiz submitted
- [ ] Results page loads
- [ ] Score percentage displayed
- [ ] Pass/fail indicator shown (if applicable)
- [ ] Category breakdown visible
- [ ] Strengths and weaknesses identified

**Test**: Review Answers
- [ ] Click "Review Answers"
- [ ] Navigate through questions
- [ ] See selected answer vs. correct answer
- [ ] Explanations displayed
- [ ] Can filter by correct/incorrect

**Test**: Retake Quiz
- [ ] From results page
- [ ] Click "Retake" or "Try Again"
- [ ] New quiz instance created
- [ ] Questions randomized (if applicable)

#### 5. Progress Tracking Flow

**Test**: Dashboard Statistics
- [ ] Navigate to Dashboard
- [ ] Current streak displayed correctly
- [ ] Total quizzes count accurate
- [ ] Average score calculated
- [ ] Level/XP progress shown
- [ ] Recent activity listed

**Test**: Category Progress
- [ ] View progress by category
- [ ] Mastery scores displayed (0-100%)
- [ ] Questions attempted count
- [ ] Questions mastered count
- [ ] Time spent per category

#### 6. Achievement System Flow

**Test**: Badge Earning
- [ ] Complete action that earns badge (e.g., first quiz)
- [ ] Badge notification appears
- [ ] Badge added to profile
- [ ] Badge visible on Achievements page
- [ ] Progress toward next badge shown

**Test**: Streak Tracking
- [ ] Complete quiz today
- [ ] Streak increments
- [ ] Complete quiz next day
- [ ] Streak continues
- [ ] Skip a day
- [ ] Streak resets (verify behavior)

#### 7. Data Management Flow

**Test**: Data Export
- [ ] Navigate to Profile → Settings
- [ ] Click "Export Data"
- [ ] JSON file downloads
- [ ] File contains user profile
- [ ] File contains quiz history
- [ ] File contains progress data
- [ ] File contains achievements
- [ ] JSON is valid and parseable

**Test**: Account Deletion (CRITICAL - Use Test Account)
- [ ] Navigate to Profile → Settings
- [ ] Click "Delete Account"
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Account deleted immediately
- [ ] User logged out
- [ ] Cannot sign in with deleted account
- [ ] Data removed from Firestore (verify manually)

#### 8. Admin Functions Flow

**Test**: Data Import (Admin Only)
- [ ] Sign in as admin user
- [ ] Navigate to Admin → Data Import
- [ ] Click "Import Sample Data"
- [ ] Select CISSP or CISM
- [ ] Import completes successfully
- [ ] Questions visible in Question Bank
- [ ] Categories created/updated

**Test**: User Management (Admin Only)
- [ ] Navigate to Admin → Users
- [ ] View user list
- [ ] Promote user to admin (if feature exists)
- [ ] Verify role change in Firestore

### Additional Features

#### Study Materials
- [ ] Navigate to Study Materials
- [ ] Browse by category
- [ ] Open text lecture (markdown rendered)
- [ ] Open video lecture (player works)
- [ ] Open PDF lecture (PDF viewer works)
- [ ] Mark as read
- [ ] Bookmark lecture

#### Study Groups
- [ ] Browse study groups
- [ ] Join a study group
- [ ] View group members
- [ ] View group activity
- [ ] Leave study group

#### Practice Tests
- [ ] Start practice test
- [ ] Time limit enforced
- [ ] Full-length exam simulation
- [ ] Results with detailed analysis

#### Challenges
- [ ] View daily challenge
- [ ] Complete daily challenge
- [ ] Earn bonus points
- [ ] View quick challenges
- [ ] Complete quick challenge

#### Theme Switching
- [ ] Open theme selector
- [ ] Switch to each of 7 themes:
  - [ ] Default (Light)
  - [ ] Dark Mode
  - [ ] Purple Haze
  - [ ] Ocean Blue
  - [ ] Forest Green
  - [ ] Sunset Orange
  - [ ] Midnight
- [ ] Theme persists after page reload

---

## Cross-Device Testing

### Desktop Browsers

| Browser | Version | Resolution | Status |
|---------|---------|------------|--------|
| Chrome | 120+ | 1920x1080 | [ ] Pass |
| Chrome | 120+ | 1366x768 | [ ] Pass |
| Firefox | 120+ | 1920x1080 | [ ] Pass |
| Firefox | 120+ | 1366x768 | [ ] Pass |
| Safari | 17+ | 1920x1080 | [ ] Pass |
| Edge | 120+ | 1920x1080 | [ ] Pass |

**Test Focus**:
- [ ] All critical flows work
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Performance acceptable

### Tablet Devices

| Device | OS | Resolution | Status |
|--------|----|-----------:|--------|
| iPad | iOS 16+ | 768x1024 | [ ] Pass |
| iPad Pro | iOS 16+ | 1024x1366 | [ ] Pass |
| Android Tablet | 12+ | 800x1280 | [ ] Pass |

**Test Focus**:
- [ ] Touch interactions work
- [ ] Responsive layout adapts
- [ ] Navigation accessible
- [ ] Forms usable with touch

### Mobile Devices

| Device | OS | Resolution | Status |
|--------|----|-----------:|--------|
| iPhone 13/14 | iOS 16+ | 390x844 | [ ] Pass |
| iPhone SE | iOS 16+ | 375x667 | [ ] Pass |
| Samsung Galaxy | Android 12+ | 360x800 | [ ] Pass |
| Google Pixel | Android 12+ | 393x851 | [ ] Pass |

**Test Focus**:
- [ ] All features accessible on small screens
- [ ] Touch targets large enough (44x44px minimum)
- [ ] No horizontal scrolling
- [ ] Hamburger menu works
- [ ] Forms usable with virtual keyboard

### Orientation Testing

- [ ] Portrait mode functional on mobile/tablet
- [ ] Landscape mode functional on mobile/tablet
- [ ] No content hidden in either orientation
- [ ] Layout adapts appropriately

---

## Regression Testing

### Check Previous Issues

Review recent bug fixes and verify they remain fixed:

- [ ] Review closed GitHub issues from last 2 releases
- [ ] Test each previously reported bug
- [ ] Verify fix still works
- [ ] Document any regressions

### Core Functionality Verification

After any major changes, verify core features still work:

- [ ] Authentication (login/logout)
- [ ] Quiz creation and taking
- [ ] Results calculation
- [ ] Data persistence
- [ ] Admin functions
- [ ] Data export/import

### Edge Cases

- [ ] Empty quiz (0 questions selected) - should show error
- [ ] Very long quiz (100 questions) - should work
- [ ] Special characters in answers - should render correctly
- [ ] Simultaneous quiz sessions (multiple tabs) - should work
- [ ] Slow network connection - should handle gracefully
- [ ] Offline mode - should show appropriate message
- [ ] Session timeout - should redirect to login

---

## Performance Testing

### Lighthouse Audit

**Command**: `npm run build && npm run preview` then run Lighthouse

**Target Scores**:
- [ ] Performance: ≥ 90 (Current: 94)
- [ ] Accessibility: ≥ 90 (Current: 96)
- [ ] Best Practices: ≥ 90 (Current: 100)
- [ ] SEO: ≥ 90 (Current: 92)

### Core Web Vitals

**Using Chrome DevTools or Lighthouse**:
- [ ] Largest Contentful Paint (LCP): < 2.5s (Current: 1.8s)
- [ ] First Input Delay (FID): < 100ms (Current: 45ms)
- [ ] Cumulative Layout Shift (CLS): < 0.1 (Current: 0.05)

### Load Testing

**Manual Load Test**:
- [ ] Open application
- [ ] Measure initial page load time (should be < 3s)
- [ ] Navigate to quiz page
- [ ] Measure time to interactive (should be < 3s)
- [ ] Take quiz with 50 questions
- [ ] No noticeable lag or delays

### Bundle Size

**Check after build**:
- [ ] Main JS bundle: ~635 KB (acceptable)
- [ ] CSS bundle: ~133 KB (acceptable)
- [ ] No unexpected bundle size increases
- [ ] Gzipped sizes reasonable (~179 KB JS, ~21 KB CSS)

---

## Accessibility Testing

### Automated Accessibility Testing

**Tools**: vitest-axe (built into test suite)

- [ ] Run `npm run test:run`
- [ ] All accessibility tests pass
- [ ] No new axe violations introduced

### Keyboard Navigation

**Test without mouse**:
- [ ] Can navigate entire site with Tab key
- [ ] Can activate buttons with Enter/Space
- [ ] Can use arrow keys in lists/menus
- [ ] Focus indicators visible on all interactive elements
- [ ] No keyboard traps
- [ ] Skip to main content link works (Tab from any page)
- [ ] Modal dialogs can be closed with Escape

### Screen Reader Testing

**Test with NVDA (Windows) or VoiceOver (Mac)**:
- [ ] Page structure announced correctly (headings, landmarks)
- [ ] All interactive elements labeled
- [ ] Form inputs have associated labels
- [ ] Buttons describe their action
- [ ] Images have alt text
- [ ] Dynamic content changes announced (aria-live)
- [ ] Error messages announced
- [ ] Quiz progress announced

### Visual Accessibility

- [ ] Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- [ ] Text scales to 200% without breaking layout
- [ ] No information conveyed by color alone
- [ ] Focus indicators clearly visible
- [ ] High contrast mode works (theme switcher)

### Touch Target Size

- [ ] All touch targets ≥ 44x44 pixels (mobile)
- [ ] Adequate spacing between interactive elements
- [ ] Easy to tap buttons on mobile devices

---

## Security Testing

### Authentication & Authorization

- [ ] Cannot access protected routes without login
- [ ] Admin routes require admin role
- [ ] Session expires appropriately
- [ ] Logout clears all auth state
- [ ] Cannot impersonate other users
- [ ] Password not visible in devtools/network

### Data Security

- [ ] User can only access own data
- [ ] Quiz results isolated per user
- [ ] Firestore security rules enforced
- [ ] No sensitive data in browser console
- [ ] No sensitive data in URLs
- [ ] XSS prevention working (input sanitization)

### Dependency Security

**Command**: `npm audit`

- [ ] Run `npm audit`
- [ ] Review all vulnerabilities
- [ ] Verify known issues documented in SECURITY.md
- [ ] No new high/critical vulnerabilities in production dependencies
- [ ] Development-only vulnerabilities acceptable (documented)

### Content Security

- [ ] HTML sanitization working (no script injection)
- [ ] HTTPS enforced (in production)
- [ ] Secure cookies (HTTP-only, SameSite)
- [ ] No inline scripts in production build

---

## Sign-Off

### QA Team Sign-Off

**Tester Name**: _______________________  
**Date**: _______________________  
**Version Tested**: _______________________

**Test Results Summary**:
- Automated Tests: [ ] Pass [ ] Fail
- Manual Tests: [ ] Pass [ ] Fail
- Cross-Device Tests: [ ] Pass [ ] Fail
- Regression Tests: [ ] Pass [ ] Fail
- Performance Tests: [ ] Pass [ ] Fail
- Accessibility Tests: [ ] Pass [ ] Fail
- Security Tests: [ ] Pass [ ] Fail

**Overall Status**: [ ] APPROVED FOR RELEASE [ ] NEEDS FIXES

**Issues Found**:
1. _______________________
2. _______________________
3. _______________________

**Blocker Issues** (must fix before release):
- _______________________

**Non-Blocker Issues** (can fix in patch release):
- _______________________

**Notes**:
_______________________
_______________________

---

## Test Report Template

```markdown
# Test Report - CertLab v2.0.0

**Test Date**: January 15, 2026
**Tester**: [Your Name]
**Environment**: Production build, localhost:5000
**Browsers Tested**: Chrome 120, Firefox 120, Safari 17

## Test Results

### Automated Tests
- **Status**: ✅ PASS
- **Tests Run**: 147
- **Pass**: 147
- **Fail**: 0
- **Coverage**: 78%

### Manual Tests
- **Critical Flows**: ✅ All Pass
- **Admin Functions**: ✅ All Pass
- **Edge Cases**: ✅ All Pass

### Cross-Device Tests
- **Desktop**: ✅ Pass (Chrome, Firefox, Safari)
- **Mobile**: ✅ Pass (iOS, Android)
- **Tablet**: ✅ Pass (iPad)

### Performance
- **Lighthouse Performance**: 94/100 ✅
- **LCP**: 1.8s ✅
- **FID**: 45ms ✅
- **CLS**: 0.05 ✅

### Accessibility
- **WCAG 2.2 AA**: 90% conformance ✅
- **Keyboard Navigation**: ✅ Pass
- **Screen Reader**: ✅ Pass (basic testing)

### Security
- **npm audit**: 6 vulnerabilities (dev-only) ✅
- **Authentication**: ✅ Secure
- **Authorization**: ✅ Enforced

## Issues Found

### Blocker Issues
None

### Non-Blocker Issues
None

## Recommendation
✅ **APPROVED FOR RELEASE**

The application meets all quality standards and is ready for production deployment.
```

---

**Document Version**: 1.0.0  
**Last Updated**: January 15, 2026  
**Next Review**: After each major release
