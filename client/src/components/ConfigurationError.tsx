/**
 * Configuration Error Component
 *
 * Displays a blocking error page when required configuration is missing.
 * Firebase is now mandatory for authentication via Google Sign-In and Firestore storage.
 * Dynatrace is optional but recommended for production monitoring.
 */

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ConfigurationErrorProps {
  errors: string[];
}

export function ConfigurationError({ errors }: ConfigurationErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl w-full">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-xl font-bold">Configuration Error</AlertTitle>
          <AlertDescription className="mt-4">
            <p className="mb-4">
              The application requires Firebase for Google Sign-In authentication and Firestore
              cloud storage. Please configure Firebase to continue.
            </p>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
              <p className="font-semibold mb-2">Missing Configuration:</p>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-sm">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-6 text-sm">
              <p className="font-semibold mb-2">To fix this issue:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Create a Firebase project at https://console.firebase.google.com</li>
                <li>
                  Enable Authentication {'>'} Sign-in method {'>'} Google
                </li>
                <li>Enable Firestore Database</li>
                <li>
                  Set environment variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN,
                  VITE_FIREBASE_PROJECT_ID
                </li>
                <li>Rebuild and redeploy the application</li>
              </ol>
              <p className="mt-4 text-xs">
                Note: Dynatrace (VITE_DYNATRACE_SCRIPT_URL) is optional but recommended for
                production monitoring.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Contact your system administrator if you need assistance.</p>
        </div>
      </div>
    </div>
  );
}
