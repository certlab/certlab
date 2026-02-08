# Issues Documentation

This directory contains detailed documentation for significant technical issues, limitations, and technical debt in the CertLab codebase. Each issue document includes:

- **Root cause analysis** - Why the issue exists
- **Impact assessment** - Who/what is affected
- **Remediation steps** - Concrete action items to resolve
- **Success criteria** - How to measure resolution

## 📋 Current Issues

### Firebase Local Testing Limitation

**Status:** Open  
**Severity:** Medium  
**Type:** Technical Debt / Developer Experience

**Summary:** Manual UI testing requires live Firebase configuration, creating a high barrier for contributors. Firebase Emulator Suite is configured but underutilized.

**Documents:**
- **[firebase-local-testing-limitation.md](firebase-local-testing-limitation.md)** - Full analysis with root causes and remediation plan
- **[github-issue-firebase-testing-limitation.md](github-issue-firebase-testing-limitation.md)** - GitHub issue template ready to be posted

**Quick Fix (Priority 1):**
1. Add `VITE_USE_FIREBASE_EMULATOR` to `.env.example`
2. Create emulator quick start guide
3. Update CONTRIBUTING.md and README.md with emulator information

## 📝 How to Use This Directory

### For Contributors

If you encounter the limitation described in an issue document:
1. Read the issue document for context and workarounds
2. Check the remediation steps for potential solutions
3. Consider implementing Priority 1 ("Quick Wins") fixes if you have time

### For Maintainers

When documenting a new issue:
1. Create a detailed markdown file with root cause analysis
2. Include specific code/file references
3. Provide concrete remediation steps with priorities
4. Update this README with a summary
5. Optionally create a GitHub issue template

### Issue Document Template

```markdown
# Issue: [Title]

## Summary
Brief description of the issue

## Root Cause Analysis
Detailed explanation of why the issue exists

## Impact
Who/what is affected and how

## Affected Areas
Code, documentation, and test files involved

## Remediation Steps
Prioritized action items to resolve

## Success Criteria
How to measure successful resolution

## Alternatives Considered
Other approaches and why they were not selected

## References
Related documentation, code, and external resources
```

## 🔗 Related Documentation

- **[../known-issues.md](../known-issues.md)** - Brief list of known issues
- **[../ROADMAP.md](../../ROADMAP.md)** - Planned features and improvements
- **[../CONTRIBUTING.md](../../CONTRIBUTING.md)** - How to contribute fixes

---

**Note:** This directory is for documenting **technical debt and limitations** with detailed analysis. For **feature requests** and **bug reports**, please use GitHub Issues.
