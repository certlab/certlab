#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { glob } from 'glob';
import chokidar from 'chokidar';
import { 
  parseTypeScriptFile,
  extractRoutes,
  analyzeComponent,
  detectUILibraries
} from './analyzer';
import type { UIStructureConfig, UIStructureMap } from './types';

export class UIStructureAnalyzer {
  private config: UIStructureConfig;
  private cache: Map<string, any> = new Map();
  private watcher: chokidar.FSWatcher | null = null;
  private plugins: Array<any> = [];
  private outputPath: string;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<UIStructureConfig> = {}) {
    this.config = {
      rootDir: config.rootDir || './client/src',
      outputPath: config.outputPath || './ui-structure-map.yaml',
      watch: config.watch ?? true,
      debounceMs: config.debounceMs || 500,
      include: config.include || ['**/*.tsx', '**/*.jsx'],
      exclude: config.exclude || ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
      ...config
    };
    this.outputPath = this.config.outputPath;
  }

  // Plugin system for extensibility
  use(plugin: any) {
    if (typeof plugin.install === 'function') {
      plugin.install(this);
      this.plugins.push(plugin);
    }
    return this;
  }

  async analyze(): Promise<UIStructureMap> {
    console.log('🔍 Analyzing UI structure...');
    
    const structure: UIStructureMap = {
      app_metadata: await this.getAppMetadata(),
      global_providers: await this.getGlobalProviders(),
      global_components: await this.getGlobalComponents(),
      pages: await this.analyzePages(),
      ui_components: await this.detectUIComponents(),
      theme_system: await this.analyzeThemeSystem(),
      responsive_breakpoints: await this.getBreakpoints(),
      accessibility_features: await this.getAccessibilityFeatures()
    };

    // Run plugin transformers
    for (const plugin of this.plugins) {
      if (plugin.transform) {
        await plugin.transform(structure, this);
      }
    }

    return structure;
  }

  private async getAppMetadata() {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return {
        name: pkg.name || 'React Application',
        version: pkg.version || '1.0.0',
        architecture: 'Full-stack TypeScript with React + Express'
      };
    }
    return {
      name: 'React Application',
      version: '1.0.0',
      architecture: 'React TypeScript'
    };
  }

  private async getGlobalProviders() {
    const appPath = path.join(this.config.rootDir, 'App.tsx');
    if (fs.existsSync(appPath)) {
      const content = fs.readFileSync(appPath, 'utf-8');
      const providers: string[] = [];
      
      // Find Provider components
      const providerPattern = /(\w+Provider)/g;
      const matches = content.match(providerPattern);
      if (matches) {
        providers.push(...new Set(matches));
      }
      
      return providers;
    }
    return [];
  }

  private async getGlobalComponents() {
    const appPath = path.join(this.config.rootDir, 'App.tsx');
    if (fs.existsSync(appPath)) {
      const ast = await parseTypeScriptFile(appPath);
      return analyzeComponent(ast).globalComponents || {};
    }
    return {};
  }

  private async analyzePages() {
    const pages: any = {};
    const pagesDir = path.join(this.config.rootDir, 'pages');
    
    if (fs.existsSync(pagesDir)) {
      const pageFiles = await glob('**/*.tsx', { 
        cwd: pagesDir,
        ignore: this.config.exclude 
      });
      
      for (const file of pageFiles) {
        const filePath = path.join(pagesDir, file);
        const pageName = path.basename(file, '.tsx');
        const ast = await parseTypeScriptFile(filePath);
        const analysis = analyzeComponent(ast);
        
        // Extract route from App.tsx
        const route = await this.findRouteForComponent(pageName);
        
        pages[pageName] = {
          route,
          auth_required: analysis.authRequired,
          layout: analysis.layout,
          sections: analysis.sections,
          components: analysis.components
        };
      }
    }
    
    // Also analyze routes from App.tsx
    const appPath = path.join(this.config.rootDir, 'App.tsx');
    if (fs.existsSync(appPath)) {
      const routes = await extractRoutes(appPath);
      for (const route of routes) {
        if (!pages[route.component]) {
          pages[route.component] = {
            route: route.path,
            auth_required: route.authRequired,
            component: route.component
          };
        }
      }
    }
    
    return pages;
  }

  private async findRouteForComponent(componentName: string) {
    const appPath = path.join(this.config.rootDir, 'App.tsx');
    if (fs.existsSync(appPath)) {
      const routes = await extractRoutes(appPath);
      const route = routes.find(r => 
        r.component.toLowerCase() === componentName.toLowerCase()
      );
      return route?.path || null;
    }
    return null;
  }

  private async detectUIComponents() {
    const uiDir = path.join(this.config.rootDir, 'components/ui');
    const components: any = {
      shadcn_components: {},
      custom_components: {}
    };
    
    if (fs.existsSync(uiDir)) {
      const componentFiles = await glob('**/*.tsx', {
        cwd: uiDir,
        ignore: this.config.exclude
      });
      
      for (const file of componentFiles) {
        const componentName = path.basename(file, '.tsx');
        const filePath = path.join(uiDir, file);
        const category = this.categorizeUIComponent(componentName);
        
        if (!components.shadcn_components[category]) {
          components.shadcn_components[category] = [];
        }
        
        components.shadcn_components[category].push({
          name: componentName,
          path: file
        });
      }
    }
    
    return components;
  }

  private categorizeUIComponent(name: string): string {
    const categories: Record<string, string[]> = {
      interactive: ['button', 'checkbox', 'radio', 'slider', 'switch', 'toggle', 'input', 'textarea', 'select'],
      navigation: ['accordion', 'breadcrumb', 'menu', 'tabs', 'navigation'],
      display: ['card', 'table', 'progress', 'badge', 'avatar', 'alert'],
      overlays: ['dialog', 'sheet', 'popover', 'tooltip', 'toast']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => name.toLowerCase().includes(keyword))) {
        return category;
      }
    }
    return 'other';
  }

  private async analyzeThemeSystem() {
    const tailwindConfig = path.join(process.cwd(), 'tailwind.config.ts');
    if (fs.existsSync(tailwindConfig)) {
      const content = fs.readFileSync(tailwindConfig, 'utf-8');
      
      // Extract theme colors
      const themeMatch = content.match(/theme:\s*{([^}]+)}/s);
      const darkModeMatch = content.match(/darkMode:\s*\[(.*?)\]/);
      
      return {
        dark_mode: darkModeMatch ? darkModeMatch[1].replace(/['"]/g, '') : 'class',
        css_variables: this.extractCSSVariables()
      };
    }
    return {};
  }

  private extractCSSVariables() {
    const cssFile = path.join(this.config.rootDir, '../index.css');
    const variables: string[] = [];
    
    if (fs.existsSync(cssFile)) {
      const content = fs.readFileSync(cssFile, 'utf-8');
      const varPattern = /--[\w-]+/g;
      const matches = content.match(varPattern);
      if (matches) {
        variables.push(...new Set(matches));
      }
    }
    
    return variables;
  }

  private async getBreakpoints() {
    return {
      mobile: 'sm:640px',
      tablet: 'md:768px', 
      laptop: 'lg:1024px',
      desktop: 'xl:1280px',
      wide: '2xl:1536px'
    };
  }

  private async getAccessibilityFeatures() {
    return [
      'ARIA labels',
      'Keyboard navigation',
      'Screen reader support',
      'Focus indicators',
      'High contrast mode',
      'data-testid attributes'
    ];
  }

  async generateYAML(structure?: UIStructureMap) {
    const data = structure || await this.analyze();
    const yamlContent = yaml.dump(data, {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    
    // Add header comment
    const header = `# UI Structure Map - Auto-generated
# Generated: ${new Date().toISOString()}
# DO NOT EDIT - This file is automatically generated
\n`;
    
    return header + yamlContent;
  }

  async save(structure?: UIStructureMap) {
    const yamlContent = await this.generateYAML(structure);
    
    // Atomic write for consistency
    const tempPath = this.outputPath + '.tmp';
    fs.writeFileSync(tempPath, yamlContent);
    fs.renameSync(tempPath, this.outputPath);
    
    console.log(`✅ UI structure map saved to ${this.outputPath}`);
  }

  async run() {
    // Initial analysis
    const structure = await this.analyze();
    await this.save(structure);
    
    // Set up watch mode if enabled
    if (this.config.watch) {
      this.startWatching();
    }
  }

  private startWatching() {
    console.log('👁️  Watching for file changes...');
    
    const watchPatterns = this.config.include.map(pattern => 
      path.join(this.config.rootDir, pattern)
    );
    
    this.watcher = chokidar.watch(watchPatterns, {
      ignored: this.config.exclude,
      persistent: true,
      ignoreInitial: true
    });
    
    this.watcher.on('all', (event, filePath) => {
      console.log(`📝 ${event}: ${path.relative(process.cwd(), filePath)}`);
      
      // Debounce regeneration
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      this.debounceTimer = setTimeout(async () => {
        console.log('🔄 Regenerating UI structure map...');
        const structure = await this.analyze();
        await this.save(structure);
      }, this.config.debounceMs);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
      process.exit(0);
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('👋 Stopped watching');
    }
  }
}

// CLI interface when run directly
if (require.main === module) {
  const analyzer = new UIStructureAnalyzer({
    watch: process.argv.includes('--watch') || process.argv.includes('-w')
  });
  
  analyzer.run().catch(console.error);
}

export default UIStructureAnalyzer;