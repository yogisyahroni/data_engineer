'use client';

import * as React from 'react';
import { Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

// SSO Provider configurations (TASK-007-008)
const ssoProviders = [
    {
        id: 'google',
        name: 'Google Workspace',
        icon: Chrome,
        bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-950/20',
        textColor: 'text-blue-600 dark:text-blue-400',
        enabled: true, // Enabled for TASK-007-008
    },
    {
        id: 'microsoft',
        name: 'Microsoft 365',
        icon: Chrome,
        bgColor: 'hover:bg-sky-50 dark:hover:bg-sky-950/20',
        textColor: 'text-sky-600 dark:text-sky-400',
        enabled: false, // Not yet implemented
    },
    {
        id: 'okta',
        name: 'Okta',
        icon: Chrome,
        bgColor: 'hover:bg-indigo-50 dark:hover:bg-indigo-950/20',
        textColor: 'text-indigo-600 dark:text-indigo-400',
        enabled: false, // Not yet implemented
    },
] as const;

interface SSOProvidersProps {
    isLoading?: boolean;
}

export function SSOProviders({ isLoading = false }: SSOProvidersProps) {
    const [loadingProvider, setLoadingProvider] = React.useState<string | null>(null);

    const handleSSOLogin = async (providerId: string, providerName: string, enabled: boolean) => {
        if (!enabled) {
            toast.info(`SSO integration with ${providerName} is coming soon`);
            return;
        }

        setLoadingProvider(providerId);

        try {
            // Use NextAuth's signIn for OAuth providers
            await signIn(providerId, {
                callbackUrl: '/dashboards',
                redirect: true,
            });
        } catch (error) {
            console.error(`[SSO] ${providerName} login error:`, error);
            toast.error(`Failed to connect to ${providerName}`);
            setLoadingProvider(null);
        }
    };


    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {ssoProviders.map((provider) => {
                const Icon = provider.icon;
                const isProviderLoading = loadingProvider === provider.id;

                return (
                    <Button
                        key={provider.id}
                        type="button"
                        variant="outline"
                        className={`w-full transition-colors ${provider.bgColor}`}
                        disabled={isProviderLoading || loadingProvider !== null}
                        onClick={() => handleSSOLogin(provider.id, provider.name, provider.enabled)}
                    >
                        <Icon className={`mr-2 h-4 w-4 ${provider.textColor}`} />
                        <span className="flex-1 text-left">
                            Continue with {provider.name}
                        </span>
                        {isProviderLoading && (
                            <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        )}
                    </Button>
                );
            })}

            <p className="text-xs text-center text-muted-foreground mt-3">
                Google Workspace SSO available • Other providers coming soon
            </p>
        </div>
    );
}

