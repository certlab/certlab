# Personal Question Bank Import - User Guide

## Overview

The Personal Question Import feature allows you to import custom questions into your own private question bank using YAML files. Questions imported this way are:

- **Private**: Only visible to you, not shared with other users
- **Isolated**: Stored in your personal collection, separate from the shared question bank
- **Customizable**: You control the categories, subcategories, and questions

## Accessing the Feature

1. Log in to CertLab
2. Click on the navigation menu
3. Select **"Import Personal Questions"** under "Other Features"
4. Or navigate directly to: `/app/personal-import`

## YAML File Format

### Basic Structure

```yaml
category: CustomCategory
description: My personal practice questions (optional)
questions:
  - text: "Question text goes here?"
    options:
      - id: 0
        text: "First option"
      - id: 1
        text: "Second option"
      - id: 2
        text: "Third option"
    correctAnswer: 1
    explanation: "Explanation of why option 1 is correct"
    difficultyLevel: 1
    tags: ["topic1", "topic2"]
    subcategory: "Subdomain Name"
```

### Field Reference

#### Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `category` | string | ✅ Yes | The category name (e.g., "CISSP", "CustomCategory") |
| `description` | string | ❌ No | Brief description of the question set |
| `questions` | array | ✅ Yes | Array of question objects |

#### Question Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | ✅ Yes | The question text (max 2000 chars) |
| `options` | array | ✅ Yes | 2-10 answer options |
| `correctAnswer` | number | ✅ Yes | The ID of the correct option (0-based index) |
| `subcategory` | string | ✅ Yes | The topic or domain name |
| `difficultyLevel` | number | ✅ Yes | 1 (Easy) to 5 (Expert) |
| `explanation` | string | ❌ No | Explanation of the correct answer (max 5000 chars) |
| `tags` | array | ❌ No | Array of tag strings for categorization |

#### Option Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | ✅ Yes | Sequential ID starting from 0 (e.g., 0, 1, 2, 3) |
| `text` | string | ✅ Yes | The option text (max 1000 chars) |

### Example Files

#### Example 1: Simple Quiz

```yaml
category: Geography Practice
description: Basic geography questions for self-study
questions:
  - text: "What is the capital of France?"
    options:
      - id: 0
        text: "London"
      - id: 1
        text: "Paris"
      - id: 2
        text: "Berlin"
      - id: 3
        text: "Madrid"
    correctAnswer: 1
    explanation: "Paris is the capital and most populous city of France."
    difficultyLevel: 1
    tags: ["geography", "capitals", "europe"]
    subcategory: "European Capitals"
  
  - text: "Which country has the largest population?"
    options:
      - id: 0
        text: "United States"
      - id: 1
        text: "India"
      - id: 2
        text: "China"
    correctAnswer: 2
    explanation: "China has the world's largest population, with over 1.4 billion people."
    difficultyLevel: 1
    tags: ["geography", "demographics"]
    subcategory: "World Demographics"
```

#### Example 2: Technical Questions

```yaml
category: CISSP Practice
description: Custom CISSP security questions
questions:
  - text: "What is the primary purpose of a firewall?"
    options:
      - id: 0
        text: "To encrypt all network traffic"
      - id: 1
        text: "To filter network traffic based on rules"
      - id: 2
        text: "To detect malware"
      - id: 3
        text: "To backup network data"
    correctAnswer: 1
    explanation: "A firewall's primary purpose is to filter incoming and outgoing network traffic based on predetermined security rules."
    difficultyLevel: 2
    tags: ["network-security", "firewall", "access-control"]
    subcategory: "Security Architecture"
  
  - text: "Which encryption algorithm is asymmetric?"
    options:
      - id: 0
        text: "AES"
      - id: 1
        text: "DES"
      - id: 2
        text: "RSA"
      - id: 3
        text: "Blowfish"
    correctAnswer: 2
    explanation: "RSA is an asymmetric encryption algorithm that uses a pair of keys (public and private) for encryption and decryption."
    difficultyLevel: 3
    tags: ["cryptography", "encryption", "asymmetric"]
    subcategory: "Cryptography"
```

## Importing Questions

### Step-by-Step Process

1. **Prepare Your YAML File**
   - Create a YAML file following the format above
   - Save with `.yaml` or `.yml` extension
   - Validate the structure (see Validation section below)

2. **Upload the File**
   - Navigate to `/app/personal-import`
   - Click "Choose YAML File"
   - Select your prepared file
   - The import process will begin automatically

3. **Monitor Progress**
   - A progress bar shows import status
   - Questions are imported in batches of 50
   - Invalid questions are skipped with warnings

4. **Review Results**
   - Success message shows number of questions imported
   - Categories and subcategories created
   - Warnings for any skipped questions

### Import Results

After import, you'll see a summary:

✅ **Success**:
- ✓ 15 questions imported
- ✓ 1 category created
- ✓ 3 subcategories created

⚠️ **Warnings** (if any):
- Question 5 skipped: correctAnswer 4 does not match any option ID

❌ **Errors** (if any):
- Failed to parse YAML: Invalid structure

## Validation Rules

### Required Validations

1. **YAML Structure**
   - Must have `category` and `questions` fields
   - `questions` must be an array

2. **Question Options**
   - Must have 2-10 options
   - Each option must have `id` and `text`
   - Option IDs must be sequential (0, 1, 2, 3...)

3. **Correct Answer**
   - Must match one of the option IDs
   - Example: If you have options with IDs 0, 1, 2, then `correctAnswer` must be 0, 1, or 2

4. **Field Lengths**
   - Question text: max 2000 characters
   - Option text: max 1000 characters
   - Explanation: max 5000 characters

### Common Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "correctAnswer does not match any option ID" | correctAnswer is not in options | Ensure correctAnswer matches an option ID (0, 1, 2, etc.) |
| "Invalid options structure" | Options missing id or text | Verify each option has both `id` and `text` fields |
| "Invalid YAML structure" | Missing required fields | Check that `category` and `questions` are present |
| "Failed to parse YAML" | Syntax error in YAML | Validate YAML syntax (use online validators) |

## Categories and Subcategories

### Automatic Creation

- Categories are created automatically if they don't exist
- Subcategories are created automatically if they don't exist
- Categories are stored in your personal collection

### Organizing Questions

You can organize questions by:

1. **Category**: High-level grouping (e.g., "CISSP", "Geography")
2. **Subcategory**: Specific topic within category (e.g., "Cryptography", "European Capitals")
3. **Tags**: Additional classification (e.g., ["difficult", "review-needed"])

## Best Practices

### File Organization

1. **One Category Per File**: Keep questions for one category in one file
2. **Descriptive Names**: Use clear file names (e.g., `cissp-cryptography.yaml`)
3. **Version Control**: Keep your YAML files in version control (e.g., Git)
4. **Backup**: Keep backups of your YAML files before importing

### Question Quality

1. **Clear Questions**: Write unambiguous question text
2. **Balanced Options**: Include plausible distractors
3. **Detailed Explanations**: Provide helpful explanations for learning
4. **Appropriate Difficulty**: Set realistic difficulty levels
5. **Useful Tags**: Add tags for easier filtering and review

### Import Strategy

1. **Test with Small Files**: Start with 5-10 questions to test format
2. **Validate Before Importing**: Check YAML syntax and structure
3. **Review Results**: Check import summary for errors
4. **Iterate**: Fix errors and re-import if needed

## Troubleshooting

### Import Failed

**Problem**: Import shows error message

**Solutions**:
1. Validate YAML syntax using an online YAML validator
2. Check that all required fields are present
3. Verify option IDs are sequential starting from 0
4. Ensure correctAnswer matches an option ID
5. Check field lengths don't exceed limits

### Questions Skipped

**Problem**: Some questions were skipped during import

**Solutions**:
1. Review the error messages in the import results
2. Common issues:
   - Invalid option IDs
   - correctAnswer doesn't match an option
   - Missing required fields
3. Fix the issues in your YAML file
4. Re-import the file

### Cannot Access Import Page

**Problem**: Cannot find or access the personal import page

**Solutions**:
1. Ensure you're logged in
2. Check navigation menu under "Other Features"
3. Navigate directly to `/app/personal-import`
4. Clear browser cache and reload

## FAQ

### Q: Are my imported questions visible to other users?
**A**: No, all questions imported via the personal import feature are private and stored in your personal collection only.

### Q: Can I import the same questions multiple times?
**A**: Yes, but this will create duplicates. The system doesn't automatically detect duplicates.

### Q: What's the difference between personal import and admin import?
**A**: Admin import adds questions to the shared global bank (visible to all users), while personal import adds questions only to your private collection.

### Q: Can I export my personal questions?
**A**: Not currently supported, but you should keep your original YAML files as backups.

### Q: How many questions can I import at once?
**A**: There's no hard limit, but files with 100-500 questions work best. Larger files may take longer to process.

### Q: Can I delete imported questions?
**A**: Yes, you can delete personal questions through the question management interface (feature may be available depending on version).

### Q: Do personal questions appear in quizzes?
**A**: Personal questions can be used in custom quizzes but not in the default shared quizzes. (Implementation may vary by version)

### Q: Can I share my personal questions with others?
**A**: Not directly through the UI. You can share the YAML file with others, and they can import it into their own personal bank.

## Related Features

- **Data Import Page** (`/app/data-import`): Admin-only feature for importing to shared bank
- **Question Bank Page** (`/app/question-bank`): View and manage all questions (shared and personal)
- **Quiz Builder** (`/app/quiz-builder`): Create custom quizzes using your questions

## Support

If you encounter issues:

1. Check this guide for troubleshooting steps
2. Validate your YAML file format
3. Review error messages carefully
4. Check the [GitHub Issues](https://github.com/archubbuck/certlab/issues)
5. Create a new issue with:
   - Error message
   - Sample YAML file (anonymized)
   - Steps to reproduce

---

**Last Updated**: 2026-01-21  
**Version**: 1.0  
**Feature**: Personal Question Bank Import
