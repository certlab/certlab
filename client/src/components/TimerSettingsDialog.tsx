import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Coffee, Bell, Volume2, VolumeX } from 'lucide-react';
import type { StudyTimerSettings } from '@shared/schema';

interface TimerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: StudyTimerSettings | null;
}

export function TimerSettingsDialog({
  open,
  onOpenChange,
  currentSettings,
}: TimerSettingsDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Local state for settings
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableSound, setEnableSound] = useState(true);

  // Initialize state when settings change
  useEffect(() => {
    if (currentSettings) {
      setWorkDuration(currentSettings.workDuration ?? 25);
      setBreakDuration(currentSettings.breakDuration ?? 5);
      setLongBreakDuration(currentSettings.longBreakDuration ?? 15);
      setEnableNotifications(currentSettings.enableNotifications ?? true);
      setEnableSound(currentSettings.enableSound ?? true);
    }
  }, [currentSettings]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const updatedSettings: Partial<StudyTimerSettings> = {
        workDuration,
        breakDuration,
        longBreakDuration,
        enableNotifications,
        enableSound,
        updatedAt: new Date(),
      };

      return await storage.updateStudyTimerSettings(user.id, updatedSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyTimer.settings(user?.id) });
      toast({
        title: 'Settings Saved',
        description: 'Your timer settings have been updated successfully.',
      });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate();
  };

  // Memoize duration options to avoid creating array on every render
  const durationOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => i + 1), []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timer Settings
          </DialogTitle>
          <DialogDescription>
            Customize your Pomodoro timer durations and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Duration Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Session Durations</h3>

            <div className="space-y-3">
              {/* Work Duration */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="work-duration" className="text-sm">
                    Work Duration
                  </Label>
                </div>
                <Select
                  value={workDuration.toString()}
                  onValueChange={(value) => setWorkDuration(parseInt(value, 10))}
                >
                  <SelectTrigger id="work-duration" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((minutes) => (
                      <SelectItem key={minutes} value={minutes.toString()}>
                        {minutes}m
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Break Duration */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="break-duration" className="text-sm">
                    Break Duration
                  </Label>
                </div>
                <Select
                  value={breakDuration.toString()}
                  onValueChange={(value) => setBreakDuration(parseInt(value, 10))}
                >
                  <SelectTrigger id="break-duration" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((minutes) => (
                      <SelectItem key={minutes} value={minutes.toString()}>
                        {minutes}m
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Long Break Duration */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Coffee className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="long-break-duration" className="text-sm">
                    Long Break Duration
                  </Label>
                </div>
                <Select
                  value={longBreakDuration.toString()}
                  onValueChange={(value) => setLongBreakDuration(parseInt(value, 10))}
                >
                  <SelectTrigger id="long-break-duration" className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((minutes) => (
                      <SelectItem key={minutes} value={minutes.toString()}>
                        {minutes}m
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notification & Sound Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium">Notifications & Sounds</h3>

            <div className="space-y-3">
              {/* Notifications */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <Label htmlFor="notifications" className="text-sm">
                    Enable Notifications
                  </Label>
                </div>
                <Switch
                  id="notifications"
                  checked={enableNotifications}
                  onCheckedChange={setEnableNotifications}
                />
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {enableSound ? (
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label htmlFor="sound" className="text-sm">
                    Enable Sound
                  </Label>
                </div>
                <Switch id="sound" checked={enableSound} onCheckedChange={setEnableSound} />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveSettingsMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saveSettingsMutation.isPending}>
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
