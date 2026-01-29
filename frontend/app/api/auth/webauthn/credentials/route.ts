import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const authenticators = await db.authenticator.findMany({
            where: { userId: session.user.id },
            select: {
                credentialID: true,
                credentialDeviceType: true,
                credentialBackedUp: true,
                transports: true,
                // Do not return public key or counter
            }
        });

        // Map to a friendlier format
        const friendlyAuths = authenticators.map(auth => ({
            id: auth.credentialID,
            type: auth.credentialDeviceType === 'singleDevice' ? 'Device-Bound' : 'Synced (Passkey)',
            backedUp: auth.credentialBackedUp,
            transports: auth.transports,
            name: 'Passkey', // We didn't store a nickname, maybe add later or use "Passkey created on..."
            createdAt: new Date(), // We didn't store created at on authenticator, maybe just use dummy or add column. 
            // Phase 26.2 limitation: Schema didn't have createdAt on Authenticator.
        }));

        return NextResponse.json(friendlyAuths);
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { credentialID } = await req.json();

        // Verify ownership
        const auth = await db.authenticator.findUnique({
            where: { credentialID },
        });

        if (!auth || auth.userId !== session.user.id) {
            return new NextResponse('Not found or unauthorized', { status: 404 });
        }

        await db.authenticator.delete({
            where: { credentialID },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
