'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { startRegistration } from '@simplewebauthn/browser';
import { Loader2, Fingerprint, Trash2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Credential {
    id: string;
    type: string;
    transports: string | null;
    backedUp: boolean;
    name: string;
    createdAt?: string;
}

export function PasskeyManager() {
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRegistering, setIsRegistering] = useState(false);

    const fetchCredentials = async () => {
        try {
            const res = await fetch('/api/auth/webauthn/credentials');
            if (res.ok) {
                const data = await res.json();
                setCredentials(data);
            }
        } catch (error) {
            console.error('Failed to fetch credentials', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCredentials();
    }, []);

    const handleRegister = async () => {
        setIsRegistering(true);
        try {
            // 1. Get options
            const resp = await fetch('/api/auth/webauthn/register');
            if (!resp.ok) throw new Error('Failed to get registration options');
            const options = await resp.json();

            // 2. Browser interaction
            const attResp = await startRegistration(options);

            // 3. Verify
            const verificationResp = await fetch('/api/auth/webauthn/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(attResp),
            });

            if (verificationResp.ok) {
                toast.success('Passkey registered successfully!');
                fetchCredentials();
            } else {
                const errData = await verificationResp.text();
                toast.error('Registration failed: ' + errData);
            }
        } catch (error: any) {
            console.error(error);
            if (error.name === 'InvalidStateError') {
                toast.error('This device is already registered.');
            } else {
                toast.error('Failed to register passkey');
            }
        } finally {
            setIsRegistering(false);
        }
    };

    const handleDelete = async (credentialID: string) => {
        if (!confirm('Are you sure you want to remove this passkey?')) return;

        try {
            const res = await fetch('/api/auth/webauthn/credentials', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credentialID }),
            });

            if (res.ok) {
                toast.success('Passkey removed');
                setCredentials(credentials.filter((c) => c.id !== credentialID));
            } else {
                toast.error('Failed to remove passkey');
            }
        } catch (error) {
            toast.error('Error deleting passkey');
        }
    };

    return (
        <Card className="p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full text-blue-600 dark:text-blue-300">
                        <Fingerprint className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">Passkeys & Biometrics</h3>
                        <p className="text-sm text-muted-foreground">Log in securely with FaceID, TouchID, or Windows Hello.</p>
                    </div>
                </div>
                <Button onClick={handleRegister} disabled={isRegistering}>
                    {isRegistering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Passkey
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-4">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-3">
                    {credentials.length === 0 ? (
                        <div className="text-center p-6 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/25">
                            <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
                        </div>
                    ) : (
                        credentials.map((cred) => (
                            <div key={cred.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="bg-muted p-2 rounded">
                                        <Fingerprint className="w-4 h-4 text-foreground" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm">{cred.name || 'Passkey'}</span>
                                            {cred.backedUp && <Badge variant="secondary" className="text-[10px] h-5">Synced</Badge>}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {cred.type === 'Device-Bound' ? 'This Device' : 'Cloud Synced'} • {cred.transports?.split(',').join(', ') || 'Unknown'}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => handleDelete(cred.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </Card>
    );
}
