'use client';

import { AIGenerator } from '@/components/ai/ai-generator';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Sparkles } from 'lucide-react';

export default function AIPlaygroundPage() {
    return (
        <SidebarLayout>
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-lg">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">AI Playground</h1>
                            <p className="text-sm text-muted-foreground">
                                Generate content using your configured AI providers
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                    <div className="max-w-4xl mx-auto">
                        <AIGenerator />
                    </div>
                </div>
            </div>
        </SidebarLayout>
    );
}
