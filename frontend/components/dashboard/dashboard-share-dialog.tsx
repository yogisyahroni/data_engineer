'use client';

import React, { useState } from 'react';
import {
    Share2,
    Copy,
    ExternalLink,
    Code,
    Check,
    Globe,
    Lock,
    Eye,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface DashboardShareDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    dashboardId: string;
    dashboardName: string;
    isPublic: boolean;
    onVisibilityChange: (isPublic: boolean) => void;
}

export function DashboardShareDialog({
    isOpen,
    onOpenChange,
    dashboardId,
    dashboardName,
    isPublic,
    onVisibilityChange,
}: DashboardShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const [permission, setPermission] = useState('view');

    const publicUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/dashboard/${dashboardId}`;
    const embedCode = `<iframe src="${publicUrl}" width="100%" height="800" frameborder="0"></iframe>`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Share2 className="w-5 h-5" />
                        Share Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        {dashboardName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Visibility Toggle */}
                    <div className="flex items-center justify-between space-x-2 p-4 bg-muted/50 rounded-lg border border-border">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                                {isPublic ? (
                                    <Globe className="w-4 h-4 text-primary" />
                                ) : (
                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                )}
                                <Label className="text-base font-medium">
                                    {isPublic ? 'Public Dashboard' : 'Private Dashboard'}
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isPublic
                                    ? 'Anyone with the link can view this dashboard.'
                                    : 'Only you and invited users can view this dashboard.'}
                            </p>
                        </div>
                        <Switch
                            checked={isPublic}
                            onCheckedChange={onVisibilityChange}
                        />
                    </div>

                    {isPublic && (
                        <>
                            {/* Share Link */}
                            <div className="space-y-2">
                                <Label>Public Link</Label>
                                <div className="flex gap-2">
                                    <Input
                                        readOnly
                                        value={publicUrl}
                                        className="flex-1 bg-muted/50 font-mono text-xs"
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => copyToClipboard(publicUrl)}
                                    >
                                        {copied ? (
                                            <Check className="w-4 h-4 text-primary" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Embed Code */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-1.5">
                                        <Code className="w-4 h-4" />
                                        Embed Code
                                    </Label>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => copyToClipboard(embedCode)}
                                    >
                                        Copy HTML
                                    </Button>
                                </div>
                                <div className="p-3 bg-muted font-mono text-xs rounded border border-border whitespace-pre-wrap">
                                    {embedCode}
                                </div>
                            </div>
                        </>
                    )}

                    {/* User Access (Invite) */}
                    <div className="space-y-3">
                        <Label>Invite Collaborators</Label>
                        <div className="flex gap-2">
                            <Input placeholder="Enter email address..." className="flex-1" />
                            <Select value={permission} onValueChange={setPermission}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="view">View</SelectItem>
                                    <SelectItem value="edit">Edit</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button>Invite</Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-start pt-2 border-t border-border">
                    <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => window.open(publicUrl, '_blank')}
                        disabled={!isPublic}
                    >
                        <ExternalLink className="w-4 h-4" />
                        Preview Public Page
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
