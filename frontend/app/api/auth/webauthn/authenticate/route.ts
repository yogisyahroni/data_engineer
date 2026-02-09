import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { cookies } from 'next/headers';

const rpID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const origin = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

export async function GET(req: NextRequest) {
    // For authentication, we might start with an email (to look up user) or just a general "assert" if using discoverable credentials (resident keys).
    // For MVP, simplified flow: User inputs email on login, then clicks "Sign in with Passkey".
    // Or just "Sign in with Passkey" and use discoverable credentials if supported.
    // Let's support the flow where we know the user email (hybrid) or just rely on the authenticator to provide the user handle.

    // Check if email query param is provided
    const url = new URL(req.url);
    const email = url.searchParams.get('email');

    let user;
    let allowCredentials;

    if (email) {
        user = await db.user.findUnique({
            where: { email },
            include: { authenticators: true },
        });

        if (user && user.authenticators.length > 0) {
            allowCredentials = user.authenticators.map((auth) => ({
                id: auth.credentialID,
                transports: auth.transports ? (auth.transports.split(',') as any[]) : undefined,
            }));
        }
    }

    const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials,
        userVerification: 'preferred',
    });

    const response = NextResponse.json(options);
    response.cookies.set('webauthn_challenge', options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 5,
    });

    return response;
}

export async function POST(req: NextRequest) {
    const challenge = req.cookies.get('webauthn_challenge')?.value;
    if (!challenge) {
        return new NextResponse('Challenge expired', { status: 400 });
    }

    try {
        const body = await req.json();

        // We need the credential ID to find the authenticator in DB
        const credentialID = body.id;
        const authenticator = await db.authenticator.findUnique({
            where: { credentialID },
            include: { user: true },
        });

        if (!authenticator) {
            return new NextResponse('Authenticator not found', { status: 400 });
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        if (verification.verified) {
            const { authenticationInfo } = verification;

            // Update counter
            await db.authenticator.update({
                where: { credentialID },
                data: {
                    counter: BigInt(authenticationInfo.newCounter),
                },
            });

            // Log the user in (Create Session)
            // Ideally we use NextAuth's internal logic, but usually we just return success and client redirects.
            // But NextAuth uses JWT/Session. We need to tell NextAuth we are logged in.
            // Since we are bypassing NextAuth's primary flow, we might need a custom CredentialsProvider that takes a "token" we generate here?
            // OR we use the CredentialsProvider with a special flag.

            // Allow client to sign in using NextAuth `signIn('credentials', { ... })` effectively?
            // Actually, we can return a "token" or "signature" that the client sends to `signIn('credentials', { webauthn: JSON.stringify(body) })`
            // And logic moves there?
            // Or we issue a cookie here? NextAuth manages cookies.

            // Standard approach: Client calls `signIn('webauthn', { ... })`. NextAuth implementation validates it.
            // But integrating WebAuthn with NextAuth CredentialsProvider is complex.
            // Alternative: use `next-auth` session strategy.

            // Implementation Plan Assumption: We handle verification here.
            // Then we return success.
            // BUT how does the user get the Session cookie?
            // We can't easily write the NextAuth session cookie from here unless we know the secret and format (AESJWE).

            // Better path:
            // 1. Client completes WebAuthn dance.
            // 2. Client sends payload to `signIn('credentials', { webauthn_response: ... })`.
            // 3. `authorize()` in `auth-options` calls this verification logic.

            // So THIS endpoint might not be needed for POST?
            // OR this endpoint validates and returns a "one-time login token" that `signIn` accepts.
            // Let's go with the one-time token approach.

            return NextResponse.json({ verified: true, userId: authenticator.userId });
        } else {
            return new NextResponse('Verification failed', { status: 400 });
        }

    } catch (error) {
        console.error(error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
