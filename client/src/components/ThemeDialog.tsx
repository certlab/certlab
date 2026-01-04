import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/lib/theme-provider';
import { themes } from '@/lib/theme-constants';
import { Check } from 'lucide-react';

interface ThemeDialogProps {
  children: React.ReactNode;
}

export function ThemeDialog({ children }: ThemeDialogProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleThemeSelect = (themeValue: string) => {
    setTheme(themeValue as any);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Choose your theme</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 py-4">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon;
            const isSelected = theme === themeOption.value;
            return (
              <Button
                key={themeOption.value}
                variant={isSelected ? 'default' : 'outline'}
                className="h-auto py-3 px-4 justify-start"
                onClick={() => handleThemeSelect(themeOption.value)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div
                    className={`flex aspect-square size-8 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{themeOption.name}</p>
                    <p
                      className={`text-xs truncate ${
                        isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {themeOption.description}
                    </p>
                  </div>
                  {isSelected && <Check className="size-4 flex-shrink-0" />}
                </div>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
