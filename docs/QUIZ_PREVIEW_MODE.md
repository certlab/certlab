# Quiz Preview Mode Feature

## Overview

The Quiz Preview Mode feature allows quiz builders to experience their quizzes exactly as students will see them, without saving any data to the database. This provides a realistic simulation of the quiz-taking experience directly within the quiz builder interface.

## Features

### 1. Realistic Quiz Simulation
- **Full Quiz Interface**: Uses the same UI components as the actual quiz-taking experience
- **Working Timer**: If configured, displays and counts down the time limit
- **Question Navigation**: Forward/backward navigation through questions
- **Question Flagging**: Mark questions for review before submission
- **Answer Selection**: Select and change answers just like in a real quiz
- **Keyboard Shortcuts**: 
  - Arrow keys or N/P for next/previous question
  - F to flag/unflag question
  - Escape to exit preview
- **Mobile Swipe Gestures**: Swipe left/right to navigate on mobile devices

### 2. Non-Persistent State
- No data is saved to the database
- Results are only displayed in the preview session
- Perfect for testing quiz configuration without affecting user data

### 3. Scoring Simulation
- Calculates scores based on correct answers
- Shows pass/fail status based on configured passing score
- Displays detailed results (correct/total questions)
- Clear indication that results are preview-only

### 4. Configuration Support
- **Randomization**: Respects question and answer randomization settings
- **Time Limits**: Supports both quiz-level and per-question time limits
- **Feedback Modes**: Instant, delayed, or final feedback (instant in preview)
- **All Question Types**: Multiple choice, true/false, and more

### 5. User Experience
- Prominent preview mode indicator throughout the session
- Clear warnings that results won't be saved
- Exit confirmation to prevent accidental data loss
- Smooth transitions and interactions

## How to Use

### Accessing Preview Mode

1. Navigate to the Quiz Builder
2. Create or edit a quiz
3. Add at least one question
4. Click on the "Preview" tab
5. Click the "Launch Preview" button

### During Preview

1. **Answer Questions**: Click on answer options to select them
2. **Navigate**: Use buttons, keyboard shortcuts, or swipe gestures to move between questions
3. **Flag Questions**: Mark questions you want to review later
4. **Submit**: Complete the quiz to see simulated results
5. **Exit**: Click the X button or press Escape to exit preview

### After Submission

- View your score percentage
- See pass/fail status
- Review correct vs. total questions
- Exit preview or try again

## Technical Implementation

### Components

#### PreviewQuizInterface (`client/src/components/PreviewQuizInterface.tsx`)
Main component that provides the preview simulation:
- Uses the same quiz reducer as the real quiz interface
- Manages local state without database persistence
- Handles question randomization
- Calculates scores client-side
- Provides exit confirmation

#### Quiz Builder Integration (`client/src/pages/quiz-builder.tsx`)
Enhanced quiz builder with preview support:
- Converts builder state to Quiz and Question objects
- Validates quiz before allowing preview
- Renders PreviewQuizInterface in full-screen overlay

### State Management

The preview uses the same `quizReducer` as the real quiz interface, ensuring identical behavior. State includes:
- Current question index
- Selected answers (stored in memory only)
- Flagged questions
- Review mode status
- Feedback display

### Data Flow

```
Quiz Builder State → Preview Data Conversion → PreviewQuizInterface
                                                       ↓
                                              Local State Management
                                                       ↓
                                              Score Calculation
                                                       ↓
                                              Results Display
```

### Security

- No database writes during preview
- All state is local to the component
- No user progress or results are persisted
- Safe for testing without affecting production data

## Testing

### Unit Tests

Located in `client/src/components/PreviewQuizInterface.test.tsx`:
- Renders preview mode indicator
- Displays quiz header and questions
- Shows navigation and flag buttons
- Handles empty questions gracefully
- Respects quiz configuration

### Manual Testing Checklist

- [ ] Preview button is disabled when no questions exist
- [ ] Preview launches in full-screen overlay
- [ ] Timer counts down correctly (if configured)
- [ ] Questions can be answered and changed
- [ ] Navigation works (previous/next buttons)
- [ ] Question flagging works
- [ ] Keyboard shortcuts function properly
- [ ] Mobile swipe gestures work
- [ ] Exit confirmation appears when pressing X or Escape
- [ ] Scores are calculated correctly
- [ ] Results display properly
- [ ] No data is saved to database
- [ ] Randomization settings are respected

## Future Enhancements

Potential improvements for future versions:
1. Review incorrect answers after submission
2. Export preview results as PDF
3. Share preview link with others
4. Time-per-question tracking
5. Detailed question-by-question breakdown
6. Analytics on preview usage

## Known Limitations

1. **Feedback Modes**: Only instant feedback is currently shown in preview
2. **Advanced Question Types**: Some complex question types may have limited preview support
3. **Offline Mode**: Preview requires all quiz data to be loaded in the builder

## Support

For issues or questions about the preview mode:
1. Check the console for error messages
2. Verify that questions are properly configured
3. Ensure quiz configuration is valid
4. Report bugs via GitHub issues

## Related Documentation

- Quiz Builder Guide
- Question Types Documentation
- Quiz Configuration Options
- Testing Best Practices
