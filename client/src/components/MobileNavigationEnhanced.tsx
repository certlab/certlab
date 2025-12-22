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
  ChevronRight,
  X,
  Target,
  BarChart3,
  Building,
  ShoppingCart,
  Timer,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
  description?: string;
  comingSoon?: boolean;
}

interface NavigationSection {
  id: string;
  title: string;
  items: NavigationItem[];
}

export default function MobileNavigationEnhanced() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';

  const navigationSections: NavigationSection[] = [
    {
      id: 'main',
      title: 'Main Navigation',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: <Home className="w-4 h-4" />,
          href: '/',
          description: 'Your learning overview',
        },
        {
          id: 'achievements',
          label: 'Achievements',
          icon: <Trophy className="w-4 h-4" />,
          href: '/app/achievements',
          description: 'Track your progress and badges',
        },
        {
          id: 'analytics',
          label: 'Analytics',
          icon: <BarChart3 className="w-4 h-4" />,
          href: '/app/analytics',
          description: 'Deep insights into learning patterns',
        },
      ],
    },
    {
      id: 'learning',
      title: 'Learning Features',
      items: [
        {
          id: 'study-timer',
          label: 'Study Timer',
          icon: <Timer className="w-4 h-4" />,
          href: '/app/study-timer',
          description: 'Pomodoro timer for focused study sessions',
        },
        {
          id: 'daily-challenges',
          label: 'Daily Challenges',
          icon: <Target className="w-4 h-4" />,
          href: '/app/daily-challenges',
          description: 'Complete quests and earn rewards',
          badge: 'NEW',
        },
        {
          id: 'study-notes',
          label: 'Study Notes',
          icon: <BookOpen className="w-4 h-4" />,
          href: '/app/study-notes',
          description: 'View and export saved study notes',
        },
        {
          id: 'marketplace',
          label: 'Study Materials',
          icon: <ShoppingCart className="w-4 h-4" />,
          href: '/app/marketplace',
          description: 'Browse and purchase study materials',
        },
      ],
    },
    {
      id: 'tools',
      title: 'Tools & Features',
      items: [
        {
          id: 'accessibility',
          label: 'Accessibility',
          icon: <Settings className="w-4 h-4" />,
          href: '/accessibility',
          description: 'Color contrast analysis',
        },
        {
          id: 'ui-structure',
          label: 'UI Structure',
          icon: <BarChart3 className="w-4 h-4" />,
          href: '/ui-structure',
          description: 'Application architecture',
        },
      ],
    },
    // Administration section - only shown to admin users
    ...(isAdmin
      ? [
          {
            id: 'admin',
            title: 'Administration',
            items: [
              {
                id: 'admin-dashboard',
                label: 'Admin Dashboard',
                icon: <Building className="w-4 h-4" />,
                href: '/admin',
                description: 'Manage tenants, users, and content',
              },
            ],
          },
        ]
      : []),
  ];

  const handleItemClick = (href: string, comingSoon?: boolean) => {
    if (comingSoon) return;
    setIsOpen(false);
    // Navigation will be handled by Link component
  };

  const toggleSection = (sectionId: string) => {
    setActiveSection(activeSection === sectionId ? null : sectionId);
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
            <div className="flex items-center justify-between">
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

            {/* User info */}
            {user && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
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

          {/* Navigation sections */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {navigationSections.map((section) => (
                <div key={section.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {section.title}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSection(section.id)}
                      className="h-6 w-6 p-0"
                      aria-label={`${activeSection === section.id ? 'Collapse' : 'Expand'} ${section.title}`}
                      aria-expanded={activeSection === section.id}
                    >
                      <ChevronRight
                        className={`w-3 h-3 transition-transform ${
                          activeSection === section.id ? 'rotate-90' : ''
                        }`}
                      />
                    </Button>
                  </div>

                  {(activeSection === section.id || activeSection === null) && (
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <div key={item.id}>
                          {item.comingSoon ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 opacity-60">
                              <div className="flex-shrink-0 text-muted-foreground">{item.icon}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">{item.label}</span>
                                  {item.badge && (
                                    <Badge variant="secondary" className="text-xs">
                                      {item.badge}
                                    </Badge>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <Link to={item.href}>
                              <div
                                className={`
                                  flex items-center gap-3 p-3 rounded-lg transition-colors
                                  hover:bg-muted/50 active:bg-muted
                                  ${location.pathname === item.href ? 'bg-muted border border-border' : ''}
                                `}
                                onClick={() => handleItemClick(item.href, item.comingSoon)}
                              >
                                <div
                                  className={`
                                  flex-shrink-0 
                                  ${location.pathname === item.href ? 'text-primary' : 'text-muted-foreground'}
                                `}
                                >
                                  {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">{item.label}</span>
                                    {item.badge && (
                                      <Badge variant="outline" className="text-xs">
                                        {item.badge}
                                      </Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {section.id !== navigationSections[navigationSections.length - 1].id && (
                    <Separator className="my-3" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              Cert Lab • Enhanced Mobile Experience
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
