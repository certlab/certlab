# CertLab Accessibility Testing Guide

## Table of Contents

1. [Automated Testing](#automated-testing)
2. [Keyboard Navigation Testing](#keyboard-navigation-testing)
3. [Screen Reader Testing](#screen-reader-testing)
4. [Color Contrast Testing](#color-contrast-testing)
5. [Browser Testing](#browser-testing)
6. [Mobile Accessibility Testing](#mobile-accessibility-testing)
7. [Test Scenarios](#test-scenarios)

---

## Automated Testing

### Tools

#### 1. axe DevTools (Browser Extension)

**Installation:**
- [Chrome Extension](https://chrome.google.com/webstore/detail/axe-devtools-web-accessibility/lhdoppojpmngadmnindnejefpokejbdd)
- [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

**Usage:**
1. Open browser DevTools (F12)
2. Click the "axe DevTools" tab
3. Click "Scan ALL of my page"
4. Review violations, needs review, and passed items
5. Click on issues for detailed information and remediation guidance

#### 2. WAVE (Web Accessibility Evaluation Tool)

**Installation:**
- [Chrome Extension](https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh)
- [Firefox Add-on](https://addons.mozilla.org/en-US/firefox/addon/wave-accessibility-tool/)

**Usage:**
1. Navigate to the page to test
2. Click the WAVE extension icon
3. Review errors, alerts, and features
4. Use the sidebar to toggle overlays and explore issues

#### 3. Lighthouse (Built into Chrome)

**Usage:**
1. Open Chrome DevTools (F12)
2. Click the "Lighthouse" tab
3. Select "Accessibility" category
4. Choose "Desktop" or "Mobile"
5. Click "Analyze page load"
6. Review the accessibility score and detailed report

### Running Automated Tests Locally

```bash
# Run all tests including accessibility
npm run test:run

# Run linting with accessibility checks
npm run lint

# Type check
npm run check
```

---

## Keyboard Navigation Testing

### Basic Keyboard Commands

| Key | Function |
|-----|----------|
| `Tab` | Move to next focusable element |
| `Shift + Tab` | Move to previous focusable element |
| `Enter` | Activate buttons, links, and submit forms |
| `Space` | Activate buttons and toggle checkboxes |
| `Arrow Keys` | Navigate within menus, lists, and radio groups |
| `Escape` | Close modals and menus |
| `Home` | Jump to beginning of list or input |
| `End` | Jump to end of list or input |

### Testing Checklist

#### ✅ Skip Navigation
1. Load any authenticated page
2. Press `Tab` once from the page load
3. **Expected**: "Skip to main content" link appears with visible focus
4. Press `Enter` to activate
5. **Expected**: Focus moves to main content area

#### ✅ Tab Order
1. Press `Tab` repeatedly to move through the page
2. **Expected**: 
   - Logical order (left-to-right, top-to-bottom)
   - No unexpected jumps
   - All interactive elements reachable
   - Visual focus indicator visible on each element

#### ✅ Focus Indicators
1. Navigate through the page with `Tab`
2. **Expected**: 
   - Visible outline or highlight on focused element
   - Minimum 2px border or 1px solid outline
   - Contrasts with background (3:1 ratio)
   - Focus indicator not obscured by other content

#### ✅ Keyboard Traps
1. Navigate to every interactive element
2. Try to navigate away using `Tab` or `Shift + Tab`
3. **Expected**: Can always navigate away from an element

#### ✅ Modals and Dialogs
1. Open a modal/dialog
2. **Expected**: 
   - Focus moves into modal
   - Tab cycles within modal (focus trapped)
   - `Escape` closes modal
   - Focus returns to trigger element after closing

#### ✅ Dropdown Menus
1. Navigate to a menu trigger
2. Press `Enter` or `Space` to open
3. Use `Arrow Keys` to navigate menu items
4. Press `Enter` to select
5. Press `Escape` to close without selecting
6. **Expected**: All actions work as described

### Critical User Flows to Test

#### 1. Login Flow
- [ ] Tab to email/password fields
- [ ] Fill out form using keyboard
- [ ] Tab to submit button
- [ ] Press `Enter` to submit

#### 2. Quiz Taking
- [ ] Navigate to quiz page
- [ ] Select answers using `Tab` and `Space`
- [ ] Submit quiz with `Enter`
- [ ] Review results using keyboard

#### 3. Navigation
- [ ] Open navigation menu
- [ ] Navigate through all menu items
- [ ] Select a menu item with `Enter`
- [ ] Close menu with `Escape`

---

## Screen Reader Testing

### Screen Readers by Platform

| Platform | Screen Reader | Browser |
|----------|---------------|---------|
| Windows | NVDA (Free) | Firefox or Chrome |
| Windows | JAWS | Internet Explorer, Edge, Chrome |
| macOS | VoiceOver (Built-in) | Safari |
| iOS | VoiceOver (Built-in) | Safari |
| Android | TalkBack (Built-in) | Chrome |

### NVDA (Windows) - Recommended for Testing

#### Installation
1. Download from [nvaccess.org](https://www.nvaccess.org/download/)
2. Install and restart computer
3. NVDA will start automatically

#### Basic Commands

| Key | Function |
|-----|----------|
| `NVDA + Q` | Quit NVDA |
| `NVDA + N` | Open NVDA menu |
| `NVDA + S` | Toggle speech mode |
| `Insert` | NVDA modifier key (also `CapsLock` if configured) |
| `NVDA + T` | Read title |
| `NVDA + B` | Read status bar |
| `NVDA + Down Arrow` | Say all (read from current position) |
| `Control` | Stop reading |

#### Navigation Commands

| Key | Function |
|-----|----------|
| `H` | Next heading |
| `Shift + H` | Previous heading |
| `1-6` | Headings by level (H1, H2, etc.) |
| `L` | Next list |
| `I` | Next list item |
| `F` | Next form field |
| `B` | Next button |
| `K` | Next link |
| `D` | Next landmark |
| `E` | Next edit field |

### VoiceOver (macOS/iOS)

#### Enabling VoiceOver (macOS)
- Press `Command + F5` to toggle
- Or System Preferences > Accessibility > VoiceOver > Enable

#### Basic Commands (macOS)

| Key | Function |
|-----|----------|
| `VO` | `Control + Option` (VoiceOver modifier) |
| `VO + A` | Start reading |
| `Control` | Stop reading |
| `VO + Right/Left Arrow` | Move to next/previous item |
| `VO + Space` | Activate item |
| `VO + U` | Open rotor (navigation menu) |
| `VO + Command + H` | Next heading |
| `VO + Command + L` | Next link |
| `VO + Command + G` | Next graphic |
| `VO + Command + X` | Next list |

#### iOS VoiceOver Gestures

| Gesture | Function |
|---------|----------|
| Swipe right | Next item |
| Swipe left | Previous item |
| Double tap | Activate item |
| Two-finger swipe up | Read from top |
| Two-finger swipe down | Read from current position |
| Rotor (two fingers, circular motion) | Change navigation mode |
| Three-finger swipe left/right | Scroll |

### Testing Checklist with Screen Readers

#### ✅ Page Structure
- [ ] Page title is announced
- [ ] Headings are announced with correct level
- [ ] Landmarks are properly identified (navigation, main, complementary)
- [ ] Lists are identified as lists

#### ✅ Interactive Elements
- [ ] Buttons are identified as buttons with clear labels
- [ ] Links are identified as links with descriptive text
- [ ] Form inputs have associated labels
- [ ] Form errors are announced
- [ ] Current state announced (checked, expanded, selected)

#### ✅ Dynamic Content
- [ ] Loading states announced
- [ ] Success/error messages announced
- [ ] Content changes announced (via aria-live)
- [ ] Modal opening/closing announced

#### ✅ Images and Media
- [ ] Informative images have descriptive alt text
- [ ] Decorative images ignored or marked as decorative
- [ ] Icons have accessible names
- [ ] Videos have captions

### Critical Flows with Screen Reader

#### 1. Landing Page
```
Expected Announcements:
- "CertLab - Certification Learning Platform"
- "main navigation"
- "heading level 1, Welcome to CertLab"
- Interactive elements announced with role and state
```

#### 2. Login Flow
```
Expected Announcements:
- "Email, edit text"
- "Password, edit text, secure"
- "Sign In, button"
- Error messages when validation fails
```

#### 3. Quiz Taking
```
Expected Announcements:
- "Question 1 of 10"
- Question text read
- Answer options with radio button role
- "Submit Quiz, button"
- "Results" page with score announcement
```

---

## Color Contrast Testing

### Built-in Contrast Analyzer

CertLab includes a contrast analyzer:

1. Sign in as admin
2. Navigate to "Accessibility Tools"
3. View contrast ratios for current theme
4. **Expected**: All ratios meet WCAG AA (4.5:1 for normal text, 3:1 for large text)

### Browser-based Tools

#### Chrome DevTools
1. Inspect an element (right-click > Inspect)
2. In the Styles panel, click the color swatch
3. Color picker shows contrast ratio
4. Green checkmark if passes WCAG AA

#### Color Contrast Analyzer (Standalone)
- Download: [TPGi Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)
- Usage:
  1. Use eyedropper to select foreground color
  2. Use eyedropper to select background color
  3. View contrast ratio and pass/fail for WCAG AA/AAA

### Manual Testing Checklist

#### ✅ Text Contrast
- [ ] Body text: 4.5:1 minimum
- [ ] Large text (18pt+ or 14pt+ bold): 3:1 minimum
- [ ] Link text: 4.5:1 minimum (distinguishable from surrounding text)

#### ✅ UI Component Contrast
- [ ] Button borders: 3:1 minimum
- [ ] Input borders: 3:1 minimum
- [ ] Focus indicators: 3:1 minimum
- [ ] Active/selected states: 3:1 minimum

#### ✅ Graphics and Icons
- [ ] Meaningful graphics: 3:1 minimum
- [ ] Icons with information: 3:1 minimum

---

## Browser Testing

### Supported Browsers

Test in each of these browsers:

- **Chrome** (latest 2 versions)
- **Firefox** (latest 2 versions)
- **Safari** (latest 2 versions on macOS)
- **Edge** (latest 2 versions)

### Testing Checklist

For each browser:

#### ✅ Basic Functionality
- [ ] Page loads correctly
- [ ] All interactive elements work
- [ ] Keyboard navigation works
- [ ] Forms submit correctly

#### ✅ Accessibility Features
- [ ] Focus indicators visible
- [ ] Skip link works
- [ ] ARIA attributes recognized
- [ ] Screen reader compatible

---

## Mobile Accessibility Testing

### iOS Testing with VoiceOver

1. Enable VoiceOver: Settings > Accessibility > VoiceOver
2. Navigate to CertLab in Safari
3. Test gestures:
   - Swipe right/left to navigate
   - Double-tap to activate
   - Rotor to change navigation mode

### Android Testing with TalkBack

1. Enable TalkBack: Settings > Accessibility > TalkBack
2. Navigate to CertLab in Chrome
3. Test gestures:
   - Swipe right/left to navigate
   - Double-tap to activate
   - TalkBack menu for navigation options

### Mobile Testing Checklist

#### ✅ Touch Target Size
- [ ] All buttons minimum 44x44 CSS pixels (iOS guideline)
- [ ] All buttons minimum 48x48 DP (Android guideline)
- [ ] Adequate spacing between targets

#### ✅ Mobile Screen Reader
- [ ] All content announced
- [ ] Gestures work properly
- [ ] Focus order logical
- [ ] Form inputs accessible

#### ✅ Responsive Design
- [ ] Content reflows properly
- [ ] No horizontal scrolling required
- [ ] All functionality accessible on mobile
- [ ] Text readable without zooming

---

## Test Scenarios

### Scenario 1: New User Registration and First Quiz

**Goal**: Ensure a new user can register and complete their first quiz using only keyboard and/or screen reader.

**Steps**:
1. Navigate to landing page
2. Tab to "Sign In" button
3. Tab through login form
4. Complete registration
5. Navigate dashboard
6. Start a quiz
7. Answer questions
8. Submit quiz
9. Review results

**Success Criteria**:
- All steps completable with keyboard only
- Screen reader announces all relevant information
- Focus indicators visible throughout
- No keyboard traps encountered

### Scenario 2: Navigating the Dashboard

**Goal**: Test navigation and accessibility of the main dashboard.

**Steps**:
1. Sign in
2. Use skip link to bypass navigation
3. Navigate through dashboard cards
4. Access user menu
5. Change theme
6. Navigate to different sections

**Success Criteria**:
- Skip link works correctly
- All dashboard elements accessible
- User menu fully keyboard accessible
- Theme changes don't break accessibility

### Scenario 3: Taking a Practice Test

**Goal**: Complete a full practice test flow accessibly.

**Steps**:
1. Navigate to Practice Tests
2. Select a test
3. Start test
4. Answer multiple questions
5. Navigate between questions
6. Submit test
7. Review detailed results

**Success Criteria**:
- Question navigation intuitive
- Timer announced periodically
- Answer selection clear
- Results announced comprehensively

### Scenario 4: Accessing Study Materials

**Goal**: Navigate and use study materials accessibly.

**Steps**:
1. Navigate to study materials
2. Browse categories
3. Open a lecture
4. Navigate through content
5. Take notes
6. Complete lecture

**Success Criteria**:
- Content structure clear
- Rich media accessible
- Note-taking functionality accessible
- Progress tracked and announced

---

## Reporting Accessibility Issues

When you find an accessibility issue, report it with:

### Issue Template

```markdown
## Accessibility Issue Report

**Page/Feature**: [e.g., Login Page]
**Issue Type**: [e.g., Keyboard Navigation, Screen Reader, Color Contrast]
**Severity**: [Critical, High, Medium, Low]

**Description**:
[Clear description of the issue]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happens]

**Testing Environment**:
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]
- Assistive Technology: [e.g., NVDA 2023.1, if applicable]
- Screen Size: [e.g., 1920x1080]

**Screenshots/Videos**:
[If applicable]

**WCAG Success Criterion**:
[e.g., 2.1.1 Keyboard, 1.4.3 Contrast (Minimum)]

**Suggested Fix**:
[If you have suggestions]
```

---

## Quick Reference: WCAG 2.2 AA Requirements

### Level A (Must Have)

- **Perceivable**: Alt text, captions, semantic structure
- **Operable**: Keyboard access, no keyboard traps, skip links
- **Understandable**: Clear language, predictable behavior, error identification
- **Robust**: Valid HTML, proper ARIA

### Level AA (Should Have)

- **Color contrast**: 4.5:1 normal text, 3:1 large text
- **Resize text**: Up to 200% without loss
- **Multiple navigation**: More than one way to find pages
- **Headings and labels**: Descriptive
- **Focus visible**: Clear focus indicators
- **Error prevention**: Confirmations for critical actions

---

## Additional Resources

- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Deque University](https://dequeuniversity.com/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

---

**Last Updated**: January 10, 2026
