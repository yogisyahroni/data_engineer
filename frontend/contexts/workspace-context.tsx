'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { hasPermission, type Permission, type Role } from '@/lib/rbac/permissions';

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
    role: Role;
}

interface WorkspaceContextType {
    workspace: Workspace | null;
    setWorkspace: (workspace: Workspace | null) => void;
    hasPermission: (permission: Permission) => boolean;
    isLoading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const [workspace, setWorkspaceState] = useState<Workspace | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem('activeWorkspace');
            if (saved) {
                setWorkspaceState(JSON.parse(saved));
            }
        } catch (error) {
            console.error('[WorkspaceContext] Failed to load workspace from localStorage:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Persist to localStorage when workspace changes
    const setWorkspace = (newWorkspace: Workspace | null) => {
        setWorkspaceState(newWorkspace);

        try {
            if (newWorkspace) {
                localStorage.setItem('activeWorkspace', JSON.stringify(newWorkspace));
            } else {
                localStorage.removeItem('activeWorkspace');
            }
        } catch (error) {
            console.error('[WorkspaceContext] Failed to save workspace to localStorage:', error);
        }
    };

    // Check if current user has a specific permission
    const checkPermission = (permission: Permission): boolean => {
        if (!workspace) return false;
        return hasPermission(workspace.role, permission);
    };

    return (
        <WorkspaceContext.Provider
            value={{
                workspace,
                setWorkspace,
                hasPermission: checkPermission,
                isLoading
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within WorkspaceProvider');
    }
    return context;
}
