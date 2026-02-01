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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/use-ai-usage';
import { Plus, Edit, Trash2, AlertTriangle, DollarSign, Zap, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIBudget, CreateBudgetRequest, UpdateBudgetRequest } from '@/lib/types/ai-usage';

interface BudgetManagementProps {
    className?: string;
}

export function BudgetManagement({ className }: BudgetManagementProps) {
    const { data: budgets, isLoading } = useBudgets();
    const createBudget = useCreateBudget();
    const updateBudget = useUpdateBudget();
    const deleteBudget = useDeleteBudget();

    const [isCreateOpen, setIsCreateOpen] = React.useState(false);
    const [editingBudget, setEditingBudget] = React.useState<AIBudget | null>(null);
    const [deletingBudget, setDeletingBudget] = React.useState<AIBudget | null>(null);

    // Form state
    const [formData, setFormData] = React.useState<CreateBudgetRequest>({
        name: '',
        budgetType: 'user',
        period: 'monthly',
        alertThreshold: 80,
    });

    const resetForm = () => {
        setFormData({
            name: '',
            budgetType: 'user',
            period: 'monthly',
            alertThreshold: 80,
        });
    };

    const handleCreate = async () => {
        await createBudget.mutateAsync(formData);
        setIsCreateOpen(false);
        resetForm();
    };

    const handleEdit = async () => {
        if (!editingBudget) return;

        const updateData: UpdateBudgetRequest = {
            name: formData.name,
            maxTokens: formData.maxTokens,
            maxCost: formData.maxCost,
            maxRequests: formData.maxRequests,
            alertThreshold: formData.alertThreshold,
        };

        await updateBudget.mutateAsync({ id: editingBudget.id, data: updateData });
        setEditingBudget(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!deletingBudget) return;
        await deleteBudget.mutateAsync(deletingBudget.id);
        setDeletingBudget(null);
    };

    const openEditDialog = (budget: AIBudget) => {
        setEditingBudget(budget);
        setFormData({
            name: budget.name,
            budgetType: budget.budgetType,
            period: budget.period,
            maxTokens: budget.maxTokens,
            maxCost: budget.maxCost,
            maxRequests: budget.maxRequests,
            alertThreshold: budget.alertThreshold,
        });
    };

    const toggleBudgetEnabled = async (budget: AIBudget) => {
        await updateBudget.mutateAsync({
            id: budget.id,
            data: { enabled: !budget.enabled },
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
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
    const formatNumber = (num: number) => num.toLocaleString();

    const getUsagePercentage = (budget: AIBudget) => {
        if (budget.maxTokens) return (budget.currentTokens / budget.maxTokens) * 100;
        if (budget.maxCost) return (budget.currentCost / budget.maxCost) * 100;
        if (budget.maxRequests) return (budget.currentRequests / budget.maxRequests) * 100;
        return 0;
    };

    const getUsageColor = (percentage: number, alertThreshold: number) => {
        if (percentage >= 100) return 'text-red-500';
        if (percentage >= alertThreshold) return 'text-orange-500';
        return 'text-green-500';
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Budget Management</h2>
                    <p className="text-sm text-muted-foreground">
                        Configure usage limits and alerts
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Budget
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Budget</DialogTitle>
                            <DialogDescription>
                                Set limits for AI usage to control costs
                            </DialogDescription>
                        </DialogHeader>
                        <BudgetForm formData={formData} setFormData={setFormData} />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={createBudget.isPending}>
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Budgets List */}
            {budgets && budgets.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                    {budgets.map((budget) => {
                        const percentage = getUsagePercentage(budget);
                        const isExceeded = percentage >= 100;
                        const isNearLimit = percentage >= budget.alertThreshold;

                        return (
                            <Card
                                key={budget.id}
                                className={cn(
                                    'relative overflow-hidden',
                                    isExceeded && 'border-red-500/50',
                                    isNearLimit && !isExceeded && 'border-orange-500/50'
                                )}
                            >
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="text-base">{budget.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {budget.budgetType}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs capitalize">
                                                    {budget.period}
                                                </Badge>
                                                {!budget.enabled && (
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
                                                onClick={() => openEditDialog(budget)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => setDeletingBudget(budget)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Limits */}
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        {budget.maxTokens && (
                                            <div className="flex items-center gap-1">
                                                <Zap className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">
                                                    {formatNumber(budget.currentTokens)} / {formatNumber(budget.maxTokens)}
                                                </span>
                                            </div>
                                        )}
                                        {budget.maxCost && (
                                            <div className="flex items-center gap-1">
                                                <DollarSign className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">
                                                    {formatCost(budget.currentCost)} / {formatCost(budget.maxCost)}
                                                </span>
                                            </div>
                                        )}
                                        {budget.maxRequests && (
                                            <div className="flex items-center gap-1">
                                                <Activity className="w-3 h-3 text-muted-foreground" />
                                                <span className="text-muted-foreground">
                                                    {formatNumber(budget.currentRequests)} / {formatNumber(budget.maxRequests)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className={cn('font-medium', getUsageColor(percentage, budget.alertThreshold))}>
                                                {percentage.toFixed(1)}% used
                                            </span>
                                            {isNearLimit && (
                                                <div className="flex items-center gap-1 text-orange-500">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span className="text-xs">Near limit</span>
                                                </div>
                                            )}
                                            {isExceeded && (
                                                <div className="flex items-center gap-1 text-red-500">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    <span className="text-xs">Exceeded</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    'h-full transition-all',
                                                    isExceeded && 'bg-red-500',
                                                    isNearLimit && !isExceeded && 'bg-orange-500',
                                                    !isNearLimit && 'bg-gradient-to-r from-green-500 to-emerald-600'
                                                )}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Toggle */}
                                    <div className="flex items-center justify-between pt-2 border-t">
                                        <span className="text-sm text-muted-foreground">Enabled</span>
                                        <Switch
                                            checked={budget.enabled}
                                            onCheckedChange={() => toggleBudgetEnabled(budget)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">No budgets configured</p>
                        <Button onClick={() => setIsCreateOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Budget
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Budget</DialogTitle>
                        <DialogDescription>Update budget limits and settings</DialogDescription>
                    </DialogHeader>
                    <BudgetForm formData={formData} setFormData={setFormData} isEdit />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingBudget(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleEdit} disabled={updateBudget.isPending}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingBudget} onOpenChange={(open) => !open && setDeletingBudget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{deletingBudget?.name}"? This action cannot be undone.
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

// Budget Form Component
interface BudgetFormProps {
    formData: CreateBudgetRequest;
    setFormData: React.Dispatch<React.SetStateAction<CreateBudgetRequest>>;
    isEdit?: boolean;
}

function BudgetForm({ formData, setFormData, isEdit }: BudgetFormProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Budget Name</Label>
                <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly AI Budget"
                />
            </div>

            {!isEdit && (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="budgetType">Budget Type</Label>
                        <Select
                            value={formData.budgetType}
                            onValueChange={(value: 'user' | 'workspace') =>
                                setFormData({ ...formData, budgetType: value })
                            }
                        >
                            <SelectTrigger id="budgetType">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="workspace">Workspace</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="period">Period</Label>
                        <Select
                            value={formData.period}
                            onValueChange={(value: 'hourly' | 'daily' | 'monthly' | 'total') =>
                                setFormData({ ...formData, period: value })
                            }
                        >
                            <SelectTrigger id="period">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hourly">Hourly</SelectItem>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                                <SelectItem value="total">Total (No Reset)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </>
            )}

            <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                        id="maxTokens"
                        type="number"
                        value={formData.maxTokens || ''}
                        onChange={(e) =>
                            setFormData({ ...formData, maxTokens: e.target.value ? parseInt(e.target.value) : undefined })
                        }
                        placeholder="Optional"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="maxCost">Max Cost ($)</Label>
                    <Input
                        id="maxCost"
                        type="number"
                        step="0.01"
                        value={formData.maxCost || ''}
                        onChange={(e) =>
                            setFormData({ ...formData, maxCost: e.target.value ? parseFloat(e.target.value) : undefined })
                        }
                        placeholder="Optional"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="maxRequests">Max Requests</Label>
                    <Input
                        id="maxRequests"
                        type="number"
                        value={formData.maxRequests || ''}
                        onChange={(e) =>
                            setFormData({ ...formData, maxRequests: e.target.value ? parseInt(e.target.value) : undefined })
                        }
                        placeholder="Optional"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
                <Input
                    id="alertThreshold"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold || 80}
                    onChange={(e) =>
                        setFormData({ ...formData, alertThreshold: parseInt(e.target.value) || 80 })
                    }
                />
                <p className="text-xs text-muted-foreground">
                    You'll receive an alert when usage reaches this percentage
                </p>
            </div>
        </div>
    );
}
