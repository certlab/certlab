/**
 * Client-side study notes generation
 * Generates comprehensive study notes based on quiz performance
 */

import type { Quiz, Question, Category } from '@shared/schema';

export interface QuizReviewData {
  quiz: Quiz;
  questions: Question[];
  categoryName: string;
}

/**
 * Extracts key concepts from question text for categorization
 */
function extractKeyConcepts(questionText: string): string {
  const concepts = questionText.toLowerCase();
  
  if (concepts.includes('firewall')) return 'Network Security & Firewalls';
  if (concepts.includes('encryption')) return 'Cryptography & Data Protection';
  if (concepts.includes('authentication')) return 'Access Control & Authentication';
  if (concepts.includes('incident') || concepts.includes('response')) return 'Incident Response & Management';
  if (concepts.includes('continuity') || concepts.includes('business')) return 'Business Continuity Planning';
  if (concepts.includes('monitoring')) return 'Security Monitoring & Analytics';
  if (concepts.includes('confidentiality') || concepts.includes('integrity') || concepts.includes('availability')) return 'CIA Triad Principles';
  if (concepts.includes('risk')) return 'Risk Management & Assessment';
  if (concepts.includes('governance')) return 'Security Governance & Policy';
  if (concepts.includes('compliance')) return 'Regulatory Compliance';
  if (concepts.includes('access') || concepts.includes('control')) return 'Access Control';
  if (concepts.includes('vulnerability') || concepts.includes('threat')) return 'Vulnerability & Threat Assessment';
  if (concepts.includes('audit') || concepts.includes('log')) return 'Audit & Logging';
  if (concepts.includes('policy') || concepts.includes('procedure')) return 'Security Policies & Procedures';
  if (concepts.includes('disaster') || concepts.includes('recovery')) return 'Disaster Recovery';
  
  return 'Cybersecurity Fundamentals';
}

/**
 * Generates comprehensive study notes based on quiz review data
 */
export function generateStudyNotes(data: QuizReviewData): string {
  const { quiz, questions, categoryName } = data;
  
  // Get quiz answers to determine which questions were answered correctly
  const answers = (quiz.answers as { questionId: number; answer: number }[]) || [];
  
  // Map questions with their results
  const questionsWithResults = questions.map(q => {
    const userAnswer = answers.find(a => a.questionId === q.id);
    const options = (q.options as { id: number; text: string }[]) || [];
    return {
      ...q,
      options,
      userAnswer: userAnswer?.answer,
      isCorrect: userAnswer?.answer === q.correctAnswer
    };
  });
  
  const correctCount = questionsWithResults.filter(q => q.isCorrect).length;
  const incorrectQuestions = questionsWithResults.filter(q => !q.isCorrect);
  const score = quiz.score || 0;
  const totalQuestions = quiz.totalQuestions || questions.length;
  const correctAnswers = quiz.correctAnswers || correctCount;
  
  const quizTitle = quiz.title || `${categoryName} Quiz`;
  
  return `# ${quizTitle} - Comprehensive Study Notes

*Generated from quiz performance analysis on ${new Date().toLocaleDateString()}*

## Performance Overview
- **Subject Area:** ${categoryName}
- **Quiz Score:** ${Math.round(score)}% (${correctAnswers}/${totalQuestions} questions correct)
- **Mastery Level:** ${score >= 85 ? 'Advanced' : score >= 70 ? 'Proficient' : 'Developing'}

## Question-by-Question Analysis

${questionsWithResults.map((q, index) => `
### Question ${index + 1}: ${q.text}

**Available Options:**
${q.options.map(opt => `- ${opt.text}`).join('\n')}

**Your Selection:** ${q.options.find(opt => opt.id === q.userAnswer)?.text || 'No answer selected'}
**Correct Answer:** ${q.options.find(opt => opt.id === q.correctAnswer)?.text}
**Result:** ${q.isCorrect ? '✅ Correct' : '❌ Incorrect'}

**Key Learning Points:**
${q.explanation || 'This question assesses fundamental understanding of cybersecurity principles essential for professional certification.'}

${!q.isCorrect ? `
**Study Focus:** This represents a knowledge gap that requires focused review and additional practice.
` : ''}

---
`).join('')}

## Conceptual Understanding

### Core Topics Covered
${questionsWithResults.map((q, index) => {
  const concepts = extractKeyConcepts(q.text);
  return `${index + 1}. **${concepts}** - ${q.explanation ? q.explanation.substring(0, 100) + '...' : 'Fundamental cybersecurity principle'}`;
}).join('\n')}

### Knowledge Gaps Analysis
${incorrectQuestions.length > 0 ? `
You need additional focus on ${incorrectQuestions.length} area(s):

${incorrectQuestions.map((q, index) => `
**Gap ${index + 1}:** ${extractKeyConcepts(q.text)}
- Question: ${q.text.substring(0, 80)}${q.text.length > 80 ? '...' : ''}
- Learning Need: ${q.explanation || 'Review fundamental concepts and apply to practical scenarios'}
- Next Steps: Practice similar questions and study related certification materials
`).join('')}
` : `
**Excellent comprehension!** You demonstrated strong understanding across all tested areas. Consider advancing to more complex topics or exploring related certification domains.
`}

## Study Recommendations

### Immediate Actions
${score < 70 ? `
1. **Foundation Building**: Review basic concepts in ${categoryName}
2. **Targeted Study**: Focus on the ${incorrectQuestions.length} missed question area(s)
3. **Practice Testing**: Take additional quizzes to reinforce learning
4. **Concept Mapping**: Create visual connections between related topics
` : score < 85 ? `
1. **Precision Improvement**: Review missed questions for deeper understanding
2. **Knowledge Refinement**: Study explanations and explore related concepts
3. **Application Practice**: Work through practical scenarios and case studies
4. **Cross-Reference**: Connect concepts to real-world cybersecurity applications
` : `
1. **Knowledge Maintenance**: Periodic review to maintain proficiency
2. **Advanced Exploration**: Move to higher-level topics within ${categoryName}
3. **Integration Learning**: Connect these concepts to other certification areas
4. **Knowledge Sharing**: Teach concepts to others to reinforce understanding
`}

### Long-term Development
- **Certification Preparation**: Use these insights to guide comprehensive study planning
- **Practical Application**: Seek opportunities to apply concepts in professional contexts
- **Continuous Learning**: Stay current with evolving cybersecurity practices
- **Community Engagement**: Join study groups and professional cybersecurity communities

## Key Takeaways

${score >= 85 ? `
🎯 **Strong Performance**: Your ${Math.round(score)}% score demonstrates solid understanding of ${categoryName} concepts.
` : `
📚 **Growth Opportunity**: Your ${Math.round(score)}% score indicates areas for improvement in ${categoryName}.
`}

${correctCount > 0 ? `
✅ **Strengths**: You correctly understood ${correctCount} concept(s), showing good foundation knowledge.
` : ''}

${incorrectQuestions.length > 0 ? `
🎯 **Focus Areas**: Concentrate study efforts on ${incorrectQuestions.length} specific topic(s) for maximum improvement.
` : ''}

---
*These study notes provide personalized guidance based on your quiz performance. Combine with official certification materials and hands-on practice for optimal learning outcomes.*`;
}
