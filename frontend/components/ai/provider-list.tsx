'use client';

import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreVertical,
    Edit2,
    Trash2,
    CheckCircle2,
    XCircle,
    Star,
    Loader2,
    Zap,
} from 'lucide-react';
import { useAIProviders } from '@/hooks/use-ai-providers';
import type { AIProvider } from '@/lib/types/ai';
import { Skeleton } from '@/components/ui/skeleton';

interface ProviderListProps {
    onEdit: (provider: AIProvider) => void;
}

export function ProviderList({ onEdit }: ProviderListProps) {
    const {
        providers,
        isLoading,
        deleteProvider,
        testProvider,
        isDeleting,
        isTesting,
    } = useAIProviders();

    const [testingId, setTestingId] = useState<string | null>(null);

    const handleTest = async (id: string) => {
        setTestingId(id);
        await testProvider(id);
        setTestingId(null);
    };

    const handleDelete = (provider: AIProvider) => {
        if (window.confirm(`Delete provider "${provider.name}"?`)) {
            deleteProvider(provider.id);
        }
    };

    const getProviderIcon = (type: string) => {
        const icons: Record<string, string> = {
            openai: '🤖',
            gemini: '✨',
            anthropic: '🧠',
            cohere: '🔮',
            openrouter: '🌐',
            custom: '⚙️',
        };
        return icons[type] || '🔧';
    };

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    if (providers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border rounded-lg bg-muted/5">
                <div className="text-center space-y-3 max-w-sm">
                    <div className="text-4xl mb-2">🤖</div>
                    <h3 className="text-lg font-semibold">No AI Providers</h3>
                    <p className="text-sm text-muted-foreground">
                        Add your first AI provider to start generating content with AI.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Provider</TableHead>
                        <TableHead>Model</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {providers.map((provider) => (
                        <TableRow key={provider.id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{getProviderIcon(provider.providerType)}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{provider.name}</span>
                                            {provider.isDefault && (
                                                <Badge variant="outline" className="text-[10px] gap-1">
                                                    <Star className="w-3 h-3 fill-current" />
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground capitalize">
                                            {provider.providerType}
                                            {provider.baseUrl && ' (Custom)'}
                                        </div>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                    {provider.model}
                                </code>
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={provider.isActive ? 'default' : 'secondary'}
                                    className="gap-1"
                                >
                                    {provider.isActive ? (
                                        <>
                                            <CheckCircle2 className="w-3 h-3" />
                                            Active
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="w-3 h-3" />
                                            Inactive
                                        </>
                                    )}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(provider)}>
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => handleTest(provider.id)}
                                            disabled={testingId === provider.id}
                                        >
                                            {testingId === provider.id ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Zap className="w-4 h-4 mr-2" />
                                            )}
                                            Test Connection
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => handleDelete(provider)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
