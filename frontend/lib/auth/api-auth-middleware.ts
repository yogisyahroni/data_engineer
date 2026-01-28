import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import crypto from 'crypto';

export type AuthContext = {
    userId: string;
    authType: 'SESSION' | 'API_KEY';
    scopes?: string[];
};

/**
 * Validates authentication via either NextAuth Session or Bearer API Key.
 * Returns AuthContext if valid, null if unauthorized.
 */
export async function authenticateApiRequest(req: NextRequest): Promise<AuthContext | null> {
    // 1. Check for API Key in Authorization Header
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer sk_')) {
        const rawKey = authHeader.replace('Bearer ', '');

        // Hash the key to match DB storage
        const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

        // Lookup Key
        const apiKey = await db.apiKey.findUnique({
            where: { key: hashedKey },
            select: { id: true, userId: true, isActive: true, expiresAt: true, scopes: true }
        });

        if (apiKey && apiKey.isActive) {
            // Check Expiration
            if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
                return null; // Expired
            }

            // Async update lastUsedAt (fire and forget)
            db.apiKey.update({
                where: { id: apiKey.id },
                data: { lastUsedAt: new Date() }
            }).catch(err => console.error('Failed to update API key stats', err));

            return {
                userId: apiKey.userId,
                authType: 'API_KEY',
                scopes: apiKey.scopes
            };
        }
    }

    // 2. Fallback to Session Cookie
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
        return {
            userId: session.user.id,
            authType: 'SESSION',
            scopes: ['*'] // Sessions imply full user access
        };
    }

    return null;
}

/**
 * Helper to generate a new API Key
 * Returns { rawKey, hashedKey, prefix }
 */
export function generateApiKey() {
    const prefix = 'sk_live_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const rawKey = `${prefix}${randomBytes}`;
    const hashedKey = crypto.createHash('sha256').update(rawKey).digest('hex');

    return {
        rawKey,     // Show to user ONCE
        hashedKey,  // Store in DB
        prefix: `${prefix}${randomBytes.substring(0, 4)}...${randomBytes.substring(randomBytes.length - 4)}`
    };
}
