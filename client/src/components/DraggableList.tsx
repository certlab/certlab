import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface DraggableItem {
  id: string | number;
  [key: string]: any;
}

interface DraggableListProps<T extends DraggableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  renderDragOverlay?: (item: T) => React.ReactNode;
  disabled?: boolean;
  className?: string;
  itemClassName?: string;
  allowUndo?: boolean;
}

interface SortableItemProps {
  id: string | number;
  children: React.ReactNode;
  disabled?: boolean;
  itemClassName?: string;
}

function SortableItem({ id, children, disabled, itemClassName }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${itemClassName || ''}`}
      {...attributes}
    >
      {!disabled && (
        <button
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded touch-none"
          aria-label="Drag to reorder"
          type="button"
        >
          <GripVertical className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </button>
      )}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function DraggableList<T extends DraggableItem>({
  items,
  onReorder,
  renderItem,
  renderDragOverlay,
  disabled = false,
  className = '',
  itemClassName = '',
  allowUndo = true,
}: DraggableListProps<T>) {
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [previousOrder, setPreviousOrder] = useState<T[]>([]);
  const { toast } = useToast();

  // Configure sensors for mouse, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Save previous order for undo
        if (allowUndo) {
          setPreviousOrder([...items]);
        }

        const newItems = arrayMove(items, oldIndex, newIndex);
        onReorder(newItems);

        // Show undo toast if enabled
        if (allowUndo) {
          toast({
            title: 'Item reordered',
            description: 'The item has been moved to a new position.',
            action: (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onReorder(previousOrder);
                  toast({
                    title: 'Undo successful',
                    description: 'Order has been restored.',
                  });
                }}
              >
                Undo
              </Button>
            ),
          });
        }
      }
    },
    [items, onReorder, allowUndo, previousOrder, toast]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
        disabled={disabled}
      >
        <div
          className={className}
          role="list"
          aria-label="Reorderable list. Use arrow keys to navigate and space to pick up or drop items."
        >
          {items.map((item, index) => (
            <SortableItem
              key={item.id}
              id={item.id}
              disabled={disabled}
              itemClassName={itemClassName}
            >
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeItem && (
          <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-2 opacity-90">
            {renderDragOverlay ? renderDragOverlay(activeItem) : renderItem(activeItem, -1)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
