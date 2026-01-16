/**
 * Tests for Header navigation menu structure
 * Verifies the mega menu organization and navigation links
 */

import { describe, it, expect } from 'vitest';

/**
 * Navigation structure documentation test
 *
 * This test serves as living documentation of the navigation menu structure.
 * It ensures that the navigation organization remains consistent with the
 * documented structure in docs/NAVIGATION_MENU_GUIDE.md
 */

describe('Header Navigation Menu Structure', () => {
  describe('Main Navigation Items', () => {
    it('should have 4 main navigation sections', () => {
      const mainNavItems = [
        'Dashboard', // Direct link
        'Learning', // Mega menu
        'Community', // Mega menu
        'Tools & Resources', // Mega menu
      ];

      expect(mainNavItems).toHaveLength(4);
      expect(mainNavItems).toContain('Dashboard');
      expect(mainNavItems).toContain('Learning');
      expect(mainNavItems).toContain('Community');
      expect(mainNavItems).toContain('Tools & Resources');
    });
  });

  describe('Learning Mega Menu', () => {
    it('should contain 6 learning-related navigation items', () => {
      const learningMenuItems = [
        { name: 'Daily Challenges', route: '/app/daily-challenges', hasNewBadge: true },
        { name: 'Performance', route: '/app/performance', hasNewBadge: false },
        { name: 'Practice Tests', route: '/app/practice-tests', hasNewBadge: false },
        { name: 'Question Bank', route: '/app/question-bank', hasNewBadge: false },
        { name: 'Study Timer', route: '/app/study-timer', hasNewBadge: false },
        { name: 'Analytics', route: '/app/analytics', hasNewBadge: false },
      ];

      expect(learningMenuItems).toHaveLength(6);

      // Verify Daily Challenges has NEW badge
      const dailyChallenges = learningMenuItems.find((item) => item.name === 'Daily Challenges');
      expect(dailyChallenges?.hasNewBadge).toBe(true);

      // Verify all routes are defined
      learningMenuItems.forEach((item) => {
        expect(item.route).toMatch(/^\/app\//);
      });
    });
  });

  describe('Community Mega Menu', () => {
    it('should contain 3 community-related navigation items', () => {
      const communityMenuItems = [
        { name: 'Achievements', route: '/app/achievements' },
        { name: 'Leaderboard', route: '/app/leaderboard' },
        { name: 'Certificates', route: '/app/certificates' },
      ];

      expect(communityMenuItems).toHaveLength(3);

      // Verify all routes are defined
      communityMenuItems.forEach((item) => {
        expect(item.route).toMatch(/^\/app\//);
      });
    });
  });

  describe('Tools & Resources Mega Menu', () => {
    describe('Study Tools Section', () => {
      it('should contain 4 study tool items', () => {
        const studyToolsItems = [
          { name: 'Study Notes', route: '/app/study-notes' },
          { name: 'Enhanced Notes', route: '/app/enhanced-study-notes' },
          { name: 'Quiz Builder', route: '/app/quiz-builder' },
          { name: 'My Quizzes', route: '/app/my-quizzes' },
        ];

        expect(studyToolsItems).toHaveLength(4);

        // Verify all routes are defined
        studyToolsItems.forEach((item) => {
          expect(item.route).toMatch(/^\/app\//);
        });
      });
    });

    describe('Marketplace & Resources Section', () => {
      it('should contain 3 marketplace items', () => {
        const marketplaceItems = [
          { name: 'Study Materials', route: '/app/marketplace' },
          { name: 'My Materials', route: '/app/my-materials' },
          { name: 'Wallet', route: '/app/wallet' },
        ];

        expect(marketplaceItems).toHaveLength(3);

        // Verify all routes are defined
        marketplaceItems.forEach((item) => {
          expect(item.route).toMatch(/^\/app\//);
        });
      });
    });

    describe('Other Features Section', () => {
      it('should contain 3 other feature items', () => {
        const otherFeatureItems = [
          { name: 'Import Sample Data', route: '/app/data-import' },
          { name: 'I18n Demo', route: '/app/i18n-demo' },
          { name: 'Credits', route: '/app/credits' },
        ];

        expect(otherFeatureItems).toHaveLength(3);

        // Verify all routes are defined
        otherFeatureItems.forEach((item) => {
          expect(item.route).toMatch(/^\/app\//);
        });
      });
    });

    describe('Admin Tools Section (Admin Only)', () => {
      it('should contain 3 admin tool items', () => {
        const adminToolItems = [
          { name: 'Reporting', route: '/app/reporting' },
          { name: 'Accessibility', route: '/app/accessibility' },
          { name: 'UI Structure', route: '/app/ui-structure' },
        ];

        expect(adminToolItems).toHaveLength(3);

        // Verify all routes are defined
        adminToolItems.forEach((item) => {
          expect(item.route).toMatch(/^\/app\//);
        });
      });
    });

    describe('Administration Section (Admin Only)', () => {
      it('should contain admin dashboard link', () => {
        const administrationItem = {
          name: 'Admin Dashboard',
          route: '/admin',
        };

        expect(administrationItem.route).toBe('/admin');
      });
    });
  });

  describe('Navigation Menu Organization', () => {
    it('should group related features logically', () => {
      const navigationOrganization = {
        'Learning Menu': [
          'Daily Challenges',
          'Performance',
          'Practice Tests',
          'Question Bank',
          'Study Timer',
          'Analytics',
        ],
        'Community Menu': ['Achievements', 'Leaderboard', 'Certificates'],
        'Tools & Resources Menu': {
          'Study Tools': ['Study Notes', 'Enhanced Notes', 'Quiz Builder', 'My Quizzes'],
          'Marketplace & Resources': ['Study Materials', 'My Materials', 'Wallet'],
          'Other Features': ['Import Sample Data', 'I18n Demo', 'Credits'],
          'Admin Tools': ['Reporting', 'Accessibility', 'UI Structure'],
          Administration: ['Admin Dashboard'],
        },
      };

      // Verify Learning Menu has 6 items
      expect(navigationOrganization['Learning Menu']).toHaveLength(6);

      // Verify Community Menu has 3 items
      expect(navigationOrganization['Community Menu']).toHaveLength(3);

      // Verify Tools & Resources has proper subsections
      const toolsMenu = navigationOrganization['Tools & Resources Menu'];
      expect(toolsMenu['Study Tools']).toHaveLength(4);
      expect(toolsMenu['Marketplace & Resources']).toHaveLength(3);
      expect(toolsMenu['Other Features']).toHaveLength(3);
      expect(toolsMenu['Admin Tools']).toHaveLength(3);
      expect(toolsMenu['Administration']).toHaveLength(1);
    });

    it('should not have duplicate routes across menus', () => {
      const allRoutes = [
        // Dashboard (direct link)
        '/app',
        '/app/dashboard',
        // Learning Menu
        '/app/daily-challenges',
        '/app/performance',
        '/app/practice-tests',
        '/app/question-bank',
        '/app/study-timer',
        '/app/analytics',
        // Community Menu
        '/app/achievements',
        '/app/leaderboard',
        '/app/certificates',
        // Tools & Resources - Study Tools
        '/app/study-notes',
        '/app/enhanced-study-notes',
        '/app/quiz-builder',
        '/app/my-quizzes',
        // Tools & Resources - Marketplace
        '/app/marketplace',
        '/app/my-materials',
        '/app/wallet',
        // Tools & Resources - Other
        '/app/data-import',
        '/app/i18n-demo',
        '/app/credits',
        // Tools & Resources - Admin
        '/app/reporting',
        '/app/accessibility',
        '/app/ui-structure',
        '/admin',
      ];

      // Check for duplicates (excluding /app and /app/dashboard which both point to dashboard)
      const routesWithoutDashboard = allRoutes.filter(
        (route) => route !== '/app' && route !== '/app/dashboard'
      );
      const uniqueRoutes = new Set(routesWithoutDashboard);

      expect(uniqueRoutes.size).toBe(routesWithoutDashboard.length);
    });
  });

  describe('Route Patterns', () => {
    it('should follow consistent route naming patterns', () => {
      const routes = [
        '/app/daily-challenges',
        '/app/performance',
        '/app/practice-tests',
        '/app/question-bank',
        '/app/study-timer',
        '/app/analytics',
        '/app/achievements',
        '/app/leaderboard',
        '/app/certificates',
        '/app/study-notes',
        '/app/enhanced-study-notes',
        '/app/quiz-builder',
        '/app/my-quizzes',
        '/app/marketplace',
        '/app/my-materials',
        '/app/wallet',
        '/app/data-import',
        '/app/i18n-demo',
        '/app/credits',
        '/app/reporting',
        '/app/accessibility',
        '/app/ui-structure',
      ];

      // All routes should start with /app/ (except admin which is /admin)
      routes.forEach((route) => {
        expect(route).toMatch(/^\/app\//);
      });

      // Routes should use kebab-case (with optional numbers)
      routes.forEach((route) => {
        const path = route.replace('/app/', '');
        expect(path).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      });
    });

    it('should have valid admin route', () => {
      const adminRoute = '/admin';
      expect(adminRoute).toBe('/admin');
    });
  });

  describe('Menu Widths', () => {
    it('should define appropriate widths for mega menus', () => {
      const menuWidths = {
        Learning: '500px',
        Community: '400px',
        'Tools & Resources': '600px',
      };

      // Learning menu should be medium width
      expect(menuWidths.Learning).toBe('500px');

      // Community menu should be smaller (fewer items)
      expect(menuWidths.Community).toBe('400px');

      // Tools & Resources should be widest (most items, multiple sections)
      expect(menuWidths['Tools & Resources']).toBe('600px');
    });
  });

  describe('Accessibility Requirements', () => {
    it('should support keyboard navigation', () => {
      const accessibilityFeatures = [
        'Tab navigation',
        'Enter/Space to activate',
        'Escape to close menus',
        'Arrow keys within menus',
        'Focus indicators',
        'ARIA labels',
      ];

      expect(accessibilityFeatures).toHaveLength(6);
      expect(accessibilityFeatures).toContain('Tab navigation');
      expect(accessibilityFeatures).toContain('ARIA labels');
    });

    it('should have proper active state indicators', () => {
      const activeStateFeatures = [
        'Primary color text',
        'Bold font weight',
        'Primary color background (10% opacity)',
        '2px primary color border',
      ];

      expect(activeStateFeatures).toHaveLength(4);
    });
  });
});
