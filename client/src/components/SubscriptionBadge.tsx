import { Crown, Zap, Star, ChevronRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SubscriptionBadgeProps {
  plan: 'free' | 'pro' | 'enterprise';
  size?: 'small' | 'medium' | 'large';
  showFeatures?: boolean;
  showQuizCount?: boolean;
  dailyQuizCount?: number;
  quizLimit?: number;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
}

const planConfig = {
  free: {
    icon: Zap,
    label: "Free",
    shortLabel: "Free",
    gradient: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    borderColor: "border-gray-300 dark:border-gray-600",
    glowColor: "",
    features: [
      "5 quizzes per day",
      "Basic certifications",
      "Basic analytics",
      "Community support"
    ],
    benefits: "Perfect for getting started with certification prep"
  },
  pro: {
    icon: Crown,
    label: "Pro",
    shortLabel: "Pro",
    gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    borderColor: "border-purple-400 dark:border-purple-600",
    glowColor: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
    features: [
      "Unlimited quizzes",
      "All certifications",
      "Advanced analytics",
      "AI study recommendations",
      "Priority support"
    ],
    benefits: "Unlock full potential with unlimited access and advanced features"
  },
  enterprise: {
    icon: Star,
    label: "Enterprise",
    shortLabel: "Ent",
    gradient: "bg-gradient-to-r from-amber-500 to-orange-500 text-white",
    borderColor: "border-amber-400 dark:border-amber-600",
    glowColor: "shadow-[0_0_20px_rgba(251,191,36,0.3)]",
    features: [
      "Everything in Pro",
      "Team management",
      "Custom certifications",
      "API access",
      "Dedicated support",
      "Custom integrations"
    ],
    benefits: "Complete solution for teams and organizations"
  }
};

export default function SubscriptionBadge({
  plan,
  size = 'medium',
  showFeatures = false,
  showQuizCount = false,
  dailyQuizCount = 0,
  quizLimit = 5,
  className,
  interactive = false,
  onClick
}: SubscriptionBadgeProps) {
  const config = planConfig[plan];
  const Icon = config.icon;

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          badge: "h-6 px-2 py-0.5 text-xs",
          icon: "w-3 h-3",
          text: "text-xs",
          gap: "gap-1"
        };
      case 'medium':
        return {
          badge: "h-8 px-3 py-1 text-sm",
          icon: "w-4 h-4",
          text: "text-sm",
          gap: "gap-1.5"
        };
      case 'large':
        return {
          badge: "h-10 px-4 py-2 text-base",
          icon: "w-5 h-5",
          text: "text-base",
          gap: "gap-2"
        };
      default:
        return {
          badge: "h-8 px-3 py-1 text-sm",
          icon: "w-4 h-4",
          text: "text-sm",
          gap: "gap-1.5"
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Quiz count display for free plan
  const quizCountDisplay = showQuizCount && plan === 'free' && quizLimit > 0 ? (
    <span className="opacity-90 font-normal">
      • {dailyQuizCount}/{quizLimit} quizzes
    </span>
  ) : null;

  const badgeContent = (
    <div
      className={cn(
        "inline-flex items-center rounded-full font-medium transition-all border",
        config.gradient,
        config.borderColor,
        plan !== 'free' && config.glowColor,
        interactive && "cursor-pointer hover:scale-105 active:scale-95",
        sizeClasses.badge,
        sizeClasses.gap,
        className
      )}
      onClick={onClick}
    >
      <Icon className={cn(sizeClasses.icon, plan !== 'free' && "animate-pulse-slow")} />
      <span className="font-semibold">
        {size === 'small' ? config.shortLabel : config.label}
      </span>
      {quizCountDisplay}
      {interactive && (
        <ChevronRight className={cn(sizeClasses.icon, "opacity-70")} />
      )}
    </div>
  );

  if (!showFeatures) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="font-semibold">{config.label} Plan</span>
              </div>
              <p className="text-xs text-muted-foreground">{config.benefits}</p>
              <div className="pt-1 border-t border-border">
                <p className="text-xs font-medium mb-1">Key Features:</p>
                <ul className="text-xs space-y-0.5">
                  {config.features.slice(0, 3).map((feature, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <Sparkles className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full card display with features
  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        config.borderColor,
        plan !== 'free' && "shadow-sm",
        interactive && "cursor-pointer hover:shadow-md",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "rounded-full p-2",
            config.gradient,
            plan !== 'free' && config.glowColor
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{config.label} Plan</h3>
            {showQuizCount && plan === 'free' && (
              <p className="text-xs text-muted-foreground">
                {dailyQuizCount}/{quizLimit} quizzes used today
              </p>
            )}
            {plan === 'pro' && (
              <p className="text-xs text-purple-600 dark:text-purple-400">
                Unlimited access
              </p>
            )}
            {plan === 'enterprise' && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Full team access
              </p>
            )}
          </div>
        </div>
        {interactive && (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </div>
      
      <p className="text-sm text-muted-foreground mb-3">{config.benefits}</p>
      
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground">Includes:</p>
        <ul className="text-xs space-y-1">
          {config.features.slice(0, 4).map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Sparkles className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Export helper component for inline premium indicators
export function PremiumFeatureBadge({ 
  requiredPlan = 'pro',
  feature,
  className 
}: { 
  requiredPlan?: 'pro' | 'enterprise';
  feature?: string;
  className?: string;
}) {
  const Icon = requiredPlan === 'enterprise' ? Star : Crown;
  const label = requiredPlan === 'enterprise' ? 'Enterprise' : 'Pro';
  const gradient = requiredPlan === 'enterprise' 
    ? 'from-amber-500 to-orange-500' 
    : 'from-purple-500 to-pink-500';

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "h-5 px-1.5 py-0 text-xs font-medium bg-gradient-to-r text-white border-0",
              gradient,
              className
            )}
          >
            <Icon className="w-3 h-3 mr-0.5" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {feature || `${label} feature`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}