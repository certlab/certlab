# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in CertLab, please report it by opening an issue on GitHub or contacting the maintainers directly.

## Dependency Security

CertLab uses automated security scanning through:

- **npm audit** - Runs on every dependency change and weekly (see `.github/workflows/dependency-audit.yml`)
- **Dependabot** - Configured for weekly updates (see `.github/dependabot.yml`)

### Known Vulnerabilities and Accepted Risks

The following vulnerabilities have been reviewed and documented:

#### Development-Only: esbuild cross-site request vulnerability (Moderate)

- **Advisory**: [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
- **Affected Package**: `esbuild <=0.24.2` (specifically `esbuild@0.21.5` bundled in `vite@5.4.x`)
- **Severity**: Moderate
- **Status**: Accepted Risk (Development Only)
- **Risk Assessment**:
  - This vulnerability affects the development server only
  - It allows any website to send requests to the dev server and read responses
  - **Production builds are NOT affected** - esbuild is only used during development and build time
  - The built static assets (HTML, CSS, JS) do not contain esbuild
  - Fixing this vulnerability requires upgrading to vite v7.x which is a breaking change
- **Mitigation**:
  - Run the development server only on trusted networks
  - Do not expose the development server to the public internet
  - The vulnerability will be automatically resolved when vite v5.x receives a patched esbuild version, or when the project upgrades to vite v7.x

## Accessibility Security

Accessibility features can introduce security considerations:

### Screen Reader Support

- **ARIA Labels**: While ARIA labels help screen readers, avoid including sensitive information in aria-labels that shouldn't be announced
- **Status Messages**: Use `aria-live` regions appropriately to avoid information leakage

### Keyboard Navigation

- **Tab Order**: Ensure logical tab order doesn't expose sensitive form fields prematurely
- **Focus Management**: Prevent focus from being trapped in a way that could be exploited

### Best Practices

1. Test accessibility features for potential security implications
2. Ensure screen readers don't announce sensitive data inappropriately
3. Validate that keyboard navigation doesn't bypass security controls
4. Check that high contrast modes don't reveal hidden content

For more on accessibility features, see [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Security Best Practices

When contributing to CertLab:

1. Never commit secrets or credentials to the repository
2. Keep dependencies up to date using `npm update` and `npm audit fix`
3. Review Dependabot PRs promptly
4. Run `npm audit` before creating pull requests that modify dependencies
5. Test accessibility features for security implications
6. Ensure ARIA labels don't expose sensitive information
