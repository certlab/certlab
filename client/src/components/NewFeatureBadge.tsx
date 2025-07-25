import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { isFeatureNew, markFeatureAsSeen } from "@/lib/feature-discovery";
import { useEffect, useState } from "react";

interface NewFeatureBadgeProps {
  featureId: string;
  children: React.ReactNode;
  className?: string;
}

export default function NewFeatureBadge({ featureId, children, className = "" }: NewFeatureBadgeProps) {
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    setIsNew(isFeatureNew(featureId));
  }, [featureId]);

  const handleClick = () => {
    if (isNew) {
      markFeatureAsSeen(featureId);
      setIsNew(false);
    }
  };

  if (!isNew) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`} onClick={handleClick}>
      {children}
      <Badge 
        variant="secondary" 
        className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 animate-pulse"
      >
        <Sparkles className="w-3 h-3 mr-1" />
        New
      </Badge>
    </div>
  );
}