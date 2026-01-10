# DraggableList Component

A fully accessible, reusable drag-and-drop list component for reordering items with mouse, touch, and keyboard support.

## Features

- ✅ **Mouse & Touch Support**: Drag items with mouse or touch gestures
- ✅ **Keyboard Support**: Full keyboard navigation (arrow keys, space, enter, escape)
- ✅ **Visual Feedback**: Drag handles, overlay, and smooth animations
- ✅ **Undo Functionality**: Toast notifications with undo button
- ✅ **Accessibility**: ARIA labels, screen reader support, focus management
- ✅ **Mobile-Friendly**: Touch events for mobile devices
- ✅ **Customizable**: Flexible rendering and styling options

## Basic Usage

```tsx
import { DraggableList } from '@/components/DraggableList';

function MyComponent() {
  const [items, setItems] = useState([
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ]);

  return (
    <DraggableList
      items={items}
      onReorder={setItems}
      renderItem={(item, index) => (
        <div className="p-4 border rounded">
          <h3>#{index + 1}: {item.name}</h3>
        </div>
      )}
    />
  );
}
```

## Keyboard Controls

When an item is focused:

- **Arrow Up/Down**: Navigate between items
- **Space/Enter**: Pick up or drop the selected item  
- **Escape**: Cancel the current drag operation
- **Tab**: Move focus between items

## Accessibility

The component includes several accessibility features:

1. **ARIA Labels**: Each drag handle has `aria-label="Drag to reorder"`
2. **List Role**: Container has `role="list"` with descriptive aria-label
3. **Keyboard Navigation**: Full support for keyboard-only users
4. **Focus Management**: Maintains focus during drag operations
5. **Screen Reader Friendly**: Announces drag state changes

## Example: Quiz Builder Integration

See `client/src/pages/quiz-builder.tsx` for a complete implementation example.

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Android)
- ✅ Touch devices (tablets, phones)
