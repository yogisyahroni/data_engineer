
'use client';

import * as React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface ModelOption {
    id: string;
    name: string;
    provider: string;
}

const AVAILABLE_MODELS: ModelOption[] = [
    { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B (Groq)', provider: 'groq' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 (OpenRouter)', provider: 'openrouter' },
];

interface ModelSelectorProps {
    value: string;
    onValueChange: (value: string) => void;
    onProviderChange: (provider: string) => void;
}

export function ModelSelector({ value, onValueChange, onProviderChange }: ModelSelectorProps) {
    const handleValueChange = (val: string) => {
        onValueChange(val);
        const model = AVAILABLE_MODELS.find((m) => m.id === val);
        if (model) {
            onProviderChange(model.provider);
        }
    };

    return (
        <Select value={value} onValueChange={handleValueChange}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs">
                        <span className="font-medium">{model.name}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
