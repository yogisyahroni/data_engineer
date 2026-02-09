'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Chrome } from 'lucide-react';
import { useState } from 'react';

/**
 * GoogleSignInButton Component (TASK-008)
 * 
 * Provides "Sign in with Google" button for OAuth2 authentication
 * Uses NextAuth's signIn method with Google provider
 * 
 * @component
 */
export function GoogleSignInButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await signIn('google', {
                callbackUrl: '/dashboards',
                redirect: true,
            });
        } catch (error) {
            console.error('[Google SSO] Sign-in error:', error);
            setIsLoading(false);
        }
    };

    return (
        <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
        >
            <Chrome className="mr-2 h-4 w-4" />
            {isLoading ? 'Connecting to Google...' : 'Continue with Google'}
        </Button>
    );
}
