'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import { InviteMemberDialog } from './invite-member-dialog';
import { useToast } from '@/hooks/use-toast';

interface Member {
    id: string;
    user: {
        id: string;
        name: string;
        email: string;
    };
    role: 'VIEWER' | 'EDITOR' | 'ADMIN' | 'OWNER';
    invitedAt: string;
}

interface WorkspaceMembersProps {
    workspaceId: string;
    isOwner?: boolean;
    isAdmin?: boolean;
}

const ROLE_COLORS = {
    OWNER: 'bg-purple-500',
    ADMIN: 'bg-blue-500',
    EDITOR: 'bg-green-500',
    VIEWER: 'bg-gray-500',
};

export function WorkspaceMembers({
    workspaceId,
    isOwner = false,
    isAdmin = false,
}: WorkspaceMembersProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchMembers();
    }, [workspaceId]);

    const fetchMembers = async () => {
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}/members`);
            if (response.ok) {
                const data = await response.json();
                setMembers(data);
            }
        } catch (error) {
            console.error('Failed to fetch members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: string) => {
        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/members/${memberId}`,
                {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: newRole }),
                }
            );

            if (!response.ok) throw new Error('Failed to update role');

            toast({
                title: 'Success',
                description: 'Member role updated',
            });
            fetchMembers();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member?')) return;

        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/members/${memberId}`,
                { method: 'DELETE' }
            );

            if (!response.ok) throw new Error('Failed to remove member');

            toast({
                title: 'Success',
                description: 'Member removed from workspace',
            });
            fetchMembers();
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const canManageMembers = isOwner || isAdmin;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Workspace Members
                            </CardTitle>
                            <CardDescription>
                                Manage team members and their permissions
                            </CardDescription>
                        </div>
                        {canManageMembers && (
                            <Button onClick={() => setShowInviteDialog(true)}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Invite Member
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Loading members...
                        </div>
                    ) : members.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No members yet. Invite your first team member!
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    {canManageMembers && <TableHead>Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{member.user.name}</div>
                                                <div className="text-sm text-muted-foreground">
                                                    {member.user.email}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {member.role === 'OWNER' || !canManageMembers ? (
                                                <Badge className={ROLE_COLORS[member.role]}>
                                                    {member.role}
                                                </Badge>
                                            ) : (
                                                <Select
                                                    value={member.role}
                                                    onValueChange={(value) =>
                                                        handleRoleChange(member.user.id, value)
                                                    }
                                                >
                                                    <SelectTrigger className="w-[130px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="VIEWER">Viewer</SelectItem>
                                                        <SelectItem value="EDITOR">Editor</SelectItem>
                                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(member.invitedAt).toLocaleDateString()}
                                        </TableCell>
                                        {canManageMembers && (
                                            <TableCell>
                                                {member.role !== 'OWNER' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveMember(member.user.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <InviteMemberDialog
                open={showInviteDialog}
                onOpenChange={setShowInviteDialog}
                workspaceId={workspaceId}
                onMemberInvited={fetchMembers}
            />
        </>
    );
}
