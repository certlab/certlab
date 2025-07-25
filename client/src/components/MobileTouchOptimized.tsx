import { ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";

interface MobileTouchOptimizedProps {
  children: ReactNode;
  className?: string;
  enableHapticFeedback?: boolean;
  touchTargetSize?: 'small' | 'medium' | 'large';
}

export default function MobileTouchOptimized({
  children,
  className = "",
  enableHapticFeedback = true,
  touchTargetSize = 'medium'
}: MobileTouchOptimizedProps) {
  const isMobile = useIsMobile();
  const [touchActive, setTouchActive] = useState(false);

  // Touch target size classes
  const sizeClasses = {
    small: 'min-h-[44px] min-w-[44px]',
    medium: 'min-h-[48px] min-w-[48px]', 
    large: 'min-h-[56px] min-w-[56px]'
  };

  // Simulate haptic feedback through visual cues
  const simulateHapticFeedback = () => {
    if (!enableHapticFeedback || !isMobile) return;
    
    setTouchActive(true);
    setTimeout(() => setTouchActive(false), 150);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    simulateHapticFeedback();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
  };

  // Prevent double-tap zoom on mobile
  useEffect(() => {
    if (!isMobile) return;

    const preventDoubleTapZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchstart', preventDoubleTapZoom, { passive: false });
    return () => document.removeEventListener('touchstart', preventDoubleTapZoom);
  }, [isMobile]);

  if (!isMobile) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div 
      className={`
        ${className}
        ${sizeClasses[touchTargetSize]}
        touch-manipulation
        select-none
        transition-transform duration-150 ease-out
        ${touchActive ? 'scale-95' : 'scale-100'}
        active:scale-95
        cursor-pointer
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      {children}
    </div>
  );
}

// Mobile-optimized button component
export function MobileTouchButton({
  children,
  onClick,
  variant = "default",
  size = "default",
  className = "",
  ...props
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  [key: string]: any;
}) {  
  const isMobile = useIsMobile();
  const [isPressed, setIsPressed] = useState(false);

  if (!isMobile) {
    return (
      <Button 
        variant={variant} 
        size={size}
        className={className}
        onClick={onClick}
        {...props}
      >
        {children}
      </Button>
    );
  }

  return (
    <MobileTouchOptimized touchTargetSize="large">
      <Button
        variant={variant}
        size={size}
        className={`
          ${className}
          min-h-[56px] px-6 py-3
          text-base font-medium
          transition-all duration-150
          ${isPressed ? 'scale-95 brightness-90' : 'scale-100'}
        `}
        onClick={onClick}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        {...props}
      >
        {children}
      </Button>
    </MobileTouchOptimized>
  );
}

// Mobile-optimized card component
export function MobileTouchCard({
  title,
  children,
  onClick,
  className = "",
  ...props
}: {
  title?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <Card className={className} onClick={onClick} {...props}>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          {children}
        </CardContent>
      </Card>
    );
  }

  return (
    <MobileTouchOptimized 
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      touchTargetSize="large"
    >
      <Card 
        className="min-h-[64px] shadow-md hover:shadow-lg transition-shadow"
        onClick={onClick}
        {...props}
      >
        {title && (
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent className="pt-0">
          {children}
        </CardContent>
      </Card>
    </MobileTouchOptimized>
  );
}