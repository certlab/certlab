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
import { TimerSettingsDialog } from '@/components/TimerSettingsDialog';
import { Play, Pause, RotateCcw, Settings, Clock, Coffee, Calendar } from 'lucide-react';
import type { StudyTimerSession, StudyTimerSettings } from '@shared/schema';

interface StudyTimerProps {
  compact?: boolean;
}

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

export function StudyTimer({ compact = false }: StudyTimerProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  // Constants
  const AUTO_START_DELAY_MS = 1000; // Delay before auto-starting next session

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState<'work' | 'break' | 'long_break'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // Default 25 minutes in seconds
  const [workSessionsCompleted, setWorkSessionsCompleted] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [totalPausedTime, setTotalPausedTime] = useState(0);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

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
        duration: configuredDuration ?? 0,
        startedAt: sessionStartTimeRef.current,
      });
    }
  }, [isPaused, pauseStartTime, currentSessionId, timerSettings, sessionType, saveSessionMutation]);

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

  // Compact layout for dashboard
  if (compact) {
    return (
      <>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Timer Card - Compact with Improved Styling */}
          <Card className="lg:col-span-2 shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                {/* Left: Timer Display with Mini Progress Ring */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <CircularProgress value={getProgress()} size={80} strokeWidth={4}>
                      <div
                        className={`text-2xl font-bold font-mono tabular-nums ${
                          sessionType === 'work'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {formatTime(timeLeft).split(':')[0]}
                      </div>
                    </CircularProgress>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {sessionType === 'work'
                        ? 'Work Session'
                        : sessionType === 'break'
                          ? 'Short Break'
                          : 'Long Break'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatTime(timeLeft)}</p>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    {!isRunning && !isPaused ? (
                      <Button
                        size="sm"
                        onClick={handleStart}
                        className={
                          sessionType === 'work'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                    ) : isPaused ? (
                      <Button
                        size="sm"
                        onClick={handleStart}
                        className={
                          sessionType === 'work'
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-green-600 hover:bg-green-700'
                        }
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={handlePause}>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleReset}
                      disabled={!isRunning && !isPaused}
                      aria-label="Reset timer"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsSettingsDialogOpen(true)}
                      aria-label="Timer settings"
                      title="Timer settings"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Session Type Selector - Compact Segmented Control */}
                  <ToggleGroup
                    type="single"
                    value={sessionType}
                    onValueChange={(value) => {
                      if (value && !isRunning && !isPaused) {
                        setSessionType(value as 'work' | 'break' | 'long_break');
                      }
                    }}
                    className={`inline-flex rounded-md p-0.5 ${
                      sessionType === 'work'
                        ? 'bg-blue-100 dark:bg-blue-950'
                        : 'bg-green-100 dark:bg-green-950'
                    }`}
                  >
                    <ToggleGroupItem
                      value="work"
                      disabled={isRunning || isPaused}
                      className="h-7 text-xs px-2 text-blue-700 dark:text-blue-200 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
                    >
                      Work
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="break"
                      disabled={isRunning || isPaused}
                      className="h-7 text-xs px-2 text-green-700 dark:text-green-200 data-[state=on]:bg-green-600 data-[state=on]:text-white"
                    >
                      Short
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="long_break"
                      disabled={isRunning || isPaused}
                      className="h-7 text-xs px-2 text-green-700 dark:text-green-200 data-[state=on]:bg-green-600 data-[state=on]:text-white"
                    >
                      Long
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>

              {/* Status Messages */}
              {isPaused && (
                <div className="text-center text-xs text-muted-foreground mt-3">
                  Timer paused - click Resume to continue
                </div>
              )}
              {!isRunning && !isPaused && (
                <div className="text-center text-xs text-muted-foreground mt-3">
                  Click Start to begin your {sessionType === 'work' ? 'work' : 'break'} session
                </div>
              )}
            </CardContent>
          </Card>

          {/* Today's Progress - Compact with Visual Improvements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Today's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Study Time</span>
                  <span className="text-xl font-bold">{todayMinutes}m</span>
                </div>
                <Progress value={todayGoalProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Goal: {timerSettings?.dailyGoalMinutes || 120}m
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Sessions</span>
                <span className="text-base font-semibold">{completedSessionsToday.length}</span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">This Round</span>
                  <span className="text-xs font-medium">
                    {workSessionsCompleted} / {timerSettings?.sessionsUntilLongBreak || 4}
                  </span>
                </div>
                <PomodoroPips
                  completed={workSessionsCompleted}
                  total={timerSettings?.sessionsUntilLongBreak || 4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings Dialog */}
        <TimerSettingsDialog
          open={isSettingsDialogOpen}
          onOpenChange={setIsSettingsDialogOpen}
          currentSettings={timerSettings ?? null}
        />
      </>
    );
  }

  // Full layout for dedicated study timer page
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timer Card - Improved Design */}
        <Card className="lg:col-span-2 shadow-lg">
          <CardContent className="p-8">
            {/* Centered Layout with Stacked Elements */}
            <div className="flex flex-col items-center space-y-6">
              {/* Session Type Selector - Segmented Control at Top */}
              <ToggleGroup
                type="single"
                value={sessionType}
                onValueChange={(value) => {
                  if (value && !isRunning && !isPaused) {
                    setSessionType(value as 'work' | 'break' | 'long_break');
                  }
                }}
                className={`inline-flex rounded-lg p-1 ${
                  sessionType === 'work'
                    ? 'bg-blue-100 dark:bg-blue-950'
                    : 'bg-green-100 dark:bg-green-950'
                }`}
              >
                <ToggleGroupItem
                  value="work"
                  disabled={isRunning || isPaused}
                  className="text-blue-700 dark:text-blue-200 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Work
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="break"
                  disabled={isRunning || isPaused}
                  className="text-green-700 dark:text-green-200 data-[state=on]:bg-green-600 data-[state=on]:text-white"
                >
                  <Coffee className="h-4 w-4 mr-2" />
                  Short Break
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="long_break"
                  disabled={isRunning || isPaused}
                  className="text-green-700 dark:text-green-200 data-[state=on]:bg-green-600 data-[state=on]:text-white"
                >
                  <Coffee className="h-4 w-4 mr-2" />
                  Long Break
                </ToggleGroupItem>
              </ToggleGroup>

              {/* Timer Display with Circular Progress Ring */}
              <div className="relative">
                <CircularProgress value={getProgress()} size={280} strokeWidth={8}>
                  <div className="flex flex-col items-center">
                    <div
                      className={`text-7xl font-bold font-mono tabular-nums ${
                        sessionType === 'work'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {formatTime(timeLeft)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 text-center px-4">
                      {sessionType === 'work' ? 'Time to focus!' : 'Time to recharge!'}
                    </p>
                  </div>
                </CircularProgress>
              </div>

              {/* Timer Controls - Large Floating Action Buttons */}
              <div className="flex items-center justify-center gap-4">
                {!isRunning && !isPaused ? (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    className={`w-40 h-14 text-lg shadow-lg ${
                      sessionType === 'work'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <Play className="h-6 w-6 mr-2" />
                    Start
                  </Button>
                ) : isPaused ? (
                  <Button
                    size="lg"
                    onClick={handleStart}
                    className={`w-40 h-14 text-lg shadow-lg ${
                      sessionType === 'work'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <Play className="h-6 w-6 mr-2" />
                    Resume
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handlePause}
                    className="w-40 h-14 text-lg shadow-lg"
                  >
                    <Pause className="h-6 w-6 mr-2" />
                    Pause
                  </Button>
                )}

                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleReset}
                  disabled={!isRunning && !isPaused}
                  className="h-14 shadow-lg"
                >
                  <RotateCcw className="h-6 w-6" />
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setIsSettingsDialogOpen(true)}
                  className="h-14 shadow-lg"
                  aria-label="Timer settings"
                  title="Timer settings"
                >
                  <Settings className="h-6 w-6" />
                </Button>
              </div>

              {/* Status Messages */}
              {isPaused && (
                <div className="text-center text-sm text-muted-foreground">
                  Timer paused - click Resume to continue
                </div>
              )}
              {!isRunning && !isPaused && (
                <div className="text-center text-sm text-muted-foreground">
                  Click Start to begin your {sessionType === 'work' ? 'work' : 'break'} session
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          {/* Today's Progress - Improved with Visual Elements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-4 w-4" />
                Today's Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Study Time with Visual Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Study Time</span>
                  <span className="text-2xl font-bold">{todayMinutes}m</span>
                </div>
                <div className="relative">
                  <Progress value={todayGoalProgress} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>0m</span>
                    <span className="font-medium">
                      Goal: {timerSettings?.dailyGoalMinutes || 120}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Sessions Count */}
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Sessions</span>
                <span className="text-lg font-semibold">{completedSessionsToday.length}</span>
              </div>

              {/* Pomodoro Pips for Current Round */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Round</span>
                  <span className="text-sm font-medium">
                    {workSessionsCompleted} / {timerSettings?.sessionsUntilLongBreak || 4}
                  </span>
                </div>
                <PomodoroPips
                  completed={workSessionsCompleted}
                  total={timerSettings?.sessionsUntilLongBreak || 4}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Dialog */}
      <TimerSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        currentSettings={timerSettings ?? null}
      />
    </>
  );
}
