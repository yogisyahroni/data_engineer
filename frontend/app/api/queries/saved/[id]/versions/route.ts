import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const versions = await db.queryVersion.findMany({
            where: { queryId: params.id },
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { name: true } }
            }
        });

        return NextResponse.json({ success: true, versions });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
    }
}

// Revert Action
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { versionId } = body;

        const version = await db.queryVersion.findUnique({ where: { id: versionId } });
        if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

        await db.savedQuery.update({
            where: { id: params.id },
            data: {
                sql: version.sql,
                visualizationConfig: version.visualizationConfig || undefined,
            }
        });

        await db.queryVersion.create({
            data: {
                queryId: params.id,
                sql: version.sql,
                visualizationConfig: version.visualizationConfig,
                changeLog: `Reverted to version from ${version.createdAt.toISOString()}`,
                createdBy: session.user.id
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to revert' }, { status: 500 });
    }
}
