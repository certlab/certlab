import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-provider';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { TimerSettingsDialog } from '@/components/TimerSettingsDialog';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Clock,
  Coffee,
  Bell,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { StudyTimerSession, StudyTimerSettings } from '@shared/schema';

// StudyTimer uses a responsive layout (vertical on small screens, horizontal grid on large screens) - no layout props needed

// Circular progress ring component
function CircularProgress({
  value,
  size = 280,
  strokeWidth = 8,
  className = '',
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="text-muted/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="text-primary transition-all duration-300 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// Pomodoro pips component for visual session tracking
function PomodoroPips({ completed, total }: { completed: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            index < completed ? 'bg-primary scale-110' : 'bg-muted/30 scale-100'
          }`}
          aria-label={`Session ${index + 1}${index < completed ? ' completed' : ''}`}
        />
      ))}
    </div>
  );
}

export function StudyTimer() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Constants
  const AUTO_START_DELAY_MS = 1000; // Delay before auto-starting next session

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<'work' | 'break' | 'long_break'>('work');
  const [activityLabel, setActivityLabel] = useState('');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Default 25 minutes in seconds
  const [workSessionsCompleted, setWorkSessionsCompleted] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [manualDuration, setManualDuration] = useState<string>('');
  const [isEditingDuration, setIsEditingDuration] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const autoStartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get default settings (defined outside queries for clarity)
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
        // Get the configured duration for the session type (not remaining time)
        const configuredDuration = timerSettings
          ? sessionType === 'work'
            ? timerSettings.workDuration
            : sessionType === 'break'
              ? timerSettings.breakDuration
              : timerSettings.longBreakDuration
          : sessionType === 'work'
            ? 25
            : sessionType === 'break'
              ? 5
              : 15;

        const newSession = await storage.createStudyTimerSession({
          userId: user.id,
          tenantId: 1,
          sessionType,
          duration: configuredDuration ?? 0,
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

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<StudyTimerSettings>) => {
      if (!user?.id) throw new Error('Not authenticated');
      return await storage.updateStudyTimerSettings(user.id, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studyTimer.settings(user?.id) });
      toast({
        title: 'Settings Updated',
        description: 'Your timer settings have been saved.',
      });
    },
  });

  // Initialize timer with settings
  useEffect(() => {
    if (timerSettings && !isRunning) {
      const duration =
        sessionType === 'work'
          ? (timerSettings.workDuration ?? 25)
          : sessionType === 'break'
            ? (timerSettings.breakDuration ?? 5)
            : (timerSettings.longBreakDuration ?? 15);
      setTimeLeft(duration * 60);
    }
  }, [timerSettings, sessionType, isRunning]);

  // Start timer
  const handleStart = useCallback(() => {
    if (!sessionStartTimeRef.current) {
      sessionStartTimeRef.current = new Date();
    }

    if (isPaused && pauseStartTime) {
      // Resume from pause
      const pauseDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
      setTotalPausedTime((prev) => prev + pauseDuration);
      setPauseStartTime(null);
    }

    setIsRunning(true);
    setIsPaused(false);

    // Create session if starting new
    if (!currentSessionId) {
      // Use configured duration, not remaining time
      const configuredDuration = timerSettings
        ? sessionType === 'work'
          ? timerSettings.workDuration
          : sessionType === 'break'
            ? timerSettings.breakDuration
            : timerSettings.longBreakDuration
        : sessionType === 'work'
          ? 25
          : sessionType === 'break'
            ? 5
            : 15;

      saveSessionMutation.mutate({
        sessionType,
        activityLabel: sessionType === 'work' ? activityLabel : null,
        duration: configuredDuration ?? 0,
        startedAt: sessionStartTimeRef.current,
      });
    }
  }, [
    isPaused,
    pauseStartTime,
    currentSessionId,
    timerSettings,
    sessionType,
    activityLabel,
    saveSessionMutation,
  ]);

  // Handle session completion
  const handleSessionComplete = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);

    // Save completed session
    if (currentSessionId) {
      saveSessionMutation.mutate({
        completedAt: new Date(),
        isCompleted: true,
        totalPausedTime,
      });
    }

    // Show notification
    if (
      timerSettings?.enableNotifications &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const title = sessionType === 'work' ? 'Work Session Complete!' : 'Break Complete!';
      const body =
        sessionType === 'work'
          ? 'Great job! Time for a break.'
          : 'Break is over. Ready to focus again?';

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    }

    // Play sound if enabled
    if (timerSettings?.enableSound) {
      // Simple beep using AudioContext
      try {
        const AudioContext =
          window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof window.AudioContext })
            .webkitAudioContext;
        if (!AudioContext) {
          console.warn('AudioContext not supported in this browser');
        } else {
          const audioContext = new AudioContext();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);

          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        }
      } catch (e) {
        console.error('Failed to play sound:', e);
      }
    }

    // Move to next session type
    if (sessionType === 'work') {
      const newCount = workSessionsCompleted + 1;
      setWorkSessionsCompleted(newCount);

      if (timerSettings && newCount % (timerSettings.sessionsUntilLongBreak ?? 4) === 0) {
        setSessionType('long_break');
        setTimeLeft((timerSettings.longBreakDuration ?? 15) * 60);

        if (timerSettings.autoStartBreaks) {
          // Clear any existing timeout before setting new one
          if (autoStartTimeoutRef.current) {
            clearTimeout(autoStartTimeoutRef.current);
          }
          autoStartTimeoutRef.current = setTimeout(() => handleStart(), AUTO_START_DELAY_MS);
        }
      } else {
        setSessionType('break');
        if (timerSettings) {
          setTimeLeft((timerSettings.breakDuration ?? 5) * 60);
        }

        if (timerSettings?.autoStartBreaks) {
          // Clear any existing timeout before setting new one
          if (autoStartTimeoutRef.current) {
            clearTimeout(autoStartTimeoutRef.current);
          }
          autoStartTimeoutRef.current = setTimeout(() => handleStart(), AUTO_START_DELAY_MS);
        }
      }
    } else {
      setSessionType('work');
      if (timerSettings) {
        setTimeLeft((timerSettings.workDuration ?? 25) * 60);
      }

      if (timerSettings?.autoStartWork) {
        // Clear any existing timeout before setting new one
        if (autoStartTimeoutRef.current) {
          clearTimeout(autoStartTimeoutRef.current);
        }
        autoStartTimeoutRef.current = setTimeout(() => handleStart(), AUTO_START_DELAY_MS);
      }
    }

    setCurrentSessionId(null);
    setTotalPausedTime(0);
    sessionStartTimeRef.current = null;

    toast({
      title: sessionType === 'work' ? 'Work Session Complete!' : 'Break Complete!',
      description:
        sessionType === 'work' ? 'Time for a well-deserved break.' : 'Ready to get back to work!',
    });
  }, [
    currentSessionId,
    saveSessionMutation,
    totalPausedTime,
    timerSettings,
    sessionType,
    workSessionsCompleted,
    toast,
    handleStart,
  ]);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && !isPaused && timeLeft > 0) {
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
      // Clean up auto-start timeout on unmount
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
      }
    };
  }, [isRunning, isPaused, timeLeft, handleSessionComplete]);

  // Request notification permission
  useEffect(() => {
    if (timerSettings?.enableNotifications && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [timerSettings?.enableNotifications]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const getProgress = (): number => {
    if (!timerSettings) return 0;
    const totalDuration =
      sessionType === 'work'
        ? (timerSettings.workDuration ?? 25) * 60
        : sessionType === 'break'
          ? (timerSettings.breakDuration ?? 5) * 60
          : (timerSettings.longBreakDuration ?? 15) * 60;
    return ((totalDuration - timeLeft) / totalDuration) * 100;
  };

  // Pause timer
  const handlePause = () => {
    setIsPaused(true);
    setIsRunning(false);
    setPauseStartTime(Date.now());

    if (currentSessionId) {
      saveSessionMutation.mutate({
        isPaused: true,
        pausedAt: new Date(),
      });
    }
  };

  // Reset timer
  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setPauseStartTime(null);
    setTotalPausedTime(0);
    sessionStartTimeRef.current = null;

    if (timerSettings) {
      const duration =
        sessionType === 'work'
          ? (timerSettings.workDuration ?? 25)
          : sessionType === 'break'
            ? (timerSettings.breakDuration ?? 5)
            : (timerSettings.longBreakDuration ?? 15);
      setTimeLeft(duration * 60);
    }

    // Mark current session as incomplete if exists
    if (currentSessionId) {
      saveSessionMutation.mutate({
        isCompleted: false,
      });
      setCurrentSessionId(null);
    }
  };

  // Handle manual duration input
  const handleManualDurationChange = (value: string) => {
    // Only allow numbers
    const numValue = value.replace(/[^0-9]/g, '');
    setManualDuration(numValue);
  };

  const applyManualDuration = () => {
    const minutes = parseInt(manualDuration, 10);
    if (!isNaN(minutes) && minutes > 0 && minutes <= 999) {
      setTimeLeft(minutes * 60);
      setIsEditingDuration(false);
      setManualDuration('');
    } else {
      toast({
        title: 'Invalid Duration',
        description: 'Please enter a valid duration between 1 and 999 minutes.',
        variant: 'destructive',
      });
    }
  };

  const startEditingDuration = () => {
    if (!isRunning && !isPaused) {
      const currentMinutes = Math.ceil(timeLeft / 60);
      setManualDuration(currentMinutes.toString());
      setIsEditingDuration(true);
    }
  };

  const cancelEditingDuration = () => {
    setIsEditingDuration(false);
    setManualDuration('');
  };

  // Calculate today's stats (memoized to avoid filtering on every render)
  const { completedSessionsToday, todayMinutes } = useMemo(() => {
    const completed = todaySessions.filter((s: StudyTimerSession) => s.isCompleted);
    const minutes = completed.reduce((sum: number, s: StudyTimerSession) => sum + s.duration, 0);
    return {
      completedSessionsToday: completed,
      todayMinutes: minutes,
    };
  }, [todaySessions]);

  const todayGoalProgress = timerSettings
    ? (todayMinutes / (timerSettings.dailyGoalMinutes ?? 120)) * 100
    : 0;

  if (isLoadingSettings) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  // Responsive layout (by design)
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Timer Card - Left Side */}
        <Card className="lg:col-span-2 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Activity Timer</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsSettingsDialogOpen(true)}
                className="h-8 w-8 p-0"
                aria-label="Open timer settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Track work, study, exercise, meditation, or any activity with custom labels.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex flex-col gap-4">
              {/* Timer Display Section */}
              <div className="flex items-center justify-center">
                <div className="relative">
                  <CircularProgress value={getProgress()} size={200} strokeWidth={8}>
                    <div className="flex flex-col items-center">
                      {isEditingDuration ? (
                        <div className="flex flex-col items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={manualDuration}
                            onChange={(e) => handleManualDurationChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                applyManualDuration();
                              } else if (e.key === 'Escape') {
                                cancelEditingDuration();
                              }
                            }}
                            className="w-16 h-10 text-center text-xl font-bold font-mono"
                            placeholder="25"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={applyManualDuration}
                              className="h-6 px-2 text-xs"
                            >
                              Set
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditingDuration}
                              className="h-6 px-2 text-xs"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={startEditingDuration}
                          disabled={isRunning || isPaused}
                          className={`text-5xl font-bold font-mono tabular-nums ${
                            sessionType === 'work'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-green-600 dark:text-green-400'
                          } ${!isRunning && !isPaused ? 'hover:opacity-70 cursor-pointer' : 'cursor-default'}`}
                          aria-label="Click to edit duration"
                        >
                          {formatTime(timeLeft)}
                        </button>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {sessionType === 'work' && activityLabel
                          ? activityLabel
                          : sessionType === 'work'
                            ? 'Work Session'
                            : sessionType === 'break'
                              ? 'Short Break'
                              : 'Long Break'}
                      </p>
                    </div>
                  </CircularProgress>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  {!isRunning && !isPaused ? (
                    <Button
                      size="lg"
                      onClick={handleStart}
                      className={`min-w-[120px] ${
                        sessionType === 'work'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Start
                    </Button>
                  ) : isPaused ? (
                    <Button
                      size="lg"
                      onClick={handleStart}
                      className={`min-w-[120px] ${
                        sessionType === 'work'
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      <Play className="h-5 w-5 mr-2" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={handlePause}
                      className="min-w-[120px]"
                    >
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleReset}
                    disabled={!isRunning && !isPaused}
                    aria-label="Reset timer"
                  >
                    <RotateCcw className="h-5 w-5" />
                  </Button>
                </div>

                {/* Session Type Selector */}
                <ToggleGroup
                  type="single"
                  value={sessionType}
                  onValueChange={(value) => {
                    if (value && !isRunning && !isPaused) {
                      setSessionType(value as 'work' | 'break' | 'long_break');
                    }
                  }}
                  className="inline-flex rounded-lg border p-1"
                >
                  <ToggleGroupItem
                    value="work"
                    disabled={isRunning || isPaused}
                    className="px-4 py-2 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
                  >
                    Work
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="break"
                    disabled={isRunning || isPaused}
                    className="px-4 py-2 data-[state=on]:bg-green-600 data-[state=on]:text-white"
                  >
                    Short
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="long_break"
                    disabled={isRunning || isPaused}
                    className="px-4 py-2 data-[state=on]:bg-green-600 data-[state=on]:text-white"
                  >
                    Long
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Activity Label Input - Only shown for work sessions */}
              {sessionType === 'work' && (
                <div className="space-y-2">
                  <label
                    htmlFor="activity-label"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Activity Label
                  </label>
                  <Input
                    id="activity-label"
                    type="text"
                    placeholder="e.g., Work Session, Meditation, Exercise"
                    value={activityLabel}
                    onChange={(e) => setActivityLabel(e.target.value)}
                    disabled={isRunning || isPaused}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Status Messages */}
              {isPaused && (
                <div className="text-center text-sm text-muted-foreground">
                  Timer paused - click Resume to continue
                </div>
              )}
              {!isRunning && !isPaused && !isEditingDuration && (
                <div className="text-center text-sm text-muted-foreground">
                  Click Start to begin your activity session
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline - Right Side */}
        <ActivityTimeline sessions={todaySessions} />
      </div>

      <TimerSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        currentSettings={timerSettings ?? null}
      />
    </>
  );
}
