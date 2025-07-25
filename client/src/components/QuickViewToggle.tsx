import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface QuickViewToggleProps {
  onToggle: (isQuickView: boolean) => void;
}

const QUICK_VIEW_KEY = 'cert-lab-quick-view-mode';

export default function QuickViewToggle({ onToggle }: QuickViewToggleProps) {
  const [isQuickView, setIsQuickView] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(QUICK_VIEW_KEY);
      if (saved) {
        const quickViewMode = JSON.parse(saved);
        setIsQuickView(quickViewMode);
        onToggle(quickViewMode);
      }
    } catch (error) {
      console.warn('Failed to load quick view preference:', error);
    }
  }, [onToggle]);

  const handleToggle = () => {
    const newMode = !isQuickView;
    setIsQuickView(newMode);
    onToggle(newMode);

    try {
      localStorage.setItem(QUICK_VIEW_KEY, JSON.stringify(newMode));
    } catch (error) {
      console.warn('Failed to save quick view preference:', error);
    }
  };

  return (
    <Card className="fixed top-20 right-4 z-50 shadow-lg">
      <CardContent className="p-3">
        <Button
          variant={isQuickView ? "default" : "outline"}
          size="sm"
          onClick={handleToggle}
          className="flex items-center gap-2"
        >
          {isQuickView ? (
            <>
              <Eye className="w-4 h-4" />
              Quick View
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              Full View
            </>
          )}
        </Button>
        {isQuickView && (
          <p className="text-xs text-muted-foreground mt-1 max-w-32">
            Showing essentials only
          </p>
        )}
      </CardContent>
    </Card>
  );
}