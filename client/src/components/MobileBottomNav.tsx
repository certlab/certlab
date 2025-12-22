/**
 * Mobile Bottom Navigation Component
 *
 * Provides a fixed bottom navigation bar for mobile devices with
 * primary navigation items. Follows mobile UX best practices with
 * large touch targets and clear visual feedback.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { TOUCH_TARGET, TOUCH_STATES, MOBILE_Z_INDEX } from '@/lib/mobile-layout';
import { Home, BookOpen, Trophy, User, ShoppingBag } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  matchPaths?: string[]; // Additional paths that should highlight this item
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/app',
    matchPaths: ['/app/dashboard'],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingBag,
    path: '/app/marketplace',
  },
  {
    id: 'study',
    label: 'Study',
    icon: BookOpen,
    path: '/app/study-notes',
  },
  {
    id: 'achievements',
    label: 'Achievements',
    icon: Trophy,
    path: '/app/achievements',
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    path: '/app/profile',
  },
];

export default function MobileBottomNav() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  // Don't render on desktop or on landing/login pages
  if (!isMobile || location.pathname === '/' || location.pathname === '/login') {
    return null;
  }

  const isActive = (item: NavItem) => {
    if (location.pathname === item.path) return true;
    if (item.matchPaths?.some((path) => location.pathname === path)) return true;
    // Match nested paths (e.g., /app/quiz/1 should highlight dashboard)
    if (item.id === 'dashboard' && location.pathname.startsWith('/app/')) {
      return !navItems.slice(1).some((navItem) => location.pathname.startsWith(navItem.path));
    }
    return false;
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden under fixed nav */}
      <div className="h-20" aria-hidden="true" />

      {/* Fixed Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg"
        role="navigation"
        aria-label="Mobile bottom navigation"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center',
                  'min-w-[60px] min-h-[48px] px-2 py-1',
                  'rounded-lg transition-all duration-200',
                  'touch-manipulation select-none',
                  active
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground active:bg-accent/50'
                )}
                aria-label={item.label}
                aria-current={active ? 'page' : undefined}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 mb-0.5 transition-all duration-200',
                    active && 'scale-110'
                  )}
                />
                <span className={cn('text-xs font-medium', active && 'font-semibold')}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
