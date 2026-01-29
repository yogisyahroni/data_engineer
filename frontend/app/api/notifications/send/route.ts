import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import { webpush } from '@/lib/notifications/web-push';

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        // In a real app, you might allow Service-to-Service auth here too via API Key
        // For now, we restrict to logged-in users (e.g., testing from UI) 
        // OR checks for admin role if internal.
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { userId, title, body, icon, url } = await req.json();

        if (!userId || !title || !body) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Get user subscriptions
        const subscriptions = await db.pushSubscription.findMany({
            where: { userId },
        });

        if (subscriptions.length === 0) {
            return NextResponse.json({ message: 'No subscriptions found for user', sent: 0 });
        }

        const payload = JSON.stringify({
            title,
            body,
            icon: icon || '/icon-192x192.png',
            url: url || '/',
        });

        // Send to all subscriptions
        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        {
                            endpoint: sub.endpoint,
                            keys: sub.keys as any, // Cast Json to expected type
                        },
                        payload
                    );
                    return { success: true, endpoint: sub.endpoint };
                } catch (error: any) {
                    if (error.statusCode === 410 || error.statusCode === 404) {
                        // Subscription expired/gone, delete it
                        await db.pushSubscription.delete({
                            where: { id: sub.id },
                        });
                        return { success: false, endpoint: sub.endpoint, error: 'Expired' };
                    }
                    throw error;
                }
            })
        );

        const successCount = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
        const failureCount = results.length - successCount;

        return NextResponse.json({
            success: true,
            sent: successCount,
            failed: failureCount,
        });
    } catch (error) {
        console.error('Failed to send notification', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
