# Learning Velocity Chart: Visual Comparison

## Before (Current Week - 7 Days)

```
┌───────────────────────────────────────────────────┐
│   Learning Velocity                               │
├───────────────────────────────────────────────────┤
│                                                   │
│   100 │                             █             │
│    75 │                    █        █             │
│    50 │          █         █        █             │
│    25 │    █     █    █    █   █    █             │
│     0 └─────────────────────────────────────      │
│        Mon  Tue  Wed  Thu  Fri  Sat  Sun          │
│                                                   │
│   Shows: Current week (Monday-Sunday)             │
│   Labels: Day names                               │
│   Length: 7 days                                  │
└───────────────────────────────────────────────────┘
```

## After (Last 10 Days - Rolling Window)

```
┌────────────────────────────────────────────────────────────┐
│   Learning Velocity                                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   100 │                              █           █         │
│    75 │                              █     █     █         │
│    50 │                              █     █     █         │
│    25 │      █                       █     █     █    █    │
│     0 └──────────────────────────────────────────────      │
│        1/1  1/2  1/3  1/4  1/5  1/6  1/7  1/8  1/9  1/10   │
│                                                            │
│   Shows: Last 10 days (rolling window)                     │
│   Labels: Actual dates (M/D format)                        │
│   Length: 10 days                                          │
│   Zero handling: Days with no activity show 0              │
└────────────────────────────────────────────────────────────┘
```

## Key Differences

| Feature | Before | After |
|---------|--------|-------|
| **Time Window** | Current week (Mon-Sun) | Last 10 days (rolling) |
| **Array Size** | 7 elements | 10 elements |
| **Start Date** | Monday of current week | Today - 9 days |
| **End Date** | Today | Today |
| **Labels** | Day names (Mon, Tue, Wed...) | Dates (1/1, 1/2, 1/3...) |
| **Zero Values** | Shown as 0 | Explicitly shown as 0 |
| **Updates** | Weekly reset on Monday | Daily rolling update |

## Example Scenarios

### Scenario 1: User with Regular Activity
```
10-Day View:
  135 │    █                   █                      █
  100 │    █        █          █           █          █
   75 │    █        █          █     █     █          █
   50 │    █        █          █     █     █          █
   25 │    █        █     █    █     █     █     █    █
    0 └─────────────────────────────────────────────────
       1/1  1/2  1/3  1/4  1/5  1/6  1/7  1/8  1/9 1/10

Pattern: Consistent daily activity with some variation
```

### Scenario 2: User with Sporadic Activity
```
10-Day View:
  135 │                        █
  100 │                        █
   75 │                        █
   50 │                        █
   25 │                        █
    0 └─────────────────────────────────────────────────
       1/1  1/2  1/3  1/4  1/5  1/6  1/7  1/8  1/9 1/10

Pattern: Most activity on 1/5, other days show 0
Zero values clearly visible
```

### Scenario 3: User Building Momentum
```
10-Day View:
  100 │                                        █      █
   75 │                                   █    █      █
   50 │                              █    █    █      █
   25 │                         █    █    █    █      █
    0 └─────────────────────────────────────────────────
       1/1  1/2  1/3  1/4  1/5  1/6  1/7  1/8  1/9 1/10

Pattern: Increasing activity trend visible
Days 1/1-1/5 show 0 (clearly marked)
```

## Benefits of 10-Day View

1. **Better Trend Visibility**
   - Longer history shows patterns more clearly
   - Easier to spot consistency or gaps
   - 3 extra days of data vs. 7-day view

2. **No Week Boundary Issues**
   - Rolling window means no reset on Mondays
   - Continuous history regardless of calendar week
   - Today always shows in same position (rightmost)

3. **Clearer Date Context**
   - Actual dates remove ambiguity
   - "1/5" is clearer than "Wed" (which Wednesday?)
   - Easier to correlate with external events

4. **Zero Value Clarity**
   - Inactive days explicitly show 0
   - No confusion about missing data
   - Clear visual gap in activity

5. **User Motivation**
   - Longer history shows progress over time
   - More data points to maintain streaks
   - Better feedback loop for consistency

## Technical Notes

- XP calculation logic unchanged
- Same point system as achievement service
- Dynamic Y-axis scaling (unchanged)
- Hover tooltips show exact XP (unchanged)
- Zero values render with no bar height (unchanged)

## Implementation Status

✅ Code updated in `client/src/pages/dashboard.tsx`
✅ Tests updated in `client/src/pages/dashboard.test.tsx`
✅ All 9 tests passing
✅ TypeScript check passes
✅ Build successful
✅ Documentation updated
