// Study materials data for marketplace
// CLAY OS style study materials

export interface StudyMaterial {
  id: string;
  title: string;
  type: 'PDF' | 'VIDEO';
  rating: number;
  price: number;
  description?: string;
  format?: string;
  size?: string;
  duration?: string;
  author?: string;
  lastUpdated?: string;
  subject?: string; // Subject category for filtering
  tags?: string[]; // Additional tags for filtering
}

export const studyMaterials: StudyMaterial[] = [
  {
    id: '1',
    title: 'Advanced Algorithms Notes',
    type: 'PDF',
    rating: 4.9,
    price: 12,
    description:
      'Comprehensive notes covering advanced algorithm topics including dynamic programming, graph algorithms, and complexity analysis. Perfect for exam preparation and deep understanding.',
    format: 'PDF',
    size: '15 MB',
    author: 'Dr. Sarah Chen',
    lastUpdated: 'December 2024',
    subject: 'Computer Science',
    tags: ['algorithms', 'data structures', 'programming'],
  },
  {
    id: '2',
    title: 'Organic Chem Video Course',
    type: 'VIDEO',
    rating: 4.8,
    price: 45,
    description:
      'Complete video course covering all aspects of organic chemistry with visual demonstrations, reaction mechanisms, and problem-solving strategies.',
    duration: '12 hours',
    author: 'Prof. Michael Torres',
    lastUpdated: 'November 2024',
    subject: 'Chemistry',
    tags: ['organic chemistry', 'reactions', 'mechanisms'],
  },
  {
    id: '3',
    title: 'Economics 101 Guide',
    type: 'PDF',
    rating: 4.6,
    price: 8.5,
    description:
      'Essential guide to microeconomics and macroeconomics fundamentals. Includes practice problems and real-world examples.',
    format: 'PDF',
    size: '8 MB',
    author: 'Dr. James Wilson',
    lastUpdated: 'October 2024',
    subject: 'Economics',
    tags: ['economics', 'microeconomics', 'macroeconomics'],
  },
  {
    id: '4',
    title: 'Physics Lab Manual',
    type: 'PDF',
    rating: 4.7,
    price: 15,
    description:
      'Detailed lab procedures and experiments for physics courses. Includes safety guidelines, data collection templates, and analysis techniques.',
    format: 'PDF',
    size: '22 MB',
    author: 'Dr. Emily Rodriguez',
    lastUpdated: 'December 2024',
    subject: 'Physics',
    tags: ['physics', 'experiments', 'lab work'],
  },
  {
    id: '5',
    title: 'Calculus Lecture Series',
    type: 'VIDEO',
    rating: 4.9,
    price: 39,
    description:
      'Complete calculus course from limits to integration. Features step-by-step explanations and worked examples.',
    duration: '18 hours',
    author: 'Prof. David Kim',
    lastUpdated: 'January 2025',
    subject: 'Mathematics',
    tags: ['calculus', 'mathematics', 'integration', 'derivatives'],
  },
  {
    id: '6',
    title: 'Chemistry Study Pack',
    type: 'PDF',
    rating: 4.5,
    price: 10,
    description:
      'Study materials for general chemistry including periodic table trends, stoichiometry, and chemical bonding.',
    format: 'PDF',
    size: '12 MB',
    author: 'Dr. Lisa Anderson',
    lastUpdated: 'September 2024',
    subject: 'Chemistry',
    tags: ['chemistry', 'periodic table', 'bonding'],
  },
];
