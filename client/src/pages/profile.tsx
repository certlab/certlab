import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-provider';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, queryKeys } from '@/lib/queryClient';
import { storage } from '@/lib/storage-factory';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  BookOpen,
  Save,
  Award,
  AlertCircle,
  Shield,
  Cloud,
  CloudOff,
  ShoppingBag,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import ContributionHeatmap from '@/components/ContributionHeatmap';
import { UserPurchasesCard } from '@/components/UserPurchasesCard';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  certificationGoals?: string[];
  studyPreferences?: {
    dailyTimeMinutes?: number;
    preferredDifficulty?: 'beginner' | 'intermediate' | 'advanced';
    focusAreas?: string[];
    studyDays?: string[];
    reminderTime?: string;
  };
  skillsAssessment?: {
    experienceLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    relevantExperience?: string[];
    learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    completedCertifications?: string[];
    motivations?: string[];
  };
}

export default function ProfilePage() {
  const { user, isCloudSyncEnabled } = useAuth();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    email: '',
    firstName: '',
    lastName: '',
    certificationGoals: [],
    studyPreferences: {
      dailyTimeMinutes: 30,
      preferredDifficulty: 'intermediate',
      focusAreas: [],
      studyDays: [],
      reminderTime: '09:00',
    },
    skillsAssessment: {
      experienceLevel: 'beginner',
      relevantExperience: [],
      learningStyle: 'visual',
      completedCertifications: [],
      motivations: [],
    },
  });

  // Email validation helper
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Fetch user profile
  const { data: userProfile, isLoading } = useQuery<UserProfile>({
    queryKey: queryKeys.user.detail(user?.id),
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      // Use storage.updateUser directly instead of deprecated apiRequest
      const updatedUser = await storage.updateUser(user.id, data);
      return updatedUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.detail(user?.id) });
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
    },
    onError: (error) => {
      console.error('Profile update error:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Update local state when user data is loaded
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        email: userProfile.email || '',
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        certificationGoals: userProfile.certificationGoals || [],
        studyPreferences: userProfile.studyPreferences || {
          dailyTimeMinutes: 30,
          preferredDifficulty: 'intermediate',
          focusAreas: [],
          studyDays: [],
          reminderTime: '09:00',
        },
        skillsAssessment: userProfile.skillsAssessment || {
          experienceLevel: 'beginner',
          relevantExperience: [],
          learningStyle: 'visual',
          completedCertifications: [],
          motivations: [],
        },
      });
    }
  }, [userProfile]);

  const handleSave = () => {
    // Validate email if provided
    if (profileData.email && !isValidEmail(profileData.email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  const certificationOptions = ['CC', 'CISSP', 'Cloud+', 'CISM', 'CGRC', 'CISA'];

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const motivationOptions = [
    'Career advancement',
    'Salary increase',
    'Job requirement',
    'Personal development',
    'Industry recognition',
    'Compliance requirement',
  ];

  const experienceOptions = [
    'Network Security',
    'Cloud Computing',
    'Risk Management',
    'Incident Response',
    'Compliance',
    'Security Architecture',
    'DevSecOps',
    'Cryptography',
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[600px]">
        <LoadingSpinner size="lg" label="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="profile-title">
          <User className="h-8 w-8" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile information and learning preferences
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList
          className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
          data-testid="profile-tabs"
        >
          <TabsTrigger value="personal" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            Personal
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" />
            Learning
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex items-center gap-1">
            <Award className="h-4 w-4" />
            Skills
          </TabsTrigger>
          <TabsTrigger value="purchases" className="flex items-center gap-1">
            <ShoppingBag className="h-4 w-4" />
            Purchases
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                {userProfile?.profileImageUrl && (
                  <img
                    src={userProfile.profileImageUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full"
                    data-testid="profile-image"
                  />
                )}
                <div>
                  <h3 className="font-semibold text-lg">
                    {profileData.firstName} {profileData.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{userProfile?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                    placeholder="Enter your first name"
                    data-testid="input-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                    placeholder="Enter your last name"
                    data-testid="input-lastname"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email || ''}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="Enter your email address"
                  className={
                    profileData.email && !isValidEmail(profileData.email) ? 'border-red-500' : ''
                  }
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  {userProfile?.email
                    ? 'You can update your email address if needed'
                    : 'Please provide an email address to receive notifications'}
                </p>
                {profileData.email && !isValidEmail(profileData.email) && (
                  <p className="text-xs text-red-500">Please enter a valid email address</p>
                )}
              </div>

              {!userProfile?.email && !profileData.email && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Email Recommended:</strong> Please add your email address to receive
                    important notifications and updates.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Preferences</CardTitle>
              <CardDescription>Customize your study schedule and learning goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Certification Goals</Label>
                <div className="grid grid-cols-3 gap-3">
                  {certificationOptions.map((cert) => (
                    <div key={cert} className="flex items-center space-x-2">
                      <Checkbox
                        id={cert}
                        checked={profileData.certificationGoals?.includes(cert)}
                        onCheckedChange={(checked) => {
                          const goals = profileData.certificationGoals || [];
                          setProfileData({
                            ...profileData,
                            certificationGoals: checked
                              ? [...goals, cert]
                              : goals.filter((g) => g !== cert),
                          });
                        }}
                        data-testid={`checkbox-cert-${cert}`}
                      />
                      <Label htmlFor={cert} className="text-sm font-normal cursor-pointer">
                        {cert}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dailyTime">Daily Study Time (minutes)</Label>
                <Input
                  id="dailyTime"
                  type="number"
                  min="5"
                  max="480"
                  value={profileData.studyPreferences?.dailyTimeMinutes || 30}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      studyPreferences: {
                        ...profileData.studyPreferences,
                        dailyTimeMinutes: parseInt(e.target.value),
                      },
                    })
                  }
                  data-testid="input-daily-time"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">Preferred Difficulty</Label>
                <Select
                  value={profileData.studyPreferences?.preferredDifficulty || 'intermediate'}
                  onValueChange={(value: any) =>
                    setProfileData({
                      ...profileData,
                      studyPreferences: {
                        ...profileData.studyPreferences,
                        preferredDifficulty: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="difficulty" data-testid="select-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Study Days</Label>
                <div className="grid grid-cols-2 gap-3">
                  {weekDays.map((day) => (
                    <div key={day} className="flex items-center space-x-2">
                      <Checkbox
                        id={day}
                        checked={profileData.studyPreferences?.studyDays?.includes(day)}
                        onCheckedChange={(checked) => {
                          const days = profileData.studyPreferences?.studyDays || [];
                          setProfileData({
                            ...profileData,
                            studyPreferences: {
                              ...profileData.studyPreferences,
                              studyDays: checked ? [...days, day] : days.filter((d) => d !== day),
                            },
                          });
                        }}
                        data-testid={`checkbox-day-${day.toLowerCase()}`}
                      />
                      <Label htmlFor={day} className="text-sm font-normal cursor-pointer">
                        {day}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderTime">Daily Reminder Time</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={profileData.studyPreferences?.reminderTime || '09:00'}
                  onChange={(e) =>
                    setProfileData({
                      ...profileData,
                      studyPreferences: {
                        ...profileData.studyPreferences,
                        reminderTime: e.target.value,
                      },
                    })
                  }
                  data-testid="input-reminder-time"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Skills Assessment</CardTitle>
              <CardDescription>Help us personalize your learning experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="experience">Experience Level</Label>
                <Select
                  value={profileData.skillsAssessment?.experienceLevel || 'beginner'}
                  onValueChange={(value: any) =>
                    setProfileData({
                      ...profileData,
                      skillsAssessment: {
                        ...profileData.skillsAssessment,
                        experienceLevel: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="experience" data-testid="select-experience">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="learningStyle">Learning Style</Label>
                <Select
                  value={profileData.skillsAssessment?.learningStyle || 'visual'}
                  onValueChange={(value: any) =>
                    setProfileData({
                      ...profileData,
                      skillsAssessment: {
                        ...profileData.skillsAssessment,
                        learningStyle: value,
                      },
                    })
                  }
                >
                  <SelectTrigger id="learningStyle" data-testid="select-learning-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="visual">Visual</SelectItem>
                    <SelectItem value="auditory">Auditory</SelectItem>
                    <SelectItem value="kinesthetic">Kinesthetic</SelectItem>
                    <SelectItem value="reading">Reading/Writing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Relevant Experience Areas</Label>
                <div className="grid grid-cols-2 gap-3">
                  {experienceOptions.map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        id={area}
                        checked={profileData.skillsAssessment?.relevantExperience?.includes(area)}
                        onCheckedChange={(checked) => {
                          const experience = profileData.skillsAssessment?.relevantExperience || [];
                          setProfileData({
                            ...profileData,
                            skillsAssessment: {
                              ...profileData.skillsAssessment,
                              relevantExperience: checked
                                ? [...experience, area]
                                : experience.filter((e) => e !== area),
                            },
                          });
                        }}
                        data-testid={`checkbox-exp-${area.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                      <Label htmlFor={area} className="text-sm font-normal cursor-pointer">
                        {area}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Motivations</Label>
                <div className="grid grid-cols-2 gap-3">
                  {motivationOptions.map((motivation) => (
                    <div key={motivation} className="flex items-center space-x-2">
                      <Checkbox
                        id={motivation}
                        checked={profileData.skillsAssessment?.motivations?.includes(motivation)}
                        onCheckedChange={(checked) => {
                          const motivations = profileData.skillsAssessment?.motivations || [];
                          setProfileData({
                            ...profileData,
                            skillsAssessment: {
                              ...profileData.skillsAssessment,
                              motivations: checked
                                ? [...motivations, motivation]
                                : motivations.filter((m) => m !== motivation),
                            },
                          });
                        }}
                        data-testid={`checkbox-motivation-${motivation.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                      <Label htmlFor={motivation} className="text-sm font-normal cursor-pointer">
                        {motivation}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          <UserPurchasesCard />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Your account is secured with Google Sign-In</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Google Authentication:</strong> Your account uses Google Sign-In for
                  secure authentication. Password management is handled by Google.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                Cloud Sync
              </CardTitle>
              <CardDescription>
                Enable cloud sync to access your data across multiple devices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user && (
                <div className="space-y-4">
                  {user.email.includes('@') && user.email.length > 5 ? (
                    <Alert>
                      <Cloud className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-2">
                          <p>
                            <strong>Cloud Sync Status:</strong>{' '}
                            {isCloudSyncEnabled ? (
                              <span className="text-green-600 font-semibold">Active</span>
                            ) : (
                              <span className="text-muted-foreground">Not Active</span>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            To enable cloud sync, sign in with your email and password or Google
                            account. Your data will be automatically synced to Firebase.
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Currently using: <strong>Cloud Storage</strong> (Firestore)
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert>
                      <CloudOff className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Local Only Mode:</strong> Your data is stored only on this device.
                        To enable cloud sync and access your data across devices, you'll need to
                        create an account with an email address.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Benefits of Cloud Sync:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Access your data from any device</li>
                      <li>Automatic backup and restore</li>
                      <li>Seamless synchronization across devices</li>
                      <li>Never lose your progress</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Privacy & Security:</h4>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Your data is encrypted and secure</li>
                      <li>Only you can access your information</li>
                      <li>Firestore security rules protect your data</li>
                      <li>Local cache for offline access</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Contribution Heatmap */}
      <div className="mt-6">
        <ContributionHeatmap />
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          className="min-w-[120px]"
          data-testid="save-button"
        >
          {updateProfileMutation.isPending ? (
            <LoadingSpinner size="sm" variant="white" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
