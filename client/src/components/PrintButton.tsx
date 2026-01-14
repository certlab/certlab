import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

interface PrintButtonProps {
  /**
   * Optional content type for analytics or customization
   */
  content?: 'quiz' | 'results' | 'notes' | 'lecture' | 'materials';
  /**
   * Button variant - defaults to 'outline'
   */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  /**
   * Button size - defaults to 'default'
   */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /**
   * Optional custom class name
   */
  className?: string;
  /**
   * Optional custom label text
   */
  label?: string;
  /**
   * Show icon only (no text)
   */
  iconOnly?: boolean;
  /**
   * Optional callback before print
   */
  onBeforePrint?: () => void;
  /**
   * Optional callback after print
   */
  onAfterPrint?: () => void;
}

/**
 * Reusable Print Button Component
 *
 * Triggers the browser's native print dialog with optimized print styles.
 * Uses CSS @media print rules to hide navigation and optimize layout.
 *
 * @example
 * // Simple usage
 * <PrintButton />
 *
 * @example
 * // With custom label and icon only
 * <PrintButton label="Print Results" iconOnly />
 *
 * @example
 * // With callbacks
 * <PrintButton
 *   onBeforePrint={() => console.log('Printing...')}
 *   onAfterPrint={() => console.log('Print complete')}
 * />
 */
export default function PrintButton({
  content,
  variant = 'outline',
  size = 'default',
  className = '',
  label = 'Print',
  iconOnly = false,
  onBeforePrint,
  onAfterPrint,
}: PrintButtonProps) {
  const handlePrint = () => {
    // Call before print callback if provided
    if (onBeforePrint) {
      onBeforePrint();
    }

    // Trigger browser print dialog
    window.print();

    // Call after print callback if provided
    // Note: This fires immediately after print() is called, not when printing is complete
    if (onAfterPrint) {
      // Use a small delay to ensure print dialog has opened
      setTimeout(() => {
        onAfterPrint();
      }, 100);
    }
  };

  return (
    <Button
      onClick={handlePrint}
      variant={variant}
      size={size}
      className={className}
      data-content={content}
      aria-label={`Print ${content || 'page'}`}
    >
      <Printer className={iconOnly ? 'h-4 w-4' : 'h-4 w-4 mr-2'} />
      {!iconOnly && label}
    </Button>
  );
}
