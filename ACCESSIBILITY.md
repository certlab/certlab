# Accessibility Statement for CertLab

**Last Updated**: January 10, 2026  
**WCAG Compliance Target**: WCAG 2.2 Level AA

## Overview

CertLab is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status

CertLab **partially conforms** with WCAG 2.2 Level AA. "Partially conforms" means that some parts of the content do not fully conform to the accessibility standard.

## Accessibility Features

###  Screen Reader Support

- **ARIA Labels**: All interactive elements have appropriate ARIA labels and descriptions
- **ARIA Live Regions**: Dynamic content updates are announced to screen readers
- **Semantic HTML**: Proper use of heading hierarchy (h1-h6) and semantic elements (main, nav, header, footer, etc.)
- **Skip Navigation**: "Skip to main content" link available for keyboard users
- **Alternative Text**: All meaningful images include descriptive alt text
- **Form Labels**: All form inputs have associated labels or aria-label attributes

### Keyboard Navigation

- **Tab Order**: Logical tab order throughout the application
- **Focus Indicators**: Visible focus states for all interactive elements
- **Keyboard Shortcuts**: All functionality accessible via keyboard
  - `Tab` - Move forward through interactive elements
  - `Shift + Tab` - Move backward through interactive elements
  - `Enter` or `Space` - Activate buttons and links
  - `Escape` - Close dialogs and menus
  - `Arrow keys` - Navigate through menus and lists
- **No Keyboard Traps**: Users can navigate away from any element using only the keyboard
- **Skip Link**: Press `Tab` from anywhere to reveal and activate the "Skip to main content" link

### Visual Accessibility

- **Color Contrast**: Meets WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- **Color Independence**: Information is not conveyed by color alone
- **Text Resize**: Text can be resized up to 200% without loss of functionality
- **Theme Options**: Seven themes available including dark mode for reduced eye strain
- **Contrast Analyzer**: Built-in tool to check color contrast ratios (Admin > Accessibility Tools)

### Content Structure

- **Headings**: Proper heading hierarchy on all pages
- **Landmarks**: ARIA landmarks used for page regions (navigation, main content, complementary)
- **Lists**: Semantic list markup for grouped content
- **Tables**: Proper table structure with headers
- **Responsive Design**: Adapts to different screen sizes and zoom levels

## Known Limitations

### Current Limitations

The following accessibility issues are known and being addressed:

1. **Video Content**: Not all video content includes captions or transcripts
2. **Complex Data Visualizations**: Some charts and graphs may be difficult for screen readers
3. **Third-Party Content**: External embedded content may not meet accessibility standards
4. **PDF Documents**: Some downloadable PDF files may not be fully accessible

### Planned Improvements

- Add closed captions to all video content
- Provide data table alternatives for complex visualizations
- Enhance screen reader descriptions for charts and graphs
- Ensure all PDFs meet accessibility standards
- Conduct regular third-party accessibility audits

## Testing Approach

### Automated Testing

CertLab uses the following automated accessibility testing tools:

- **axe-core**: Comprehensive accessibility rule engine
- **Lighthouse**: Google's automated testing tool (part of Chrome DevTools)
- **ESLint plugins**: `eslint-plugin-jsx-a11y` for React accessibility

Run automated tests:
```bash
npm run test:run  # Includes accessibility tests
npm run lint      # Includes JSX accessibility checks
```

### Manual Testing

We conduct manual testing with:

- **Screen Readers**: 
  - NVDA (Windows)
  - JAWS (Windows)
  - VoiceOver (macOS, iOS)
  - TalkBack (Android)
- **Keyboard-Only Navigation**: All functionality tested without a mouse
- **Browser Extensions**: 
  - axe DevTools
  - WAVE Evaluation Tool
  - Color Contrast Analyzer

## Compatibility

### Browsers

CertLab is tested with the following browsers:

- **Chrome** (latest 2 versions)
- **Firefox** (latest 2 versions)
- **Safari** (latest 2 versions)
- **Edge** (latest 2 versions)

### Screen Readers

Compatible with:

- **NVDA** 2023.1+ (Windows with Chrome, Firefox)
- **JAWS** 2023+ (Windows with Chrome, Firefox)
- **VoiceOver** (macOS 13+ with Safari, iOS 16+)
- **TalkBack** (Android 12+ with Chrome)

### Assistive Technologies

- Keyboard-only navigation
- Voice control software
- Screen magnification software
- Text-to-speech software

## Technical Specifications

CertLab relies on the following technologies:

- **HTML5** for semantic structure
- **WAI-ARIA** for enhanced accessibility
- **CSS** for visual presentation
- **JavaScript** for interactive features
- **React** 18 for UI components

## Feedback and Contact

We welcome your feedback on the accessibility of CertLab. If you encounter accessibility barriers:

1. **GitHub Issues**: [Report an accessibility issue](https://github.com/archubbuck/certlab/issues/new)
2. **Email**: Contact the development team
3. **Response Time**: We aim to respond within 2 business days

When reporting an issue, please include:

- The page or feature where you encountered the problem
- Your assistive technology and browser (name and version)
- A description of the problem
- Steps to reproduce the issue

## Standards and Guidelines

CertLab aims to conform to the following standards:

- **WCAG 2.2 Level AA**: Web Content Accessibility Guidelines
- **Section 508**: U.S. Rehabilitation Act accessibility standards
- **EN 301 549**: European accessibility standard
- **ADA**: Americans with Disabilities Act compliance

## Assessment Methodology

This accessibility statement was created using:

1. **Self-evaluation**: Internal accessibility review by development team
2. **Automated Testing**: axe-core, Lighthouse, and other automated tools
3. **Manual Testing**: Keyboard navigation and screen reader testing
4. **User Feedback**: Input from users with disabilities

## Documentation

Additional accessibility resources:

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)

## Updates and Maintenance

This statement is reviewed and updated:

- **Quarterly**: Regular scheduled reviews
- **After major releases**: Following significant feature additions
- **When issues are reported**: In response to user feedback

---

## Detailed Feature Compliance

### WCAG 2.2 Level A Compliance

| Success Criterion | Status | Notes |
|-------------------|--------|-------|
| 1.1.1 Non-text Content | ✅ Partial | Working to add alt text to all images |
| 1.2.1 Audio-only and Video-only (Prerecorded) | ⚠️ In Progress | Adding transcripts |
| 1.2.2 Captions (Prerecorded) | ⚠️ In Progress | Adding captions to videos |
| 1.2.3 Audio Description or Media Alternative | ⚠️ In Progress | Working on alternatives |
| 1.3.1 Info and Relationships | ✅ Compliant | Proper semantic structure |
| 1.3.2 Meaningful Sequence | ✅ Compliant | Logical reading order |
| 1.3.3 Sensory Characteristics | ✅ Compliant | Instructions don't rely on sensory info |
| 1.4.1 Use of Color | ✅ Compliant | Color not sole means of conveying info |
| 1.4.2 Audio Control | ✅ Compliant | No auto-playing audio |
| 2.1.1 Keyboard | ✅ Compliant | All functionality keyboard accessible |
| 2.1.2 No Keyboard Trap | ✅ Compliant | Users can navigate away from all elements |
| 2.1.4 Character Key Shortcuts | ✅ Compliant | No single-key shortcuts without modifiers |
| 2.2.1 Timing Adjustable | ✅ Compliant | Users can control timing |
| 2.2.2 Pause, Stop, Hide | ✅ Compliant | Users can control moving content |
| 2.3.1 Three Flashes or Below | ✅ Compliant | No flashing content |
| 2.4.1 Bypass Blocks | ✅ Compliant | Skip navigation link provided |
| 2.4.2 Page Titled | ✅ Compliant | All pages have descriptive titles |
| 2.4.3 Focus Order | ✅ Compliant | Logical focus order |
| 2.4.4 Link Purpose | ✅ Compliant | Link text describes destination |
| 2.5.1 Pointer Gestures | ✅ Compliant | No complex gestures required |
| 2.5.2 Pointer Cancellation | ✅ Compliant | Actions on up-event |
| 2.5.3 Label in Name | ✅ Compliant | Visible labels match accessible names |
| 2.5.4 Motion Actuation | ✅ Compliant | No motion-based interactions |
| 3.1.1 Language of Page | ✅ Compliant | Page language specified |
| 3.2.1 On Focus | ✅ Compliant | No context changes on focus |
| 3.2.2 On Input | ✅ Compliant | No unexpected context changes |
| 3.3.1 Error Identification | ✅ Compliant | Errors clearly identified |
| 3.3.2 Labels or Instructions | ✅ Compliant | Form labels provided |
| 4.1.1 Parsing | ✅ Compliant | Valid HTML |
| 4.1.2 Name, Role, Value | ✅ Compliant | ARIA attributes used correctly |
| 4.1.3 Status Messages | ✅ Partial | Working to add ARIA live regions everywhere |

### WCAG 2.2 Level AA Compliance

| Success Criterion | Status | Notes |
|-------------------|--------|-------|
| 1.2.4 Captions (Live) | N/A | No live audio content |
| 1.2.5 Audio Description | ⚠️ In Progress | Adding to prerecorded videos |
| 1.3.4 Orientation | ✅ Compliant | Works in any orientation |
| 1.3.5 Identify Input Purpose | ✅ Compliant | Input purposes programmatically determined |
| 1.4.3 Contrast (Minimum) | ✅ Compliant | 4.5:1 for normal text, 3:1 for large text |
| 1.4.4 Resize Text | ✅ Compliant | Text scales to 200% |
| 1.4.5 Images of Text | ✅ Compliant | Text used instead of images where possible |
| 1.4.10 Reflow | ✅ Compliant | No horizontal scrolling at 320px width |
| 1.4.11 Non-text Contrast | ✅ Compliant | 3:1 for UI components and graphics |
| 1.4.12 Text Spacing | ✅ Compliant | Text spacing adjustable |
| 1.4.13 Content on Hover or Focus | ✅ Compliant | Additional content dismissible, hoverable, persistent |
| 2.4.5 Multiple Ways | ✅ Compliant | Navigation menu and search |
| 2.4.6 Headings and Labels | ✅ Compliant | Descriptive headings and labels |
| 2.4.7 Focus Visible | ✅ Compliant | Visible focus indicators |
| 2.4.11 Focus Not Obscured (Minimum) | ✅ Compliant | Focused elements not hidden |
| 2.5.7 Dragging Movements | ✅ Compliant | No drag-and-drop required |
| 2.5.8 Target Size (Minimum) | ✅ Compliant | Touch targets at least 24x24 CSS pixels |
| 3.1.2 Language of Parts | ✅ Compliant | Language changes identified |
| 3.2.3 Consistent Navigation | ✅ Compliant | Navigation consistent across pages |
| 3.2.4 Consistent Identification | ✅ Compliant | Components identified consistently |
| 3.2.6 Consistent Help | ✅ Compliant | Help mechanism in consistent location |
| 3.3.3 Error Suggestion | ✅ Compliant | Error corrections suggested |
| 3.3.4 Error Prevention | ✅ Compliant | Confirmations for important actions |
| 3.3.7 Redundant Entry | ✅ Compliant | Information not required to be entered multiple times |

**Legend:**
- ✅ Compliant: Fully meets the success criterion
- ⚠️ In Progress: Currently being addressed
- ❌ Not Compliant: Known issue being worked on
- N/A: Not applicable to this application

---

## Continuous Improvement

Accessibility is an ongoing effort. We are committed to:

1. **Regular Audits**: Quarterly accessibility audits
2. **User Testing**: Testing with users who use assistive technologies
3. **Training**: Ongoing accessibility training for development team
4. **Documentation**: Keeping accessibility documentation up to date
5. **Feedback Integration**: Acting on user feedback promptly

Thank you for helping us make CertLab accessible to everyone.
