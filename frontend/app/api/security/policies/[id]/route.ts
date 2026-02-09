
import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id) return new NextResponse('ID required', { status: 400 });

        await prisma.rLSPolicy.delete({
            where: { id }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('[RLS_DELETE]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

