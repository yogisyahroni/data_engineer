import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { generateApiKey } from '@/lib/auth/api-auth-middleware';

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const keys = await db.apiKey.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                prefix: true,
                createdAt: true,
                lastUsedAt: true,
                expiresAt: true,
                scopes: true,
            }
        });

        return NextResponse.json({ success: true, keys });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, scopes, expiresInDays } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const { rawKey, hashedKey, prefix } = generateApiKey();

        let expiresAt: Date | undefined;
        if (expiresInDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
        }

        const apiKey = await db.apiKey.create({
            data: {
                name,
                prefix,
                key: hashedKey, // Store only the hash
                userId: session.user.id,
                scopes: scopes || ['read', 'write'],
                expiresAt,
            }
        });

        // RETURN RAW KEY ONE TIME ONLY
        return NextResponse.json({
            success: true,
            apiKey: {
                ...apiKey,
                plainTextKey: rawKey
            }
        });

    } catch (error) {
        return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }
}
