/**
 * Test script to debug YAML import issue
 */

const fs = require('fs');
const yaml = require('js-yaml');

// Read the YAML file
const yamlContent = fs.readFileSync('/tmp/cissp_questions_15001_to_15500.yaml', 'utf8');

// Parse it
const data = yaml.load(yamlContent);

console.log('Category:', data.category);
console.log('Description:', data.description);
console.log('Number of questions:', data.questions ? data.questions.length : 0);

if (data.questions && data.questions.length > 0) {
  // Check first question
  const firstQ = data.questions[0];
  console.log('\nFirst question:');
  console.log('  text:', firstQ.text ? firstQ.text.substring(0, 50) + '...' : 'MISSING');
  console.log('  options:', firstQ.options ? firstQ.options.length : 'MISSING');
  console.log('  correctAnswer:', firstQ.correctAnswer);
  console.log('  explanation:', firstQ.explanation ? firstQ.explanation.substring(0, 50) + '...' : 'MISSING');
  console.log('  difficultyLevel:', firstQ.difficultyLevel);
  console.log('  tags:', firstQ.tags);
  console.log('  subcategory:', firstQ.subcategory);

  // Validate option structure
  console.log('\n  Option details:');
  if (firstQ.options) {
    firstQ.options.forEach((opt, idx) => {
      console.log(`    [${idx}] id: ${opt.id}, text: ${opt.text ? opt.text.substring(0, 30) + '...' : 'MISSING'}`);
    });
  }
  
  // Check if correctAnswer matches an option ID
  const optionIds = firstQ.options ? firstQ.options.map(o => o.id) : [];
  const correctAnswerValid = optionIds.includes(firstQ.correctAnswer);
  console.log(`\n  correctAnswer ${firstQ.correctAnswer} is valid:`, correctAnswerValid);
  console.log('  Available option IDs:', optionIds);
  
  // Check a few more questions for patterns
  console.log('\nChecking all questions for issues...');
  let invalidCount = 0;
  let missingFields = {};
  
  data.questions.forEach((q, idx) => {
    // Check for missing fields
    if (!q.text) {
      missingFields[idx] = (missingFields[idx] || []).concat(['text']);
    }
    if (!q.options || q.options.length < 2) {
      missingFields[idx] = (missingFields[idx] || []).concat(['options (must have >=2)']);
    }
    if (q.correctAnswer === undefined || q.correctAnswer === null) {
      missingFields[idx] = (missingFields[idx] || []).concat(['correctAnswer']);
    }
    if (!q.explanation && q.explanation !== '') {
      missingFields[idx] = (missingFields[idx] || []).concat(['explanation']);
    }
    if (!q.difficultyLevel) {
      missingFields[idx] = (missingFields[idx] || []).concat(['difficultyLevel']);
    }
    if (!q.tags) {
      missingFields[idx] = (missingFields[idx] || []).concat(['tags']);
    }
    if (!q.subcategory) {
      missingFields[idx] = (missingFields[idx] || []).concat(['subcategory']);
    }
    
    // Check correctAnswer validity
    if (q.options) {
      const qOptionIds = q.options.map(o => o.id);
      if (!qOptionIds.includes(q.correctAnswer)) {
        invalidCount++;
        if (invalidCount <= 5) {
          console.log(`  Question ${idx + 1}: correctAnswer ${q.correctAnswer} not in option IDs ${qOptionIds}`);
        }
      }
    }
  });
  
  console.log(`\nTotal invalid correctAnswer: ${invalidCount}`);
  
  const missingFieldsKeys = Object.keys(missingFields);
  if (missingFieldsKeys.length > 0) {
    console.log(`\nQuestions with missing fields: ${missingFieldsKeys.length}`);
    missingFieldsKeys.slice(0, 5).forEach(idx => {
      console.log(`  Question ${parseInt(idx) + 1}: missing ${missingFields[idx].join(', ')}`);
    });
  } else {
    console.log('\nNo missing fields found.');
  }
}
