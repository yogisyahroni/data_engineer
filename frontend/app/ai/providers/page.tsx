'use client';

import { useState } from 'react';
import { ProviderList } from '@/components/ai/provider-list';
import { ProviderForm } from '@/components/ai/provider-form';
import { Button } from '@/components/ui/button';
import { Plus, Settings2 } from 'lucide-react';
import { SidebarLayout } from '@/components/sidebar-layout';
import type { AIProvider } from '@/lib/types/ai';

export default function AIProvidersPage() {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);

    const handleEdit = (provider: AIProvider) => {
        setEditingProvider(provider);
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setEditingProvider(null);
    };

    return (
        <SidebarLayout>
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                                <Settings2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold">AI Providers</h1>
                                <p className="text-sm text-muted-foreground">
                                    Manage your AI provider configurations
                                </p>
                            </div>
                        </div>
                        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                            <Plus className="w-4 h-4" />
                            Add Provider
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                    <div className="max-w-5xl mx-auto">
                        <ProviderList onEdit={handleEdit} />
                    </div>
                </div>
            </div>

            {/* Form Dialog */}
            <ProviderForm
                open={isFormOpen}
                onOpenChange={handleFormClose}
                provider={editingProvider}
            />
        </SidebarLayout>
    );
}
