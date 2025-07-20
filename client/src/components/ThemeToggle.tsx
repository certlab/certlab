import { Moon, Sun, Waves, Trees, Sunset, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/lib/theme-provider";

const themes = [
  {
    name: "Light",
    value: "light" as const,
    icon: Sun,
    description: "Clean and bright"
  },
  {
    name: "Dark", 
    value: "dark" as const,
    icon: Moon,
    description: "Easy on the eyes"
  },
  {
    name: "Ocean",
    value: "ocean" as const,
    icon: Waves,
    description: "Blue and trustworthy"
  },
  {
    name: "Forest",
    value: "forest" as const,
    icon: Trees,
    description: "Natural earth tones"
  },
  {
    name: "Sunset",
    value: "sunset" as const,
    icon: Sunset,
    description: "Warm and energetic"
  },
  {
    name: "Purple",
    value: "purple" as const,
    icon: Sparkles,
    description: "Modern and innovative"
  },
  {
    name: "High Contrast",
    value: "contrast" as const,
    icon: Eye,
    description: "Maximum accessibility"
  }
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const currentTheme = themes.find(t => t.value === theme);
  const CurrentIcon = currentTheme?.icon || Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <CurrentIcon className="h-4 w-4" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          return (
            <DropdownMenuItem
              key={themeOption.value}
              onClick={() => setTheme(themeOption.value)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{themeOption.name}</span>
                <span className="text-xs text-muted-foreground">{themeOption.description}</span>
              </div>
              {theme === themeOption.value && (
                <span className="ml-auto text-xs">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}