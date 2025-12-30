# Learning Velocity Chart - Implementation Documentation

## Overview
The Learning Velocity chart on the dashboard displays daily experience (XP) earned by users throughout the current week (Monday-Sunday).

## Problem Solved
Previously, the chart displayed hardcoded percentage values `[20, 35, 45, 60, 70, 75, 80]` that did not reflect actual user activity. This has been fixed to display real experience points earned from quiz completions.

## Implementation

### Experience Point Calculation
Experience points are awarded for quiz completion using the same system as `achievement-service.ts`:

| Activity | XP Earned |
|----------|-----------|
| Quiz Completion (base) | 10 XP |
| Each Correct Answer | 5 XP |
| Passing Score (≥85%) | 25 XP bonus |
| Perfect Score (100%) | 50 XP bonus |

### Example Calculations

**Example 1: Failed Quiz (5/10 correct, 50% score)**
- Base: 10 XP
- Correct answers: 5 × 5 = 25 XP
- **Total: 35 XP**

**Example 2: Passing Quiz (9/10 correct, 90% score)**
- Base: 10 XP
- Correct answers: 9 × 5 = 45 XP
- Passing bonus: 25 XP
- **Total: 80 XP**

**Example 3: Perfect Quiz (10/10 correct, 100% score)**
- Base: 10 XP
- Correct answers: 10 × 5 = 50 XP
- Passing bonus: 25 XP
- Perfect score bonus: 50 XP
- **Total: 135 XP**

### Chart Display

The chart displays 7 bars representing Monday through Sunday of the current week:

```
Y-axis: Actual XP values (scaled to max daily XP)
X-axis: Mon, Tue, Wed, Thu, Fri, Sat, Sun

Example visualization:
Max: 135 XP
     ┌────────────────────────────────┐
 135 │                    █           │
 100 │                    █       █   │
  75 │                    █   █   █   │
  50 │        █   █       █   █   █   │
  25 │    █   █   █       █   █   █   │
   0 └────────────────────────────────┘
      Mon Tue Wed Thu Fri Sat Sun
```

### Features

1. **Dynamic Scaling**: Y-axis automatically scales based on the maximum XP earned in any single day
2. **Hover Tooltips**: Hovering over a bar shows the exact XP value for that day
3. **Zero Handling**: Days with no activity show no bar (or minimal 2px bar if XP > 0)
4. **Weekly Reset**: Only shows data from the current week (Monday to today)

### Code Location

- **Main Implementation**: `client/src/pages/dashboard.tsx` (lines 313-383)
- **Chart Rendering**: `client/src/pages/dashboard.tsx` (lines 399-449)
- **Test Suite**: `client/src/pages/dashboard.test.tsx`

### Testing

The implementation includes 9 comprehensive tests covering:
- Point calculation for various quiz scenarios
- Daily aggregation logic
- Scaling and percentage conversion
- Edge cases (empty data, zero values)

Run tests with:
```bash
npm run test:run -- dashboard.test.tsx
```

## Future Enhancements

Possible improvements for future iterations:
1. Show XP breakdown on click (base + correct + bonuses)
2. Add comparison to previous week
3. Display goal/target XP per day
4. Add animation when bars update
5. Show detailed analytics on hover (quizzes completed, accuracy, etc.)
