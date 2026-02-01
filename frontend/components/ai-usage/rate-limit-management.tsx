'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
    useRateLimits,
    useCreateRateLimit,
    useUpdateRateLimit,
    useDeleteRateLimit,
    useViolations,
} from '@/hooks/use-ai-usage';
import { Plus, Edit, Trash2, Shield, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RateLimitConfig, CreateRateLimitRequest, UpdateRateLimitRequest } from '@/lib/types/ai-usage';

interface RateLimitManagementProps {
    className?: string;
}

export function RateLimitManagement({ className }: RateLimitManagementProps) {
    const { data: rateLimits, isLoading } = useRateLimits();
    const { data: violations } = useViolations(20);
    const createRateLimit = useCreateRateLimit();
    const updateRateLimit = useUpdateRateLimit();
    const deleteRateLimit = useDeleteRateLimit();

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [editingLimit, setEditingLimit] = React.useState<RateLimitConfig | null>(null);
    const [deletingLimit, setDeletingLimit] = React.useState<RateLimitConfig | null>(null);

    // Form state
    const [formData, setFormData] = React.useState<CreateRateLimitRequest>({
        name: '',
        limitType: 'global',
        requestsPerMinute: 10,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            limitType: 'global',
            requestsPerMinute: 10,
        });
    };

    const handleCreate = async () => {
        await createRateLimit.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleEdit = async () => {
        if (!editingLimit) return;

        const updateData: UpdateRateLimitRequest = {
            requestsPerMinute: formData.requestsPerMinute,
            requestsPerHour: formData.requestsPerHour,
            requestsPerDay: formData.requestsPerDay,
            description: formData.description,
        };

        await updateRateLimit.mutateAsync({ id: editingLimit.id, data: updateData });
        setEditingLimit(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deletingLimit) return;
        await deleteRateLimit.mutateAsync(deletingLimit.id);
        setDeletingLimit(null);
    };

    const openEditDialog = (limit: RateLimitConfig) => {
        setEditingLimit(limit);
        setFormData({
            name: limit.name,
            limitType: limit.limitType,
            target: limit.target,
            requestsPerMinute: limit.requestsPerMinute,
            requestsPerHour: limit.requestsPerHour,
            requestsPerDay: limit.requestsPerDay,
            description: limit.description,
        });
    };

    const toggleLimitEnabled = async (limit: RateLimitConfig) => {
        await updateRateLimit.mutateAsync({
            id: limit.id,
            data: { enabled: !limit.enabled },
        });
    };

    if (isLoading) {
        return (
            <div className={cn('space-y-4', className)}>
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-16 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const formatNumber = (num: number) => num.toLocaleString();

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Rate Limit Management</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure request rate limits to prevent abuse
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Rate Limit
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Rate Limit</DialogTitle>
                            <DialogDescription>
                                Set request limits to control API usage
                            </DialogDescription>
                        </DialogHeader>
                        <RateLimitForm formData={formData} setFormData={setFormData} />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={createRateLimit.isPending}>
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rate Limits List */}
            {rateLimits && rateLimits.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {rateLimits.map((limit) => (
                        <Card key={limit.id}>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-blue-500" />
                                            {limit.name}
                                        </CardTitle>
                                        <CardDescription className="flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {limit.limitType}
                                            </Badge>
                                            {limit.target && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {limit.target}
                                                </Badge>
                                            )}
                                            {!limit.enabled && (
                                                <Badge variant="secondary" className="text-xs">
                                                    Disabled
                                                </Badge>
                                            )}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => openEditDialog(limit)}
                                        >
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => setDeletingLimit(limit)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Limits */}
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                        <span className="text-sm text-muted-foreground">Per Minute</span>
                                        <span className="text-sm font-medium">
                                            {formatNumber(limit.requestsPerMinute)} requests
                                        </span>
                                    </div>
                                    {limit.requestsPerHour && (
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                            <span className="text-sm text-muted-foreground">Per Hour</span>
                                            <span className="text-sm font-medium">
                                                {formatNumber(limit.requestsPerHour)} requests
                                            </span>
                                        </div>
                                    )}
                                    {limit.requestsPerDay && (
                                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                            <span className="text-sm text-muted-foreground">Per Day</span>
                                            <span className="text-sm font-medium">
                                                {formatNumber(limit.requestsPerDay)} requests
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Description */}
                                {limit.description && (
                                    <p className="text-xs text-muted-foreground">{limit.description}</p>
                                )}

                                {/* Toggle */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <span className="text-sm text-muted-foreground">Enabled</span>
                                    <Switch
                                        checked={limit.enabled}
                                        onCheckedChange={() => toggleLimitEnabled(limit)}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">No rate limits configured</p>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Rate Limit
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Violations */}
            {violations && violations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            Recent Violations
                        </CardTitle>
                        <CardDescription>Latest rate limit violations</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {violations.map((violation) => (
                                <div
                                    key={violation.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {violation.windowType}
                                            </Badge>
                                            {violation.provider && (
                                                <Badge variant="secondary" className="text-xs">
                                                    {violation.provider}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-sm">
                                            {formatNumber(violation.requestsMade)} requests made (limit: {formatNumber(violation.limitValue)})
                                        </div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="w-3 h-3" />
                                            {new Date(violation.violatedAt).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingLimit} onOpenChange={(open) => !open && setEditingLimit(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Rate Limit</DialogTitle>
                        <DialogDescription>Update rate limit configuration</DialogDescription>
                    </DialogHeader>
                    <RateLimitForm formData={formData} setFormData={setFormData} isEdit />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingLimit(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit} disabled={updateRateLimit.isPending}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingLimit} onOpenChange={(open) => !open && setDeletingLimit(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Rate Limit</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deletingLimit?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Rate Limit Form Component
interface RateLimitFormProps {
    formData: CreateRateLimitRequest;
    setFormData: React.Dispatch<React.SetStateAction<CreateRateLimitRequest>>;
    isEdit?: boolean;
}

function RateLimitForm({ formData, setFormData, isEdit }: RateLimitFormProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Rate Limit Name</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., OpenAI Rate Limit"
                    disabled={isEdit}
                />
            </div>

            {!isEdit && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="limitType">Limit Type</Label>
                        <Select
                            value={formData.limitType}
                            onValueChange={(value: 'provider' | 'user' | 'global') =>
                                setFormData({ ...formData, limitType: value })
                            }
                        >
                            <SelectTrigger id="limitType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="global">Global (All Requests)</SelectItem>
                                <SelectItem value="user">Per User</SelectItem>
                                <SelectItem value="provider">Per Provider</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {formData.limitType === 'provider' && (
                        <div className="space-y-2">
                            <Label htmlFor="target">Provider Name</Label>
                            <Input
                                id="target"
                                value={formData.target || ''}
                                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                placeholder="e.g., openai, anthropic"
                            />
                        </div>
                    )}
                </>
            )}

            <div className="space-y-2">
                <Label htmlFor="requestsPerMinute">Requests Per Minute</Label>
                <Input
                    id="requestsPerMinute"
                    type="number"
                    min="1"
                    value={formData.requestsPerMinute}
                    onChange={(e) =>
                        setFormData({ ...formData, requestsPerMinute: parseInt(e.target.value) || 1 })
                    }
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="requestsPerHour">Requests Per Hour (Optional)</Label>
                <Input
                    id="requestsPerHour"
                    type="number"
                    min="0"
                    value={formData.requestsPerHour || ''}
                    onChange={(e) =>
                        setFormData({ ...formData, requestsPerHour: e.target.value ? parseInt(e.target.value) : undefined })
                    }
                    placeholder="Leave empty for no hourly limit"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="requestsPerDay">Requests Per Day (Optional)</Label>
                <Input
                    id="requestsPerDay"
                    type="number"
                    min="0"
                    value={formData.requestsPerDay || ''}
                    onChange={(e) =>
                        setFormData({ ...formData, requestsPerDay: e.target.value ? parseInt(e.target.value) : undefined })
                    }
                    placeholder="Leave empty for no daily limit"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the purpose of this rate limit"
                    rows={3}
                />
            </div>
        </div>
    );
}
