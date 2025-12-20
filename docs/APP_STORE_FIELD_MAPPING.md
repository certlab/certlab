# App Store Connect Field Mapping

This document provides a direct mapping between the screenshot fields and the content to fill in.

## Screenshot Field Reference

Based on the App Store Connect screenshot for iOS App Version 1.0, here are the exact values for each field:

---

## 📝 Field-by-Field Instructions

### 1. **Promotional Text** (170 character limit)

**Paste this:**
```
Master CISSP, CISM, and other certifications with adaptive quizzes, achievement tracking, and offline study capabilities. Your pocket certification coach!
```

**Character count:** 154/170 ✅

**What it is:** This appears on your product page when users install your app. It's the first text they see.

---

### 2. **Description** (4,000 character limit)

**Paste this:**
```
CertLab is your comprehensive certification study companion, designed to help you master professional certifications like CISSP, CISM, and more. Whether you're preparing for your first certification or adding to your credentials, CertLab provides an engaging, adaptive learning experience that fits your schedule.

KEY FEATURES

• Adaptive Learning System - Quiz difficulty automatically adjusts to your performance level, ensuring you're always challenged but never overwhelmed

• Comprehensive Question Bank - Hundreds of carefully curated questions covering all certification domains and topics

• Multiple Study Modes:
  - Study Mode: See correct answers immediately to reinforce learning
  - Quiz Mode: Full test experience with final scoring
  - Adaptive Mode: Dynamic difficulty adjustment based on your performance

• Achievement System - Earn badges and track your progress with a comprehensive gamification system that keeps you motivated

• Practice Tests - Full-length certification practice exams that simulate the real testing experience

• Progress Tracking - Detailed analytics showing your mastery scores, strengths, and areas for improvement across all topics

• Daily Challenges - Quick challenges to maintain your study streak and reinforce key concepts

• Study Groups - Join or create study groups focused on specific certifications to stay motivated

• Offline Capability - Study anywhere, anytime without requiring an internet connection

• Multiple Themes - Choose from seven beautiful themes including dark mode for comfortable studying in any lighting

• Data Export/Import - Back up your progress and transfer it between devices

CERTIFICATIONS SUPPORTED

CertLab currently includes question banks for:
- CISSP (Certified Information Systems Security Professional)
- CISM (Certified Information Security Manager)
- Additional certifications coming soon

PERFECT FOR

• Security professionals preparing for CISSP or CISM certification
• Students studying information security and risk management
• Career changers entering the cybersecurity field
• Professionals maintaining their certification with continuing education

WHY CERTLAB?

Privacy First: Your study data stays on your device. No tracking, no data sharing.

Smart Learning: Our adaptive algorithm ensures efficient studying by focusing on areas where you need the most practice.

Proven Methods: Based on proven learning techniques including spaced repetition and active recall.

Completely Free: No subscriptions, no in-app purchases. Full access to all features.

STUDY ANYWHERE

With offline support, you can study during your commute, on flights, or anywhere without worrying about internet connectivity. Your progress syncs seamlessly when you're back online.

Start your certification journey today with CertLab - your path to professional success!

DISCLAIMER: CertLab is an independent study tool and is not affiliated with, endorsed by, or sponsored by (ISC)², ISACA, or any other certification body. CISSP is a registered trademark of (ISC)². CISM is a registered trademark of ISACA.
```

**Character count:** 2,809/4,000 ✅

**What it is:** Full app description visible on the App Store product page.

---

### 3. **Keywords** (100 character limit, comma-separated)

**Paste this:**
```
CISSP,CISM,certification,security,study,exam prep,quiz,cybersecurity,learning,practice test
```

**Character count:** 91/100 ✅

**What it is:** Search keywords help users find your app. Not visible to users.

**Important:** No spaces after commas in App Store Connect's keyword field.

---

### 4. **Support URL** (Required)

**Paste this:**
```
https://github.com/archubbuck/certlab/issues
```

**What it is:** Where users can get help or report issues. Must be a valid URL.

**Alternative option:**
```
https://archubbuck.github.io/certlab
```

---

### 5. **Marketing URL** (Optional)

**Paste this:**
```
https://github.com/archubbuck/certlab
```

**What it is:** Your app's marketing website. This is optional but recommended.

**Alternative option:**
```
https://archubbuck.github.io/certlab
```

---

### 6. **Version** (Already filled as "1.0")

**Value:** `1.0`

**What it is:** App version number. This should already be set based on your Xcode project.

---

### 7. **Copyright** (Required)

**Paste this (Option 1 - Recommended):**
```
© 2024 CertLab. All rights reserved.
```

**Alternative Option 2:**
```
Copyright © 2024 archubbuck
```

**Alternative Option 3:**
```
© 2024 CertLab - MIT Licensed
```

**What it is:** Copyright notice displayed on the App Store.

---

### 8. **Routing App Coverage File** (Optional)

**Action:** Leave empty / Do not upload

**What it is:** Only for navigation apps that provide route coverage. Not applicable to CertLab.

---

## 📋 Quick Checklist

Use this checklist while filling out App Store Connect:

- [ ] **Promotional Text** - Copied and pasted (157 chars)
- [ ] **Description** - Copied and pasted (2,809 chars)
- [ ] **Keywords** - Copied and pasted (98 chars, no spaces after commas)
- [ ] **Support URL** - Entered: https://github.com/archubbuck/certlab/issues
- [ ] **Marketing URL** - Entered: https://github.com/archubbuck/certlab
- [ ] **Version** - Confirmed as 1.0
- [ ] **Copyright** - Entered: © 2024 CertLab. All rights reserved.
- [ ] **Routing Coverage File** - Left empty (not applicable)

---

## 💡 Additional Steps Not in Screenshot

After filling these fields, you'll also need:

### Screenshots (Required)
- Take screenshots on actual iOS devices or simulators
- Required sizes: 6.7", 6.5", 5.5" displays
- Minimum 1 screenshot per size, maximum 10

### App Icon (Required)
- 1024x1024 pixels
- No transparency
- No rounded corners (Apple adds them)

### Build (Required)
- Upload app binary via Xcode or Transporter
- Must pass validation

### Privacy Information (Required)
- Data collection practices
- For CertLab: Select "No, we do not collect data"

### Review Information (Required)
- Contact information for App Review team
- Demo account (not needed for CertLab)
- Notes about testing the app

---

## 🎯 How to Test Your Entries

Before submitting:

1. **Character Counts**: Verify all text fits within limits
2. **URLs**: Click each URL to ensure they work
3. **Spelling**: Run spell-check on all text
4. **Trademarks**: Ensure trademark disclaimers are included
5. **Accuracy**: Verify features described match what's in the app

---

## 📞 Support & Questions

- **GitHub Issues**: https://github.com/archubbuck/certlab/issues
- **Documentation**: See `/docs/APP_STORE_METADATA.md` for full details
- **Quick Copy**: See `/docs/APP_STORE_QUICK_COPY.txt` for easy copy/paste

---

**Last Updated:** December 20, 2024
