# Dynatrace Observability Setup Guide

This guide provides comprehensive instructions for configuring Dynatrace observability for CertLab, including setup, configuration, monitoring dashboards, and alerting rules.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Configuration](#configuration)
- [Integration](#integration)
- [Monitoring Dashboards](#monitoring-dashboards)
- [Alerting Configuration](#alerting-configuration)
- [Custom Metrics](#custom-metrics)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

CertLab uses Dynatrace Real User Monitoring (RUM) for comprehensive observability of the client-side application. Dynatrace provides:

- **Real User Monitoring**: Track actual user sessions, page loads, and interactions
- **Performance Metrics**: Monitor page load times, resource loading, and JavaScript execution
- **Error Tracking**: Automatically capture JavaScript errors and exceptions
- **User Journey Analytics**: Understand user flows and identify drop-off points
- **Custom Action Tracking**: Monitor business-critical actions (quiz completion, badge earning, etc.)
- **Session Replay**: Replay user sessions to debug issues
- **Distributed Tracing**: (Future) Connect frontend to backend services

### Architecture Integration

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              CertLab React Application                 │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │            Dynatrace RUM Agent                   │  │  │
│  │  │  - Automatic page tracking                       │  │  │
│  │  │  - User action monitoring                        │  │  │
│  │  │  - Error capture                                 │  │  │
│  │  │  - Performance metrics                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ HTTPS                            │
│                           ▼                                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
                            ▼
      ┌─────────────────────────────────────────┐
      │       Dynatrace Environment              │
      │  - Data collection                       │
      │  - Analytics processing                  │
      │  - Alerting engine                       │
      │  - Dashboard rendering                   │
      └─────────────────────────────────────────┘
```

## Prerequisites

1. **Dynatrace Account**: Sign up for a free trial at https://www.dynatrace.com/trial
2. **Environment Access**: You'll need Admin or Developer access to your Dynatrace environment
3. **Application Deployment**: CertLab should be deployed to a publicly accessible URL (Firebase Hosting, etc.)

## Initial Setup

### Step 1: Create Dynatrace Account

1. Visit https://www.dynatrace.com/trial
2. Sign up for a free 15-day trial (no credit card required)
3. Choose a region closest to your users (US, EU, or APAC)
4. Complete the registration process

### Step 2: Create Web Application in Dynatrace

1. Log in to your Dynatrace environment: `https://{environmentId}.live.dynatrace.com`
2. Navigate to **Deploy Dynatrace** → **Start monitoring** → **Web and mobile monitoring**
3. Click **Create web application**
4. Configure the application:
   - **Name**: `CertLab` (or your preferred name)
   - **Application type**: Single-page application
   - **Framework**: React
5. Click **Save and continue**

### Step 3: Get Configuration Values

After creating the application, Dynatrace will show you the monitoring code snippet. You need to extract these values:

1. **Environment ID**: Found in your Dynatrace URL
   - Example: `abc12345` from `https://abc12345.live.dynatrace.com`

2. **Application ID**: Found in the JavaScript snippet
   - Look for: `src="https://...jstag/{YOUR_APP_ID}"`
   - Example: `APPLICATION-123ABC456DEF`

3. **Beacon URL**: The base URL for data collection
   - Format: `https://{environmentId}.live.dynatrace.com/bf`
   - Example: `https://abc12345.live.dynatrace.com/bf`

### Step 4: Configure Domain Settings

1. In Dynatrace, go to **Applications & Microservices** → **Web applications** → **CertLab**
2. Click **Browse [...] → Edit**
3. Under **Setup** → **Data capture and JavaScript injection**, add your domains:
   - Development: `localhost:5000`
   - Production: Your Firebase Hosting domain (e.g., `your-project.web.app`)
4. Click **Save changes**

## Configuration

### Environment Variables

Add the following to your `.env` file (copy from `.env.example`):

```bash
# Dynatrace Configuration
VITE_DYNATRACE_ENVIRONMENT_ID=abc12345
VITE_DYNATRACE_APPLICATION_ID=APPLICATION-123ABC456DEF
VITE_DYNATRACE_BEACON_URL=https://abc12345.live.dynatrace.com/bf

# Optional: Enable/disable Dynatrace
VITE_ENABLE_DYNATRACE=true

# Optional: Enable in development (false by default to avoid polluting production metrics)
VITE_DYNATRACE_DEV_MODE=false

# Optional: Customize application name
VITE_DYNATRACE_APP_NAME=CertLab

# Optional: Add prefix to custom actions (useful for multi-environment tracking)
VITE_DYNATRACE_ACTION_PREFIX=
```

### GitHub Actions Configuration

For production deployment via GitHub Actions, add these secrets to your repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following repository secrets:
   - `VITE_DYNATRACE_ENVIRONMENT_ID`
   - `VITE_DYNATRACE_APPLICATION_ID`
   - `VITE_DYNATRACE_BEACON_URL`
   - `VITE_ENABLE_DYNATRACE` (set to `true`)

The deployment workflow (`.github/workflows/firebase-deploy.yml`) will automatically include these during the build.

## Integration

### Automatic Integration

The Dynatrace integration is automatically enabled when you configure the environment variables. The application will:

1. Load the Dynatrace RUM script from `index.html`
2. Initialize Dynatrace on application startup (`main.tsx`)
3. Track user sessions when users log in (`auth-provider.tsx`)
4. End sessions on user logout

### Manual Script Injection

To add the Dynatrace monitoring snippet to `index.html`:

1. Generate the snippet:
   ```bash
   node scripts/generate-dynatrace-snippet.js
   ```

2. Copy the generated snippet from `dynatrace-snippet.html`

3. Paste it into `client/index.html` in the `<head>` section (replace the placeholder comment)

4. Verify the script is loading by:
   ```bash
   npm run build
   npm run preview
   # Open browser DevTools → Network tab
   # Look for requests to your Dynatrace beacon URL
   ```

### Custom Action Tracking

The application automatically tracks these custom actions:

- **User Authentication**: Login, logout, registration
- **Quiz Actions**: Quiz start, question answer, quiz completion
- **Badge Earning**: When users earn achievements
- **Study Group Actions**: Join/leave study groups
- **Practice Test Actions**: Start, complete practice tests

To add custom tracking to your code:

```typescript
import { trackAction, completeAction, trackAsyncAction } from '@/lib/dynatrace';

// Manual tracking
const actionId = trackAction('Custom Action Name');
try {
  // ... your code ...
} finally {
  completeAction(actionId);
}

// Automatic tracking with async function
await trackAsyncAction('Save User Data', async () => {
  return await saveUserData(data);
});
```

## Monitoring Dashboards

### Pre-configured Dashboards

Dynatrace automatically creates these dashboards when you set up web monitoring:

1. **Overview Dashboard**
   - Access: **Applications & Microservices** → **Web applications** → **CertLab**
   - Metrics: User sessions, page views, JavaScript errors, response times

2. **Performance Dashboard**
   - Access: Same as above → **Performance analysis** tab
   - Metrics: Load times, resource loading, JavaScript execution

3. **User Behavior Dashboard**
   - Access: Same as above → **User behavior** tab
   - Metrics: User journeys, conversion funnels, session replay

### Custom Dashboard Configuration

#### 1. CertLab Core Metrics Dashboard

Create a custom dashboard for CertLab-specific metrics:

1. In Dynatrace, go to **Dashboards** → **Create dashboard**
2. Name it: `CertLab - Core Metrics`
3. Add these tiles:

**User Engagement Tile**
- Type: Single-value
- Metric: User sessions
- Filter: Application = CertLab
- Time frame: Last 24 hours

**Quiz Completion Rate**
- Type: Single-value
- Metric: Custom actions (Quiz Completed) / Custom actions (Quiz Started)
- Formula: Success rate percentage
- Time frame: Last 7 days

**Page Load Performance**
- Type: Line chart
- Metric: Page load time (median, 75th percentile, 95th percentile)
- Time frame: Last 24 hours

**JavaScript Error Rate**
- Type: Single-value
- Metric: JavaScript errors per 1000 user sessions
- Threshold: > 10 (warning), > 50 (critical)
- Time frame: Last 24 hours

**Top Pages by Traffic**
- Type: Top list
- Metric: User actions grouped by page name
- Limit: Top 10
- Time frame: Last 24 hours

#### 2. CertLab User Journey Dashboard

Track key user journeys:

1. Create dashboard: `CertLab - User Journeys`
2. Add funnel analysis:
   - Landing page → Registration → First quiz → Quiz completion
3. Add conversion metrics for each step

### Dashboard Access

Share dashboards with your team:

1. Open the dashboard
2. Click **Share** → **Generate link**
3. Choose access level (Public, All users in environment, Specific users)
4. Copy and share the link

## Alerting Configuration

### Recommended Alerts

Configure these alerts for proactive monitoring:

#### 1. High JavaScript Error Rate

**Purpose**: Detect when error rate spikes, indicating a potential bug

**Configuration**:
```yaml
Alert Name: CertLab - High JavaScript Error Rate
Severity: Warning
Condition: JavaScript errors > 10 per 1000 user sessions
Time window: 5 minutes
Notification: Email, Slack
```

**Setup Steps**:
1. Go to **Settings** → **Anomaly detection** → **Custom events for alerting**
2. Click **Create custom event for alerting**
3. Select **Web application** → **CertLab**
4. Configure:
   - Metric: JavaScript errors
   - Threshold: Static > 10 per 1000 sessions
   - Duration: 5 minutes
   - Severity: Warning
5. Add notification channels

#### 2. Slow Page Load Times

**Purpose**: Alert when page load performance degrades

**Configuration**:
```yaml
Alert Name: CertLab - Slow Page Loads
Severity: Warning
Condition: Median load time > 3 seconds
Time window: 10 minutes
Notification: Email, Slack
```

**Setup Steps**:
1. Go to **Settings** → **Anomaly detection** → **Web application**
2. Select **CertLab**
3. Under **Performance thresholds**, set:
   - Load time threshold: 3000ms (median)
   - Alert if threshold exceeded for: 10 minutes
4. Enable alert and configure notifications

#### 3. Drop in User Sessions

**Purpose**: Detect if the application becomes unavailable or users stop accessing it

**Configuration**:
```yaml
Alert Name: CertLab - Low User Activity
Severity: Error
Condition: User sessions < 10 in last hour (during business hours)
Time window: 1 hour
Notification: Email, Slack, PagerDuty
```

**Setup Steps**:
1. Go to **Settings** → **Anomaly detection** → **Custom events for alerting**
2. Create custom event:
   - Metric: User sessions
   - Condition: < 10 sessions
   - Time window: Last hour
   - Only during business hours: 8 AM - 8 PM
3. Set severity to Error
4. Configure escalation channels

#### 4. High Quiz Failure Rate

**Purpose**: Track if users are experiencing unusual difficulty with quizzes

**Configuration**:
```yaml
Alert Name: CertLab - High Quiz Failure Rate
Severity: Warning
Condition: Quiz completion rate < 70%
Time window: 1 day
Notification: Email
```

**Setup Steps**:
1. Create calculated metric:
   - Name: Quiz Success Rate
   - Formula: (Quiz Completed / Quiz Started) * 100
2. Create custom event:
   - Metric: Quiz Success Rate
   - Condition: < 70
   - Time window: Last 24 hours
3. Configure notification

### Notification Channels

Configure notification channels:

1. **Email Notifications**:
   - Go to **Settings** → **Integration** → **Problem notifications** → **Email**
   - Add recipient email addresses
   - Configure notification content

2. **Slack Integration**:
   - Go to **Settings** → **Integration** → **Problem notifications** → **Slack**
   - Click **Connect new instance**
   - Authorize Dynatrace in Slack
   - Select channel (e.g., `#certlab-alerts`)
   - Save configuration

3. **PagerDuty Integration** (Optional, for critical alerts):
   - Go to **Settings** → **Integration** → **Problem notifications** → **PagerDuty**
   - Enter PagerDuty integration key
   - Configure escalation rules

### Alert Thresholds

Recommended thresholds for CertLab:

| Metric | Warning | Critical | Notes |
|--------|---------|----------|-------|
| JavaScript Error Rate | > 10/1000 sessions | > 50/1000 sessions | Indicates code issues |
| Page Load Time (median) | > 3s | > 5s | Affects user experience |
| Page Load Time (95th percentile) | > 5s | > 10s | Tail latency monitoring |
| User Sessions (hourly) | < 10 | < 5 | During business hours only |
| Quiz Success Rate | < 70% | < 50% | May indicate broken quizzes |
| API Error Rate | > 5% | > 10% | When Firebase backend is used |

## Custom Metrics

### Available Custom Actions

CertLab tracks these custom actions automatically:

| Action Name | Description | Tracked At |
|-------------|-------------|------------|
| `User Login` | User successfully logs in | `auth-provider.tsx` |
| `User Logout` | User logs out | `auth-provider.tsx` |
| `User Registration` | New user signs up | Registration flow |
| `Quiz Started` | User begins a quiz | Quiz interface |
| `Quiz Completed` | User finishes a quiz | Quiz results |
| `Badge Earned` | User earns an achievement | Badge system |
| `Study Group Joined` | User joins a study group | Study groups |
| `Practice Test Started` | User begins practice test | Practice tests |
| `Practice Test Completed` | User finishes practice test | Practice results |

### Adding New Custom Metrics

To add a new custom metric:

1. Import the Dynatrace tracking functions:
```typescript
import { trackAction, completeAction } from '@/lib/dynatrace';
```

2. Track the action:
```typescript
const actionId = trackAction('Action Name', 'custom');
try {
  // ... perform action ...
} finally {
  completeAction(actionId);
}
```

3. Verify in Dynatrace:
   - Go to **Applications & Microservices** → **CertLab**
   - Navigate to **Multidimensional analysis**
   - Filter by action name

### Session Attributes

The following user attributes are automatically tracked:

- **User ID**: Anonymized user identifier (set on login)
- **Session Duration**: Automatically tracked
- **Browser**: User's browser type and version
- **Device**: Desktop/Mobile/Tablet
- **OS**: Operating system
- **Geographic Location**: User's country/region

## Best Practices

### 1. Privacy and GDPR Compliance

**User ID Handling**:
- ✅ Use anonymized user IDs (numeric IDs, UUIDs)
- ❌ Do NOT send email addresses, names, or PII
- ✅ CertLab automatically uses database ID (safe)

**Data Masking**:
- Configure data privacy settings in Dynatrace
- Mask sensitive form fields (passwords, credit cards)
- Disable session replay for sensitive pages if needed

### 2. Performance Impact

**Minimize Overhead**:
- Dynatrace RUM script loads asynchronously (non-blocking)
- Typical overhead: < 1% of page load time
- Data is sent in batches to minimize requests

**Development vs Production**:
- Disable Dynatrace in development (`VITE_DYNATRACE_DEV_MODE=false`)
- Prevents pollution of production metrics
- Enable only when testing Dynatrace integration

### 3. Custom Action Best Practices

**Naming Convention**:
```typescript
// Good: Clear, specific names
trackAction('Quiz Completed - CISSP');
trackAction('Badge Earned - First Quiz Master');

// Bad: Vague names
trackAction('Action');
trackAction('Event1');
```

**Action Granularity**:
- Track business-critical actions only
- Too many custom actions can clutter analytics
- Focus on user journey milestones

**Error Handling**:
```typescript
// Always wrap custom actions with try-finally
const actionId = trackAction('Critical Action');
try {
  await performCriticalAction();
} catch (error) {
  reportError(error, actionId);
  throw error;
} finally {
  completeAction(actionId);
}
```

### 4. Dashboard Organization

**Recommended Dashboard Structure**:
1. **Executive Dashboard**: High-level KPIs, user growth, overall health
2. **Operations Dashboard**: Error rates, performance metrics, availability
3. **Product Dashboard**: Feature usage, user journeys, conversion funnels
4. **DevOps Dashboard**: Deployment impact, release comparison

## Troubleshooting

### Dynatrace Not Loading

**Symptoms**: No data appearing in Dynatrace dashboard

**Solutions**:
1. Check browser console for errors
2. Verify Dynatrace script is loaded:
   ```javascript
   console.log(window.dtrum); // Should not be undefined
   ```
3. Check environment variables are set:
   ```bash
   echo $VITE_DYNATRACE_ENVIRONMENT_ID
   ```
4. Verify domain is whitelisted in Dynatrace settings
5. Check if ad blockers are interfering

### Missing Custom Actions

**Symptoms**: Custom actions not appearing in Dynatrace

**Solutions**:
1. Verify `initializeDynatrace()` was called
2. Check that action is actually triggered:
   ```typescript
   console.log('Tracking action:', actionName);
   const actionId = trackAction(actionName);
   console.log('Action ID:', actionId);
   ```
3. Wait 2-5 minutes for data to appear (Dynatrace has processing delay)
4. Check filters in Dynatrace console

### High Error Rates

**Symptoms**: Alerts firing for JavaScript errors

**Investigation Steps**:
1. Go to **Applications & Microservices** → **CertLab** → **Errors**
2. Review error messages and stack traces
3. Check browser/OS distribution (might be browser-specific bug)
4. Review recent deployments (may have introduced bug)
5. Use Session Replay to see what user was doing

**Resolution**:
1. Fix the identified bug
2. Deploy fix
3. Monitor error rate for 24 hours
4. Consider adjusting thresholds if false positives

### Performance Degradation

**Symptoms**: Slow page load alert firing

**Investigation Steps**:
1. Go to **Performance analysis** tab
2. Check waterfall charts for slow resources
3. Identify bottlenecks:
   - Slow API calls
   - Large JavaScript bundles
   - Slow third-party scripts
   - Network latency
4. Compare with historical data

**Resolution**:
1. Optimize identified resources
2. Consider code splitting, lazy loading
3. Optimize images and assets
4. Use CDN for static assets

### Data Not Updating

**Symptoms**: Dashboard shows old data

**Solutions**:
1. Check time range selector (default might be too old)
2. Refresh the dashboard (F5 or refresh button)
3. Verify application is receiving traffic
4. Check Dynatrace service status: https://status.dynatrace.com/

## Advanced Configuration

### Multi-Environment Tracking

To distinguish between environments (dev, staging, prod):

1. Use action prefix:
   ```bash
   # .env.production
   VITE_DYNATRACE_ACTION_PREFIX=prod:
   
   # .env.staging
   VITE_DYNATRACE_ACTION_PREFIX=staging:
   ```

2. Create separate applications in Dynatrace for each environment

3. Use tags to filter dashboards by environment

### Session Replay Configuration

To enable session replay:

1. Go to **Applications & Microservices** → **CertLab** → **Browse [...] → Edit**
2. Navigate to **Session Replay and behavior**
3. Enable **Session Replay**
4. Configure:
   - Sample rate: 10% (adjust based on traffic)
   - Mask sensitive data: Enable
   - Store replays for: 35 days
5. Save changes

### A/B Testing Integration

Track A/B test variants:

```typescript
import { trackAction } from '@/lib/dynatrace';

function trackExperiment(experimentName: string, variant: string) {
  trackAction(`Experiment: ${experimentName} - Variant ${variant}`);
}

// Usage
trackExperiment('Quiz-UI-Redesign', 'Control');
trackExperiment('Quiz-UI-Redesign', 'Variant-A');
```

## Resources

- **Dynatrace Documentation**: https://www.dynatrace.com/support/help/
- **RUM JavaScript API**: https://www.dynatrace.com/support/help/platform-modules/digital-experience/web-applications/support/javascript-api
- **Best Practices**: https://www.dynatrace.com/support/help/how-to-use-dynatrace/real-user-monitoring/best-practices/
- **Community Forum**: https://community.dynatrace.com/
- **CertLab GitHub Issues**: https://github.com/archubbuck/certlab/issues

## Support

For issues specific to CertLab's Dynatrace integration:

1. Check this guide and [ARCHITECTURE.md](ARCHITECTURE.md)
2. Review console logs for Dynatrace errors
3. Open an issue: https://github.com/archubbuck/certlab/issues
4. Tag with: `observability`, `dynatrace`

For Dynatrace platform issues:

1. Check status page: https://status.dynatrace.com/
2. Contact Dynatrace support via your account dashboard
3. Visit community forum: https://community.dynatrace.com/

---

**Last Updated**: 2024-12-14
**Version**: 1.0.0
**Maintainer**: CertLab Team
