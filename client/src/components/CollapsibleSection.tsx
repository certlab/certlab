import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  showToggle?: boolean;
}

const COLLAPSED_SECTIONS_KEY = 'cert-lab-collapsed-sections';

export default function CollapsibleSection({
  id,
  title,
  description,
  children,
  defaultExpanded = true,
  className = "",
  showToggle = true,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      if (saved) {
        const collapsedSections = JSON.parse(saved);
        if (collapsedSections[id] !== undefined) {
          setIsExpanded(!collapsedSections[id]);
        }
      }
    } catch (error) {
      console.warn('Failed to load section preferences:', error);
    }
  }, [id]);

  // Save preferences when state changes
  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);

    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      const collapsedSections = saved ? JSON.parse(saved) : {};
      collapsedSections[id] = !newState; // Store collapsed state (inverse of expanded)
      localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsedSections));
    } catch (error) {
      console.warn('Failed to save section preferences:', error);
    }
  };

  return (
    <section className={`dashboard-section ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-center text-foreground mb-2">
            {title}
          </h2>
          {description && (
            <p className="text-center text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {showToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100 max-h-none' : 'opacity-0 max-h-0 overflow-hidden'
        }`}
      >
        {children}
      </div>
    </section>
  );
}