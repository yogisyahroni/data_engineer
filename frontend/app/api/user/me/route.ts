import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const DEV_USER_ID = 'user_123';

export async function GET() {
    try {
        // Check by Email first to avoid P2002 (Unique constraint)
        const existingByEmail = await db.user.findUnique({
            where: { email: 'dev@insightengine.ai' }
        });

        let user = existingByEmail;

        if (!user) {
            const existingById = await db.user.findUnique({
                where: { id: DEV_USER_ID }
            });
            user = existingById;
        }

        if (!user) {
            console.log('[DevAuth] User not found, seeding user_123...');
            // Auto-seed for dev convenience
            user = await db.user.create({
                data: {
                    id: DEV_USER_ID,
                    email: 'dev@insightengine.ai',
                    name: 'Developer Mode',
                    password: 'dev_password_hash', // Not used for dev auth
                    // avatar field removed
                },
            });
        }

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        console.error('[DevAuth] Error fetching user:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
