# Privacy Policy for CertLab

**Last Updated**: January 15, 2026  
**Effective Date**: January 15, 2026  
**Version**: 1.0.0

## Introduction

CertLab ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our certification learning platform.

## Information We Collect

### Account Information

When you create an account, we collect:

- **Email address** (required for authentication)
- **Name** (optional, for personalization)
- **Profile image** (optional)
- **Authentication credentials** (securely hashed passwords or OAuth tokens)

### Learning Data

As you use CertLab, we automatically collect:

- **Quiz results and scores** - Your performance on quizzes and practice tests
- **Study progress** - Topics studied, time spent, mastery levels
- **Achievement data** - Badges earned, streaks, levels, and points
- **Study preferences** - Selected certifications, difficulty preferences, learning modes
- **Usage patterns** - Features accessed, navigation patterns, session duration

### Technical Information

We automatically collect:

- **Device information** - Browser type, operating system, device type
- **IP address** - For security and analytics purposes
- **Cookies and local storage** - For session management and preferences
- **Error logs** - For debugging and improving the platform

### Optional Analytics (If Enabled)

If you have configured Dynatrace monitoring:

- **Performance metrics** - Page load times, interaction delays
- **User journey data** - Navigation paths, feature usage
- **Error tracking** - JavaScript errors and stack traces

**Note**: Analytics integration is optional and requires administrator configuration.

## How We Use Your Information

### Primary Purposes

1. **Provide Core Services**
   - Authenticate your account
   - Track your learning progress
   - Generate quizzes and practice tests
   - Calculate scores and mastery levels
   - Award achievements and badges

2. **Personalization**
   - Adapt quiz difficulty based on performance
   - Recommend study focus areas
   - Customize your dashboard
   - Remember your preferences

3. **Platform Improvement**
   - Analyze feature usage patterns
   - Identify and fix bugs
   - Optimize performance
   - Develop new features

4. **Security and Compliance**
   - Prevent fraud and abuse
   - Enforce terms of service
   - Comply with legal obligations
   - Maintain platform security

### We Do NOT

- ❌ Sell your personal information to third parties
- ❌ Share your learning data with advertisers
- ❌ Use your data for marketing purposes (unless explicitly opted in)
- ❌ Share your quiz results with employers without consent
- ❌ Track you across other websites

## Data Storage and Security

### Storage Architecture

**Firebase/Firestore (Cloud Mode)**:
- Data stored in Google Cloud Platform (Firestore)
- Multi-region replication for availability
- Encrypted in transit (TLS 1.3) and at rest (AES-256)
- Automatic backups and point-in-time recovery
- Subject to [Google Cloud Privacy Notice](https://cloud.google.com/terms/cloud-privacy-notice)

**IndexedDB (Local Mode)**:
- Data stored locally in your browser
- Not transmitted to our servers
- Deleted when you clear browser data
- No cloud synchronization

### Security Measures

We implement industry-standard security practices:

- **Authentication**: Secure password hashing (PBKDF2 with 100,000 iterations) or OAuth 2.0
- **Authorization**: Role-based access control (RBAC)
- **Firestore Security Rules**: Per-user data isolation
- **Encryption**: TLS 1.3 for data in transit, AES-256 for data at rest
- **Session Management**: Secure, HTTP-only cookies with automatic expiration
- **Dependency Scanning**: Automated vulnerability detection via Dependabot
- **Regular Updates**: Security patches applied promptly

### Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Account Information | Until account deletion | Permanent deletion |
| Quiz History | Until account deletion | Permanent deletion |
| Progress Data | Until account deletion | Permanent deletion |
| Achievements | Until account deletion | Permanent deletion |
| Session Logs | 90 days | Automatic deletion |
| Error Logs | 30 days | Automatic deletion |
| Backup Data | 30 days | Automatic deletion |

## Your Privacy Rights

### Right to Access

You can access all your personal data at any time:

1. **Via User Interface**:
   - Navigate to Profile → Settings
   - View your account information
   - Review your quiz history at Dashboard → History
   - Check achievements at Achievements page

2. **Via Data Export**:
   - Go to Profile → Export Data
   - Download complete data archive (JSON format)
   - Includes all quizzes, progress, achievements, and settings

### Right to Rectification

You can update your information:

- **Account details**: Profile → Settings → Edit Profile
- **Preferences**: Profile → Settings → Preferences
- **Study goals**: Dashboard → Update Goals
- **Incorrect quiz data**: Contact administrator for manual correction

### Right to Deletion ("Right to be Forgotten")

You have the right to request deletion of your account and all associated data:

**Process**:
1. Log in to your account
2. Navigate to Profile → Settings → Account
3. Click "Delete Account"
4. Confirm deletion (this action is irreversible)

**What Gets Deleted**:
- ✅ Account information (email, name, profile)
- ✅ All quiz history and results
- ✅ All progress data and mastery scores
- ✅ All achievements and badges
- ✅ All study notes and bookmarks
- ✅ All preferences and settings

**What May Be Retained** (for legal/operational reasons):
- Anonymous usage statistics (no personal identifiers)
- Audit logs (required for security, 90 days maximum)
- Backup archives (automatically deleted after 30 days)

**Timeline**: Account deletion is processed immediately. Backup data is purged within 30 days.

### Right to Data Portability

You can export your data in machine-readable format:

1. Navigate to Profile → Export Data
2. Click "Export All Data"
3. Download JSON file containing:
   - User profile
   - Quiz history
   - Progress tracking
   - Achievements
   - Settings and preferences

### Right to Restrict Processing

You can limit how we use your data:

- **Disable analytics**: Administrator can disable Dynatrace integration
- **Opt-out of emails**: Profile → Settings → Notifications
- **Limit data collection**: Use local-only mode (IndexedDB)

### Right to Object

You have the right to object to data processing. Contact us to:
- Request processing restrictions
- Withdraw consent for optional features
- Dispute automated decision-making

## Data Sharing and Disclosure

### We Share Data With:

1. **Service Providers**:
   - **Google Firebase/Firestore**: Cloud storage and authentication
   - **Dynatrace** (optional): Performance monitoring and analytics
   
   All service providers are bound by data protection agreements.

2. **Legal Requirements**:
   We may disclose information if required by:
   - Court order or subpoena
   - Legal investigation
   - Protection of our rights or safety
   - Compliance with applicable laws

### We Do NOT Share Data With:

- ❌ Advertisers or marketing companies
- ❌ Data brokers
- ❌ Social media platforms (unless you explicitly connect them)
- ❌ Third-party analytics beyond Dynatrace (if configured)
- ❌ Educational institutions (unless you explicitly authorize)

## Cookies and Tracking

### Essential Cookies

Required for platform functionality:

| Cookie | Purpose | Duration |
|--------|---------|----------|
| `auth_token` | Session authentication | 7 days |
| `user_preferences` | Theme, language, settings | 1 year |
| `firebase_token` | Firebase authentication | Session |

### Analytics Cookies (Optional)

If Dynatrace is configured:

| Cookie | Purpose | Duration |
|--------|---------|----------|
| `dtCookie` | Session tracking | Session |
| `dtLatC` | Performance monitoring | Session |
| `dtPC` | Visitor identification | 2 years |

**Control**: Clear browser cookies to remove all tracking.

### Local Storage

We use browser local storage for:
- User preferences (theme, language)
- Session state
- Offline data caching (IndexedDB)

## Children's Privacy

CertLab is intended for users aged 13 and older. We do not knowingly collect information from children under 13.

**If you are under 13**:
- Do not create an account
- Do not provide any personal information
- Have a parent or guardian contact us to create a supervised account

**If we discover** we have collected data from a child under 13, we will delete it immediately.

## Educational Use and FERPA Compliance

### Family Educational Rights and Privacy Act (FERPA)

For educational institutions using CertLab:

1. **Student Data Protection**: 
   - Student quiz results are private by default
   - Instructors must have explicit authorization to view student data
   - Educational institutions control access policies

2. **Parent/Guardian Rights**:
   - Parents can request access to student data for users under 18
   - Schools must maintain FERPA compliance in their deployment

3. **Data Disclosure**:
   - We do not share student educational records without consent
   - Exception: Anonymous, aggregated statistics (no personal identifiers)

### School Deployments

Educational institutions should:
- ✅ Configure role-based access controls
- ✅ Train administrators on privacy best practices
- ✅ Obtain necessary consents from students/parents
- ✅ Review and approve third-party integrations
- ✅ Implement data retention policies

## International Data Transfers

**For Cloud Mode (Firebase/Firestore)**:
- Data may be stored in Google Cloud regions worldwide
- Subject to Google Cloud's data transfer safeguards
- Complies with GDPR, CCPA, and other regional privacy laws

**For Local Mode (IndexedDB)**:
- Data never leaves your device
- No international transfers occur

## Changes to This Privacy Policy

We may update this Privacy Policy to reflect:
- Changes in legal requirements
- New features or functionality
- Improvements to privacy practices
- User feedback

**Notification of Changes**:
- Updated "Last Updated" date at top of policy
- Prominent notice on dashboard for material changes
- Email notification for significant changes (if opted in)

**Your Continued Use**: Constitutes acceptance of the updated policy.

## Contact Us

### Privacy Questions or Concerns

- **GitHub Issues**: [Report privacy concern](https://github.com/archubbuck/certlab/issues/new?labels=privacy)
- **Email**: Contact repository maintainers via GitHub profile
- **Response Time**: We aim to respond within 5 business days

### Data Protection Officer

For GDPR-related inquiries:
- Contact repository owner through GitHub

### Data Subject Requests

To exercise your privacy rights:
1. Log in to your account and use self-service options
2. For complex requests, open a GitHub issue with label `privacy`
3. Include: Your email address, specific request, and any relevant details

## Transparency and Compliance

### Compliance Standards

CertLab is designed to comply with:

- ✅ **GDPR** (General Data Protection Regulation - EU)
- ✅ **CCPA** (California Consumer Privacy Act - USA)
- ✅ **FERPA** (Family Educational Rights and Privacy Act - USA)
- ✅ **COPPA** (Children's Online Privacy Protection Act - USA)
- ✅ **PIPEDA** (Personal Information Protection and Electronic Documents Act - Canada)

### Regular Audits

We conduct:
- Quarterly privacy compliance reviews
- Annual security audits
- Regular dependency vulnerability scans
- Accessibility audits (WCAG 2.2)

### Transparency Reports

Available in repository:
- `SECURITY.md` - Security practices and vulnerability disclosure
- `ACCESSIBILITY.md` - Accessibility compliance
- `FEATURES.md` - Feature documentation
- This policy

## Open Source Commitment

As an open-source project:

- ✅ **Code Transparency**: Full source code available on GitHub
- ✅ **Community Review**: Privacy practices subject to public scrutiny
- ✅ **Self-Hosting**: Organizations can host their own instances
- ✅ **Data Sovereignty**: Local-only mode for complete data control

## Summary of Key Points

| Privacy Aspect | CertLab Approach |
|----------------|------------------|
| **Data Collection** | Minimal - only what's needed for core functionality |
| **Data Usage** | Learning platform only - no advertising or marketing |
| **Data Sharing** | Never sold; only essential service providers |
| **Data Security** | Industry-standard encryption and security practices |
| **User Control** | Full access, export, and deletion capabilities |
| **Transparency** | Open-source code, public documentation |
| **Compliance** | GDPR, CCPA, FERPA, COPPA compliant |

---

## Agreement

By using CertLab, you acknowledge that you have read and understood this Privacy Policy and agree to its terms.

**Last Review Date**: January 15, 2026  
**Next Scheduled Review**: April 15, 2026

---

For the complete terms of service, see [Terms of Service](TERMS_OF_SERVICE.md) (if applicable).
