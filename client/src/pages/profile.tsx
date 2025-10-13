import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-provider";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Clock,
  Target,
  BookOpen,
  CreditCard,
  Save,
  Loader2,
  Award,
  Calendar,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
  Crown,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  certificationGoals?: string[];
  studyPreferences?: {
    dailyTimeMinutes?: number;
    preferredDifficulty?: "beginner" | "intermediate" | "advanced";
    focusAreas?: string[];
    studyDays?: string[];
    reminderTime?: string;
  };
  skillsAssessment?: {
    experienceLevel?: "beginner" | "intermediate" | "advanced" | "expert";
    relevantExperience?: string[];
    learningStyle?: "visual" | "auditory" | "kinesthetic" | "reading";
    completedCertifications?: string[];
    motivations?: string[];
  };
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
  subscriptionFeatures?: {
    quizzesPerDay?: number;
    categoriesAccess?: string[];
    analyticsAccess?: string;
    teamMembers?: number;
  };
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<Partial<UserProfile>>({
    email: "",
    firstName: "",
    lastName: "",
    certificationGoals: [],
    studyPreferences: {
      dailyTimeMinutes: 30,
      preferredDifficulty: "intermediate",
      focusAreas: [],
      studyDays: [],
      reminderTime: "09:00",
    },
    skillsAssessment: {
      experienceLevel: "beginner",
      relevantExperience: [],
      learningStyle: "visual",
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
    queryKey: [`/api/user/${user?.id}`],
    enabled: !!user?.id,
  });

  // Fetch subscription status
  const { data: subscriptionStatus } = useQuery<{
    isConfigured: boolean;
    plan: string;
    status: string;
    features: string[];
    limits: { quizzesPerDay: number };
    dailyQuizCount: number;
    expiresAt?: string;
  }>({
    queryKey: ["/api/subscription/status"],
    enabled: !!user,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const response = await apiRequest({
        method: "PATCH",
        endpoint: `/api/user/${user?.id}/profile`,
        data: data,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}`] });
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update local state when user data is loaded
  useEffect(() => {
    if (userProfile) {
      setProfileData({
        email: userProfile.email || "",
        firstName: userProfile.firstName || "",
        lastName: userProfile.lastName || "",
        certificationGoals: userProfile.certificationGoals || [],
        studyPreferences: userProfile.studyPreferences || {
          dailyTimeMinutes: 30,
          preferredDifficulty: "intermediate",
          focusAreas: [],
          studyDays: [],
          reminderTime: "09:00",
        },
        skillsAssessment: userProfile.skillsAssessment || {
          experienceLevel: "beginner",
          relevantExperience: [],
          learningStyle: "visual",
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
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate(profileData);
  };

  const certificationOptions = [
    "CC",
    "CISSP",
    "Cloud+",
    "CISM",
    "CGRC",
    "CISA",
  ];

  const weekDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const motivationOptions = [
    "Career advancement",
    "Salary increase",
    "Job requirement",
    "Personal development",
    "Industry recognition",
    "Compliance requirement",
  ];

  const experienceOptions = [
    "Network Security",
    "Cloud Computing",
    "Risk Management",
    "Incident Response",
    "Compliance",
    "Security Architecture",
    "DevSecOps",
    "Cryptography",
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          Manage your profile information and subscription settings
        </p>
      </div>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4" data-testid="profile-tabs">
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
          <TabsTrigger value="subscription" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            Subscription
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
                    onChange={(e) =>
                      setProfileData({ ...profileData, firstName: e.target.value })
                    }
                    placeholder="Enter your first name"
                    data-testid="input-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, lastName: e.target.value })
                    }
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
                  value={profileData.email || ""}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="Enter your email address"
                  className={profileData.email && !isValidEmail(profileData.email) ? "border-red-500" : ""}
                  data-testid="input-email"
                />
                <p className="text-xs text-muted-foreground">
                  {userProfile?.email ? 
                    "You can update your email address if needed for subscriptions" : 
                    "Please provide an email address to enable subscription features"}
                </p>
                {profileData.email && !isValidEmail(profileData.email) && (
                  <p className="text-xs text-red-500">Please enter a valid email address</p>
                )}
              </div>

              {!userProfile?.email && !profileData.email && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Email Required for Subscriptions:</strong> Please add your email address to enable subscription features and access premium content.
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
              <CardDescription>
                Customize your study schedule and learning goals
              </CardDescription>
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
                      <Label
                        htmlFor={cert}
                        className="text-sm font-normal cursor-pointer"
                      >
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
                  value={profileData.studyPreferences?.preferredDifficulty || "intermediate"}
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
                              studyDays: checked
                                ? [...days, day]
                                : days.filter((d) => d !== day),
                            },
                          });
                        }}
                        data-testid={`checkbox-day-${day.toLowerCase()}`}
                      />
                      <Label
                        htmlFor={day}
                        className="text-sm font-normal cursor-pointer"
                      >
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
                  value={profileData.studyPreferences?.reminderTime || "09:00"}
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
              <CardDescription>
                Help us personalize your learning experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="experience">Experience Level</Label>
                <Select
                  value={profileData.skillsAssessment?.experienceLevel || "beginner"}
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
                  value={profileData.skillsAssessment?.learningStyle || "visual"}
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
                        checked={profileData.skillsAssessment?.relevantExperience?.includes(
                          area
                        )}
                        onCheckedChange={(checked) => {
                          const experience =
                            profileData.skillsAssessment?.relevantExperience || [];
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
                      <Label
                        htmlFor={area}
                        className="text-sm font-normal cursor-pointer"
                      >
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
                        checked={profileData.skillsAssessment?.motivations?.includes(
                          motivation
                        )}
                        onCheckedChange={(checked) => {
                          const motivations =
                            profileData.skillsAssessment?.motivations || [];
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
                      <Label
                        htmlFor={motivation}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {motivation}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>
                Manage your subscription and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscriptionStatus && (
                <>
                  <div className="p-6 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold capitalize">
                          {subscriptionStatus.plan || "Free"} Plan
                        </h3>
                        <Badge
                          variant={
                            subscriptionStatus.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          data-testid="subscription-status-badge"
                        >
                          {subscriptionStatus.status === "active" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {subscriptionStatus.status}
                        </Badge>
                      </div>
                    </div>

                    {subscriptionStatus.features && (
                      <div className="space-y-3">
                        <h4 className="font-medium">Plan Features:</h4>
                        <ul className="space-y-2">
                          {subscriptionStatus.features.map((feature: string, index: number) => (
                            <li key={index} className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {subscriptionStatus.limits && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2">Usage Limits:</h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            Daily Quizzes:{" "}
                            <span className="font-medium">
                              {subscriptionStatus.limits.quizzesPerDay === -1
                                ? "Unlimited"
                                : `${subscriptionStatus.dailyQuizCount || 0} / ${
                                    subscriptionStatus.limits.quizzesPerDay
                                  }`}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {subscriptionStatus.expiresAt && (
                      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Renews on{" "}
                          {new Date(subscriptionStatus.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    {subscriptionStatus.plan === "free" ? (
                      <Link href="/app/subscription-plans">
                        <Button className="w-full" data-testid="upgrade-button">
                          <Crown className="h-4 w-4 mr-2" />
                          Upgrade to Pro
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Link href="/app/subscription/manage">
                          <Button variant="outline" data-testid="manage-subscription-button">
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Subscription
                          </Button>
                        </Link>
                        {subscriptionStatus.plan === "pro" && (
                          <Link href="/app/subscription-plans">
                            <Button variant="outline" data-testid="upgrade-enterprise-button">
                              <ChevronRight className="h-4 w-4 mr-2" />
                              Upgrade to Enterprise
                            </Button>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              {!subscriptionStatus?.isConfigured && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Subscription features are currently not configured. You're using the
                    free plan with default limits.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateProfileMutation.isPending}
          className="min-w-[120px]"
          data-testid="save-button"
        >
          {updateProfileMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
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