import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const subscription = await req.json();

        // Basic validation
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return new NextResponse('Invalid subscription', { status: 400 });
        }

        // Upsert the subscription
        // We use endpoint as the unique identifier
        await db.pushSubscription.upsert({
            where: {
                endpoint: subscription.endpoint,
            },
            create: {
                endpoint: subscription.endpoint,
                keys: subscription.keys,
                userId: session.user.id,
            },
            update: {
                keys: subscription.keys,
                userId: session.user.id, // Update user ownership if it changes
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save subscription', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
