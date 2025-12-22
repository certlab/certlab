import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfettiParticle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

interface CelebrationProps {
  show: boolean;
  type?: 'achievement' | 'quest' | 'levelup' | 'reward';
  onComplete?: () => void;
}

/**
 * Celebration component with confetti animation
 * Uses Framer Motion for smooth animations
 */
export function Celebration({ show, type = 'achievement', onComplete }: CelebrationProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(() => {
        onComplete();
      }, 3000); // Duration of celebration
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  // Generate confetti particles
  const generateConfetti = (): ConfettiParticle[] => {
    const colors = getColorsForType(type);
    const particles: ConfettiParticle[] = [];
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 1.5,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
      });
    }

    return particles;
  };

  const getColorsForType = (type: string): string[] => {
    switch (type) {
      case 'achievement':
        return ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#4169E1'];
      case 'quest':
        return ['#00CED1', '#1E90FF', '#32CD32', '#FFD700'];
      case 'levelup':
        return ['#FFD700', '#FFA500', '#FF1493', '#9400D3'];
      case 'reward':
        return ['#32CD32', '#00FA9A', '#7FFF00', '#ADFF2F'];
      default:
        return ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#4169E1'];
    }
  };

  if (!show) return null;

  const confetti = generateConfetti();

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
      aria-hidden="true"
      role="presentation"
    >
      <AnimatePresence>
        {confetti.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              x: `${particle.x}vw`,
              y: '-10vh',
              rotate: 0,
              scale: 0,
              opacity: 1,
            }}
            animate={{
              y: '110vh',
              rotate: particle.rotation * 4,
              scale: particle.scale,
              x: `${particle.x + (Math.random() - 0.5) * 30}vw`,
              opacity: [1, 1, 0.8, 0],
            }}
            transition={{
              duration: 2 + Math.random(),
              delay: particle.delay,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              width: '10px',
              height: '10px',
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </AnimatePresence>

      {/* Sparkles overlay */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2, times: [0, 0.2, 0.8, 1] }}
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 70%)',
          }}
        />
      </AnimatePresence>
    </div>
  );
}

/**
 * Trigger confetti celebration
 * Can be used directly in toast notifications or other components
 */
export function triggerCelebration(
  type: 'achievement' | 'quest' | 'levelup' | 'reward' = 'achievement'
) {
  // Create and mount celebration component temporarily
  const container = document.createElement('div');
  document.body.appendChild(container);

  const celebration = document.createElement('div');
  celebration.id = `celebration-${Date.now()}`;
  container.appendChild(celebration);

  // Use React to render the celebration
  import('react-dom/client').then(({ createRoot }) => {
    const root = createRoot(celebration);
    root.render(
      <Celebration
        show={true}
        type={type}
        onComplete={() => {
          setTimeout(() => {
            root.unmount();
            document.body.removeChild(container);
          }, 100);
        }}
      />
    );
  });
}
