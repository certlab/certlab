#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Automatically sync UI structure JSON with actual application architecture
 * This script scans the codebase and updates the UI structure data
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UIStructureSync {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.clientSrc = path.join(this.projectRoot, 'client/src');
    this.serverSrc = path.join(this.projectRoot, 'server');
    this.structureFile = path.join(this.clientSrc, 'data/ui-structure.json');
    this.lastSyncFile = path.join(this.projectRoot, '.ui-sync-timestamp');
  }

  // Scan for React components and pages
  scanComponents() {
    const components = new Map();
    
    // Scan pages directory
    const pagesDir = path.join(this.clientSrc, 'pages');
    if (fs.existsSync(pagesDir)) {
      const pageFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));
      
      pageFiles.forEach(file => {
        const filePath = path.join(pagesDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const componentName = path.basename(file, '.tsx');
        
        components.set(componentName, {
          type: 'page',
          file: `pages/${file}`,
          imports: this.extractImports(content),
          apiCalls: this.extractApiCalls(content),
          hooks: this.extractHooks(content)
        });
      });
    }

    // Scan components directory
    const componentsDir = path.join(this.clientSrc, 'components');
    if (fs.existsSync(componentsDir)) {
      this.scanDirectory(componentsDir, 'components', components);
    }

    return components;
  }

  scanDirectory(dir, prefix, components) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && item !== 'ui') {
        this.scanDirectory(itemPath, `${prefix}/${item}`, components);
      } else if (item.endsWith('.tsx') && !item.includes('.test.')) {
        const content = fs.readFileSync(itemPath, 'utf8');
        const componentName = path.basename(item, '.tsx');
        
        components.set(componentName, {
          type: 'component',
          file: `${prefix}/${item}`,
          imports: this.extractImports(content),
          apiCalls: this.extractApiCalls(content),
          hooks: this.extractHooks(content)
        });
      }
    });
  }

  // Extract import statements
  extractImports(content) {
    const imports = [];
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('@/') || importPath.startsWith('./') || importPath.startsWith('../')) {
        imports.push(importPath);
      }
    }
    
    return imports;
  }

  // Extract API calls
  extractApiCalls(content) {
    const apiCalls = [];
    
    // Look for fetch calls
    const fetchRegex = /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = fetchRegex.exec(content)) !== null) {
      apiCalls.push({ type: 'fetch', endpoint: match[1] });
    }

    // Look for apiRequest calls
    const apiRequestRegex = /apiRequest\s*\(\s*['"`]([^'"`]+)['"`]/g;
    while ((match = apiRequestRegex.exec(content)) !== null) {
      apiCalls.push({ type: 'apiRequest', endpoint: match[1] });
    }

    // Look for useQuery calls
    const useQueryRegex = /useQuery\s*\(\s*\{\s*queryKey:\s*\[['"`]([^'"`]+)['"`]/g;
    while ((match = useQueryRegex.exec(content)) !== null) {
      apiCalls.push({ type: 'useQuery', endpoint: match[1] });
    }

    return apiCalls;
  }

  // Extract React hooks
  extractHooks(content) {
    const hooks = [];
    const hookRegex = /use[A-Z][a-zA-Z]*\s*\(/g;
    let match;
    
    while ((match = hookRegex.exec(content)) !== null) {
      const hookName = match[0].replace('(', '');
      if (!hooks.includes(hookName)) {
        hooks.push(hookName);
      }
    }
    
    return hooks;
  }

  // Scan server routes
  scanServerRoutes() {
    const routes = [];
    const routesFile = path.join(this.serverSrc, 'routes.ts');
    
    if (fs.existsSync(routesFile)) {
      const content = fs.readFileSync(routesFile, 'utf8');
      
      // Extract route definitions
      const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routeRegex.exec(content)) !== null) {
        routes.push({
          method: match[1].toUpperCase(),
          path: match[2]
        });
      }
    }

    // Scan admin routes
    const adminRoutesFile = path.join(this.serverSrc, 'admin-routes.ts');
    if (fs.existsSync(adminRoutesFile)) {
      const content = fs.readFileSync(adminRoutesFile, 'utf8');
      const routeRegex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      
      while ((match = routeRegex.exec(content)) !== null) {
        routes.push({
          method: match[1].toUpperCase(),
          path: match[2]
        });
      }
    }

    return routes;
  }

  // Generate updated UI structure
  generateUIStructure() {
    const components = this.scanComponents();
    const serverRoutes = this.scanServerRoutes();
    
    // Build route hierarchy based on actual file structure
    const routeHierarchy = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        route: '/dashboard',
        type: 'route',
        description: 'Main user dashboard with progress tracking and quick actions',
        icon: 'Home',
        children: this.getComponentsForRoute('dashboard', components),
        serverEndpoints: serverRoutes.filter(r => r.path.includes('/user') || r.path.includes('/stats'))
      },
      {
        id: 'quiz',
        label: 'Quiz System',
        route: '/quiz',
        type: 'route',
        description: 'Interactive learning sessions with immediate feedback',
        icon: 'BookOpen',
        children: this.getComponentsForRoute('quiz', components),
        serverEndpoints: serverRoutes.filter(r => r.path.includes('/quiz') || r.path.includes('/question'))
      },
      {
        id: 'admin',
        label: 'Admin System',
        route: '/admin',
        type: 'route',
        description: 'Multi-tenant administration and management portal',
        icon: 'Settings',
        children: this.getComponentsForRoute('admin', components),
        serverEndpoints: serverRoutes.filter(r => r.path.includes('/admin'))
      },
      {
        id: 'achievements',
        label: 'Achievements',
        route: '/achievements',
        type: 'route',
        description: 'Gamification system with badges and progress tracking',
        icon: 'Trophy',
        children: this.getComponentsForRoute('achievement', components),
        serverEndpoints: serverRoutes.filter(r => r.path.includes('/badge') || r.path.includes('/achievement'))
      },
      {
        id: 'accessibility',
        label: 'Accessibility',
        route: '/accessibility',
        type: 'route',
        description: 'WCAG compliance tools and contrast analysis',
        icon: 'Eye',
        children: this.getComponentsForRoute('accessibility', components),
        serverEndpoints: []
      },
      {
        id: 'login',
        label: 'Authentication',
        route: '/login',
        type: 'route',
        description: 'User authentication and registration system',
        icon: 'Shield',
        children: this.getComponentsForRoute('login', components),
        serverEndpoints: serverRoutes.filter(r => r.path.includes('/auth') || r.path.includes('/login') || r.path.includes('/register'))
      }
    ];

    return {
      lastUpdated: new Date().toISOString(),
      generatedBy: 'UIStructureSync',
      routes: routeHierarchy,
      allComponents: Array.from(components.entries()).map(([name, data]) => ({
        name,
        ...data
      })),
      serverRoutes
    };
  }

  getComponentsForRoute(routePrefix, components) {
    const routeComponents = [];
    
    components.forEach((data, name) => {
      const lowerName = name.toLowerCase();
      const lowerPrefix = routePrefix.toLowerCase();
      
      if (lowerName.includes(lowerPrefix) || 
          data.file.toLowerCase().includes(lowerPrefix) ||
          (routePrefix === 'dashboard' && ['DashboardHero', 'ActivitySidebar', 'LearningModeSelector'].includes(name)) ||
          (routePrefix === 'quiz' && ['QuizInterface', 'QuizCreator'].includes(name)) ||
          (routePrefix === 'admin' && name.toLowerCase().includes('admin')) ||
          (routePrefix === 'achievement' && ['AchievementBadges', 'AchievementProgress', 'LevelProgress'].includes(name))) {
        
        routeComponents.push({
          id: name.toLowerCase().replace(/([A-Z])/g, '-$1').slice(1),
          label: name,
          route: this.inferRouteFromComponent(name, routePrefix),
          type: 'component',
          description: this.generateDescription(name, data),
          icon: this.inferIcon(name),
          dependencies: this.generateDependencies(data),
          file: data.file,
          hooks: data.hooks,
          apiCalls: data.apiCalls
        });
      }
    });

    return routeComponents;
  }

  inferRouteFromComponent(componentName, routePrefix) {
    if (routePrefix === 'quiz' && componentName.includes('Results')) return '/results/:id';
    if (routePrefix === 'quiz' && componentName.includes('Review')) return '/review/:id';
    if (routePrefix === 'quiz') return '/quiz/:id';
    return `/${routePrefix}`;
  }

  generateDescription(name, data) {
    // Generate description based on component name and usage
    const descriptions = {
      'DashboardHero': 'Progress cards, AI assistant, and performance metrics',
      'ActivitySidebar': 'Recent quizzes, mastery scores, and quick actions',
      'LearningModeSelector': 'Certification selection and quiz configuration',
      'QuizInterface': 'Question display, answer selection, and real-time feedback',
      'AchievementBadges': 'Badge display with progress indicators and categories',
      'LevelProgress': 'XP tracking, level progression, and motivational display',
      'ContrastAnalyzer': 'Real-time contrast ratio analysis for theme compliance'
    };

    return descriptions[name] || `${name} component with ${data.apiCalls.length} API integrations`;
  }

  generateDependencies(data) {
    const deps = [];
    
    // Add API endpoints as dependencies
    data.apiCalls.forEach(api => {
      deps.push(`${api.type.toUpperCase()}: ${api.endpoint}`);
    });

    // Add significant hooks as dependencies
    const significantHooks = data.hooks.filter(hook => 
      ['useQuery', 'useMutation', 'useLocalStorage', 'useToast'].includes(hook)
    );
    deps.push(...significantHooks);

    return deps.length > 0 ? deps : ['React Components', 'UI Libraries'];
  }

  inferIcon(name) {
    const iconMap = {
      'Dashboard': 'BarChart3',
      'Hero': 'BarChart3',
      'Activity': 'BookOpen',
      'Learning': 'Settings',
      'Quiz': 'FileText',
      'Results': 'BarChart3',
      'Review': 'Eye',
      'Achievement': 'Trophy',
      'Level': 'BarChart3',
      'Progress': 'BarChart3',
      'Contrast': 'Eye',
      'Admin': 'Settings',
      'Tenant': 'Users',
      'Question': 'Database',
      'User': 'Shield',
      'Login': 'Shield'
    };

    for (const [key, icon] of Object.entries(iconMap)) {
      if (name.includes(key)) return icon;
    }

    return 'Component';
  }

  // Check if sync is needed
  needsSync() {
    if (!fs.existsSync(this.lastSyncFile)) return true;
    
    const lastSync = parseInt(fs.readFileSync(this.lastSyncFile, 'utf8'));
    const now = Date.now();
    
    // Check if any source files have been modified since last sync
    const sourceFiles = [
      ...this.getAllFiles(this.clientSrc, ['.tsx', '.ts']),
      ...this.getAllFiles(this.serverSrc, ['.ts'])
    ];

    for (const file of sourceFiles) {
      const stat = fs.statSync(file);
      if (stat.mtime.getTime() > lastSync) {
        return true;
      }
    }

    return false;
  }

  getAllFiles(dir, extensions) {
    const files = [];
    
    if (!fs.existsSync(dir)) return files;
    
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.getAllFiles(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Perform sync
  async sync() {
    console.log('🔄 Syncing UI structure...');
    
    if (!this.needsSync()) {
      console.log('✅ UI structure is already up to date');
      return;
    }

    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.structureFile);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Generate new structure
      const structure = this.generateUIStructure();
      
      // Write to file
      fs.writeFileSync(this.structureFile, JSON.stringify(structure, null, 2));
      
      // Update sync timestamp
      fs.writeFileSync(this.lastSyncFile, Date.now().toString());
      
      console.log(`✅ UI structure updated: ${structure.routes.length} routes, ${structure.allComponents.length} components`);
      console.log(`📁 Structure saved to: ${path.relative(this.projectRoot, this.structureFile)}`);
      
    } catch (error) {
      console.error('❌ Error syncing UI structure:', error.message);
      throw error;
    }
  }
}

// Run sync if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const sync = new UIStructureSync();
  sync.sync().catch(console.error);
}

export default UIStructureSync;