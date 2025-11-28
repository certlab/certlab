import { useLocation } from 'wouter';
import { Home, ChevronRight } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItemData {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export default function BreadcrumbNavigation({ className }: { className?: string }) {
  const [location, setLocation] = useLocation();

  const getBreadcrumbs = (): BreadcrumbItemData[] => {
    const pathSegments = location.split('/').filter(Boolean);

    // Always start with home
    const breadcrumbs: BreadcrumbItemData[] = [
      { label: 'Dashboard', href: '/app/dashboard', icon: <Home className="w-4 h-4" /> },
    ];

    // Comprehensive path mapping for all pages
    const pathMapping: Record<string, string> = {
      app: '',
      dashboard: 'Dashboard',
      quiz: 'Quiz Session',
      achievements: 'Achievements',
      review: 'Review Sessions',
      results: 'Results',
      'practice-tests': 'Practice Tests',
      challenges: 'Challenges',
      accessibility: 'Accessibility',
      admin: 'Admin Panel',
      'ui-structure': 'UI Structure',
      profile: 'Profile',
      lecture: 'Study Guide',
      'study-notes': 'Study Notes',
      credits: 'Credits',
      // Login page
      login: 'Login',
    };

    let currentPath = '';

    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      // Handle dynamic segments (IDs, etc.)
      const isNumeric = /^\d+$/.test(segment);
      const isDynamicId = /^[a-f0-9-]+$/i.test(segment) && segment.includes('-');

      let label = pathMapping[segment];

      // If no mapping found and it's not a dynamic segment, create a label
      if (!label && !isNumeric && !isDynamicId && segment !== 'app') {
        label = segment
          .split('-')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      // Skip empty labels, app segment, duplicate dashboard, and dynamic IDs
      if (label && label !== 'Dashboard' && segment !== 'app' && !isNumeric && !isDynamicId) {
        breadcrumbs.push({
          label,
          href: index < pathSegments.length - 1 ? currentPath : undefined,
        });
      }

      // Special handling for dynamic routes
      if (isNumeric || isDynamicId) {
        const previousSegment = pathSegments[index - 1];
        if (previousSegment === 'quiz') {
          breadcrumbs[breadcrumbs.length - 1].label = 'Quiz Session';
        } else if (previousSegment === 'lecture') {
          breadcrumbs[breadcrumbs.length - 1].label = 'Study Guide';
        } else if (previousSegment === 'results') {
          breadcrumbs[breadcrumbs.length - 1].label = 'Quiz Results';
        }
      }
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  // Don't show breadcrumbs on the dashboard home page
  if (location === '/app' || location === '/app/dashboard') {
    return null;
  }

  return (
    <div
      className={cn(
        'bg-gray-100 dark:bg-gray-800/50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mb-4',
        'transition-all duration-200 hover:shadow-md hover:bg-gray-200 dark:hover:bg-gray-800/60',
        className
      )}
    >
      <Breadcrumb>
        <BreadcrumbList className="flex-wrap">
          {breadcrumbs.flatMap((crumb, index) => {
            const items = [];

            // Add the breadcrumb item
            items.push(
              <BreadcrumbItem
                key={`${crumb.label}-${index}`}
                data-testid={index === 0 ? 'breadcrumb-home' : `breadcrumb-item-${index}`}
              >
                {crumb.href ? (
                  <BreadcrumbLink asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(crumb.href!)}
                      className={cn(
                        'h-auto py-1.5 px-2.5',
                        'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100',
                        'transition-all duration-200',
                        'hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                      )}
                      data-testid={index === 0 ? 'breadcrumb-home-link' : undefined}
                    >
                      <span className="flex items-center gap-1.5">
                        {index === 0 && crumb.icon}
                        <span>{crumb.label}</span>
                      </span>
                    </Button>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100 px-2.5 py-1.5">
                    {index === 0 && crumb.icon}
                    <span>{crumb.label}</span>
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            );

            // Add separator if not the last item
            if (index < breadcrumbs.length - 1) {
              items.push(
                <BreadcrumbSeparator
                  key={`separator-${index}`}
                  className="[&>svg]:w-4 [&>svg]:h-4 text-gray-400 dark:text-gray-600"
                >
                  <ChevronRight />
                </BreadcrumbSeparator>
              );
            }

            return items;
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
