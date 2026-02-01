'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Code, History, Sparkles, Coins, Calculator, Settings as SettingsIcon, BarChart3, Wallet, Shield } from 'lucide-react';
import { AIChatInterface } from '@/components/semantic/ai-chat-interface';
import { QueryBuilder } from '@/components/semantic/query-builder';
import { FormulaEditor } from '@/components/semantic/formula-editor';
import { RequestHistoryTable } from '@/components/semantic/request-history-table';
import { AISettings } from '@/components/semantic/ai-settings';
import { AIUsageDashboard } from '@/components/ai-usage/ai-usage-dashboard';
import { BudgetManagement } from '@/components/ai-usage/budget-management';
import { RateLimitManagement } from '@/components/ai-usage/rate-limit-management';
import { useAIProviders } from '@/hooks/use-ai-providers';

export default function AIAssistantPage() {
    const [activeTab, setActiveTab] = React.useState('chat');
    const [selectedProvider, setSelectedProvider] = React.useState<string>('');

    const { providers, isLoading: providersLoading } = useAIProviders();

    // Set default provider
    React.useEffect(() => {
        if (providers && providers.length > 0 && !selectedProvider) {
            setSelectedProvider(providers[0].id);
        }
    }, [providers, selectedProvider]);

    // Persist active tab to localStorage
    React.useEffect(() => {
        const savedTab = localStorage.getItem('ai-assistant-tab');
        if (savedTab) {
            setActiveTab(savedTab);
        }
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        localStorage.setItem('ai-assistant-tab', value);
    };

    return (
        <div className="flex flex-col h-full p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">AI Assistant</h1>
                        <p className="text-sm text-muted-foreground">
                            Natural language data exploration and analysis
                        </p>
                    </div>
                </div>

                {/* Provider Selection */}
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">AI Provider</p>
                        <Select
                            value={selectedProvider}
                            onValueChange={setSelectedProvider}
                            disabled={providersLoading}
                        >
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                                {providers?.map((provider: any) => (
                                    <SelectItem key={provider.id} value={provider.id} className="text-xs">
                                        {provider.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Token Usage (Placeholder - Real stats in Settings) */}
                    <div className="text-right">
                        <p className="text-[10px] text-muted-foreground">Tokens Today</p>
                        <Badge variant="outline" className="h-6 text-xs">
                            <Coins className="w-3 h-3 mr-1" />
                            1,234
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-8 max-w-5xl">
                    <TabsTrigger value="chat" className="text-xs">
                        <MessageSquare className="w-3 h-3 mr-1" />
                        Chat
                    </TabsTrigger>
                    <TabsTrigger value="query" className="text-xs">
                        <Code className="w-3 h-3 mr-1" />
                        Query Builder
                    </TabsTrigger>
                    <TabsTrigger value="formula" className="text-xs">
                        <Calculator className="w-3 h-3 mr-1" />
                        Formula
                    </TabsTrigger>
                    <TabsTrigger value="history" className="text-xs">
                        <History className="w-3 h-3 mr-1" />
                        History
                    </TabsTrigger>
                    <TabsTrigger value="dashboard" className="text-xs">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="budgets" className="text-xs">
                        <Wallet className="w-3 h-3 mr-1" />
                        Budgets
                    </TabsTrigger>
                    <TabsTrigger value="rate-limits" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Rate Limits
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs">
                        <SettingsIcon className="w-3 h-3 mr-1" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <div className="flex-1 mt-4">
                    <TabsContent value="chat" className="h-full m-0">
                        <AIChatInterface className="h-full" />
                    </TabsContent>

                    <TabsContent value="query" className="h-full m-0">
                        <QueryBuilder
                            className="h-full"
                            onExecuteQuery={(sql) => {
                                console.log('Execute query:', sql);
                                // TODO: Redirect to query execution page
                            }}
                            onSaveQuery={(sql, prompt) => {
                                console.log('Save query:', { sql, prompt });
                                // TODO: Save to collection
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="formula" className="h-full m-0">
                        <FormulaEditor
                            className="h-full"
                            onSaveFormula={(formula, name, description) => {
                                console.log('Save formula:', { formula, name, description });
                                // TODO: Save to virtual metrics
                            }}
                        />
                    </TabsContent>

                    <TabsContent value="history" className="h-full m-0">
                        <RequestHistoryTable className="h-full" />
                    </TabsContent>

                    <TabsContent value="dashboard" className="h-full m-0">
                        <AIUsageDashboard period="monthly" />
                    </TabsContent>

                    <TabsContent value="budgets" className="h-full m-0">
                        <BudgetManagement />
                    </TabsContent>

                    <TabsContent value="rate-limits" className="h-full m-0">
                        <RateLimitManagement />
                    </TabsContent>

                    <TabsContent value="settings" className="h-full m-0">
                        <AISettings className="h-full" />
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
