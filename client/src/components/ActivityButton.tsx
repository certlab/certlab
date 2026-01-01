import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';

interface ActivityButtonProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  isDefault?: boolean;
}

export function ActivityButton({
  label,
  isSelected,
  onClick,
  disabled,
  onEdit,
  onDelete,
  isDefault = false,
}: ActivityButtonProps) {
  const showActions = !isDefault && (onEdit || onDelete);

  return (
    <div className="relative inline-flex">
      <Button
        variant={isSelected ? 'default' : 'outline'}
        onClick={onClick}
        disabled={disabled}
        aria-pressed={isSelected}
        className="px-6 py-6 text-base font-normal"
      >
        {label}
      </Button>
      {showActions && !disabled && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
              <span className="sr-only">Activity options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
