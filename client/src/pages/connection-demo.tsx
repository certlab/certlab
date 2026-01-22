/**
 * Connection Status Demo Page
 *
 * This page demonstrates the Firestore connection status indicators
 * in different states for testing and documentation purposes.
 */

import { useState } from 'react';
import { CloudSyncIndicator } from '@/components/CloudSyncIndicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestoreConnection } from '@/hooks/useFirestoreConnection';
import { Separator } from '@/components/ui/separator';

export default function ConnectionDemo() {
  const [showDetailedStatus, setShowDetailedStatus] = useState(false);
  const connectionState = useFirestoreConnection();

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Firestore Connection Status Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the real-time Firestore connection monitoring features.
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Connection Status</CardTitle>
          <CardDescription>
            The indicator updates in real-time based on your connection to Firestore
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <CloudSyncIndicator showLabel showDetailedStatus={showDetailedStatus} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedStatus(!showDetailedStatus)}
            >
              {showDetailedStatus ? 'Hide' : 'Show'} Debug Info
            </Button>
          </div>

          <Separator />

          {/* Connection State Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Connection State</h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={connectionState.status === 'connected' ? 'default' : 'secondary'}>
                    {connectionState.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Browser Online:</span>
                  <Badge variant={connectionState.isOnline ? 'default' : 'destructive'}>
                    {connectionState.isOnline ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Syncing:</span>
                  <Badge variant={connectionState.isSyncing ? 'default' : 'secondary'}>
                    {connectionState.isSyncing ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Debug Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Firestore Initialized:</span>
                  <span>{connectionState.debugInfo.isFirestoreInitialized ? '✓' : '✗'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Authenticated:</span>
                  <span>{connectionState.debugInfo.isAuthenticated ? '✓' : '✗'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Reconnect Attempts:</span>
                  <span>{connectionState.debugInfo.reconnectAttempts}</span>
                </div>
                {connectionState.debugInfo.lastSuccessfulSync && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span className="text-xs">
                      {connectionState.debugInfo.lastSuccessfulSync.toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {connectionState.error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md">
              <h3 className="font-semibold text-red-500 mb-2">Error Details</h3>
              <p className="text-sm text-red-400 font-mono">{connectionState.error.message}</p>
            </div>
          )}

          <Separator />

          {/* Manual Check */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => connectionState.checkConnection()}
              disabled={connectionState.isSyncing}
            >
              {connectionState.isSyncing ? 'Checking...' : 'Manual Connection Check'}
            </Button>
            <span className="text-sm text-muted-foreground">
              Manually trigger a connection check
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Connection States Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>Connection States</CardTitle>
          <CardDescription>
            The connection indicator can display the following states
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <Badge variant="default" className="bg-green-500">
                connected
              </Badge>
              <div className="flex-1">
                <h4 className="font-semibold">Connected</h4>
                <p className="text-sm text-muted-foreground">
                  Successfully connected to Firestore and actively syncing data
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Badge variant="secondary">offline</Badge>
              <div className="flex-1">
                <h4 className="font-semibold">Offline</h4>
                <p className="text-sm text-muted-foreground">
                  No internet connection detected. Changes will sync when connection is restored
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Badge variant="secondary">reconnecting</Badge>
              <div className="flex-1">
                <h4 className="font-semibold">Reconnecting</h4>
                <p className="text-sm text-muted-foreground">
                  Attempting to reconnect to Firestore after a connection loss
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Badge variant="destructive">error</Badge>
              <div className="flex-1">
                <h4 className="font-semibold">Error</h4>
                <p className="text-sm text-muted-foreground">
                  Connection error occurred. Check your network connection and Firebase
                  configuration
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Badge variant="secondary">disabled</Badge>
              <div className="flex-1">
                <h4 className="font-semibold">Disabled</h4>
                <p className="text-sm text-muted-foreground">
                  Firestore is not configured or cloud sync is disabled. Using local-only mode
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Developer Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Developer Tools</CardTitle>
          <CardDescription>Access connection state from the browser console</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            The connection state is exposed to the browser's developer tools for debugging:
          </p>
          <div className="bg-muted p-4 rounded-md font-mono text-sm space-y-2">
            <div>
              <span className="text-muted-foreground">// Check if hook is available</span>
              <br />
              <span>window.__FIRESTORE_CONNECTION_HOOK__</span>
            </div>
            <div className="mt-4">
              <span className="text-muted-foreground">// Hook description and usage</span>
              <br />
              <span className="text-green-500">{'{'}</span>
              <br />
              <span> name: "useFirestoreConnection",</span>
              <br />
              <span> description: "Monitor Firestore connection status in DevTools",</span>
              <br />
              <span> usage: "Use this hook in your components to access connection state"</span>
              <br />
              <span className="text-green-500">{'}'}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Open your browser's Developer Tools (F12) and check the Console to see connection events
            logged in real-time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
