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
- **Affected Package**: `esbuild <=0.24.2` (via vite, @vitejs/plugin-react)
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
  - The vulnerability will be automatically resolved when vite v5.x receives a patched version, or when the project upgrades to vite v7.x

## Security Best Practices

When contributing to CertLab:

1. Never commit secrets or credentials to the repository
2. Keep dependencies up to date using `npm update` and `npm audit fix`
3. Review Dependabot PRs promptly
4. Run `npm audit` before creating pull requests that modify dependencies
