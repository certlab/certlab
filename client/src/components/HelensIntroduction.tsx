import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Brain,
  TrendingUp,
  BookOpen,
  Target,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { markHelenIntroCompleted } from "@/lib/onboarding";

interface HelensIntroductionProps {
  isOpen: boolean;
  onComplete: () => void;
}

const introSteps = [
  {
    id: 1,
    title: "Meet Helen: Your AI Learning Assistant",
    icon: Brain,
    content: (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 rounded-lg">
          <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-700 dark:text-purple-300">Helen</h3>
            <Badge variant="secondary" className="text-xs">AI Learning Assistant</Badge>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Helen is your personal AI learning companion, designed to guide you through your certification journey. 
          She analyzes your performance, understands your learning patterns, and provides personalized recommendations 
          to help you succeed.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    title: "Personalized Study Recommendations",
    icon: Target,
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="p-3 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Smart Focus Areas</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Helen identifies topics where you need more practice based on your quiz performance
            </p>
          </div>
          <div className="p-3 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Optimal Study Sessions</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Recommends the best question types and difficulty levels for your current skill level
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: "Real-time Performance Analysis",
    icon: TrendingUp,
    content: (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Recent Performance</span>
            <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Security Fundamentals</span>
              <span className="text-green-600 dark:text-green-400 font-medium">+12%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Network Security</span>
              <span className="text-blue-600 dark:text-blue-400 font-medium">+8%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Risk Management</span>
              <span className="text-orange-600 dark:text-orange-400 font-medium">Focus Area</span>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Helen tracks your progress across all topics and provides insights into your improvement trends.
        </p>
      </div>
    ),
  },
  {
    id: 4,
    title: "Adaptive Learning Paths",
    icon: BookOpen,
    content: (
      <div className="space-y-4">
        <div className="relative">
          <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border-l-4 border-primary">
            <BookOpen className="w-5 h-5 text-primary" />
            <div>
              <h4 className="font-medium text-sm">Your Next Session</h4>
              <p className="text-xs text-muted-foreground">
                15-question practice focused on Identity & Access Management
              </p>
            </div>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">
          Helen creates customized learning paths that adapt based on your progress, ensuring you're always 
          working on the most relevant topics for your certification goals.
        </p>
        <div className="bg-muted/30 p-3 rounded-lg">
          <p className="text-xs text-center text-muted-foreground">
            Ready to start your AI-guided learning journey? Helen is here to help you succeed!
          </p>
        </div>
      </div>
    ),
  },
];

export default function HelensIntroduction({ isOpen, onComplete }: HelensIntroductionProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < introSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    markHelenIntroCompleted();
    onComplete();
  };

  const handleSkip = () => {
    markHelenIntroCompleted();
    onComplete();
  };

  const currentStepData = introSteps[currentStep];
  const isLastStep = currentStep === introSteps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto" aria-describedby="helen-intro-description">
        <DialogHeader>
          <DialogTitle className="text-center">
            Welcome to Cert Lab
          </DialogTitle>
          <DialogDescription id="helen-intro-description" className="sr-only">
            Introduction tour to help you get started with Cert Lab and meet Helen, your AI learning assistant
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex justify-center gap-2">
            {introSteps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentStep
                    ? "bg-primary"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <currentStepData.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {currentStepData.title}
              </h3>
            </div>
            
            <div className="min-h-[200px]">
              {currentStepData.content}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip Tour
            </Button>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
              
              <Button
                size="sm"
                onClick={handleNext}
                className="min-w-[80px]"
              >
                {isLastStep ? (
                  "Get Started"
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