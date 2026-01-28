'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Fragment } from 'react';

export function MainBreadcrumbs() {
    const pathname = usePathname();

    // Skip breadcrumbs on dashboard home or specific pages if needed
    if (pathname === '/') return null;

    const segments = pathname.split('/').filter(Boolean);

    const getBreadcrumbName = (segment: string) => {
        // Handle dynamic IDs or specific route names
        if (segment.length > 20 && segment.includes('-')) return 'Item'; // ID-like
        if (segment === 'dashboards') return 'Dashboards';
        if (segment === 'explorer') return 'Explorer';
        if (segment === 'collections') return 'Collections';
        if (segment === 'settings') return 'Settings';
        if (segment === 'onboarding') return 'Setup';
        // Capitalize first letter
        return segment.charAt(0).toUpperCase() + segment.slice(1);
    };

    return (
        <nav className="flex items-center text-sm text-muted-foreground mb-4">
            <Link
                href="/"
                className="flex items-center hover:text-foreground transition-colors"
            >
                <Home className="h-4 w-4" />
            </Link>

            {segments.map((segment, index) => {
                const href = `/${segments.slice(0, index + 1).join('/')}`;
                const isLast = index === segments.length - 1;
                const name = getBreadcrumbName(segment);

                return (
                    <Fragment key={href}>
                        <ChevronRight className="h-4 w-4 mx-1" />
                        {isLast ? (
                            <span className="font-medium text-foreground">{name}</span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-foreground transition-colors"
                            >
                                {name}
                            </Link>
                        )}
                    </Fragment>
                );
            })}
        </nav>
    );
}
