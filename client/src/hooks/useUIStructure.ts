import { useState, useEffect } from 'react';

interface RouteHierarchy {
  id: string;
  label: string;
  route: string;
  type: 'route' | 'component' | 'provider' | 'utility';
  description: string;
  icon: string;
  children?: RouteHierarchy[];
  dependencies?: string[];
  file?: string;
  hooks?: string[];
  apiCalls?: Array<{ type: string; endpoint: string }>;
  serverEndpoints?: Array<{ method: string; path: string }>;
}

interface UIStructureData {
  lastUpdated: string;
  generatedBy: string;
  routes: RouteHierarchy[];
  allComponents: Array<{
    name: string;
    type: string;
    file: string;
    imports: string[];
    apiCalls: Array<{ type: string; endpoint: string }>;
    hooks: string[];
  }>;
  serverRoutes: Array<{ method: string; path: string }>;
}

export const useUIStructure = () => {
  const [structureData, setStructureData] = useState<UIStructureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStructureData = async () => {
      try {
        setLoading(true);
        
        // Try to load from generated JSON file
        const response = await fetch('/src/data/ui-structure.json');
        
        if (response.ok) {
          const data = await response.json();
          setStructureData(data);
        } else {
          // Fallback to static data if JSON doesn't exist
          setStructureData(getStaticStructureData());
        }
      } catch (err) {
        console.warn('Failed to load dynamic UI structure, using static fallback');
        setStructureData(getStaticStructureData());
      } finally {
        setLoading(false);
      }
    };

    loadStructureData();
  }, []);

  // Watch for file changes in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch('/src/data/ui-structure.json');
          if (response.ok) {
            const data = await response.json();
            if (data.lastUpdated !== structureData?.lastUpdated) {
              setStructureData(data);
            }
          }
        } catch (err) {
          // Ignore errors in development polling
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [structureData?.lastUpdated]);

  return { structureData, loading, error };
};

// Static fallback data
const getStaticStructureData = (): UIStructureData => ({
  lastUpdated: new Date().toISOString(),
  generatedBy: 'Static',
  routes: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      route: '/dashboard',
      type: 'route',
      description: 'Main user dashboard with progress tracking and quick actions',
      icon: 'Folder',
      children: [
        {
          id: 'dashboard-hero',
          label: 'DashboardHero',
          route: '/dashboard',
          type: 'component',
          description: 'Progress cards, AI assistant, and performance metrics',
          icon: 'Puzzle',
          dependencies: ['User Stats API', 'Progress Tracking', 'Achievement System']
        },
        {
          id: 'activity-sidebar',
          label: 'ActivitySidebar',
          route: '/dashboard',
          type: 'component',
          description: 'Recent quizzes, mastery scores, and quick actions',
          icon: 'BookOpen',
          dependencies: ['Quiz History API', 'Mastery Score API', 'Quick Actions']
        },
        {
          id: 'learning-mode-selector',
          label: 'LearningModeSelector',
          route: '/dashboard',
          type: 'component',
          description: 'Certification selection and quiz configuration',
          icon: 'Settings',
          dependencies: ['Categories API', 'Quiz Creation API']
        }
      ]
    },
    {
      id: 'quiz',
      label: 'Quiz System',
      route: '/quiz',
      type: 'route',
      description: 'Interactive learning sessions with immediate feedback',
      icon: 'Folder',
      children: [
        {
          id: 'quiz-interface',
          label: 'QuizInterface',
          route: '/quiz/:id',
          type: 'component',
          description: 'Question display, answer selection, and real-time feedback',
          icon: 'FileText',
          dependencies: ['Question API', 'Answer Submission', 'Progress Tracking']
        },
        {
          id: 'quiz-results',
          label: 'Results Page',
          route: '/results/:id',
          type: 'component',
          description: 'Performance analytics, score display, and recommendations',
          icon: 'Puzzle',
          dependencies: ['Quiz Results API', 'Performance Analytics', 'Recommendation Engine']
        },
        {
          id: 'review-answers',
          label: 'Review Page',
          route: '/review/:id',
          type: 'component',
          description: 'Detailed answer review with explanations and navigation',
          icon: 'Eye',
          dependencies: ['Quiz History API', 'Answer Explanations']
        }
      ]
    },
    {
      id: 'admin',
      label: 'Admin System',
      route: '/admin',
      type: 'route',
      description: 'Multi-tenant administration and management portal',
      icon: 'Folder',
      children: [
        {
          id: 'tenant-management',
          label: 'Tenant Management',
          route: '/admin',
          type: 'component',
          description: 'Organization management with statistics and settings',
          icon: 'Users',
          dependencies: ['Tenant API', 'Statistics API', 'CRUD Operations']
        },
        {
          id: 'question-admin',
          label: 'Question Management',
          route: '/admin',
          type: 'component',
          description: 'Question database administration and bulk operations',
          icon: 'Database',
          dependencies: ['Question CRUD API', 'CSV Import/Export', 'Search & Filter']
        },
        {
          id: 'user-admin',
          label: 'User Management',
          route: '/admin',
          type: 'component',
          description: 'User administration and role-based access control',
          icon: 'Shield',
          dependencies: ['User API', 'Role Management', 'Access Control']
        }
      ]
    },
    {
      id: 'achievements',
      label: 'Achievements',
      route: '/achievements',
      type: 'route',
      description: 'Gamification system with badges and progress tracking',
      icon: 'Folder',
      children: [
        {
          id: 'achievement-badges',
          label: 'AchievementBadges',
          route: '/achievements',
          type: 'component',
          description: 'Badge display with progress indicators and categories',
          icon: 'Trophy',
          dependencies: ['Badges API', 'Progress Tracking', 'Achievement Engine']
        },
        {
          id: 'level-progress',
          label: 'LevelProgress',
          route: '/achievements',
          type: 'component',
          description: 'XP tracking, level progression, and motivational display',
          icon: 'Puzzle',
          dependencies: ['XP System', 'Level Calculation', 'User Stats']
        }
      ]
    },
    {
      id: 'accessibility',
      label: 'Accessibility',
      route: '/accessibility',
      type: 'route',
      description: 'WCAG compliance tools and contrast analysis',
      icon: 'Folder',
      children: [
        {
          id: 'contrast-analyzer',
          label: 'ContrastAnalyzer',
          route: '/accessibility',
          type: 'component',
          description: 'Real-time contrast ratio analysis for theme compliance',
          icon: 'Eye',
          dependencies: ['Theme System', 'WCAG Guidelines', 'Color Analysis']
        }
      ]
    },
    {
      id: 'login',
      label: 'Authentication',
      route: '/login',
      type: 'route',
      description: 'User authentication and registration system',
      icon: 'Folder',
      children: [
        {
          id: 'login-form',
          label: 'Login Form',
          route: '/login',
          type: 'component',
          description: 'User authentication with validation and error handling',
          icon: 'Shield',
          dependencies: ['Auth API', 'Form Validation', 'Session Management']
        }
      ]
    }
  ],
  allComponents: [],
  serverRoutes: []
});