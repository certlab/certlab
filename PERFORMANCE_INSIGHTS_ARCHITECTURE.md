# Performance Insights Dashboard - Architecture Diagram

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Performance Insights UI                      │
│                  (/app/performance route)                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ useQuery hooks
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TanStack Query Client                         │
│              (queryKeys, getQueryFn, caching)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ queryFn
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Storage Router                              │
│              (routes to Firestore or IndexedDB)                 │
└─────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
         ┌─────────────────┐       ┌─────────────────┐
         │ Firestore       │       │   IndexedDB     │
         │ Storage         │       │   Storage       │
         │ (cloud sync)    │       │   (local-only)  │
         └─────────────────┘       └─────────────────┘
```

## Data Flow

```
User Action (Select Time Range)
         │
         ▼
Performance Page Component
         │
         ├─► performanceSummary query ─────────┐
         ├─► performanceOverTime query ────────┤
         ├─► categoryBreakdown query ──────────┤
         ├─► studyTimeDistribution query ──────┼──► Query Client
         ├─► strengthWeaknessAnalysis query ───┤
         └─► studyConsistency query ───────────┘
                                                │
                                                ▼
                                        Storage Router
                                                │
                                                ▼
                                        Analytics Methods
                                                │
         ┌──────────────────────────────────────┴───────────────────┐
         │                                                            │
         ▼                                                            ▼
  getUserQuizzes()                                        getUserMasteryScores()
  getCategories()                                         getSubcategories()
  getUserStats()                                          ...existing methods...
         │                                                            │
         └──────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                            Aggregate & Calculate
                                    │
                                    ▼
                            Return Analytics Data
                                    │
                                    ▼
                            Render Visualizations
```

## Analytics Methods

### 1. getPerformanceOverTime
```
Input:  userId, tenantId, days
Process: Fetch quizzes → Filter by date → Group by day → Calculate averages
Output: Array<{ date, score, quizCount }>
```

### 2. getCategoryBreakdown
```
Input:  userId, tenantId
Process: Fetch mastery scores → Group by category → Group subcategories → Calculate percentages
Output: Array<{ categoryId, categoryName, score, subcategories[] }>
```

### 3. getStudyTimeDistribution
```
Input:  userId, tenantId
Process: Fetch quizzes → Calculate durations → Group by day/hour → Sum totals
Output: { totalMinutes, averageSessionMinutes, byDayOfWeek[], byTimeOfDay[] }
```

### 4. getStrengthWeaknessAnalysis
```
Input:  userId, tenantId
Process: Fetch mastery scores → Calculate percentages → Classify mastery levels → Sort by score
Output: Array<{ categoryId, subcategoryId, masteryLevel, score }>
```

### 5. getStudyConsistency
```
Input:  userId, tenantId, days
Process: Fetch quizzes → Group by date → Calculate streaks → Build calendar
Output: { currentStreak, longestStreak, activeDays, totalDays, calendar[] }
```

### 6. getPerformanceSummary
```
Input:  userId, tenantId
Process: Call other analytics methods → Aggregate results → Identify trends → Rank categories
Output: { overview, recentTrend, topCategories[], weakCategories[] }
```

## UI Component Breakdown

```
PerformanceInsightsPage
├── Header Section
│   ├── Title & Description
│   ├── Time Range Selector (7/30/60/90 days)
│   └── Export CSV Button
│
├── Overview Cards (4-column grid)
│   ├── Total Quizzes Card
│   ├── Average Score Card
│   ├── Study Time Card
│   └── Recent Trend Card
│
├── Performance Trends Section
│   └── Line Chart (performanceOverTime)
│       ├── X-axis: Date
│       ├── Y-axis: Score %
│       └── Tooltip: Date, Score, Quiz Count
│
├── Category Analysis Section (2-column grid)
│   ├── Category Performance Bar Chart
│   │   ├── X-axis: Category Name
│   │   ├── Y-axis: Score %
│   │   └── Bars: Color-coded by category
│   │
│   └── Questions Distribution Pie Chart
│       ├── Segments: Categories
│       ├── Values: Questions Answered
│       └── Labels: Category & Count
│
├── Study Time Section (2-column grid)
│   ├── Study Time by Day Bar Chart
│   │   ├── X-axis: Day of Week
│   │   ├── Y-axis: Minutes
│   │   └── Bars: Study time per day
│   │
│   └── Study Time Summary Cards
│       ├── Total Study Time
│       ├── Average Session Duration
│       ├── Current Streak
│       └── Longest Streak
│
└── Strength & Weakness Section (2-column grid)
    ├── Top Performing Categories List
    │   └── Ranked 1-3 with scores
    │
    └── Areas for Improvement List
        └── Bottom 3 categories with scores
```

## Chart Library Integration

```
Recharts Components Used:
├── LineChart
│   ├── CartesianGrid (grid lines)
│   ├── XAxis (date axis)
│   ├── YAxis (score axis)
│   ├── Tooltip (hover details)
│   ├── Legend (data series)
│   └── Line (performance data)
│
├── BarChart
│   ├── CartesianGrid
│   ├── XAxis (category/day axis)
│   ├── YAxis (score/time axis)
│   ├── Tooltip
│   └── Bar (category data)
│
└── PieChart
    ├── Pie (distribution data)
    ├── Cell (color segments)
    └── Tooltip (segment details)
```

## State Management

```
Local State (useState):
└── timeRange: '7' | '30' | '60' | '90'

Query State (useQuery):
├── performanceSummary
├── performanceOverTime (depends on timeRange)
├── categoryBreakdown
├── studyTimeDistribution
├── strengthWeaknessAnalysis
└── studyConsistency

Loading States:
├── loadingSummary
├── loadingTrends
├── loadingCategories
├── loadingTime
├── loadingStrength
└── loadingConsistency

Combined: isLoading = any loading state true
```

## Data Types Flow

```typescript
// Query Returns
performanceSummary: {
  overview: {
    totalQuizzes: number;
    totalQuestions: number;
    averageScore: number;
    passingRate: number;
    studyStreak: number;
    totalStudyTime: number;
  };
  recentTrend: 'improving' | 'stable' | 'declining';
  topCategories: Array<{ categoryId, categoryName, score }>;
  weakCategories: Array<{ categoryId, categoryName, score }>;
}

performanceOverTime: Array<{
  date: string;
  score: number;
  quizCount: number;
}>

categoryBreakdown: Array<{
  categoryId: number;
  categoryName: string;
  score: number;
  questionsAnswered: number;
  correctAnswers: number;
  subcategories: Array<{
    subcategoryId: number;
    subcategoryName: string;
    score: number;
    questionsAnswered: number;
    correctAnswers: number;
  }>;
}>

studyTimeDistribution: {
  totalMinutes: number;
  averageSessionMinutes: number;
  byDayOfWeek: Array<{ day, minutes, sessions }>;
  byTimeOfDay: Array<{ hour, minutes, sessions }>;
}

studyConsistency: {
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  totalDays: number;
  calendar: Array<{ date, quizCount, totalScore }>;
}
```

## Performance Optimizations

```
1. Query Caching
   └── Stale time: 30 seconds for user data
   └── Avoids unnecessary re-fetches

2. Code Splitting
   └── Performance page: Lazy loaded
   └── Recharts library: Separate bundle (376KB)
   └── Total lazy-loaded: ~387KB (114KB gzipped)

3. Efficient Aggregations
   └── Single-pass algorithms
   └── Map/Set for O(1) lookups
   └── Minimal data transformations

4. Responsive Charts
   └── ResponsiveContainer
   └── Automatic resize handling
   └── No manual dimension calculations
```

## Error Handling

```
Component Level:
├── isLoading check → Show loading message
├── !user check → Show login prompt
├── Empty data checks → Show empty states
└── Error boundary wrapping

Query Level:
├── enabled: !!user?.id → Prevents query without auth
├── staleTime: 30s → Reduces request frequency
└── Query client error handling

Storage Level:
├── Try-catch blocks in all methods
├── Type validation
└── Null/undefined checks
```

## Navigation Integration

```
Desktop Navigation (Header.tsx):
├── Home
├── Achievements
├── Performance ← New
└── Tools & Features

Mobile Navigation (MobileNavigationEnhanced.tsx):
├── Main Section
│   ├── Dashboard
│   ├── Achievements
│   └── Performance ← New
└── Learning Features
    └── ...

Route Configuration (App.tsx):
└── /app/performance → PerformancePage (lazy)
```

## Future Enhancements

```
Planned Features:
├── Heatmap Visualization
│   └── Topic mastery by category × difficulty
│
├── Calendar View
│   └── Interactive study day calendar
│
├── PDF Export
│   └── Formatted performance report
│
├── Shareable Snapshots
│   └── Public/private performance URLs
│
├── Advanced Metrics
│   ├── Question difficulty analysis
│   ├── Accuracy by time of day
│   ├── Learning velocity
│   ├── Retention curves
│   └── Exam readiness score
│
└── Goal Setting
    ├── Custom score targets
    ├── Study time goals
    └── Completion milestones
```

---

**Architecture Version**: 1.0
**Last Updated**: December 2024
**Maintainer**: CertLab Development Team
