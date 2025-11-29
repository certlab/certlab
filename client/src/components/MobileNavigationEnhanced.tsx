import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth-provider';
import TenantSwitcher from '@/components/TenantSwitcher';
import {
  Menu,
  Search,
  Home,
  BookOpen,
  Trophy,
  Settings,
  ChevronRight,
  X,
  Zap,
  Target,
  BarChart3,
  Crown,
  Star,
  Sparkles,
  Building,
  ShoppingCart,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

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
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
      ],
    },
    {
      id: 'learning',
      title: 'Learning Features',
      items: [
        {
          id: 'study-notes',
          label: 'Study Notes',
          icon: <BookOpen className="w-4 h-4" />,
          href: '/app/study-notes',
          description: 'View and export saved study notes',
        },
        {
          id: 'challenges',
          label: 'Daily Challenges',
          icon: <Zap className="w-4 h-4" />,
          href: '/challenges',
          badge: 'Soon',
          description: 'Quick practice sessions',
          comingSoon: true,
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

  // Filter items based on search query
  const filteredSections = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((section) => section.items.length > 0);

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

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Search navigation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
                aria-label="Search navigation"
              />
            </div>
          </div>

          {/* Navigation sections */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {filteredSections.map((section) => (
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
                            <Link href={item.href}>
                              <div
                                className={`
                                  flex items-center gap-3 p-3 rounded-lg transition-colors
                                  hover:bg-muted/50 active:bg-muted
                                  ${location === item.href ? 'bg-muted border border-border' : ''}
                                `}
                                onClick={() => handleItemClick(item.href, item.comingSoon)}
                              >
                                <div
                                  className={`
                                  flex-shrink-0 
                                  ${location === item.href ? 'text-primary' : 'text-muted-foreground'}
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

                  {section.id !== filteredSections[filteredSections.length - 1].id && (
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
