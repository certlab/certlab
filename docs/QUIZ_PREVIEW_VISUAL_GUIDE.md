# Quiz Preview Mode - Visual Guide

## Preview Mode Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      Quiz Builder                           │
│  ┌───────────┬───────────┬────────────┬─────────┐          │
│  │  Config   │ Questions │   Editor   │ Preview │ ← Tabs   │
│  └───────────┴───────────┴────────────┴─────────┘          │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Click "Preview" Tab
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Preview Tab View                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🎯 Try Realistic Preview Mode                       │  │
│  │                                                       │  │
│  │  Experience your quiz exactly as students will see   │  │
│  │  it - with working timer, navigation, interactions,  │  │
│  │  and scoring simulation.                             │  │
│  │                                                       │  │
│  │  💡 Your progress won't be saved - this is just a   │  │
│  │     preview!                                          │  │
│  │                                      ┌──────────────┐ │  │
│  │                                      │ Launch Preview│ │  │
│  │                                      └──────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Static Question Preview - Original View]                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Click "Launch Preview"
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Preview Mode - Results will not be saved          [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ My Certification Quiz                Time: 29:45     │  │
│  │ Progress: ████████░░░░░░░░░░░░░░ 40% (2/5)          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Question 2 of 5                                            │
│                                                              │
│  What is the primary purpose of encryption?                 │
│                                                              │
│  ○ A. To compress data                                      │
│  ● B. To protect data confidentiality      ← Selected       │
│  ○ C. To increase network speed                             │
│  ○ D. To delete data                                        │
│                                                              │
│  ┌────────┐  ┌──────────┐               ┌────────┐         │
│  │ ← Prev │  │ 🚩 Flag  │               │ Next → │         │
│  └────────┘  └──────────┘               └────────┘         │
│                                                              │
│  Question Navigator: [1✓] [2●] [3] [4] [5]                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Complete all questions & Submit
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Preview Results                      [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                        85%                                   │
│                                                              │
│                   🎉 Passed!                                │
│                                                              │
│            You got 17 out of 20 questions correct           │
│                   Passing score: 70%                        │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ⚠️ Preview Mode                                   │    │
│  │                                                     │    │
│  │  This is a preview simulation. No data has been   │    │
│  │  saved to your account. Results and progress are  │    │
│  │  not recorded.                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│         ┌──────────────┐      ┌──────────────┐            │
│         │ Exit Preview │      │  Try Again   │            │
│         └──────────────┘      └──────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key UI Elements

### 1. Preview Mode Indicator (Top Banner)
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️ Preview Mode - Taking quiz in preview mode      [X] │
│ Results will not be saved                              │
└─────────────────────────────────────────────────────────┘
```
- Blue background with warning icon
- Always visible during preview
- X button to exit (with confirmation)

### 2. Quiz Header
```
┌──────────────────────────────────────────────────────┐
│ Quiz Title                         Time: 29:45       │
│ Progress: ████████░░░░░░░ 40% (2/5)                 │
└──────────────────────────────────────────────────────┘
```
- Shows quiz title
- Live countdown timer (if configured)
- Progress bar with percentage and count

### 3. Question Display
```
Question 2 of 5

What is the primary purpose of encryption?

○ A. To compress data
● B. To protect data confidentiality    ← Selected
○ C. To increase network speed
○ D. To delete data
```
- Question number and total
- Question text
- Interactive answer options
- Visual indication of selection

### 4. Navigation Controls
```
┌────────┐  ┌──────────┐               ┌────────┐
│ ← Prev │  │ 🚩 Flag  │               │ Next → │
└────────┘  └──────────┘               └────────┘
```
- Previous/Next buttons
- Flag for review button (highlighted when flagged)
- Keyboard shortcuts supported

### 5. Question Navigator
```
Question Navigator: [1✓] [2●] [3] [4🚩] [5]

Legend:
  ✓ = Answered
  ● = Current question
  🚩 = Flagged for review
  Plain = Unanswered
```
- Quick navigation to any question
- Visual status indicators
- Click to jump to question

### 6. Results Screen
```
┌──────────────────────────────────────┐
│              85%                     │
│                                      │
│          🎉 Passed!                 │
│                                      │
│  You got 17 out of 20 questions     │
│  correct                             │
│                                      │
│  Passing score: 70%                 │
└──────────────────────────────────────┘
```
- Large score display
- Pass/fail indicator
- Detailed breakdown
- Reference to passing score

## Interaction Patterns

### Desktop Keyboard Shortcuts
- **Arrow Left / P**: Previous question
- **Arrow Right / N**: Next question
- **F**: Flag/unflag current question
- **1-5**: Quick answer selection (when available)
- **Escape**: Exit preview (with confirmation)

### Mobile Gestures
- **Swipe Left**: Next question
- **Swipe Right**: Previous question
- **Tap**: Select answer
- Visual swipe indicator shows direction

## Color Coding

- **Blue**: Preview mode indicators, info messages
- **Green**: Correct answers (in results), success states
- **Yellow/Orange**: Warning indicators, flagged questions
- **Red**: Time running out, failure states
- **Gray**: Disabled/inactive elements
- **Accent**: Selected answers, interactive elements

## Responsive Design

### Desktop View (1280px+)
- Full-width layout with sidebar
- Horizontal question navigator
- All text visible
- Large touch targets

### Tablet View (768px - 1279px)
- Adjusted padding
- Stacked navigation on smaller screens
- Condensed question navigator

### Mobile View (<768px)
- Single column layout
- Compressed headers
- Abbreviated button text ("Prev" instead of "Previous")
- Swipe gestures enabled
- Touch-optimized controls

## State Transitions

```
Builder State → Validation → Preview Mode
                   ↓
           [At least 1 question required]
                   ↓
           Create Quiz Object
                   ↓
         Initialize Preview State
                   ↓
        Render Preview Interface
                   ↓
      User Takes Quiz (Local State)
                   ↓
           Calculate Score
                   ↓
          Display Results
                   ↓
      Exit → Back to Builder
```

## Error Handling

### No Questions
```
┌─────────────────────────────────┐
│   👁️  No questions to preview  │
│                                 │
│   Add questions to see the     │
│   preview                       │
└─────────────────────────────────┘
```

### Exit Confirmation
```
┌────────────────────────────────┐
│  Exit Preview Mode?            │
│                                │
│  Are you sure you want to exit │
│  the preview? Your progress in │
│  this preview session will be  │
│  lost.                         │
│                                │
│  [Continue Preview] [Exit]     │
└────────────────────────────────┘
```

## Accessibility Features

- **ARIA Labels**: All interactive elements properly labeled
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Proper semantic HTML
- **Focus Management**: Visible focus indicators
- **Color Contrast**: WCAG AA compliant
- **Alternative Text**: Icons have text alternatives

## Performance Considerations

- **Local State**: All state managed in memory
- **No Network Calls**: No database operations during preview
- **Efficient Rendering**: Uses React memoization
- **Smooth Animations**: CSS transitions for interactions
- **Responsive**: Optimized for all device sizes
