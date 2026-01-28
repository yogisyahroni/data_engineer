
import { NextRequest } from 'next/server';

export interface SecurityContext {
    userId: string;
    tenantId: string;
    segment?: string;
    role: 'admin' | 'editor' | 'viewer';
}

/**
 * Extracts security context from the request.
 * In a real app, this verifies a JWT or Session Cookie.
 * For this prototype, it trusts headers or falls back to 'demo' user.
 */
export function getSecurityContext(req: NextRequest): SecurityContext {
    // 1. Try to get from headers (e.g. passed by API Gateway or for testing)
    const userId = req.headers.get('x-user-id');
    const tenantId = req.headers.get('x-tenant-id');
    const segment = req.headers.get('x-segment');
    const role = req.headers.get('x-role') as SecurityContext['role'];

    if (userId && tenantId) {
        return {
            userId,
            tenantId,
            segment: segment || undefined,
            role: role || 'viewer'
        };
    }

    // 2. Fallback to Demo User (for prototype simplicity)
    return {
        userId: 'user_demo_123',
        tenantId: 'tenant_demo',
        segment: 'Consumer', // Default segment for RLS demo
        role: 'admin'
    };
}
