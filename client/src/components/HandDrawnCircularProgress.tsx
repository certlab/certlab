import { useEffect, useRef } from 'react';

interface HandDrawnCircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  children?: React.ReactNode;
}

export function HandDrawnCircularProgress({
  value,
  size = 280,
  strokeWidth = 8,
  className = '',
  children,
}: HandDrawnCircularProgressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - strokeWidth * 2) / 2;

    // Simple seeded pseudo-random number generator
    const seededRandom = (seed: number): number => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // Helper function to draw hand-drawn circle segments with seeded randomness
    const drawHandDrawnCircle = (startAngle: number, endAngle: number, seed: number) => {
      const segments = 100;
      const angleStep = (endAngle - startAngle) / segments;

      ctx.beginPath();

      for (let i = 0; i <= segments; i++) {
        const angle = startAngle + i * angleStep;
        // Use seeded pseudo-random for consistent jitter
        const seedValue = seed * 1000 + i * 13.37;
        const jitterAmount = 1.5;
        const jitterX = (seededRandom(seedValue) - 0.5) * jitterAmount;
        const jitterY = (seededRandom(seedValue + 0.5) - 0.5) * jitterAmount;

        const x = centerX + (radius + jitterX) * Math.cos(angle);
        const y = centerY + (radius + jitterY) * Math.sin(angle);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    };

    // Draw hand-drawn style circle background
    ctx.strokeStyle = 'rgba(128, 128, 128, 0.2)';
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';

    // Draw background with hand-drawn effect (seed: 0)
    drawHandDrawnCircle(0, Math.PI * 2, 0);

    // Draw progress arc with hand-drawn effect (seed: 1)
    if (value > 0) {
      ctx.strokeStyle = 'currentColor';
      const progressAngle = (value / 100) * Math.PI * 2;
      drawHandDrawnCircle(-Math.PI / 2, -Math.PI / 2 + progressAngle, 1);
    }
  }, [value, size, strokeWidth]);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          color: 'currentColor',
        }}
      />
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
