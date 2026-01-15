# Multiple Quiz Types Support

CertLab now supports 7 different quiz question types to provide a comprehensive learning experience.

## Supported Question Types

### 1. Multiple Choice Single (MCQ)
**Default question type** - Select one correct answer from multiple options.

**Features:**
- Traditional radio button selection
- Auto-graded
- Immediate feedback with explanation
- Keyboard shortcuts: 1-5 for quick answer selection

**Schema Fields:**
- `questionType`: `'multiple_choice_single'`
- `options`: Array of option objects with id and text
- `correctAnswer`: Index of the correct option

### 2. Multiple Choice Multiple
Select all correct answers from multiple options.

**Features:**
- Checkbox selection for multiple answers
- Auto-graded
- Immediate feedback showing which answers were correct/incorrect
- Visual indication: "Select all that apply" badge

**Schema Fields:**
- `questionType`: `'multiple_choice_multiple'`
- `options`: Array of option objects
- `correctAnswers`: Array of indices for all correct options

### 3. True/False
Simple binary choice questions.

**Features:**
- Two options: True or False
- Auto-graded
- Immediate feedback
- Quick keyboard selection (1 for True, 2 for False)

**Schema Fields:**
- `questionType`: `'true_false'`
- `options`: Two options [True, False]
- `correctAnswer`: 0 (True) or 1 (False)

### 4. Fill in the Blank
Enter text to complete a statement.

**Features:**
- Text input field
- Auto-graded with case-insensitive matching
- Supports multiple accepted answers
- Automatic whitespace trimming

**Schema Fields:**
- `questionType`: `'fill_in_blank'`
- `acceptedAnswers`: Array of acceptable text answers

**Example:**
```typescript
{
  questionType: 'fill_in_blank',
  text: 'The capital of France is ___.',
  acceptedAnswers: ['Paris', 'paris', 'PARIS']
}
```

### 5. Short Answer
Free-form text response for complex answers.

**Features:**
- Multi-line textarea for detailed responses
- Manual grading by instructor (flag: `requiresManualGrading: true`)
- Optional auto-grading with accepted answers
- Special badge indicating manual review required

**Schema Fields:**
- `questionType`: `'short_answer'`
- `requiresManualGrading`: Boolean flag
- `acceptedAnswers`: (Optional) For auto-graded short answers

### 6. Matching
Match items from two columns.

**Features:**
- Click-based pairing interface
- Keyboard navigation (arrow keys, Escape)
- Auto-graded
- Visual feedback for correct/incorrect matches
- Progress indicator showing matched pairs

**Schema Fields:**
- `questionType`: `'matching'`
- `matchingPairs`: Array of objects with `{ id, left, right }`

**Keyboard Controls:**
- Click left item, then right item to create match
- Arrow Up/Down: Navigate between left items
- Escape: Deselect current item

### 7. Ordering
Arrange items in the correct sequence.

**Features:**
- Drag-and-drop style reordering with arrow buttons
- Keyboard navigation (arrow keys, J/K vim keys)
- Auto-graded
- Visual position indicators
- Immediate feedback on sequence correctness

**Schema Fields:**
- `questionType`: `'ordering'`
- `orderingItems`: Array of objects with `{ id, text, correctPosition }`

**Keyboard Controls:**
- Click to select item
- Arrow Up/K: Move selected item up
- Arrow Down/J: Move selected item down
- Escape: Deselect item

## Grading System

All question types are auto-graded except for short answer questions with `requiresManualGrading: true`.

### Grading Logic

The grading system is implemented in `client/src/lib/quiz-grading.ts`:

```typescript
import { gradeQuestion } from '@/lib/quiz-grading';

// Grade any question type
const result = gradeQuestion(question, userAnswer);
// Returns: { isCorrect: boolean, details?: string }
```

**Grading Behavior:**
- **MCQ Single/True-False**: Exact match with correctAnswer
- **MCQ Multiple**: All correct answers selected, no incorrect ones
- **Fill-in-Blank**: Case-insensitive match with any acceptedAnswer
- **Short Answer**: Manual grading or optional auto-grading with accepted answers
- **Matching**: All pairs correctly matched
- **Ordering**: All items in correct sequence positions

## Components

### Question Display Components

Each question type has its own React component:

```
client/src/components/quiz/
├── QuestionDisplay.tsx          # Router component
├── FillInBlankQuestion.tsx
├── ShortAnswerQuestion.tsx
├── MatchingQuestion.tsx
├── OrderingQuestion.tsx
└── MultipleChoiceMultiple.tsx
```

The `QuestionDisplay` component automatically routes to the correct question type component based on `question.questionType`.

## Usage Example

### Creating Questions

```typescript
// Multiple Choice Single
const mcqSingle = {
  questionType: 'multiple_choice_single',
  text: 'What is 2 + 2?',
  options: [
    { id: 0, text: '3' },
    { id: 1, text: '4' },
    { id: 2, text: '5' },
  ],
  correctAnswer: 1,
  explanation: '2 + 2 equals 4.'
};

// Fill in the Blank
const fillInBlank = {
  questionType: 'fill_in_blank',
  text: 'HTTP stands for ___.',
  acceptedAnswers: ['HyperText Transfer Protocol', 'Hypertext Transfer Protocol'],
  explanation: 'HTTP is the protocol used for web communication.'
};

// Matching
const matching = {
  questionType: 'matching',
  text: 'Match each animal with its sound:',
  matchingPairs: [
    { id: 0, left: 'Cat', right: 'Meow' },
    { id: 1, left: 'Dog', right: 'Bark' },
    { id: 2, left: 'Cow', right: 'Moo' },
  ],
  explanation: 'Each animal has a distinctive sound.'
};

// Ordering
const ordering = {
  questionType: 'ordering',
  text: 'Arrange these events in chronological order:',
  orderingItems: [
    { id: 0, text: 'Renaissance', correctPosition: 0 },
    { id: 1, text: 'Industrial Revolution', correctPosition: 1 },
    { id: 2, text: 'Digital Age', correctPosition: 2 },
  ],
  explanation: 'These are major historical periods in order.'
};
```

### Quiz Taking

Questions are automatically displayed with the correct interface based on their type. No additional code is needed:

```tsx
import { QuestionDisplay } from '@/components/quiz';

function QuizPage({ question, state, onAnswerChange }) {
  return (
    <QuestionDisplay
      question={question}
      state={state}
      onAnswerChange={onAnswerChange}
    />
  );
}
```

## Accessibility

All question types support:
- **Keyboard navigation**: Full quiz experience without a mouse
- **Screen reader compatibility**: ARIA labels and roles
- **Focus management**: Clear focus indicators
- **High contrast**: Works with dark mode and accessibility themes

## Validation

Question validation is built into the schema (`shared/schema.ts`):

```typescript
import { insertQuestionSchema } from '@shared/schema';

// Validates question based on type
const result = insertQuestionSchema.safeParse(questionData);
if (!result.success) {
  console.error(result.error.errors);
}
```

**Type-Specific Validation:**
- MCQ: Requires options and correctAnswer
- MCQ Multiple: Requires options and correctAnswers array
- Fill-in-Blank: Requires acceptedAnswers array
- Matching: Requires at least 2 matchingPairs
- Ordering: Requires at least 2 orderingItems

## Future Enhancements

**Phase 4: Question Creation UI** (In Progress)
- QuizBuilder updates for all question types
- Question Bank management interface
- Type-specific form fields

**Phase 5: Instructor Review** (Planned)
- Dashboard for reviewing short answer questions
- Grading interface with rubrics
- Feedback system for manual grading

## Testing

Unit tests for grading logic: `client/src/lib/quiz-grading.test.ts`

Run tests:
```bash
npm run test:run
```

## Schema Reference

See `shared/schema.ts` for complete type definitions:
- `QuestionType`: Enum of all question types
- `MatchingPair`: Type for matching questions
- `OrderingItem`: Type for ordering questions
- `insertQuestionSchema`: Validation schema with type-specific rules
