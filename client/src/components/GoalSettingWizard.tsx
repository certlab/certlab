import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Target, Clock, Brain, Trophy, ChevronRight, ChevronLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-provider';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface GoalSettingWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

interface WizardState {
  certificationGoals: string[];
  studyPreferences: {
    dailyTimeMinutes: number;
    preferredDifficulty: 'beginner' | 'intermediate' | 'advanced';
    focusAreas: string[];
    studyDays: string[];
    reminderTime: string;
  };
  skillsAssessment: {
    experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    relevantExperience: string[];
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    completedCertifications: string[];
    motivations: string[];
  };
}

const availableCertifications = [
  { id: 'CC', name: 'CC Certification', description: 'Certified in Cybersecurity' },
  {
    id: 'CISSP',
    name: 'CISSP',
    description: 'Certified Information Systems Security Professional',
  },
  { id: 'CISM', name: 'CISM', description: 'Certified Information Security Manager' },
  { id: 'CISA', name: 'CISA', description: 'Certified Information Systems Auditor' },
  { id: 'CGRC', name: 'CGRC', description: 'Certified in Governance, Risk and Compliance' },
  { id: 'Cloud+', name: 'CompTIA Cloud+', description: 'Cloud infrastructure and services' },
  { id: 'Security+', name: 'CompTIA Security+', description: 'Fundamental security concepts' },
];

const focusAreas = [
  'Risk Management',
  'Security Architecture',
  'Network Security',
  'Identity & Access Management',
  'Cryptography',
  'Incident Response',
  'Compliance & Governance',
  'Cloud Security',
];

const experienceLevels = [
  { value: 'beginner', label: 'Beginner', description: 'New to cybersecurity' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years experience' },
  { value: 'advanced', label: 'Advanced', description: '3-5 years experience' },
  { value: 'expert', label: 'Expert', description: '5+ years experience' },
];

const learningStyles = [
  { value: 'visual', label: 'Visual', description: 'Learn through diagrams and charts' },
  { value: 'auditory', label: 'Auditory', description: 'Learn through listening and discussion' },
  { value: 'kinesthetic', label: 'Kinesthetic', description: 'Learn through hands-on practice' },
  { value: 'reading', label: 'Reading', description: 'Learn through reading and writing' },
];

const motivations = [
  'Career advancement',
  'Salary increase',
  'Job security',
  'Professional development',
  'Industry recognition',
  'Personal interest',
  'Employer requirement',
  'Career transition',
];

const wizardSteps = [
  {
    id: 1,
    title: 'Certification Goals',
    icon: Target,
    description: 'Select the certifications you want to pursue',
  },
  {
    id: 2,
    title: 'Study Preferences',
    icon: Clock,
    description: 'Configure your study schedule and preferences',
  },
  {
    id: 3,
    title: 'Skills Assessment',
    icon: Brain,
    description: 'Help us understand your background and learning style',
  },
  {
    id: 4,
    title: 'Review & Confirm',
    icon: CheckCircle,
    description: 'Review your goals and preferences',
  },
];

export default function GoalSettingWizard({ isOpen, onComplete }: GoalSettingWizardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [wizardState, setWizardState] = useState<WizardState>({
    certificationGoals: [],
    studyPreferences: {
      dailyTimeMinutes: 30,
      preferredDifficulty: 'intermediate',
      focusAreas: [],
      studyDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      reminderTime: '09:00',
    },
    skillsAssessment: {
      experienceLevel: 'intermediate',
      relevantExperience: [],
      learningStyle: 'visual',
      completedCertifications: [],
      motivations: [],
    },
  });

  const updateWizardState = (section: keyof WizardState, updates: any) => {
    setWizardState((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...updates },
    }));
  };

  const handleNext = () => {
    if (currentStep < wizardSteps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);
    try {
      await apiRequest({
        endpoint: `/api/user/${user.id}/goals`,
        method: 'POST',
        data: wizardState,
      });

      toast({
        title: 'Goals Set Successfully!',
        description:
          'Helen will now personalize your learning experience based on your preferences.',
      });

      onComplete();
    } catch (error) {
      console.error('Failed to save goals:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your goals. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Target className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Choose Your Certification Goals</h3>
              <p className="text-muted-foreground">
                Select the certifications you want to work towards. You can choose multiple goals.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {availableCertifications.map((cert) => (
                <Card
                  key={cert.id}
                  className={`cursor-pointer transition-all ${
                    wizardState.certificationGoals.includes(cert.id)
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => {
                    const goals = wizardState.certificationGoals.includes(cert.id)
                      ? wizardState.certificationGoals.filter((g) => g !== cert.id)
                      : [...wizardState.certificationGoals, cert.id];
                    setWizardState((prev) => ({ ...prev, certificationGoals: goals }));
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{cert.name}</h4>
                        <p className="text-sm text-muted-foreground">{cert.description}</p>
                      </div>
                      <div className="flex items-center">
                        {wizardState.certificationGoals.includes(cert.id) && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Clock className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Study Preferences</h3>
              <p className="text-muted-foreground">
                Tell us about your study schedule and learning preferences.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Daily Study Time</Label>
                <RadioGroup
                  value={wizardState.studyPreferences.dailyTimeMinutes.toString()}
                  onValueChange={(value) =>
                    updateWizardState('studyPreferences', { dailyTimeMinutes: parseInt(value) })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="15" />
                    <Label>15 minutes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30" />
                    <Label>30 minutes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="60" />
                    <Label>1 hour</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="120" />
                    <Label>2+ hours</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">
                  Preferred Difficulty Level
                </Label>
                <RadioGroup
                  value={wizardState.studyPreferences.preferredDifficulty}
                  onValueChange={(value: any) =>
                    updateWizardState('studyPreferences', { preferredDifficulty: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beginner" />
                    <Label>Beginner - Start with fundamentals</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediate" />
                    <Label>Intermediate - Mix of basic and advanced topics</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="advanced" />
                    <Label>Advanced - Challenge me with complex scenarios</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Focus Areas (Optional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {focusAreas.map((area) => (
                    <div key={area} className="flex items-center space-x-2">
                      <Checkbox
                        checked={wizardState.studyPreferences.focusAreas.includes(area)}
                        onCheckedChange={(checked) => {
                          const areas = checked
                            ? [...wizardState.studyPreferences.focusAreas, area]
                            : wizardState.studyPreferences.focusAreas.filter((a) => a !== area);
                          updateWizardState('studyPreferences', { focusAreas: areas });
                        }}
                      />
                      <Label className="text-sm">{area}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Brain className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Skills Assessment</h3>
              <p className="text-muted-foreground">
                Help Helen understand your background to provide better recommendations.
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Experience Level</Label>
                <RadioGroup
                  value={wizardState.skillsAssessment.experienceLevel}
                  onValueChange={(value: any) =>
                    updateWizardState('skillsAssessment', { experienceLevel: value })
                  }
                >
                  {experienceLevels.map((level) => (
                    <div key={level.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={level.value} />
                      <div>
                        <Label className="font-medium">{level.label}</Label>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Learning Style</Label>
                <RadioGroup
                  value={wizardState.skillsAssessment.learningStyle}
                  onValueChange={(value: any) =>
                    updateWizardState('skillsAssessment', { learningStyle: value })
                  }
                >
                  {learningStyles.map((style) => (
                    <div key={style.value} className="flex items-center space-x-2">
                      <RadioGroupItem value={style.value} />
                      <div>
                        <Label className="font-medium">{style.label}</Label>
                        <p className="text-sm text-muted-foreground">{style.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">
                  What motivates you? (Select all that apply)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {motivations.map((motivation) => (
                    <div key={motivation} className="flex items-center space-x-2">
                      <Checkbox
                        checked={wizardState.skillsAssessment.motivations.includes(motivation)}
                        onCheckedChange={(checked) => {
                          const motivs = checked
                            ? [...wizardState.skillsAssessment.motivations, motivation]
                            : wizardState.skillsAssessment.motivations.filter(
                                (m) => m !== motivation
                              );
                          updateWizardState('skillsAssessment', { motivations: motivs });
                        }}
                      />
                      <Label className="text-sm">{motivation}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 mx-auto text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Review Your Goals</h3>
              <p className="text-muted-foreground">
                Review your preferences before we create your personalized learning plan.
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-4 h-4" />
                    Certification Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {wizardState.certificationGoals.map((goalId) => (
                      <Badge key={goalId} variant="secondary">
                        {availableCertifications.find((c) => c.id === goalId)?.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="w-4 h-4" />
                    Study Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">
                    <strong>Daily Time:</strong> {wizardState.studyPreferences.dailyTimeMinutes}{' '}
                    minutes
                  </p>
                  <p className="text-sm">
                    <strong>Difficulty:</strong> {wizardState.studyPreferences.preferredDifficulty}
                  </p>
                  {wizardState.studyPreferences.focusAreas.length > 0 && (
                    <p className="text-sm">
                      <strong>Focus Areas:</strong>{' '}
                      {wizardState.studyPreferences.focusAreas.join(', ')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Brain className="w-4 h-4" />
                    Skills & Learning Style
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">
                    <strong>Experience:</strong> {wizardState.skillsAssessment.experienceLevel}
                  </p>
                  <p className="text-sm">
                    <strong>Learning Style:</strong> {wizardState.skillsAssessment.learningStyle}
                  </p>
                  {wizardState.skillsAssessment.motivations.length > 0 && (
                    <p className="text-sm">
                      <strong>Motivations:</strong>{' '}
                      {wizardState.skillsAssessment.motivations.join(', ')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return wizardState.certificationGoals.length > 0;
      case 2:
        return true; // All fields have defaults
      case 3:
        return true; // All fields have defaults
      case 4:
        return true;
      default:
        return false;
    }
  };

  const isLastStep = currentStep === wizardSteps.length;

  return (
    <Dialog open={isOpen} onOpenChange={onComplete}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        aria-describedby="goal-wizard-description"
      >
        <DialogHeader>
          <DialogTitle className="text-center">Set Your Learning Goals</DialogTitle>
          <DialogDescription id="goal-wizard-description" className="sr-only">
            Set your certification goals and learning preferences to get personalized study
            recommendations
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex justify-center gap-2">
            {wizardSteps.map((step, index) => (
              <div
                key={step.id}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index + 1 === currentStep
                    ? 'bg-primary'
                    : index + 1 < currentStep
                      ? 'bg-primary/50'
                      : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step indicator */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Step {currentStep} of {wizardSteps.length}
            </p>
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">{renderStepContent()}</div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={onComplete}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>

            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  'Saving...'
                ) : isLastStep ? (
                  'Complete Setup'
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
