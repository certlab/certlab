import { Moon, Sun, Snowflake, Coffee, Zap, Sparkles, Flower } from "lucide-react";
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
    name: "Nord",
    value: "nord" as const,
    icon: Snowflake,
    description: "Cool arctic palette"
  },
  {
    name: "Catppuccin",
    value: "catppuccin" as const,
    icon: Coffee,
    description: "Warm and cozy"
  },
  {
    name: "Tokyo Night",
    value: "tokyo-night" as const,
    icon: Zap,
    description: "Vibrant neon dark"
  },
  {
    name: "Dracula",
    value: "dracula" as const,
    icon: Sparkles,
    description: "Bold purple dark"
  },
  {
    name: "Rose Pine",
    value: "rose-pine" as const,
    icon: Flower,
    description: "Soft pastel elegance"
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
              className="flex items-center gap-2 cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground [&:hover_.description]:text-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{themeOption.name}</span>
                <span className="description text-xs text-muted-foreground">{themeOption.description}</span>
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