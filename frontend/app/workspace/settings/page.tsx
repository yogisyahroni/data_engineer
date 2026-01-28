'use client';

import { useState, useEffect } from 'react';
import { WorkspaceMembers } from '@/components/workspace/workspace-members';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Building2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WorkspaceSettingsPage() {
    // This is a demo page - in production, get workspaceId from route params
    const workspaceId = 'demo-workspace-id';
    const [workspace, setWorkspace] = useState<any>(null);
    const [name, setName] = useState('');
    const [plan, setPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        // Fetch workspace details
        // In production: fetch(`/api/workspaces/${workspaceId}`)
        setWorkspace({
            id: workspaceId,
            name: 'Demo Workspace',
            plan: 'FREE',
            ownerId: 'user-1',
        });
        setName('Demo Workspace');
    }, [workspaceId]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/workspaces/${workspaceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, plan }),
            });

            if (!response.ok) throw new Error('Failed to update workspace');

            toast({
                title: 'Success',
                description: 'Workspace settings saved',
            });
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
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8" />
                <div>
                    <h1 className="text-3xl font-bold">Workspace Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your workspace configuration and team members
                    </p>
                </div>
            </div>

            <Separator />

            {/* General Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>General</CardTitle>
                    <CardDescription>
                        Update workspace name and subscription plan
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="workspace-name">Workspace Name</Label>
                        <Input
                            id="workspace-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Workspace"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="workspace-plan">Subscription Plan</Label>
                        <Select value={plan} onValueChange={(v: any) => setPlan(v)}>
                            <SelectTrigger id="workspace-plan">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FREE">
                                    <div>
                                        <div className="font-medium">Free</div>
                                        <div className="text-xs text-muted-foreground">
                                            Basic features
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="PRO">
                                    <div>
                                        <div className="font-medium">Pro</div>
                                        <div className="text-xs text-muted-foreground">
                                            Advanced analytics
                                        </div>
                                    </div>
                                </SelectItem>
                                <SelectItem value="ENTERPRISE">
                                    <div>
                                        <div className="font-medium">Enterprise</div>
                                        <div className="text-xs text-muted-foreground">
                                            Unlimited everything
                                        </div>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="mr-2 h-4 w-4" />
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </CardContent>
            </Card>

            {/* Members Management */}
            <WorkspaceMembers
                workspaceId={workspaceId}
                isOwner={true}
                isAdmin={true}
            />
        </div>
    );
}
