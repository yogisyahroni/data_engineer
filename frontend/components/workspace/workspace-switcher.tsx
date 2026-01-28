'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, Check, Plus } from 'lucide-react';
import { CreateWorkspaceDialog } from './create-workspace-dialog';

interface Workspace {
    id: string;
    name: string;
    slug: string;
    plan: 'FREE' | 'PRO' | 'ENTERPRISE';
}

interface WorkspaceSwitcherProps {
    currentWorkspaceId?: string;
    onWorkspaceChange?: (workspaceId: string) => void;
}

export function WorkspaceSwitcher({
    currentWorkspaceId,
    onWorkspaceChange,
}: WorkspaceSwitcherProps) {
    const [workspaces, setWorkspaces] = useState<{
        owned: Workspace[];
        member: Workspace[];
    }>({ owned: [], member: [] });
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [currentId, setCurrentId] = useState(currentWorkspaceId);

    useEffect(() => {
        fetchWorkspaces();
    }, []);

    const fetchWorkspaces = async () => {
        try {
            const response = await fetch('/api/workspaces');
            if (response.ok) {
                const data = await response.json();
                setWorkspaces(data);

                // Set default workspace if none selected
                if (!currentId && data.owned.length > 0) {
                    const defaultId = data.owned[0].id;
                    setCurrentId(defaultId);
                    onWorkspaceChange?.(defaultId);
                }
            }
        } catch (error) {
            console.error('Failed to fetch workspaces:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleWorkspaceSelect = (workspaceId: string) => {
        setCurrentId(workspaceId);
        onWorkspaceChange?.(workspaceId);
    };

    const allWorkspaces = [...workspaces.owned, ...workspaces.member];
    const currentWorkspace = allWorkspaces.find((w) => w.id === currentId);

    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Building2 className="h-4 w-4 animate-pulse" />
                <span>Loading...</span>
            </div>
        );
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="justify-start gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="flex-1 truncate text-left">
                            {currentWorkspace?.name || 'Select Workspace'}
                        </span>
                        {currentWorkspace?.plan && (
                            <span className="text-xs text-muted-foreground">
                                {currentWorkspace.plan}
                            </span>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px]">
                    {workspaces.owned.length > 0 && (
                        <>
                            <DropdownMenuLabel>Your Workspaces</DropdownMenuLabel>
                            {workspaces.owned.map((workspace) => (
                                <DropdownMenuItem
                                    key={workspace.id}
                                    onClick={() => handleWorkspaceSelect(workspace.id)}
                                    className="flex items-center gap-2"
                                >
                                    <Building2 className="h-4 w-4" />
                                    <span className="flex-1 truncate">{workspace.name}</span>
                                    {workspace.id === currentId && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}

                    {workspaces.member.length > 0 && (
                        <>
                            {workspaces.owned.length > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuLabel>Shared Workspaces</DropdownMenuLabel>
                            {workspaces.member.map((workspace) => (
                                <DropdownMenuItem
                                    key={workspace.id}
                                    onClick={() => handleWorkspaceSelect(workspace.id)}
                                    className="flex items-center gap-2"
                                >
                                    <Building2 className="h-4 w-4" />
                                    <span className="flex-1 truncate">{workspace.name}</span>
                                    {workspace.id === currentId && (
                                        <Check className="h-4 w-4 text-primary" />
                                    )}
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowCreateDialog(true)}
                        className="flex items-center gap-2 text-primary"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Create Workspace</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateWorkspaceDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onWorkspaceCreated={(workspace) => {
                    setShowCreateDialog(false);
                    fetchWorkspaces();
                    handleWorkspaceSelect(workspace.id);
                }}
            />
        </>
    );
}
