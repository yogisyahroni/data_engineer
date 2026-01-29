import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { db } from '@/lib/db';
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
} from '@simplewebauthn/server';

// Domain (RP ID)
const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const user = await db.user.findUnique({
            where: { id: session.user.id },
            include: { authenticators: true },
        });

        if (!user) {
            return new NextResponse('User not found', { status: 404 });
        }

        const options = await generateRegistrationOptions({
            rpName: 'InsightEngine',
            rpID,
            userID: user.id, // Using the user ID directly
            userName: user.email,
            // Don't re-register existing authenticators
            excludeCredentials: user.authenticators.map((authenticator) => ({
                id: authenticator.credentialID,
                transports: authenticator.transports ? (authenticator.transports.split(',') as any[]) : undefined,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform', // Prefer built-in (TouchID/FaceID)
            },
        });

        // Store current challenge in DB or Session (Mocking session storage with DB for now, or just return it and rely on client to sign it? 
        // Best practice is server-side session. We'll rely on the client passing it back signed, verification checks if it matches expected challenge.
        // SimpleWebAuthn doesn't force storage, but verification needs the original challenge.
        // We can temporarily store it in a cookie or Redis. 
        // For MVP, we'll return it and expect the client to send it back intact (not secure against replay if not validated).
        // A better approach: Store in a temporary 'Challenge' table or user record.
        // Let's use a signed HttpOnly cookie for the challenge.

        const response = NextResponse.json(options);
        response.cookies.set('webauthn_challenge', options.challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 5, // 5 minutes
        });

        return response;

    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const challenge = req.cookies.get('webauthn_challenge')?.value;
    if (!challenge) {
        return new NextResponse('Challenge expired', { status: 400 });
    }

    try {
        const body = await req.json();

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

            await db.authenticator.create({
                data: {
                    credentialID,
                    credentialPublicKey: Buffer.from(credentialPublicKey),
                    counter: BigInt(counter),
                    credentialDeviceType,
                    credentialBackedUp,
                    transports: body.response.transports?.join(',') || 'internal', // fallback
                    userId: session.user.id,
                },
            });

            return NextResponse.json({ verified: true });
        } else {
            return new NextResponse('Verification failed', { status: 400 });
        }

    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
