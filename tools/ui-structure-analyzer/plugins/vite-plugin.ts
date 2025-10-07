import UIStructureAnalyzer from '../index';
import type { Plugin } from 'vite';

export interface UIStructureVitePluginOptions {
  outputPath?: string;
  rootDir?: string;
  watch?: boolean;
  debounceMs?: number;
}

export function UIStructurePlugin(options: UIStructureVitePluginOptions = {}): Plugin {
  let analyzer: UIStructureAnalyzer | null = null;

  return {
    name: 'vite-plugin-ui-structure',
    
    configureServer(server) {
      // Start the analyzer when dev server starts
      analyzer = new UIStructureAnalyzer({
        outputPath: options.outputPath || './ui-structure-map.yaml',
        rootDir: options.rootDir || './client/src',
        watch: options.watch ?? true,
        debounceMs: options.debounceMs || 500
      });
      
      analyzer.run().catch(console.error);
      
      // Add middleware to serve the UI structure map
      server.middlewares.use('/_ui-structure', (req, res) => {
        const fs = require('fs');
        const yaml = fs.readFileSync(analyzer!['outputPath'], 'utf-8');
        res.setHeader('Content-Type', 'text/yaml');
        res.end(yaml);
      });
      
      console.log('📊 UI Structure Analyzer running at /_ui-structure');
    },
    
    closeBundle() {
      // Stop analyzer when build completes
      if (analyzer) {
        analyzer.stop();
      }
    }
  };
}

export default UIStructurePlugin;