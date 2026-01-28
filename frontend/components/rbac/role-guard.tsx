'use client';

import { useWorkspace } from '@/contexts/workspace-context';
import { type Permission } from '@/lib/rbac/permissions';
import { ReactNode } from 'react';

interface RoleGuardProps {
    permission: Permission;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Conditionally render children based on user's permission in active workspace
 * 
 * @example
 * ```tsx
 * <RoleGuard permission="connection:create">
 *   <Button>Create Connection</Button>
 * </RoleGuard>
 * ```
 */
export function RoleGuard({ permission, children, fallback = null }: RoleGuardProps) {
    const { hasPermission } = useWorkspace();

    return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Show content only if user LACKS the permission (inverse of RoleGuard)
 */
export function RoleGuardInverse({ permission, children }: Omit<RoleGuardProps, 'fallback'>) {
    const { hasPermission } = useWorkspace();

    return !hasPermission(permission) ? <>{children}</> : null;
}
