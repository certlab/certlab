import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth-provider';
import TenantSwitcher from '@/components/TenantSwitcher';
import {
  Menu,
  Home,
  BookOpen,
  Trophy,
  Settings,
  X,
  Target,
  BarChart3,
  Building,
  ShoppingCart,
  Timer,
  FileText,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  comingSoon?: boolean;
  dividerAfter?: boolean;
}

export default function MobileNavigationEnhanced() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  // Simplified flat navigation structure with logical groupings
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="w-5 h-5" />,
      href: '/',
    },
    {
      id: 'achievements',
      label: 'Achievements',
      icon: <Trophy className="w-5 h-5" />,
      href: '/app/achievements',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
      href: '/app/analytics',
      dividerAfter: true,
    },
    {
      id: 'daily-challenges',
      label: 'Daily Challenges',
      icon: <Target className="w-5 h-5" />,
      href: '/app/daily-challenges',
      badge: 'NEW',
    },
    {
      id: 'practice-tests',
      label: 'Practice Tests',
      icon: <FileText className="w-5 h-5" />,
      href: '/app/practice-tests',
    },
    {
      id: 'study-timer',
      label: 'Study Timer',
      icon: <Timer className="w-5 h-5" />,
      href: '/app/study-timer',
    },
    {
      id: 'study-notes',
      label: 'Study Notes',
      icon: <BookOpen className="w-5 h-5" />,
      href: '/app/study-notes',
    },
    {
      id: 'marketplace',
      label: 'Study Materials',
      icon: <ShoppingCart className="w-5 h-5" />,
      href: '/app/marketplace',
      dividerAfter: !isAdmin,
    },
    // Admin section - only shown to admin users
    ...(isAdmin
      ? [
          {
            id: 'admin-dashboard',
            label: 'Admin Dashboard',
            icon: <Building className="w-5 h-5" />,
            href: '/admin',
            dividerAfter: true,
          } as NavigationItem,
        ]
      : []),
  ];

  const handleItemClick = (comingSoon?: boolean) => {
    if (comingSoon) return;
    setIsOpen(false);
  };

  if (!isMobile) {
    return null;
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="p-2 h-auto min-h-[44px] min-w-[44px]">
          <Menu className="w-5 h-5" />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-[300px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <SheetTitle className="text-lg font-semibold">Navigation</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0"
                aria-label="Close navigation menu"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* User info - Simplified */}
            {user && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.email?.split('@')[0] || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">Cert Lab Student</p>
                  </div>
                </div>
                {/* Tenant Switcher for Mobile */}
                <TenantSwitcher />
              </div>
            )}
          </SheetHeader>

          {/* Navigation items - Flat structure */}
          <ScrollArea className="flex-1">
            <nav className="p-3" aria-label="Main navigation">
              {navigationItems.map((item) => (
                <div key={item.id}>
                  {item.comingSoon ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 opacity-60 mb-1">
                      <div className="flex-shrink-0 text-muted-foreground">{item.icon}</div>
                      <span className="text-sm font-medium flex-1">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Link to={item.href} onClick={() => handleItemClick(item.comingSoon)}>
                      <div
                        className={`
                          flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-1
                          hover:bg-accent active:bg-accent/80
                          ${location.pathname === item.href ? 'bg-accent text-accent-foreground font-medium' : ''}
                        `}
                      >
                        <div
                          className={`
                            flex-shrink-0 
                            ${location.pathname === item.href ? 'text-primary' : 'text-muted-foreground'}
                          `}
                        >
                          {item.icon}
                        </div>
                        <span className="text-sm flex-1">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="outline"
                            className="text-xs px-2 py-0.5 border-primary/20"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </Link>
                  )}
                  {item.dividerAfter && <Separator className="my-2" />}
                </div>
              ))}
            </nav>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t">
            <p className="text-xs text-center text-muted-foreground">Cert Lab</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
