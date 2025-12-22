# Question Explanations V2 - Visual Component Structure

## Component Hierarchy

```
EnhancedExplanation
├── Card (border colored by correct/incorrect)
│   ├── CardHeader
│   │   ├── Icon (lightbulb or info-circle)
│   │   ├── Title ("Why this is correct/incorrect")
│   │   └── Badge (showing # of alternative views)
│   │
│   └── CardContent
│       ├── Tabs (when alternative views exist)
│       │   ├── TabsList
│       │   │   ├── Official Explanation Tab
│       │   │   └── Community Views Tab (with count)
│       │   │
│       │   ├── TabsContent: Primary Explanation
│       │   │   ├── Basic Text Explanation (V1 fallback)
│       │   │   ├── Step-by-Step Section (V2)
│       │   │   │   ├── Heading with icon
│       │   │   │   └── Ordered list with numbered circles
│       │   │   ├── Video Section (V2)
│       │   │   │   ├── Heading with video icon
│       │   │   │   └── Responsive iframe (YouTube/Vimeo)
│       │   │   ├── Reference Links Section (V2)
│       │   │   │   ├── Heading with book icon
│       │   │   │   └── List of external links with type icons
│       │   │   └── Voting Section (V2)
│       │   │       ├── "Was this helpful?" prompt
│       │   │       ├── Thumbs up button (with vote count)
│       │   │       └── Thumbs down button
│       │   │
│       │   └── TabsContent: Community Explanations
│       │       ├── Empty State (when no community explanations)
│       │       │   ├── Icon
│       │       │   ├── Message
│       │       │   └── "Be the first to contribute" button
│       │       └── Explanation Cards (sorted by verification + votes)
│       │           ├── Card Header
│       │           │   ├── User Avatar
│       │           │   ├── User Name
│       │           │   ├── Verified Badge (if verified)
│       │           │   └── Date
│       │           ├── Card Content (explanation text)
│       │           └── Vote Buttons (up/down with count)
│       │
│       └── (No Tabs when no alternative views - shows primary content only)
```

## Visual Layout Examples

### Example 1: Question with Step-by-Step Explanation (V2)

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Why this is correct:                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ Information security aims to maintain the CIA triad:         │
│ Confidentiality, Integrity, and Availability of information. │
│                                                               │
│ 📋 Step-by-Step Breakdown:                                   │
│                                                               │
│  ① Confidentiality ensures information is accessible only    │
│     to authorized individuals                                │
│                                                               │
│  ② Integrity guarantees that data remains accurate and       │
│     unmodified                                               │
│                                                               │
│  ③ Availability ensures that information and systems are     │
│     accessible when needed                                   │
│                                                               │
│  ④ All three components work together to form the            │
│     foundation of information security                       │
│                                                               │
│ 📚 Study Materials:                                          │
│                                                               │
│  📄 NIST SP 800-12: Introduction to Information Security  🔗 │
│  📰 Understanding the CIA Triad                           🔗 │
│                                                               │
│ ─────────────────────────────────────────────────────────────│
│ Was this explanation helpful?  👍 12  👎                      │
└─────────────────────────────────────────────────────────────┘
```

### Example 2: Question with Community Explanations (V2)

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Why this is correct:                    📊 2 views        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─── Official Explanation ───┬─── Community Views (2) ───┐  │
│ │                             │                            │  │
│ └─────────────────────────────┴────────────────────────────┘  │
│                                                               │
│ Defense in depth is a security strategy that uses multiple   │
│ layers of security controls throughout an IT system to       │
│ provide redundancy in case one control fails.                │
│                                                               │
│ 📋 Step-by-Step Breakdown:                                   │
│  ① Start with perimeter security (firewalls, IDS/IPS)        │
│  ② Add network segmentation to limit lateral movement        │
│  ③ Implement endpoint protection and access controls         │
│  ... (more steps)                                            │
│                                                               │
│ 🎥 Video Explanation:                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                    [Video Player]                       │ │
│ │                                                         │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ 📚 Study Materials:                                          │
│  📄 NIST Defense in Depth Guide                          🔗 │
│  📰 Defense in Depth: Best Practices                     🔗 │
└─────────────────────────────────────────────────────────────┘
```

### Example 3: Community View Tab

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Why this is correct:                    📊 2 views        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─── Official Explanation ───┬─── Community Views (2) ───┐  │
│ │                             │           (selected)      │  │
│ └─────────────────────────────┴────────────────────────────┘  │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  SE  Security Expert                     ✓ Verified     │ │
│ │                                  Jan 15, 2024           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Think of defense in depth like protecting your home:    │ │
│ │ you have a fence, locks on doors, an alarm system, and  │ │
│ │ cameras. If one fails, the others still protect you.    │ │
│ │ Same concept applies to IT security - use firewalls,    │ │
│ │ antivirus, encryption, access controls, etc.            │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │  ↑ 15   ↓                                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  CC  CISSP Certified                                    │ │
│ │                                  Jan 20, 2024           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ A good analogy is a castle: moat, walls, guards, and    │ │
│ │ inner keep. Each layer provides protection even if the  │ │
│ │ outer layers are breached. No single point of failure.  │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │  ↑ 8   ↓                                                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Color Coding

### Correct Answer
- Border: `border-success/20` (green with opacity)
- Background: `bg-success/5` (light green)
- Text: `text-success` (green)
- Icon: `fa-lightbulb` in green

### Incorrect Answer
- Border: `border-destructive/20` (red with opacity)
- Background: `bg-destructive/5` (light red)
- Text: `text-destructive` (red)
- Icon: `fa-info-circle` in red

## Icon Legend

| Icon | Meaning | Usage |
|------|---------|-------|
| 💡 | Lightbulb | Correct answer indicator |
| ℹ️ | Info circle | Incorrect answer indicator |
| 📋 | List | Step-by-step section header |
| 🎥 | Video | Video explanation section |
| 📚 | Book | Study materials section |
| 📄 | Document | Documentation reference link |
| 📰 | Newspaper | Article reference link |
| 📖 | Book | Book reference link |
| 🎓 | Graduation cap | Course reference link |
| 🔗 | Link | Generic/other reference link |
| ✓ | Checkmark | Verified contributor badge |
| 👍 | Thumbs up | Positive vote button |
| 👎 | Thumbs down | Negative vote button |
| ↑ | Up arrow | Community upvote |
| ↓ | Down arrow | Community downvote |

## Responsive Behavior

### Desktop (>= 640px)
- Full width explanations
- Side-by-side tabs
- Larger text (text-base, text-lg)
- Wider padding (p-4, p-6)
- Video: 16:9 aspect ratio

### Mobile (< 640px)
- Stacked layout
- Compressed tabs
- Smaller text (text-sm, text-base)
- Tighter padding (p-3, p-4)
- Video: Still responsive 16:9

## Animation & Transitions

1. **Explanation Reveal**: Smooth height transition (max-h-0 → max-h-[2000px])
2. **Tab Switching**: Instant content swap with fade
3. **Hover States**: Color transitions on buttons and links
4. **Vote Buttons**: Scale on hover, color change on interaction

## Accessibility Features

- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ ARIA labels on interactive elements
- ✅ Semantic HTML (headings, lists, sections)
- ✅ Focus indicators (visible outlines)
- ✅ Screen reader friendly text
- ✅ Color contrast compliant (WCAG 2.1 AA)
- ✅ Alternative text for icons

## Component Props

```typescript
interface EnhancedExplanationProps {
  question: Question;      // Question with V2 explanation data
  isCorrect: boolean;      // Whether user's answer was correct
  className?: string;      // Optional additional CSS classes
}
```

## Usage in Application

### 1. During Quiz (QuestionDisplay component)
- Shown after user submits answer
- Animated slide-down effect
- Helps user learn immediately

### 2. Review Page (Review component)
- Shown for all questions in completed quiz
- Full V2 features available
- Static display (no animation needed)

### 3. Question Bank (Admin)
- Preview mode for question creators
- Used to verify V2 data displays correctly
- Accessible from question edit interface
