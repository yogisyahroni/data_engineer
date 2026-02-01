import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEV_USER_ID = 'user_123';

export async function GET() {
    try {
        let user = await db.user.findUnique({
            where: { id: DEV_USER_ID },
        });

        if (!user) {
            console.log('[DevAuth] User not found, seeding user_123...');
            // Auto-seed for dev convenience
            user = await db.user.create({
                data: {
                    id: DEV_USER_ID,
                    email: 'dev@insightengine.ai',
                    name: 'Developer Mode',
                    password: 'dev_password_hash', // Not used for dev auth
                    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
                },
            });
        }

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        console.error('[DevAuth] Error fetching user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
