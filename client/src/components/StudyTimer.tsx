import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityButton } from '@/components/ActivityButton';
import { HandDrawnCircularProgress } from '@/components/HandDrawnCircularProgress';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { Plus } from 'lucide-react';
import type { StudyTimerSession, StudyTimerSettings } from '@shared/schema';

// Activity configuration type
interface ActivityConfig {
  label: string;
  duration: number; // in minutes
}

// Default activities with durations
const DEFAULT_ACTIVITIES: ActivityConfig[] = [
  { label: 'Study', duration: 25 },
  { label: 'Work', duration: 25 },
  { label: 'Exercise', duration: 30 },
  { label: 'Meditation', duration: 10 },
];

// Maximum number of activity labels allowed
const MAX_ACTIVITIES = 5;

// Timer input dimensions for editing mode
const TIMER_INPUT_DIMENSIONS = 'w-[200px] h-[80px]';

// Timer input full class name
const TIMER_INPUT_CLASS = `text-6xl font-bold font-mono tabular-nums text-center border-0 bg-transparent ${TIMER_INPUT_DIMENSIONS} px-0`;

// Maximum timer duration in minutes (8 hours)
const MAX_TIMER_MINUTES = 480;

// Status messages
const TIMER_EDIT_TIP = 'Click timer to edit duration';
const MAX_ACTIVITIES_REACHED_MESSAGE = 'Maximum Activities Reached';

// Helper function to validate activity name
const validateActivityName = (
  name: string
): { isValid: boolean; title?: string; description?: string } => {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return {
      isValid: false,
      title: 'Activity Name Required',
      description: 'Please enter a name for the activity.',
    };
  }
  return { isValid: true };
};

// Helper function to validate duration
const validateDuration = (
  duration: string
): { isValid: boolean; title?: string; description?: string; value?: number } => {
  if (!duration) {
    return {
      isValid: false,
      title: 'Duration Required',
      description: 'Please enter a duration for the timer.',
    };
  }

  const durationValue = parseInt(duration, 10);
  if (isNaN(durationValue)) {
    return {
      isValid: false,
      title: 'Invalid Duration',
      description: 'Duration must be a valid number.',
    };
  }

  if (durationValue < 1) {
    return {
      isValid: false,
      title: 'Duration Too Short',
      description: 'Duration must be at least 1 minute.',
    };
  }

  if (durationValue > MAX_TIMER_MINUTES) {
    return {
      isValid: false,
      title: 'Duration Too Long',
      description: `Duration cannot exceed ${MAX_TIMER_MINUTES} minutes (8 hours).`,
    };
  }

  return { isValid: true, value: durationValue };
};

// Helper function to check for duplicate activity names (case-insensitive)
const isDuplicateActivity = (
  activities: ActivityConfig[],
  newLabel: string,
  excludeLabel?: string
): boolean => {
  const newLabelLower = newLabel.toLowerCase();
  return activities.some(
    (a) => a.label.toLowerCase() === newLabelLower && a.label !== excludeLabel
  );
};

// Edit activity dialog component
function EditActivityDialog({
  open,
  onOpenChange,
  onSave,
  initialLabel,
  initialDuration,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (oldLabel: string, newLabel: string, duration: number) => void;
  initialLabel: string;
  initialDuration: number;
}) {
  const { toast } = useToast();
  const [activityLabel, setActivityLabel] = useState(initialLabel);
  const [duration, setDuration] = useState(initialDuration.toString());

  // Reset state when dialog opens with new values
  useEffect(() => {
    if (open) {
      setActivityLabel(initialLabel);
      setDuration(initialDuration.toString());
    }
  }, [open, initialLabel, initialDuration]);

  // Validate duration input using helper function
  const isDurationValid = () => validateDuration(duration).isValid;

  const handleSave = () => {
    // Validate activity name
    const nameValidation = validateActivityName(activityLabel);
    if (!nameValidation.isValid) {
      toast({
        title: nameValidation.title,
        description: nameValidation.description,
        variant: 'destructive',
      });
      return;
    }

    // Validate duration
    const durationValidation = validateDuration(duration);
    if (!durationValidation.isValid) {
      toast({
        title: durationValidation.title,
        description: durationValidation.description,
        variant: 'destructive',
      });
      return;
    }

    onSave(initialLabel, activityLabel.trim(), durationValidation.value!);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setActivityLabel(initialLabel);
    setDuration(initialDuration.toString());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Activity</DialogTitle>
          <DialogDescription>Update the activity name or timer duration.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <label htmlFor="edit-activity-input" className="sr-only">
              Activity name
            </label>
            <Input
              id="edit-activity-input"
              placeholder="Activity name"
              value={activityLabel}
              onChange={(e) => setActivityLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              maxLength={30}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-duration-input" className="text-sm font-medium">
              Timer Duration (minutes)
            </label>
            <Input
              id="edit-duration-input"
              type="number"
              min="1"
              max={MAX_TIMER_MINUTES}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="25"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!activityLabel.trim() || !isDurationValid()}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add activity dialog component
function AddActivityDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (activity: string, duration: number) => void;
}) {
  const { toast } = useToast();
  const [newActivity, setNewActivity] = useState('');
  const [duration, setDuration] = useState('25');

  // Validate duration input using helper function
  const isDurationValid = () => validateDuration(duration).isValid;

  const handleAdd = () => {
    // Validate activity name
    const nameValidation = validateActivityName(newActivity);
    if (!nameValidation.isValid) {
      toast({
        title: nameValidation.title,
        description: nameValidation.description,
        variant: 'destructive',
      });
      return;
    }

    // Validate duration
    const durationValidation = validateDuration(duration);
    if (!durationValidation.isValid) {
      toast({
        title: durationValidation.title,
        description: durationValidation.description,
        variant: 'destructive',
      });
      return;
    }

    onAdd(newActivity.trim(), durationValidation.value!);
    setNewActivity('');
    setDuration('25');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setNewActivity('');
    setDuration('25');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
          <DialogDescription>Create a new activity type for your timer sessions.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <label htmlFor="new-activity-input" className="sr-only">
              Activity name
            </label>
            <Input
              id="new-activity-input"
              placeholder="Activity name (e.g., Reading, Coding)"
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd();
                } else if (e.key === 'Escape') {
                  handleCancel();
                }
              }}
              maxLength={30}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="duration-input" className="text-sm font-medium">
              Timer Duration (minutes)
            </label>
            <Input
              id="duration-input"
              type="number"
              min="1"
              max={MAX_TIMER_MINUTES}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="25"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!newActivity.trim() || !isDurationValid()}>
            Add Activity
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function StudyTimer() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [activities, setActivities] = useState<ActivityConfig[]>(DEFAULT_ACTIVITIES);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Default 25 minutes in seconds
  const [initialDuration, setInitialDuration] = useState(25 * 60);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [isAddActivityDialogOpen, setIsAddActivityDialogOpen] = useState(false);
  const [isEditActivityDialogOpen, setIsEditActivityDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<ActivityConfig | null>(null);
  const [activityToDelete, setActivityToDelete] = useState<string | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTimeValue, setEditTimeValue] = useState('');

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);

  // Get default settings
  const getDefaultSettings = (): StudyTimerSettings => ({
    id: 0,
    userId: user?.id || '',
    tenantId: 1,
    workDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4,
    autoStartBreaks: false,
    autoStartWork: false,
    enableNotifications: true,
    enableSound: true,
    dailyGoalMinutes: 120,
    customActivities: null,
    updatedAt: new Date(),
  });

  // Get user's timer settings
  const { data: timerSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: queryKeys.studyTimer.settings(user?.id),
    queryFn: async () => {
      if (!user?.id) return null;
      const settings = await storage.getStudyTimerSettings(user.id);
      return settings || getDefaultSettings();
    },
    enabled: !!user?.id,
  });

  // Load custom activities from settings
  useEffect(() => {
    if (timerSettings?.customActivities) {
      try {
        // Validate and parse stored custom activities
        const customActivities = timerSettings.customActivities;
        if (
          Array.isArray(customActivities) &&
          customActivities.every(
            (a) =>
              typeof a === 'object' &&
              a !== null &&
              typeof a.label === 'string' &&
              typeof a.duration === 'number'
          )
        ) {
          // Merge default activities with custom activities (custom activities override defaults)
          const defaultLabels = DEFAULT_ACTIVITIES.map((a) => a.label);
          const customOnly = (customActivities as ActivityConfig[]).filter(
            (a) => !defaultLabels.includes(a.label)
          );
          const mergedActivities = [...DEFAULT_ACTIVITIES, ...customOnly];
          setActivities(mergedActivities);
        }
      } catch (error) {
        console.error('Failed to load custom activities:', error);
      }
    }
  }, [timerSettings]);

  // Get today's sessions for stats
  const { data: todaySessions = [] } = useQuery({
    queryKey: queryKeys.studyTimer.todaySessions(user?.id),
    queryFn: async () => {
      if (!user?.id) return [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sessions = await storage.getStudyTimerSessionsByDateRange(user.id, today, new Date());
      return sessions;
    },
    enabled: !!user?.id,
  });

  // Create or update session mutation
  const saveSessionMutation = useMutation({
    mutationFn: async (session: Partial<StudyTimerSession>) => {
      if (!user?.id) throw new Error('Not authenticated');

      if (currentSessionId) {
        return await storage.updateStudyTimerSession(currentSessionId, session);
      } else {
        const duration = Math.floor(initialDuration / 60); // Convert seconds to minutes
        const newSession = await storage.createStudyTimerSession({
          userId: user.id,
          tenantId: 1,
          sessionType: 'work', // All sessions are 'work' type; activity differentiation is via activityLabel
          duration,
          isCompleted: false,
          isPaused: false,
          totalPausedTime: 0,
          ...session,
        });
        setCurrentSessionId(newSession.id);
        return newSession;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyTimer.todaySessions(user?.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.studyTimer.stats(user?.id) });
    },
  });

  // Save custom activities mutation
  const saveActivitiesMutation = useMutation({
    mutationFn: async (activitiesToSave: ActivityConfig[]) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Filter out default activities - only save custom ones
      const defaultLabels = DEFAULT_ACTIVITIES.map((a) => a.label);
      const customOnly = activitiesToSave.filter((a) => !defaultLabels.includes(a.label));

      // Cast to unknown as the schema uses jsonb type which is typed as unknown
      // The validation happens when loading the data back (see useEffect above)
      await storage.updateStudyTimerSettings(user.id, {
        customActivities: customOnly as unknown,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyTimer.settings(user?.id) });
    },
  });

  // Initialize timer with settings
  useEffect(() => {
    if (timerSettings && !isRunning) {
      const duration = timerSettings.workDuration ?? 25;
      const durationInSeconds = duration * 60;
      setTimeLeft(durationInSeconds);
      setInitialDuration(durationInSeconds);
    }
  }, [timerSettings, isRunning]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = (): number => {
    if (initialDuration === 0) return 0;
    return ((initialDuration - timeLeft) / initialDuration) * 100;
  };

  // Start timer
  const handleStart = useCallback(() => {
    if (!selectedActivity) {
      toast({
        title: 'Select an Activity',
        description: 'Please select an activity before starting the timer.',
      });
      return;
    }

    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = new Date();
    }

    if (!isRunning) {
      setInitialDuration(timeLeft);
    }

    setIsRunning(true);

    // Create session if starting new
    if (!currentSessionId) {
      const duration = Math.floor(timeLeft / 60);
      saveSessionMutation.mutate({
        sessionType: 'work', // All sessions are 'work' type; activity differentiation is via activityLabel
        activityLabel: selectedActivity,
        duration,
        startedAt: sessionStartTimeRef.current,
      });
    }
  }, [selectedActivity, currentSessionId, timeLeft, isRunning, saveSessionMutation, toast]);

  // Stop timer
  const handleStop = useCallback(() => {
    setIsRunning(false);

    // Save completed session
    if (currentSessionId) {
      const wasCompleted = timeLeft === 0;
      saveSessionMutation.mutate({
        completedAt: new Date(),
        isCompleted: wasCompleted,
      });
    }

    // Reset for next session
    setCurrentSessionId(null);
    sessionStartTimeRef.current = null;

    // Reset timer to the selected activity's configured duration
    if (selectedActivity) {
      const activityConfig = activities.find((a) => a.label === selectedActivity);
      if (activityConfig) {
        const durationInSeconds = activityConfig.duration * 60;
        setTimeLeft(durationInSeconds);
        setInitialDuration(durationInSeconds);
      }
    } else if (timerSettings) {
      // Fallback to default work duration if no activity is selected
      const duration = timerSettings.workDuration ?? 25;
      const durationInSeconds = duration * 60;
      setTimeLeft(durationInSeconds);
      setInitialDuration(durationInSeconds);
    }

    if (timeLeft === 0) {
      toast({
        title: 'Session Complete!',
        description: `Great job on your ${selectedActivity} session!`,
      });
    }
  }, [
    currentSessionId,
    saveSessionMutation,
    timeLeft,
    timerSettings,
    selectedActivity,
    activities,
    toast,
  ]);

  // Handle session completion
  const handleSessionComplete = useCallback(() => {
    handleStop();
  }, [handleStop]);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, handleSessionComplete]);

  // Handle activity selection
  const handleActivitySelect = (activity: string) => {
    if (!isRunning) {
      setSelectedActivity(activity);
      // Set timer to the activity's configured duration
      const activityConfig = activities.find((a) => a.label === activity);
      if (activityConfig) {
        const durationInSeconds = activityConfig.duration * 60;
        setTimeLeft(durationInSeconds);
        setInitialDuration(durationInSeconds);
      }
    }
  };

  // Handle add activity
  const handleAddActivity = (activity: string, duration: number) => {
    // Check if we've reached the maximum number of activities
    if (activities.length >= MAX_ACTIVITIES) {
      toast({
        title: MAX_ACTIVITIES_REACHED_MESSAGE,
        description: `You can only have up to ${MAX_ACTIVITIES} activity labels.`,
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicates using helper function
    if (isDuplicateActivity(activities, activity)) {
      toast({
        title: 'Activity Already Exists',
        description: 'This activity name is already in your list.',
        variant: 'destructive',
      });
      return;
    }

    const newActivityConfig: ActivityConfig = { label: activity, duration };
    const updatedActivities = [...activities, newActivityConfig];
    setActivities(updatedActivities);
    setSelectedActivity(activity);
    // Set the timer to the specified duration
    const durationInSeconds = duration * 60;
    setTimeLeft(durationInSeconds);
    setInitialDuration(durationInSeconds);

    // Save to storage
    saveActivitiesMutation.mutate(updatedActivities);
  };

  // Handle edit activity
  const handleEditActivity = (oldLabel: string, newLabel: string, duration: number) => {
    // Check if new label is different and already exists (case-insensitive)
    if (isDuplicateActivity(activities, newLabel, oldLabel)) {
      toast({
        title: 'Activity Already Exists',
        description: 'An activity with this name already exists.',
        variant: 'destructive',
      });
      return;
    }

    // Update activities array
    const updatedActivities = activities.map((a) =>
      a.label === oldLabel ? { label: newLabel, duration } : a
    );
    setActivities(updatedActivities);

    // If the edited activity is currently selected, update selected activity and timer
    if (selectedActivity === oldLabel) {
      setSelectedActivity(newLabel);
      // Only update timer if not running
      if (!isRunning) {
        const durationInSeconds = duration * 60;
        setTimeLeft(durationInSeconds);
        setInitialDuration(durationInSeconds);
      }
    }

    // Save to storage
    saveActivitiesMutation.mutate(updatedActivities);

    toast({
      title: 'Activity Updated',
      description: 'Your activity has been updated successfully.',
    });
  };

  // Handle delete activity - open confirmation dialog
  const handleDeleteActivityClick = (label: string) => {
    setActivityToDelete(label);
    setIsDeleteAlertOpen(true);
  };

  // Confirm delete activity
  const handleConfirmDelete = () => {
    if (!activityToDelete) return;

    // Remove activity from array
    const updatedActivities = activities.filter((a) => a.label !== activityToDelete);
    setActivities(updatedActivities);

    // If the deleted activity was selected, clear selection and reset timer
    if (selectedActivity === activityToDelete) {
      setSelectedActivity('');
      // Reset to default duration
      if (timerSettings) {
        const duration = timerSettings.workDuration ?? 25;
        const durationInSeconds = duration * 60;
        setTimeLeft(durationInSeconds);
        setInitialDuration(durationInSeconds);
      }
    }

    // Save to storage
    saveActivitiesMutation.mutate(updatedActivities);

    toast({
      title: 'Activity Deleted',
      description: 'Your activity has been removed.',
    });

    setActivityToDelete(null);
    setIsDeleteAlertOpen(false);
  };

  // Handle edit activity click
  const handleEditActivityClick = (label: string) => {
    const activity = activities.find((a) => a.label === label);
    if (activity) {
      setActivityToEdit(activity);
      setIsEditActivityDialogOpen(true);
    }
  };

  // Handle time editing
  const handleTimeClick = () => {
    if (!isRunning) {
      setIsEditingTime(true);
      setEditTimeValue(formatTime(timeLeft));
    }
  };

  const handleTimeBlur = () => {
    // Parse the time format MM:SS
    const parts = editTimeValue.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0], 10);
      const seconds = parseInt(parts[1], 10);
      // Max 8 hours to keep timer durations reasonable
      if (
        !isNaN(minutes) &&
        !isNaN(seconds) &&
        minutes >= 0 &&
        minutes <= MAX_TIMER_MINUTES &&
        seconds >= 0 &&
        seconds < 60
      ) {
        const totalSeconds = minutes * 60 + seconds;
        if (totalSeconds > 0) {
          setTimeLeft(totalSeconds);
          setInitialDuration(totalSeconds);
        }
      }
    }
    setIsEditingTime(false);
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTimeBlur();
    } else if (e.key === 'Escape') {
      setIsEditingTime(false);
      setEditTimeValue(formatTime(timeLeft));
    }
  };

  if (isLoadingSettings) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity Timer</h1>
      </div>

      {/* Activity Buttons */}
      <div className="flex flex-wrap gap-3">
        {activities.map((activity) => {
          const isDefault = DEFAULT_ACTIVITIES.some((a) => a.label === activity.label);
          return (
            <ActivityButton
              key={activity.label}
              label={activity.label}
              isSelected={selectedActivity === activity.label}
              onClick={() => handleActivitySelect(activity.label)}
              disabled={isRunning}
              isDefault={isDefault}
              onEdit={!isDefault ? () => handleEditActivityClick(activity.label) : undefined}
              onDelete={!isDefault ? () => handleDeleteActivityClick(activity.label) : undefined}
            />
          );
        })}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => setIsAddActivityDialogOpen(true)}
                disabled={isRunning || activities.length >= MAX_ACTIVITIES}
                className="px-6 py-6 text-base border-2 border-dashed"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {activities.length >= MAX_ACTIVITIES
                  ? `Maximum of ${MAX_ACTIVITIES} activities allowed`
                  : 'Add new activity'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Timer and History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timer Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {selectedActivity || 'Select an activity'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6 pb-8">
            {/* Circular Timer */}
            <HandDrawnCircularProgress value={getProgress()} size={280} strokeWidth={12}>
              {isEditingTime ? (
                <Input
                  value={editTimeValue}
                  onChange={(e) => setEditTimeValue(e.target.value)}
                  onBlur={handleTimeBlur}
                  onKeyDown={handleTimeKeyDown}
                  className={TIMER_INPUT_CLASS}
                  autoFocus
                  placeholder="MM:SS"
                />
              ) : (
                <div
                  className="text-6xl font-bold font-mono tabular-nums cursor-pointer hover:text-primary transition-colors"
                  onClick={handleTimeClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleTimeClick();
                    }
                  }}
                  title={!isRunning ? 'Click to edit time' : 'Timer is running'}
                >
                  {formatTime(timeLeft)}
                </div>
              )}
            </HandDrawnCircularProgress>

            {/* Controls */}
            <div className="flex gap-4">
              {!isRunning ? (
                <Button
                  size="lg"
                  onClick={handleStart}
                  disabled={!selectedActivity}
                  className="min-w-[140px] px-8 py-6 text-lg"
                >
                  Start
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleStop}
                  variant="outline"
                  className="min-w-[140px] px-8 py-6 text-lg"
                >
                  Stop
                </Button>
              )}
            </div>

            {/* Status Message */}
            {!selectedActivity && !isRunning && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Select an activity above to begin</p>
                <p className="text-xs text-muted-foreground mt-1">Tip: {TIMER_EDIT_TIP}</p>
              </div>
            )}
            {selectedActivity && !isRunning && (
              <p className="text-sm text-muted-foreground text-center">{TIMER_EDIT_TIP}</p>
            )}
            {isRunning && (
              <p className="text-sm text-muted-foreground text-center">
                Timer is running... Click Stop to end session
              </p>
            )}
          </CardContent>
        </Card>

        {/* History Card */}
        <ActivityTimeline sessions={todaySessions} />
      </div>

      {/* Dialogs */}
      <AddActivityDialog
        open={isAddActivityDialogOpen}
        onOpenChange={setIsAddActivityDialogOpen}
        onAdd={handleAddActivity}
      />
      <EditActivityDialog
        open={isEditActivityDialogOpen}
        onOpenChange={setIsEditActivityDialogOpen}
        onSave={handleEditActivity}
        initialLabel={activityToEdit?.label || ''}
        initialDuration={activityToEdit?.duration || 25}
      />
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "{activityToDelete}" activity? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActivityToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
