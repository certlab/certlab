import { configureAxe } from 'vitest-axe';

// Configure axe for WCAG 2.2 AA compliance testing
export const axe = configureAxe({
  rules: {
    // Enable all WCAG 2.2 Level A and AA rules
    'color-contrast': { enabled: true },
    'valid-lang': { enabled: true },
    'html-has-lang': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    region: { enabled: true },
    bypass: { enabled: true },
    'aria-allowed-attr': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    label: { enabled: true },
    'image-alt': { enabled: true },
    list: { enabled: true },
    listitem: { enabled: true },
    'document-title': { enabled: true },
    tabindex: { enabled: true },
    'meta-viewport': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'heading-order': { enabled: true },
    'identical-links-same-purpose': { enabled: true },
  },
  // Run tests against WCAG 2.2 Level AA
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  },
});

export default axe;
