import { Button } from '@/components/ui/button';

interface ActivityButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ActivityButton({ label, isSelected, onClick, disabled }: ActivityButtonProps) {
  return (
    <Button
      variant={isSelected ? 'default' : 'outline'}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isSelected}
      className="px-6 py-6 text-base font-normal"
    >
      {label}
    </Button>
  );
}
