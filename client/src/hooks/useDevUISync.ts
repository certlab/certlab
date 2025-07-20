import { useEffect } from 'react';

/**
 * Development hook to automatically sync UI structure when files change
 * Only runs in development mode
 */
export const useDevUISync = () => {
  useEffect(() => {
    if (import.meta.env.DEV) {
      const syncUIStructure = async () => {
        try {
          const response = await fetch('/api/dev/sync-ui-structure', {
            method: 'POST'
          });
          
          if (response.ok) {
            console.log('✅ UI structure synced successfully');
          }
        } catch (error) {
          console.warn('UI sync failed:', error);
        }
      };

      // Sync on component mount in development
      syncUIStructure();

      // Watch for file changes using a development polling approach
      const interval = setInterval(() => {
        syncUIStructure();
      }, 10000); // Every 10 seconds

      return () => clearInterval(interval);
    }
  }, []);
};