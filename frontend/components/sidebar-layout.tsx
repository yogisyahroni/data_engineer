'use client';

import React from 'react';
import { MainSidebar } from './main-sidebar';
import { useSidebar } from '@/contexts/sidebar-context';

interface SidebarLayoutProps {
    children: React.ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
    const { isOpen, close } = useSidebar();

    return (
        <div className="flex h-screen bg-background overflow-hidden w-full">
            <MainSidebar isOpen={isOpen} onClose={close} />
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
