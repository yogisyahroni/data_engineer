'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface InviteMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    onMemberInvited?: () => void;
}

export function InviteMemberDialog({
    open,
    onOpenChange,
    workspaceId,
    onMemberInvited,
}: InviteMemberDialogProps) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'VIEWER' | 'EDITOR' | 'ADMIN'>('VIEWER');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleInvite = async () => {
        if (!email.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Email is required',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            // First, find user by email (in real app, this would be a separate endpoint)
            // For now, we'll just use a mock userId
            const userId = 'temp-user-id'; // TODO: Implement user search

            const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to invite member');
            }

            toast({
                title: 'Success',
                description: 'Member invited successfully',
            });

            setEmail('');
            setRole('VIEWER');
            onMemberInvited?.();
            onOpenChange(false);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                        Invite a user to this workspace by email. They will be notified.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="member-email">Email Address</Label>
                        <Input
                            id="member-email"
                            type="email"
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="member-role">Role</Label>
                        <Select
                            value={role}
                            onValueChange={(value: any) => setRole(value)}
                        >
                            <SelectTrigger id="member-role">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="VIEWER">
                                    <div>
                                        <div className="font-medium">Viewer</div>
                                        <div className="text-xs text-muted-foreground">
                                            Read-only access
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="EDITOR">
                                    <div>
                                        <div className="font-medium">Editor</div>
                                        <div className="text-xs text-muted-foreground">
                                            Can create and edit content
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="ADMIN">
                                    <div>
                                        <div className="font-medium">Admin</div>
                                        <div className="text-xs text-muted-foreground">
                                            Full management access
                                        </div>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={loading}>
                        {loading ? 'Inviting...' : 'Send Invite'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
