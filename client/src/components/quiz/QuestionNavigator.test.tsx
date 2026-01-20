import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QuestionNavigator } from './QuestionNavigator';
import type { Question, QuizState } from './types';

describe('QuestionNavigator component snapshots', () => {
  const mockQuestions: Question[] = [
    {
      id: 1,
      text: 'Question 1',
      type: 'multiple-choice',
      options: ['A', 'B'],
      correctAnswer: 'A',
    } as Question,
    {
      id: 2,
      text: 'Question 2',
      type: 'multiple-choice',
      options: ['A', 'B'],
      correctAnswer: 'B',
    } as Question,
    {
      id: 3,
      text: 'Question 3',
      type: 'multiple-choice',
      options: ['A', 'B'],
      correctAnswer: 'A',
    } as Question,
  ];

  const mockState: QuizState = {
    currentQuestionIndex: 0,
    answers: {},
    flaggedQuestions: new Set(),
    selectedAnswer: undefined,
    showFeedback: false,
    isCorrect: false,
    isReviewingFlagged: false,
    currentFlaggedIndex: 0,
    flaggedQuestionIndices: [],
  };

  it('renders QuestionNavigator with unanswered questions', () => {
    const { container } = render(
      <QuestionNavigator questions={mockQuestions} state={mockState} onNavigate={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders QuestionNavigator with answered questions', () => {
    const stateWithAnswers: QuizState = {
      ...mockState,
      answers: { 1: 0, 2: 1 },
    };
    const { container } = render(
      <QuestionNavigator questions={mockQuestions} state={stateWithAnswers} onNavigate={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders QuestionNavigator with flagged questions', () => {
    const stateWithFlagged: QuizState = {
      ...mockState,
      flaggedQuestions: new Set([1, 3]),
      currentQuestionIndex: 1,
    };
    const { container } = render(
      <QuestionNavigator questions={mockQuestions} state={stateWithFlagged} onNavigate={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders QuestionNavigator with mixed states', () => {
    const complexState: QuizState = {
      currentQuestionIndex: 1,
      answers: { 1: 0 },
      flaggedQuestions: new Set([3]),
      selectedAnswer: undefined,
      showFeedback: false,
      isCorrect: false,
      isReviewingFlagged: false,
      currentFlaggedIndex: 0,
      flaggedQuestionIndices: [2],
    };
    const { container } = render(
      <QuestionNavigator questions={mockQuestions} state={complexState} onNavigate={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
