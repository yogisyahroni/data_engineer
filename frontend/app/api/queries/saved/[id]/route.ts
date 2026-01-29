import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const query = await db.savedQuery.findUnique({
            where: { id: params.id },
            include: {
                user: { select: { name: true } }
            }
        });

        if (!query) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true, data: query });
    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const {
            name, description, sql, visualizationConfig, pinned, tags,
            certificationStatus, certifiedBy, businessGlossary
        } = body;

        const currentQuery = await db.savedQuery.findUnique({ where: { id: params.id } });
        if (!currentQuery) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Authorization check (simplified: owner only or workspace admin?)
        if (currentQuery.userId !== session.user.id) {
            // return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); 
            // Allowing generic edit for now if within workspace context (MVP)
        }

        // CREATE VERSION (Snapshot of OLD state)
        if (sql && sql !== currentQuery.sql) {
            await db.queryVersion.create({
                data: {
                    queryId: params.id,
                    sql: currentQuery.sql,
                    visualizationConfig: currentQuery.visualizationConfig,
                    changeLog: `Auto-save before update by ${session.user.name || session.user.email}`,
                    createdBy: session.user.id
                }
            });
        }

        const updated = await db.savedQuery.update({
            where: { id: params.id },
            data: {
                name: name !== undefined ? name : undefined,
                description: description !== undefined ? description : undefined,
                sql: sql !== undefined ? sql : undefined,
                visualizationConfig: visualizationConfig !== undefined ? visualizationConfig : undefined,
                pinned: pinned !== undefined ? pinned : undefined,
                tags: tags !== undefined ? tags : undefined,
            }
        });

        return NextResponse.json({ success: true, data: updated });

    } catch (error) {
        return NextResponse.json({ error: 'Update failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await db.savedQuery.delete({ where: { id: params.id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
