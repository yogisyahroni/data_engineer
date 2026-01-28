'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
    label: string;
    href?: string;
    active?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
    return (
        <nav className={cn("flex flex-wrap items-center text-sm text-muted-foreground", className)}>
            <ol className="flex items-center space-x-2">
                <li>
                    <Link
                        href="/"
                        className="flex items-center hover:text-foreground transition-colors"
                    >
                        <Home className="w-4 h-4" />
                    </Link>
                </li>

                {items.map((item, index) => (
                    <li key={index} className="flex items-center space-x-2">
                        <ChevronRight className="w-4 h-4 shrink-0 opacity-50" />

                        {item.href && !item.active ? (
                            <Link
                                href={item.href}
                                className="hover:text-foreground transition-colors max-w-[150px] truncate"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className={cn(
                                "font-medium max-w-[200px] truncate",
                                item.active ? "text-foreground" : ""
                            )}>
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
