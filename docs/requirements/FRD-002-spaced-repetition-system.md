# FRD-002: Spaced Repetition System (SRS)

## Metadata

| Field | Value |
|-------|-------|
| **FRD ID** | FRD-002 |
| **Feature Name** | Spaced Repetition System (SRS) |
| **Priority** | High |
| **Status** | Planned |
| **Target Release** | Q2 2025 |
| **Complexity** | High |
| **Estimated Effort** | 25-30 developer-days |
| **Owner** | Backend/Algorithm Team |
| **Related FRDs** | FRD-001 (Flashcard Mode) |
| **Dependencies** | Flashcard Mode, Quiz System |

## Overview

### Purpose
Implement scientifically-proven spaced repetition algorithm (SM-2) to optimize long-term retention by scheduling reviews at optimal intervals based on user performance.

### Business Value
- 40-60% more efficient than traditional study methods
- Improves long-term retention (>80% after 1 year)
- Reduces total study time while improving outcomes
- Competitive advantage through evidence-based learning

### User Impact
- Automated review scheduling eliminates guesswork
- Focuses effort on weakest areas
- Prevents forgetting through timely reviews
- Clear daily review goals

### Technical Impact
- New algorithm service for interval calculation
- Review scheduling system
- Integration with flashcards and quizzes
- Background processing for due date calculations

## User Stories

```
As a student preparing for certification,
I want the system to automatically schedule my reviews,
So that I can focus on studying instead of planning what to review.
```

```
As a busy professional,
I want to see my due reviews each day,
So that I can efficiently use my limited study time.
```

```
As a user tracking progress,
I want to see my retention rate and upcoming reviews,
So that I can plan my study schedule.
```

## Functional Requirements

### Must Have (P0)

- [ ] **FR-1**: Implement SM-2 algorithm for interval calculation
  - Acceptance: Algorithm calculates next review date based on difficulty rating (1-4)
  - Example: "Easy" rating (4) increases interval by 2.5x, "Hard" rating (2) reduces interval

- [ ] **FR-2**: Track review history per card/question
  - Acceptance: System stores all reviews with timestamp, rating, and next review date
  - Example: Card reviewed 3 times with ratings [3, 4, 3] and calculated intervals

- [ ] **FR-3**: Daily due reviews dashboard
  - Acceptance: Homepage shows count of due reviews and "Start Reviewing" button
  - Example: "25 cards due for review today"

- [ ] **FR-4**: Review queue management
  - Acceptance: System prioritizes overdue cards, then due cards, sorted by priority
  - Example: Cards due yesterday appear before cards due today

- [ ] **FR-5**: Performance-based interval adjustment
  - Acceptance: Repeated failures reduce ease factor, successes increase it
  - Example: Card failed 3 times has shorter intervals than card passed 3 times

- [ ] **FR-6**: Integration with flashcard mode
  - Acceptance: Flashcard sessions respect SRS scheduling
  - Example: User clicks "Review Due Cards" and sees only due cards

### Should Have (P1)

- [ ] **FR-7**: Customizable scheduling parameters
  - Acceptance: Users can adjust intervals, maximum interval, ease factor
  - Example: User sets max interval to 180 days instead of default 365

- [ ] **FR-8**: Learning/relearning modes
  - Acceptance: New cards have shorter intervals (10m, 1d, 3d) before graduating
  - Example: First-time card shows again in 10 minutes if rated "Good"

- [ ] **FR-9**: SRS statistics dashboard
  - Acceptance: Show retention curve, review forecast, mature cards count
  - Example: Graph showing 85% retention rate over 90 days

## Technical Specifications

### Architecture

```
┌─────────────────────────────────────────┐
│         DueReviewsDashboard              │
│  - Display due count                     │
│  - Start review session                  │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│         SRSService                       │
│  - SM-2 algorithm implementation         │
│  - Interval calculation                  │
│  - Review scheduling                     │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│         ReviewScheduler                  │
│  - Queue management                      │
│  - Priority sorting                      │
│  - Due date calculation                  │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│      IndexedDB (Reviews Store)           │
│  - Review history                        │
│  - Card metadata (ease, interval)        │
└─────────────────────────────────────────┘
```

### Components

#### SRSService
- **Location**: `client/src/lib/srs-service.ts`
- **Purpose**: Core SM-2 algorithm implementation
- **Methods**:
  ```typescript
  class SRSService {
    /**
     * Calculate next review interval using SM-2 algorithm
     * @param cardId - Card identifier
     * @param rating - User rating (1-4)
     * @param previousReview - Last review data
     * @returns Next review date and updated ease factor
     */
    calculateNextReview(
      cardId: string,
      rating: DifficultyRating,
      previousReview: ReviewData | null
    ): NextReviewResult {
      const ease = this.calculateEaseFactor(rating, previousReview?.ease);
      const interval = this.calculateInterval(rating, previousReview?.interval, ease);
      const nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
      
      return {
        nextReviewDate,
        interval,
        ease,
        repetitions: (previousReview?.repetitions || 0) + 1
      };
    }
    
    /**
     * SM-2 ease factor calculation
     * EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
     * where q = quality (rating), EF = ease factor
     */
    private calculateEaseFactor(
      rating: DifficultyRating,
      currentEase: number = 2.5
    ): number {
      const q = rating; // 1-4 scale
      const newEase = currentEase + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
      return Math.max(1.3, newEase); // Minimum ease factor of 1.3
    }
    
    /**
     * Calculate interval in days based on SM-2 algorithm
     */
    private calculateInterval(
      rating: DifficultyRating,
      previousInterval: number = 0,
      ease: number
    ): number {
      if (rating < 3) {
        // Failed: restart from 1 day
        return 1;
      }
      
      if (previousInterval === 0) {
        // First review
        return rating === 3 ? 1 : 6; // Good = 1 day, Easy = 6 days
      }
      
      if (previousInterval === 1) {
        // Second review
        return rating === 3 ? 6 : 10;
      }
      
      // Subsequent reviews: multiply by ease factor
      return Math.round(previousInterval * ease);
    }
    
    /**
     * Get all due reviews for user
     */
    async getDueReviews(userId: string): Promise<DueReview[]> {
      const now = new Date();
      const reviews = await storage.getReviewsByUser(userId);
      return reviews.filter(r => r.nextReviewDate <= now);
    }
    
    /**
     * Get review forecast for next N days
     */
    async getReviewForecast(userId: string, days: number): Promise<ForecastData> {
      const reviews = await storage.getReviewsByUser(userId);
      const forecast = Array(days).fill(0);
      
      reviews.forEach(review => {
        const daysUntilDue = Math.floor(
          (review.nextReviewDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        );
        if (daysUntilDue >= 0 && daysUntilDue < days) {
          forecast[daysUntilDue]++;
        }
      });
      
      return {
        dates: Array(days).fill(0).map((_, i) => 
          new Date(Date.now() + i * 24 * 60 * 60 * 1000)
        ),
        counts: forecast
      };
    }
  }
  ```

## Data Models

```typescript
/**
 * Review metadata for SRS
 */
interface ReviewData {
  id: string;
  cardId: string;
  userId: string;
  rating: DifficultyRating;        // 1-4 scale
  reviewedAt: Date;
  nextReviewDate: Date;
  interval: number;                 // Days until next review
  ease: number;                     // Ease factor (1.3-2.5+)
  repetitions: number;              // Total review count
  lapses: number;                   // Times failed
  state: CardState;                 // new, learning, review, relearning
}

/**
 * Card learning state
 */
type CardState = 'new' | 'learning' | 'review' | 'relearning';

/**
 * Difficulty rating (SM-2 quality scale)
 */
type DifficultyRating = 1 | 2 | 3 | 4;
// 1 = Again (complete blackout)
// 2 = Hard (incorrect but remembered with difficulty)
// 3 = Good (correct with some hesitation)
// 4 = Easy (perfect response)

/**
 * Next review calculation result
 */
interface NextReviewResult {
  nextReviewDate: Date;
  interval: number;
  ease: number;
  repetitions: number;
}

/**
 * Review forecast data
 */
interface ForecastData {
  dates: Date[];
  counts: number[];
}
```

### Database Schema

#### Extended CardReview Store
```typescript
interface CardReviewDocument {
  id: string;
  cardId: string;
  userId: string;
  tenantId: string;
  
  // SRS data
  rating: DifficultyRating;
  reviewedAt: Date;
  nextReviewDate: Date;
  interval: number;
  ease: number;
  repetitions: number;
  lapses: number;
  state: CardState;
  
  // Performance data
  timeSpent: number;
  wasCorrect: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Indexes
const indexes = [
  { name: 'byNextReview', keyPath: ['userId', 'nextReviewDate'] },
  { name: 'byCard', keyPath: 'cardId' },
  { name: 'byState', keyPath: ['userId', 'state'] }
];
```

## UI/UX Specifications

### Component: DueReviewsWidget
```typescript
// Dashboard widget showing due reviews
interface DueReviewsWidgetProps {
  userId: string;
}

function DueReviewsWidget({ userId }: DueReviewsWidgetProps) {
  const { data: dueCount } = useQuery({
    queryKey: ['due-reviews', userId],
    queryFn: () => srsService.getDueReviews(userId).then(r => r.length)
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Due Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold">{dueCount}</div>
        <p className="text-muted-foreground">cards waiting</p>
        <Button onClick={() => navigate('/app/flashcards/review')}>
          Start Reviewing
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Component: ReviewForecast
```typescript
// Chart showing upcoming reviews
function ReviewForecast({ userId, days = 7 }: Props) {
  const { data: forecast } = useQuery({
    queryKey: ['review-forecast', userId, days],
    queryFn: () => srsService.getReviewForecast(userId, days)
  });
  
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={forecast}>
        <XAxis dataKey="date" />
        <YAxis />
        <Bar dataKey="count" fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

## Testing Requirements

### Unit Tests

```typescript
describe('SRSService', () => {
  describe('calculateEaseFactor', () => {
    it('should increase ease for easy rating', () => {
      const service = new SRSService();
      const ease = service['calculateEaseFactor'](4, 2.5);
      expect(ease).toBeGreaterThan(2.5);
    });
    
    it('should decrease ease for hard rating', () => {
      const service = new SRSService();
      const ease = service['calculateEaseFactor'](2, 2.5);
      expect(ease).toBeLessThan(2.5);
    });
    
    it('should not go below minimum ease', () => {
      const service = new SRSService();
      const ease = service['calculateEaseFactor'](1, 1.3);
      expect(ease).toBeGreaterThanOrEqual(1.3);
    });
  });
  
  describe('calculateInterval', () => {
    it('should reset to 1 day on failure', () => {
      const service = new SRSService();
      const interval = service['calculateInterval'](1, 10, 2.5);
      expect(interval).toBe(1);
    });
    
    it('should multiply previous interval for success', () => {
      const service = new SRSService();
      const interval = service['calculateInterval'](3, 6, 2.5);
      expect(interval).toBe(Math.round(6 * 2.5));
    });
  });
  
  describe('getDueReviews', () => {
    it('should return only due reviews', async () => {
      const service = new SRSService();
      const dueReviews = await service.getDueReviews('user-1');
      dueReviews.forEach(review => {
        expect(review.nextReviewDate.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });
  });
});
```

### Acceptance Criteria

- [ ] **AC-1**: Given a card rated "Good" (3) for first time, when reviewing next day, then interval should be 1 day
- [ ] **AC-2**: Given a card rated "Easy" (4) three times, when calculating next review, then interval should be increasing exponentially
- [ ] **AC-3**: Given a card rated "Again" (1), when reviewing, then interval resets to 1 day
- [ ] **AC-4**: Given 50 due reviews, when user completes 25, then dashboard shows 25 remaining
- [ ] **AC-5**: Performance: Due review calculation completes in < 500ms for 1000 cards
- [ ] **AC-6**: Algorithm accuracy: SM-2 calculations match reference implementation

## Implementation Checklist

### Phase 1: Algorithm Implementation (5 days)
- [ ] Create `srs-service.ts` with SM-2 algorithm
- [ ] Implement ease factor calculation
- [ ] Implement interval calculation
- [ ] Implement review scheduling logic
- [ ] Add comprehensive unit tests for algorithm

### Phase 2: Storage Layer (3 days)
- [ ] Extend CardReview interface with SRS fields
- [ ] Add indexes for efficient queries
- [ ] Implement `getDueReviews()` query
- [ ] Implement `getReviewForecast()` query
- [ ] Migration script for existing reviews

### Phase 3: Integration with Flashcards (4 days)
- [ ] Update flashcard review flow to use SRS
- [ ] Show rating buttons (Again/Hard/Good/Easy)
- [ ] Calculate and store next review date
- [ ] Filter cards by due date in flashcard mode

### Phase 4: Dashboard Widgets (3 days)
- [ ] Create DueReviewsWidget component
- [ ] Create ReviewForecast chart
- [ ] Add to dashboard page
- [ ] Implement "Start Reviewing" flow

### Phase 5: Settings & Customization (2 days)
- [ ] Add SRS settings page
- [ ] Allow customization of intervals
- [ ] Allow customization of ease factor
- [ ] Add reset/recalculate option

### Phase 6: Testing & Optimization (3 days)
- [ ] Write integration tests
- [ ] Performance testing with large datasets
- [ ] Algorithm validation against reference
- [ ] Edge case testing

### Phase 7: Documentation (2 days)
- [ ] User guide for SRS
- [ ] Explanation of algorithm
- [ ] Best practices document
- [ ] Developer documentation

## Dependencies

### Required Libraries
None (pure TypeScript implementation)

### Internal Dependencies
- Flashcard Mode (FRD-001)
- IndexedDB storage
- Chart library (Recharts) for forecast visualization

## Success Metrics

### Quantitative
- **Retention**: >80% retention rate at 30 days
- **Efficiency**: 30%+ reduction in study time for SRS users
- **Adoption**: >50% of active users use SRS
- **Completion**: >80% of due reviews completed daily

### Qualitative
- User feedback score >4.5/5.0
- "Made studying more efficient" feedback
- Reduced anxiety about forgetting

## References

- [SuperMemo SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2)
- [Anki Manual - Deck Options](https://docs.ankiweb.net/deck-options.html)
- [Spaced Repetition Research](https://www.gwern.net/Spaced-repetition)

---

**Document Version**: 1.0  
**Last Updated**: 2024-12-22  
**Author**: AI Agent  
**Status**: Draft - Ready for Review
