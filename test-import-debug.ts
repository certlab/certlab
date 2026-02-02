/**
 * Debug script to trace import flow
 */

import { parseYAMLQuestions } from './client/src/lib/question-import-validation';
import { readFileSync } from 'fs';

const yamlContent = readFileSync('/tmp/cissp_questions_15001_to_15500.yaml', 'utf8');

try {
  console.log('Parsing YAML...');
  const data = parseYAMLQuestions(yamlContent);

  console.log('Category:', data.category);
  console.log('Description:', data.description);
  console.log('Number of questions:', data.questions.length);

  // Check for unique subcategories
  const uniqueSubcats = new Set(data.questions.map((q) => q.subcategory));
  console.log('Unique subcategories:', uniqueSubcats.size);
  console.log('Subcategory names:');
  Array.from(uniqueSubcats).forEach((name) => {
    const count = data.questions.filter((q) => q.subcategory === name).length;
    console.log(`  - ${name}: ${count} questions`);
  });

  // Sample first few questions
  console.log('\nFirst 3 questions:');
  data.questions.slice(0, 3).forEach((q, idx) => {
    console.log(`\nQuestion ${idx + 1}:`);
    console.log(`  Text: ${q.text.substring(0, 60)}...`);
    console.log(`  Options: ${q.options.length}`);
    console.log(`  Correct Answer: ${q.correctAnswer}`);
    console.log(`  Subcategory: ${q.subcategory}`);
  });
} catch (error) {
  console.error('Error:', error);
}
