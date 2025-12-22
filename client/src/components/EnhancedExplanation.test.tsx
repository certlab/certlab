import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnhancedExplanation } from './EnhancedExplanation';
import type { Question } from '@shared/schema';

describe('EnhancedExplanation', () => {
  const baseQuestion: Question = {
    id: 1,
    tenantId: 1,
    categoryId: 1,
    subcategoryId: 1,
    text: 'What is the CIA triad?',
    options: [
      { id: 0, text: 'Confidentiality, Integrity, Availability' },
      { id: 1, text: 'Compliance, Intelligence, Analysis' },
      { id: 2, text: 'Central Intelligence Agency' },
      { id: 3, text: 'Certified Information Auditor' },
    ],
    correctAnswer: 0,
    explanation: 'The CIA triad represents the three main principles of information security.',
    difficultyLevel: 1,
    tags: null,
    explanationSteps: null,
    referenceLinks: null,
    videoUrl: null,
    communityExplanations: null,
    explanationVotes: 0,
    hasAlternativeViews: false,
  };

  it('renders basic explanation (V1 fallback)', () => {
    render(<EnhancedExplanation question={baseQuestion} isCorrect={true} />);

    expect(screen.getByText(/Why this is correct/i)).toBeInTheDocument();
    expect(screen.getByText(/The CIA triad represents/i)).toBeInTheDocument();
  });

  it('renders step-by-step explanations (V2)', () => {
    const questionWithSteps: Question = {
      ...baseQuestion,
      explanationSteps: [
        'Confidentiality ensures information is accessible only to authorized individuals',
        'Integrity guarantees data remains accurate and unmodified',
        'Availability ensures systems are accessible when needed',
      ],
    };

    render(<EnhancedExplanation question={questionWithSteps} isCorrect={true} />);

    expect(screen.getByText(/Step-by-Step Breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidentiality ensures/i)).toBeInTheDocument();
    expect(screen.getByText(/Integrity guarantees/i)).toBeInTheDocument();
    expect(screen.getByText(/Availability ensures/i)).toBeInTheDocument();
  });

  it('renders reference links (V2)', () => {
    const questionWithLinks: Question = {
      ...baseQuestion,
      referenceLinks: [
        {
          title: 'NIST Guide to Security',
          url: 'https://csrc.nist.gov/publications',
          type: 'documentation',
        },
        {
          title: 'Understanding CIA Triad',
          url: 'https://example.com/cia-triad',
          type: 'article',
        },
      ],
    };

    render(<EnhancedExplanation question={questionWithLinks} isCorrect={true} />);

    expect(screen.getByText(/Study Materials/i)).toBeInTheDocument();
    expect(screen.getByText('NIST Guide to Security')).toBeInTheDocument();
    expect(screen.getByText('Understanding CIA Triad')).toBeInTheDocument();
  });

  it('renders video explanation (V2)', () => {
    const questionWithVideo: Question = {
      ...baseQuestion,
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };

    render(<EnhancedExplanation question={questionWithVideo} isCorrect={false} />);

    expect(screen.getByText(/Video Explanation/i)).toBeInTheDocument();
    const iframe = screen.getByTitle('Video explanation');
    expect(iframe).toHaveAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('handles malformed video URLs gracefully', () => {
    const questionWithMalformedVideo: Question = {
      ...baseQuestion,
      videoUrl: 'not-a-valid-url',
    };

    render(<EnhancedExplanation question={questionWithMalformedVideo} isCorrect={true} />);

    expect(screen.getByText(/Video Explanation/i)).toBeInTheDocument();
    const iframe = screen.getByTitle('Video explanation');
    // Should fall back to original URL when parsing fails
    expect(iframe).toHaveAttribute('src', 'not-a-valid-url');
  });

  it('renders community explanations with tabs (V2)', () => {
    const questionWithCommunity: Question = {
      ...baseQuestion,
      communityExplanations: [
        {
          id: 'comm-1',
          userId: 'user-1',
          userName: 'Security Expert',
          content: 'Think of it like protecting your home with multiple layers.',
          votes: 15,
          createdAt: new Date('2024-01-15'),
          isVerified: true,
        },
      ],
      hasAlternativeViews: true,
    };

    render(<EnhancedExplanation question={questionWithCommunity} isCorrect={true} />);

    expect(screen.getByText('Official Explanation')).toBeInTheDocument();
    expect(screen.getByText(/Community Views/i)).toBeInTheDocument();
  });

  it('shows voting UI when V2 features are present', () => {
    const questionWithV2: Question = {
      ...baseQuestion,
      explanationSteps: ['Step 1', 'Step 2'],
      explanationVotes: 12,
    };

    render(<EnhancedExplanation question={questionWithV2} isCorrect={true} />);

    expect(screen.getByText(/Was this explanation helpful/i)).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('applies correct styling for correct answers', () => {
    const { container } = render(<EnhancedExplanation question={baseQuestion} isCorrect={true} />);

    // Check for success-related classes
    const card = container.querySelector('.border-success\\/20');
    expect(card).toBeInTheDocument();
  });

  it('applies correct styling for incorrect answers', () => {
    const { container } = render(<EnhancedExplanation question={baseQuestion} isCorrect={false} />);

    // Check for destructive-related classes
    const card = container.querySelector('.border-destructive\\/20');
    expect(card).toBeInTheDocument();
  });
});
