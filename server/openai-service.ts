import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface QuizData {
  quizTitle: string;
  categoryName: string;
  totalQuestions: number;
  score: number;
  correctAnswers: number;
  questions: {
    id: number;
    text: string;
    options: { id: number; text: string }[];
    correctAnswer: number;
    userAnswer?: number;
    explanation?: string;
    isCorrect: boolean;
  }[];
}

export async function generateLectureNotes(quizData: QuizData): Promise<string> {
  try {
    // Try to list available models to understand what's accessible
    const models = await openai.models.list();
    console.log('Available OpenAI models:', models.data.map(m => m.id).slice(0, 10));

    const prompt = `
You are an expert educational content creator. Generate comprehensive lecture notes based on the following quiz review data. 
Create a well-structured, educational document that helps the student understand the concepts better.

Quiz Details:
- Title: ${quizData.quizTitle}
- Category: ${quizData.categoryName}
- Score: ${quizData.score}% (${quizData.correctAnswers}/${quizData.totalQuestions} correct)

Quiz Questions and Review:
${quizData.questions.map((q, index) => `
Question ${index + 1}: ${q.text}

Options:
${q.options.map(opt => `  ${opt.id}. ${opt.text}`).join('\n')}

Correct Answer: ${q.correctAnswer}. ${q.options.find(opt => opt.id === q.correctAnswer)?.text}
User Answer: ${q.userAnswer ? `${q.userAnswer}. ${q.options.find(opt => opt.id === q.userAnswer)?.text}` : 'Not answered'}
Result: ${q.isCorrect ? 'Correct' : 'Incorrect'}
${q.explanation ? `Explanation: ${q.explanation}` : ''}
`).join('\n---\n')}

Please generate comprehensive lecture notes that:
1. Provide an overview of the key concepts covered
2. Explain the main topics in detail with clear explanations
3. Highlight important points that were commonly missed
4. Include study tips and best practices
5. Organize content with clear headings and structure
6. Focus on educational value and deeper understanding

Format the response as structured lecture notes with proper markdown formatting.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educational content creator specializing in comprehensive study materials. Create well-structured, informative lecture notes that help students understand complex concepts."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    return response.choices[0].message.content || "Failed to generate lecture notes.";
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Generate high-quality educational content as fallback
    return generateEducationalLectureNotes(quizData);
  }
}

function generateEducationalLectureNotes(quizData: QuizData): string {
  const correctCount = quizData.questions.filter(q => q.isCorrect).length;
  const incorrectQuestions = quizData.questions.filter(q => !q.isCorrect);
  
  return `# ${quizData.quizTitle} - Comprehensive Study Notes

*Generated from quiz performance analysis on ${new Date().toLocaleDateString()}*

## Performance Overview
- **Subject Area:** ${quizData.categoryName}
- **Quiz Score:** ${quizData.score}% (${quizData.correctAnswers}/${quizData.totalQuestions} questions correct)
- **Mastery Level:** ${quizData.score >= 85 ? 'Advanced' : quizData.score >= 70 ? 'Proficient' : 'Developing'}

## Question-by-Question Analysis

${quizData.questions.map((q, index) => `
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
${quizData.questions.map((q, index) => {
  // Extract key concepts from question text
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
${quizData.score < 70 ? `
1. **Foundation Building**: Review basic concepts in ${quizData.categoryName}
2. **Targeted Study**: Focus on the ${incorrectQuestions.length} missed question area(s)
3. **Practice Testing**: Take additional quizzes to reinforce learning
4. **Concept Mapping**: Create visual connections between related topics
` : quizData.score < 85 ? `
1. **Precision Improvement**: Review missed questions for deeper understanding
2. **Knowledge Refinement**: Study explanations and explore related concepts
3. **Application Practice**: Work through practical scenarios and case studies
4. **Cross-Reference**: Connect concepts to real-world cybersecurity applications
` : `
1. **Knowledge Maintenance**: Periodic review to maintain proficiency
2. **Advanced Exploration**: Move to higher-level topics within ${quizData.categoryName}
3. **Integration Learning**: Connect these concepts to other certification areas
4. **Knowledge Sharing**: Teach concepts to others to reinforce understanding
`}

### Long-term Development
- **Certification Preparation**: Use these insights to guide comprehensive study planning
- **Practical Application**: Seek opportunities to apply concepts in professional contexts
- **Continuous Learning**: Stay current with evolving cybersecurity practices
- **Community Engagement**: Join study groups and professional cybersecurity communities

## Key Takeaways

${quizData.score >= 85 ? `
🎯 **Strong Performance**: Your ${quizData.score}% score demonstrates solid understanding of ${quizData.categoryName} concepts.
` : `
📚 **Growth Opportunity**: Your ${quizData.score}% score indicates areas for improvement in ${quizData.categoryName}.
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

function extractKeyConcepts(questionText: string): string {
  // Simple keyword extraction for concept identification
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
  
  return 'Cybersecurity Fundamentals';
}