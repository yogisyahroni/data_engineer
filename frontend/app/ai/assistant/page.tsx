'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { AIChatInterface } from '@/components/semantic/ai-chat-interface';
import { QueryBuilderAI } from '@/components/semantic/query-builder-ai';
import { FormulaEditorAI } from '@/components/semantic/formula-editor-ai';
import { DataExplainer } from '@/components/semantic/data-explainer';
import { SemanticHistory } from '@/components/semantic/semantic-history';
import {
    MessageSquare,
    FileCode,
    Calculator,
    Lightbulb,
    History,
    Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AIAssistantPage() {
    const [selectedHistoryId, setSelectedHistoryId] = React.useState<string>();
    const [activeTab, setActiveTab] = React.useState('chat');
    const [showHistory, setShowHistory] = React.useState(false);

    const handleHistorySelect = (id: string) => {
        setSelectedHistoryId(id);
        toast.info('History item selected', {
            description: `Request ID: ${id}`,
        });
        setShowHistory(false);
    };

    const handleHistoryDelete = (id: string) => {
        toast.success('Request deleted', {
            description: 'History item has been removed',
        });
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/50 bg-card/30 backdrop-blur-lg">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">AI Assistant</h1>
                        <p className="text-sm text-muted-foreground">
                            Your intelligent data companion
                        </p>
                    </div>
                </div>

                {/* History Toggle (Mobile) */}
                <Sheet open={showHistory} onOpenChange={setShowHistory}>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="lg:hidden">
                            <History className="w-4 h-4 mr-2" />
                            History
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80 p-0">
                        <SemanticHistory
                            selectedId={selectedHistoryId}
                            onSelect={handleHistorySelect}
                            onDelete={handleHistoryDelete}
                            className="border-0"
                        />
                    </SheetContent>
                </Sheet>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Tabs Section */}
                <div className="flex-1 overflow-auto">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                        {/* Tab List */}
                        <div className="px-6 pt-6">
                            <TabsList className="grid w-full grid-cols-4 bg-muted/50 backdrop-blur-sm">
                                <TabsTrigger value="chat" className="gap-2">
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="hidden sm:inline">Chat</span>
                                </TabsTrigger>
                                <TabsTrigger value="query" className="gap-2">
                                    <FileCode className="w-4 h-4" />
                                    <span className="hidden sm:inline">Query</span>
                                </TabsTrigger>
                                <TabsTrigger value="formula" className="gap-2">
                                    <Calculator className="w-4 h-4" />
                                    <span className="hidden sm:inline">Formula</span>
                                </TabsTrigger>
                                <TabsTrigger value="explain" className="gap-2">
                                    <Lightbulb className="w-4 h-4" />
                                    <span className="hidden sm:inline">Explain</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 p-6 overflow-auto">
                            <TabsContent value="chat" className="h-full m-0">
                                <AIChatInterface className="h-full" />
                            </TabsContent>

                            <TabsContent value="query" className="h-full m-0">
                                <div className="max-w-4xl mx-auto">
                                    <QueryBuilderAI />
                                </div>
                            </TabsContent>

                            <TabsContent value="formula" className="h-full m-0">
                                <div className="max-w-4xl mx-auto">
                                    <FormulaEditorAI />
                                </div>
                            </TabsContent>

                            <TabsContent value="explain" className="h-full m-0">
                                <div className="max-w-4xl mx-auto">
                                    <DataExplainer />
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* History Sidebar (Desktop) */}
                <div className="hidden lg:block w-80 border-l border-border/50">
                    <SemanticHistory
                        selectedId={selectedHistoryId}
                        onSelect={handleHistorySelect}
                        onDelete={handleHistoryDelete}
                        className="border-0"
                    />
                </div>
            </div>
        </div>
    );
}
