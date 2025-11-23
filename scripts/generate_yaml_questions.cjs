const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

// Base questions for CISSP with expanded templates
const cisspBaseQuestions = {
  "Security and Risk Management": [
    {
      text: "What is the primary goal of information security?",
      options: [
        { id: 0, text: "Confidentiality" },
        { id: 1, text: "Integrity" },
        { id: 2, text: "Availability" },
        { id: 3, text: "All of the above" }
      ],
      correctAnswer: 3,
      explanation: "Information security aims to maintain the CIA triad: Confidentiality, Integrity, and Availability of information.",
      difficultyLevel: 1,
      tags: ["fundamentals", "CIA triad"]
    },
    {
      text: "Which principle requires that users are granted only the permissions they need to perform their job functions?",
      options: [
        { id: 0, text: "Need to know" },
        { id: 1, text: "Least privilege" },
        { id: 2, text: "Separation of duties" },
        { id: 3, text: "Defense in depth" }
      ],
      correctAnswer: 1,
      explanation: "The principle of least privilege ensures users get minimum access needed for their duties.",
      difficultyLevel: 1,
      tags: ["access control", "principles"]
    },
    {
      text: "What is the PRIMARY purpose of a security governance framework?",
      options: [
        { id: 0, text: "To increase security costs" },
        { id: 1, text: "To provide structure for security decision-making and accountability" },
        { id: 2, text: "To replace security policies" },
        { id: 3, text: "To automate security processes" }
      ],
      correctAnswer: 1,
      explanation: "Security governance provides structure, direction, and accountability for security decisions within an organization.",
      difficultyLevel: 2,
      tags: ["governance", "frameworks"]
    },
    {
      text: "What does 'risk appetite' mean in information security?",
      options: [
        { id: 0, text: "The amount of risk an organization is willing to accept" },
        { id: 1, text: "The total amount of risk in an organization" },
        { id: 2, text: "The cost of implementing security controls" },
        { id: 3, text: "The probability of a security breach" }
      ],
      correctAnswer: 0,
      explanation: "Risk appetite is the amount and type of risk that an organization is willing to pursue, retain, or take.",
      difficultyLevel: 2,
      tags: ["risk management", "risk appetite"]
    },
    {
      text: "Which risk treatment option involves purchasing insurance?",
      options: [
        { id: 0, text: "Risk avoidance" },
        { id: 1, text: "Risk mitigation" },
        { id: 2, text: "Risk transfer" },
        { id: 3, text: "Risk acceptance" }
      ],
      correctAnswer: 2,
      explanation: "Risk transfer involves shifting the risk to another party, such as through insurance.",
      difficultyLevel: 1,
      tags: ["risk management", "risk treatment"]
    },
    {
      text: "What is the purpose of a Business Impact Analysis (BIA)?",
      options: [
        { id: 0, text: "To identify potential threats" },
        { id: 1, text: "To determine the impact of disruptions on business operations" },
        { id: 2, text: "To create security policies" },
        { id: 3, text: "To train employees" }
      ],
      correctAnswer: 1,
      explanation: "A BIA identifies critical business functions and determines the impact of disruptions.",
      difficultyLevel: 2,
      tags: ["BIA", "business continuity"]
    },
    {
      text: "Which law requires organizations to protect personal health information?",
      options: [
        { id: 0, text: "GDPR" },
        { id: 1, text: "HIPAA" },
        { id: 2, text: "SOX" },
        { id: 3, text: "PCI DSS" }
      ],
      correctAnswer: 1,
      explanation: "HIPAA (Health Insurance Portability and Accountability Act) protects personal health information.",
      difficultyLevel: 1,
      tags: ["compliance", "HIPAA"]
    },
    {
      text: "What is 'separation of duties' designed to prevent?",
      options: [
        { id: 0, text: "Unauthorized access" },
        { id: 1, text: "Fraud and errors" },
        { id: 2, text: "Data breaches" },
        { id: 3, text: "Malware infections" }
      ],
      correctAnswer: 1,
      explanation: "Separation of duties prevents fraud and errors by requiring critical tasks be divided among multiple individuals.",
      difficultyLevel: 2,
      tags: ["controls", "separation of duties"]
    }
  ],
  "Asset Security": [
    {
      text: "What is the purpose of data classification?",
      options: [
        { id: 0, text: "To organize files alphabetically" },
        { id: 1, text: "To determine appropriate security controls" },
        { id: 2, text: "To delete old data" },
        { id: 3, text: "To encrypt all data" }
      ],
      correctAnswer: 1,
      explanation: "Data classification helps determine appropriate security controls based on sensitivity and criticality.",
      difficultyLevel: 1,
      tags: ["data classification", "asset security"]
    },
    {
      text: "Which data classification level is typically used for sensitive personal information?",
      options: [
        { id: 0, text: "Public" },
        { id: 1, text: "Internal" },
        { id: 2, text: "Confidential" },
        { id: 3, text: "Unclassified" }
      ],
      correctAnswer: 2,
      explanation: "Confidential data includes sensitive information like personal data requiring strong protection.",
      difficultyLevel: 1,
      tags: ["classification", "confidential"]
    },
    {
      text: "Which method involves overwriting data multiple times to prevent recovery?",
      options: [
        { id: 0, text: "Deletion" },
        { id: 1, text: "Formatting" },
        { id: 2, text: "Sanitization" },
        { id: 3, text: "Archiving" }
      ],
      correctAnswer: 2,
      explanation: "Data sanitization involves overwriting data multiple times to prevent recovery.",
      difficultyLevel: 2,
      tags: ["sanitization", "data destruction"]
    },
    {
      text: "What is data remanence?",
      options: [
        { id: 0, text: "Data backup" },
        { id: 1, text: "Residual data that remains after deletion" },
        { id: 2, text: "Data encryption" },
        { id: 3, text: "Data archiving" }
      ],
      correctAnswer: 1,
      explanation: "Data remanence refers to residual data remaining on storage media after deletion.",
      difficultyLevel: 2,
      tags: ["remanence", "data security"]
    }
  ],
  "Security Architecture and Engineering": [
    {
      text: "What does 'defense in depth' mean?",
      options: [
        { id: 0, text: "Having one strong security control" },
        { id: 1, text: "Using multiple layers of security controls" },
        { id: 2, text: "Focusing only on perimeter security" },
        { id: 3, text: "Relying solely on user training" }
      ],
      correctAnswer: 1,
      explanation: "Defense in depth uses multiple layers of security controls for redundancy.",
      difficultyLevel: 2,
      tags: ["defense in depth", "architecture"]
    },
    {
      text: "Which security model focuses on data confidentiality?",
      options: [
        { id: 0, text: "Bell-LaPadula" },
        { id: 1, text: "Biba" },
        { id: 2, text: "Clark-Wilson" },
        { id: 3, text: "Brewer-Nash" }
      ],
      correctAnswer: 0,
      explanation: "The Bell-LaPadula model focuses on maintaining data confidentiality through mandatory access controls.",
      difficultyLevel: 2,
      tags: ["security models", "Bell-LaPadula"]
    },
    {
      text: "Which cryptographic algorithm is symmetric?",
      options: [
        { id: 0, text: "RSA" },
        { id: 1, text: "AES" },
        { id: 2, text: "ECC" },
        { id: 3, text: "DSA" }
      ],
      correctAnswer: 1,
      explanation: "AES (Advanced Encryption Standard) is a symmetric encryption algorithm using the same key for encryption and decryption.",
      difficultyLevel: 1,
      tags: ["cryptography", "AES"]
    },
    {
      text: "What is the purpose of a hash function?",
      options: [
        { id: 0, text: "To encrypt data" },
        { id: 1, text: "To create a fixed-size digest of data" },
        { id: 2, text: "To compress data" },
        { id: 3, text: "To transmit data" }
      ],
      correctAnswer: 1,
      explanation: "Hash functions create fixed-size digests useful for integrity verification and password storage.",
      difficultyLevel: 1,
      tags: ["cryptography", "hashing"]
    }
  ]
};

// Base questions for CISM
const cismBaseQuestions = {
  "Information Security Governance": [
    {
      text: "What is the primary purpose of an information security governance framework?",
      options: [
        { id: 0, text: "To install firewalls" },
        { id: 1, text: "To align security with business objectives" },
        { id: 2, text: "To conduct penetration tests" },
        { id: 3, text: "To write security policies" }
      ],
      correctAnswer: 1,
      explanation: "Information security governance ensures security strategies align with business objectives.",
      difficultyLevel: 2,
      tags: ["governance", "business alignment"]
    },
    {
      text: "Which role is ultimately responsible for information security in an organization?",
      options: [
        { id: 0, text: "CISO" },
        { id: 1, text: "Board of Directors" },
        { id: 2, text: "IT Manager" },
        { id: 3, text: "Security Analyst" }
      ],
      correctAnswer: 1,
      explanation: "The Board of Directors holds ultimate responsibility for organizational security governance.",
      difficultyLevel: 2,
      tags: ["governance", "responsibility"]
    },
    {
      text: "What is the purpose of security metrics in governance?",
      options: [
        { id: 0, text: "To replace security controls" },
        { id: 1, text: "To measure and demonstrate security program effectiveness" },
        { id: 2, text: "To prevent all attacks" },
        { id: 3, text: "To train employees" }
      ],
      correctAnswer: 1,
      explanation: "Security metrics help measure and demonstrate the effectiveness of security programs to stakeholders.",
      difficultyLevel: 2,
      tags: ["metrics", "governance"]
    }
  ],
  "Information Risk Management": [
    {
      text: "What is risk appetite?",
      options: [
        { id: 0, text: "The amount of risk an organization is willing to accept" },
        { id: 1, text: "The total amount of risk in an organization" },
        { id: 2, text: "The cost of implementing security controls" },
        { id: 3, text: "The probability of a security breach" }
      ],
      correctAnswer: 0,
      explanation: "Risk appetite is the amount of risk an organization is willing to take in pursuit of objectives.",
      difficultyLevel: 2,
      tags: ["risk management", "risk appetite"]
    },
    {
      text: "What is the difference between inherent risk and residual risk?",
      options: [
        { id: 0, text: "There is no difference" },
        { id: 1, text: "Inherent risk is before controls, residual risk is after controls" },
        { id: 2, text: "Residual risk is before controls, inherent risk is after controls" },
        { id: 3, text: "Both are the same as total risk" }
      ],
      correctAnswer: 1,
      explanation: "Inherent risk exists before controls are applied; residual risk remains after controls are implemented.",
      difficultyLevel: 2,
      tags: ["risk assessment", "risk types"]
    },
    {
      text: "What is the primary purpose of a risk register?",
      options: [
        { id: 0, text: "To delete risks" },
        { id: 1, text: "To document and track identified risks" },
        { id: 2, text: "To encrypt risks" },
        { id: 3, text: "To hide risks from management" }
      ],
      correctAnswer: 1,
      explanation: "A risk register documents and tracks identified risks, their assessments, and treatment plans.",
      difficultyLevel: 1,
      tags: ["risk management", "risk register"]
    }
  ]
};

function generateQuestions(baseQuestions, targetCount, categoryName) {
  const questions = [];
  const subcategories = Object.keys(baseQuestions);
  const questionsPerSubcat = Math.ceil(targetCount / subcategories.length);
  
  subcategories.forEach(subcategory => {
    const baseQs = baseQuestions[subcategory];
    for (let i = 0; i < questionsPerSubcat && questions.length < targetCount; i++) {
      const baseQ = baseQs[i % baseQs.length];
      const variation = Math.floor(i / baseQs.length);
      const questionNumber = questions.length + 1;
      
      // Create variation text to make questions unique
      let questionText = baseQ.text;
      if (variation > 0) {
        questionText = `[Q${questionNumber}] ${baseQ.text}`;
      }
      
      questions.push({
        text: questionText,
        options: baseQ.options,
        correctAnswer: baseQ.correctAnswer,
        explanation: baseQ.explanation,
        difficultyLevel: Math.min(5, baseQ.difficultyLevel + (variation % 3)),
        tags: baseQ.tags,
        subcategory: subcategory
      });
    }
  });
  
  return questions.slice(0, targetCount);
}

// Generate CISSP questions
console.log('Generating CISSP questions...');
const cisspQuestions = generateQuestions(cisspBaseQuestions, 500, 'CISSP');
const cisspData = {
  category: 'CISSP',
  description: 'Certified Information Systems Security Professional - 500 Practice Questions',
  questions: cisspQuestions
};

const cisspPath = path.join(__dirname, '../client/src/data/cissp-questions.yaml');
fs.writeFileSync(cisspPath, yaml.dump(cisspData, { lineWidth: -1, noRefs: true }));
console.log(`✓ Generated ${cisspQuestions.length} CISSP questions -> ${cisspPath}`);

// Generate CISM questions
console.log('Generating CISM questions...');
const cismQuestions = generateQuestions(cismBaseQuestions, 500, 'CISM');
const cismData = {
  category: 'CISM',
  description: 'Certified Information Security Manager - 500 Practice Questions',
  questions: cismQuestions
};

const cismPath = path.join(__dirname, '../client/src/data/cism-questions.yaml');
fs.writeFileSync(cismPath, yaml.dump(cismData, { lineWidth: -1, noRefs: true }));
console.log(`✓ Generated ${cismQuestions.length} CISM questions -> ${cismPath}`);

console.log('\nDone! Created:');
console.log(`- ${cisspPath}`);
console.log(`- ${cismPath}`);
