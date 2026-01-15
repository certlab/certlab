# Achievements UI - Visual Guide

## Overview
This document illustrates the visual changes made to the achievements UI to show all badges (earned and unearned) with clear visual distinction.

## Layout Structure

### Page Header
```
🏆 Achievements & Badges
Track your learning progress with gamified milestones and achievements
```

### Category Overview Cards (Unchanged)
Five cards showing achievement categories:
- Progress | Performance | Streak | Mastery | Special

### Tabs
```
[ All Badges ]  [ Progress ]
     ↑ Changed from "Earned Badges"
```

### Level Progress (Unchanged)
Shows user's current level, points, and streak information

### Search Bar (NEW!)
```
┌────────────────────────────────────────────────────┐
│ 🔍 Search achievements by name, description, or... │
└────────────────────────────────────────────────────┘
```

## Badge Card Layouts

### Earned Badge Card (Colored)
```
┌─────────────────────────────────────────┐
│         COLORED BACKGROUND              │
│              (based on badge color)     │
│                                         │
│              🏆                         │
│           (5xl, full color)             │
│                                         │
│         Badge Name                      │
│      (base, bold, full color)           │
│          [New!]                         │
│     (if recently earned)                │
│                                         │
│      Description text here              │
│   (sm, lighter, full contrast)          │
│                                         │
│  RARE          ⭐ 100 pts              │
│  (colored)     (colored)                │
│                                         │
│  Earned: 12/25/2024                     │
│  (gray, centered)                       │
└─────────────────────────────────────────┘
```

### Unearned Badge Card (Grayscale - "Shadow Replica")
```
┌─────────────────────────────────────────┐
│         GRAY BACKGROUND                 │
│       (bg-gray-100/800)                 │
│                                         │
│              🏆                         │
│  (5xl, 30% opacity, grayscale)         │
│                                         │
│         Badge Name                      │
│     (base, bold, gray text)             │
│                                         │
│      Description text here              │
│   (sm, lighter gray text)               │
│                                         │
│  RARE          ⭐ 100 pts              │
│  (gray)        (gray)                   │
│                                         │
│         Locked                          │
│  (gray, centered, bold)                 │
└─────────────────────────────────────────┘
```

## Category Section Example

```
📈 Progress Badges (3/10 earned)
                    ↑ New count indicator

[Earned]  [Earned]  [Unearned]  [Unearned]
[Badge 1] [Badge 2] [Badge 3]   [Badge 4]
  Color     Color     Gray        Gray
  Full      Full      Shadow      Shadow
```

## Color Comparison

### Earned Badge Colors (Examples)
- **Green**: Bright green background, full color icon, black/white text
- **Blue**: Bright blue background, full color icon, black/white text
- **Purple**: Bright purple background, full color icon, black/white text
- **Gold**: Golden yellow background, full color icon, black/white text

### Unearned Badge (All Same)
- **Background**: Light gray (light mode) or dark gray (dark mode)
- **Icon**: Same emoji but at 30% opacity with grayscale filter
- **Text**: All text in muted gray tones
- **Effect**: Looks like a faded shadow or silhouette of the colored version

## Responsive Grid

### Mobile (< md)
```
┌───────────┐
│  Badge 1  │
└───────────┘
┌───────────┐
│  Badge 2  │
└───────────┘
┌───────────┐
│  Badge 3  │
└───────────┘
```

### Tablet (md to lg)
```
┌───────────┐ ┌───────────┐
│  Badge 1  │ │  Badge 2  │
└───────────┘ └───────────┘
┌───────────┐ ┌───────────┐
│  Badge 3  │ │  Badge 4  │
└───────────┘ └───────────┘
```

### Desktop (lg to xl)
```
┌───────────┐ ┌───────────┐ ┌───────────┐
│  Badge 1  │ │  Badge 2  │ │  Badge 3  │
└───────────┘ └───────────┘ └───────────┘
┌───────────┐ ┌───────────┐ ┌───────────┐
│  Badge 4  │ │  Badge 5  │ │  Badge 6  │
└───────────┘ └───────────┘ └───────────┘
```

### Large Desktop (xl+)
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Badge 1 │ │ Badge 2 │ │ Badge 3 │ │ Badge 4 │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Badge 5 │ │ Badge 6 │ │ Badge 7 │ │ Badge 8 │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Search Behavior

### Search: "perfect"
Shows only badges matching "perfect" in name/description:
```
⭐ Performance Badges (1/3 earned)

[Earned]
Perfect Score
Get 100% on a quiz
RARE    ⭐ 50 pts
Earned: 12/20/2024
```

### Search: "streak"
Shows only streak-related badges:
```
🔥 Streak Badges (0/4 earned)

[Unearned] [Unearned] [Unearned] [Unearned]
  7-Day      14-Day     30-Day     100-Day
  Streak     Streak     Streak     Streak
  (Gray)     (Gray)     (Gray)     (Gray)
```

### Search: no results
```
┌─────────────────────────────────────────┐
│                                         │
│              🏆                         │
│         (gray, larger)                  │
│                                         │
│      No achievements found              │
│                                         │
│      Try a different search term        │
│                                         │
└─────────────────────────────────────────┘
```

## Dark Mode

### Earned Badges
- Colors adapt to dark mode (darker saturated versions)
- Text remains high contrast
- Icons remain full color and opacity

### Unearned Badges
- Background: `bg-gray-800` (dark gray)
- Border: `border-gray-700` (slightly lighter)
- Text: `text-gray-400` and `text-gray-500`
- Icons: Same 30% opacity + grayscale effect

## Key Visual Indicators

### Status Indicators
1. **Earned**: Colored card + full opacity icon + earned date
2. **Unearned**: Gray card + faded icon + "Locked" text
3. **New**: Red "New!" badge appears on recently earned badges

### Icon Treatment
The "shadow replica" effect is achieved by:
```css
earned: (normal)
  - Full color emoji
  - 100% opacity
  
unearned: 
  - className="opacity-30 grayscale"
  - 30% opacity makes it faint
  - grayscale removes all color
  - Result: Looks like a shadow or ghost of the colored version
```

## Accessibility

### Color Contrast
- Earned badges use high-contrast text on colored backgrounds
- Unearned badges use consistent gray tones for readability
- "Locked" status is clearly indicated by text, not just color

### Screen Readers
- All icons have descriptive labels
- Search input has clear placeholder text
- Status indicators are text-based

### Keyboard Navigation
- All cards are focusable
- Search input is keyboard accessible
- Tab order flows logically through the page

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| Badges Shown | Earned only | All (earned + unearned) |
| Search | None | Full-text search |
| Unearned Styling | N/A | Gray + grayscale icon |
| Icon Size | 2xl | 5xl |
| Layout | Left-aligned | Center-aligned |
| Grid Columns | 1-3 | 1-4 |
| Category Header | Simple | Shows progress (X/Y) |
| Tab Label | "Earned Badges" | "All Badges" |
