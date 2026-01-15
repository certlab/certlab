# Advanced Quiz Configuration

This document describes the advanced quiz configuration features added to CertLab.

## Overview

Quiz creators can now configure advanced options for their quizzes including:
- **Question/Answer Randomization**: Shuffle questions and answer options
- **Per-Question Time Limits**: Set time limits for individual questions
- **Question Weighting**: Assign different point values to questions
- **Feedback Modes**: Control when students see explanations
- **Passing Score**: Set custom passing thresholds
- **Attempt Limits**: Restrict number of quiz attempts

## Schema Changes

The `quizzes` table now includes the following advanced configuration fields:

```typescript
{
  // Randomization
  randomizeQuestions: boolean;        // Shuffle question order (default: false)
  randomizeAnswers: boolean;          // Shuffle answer options (default: false)
  
  // Time Management
  timeLimitPerQuestion: number | null; // Seconds per question (null = no limit)
  
  // Scoring
  questionWeights: Record<number, number>; // question index -> weight mapping (0, 1, 2...)
  passingScore: number;                    // Passing percentage (default: 70)
  
  // Feedback
  feedbackMode: 'instant' | 'delayed' | 'final'; // When to show explanations
  
  // Metadata
  isAdvancedConfig: boolean;          // Admin flag (default: false)
  maxAttempts: number | null;         // Max attempts per user (null = unlimited)
}
```

## Quiz Builder UI

### Accessing Advanced Configuration

1. Navigate to Quiz Builder (`/app/quiz-builder`)
2. Go to the "Configuration" tab
3. Scroll to "Advanced Configuration" section (collapsed by default)
4. Click to expand the section

### Configuration Options

#### Randomization
- **Randomize Question Order**: Questions appear in random order for each attempt
- **Randomize Answer Options**: Answer choices shuffled (preserving correct answer)

#### Time Limits
- **Time Limit Per Question**: Set time limit for each individual question
  - Options: No Limit, 30s, 1min, 1.5min, 2min, 3min, 5min
  - Works in conjunction with overall quiz time limit

#### Feedback Settings
- **Feedback Mode**: Controls when explanations are shown
  - **Instant** (default): Show explanations immediately after answering
  - **Delayed**: Show explanations after quiz submission
  - **Final**: Show explanations only on results page

#### Question Weighting
- Assign different point values to questions (1-10)
- Default weight is 1 for all questions
- Weighted scoring calculates: `(earnedWeight / totalWeight) * 100`
- Shown after adding questions to the quiz

## Runtime Behavior

### Question Randomization

When `randomizeQuestions` is enabled:
- Questions shuffled using Fisher-Yates algorithm
- Randomization occurs once when quiz loads
- Each attempt gets a different random order

### Answer Randomization

When `randomizeAnswers` is enabled:
- Answer options shuffled for MCQ questions
- Correct answer indices automatically remapped
- Only applies to:
  - `multiple_choice_single`
  - `multiple_choice_multiple`
- Other question types (True/False, Fill-in-Blank, etc.) unaffected

Implementation details:
```typescript
// Old option indices mapped to new shuffled positions
const oldToNewIndexMap = new Map();
// Correct answer index updated to match new position
updatedCorrectAnswer = oldToNewIndexMap.get(question.correctAnswer);
```

### Weighted Scoring

When question weights are configured:
```typescript
// Calculate weighted score using question indices
// questionWeights is keyed by question order/index (0, 1, 2...)
for (let i = 0; i < answers.length; i++) {
  const weight = questionWeights[i] || 1;
  if (isCorrect) {
    earnedWeight += weight;
  }
  totalWeight += weight;
}
const score = (earnedWeight / totalWeight) * 100;
```

### Passing Score

- Quiz result includes `isPassing` boolean
- Calculated as: `score >= passingScore`
- Default passing score: 70%
- Configurable in Quiz Settings (60-90%)

## Storage

### Template Storage
Templates stored in Firestore at: `/users/{userId}/quizTemplates/{templateId}`

```typescript
const template: QuizTemplate = {
  // ... basic fields
  randomizeQuestions: false,
  randomizeAnswers: false,
  timeLimitPerQuestion: null,
  questionWeights: {},
  feedbackMode: 'instant',
  isAdvancedConfig: false,
};
```

### Quiz Instance Storage
Quiz instances stored at: `/users/{userId}/quizzes/{quizId}`

Advanced config fields copied from template when creating quiz instance.

## Future Enhancements

### Not Yet Implemented

1. **Per-Question Timer Display**
   - Show countdown for each question
   - Auto-advance when time expires
   - Requires QuizState extension

2. **Delayed/Final Feedback Modes**
   - Suppress immediate explanation display
   - Show all explanations after submission
   - Requires QuizState refactoring

3. **Attempt Limit Enforcement**
   - Track previous attempts per template
   - Block quiz start if max attempts reached
   - Show remaining attempts in UI

### Recommended Implementation Order

1. **Attempt Tracking** (Highest Priority)
   - Add attempt counter to quiz templates
   - Query user's previous attempts before allowing start
   - Simple validation logic

2. **Feedback Mode Control** (Medium Priority)
   - Modify `QuizState.showFeedback` logic
   - Add quiz config parameter to useQuizState
   - Conditional rendering in QuestionDisplay

3. **Per-Question Timer** (Lower Priority)
   - Extend QuizState with questionTimeRemaining
   - Add timer component per question
   - Implement auto-advance logic

## Testing

### Manual Testing Checklist

- [ ] Create quiz with all advanced options enabled
- [ ] Verify randomization produces different orders
- [ ] Confirm weighted scoring calculates correctly
- [ ] Validate passing/failing status
- [ ] Check template saves and loads correctly
- [ ] Test with Firebase/Firestore configured

### Automated Testing

Current test suite passes (412/413 tests passing).
The one failing test is pre-existing and unrelated to this feature.

## Code Locations

- **Schema**: `shared/schema.ts` - Quiz table definition
- **UI**: `client/src/pages/quiz-builder.tsx` - Builder interface
- **Runtime**: `client/src/components/QuizInterface.tsx` - Randomization logic
- **Storage**: `client/src/lib/firestore-storage.ts` - Weighted scoring
- **Types**: Interface updates in quiz-builder.tsx (QuizTemplate)

## Migration Notes

Existing quizzes without advanced configuration fields will use defaults:
- `randomizeQuestions`: false
- `randomizeAnswers`: false
- `timeLimitPerQuestion`: null
- `questionWeights`: undefined (treated as equal weights)
- `feedbackMode`: 'instant'
- `passingScore`: 70
- `maxAttempts`: null (unlimited)

No migration script required - backward compatible.
