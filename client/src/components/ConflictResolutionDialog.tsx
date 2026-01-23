/**
 * Conflict Resolution Dialog Component
 *
 * Provides UI for users to manually resolve conflicts when automatic
 * resolution is not possible or when user intervention is required.
 */

import React, { useState } from 'react';
import { AlertCircle, GitMerge, Clock, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DocumentConflict } from '@/lib/conflict-resolution';

export interface ConflictResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflict: DocumentConflict | null;
  onResolve: (resolution: 'local' | 'remote' | 'manual', mergedData?: any) => void;
  onCancel: () => void;
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  conflict,
  onResolve,
  onCancel,
}: ConflictResolutionDialogProps) {
  const [selectedVersion, setSelectedVersion] = useState<'local' | 'remote' | null>(null);
  const [manualMerge, setManualMerge] = useState<Record<string, 'local' | 'remote'>>({});

  if (!conflict) {
    return null;
  }

  const handleKeepLocal = () => {
    onResolve('local');
    setSelectedVersion(null);
    setManualMerge({});
  };

  const handleKeepRemote = () => {
    onResolve('remote');
    setSelectedVersion(null);
    setManualMerge({});
  };

  const handleManualMerge = () => {
    const merged = { ...conflict.remoteVersion };

    // Apply field-level selections
    for (const [field, version] of Object.entries(manualMerge)) {
      if (version === 'local') {
        merged[field] = conflict.localVersion[field];
      } else {
        merged[field] = conflict.remoteVersion[field];
      }
    }

    onResolve('manual', merged);
    setSelectedVersion(null);
    setManualMerge({});
  };

  const toggleFieldSelection = (field: string) => {
    setManualMerge((prev) => ({
      ...prev,
      [field]: prev[field] === 'local' ? 'remote' : 'local',
    }));
  };

  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return value.toLocaleString();
      }
      if (Array.isArray(value)) {
        return `[${value.length} items]`;
      }
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatTimestamp = (date: Date): string => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-orange-500" />
            <DialogTitle>Resolve Conflict</DialogTitle>
          </div>
          <DialogDescription>
            This {conflict.documentType} was modified by another user while you were editing it.
            Choose which version to keep or manually merge the changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflict Info */}
          <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-900 dark:text-orange-100">
                {conflict.conflictingFields.length} conflicting field
                {conflict.conflictingFields.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Your changes: {formatTimestamp(conflict.localTimestamp)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>Other changes: {formatTimestamp(conflict.remoteTimestamp)}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant={selectedVersion === 'local' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setSelectedVersion('local')}
            >
              Keep Your Changes
            </Button>
            <Button
              variant={selectedVersion === 'remote' ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => setSelectedVersion('remote')}
            >
              Keep Their Changes
            </Button>
          </div>

          {/* Field-by-Field Comparison */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Conflicting Fields</h3>
            <ScrollArea className="h-[300px] border rounded-lg">
              <div className="p-4 space-y-4">
                {conflict.conflictingFields.map((field) => {
                  const localValue = conflict.localVersion[field];
                  const remoteValue = conflict.remoteVersion[field];
                  const selectedSource = manualMerge[field] || 'remote';

                  return (
                    <div key={field} className="border rounded-lg overflow-hidden">
                      {/* Field Header */}
                      <div className="bg-muted px-3 py-2 flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{field}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleFieldSelection(field)}
                          className="h-7 text-xs"
                        >
                          Toggle Selection
                        </Button>
                      </div>

                      {/* Values Comparison */}
                      <div className="grid grid-cols-2 divide-x">
                        {/* Your Version */}
                        <div
                          className={`p-3 cursor-pointer transition-colors ${
                            selectedSource === 'local'
                              ? 'bg-blue-50 dark:bg-blue-950/20 border-l-4 border-blue-500'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setManualMerge((prev) => ({ ...prev, [field]: 'local' }))}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              Your Version
                            </Badge>
                            {selectedSource === 'local' && (
                              <Badge variant="default" className="text-xs bg-blue-500">
                                Selected
                              </Badge>
                            )}
                          </div>
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono bg-background/50 p-2 rounded">
                            {formatValue(localValue)}
                          </pre>
                        </div>

                        {/* Their Version */}
                        <div
                          className={`p-3 cursor-pointer transition-colors ${
                            selectedSource === 'remote'
                              ? 'bg-green-50 dark:bg-green-950/20 border-l-4 border-green-500'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setManualMerge((prev) => ({ ...prev, [field]: 'remote' }))}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline" className="text-xs">
                              Their Version
                            </Badge>
                            {selectedSource === 'remote' && (
                              <Badge variant="default" className="text-xs bg-green-500">
                                Selected
                              </Badge>
                            )}
                          </div>
                          <pre className="text-xs overflow-x-auto whitespace-pre-wrap break-words font-mono bg-background/50 p-2 rounded">
                            {formatValue(remoteValue)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {selectedVersion === 'local' && (
            <Button onClick={handleKeepLocal} className="bg-blue-500 hover:bg-blue-600">
              Keep Your Changes
            </Button>
          )}
          {selectedVersion === 'remote' && (
            <Button onClick={handleKeepRemote} className="bg-green-500 hover:bg-green-600">
              Keep Their Changes
            </Button>
          )}
          {selectedVersion === null && Object.keys(manualMerge).length > 0 && (
            <Button onClick={handleManualMerge} className="bg-purple-500 hover:bg-purple-600">
              Merge Selected Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
