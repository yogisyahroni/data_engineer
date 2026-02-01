'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAIProviders } from '@/hooks/use-ai-providers';
import type { AIProvider, CreateAIProviderInput } from '@/lib/types/ai';
import { PROVIDER_MODELS } from '@/lib/types/ai';

interface ProviderFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    provider?: AIProvider | null;
}

export function ProviderForm({ open, onOpenChange, provider }: ProviderFormProps) {
    const { createProvider, updateProvider, isCreating, isUpdating } = useAIProviders();

    const [name, setName] = useState('');
    const [providerType, setProviderType] = useState<keyof typeof PROVIDER_MODELS>('openai');
    const [baseUrl, setBaseUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const isEditing = !!provider;
    const isLoading = isCreating || isUpdating;

    // Reset form when dialog opens/closes or provider changes
    useEffect(() => {
        if (open) {
            if (provider) {
                setName(provider.name);
                setProviderType(provider.providerType as keyof typeof PROVIDER_MODELS);
                setBaseUrl(provider.baseUrl || '');
                setApiKey(''); // Don't populate API key for security
                setModel(provider.model);
                setIsDefault(provider.isDefault);
            } else {
                // Reset for new provider
                setName('');
                setProviderType('openai');
                setBaseUrl('');
                setApiKey('');
                setModel('gpt-4');
                setIsDefault(false);
            }
        }
    }, [open, provider]);

    // Update model when provider type changes
    useEffect(() => {
        const models = PROVIDER_MODELS[providerType];
        if (models && models.length > 0 && !provider) {
            setModel(models[0]);
        }
    }, [providerType, provider]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const data: CreateAIProviderInput = {
            name,
            providerType: providerType as 'openai' | 'gemini' | 'anthropic' | 'cohere' | 'openrouter' | 'custom',
            baseUrl: providerType === 'custom' ? baseUrl : undefined,
            apiKey,
            model,
            isDefault,
        };

        if (isEditing && provider) {
            // Only include API key if it was changed
            const updateData: any = {
                name,
                model,
                isDefault,
            };
            if (providerType === 'custom') {
                updateData.baseUrl = baseUrl;
            }
            if (apiKey) {
                updateData.apiKey = apiKey;
            }

            await updateProvider({ id: provider.id, data: updateData });
        } else {
            await createProvider(data);
        }

        onOpenChange(false);
    };

    const availableModels = PROVIDER_MODELS[providerType] || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Provider' : 'Add AI Provider'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update your AI provider configuration.'
                            : 'Configure a new AI provider to start generating content.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                            id="name"
                            placeholder="My OpenAI Provider"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    {/* Provider Type */}
                    <div className="space-y-2">
                        <Label htmlFor="provider-type">Provider Type *</Label>
                        <Select
                            value={providerType}
                            onValueChange={(value) => setProviderType(value as keyof typeof PROVIDER_MODELS)}
                            disabled={isEditing} // Can't change type when editing
                        >
                            <SelectTrigger id="provider-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">OpenAI</SelectItem>
                                <SelectItem value="gemini">Google Gemini</SelectItem>
                                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                <SelectItem value="cohere">Cohere</SelectItem>
                                <SelectItem value="openrouter">OpenRouter</SelectItem>
                                <SelectItem value="custom">Custom (OpenAI-compatible)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Base URL (only for custom) */}
                    {providerType === 'custom' && (
                        <div className="space-y-2">
                            <Label htmlFor="base-url">Base URL *</Label>
                            <Input
                                id="base-url"
                                placeholder="http://localhost:11434/v1"
                                value={baseUrl}
                                onChange={(e) => setBaseUrl(e.target.value)}
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                For Ollama, LM Studio, or other OpenAI-compatible APIs
                            </p>
                        </div>
                    )}

                    {/* API Key */}
                    <div className="space-y-2">
                        <Label htmlFor="api-key">
                            API Key {!isEditing && '*'}
                            {isEditing && (
                                <span className="text-xs text-muted-foreground ml-2">
                                    (leave empty to keep current)
                                </span>
                            )}
                        </Label>
                        <div className="relative">
                            <Input
                                id="api-key"
                                type={showApiKey ? 'text' : 'password'}
                                placeholder={isEditing ? '••••••••' : 'sk-...'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required={!isEditing}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Model */}
                    <div className="space-y-2">
                        <Label htmlFor="model">Model *</Label>
                        <Select value={model} onValueChange={setModel}>
                            <SelectTrigger id="model">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {availableModels.map((m) => (
                                    <SelectItem key={m} value={m}>
                                        {m}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Set as Default */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="is-default"
                            checked={isDefault}
                            onCheckedChange={(checked) => setIsDefault(checked as boolean)}
                        />
                        <Label
                            htmlFor="is-default"
                            className="text-sm font-normal cursor-pointer"
                        >
                            Set as default provider
                        </Label>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {isEditing ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
