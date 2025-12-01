import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { getBasePath } from './shared/env';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  // Base path for GitHub Pages deployment
  // Set VITE_BASE_PATH environment variable to override (e.g., for forks or different repo names)
  // Default production path assumes repository name is 'certlab'
  // For root domain deployment (e.g., custom domain), set VITE_BASE_PATH='/'
  base: getBasePath(),
  publicDir: path.resolve(import.meta.dirname, 'client', 'public'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React core
          'vendor-react': ['react', 'react-dom'],
          // Vendor chunk for UI libraries
          'vendor-ui': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-label',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
            '@radix-ui/react-tooltip',
          ],
          // Vendor chunk for data/charting libraries
          'vendor-charts': ['recharts'],
          // Vendor chunk for other utilities
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'wouter'],
        },
      },
    },
  },
  server: {
    port: 5000,
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
});
