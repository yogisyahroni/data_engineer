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
import { Switch } from '@/components/ui/switch';
import { Copy, Globe, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ShareDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dashboardId: string;
    isPublic: boolean;
    onUpdateVisibility: (isPublic: boolean) => Promise<void>;
}

export function ShareDialog({
    open,
    onOpenChange,
    dashboardId,
    isPublic,
    onUpdateVisibility,
}: ShareDialogProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // In a real app, this would be the actual deployed URL
    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/dashboards/${dashboardId}`
        : `.../dashboards/${dashboardId}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        toast({
            title: 'Link copied',
            description: 'Dashboard link copied to clipboard.',
        });
    };

    const handleVisibilityChange = async (checked: boolean) => {
        setLoading(true);
        try {
            await onUpdateVisibility(checked);
            toast({
                title: checked ? 'Dashboard published' : 'Dashboard unpublished',
                description: checked
                    ? 'Anyone with the link can now view this dashboard.'
                    : 'Only you can view this dashboard.',
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to update visibility settings.',
                variant: 'destructive',
            });
            // Revert switch if needed? State is controlled by parent, so it shouldn't change if parent didn't update.
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Dashboard</DialogTitle>
                    <DialogDescription>
                        Manage access settings and share your dashboard with others.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 py-4">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="link"
                            defaultValue={shareUrl}
                            readOnly
                            className="h-9"
                        />
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={handleCopyLink}>
                        <span className="sr-only">Copy</span>
                        <Copy className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                            {isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                            <Label className="text-base font-medium">
                                Public Access
                            </Label>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {isPublic
                                ? 'Anyone with the link can view this dashboard.'
                                : 'Only visible to you.'}
                        </span>
                    </div>
                    <Switch
                        checked={isPublic}
                        onCheckedChange={handleVisibilityChange}
                        disabled={loading}
                    />
                </div>

                <DialogFooter className="sm:justify-start">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                    >
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
