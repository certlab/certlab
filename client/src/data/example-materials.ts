/**
 * Example Learning Materials with Multiple Content Types
 *
 * This file contains sample data demonstrating all supported content types:
 * - Text (Markdown)
 * - Video (YouTube, Vimeo)
 * - PDF Documents
 * - Interactive Content
 * - Code Examples
 *
 * IMPORTANT: URLs in these examples are PLACEHOLDERS and should be replaced
 * with actual educational content URLs before use in production.
 *
 * Use this as reference when creating new learning materials
 */

import type { Lecture } from '@shared/schema';

export const exampleMaterials: Partial<Lecture>[] = [
  // Example 1: Text Content (Markdown)
  {
    title: 'CISSP Domain 1: Security and Risk Management',
    description:
      'Comprehensive text-based study guide covering security principles and risk management concepts',
    contentType: 'text',
    content: `# Security and Risk Management

## Introduction

The Security and Risk Management domain is a foundational component of information security. It encompasses the principles and concepts necessary for protecting organizational assets.

## CIA Triad

The CIA Triad forms the cornerstone of information security:

### Confidentiality
- Ensuring data is accessible only to authorized users
- Implemented through encryption, access controls, and data classification
- Protects against unauthorized disclosure

### Integrity
- Maintaining data accuracy and consistency throughout its lifecycle
- Implemented through hashing, digital signatures, and checksums
- Protects against unauthorized modification

### Availability
- Ensuring systems and data are accessible when needed
- Implemented through redundancy, fault tolerance, and disaster recovery
- Protects against disruption of service

## Risk Management

### Risk Analysis Methods

1. **Qualitative Analysis**
   - Uses subjective judgments and categories (High, Medium, Low)
   - Faster and less resource-intensive
   - Good for preliminary assessments

2. **Quantitative Analysis**
   - Uses numerical values and statistical methods
   - More precise but resource-intensive
   - Includes calculations like ALE (Annual Loss Expectancy)

---

**Key Formula**: ALE = SLE × ARO

Where:
- **SLE** = Single Loss Expectancy
- **ARO** = Annual Rate of Occurrence
- **ALE** = Annual Loss Expectancy`,
    categoryId: 1,
    subcategoryId: 1,
    difficultyLevel: 2,
    tags: ['security', 'risk-management', 'cia-triad', 'cissp'],
    topics: ['Security Principles', 'Risk Analysis', 'CIA Triad'],
    authorName: 'CertLab Study Guide',
  },

  // Example 2: Video Content (YouTube)
  {
    title: 'Cryptography Fundamentals - Video Lecture',
    description:
      'An engaging video lecture covering the basics of cryptography, including symmetric and asymmetric encryption',
    contentType: 'video',
    content: `Video Transcript:

Welcome to this lecture on Cryptography Fundamentals. Today we'll explore the essential concepts of cryptography, including encryption algorithms, key management, and digital signatures.

Topics Covered:
- Symmetric Encryption (AES, DES)
- Asymmetric Encryption (RSA, ECC)
- Hash Functions (SHA-256, MD5)
- Digital Signatures and Certificates
- Key Exchange Protocols`,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // PLACEHOLDER: Replace with actual educational content URL
    videoProvider: 'youtube',
    videoDuration: 1800, // 30 minutes
    thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    categoryId: 1,
    subcategoryId: 3,
    difficultyLevel: 3,
    tags: ['cryptography', 'encryption', 'video', 'cissp'],
    topics: ['Cryptography', 'Encryption Algorithms', 'Digital Signatures'],
    accessibilityFeatures: {
      hasClosedCaptions: true,
      hasTranscript: true,
      hasAudioDescription: false,
    },
    authorName: 'Security Expert',
  },

  // Example 3: PDF Document
  {
    title: 'CISSP Official Study Guide - Chapter 3',
    description:
      'Official study guide chapter covering security architecture and engineering principles',
    contentType: 'pdf',
    content:
      'Security Architecture and Engineering - This chapter covers fundamental security architecture principles, secure design patterns, and security models.',
    pdfUrl: 'https://example.com/cissp-chapter3.pdf', // PLACEHOLDER: Replace with actual PDF URL
    pdfPages: 45,
    fileSize: 5242880, // 5 MB
    thumbnailUrl: 'https://example.com/cissp-chapter3-preview.jpg', // PLACEHOLDER: Replace with actual thumbnail URL
    categoryId: 1,
    subcategoryId: 2,
    difficultyLevel: 4,
    tags: ['cissp', 'architecture', 'pdf', 'official'],
    topics: ['Security Architecture', 'Secure Design', 'Security Models'],
    accessibilityFeatures: {
      altText:
        'CISSP Official Study Guide Chapter 3 - Security Architecture and Engineering, 45 pages covering fundamental principles',
    },
    authorName: 'ISC² Official',
  },

  // Example 4: Interactive Code Playground
  {
    title: 'Practice: Implementing Secure Authentication',
    description:
      'Interactive coding exercise for implementing a secure authentication system with password hashing',
    contentType: 'interactive',
    content: `Instructions:

1. Implement the password hashing function using bcrypt
2. Add salt generation for each password
3. Implement the password verification function
4. Test your implementation with the provided test cases

Success Criteria:
- All tests pass
- Passwords are properly salted and hashed
- Implementation uses bcrypt with proper cost factor
- No plain text passwords are stored`,
    interactiveUrl: 'https://codepen.io/example/pen/secure-auth', // PLACEHOLDER: Replace with actual CodePen or interactive content URL
    interactiveType: 'code',
    categoryId: 1,
    subcategoryId: 4,
    difficultyLevel: 3,
    tags: ['interactive', 'coding', 'authentication', 'hands-on'],
    topics: ['Authentication', 'Password Security', 'Hashing'],
    authorName: 'CertLab Interactive',
  },

  // Example 5: Code Example (Python)
  {
    title: 'Secure Password Hashing Implementation',
    description: 'Production-ready example of secure password hashing using bcrypt in Python',
    contentType: 'code',
    content: 'Example demonstrating best practices for password hashing and verification',
    codeLanguage: 'python',
    codeContent: `import bcrypt
import secrets

class SecurePasswordManager:
    """
    A secure password manager implementing best practices for
    password hashing and verification.
    """
    
    def __init__(self, rounds=12):
        """
        Initialize the password manager.
        
        Args:
            rounds (int): Cost factor for bcrypt (default: 12)
                         Higher values = more secure but slower
        """
        self.rounds = rounds
    
    def hash_password(self, password: str) -> bytes:
        """
        Hash a password using bcrypt with automatic salt generation.
        
        Args:
            password (str): The plain text password to hash
            
        Returns:
            bytes: The hashed password (includes salt)
        """
        # Convert password to bytes
        password_bytes = password.encode('utf-8')
        
        # Generate salt and hash password
        salt = bcrypt.gensalt(rounds=self.rounds)
        hashed = bcrypt.hashpw(password_bytes, salt)
        
        return hashed
    
    def verify_password(self, password: str, hashed: bytes) -> bool:
        """
        Verify a password against a hashed password.
        
        Args:
            password (str): The plain text password to verify
            hashed (bytes): The hashed password to check against
            
        Returns:
            bool: True if password matches, False otherwise
        """
        password_bytes = password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed)
    
    def generate_secure_token(self, length: int = 32) -> str:
        """
        Generate a cryptographically secure random token.
        
        Args:
            length (int): Length of the token in bytes (default: 32)
            
        Returns:
            str: Hex-encoded random token
        """
        return secrets.token_hex(length)


# Usage Example
if __name__ == "__main__":
    # Initialize password manager
    pm = SecurePasswordManager(rounds=12)
    
    # Hash a password
    password = "MySecureP@ssw0rd123"
    hashed = pm.hash_password(password)
    print(f"Hashed password: {hashed.decode('utf-8')}")
    
    # Verify correct password
    is_valid = pm.verify_password(password, hashed)
    print(f"Password valid: {is_valid}")  # Output: True
    
    # Verify incorrect password
    is_valid = pm.verify_password("WrongPassword", hashed)
    print(f"Wrong password valid: {is_valid}")  # Output: False
    
    # Generate secure token
    token = pm.generate_secure_token()
    print(f"Secure token: {token}")

# Security Best Practices Demonstrated:
# 1. Using bcrypt with adequate cost factor (12+)
# 2. Automatic salt generation (one per password)
# 3. Constant-time comparison (bcrypt.checkpw)
# 4. Cryptographically secure random token generation
# 5. Proper encoding (UTF-8)
# 6. No plain text password storage`,
    hasCodeHighlighting: true,
    categoryId: 1,
    subcategoryId: 4,
    difficultyLevel: 3,
    tags: ['code', 'python', 'security', 'authentication', 'bcrypt'],
    topics: ['Password Security', 'Hashing Algorithms', 'Best Practices'],
    authorName: 'Security Developer',
  },

  // Example 6: Code Example (JavaScript/TypeScript)
  {
    title: 'Input Validation and Sanitization',
    description:
      'TypeScript implementation of secure input validation to prevent injection attacks',
    contentType: 'code',
    content:
      'Example showing proper input validation and sanitization techniques to prevent XSS and injection attacks',
    codeLanguage: 'typescript',
    codeContent: `/**
 * Secure Input Validator
 * Implements defense-in-depth approach to input validation
 */

interface ValidationRule {
  type: 'string' | 'number' | 'email' | 'url' | 'regex';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  allowedChars?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized?: string;
}

class InputValidator {
  /**
   * Validate and sanitize user input
   */
  static validate(input: string, rules: ValidationRule): ValidationResult {
    const errors: string[] = [];
    let sanitized = input;

    // Check required
    if (rules.required && !input.trim()) {
      errors.push('Field is required');
      return { isValid: false, errors };
    }

    // Sanitize HTML
    sanitized = this.sanitizeHTML(input);

    // Type-specific validation
    switch (rules.type) {
      case 'email':
        if (!this.isValidEmail(sanitized)) {
          errors.push('Invalid email format');
        }
        break;

      case 'url':
        if (!this.isValidURL(sanitized)) {
          errors.push('Invalid URL format');
        }
        break;

      case 'string':
        if (rules.minLength && sanitized.length < rules.minLength) {
          errors.push(\`Minimum length is \${rules.minLength}\`);
        }
        if (rules.maxLength && sanitized.length > rules.maxLength) {
          errors.push(\`Maximum length is \${rules.maxLength}\`);
        }
        break;

      case 'regex':
        if (rules.pattern && !rules.pattern.test(sanitized)) {
          errors.push('Invalid format');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized,
    };
  }

  /**
   * Sanitize HTML to prevent XSS attacks
   */
  static sanitizeHTML(input: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, (char) => map[char] || char);
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format with whitelist
   */
  static isValidURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Whitelist allowed protocols
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Sanitize for SQL (parameterized queries preferred)
   */
  static sanitizeSQL(input: string): string {
    // Note: This is a fallback. Always use parameterized queries!
    return input.replace(/['";\\\\]/g, '');
  }
}

// Usage Examples
const usernameRules: ValidationRule = {
  type: 'string',
  minLength: 3,
  maxLength: 20,
  required: true,
};

const emailRules: ValidationRule = {
  type: 'email',
  required: true,
};

// Validate username
const usernameResult = InputValidator.validate(
  'john_doe<script>alert("xss")</script>',
  usernameRules
);
console.log(usernameResult);
// Output: { isValid: false, errors: ['Maximum length is 20'], sanitized: '...' }

// Validate email
const emailResult = InputValidator.validate(
  'user@example.com',
  emailRules
);
console.log(emailResult);
// Output: { isValid: true, errors: [], sanitized: 'user@example.com' }

// Sanitize HTML
const unsafeHTML = '<img src=x onerror="alert(1)">';
const safe = InputValidator.sanitizeHTML(unsafeHTML);
console.log(safe);
// Output: '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;'

/*
 * Security Principles Demonstrated:
 * 
 * 1. Defense in Depth: Multiple validation layers
 * 2. Whitelist Approach: Validate against allowed patterns
 * 3. Output Encoding: Sanitize HTML entities
 * 4. Input Validation: Check type, length, format
 * 5. Fail Securely: Return validation errors
 * 6. Least Privilege: Restrict allowed characters/formats
 */`,
    hasCodeHighlighting: true,
    categoryId: 1,
    subcategoryId: 4,
    difficultyLevel: 4,
    tags: ['code', 'typescript', 'security', 'validation', 'xss-prevention'],
    topics: ['Input Validation', 'XSS Prevention', 'Secure Coding'],
    authorName: 'Application Security Team',
  },

  // Example 7: Video Content (Vimeo)
  {
    title: 'Network Security Fundamentals',
    description:
      'Comprehensive video covering network security concepts including firewalls, IDS/IPS, and VPNs',
    contentType: 'video',
    content: `Video Transcript:

In this lecture, we'll explore network security fundamentals. We'll cover:

1. Firewalls and Network Segmentation
   - Packet filtering
   - Stateful inspection
   - Application-level gateways

2. Intrusion Detection and Prevention Systems
   - Signature-based detection
   - Anomaly-based detection
   - Prevention vs. detection

3. Virtual Private Networks (VPNs)
   - Site-to-site VPNs
   - Remote access VPNs
   - VPN protocols (IPsec, SSL/TLS)

4. Network Access Control (NAC)
   - 802.1X authentication
   - Port security
   - MAC filtering`,
    videoUrl: 'https://vimeo.com/123456789', // PLACEHOLDER: Replace with actual Vimeo video URL
    videoProvider: 'vimeo',
    videoDuration: 2700, // 45 minutes
    categoryId: 1,
    subcategoryId: 5,
    difficultyLevel: 3,
    tags: ['network-security', 'firewalls', 'vpn', 'video', 'cissp'],
    topics: ['Network Security', 'Firewalls', 'VPN', 'IDS/IPS'],
    accessibilityFeatures: {
      hasClosedCaptions: true,
      hasTranscript: true,
      hasAudioDescription: true,
    },
    authorName: 'Network Security Instructor',
  },

  // Example 8: Interactive Quiz
  {
    title: 'Security Principles - Interactive Assessment',
    description: 'Test your knowledge of security principles with this interactive quiz',
    contentType: 'interactive',
    content: `Interactive Quiz Instructions:

This interactive assessment will test your understanding of core security principles.

Format:
- 10 multiple choice questions
- Immediate feedback on each answer
- Detailed explanations for correct and incorrect answers
- Score tracking
- Certificate upon achieving 80% or higher

Topics Covered:
- CIA Triad
- Risk management concepts
- Security controls
- Access control models
- Cryptography basics`,
    interactiveUrl: 'https://example.com/quiz/security-principles', // PLACEHOLDER: Replace with actual interactive quiz URL
    interactiveType: 'quiz',
    categoryId: 1,
    subcategoryId: 1,
    difficultyLevel: 2,
    tags: ['interactive', 'quiz', 'assessment', 'cissp'],
    topics: ['Security Principles', 'Risk Management', 'Assessment'],
    authorName: 'CertLab Assessment Team',
  },
];

// Helper function to create complete lecture objects
export function createExampleLecture(
  example: Partial<Lecture>,
  userId: string,
  tenantId: number = 1
): Omit<Lecture, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    userId,
    tenantId,
    quizId: null,
    title: example.title || 'Untitled Material',
    description: example.description || null,
    content: example.content || '',
    topics: example.topics || [],
    tags: example.tags || [],
    categoryId: example.categoryId || 1,
    subcategoryId: example.subcategoryId || null,
    difficultyLevel: example.difficultyLevel || 1,
    author: userId,
    authorName: example.authorName || null,
    prerequisites: null,
    isRead: false,
    contentType: example.contentType || 'text',
    videoUrl: example.videoUrl || null,
    videoProvider: example.videoProvider || null,
    videoDuration: example.videoDuration || null,
    pdfUrl: example.pdfUrl || null,
    pdfPages: example.pdfPages || null,
    interactiveUrl: example.interactiveUrl || null,
    interactiveType: example.interactiveType || null,
    codeLanguage: example.codeLanguage || null,
    codeContent: example.codeContent || null,
    hasCodeHighlighting: example.hasCodeHighlighting || false,
    thumbnailUrl: example.thumbnailUrl || null,
    fileSize: example.fileSize || null,
    accessibilityFeatures: example.accessibilityFeatures || null,
  } as Omit<Lecture, 'id' | 'createdAt' | 'updatedAt'>;
}

export default exampleMaterials;
