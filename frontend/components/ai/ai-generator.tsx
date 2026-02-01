'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, CheckCircle2 } from 'lucide-react';
import { useAI } from '@/hooks/use-ai';
import { useAIProviders } from '@/hooks/use-ai-providers';
import { toast } from 'sonner';

export function AIGenerator() {
    const { generate, isGenerating, generatedContent } = useAI();
    const { providers } = useAIProviders();

    const [prompt, setPrompt] = useState('');
    const [selectedProviderId, setSelectedProviderId] = useState<string>('');
    const [copied, setCopied] = useState(false);

    const activeProviders = providers.filter((p) => p.isActive);
    const defaultProvider = activeProviders.find((p) => p.isDefault);

    const handleGenerate = () => {
        if (!prompt.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        if (activeProviders.length === 0) {
            toast.error('No active AI providers configured');
            return;
        }

        generate({
            prompt,
            providerId: selectedProviderId || undefined,
        });
    };

    const handleCopy = async () => {
        if (generatedContent?.response) {
            await navigator.clipboard.writeText(generatedContent.response);
            setCopied(true);
            toast.success('Copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClear = () => {
        setPrompt('');
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Generate Content
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Provider Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="provider">AI Provider</Label>
                        <Select
                            value={selectedProviderId}
                            onValueChange={setSelectedProviderId}
                            disabled={activeProviders.length === 0}
                        >
                            <SelectTrigger id="provider">
                                <SelectValue
                                    placeholder={
                                        defaultProvider
                                            ? `${defaultProvider.name} (Default)`
                                            : 'Select provider'
                                    }
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {activeProviders.map((provider) => (
                                    <SelectItem key={provider.id} value={provider.id}>
                                        <div className="flex items-center gap-2">
                                            <span>{provider.name}</span>
                                            {provider.isDefault && (
                                                <Badge variant="outline" className="text-[10px]">
                                                    Default
                                                </Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {activeProviders.length === 0 && (
                            <p className="text-xs text-destructive">
                                No active providers. Please configure one first.
                            </p>
                        )}
                    </div>

                    {/* Prompt Input */}
                    <div className="space-y-2">
                        <Label htmlFor="prompt">Prompt</Label>
                        <Textarea
                            id="prompt"
                            placeholder="Enter your prompt here... (e.g., 'Explain quantum computing in simple terms')"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={6}
                            className="resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleGenerate}
                            disabled={isGenerating || activeProviders.length === 0}
                            className="gap-2"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    Generate
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClear}
                            disabled={isGenerating}
                        >
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Response Section */}
            {generatedContent && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Response</CardTitle>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="gap-2"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Response Text */}
                        <div className="bg-muted/50 rounded-lg p-4 border">
                            <pre className="whitespace-pre-wrap text-sm font-mono">
                                {generatedContent.response}
                            </pre>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Tokens:</span>
                                <Badge variant="secondary" className="text-xs">
                                    {generatedContent.tokensUsed}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Cost:</span>
                                <Badge variant="secondary" className="text-xs">
                                    ${generatedContent.cost.toFixed(4)}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Duration:</span>
                                <Badge variant="secondary" className="text-xs">
                                    {(generatedContent.durationMs / 1000).toFixed(2)}s
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="font-medium">Status:</span>
                                <Badge
                                    variant={
                                        generatedContent.status === 'success' ? 'default' : 'destructive'
                                    }
                                    className="text-xs"
                                >
                                    {generatedContent.status}
                                </Badge>
                            </div>
                        </div>

                        {/* Error (if any) */}
                        {generatedContent.error && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                                <p className="text-sm text-destructive font-medium">Error:</p>
                                <p className="text-sm text-destructive/80 mt-1">
                                    {generatedContent.error}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
