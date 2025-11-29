import { Moon, Sun, Snowflake, Coffee, Zap, Sparkles, Flower, Eye, LucideIcon } from 'lucide-react';

export interface ThemeOption {
  name: string;
  value:
    | 'light'
    | 'dark'
    | 'high-contrast'
    | 'nord'
    | 'catppuccin'
    | 'tokyo-night'
    | 'dracula'
    | 'rose-pine';
  icon: LucideIcon;
  description: string;
}

export const themes: ThemeOption[] = [
  {
    name: 'Light',
    value: 'light',
    icon: Sun,
    description: 'Clean and bright',
  },
  {
    name: 'Dark',
    value: 'dark',
    icon: Moon,
    description: 'Easy on the eyes',
  },
  {
    name: 'High Contrast',
    value: 'high-contrast',
    icon: Eye,
    description: 'WCAG AAA compliant',
  },
  {
    name: 'Nord',
    value: 'nord',
    icon: Snowflake,
    description: 'Cool arctic palette',
  },
  {
    name: 'Catppuccin',
    value: 'catppuccin',
    icon: Coffee,
    description: 'Warm and cozy',
  },
  {
    name: 'Tokyo Night',
    value: 'tokyo-night',
    icon: Zap,
    description: 'Vibrant neon dark',
  },
  {
    name: 'Dracula',
    value: 'dracula',
    icon: Sparkles,
    description: 'Bold purple dark',
  },
  {
    name: 'Rose Pine',
    value: 'rose-pine',
    icon: Flower,
    description: 'Soft pastel elegance',
  },
];
