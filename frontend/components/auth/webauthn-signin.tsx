'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { startAuthentication } from '@simplewebauthn/browser';
import { Fingerprint, Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function WebAuthnSignin() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSignin = async () => {
        setIsLoading(true);
        try {
            // 1. Get options
            const resp = await fetch('/api/auth/webauthn/authenticate');
            if (!resp.ok) throw new Error('Failed to get authentication options');
            const options = await resp.json();

            // 2. Start Authentication
            const asseResp = await startAuthentication(options);

            // 3. Verify on server and get token
            const verifyResp = await fetch('/api/auth/webauthn/authenticate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(asseResp),
            });

            if (!verifyResp.ok) {
                const err = await verifyResp.text();
                throw new Error(err);
            }

            const { verified, token } = await verifyResp.json();

            if (verified && token) {
                // 4. Sign in with NextAuth using the token
                const result = await signIn('credentials', {
                    webauthn_token: token,
                    redirect: false,
                });

                if (result?.error) {
                    toast.error('Login failed: ' + result.error);
                } else {
                    toast.success('Logged in successfully!');
                    router.push('/dashboards'); // Redirect to dashboard
                    router.refresh();
                }
            } else {
                toast.error('Verification failed');
            }

        } catch (error: any) {
            console.error(error);
            if (error.name === 'NotAllowedError') {
                // User cancelled
            } else {
                toast.error('Passkey login failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleSignin}
            disabled={isLoading}
        >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-5 h-5 text-blue-600" />}
            Sign in with Passkey
        </Button>
    );
}
