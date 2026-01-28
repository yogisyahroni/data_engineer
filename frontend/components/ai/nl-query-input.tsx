
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { ModelSelector } from './model-selector';

interface NLQueryInputProps {
    onGenerate: (prompt: string, provider: string, model: string) => void;
    isGenerating: boolean;
}

export function NLQueryInput({ onGenerate, isGenerating }: NLQueryInputProps) {
    const [prompt, setPrompt] = React.useState('');
    const [model, setModel] = React.useState('llama-3.1-70b-versatile');
    const [provider, setProvider] = React.useState('groq');

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        if (!prompt.trim() || isGenerating) return;
        onGenerate(prompt, provider, model);
    };

    return (
        <div className="flex flex-col gap-3 p-4 bg-card border border-border rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary text-sm font-medium">
                    <Sparkles className="w-4 h-4" />
                    <span>Ask AI Analyst</span>
                </div>
                <ModelSelector
                    value={model}
                    onValueChange={setModel}
                    onProviderChange={setProvider}
                />
            </div>

            <div className="relative">
                <Textarea
                    placeholder="Ask a question about your data (e.g., 'Show me total sales by region for last month')..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[80px] pr-12 resize-none"
                    disabled={isGenerating}
                />
                <div className="absolute bottom-2 right-2">
                    <Button
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleSubmit}
                        disabled={!prompt.trim() || isGenerating}
                    >
                        {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </Button>
                </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-right px-1">
                Press Enter to send, Shift+Enter for new line
            </p>
        </div>
    );
}
