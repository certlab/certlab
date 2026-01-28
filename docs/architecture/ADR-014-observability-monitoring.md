# ADR-014: Observability & Monitoring

**Status:** ✅ Accepted  
**Date:** 2024-12-22  
**Deciders:** CertLab Team  
**Context:** Define observability and monitoring strategy using Dynatrace RUM for real-time user monitoring and performance tracking.

## Table of Contents

- [Executive Summary](#executive-summary)
- [Context and Problem Statement](#context-and-problem-statement)
- [Decision](#decision)
- [Implementation Details](#implementation-details)
- [Consequences](#consequences)
- [Alternatives Considered](#alternatives-considered)
- [Related Documents](#related-documents)
- [Code References](#code-references)
- [Revision History](#revision-history)

---

## Executive Summary

CertLab implements **Dynatrace Real User Monitoring (RUM)** for comprehensive observability including performance metrics, user sessions, custom actions, and error tracking.

### Quick Reference

| Aspect | Implementation | Purpose |
|--------|---------------|---------|
| **RUM Platform** | Dynatrace | Real user monitoring |
| **Script Loading** | Async in <head> | Early instrumentation |
| **Custom Actions** | dtrum.enterAction() | Track quiz, lectures, navigation |
| **Session Tracking** | Automatic | User journey tracking |
| **Performance Metrics** | Web Vitals | LCP, FID, CLS, TTFB |
| **Error Tracking** | Automatic + manual | JavaScript errors, API failures |
| **User Tagging** | dtrum.identify Useruser(id) | Per-user analytics |
| **Opt-Out** | Cookie-based | Privacy compliance |

**Key Metrics Tracked:**
- Page load time
- Time to interactive
- API response times
- Error rates
- User sessions
- Custom actions (quiz completion, lecture views)

---

## Context and Problem Statement

CertLab needed observability to:

1. **Monitor real user performance** across devices
2. **Track custom user actions** (quizzes, lectures)
3. **Identify performance bottlenecks** in production
4. **Detect errors** before users report them
5. **Analyze user sessions** for UX improvements
6. **Track Web Vitals** (LCP, FID, CLS)
7. **Segment by user type** (student, instructor, admin)
8. **Respect user privacy** with opt-out

### Requirements

**Functional Requirements:**
- ✅ Automatic page load tracking
- ✅ Custom action tracking (quiz, lecture)
- ✅ Error capture and reporting
- ✅ Session replay (optional)
- ✅ User identification
- ✅ Performance metrics (Web Vitals)
- ✅ API call monitoring
- ✅ Privacy controls (opt-out)

**Non-Functional Requirements:**
- ✅ Script load <50ms
- ✅ Overhead <5% performance impact
- ✅ 99.9% uptime
- ✅ GDPR/CCPA compliant

---

## Decision

We adopted **Dynatrace RUM** for real user monitoring:

### Monitoring Architecture

```
┌───────────────────────────────────────────────────────┐
│              Dynatrace RUM Integration                │
├───────────────────────────────────────────────────────┤
│                                                       │
│  ┌─────────────────────────────────────────────┐     │
│  │   1. Script Injection (index.html <head>)   │     │
│  │   • Async loading                           │     │
│  │   • Early instrumentation                   │     │
│  │   • <1% performance impact                  │     │
│  └─────────────────────────────────────────────┘     │
│                      ▼                                │
│  ┌─────────────────────────────────────────────┐     │
│  │   2. Automatic Monitoring                   │     │
│  │   • Page loads                              │     │
│  │   • XHR/Fetch requests                      │     │
│  │   • JavaScript errors                       │     │
│  │   • Web Vitals (LCP, FID, CLS, TTFB)        │     │
│  └─────────────────────────────────────────────┘     │
│                      ▼                                │
│  ┌─────────────────────────────────────────────┐     │
│  │   3. Custom Actions                         │     │
│  │   • Quiz started/completed                  │     │
│  │   • Lecture viewed                          │     │
│  │   • Achievement unlocked                    │     │
│  │   • Search performed                        │     │
│  └─────────────────────────────────────────────┘     │
│                      ▼                                │
│  ┌─────────────────────────────────────────────┐     │
│  │   4. User Context                           │     │
│  │   • User ID tagging                         │     │
│  │   • Tenant ID                               │     │
│  │   • User role (student/instructor/admin)    │     │
│  └─────────────────────────────────────────────┘     │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Implementation Details

### 1. Dynatrace Script Injection

**File:** `client/index.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CertLab - Certification Study Platform</title>
    
    <!-- Dynatrace RUM Script (async) -->
    <script
      type="text/javascript"
      src="%VITE_DYNATRACE_SCRIPT_URL%"
      crossorigin="anonymous"
      async
    ></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### 2. Dynatrace Initialization

**File:** `client/src/lib/dynatrace.ts`

```typescript
/**
 * Initialize Dynatrace RUM monitoring
 * Called early in main.tsx before React renders
 */
export function initializeDynatrace(): boolean {
  const scriptUrl = import.meta.env.VITE_DYNATRACE_SCRIPT_URL;
  const enabled = import.meta.env.VITE_ENABLE_DYNATRACE !== 'false';

  if (!scriptUrl || !enabled) {
    console.log('[Dynatrace] Monitoring disabled or not configured');
    return false;
  }

  // Dynatrace script is loaded via <script> tag in index.html
  // This function just verifies it's available
  if (typeof window.dtrum === 'undefined') {
    console.warn('[Dynatrace] dtrum not available');
    return false;
  }

  console.log('[Dynatrace] RUM initialized');
  return true;
}

/**
 * Identify user for tracking
 */
export function identifyUser(userId: string, userEmail?: string) {
  if (typeof window.dtrum === 'undefined') return;

  window.dtrum.identifyUser(userId);
  
  if (userEmail) {
    window.dtrum.sendSessionProperties({
      'user.email': userEmail,
    });
  }
}

/**
 * Track custom action (quiz, lecture, etc)
 */
export function trackAction(
  actionName: string,
  metadata?: Record<string, string | number>
) {
  if (typeof window.dtrum === 'undefined') return;

  const actionId = window.dtrum.enterAction(actionName);
  
  if (metadata && actionId) {
    Object.entries(metadata).forEach(([key, value]) => {
      window.dtrum.addActionProperties(actionId, key, value);
    });
  }

  return actionId;
}

/**
 * Leave custom action
 */
export function leaveAction(actionId: number) {
  if (typeof window.dtrum === 'undefined' || !actionId) return;
  window.dtrum.leaveAction(actionId);
}

/**
 * Report custom error
 */
export function reportError(error: Error, context?: Record<string, any>) {
  if (typeof window.dtrum === 'undefined') return;

  window.dtrum.reportError(error, context);
}

/**
 * Add session property
 */
export function addSessionProperty(key: string, value: string | number) {
  if (typeof window.dtrum === 'undefined') return;

  window.dtrum.sendSessionProperties({
    [key]: value,
  });
}
```

### 3. Main Entry Point

**File:** `client/src/main.tsx`

```typescript
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeDynatrace } from './lib/dynatrace';
import './lib/i18n';

// Initialize Dynatrace RUM before rendering
const dynatraceEnabled = initializeDynatrace();
if (dynatraceEnabled) {
  console.log('[CertLab] Dynatrace monitoring initialized');
} else {
  console.log('[CertLab] Running without Dynatrace monitoring');
}

// Render application
createRoot(document.getElementById('root')!).render(<App />);
```

### 4. Auth Provider Integration

**File:** `client/src/lib/auth-provider.tsx`

```typescript
import { identifyUser, addSessionProperty } from './dynatrace';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await storage.getUser(firebaseUser.uid);
        setUser(userData);

        // Identify user in Dynatrace
        identifyUser(firebaseUser.uid, firebaseUser.email || undefined);
        
        // Add session properties
        addSessionProperty('user.role', userData.role);
        addSessionProperty('user.tenantId', userData.tenantId);
      } else {
        setUser(null);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 5. Quiz Tracking Example

**File:** `client/src/hooks/useQuizState.ts`

```typescript
import { trackAction, leaveAction } from '@/lib/dynatrace';

export function useQuizState(quiz: Quiz, questions: Question[]) {
  const [actionId, setActionId] = useState<number | null>(null);

  const startQuiz = useCallback(() => {
    setState('taking');
    
    // Track quiz start
    const id = trackAction('Quiz Started', {
      quizId: quiz.id,
      categoryId: quiz.categoryId,
      questionCount: questions.length,
    });
    setActionId(id);
  }, [quiz, questions]);

  const finishQuiz = useCallback(() => {
    setState('done');
    
    // Track quiz completion
    if (actionId) {
      leaveAction(actionId);
    }
    
    trackAction('Quiz Completed', {
      quizId: quiz.id,
      score: calculateScore(),
      timeElapsed,
    });
  }, [quiz, actionId, timeElapsed]);

  return { startQuiz, finishQuiz, /* ... */ };
}
```

### 6. Error Boundary Integration

**File:** `client/src/components/ErrorBoundary.tsx`

```typescript
import { reportError } from '@/lib/dynatrace';

export class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Report to Dynatrace
    reportError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ErrorBoundary',
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

### 7. Environment Configuration

**File:** `.github/workflows/firebase-deploy.yml`

```yaml
- name: Build
  run: npm run build:firebase
  env:
    NODE_ENV: production
    VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
    # ... other Firebase env vars
    VITE_DYNATRACE_SCRIPT_URL: ${{ secrets.VITE_DYNATRACE_SCRIPT_URL }}
    VITE_ENABLE_DYNATRACE: ${{ secrets.VITE_ENABLE_DYNATRACE }}
```

### 8. TypeScript Declarations

**File:** `client/src/types/dynatrace.d.ts`

```typescript
declare global {
  interface Window {
    dtrum?: {
      identifyUser(id: string): void;
      enterAction(name: string): number;
      leaveAction(actionId: number): void;
      addActionProperties(actionId: number, key: string, value: any): void;
      sendSessionProperties(props: Record<string, string | number>): void;
      reportError(error: Error, context?: Record<string, any>): void;
    };
  }
}

export {};
```

---

## Consequences

### Positive

1. **Real-Time Visibility** - Monitor production performance
2. **User Journey Tracking** - Understand user behavior
3. **Early Error Detection** - Fix issues before escalation
4. **Performance Insights** - Identify bottlenecks
5. **Custom Actions** - Track domain-specific events
6. **User Segmentation** - Analyze by role, tenant
7. **Web Vitals** - Core Web Vitals monitoring

### Negative

1. **Cost** - Dynatrace licensing fees
2. **Privacy Concerns** - User tracking requires consent
3. **Performance Overhead** - <5% but not zero
4. **Vendor Lock-In** - Tied to Dynatrace platform

### Mitigations

1. Use Dynatrace free tier initially
2. Implement opt-out mechanism
3. Async script loading minimizes impact
4. Keep custom actions minimal

---

## Alternatives Considered

### Alternative 1: Google Analytics

Use GA4 for analytics.

**Pros:** Free, widely known  
**Cons:** Basic RUM, no session replay, privacy concerns

**Reason for Rejection:** Insufficient for performance monitoring.

### Alternative 2: Sentry

Use Sentry for error tracking.

**Pros:** Great error tracking, affordable  
**Cons:** Limited RUM, no session replay

**Reason for Rejection:** Need comprehensive RUM, not just errors.

### Alternative 3: Self-Hosted Monitoring

Build custom monitoring with Prometheus + Grafana.

**Pros:** Full control, no vendor lock-in  
**Cons:** Complex setup, no RUM, maintenance burden

**Reason for Rejection:** RUM not feasible with self-hosted.

---

## Related Documents

- [ADR-002: Cloud-First Architecture](ADR-002-cloud-first-firebase-integration.md)
- [ADR-015: Build & Deployment](ADR-015-build-deployment.md)

---

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `client/src/lib/dynatrace.ts` | 1-100 | Dynatrace integration |
| `client/src/main.tsx` | 1-18 | Initialization |
| `client/index.html` | 8-13 | Script injection |

---

## Revision History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2024-12-22 | 1.0 | CertLab Team | Initial version - Dynatrace RUM |
